import bodyParser from 'body-parser';
import createAuthenticate from './create-authenticate';
import createGenerateToken from './create-generate-token';
import createValidateToken from './create-validate-token';
import express from 'express';
import extractJwtFromHeader from './extract-jwt-from-header';
import generateSession from './generate-session';
import getCouchOptions from './get-couch-options';
import info from './info';
import invariant from 'invariant';
import login from './login';
import logout from './logout';
import renew from './renew';

export default function createApp({algorithms=['HS256'], createSessionStore, couchdb, endpoint="/", expiresIn='5m', secret, storeOptions}) {
  invariant(algorithms, 'missing algorithms');
  invariant(createSessionStore, 'missing createSessionStore');
  invariant(endpoint, 'missing endpoint');
  invariant(expiresIn, 'missing expiresIn');
  invariant(secret, 'missing JWT secret');

  const app = express();
  const couchOptions = getCouchOptions(couchdb);

  // set a few helpers on the app
  app.authenticate = createAuthenticate(couchOptions.baseUrl).bind(app);
  app.generateSession = generateSession.bind(app);
  app.generateToken = createGenerateToken({algorithms, expiresIn, secret}).bind(app);
  app.validateToken = createValidateToken({algorithms, secret}).bind(app);

  // set up the session store
  let _setup;
  app.setup = () => {
    if (_setup) return _setup;
    return (_setup = Promise.resolve(createSessionStore(storeOptions, couchOptions))
      .then((store) => {
        app.sessionStore = store;
      }));
  };

  app.disable('x-powered-by');

  // app must be setup before routes can be used
  app.use((req, res, next) => {
    app.setup().then(() => next(), next);
  });

  // mount the jwt auth logic
  app.route(endpoint)
    .all(extractJwtFromHeader)
    .delete(logout)
    .get(info)
    .post(bodyParser.json(), bodyParser.urlencoded({ extended: true }), login)
    .put(renew);

  // default everything else to a 404
  app.use((req, res) => res.sendStatus(404));

  return app;
}
