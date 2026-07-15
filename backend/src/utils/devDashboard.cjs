const { ROUTES } = require("./startupCheck.cjs");

const REQUIRED_VARS = ["MONGO_URI", "JWT_SECRET"];
const OPTIONAL_VARS = [
    "CRON_SECRET",
    "EMAIL_USER", "EMAIL_PASSWORD", "EMAIL_SERVICE", "FROM_NAME", "FROM_EMAIL",
    "FRONTEND_URL",
];

const METHOD_COLOR = {
    GET:    "#22c55e",
    POST:   "#3b82f6",
    PUT:    "#f59e0b",
    PATCH:  "#a855f7",
    DELETE: "#ef4444",
};

function badge(method) {
    const color = METHOD_COLOR[method] || "#6b7280";
    return `<span style="background:${color};color:#fff;font-size:11px;font-weight:700;
        padding:2px 8px;border-radius:4px;letter-spacing:.5px;min-width:52px;
        display:inline-block;text-align:center;">${method}</span>`;
}

function envRow(name, required) {
    const set = !!process.env[name];
    const icon  = set ? "✓" : required ? "✗" : "○";
    const color = set ? "#22c55e" : required ? "#ef4444" : "#6b7280";
    const label = set ? "SET" : required ? "MISSING" : "not set";
    const labelColor = set ? "#dcfce7" : required ? "#fee2e2" : "#f3f4f6";
    const labelText  = set ? "#166534" : required ? "#991b1b" : "#374151";
    return `
        <tr>
          <td style="padding:7px 12px;color:${color};font-weight:700;font-size:15px;">${icon}</td>
          <td style="padding:7px 4px;font-family:monospace;font-size:13px;color:#e2e8f0;">${name}</td>
          <td style="padding:7px 12px;">
            <span style="background:${labelColor};color:${labelText};font-size:11px;font-weight:600;
                padding:2px 8px;border-radius:12px;">${label}${required && !set ? " — required" : ""}</span>
          </td>
        </tr>`;
}

function routeRow(route, isFirst) {
    const missing = route.envVars.filter((v) => !process.env[v]);
    const hasEnv  = missing.length === 0;

    let statusHtml, noteHtml;
    if (!hasEnv) {
        statusHtml = `<span style="background:#451a03;color:#fcd34d;font-size:11px;font-weight:600;
            padding:2px 9px;border-radius:12px;">⚠ NEEDS ENV</span>`;
        noteHtml = `<span style="color:#fcd34d;font-size:12px;">missing: ${missing.join(", ")}</span>`;
    } else if (route.auth) {
        statusHtml = `<span style="background:#1e3a5f;color:#93c5fd;font-size:11px;font-weight:600;
            padding:2px 9px;border-radius:12px;">🔒 AUTH</span>`;
        const roleLabel = route.role && route.role !== "ANY" ? `[${route.role}] ` : "";
        noteHtml = `<span style="color:#94a3b8;font-size:12px;">${roleLabel}${route.note || ""}</span>`;
    } else {
        statusHtml = `<span style="background:#052e16;color:#86efac;font-size:11px;font-weight:600;
            padding:2px 9px;border-radius:12px;">✓ PUBLIC</span>`;
        noteHtml = `<span style="color:#94a3b8;font-size:12px;">${route.note || ""}</span>`;
    }

    const borderTop = isFirst ? "border-top:1px solid #334155;" : "";
    return `
        <tr style="${borderTop}">
          <td style="padding:9px 12px;color:#64748b;font-size:12px;font-weight:500;">${route.group}</td>
          <td style="padding:9px 8px;">${badge(route.method)}</td>
          <td style="padding:9px 8px;font-family:monospace;font-size:13px;color:#e2e8f0;">${route.path}</td>
          <td style="padding:9px 8px;">${statusHtml}</td>
          <td style="padding:9px 8px;">${noteHtml}</td>
        </tr>`;
}

