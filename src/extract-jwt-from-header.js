// enhance the request with the jwt token if
// the Authorization header is present and holds a token
export default function extractJwtFromHeader(req, res, next) {
  const auth = (req.get('Authorization') || '').trim();

  if (auth) {
    const [ _, jwt ] = auth.trim().match(/^Bearer\s*(.*)/);

    if (jwt) {
      req.jwt = jwt;
    }
  }

  next();
}
