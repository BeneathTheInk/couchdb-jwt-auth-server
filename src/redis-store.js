import ms from "ms";
import {createClient} from "redis";

export default class RedisStore {
	constructor(options={}) {
		this.prefix = options.prefix == null ? 'jwt:' : options.prefix;
		delete options.prefix;

		if (options.url) {
			options.socket = options.url;
		}

		// convert to redis connect params
		if (options.client) {
			this.client = options.client;
		}
		else if (options.socket) {
			this.client = createClient(options.socket, options);
		}
		else {
			this.client = createClient(options);
		}

		this.ttl = options.ttl;
		let p = [];

		if (options.pass) p.push(new Promise((resolve, reject) => {
			this.client.auth(options.pass, e => {
				if (e) reject(e);
				else resolve();
			});
		}));

		if ('db' in options) {
			if (typeof options.db !== 'number') {
				console.error('Warning: redis store expects a number for the "db" option');
			}

			this.client.select(options.db);
			this.client.on('connect', () => {
				this.client.select(options.db);
			});
		}

		p.push(new Promise((resolve, reject) => {
			let onError, onConnect;
			let done = (fn) => {
				return () => {
					this.client.removeListener('error', onError);
					this.client.removeListener('connect', onConnect);
					fn.apply(null, arguments);
				};
			};

			this.client.on('error', onError = done(reject));
			this.client.on('connect', onConnect = done(resolve));
		}));

		this._ready = Promise.all(p);
	}

	load() {
		return this._ready;
	}

	_getKey(sid) {
		return this.prefix + sid;
	}

	add(sid) {
		return new Promise((resolve, reject) => {
			let key = this._getKey(sid);
			let value = Date.now();
			let done = (err) => {
				if (err) reject(err);
				else resolve();
			};

			if (this.ttl) {
				this.client.setex(key, ms(String(this.ttl)), value, done);
			} else {
				this.client.set(key, value, done);
			}
		});
	}

	exists(sid) {
		return new Promise((resolve, reject) => {
			this.client.exists(this._getKey(sid), (err, res) => {
				if (err) reject(err);
				else resolve(res ? true : false);
			});
		});
	}

	remove(sid) {
		return new Promise((resolve, reject) => {
			this.client.del(this._getKey(sid), (err, res) => {
				if (err) reject(err);
				else resolve(res ? true : false);
			});
		});
	}
}
