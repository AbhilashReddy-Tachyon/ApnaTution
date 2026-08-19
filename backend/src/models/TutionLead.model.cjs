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
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("TuitionLead", TuitionLeadSchema);
