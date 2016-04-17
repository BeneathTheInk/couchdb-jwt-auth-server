import supertest from "supertest";
import jwt from "jsonwebtoken";
import test from "tape";
const couchdbjwt = require("./");

const username = process.env.COUCHDB_USER;
const password = process.env.COUCHDB_PASS;

if (!process.env.NODE_ENV) {
	process.env.NODE_ENV = "development";
}

function createApp(opts) {
	return couchdbjwt({
		couchdb: process.env.COUCHDB_URL,
		secret: process.env.COUCHDB_SECRET,
		...opts
	});
}

function verify(token) {
	return jwt.verify(token, process.env.COUCHDB_SECRET, {
		algorithms: [ "HS256" ]
	});
}

test("signs in and responds with token", async (t) => {
	try {
		t.plan(4);
		const request = supertest(createApp());

		let {body} = await request.post("/")
			.send({ username, password })
			.expect(200);

		t.ok(body.ok, "response was okay");
		let payload = verify(body.token);
		t.equals(payload.name, username, "has correct username");
		t.ok(payload.session, "has a session id");
		t.ok(payload.exp, "expires");
	} catch(e) {
		t.error(e);
	} finally {
		t.end();
	}
});

test("signs in and responds with application/jwt when accepted", async (t) => {
	try {
		t.plan(3);
		const request = supertest(createApp());

		let {text} = await request.post("/")
			.accept("application/jwt")
			.buffer()
			.send({ username, password })
			.expect(200);

		let payload = verify(text);
		t.equals(payload.name, username, "has correct username");
		t.ok(payload.session, "has a session id");
		t.ok(payload.exp, "expires");
	} catch(e) {
		t.error(e);
	} finally {
		t.end();
	}
});

test("sign in can create a session-less token", async (t) => {
	try {
		t.plan(3);
		const request = supertest(createApp());

		let {text} = await request.post("/")
			.accept("application/jwt")
			.buffer()
			.send({ username, password, session: false })
			.expect(200);

		let payload = verify(text);
		t.equals(payload.name, username, "has correct username");
		t.notOk(payload.session, "does not have a session id");
		t.ok(payload.exp, "expires");
	} catch(e) {
		t.error(e);
	} finally {
		t.end();
	}
});

test("fails to sign in with incorrect credentials", async (t) => {
	try {
		t.plan(3);
		const request = supertest(createApp());

		let {body} = await request.post("/")
			.send({ username: "notauser", password: "notapass" })
			.expect(401);

		t.ok(body.error, "responds with error");
		t.equals(body.status, 401, "is unauthorized error");
		t.equals(body.code, "EBADAUTH", "error has EBADAUTH code");
	} catch(e) {
		t.error(e);
	} finally {
		t.end();
	}
});

test("renews token, responding with new token", async (t) => {
	try {
		t.plan(8);
		const request = supertest(createApp());
		let token, session;

		let {body:postbody} = await request.post("/")
			.send({ username, password })
			.expect(200);

		t.ok(postbody.ok, "signed in");
		t.ok(token = postbody.token, "has token");
		t.ok(session = postbody.session, "has session id");

		// force a wait so we get a new token
		await new Promise(resolve => setTimeout(resolve, 1000));

		let {body:putbody} = await request.put("/")
			.set("Authorization", "Bearer" + token)
			.expect(200);

		t.ok(putbody.ok, "renewed token");
		t.ok(putbody.token, "has token");
		let payload = verify(putbody.token);
		t.notEquals(putbody.token, token, "has a different token than before");
		t.equals(payload.session, session, "has the same session as before");
		t.equals(payload.name, username, "has correct username");
	} catch(e) {
		t.error(e);
	} finally {
		t.end();
	}
});

test("renews token, responding with application/jwt when accepted", async (t) => {
	try {
		t.plan(6);
		const request = supertest(createApp());
		let token, session;

		let {body} = await request.post("/")
			.send({ username, password })
			.expect(200);

		t.ok(body.ok, "signed in");
		t.ok(token = body.token, "has token");
		t.ok(session = body.session, "has session id");

		// force a wait so we get a new token
		await new Promise(resolve => setTimeout(resolve, 1000));

		let {text} = await request.put("/")
			.accept("application/jwt")
			.buffer()
			.set("Authorization", "Bearer" + token)
			.expect(200);

		let payload = verify(text);
		t.notEquals(text, token, "has a different token than before");
		t.equals(payload.session, session, "has the same session as before");
		t.equals(payload.name, username, "has correct username");
	} catch(e) {
		t.error(e);
	} finally {
		t.end();
	}
});

