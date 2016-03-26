import bodyParser from 'body-parser';
import express from 'express';
import getCouchOptions from './get-couch-options';
import * as routes from './routes';
import {route as errorRoute,HTTPError} from "./http-error";
import respUtils from "./response-utils";
import createAPI from "./api";
import {forEach} from "lodash";

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
  } else if (storeType === 'empty') {
    createSessionStore = require('./empty-store');
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
  const api = createAPI(couchOptions, {
    algorithms, expiresIn, secret, refreshRoles
  });

  forEach(api, (fn, name) => {
    if (typeof fn !== "function") return;
    app[name] = fn.bind(app);
  });

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
    .all(routes.extractJwtFromHeader)
    .delete(routes.logout)
    .get(routes.info)
    .post(jsonParser, urlEncodedParser, routes.login)
    .put(routes.renew);

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
