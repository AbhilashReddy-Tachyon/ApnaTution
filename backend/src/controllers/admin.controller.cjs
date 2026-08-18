const mongoose = require("mongoose");
const LeadReport = require("../models/LeadReport.model.cjs");
const User = require("../models/user.model.cjs");
const Transaction = require("../models/Transaction.model.cjs");

exports.getLeadReports = async (req, res) => {
    try {
        const { status } = req.query;
        const filter = {};
        if (status) filter.status = String(status).toUpperCase();

        const reports = await LeadReport.find(filter)
            .populate("leadId", "title classLevel subjects location status")
            .populate("tutorId", "name email phone points")
            .populate("resolvedBy", "name email")
            .sort({ createdAt: -1 })
            .limit(100);

        res.json(reports);
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch lead reports", error: err.message });
    }
};

exports.resolveLeadReport = async (req, res) => {
    const session = await mongoose.startSession();
    try {
        const { action, adminNote } = req.body;
        if (!["APPROVE_REFUND", "REJECT"].includes(action)) {
            return res.status(400).json({ message: "action must be APPROVE_REFUND or REJECT" });
        }

        let resolvedReport = null;
        await session.withTransaction(async () => {
            const report = await LeadReport.findOne({
                _id: req.params.id,
                status: "PENDING"
            }).session(session);
            if (!report) {
                const error = new Error("REPORT_NOT_FOUND");
                error.statusCode = 404;
                throw error;
            }

            report.status = action === "APPROVE_REFUND" ? "APPROVED" : "REJECTED";
            report.adminNote = adminNote ? String(adminNote).trim() : undefined;
            report.resolvedAt = new Date();
            report.resolvedBy = req.user.id;

            if (action === "APPROVE_REFUND") {
                report.refundedPoints = 1;
                await User.updateOne(
                    { _id: report.tutorId },
                    { $inc: { points: 1 } },
                    { session }
                );
                await Transaction.create([{
                    userId: report.tutorId,
                    amount: 0,
                    points: 1,
                    type: "CREDIT",
                    description: "Refund for approved lead report",
                    status: "SUCCESS",
                    processedAt: new Date()
                }], { session });
            }

            resolvedReport = await report.save({ session });
        });

        res.json({
            message: action === "APPROVE_REFUND" ? "Report approved and 1 point refunded." : "Report rejected.",
            report: resolvedReport
        });
    } catch (err) {
        if (err.statusCode === 404) {
            return res.status(404).json({ message: "Pending report not found" });
        }
        if (/Transaction numbers are only allowed|replica set member|transactions are not supported/i.test(err?.message || "")) {
            return res.status(500).json({ message: "Refund review requires MongoDB transactions. Use a replica set in production." });
        }
        res.status(500).json({ message: "Failed to resolve report", error: err.message });
    } finally {
        session.endSession();
    }
};
