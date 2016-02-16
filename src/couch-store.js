import PouchDB from "pouchdb";
import parseOptions from "./parse-options";
import {assign,omit} from "lodash";

export default class CouchStore {
	constructor(options, couchOpts) {
		options = assign({}, couchOpts, parseOptions(options, {
			db: "jwt_sessions"
		}));

		this._ready = new Promise((resolve, reject) => {
			let dburl = options.baseUrl + options.db;
			let pouchOpts = omit(options, "baseUrl", "db");
			this.client = new PouchDB(dburl, pouchOpts, (err) => {
				if (err) reject(err);
				else resolve();
			});
		});
	}

	load() {
		return this._ready;
	}

	add(sid) {
		return this.exists(sid).then(exists => {
			if (exists) return;
			return this.client.post({
				_id: sid,
				created: new Date()
			});
		});
	}

	_get(sid) {
		return this.client.allDocs({
			key: sid,
			limit: 1
		}).then((res) => {
			return res.rows.length ? res.rows[0].value : null;
		});
	}

	exists(sid) {
		return this._get(sid).then((d) => {
			return !!d;
		});
	}

	remove(sid) {
		return this._get(sid).then(res => {
			this.client.remove(sid, res.rev);
		});
	}
}
