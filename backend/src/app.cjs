// `env.cjs` loads dotenv and validates configuration — require it before
// anything that reads process.env.
const { config, validateEnv } = require("./config/env.cjs");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { logger } = require("./utils/logger.cjs");
const requestLogger = require("./middleware/requestLogger.cjs");
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler.cjs");

// Fails fast in production, warns in development.
validateEnv({ logger });
// express-mongo-sanitize is incompatible with Express v5 (req.query is read-only).
// Inline sanitizer: strips keys starting with $ or containing . from body/params.
function sanitizeMongo(val) {
    if (Array.isArray(val)) { val.forEach(sanitizeMongo); return; }
    if (val && typeof val === "object") {
        for (const key of Object.keys(val)) {
            if (key.startsWith("$") || key.includes(".")) { delete val[key]; }
            else sanitizeMongo(val[key]);
        }
    }
}
const connectDB = require("./config/db.cjs");
const { seedPlans } = require("./controllers/payment.controller.cjs");
const { createOrder, verifyPayment, handleRazorpayWebhook } = require("./controllers/payment.controller.cjs");
const auth = require("./middleware/auth.middleware.cjs");
const role = require("./middleware/role.middleware.cjs");
const { ROUTES } = require("./utils/startupCheck.cjs");
const { buildDashboardHtml } = require("./utils/devDashboard.cjs");

const app = express();

// Behind Vercel/any proxy, req.ip is the proxy's address unless we trust the
// forwarding headers — which rate limiting and audit logs both depend on.
app.set("trust proxy", 1);
app.disable("x-powered-by");

// First in the chain so every subsequent log line carries the request id.
app.use(requestLogger);

// Dev dashboard at / — registered BEFORE helmet so its CSP doesn't block inline styles
if (!config.isProduction) {
    app.get("/", (_req, res) => {
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.send(buildDashboardHtml(config.port));
    });
}

// Allowed origins
const allowedOrigins = [
    "http://localhost:4200",
    "http://localhost:3000",
    "https://apna-tution.vercel.app",
    "https://apnatution.vercel.app",
    "https://apnatutors.vercel.app",
    "https://apnatutors-frontend.vercel.app",
    "https://apnatutors.com",
    "https://www.apnatutors.com",
    "https://apnatution.com",
    "https://www.apnatution.com",
    // Optional: set `FRONTEND_URL` in Vercel/env to allow an additional custom origin.
    process.env.FRONTEND_URL,
].filter(Boolean);

// Matches Vercel preview URLs for this project.
const vercelPreviewPattern = /^https:\/\/(?:apna-tution-frontend|apnatutors|apnatutors-frontend)(-[a-z0-9-]+)?\.vercel\.app$/;

app.use(helmet());

const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, curl)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin) || vercelPreviewPattern.test(origin)) {
            return callback(null, true);
        }
        logger.warn({ origin }, "CORS blocked for origin");
        return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};

// Ensure preflight requests always get a successful response (especially important on serverless)
// Express v5/path-to-regexp does not accept "*" string routes; use a RegExp to match all paths.
app.options(/.*/, cors(corsOptions));
app.use(cors(corsOptions));

// Probes mount before the DB middleware so they answer during an outage —
// that is precisely when you need them.
app.use(require("./routes/health.routes.cjs"));

// DB + Seed middleware (serverless safe - reuses connection)
let seeded = false;
const ensureDatabaseReady = async (_req, _res, next) => {
    try {
        await connectDB();
        if (!seeded) {
            await seedPlans();
            seeded = true;
        }
        next();
    } catch (err) {
        // errorHandler maps Mongo connection failures to a 503 without leaking
        // the connection string that a raw err.message would expose.
        next(err);
    }
};

app.post(
    "/api/razorpay/webhook",
    express.raw({ type: "application/json", limit: "200kb" }),
    ensureDatabaseReady,
    handleRazorpayWebhook
);

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// Must run AFTER the body parsers: mounted before them (as it previously was)
// `req.body` is still undefined and the sanitizer silently does nothing.
app.use((req, _res, next) => {
    sanitizeMongo(req.body);

    // Express 5 exposes `req.query` as a getter that re-parses the URL on every
    // access, so mutating it in place is discarded. Replace the property with a
    // sanitized snapshot instead.
    const query = { ...req.query };
    sanitizeMongo(query);
    Object.defineProperty(req, "query", {
        value: query,
        writable: false,
        configurable: true,
        enumerable: true,
    });

    next();
});

// Standard Razorpay Checkout aliases used by direct clients and the Angular proxy.
app.post("/api/create-order", auth, role("TUTOR"), ensureDatabaseReady, createOrder);
app.post("/api/verify-payment", auth, role("TUTOR"), ensureDatabaseReady, verifyPayment);
app.post("/create-order", auth, role("TUTOR"), ensureDatabaseReady, createOrder);
app.post("/verify-payment", auth, role("TUTOR"), ensureDatabaseReady, verifyPayment);

app.use(ensureDatabaseReady);

// Routes
app.use("/auth",       require("./routes/auth.routes.cjs"));
app.use("/leads",      require("./routes/lead.routes.cjs"));
app.use("/admin",      require("./routes/admin.routes.cjs"));
app.use("/payments",   require("./routes/payment.routes.cjs"));
app.use("/public",     require("./routes/public.routes.cjs"));
app.use("/dashboard",  require("./routes/dashboard.routes.cjs"));

// Dev-only: list all routes + env-var readiness as JSON
if (process.env.NODE_ENV !== "production") {
    app.get("/debug/routes", (_req, res) => {
        const REQUIRED_VARS = ["MONGO_URI", "JWT_SECRET"];
        const OPTIONAL_VARS = ["CRON_SECRET", "EMAIL_USER", "EMAIL_PASSWORD", "EMAIL_SERVICE", "FROM_NAME", "FROM_EMAIL", "FRONTEND_URL"];

        const routes = ROUTES.map((r) => {
            const missing = r.envVars.filter((v) => !process.env[v]);
            return { ...r, status: missing.length > 0 ? "needs-env" : "ready", missingEnvVars: missing };
        });

        res.json({
            server: `http://localhost:${process.env.PORT || 5000}`,
            env: {
                required: Object.fromEntries(REQUIRED_VARS.map((v) => [v, !!process.env[v]])),
                optional: Object.fromEntries(OPTIONAL_VARS.map((v) => [v, !!process.env[v]])),
            },
            routes,
        });
    });
}

// Anything no route claimed becomes a 404 ApiError...
app.use(notFoundHandler);

// ...and every failure, thrown or forwarded, lands here for one consistent
// response shape. Must be registered last.
app.use(errorHandler);

module.exports = app;
