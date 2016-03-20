import jwt from 'jsonwebtoken';
import HTTPError from "./http-error";

export default function createValidateToken({algorithms, secret}) {
  return async function validateToken(token, ignoreExpiration=false) {
    // decode data without verifying to check the session first
    const data = jwt.decode(token);
    if (!data) {
      throw new HTTPError(401, "Missing or invalid token.", "EBADTOKEN");
    }

    // ensure session id exists
    const exists = await this.sessionStore.exists(data.session);
    if (!exists) {
      throw new HTTPError(401, "Invalid session.", "EBADSESSION");
    }

    // verify the token
    try {
      jwt.verify(token, secret, {algorithms, ignoreExpiration});
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
}
