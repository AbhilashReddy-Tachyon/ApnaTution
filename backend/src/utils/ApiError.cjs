/**
 * Errors we raise deliberately, as opposed to crashes.
 *
 * `isOperational` is the important bit: an ApiError describes a situation we
 * anticipated (bad input, missing record, insufficient points) and its message
 * is safe to show a user. Anything else that reaches the error handler is a
 * bug, and its message must never leave the server.
 */

class ApiError extends Error {
    constructor(statusCode, message, { code = undefined, details = undefined, cause = undefined } = {}) {
        super(message, { cause });
        this.name = "ApiError";
        this.statusCode = statusCode;
        // Stable machine-readable code so the frontend can branch on the failure
        // without string-matching human-facing copy.
        this.code = code || defaultCodeFor(statusCode);
        this.details = details;
        this.isOperational = true;
        Error.captureStackTrace?.(this, ApiError);
    }

    static badRequest(message, options) {
        return new ApiError(400, message, { code: "BAD_REQUEST", ...options });
    }

    static unauthorized(message = "Authentication required", options) {
        return new ApiError(401, message, { code: "UNAUTHORIZED", ...options });
    }

    static forbidden(message = "You do not have access to this resource", options) {
        return new ApiError(403, message, { code: "FORBIDDEN", ...options });
    }

    static notFound(message = "Resource not found", options) {
        return new ApiError(404, message, { code: "NOT_FOUND", ...options });
    }

    static conflict(message, options) {
        return new ApiError(409, message, { code: "CONFLICT", ...options });
    }

    static unprocessable(message, options) {
        return new ApiError(422, message, { code: "UNPROCESSABLE", ...options });
    }

    static tooManyRequests(message = "Too many requests, please try again later", options) {
        return new ApiError(429, message, { code: "RATE_LIMITED", ...options });
    }

    static serviceUnavailable(message = "Service temporarily unavailable", options) {
        return new ApiError(503, message, { code: "SERVICE_UNAVAILABLE", ...options });
    }
}

function defaultCodeFor(statusCode) {
    const map = {
        400: "BAD_REQUEST",
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        409: "CONFLICT",
        422: "UNPROCESSABLE",
        429: "RATE_LIMITED",
        503: "SERVICE_UNAVAILABLE",
    };
    return map[statusCode] || "INTERNAL_ERROR";
}

/**
 * Wraps an async route handler so a rejected promise reaches Express's error
 * pipeline instead of hanging the request. Express 5 forwards rejections
 * automatically, but wrapping keeps behaviour explicit and portable.
 */
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { ApiError, asyncHandler };
