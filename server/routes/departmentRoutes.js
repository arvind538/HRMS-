const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const {
    getDepartments,
    getDepartment,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    toggleDepartmentStatus,
} = require("../controllers/departmentController");

// Base Routes: /api/departments OR /api/organization/departments
router
    .route("/")
    .get(protect, getDepartments)
    .post(protect, authorize("admin", "hr", "superadmin"), createDepartment);

router
    .route("/:id")
    .get(protect, getDepartment)
    .put(protect, authorize("admin", "hr", "superadmin"), updateDepartment)
    .delete(protect, authorize("admin", "hr", "superadmin"), deleteDepartment);

// Quick Status Toggle Route
router.put(
    "/:id/toggle-status",
    protect,
    authorize("admin", "hr", "superadmin"),
    toggleDepartmentStatus
);

module.exports = router;