/**
 * Report — and verify — which MongoDB this environment resolves to.
 *
 *   npm run db:check         against .env      (dev/prod config)
 *   npm run db:check:test    against .env.test (test cluster)
 *
 * Prints the host and database name only, never credentials. Exits non-zero if
 * the guard rejects the target or the connection fails, so it is usable in CI
 * as a "did we wire the right database?" check.
 */

// Set NODE_ENV before anything reads it: config/env.cjs decides which env file
// to load at require time. Done here rather than with `node --env-file=.env.test`
// so a missing file produces our own actionable message instead of node's
// "\.env.test: not found", and so it can never silently fall back to `.env`
// (which would quietly point a "test" check at production).
if (process.argv.includes("--test")) {
    process.env.NODE_ENV = "test";
}

const mongoose = require("mongoose");
const { config } = require("../config/env.cjs");
const { assertMongoTarget, describeMongoUri } = require("../config/mongoTarget.cjs");

async function main() {
    const uri = config.mongoUri;
    const label = config.isTest ? "MONGO_URI_TEST (.env.test)" : "MONGO_URI (.env)";

    console.log(`NODE_ENV : ${config.env}`);
    console.log(`source   : ${label}`);

    if (!uri) {
        console.error(
            config.isTest
                ? "target   : UNSET\n\n" +
                      "MONGO_URI_TEST is not set. NODE_ENV=test reads backend/.env.test only.\n" +
                      "Create it:  cp .env.test.example .env.test   then fill in your test cluster."
                : "target   : UNSET\n\nMONGO_URI is not set in backend/.env."
        );
        process.exitCode = 1;
        return;
    }

    console.log(`target   : ${describeMongoUri(uri)}`);

    try {
        assertMongoTarget({
            uri,
            nodeEnv: config.env,
            productionUri: config.productionMongoUri,
        });
        console.log("guard    : ok");
    } catch (error) {
        console.error(`guard    : REJECTED\n\n${error.message}`);
        process.exitCode = 1;
        return;
    }

    try {
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
        console.log(`connect  : ok (database "${mongoose.connection.name}")`);
        await mongoose.disconnect();
    } catch (error) {
        console.error(`connect  : FAILED — ${error.message}`);
        process.exitCode = 1;
    }
}

main();
