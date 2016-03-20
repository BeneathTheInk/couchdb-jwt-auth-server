export default async function login(req, res, next) {
  try {
    const password = req.body.password || req.body.pass;
    const username = req.body.username || req.body.name;
    const result = await req.app.login(username, password);
    res.ok(result);
  } catch(err) {
    next(err);
  }
}
