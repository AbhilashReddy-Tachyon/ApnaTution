const bcrypt = require("bcryptjs");
const crypto = require("node:crypto");
const Razorpay = require("razorpay");
const { config } = require("../config/env.cjs");
const { logger } = require("../utils/logger.cjs");
const User = require("../models/user.model.cjs");
const SubscriptionPlan = require("../models/SubscriptionPlan.model.cjs");
const Transaction = require("../models/Transaction.model.cjs");
const Coupon = require("../models/Coupon.model.cjs");

const hasRazorpayConfig = () => !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
const hasWebhookConfig = () => !!process.env.RAZORPAY_WEBHOOK_SECRET;

const getRazorpayClient = () => new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

const isSameSignature = (left, right) => {
    if (!left || !right) return false;
    const leftBuffer = Buffer.from(String(left), "hex");
    const rightBuffer = Buffer.from(String(right), "hex");
    return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const paymentSignatureFor = (orderId, paymentId) => crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

const webhookSignatureFor = (rawBody) => crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");

const finalizeCreditTransaction = async ({ transaction, transactionId, orderId, paymentId }) => {
    const query = transaction
        ? { _id: transaction._id, userId: transaction.userId, status: "PENDING" }
        : { _id: transactionId, paymentId: orderId, status: "PENDING" };

    const claimed = await Transaction.findOneAndUpdate(
        query,
        {
            $set: {
                status: "PROCESSING",
                gatewayPaymentId: paymentId || undefined
            }
        },
        { new: true }
    );

    if (!claimed) {
        const existing = transaction || await Transaction.findById(transactionId);
        if (!existing) return { status: 404, body: { message: "Transaction not found" } };
        if (existing.status === "SUCCESS") {
            const user = await User.findById(existing.userId).select("points name");
            return {
                status: 200,
                body: { message: "Already processed", points: user?.points || 0 }
            };
        }
        return {
            status: 409,
            body: { message: "Payment is already being processed. Please refresh in a moment." }
        };
    }

    try {
        const user = await User.findByIdAndUpdate(
            claimed.userId,
            { $inc: { points: claimed.points } },
            { new: true }
        ).select("points name");

        if (!user) {
            await Transaction.updateOne(
                { _id: claimed._id, status: "PROCESSING" },
                { $set: { status: "FAILED" } }
            );
            return { status: 404, body: { message: "User not found for transaction" } };
        }

        await Transaction.updateOne(
            { _id: claimed._id, status: "PROCESSING" },
            {
                $set: {
                    status: "SUCCESS",
                    gatewayPaymentId: paymentId || claimed.gatewayPaymentId,
                    processedAt: new Date()
                }
            }
        );

        if (claimed.couponCode) {
            await Coupon.updateOne(
                { code: claimed.couponCode },
                { $inc: { usedCount: 1 } }
            );
        }

        return {
            status: 200,
            body: {
                message: `Payment successful! ${claimed.points} points added.`,
                points: user.points
            }
        };
    } catch (err) {
        logger.error({ err, transactionId: claimed._id.toString() }, "failed to finalize payment");
        throw err;
    }
};

// Run once at startup to seed demo data
exports.seedPlans = async () => {
    try {
        // Seed Plans
        const planCount = await SubscriptionPlan.countDocuments();
        if (planCount === 0) {
            await SubscriptionPlan.insertMany([
                { name: "Starter Pack",  price: 500,  points: 10,  discountDescription: "Standard Rate (₹50/lead)" },
                { name: "Growth Pack",   price: 2000, points: 50,  discountDescription: "Save 20% (₹40/lead)" },
                { name: "Pro Pack",      price: 5000, points: 150, discountDescription: "Save 33% (₹33/lead)" }
            ]);
            logger.info("Seeded: subscription plans");
        }

        // Seed Coupons
        const couponCount = await Coupon.countDocuments();
        if (couponCount === 0) {
            await Coupon.create({
                code: "WELCOME10",
                discountPercentage: 10,
                usageLimit: 10000,
                expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
            });
            logger.info("Seeded: coupons");
        }

        // Demo accounts share one published password ("Demo@1234", documented in
        // the frontend README) and ship with spendable points. Seeding them into
        // a production database hands anyone a working authenticated account, so
        // everything below this line is development-only.
        if (config.isProduction) return;

        // Seed Demo Tutors (with hashed passwords)
        const tutorCount = await User.countDocuments({ role: "TUTOR" });
        if (tutorCount === 0) {
            const hashedPwd = await bcrypt.hash("Demo@1234", 10);
            await User.insertMany([
                {
                    name: "Rajesh Kumar",
                    email: "rajesh.tutor@demo.com",
                    password: hashedPwd,
                    role: "TUTOR",
                    phone: "9876543210",
                    subjects: ["Mathematics", "Physics"],
                    location: "Mumbai",
                    experience: "5 Years",
                    mode: "BOTH",
                    hourlyRate: "₹500/hr",
                    tagline: "Expert Math & Physics Tutor with 5+ years",
                    rating: 4.8,
                    reviewsCount: 32,
                    points: 10
                },
                {
                    name: "Priya Sharma",
                    email: "priya.tutor@demo.com",
                    password: hashedPwd,
                    role: "TUTOR",
                    phone: "9876543211",
                    subjects: ["English", "Hindi", "Social Studies"],
                    location: "Delhi",
                    experience: "3 Years",
                    mode: "HOME",
                    hourlyRate: "₹400/hr",
                    tagline: "Passionate Language & Humanities Educator",
                    rating: 4.6,
                    reviewsCount: 18,
                    points: 5
                },
                {
                    name: "Amit Verma",
                    email: "amit.tutor@demo.com",
                    password: hashedPwd,
                    role: "TUTOR",
                    phone: "9876543212",
                    subjects: ["Chemistry", "Biology", "Science"],
                    location: "Hyderabad",
                    experience: "7 Years",
                    mode: "ONLINE",
                    hourlyRate: "₹600/hr",
                    tagline: "IIT Alumni | Science specialist for CBSE & ICSE",
                    rating: 4.9,
                    reviewsCount: 56,
                    points: 20
                }
            ]);
            logger.info("Seeded: demo tutors");
        }

        // Seed Demo Parent + Leads
        const TuitionLead = require("../models/TutionLead.model.cjs");
        const leadCount = await TuitionLead.countDocuments();
        if (leadCount === 0) {
            let parent = await User.findOne({ role: "PARENT" });
            if (!parent) {
                const hashedPwd = await bcrypt.hash("Demo@1234", 10);
                parent = await User.create({
                    name: "Suresh Mehta",
                    email: "parent@demo.com",
                    password: hashedPwd,
                    role: "PARENT",
                    phone: "9123456789",
                    location: "Mumbai"
                });
            }
            await TuitionLead.insertMany([
                {
                    parentId: parent._id,
                    title: "Maths Tutor Needed for Class 10 CBSE",
                    subjects: ["Mathematics"],
                    classLevel: "Class 10",
                    mode: "HOME",
                    location: "Andheri West, Mumbai",
                    budgetRange: "₹5000-8000/month",
                    description: "Looking for an experienced maths tutor for my son in Class 10 CBSE. Need help with Algebra, Geometry and Trigonometry. Timing: 5 PM - 7 PM on weekdays."
                },
                {
                    parentId: parent._id,
                    title: "English Grammar for Beginner (Class 5)",
                    subjects: ["English"],
                    classLevel: "Class 5",
                    mode: "ONLINE",
                    location: "Delhi",
                    budgetRange: "₹3000/month",
                    description: "My daughter needs help with English grammar and writing skills. She is in Class 5. Prefer female tutor. Sessions twice a week."
                },
                {
                    parentId: parent._id,
                    title: "Physics & Chemistry for Class 12 IIT JEE",
                    subjects: ["Physics", "Chemistry"],
                    classLevel: "Class 12",
                    mode: "BOTH",
                    location: "Hyderabad",
                    budgetRange: "₹10000-15000/month",
                    description: "Need a dedicated tutor for IIT JEE preparation. My son is in Class 12. Looking for someone who can teach both Physics and Chemistry systematically."
                }
            ]);
            logger.info("Seeded: demo leads");
        }
    } catch (err) {
        logger.error({ err: err.message }, "Seeding error");
        // Don't throw - seeding failures shouldn't crash the server
    }
};


exports.getPlans = async (req, res) => {
    try {
        const plans = await SubscriptionPlan.find({ isActive: true }).sort({ price: 1 });
        res.status(200).json(plans);
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch plans", error: err.message });
    }
};

exports.validateCoupon = async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) return res.status(400).json({ message: "Coupon code required" });

        const coupon = await Coupon.findOne({
            code: code.trim().toUpperCase(),
            isActive: true
        });

        if (!coupon) return res.status(404).json({ message: "Invalid coupon code" });
        if (coupon.expiryDate && coupon.expiryDate < new Date()) {
            return res.status(400).json({ message: "Coupon has expired" });
        }
        if (coupon.usedCount >= coupon.usageLimit) {
            return res.status(400).json({ message: "Coupon usage limit reached" });
        }

        res.status(200).json({
            valid: true,
            discountPercentage: coupon.discountPercentage,
            code: coupon.code
        });
    } catch (err) {
        res.status(500).json({ message: "Coupon validation failed", error: err.message });
    }
};

