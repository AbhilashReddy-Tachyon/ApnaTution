const mongoose = require("mongoose");

const TuitionLeadSchema = new mongoose.Schema(
    {
        parentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        title: {
            type: String,
            required: true
        },
        subjects: {
            type: [String],
            required: true
        },
        classLevel: {
            type: String,
            required: true
        },
        mode: {
            type: String,
            enum: ["ONLINE", "HOME", "BOTH"],
            required: true
        },
        location: {
            type: String
        },
        pincode: {
            type: String,
            match: /^\d{6}$/
        },
        budgetRange: {
            type: String
        },
        description: {
            type: String
        },
        status: {
            type: String,
            enum: ["OPEN", "CLOSED"],
            default: "OPEN"
        },
        // Set by an admin after manually calling the parent to confirm the requirement is real
        verificationStatus: {
            type: String,
            enum: ["PENDING", "VERIFIED", "NOT_VERIFIED"],
            default: "PENDING"
        },
        verificationNote: {
            type: String
        },
        verifiedAt: {
            type: Date
        },
        verifiedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("TuitionLead", TuitionLeadSchema);
