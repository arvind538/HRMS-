const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const {
    getLeaves,
    getMyLeaves,
    applyLeave,
    updateLeave,
    deleteLeave,
    approveLeave,
    rejectLeave,
    cancelLeave,
    getLeaveBalance,
    getMyLeaveQuota,
    getLeavePolicies,
} = require("../controllers/leaveController");


// Static paths pehle (ye /:id se upar rahne chahiye)
router.get("/", protect, getLeaves);
router.get("/my-leaves", protect, getMyLeaves);
router.get("/quota", protect, getMyLeaveQuota);
router.get("/policies", protect, getLeavePolicies);
router.get("/balance/:employeeId", protect, getLeaveBalance);

// Actions
router.post("/apply", protect, applyLeave);
router.put("/:id/approve", protect, authorize("admin", "hr", "manager"), approveLeave);
router.put("/:id/reject", protect, authorize("admin", "hr", "manager"), rejectLeave);
router.put("/:id/cancel", protect, cancelLeave);

// Dynamic paths sabse neeche
router.put("/:id", protect, updateLeave);
router.delete("/:id", protect, deleteLeave);

module.exports = router;

