var karambit = require("karambit");
var app = karambit();

var randomstring = require("randomstring");

/**
 * Creates the session.
 */
app.bind("session/create", function(req, res) {
    // check for user
    if (!req.query.user) {
        res.status(400).json({success: false, message: "No username provided"});
        return;
    }

    // get user
    app.whereOne("User", "username = %s", req.query.user, function(err, user) {
        if (err) res.status(500).json({success: false, message: err});
        else if (user == null) res.status(404).json({success: false, message: "Invalid username"});
        else {
            var sess = app.create("Session");
            sess.set("token", randomstring.generate(24));
            sess.set("user", user.get("id"));
            sess.save(function(err) {
                if (err) res.status(500).json({success: false, message: err});
                else {
                    sess.toArrayModel("private", function(data) {
                        res.status(200).json({success: true, message : "Session created", session: data});
                    });
                }
            });
        }
    });
});

/**
 * Destroys the session.
 */
app.bind("session/destroy", function(req, res) {
    req.session.delete(function(err) {
        if (err) res.status(500).json({success: false, message: err});
        else {
            res.status(200).json({success: false, message: "Successfully destroyed session"});
        }
    });
});