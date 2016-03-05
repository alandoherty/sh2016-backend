var karambit = require("karambit");
var app = karambit();

var visionApi = require("node-cloud-vision-api");

/**
 * The vision wrapper.
 * @type {{}}
 */
var vision = {
    /**
     * Requests the Cloud Vision API for an answer.
     * @param {string} path
     * @param {function} callback
     */
    request: function(path, callback) {
        // build request
        var req = new visionApi.Request({
            image: new visionApi.Image(path),
            features: [
                new visionApi.Feature('FACE_DETECTION', 4),
                new visionApi.Feature('LABEL_DETECTION', 5),
                new visionApi.Feature('LOGO_DETECTION', 10)
            ]
        });

        // send
        visionApi.annotate(req).then(function(res) {
            callback(null, res);
        }, function(e) {
            callback(e);
        });
    }
};

// exports
module.exports = vision;