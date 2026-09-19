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
    getAttendanceReports,
    deleteAttendance, // ✅ Added deleteAttendance controller import
} = require("../controllers/attendanceController");

router.get("/", protect, getAttendance);
router.get("/reports", protect, authorize("admin", "hr", "manager"), getAttendanceReports);
router.post("/mark", protect, authorize("admin", "hr", "manager"), markAttendance);
router.post("/check-in", protect, checkIn);
router.put("/check-out", protect, checkOut);

// ✅ Added protect and authorize middleware to delete route for safety
router.delete("/:id", protect, authorize("admin", "hr"), deleteAttendance);

router.post("/regularize", protect, authorize("admin", "hr", "manager"), regularizeAttendance);
router.get("/summary/:employeeId", protect, getAttendanceSummary);

module.exports = router;