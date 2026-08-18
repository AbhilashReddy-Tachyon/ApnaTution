const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const {
    register,
    login,
    getProfile,
    updateProfile,
    forgotPassword,
    resetPassword,
    requestVerificationOtp,
    verifyOtp
} = require("../controllers/auth.controller.cjs");
const auth = require("../middleware/auth.middleware.cjs");

// 5 attempts per 15 minutes for sensitive auth actions
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many attempts. Please try again after 15 minutes." }
});

// 10 attempts per 15 minutes for registration (slightly more lenient)
const registerLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many registration attempts. Please try again after 15 minutes." }
});

router.post("/register", registerLimiter, register);
router.post("/login", authLimiter, login);
router.get("/profile", auth, getProfile);
router.put("/profile", auth, updateProfile);
router.post("/verification/request", auth, authLimiter, requestVerificationOtp);
router.post("/verification/verify", auth, authLimiter, verifyOtp);
router.post("/forgot-password", authLimiter, forgotPassword);
router.put("/reset-password/:resetToken", resetPassword);

module.exports = router;
