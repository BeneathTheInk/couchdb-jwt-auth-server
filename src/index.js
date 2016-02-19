import express from "express";
import jwt from "jsonwebtoken";
import couchRequest from "pouchdb/extras/ajax";
import parseOptions from "./parse-options";
import bodyParser from "body-parser";
import crypto from "crypto";
import {pick} from "lodash";
import MemoryStore from "./memory-store";
import CouchStore from "./couch-store";
import globalPaths from "global-paths";

let app = express();
export default app;

let couchOptions;
let sessionStore;
let ready = null;

app.setup = function() {
	if (ready) return ready;

	return (ready = Promise.resolve().then(() => {
		if (!app.get("secret")) {
			throw new Error("Missing JWT secret.");
		}

		couchOptions = parseOptions(app.get("couchdb"));

		let sessOpts = app.get("session") || {};
		let store = sessOpts.store;
		delete sessOpts.store;

		if (!store) store = "memory";
		if (typeof store === "string") {
			if (store === "memory") store = MemoryStore;
			else if (store === "couchdb" || store === "couch") store = CouchStore;
			else {
				// require under the standard name before trying the actual name
				try {
					if (/^\.{0,2}\//.test(store)) throw {};

					[false].concat(globalPaths()).some(p => {
						try {
							store = require((p ? p + "/" : "") + "couchdb-jwt-store-" + store);
							return true;
						} catch(e) {
							return false;
						}
					});
				} catch(e) {
					store = require(store);
				}
			}
		}

		if (typeof store === "function") {
			store = new store(sessOpts, couchOptions);
		}

		sessionStore = store;
		return sessionStore.load();
	}));
};

// force the app to wait for everything to load
app.use(function(req, res, next) {
	app.setup().then(() => next(), next);
});

app.disable("x-powered-by");

const jsonParser = bodyParser.json();
const urlParser = bodyParser.urlencoded({ extended: true });

function generateSession() {
	let sid = crypto.randomBytes(16).toString("hex");
	return Promise.resolve(sessionStore.add(sid)).then(() => sid);
}

function generateToken({ name, roles }, session) {
	return new Promise(resolve => {
		jwt.sign({ name, roles, session }, app.get("secret"), {
			algorithms: [ "HS256" ],
			expiresIn: app.get("expire") || "5m"
		}, resolve);
	});
}

function validateToken(token, ignoreExpiration=false) {
	return new Promise((resolve, reject) => {
		jwt.verify(token, app.get("secret"), {
			algorithms: [ "HS256" ],
			ignoreExpiration
		}, function(err, data) {
			if (err) reject(err);
			else resolve(data);
		});
	}).then(data => {
		return Promise.resolve(sessionStore.exists(data.session)).then(valid => {
			if (!valid) throw new Error("Invalid Session.");
			return data;
		});
	});
}

// main route
app.route("/session")

// extract token from header information
.all(function(req, res, next) {
	let auth = req.get("Authorization") || "";

	if (auth) {
		let m = auth.trim().match(/^Bearer\s*(.*)/);
		if (m) req.jwt = m[1];
	}

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
	couchRequest({
		method: "GET",
		url: couchOptions.baseUrl + "_session",
		auth: {
			username: req.body.username || req.body.name,
			password: req.body.password || req.body.pass
		}
	}, (err, resp) => {
		if (err) return next(err);

		return generateSession().then(sess => {
			return generateToken(resp.userCtx, sess);
		}).then((token) => {
			res.type("application/jwt").send(token);
		}).catch(next);
	});
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
		return Promise.resolve(sessionStore.remove(data.session));
	}).then(() => {
		res.send({ ok: true });
	}).catch(next);
});

// // create new user
// app.post("/signup", function(/* req, res, next */) {
//
// });

app.use(function(req, res) {
	res.sendStatus(404);
});
