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

export default async function createApp({algorithms=['HS256'], createSessionStore, couchdb, endpoint, expiresIn='5m', secret, storeOptions}) {
  invariant(algorithms, 'missing algorithms');
  invariant(couchdb, 'missing couchdb');
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

  // set the session store
  app.sessionStore = await createSessionStore({
    ...storeOptions,
    ...couchOptions
  });

  app.disable('x-powered-by');

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
