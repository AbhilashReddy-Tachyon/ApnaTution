const { logger } = require("../utils/logger.cjs");
const User = require("../models/user.model.cjs");

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
            .select("title subjects classLevel mode budgetRange location createdAt")
            .sort({ createdAt: -1 })
            .limit(50);
        res.json(leads);
    } catch (err) {
        logger.error({ err: err }, "Get Public Leads Error");
        res.status(500).json({ message: "Failed to fetch public leads" });
    }
};
