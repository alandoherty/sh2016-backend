var karambit = require("karambit");
var app = karambit();

// requires
var fs = require("fs");

app.bind("image/get", function(req, res) {
    // checks if idiots didn't pass image name
    if (!req.query.name) {
        res.status(400).json({success: false, message: "Missing image name"});
        return;
    }

    // #secure
    fs.exists("./images/" + req.query.name, function(exists) {
        if (exists)
            res.status(200).sendFile(req.query.name, {root: "./images"});
        else
            res.status(404).json({success: false, message: "Image not found"});
    });
});