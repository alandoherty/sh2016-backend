var karambit = require("karambit");
var app = karambit();

// requires
var engine = require("../common/engine"),
    geolib = require("geolib"),
    TaskQueue = karambit.TaskQueue;

/**
 * Creates a new query.
 * @param {string} type
 * @param {string} content
 * @param {object} req
 * @param {object} res
 * @param {function} callback
 */
function newQuery(type, content, lat, lon, req, res, callback) {
    // check params
    if (content === undefined || content === null) {
        res.status(400).json({success: false, message: "Invalid query data"});
        return;
    } else if (content.length > 255) {
        res.status(400).json({success: false, message: "Query too long"});
        return;
    }

    // create query
    var query = app.create("Query");
    query.set("type", type);
    query.set("content", content);
    query.set("user", req.session.get("user"));
    query.set("answer", 0);
    query.set("lat", lat);
    query.set("lon", lon);
    callback(query);
}

/**
 * Creates a new query.
 */
app.bind("query/create", function(req, res) {
    // check idiots didn't include parameters
    if (!req.query.lat || !req.query.lon) {
        res.status(400).json({success: false, message: "Missing latitude or longitude"});
        return;
    }

    // make the query
    if (req.query.type && req.query.type == "text") {
        newQuery(req.query.type, req.query.q, req.query.lat, req.query.lon, req, res, function (query) {
            engine.process(query, function(err, answer) {
                if (err) res.status(500).json({success: false, message: err});
                else {
                    // respond
                    var createQueue = new TaskQueue();

                    // queue
                    if (answer.toArray().length == 0) {
                        createQueue.queue(function(finish) {
                            query.save(function() {
                                finish();
                            });
                        });
                    }

                    // execute all
                    createQueue.executeAll(function() {
                        query.toArrayModel("private", function (queryData) {
                            res.json({
                                success: true,
                                query: queryData,
                                answered: answer.toArray().length > 0,
                                answer: answer.toArray(),
                                message: answer.toArray().length > 0 ? "Query successful" : "Query needs expert answer"
                            });
                        });
                    });
                }
            });
        });
    } else {
        res.status(400).json({success: false, message: "Invalid query type"});
    }
});

app.bind("query/get", function(req, res) {
    app.whereOne("Query", "id = %i", req.params.id, function(err, query) {
        if (err) res.status(500).json({success: false, message: err});
        else if (query == null) res.status(404).json({success: false, message: "Query not found"});
        else {
            query.toArrayModel("private", function(data) {
                res.status(200).json({success: true, message: "Query found", query: data});
            });
        }
    });
});

app.bind("query/update", function(req, res) {
    app.whereOne("Query", "id = %i", req.params.id, function(err, query) {
        if (err) res.status(500).json({success: false, message: err});
        else if (query == null) res.status(404).json({success: false, message: "Query not found"});
        else {
            // check if has answer
            if (query.get("answer") > 0) {
                res.status(400).json({success: false, message: "Question already answered"});
                return;
            }

            // create answer
            var answer = app.create("Answer");
            answer.set("text", req.query.text);
            answer.set("user", req.session.get("user"));
            answer.save(function(err) {
                if (err) res.status(500).json({success: false, message: err});
                else {
                    query.set("answer", answer.get("id"));
                    query.save(function(){
                        res.status(200).json({success: true, message: "Query answered"});
                    });
                }
            });
        }
    });
});

app.bind("query/list", function(req, res) {
    // check idiots didn't include parameters
    if (!req.query.lat || !req.query.lon) {
        res.status(400).json({success: false, message: "Missing latitude or longitude"});
        return;
    }

    // this is NOT how you should do queries for radius
    // but we're lazy
    app.whereAll("Query", function(err, queries) {
        if (err) res.status(500).json({success: false, message: err});
        else {
            var queryQueue = new TaskQueue();
            var queriesFound = [];

            for (var i = 0; i < queries.length; i++) {
                // get query and check if in radius
                var query = queries[i];
                var inRadius = geolib.isPointInCircle(
                    {latitude: query.get("lat"), longitude: query.get("lon")},
                    {latitude: parseFloat(req.query.lat), longitude: parseFloat(req.query.lon)},
                    5000
                );

                if (inRadius) {
                    (function(query) {
                        queryQueue.queue(function (done) {
                            query.toArrayModel("public", function(data) {
                                queriesFound.push(data);
                                done();
                            });
                        });
                    })(query);
                }
            }

            queryQueue.executeAll(function() {
                res.status(200).json({success: true, message: "Queries listed", queries: queriesFound});
            });
        }
    });
});