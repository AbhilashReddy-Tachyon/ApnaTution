const { logger } = require("../utils/logger.cjs");
const User = require("../models/user.model.cjs");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("node:crypto");
const { OAuth2Client } = require("google-auth-library");
const sendEmail = require("../utils/sendEmail.cjs");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PINCODE_RE = /^\d{6}$/;
const PHONE_RE = /^[6-9]\d{9}$/;

const googleClient = process.env.GOOGLE_CLIENT_ID ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID) : null;

function issueToken(user) {
    return jwt.sign(
        { id: user._id, role: user.role, name: user.name },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );
}

function sendAuthResponse(res, user, status = 200) {
    res.status(status).json({
        token: issueToken(user),
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            points: user.points,
            emailVerified: user.emailVerified,
            phoneVerified: user.phoneVerified,
            isVerified: user.isVerified
        }
    });
}

// Finds the user already linked to this Google account, links Google to a matching-email
// account created via password signup, or creates a brand-new account (which requires a
// role — the register page's social button sends one, the login page doesn't, so a
// first-time Google login there fails with ROLE_REQUIRED).
async function findOrCreateGoogleUser({ googleId, email, name, role }) {
    let user = await User.findOne({ googleId });
    if (user) return { user, created: false };

    user = await User.findOne({ email: email.toLowerCase().trim() });
    if (user) {
        user.googleId = googleId;
        await user.save();
        return { user, created: false };
    }

    if (!role || !["PARENT", "TUTOR"].includes(role)) {
        const err = new Error("New account — role required");
        err.code = "ROLE_REQUIRED";
        throw err;
    }

    user = await User.create({
        role,
        name: (name || "").trim() || email.split("@")[0],
        email: email.toLowerCase().trim(),
        authProvider: "GOOGLE",
        isVerified: true,
        googleId,
    });
    return { user, created: true };
}

const createOtp = () => String(Math.floor(100000 + Math.random() * 900000));
const hashOtp = (otp) => crypto.createHash("sha256").update(otp).digest("hex");
const sanitizeUser = (user) => {
    const obj = user.toObject ? user.toObject() : { ...user };
    delete obj.password;
    delete obj.resetPasswordToken;
    delete obj.resetPasswordExpire;
    delete obj.emailOtpHash;
    delete obj.emailOtpExpire;
    delete obj.phoneOtpHash;
    delete obj.phoneOtpExpire;
    return obj;
};

exports.register = async (req, res) => {
    try {
        const { role, name, email, password, phone, phoneToken, subjects, location, pincode } = req.body;

        if (!role || !name || !email || !password) {
            return res.status(400).json({ message: "role, name, email and password are required" });
        }
        if (!["PARENT", "TUTOR"].includes(role)) {
            return res.status(400).json({ message: "Role must be PARENT or TUTOR" });
        }
        if (!EMAIL_RE.test(email)) {
            return res.status(400).json({ message: "Invalid email address" });
        }
        if (pincode && !PINCODE_RE.test(pincode.trim())) {
            return res.status(400).json({ message: "Pincode must be a 6-digit number" });
        }
        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters" });
        }
        if (name.trim().length < 2) {
            return res.status(400).json({ message: "Name must be at least 2 characters" });
        }

        let phoneVerified = false;
        if (role === "PARENT") {
            if (!phone || !PHONE_RE.test(phone.trim())) {
                return res.status(400).json({ message: "A valid 10-digit mobile number is required" });
            }
            if (!phoneToken) {
                return res.status(400).json({ message: "Please verify your mobile number via OTP before registering" });
            }
            try {
                const decoded = jwt.verify(phoneToken, process.env.JWT_SECRET);
                if (decoded.purpose !== "PHONE_VERIFIED" || decoded.phone !== phone.trim()) {
                    throw new Error("Phone/token mismatch");
                }
            } catch (e) {
                return res.status(400).json({ message: "Mobile verification expired or invalid. Please verify again." });
            }
            phoneVerified = true;
        }

        const existing = await User.findOne({ email: email.toLowerCase().trim() });
        if (existing) {
            return res.status(409).json({ message: "An account with this email already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const userData = {
            role,
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            phoneVerified,
        };

        if (phone) userData.phone = phone.trim();
        if (location) userData.location = location.trim();
        if (pincode) userData.pincode = pincode.trim();
        if (role === "TUTOR" && subjects) {
            userData.subjects = Array.isArray(subjects)
                ? subjects.map(s => s.trim()).filter(Boolean)
                : subjects.split(",").map(s => s.trim()).filter(Boolean);
        }

        await User.create(userData);
        res.status(201).json({ message: "Registration successful. Please login." });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ message: "Email already registered" });
        }
        if (err.name === "ValidationError") {
            return res.status(400).json({ message: err.message });
        }
        logger.error({ err: err }, "Registration Error");
        res.status(500).json({ message: "Registration failed. Please try again." });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        if (!user.password) {
            return res.status(401).json({ message: 'This account signs in with Google. Please use "Continue with Google".' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        if (user.isActive === false) {
            return res.status(403).json({ message: "This account has been deactivated. Please contact support." });
        }

        sendAuthResponse(res, user);
    } catch (err) {
        logger.error({ err: err }, "Login Error");
        res.status(500).json({ message: "Login failed. Please try again." });
    }
};

exports.googleAuth = async (req, res) => {
    try {
        if (!googleClient) {
            return res.status(503).json({ message: "Google sign-in is not configured on this server." });
        }

        const { idToken, role } = req.body;
        if (!idToken) {
            return res.status(400).json({ message: "idToken is required" });
        }

        const ticket = await googleClient.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();

        if (!payload?.email_verified) {
            return res.status(401).json({ message: "Your Google email is not verified." });
        }

        const { user, created } = await findOrCreateGoogleUser({
            googleId: payload.sub,
            email: payload.email,
            name: payload.name,
            role,
        });

        if (user.isActive === false) {
            return res.status(403).json({ message: "This account has been deactivated. Please contact support." });
        }

        sendAuthResponse(res, user, created ? 201 : 200);
    } catch (err) {
        if (err.code === "ROLE_REQUIRED") {
            return res.status(422).json({
                message: "No account found for this Google login. Choose Parent or Tutor on the sign-up page to create one.",
                code: "ROLE_REQUIRED",
            });
        }
        console.error("Google Auth Error:", err);
        res.status(401).json({ message: "Google sign-in failed. Please try again." });
    }
};

exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password -resetPasswordToken -resetPasswordExpire");
        if (!user) return res.status(404).json({ message: "User not found" });
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch profile" });
    }
};

