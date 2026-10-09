
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



// const express = require("express");
// const router = express.Router();
// const ActivityLog = require("../models/ActivityLog");

// router.get("/test", (req, res) => {
//     res.json({ message: "User routes working!" });
// });

// // 🚀 TEMPORARY TEST ROUTE: Ek dummy log database mein banane ke liye
// router.get("/create-test-log", async (req, res) => {
//     try {
//         const dummyLog = await ActivityLog.create({
//             action: "Tested system activity log successfully",
//             module: "Employee", // Frontend ke module filter se match karta hua
//         });
//         res.json({ message: "Test log created successfully!", dummyLog });
//     } catch (err) {
//         res.status(500).json({ error: err.message });
//     }
// });

// // Activity Logs Route
// router.get("/activity-logs", async (req, res, next) => {
//     try {
//         const { module } = req.query;
//         let query = {};

//         if (module) {
//             query.module = module;
//         }

//         const logs = await ActivityLog.find(query)
//             .populate("user", "name email role")
//             .sort({ createdAt: -1 })
//             .limit(100);

//         res.json(logs);
//     } catch (err) {
//         next(err);
//     }
// });

// module.exports = router;