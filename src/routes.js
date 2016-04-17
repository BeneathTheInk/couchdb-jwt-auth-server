// fetch/verify existing JWT
export async function info(req, res, next) {
  try {
    const data = await req.app.validateToken(req.jwt, {
      ignoreExpiration: true
    });
    res.ok(data);
  } catch(err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const password = req.body.password || req.body.pass;
    const username = req.body.username || req.body.name;
    const result = await req.app.login(username, password, req.body);
    res.ok(result);
  } catch(err) {
    next(err);
  }
}

export async function renew(req, res, next) {
  try {
    const data = await req.app.renew(req.jwt);
    res.ok(data);
  } catch(err) {
    next(err);
  }
}

export async function logout(req, res, next) {
  try {
    const data = await req.app.logout(req.jwt);
    res.ok(data);
  } catch(err) {
    next(err);
  }
}

const bearer_regex = /^Bearer\s*(.*)/;

// enhance the request with the jwt token if
// the Authorization header is present and holds a token
export function extractJwtFromHeader(req, res, next) {
  const auth = (req.get('Authorization') || '').trim();

  if (auth) {
    const m = auth.match(bearer_regex);
    if (m) req.jwt = m[1];
  }

  next();
}
