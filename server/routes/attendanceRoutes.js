const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const {
    getAttendance,
    markAttendance,
    checkIn,
    checkOut,
    regularizeAttendance,
    getAttendanceSummary,
    getAttendanceReports, // ✅ Added reports controller
} = require("../controllers/attendanceController");

router.get("/", protect, getAttendance);
router.get("/reports", protect, authorize("admin", "hr", "manager"), getAttendanceReports); // ✅ Added /reports route to fix 404
router.post("/mark", protect, authorize("admin", "hr", "manager"), markAttendance);
router.post("/check-in", protect, checkIn);
router.put("/check-out", protect, checkOut);
router.post("/regularize", protect, authorize("admin", "hr", "manager"), regularizeAttendance);
router.get("/summary/:employeeId", protect, getAttendanceSummary);

module.exports = router;