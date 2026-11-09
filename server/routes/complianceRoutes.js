const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const ctrl = require("../controllers/complianceController");

const adminHr = [protect, authorize("admin", "hr")];

/* A wrong id gives a clean 404 instead of a database error */
router.param("id", (req, res, next, id) => {
    if (!/^[0-9a-fA-F]{24}$/.test(id)) return res.status(404).json({ message: "Record not found." });
    next();
});
router.param("employeeId", (req, res, next, id) => {
    if (!/^[0-9a-fA-F]{24}$/.test(id)) return res.status(404).json({ message: "Employee not found." });
    next();
});

/* Fixed paths first */
router.get("/calendar", ...adminHr, ctrl.getComplianceCalendar);
router.get("/summary", ...adminHr, ctrl.getSummary);
router.get("/monthly/:type", ...adminHr, ctrl.getMonthlyStatement);
router.get("/reports/annual", ...adminHr, ctrl.getAnnualReport);
router.get("/employees", ...adminHr, ctrl.getStatutoryEmployees);
router.get("/registration", ...adminHr, ctrl.getRegistration);
router.put("/registration", protect, authorize("admin"), ctrl.updateRegistration);
router.put("/employees/:employeeId", ...adminHr, ctrl.updateStatutoryProfile);

/* Records */
router.get("/", ...adminHr, ctrl.getComplianceRecords);
router.post("/", ...adminHr, ctrl.createComplianceRecord);
router.put("/:id/file", ...adminHr, ctrl.markAsFiled);
// router.put("/:id/reopen", ...protect.constructor === Function ? [protect, 
// authorize("admin")] : [], ctrl.reopenRecord);
router.put("/:id/reopen", protect, authorize("admin"), ctrl.reopenRecord);
router.put("/:id", ...adminHr, ctrl.updateComplianceRecord);
router.delete("/:id", protect, authorize("admin"), ctrl.deleteRecord);

module.exports = router;

