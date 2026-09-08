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

router
    .route("/")
    .get(protect, getDepartments)
    .post(protect, authorize("admin", "hr"), createDepartment);

router
    .route("/:id")
    .get(protect, getDepartment)
    .put(protect, authorize("admin", "hr"), updateDepartment)
    .delete(protect, authorize("admin"), deleteDepartment);

router.put("/:id/toggle-status", protect, authorize("admin", "hr"), toggleDepartmentStatus);

module.exports = router;