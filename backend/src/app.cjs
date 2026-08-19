require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
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
const { createOrder, verifyPayment } = require("./controllers/payment.controller.cjs");
const auth = require("./middleware/auth.middleware.cjs");
const role = require("./middleware/role.middleware.cjs");
const { ROUTES } = require("./utils/startupCheck.cjs");
const { buildDashboardHtml } = require("./utils/devDashboard.cjs");

const app = express();

// Dev dashboard at / — registered BEFORE helmet so its CSP doesn't block inline styles
if (process.env.NODE_ENV !== "production") {
    app.get("/", (_req, res) => {
        const port = process.env.PORT || 5000;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.send(buildDashboardHtml(port));
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
app.use((req, _res, next) => { sanitizeMongo(req.body); sanitizeMongo(req.params); next(); });

const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, curl)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin) || vercelPreviewPattern.test(origin)) {
            return callback(null, true);
        }
        console.warn("CORS blocked for origin:", origin);
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

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));

// Health check (before DB middleware so it always responds)
app.get("/health", (_req, res) => {
    res.json({ status: "UP", timestamp: new Date().toISOString() });
});

// Payment gateway readiness. Reports whether the Razorpay env vars reached this
// deployment — useful for diagnosing the "Payment gateway is not configured" 503.
// Safe to expose: key_id is already public (it is sent to the browser at checkout);
// the secret is never returned, only its presence and length so typos/truncation show up.
app.get("/health/payments", (_req, res) => {
    const keyId = process.env.RAZORPAY_KEY_ID || "";
    const keySecret = process.env.RAZORPAY_KEY_SECRET || "";
    res.json({
        nodeEnv: process.env.NODE_ENV || null,
        configured: !!(keyId && keySecret),
        keyId: {
            present: !!keyId,
            value: keyId || null,
            mode: keyId.startsWith("rzp_live_") ? "live" : keyId.startsWith("rzp_test_") ? "test" : null
        },
        keySecret: {
            present: !!keySecret,
            length: keySecret.length
        }
    });
});

// Database identity. Reports which cluster/database this deployment is actually
// connected to — the connection string itself is never exposed, only the host and
// db name, so a misdirected MONGO_URI can be spotted without leaking credentials.
app.get("/health/db", async (_req, res) => {
    const mongoose = require("mongoose");
    try {
        await connectDB();
        const conn = mongoose.connection;
        const counts = {};
        for (const name of ["users", "subscriptionplans", "tuitionleads", "transactions"]) {
            counts[name] = await conn.db.collection(name).countDocuments().catch(() => null);
        }
        res.json({
            connected: conn.readyState === 1,
            database: conn.name,
            host: conn.host,
            counts
        });
    } catch (err) {
        res.status(500).json({ connected: false, error: err.message });
    }
});

// DB + Seed middleware (serverless safe - reuses connection)
let seeded = false;
const ensureDatabaseReady = async (_req, res, next) => {
    try {
        await connectDB();
        if (!seeded) {
            await seedPlans();
            seeded = true;
        }
        next();
    } catch (err) {
        console.error("Startup Error:", err.name, "-", err.message);
        res.status(500).json({
            message: "Service temporarily unavailable",
            error: err.message,
            tip: "Check MONGO_URI environment variable in Vercel settings."
        });
    }
};

// Standard Razorpay Checkout aliases used by direct clients and the Angular proxy.
app.post("/api/create-order", auth, role("TUTOR"), ensureDatabaseReady, createOrder);
app.post("/api/verify-payment", auth, role("TUTOR"), ensureDatabaseReady, verifyPayment);
app.post("/create-order", auth, role("TUTOR"), ensureDatabaseReady, createOrder);
app.post("/verify-payment", auth, role("TUTOR"), ensureDatabaseReady, verifyPayment);

app.use(ensureDatabaseReady);

// Routes
app.use("/auth",       require("./routes/auth.routes.cjs"));
app.use("/otp",        require("./routes/otp.routes.cjs"));
app.use("/leads",      require("./routes/lead.routes.cjs"));
app.use("/admin",      require("./routes/admin.routes.cjs"));
app.use("/payments",   require("./routes/payment.routes.cjs"));
app.use("/public",     require("./routes/public.routes.cjs"));
app.use("/dashboard",  require("./routes/dashboard.routes.cjs"));

// Dev-only: list all routes + env-var readiness as JSON
if (process.env.NODE_ENV !== "production") {
    app.get("/debug/routes", (_req, res) => {
        const REQUIRED_VARS = ["MONGO_URI", "JWT_SECRET"];
        const OPTIONAL_VARS = ["CRON_SECRET", "EMAIL_USER", "EMAIL_PASSWORD", "EMAIL_SERVICE", "FROM_NAME", "FROM_EMAIL", "FRONTEND_URL", "GOOGLE_CLIENT_ID", "MSG91_AUTH_KEY", "MSG91_TEMPLATE_ID"];

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

// 404 handler
app.use((req, res) => {
    res.status(404).json({ message: `Route ${req.method} ${req.originalUrl} not found` });
});

// Global error handler
app.use((err, _req, res, _next) => {
    console.error("Unhandled Error:", err);
    res.status(500).json({ message: "Internal server error" });
});

module.exports = app;
