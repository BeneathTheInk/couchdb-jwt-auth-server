import HTTPError from "./http-error";

export default async function login(req, res, next) {
  const password = req.body.password || req.body.pass;
  const username = req.body.username || req.body.name;

  try {
    const response = await req.app.authenticate(username, password);
    const session = await req.app.generateSession();
    const result = req.app.generateToken(response.userCtx, session);

    if (req.accepts("json")) {
      return res.json(result);
    }

    if (req.accepts("application/jwt")) {
      return res.type('application/jwt').send(result.token);
    }

    next(new HTTPError(406));
  } catch(err) {
    if (err.status)  {
      if (err.status === 401) next(new HTTPError(401, err.message, "EBADAUTH"));
      else next(new HTTPError(err.status, err.message, "ECOUCH"));
    } else {
      next(err);
    }
  }
}
