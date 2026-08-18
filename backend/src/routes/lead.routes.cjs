const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth.middleware.cjs");
const role = require("../middleware/role.middleware.cjs");
const {
    createLead,
    getMyLeads,
    getInterestedTutors,
    getLeadsForTutor,
    getMyUnlockedLeads,
    unlockLead,
    reportLead,
    updateLead,
    getLeadById
} = require("../controllers/lead.controller.cjs");

// Specific paths must come before wildcard /:id routes
router.get("/my",           auth, role("PARENT"), getMyLeads);         // Parent: my leads
router.get("/unlocked",     auth, role("TUTOR"),  getMyUnlockedLeads); // Tutor: unlocked leads
router.get("/",             auth, role("TUTOR"),  getLeadsForTutor);   // Tutor: all open leads
router.post("/",            auth, role("PARENT"), createLead);          // Parent: create lead
router.get("/:id/interested-tutors", auth, role("PARENT"), getInterestedTutors);
router.post("/:id/unlock",  auth, role("TUTOR"),  unlockLead);         // Tutor: unlock lead
router.post("/:id/report",  auth, role("TUTOR"),  reportLead);         // Tutor: report unlocked lead
router.get("/:id",          auth, role("PARENT"), getLeadById);        // Parent: get one lead
router.put("/:id",          auth, role("PARENT"), updateLead);         // Parent: update lead

module.exports = router;
