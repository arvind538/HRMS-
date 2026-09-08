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
} = require("../controllers/employeeController");

router
    .route("/")
    .get(protect, getEmployees)
    .post(protect, authorize("admin", "hr"), createEmployee);

router
    .route("/:id")
    .get(protect, getEmployee)
    .put(protect, authorize("admin", "hr"), updateEmployee)
    .delete(protect, authorize("admin"), deleteEmployee);

router.put("/:id/exit", protect, authorize("admin", "hr"), exitEmployee);

module.exports = router;