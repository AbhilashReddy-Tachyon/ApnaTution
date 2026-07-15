const http = require("http");

// ANSI colors
const C = {
    green:   "\x1b[32m",
    red:     "\x1b[31m",
    yellow:  "\x1b[33m",
    cyan:    "\x1b[36m",
    magenta: "\x1b[35m",
    blue:    "\x1b[34m",
    dim:     "\x1b[2m",
    bold:    "\x1b[1m",
    reset:   "\x1b[0m",
};

// Full route manifest — single source of truth for the status table
const ROUTES = [
    // group        method    path                             auth    role       requiredEnvVars                                       note
    { group: "Health",    method: "GET",   path: "/health",                     auth: false, role: null,      envVars: [],                                                   note: "Always available" },
    { group: "Auth",      method: "POST",  path: "/auth/register",              auth: false, role: null,      envVars: ["MONGO_URI", "JWT_SECRET"],                           note: "" },
    { group: "Auth",      method: "POST",  path: "/auth/login",                 auth: false, role: null,      envVars: ["MONGO_URI", "JWT_SECRET"],                           note: "" },
    { group: "Auth",      method: "GET",   path: "/auth/profile",               auth: true,  role: "ANY",     envVars: ["MONGO_URI", "JWT_SECRET"],                           note: "Bearer token required" },
    { group: "Auth",      method: "PUT",   path: "/auth/profile",               auth: true,  role: "ANY",     envVars: ["MONGO_URI", "JWT_SECRET"],                           note: "Bearer token required" },
    { group: "Auth",      method: "POST",  path: "/auth/forgot-password",       auth: false, role: null,      envVars: ["MONGO_URI", "JWT_SECRET", "EMAIL_USER", "EMAIL_PASSWORD"], note: "Sends email" },
    { group: "Auth",      method: "PUT",   path: "/auth/reset-password/:token", auth: false, role: null,      envVars: ["MONGO_URI", "JWT_SECRET"],                           note: "" },
    { group: "Leads",     method: "GET",   path: "/leads/my",                   auth: true,  role: "PARENT",  envVars: ["MONGO_URI", "JWT_SECRET"],                           note: "" },
    { group: "Leads",     method: "GET",   path: "/leads",                      auth: true,  role: "TUTOR",   envVars: ["MONGO_URI", "JWT_SECRET"],                           note: "" },
    { group: "Leads",     method: "POST",  path: "/leads",                      auth: true,  role: "PARENT",  envVars: ["MONGO_URI", "JWT_SECRET"],                           note: "" },
    { group: "Leads",     method: "POST",  path: "/leads/:id/unlock",           auth: true,  role: "TUTOR",   envVars: ["MONGO_URI", "JWT_SECRET"],                           note: "" },
    { group: "Leads",     method: "GET",   path: "/leads/:id",                  auth: true,  role: "PARENT",  envVars: ["MONGO_URI", "JWT_SECRET"],                           note: "" },
    { group: "Leads",     method: "PUT",   path: "/leads/:id",                  auth: true,  role: "PARENT",  envVars: ["MONGO_URI", "JWT_SECRET"],                           note: "" },
    { group: "Admin",     method: "GET",   path: "/admin/stats",                auth: true,  role: "ADMIN",   envVars: ["MONGO_URI", "JWT_SECRET"],                           note: "" },
    { group: "Admin",     method: "PATCH", path: "/admin/leads/:id/close",      auth: true,  role: "ADMIN",   envVars: ["MONGO_URI", "JWT_SECRET"],                           note: "" },
    { group: "Admin",     method: "GET",   path: "/admin/cron/expire-leads",    auth: false, role: null,      envVars: ["CRON_SECRET"],                                       note: "Secured by CRON_SECRET header" },
    { group: "Payments",  method: "GET",   path: "/payments/plans",             auth: true,  role: "TUTOR",   envVars: ["MONGO_URI", "JWT_SECRET"],                           note: "" },
    { group: "Payments",  method: "POST",  path: "/payments/validate-coupon",   auth: true,  role: "TUTOR",   envVars: ["MONGO_URI", "JWT_SECRET"],                           note: "" },
    { group: "Payments",  method: "POST",  path: "/payments/create-order",      auth: true,  role: "TUTOR",   envVars: ["MONGO_URI", "JWT_SECRET"],                           note: "" },
    { group: "Payments",  method: "POST",  path: "/payments/verify",            auth: true,  role: "TUTOR",   envVars: ["MONGO_URI", "JWT_SECRET"],                           note: "" },
    { group: "Public",    method: "GET",   path: "/public/tutors",              auth: false, role: null,      envVars: ["MONGO_URI"],                                         note: "" },
    { group: "Public",    method: "GET",   path: "/public/stats",               auth: false, role: null,      envVars: ["MONGO_URI"],                                         note: "" },
    { group: "Public",    method: "GET",   path: "/public/leads",               auth: false, role: null,      envVars: ["MONGO_URI"],                                         note: "" },
    { group: "Dashboard", method: "GET",   path: "/dashboard/parent",           auth: true,  role: "PARENT",  envVars: ["MONGO_URI", "JWT_SECRET"],                           note: "" },
    { group: "Dashboard", method: "GET",   path: "/dashboard/tutor",            auth: true,  role: "TUTOR",   envVars: ["MONGO_URI", "JWT_SECRET"],                           note: "" },
];

