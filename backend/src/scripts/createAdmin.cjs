// One-off CLI script to create (or promote) an admin account.
// Usage: node src/scripts/createAdmin.cjs <email> <password> [name]
//
// The connection string comes from config/env.cjs (loaded transitively via
// config/db.cjs), which picks .env or .env.test based on NODE_ENV. This script
// deliberately does NOT call dotenv itself: doing so loaded .env even under
// NODE_ENV=test, putting the production credentials into a test process.
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const connectDB = require("../config/db.cjs");
const User = require("../models/user.model.cjs");

async function main() {
    const [, , email, password, name] = process.argv;

    if (!email || !password) {
        console.error("Usage: node src/scripts/createAdmin.cjs <email> <password> [name]");
        process.exitCode = 1;
        return;
    }
    if (password.length < 6) {
        console.error("Password must be at least 6 characters");
        process.exitCode = 1;
        return;
    }

    await connectDB();

    const normalizedEmail = email.toLowerCase().trim();
    const hashedPassword = await bcrypt.hash(password, 10);

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
        existing.role = "ADMIN";
        existing.password = hashedPassword;
        existing.isActive = true;
        await existing.save();
        console.log(`Updated existing user "${normalizedEmail}" to ADMIN and reset their password.`);
    } else {
        await User.create({
            role: "ADMIN",
            name: name || "Admin",
            email: normalizedEmail,
            password: hashedPassword,
            isActive: true,
            isVerified: true
        });
        console.log(`Created new ADMIN user "${normalizedEmail}".`);
    }

    await mongoose.disconnect();
}

main().catch((err) => {
    console.error("createAdmin failed:", err.message);
    process.exitCode = 1;
});
