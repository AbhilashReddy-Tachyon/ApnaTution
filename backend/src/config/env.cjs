/**
 * Boot-time environment validation.
 *
 * Required vars are checked before the app can serve a single request, so a
 * misconfigured deploy fails loudly at startup instead of throwing 500s at
 * users hours later. Optional vars gate individual features — we record which
 * features are usable so routes can degrade honestly rather than crash.
 *
 * Nothing here logs a secret value, only whether it is present.
 */

const path = require("path");

const isTest = process.env.NODE_ENV === "test";

/*
 * A test run loads ONLY `.env.test`. Not `.env` as well, and not as a fallback:
 * if the production connection string is never read into the process, no bug
 * downstream can aim a test at production. The cost is that `.env.test` must
 * repeat anything the tests need.
 */
const envFile = isTest ? ".env.test" : ".env";
require("dotenv").config({ path: path.resolve(__dirname, "..", "..", envFile) });

const isProduction = process.env.NODE_ENV === "production";
const isServerless = !!process.env.VERCEL;

const errors = [];
const warnings = [];

function required(name, { minLength = 1, description = "" } = {}) {
    const value = process.env[name];
    if (!value || !value.trim()) {
        errors.push(`${name} is not set${description ? ` — ${description}` : ""}`);
        return undefined;
    }
    if (value.length < minLength) {
        errors.push(`${name} is too short (needs at least ${minLength} characters)`);
    }
    return value;
}

function optional(name, fallback = undefined) {
    const value = process.env[name];
    return value && value.trim() ? value : fallback;
}

/** A feature is "enabled" only when every var it depends on is present. */
function feature(name, varNames) {
    const missing = varNames.filter((v) => !optional(v));
    if (missing.length === 0) return true;
    warnings.push(`${name} disabled — missing ${missing.join(", ")}`);
    return false;
}

// ── Required in every environment ────────────────────────────────────────────
/*
 * Two separate variables rather than one reused name, so a test config cannot
 * be mistaken for a production one at a glance, and so a machine set up for
 * tests need not hold the production string at all.
 */
/*
 * Under test this is read but never connected to: it exists only so the guard
 * can prove the test target is not the production cluster. That matters in CI,
 * where MONGO_URI is often present in the environment as a repo secret even
 * though `.env` is not loaded. Reading it as optional (not required) keeps a
 * developer machine with no production credentials working.
 */
const MONGO_URI = isTest
    ? optional("MONGO_URI")
    : required("MONGO_URI", { description: "MongoDB connection string" });

const MONGO_URI_TEST = isTest
    ? required("MONGO_URI_TEST", {
          description: "test-cluster connection string, required when NODE_ENV=test",
      })
    : optional("MONGO_URI_TEST");

/** The one connection string this process is allowed to use. */
const activeMongoUri = isTest ? MONGO_URI_TEST : MONGO_URI;

// A short JWT secret is brute-forceable; 32 chars is the practical floor for HS256.
const JWT_SECRET = required("JWT_SECRET", {
    minLength: isProduction ? 32 : 8,
    description: "used to sign auth tokens",
});

if (JWT_SECRET && /^(secret|changeme|test|dev|password)$/i.test(JWT_SECRET)) {
    errors.push("JWT_SECRET is a well-known placeholder value — replace it");
}

// ── Feature gates ────────────────────────────────────────────────────────────
const emailEnabled = feature("Email (password reset, notifications)", [
    "EMAIL_USER",
    "EMAIL_PASSWORD",
]);

const paymentsEnabled = feature("Payments (Razorpay)", [
    "RAZORPAY_KEY_ID",
    "RAZORPAY_KEY_SECRET",
]);

const webhookEnabled = feature("Razorpay webhook verification", ["RAZORPAY_WEBHOOK_SECRET"]);

const cronEnabled = feature("Scheduled jobs (lead expiry)", ["CRON_SECRET"]);

// Payments without webhook verification means we cannot trust async payment
// callbacks. The payment routes themselves already refuse to operate without
// this (see hasRazorpayConfig()/hasWebhookConfig() in payment.controller.cjs,
// which return a scoped 503 instead of processing the payment) — so this is a
// warning, not a fatal error. It must NOT be pushed to `errors`: that array
// makes validateEnv() throw and take the *entire* app down in production,
// which would break every unrelated route (OTP, auth, public stats, ...)
// over a payments-only misconfiguration.
if (isProduction && paymentsEnabled && !webhookEnabled) {
    warnings.push(
        "RAZORPAY_WEBHOOK_SECRET is not set — Razorpay payment/webhook routes will return 503 " +
            "until it's configured (payments endpoints already refuse to run unverified, so this is safe)"
    );
}

const config = Object.freeze({
    env: process.env.NODE_ENV || "development",
    isProduction,
    isTest,
    isServerless,
    port: Number(process.env.PORT) || 5000,
    logLevel: optional("LOG_LEVEL", isProduction ? "info" : "debug"),

    /** The connection string to use. Read this, never process.env directly. */
    mongoUri: activeMongoUri,
    /** Only for the guard's "is this the production cluster?" check. */
    productionMongoUri: MONGO_URI,
    jwtSecret: JWT_SECRET,
    jwtExpiresIn: optional("JWT_EXPIRES_IN", "7d"),

    frontendUrl: optional("FRONTEND_URL"),
    cronSecret: optional("CRON_SECRET"),

    razorpay: Object.freeze({
        keyId: optional("RAZORPAY_KEY_ID"),
        keySecret: optional("RAZORPAY_KEY_SECRET"),
        webhookSecret: optional("RAZORPAY_WEBHOOK_SECRET"),
    }),

    email: Object.freeze({
        service: optional("EMAIL_SERVICE", "gmail"),
        user: optional("EMAIL_USER"),
        password: optional("EMAIL_PASSWORD"),
        fromName: optional("FROM_NAME", "ApnaTutors"),
        fromEmail: optional("FROM_EMAIL"),
    }),

    features: Object.freeze({
        email: emailEnabled,
        payments: paymentsEnabled,
        webhooks: webhookEnabled,
        cron: cronEnabled,
    }),
});

/**
 * Call once at startup. Throws in production so the deploy fails fast;
 * in development we print the problems but let the server boot so a partially
 * configured machine is still useful for frontend work.
 */
function validateEnv({ logger = console } = {}) {
    for (const warning of warnings) {
        logger.warn ? logger.warn(warning) : console.warn(warning);
    }

    if (errors.length === 0) return config;

    const summary = `Invalid environment configuration:\n  - ${errors.join("\n  - ")}`;

    if (isProduction) {
        throw new Error(summary);
    }

    logger.error ? logger.error(summary) : console.error(summary);
    return config;
}

module.exports = { config, validateEnv, envErrors: errors, envWarnings: warnings };
