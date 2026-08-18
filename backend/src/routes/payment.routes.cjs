const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth.middleware.cjs");
const role = require("../middleware/role.middleware.cjs");
const {
    createOrder,
    verifyPayment,
    getPlans,
    validateCoupon,
    getMyTransactions
} = require("../controllers/payment.controller.cjs");

router.get("/plans", auth, role("TUTOR"), getPlans);
router.get("/transactions", auth, role("TUTOR"), getMyTransactions);
router.post("/validate-coupon", auth, role("TUTOR"), validateCoupon);
router.post("/create-order", auth, role("TUTOR"), createOrder);
router.post("/verify", auth, role("TUTOR"), verifyPayment);

module.exports = router;
