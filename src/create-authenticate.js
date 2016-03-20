import superagent from "superagent";
import HTTPError from "./http-error";

export default function createAuthenticate(baseUrl) {
  return async function authenticate(username, password) {
    try {
      let {body} = await superagent.get(`${baseUrl}/_session`)
        .accept("application/json")
        .auth(username, password);

      return body;
    } catch(e) {
      let resp = e.response;
      if (!resp) throw e;

      if (resp.statusCode === 401) {
        throw new HTTPError(401, resp.body.reason, "EBADAUTH");
      } else {
        throw new HTTPError(resp.statusCode, resp.body.reason, "ECOUCH");
      }
    }
  };
}
