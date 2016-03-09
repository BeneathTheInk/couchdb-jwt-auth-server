import jwt from 'jsonwebtoken';
import HTTPError from "./http-error";

export default function createValidateToken({algorithms, secret}) {
  return async function validateToken(token, ignoreExpiration=false) {
    const data = jwt.verify(token, secret, {algorithms, ignoreExpiration});

    const exists = await this.sessionStore.exists(data.session);

    if (!exists) {
      throw new HTTPError(401, "Invalid session.", "EBADSESSION");
    }

    return data;
  };
}
