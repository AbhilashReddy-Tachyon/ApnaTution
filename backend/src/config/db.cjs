const { logger } = require("../utils/logger.cjs");
const mongoose = require("mongoose");
const dns = require("dns");
const { config } = require("./env.cjs");
const { assertMongoTarget, describeMongoUri } = require("./mongoTarget.cjs");

// On local dev (Windows/Node 22) the system DNS can refuse SRV lookups for Atlas.
// Force public DNS only outside Vercel/production so we don't touch their infra DNS.
if (!process.env.VERCEL && process.env.NODE_ENV !== "production") {
    dns.setDefaultResultOrder("ipv4first");
    dns.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);
}

let isConnected = false;

const connectDB = async () => {
    // Already connected
    if (isConnected && mongoose.connection.readyState === 1) {
        return;
    }

    // Reuse existing connection (important for serverless cold starts)
    if (mongoose.connection.readyState === 1) {
        isConnected = true;
        return;
    }

    const uri = config.mongoUri;

    if (!uri) {
        throw new Error(
            config.isTest
                ? "MONGO_URI_TEST is not defined. NODE_ENV=test reads backend/.env.test only — " +
                  "copy .env.test.example and point it at your test cluster."
                : "MONGO_URI environment variable is not defined."
        );
    }

    // Fail closed before opening a socket: a test run must not be able to
    // reach production, and production must not be serving test data.
    assertMongoTarget({
        uri,
        nodeEnv: config.env,
        productionUri: config.productionMongoUri,
    });

    try {
        // Logged so the target is never a guess. describeMongoUri drops credentials.
        logger.info({ target: describeMongoUri(uri), env: config.env }, "Connecting to MongoDB...");

        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
        });

        isConnected = true;
        logger.info({ database: mongoose.connection.name }, "MongoDB connected");

    } catch (error) {
        isConnected = false;

        /*
         * These failures read almost identically in the logs and have nothing
         * in common in their fixes, so the hint has to separate them. Ordered
         * most-specific first: an SRV lookup that is refused also carries
         * ECONNREFUSED, and blaming the Atlas allowlist for it sends the reader
         * to the console when the problem is this machine's resolver.
         */
        let hint;
        if (error.syscall === "querySrv" || error.message.includes("querySrv")) {
            hint =
                "This machine's DNS refuses SRV lookups, so mongodb+srv:// cannot resolve — the " +
                "cluster itself is probably fine. Point the host at public DNS (8.8.8.8, 1.1.1.1), " +
                "or use the non-SRV connection string (Atlas → Connect → Drivers → older driver).";
        } else if (/bad auth|authentication failed|not authorized/i.test(error.message)) {
            hint =
                "Credentials were rejected — check the database user, that the password is " +
                "percent-encoded if it contains @ : / ? # or %, and authSource=admin.";
        } else if (/whitelist|IP address|selection timeout|could not connect to any servers/i.test(error.message)) {
            hint =
                "Reached DNS but no server accepted us — add this host's IP under Atlas → " +
                "Network Access (0.0.0.0/0 for serverless platforms with no fixed egress IP).";
        } else if (error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT") {
            hint =
                "Nothing accepted a connection on the MongoDB port — check that a local mongod " +
                "is running, or that a firewall or VPN is not blocking 27017.";
        }

        logger.error({ err: error, ...(hint && { hint }) }, "MongoDB connection failed");
        throw error;
    }
};

module.exports = connectDB;