// An allowlist, not a denylist: a denylist silently grants write access to
// every field added to the schema later. `rating` and `reviewsCount` were
// missing from the old denylist, which let any tutor set their own rating and —
// since /public/tutors sorts by rating — pin themselves to the top of the
// marketplace. Credentials, points, role and verification state are all owned
// by other flows and are absent here by design.
const SELF_EDITABLE_PROFILE_FIELDS = [
    "name",
    "phone",
    "subjects",
    "tagline",
    "location",
    "pincode",
    "experience",
    "mode",
    "hourlyRate",
];

exports.updateProfile = async (req, res) => {
    try {
        const updateData = {};
        for (const field of SELF_EDITABLE_PROFILE_FIELDS) {
            if (req.body[field] !== undefined) updateData[field] = req.body[field];
        }

        const existingUser = await User.findById(req.user.id).select("phone");
        if (!existingUser) return res.status(404).json({ message: "User not found" });

        // Clean subjects if provided
        if (updateData.subjects) {
            updateData.subjects = Array.isArray(updateData.subjects)
                ? updateData.subjects.map(s => s.trim()).filter(Boolean)
                : updateData.subjects.split(",").map(s => s.trim()).filter(Boolean);
        }

        if (updateData.phone !== undefined) {
            updateData.phone = String(updateData.phone || "").trim();
            if (updateData.phone !== (existingUser.phone || "")) {
                updateData.phoneVerified = false;
                updateData.isVerified = false;
            }
        }

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $set: updateData },
            { new: true, runValidators: true }
        ).select("-password -resetPasswordToken -resetPasswordExpire");

        if (!user) return res.status(404).json({ message: "User not found" });
        res.json(user);
    } catch (err) {
        if (err.name === "ValidationError") {
            return res.status(400).json({ message: err.message });
        }
        logger.error({ err: err }, "Profile Update Error");
        res.status(500).json({ message: "Profile update failed" });
    }
};

