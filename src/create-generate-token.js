import jwt from 'jsonwebtoken';

export default function createGenerateToken({algorithms, expiresIn, secret}) {
  const algorithm = Array.isArray(algorithms) ? algorithms[0] : "HS256";

  return function generateToken({name, roles}, session) {
    let token = jwt.sign({name, roles, session}, secret, {algorithm, expiresIn});
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
