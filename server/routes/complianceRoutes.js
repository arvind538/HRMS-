const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const ctrl = require("../controllers/complianceController");

router.get("/calendar", protect, authorize("admin", "hr"), ctrl.getComplianceCalendar);
router.get("/", protect, authorize("admin", "hr"), ctrl.getComplianceRecords);
router.post("/", protect, authorize("admin", "hr"), ctrl.createComplianceRecord);
router.put("/:id/file", protect, authorize("admin", "hr"), ctrl.markAsFiled);

module.exports = router;