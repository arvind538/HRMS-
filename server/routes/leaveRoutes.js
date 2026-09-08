const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const {
    getLeaves,
    applyLeave,
    approveLeave,
    rejectLeave,
    cancelLeave,
    getLeaveBalance,
} = require("../controllers/leaveController");

router.get("/", protect, getLeaves);
router.post("/apply", protect, applyLeave);
router.put("/:id/approve", protect, authorize("admin", "hr", "manager"), approveLeave);
router.put("/:id/reject", protect, authorize("admin", "hr", "manager"), rejectLeave);
router.put("/:id/cancel", protect, cancelLeave);
router.get("/balance/:employeeId", protect, getLeaveBalance);

module.exports = router;  