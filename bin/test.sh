#!/bin/bash

BIN=node_modules/.bin
export COUCHDB_URL=http://localhost:16392
export COUCHDB_SECRET=secret
export COUCHDB_USER=testuser
export COUCHDB_PASS=test

# setup the data directory
echo "{ \"jwt_auth\": { \"hs_secret\": \"$(echo -n $COUCHDB_SECRET | openssl base64)\" } }" > config.json

# start db server in background using cli file
$BIN/express-jwt-pouchdb -m -p 16392 &
SERVER_PID=$!
sleep 5

# add a user
curl -X PUT "$COUCHDB_URL/_users/org.couchdb.user:$COUCHDB_USER" \
	-H "Content-Type: application/json" \
	-d "{\"password\":\"$COUCHDB_PASS\",\"type\":\"user\",\"name\":\"$COUCHDB_USER\",\"roles\":[]}"

# run tests
make test
TEST_CODE=$?

# clean up and exit
kill $SERVER_PID
rm -rf ./tmp_test_data
exit $TEST_CODE