exports.createOrder = async (req, res) => {
    try {
        const { planId, couponCode } = req.body;
        const userId = req.user.id;

        if (!planId) return res.status(400).json({ message: "Plan ID is required" });

        const plan = await SubscriptionPlan.findById(planId);
        if (!plan || !plan.isActive) {
            return res.status(404).json({ message: "Plan not found or inactive" });
        }

        let finalAmount = plan.price;
        let appliedCoupon = null;

        if (couponCode) {
            const coupon = await Coupon.findOne({
                code: couponCode.trim().toUpperCase(),
                isActive: true
            });
            if (coupon && coupon.usedCount < coupon.usageLimit &&
                (!coupon.expiryDate || coupon.expiryDate > new Date())) {
                const discount = Math.round((plan.price * coupon.discountPercentage) / 100);
                finalAmount = plan.price - discount;
                appliedCoupon = coupon.code;
            }
        }

        let gatewayOrder = null;
        if (hasRazorpayConfig()) {
            const amountInPaise = Math.round(finalAmount * 100);
            if (amountInPaise < 100) {
                return res.status(400).json({ message: "Minimum order amount is 100 paise" });
            }

            gatewayOrder = await getRazorpayClient().orders.create({
                amount: amountInPaise,
                currency: "INR",
                receipt: `txn_${Date.now()}`,
                notes: {
                    userId: String(userId),
                    planId: String(plan._id),
                    points: String(plan.points)
                }
            });
        } else if (process.env.NODE_ENV === "production") {
            return res.status(503).json({ message: "Payment gateway is not configured." });
        }

        const transaction = await Transaction.create({
            userId,
            amount: finalAmount,
            points: plan.points,
            type: "CREDIT",
            description: `Purchase: ${plan.name}`,
            planId: plan._id,
            couponCode: appliedCoupon,
            status: "PENDING",
            paymentId: gatewayOrder?.id || `DEV_ORDER_${Date.now()}`
        });

        res.status(200).json({
            transactionId: transaction._id,
            amount: finalAmount,
            amount_paise: Math.round(finalAmount * 100),
            points: plan.points,
            planName: plan.name,
            paymentId: transaction.paymentId,
            order_id: transaction.paymentId,
            currency: "INR",
            key: process.env.RAZORPAY_KEY_ID || null
        });
    } catch (err) {
        logger.error({ err: err?.error || err }, "Create Order Error");
        res.status(500).json({ message: "Order creation failed", error: err.message });
    }
};

