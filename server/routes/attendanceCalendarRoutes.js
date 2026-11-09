const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const off = require("../controllers/offDayController");
const sum = require("../controllers/attendanceSummaryController");

router.get("/off-days", protect, off.listOffDays);
router.post("/off-days", protect, authorize("admin", "hr"), off.createOffDay);
router.put("/off-days/:id/decision", protect, authorize("admin"), off.decideOffDay);
router.delete("/off-days/:id", protect, authorize("admin", "hr"), off.removeOffDay);

router.get("/monthly-summary", protect, authorize("admin", "hr", "manager"), sum.getMonthlySummary);
router.get("/employee-year", protect, sum.getEmployeeYear);

module.exports = router;