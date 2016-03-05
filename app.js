// start
console.log("[zest:log] initialising node");

// requires
var fs = require("fs");

// karambit requires
var karambit = require("karambit");

/**
 * Initialization
 */
var app = karambit();
app.setTitle("zest");

/**
 * Data
 */
app.data("mysql", {
    user: process.env.MYSQL_USER,
    pass: process.env.MYSQL_PASS,
    host: process.env.MYSQL_HOST,
    db: process.env.MYSQL_DB
});

/**
 * Auth route.
 */
app.getExpress().use(function(req, res, next) {
    if (req.path == "/session/create") next();
    else {
        if (!req.query.session) {
            res.status(401).json({success: false, message: "Not authorised, sorry :("});
        } else {
            app.whereOne("Session", "token = %s", req.query.session, function(err, session) {
                if (err) res.status(500).json({success: false, "message" : err});
                else if (session == null) res.status(400).json({success: false, message: "Invalid session :{"});
                else
                    next();
            });
        }
    }
});

/**
 * Require all the routes.
 */
app.queue(function(finish) {
    fs.readdirSync(__dirname + '/routes').forEach(function (file) {
        require('./routes/' + file);
    });

    finish();
});

/**
 * Run application
 */
app.run(parseInt(process.env.PORT) || 3000, function() {
    app.log("started");
});