// Env vars to surface in the table
const REQUIRED_VARS = ["MONGO_URI", "JWT_SECRET"];
const OPTIONAL_VARS = ["CRON_SECRET", "EMAIL_USER", "EMAIL_PASSWORD", "EMAIL_SERVICE", "FROM_NAME", "FROM_EMAIL", "FRONTEND_URL"];

function pad(str, len) {
    const s = String(str ?? "");
    return s.length >= len ? s.slice(0, len) : s + " ".repeat(len - s.length);
}

function methodColor(method) {
    const map = { GET: C.green, POST: C.cyan, PUT: C.yellow, PATCH: C.magenta, DELETE: C.red };
    return (map[method] ?? C.reset) + pad(method, 6) + C.reset;
}

function pingRoute(port, path) {
    return new Promise((resolve) => {
        const req = http.get(`http://localhost:${port}${path}`, { timeout: 4000 }, (res) => {
            // drain body so the socket closes
            res.resume();
            resolve({ reachable: true, code: res.statusCode });
        });
        req.on("error", (e) => resolve({ reachable: false, code: `ERR (${e.code})` }));
        req.on("timeout", () => { req.destroy(); resolve({ reachable: false, code: "TIMEOUT" }); });
    });
}

async function runStartupCheck(port) {
    const W = 88;
    const LINE = C.dim + "─".repeat(W) + C.reset;

    console.log("");
    console.log(C.bold + C.cyan + "╔" + "═".repeat(W) + "╗" + C.reset);
    console.log(C.bold + C.cyan + "║" + pad("  ApnaTutors Backend — API Status", W) + "║" + C.reset);
    console.log(C.bold + C.cyan + "╚" + "═".repeat(W) + "╝" + C.reset);
    console.log(`  ${C.bold}URL:${C.reset}  http://localhost:${port}`);
    console.log(`  ${C.bold}Mode:${C.reset} ${process.env.NODE_ENV || "development"}`);

    // ── Env vars ──────────────────────────────────────────────────────────────
    console.log(`\n  ${C.bold}Environment Variables${C.reset}`);
    console.log("  " + LINE);
    for (const v of REQUIRED_VARS) {
        const ok = !!process.env[v];
        console.log(`  ${ok ? C.green + "✓" : C.red + "✗"} ${C.reset}${pad(v, 24)} ${ok ? C.green + "SET" : C.red + "MISSING — required"}${C.reset}`);
    }
    for (const v of OPTIONAL_VARS) {
        const ok = !!process.env[v];
        console.log(`  ${ok ? C.green + "✓" : C.dim + "○"} ${C.reset}${pad(v, 24)} ${ok ? C.green + "SET" : C.dim + "not set  (optional)"}${C.reset}`);
    }

    // ── Give the server a moment to finish its DB handshake before pinging ────
    await new Promise((r) => setTimeout(r, 800));

    // ── Route table ───────────────────────────────────────────────────────────
    console.log(`\n  ${C.bold}Routes${C.reset}`);
    console.log("  " + LINE);
    console.log(C.dim + "  " + pad("GROUP", 11) + pad("METHOD", 8) + pad("PATH", 38) + pad("STATUS", 14) + "NOTES" + C.reset);
    console.log("  " + LINE);

    let lastGroup = "";
    const results = [];

    for (const route of ROUTES) {
        const missing = route.envVars.filter((v) => !process.env[v]);

        let tag, tagText, noteText;

        if (missing.length > 0) {
            // Env vars missing → route will fail
            tag = "warn";
            tagText = "⚠ NEEDS ENV";
            noteText = C.yellow + "missing: " + missing.join(", ") + C.reset;
        } else if (route.auth) {
            // Auth-protected & env vars OK → ready but requires a token to test
            tag = "ready";
            tagText = "✓ READY";
            const roleLabel = route.role !== "ANY" ? `[${route.role}] ` : "";
            noteText = C.dim + roleLabel + (route.note || "auth required") + C.reset;
        } else if (!route.path.includes(":")) {
            // Public, no path params → we can actually ping it
            const ping = await pingRoute(port, route.path);
            if (!ping.reachable) {
                tag = "error";
                tagText = `✗ ${ping.code}`;
                noteText = C.red + "server not responding" + C.reset;
            } else if (ping.code >= 500) {
                tag = "error";
                tagText = `✗ ${ping.code}`;
                noteText = C.red + "server error — check DB / logs" + C.reset;
            } else {
                tag = "live";
                tagText = `✓ ${ping.code} LIVE`;
                noteText = C.dim + (route.note || "") + C.reset;
            }
        } else {
            // Public but has URL params (e.g. /auth/reset-password/:token) → can't auto-ping
            tag = "ready";
            tagText = "✓ READY";
            noteText = C.dim + (route.note || "has URL params") + C.reset;
        }

        const statusStr =
            tag === "live"  ? C.green  + pad(tagText, 14) + C.reset :
            tag === "ready" ? C.green  + pad(tagText, 14) + C.reset :
            tag === "warn"  ? C.yellow + pad(tagText, 14) + C.reset :
                              C.red    + pad(tagText, 14) + C.reset;

        if (route.group !== lastGroup) {
            if (lastGroup !== "") console.log("  " + LINE);
            lastGroup = route.group;
        }

        console.log(
            "  " +
            C.dim + pad(route.group, 11) + C.reset +
            methodColor(route.method) + " " +
            pad(route.path, 38) +
            statusStr +
            noteText
        );

        results.push({ ...route, tag, tagText, missing });
    }

    console.log("  " + LINE);

    // ── Summary ───────────────────────────────────────────────────────────────
    const nLive  = results.filter((r) => r.tag === "live").length;
    const nReady = results.filter((r) => r.tag === "ready").length;
    const nWarn  = results.filter((r) => r.tag === "warn").length;
    const nError = results.filter((r) => r.tag === "error").length;

    const parts = [
        nLive  > 0 ? C.green  + `${nLive} live-tested` + C.reset  : "",
        nReady > 0 ? C.green  + `${nReady} ready`      + C.reset  : "",
        nWarn  > 0 ? C.yellow + `${nWarn} need env`    + C.reset  : "",
        nError > 0 ? C.red    + `${nError} errors`     + C.reset  : "",
    ].filter(Boolean);

    console.log(`\n  ${C.bold}Summary:${C.reset} ${parts.join("  ")}`);

    if (nWarn > 0) {
        console.log(`  ${C.yellow}→ Add missing vars to .env to enable those routes.${C.reset}`);
    }
    if (nError > 0) {
        console.log(`  ${C.red}→ Check console errors above — likely a DB connection issue.${C.reset}`);
    }

    console.log(`  ${C.dim}Inspect at runtime: GET http://localhost:${port}/debug/routes${C.reset}`);
    console.log("");

    return results;
}

module.exports = { runStartupCheck, ROUTES };
