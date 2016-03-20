import bodyParser from 'body-parser';
import createAuthenticate from './create-authenticate';
import createGenerateToken from './create-generate-token';
import createValidateToken from './create-validate-token';
import createRefreshRoles from './create-refresh-roles';
import express from 'express';
import extractJwtFromHeader from './extract-jwt-from-header';
import generateSession from './generate-session';
import getCouchOptions from './get-couch-options';
import infoRoute from './info-route';
import loginRoute from './login-route';
import logoutRoute from './logout-route';
import renewRoute from './renew-route';
import {route as errorRoute,HTTPError} from "./http-error";
import createLogin from './create-login';
import createLogout from './create-logout';
import createRenew from './create-renew';
import respUtils from "./response-utils";

const jsonParser = bodyParser.json();
const urlEncodedParser = bodyParser.urlencoded({ extended: true });

export default function createApp(opts={}) {
  let {
    algorithms=['HS256'],
    session={},
    couchdb,
    endpoint="/",
    expiresIn='5m',
    secret,
    handleErrors=true,
    transform,
    refreshRoles
  } = opts;

  if (!secret) throw new Error("Missing JWT secret.");

  // resolve session store
  const storeType = session.store;
  delete session.store;
  let createSessionStore;
  if (storeType === 'couch') {
    createSessionStore = require('./couch-store');
  } else if (storeType === 'memory' || typeof storeType === 'undefined') {
    createSessionStore = require('./memory-store');
  } else if (typeof storeType === "string") {
    createSessionStore = require(storeType);
  } else if (typeof storeType === "function") {
    createSessionStore = storeType;
  } else {
    throw new Error("Expecting function or string for session storage.");
  }

  // create express app and parse options
  const couchOptions = getCouchOptions(couchdb);
  const app = express();
  app.disable('x-powered-by');

  // set a few helpers on the app
  app.authenticate = createAuthenticate(couchOptions.baseUrl).bind(app);
  app.generateSession = generateSession.bind(app);
  app.generateToken = createGenerateToken({algorithms, expiresIn, secret}).bind(app);
  app.validateToken = createValidateToken({algorithms, secret}).bind(app);
  app.refreshRoles = createRefreshRoles(refreshRoles, couchOptions).bind(app);
  app.login = createLogin().bind(app);
  app.logout = createLogout().bind(app);
  app.renew = createRenew().bind(app);

  // set up the session store
  let _setup = (async () => {
    let store = await createSessionStore(session, couchOptions);
    app.sessionStore = store;
  })();
  app.setup = () => _setup;

  // app must be setup before routes can be used
  app.use((req, res, next) => {
    _setup.then(() => next(), next);
  });

  // mount the jwt auth logic
  app.route(endpoint)
    .all(respUtils({transform}))
    .all(extractJwtFromHeader)
    .delete(logoutRoute)
    .get(infoRoute)
    .post(jsonParser, urlEncodedParser, loginRoute)
    .put(renewRoute);

  // default error handling API
  // can be disabled when used with a greater express app
  if (handleErrors) {
    // default everything else to a 404
    app.use((req, res, next) => next(new HTTPError(404)));

    // mount the error route
    app.use(errorRoute);
  }

  return app;
}

createApp.HTTPError = HTTPError;