test("fails to renew a session-less token", async (t) => {
	try {
		t.plan(3);
		const request = supertest(createApp());

		let {text:token} = await request.post("/")
			.accept("application/jwt")
			.buffer()
			.send({ username, password, session: false })
			.expect(200);

		let {body} = await request.put("/")
			.set("Authorization", "Bearer " + token)
			.expect(401);

		t.ok(body.error, "renewing results in error");
		t.equals(body.status, 401, "is unauthorized error");
		t.equals(body.code, "EBADSESSION", "has EBADSESSION code");
	} catch(e) {
		t.error(e);
	} finally {
		t.end();
	}
});

test("gets token information", async (t) => {
	try {
		t.plan(5);
		const request = supertest(createApp());

		let {body:postbody} = await request.post("/")
			.send({ username, password })
			.expect(200);

		t.ok(postbody.ok, "signed in");
		t.ok(postbody.token, "has token");

		let {body:getbody} = await request.get("/")
			.set("Authorization", "Bearer" + postbody.token)
			.expect(200);

		t.ok(getbody.ok, "response was okay");
		t.equals(getbody.userCtx.name, username, "has correct username");
		t.ok(getbody.session, "has a session id");
	} catch(e) {
		t.error(e);
	} finally {
		t.end();
	}
});

test("signs out with token", async (t) => {
	try {
		t.plan(6);
		const request = supertest(createApp());
		let token;

		let {body:postbody} = await request.post("/")
			.send({ username, password })
			.expect(200);

		t.ok(postbody.ok, "signed in");
		t.ok(token = postbody.token, "has token");

		let {body:deletebody} = await request.delete("/")
			.set("Authorization", "Bearer" + token)
			.expect(200);

		t.ok(deletebody.ok, "signed out");

		let {body:errbody} = await request.get("/")
			.set("Authorization", "Bearer" + token)
			.expect(401);

		t.ok(errbody.error, "reusing token results in error");
		t.equals(errbody.status, 401, "is unauthorized error");
		t.equals(errbody.code, "EBADSESSION", "has EBADSESSION code");
	} catch(e) {
		t.error(e);
	} finally {
		t.end();
	}
});

test("fails to signout with a session-less token", async (t) => {
	try {
		t.plan(3);
		const request = supertest(createApp());

		let {text:token} = await request.post("/")
			.accept("application/jwt")
			.buffer()
			.send({ username, password, session: false })
			.expect(200);

		let {body} = await request.delete("/")
			.set("Authorization", "Bearer " + token)
			.expect(401);

		t.ok(body.error, "signing out results in error");
		t.equals(body.status, 401, "is unauthorized error");
		t.equals(body.code, "EBADSESSION", "has EBADSESSION code");
	} catch(e) {
		t.error(e);
	} finally {
		t.end();
	}
});

test("responds with unauthorized error when token is missing", async (t) => {
	try {
		t.plan(3);
		const request = supertest(createApp());

		let {body} = await request.get("/").expect(401);

		t.ok(body.error, "responds with error");
		t.equals(body.status, 401, "was an unauthorized error");
		t.equals(body.code, "EBADTOKEN", "error had bad token code");
	} catch(e) {
		t.error(e);
	} finally {
		t.end();
	}
});

test("responds with invalid token error when token is invalid", async (t) => {
	try {
		t.plan(3);
		const request = supertest(createApp());

		let {body} = await request.get("/")
			.set("Authorization", "Bearer notavalidtoken")
			.expect(401);

		t.ok(body.error, "responds with error");
		t.equals(body.status, 401, "was an unauthorized error");
		t.equals(body.code, "EBADTOKEN", "error had bad token code");
	} catch(e) {
		t.error(e);
	} finally {
		t.end();
	}
});
