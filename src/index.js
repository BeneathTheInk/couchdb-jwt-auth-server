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
import {route as errorRoute,HTTPError} from "./http-error";

export default function createApp({algorithms=['HS256'], session={}, couchdb, endpoint="/", expiresIn='5m', secret}) {
  invariant(algorithms, 'missing algorithms');
  invariant(session, 'missing session options');
  invariant(endpoint, 'missing endpoint');
  invariant(expiresIn, 'missing expiresIn');
  invariant(secret, 'missing JWT secret');

  // resolve session store
  const storeType = session.store;
  delete session.store;
  let createSessionStore;
  if (storeType === 'couch') {
    createSessionStore = require('./couch-store');
  } else if (storeType === 'memory' || typeof storeType === 'undefined') {
    createSessionStore = require('./memory-store');
  } else {
    createSessionStore = require(storeType);
  }

  // create express app and parse options
  const app = express();
  const couchOptions = getCouchOptions(couchdb);

  // set a few helpers on the app
  app.authenticate = createAuthenticate(couchOptions.baseUrl).bind(app);
  app.generateSession = generateSession.bind(app);
  app.generateToken = createGenerateToken({algorithms, expiresIn, secret}).bind(app);
  app.validateToken = createValidateToken({algorithms, secret}).bind(app);

  // set up the session store
  let _setup = (async () => {
    let store = await createSessionStore(session, couchOptions);
    app.sessionStore = store;
  })();
  app.setup = () => _setup;

  app.disable('x-powered-by');

  // app must be setup before routes can be used
  app.use((req, res, next) => {
    _setup.then(() => next(), next);
  });

  // mount the jwt auth logic
  app.route(endpoint)
    .all(extractJwtFromHeader)
    .delete(logout)
    .get(info)
    .post(bodyParser.json(), bodyParser.urlencoded({ extended: true }), login)
    .put(renew);

  // default everything else to a 404
  app.use((req, res, next) => next(new HTTPError(404)));

  // mount the error route
  app.use(errorRoute);

  return app;
}

createApp.HTTPError = HTTPError;
