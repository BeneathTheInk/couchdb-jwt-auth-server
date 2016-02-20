import jwt from 'jsonwebtoken';

export default function createValidateToken({algorithms, secret, sessionStore}) {
  return async function validateToken(token, ignoreExpiration=false) {
    const data = jwt.verify(token, secret, {algorithms, ignoreExpiration});

    const exists = await this.sessionStore.exists(data.session);

    if (exists) {
      return data;
    } else {
      throw new Error('Invalid Session.');
    }
  }
}
