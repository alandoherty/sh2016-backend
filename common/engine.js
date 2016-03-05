// karambit
var karambit = require("karambit");
var app = karambit();

// requires
var Answer = require("./classes/Answer"),
    Query = require("./classes/Query");

// the typical lookup
var typicals = {
    "what is life" : "42",
    "are we real" : "I think so, are you real?",
    "who are you" : "My name is Loki, I'm your local guide"
};

// the private engine interface
var _engine = {
    /**
     * Processes a 'where' question.
     * We should use yelp for this.
     * @param {Query} query
     * @param {Answer} answer
     * @param {function} callback
     */
    processWhere: function(query, answer, callback) {
        // search
        app.yelp.search({term: query.anal().subject, location: "Manchester", cll: query.query().get("lat") + "," + query.query().get("lon")})

        // process data
        .then(function (data) {
            if (data.businesses.length == 0) {
                answer.text("I couldn't find anything in your area 😢", false);
            } else {
                // get the first business
                var business = data.businesses[0];

                // give a text response
                answer.text("I found one of the best " + business.categories[0][0] + " in your area, why not try "
                    + data.businesses[0].name + " 😃", false);

                // give the business info
                answer.business(business);
            }

            callback(null);
        })

        // handle errors
        .catch(function (err) {
            callback(err);
        });
    },


    /**
     * Processes a 'what' question.
     * We should use Wolfram Alpha for this.
     * @param {Query} query
     * @param {Answer} answer
     * @param {function} callback
     */
    processWhat: function(query, answer, callback) {
        if (query.anal().subject) {
            answer.text("I don't understand what a " + query.anal().subject + " is 😢", false);
        } else {
            answer.text("I don't understand what things are yet 😢", false);
        }

        callback(null);
    },

    /**
     * Processes an 'other' question.
     * @param {Query} query
     * @param {Answer} answer
     * @param {function} callback
     */
    processOther: function(query, answer, callback) {
        callback(null);
    }
};

// the public engine interface
var engine = {
    /**
     * Processes a query.
     * @param {Model} q
     * @param {function} callback
     */
    process: function(q, callback) {
        // create objects
        var query = new Query(q);
        var answer = new Answer(query);

        // check if empty
        if (query.content() == "") {
            answer.text("Hello, are you there? 😨", false);
            callback(null, answer);
            return;
        }

        // determine best course of action
        var analysis = query.anal();

        if (analysis.action == "what")
            _engine.processWhat(query, answer, function(err) {
                if (err == null) callback(null, answer);
                else callback(err);
            });
        else if (analysis.action == "where")
            _engine.processWhere(query, answer, function(err) {
                if (err == null) callback(null, answer);
                else callback(err);
            });
        else
            _engine.processOther(query, answer, function(err) {
                if (err == null) callback(null, answer);
                else callback(err);
            });
    }
};

// export
module.exports = engine;