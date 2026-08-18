/**
 * Assigns every request a correlation id, binds it to the async context so all
 * downstream logs inherit it, and emits one completion line per request with
 * status and duration.
 *
 * The id is echoed back as `X-Request-Id` so a user reporting a failure can
 * quote it and we can find the exact request in the logs.
 */

const { randomUUID } = require("node:crypto");
const { logger, withRequestContext } = require("../utils/logger.cjs");

// Paths that would otherwise flood the logs with no diagnostic value.
const QUIET_PATHS = new Set(["/health", "/ready", "/favicon.ico"]);

function requestLogger(req, res, next) {
    // Honour an upstream id (load balancer, frontend retry) so a single user
    // action keeps one id across services.
    const requestId = req.headers["x-request-id"] || randomUUID();
    req.id = requestId;
    res.setHeader("X-Request-Id", requestId);

    const startedAt = process.hrtime.bigint();

    withRequestContext({ requestId }, () => {
        res.on("finish", () => {
            if (QUIET_PATHS.has(req.path) && res.statusCode < 400) return;

            const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
            const payload = {
                method: req.method,
                path: req.originalUrl,
                status: res.statusCode,
                durationMs: Math.round(durationMs * 10) / 10,
                ip: req.ip,
            };

            // Client errors are expected noise; server errors are incidents.
            if (res.statusCode >= 500) logger.error(payload, "request failed");
            else if (res.statusCode >= 400) logger.warn(payload, "request rejected");
            else logger.info(payload, "request completed");
        });

        next();
    });
}

module.exports = requestLogger;
