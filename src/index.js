import express from "express";
import jwt from "jsonwebtoken";
import CouchPouch from "pouchdb-couchdb";
import bodyParser from "body-parser";

let CouchDB = CouchPouch("http://admin:12345@localhost:5984");
CouchDB.on("ready", () => console.log("couchdb ready"));

let app = express();
export default app;

// auth server details
app.get("/", function(/* req, res, next */) {

});

const jsonParser = bodyParser.json();
const urlParser = bodyParser.urlencoded({ extended: true });

function toBase64(str) {
	return new Buffer(str, "utf-8").toString("base64");
}

function authHeader(auth) {
	if (auth) return "Basic " + toBase64((auth.name || "") + ":" + (auth.pass || ""));
}

// main route
app.route("/session")

.all(function(req, res, next) {
	let auth = req.get("Authorization") || "";
	if (!auth) return next();

	let m = auth.trim().match(/^Bearer\s*(.*)/);
	if (m) req.jwt = m[1];

	next();
})

// fetch/verify existing JWT
.get(function(req, res, next) {
	jwt.verify(req.jwt, "secret", {
		algorithms: [ "HS256" ]
	}, function(err, data) {
		if (err) next(err);
		res.send(data);
	});
})

// sign in
.post(jsonParser, urlParser, function(req, res) {
	CouchDB.request({
		method: "GET",
		url: "/_session",
		headers: {
			Authorization: CouchPouch.utils.basicAuthHeader(req.body)
		}
	}).then((resp) => {
		console.log("res:", resp);
	}).catch((e) => {
		console.log("error:", e);
	}).then(() => {
		res.end();
	});
})

// renew token
.put(function(/* req, res, next */) {

})

// sign out
.delete(function(/* req, res, next */) {

});

// create new user
app.post("/signup", function(/* req, res, next */) {

});
