export default async function login(req, res, next) {
  const password = req.body.password || req.body.pass;
  const username = req.body.username || req.body.name;

  try {
    const response = await req.app.authenticate(username, password);
    const session = await req.app.generateSession();
    const token = req.app.generateToken(response.userCtx, session);

    res.type('application/jwt').send(token);
  } catch(err) {
    next(err);
  }
}