exports.requestVerificationOtp = async (req, res) => {
    try {
        const { channel } = req.body;
        if (!["email", "phone"].includes(channel)) {
            return res.status(400).json({ message: "channel must be email or phone" });
        }

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        if (channel === "phone" && !user.phone) {
            return res.status(400).json({ message: "Add a phone number before phone verification" });
        }

        const otp = createOtp();
        const expires = new Date(Date.now() + 10 * 60 * 1000);

        if (channel === "email") {
            user.emailOtpHash = hashOtp(otp);
            user.emailOtpExpire = expires;
        } else {
            user.phoneOtpHash = hashOtp(otp);
            user.phoneOtpExpire = expires;
        }
        await user.save();

        if (channel === "email") {
            const html = `
            <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px;">
                <h2 style="color:#2563eb;">ApnaTutors verification</h2>
                <p>Hi ${user.name}, use this OTP to verify your email:</p>
                <div style="font-size:28px; font-weight:700; letter-spacing:6px; padding:16px; background:#f1f5f9; text-align:center;">${otp}</div>
                <p style="color:#64748b;">This code expires in 10 minutes.</p>
            </div>`;
            try {
                await sendEmail({ email: user.email, subject: "Verify your ApnaTutors email", html });
            } catch (emailErr) {
                logger.error({ err: emailErr }, "Verification Email Error");
                if (process.env.NODE_ENV === "production") {
                    return res.status(500).json({ message: "Could not send OTP email. Please try again later." });
                }
            }
        } else {
            logger.info(`[DEV PHONE OTP] ${user.phone}: ${otp}`);
        }

        const response = { message: `Verification code sent to your ${channel}.` };
        if (process.env.NODE_ENV !== "production") response.devOtp = otp;
        res.json(response);
    } catch (err) {
        logger.error({ err: err }, "RequestVerificationOtp Error");
        res.status(500).json({ message: "Could not send verification code" });
    }
};

exports.verifyOtp = async (req, res) => {
    try {
        const { channel, otp } = req.body;
        if (!["email", "phone"].includes(channel) || !otp) {
            return res.status(400).json({ message: "channel and otp are required" });
        }

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        const hashField = channel === "email" ? "emailOtpHash" : "phoneOtpHash";
        const expireField = channel === "email" ? "emailOtpExpire" : "phoneOtpExpire";
        const verifiedField = channel === "email" ? "emailVerified" : "phoneVerified";

        if (!user[hashField] || !user[expireField] || user[expireField] < new Date()) {
            return res.status(400).json({ message: "Verification code expired. Request a new one." });
        }
        if (user[hashField] !== hashOtp(String(otp).trim())) {
            return res.status(400).json({ message: "Invalid verification code" });
        }

        user[verifiedField] = true;
        user[hashField] = undefined;
        user[expireField] = undefined;
        user.isVerified = !!(user.emailVerified && (user.phoneVerified || !user.phone));
        await user.save();

        res.json({ message: `${channel} verified successfully`, user: sanitizeUser(user) });
    } catch (err) {
        logger.error({ err: err }, "VerifyOtp Error");
        res.status(500).json({ message: "Verification failed" });
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: "Email is required" });

        const user = await User.findOne({ email: email.toLowerCase().trim() });
        // Always return success to prevent email enumeration attacks
        if (!user) {
            return res.status(200).json({ message: "If this email is registered, a reset link has been sent." });
        }

        const resetToken = crypto.randomBytes(32).toString("hex");
        user.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
        user.resetPasswordExpire = Date.now() + 60 * 60 * 1000; // 1 hour
        await user.save();

        const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:4200"}/reset-password/${resetToken}`;

        const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <div style="text-align: center; margin-bottom: 24px;">
                <h2 style="color: #2563eb; margin: 0;">ApnaTutors</h2>
                <p style="color: #64748b; font-size: 14px;">Password Reset Request</p>
            </div>
            <p style="color: #334155;">Hi ${user.name},</p>
            <p style="color: #334155;">We received a request to reset your password. Click the button below to create a new password. This link is valid for <strong>1 hour</strong>.</p>
            <div style="text-align: center; margin: 32px 0;">
                <a href="${resetUrl}" style="background: linear-gradient(135deg, #2563eb, #7c3aed); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">
                    Reset Password
                </a>
            </div>
            <p style="color: #64748b; font-size: 14px;">If you didn't request this, you can safely ignore this email. Your password will remain unchanged.</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
            <p style="color: #94a3b8; font-size: 12px; text-align: center;">ApnaTutors — Your Trusted Tuition Partner</p>
        </div>`;

        try {
            await sendEmail({ email: user.email, subject: "Reset Your ApnaTutors Password", html });
            res.status(200).json({ message: "If this email is registered, a reset link has been sent." });
        } catch (emailErr) {
            logger.error({ err: emailErr }, "Email Error");
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;
            await user.save();
            res.status(500).json({ message: "Could not send reset email. Please try again later." });
        }
    } catch (err) {
        logger.error({ err: err }, "ForgotPassword Error");
        res.status(500).json({ message: "Request failed. Please try again." });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { password } = req.body;
        if (!password || password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters" });
        }

        const resetPasswordToken = crypto
            .createHash("sha256")
            .update(req.params.resetToken)
            .digest("hex");

        const user = await User.findOne({
            resetPasswordToken,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: "Invalid or expired reset link. Please request a new one." });
        }

        user.password = await bcrypt.hash(password, 10);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();

        res.status(200).json({ message: "Password updated successfully. Please login." });
    } catch (err) {
        logger.error({ err: err }, "ResetPassword Error");
        res.status(500).json({ message: "Password reset failed. Please try again." });
    }
};
