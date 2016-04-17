import superagent from "superagent";
import HTTPError from "./http-error";
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

async function defaultRefreshRoles({name,roles,token}, {baseUrl}) {
  try {
    let {body} = await superagent.get(`${baseUrl}/_users/org.couchdb.user:${name}`)
      .set("Authorization", "Bearer " + token)
      .accept("application/json");

    return body.roles;
  } catch(e) {
    return roles;
  }
}

export default function(couchOpts={}, opts={}) {
  const api = {};
  const {baseUrl} = couchOpts;
  const {
    algorithms, expiresIn, secret,
    refreshRoles=defaultRefreshRoles
  } = opts;
  const algorithm = Array.isArray(algorithms) ? algorithms[0] : "HS256";

  api.authenticate = async function authenticate(username, password) {
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

  api.generateToken = function generateToken({name, roles}, session) {
    const token = jwt.sign({name, roles, session}, secret, {algorithm, expiresIn});
    const data = jwt.decode(token);
    data.token = token;
    return data;
  };

  api.generateSession = async function generateSession() {
    const sid = crypto.randomBytes(16).toString('hex');
    await this.sessionStore.add(sid);
    return sid;
  };

  api.validateToken = async function validateToken(token, opts={}) {
    let { ignoreExpiration=false } = opts;

    // decode data without verifying to check the session first
    const data = jwt.decode(token);
    if (!data) {
      throw new HTTPError(401, "Missing or invalid token.", "EBADTOKEN");
    }

    // ensure session id exists
    if (data.session) {
      const exists = await this.sessionStore.exists(data.session);
      if (!exists) {
        throw new HTTPError(401, "Invalid session.", "EBADSESSION");
      }
    } else {
      throw new HTTPError(401, "Missing session id.", "EBADSESSION");
    }

    // verify the token
    try {
      jwt.verify(token, secret, {
        algorithms,
        ignoreExpiration
      });
    } catch(e) {
      if (e.name === "TokenExpiredError") {
        throw new HTTPError(401, "Expired token.", "EEXPTOKEN");
      } else if (e.name === "JsonWebTokenError") {
        throw new HTTPError(401, "Missing or invalid token.", "EBADTOKEN");
      }
    }

    // return the payload
    data.token = token;
    return data;
  };

  api.refreshRoles = async function(data) {
    if (typeof refreshRoles === "function") {
      return await refreshRoles.call(this, data, couchOpts);
    }

    return data.roles;
  };

  api.login = async function login(username, password) {
    const response = await this.authenticate(username, password);
    const session = await this.generateSession();
    return this.generateToken(response.userCtx, session);
  };

  api.logout = async function logout(token) {
    const data = await this.validateToken(token);
    await this.sessionStore.remove(data.session);
    return data;
  };

  api.renew = async function renew(token) {
    const data = await this.validateToken(token);
    data.roles = await this.refreshRoles(data);
    return this.generateToken(data, data.session);
  };

  return api;
}
