const User = require("../models/user.model.cjs");
const { resolvePincode, PINCODE_RE, buildProximityOr, rankByProximity } = require("../utils/pincode.cjs");

exports.getTutors = async (req, res) => {
    try {
        const tutors = await User.find({ role: 'TUTOR' })
            .select("-password")
            .sort({ rating: -1 })
            .lean();
        res.json(tutors);
    } catch (err) {
        console.error("Get Tutors Error:", err.name, "-", err.message);
        res.status(500).json({ message: "Failed to fetch tutors" });
    }
};

// Public: tutors near a given pincode — exact pincode, then same postal
// prefix, then a text match on the resolved area/district name.
exports.getNearbyTutors = async (req, res) => {
    try {
        const { pincode } = req.query;
        if (!pincode || !PINCODE_RE.test(pincode)) {
            return res.status(400).json({ message: "A valid 6-digit pincode is required" });
        }

        const resolved = await resolvePincode(pincode);
        const tutors = await User.find({ role: "TUTOR", $or: buildProximityOr(pincode, resolved) })
            .select("-password")
            .lean();

        res.json({
            area: resolved ? { name: resolved.area, district: resolved.district, state: resolved.state } : null,
            tutors: rankByProximity(tutors, pincode),
        });
    } catch (err) {
        console.error("Get Nearby Tutors Error:", err);
        res.status(500).json({ message: "Failed to fetch nearby tutors" });
    }
};

exports.getPublicStats = async (req, res) => {
    try {
        const TuitionLead = require("../models/TutionLead.model.cjs");

        const totalTutors = await User.countDocuments({ role: 'TUTOR' });
        const totalStudents = await User.countDocuments({ role: 'PARENT' });
        const activeLeads = await TuitionLead.countDocuments({ status: 'OPEN' });

        res.json({
            tutors: totalTutors,
            students: totalStudents,
            activeLeads: activeLeads
        });
    } catch (err) {
        console.error("Public Stats Error:", err);
        res.status(500).json({ message: "Failed to fetch public stats" });
    }
};

exports.getPublicLeads = async (req, res) => {
    try {
        const TuitionLead = require("../models/TutionLead.model.cjs");
        const leads = await TuitionLead.find({ status: 'OPEN' })
            .select("title subjects classLevel mode budgetRange location pincode createdAt")
            .sort({ createdAt: -1 })
            .limit(50);
        res.json(leads);
    } catch (err) {
        console.error("Get Public Leads Error:", err);
        res.status(500).json({ message: "Failed to fetch public leads" });
    }
};

// Public: open leads near a given pincode — exact pincode, then same postal
// prefix, then a text match on the resolved area/district name.
exports.getNearbyLeads = async (req, res) => {
    try {
        const { pincode } = req.query;
        if (!pincode || !PINCODE_RE.test(pincode)) {
            return res.status(400).json({ message: "A valid 6-digit pincode is required" });
        }

        const TuitionLead = require("../models/TutionLead.model.cjs");

        const resolved = await resolvePincode(pincode);
        const leads = await TuitionLead.find({ status: "OPEN", $or: buildProximityOr(pincode, resolved) })
            .select("title subjects classLevel mode budgetRange location pincode createdAt")
            .limit(50)
            .lean();

        res.json({
            area: resolved ? { name: resolved.area, district: resolved.district, state: resolved.state } : null,
            leads: rankByProximity(leads, pincode),
        });
    } catch (err) {
        console.error("Get Nearby Leads Error:", err);
        res.status(500).json({ message: "Failed to fetch nearby leads" });
    }
};
