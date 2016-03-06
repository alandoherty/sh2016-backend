// requires
var utils = require("../utils"),
    speakeasy = require("speakeasy-nlp");

// answer
var Query = utils.class_("Query", {
    /**
     * @private
     */
    _query: null,

    /**
     * @private
     */
    _analysis: null,

    /**
     * @private
     */
    _sentiment: null,

    /**
     * Gets the query.
     * @returns {object}
     */
    query: function() {
        return this._query;
    },

    /**
     * Gets the content.
     * @returns {string}
     */
    content: function() {
        return this._query.get("content")
    },

    /**
     * Gets the sentiment.
     * @returns {object}
     */
    sentiment: function() {
        if (this._sentiment == null) {
            this._sentiment = speakeasy.sentiment.analyze(this.content());
        }

        return this._sentiment;
    },

    /**
     * Gets the sentiment emojii.
     * @returns {string}
     */
    emojii: function() {
        if (this.sentiment().score > 0)
            return " 😊";
        else if (this.sentiment().score < 0)
            return " 😢";
        else
            return "";
    },

    /**
     * Gets the query analysis.
     */
    anal: function() {
        if (this._analysis == null) {
            var data = speakeasy.classify(this._query.get("content"));

            // process subject
            if (data.subject !== undefined) {
                if (data.subject.indexOf(" ") !== -1) {
                    var subject = data.subject.split(" ");
                    data.subject_att = subject.slice(0, subject.length - 1);
                    data.subject = subject[subject.length - 1];
                } else {
                    data.subject_att = [];
                }
            }

            this._analysis = data;
        }

        return this._analysis;
    },

    /**
     * Creates a new query.
     * @param {Model} query
     */
    constructor: function(query) {
        this._query = query;
        this._analysis = null;
    }
});

// export
module.exports = Query;