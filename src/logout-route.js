export default async function logout(req, res, next) {
  try {
    const data = await req.app.logout(req.jwt);
    res.ok(data);
  } catch(err) {
    next(err);
  }
}
