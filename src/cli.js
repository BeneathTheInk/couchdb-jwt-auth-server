import minimist from "minimist";
import {has} from "lodash";

var argv = minimist(process.argv.slice(2), {
	string: [ ],
	boolean: [ "help", "version", "production" ],
	alias: {
		h: "help", H: "help",
		v: "version", V: "version"
	}
});

if (argv.help) {
	console.log("halp plz");
	process.exit(0);
}

if (argv.version) {
	let pkg = require("./package.json");
	console.log("%s %s", pkg.name, pkg.version || "edge");
	process.exit(0);
}

function panic(e) {
	console.error(e.stack || e);
	process.exit(1);
}

if (argv.production) process.env.NODE_ENV = "production";
else if (!process.env.NODE_ENV) process.env.NODE_ENV = "development";

var app = require("./");

[
	"couchdb",
	"session"
].forEach(key => {
	if (has(argv, key)) app.set(key, argv[key]);
});

app.setup().then(() => {
	let server = app.listen(argv.port || 3000, "127.0.0.1", function() {
		let addr = server.address();
		console.log("HTTP server listening at http://%s:%s", addr.address, addr.port);
	});

	server.on("error", panic);
}).catch(panic);
