const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const ctrl = require("../controllers/performanceController");
const { getAggregateReport } = require('../controllers/performanceController');

// Yeh route frontend ke fetch call ke sath match karega: GET /api/performance/aggregate-report
router.get('/aggregate-report', getAggregateReport);

// Goals
router.get("/goals", protect, ctrl.getGoals);
router.post("/goals", protect, authorize("admin", "hr", "manager"), ctrl.createGoal);
router.put("/goals/:id/progress", protect, ctrl.updateGoalProgress);
router.delete("/goals/:id", protect, authorize("admin", "hr", "manager"), ctrl.deleteGoal);

// Appraisals
router.get("/appraisals", protect, ctrl.getAppraisals);
router.post("/appraisals", protect, authorize("admin", "hr"), ctrl.createAppraisal);
router.put("/appraisals/:id/self-assessment", protect, ctrl.submitSelfAssessment);
router.put("/appraisals/:id/manager-assessment", protect, authorize("admin", "hr", "manager"), ctrl.submitManagerAssessment);

module.exports = router;
