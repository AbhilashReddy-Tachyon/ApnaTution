// Server Entry Point
require('dotenv').config();
const app = require('./app.cjs');
const connectDB = require('./config/db.cjs');
const { expireOldLeads } = require('./controllers/lead.controller.cjs');
const { runStartupCheck } = require('./utils/startupCheck.cjs');

const PORT = process.env.PORT || 5000;

// Only listen if not in a serverless environment (like Vercel)
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    app.listen(PORT, async () => {
        // Run the API status check (prints route table to console)
        await runStartupCheck(PORT);

        // Run expiry job immediately on startup, then once every 24 h
        await connectDB();
        expireOldLeads().catch(console.error);
        setInterval(() => expireOldLeads().catch(console.error), 24 * 60 * 60 * 1000);
    });
}

module.exports = app;

