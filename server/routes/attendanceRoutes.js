const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const {
    getAttendance,
    getDayInfo,
    markAttendance,
    markAbsentBulk,
    checkIn,
    checkOut,
    regularizeAttendance,
    getAttendanceSummary,
    getAttendanceReports,
    deleteAttendance,
    listHolidays,
    addHoliday,
    deleteHoliday,
} = require("../controllers/attendanceController");

router.get("/", protect, getAttendance);
router.get("/day-info", protect, authorize("admin", "hr", "manager", "team_lead", "lead"), getDayInfo); // NEW
router.get("/reports", protect, authorize("admin", "hr", "manager"), getAttendanceReports);

router.post("/mark", protect, authorize("admin", "hr", "manager"), markAttendance);
router.post("/mark-absent-bulk", protect, authorize("admin", "hr", "manager"), markAbsentBulk); // NEW
router.post("/check-in", protect, checkIn);
router.put("/check-out", protect, checkOut);

// Holidays (NEW). Keep these above "/:id"
router.get("/holidays", protect, listHolidays);
router.post("/holidays", protect, authorize("admin", "hr"), addHoliday);
router.delete("/holidays/:date", protect, authorize("admin", "hr"), deleteHoliday);

router.delete("/:id", protect, authorize("admin", "hr"), deleteAttendance);

router.post("/regularize", protect, authorize("admin", "hr", "manager"), regularizeAttendance);
router.get("/summary/:employeeId", protect, getAttendanceSummary);

module.exports = router;









// const express = require("express");
// const router = express.Router();
// const { protect, authorize } = require("../middleware/authMiddleware");
// const {
//     getAttendance,
//     markAttendance,
//     checkIn,
//     checkOut,
//     regularizeAttendance,
//     getAttendanceSummary,
//     getAttendanceReports,
//     deleteAttendance, //  Added deleteAttendance controller import
// } = require("../controllers/attendanceController");

// router.get("/", protect, getAttendance);
// router.get("/reports", protect, authorize("admin", "hr", "manager"), getAttendanceReports);
// router.post("/mark", protect, authorize("admin", "hr", "manager"), markAttendance);
// router.post("/check-in", protect, checkIn);
// router.put("/check-out", protect, checkOut);



// // Added protect and authorize middleware to delete route for safety
// router.delete("/:id", protect, authorize("admin", "hr"), deleteAttendance);

// router.post("/regularize", protect, authorize("admin", "hr", "manager"), regularizeAttendance);
// router.get("/summary/:employeeId", protect, getAttendanceSummary);

// module.exports = router;