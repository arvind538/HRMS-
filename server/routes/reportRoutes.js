const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const ctrl = require("../controllers/reportController");

// Dashboard overview ke liye — sabhi logged-in users access kar sakte hain
router.get("/employee", protect, ctrl.getEmployeeReport);
router.get("/attendance", protect, ctrl.getAttendanceReport);
router.get("/leave", protect, ctrl.getLeaveReport);

// Performance & Custom Reports — logged-in users / managers ke liye
router.get("/performance/aggregate-report", protect, ctrl.getPerformanceReport);
router.get("/custom", protect, ctrl.getCustomReport);

// Sensitive financial/recruitment data — sirf admin/hr
router.get("/payroll", protect, authorize("admin", "hr"), ctrl.getPayrollReport);
router.get("/recruitment", protect, authorize("admin", "hr"), ctrl.getRecruitmentReport);

module.exports = router;

// const express = require("express");
// const router = express.Router();
// const { protect, authorize } = require("../middleware/authMiddleware");
// const ctrl = require("../controllers/reportController");

// router.get("/employee", protect, authorize("admin", "hr"), ctrl.getEmployeeReport);
// router.get("/attendance", protect, authorize("admin", "hr"), ctrl.getAttendanceReport);
// router.get("/leave", protect, authorize("admin", "hr"), ctrl.getLeaveReport);
// router.get("/payroll", protect, authorize("admin", "hr"), ctrl.getPayrollReport);
// router.get("/recruitment", protect, authorize("admin", "hr"), ctrl.getRecruitmentReport);

// module.exports = router;