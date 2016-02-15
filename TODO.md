# Auth Server

## Sign up

1. user sends sign up request
2. assigns a data db server
3. creates user doc and saves it to auth db
	1. normal couchdb user doc setup

## Sign in

1. user sends auth server a name and password
2. verify name and password against auth db
3. generate a new JWT and send back to user
	1. low exp date, i.e. 5 minutes
	3. include a unique session token, store in reds
4. user accesses data db with JWT

## Token Renewal

1. user sends an existing JWT
2. verify JWT
	1. standard verification process, except expired tokens are okay within a normal time period (2 weeks?)
	2. check that the session still exists in redis
3. generate a new JWT and send to user
4. user accesses data db with new JWT

## Sign out

1. user sends sign out request with an existing JWT
2. server verifies like a token renewal
3. server removes the session key from reds
4. user removes JWT from memory
