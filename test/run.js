import couchdbjwt from "couchdb-jwt";
import superagent from "superagent";
import sapromise from "superagent-promise-plugin";
import saprefix from "superagent-prefix";
import PouchDB from "pouchdb";
import fs from "fs-promise";
import test from "tape";
import tests from "./index.js";
import del from "del";
import EPouchDB from "./express-pouchdb";

const testdir = __dirname + "/tmp_test_data/";

const couchreq = (method, url) => {
    return superagent(method, url)
        .use(sapromise)
        .use(saprefix("http://localhost:16392"));
};

let clean;

(async () => {
    // create test data directory
    if (await fs.exists(testdir)) await del(testdir);
    await fs.mkdir(testdir);

    // create express-pouchdb server
    let pouchserver;
    const pouchapp = EPouchDB(PouchDB.defaults({
        prefix: testdir
    }), {
        configPath: testdir + "config.json",
        mode: "custom"
    });

    // create couchdb-jwt server
    let jwtserver;
    const jwtapp = couchdbjwt({
        secret: "secret",
		couchdb: "http://localhost:16392"
    });

    // wait for both servers to start
    await Promise.all([
        new Promise((resolve, reject) => {
            pouchserver = pouchapp.listen(16392, resolve).on("error", reject);
        }),
        new Promise((resolve, reject) => {
            jwtserver = jwtapp.listen(16393, resolve).on("error", reject);
        })
    ]);

    // method that cleans up always
    clean = async () => {
        // kill servers
        pouchserver.close();
        jwtserver.close();

        // delete test data directory
        await del(testdir);
    };

    // create super admin
    await couchreq("PUT", "/_config/admins/admin")
        .type("json")
        .send(JSON.stringify("12345"))
        .end();

    // create a test user
    await couchreq("PUT", "/_users/org.couchdb.user:testuser")
		.auth("admin", "12345")
        .send({
            type: "user",
            name: "testuser",
            password: "test",
            roles: []
        })
        .end();

    // create a test stream
    let teststream = test.createStream();
    let finish = new Promise((resolve, reject) => {
        teststream.on("error", reject);
        test.onFinish(resolve);
        teststream.pipe(process.stdout);
    });

    // run tests
    tests({
        test,
        secret: "secret",
        url: "http://localhost:16393",
        username: "testuser",
        password: "test"
    });

    // wait for tests to finish
    await finish;
})().then(async () => {
    if (clean) await clean();
}, async (e) => {
    console.error(e.stack || e);
    if (clean) await clean();
    process.exit(1);
});
