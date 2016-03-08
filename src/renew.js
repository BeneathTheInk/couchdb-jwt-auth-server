// renew token
export default async function put(req, res, next) {
  try {
    const data = await req.app.validateToken(req.jwt, true);
    const token = await req.app.generateToken(data, data.session);

    res.type('application/jwt').send(token);
  } catch(err) {
    next();
  }
}
