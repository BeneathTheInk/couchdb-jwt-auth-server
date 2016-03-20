// fetch/verify existing JWT
export default async function info(req, res, next) {
  try {
    const data = await req.app.validateToken(req.jwt);
    res.ok(data);
  } catch(err) {
    next(err);
  }
}
