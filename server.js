const path = require("path");
const express = require("express");
const app = express();

app.get("/", function(req, res) {
    res.sendFile(path.join(__dirname + '/static/index.html'));
});

app.use(express.static("static"));

app.listen(process.env.PORT || 8081);