function buildDashboardHtml(port) {
    // Group routes for separator logic
    const rows = [];
    let lastGroup = "";
    for (const route of ROUTES) {
        const isFirst = route.group !== lastGroup;
        rows.push(routeRow(route, isFirst));
        lastGroup = route.group;
    }

    const totalRoutes = ROUTES.length;
    const readyRoutes = ROUTES.filter((r) => r.envVars.every((v) => !!process.env[v])).length;
    const needsEnv    = totalRoutes - readyRoutes;

    const summaryColor = needsEnv > 0 ? "#fbbf24" : "#22c55e";
    const summaryText  = needsEnv > 0
        ? `${readyRoutes}/${totalRoutes} routes ready — ${needsEnv} need env vars`
        : `All ${totalRoutes} routes ready`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>ApnaTutors API Dashboard</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body   { background: #0f172a; color: #e2e8f0; font-family: -apple-system, BlinkMacSystemFont,
             "Segoe UI", Roboto, sans-serif; min-height: 100vh; padding: 32px 24px; }
    h1     { font-size: 22px; font-weight: 700; color: #f1f5f9; }
    h2     { font-size: 13px; font-weight: 600; text-transform: uppercase;
             letter-spacing: 1px; color: #64748b; margin-bottom: 10px; }
    .card  { background: #1e293b; border: 1px solid #334155; border-radius: 10px;
             padding: 20px 24px; margin-bottom: 24px; }
    table  { width: 100%; border-collapse: collapse; }
    tr     { border-bottom: 1px solid #1e293b; }
    tr:last-child { border-bottom: none; }
    a      { color: #60a5fa; text-decoration: none; }
    a:hover{ text-decoration: underline; }
  </style>
</head>
<body>
  <div style="max-width:960px;margin:0 auto;">

    <!-- Header -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:28px;">
      <div>
        <h1>ApnaTutors <span style="color:#60a5fa;">API</span> Dashboard</h1>
        <p style="color:#64748b;font-size:13px;margin-top:4px;">
          Local dev server &mdash;
          <a href="http://localhost:${port}/health">/health</a> &nbsp;|&nbsp;
          <a href="http://localhost:${port}/debug/routes">/debug/routes (JSON)</a>
        </p>
      </div>
      <div style="text-align:right;">
        <span style="background:#1e293b;border:1px solid #334155;color:#94a3b8;
            font-size:12px;padding:4px 12px;border-radius:6px;">
          ⚡ localhost:${port}
        </span>
        <br/>
        <span style="color:${summaryColor};font-size:12px;font-weight:600;margin-top:6px;display:block;">
          ${summaryText}
        </span>
      </div>
    </div>

    <!-- Env Vars -->
    <div class="card">
      <h2>Environment Variables</h2>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 32px;">
        <div>
          <p style="font-size:11px;color:#64748b;margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px;">Required</p>
          <table>${REQUIRED_VARS.map((v) => envRow(v, true)).join("")}</table>
        </div>
        <div>
          <p style="font-size:11px;color:#64748b;margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px;">Optional</p>
          <table>${OPTIONAL_VARS.map((v) => envRow(v, false)).join("")}</table>
        </div>
      </div>
    </div>

    <!-- Routes -->
    <div class="card">
      <h2>Routes (${totalRoutes} total)</h2>
      <table>
        <thead>
          <tr style="border-bottom:1px solid #334155;">
            <th style="padding:8px 12px;text-align:left;font-size:11px;color:#64748b;
                text-transform:uppercase;letter-spacing:.5px;width:90px;">Group</th>
            <th style="padding:8px 8px;text-align:left;font-size:11px;color:#64748b;
                text-transform:uppercase;letter-spacing:.5px;width:80px;">Method</th>
            <th style="padding:8px 8px;text-align:left;font-size:11px;color:#64748b;
                text-transform:uppercase;letter-spacing:.5px;">Path</th>
            <th style="padding:8px 8px;text-align:left;font-size:11px;color:#64748b;
                text-transform:uppercase;letter-spacing:.5px;width:120px;">Status</th>
            <th style="padding:8px 8px;text-align:left;font-size:11px;color:#64748b;
                text-transform:uppercase;letter-spacing:.5px;">Notes</th>
          </tr>
        </thead>
        <tbody>${rows.join("")}</tbody>
      </table>
    </div>

    <p style="text-align:center;color:#334155;font-size:12px;">
      Only visible in development &mdash; not available in production
    </p>
  </div>
</body>
</html>`;
}

module.exports = { buildDashboardHtml };
