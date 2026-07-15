const mongoose = require("mongoose");
const dns = require("dns");

// On local dev (Windows/Node 22) the system DNS can refuse SRV lookups for Atlas.
// Force public DNS only outside Vercel/production so we don't touch their infra DNS.
if (!process.env.VERCEL && process.env.NODE_ENV !== "production") {
    dns.setDefaultResultOrder("ipv4first");
    dns.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);
}

let isConnected = false;

const connectDB = async () => {
    // Already connected
    if (isConnected && mongoose.connection.readyState === 1) {
        return;
    }

    // Reuse existing connection (important for serverless cold starts)
    if (mongoose.connection.readyState === 1) {
        isConnected = true;
        return;
    }

    if (!process.env.MONGO_URI) {
        throw new Error("MONGO_URI environment variable is not defined.");
    }

    try {
        console.log("Connecting to MongoDB...");

        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
        });

        isConnected = true;
        console.log("MongoDB connected:", mongoose.connection.name);

    } catch (error) {
        isConnected = false;
        console.error("DB connection failed:", error.name, "-", error.message);
        if (error.code === "ECONNREFUSED" || error.message.includes("querySrv")) {
            console.error("TIP: DNS lookup for MongoDB Atlas failed.");
            console.error("     → Go to MongoDB Atlas → Network Access → allow 0.0.0.0/0 for local dev.");
            console.error("     → Or check your internet / VPN connection.");
        } else if (error.message.includes("IP") || error.message.includes("whitelist") || error.message.includes("selection timeout")) {
            console.error("TIP: Go to MongoDB Atlas → Network Access → Add your server IP to the whitelist.");
        }
        throw error;
    }
};

module.exports = connectDB;
