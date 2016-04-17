export default `
CouchDB JWT Auth Server

  A small, standalone server for generating JSON Web Tokens for use with
  CouchDB. This service requires couch_jwt_auth[1] to be installed on the
  CouchDB server.

  [0]: https://github.com/BeneathTheInk/couchdb-jwt-auth-server
  [1]: https://github.com/softapalvelin/couch_jwt_auth

Usage:

  $ couchdb-jwt [OPTIONS]

  -c, --config <file>     A config file with your options. It's a JSON object.
  --couchdb <url>         URL to the CouchDB server that manages users and has
                          couch_jwt_auth installed.
  --secret <secret>       The secret used to sign JWTs. This should match the
                          raw value CouchDB server has set for jwt_auth.hs_secret
                          (Note: hs_secret is base64 encoded in CouchDB's config)
  --expiresIn <exp>       Time in seconds for JWT expiration. Default is 300 (5 min)
  --session.store <name>  The library to use for storing session data. There are
                          two built in options: memory and couch. Additional
                          session options can be passed using the dot syntax.
  --endpoint <ep>         The web server mount path. Defaults to '/'.
  --port <port>           The port to start the HTTP server on. Defaults to 3000.
  -h, --help              Show this message.
  -v, --version           Print the currently installed version of this server.
`;
