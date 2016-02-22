// enhance the request with the jwt token if
// the Authorization header is present and holds a token
export default function extractJwtFromHeader(req, res, next) {
  const auth = (req.get('Authorization') || '').trim();

  if (auth) {
    const m = auth.trim().match(/^Bearer\s*(.*)/);

    if (m) {
      req.jwt = m[1];
    }
  }

  next();
}
