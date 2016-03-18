import jwt from 'jsonwebtoken';
import HTTPError from "./http-error";

export default function createValidateToken({algorithms, secret}) {
  return async function validateToken(token, ignoreExpiration=false) {
    let data;

    try {
      data = jwt.verify(token, secret, {algorithms, ignoreExpiration});
    } catch(e) {
      if (e.name === "TokenExpiredError") {
        throw new HTTPError(401, "Expired token.", "EEXPTOKEN");
      } else if (e.name === "JsonWebTokenError") {
        throw new HTTPError(401, "Invalid token.", "EBADTOKEN");
      }
    }

    const exists = await this.sessionStore.exists(data.session);

    if (!exists) {
      throw new HTTPError(401, "Invalid session.", "EBADSESSION");
    }

    return data;
  };
}
