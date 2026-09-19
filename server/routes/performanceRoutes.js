const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const {
    getGoals,
    createGoal,
    updateGoal,
    deleteGoal,
    updateGoalProgress,
    getAppraisals,
    createAppraisal,
    updateAppraisal,
    submitSelfAssessment,
    submitManagerAssessment,
    getAggregateReport
} = require("../controllers/performanceController");

// Aggregate Report Route
router.get('/aggregate-report', protect, getAggregateReport);

// Goals Routes
router.get("/goals", protect, getGoals);
router.post("/goals", protect, authorize("admin", "hr", "manager"), createGoal);
router.put("/goals/:id/progress", protect, updateGoalProgress);
router.put("/goals/:id", protect, authorize("admin", "hr", "manager"), updateGoal); // 🌟 Added and protected properly
router.delete("/goals/:id", protect, authorize("admin", "hr", "manager"), deleteGoal);

// Appraisals Routes
router.get("/appraisals", protect, getAppraisals);
router.post("/appraisals", protect, authorize("admin", "hr"), createAppraisal);
router.put("/appraisals/:id", protect, authorize("admin", "hr", "manager"), updateAppraisal);
router.put("/appraisals/:id/self-assessment", protect, submitSelfAssessment);
router.put("/appraisals/:id/manager-assessment", protect, authorize("admin", "hr", "manager"), submitManagerAssessment);

module.exports = router;