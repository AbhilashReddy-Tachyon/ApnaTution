const mongoose = require("mongoose");
const TuitionLead = require("../models/TutionLead.model.cjs");
const LeadUnlock = require("../models/LeadUnlock.model.cjs");
const KPIEvent = require("../models/KPIEvent.model.cjs");
const User = require("../models/user.model.cjs");
const Transaction = require("../models/Transaction.model.cjs");
const { resolvePincode, PINCODE_RE, buildProximityOr, rankByProximity } = require("../utils/pincode.cjs");

// Validate MongoDB ObjectId
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const OPEN_LEAD_CAP = 5;

// Parent: create a new lead
exports.createLead = async (req, res) => {
    try {
        const { title, subjects, classLevel, mode, location, pincode, budgetRange, description } = req.body;

        if (!title || !subjects || !classLevel || !mode) {
            return res.status(400).json({ message: "title, subjects, classLevel and mode are required" });
        }
        if (!Array.isArray(subjects) || subjects.length === 0) {
            return res.status(400).json({ message: "subjects must be a non-empty array" });
        }
        if (pincode && !PINCODE_RE.test(pincode.trim())) {
            return res.status(400).json({ message: "Pincode must be a 6-digit number" });
        }

        // Spam protection: cap open leads per parent
        const openCount = await TuitionLead.countDocuments({ parentId: req.user.id, status: "OPEN" });
        if (openCount >= OPEN_LEAD_CAP) {
            return res.status(429).json({
                message: `You already have ${OPEN_LEAD_CAP} open leads. Please close some before creating new ones.`
            });
        }

        const lead = await TuitionLead.create({
            parentId: req.user.id,
            title: title.trim(),
            subjects: subjects.map(s => s.trim()).filter(Boolean),
            classLevel: classLevel.trim(),
            mode,
            location: location ? location.trim() : undefined,
            pincode: pincode ? pincode.trim() : undefined,
            budgetRange: budgetRange ? budgetRange.trim() : undefined,
            description: description ? description.trim() : undefined
        });

        res.status(201).json(lead);
    } catch (err) {
        if (err.name === "ValidationError") {
            return res.status(400).json({ message: err.message });
        }
        console.error("Create Lead Error:", err);
        res.status(500).json({ message: "Failed to create lead" });
    }
};

// Parent: list their own leads
exports.getMyLeads = async (req, res) => {
    try {
        const leads = await TuitionLead.find({ parentId: req.user.id })
            .sort({ createdAt: -1 });

        // Include interest count (how many tutors unlocked each lead)
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

        res.json(result);
    } catch (err) {
        console.error("GetMyLeads Error:", err);
        res.status(500).json({ message: "Failed to fetch leads" });
    }
};

// Tutor: list all OPEN leads (with unlock status + parent contact for unlocked),
// optionally scoped to a pincode's area (exact pincode, then same postal
// prefix, then a text match on the resolved area/district name).
exports.getLeadsForTutor = async (req, res) => {
    try {
        const { pincode } = req.query;
        let area = null;
        const query = { status: "OPEN" };

        if (pincode) {
            if (!PINCODE_RE.test(pincode)) {
                return res.status(400).json({ message: "Pincode must be a 6-digit number" });
            }
            const resolved = await resolvePincode(pincode);
            area = resolved ? { name: resolved.area, district: resolved.district, state: resolved.state } : null;
            query.$or = buildProximityOr(pincode, resolved);
        }

        const leads = await TuitionLead.find(query)
            .populate("parentId", "name phone email location")
            .sort({ createdAt: -1 });

        const unlockedRecords = await LeadUnlock.find({ tutorId: req.user.id }).select("leadId");
        const unlockedIds = new Set(unlockedRecords.map(u => u.leadId.toString()));

        const result = leads.map(lead => {
            const obj = lead.toObject();
            const unlocked = unlockedIds.has(lead._id.toString());

            // Only expose parent contact details if this tutor has unlocked the lead
            const parentContact = unlocked && lead.parentId ? {
                name: lead.parentId.name,
                phone: lead.parentId.phone || "Not provided",
                email: lead.parentId.email
            } : null;

            // Don't expose parentId object to locked leads
            delete obj.parentId;

            return {
                ...obj,
                isUnlocked: unlocked,
                parentContact
            };
        });

        // KPI tracking (non-blocking)
        KPIEvent.create({
            userId: req.user.id,
            eventType: "LEAD_VIEW",
            metadata: { count: leads.length }
        }).catch(() => {});

        res.json({
            leads: pincode ? rankByProximity(result, pincode) : result,
            area
        });
    } catch (err) {
        console.error("GetLeadsForTutor Error:", err);
        res.status(500).json({ message: "Failed to fetch leads" });
    }
};

