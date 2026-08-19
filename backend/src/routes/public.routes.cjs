const express = require("express");
const router = express.Router();
const { getTutors, getPublicStats, getPublicLeads, getNearbyTutors, getNearbyLeads } = require("../controllers/public.controller.cjs");

router.get("/tutors/nearby", getNearbyTutors);
router.get("/tutors", getTutors);
router.get("/stats", getPublicStats);
router.get("/leads/nearby", getNearbyLeads);
router.get("/leads", getPublicLeads);

module.exports = router;
