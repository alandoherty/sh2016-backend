var karambit = require("karambit");
var app = karambit();

var randomstring = require("randomstring");

app.bind("session/create", function(req, res) {
    var sess = app.create("Session");
    sess.set("token", randomstring.generate(24));
    sess.save(function(err) {
        if (err) res.status(500).json({success: false, message: err});
        else {
            res.status(200).json(sess.toArray("private"));
        }
    });
});