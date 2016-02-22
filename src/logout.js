export default async function logout(req, res, next) {
  try {
    const data = await req.app.validateToken(req.jwt, true);
    await req.app.sessionStore.remove(data.session);

    res.send({ ok: true });
  } catch(err) {
    next(err);
  }
}
