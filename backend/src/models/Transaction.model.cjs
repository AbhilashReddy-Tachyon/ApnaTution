const mongoose = require("mongoose");

const TransactionSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        amount: {
            type: Number,
            required: true
        },
        type: {
            type: String,
            enum: ["CREDIT", "DEBIT"], // CREDIT = Bought points, DEBIT = Used points
            required: true
        },
        points: {
            type: Number,
            required: true
        },
        description: {
            type: String
        },
        planId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "SubscriptionPlan"
        },
        couponCode: {
            type: String
        },
        status: {
            type: String,
            enum: ["PENDING", "PROCESSING", "SUCCESS", "FAILED"],
            default: "PENDING"
        },
        paymentId: {
            type: String // For Gateway Order ID
        },
        gatewayPaymentId: {
            type: String
        },
        processedAt: {
            type: Date
        }
    },
    { timestamps: true }
);

TransactionSchema.index({ userId: 1, createdAt: -1 });
TransactionSchema.index({ paymentId: 1 }, { sparse: true });
TransactionSchema.index({ gatewayPaymentId: 1 }, { sparse: true });

module.exports = mongoose.model("Transaction", TransactionSchema);
