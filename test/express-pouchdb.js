import EPouchDB from "express-pouchdb";
import jwtroute from "./express-jwt";
import {zipObject,fill,assign} from "lodash";

const fullmode = [
	// sorted alphabetically
	'config-infrastructure',
	'disk-size',
	'logging-infrastructure',
	'replicator',
	'routes/active-tasks',
	'routes/authentication',
	'routes/authorization',
	'routes/cluster',
	'routes/cluster-rewrite',
	'routes/config',
	'routes/db-updates',
	'routes/ddoc-info',
	'routes/fauxton',
	'routes/find',
	'routes/http-log',
	'routes/list',
	'routes/log',
	'routes/replicate',
	'routes/rewrite',
	'routes/security',
	'routes/session',
	'routes/show',
	'routes/special-test-auth',
	'routes/stats',
	'routes/update',
	'routes/uuids',
	'routes/vhosts',
	'validation',
	'compression',
	'routes/404',
	'routes/all-dbs',
	'routes/all-docs',
	'routes/attachments',
	'routes/bulk-docs',
	'routes/bulk-get',
	'routes/changes',
	'routes/compact',
	'routes/db',
	'routes/documents',
	'routes/revs-diff',
	'routes/root',
	'routes/session-stub',
	'routes/temp-views',
	'routes/view-cleanup',
	'routes/views'
];

export default function(PouchDB, opts) {
	const pouchapp = EPouchDB(PouchDB, assign({
        mode: "custom"
    }, opts));

	pouchapp.includes = zipObject(fullmode, fill(new Array(fullmode.length), true));

    // load all modular files
	[
		// order matters in this list!
		'config-infrastructure',
		'logging-infrastructure',
		'compression',
		'disk-size',
		'replicator',
		'routes/http-log',
		'routes/authentication'
	].forEach(function (file) {
		if (pouchapp.includes[file]) {
			require('express-pouchdb/lib/' + file)(pouchapp);
		}
	});

	pouchapp.use(jwtroute({ secret: "secret" }));

	[
		'routes/special-test-auth',
		'routes/authorization',
		'routes/vhosts',
		'routes/cluster-rewrite',
		'routes/rewrite',
		'routes/root',
		'routes/log',
		'routes/session',
		'routes/session-stub',
		'routes/fauxton',
		'routes/cluster',
		'routes/config',
		'routes/uuids',
		'routes/all-dbs',
		'routes/replicate',
		'routes/active-tasks',
		'routes/db-updates',
		'routes/stats',
		'routes/db',
		'routes/bulk-docs',
		'routes/bulk-get',
		'routes/all-docs',
		'routes/changes',
		'routes/compact',
		'routes/revs-diff',
		'routes/security',
		'routes/view-cleanup',
		'routes/temp-views',
		'routes/find',
		'routes/views',
		'routes/ddoc-info',
		'routes/show',
		'routes/list',
		'routes/update',
		'routes/attachments',
		'routes/documents',
		'validation',
		'routes/404'
	].forEach(function (file) {
		if (pouchapp.includes[file]) {
			require('express-pouchdb/lib/' + file)(pouchapp);
		}
	});

	return pouchapp;
}
