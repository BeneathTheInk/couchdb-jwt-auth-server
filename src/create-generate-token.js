import jwt from 'jsonwebtoken';

export default function createGenerateToken({algorithms, expiresIn, secret}) {
  return function generateToken({name, roles}, session) {
    let token = jwt.sign({name, roles, session}, secret, {algorithms, expiresIn});
    let {iat:issued,exp:expires} = jwt.decode(token);
    return {
      ok: true,
      userCtx: { name, roles },
      token, issued, expires, session
    };
  };
}
