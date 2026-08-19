/**
 * Liveness and readiness probes.
 *
 * `/health` answers "is the process alive?" — it must never touch the database,
 * or a slow Mongo will get the container killed during an incident it did not
 * cause.
 *
 * `/ready` answers "can this instance serve traffic?" — it does check the
 * database, and returns 503 when it cannot, so a load balancer drains this
 * instance instead of sending it doomed requests.
 */

const express = require("express");
const mongoose = require("mongoose");
const { config } = require("../config/env.cjs");

const router = express.Router();

const startedAt = Date.now();

// mongoose.connection.readyState codes
const CONNECTION_STATES = { 0: "disconnected", 1: "connected", 2: "connecting", 3: "disconnecting" };

router.get("/health", (_req, res) => {
    res.json({
        // `status: "UP"` is kept for existing monitors that string-match it.
        status: "UP",
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
        env: config.env,
    });
});

router.get("/ready", async (_req, res) => {
    const dbState = CONNECTION_STATES[mongoose.connection.readyState] || "unknown";
    let dbReachable = mongoose.connection.readyState === 1;

    // readyState can report "connected" against a socket that has since died;
    // a ping is the only honest check.
    if (dbReachable) {
        try {
            await mongoose.connection.db.admin().ping();
        } catch {
            dbReachable = false;
        }
    }

    const checks = {
        database: { status: dbReachable ? "UP" : "DOWN", state: dbState },
        // Feature gates come from validated env, so this doubles as a config
        // readout without ever exposing a secret value.
        features: config.features,
    };

    res.status(dbReachable ? 200 : 503).json({
        status: dbReachable ? "READY" : "NOT_READY",
        timestamp: new Date().toISOString(),
        checks,
    });
});

module.exports = router;
