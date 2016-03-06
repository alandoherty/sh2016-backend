var karambit = require("karambit");
var app = karambit();

// requires
var engine = require("../common/engine"),
    geolib = require("geolib"),
    TaskQueue = karambit.TaskQueue,
    vision = require("../common/vision"),
    btoa = require("btoa"),
    fs = require("fs");

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
    query.set("type", type || "text");
    query.set("content", content || "");
    query.set("user", req.session.get("user"));
    query.set("answer", 0);
    query.set("lat", lat);
    query.set("lon", lon);
    callback(query);
}

var createUp = app.multer.single("file");

function bufferToBase64(buf) {
    var binstr = Array.prototype.map.call(buf, function (ch) {
        return String.fromCharCode(ch);
    }).join('');
    return btoa(binstr);
}

/**
 * Creates a new query.
 */

var cfunc = function(req, res) {
    // check idiots didn't include parameters
    if (!req.query.lat || !req.query.lon) {
        console.log("missing lat/lon");
        res.status(400).json({success: false, message: "Missing latitude or longitude"});
        return;
    }

    // make the query
    if (req.query.type && req.query.type == "text") {
        if (req.query.q == "🍔" || req.query.q == "🍟") {
            req.query.q = "where is the best McDonalds";
        }

        newQuery(req.query.type, req.query.q, req.query.lat, req.query.lon, req, res, function (query) {
            engine.process(query, function(err, answer) {
                if (err) res.status(500).json({success: false, message: err});
                else {
                    // respond
                    var createQueue = new TaskQueue();

                    // queue
                    if (answer.toArray().length == 0 || answer._answered === false) {
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
    } else if (req.query.type && req.query.type == "picture") {
        console.log("image upload " + req);
        console.log(req.body);

        if (req.body.data) {
            fs.writeFile("file/img", req.body.data, 'base64', function(err) {
                // pass on to vision
                vision.request("file/img", function(err, resp) {
                    if (err) {
                        res.status(500).json({success: false, message: err});
                    } else {
                        if (resp.responses.length > 0) {
                            var response = resp.responses[0];
                            console.log(response);
                            if (response.labelAnnotations.length > 0) {
                                var label = response.labelAnnotations[0];
                                req.query.type = "text";
                                req.query.q = (req.query.where == "true" ? "where is the nearest " : "") + label.description;
                                cfunc(req, res);
                                return;
                            }
                        }
                    }

                    req.query.type = "text";
                    req.query.q = "";
                    cfunc(req, res);
                });
            });
        } else {
            createUp(req, res, function (err) {
                if (err) {
                    console.log("invalid file upload");
                    res.status(400).json({success: false, message: "Invalid file upload"});
                    return;
                }

                if (req.file === undefined) {
                    console.log("invalid file upload");
                    res.status(400).json({success: false, message: "Invalid file upload"});
                    return;
                }

                // pass on to vision
                vision.request(req.file.path, function (err, resp) {
                    if (err) {
                        res.status(500).json({success: false, message: err});
                    } else {
                        if (resp.responses.length > 0) {
                            var response = resp.responses[0];
                            if (response.labelAnnotations.length > 0) {
                                var label = response.labelAnnotations[0];
                                req.query.type = "text";
                                req.query.q = label.description;
                                cfunc(req, res);
                                return;
                            }
                        }
                    }

                    req.query.type = "text";
                    req.query.q = "";
                    cfunc(req, res);
                });
            });
        }
    } else {
        console.log("invalid type: " + (req.query.type ? req.query.type : "n/a"));
        res.status(400).json({success: false, message: "Invalid query type"});
    }
};

app.bind("query/create", cfunc);

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
                                data.distance = (geolib.getDistance(
                                    {latitude: data.lat, longitude: data.lon},
                                    {latitude: req.query.lat, longitude: req.query.lon}
                                ) / 1000).toFixed(1);

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