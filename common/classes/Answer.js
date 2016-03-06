// requires
var utils = require("../utils");

// answer
var Answer = utils.class_("Answer", {
    /**
     * @private
     */
    _chunks: [],

    /**
     * @private
     */
    _query: null,

    _answered: true,

    /**
     * Adds a text chunk.
     * @param {string} text
     * @param {boolean?} emojii
     */
    text: function(text, emojii) {
        if (text.trim().length == 0)
            return;

        this._chunks.push({type: "text",
            text: text + (emojii === true || emojii === undefined ? this._query.emojii() : "")});
    },

    /**
     * Adds a image chunk.
     * @param {string} src
     * @param {string?} url
     * @param {string?} caption
     * @param {object?} extra
     */
    image: function(src, url, caption, extra) {
        var data = {
            type: "image",
            src: src
        };

        // check for url
        if (url !== undefined)
            data.url = url;

        // check for caption
        if (caption !== undefined)
            data.caption = caption;

        // check for extra
        if (extra !== undefined) {
            for (var k in extra) {
                if (extra.hasOwnProperty(k))
                    data[k] = extra[k];
            }
        }

        this._chunks.push(data);
    },

    /**
     * Builds the chunks into an array.
     */
    toArray: function() {
        return this._chunks;
    },

    /**
     * Gets the query.
     * @returns {Query}
     */
    query: function() {
        return this._query;
    },

    /**
     * Creates a new answer.
     * @param {Query} query
     */
    constructor: function(query) {
        this._query = query;
        this._chunks = [];
    }
});

// export
module.exports = Answer;