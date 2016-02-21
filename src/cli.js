import { pick } from 'lodash';
import { readFileSync } from 'fs';
import createApp from './index';
import help from './help';
import minimist from 'minimist';

let argv = minimist(process.argv.slice(2), {
  string: [ ],
  boolean: [ 'help', 'version', 'production' ],
  alias: {
    h: 'help', H: 'help',
    v: 'version', V: 'version'
  }
});

if (argv.help) {
  console.log('  ' + help.replace(/\n/g, '\n  '));
  process.exit(0);
}

if (argv.version) {
  let pkg = require('./package.json');
  console.log('%s %s', pkg.name, pkg.version || 'edge');
  process.exit(0);
}

if (argv.config) {
  Object.assign(argv, JSON.parse(readFileSync(argv.config, 'utf8')));
}

process.env.NODE_ENV = argv.production ? 'production' : (process.env.NODE_ENV || 'development');

function panic(e) {
  console.error(e.stack || e);
  process.exit(1);
}

const VALID = [
  'algorithms',
  'couchdb',
  'endpoint',
  'expiresIn',
  'secret',
  'storeOptions'
];

const { storeType } = argv;
let createSessionStore;
if (storeType === 'couch') {
  createSessionStore = require('./couch-store');
} else if (storeType === 'memory' || typeof storeType === 'undefined') {
  createSessionStore = require('./memory-store');
} else {
  createSessionStore = require(argv['session.store']);
}

const appOptions = {
  ...pick(argv, VALID),
  createSessionStore
};

createApp(appOptions).
  then(app => {
    const server = app.listen(argv.port || 3000, '127.0.0.1', () => {
      const addr = server.address();
      console.log('HTTP server listening at http://%s:%s', addr.address, addr.port);
    });

    server.on('error', panic);
  })
  .catch(panic);
