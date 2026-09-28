const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const {
    getEmployees,
    getEmployee,
    getEmployeeById,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    exitEmployee,
    getMyProfile,
} = require("../controllers/employeeController");

// Single employee retriever function reference safe resolver
const resolveGetEmployee = getEmployee || getEmployeeById;

// 1. Get all employees & Create employee
router
    .route("/")
    .get(protect, getEmployees)
    .post(protect, authorize("admin", "hr"), createEmployee);

// 2. Logged-in User Self Profile (MUST be BEFORE /:id)
router.get("/profile", protect, getMyProfile);

// 3. Fallback Route: /employees/update/:id (Used by frontend edit fallback)
router.put("/update/:id", protect, authorize("admin", "hr"), updateEmployee);

// 4. Employee Exit Route (MUST be BEFORE /:id if not matching standard param)
router.put("/:id/exit", protect, authorize("admin", "hr"), exitEmployee);

// 5. Operations by ID (Get, Update, Delete)
router
    .route("/:id")
    .get(protect, resolveGetEmployee)
    .put(protect, authorize("admin", "hr"), updateEmployee)
    .delete(protect, authorize("admin"), deleteEmployee);

module.exports = router;