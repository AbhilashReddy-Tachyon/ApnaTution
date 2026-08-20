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

        // The remediation for a failed connection is almost always one of two
        // Atlas settings, so name it rather than making the reader guess.
        let hint;
        if (error.code === "ECONNREFUSED" || error.message.includes("querySrv")) {
            hint = "DNS lookup for Atlas failed — allow 0.0.0.0/0 under Network Access, or check your VPN.";
        } else if (/IP|whitelist|selection timeout/.test(error.message)) {
            hint = "Add this server's IP to Atlas → Network Access.";
        }

        logger.error({ err: error, ...(hint && { hint }) }, "MongoDB connection failed");
        throw error;
    }
};

module.exports = connectDB;
