BIN = ./node_modules/.bin
SRC = $(wildcard src/* src/*/*)
TEST = $(wildcard test/* test/*/*)

build: index.js es6.js cli.js couch-store.js memory-store.js

index.js: src/index.js $(SRC)
	$(BIN)/rollup $< -c -f cjs > $@

es6.js: src/index.js $(SRC)
	TARGET=es6 $(BIN)/rollup $< -c -f es6 > $@

cli.js: src/cli.js $(SRC)
	echo "#!/usr/bin/env node" > $@
	$(BIN)/rollup $< -c -f cjs >> $@

couch-store.js: src/couch-store.js $(SRC)
	$(BIN)/rollup $< -c -f cjs > $@

memory-store.js: src/memory-store.js $(SRC)
	$(BIN)/rollup $< -c -f cjs > $@

test.js: test/run.js index.js couch-store.js memory-store.js $(TEST)
	$(BIN)/rollup $< -c -f cjs > $@

test: test.js install-self
	node $<
	make clean-self

install-self: clean-self
	ln -s ../ node_modules/couchdb-jwt

clean-self:
	rm -f node_modules/couchdb-jwt

clean:
	rm -f index.js es6.js cli.js couch-store.js memory-store.js test.js

.PHONY: build clean test install-self clean-self
