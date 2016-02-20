BIN = ./node_modules/.bin
SRC = $(wildcard src/* src/*/*)

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


clean:
	rm index.js es6.js cli.js

.PHONY: build clean
