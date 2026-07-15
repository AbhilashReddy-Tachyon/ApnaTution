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

// DB + Seed middleware (serverless safe - reuses connection)
let seeded = false;
app.use(async (_req, res, next) => {
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
});

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
