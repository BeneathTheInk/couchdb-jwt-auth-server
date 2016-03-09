import superagent from "superagent";
import sapromise from "superagent-promise-plugin";
import saprefix from "superagent-prefix";
import jwt from "jsonwebtoken";

export default function({test,secret,url,username,password}) {
	const req = (method) => {
		return superagent(method, "/")
			.use(sapromise)
			.use(saprefix(url));
	};

	const verify = (token) => {
		return jwt.verify(token, secret, {
			algorithms: [ "HS256" ]
		});
	};

	test("signs in and responds with token", async (t) => {
		try {
			t.plan(4);
			let {body} = await req("POST").send({ username, password }).end();
			t.ok(body.ok, "response was okay");
			let payload = verify(body.token);
			t.equals(payload.name, username, "has correct username");
			t.ok(payload.session, "has a session id");
			t.ok(payload.exp, "expires");
		} catch(e) {
			t.error(e);
			t.end();
		}
	});

	test("signs in and responds with application/jwt when accepted", async (t) => {
		try {
			t.plan(3);

			let {text} = await req("POST")
				.accept("application/jwt")
				.buffer()
				.send({ username, password })
				.end();

			let payload = verify(text);
			t.equals(payload.name, username, "has correct username");
			t.ok(payload.session, "has a session id");
			t.ok(payload.exp, "expires");
		} catch(e) {
			t.error(e);
			t.end();
		}
	});

	test("renews token, responding with new token", async (t) => {
		try {
			t.plan(8);
			let token, session;

			let {body:postbody} = await req("POST").send({ username, password }).end();
			t.ok(postbody.ok, "signed in");
			t.ok(token = postbody.token, "has token");
			t.ok(session = postbody.session, "has session id");

			// force a wait so we get a new token
			await new Promise(resolve => setTimeout(resolve, 1000));

			let {body:putbody} = await req("PUT").set("Authorization", "Bearer" + token).end();
			t.ok(putbody.ok, "renewed token");
			t.ok(putbody.token, "has token");
			let payload = verify(putbody.token);
			t.notEquals(putbody.token, token, "has a different token than before");
			t.equals(payload.session, session, "has the same session as before");
			t.equals(payload.name, username, "has correct username");
		} catch(e) {
			t.error(e);
			t.end();
		}
	});

	test("renews token, responding with application/jwt when accepted", async (t) => {
		try {
			t.plan(6);
			let token, session;

			let {body} = await req("POST").send({ username, password }).end();
			t.ok(body.ok, "signed in");
			t.ok(token = body.token, "has token");
			t.ok(session = body.session, "has session id");

			// force a wait so we get a new token
			await new Promise(resolve => setTimeout(resolve, 1000));

			let {text} = await req("PUT")
				.accept("application/jwt")
				.buffer()
				.set("Authorization", "Bearer" + token)
				.end();

			let payload = verify(text);
			t.notEquals(text, token, "has a different token than before");
			t.equals(payload.session, session, "has the same session as before");
			t.equals(payload.name, username, "has correct username");
		} catch(e) {
			t.error(e);
			t.end();
		}
	});

	test("gets token information", async (t) => {
		try {
			t.plan(5);

			let {body:postbody} = await req("POST").send({ username, password }).end();
			t.ok(postbody.ok, "signed in");
			t.ok(postbody.token, "has token");

			let {body:getbody} = await req("GET").set("Authorization", "Bearer" + postbody.token).end();
			t.ok(getbody.ok, "response was okay");
			t.equals(getbody.userCtx.name, username, "has correct username");
			t.ok(getbody.session, "has a session id");
		} catch(e) {
			t.error(e);
			t.end();
		}
	});

	test("signs out with token", async (t) => {
		try {
			t.plan(5);
			let token;

			let {body:postbody} = await req("POST").send({ username, password }).end();
			t.ok(postbody.ok, "signed in");
			t.ok(token = postbody.token, "has token");

			let {body:deletebody} = await req("DELETE")
				.set("Authorization", "Bearer" + token)
				.end();

			t.ok(deletebody.ok, "signed out");

			try {
				await req("GET").set("Authorization", "Bearer" + token).end();
				throw new Error("Did not throw an error");
			} catch(e) {
				let resp = e.response;
				if (!resp) throw e;
				t.ok(resp.body.error, "reusing token results in error");
				t.equals(resp.body.status, 401, "was an unauthorized error");
			}
		} catch(e) {
			t.error(e);
			t.end();
		}
	});

	test("responds with unauthorized error when token is missing", async (t) => {
		try {
			t.plan(3);

			try {
				await req("GET").end();
				throw new Error("Did not throw an error");
			} catch(e) {
				let resp = e.response;
				if (!resp) throw e;
				t.ok(resp.body.error, "responds with error");
				t.equals(resp.body.status, 401, "was an unauthorized error");
				t.equals(resp.body.code, "EBADTOKEN", "error had bad token code");
			}
		} catch(e) {
			t.error(e);
			t.end();
		}
	});

	test("responds with invalid token error when token is invalid", async (t) => {
		try {
			t.plan(3);

			try {
				await req("GET").set("Authorization", "Bearer notavalidtoken").end();
				throw new Error("Did not throw an error");
			} catch(e) {
				let resp = e.response;
				if (!resp) throw e;
				t.ok(resp.body.error, "responds with error");
				t.equals(resp.body.status, 401, "was an unauthorized error");
				t.equals(resp.body.code, "EBADTOKEN", "error had bad token code");
			}
		} catch(e) {
			t.error(e);
			t.end();
		}
	});
}
