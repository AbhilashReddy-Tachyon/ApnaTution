const { logger } = require("../utils/logger.cjs");
const User = require("../models/user.model.cjs");
const SubscriptionPlan = require("../models/SubscriptionPlan.model.cjs");
const Transaction = require("../models/Transaction.model.cjs");
const Coupon = require("../models/Coupon.model.cjs");
const LeadUnlock = require("../models/LeadUnlock.model.cjs");
const TuitionLead = require("../models/TutionLead.model.cjs");

// Lazy Seed Plans (for demo purposes)
const seedPlans = async () => {
    const plans = await SubscriptionPlan.find();
    if (plans.length === 0) {
        await SubscriptionPlan.insertMany([
            { name: "Starter Pack", price: 500, points: 10, discountDescription: "Standard Rate" },
            { name: "Growth Pack", price: 2000, points: 50, discountDescription: "Save 20%" },
            { name: "Pro Pack", price: 5000, points: 150, discountDescription: "Save 33% - Best Value" }
        ]);
        logger.info("Plans seeded");
    }
    const coupons = await Coupon.find();
    if (coupons.length === 0) {
        await Coupon.create({ code: "WELCOME10", discountPercentage: 10, usageLimit: 10000 });
        logger.info("Coupons seeded");
    }
};
seedPlans();

exports.getPlans = async (req, res) => {
    try {
        const plans = await SubscriptionPlan.find({ isActive: true });
        res.status(200).json(plans);
    } catch (error) {
        res.status(500).json({ message: "Error fetching plans", error: error.message });
    }
};

exports.validateCoupon = async (req, res) => {
    try {
        const { code } = req.body;
        const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });

        if (!coupon) {
            return res.status(404).json({ message: "Invalid coupon code" });
        }
        if (coupon.expiryDate && coupon.expiryDate < new Date()) {
            return res.status(400).json({ message: "Coupon expired" });
        }
        if (coupon.usedCount >= coupon.usageLimit) {
            return res.status(400).json({ message: "Coupon usage limit reached" });
        }

        res.status(200).json({
            valid: true,
            discountPercentage: coupon.discountPercentage,
            code: coupon.code
        });
    } catch (error) {
        res.status(500).json({ message: "Error validating coupon", error: error.message });
    }
};

// Mock Order Creation - In real life, integrate Razorpay/Stripe here
exports.createOrder = async (req, res) => {
    try {
        const { planId, couponCode } = req.body;
        const userId = req.user.id;

        const plan = await SubscriptionPlan.findById(planId);
        if (!plan) return res.status(404).json({ message: "Plan not found" });

        let finalAmount = plan.price;
        let discount = 0;

        if (couponCode) {
            const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
            if (coupon) {
                // Simplified validation check again just in case
                discount = (plan.price * coupon.discountPercentage) / 100;
                finalAmount = plan.price - discount;
            }
        }

        // Create a PENDING transaction
        const transaction = await Transaction.create({
            userId,
            amount: finalAmount,
            points: plan.points,
            type: "CREDIT",
            description: `Purchase of ${plan.name}`,
            planId: plan._id,
            couponCode: couponCode,
            status: "PENDING",
            paymentId: `MOCK_PAY_${Date.now()}` // Simulation
        });

        res.status(200).json({
            message: "Order created",
            transactionId: transaction._id,
            amount: finalAmount,
            points: plan.points,
            paymentId: transaction.paymentId
        });

    } catch (error) {
        res.status(500).json({ message: "Error creating order", error: error.message });
    }
};

// Mock Payment Success
exports.verifyPayment = async (req, res) => {
    try {
        const { transactionId, paymentId } = req.body; // In real flow, verify signature

        const transaction = await Transaction.findById(transactionId);
        if (!transaction) return res.status(404).json({ message: "Transaction not found" });
        if (transaction.status === "SUCCESS") return res.status(400).json({ message: "Already processed" });

        // Update Transaction
        transaction.status = "SUCCESS";
        await transaction.save();

        // Credit Points to User
        const user = await User.findById(transaction.userId);
        user.points += transaction.points;
        await user.save();

        // Increment Coupon Usage if applicable
        if (transaction.couponCode) {
            await Coupon.updateOne({ code: transaction.couponCode }, { $inc: { usedCount: 1 } });
        }

        res.status(200).json({ message: "Payment successful. Points added!", points: user.points });

    } catch (error) {
        res.status(500).json({ message: "Verify payment failed", error: error.message });
    }
};

exports.unlockLead = async (req, res) => {
    try {
        const { leadId } = req.body; // or params
        const userId = req.user.id; // Tutor

        const user = await User.findById(userId);
        if (user.points < 1) {
            return res.status(403).json({ message: "Insufficient points. Please recharge." });
        }

        const lead = await TuitionLead.findById(leadId);
        if (!lead) return res.status(404).json({ message: "Lead not found" });

        // Check if already unlocked
        const alreadyUnlocked = await LeadUnlock.findOne({ tutorId: userId, leadId: leadId });
        if (alreadyUnlocked) {
            return res.status(200).json({ message: "Lead already unlocked", lead });
        }

        // Deduct Point
        user.points -= 1;
        await user.save();

        // Record Unlock
        await LeadUnlock.create({
            tutorId: userId,
            leadId: leadId,
            price: 1 // Cost in points
        });

        // Record Debit Transaction
        await Transaction.create({
            userId,
            amount: 0,
            points: 1,
            type: "DEBIT",
            description: `Unlocked Lead: ${lead.title}`,
            status: "SUCCESS"
        });

        res.status(200).json({ message: "Lead unlocked successfully!", remainingPoints: user.points });

    } catch (error) {
        res.status(500).json({ message: "Error unlocking lead", error: error.message });
    }
};
