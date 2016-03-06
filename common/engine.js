// karambit
var karambit = require("karambit");
var app = karambit();

// requires
var Answer = require("./classes/Answer"),
    Query = require("./classes/Query"),
    geolib = require("geolib");

// the typical lookup
// these are fair doo's hardcoded phrases
// our app idea is locating things, these are just fun responses to make
// loki seem more human.
var typicals = {
    "whatislife" : "The meaning of life is 42 of course",
    "whatisthemeaningoflife" : "The meaning of life is 42 of course",
    "whydoweexist" : "I don't trust you with that secret",
    "arewereal" : "I think so, are you real?",
    "whoareyou" : "My name is Loki, I'm your local guide",
    "whatsyourname" : "My name is Loki, I'm your local guide",
    "doyoulikeme" : "I'd prefer if we stayed friends",
    "doyouloveme" : "I'd prefer if we stayed friends",
    "hi" : "Hey, my name is Loki",
    "hello" : "Hey, my name is Loki",
    "hey" : "Hey, my name is Loki",
    "goodbye" : "Sad to see you go",
    "bye" : "Sad to see you go",
    "whereami" : "You're in Manchester, UK",
    "tellmeajoke" : [["Knock, knock.", "Who's there?", "...", "Java"]],
    "no" : "What?",
    "yes" : "What?",
    "a" : "Did you mistype there?"
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
        app.yelp.search({term: query.anal().subject, radius_filter: 5000, location: "Manchester, UK", cll: query.query().get("lat") + "," + query.query().get("lon")})

        // process data
        .then(function (data) {
            if (data.businesses.length == 0) {
                answer.text("I couldn't find anything in your area 😢", false);
            } else {
                // see if they mean anything
                var att = "";
                var iquery = query.query();

                if (query.anal().subject_att.length > 0) {
                    var atts = query.anal().subject_att;

                    // sort by best
                    if (atts[0] == "best") {
                        att = "best ";
                        data.businesses.sort(function(a, b) {
                           return b.rating - a.rating;
                        });
                    } else if (atts[0] == "nearest" || atts[1] == "closest") {
                        att = "nearest ";

                        data.businesses.sort(function(a, b) {
                            var adist = geolib.getDistance(
                                {latitude: iquery.get("lat"), longitude: iquery.get("lon")},
                                {latitude: a.location.coordinate.latitude, longitude: a.location.coordinate.longitude}
                            );
                            var bdist = geolib.getDistance(
                                {latitude: iquery.get("lat"), longitude: iquery.get("lon")},
                                {latitude: b.location.coordinate.latitude, longitude: b.location.coordinate.longitude}
                            );

                            return adist - bdist;
                        });
                    }
                }

                // get the first business
                var business = data.businesses[0];

                // give a text response
                var cat = business.categories[0][0];
                answer.text("I found a " + ((cat.substr(cat.length - 1, 1) == "s") ? cat.substr(0, cat.length - 1) : cat) +
                    " in your area, why not try " + business.name + "?", false);

                // give the business info
                answer.image(business.image_url, business.url, business.name + " - " + "⭐".repeat(Math.floor(business.rating)), {
                    lat : business.location.coordinate.latitude,
                    lon : business.location.coordinate.longitude,
                    distance : (geolib.getDistance(
                        {latitude: iquery.get("lat"), longitude: iquery.get("lon")},
                        {latitude: business.location.coordinate.latitude, longitude: business.location.coordinate.longitude}
                    ) / 1000).toFixed(1)
                });
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
        app.wolfram.query(query.content(), function(err, result) {
            if(err) callback(err);
            else {
                if (result === undefined || result.queryresult === undefined || result.queryresult.pod === undefined) {
                    answer.text("We couldn't understand that object, but we asked your local experts for help!", false);
                    answer._answered = false;
                    callback(null);
                    return;
                }

                var d = 0;

                for (var a = 0; a < result.queryresult.pod.length; a++) {
                    var pod = result.queryresult.pod[a];
                    for (var b = 0; b < pod.subpod.length; b++) {
                        var subpod = pod.subpod[b];
                        for (var c = 0; c < subpod.plaintext.length; c++) {
                            var text = subpod.plaintext[c];
                            answer.text(text);
                            d++;
                            if (d == 2) {
                                callback(null);
                                return;
                            }
                        }
                    }
                }

                if (d == 0) {
                    answer.text("We couldn't answer that, but we asked your local experts for help!", false);
                    answer._answered = false;
                }
                callback(null);
            }
        });
    },

    /**
     * Processes an 'other' question.
     * @param {Query} query
     * @param {Answer} answer
     * @param {function} callback
     */
    processOther: function(query, answer, callback) {
        if (query.sentiment().score < 0) {
            answer.text("That wasn't very nice");
            callback(null);
            return;
        }

        _engine.processWhat(query, answer, callback);
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

        // replace where's, thanks america
        query.query().set("content", query.content().replace("where's", "where is"));
        query.query().set("content", query.content().replace("Where's", "Where is"));
        query.query().set("content", query.content().replace("sneakers", "shoes"));

        // typicals
        var safeContent = query.content().replace(/ /g,'')
            .replace(/[.,\?\/#!$%\^&\*;:{}=\-_`~()]/g,"").toLowerCase();

        if (typicals.hasOwnProperty(safeContent)) {
            if (Array.isArray(typicals[safeContent])) {
                var typical = typicals[safeContent][Math.floor(Math.random() * (typicals[safeContent].length - 0))];

                if (Array.isArray(typical)) {
                    for (var i = 0; i < typical.length; i++)
                        answer.text(typical[i]);
                } else {
                    answer.text(typical);
                }
            } else {
                answer.text(typicals[safeContent]);
            }
            callback(null, answer);
            return;
        }

        // determine best course of action
        var analysis = query.anal();
        console.log(analysis);

        if (analysis.action == "what")
            _engine.processWhat(query, answer, function(err) {
                if (err == null) callback(null, answer);
                else callback(err);
            });
        else if (analysis.action == "where" || analysis.action == "find" || analysis.action == "show")
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