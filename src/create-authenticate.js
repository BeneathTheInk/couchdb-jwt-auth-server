import couchRequest from "pouchdb/extras/ajax";

export default function createAuthenticate(baseUrl) {
  return async function authenticate(username, password) {
    return await new Promise((resolve, reject) => {
      couchRequest({
        method: 'GET',
        url: `${baseUrl}/_session`,
        auth: {
          username,
          password
        }
      }, (err, resp) => err ? reject(err) : resolve(resp));
    });
  };
}
