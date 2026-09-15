const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const ctrl = require("../controllers/performanceController");
const { getAggregateReport } = require('../controllers/performanceController');
const { getAppraisals } = require("../controllers/performanceController");

// Aggregate Report Route
router.get('/aggregate-report', getAggregateReport);

router.get("/", getAppraisals);

// Goals Routes
router.get("/goals", protect, ctrl.getGoals);
router.post("/goals", protect, authorize("admin", "hr", "manager"), ctrl.createGoal);
router.put("/goals/:id/progress", protect, ctrl.updateGoalProgress);
router.delete("/goals/:id", protect, authorize("admin", "hr", "manager"), ctrl.deleteGoal);

// Appraisals Routes
router.get("/appraisals", protect, ctrl.getAppraisals);
router.post("/appraisals", protect, authorize("admin", "hr"), ctrl.createAppraisal);

// Clean & Error-Free PUT Route for Rating/Status Update
router.put("/appraisals/:id", protect, authorize("admin", "hr", "manager"), ctrl.updateAppraisal);

router.put("/appraisals/:id/self-assessment", protect, ctrl.submitSelfAssessment);
router.put("/appraisals/:id/manager-assessment", protect, authorize("admin", "hr", "manager"), ctrl.submitManagerAssessment);

module.exports = router;