const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const ctrl = require("../controllers/userManagementController");

router.get("/", protect, authorize("admin"), ctrl.getUsers);
router.put("/:id/link-employee", protect, authorize("admin"), ctrl.linkEmployee); // ✅ naya route
router.put("/:id/role", protect, authorize("admin"), ctrl.updateUserRole);
router.put("/:id/toggle-active", protect, authorize("admin"), ctrl.toggleUserActive);
router.delete("/:id", protect, authorize("admin"), ctrl.deleteUser);

router.get("/login-history", protect, authorize("admin"), ctrl.getLoginHistory);
router.get("/activity-logs", protect, authorize("admin"), ctrl.getActivityLogs);

module.exports = router;

// const express = require("express");
// const router = express.Router();
// const { protect, authorize } = require("../middleware/authMiddleware");
// const ctrl = require("../controllers/userManagementController");

// router.get("/", protect, authorize("admin"), ctrl.getUsers);
// router.put("/:id/role", protect, authorize("admin"), ctrl.updateUserRole);
// router.put("/:id/toggle-active", protect, authorize("admin"), ctrl.toggleUserActive);
// router.delete("/:id", protect, authorize("admin"), ctrl.deleteUser);

// router.get("/login-history", protect, authorize("admin"), ctrl.getLoginHistory);
// router.get("/activity-logs", protect, authorize("admin"), ctrl.getActivityLogs);

// module.exports = router;