const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const msg91 = require("../utils/msg91.cjs");

const PHONE_RE = /^[6-9]\d{9}$/;

// Used only when MSG91 isn't configured (local dev) — never in production.
// phone -> { hash, expires }
const devOtpStore = new Map();

exports.sendOtp = async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone || !PHONE_RE.test(phone.trim())) {
            return res.status(400).json({ message: "A valid 10-digit mobile number is required" });
        }
        const cleanPhone = phone.trim();

        if (!msg91.hasMsg91Config()) {
            if (process.env.NODE_ENV === "production") {
                return res.status(503).json({ message: "OTP service is not configured." });
            }
            const otp = String(Math.floor(100000 + Math.random() * 900000));
            const hash = await bcrypt.hash(otp, 10);
            devOtpStore.set(cleanPhone, { hash, expires: Date.now() + 5 * 60 * 1000 });
            console.log(`[DEV OTP] ${cleanPhone}: ${otp} (MSG91 not configured — dev mode)`);
            return res.json({ message: "OTP sent (dev mode — check server console)", devMode: true });
        }

        await msg91.sendOtp(cleanPhone);
        res.json({ message: "OTP sent to your mobile number" });
    } catch (err) {
        console.error("Send OTP Error:", err);
        res.status(500).json({ message: "Failed to send OTP. Please try again." });
    }
};

exports.verifyOtp = async (req, res) => {
    try {
        const { phone, otp } = req.body;
        if (!phone || !otp) {
            return res.status(400).json({ message: "Phone and OTP are required" });
        }
        const cleanPhone = phone.trim();

        let verified = false;
        if (!msg91.hasMsg91Config()) {
            const entry = devOtpStore.get(cleanPhone);
            if (entry && entry.expires > Date.now()) {
                verified = await bcrypt.compare(String(otp).trim(), entry.hash);
            }
            if (verified) devOtpStore.delete(cleanPhone);
        } else {
            verified = await msg91.verifyOtp(cleanPhone, String(otp).trim());
        }

        if (!verified) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }

        // Short-lived proof of verification the registration endpoint checks —
        // avoids needing server-side session state between verify and register.
        const phoneToken = jwt.sign(
            { phone: cleanPhone, purpose: "PHONE_VERIFIED" },
            process.env.JWT_SECRET,
            { expiresIn: "15m" }
        );

        res.json({ verified: true, phoneToken });
    } catch (err) {
        console.error("Verify OTP Error:", err);
        res.status(500).json({ message: "OTP verification failed. Please try again." });
    }
};
