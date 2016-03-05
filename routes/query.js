var karambit = require("karambit");
var app = karambit();
var speakeasy = require("speakeasy-nlp"),
    vision = require("../common/vision");

/**
 * Creates a new query.
 * @param {string} type
 * @param {string} content
 * @param {object} req
 * @param {object} res
 * @param {function} callback
 */
function newQuery(type, content, req, res, callback) {
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
    query.save(function(err) {
        if (err) res.status(500).json({success: false, message: err});
        else {
            callback(query);
        }
    });
}

app.bind("query/create", function(req, res) {
    newQuery(req.query.type, req.query.q, req, res, function(query) {
        // classify query
        var q = speakeasy.classify(query.get("content"));

        // if they are asking where something is, we contact yelp,
        // otherwise it's probably not something yelp can answer
        if (q.action == "where") {

        } else {
            res.json({
                success: true,
                answered: false,
                message: "Query successful"
            });
        }
    });
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