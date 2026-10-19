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
} = require("../controllers/leaveController");

router.get("/", protect, getLeaves);
router.get("/my-leaves", protect, getMyLeaves);
router.get("/quota", protect, getMyLeaveQuota);
router.get("/balance/:employeeId", protect, getLeaveBalance);

router.post("/apply", protect, applyLeave);
router.put("/:id/approve", protect, authorize("admin", "hr", "manager"), approveLeave);
router.put("/:id/reject", protect, authorize("admin", "hr", "manager"), rejectLeave);
router.put("/:id/cancel", protect, cancelLeave);

router.put("/:id", protect, updateLeave);
router.delete("/:id", protect, deleteLeave);

module.exports = router;





// const express = require("express");
// const router = express.Router();
// const { protect, authorize } = require("../middleware/authMiddleware");
// const {
//     getLeaves,
//     applyLeave,
//     approveLeave,
//     rejectLeave,
//     cancelLeave,
//     getLeaveBalance,
//     getMyLeaveQuota,
// } = require("../controllers/leaveController");

// router.get("/", protect, getLeaves);
// router.get("/quota", protect, getMyLeaveQuota);
// router.get("/balance/:employeeId", protect, getLeaveBalance);

// router.post("/apply", protect, applyLeave);
// router.put("/:id/approve", protect, authorize("admin", "hr", "manager"), approveLeave);
// router.put("/:id/reject", protect, authorize("admin", "hr", "manager"), rejectLeave);
// router.put("/:id/cancel", protect, cancelLeave);

// module.exports = router;




// // const express = require("express");
// // const router = express.Router();
// // const { protect, authorize } = require("../middleware/authMiddleware");
// // const {
// //     getLeaves,
// //     applyLeave,
// //     approveLeave,
// //     rejectLeave,
// //     cancelLeave,
// //     getLeaveBalance,
// // } = require("../controllers/leaveController");

// // // Jab frontend se /api/leave ya /api/leave?status=pending call hoga, yeh run karega
// // router.get("/", protect, getLeaves);

// // router.post("/apply", protect, applyLeave);
// // router.put("/:id/approve", protect, authorize("admin", "hr", "manager"), approveLeave);
// // router.put("/:id/reject", protect, authorize("admin", "hr", "manager"), rejectLeave);
// // router.put("/:id/cancel", protect, cancelLeave);
// // router.get("/balance/:employeeId", protect, getLeaveBalance);

// // module.exports = router;