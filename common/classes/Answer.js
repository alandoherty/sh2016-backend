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

    /**
     * Adds a text chunk.
     * @param {string} text
     * @param {boolean?} emojii
     */
    text: function(text, emojii) {
        this._chunks.push({type: "text",
            text: text + (emojii === true || emojii === undefined ? this._query.emojii() : "")});
    },

    /**
     * Adds a business.
     * @param {object} business
     */
    business: function(business) {
        this._chunks.push({
            type: "business",
            name: business.name,
            rating: business.rating,
            url: business.url,
            image: business.image_url,
            category: (business.categories.length == 0) ? "Unknown" : business.categories[0][0]
        });
    },

    /**
     * Adds a image chunk.
     * @param {string} image
     */
    image: function(image) {
        this._chunks.push({type: "image", name: image});
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