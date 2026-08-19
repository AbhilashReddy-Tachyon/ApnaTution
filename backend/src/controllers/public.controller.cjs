const { logger } = require("../utils/logger.cjs");
const User = require("../models/user.model.cjs");
const { resolvePincode, PINCODE_RE, buildProximityOr, rankByProximity } = require("../utils/pincode.cjs");

// This endpoint is public and unauthenticated, so the projection is an explicit
// allowlist. The previous `-password` exclusion published every other field —
// including email, phone, password-reset tokens and OTP hashes — which both
// leaked PII and gave away the contact details tutors are supposed to pay for.
const PUBLIC_TUTOR_FIELDS =
    "name subjects location experience mode hourlyRate tagline rating reviewsCount isVerified createdAt";

const MAX_PUBLIC_TUTORS = 100;

exports.getTutors = async (req, res) => {
    try {
        const tutors = await User.find({ role: 'TUTOR' })
            .select(PUBLIC_TUTOR_FIELDS)
            .sort({ rating: -1 })
            .limit(MAX_PUBLIC_TUTORS)
            .lean();
        res.json(tutors);
    } catch (err) {
        logger.error({ err }, "failed to fetch public tutors");
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
        logger.error({ err: err }, "Public Stats Error");
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
        logger.error({ err: err }, "Get Public Leads Error");
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
