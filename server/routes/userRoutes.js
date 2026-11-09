
const express = require("express");
const router = express.Router();
const ActivityLog = require("../models/ActivityLog");
const { protect, authorize } = require("../middleware/authMiddleware");




// GET /api/users/activity-logs?module=Employee  (admin only)
router.get("/activity-logs", protect, authorize("admin"), async (req, res, next) => {
    try {
        const query = {};

        // String() stops query-object tricks like ?module[$ne]=x
        if (req.query.module) query.module = String(req.query.module);

        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 200);

        const logs = await ActivityLog.find(query)
            .populate("user", "name email role")
            .sort({ createdAt: -1 })
            .limit(limit);

        res.json(logs);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
