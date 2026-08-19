const mongoose = require("mongoose");
const User = require("../models/user.model.cjs");
const TuitionLead = require("../models/TutionLead.model.cjs");
const LeadUnlock = require("../models/LeadUnlock.model.cjs");
const Transaction = require("../models/Transaction.model.cjs");
const Coupon = require("../models/Coupon.model.cjs");

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// Escapes regex special characters so free-text search can't break/hijack the query
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parsePagination = (req) => {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    return { page, limit, skip: (page - 1) * limit };
};

// ---------- Users ----------

exports.listUsers = async (req, res) => {
    try {
        const { role, search, isActive } = req.query;
        const { page, limit, skip } = parsePagination(req);

        const query = {};
        if (role && ["PARENT", "TUTOR", "ADMIN"].includes(role)) query.role = role;
        if (isActive === "true") query.isActive = true;
        if (isActive === "false") query.isActive = false;
        if (search) {
            const re = new RegExp(escapeRegex(search.trim()), "i");
            query.$or = [{ name: re }, { email: re }, { phone: re }];
        }

        const [users, total] = await Promise.all([
            User.find(query)
                .select("-password -resetPasswordToken -resetPasswordExpire")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            User.countDocuments(query)
        ]);

        res.json({ users, total, page, pages: Math.ceil(total / limit) || 1 });
    } catch (err) {
        console.error("ListUsers Error:", err);
        res.status(500).json({ message: "Failed to fetch users" });
    }
};

exports.getUserById = async (req, res) => {
    try {
        if (!isValidId(req.params.id)) {
            return res.status(400).json({ message: "Invalid user ID" });
        }
        const user = await User.findById(req.params.id).select("-password -resetPasswordToken -resetPasswordExpire");
        if (!user) return res.status(404).json({ message: "User not found" });
        res.json(user);
    } catch (err) {
        console.error("GetUserById Error:", err);
        res.status(500).json({ message: "Failed to fetch user" });
    }
};

// Toggle a user's active/deactivated status. Deactivated users are blocked at login.
exports.setUserStatus = async (req, res) => {
    try {
        if (!isValidId(req.params.id)) {
            return res.status(400).json({ message: "Invalid user ID" });
        }
        const { isActive } = req.body;
        if (typeof isActive !== "boolean") {
            return res.status(400).json({ message: "isActive (boolean) is required" });
        }
        if (req.params.id === req.user.id) {
            return res.status(400).json({ message: "You cannot deactivate your own account" });
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { $set: { isActive } },
            { new: true }
        ).select("-password -resetPasswordToken -resetPasswordExpire");

        if (!user) return res.status(404).json({ message: "User not found" });
        res.json(user);
    } catch (err) {
        console.error("SetUserStatus Error:", err);
        res.status(500).json({ message: "Failed to update user status" });
    }
};

// ---------- Leads ----------

exports.listLeadsAdmin = async (req, res) => {
    try {
        const { status, search } = req.query;
        const { page, limit, skip } = parsePagination(req);

        const query = {};
        if (status && ["OPEN", "CLOSED"].includes(status)) query.status = status;
        if (search) {
            const re = new RegExp(escapeRegex(search.trim()), "i");
            query.$or = [{ title: re }, { location: re }, { pincode: re }];
        }

        const [leads, total] = await Promise.all([
            TuitionLead.find(query)
                .populate("parentId", "name email phone")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            TuitionLead.countDocuments(query)
        ]);

        const leadIds = leads.map(l => l._id);
        const unlocks = await LeadUnlock.aggregate([
            { $match: { leadId: { $in: leadIds } } },
            { $group: { _id: "$leadId", count: { $sum: 1 } } }
        ]);
        const unlockMap = {};
        unlocks.forEach(u => { unlockMap[u._id.toString()] = u.count; });

        const result = leads.map(l => ({
            ...l.toObject(),
            interestCount: unlockMap[l._id.toString()] || 0
        }));

        res.json({ leads: result, total, page, pages: Math.ceil(total / limit) || 1 });
    } catch (err) {
        console.error("ListLeadsAdmin Error:", err);
        res.status(500).json({ message: "Failed to fetch leads" });
    }
};

