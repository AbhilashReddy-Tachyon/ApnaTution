const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const { sendOtp, verifyOtp } = require("../controllers/otp.controller.cjs");

// 5 attempts per 15 minutes per IP — OTP endpoints are a prime abuse target
const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many OTP requests. Please try again after 15 minutes." }
});

router.post("/send", otpLimiter, sendOtp);
router.post("/verify", otpLimiter, verifyOtp);

module.exports = router;
