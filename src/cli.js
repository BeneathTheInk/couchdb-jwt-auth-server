import { pick, defaultsDeep } from 'lodash';
import { resolve } from 'path';
import help from './help';
import minimist from 'minimist';

// using standard require so rollup doesn't include it
const createApp = require("./");

let argv = minimist(process.argv.slice(2), {
  string: [ ],
  boolean: [ 'help', 'version', 'production' ],
  alias: {
    h: 'help', H: 'help',
    v: 'version', V: 'version',
    c: "config"
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
	let cfile = typeof argv.config === "string" && argv.config ? argv.config : "config.json";
	defaultsDeep(argv, require(resolve(cfile)));
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
  'session'
];

const app = createApp(pick(argv, VALID));

app.setup()
  .then(() => {
    const server = app.listen(argv.port || 3000, '127.0.0.1', () => {
      const addr = server.address();
      console.log('HTTP server listening at http://%s:%s', addr.address, addr.port);
    });

    server.on('error', panic);
  })
  .catch(panic);