// Admin: record the outcome of a manual verification call to the parent
exports.setLeadVerification = async (req, res) => {
    try {
        if (!isValidId(req.params.id)) {
            return res.status(400).json({ message: "Invalid lead ID" });
        }
        const { status, note } = req.body;
        if (!["PENDING", "VERIFIED", "NOT_VERIFIED"].includes(status)) {
            return res.status(400).json({ message: "status must be PENDING, VERIFIED or NOT_VERIFIED" });
        }

        const lead = await TuitionLead.findByIdAndUpdate(
            req.params.id,
            {
                $set: {
                    verificationStatus: status,
                    verificationNote: note ? note.trim() : "",
                    verifiedAt: new Date(),
                    verifiedBy: req.user.id
                }
            },
            { new: true }
        );
        if (!lead) return res.status(404).json({ message: "Lead not found" });
        res.json(lead);
    } catch (err) {
        console.error("SetLeadVerification Error:", err);
        res.status(500).json({ message: "Failed to update verification status" });
    }
};

exports.deleteLeadAdmin = async (req, res) => {
    try {
        if (!isValidId(req.params.id)) {
            return res.status(400).json({ message: "Invalid lead ID" });
        }
        const lead = await TuitionLead.findByIdAndDelete(req.params.id);
        if (!lead) return res.status(404).json({ message: "Lead not found" });
        await LeadUnlock.deleteMany({ leadId: lead._id });
        res.json({ message: "Lead deleted successfully" });
    } catch (err) {
        console.error("DeleteLeadAdmin Error:", err);
        res.status(500).json({ message: "Failed to delete lead" });
    }
};

// ---------- Transactions ----------

exports.listTransactions = async (req, res) => {
    try {
        const { status, type, search } = req.query;
        const { page, limit, skip } = parsePagination(req);

        const query = {};
        if (status && ["PENDING", "SUCCESS", "FAILED"].includes(status)) query.status = status;
        if (type && ["CREDIT", "DEBIT"].includes(type)) query.type = type;

        let userIds = null;
        if (search) {
            const re = new RegExp(escapeRegex(search.trim()), "i");
            userIds = (await User.find({ $or: [{ name: re }, { email: re }] }).select("_id")).map(u => u._id);
            query.userId = { $in: userIds };
        }

        const [transactions, total] = await Promise.all([
            Transaction.find(query)
                .populate("userId", "name email role")
                .populate("planId", "name")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Transaction.countDocuments(query)
        ]);

        res.json({ transactions, total, page, pages: Math.ceil(total / limit) || 1 });
    } catch (err) {
        console.error("ListTransactions Error:", err);
        res.status(500).json({ message: "Failed to fetch transactions" });
    }
};

// ---------- Coupons ----------

exports.listCoupons = async (req, res) => {
    try {
        const coupons = await Coupon.find().sort({ createdAt: -1 });
        res.json(coupons);
    } catch (err) {
        console.error("ListCoupons Error:", err);
        res.status(500).json({ message: "Failed to fetch coupons" });
    }
};

exports.createCoupon = async (req, res) => {
    try {
        const { code, discountPercentage, expiryDate, usageLimit } = req.body;
        if (!code || discountPercentage === undefined) {
            return res.status(400).json({ message: "code and discountPercentage are required" });
        }
        if (discountPercentage < 0 || discountPercentage > 100) {
            return res.status(400).json({ message: "discountPercentage must be between 0 and 100" });
        }

        const coupon = await Coupon.create({
            code: code.trim().toUpperCase(),
            discountPercentage,
            expiryDate: expiryDate || undefined,
            usageLimit: usageLimit || undefined
        });
        res.status(201).json(coupon);
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ message: "A coupon with this code already exists" });
        }
        if (err.name === "ValidationError") {
            return res.status(400).json({ message: err.message });
        }
        console.error("CreateCoupon Error:", err);
        res.status(500).json({ message: "Failed to create coupon" });
    }
};

exports.updateCoupon = async (req, res) => {
    try {
        if (!isValidId(req.params.id)) {
            return res.status(400).json({ message: "Invalid coupon ID" });
        }
        const allowedUpdates = ["discountPercentage", "expiryDate", "isActive", "usageLimit"];
        const updates = {};
        allowedUpdates.forEach(field => {
            if (req.body[field] !== undefined) updates[field] = req.body[field];
        });

        const coupon = await Coupon.findByIdAndUpdate(
            req.params.id,
            { $set: updates },
            { new: true, runValidators: true }
        );
        if (!coupon) return res.status(404).json({ message: "Coupon not found" });
        res.json(coupon);
    } catch (err) {
        if (err.name === "ValidationError") {
            return res.status(400).json({ message: err.message });
        }
        console.error("UpdateCoupon Error:", err);
        res.status(500).json({ message: "Failed to update coupon" });
    }
};
