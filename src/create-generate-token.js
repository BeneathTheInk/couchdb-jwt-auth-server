import jwt from 'jsonwebtoken';

export default function createGenerateToken({algorithms, expiresIn, secret}) {
  const algorithm = Array.isArray(algorithms) ? algorithms[0] : "HS256";

  return function generateToken({name, roles}, session) {
    const token = jwt.sign({name, roles, session}, secret, {algorithm, expiresIn});
    const data = jwt.decode(token);
    data.token = token;
    return data;
  };
}
