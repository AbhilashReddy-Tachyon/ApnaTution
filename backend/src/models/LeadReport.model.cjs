const mongoose = require("mongoose");

const LeadReportSchema = new mongoose.Schema(
    {
        leadId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "TuitionLead",
            required: true
        },
        tutorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        reason: {
            type: String,
            enum: ["NO_RESPONSE", "WRONG_CONTACT", "DUPLICATE", "ALREADY_FILLED", "OTHER"],
            required: true
        },
        details: {
            type: String,
            trim: true,
            maxlength: 1000
        },
        status: {
            type: String,
            enum: ["PENDING", "APPROVED", "REJECTED"],
            default: "PENDING"
        },
        adminNote: {
            type: String,
            trim: true,
            maxlength: 1000
        },
        refundedPoints: {
            type: Number,
            default: 0
        },
        resolvedAt: Date,
        resolvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    },
    { timestamps: true }
);

LeadReportSchema.index({ leadId: 1, tutorId: 1 }, { unique: true });
LeadReportSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("LeadReport", LeadReportSchema);
