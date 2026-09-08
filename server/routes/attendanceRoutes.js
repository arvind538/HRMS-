const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const {
    getAttendance,
    checkIn,
    checkOut,
    regularizeAttendance,
    getAttendanceSummary,
} = require("../controllers/attendanceController");

router.get("/", protect, getAttendance);
router.post("/check-in", protect, checkIn);
router.put("/check-out", protect, checkOut);
router.post("/regularize", protect, authorize("admin", "hr", "manager"), regularizeAttendance);
router.get("/summary/:employeeId", protect, getAttendanceSummary);

module.exports = router;