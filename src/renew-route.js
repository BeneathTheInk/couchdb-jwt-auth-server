export default async function put(req, res, next) {
  try {
    const data = await req.app.renew(req.jwt);
    res.ok(data);
  } catch(err) {
    next(err);
  }
}