exports.verifyPayment = async (req, res) => {
    try {
        const {
            transactionId,
            razorpay_payment_id,
            razorpay_order_id,
            razorpay_signature,
            payment_id,
            order_id
        } = req.body;
        const paymentId = razorpay_payment_id || payment_id;
        const orderId = razorpay_order_id || order_id;

        if (!transactionId) return res.status(400).json({ message: "Transaction ID required" });

        const transaction = await Transaction.findById(transactionId);
        if (!transaction) return res.status(404).json({ message: "Transaction not found" });
        if (transaction.userId.toString() !== req.user.id) {
            return res.status(403).json({ message: "Unauthorized transaction" });
        }
        if (transaction.status === "SUCCESS") {
            const user = await User.findById(transaction.userId).select("points name");
            return res.status(200).json({ message: "Already processed", points: user?.points || 0 });
        }

        if (hasRazorpayConfig()) {
            if (!paymentId || !orderId || !razorpay_signature) {
                return res.status(400).json({ message: "Payment verification details are required" });
            }
            if (orderId !== transaction.paymentId) {
                return res.status(400).json({ message: "Payment order mismatch" });
            }

            const expectedSignature = paymentSignatureFor(orderId, paymentId);

            if (!isSameSignature(expectedSignature, razorpay_signature)) {
                await Transaction.updateOne(
                    { _id: transaction._id, status: "PENDING" },
                    { $set: { status: "FAILED" } }
                );
                return res.status(400).json({ message: "Payment verification failed" });
            }
        } else if (process.env.NODE_ENV === "production") {
            return res.status(503).json({ message: "Payment gateway is not configured." });
        }

        const result = await finalizeCreditTransaction({ transaction, orderId, paymentId });
        res.status(result.status).json(result.body);
    } catch (err) {
        res.status(500).json({ message: "Payment verification failed", error: err.message });
    }
};

