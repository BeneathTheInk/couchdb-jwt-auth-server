import utils from "express-pouchdb/lib/utils";
import jwt from "jsonwebtoken";

// mimics couch_jwt_auth for express-pouchdb
export default function({secret}) {
	return function(req, res, next){
		req.couchSession.info.authentication_handlers.push("jwt");

		// ignore requests that are already authenticated
		if (req.couchSession.userCtx.name) return next();

		// ignore requests without authorization
		let auth = req.get("authorization");
		if (!auth || !/^Bearer /.test(auth)) return next();

		let token = auth.substr(6).trim();
		let payload;

		try {
			payload = jwt.verify(token, secret, {
				algorithms: ["HS256"]
			});
		} catch(e) {
			return utils.sendError(res, e, 401);
		}

		if (!payload.name || !Array.isArray(payload.roles)) {
			return utils.sendError(res, {
				name: "InvalidJWTPayload",
				message: "JWT payload is missing name and/or roles."
			}, 401);
		}

		req.couchSession.userCtx.name = payload.name;
		req.couchSession.userCtx.roles = payload.roles;
		req.couchSession.info.authenticated = "jwt";

		return next();
	};
}
