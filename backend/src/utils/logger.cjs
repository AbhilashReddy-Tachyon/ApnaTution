/**
 * Structured logging.
 *
 * Every log line is JSON in production so Vercel/Datadog/CloudWatch can index
 * it; pretty-printed in development so it stays readable. Any log emitted
 * during a request automatically carries that request's id, so a support
 * ticket quoting one id gives you the whole request trail — including logs
 * from deep inside controllers that never see `req`.
 *
 * Never log a raw secret: `redact` scrubs the usual carriers before serialising.
 */

const { AsyncLocalStorage } = require("node:async_hooks");
const pino = require("pino");
const { config } = require("../config/env.cjs");

/** Holds per-request context (id, user) for the lifetime of one request. */
const requestContext = new AsyncLocalStorage();

const baseLogger = pino({
    level: config.logLevel,
    base: { service: "apnatutors-api", env: config.env },
    redact: {
        paths: [
            "req.headers.authorization",
            "req.headers.cookie",
            "req.headers['x-razorpay-signature']",
            "password",
            "*.password",
            "confirmPassword",
            "*.confirmPassword",
            "token",
            "*.token",
            "resetToken",
            "*.resetToken",
            "razorpay_signature",
            "*.razorpay_signature",
        ],
        censor: "[redacted]",
    },
    // Pretty output locally only — pino-pretty is a devDependency and must never
    // be required in a serverless bundle.
    ...(config.isProduction || config.isServerless
        ? {}
        : {
              transport: {
                  target: "pino-pretty",
                  options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname,service,env" },
              },
          }),
});

/**
 * Logger proxy that merges the active request's context into every line.
 * Use this everywhere instead of `console`.
 */
const logger = new Proxy(baseLogger, {
    get(target, prop) {
        if (["trace", "debug", "info", "warn", "error", "fatal"].includes(prop)) {
            return (...args) => {
                const ctx = requestContext.getStore();
                if (!ctx) return target[prop](...args);

                const [first, ...rest] = args;
                const meta = { requestId: ctx.requestId, ...(ctx.userId && { userId: ctx.userId }) };

                // pino's signature is (mergeObject, message) or (message)
                return typeof first === "object" && first !== null
                    ? target[prop]({ ...meta, ...first }, ...rest)
                    : target[prop](meta, first, ...rest);
            };
        }
        const value = target[prop];
        return typeof value === "function" ? value.bind(target) : value;
    },
});

/** Run `fn` with the given request context attached to all logs it emits. */
function withRequestContext(context, fn) {
    return requestContext.run(context, fn);
}

/** Mutate the active context — used once auth resolves the user. */
function setRequestUser(userId) {
    const ctx = requestContext.getStore();
    if (ctx) ctx.userId = userId;
}

function getRequestId() {
    return requestContext.getStore()?.requestId;
}

module.exports = { logger, withRequestContext, setRequestUser, getRequestId };
