var karambit = require("karambit");
var app = karambit();

app.bind("query/text", function(req, res) {
    res.json({success: false, error: "Not implemented"});
});

app.bind("query/picture", function(req, res) {
    res.json({success: false, error: "Not implemented"});
});
