const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const User = require("../models/User");
const { protect, authorize } = require("../middleware/authMiddleware");
const ctrl = require("../controllers/userManagementController");

const VALID_ROLES = ["admin", "hr", "manager", "employee"];

/* Every route here is admin only */
router.use(protect, authorize("admin"));

/* Bad ids return a clean 404 instead of a 500 cast error */
router.param("id", (req, res, next, id) => {
    if (!mongoose.isValidObjectId(id)) {
        return res.status(404).json({ message: "User not found." });
    }
    next();
});

/* An admin must not lock themselves out */
const blockSelf = (action) => (req, res, next) => {
    if (String(req.params.id) === String(req.user._id)) {
        return res.status(400).json({ message: `You cannot ${action} your own account.` });
    }
    next();
};

/* User model stores roles in lowercase; the UI may send "Manager", "HR" etc. */
const normalizeRole = (req, res, next) => {
    const role = String(req.body?.role || "").trim().toLowerCase();
    if (!VALID_ROLES.includes(role)) {
        return res.status(400).json({ message: `Role must be one of: ${VALID_ROLES.join(", ")}.` });
    }
    req.body.role = role;
    next();
};

/* Static routes first */
router.get("/login-history", ctrl.getLoginHistory);
router.get("/", ctrl.getUsers);

router.put("/:id/link-employee", ctrl.linkEmployee);
router.put("/:id/role", blockSelf("change the role of"), normalizeRole, ctrl.updateUserRole);
router.put("/:id/toggle-active", blockSelf("disable"), ctrl.toggleUserActive);
router.delete("/:id", blockSelf("delete"), ctrl.deleteUser);

module.exports = router;


// const express = require("express");
// const router = express.Router();
// const { protect, authorize } = require("../middleware/authMiddleware");
// const ctrl = require("../controllers/userManagementController");

// router.get("/", protect, authorize("admin"), ctrl.getUsers);
// router.put("/:id/link-employee", protect, authorize("admin"), ctrl.linkEmployee); // ✅ naya route
// router.put("/:id/role", protect, authorize("admin"), ctrl.updateUserRole);
// router.put("/:id/toggle-active", protect, authorize("admin"), ctrl.toggleUserActive);
// router.delete("/:id", protect, authorize("admin"), ctrl.deleteUser);

// router.get("/login-history", protect, authorize("admin"), ctrl.getLoginHistory);
// router.get("/activity-logs", protect, authorize("admin"), ctrl.getActivityLogs);

// module.exports = router;

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