import {omit} from "lodash";
import PouchDB from 'pouchdb';
import getCouchOptions from './get-couch-options';

class CouchStore {
  constructor(client) {
    this.client = client;
  }

  async add(sid) {
    const exists = await this.exists(sid);

    if (!exists) {
      return await this.client.post({
        _id: sid,
        created: new Date()
      });
    }
  }

  async _get(sid) {
    const res = await this.client.allDocs({
      key: sid,
      limit: 1
    });

    return res.rows.length && res.rows[0].value;
  }

  async exists(sid) {
    return !!await this._get(sid);
  }

  async remove(sid) {
    const session = await this._get(sid);

    return await this.client.remove(sid, session.rev);
  }
}

export default async function createCouchStore(sessOpts, couchOpts) {
  const options = {
    db: "jwt_sessions",
    ...couchOpts,
    ...getCouchOptions(sessOpts)
  };

  const client = await new Promise((resolve, reject) => {
    const ret = new PouchDB(
      `${options.baseUrl}/${options.db}`,
      omit(options, "baseUrl", "db"),
      err => err ? reject(err) : resolve(ret)
    );
  });

  return new CouchStore(client);
}
