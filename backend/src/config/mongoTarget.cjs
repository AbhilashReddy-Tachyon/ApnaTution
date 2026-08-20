/**
 * Which MongoDB a process is allowed to talk to.
 *
 * A single MONGO_URI meant one typo — or one stale shell export — could point a
 * test run at production and delete real users. These helpers make the target
 * explicit and fail closed: a test process refuses to start against anything
 * that doesn't look like a test database, and a production process refuses to
 * start against anything that does.
 *
 * Everything here is pure, so it is unit-tested without a database. Nothing
 * returns or logs credentials — only the host and database name.
 */

/**
 * A database name that reads as a test database: "test", "apnatutors_test",
 * "test-apnatutors". Deliberately requires a separator so real names that
 * merely contain the letters (e.g. "latest_leads") are not misread as test.
 */
const TEST_DB_NAME = /(^|[-_.])test(ing)?([-_.]|$)/i;

/**
 * Split a connection string into its host list and database name without
 * retaining the credentials.
 *
 * Hand-parsed rather than via `new URL()`: seed-list URIs put commas in the
 * authority (`mongodb://a:27017,b:27017/db`), which URL mangles.
 */
function parseMongoUri(uri) {
    if (typeof uri !== "string" || !uri.trim()) {
        throw new Error("MongoDB URI is empty");
    }

    const match = /^(mongodb(?:\+srv)?):\/\/(.*)$/i.exec(uri.trim());
    if (!match) {
        throw new Error("MongoDB URI must start with mongodb:// or mongodb+srv://");
    }

    const scheme = match[1].toLowerCase();
    const rest = match[2];

    // Bound the credential search to the part before the query string, so an
    // "@" inside a query parameter cannot be mistaken for the auth delimiter.
    const queryAt = rest.indexOf("?");
    const beforeQuery = queryAt === -1 ? rest : rest.slice(0, queryAt);

    const authAt = beforeQuery.lastIndexOf("@");
    const afterAuth = authAt === -1 ? beforeQuery : beforeQuery.slice(authAt + 1);

    const slashAt = afterAuth.indexOf("/");
    const hosts = (slashAt === -1 ? afterAuth : afterAuth.slice(0, slashAt)).toLowerCase();

    // No path means the driver falls back to a database literally named
    // "test" — an ambiguity worth surfacing rather than inheriting.
    const dbName = slashAt === -1 ? "" : afterAuth.slice(slashAt + 1);

    if (!hosts) {
        throw new Error("MongoDB URI has no host");
    }

    return { scheme, hosts, dbName, hasCredentials: authAt !== -1 };
}

/** Host + database only — safe to log or print. */
function describeMongoUri(uri) {
    const { scheme, hosts, dbName } = parseMongoUri(uri);
    return `${scheme}://${hosts}/${dbName || "(none — driver would use \"test\")"}`;
}

function looksLikeTestDatabase(dbName) {
    return TEST_DB_NAME.test(dbName);
}

/**
 * Throw unless `uri` is an acceptable target for `nodeEnv`.
 *
 * @param {object}  args
 * @param {string}  args.uri            The connection string about to be used.
 * @param {string}  args.nodeEnv        Resolved NODE_ENV.
 * @param {string} [args.productionUri] MONGO_URI, when it happens to be
 *   readable. Used only to prove a test run is not aimed at the production
 *   cluster; absent is fine and is itself the stronger position.
 */
function assertMongoTarget({ uri, nodeEnv, productionUri }) {
    const target = parseMongoUri(uri);

    if (nodeEnv === "test") {
        if (!target.dbName) {
            throw new Error(
                "Refusing to connect: the test MongoDB URI has no database name, so the " +
                    'driver would silently use a database called "test". Name it explicitly, ' +
                    "e.g. mongodb+srv://…/apnatutors_test"
            );
        }

        if (!looksLikeTestDatabase(target.dbName)) {
            throw new Error(
                `Refusing to connect: NODE_ENV=test but the database is "${target.dbName}", ` +
                    "which does not read as a test database. Rename it to something like " +
                    '"apnatutors_test" — this guard is what stops a test run from wiping real data.'
            );
        }

        if (productionUri) {
            let prod;
            try {
                prod = parseMongoUri(productionUri);
            } catch {
                prod = null; // An unparseable prod URI is not this check's problem.
            }

            if (prod && prod.hosts === target.hosts) {
                throw new Error(
                    "Refusing to connect: the test database is on the same cluster as " +
                        `production (${target.hosts}). Test data belongs on its own cluster ` +
                        "with its own credentials."
                );
            }
        }
    }

    if (nodeEnv === "production" && looksLikeTestDatabase(target.dbName)) {
        throw new Error(
            `Refusing to start: NODE_ENV=production but the database is "${target.dbName}", ` +
                "which reads as a test database. Production would be serving test data."
        );
    }

    return target;
}

module.exports = {
    parseMongoUri,
    describeMongoUri,
    looksLikeTestDatabase,
    assertMongoTarget,
    TEST_DB_NAME,
};
