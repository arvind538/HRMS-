const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
// const {
//     getEmployees,
//     getEmployee,
//     getEmployeeById,
//     createEmployee,
//     updateEmployee,
//     deleteEmployee,
//     exitEmployee,
//     getMyProfile,
//     updateMyProfile,
//     getMe,
//     getTeam,
//     getManagerOptions,
//     assignTeam,
// } = require("../controllers/employeeController");

const {
    getEmployees, getMyProfile, updateMyProfile, getMe, getEmployeeById, createEmployee, getEmployee,
    updateEmployee, deleteEmployee, exitEmployee, getTeam, getManagerOptions, getNextEmployeeId, assignTeam,
} = require("../controllers/employeeController");

const resolveGetEmployee = getEmployee || getEmployeeById;

// 1. Get all employees (data is filtered by role in the controller) & create employee (admin / hr)
router
    .route("/")
    .get(protect, getEmployees)
    .post(protect, authorize("admin", "hr"), createEmployee);



router.get("/profile", protect, getMyProfile);
router.get("/me", protect, getMe);
router.put("/me", protect, updateMyProfile);


// 3. Fallback route used by the frontend edit page
router.put("/update/:id", protect, authorize("admin", "hr"), updateEmployee);

// 4. Employee exit (MUST be BEFORE /:id)
router.put("/:id/exit", protect, authorize("admin", "hr"), exitEmployee);


router.get("/team", protect, getTeam);
router.get("/manager-options", protect, authorize("admin", "hr"), getManagerOptions);
router.get("/next-id", protect, authorize("admin", "hr"), getNextEmployeeId);
router.put("/assign-team", protect, authorize("admin", "hr"), assignTeam);
router.get("/me", protect, getMe);
router.get("/profile", protect, getMyProfile);
router.get("/:id", protect, getEmployeeById);

// 5. Operations by ID
router
    .route("/:id")
    .get(protect, resolveGetEmployee)
    .put(protect, authorize("admin", "hr"), updateEmployee)
    .delete(protect, authorize("admin"), deleteEmployee);

module.exports = router;
