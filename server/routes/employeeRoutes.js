const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const {
    getEmployees,
    getEmployee,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    exitEmployee,
    getMyProfile, // 👈 Make sure yeh controller mein bhi export ho
} = require("../controllers/employeeController");

// 1. Get all employees & Create employee
router
    .route("/")
    .get(protect, getEmployees)
    .post(protect, authorize("admin", "hr"), createEmployee);

// 2. Profile route MUST be placed BEFORE /:id
// (Warna Express "profile" word ko ek valid ID samajh kar error de dega)
router.get("/profile", protect, getMyProfile);

// 3. Single employee operations by ID (Get, Update, Delete)
router
    .route("/:id")
    .get(protect, getEmployee)
    .put(protect, authorize("admin", "hr"), updateEmployee)
    .delete(protect, authorize("admin"), deleteEmployee);

// 4. Employee exit route
router.put("/:id/exit", protect, authorize("admin", "hr"), exitEmployee);

module.exports = router;