import express from "express";
import jwt from "jsonwebtoken";
import CouchPouch from "pouchdb-couchdb";
import bodyParser from "body-parser";
import {createClient} from "redis";
import crypto from "crypto";
import {pick} from "lodash";

let CouchDB = CouchPouch("http://admin:12345@localhost:5984");
CouchDB.on("ready", () => console.log("couchdb ready"));

let redis = createClient();
redis.on("ready", () => console.log("redis ready"));

let app = express();
export default app;

app.disable("x-powered-by");

// auth server details
// app.get("/", function(/* req, res, next */) {
//
// });

const jsonParser = bodyParser.json();
const urlParser = bodyParser.urlencoded({ extended: true });

function generateSession() {
	let session = crypto.randomBytes(16).toString("hex");

	return new Promise((resolve, reject) => {
		redis.setex("jwt:" + session, 14*24*60*60,  Date.now(), (err) => {
			if (err) reject(err);
			else resolve();
		});
	}).then(() => session);
}

function validateSession(session) {
	return new Promise((resolve, reject) => {
		redis.exists("jwt:" + session, (err, res) => {
			if (err) reject(err);
			else resolve(res ? true : false);
		});
	});
}

function removeSession(session) {
	return new Promise((resolve, reject) => {
		redis.del("jwt:" + session, (err, res) => {
			if (err) reject(err);
			else resolve(res ? true : false);
		});
	});
}

function generateToken({ name, roles }, session) {
	return new Promise(resolve => {
		jwt.sign({ name, roles, session }, "secret", {
			algorithms: [ "HS256" ],
			expiresIn: "5m"
		}, resolve);
	});
}

function validateToken(token, ignoreExpiration=false) {
	return new Promise((resolve, reject) => {
		jwt.verify(token, "secret", {
			algorithms: [ "HS256" ],
			ignoreExpiration
		}, function(err, data) {
			if (err) reject(err);
			else resolve(data);
		});
	}).then(data => {
		return validateSession(data.session).then(valid => {
			if (!valid) throw new Error("Invalid Session.");
			return data;
		});
	});
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
	validateToken(req.jwt).then(data => {
		res.send({
			ok: true,
			userCtx: pick(data, "name", "roles"),
			session: data.session,
			issued: new Date(data.iat * 1000),
			expires: new Date(data.exp * 1000),
		});
	}).catch(next);
})

// sign in
.post(jsonParser, urlParser, function(req, res, next) {
	CouchDB.request({
		method: "GET",
		url: "/_session",
		headers: {
			Authorization: CouchPouch.utils.basicAuthHeader(req.body)
		}
	}).then((resp) => {
		return generateSession().then(sess => {
			return generateToken(resp.userCtx, sess);
		}).then((token) => {
			res.type("application/jwt").send(token);
		});
	}).catch(next);
})

// renew token
.put(function(req, res, next) {
	validateToken(req.jwt, true).then(data => {
		return generateToken(data, data.session);
	}).then(token => {
		res.type("application/jwt").send(token);
	}).catch(next);
})

// sign out
.delete(function(req, res, next) {
	validateToken(req.jwt, true).then(data => {
		return removeSession(data.session);
	}).then(() => {
		res.send({ ok: true });
	}).catch(next);
});

// create new user
app.post("/signup", function(/* req, res, next */) {

});
