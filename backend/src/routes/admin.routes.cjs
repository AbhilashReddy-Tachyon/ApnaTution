const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth.middleware.cjs");
const role = require("../middleware/role.middleware.cjs");
const { getAdminStats } = require("../controllers/kpi.controller.cjs");
const { closeLead, expireOldLeads } = require("../controllers/lead.controller.cjs");
const { logger } = require("../utils/logger.cjs");
const {
    adminRetryPendingCredit,
    adminMarkProcessingResolved
} = require("../controllers/payment.controller.cjs");
const {
    listUsers,
    getUserById,
    setUserStatus,
    listLeadsAdmin,
    deleteLeadAdmin,
    setLeadVerification,
    listTransactions,
    listCoupons,
    createCoupon,
    updateCoupon,
    getLeadReports,
    resolveLeadReport
} = require("../controllers/admin.controller.cjs");

router.get("/stats", auth, role("ADMIN"), getAdminStats);

// Users
router.get("/users",            auth, role("ADMIN"), listUsers);
router.get("/users/:id",        auth, role("ADMIN"), getUserById);
router.patch("/users/:id/status", auth, role("ADMIN"), setUserStatus);

// Leads
router.get("/leads",            auth, role("ADMIN"), listLeadsAdmin);
router.patch("/leads/:id/close", auth, role("ADMIN"), closeLead);
router.patch("/leads/:id/verification", auth, role("ADMIN"), setLeadVerification);
router.delete("/leads/:id",     auth, role("ADMIN"), deleteLeadAdmin);

// Lead reports (tutor-submitted reports of bad/spam leads)
router.get("/lead-reports", auth, role("ADMIN"), getLeadReports);
router.post("/lead-reports/:id/resolve", auth, role("ADMIN"), resolveLeadReport);

// Transactions
router.get("/transactions",     auth, role("ADMIN"), listTransactions);
router.post("/transactions/:id/retry-credit", auth, role("ADMIN"), adminRetryPendingCredit);
router.post("/transactions/:id/resolve-processing", auth, role("ADMIN"), adminMarkProcessingResolved);

// Coupons
router.get("/coupons",          auth, role("ADMIN"), listCoupons);
router.post("/coupons",         auth, role("ADMIN"), createCoupon);
router.patch("/coupons/:id",    auth, role("ADMIN"), updateCoupon);

// Vercel cron endpoint — secured by CRON_SECRET env var
// Vercel calls: GET /admin/cron/expire-leads
// with header:  Authorization: Bearer <CRON_SECRET>
router.get("/cron/expire-leads", async (req, res) => {
    const secret = process.env.CRON_SECRET;
    if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    try {
        const closed = await expireOldLeads();
        res.json({ message: "Done", closedLeads: closed });
    } catch (err) {
        logger.error({ err: err }, "Cron expire-leads error");
        res.status(500).json({ message: "Cron job failed" });
    }
});

module.exports = router;
