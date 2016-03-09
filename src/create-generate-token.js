import jwt from 'jsonwebtoken';

export default function createGenerateToken({algorithms, expiresIn, secret}) {
  return function generateToken({name, roles}, session) {
    let token = jwt.sign({name, roles, session}, secret, {algorithms, expiresIn});
    let {iat,exp} = jwt.decode(token);
    return {
      ok: true,
      userCtx: { name, roles },
      session, token,
      issued: new Date(iat * 1000),
      expires: new Date(exp * 1000)
    };
  };
}
