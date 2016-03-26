BIN = ./node_modules/.bin
SRC = $(wildcard src/* src/*/*)
TEST = $(wildcard test/* test/*/*)

build: index.js cli.js couch-store.js memory-store.js empty-store.js

index.js: src/index.js $(SRC)
	$(BIN)/rollup $< -c -f cjs > $@

cli.js: src/cli.js $(SRC)
	echo "#!/usr/bin/env node" > $@
	$(BIN)/rollup $< -c -f cjs >> $@

couch-store.js: src/couch-store.js $(SRC)
	$(BIN)/rollup $< -c -f cjs > $@

memory-store.js: src/memory-store.js $(SRC)
	$(BIN)/rollup $< -c -f cjs > $@

empty-store.js: src/empty-store.js $(SRC)
	$(BIN)/rollup $< -c -f cjs > $@

test.js: test/index.js index.js couch-store.js memory-store.js empty-store.js $(TEST)
	$(BIN)/rollup $< -c -f cjs > $@

test: test.js
	node $<

clean:
	rm -f index.js cli.js couch-store.js memory-store.js empty-store.js test.js

.PHONY: build clean test
