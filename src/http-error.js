import {pick} from "lodash";
import {STATUS_CODES} from "http";

export function HTTPError(status, message, code) {
	this.name = "HTTPError";
	this.status = status;
    this.message = message || STATUS_CODES[status];
	this.code = code || "EERROR";
    this.stack = (new Error()).stack;
}

export default HTTPError;

HTTPError.prototype = Object.create(Error.prototype);

HTTPError.prototype.toString = function() {
	return `[${this.name}] ${this.status}: ${this.message}`;
};

export function route(err, req, res, next) {
	if (!err) return next();
	if (!(err instanceof HTTPError)) {
		console.error(err.stack || err);
		err = new HTTPError(500);
	}

	res.status(err.status).json({
		error: true,
		...pick(err, "message", "status", "code")
	});
}
