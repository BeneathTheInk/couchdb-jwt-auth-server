import jwt from 'jsonwebtoken';

export default function createGenerateToken({algorithms, expiresIn, secret}) {
  return function generateToken({name, roles}, session) {
    return jwt.sign({name, roles, session}, secret, {algorithms, expiresIn});
  };
}
