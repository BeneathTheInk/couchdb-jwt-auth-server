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

- JWTs are similar to proxy authentication. The user's session is stored in the token and CouchDB uses that to authenticate directly. The `_users` database is only used by this server and is never touched by CouchDB. This means that you can separate your user and application databases into multiple CouchDB instances.
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

One thing to note is that this library uses the raw secret whereas `couch_jwt_auth` uses a base64 encoded secret. Here's a way to encode a string to base64

```
echo -n 'keyboardcat' | openssl base64
```

The output, in the example `a2V5Ym9hcmRjYXQ=` is what you use for `hs_secret`.

```ini
[jwt_auth]
hs_secret=a2V5Ym9hcmRjYXQ=
username_claim=name
```

## CLI Usage

```text
$ couchdb-jwt [OPTIONS]

--config <file>         A config file with your options. It's a JSON object.
--couchdb <url>         URL to the CouchDB server that manages users and has
                        couch_jwt_auth installed.
--secret <secret>       The secret used to sign JWTs. This should match the
                        raw value CouchDB server has set for jwt_auth.hs_secret
                        (remember that hs_secret is base64 encoded in CouchDB's config)
--expire <exp>          Time in seconds for JWT expiration. Default is 300 (5 min)
--session.store <name>  The library to use for storing session data. There are
                        two built in options: memory and couch. Additional
                        session options can be passed using the dot syntax.
```

Example call:

```sh
$ couchdb-jwt --couchdb http://admin:pass@localhost:5984 --secret keyboardcat --session.store couch
```

### Config file

If you rather use a config file instead of passing options in the command line, you can just
create a JSON file, i.e. `config.json`, with the options you want to use like:

```json
{
  "couchdb": "http://admin:pass@localhost:5984",
  "secret": "keyboardcat",
  "session": {
    "store": "couch"
  }
}
```

And then call it with:

```sh
$ couchdb-jwt --config config.json
```

## API Usage

This library exports a function that creates an Express app which makes it really easy to use.

```js
var couchdbjwt = require("couchdb-jwt")({
  secret: "keyboardcat"
});

couchdbjwt.listen(3000);
```

Since Express is so flexible, you can use this with any existing Node.js HTTP server.

```js
var app = require("express")();
var couchdbjwt = require("couchdb-jwt")({
  secret: "keyboardcat"
});

app.use("/auth", couchdbjwt);
```

Pass options directly to the method. Options are the same as with the CLI tool.

```js
var couchdbjwt = require("couchdb-jwt")({
  secret: "keyboardcat",
  endpoint: "/session",
  expire: "2m",
  session: {
    store: "couch",
    db: "jwt_sessions"
  }
});
```

## REST API Endpoints

This servers reveals four REST endpoints under the root path `/`. The endpoint is configurable through the `endpoint` option.

All of the endpoints, except for `POST` require the JSON Web Token to be set in the Authorization header like so:

```text
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJuYW1lIjoidGVzdDIiLCJyb2xlcyI6W10sInNlc3Npb24iOiIxMDhmNjdiN2JjODlhNzY2YzU4MDcwODc0NzkyZjNkNSIsImlhdCI6MTQ1NjE3MzA0NSwiZXhwIjoxNDU2MTczMzQ1fQ.VPGmFiBveWf1LNY4hqAYolVxFIeqDn4HBWadmHcrQsc
```

### `GET /`

Returns JSON data containing information about the current JWT and session.

```sh
curl http://127.0.0.1:3000 \
  -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJuYW1lIjoidGVzdDIiLCJyb2xlcyI6W10sInNlc3Npb24iOiIxMDhmNjdiN2JjODlhNzY2YzU4MDcwODc0NzkyZjNkNSIsImlhdCI6MTQ1NjE3MzA0NSwiZXhwIjoxNDU2MTczMzQ1fQ.VPGmFiBveWf1LNY4hqAYolVxFIeqDn4HBWadmHcrQsc"
```

```json
{
  "ok": true,
  "userCtx": {
    "name": "test2",
    "roles": []
  },
  "session": "108f67b7bc89a766c58070874792f3d5",
  "issued": "2016-02-22T20:30:45.000Z",
  "expires": "2016-02-22T20:35:45.000Z"
}
```

### `POST /`

Authenticates against CouchDB with a username and password and returns a new JSON Web Token. You should send the server a json or url encoded request with `username` and `password` fields. The server will respond with a token and content type of `application/jwt`.

```sh
curl http://127.0.0.1:3000 \
  -X POST \
  -d username=test2 \
  -d password=test
```

```text
eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJuYW1lIjoidGVzdDIiLCJyb2xlcyI6W10sInNlc3Npb24iOiIxMDhmNjdiN2JjODlhNzY2YzU4MDcwODc0NzkyZjNkNSIsImlhdCI6MTQ1NjE3MzA0NSwiZXhwIjoxNDU2MTczMzQ1fQ.VPGmFiBveWf1LNY4hqAYolVxFIeqDn4HBWadmHcrQsc
```

### `PUT /`

Generates a new JWT using an existing JWT. This will continue the current session with a new token. The server will respond with a token and content type of `application/jwt`.

```sh
curl http://127.0.0.1:3000 \
  -X PUT \
  -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJuYW1lIjoidGVzdDIiLCJyb2xlcyI6W10sInNlc3Npb24iOiIxMDhmNjdiN2JjODlhNzY2YzU4MDcwODc0NzkyZjNkNSIsImlhdCI6MTQ1NjE3MzA0NSwiZXhwIjoxNDU2MTczMzQ1fQ.VPGmFiBveWf1LNY4hqAYolVxFIeqDn4HBWadmHcrQsc"
```

```text
eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJuYW1lIjoidGVzdDIiLCJyb2xlcyI6W10sImlhdCI6MTQ1NjE3MzEzMiwiZXhwIjoxNDU2MTczNDMyfQ.zNVMMjUaNFJKigmFGsfriGPgTw-15072CmWNNIcLHRI
```

### `DELETE /`

Destroys the current JWT session, invalidating all existing JWTs made with this session.

```sh
curl http://127.0.0.1:3000 \
  -X DELETE \
  -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJuYW1lIjoidGVzdDIiLCJyb2xlcyI6W10sInNlc3Npb24iOiIxMDhmNjdiN2JjODlhNzY2YzU4MDcwODc0NzkyZjNkNSIsImlhdCI6MTQ1NjE3MzA0NSwiZXhwIjoxNDU2MTczMzQ1fQ.VPGmFiBveWf1LNY4hqAYolVxFIeqDn4HBWadmHcrQsc"
```

```json
{
  "ok": true
}
```

## Session Stores

The library stores JWT session IDs in a database of your choosing. There are two built-in options: memory and couchdb.

The `memory` store is the default store and is very simple. It keeps the ids in memory, but this means that it does not scale and leaks memory. Only use this one for local testing purposes.

The other built in store is `couchdb`. This creates a new database called `jwt_sessions` in CouchDB for storing sessions. CouchDB super admin credentials are only necessary if the database hasn't been set up yet.

There is one other store currently available that uses redis, [CouchDB JWT Redis Session Store](http://ghub.io/couchdb-jwt-store-redis). If performance matters to you, this is the recommended store.

## Contributing

I am always looking for contributors! Please submit an issue or pull-request with feedback, bug fixes, new features and questions.
