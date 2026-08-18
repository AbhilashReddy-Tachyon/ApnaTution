/**
 * Terminal error handling: one response shape for every failure, and a hard
 * guarantee that unexpected internals never reach the client.
 *
 * Response envelope (all failures, all routes):
 *   { success: false, error: { code, message, details?, requestId } }
 */

const mongoose = require("mongoose");
const { ApiError } = require("../utils/ApiError.cjs");
const { logger, getRequestId } = require("../utils/logger.cjs");
const { config } = require("../config/env.cjs");

/** Translates known third-party error shapes into ApiErrors. */
function normalize(err) {
    if (err instanceof ApiError) return err;

    // Mongoose: schema validation failed — the field messages are safe to surface.
    if (err instanceof mongoose.Error.ValidationError) {
        const details = Object.fromEntries(
            Object.entries(err.errors).map(([field, e]) => [field, e.message])
        );
        return ApiError.unprocessable("Validation failed", { code: "VALIDATION_ERROR", details, cause: err });
    }

    // Mongoose: a malformed ObjectId in the URL is a client mistake, not a 500.
    if (err instanceof mongoose.Error.CastError) {
        return ApiError.badRequest(`Invalid value for '${err.path}'`, { code: "INVALID_ID", cause: err });
    }

    // Mongo duplicate key — name the field, never echo the value (it may be a
    // stranger's email address).
    if (err?.code === 11000) {
        const field = Object.keys(err.keyPattern || err.keyValue || {})[0] || "value";
        return ApiError.conflict(`That ${field} is already registered`, {
            code: "DUPLICATE_KEY",
            details: { field },
            cause: err,
        });
    }

    if (err?.name === "TokenExpiredError") {
        return ApiError.unauthorized("Your session has expired, please sign in again", {
            code: "TOKEN_EXPIRED",
            cause: err,
        });
    }

    if (err?.name === "JsonWebTokenError" || err?.name === "NotBeforeError") {
        return ApiError.unauthorized("Invalid authentication token", { code: "TOKEN_INVALID", cause: err });
    }

    // JSON body that failed to parse.
    if (err?.type === "entity.parse.failed") {
        return ApiError.badRequest("Request body is not valid JSON", { code: "MALFORMED_JSON", cause: err });
    }

    if (err?.type === "entity.too.large") {
        return new ApiError(413, "Request body is too large", { code: "PAYLOAD_TOO_LARGE", cause: err });
    }

    // The database is unreachable — a real outage, but a 503 tells the client
    // to retry rather than treating it as a permanent failure.
    if (err instanceof mongoose.Error.MongooseServerSelectionError || err?.name === "MongoNetworkError") {
        return ApiError.serviceUnavailable("Service temporarily unavailable", {
            code: "DATABASE_UNAVAILABLE",
            cause: err,
        });
    }

    return null; // unrecognised → treat as a bug
}

function errorHandler(err, req, res, _next) {
    const normalized = normalize(err);
    const isBug = normalized === null;
    const statusCode = isBug ? 500 : normalized.statusCode;
    const requestId = getRequestId() || req.id;

    // Log the full error server-side regardless of what we tell the client.
    const logPayload = {
        err,
        statusCode,
        method: req.method,
        path: req.originalUrl,
        ...(isBug ? {} : { code: normalized.code }),
    };

    if (statusCode >= 500) logger.error(logPayload, isBug ? "unhandled error" : "service error");
    else logger.warn(logPayload, "request error");

    // A response may already be streaming — hand off to Express's default
    // handler, which closes the connection.
    if (res.headersSent) return _next(err);

    const body = {
        success: false,
        error: {
            code: isBug ? "INTERNAL_ERROR" : normalized.code,
            // A bug's message is never safe: it can carry connection strings,
            // file paths, or query fragments.
            message: isBug ? "Something went wrong on our end" : normalized.message,
            ...(normalized?.details && { details: normalized.details }),
            requestId,
        },
    };

    // Stack traces are a development affordance only.
    if (!config.isProduction && isBug) {
        body.error.debug = { name: err?.name, message: err?.message, stack: err?.stack?.split("\n").slice(0, 8) };
    }

    res.status(statusCode).json(body);
}

/** 404 for anything no route claimed. Runs after all routes, before errorHandler. */
function notFoundHandler(req, _res, next) {
    next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
}

module.exports = { errorHandler, notFoundHandler };
