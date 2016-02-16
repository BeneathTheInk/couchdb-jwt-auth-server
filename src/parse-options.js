import {clone,defaults,omit} from "lodash";
import * as url from "url";

export default function(opts, defs) {
	var href = opts && (opts.href || opts.baseUrl);

	if (opts == null) opts = {};
	else if (typeof opts === "string") {
		href = opts;
		opts = {};
	}
	else if (typeof opts !== "object") {
		throw new Error("Expecting an object or string for connection options.");
	}
	else {
		opts = clone(opts);
	}

	// parse the href as a string
	if (href) {
		href = url.parse(href, true, true);

		// merge in stuff from the query
		defaults(opts, href.query);
	}

	// drop useless properties
	href = omit(href, "host", "href", "url", "search", "query", "hash");

	// no hostname, we assume default couchdb
	if (href.hostname == null) {
		defaults(href, {
			hostname: "localhost",
			port: 5984
		});
	}

	// other defaults
	href = defaults(href, {
		protocol: "http:"
	});

	// parse authentication information
	if (href.auth) opts.auth = href.auth;
	if (typeof opts.auth === "string") {
		let _auth = opts.auth.split(":");
		opts.auth = { username: _auth[0] || "", password: _auth[1] || "" };
	}

	// generate an auth-less href
	opts.baseUrl = url.format(omit(href, "auth"));
	if (opts.baseUrl.substr(-1) != "/") opts.baseUrl += "/";

	return defaults(opts, defs);
}
