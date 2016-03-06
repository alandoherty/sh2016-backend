// start
console.log("[zest:log] initialising node");

// requires
var fs = require("fs"),
    Yelp = require("yelp"),
    visionApi = require("node-cloud-vision-api"),
    multer = require("multer");

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
 * Route detector-nator.
 */
app.queue(function(finish) {
    app.getExpress().use(function(req, res, next) {
        app.log(req.method + " " + req.path);
        next();
    });
    finish();
});

/**
 * Pretty JSON.
 */
app.queue(function(finish) {
    app.getExpress().use(function(req, res, next) {
        res.json = function(data) {
            res.setHeader("Content-Type", "application/json");
            res.send(JSON.stringify(data, null, 3));
        };
        next();
    });
    finish();
});

/**
 * File uploads
 */
app.queue(function(finish) {
    app.multer = multer({ dest: "./file" });
    finish();
});

/**
 * Wolfram
 */
app.queue(function(finish) {
    var Client = require('node-wolfram');
    app.wolfram = new Client(process.env.WOLFRAM_API_KEY);
    finish();
});

/**
 * Yelp
 */
app.queue(function(done) {
    app.yelp = new Yelp({
        consumer_key: process.env.YELP_CONSUMER_KEY,
        consumer_secret: process.env.YELP_CONSUMER_SECRET,
        token: process.env.YELP_TOKEN,
        token_secret: process.env.YELP_TOKEN_SECRET
    });
    done();
});

/**
 * Cloud vision.
 */
app.queue(function(done) {
    visionApi.init({auth: process.env.VISION_API_KEY});
    done();
});

/**
 * Auth route.
 */
app.getExpress().use(function(req, res, next) {
    if (req.path == "/session/create" || req.path == "/image") next();
    else {
        if (!req.query.session) {
            res.status(401).json({success: false, message: "Not authorised, sorry :("});
        } else {
            app.whereOne("Session", "token = %s", req.query.session, function(err, session) {
                if (err) res.status(500).json({success: false, "message" : err});
                else if (session == null) res.status(400).json({success: false, message: "Invalid session :{"});
                else {
                    req.session = session;
                    next();
                }
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