#!/usr/bin/env node
'use strict';

var app = require("./");

app.listen(3000, function () {
	console.log("waiting for requests");
});