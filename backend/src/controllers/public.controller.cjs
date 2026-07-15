const User = require("../models/user.model.cjs");

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
            .select("title subjects classLevel mode budgetRange location createdAt")
            .sort({ createdAt: -1 })
            .limit(50);
        res.json(leads);
    } catch (err) {
        console.error("Get Public Leads Error:", err);
        res.status(500).json({ message: "Failed to fetch public leads" });
    }
};
