// Server Entry Point
const { config } = require("./config/env.cjs");
const mongoose = require("mongoose");
const app = require("./app.cjs");
const connectDB = require("./config/db.cjs");
const { logger } = require("./utils/logger.cjs");
const { expireOldLeads } = require("./controllers/lead.controller.cjs");
const { runStartupCheck } = require("./utils/startupCheck.cjs");

const EXPIRY_INTERVAL_MS = 24 * 60 * 60 * 1000;

/**
 * A crash that leaves the process running is worse than one that doesn't: the
 * instance stays in the load balancer's rotation while its state is unknown.
 * Log the cause, then exit and let the supervisor restart us clean.
 */
function installCrashHandlers() {
    process.on("unhandledRejection", (reason) => {
        logger.fatal({ err: reason }, "unhandled promise rejection — shutting down");
        shutdown("unhandledRejection", 1);
    });

    process.on("uncaughtException", (err) => {
        logger.fatal({ err }, "uncaught exception — shutting down");
        shutdown("uncaughtException", 1);
    });
}

let server;
let expiryTimer;
let shuttingDown = false;

/**
 * Stop accepting new connections, let in-flight requests finish, close the DB,
 * then exit. Without this, a deploy drops requests that were mid-flight.
 */
async function shutdown(signal, exitCode = 0) {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, "shutting down");

    clearInterval(expiryTimer);

    // Hard ceiling — if a socket refuses to drain we still need to exit before
    // the platform SIGKILLs us and we lose the shutdown logs entirely.
    const forceExit = setTimeout(() => {
        logger.error("graceful shutdown timed out — forcing exit");
        process.exit(exitCode || 1);
    }, 10_000).unref();

    try {
        if (server) await new Promise((resolve) => server.close(resolve));
        await mongoose.connection.close(false);
        logger.info("shutdown complete");
    } catch (err) {
        logger.error({ err }, "error during shutdown");
        exitCode = exitCode || 1;
    }

    clearTimeout(forceExit);
    process.exit(exitCode);
}

// Only listen if not in a serverless environment (like Vercel), where the
// platform owns the process lifecycle and these handlers would fight it.
if (!config.isProduction && !config.isServerless) {
    installCrashHandlers();

    server = app.listen(config.port, async () => {
        // Run the API status check (prints route table to console)
        await runStartupCheck(config.port);

        // Run expiry job immediately on startup, then once every 24 h.
        // NOTE: this is per-instance and unsynchronised — with more than one
        // instance the job double-runs. Move to a locked/cron-driven job before
        // scaling out.
        await connectDB();
        const runExpiry = () =>
            expireOldLeads().catch((err) => logger.error({ err }, "lead expiry job failed"));

        runExpiry();
        expiryTimer = setInterval(runExpiry, EXPIRY_INTERVAL_MS);
    });

    for (const signal of ["SIGTERM", "SIGINT"]) {
        process.on(signal, () => shutdown(signal));
    }
}

module.exports = app;
