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

require("dotenv").config();

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
const MONGO_URI = required("MONGO_URI", { description: "MongoDB connection string" });

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
// callbacks — in production that is a correctness problem, not a warning.
if (isProduction && paymentsEnabled && !webhookEnabled) {
    errors.push(
        "RAZORPAY_WEBHOOK_SECRET is required in production when Razorpay is enabled — " +
            "unverified webhooks let anyone credit points to any account"
    );
}

const config = Object.freeze({
    env: process.env.NODE_ENV || "development",
    isProduction,
    isServerless,
    port: Number(process.env.PORT) || 5000,
    logLevel: optional("LOG_LEVEL", isProduction ? "info" : "debug"),

    mongoUri: MONGO_URI,
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
