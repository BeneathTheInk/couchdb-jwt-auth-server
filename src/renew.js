import HTTPError from "./http-error";

// renew token
export default async function put(req, res, next) {
  try {
    const data = await req.app.validateToken(req.jwt, true);
    const result = req.app.generateToken(data, data.session);

    if (req.accepts("json")) {
      return res.json(result);
    }

    if (req.accepts("application/jwt")) {
      return res.type('application/jwt').send(result.token);
    }

    next(new HTTPError(406));
  } catch(err) {
    next();
  }
}