exports.handleRazorpayWebhook = async (req, res) => {
    try {
        if (!hasWebhookConfig()) {
            return res.status(503).json({ message: "Razorpay webhook secret is not configured" });
        }

        const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body || {}));
        const signature = req.get("x-razorpay-signature");
        const expectedSignature = webhookSignatureFor(rawBody);

        if (!isSameSignature(expectedSignature, signature)) {
            return res.status(400).json({ message: "Invalid webhook signature" });
        }

        const event = JSON.parse(rawBody.toString("utf8"));
        if (event.event !== "payment.captured" && event.event !== "order.paid") {
            return res.status(200).json({ received: true, ignored: event.event });
        }

        const payment = event.payload?.payment?.entity;
        const order = event.payload?.order?.entity;
        const orderId = payment?.order_id || order?.id;
        const paymentId = payment?.id;

        if (!orderId) {
            return res.status(400).json({ message: "Webhook missing Razorpay order id" });
        }

        const transaction = await Transaction.findOne({ paymentId: orderId, type: "CREDIT" });
        if (!transaction) {
            return res.status(404).json({ message: "No matching transaction for webhook order" });
        }

        const result = await finalizeCreditTransaction({ transaction, orderId, paymentId });
        res.status(result.status).json({ received: result.status === 200, ...result.body });
    } catch (err) {
        logger.error({ err: err }, "Razorpay Webhook Error");
        res.status(500).json({ message: "Webhook processing failed" });
    }
};

exports.getMyTransactions = async (req, res) => {
    try {
        const transactions = await Transaction.find({ userId: req.user.id })
            .populate("planId", "name points")
            .sort({ createdAt: -1 })
            .limit(50);
        res.json(transactions);
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch transactions", error: err.message });
    }
};

exports.getAdminTransactions = async (req, res) => {
    try {
        const { status, type } = req.query;
        const filter = {};
        if (status) filter.status = String(status).toUpperCase();
        if (type) filter.type = String(type).toUpperCase();

        const transactions = await Transaction.find(filter)
            .populate("userId", "name email role phone points")
            .populate("planId", "name points")
            .sort({ createdAt: -1 })
            .limit(100);

        res.json(transactions);
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch transactions", error: err.message });
    }
};

exports.adminRetryPendingCredit = async (req, res) => {
    try {
        const transaction = await Transaction.findOne({
            _id: req.params.id,
            type: "CREDIT",
            status: "PENDING"
        });
        if (!transaction) {
            return res.status(404).json({ message: "Pending credit transaction not found" });
        }

        const result = await finalizeCreditTransaction({
            transaction,
            orderId: transaction.paymentId,
            paymentId: transaction.gatewayPaymentId || `ADMIN_${Date.now()}`
        });
        res.status(result.status).json(result.body);
    } catch (err) {
        res.status(500).json({ message: "Could not retry transaction", error: err.message });
    }
};

exports.adminMarkProcessingResolved = async (req, res) => {
    try {
        const transaction = await Transaction.findOneAndUpdate(
            { _id: req.params.id, type: "CREDIT", status: "PROCESSING" },
            { $set: { status: "SUCCESS", processedAt: new Date() } },
            { new: true }
        );
        if (!transaction) {
            return res.status(404).json({ message: "Processing credit transaction not found" });
        }

        res.json({
            message: "Transaction marked successful. Confirm in Razorpay before using this action.",
            transaction
        });
    } catch (err) {
        res.status(500).json({ message: "Could not resolve transaction", error: err.message });
    }
};
