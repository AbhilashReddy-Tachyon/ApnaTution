/**
 * The database guard is the only thing standing between a test run and real
 * user data, so it is tested directly. Pure functions — no database, no env.
 */

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

const {
    parseMongoUri,
    describeMongoUri,
    looksLikeTestDatabase,
    assertMongoTarget,
} = require("../src/config/mongoTarget.cjs");

const PROD = "mongodb+srv://prod_user:s3cret@prod-cluster.abcde.mongodb.net/apnatutors?retryWrites=true";
const TEST = "mongodb+srv://test_user:other@test-cluster.vwxyz.mongodb.net/apnatutors_test";

describe("parseMongoUri", () => {
    test("pulls host and database out of an SRV URI", () => {
        const parsed = parseMongoUri(PROD);
        assert.equal(parsed.scheme, "mongodb+srv");
        assert.equal(parsed.hosts, "prod-cluster.abcde.mongodb.net");
        assert.equal(parsed.dbName, "apnatutors");
        assert.equal(parsed.hasCredentials, true);
    });

    test("handles a seed list, which new URL() would mangle", () => {
        const parsed = parseMongoUri("mongodb://a.example:27017,b.example:27018/apnatutors");
        assert.equal(parsed.hosts, "a.example:27017,b.example:27018");
        assert.equal(parsed.dbName, "apnatutors");
    });

    test("handles no credentials", () => {
        const parsed = parseMongoUri("mongodb://localhost:27017/apnatutors_test");
        assert.equal(parsed.hasCredentials, false);
        assert.equal(parsed.dbName, "apnatutors_test");
    });

    test("reports an absent database name rather than inventing one", () => {
        assert.equal(parseMongoUri("mongodb://localhost:27017").dbName, "");
        assert.equal(parseMongoUri("mongodb://localhost:27017/?w=majority").dbName, "");
    });

    test("an @ in the query string is not mistaken for the auth delimiter", () => {
        const parsed = parseMongoUri("mongodb://localhost:27017/db?authMechanismProperties=a:b@c");
        assert.equal(parsed.hosts, "localhost:27017");
        assert.equal(parsed.dbName, "db");
    });

    test("rejects junk", () => {
        assert.throws(() => parseMongoUri(""), /empty/i);
        assert.throws(() => parseMongoUri("postgres://localhost/db"), /mongodb/i);
        assert.throws(() => parseMongoUri("mongodb:///apnatutors"), /no host/i);
    });
});

describe("describeMongoUri", () => {
    test("never leaks the password", () => {
        const described = describeMongoUri(PROD);
        assert.ok(!described.includes("s3cret"));
        assert.ok(!described.includes("prod_user"));
        assert.equal(described, "mongodb+srv://prod-cluster.abcde.mongodb.net/apnatutors");
    });
});

describe("looksLikeTestDatabase", () => {
    for (const name of ["test", "apnatutors_test", "test-apnatutors", "apnatutors.test", "testing"]) {
        test(`"${name}" reads as a test database`, () => {
            assert.equal(looksLikeTestDatabase(name), true);
        });
    }

    // The separator requirement is what keeps these out.
    for (const name of ["apnatutors", "latest_leads", "contest", "attestation"]) {
        test(`"${name}" does not read as a test database`, () => {
            assert.equal(looksLikeTestDatabase(name), false);
        });
    }
});

describe("assertMongoTarget in test mode", () => {
    test("accepts a test database on its own cluster", () => {
        const target = assertMongoTarget({ uri: TEST, nodeEnv: "test", productionUri: PROD });
        assert.equal(target.dbName, "apnatutors_test");
    });

    test("refuses the production database", () => {
        assert.throws(
            () => assertMongoTarget({ uri: PROD, nodeEnv: "test", productionUri: PROD }),
            /does not read as a test database/
        );
    });

    test("refuses a test database sitting on the production cluster", () => {
        const sameCluster =
            "mongodb+srv://u:p@prod-cluster.abcde.mongodb.net/apnatutors_test";
        assert.throws(
            () => assertMongoTarget({ uri: sameCluster, nodeEnv: "test", productionUri: PROD }),
            /same cluster as production/
        );
    });

    test("refuses a URI with no database name", () => {
        assert.throws(
            () => assertMongoTarget({ uri: "mongodb://localhost:27017", nodeEnv: "test" }),
            /no database name/
        );
    });

    test("passes when the production URI is absent, which is the normal case", () => {
        const target = assertMongoTarget({ uri: TEST, nodeEnv: "test" });
        assert.equal(target.dbName, "apnatutors_test");
    });

    test("an unparseable production URI does not block a valid test target", () => {
        const target = assertMongoTarget({ uri: TEST, nodeEnv: "test", productionUri: "nonsense" });
        assert.equal(target.dbName, "apnatutors_test");
    });
});

describe("assertMongoTarget in production mode", () => {
    test("accepts the production database", () => {
        assert.equal(assertMongoTarget({ uri: PROD, nodeEnv: "production" }).dbName, "apnatutors");
    });

    test("refuses to serve a test database", () => {
        assert.throws(
            () => assertMongoTarget({ uri: TEST, nodeEnv: "production" }),
            /reads as a test database/
        );
    });
});

describe("assertMongoTarget in development mode", () => {
    test("stays out of the way — either database is allowed", () => {
        assert.doesNotThrow(() => assertMongoTarget({ uri: PROD, nodeEnv: "development" }));
        assert.doesNotThrow(() => assertMongoTarget({ uri: TEST, nodeEnv: "development" }));
    });
});
