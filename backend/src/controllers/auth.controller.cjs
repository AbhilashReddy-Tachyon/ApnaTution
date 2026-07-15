const User = require("../models/user.model.cjs");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail.cjs");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

exports.register = async (req, res) => {
    try {
        const { role, name, email, password, phone, subjects, location } = req.body;

        if (!role || !name || !email || !password) {
            return res.status(400).json({ message: "role, name, email and password are required" });
        }
        if (!["PARENT", "TUTOR"].includes(role)) {
            return res.status(400).json({ message: "Role must be PARENT or TUTOR" });
        }
        if (!EMAIL_RE.test(email)) {
            return res.status(400).json({ message: "Invalid email address" });
        }
        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters" });
        }
        if (name.trim().length < 2) {
            return res.status(400).json({ message: "Name must be at least 2 characters" });
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
        };

        if (phone) userData.phone = phone.trim();
        if (location) userData.location = location.trim();
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
        console.error("Registration Error:", err);
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

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const token = jwt.sign(
            { id: user._id, role: user.role, name: user.name },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                points: user.points
            }
        });
    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ message: "Login failed. Please try again." });
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

exports.updateProfile = async (req, res) => {
    try {
        // Prevent changing sensitive fields via this endpoint
        const { role, email, password, points, resetPasswordToken, resetPasswordExpire, ...updateData } = req.body;

        // Clean subjects if provided
        if (updateData.subjects) {
            updateData.subjects = Array.isArray(updateData.subjects)
                ? updateData.subjects.map(s => s.trim()).filter(Boolean)
                : updateData.subjects.split(",").map(s => s.trim()).filter(Boolean);
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
        console.error("Profile Update Error:", err);
        res.status(500).json({ message: "Profile update failed" });
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
            console.error("Email Error:", emailErr);
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;
            await user.save();
            res.status(500).json({ message: "Could not send reset email. Please try again later." });
        }
    } catch (err) {
        console.error("ForgotPassword Error:", err);
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
        console.error("ResetPassword Error:", err);
        res.status(500).json({ message: "Password reset failed. Please try again." });
    }
};
