import supertest from "supertest";
import jwt from "jsonwebtoken";
import tape from "tape";
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

function test(msg, fn) {
	tape(msg, async function(t) {
		try {
			await fn(t);
		} catch(e) {
			t.error(e);
		} finally {
			t.end();
		}
	});
}

test("signs in and responds with token", async (t) => {
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
});

test("signs in and responds with application/jwt when accepted", async (t) => {
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
});

test("fails to sign in with incorrect credentials", async (t) => {
	t.plan(3);
	const request = supertest(createApp());

	let {body} = await request.post("/")
		.send({ username: "notauser", password: "notapass" })
		.expect(401);

	t.ok(body.error, "responds with error");
	t.equals(body.status, 401, "is unauthorized error");
	t.equals(body.code, "EBADAUTH", "error has EBADAUTH code");
});

test("fails to sign in with missing username and password", async (t) => {
	t.plan(3);
	const request = supertest(createApp());

	let {body} = await request.post("/").expect(400);

	t.ok(body.error, "responds with error");
	t.equals(body.status, 400, "is bad request error");
	t.equals(body.code, "EBADINPUT", "error has bad input code");
});

test("renews token, responding with new token", async (t) => {
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
});

test("renews token, responding with application/jwt when accepted", async (t) => {
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
});

test("fails to renew token with invalid session", async (t) => {
	t.plan(6);
	const request = supertest(createApp());
	let token;

	let {body:signinBody} = await request.post("/")
		.send({ username, password })
		.expect(200);

	t.ok(signinBody.ok, "signed in");
	t.ok(token = signinBody.token, "has token");

	// force a wait so we get a new token
	await new Promise(resolve => setTimeout(resolve, 1000));

	let {body:signoutBody} = await request.delete("/")
		.set("Authorization", "Bearer" + token)
		.expect(200);

	t.ok(signoutBody.ok, "signed out");

	let {body:renewBody} = await request.put("/")
		.set("Authorization", "Bearer" + token)
		.expect(401);

	t.ok(renewBody.error, "responds with error");
	t.equals(renewBody.status, 401, "was an unauthorized error");
	t.equals(renewBody.code, "EBADSESSION", "error had bad session code");
});

test("renews expired token", async (t) => {
	t.plan(8);
	const request = supertest(createApp({
		expiresIn: "1s"
	}));
	let token, session;

	let {body:signinBody} = await request.post("/")
		.send({ username, password })
		.expect(200);

	t.ok(signinBody.ok, "signed in");
	t.ok(token = signinBody.token, "has token");
	t.ok(session = signinBody.session, "has session id");

	// force a wait so the token expires
	await new Promise(resolve => setTimeout(resolve, 3000));

	try {
		verify(token);
		t.fail("token is not expired");
	} catch(e) {
		if (e.name !== "TokenExpiredError") throw e;
		t.pass("token is expired");
	}

	let {body:renewBody} = await request.put("/")
		.set("Authorization", "Bearer" + token)
		.expect(200);

	t.ok(renewBody.ok, "renewed token");
	let payload = verify(renewBody.token);
	t.notEquals(renewBody.token, token, "has a different token than before");
	t.equals(payload.session, session, "has the same session as before");
	t.equals(payload.name, username, "has correct username");
});

test("gets token information", async (t) => {
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
});

test("fails to get token information with invalid session", async (t) => {
	t.plan(6);
	const request = supertest(createApp());
	let token;

	let {body:signinBody} = await request.post("/")
		.send({ username, password })
		.expect(200);

	t.ok(signinBody.ok, "signed in");
	t.ok(token = signinBody.token, "has token");

	// force a wait so we get a new token
	await new Promise(resolve => setTimeout(resolve, 1000));

	let {body:signoutBody} = await request.delete("/")
		.set("Authorization", "Bearer" + token)
		.expect(200);

	t.ok(signoutBody.ok, "signed out");

	let {body:info} = await request.get("/")
		.set("Authorization", "Bearer" + token)
		.expect(401);

	t.ok(info.error, "responds with error");
	t.equals(info.status, 401, "was an unauthorized error");
	t.equals(info.code, "EBADSESSION", "error had bad session code");
});

test("fails to get token information on expired token", async (t) => {
	t.plan(5);
	const request = supertest(createApp({
		expiresIn: "1s"
	}));
	let token;

	let {body:signinBody} = await request.post("/")
		.send({ username, password })
		.expect(200);

	t.ok(signinBody.ok, "signed in");
	t.ok(token = signinBody.token, "has token");

	// force a wait so token expires
	await new Promise(resolve => setTimeout(resolve, 3000));

	let {body:info} = await request.get("/")
		.set("Authorization", "Bearer" + token)
		.expect(401);

	t.ok(info.error, "responds with error");
	t.equals(info.status, 401, "was an unauthorized error");
	t.equals(info.code, "EEXPTOKEN", "error had expired token code");
});

test("signs out with token", async (t) => {
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
});

test("fails to sign out with invalid session", async (t) => {
	t.plan(6);
	const request = supertest(createApp());
	let token;

	let {body:signinBody} = await request.post("/")
		.send({ username, password })
		.expect(200);

	t.ok(signinBody.ok, "signed in");
	t.ok(token = signinBody.token, "has token");

	// force a wait so we get a new token
	await new Promise(resolve => setTimeout(resolve, 1000));

	let {body:signoutBody1} = await request.delete("/")
		.set("Authorization", "Bearer" + token)
		.expect(200);

	t.ok(signoutBody1.ok, "signed out");

	let {body:signoutBody2} = await request.delete("/")
		.set("Authorization", "Bearer" + token)
		.expect(401);

	t.ok(signoutBody2.error, "responds with error");
	t.equals(signoutBody2.status, 401, "was an unauthorized error");
	t.equals(signoutBody2.code, "EBADSESSION", "error had bad session code");
});

test("signs out with expired token", async (t) => {
	t.plan(4);
	const request = supertest(createApp({
		expiresIn: "1s"
	}));
	let token;

	let {body:signinBody} = await request.post("/")
		.send({ username, password })
		.expect(200);

	t.ok(signinBody.ok, "signed in");
	t.ok(token = signinBody.token, "has token");

	// force a wait so the token expires
	await new Promise(resolve => setTimeout(resolve, 3000));

	try {
		verify(token);
		t.fail("token is not expired");
	} catch(e) {
		if (e.name !== "TokenExpiredError") throw e;
		t.pass("token is expired");
	}

	let {body:signoutBody} = await request.delete("/")
		.set("Authorization", "Bearer" + token)
		.expect(200);

	t.ok(signoutBody.ok, "signed out");
});

test("responds with unauthorized error when token is missing", async (t) => {
	t.plan(3);
	const request = supertest(createApp());

	let {body} = await request.get("/").expect(401);

	t.ok(body.error, "responds with error");
	t.equals(body.status, 401, "was an unauthorized error");
	t.equals(body.code, "EBADTOKEN", "error had bad token code");
});

test("responds with invalid token error when token is invalid", async (t) => {
	t.plan(3);
	const request = supertest(createApp());

	let {body} = await request.get("/")
		.set("Authorization", "Bearer notavalidtoken")
		.expect(401);

	t.ok(body.error, "responds with error");
	t.equals(body.status, 401, "was an unauthorized error");
	t.equals(body.code, "EBADTOKEN", "error had bad token code");
});
