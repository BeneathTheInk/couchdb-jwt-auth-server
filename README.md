# CouchDB JWT Authentication Server

[![npm](https://img.shields.io/npm/v/couchdb-jwt.svg)](https://www.npmjs.com/package/couchdb-jwt) [![David](https://img.shields.io/david/Beneaththeink/couchdb-jwt-auth-server.svg)](https://david-dm.org/Beneaththeink/couchdb-jwt-auth-server) [![Build Status](https://travis-ci.org/BeneathTheInk/uninvisible.svg?branch=master)](https://travis-ci.org/BeneathTheInk/uninvisible)

This is an Express app and CLI tool that manages [JSON Web Tokens](https://jwt.io) for a CouchDB server. This acts as a small independent server for generating, renewing and invalidating JWTs that can be used with CouchDB.

This service requires [couch_jwt_auth](https://github.com/softapalvelin/couch_jwt_auth) to be installed on the CouchDB server.

> Note: This library is still being actively developed and may be not be totally secure. It is not recommended to use it in a production environment.

## Motivation

CouchDB authentication is really easy to use, but doesn't work great in every situation. Suppose you have a third-party API server that is capable of making authenticated CouchDB requests on behalf of a browser client. If you use Basic Authentication, you'll need to store the user's credentials and send them with every request. Cookie Authentication is great if the browser is directly accessing the server, but due to cookie rules you won't be able to transfer that token to the third-party server.

This is where JSON Web Tokens come into play. They allow you to proxy CouchDB's user sessions while ensuring that they came from trusted source. This way, the token can be sent to any server so it can act on behalf of the user. It works like this:

![](http://www.gliffy.com/go/publish/image/10033617/L.png)

1. A client signs in with this server using a username and password.
2. The server authenticates with CouchDB and sends a new JSON Web Token back to the client.
3. The client can now use this token to make secure requests against CouchDB.

A few things to mention:

- JWTs act like proxy authentication. The user's session is stored in the token and CouchDB uses that to authenticate directly. The `_users` database is only used by this server and is never touched by CouchDB. This means that you can separate your user and application databases into multiple CouchDB instances.
- This server maintains sessions so that tokens can be easily invalidated in case an attacker gains control of the key. `couch_jwt_auth` only verifies that the JWT has a valid signature and hasn't expired&mdash; it does not verify that the session is still valid. To combat this issue, expirations on tokens are set very low (usually 5 minutes or less) and instead the client will need to renew them on a regular basis.

## Install

Grab a copy from NPM. If you install globally, the CLI tool is made available.

```sh
npm i couchdb-jwt -g
```

This library also exports an Express app, so you can install and use it within an existing project.

```sh
npm i couchdb-jwt --save
```

To use this library properly, you will need to set the following configuration for CouchDB. Make the secret anything you'd like, just be sure to let this library know what it is.

```ini
[jwt_auth]
hs_secret=keyboardcat
username_claim=name
```

## CLI Usage

```text
$ couchdb-jwt [OPTIONS]

--config <file>         A config file with your options. It's a JSON object.
--couchdb <url>         URL to the CouchDB server that manages users and has
                        couch_jwt_auth installed. This should include CouchDB
                        admin credentials.
--secret <secret>       The secret used to sign JWTs. This should match what
                        the CouchDB server has set for jwt_auth.hs_secret
--expire <exp>          Time in seconds for JWT expiration. Default is 300 (5 min)
--session.store <name>  The library to use for storing session data. There are
                        two built in options: memory and couch. Additional
                        session options can be passed using the dot syntax.
```

### Config file

If you rather use a config file instead of passing options in the command line, you can just
create a JSON file, i.e. `config.json`, with the options you want to use like:

```
{
  "couchdb": "http://admin:pass@localhost:5984",
  "secret": "keyboardcat",
  "session.store": "couch"
}
```

And then call it with:

```
$ couchdb-jwt --config config.json
```

## API Usage

This library exports an Express app which makes it really easy to use.

```js
var couchdbjwt = require("couchdb-jwt");
couchdbjwt.listen(3000);
```

Since Express is so flexible, you can use this with any existing Node.js HTTP server.

```js
var app = require("express")();
var couchdbjwt = require("couchdb-jwt");

app.use(couchdbjwt);
```

You can set options with the `.set()` method. Options are the same as with the CLI tool.

```js
couchdbjwt.set("expire", "2m");
couchdbjwt.set("session", {
  store: "couchdb",
  db: "jwt_sessions"
});
```

## REST API Endpoints

This servers reveals four REST endpoints under a single path: `/session`.

All of the endpoints, except for `POST` require the JSON Web Token to be set in the Authorization header like so:

```text
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWV9.TJVA95OrM7E2cBab30RMHrHDcEfxjoYZgeFONFh7HgQ
```

### `GET /session`

Returns JSON data containing information about the current JWT and session.

```sh
curl -H "Authorization: Bearer areallylongtoken" http://127.0.0.1:3000/session
```

```json
{
  "ok": true,
  "userCtx": {
    "name": "someuser",
    "roles": []
  },
  "session": "b91a8139b5d641aeaf243132d43e0c27",
  "issued": "2016-02-19T00:21:39.000Z",
  "expires": "2016-02-19T00:26:39.000Z"
}
```

### `POST /session`

Authenticates against CouchDB with a username and password and returns a new JSON Web Token. You should send the server a json or url encoded request with `username` and `password` fields. The server will respond with a token and content type of `application/jwt`.

```sh
curl -X POST -d username=someuser -d password=somepass http://127.0.0.1:3000/session
```

```text
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWV9.TJVA95OrM7E2cBab30RMHrHDcEfxjoYZgeFONFh7HgQ
```

### `PUT /session`

Generates a new JWT using an existing JWT. This will continue the current session with a new token. The server will respond with a token and content type of `application/jwt`.

```sh
curl -X PUT -H "Authorization: Bearer areallylongtoken" http://127.0.0.1:3000/session
```

```text
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWV9.TJVA95OrM7E2cBab30RMHrHDcEfxjoYZgeFONFh7HgQ
```

### `DELETE /session`

Destroys the current JWT session, invalidating all existing JWTs made with this session.

```sh
curl -X DELETE -H "Authorization: Bearer areallylongtoken" http://127.0.0.1:3000/session
```

```json
{
  "ok": true
}
```

## Session Stores

The library stores JWT session IDs in a database of your choosing. There are two built-in options: memory and couchdb.

The `memory` store is the default store and is very simple. It keeps the ids in memory, but this means that it does not scale and leaks memory. Only use this one for local testing purposes.

The other built in store is `couchdb`. This creates a new database called `jwt_sessions` in CouchDB for storing sessions.

There is one other store currently available that uses redis, [CouchDB JWT Redis Session Store](http://ghub.io/couchdb-jwt-store-redis). If performance matters to you, this is the recommended store.

## Contributing

I am always looking for contributors! Please submit an issue or pull-request with feedback, bug fixes, new features and questions.