// Tutor: unlock a lead (costs 1 point)
exports.unlockLead = async (req, res) => {
    try {
        const tutorId = req.user.id;
        const leadId = req.params.id;

        if (!isValidId(leadId)) {
            return res.status(400).json({ message: "Invalid lead ID" });
        }

        const lead = await TuitionLead.findById(leadId)
            .populate("parentId", "name phone email");

        if (!lead) return res.status(404).json({ message: "Lead not found" });
        if (lead.status === "CLOSED") {
            return res.status(400).json({ message: "This lead is already closed" });
        }

        const alreadyUnlocked = await LeadUnlock.findOne({ tutorId, leadId });
        if (alreadyUnlocked) {
            // Return parent contact even if already unlocked
            return res.status(200).json({
                message: "Already unlocked",
                parentContact: {
                    name: lead.parentId?.name,
                    phone: lead.parentId?.phone || "Not provided",
                    email: lead.parentId?.email
                },
                remainingPoints: req.user.points
            });
        }

        // Atomically deduct 1 point — only succeeds if points >= 1 (prevents race condition)
        const tutor = await User.findOneAndUpdate(
            { _id: tutorId, points: { $gte: 1 } },
            { $inc: { points: -1 } },
            { new: true }
        );
        if (!tutor) {
            return res.status(403).json({
                message: "Insufficient points. Please buy a plan to continue.",
                code: "INSUFFICIENT_POINTS"
            });
        }

        // Record unlock
        await LeadUnlock.create({ tutorId, leadId, price: 1 });

        // Record debit transaction
        await Transaction.create({
            userId: tutorId,
            amount: 0,
            points: 1,
            type: "DEBIT",
            description: `Unlocked lead: ${lead.title}`,
            status: "SUCCESS"
        });

        // KPI tracking (non-blocking)
        KPIEvent.create({
            userId: tutorId,
            eventType: "LEAD_UNLOCK",
            metadata: { leadId, price: 1 }
        }).catch(() => {});

        res.json({
            message: "Lead unlocked! You can now contact the parent.",
            remainingPoints: tutor.points,
            parentContact: {
                name: lead.parentId?.name,
                phone: lead.parentId?.phone || "Not provided",
                email: lead.parentId?.email
            }
        });
    } catch (err) {
        console.error("Unlock Error:", err);
        res.status(500).json({ message: "Unlock failed. Please try again." });
    }
};

// Admin: close a lead
exports.closeLead = async (req, res) => {
    try {
        if (!isValidId(req.params.id)) {
            return res.status(400).json({ message: "Invalid lead ID" });
        }
        const lead = await TuitionLead.findByIdAndUpdate(
            req.params.id,
            { status: "CLOSED" },
            { new: true }
        );
        if (!lead) return res.status(404).json({ message: "Lead not found" });
        res.json({ message: "Lead closed successfully", lead });
    } catch (err) {
        res.status(500).json({ message: "Failed to close lead" });
    }
};

// Parent: update their own lead
exports.updateLead = async (req, res) => {
    try {
        if (!isValidId(req.params.id)) {
            return res.status(400).json({ message: "Invalid lead ID" });
        }

        const lead = await TuitionLead.findOne({ _id: req.params.id, parentId: req.user.id });
        if (!lead) {
            return res.status(404).json({ message: "Lead not found or you are not authorized to edit it" });
        }

        const allowedUpdates = ["title", "subjects", "classLevel", "mode", "location", "pincode", "budgetRange", "description", "status"];
        const updates = {};
        allowedUpdates.forEach(field => {
            if (req.body[field] !== undefined) updates[field] = req.body[field];
        });

        if (updates.subjects && !Array.isArray(updates.subjects)) {
            return res.status(400).json({ message: "subjects must be an array" });
        }

        const updatedLead = await TuitionLead.findByIdAndUpdate(
            req.params.id,
            { $set: updates },
            { new: true, runValidators: true }
        );

        res.json(updatedLead);
    } catch (err) {
        if (err.name === "ValidationError") {
            return res.status(400).json({ message: err.message });
        }
        console.error("Update Lead Error:", err);
        res.status(500).json({ message: "Failed to update lead" });
    }
};

// Parent: get a specific lead (edit mode)
exports.getLeadById = async (req, res) => {
    try {
        if (!isValidId(req.params.id)) {
            return res.status(400).json({ message: "Invalid lead ID" });
        }

        const lead = await TuitionLead.findOne({ _id: req.params.id, parentId: req.user.id });
        if (!lead) {
            return res.status(404).json({ message: "Lead not found or you are not authorized to view it" });
        }
        res.json(lead);
    } catch (err) {
        console.error("GetLeadById Error:", err);
        res.status(500).json({ message: "Failed to fetch lead" });
    }
};

// Cron: auto-close leads older than 30 days
exports.expireOldLeads = async () => {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const result = await TuitionLead.updateMany(
        { status: "OPEN", createdAt: { $lt: cutoff } },
        { $set: { status: "CLOSED" } }
    );
    console.log(`[expireOldLeads] Closed ${result.modifiedCount} expired lead(s).`);
    return result.modifiedCount;
};
