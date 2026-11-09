const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const c = require("../controllers/performanceController");

/* A wrong id gives a clean 404 instead of a database error */
router.param("id", (req, res, next, id) => (/^[0-9a-fA-F]{24}$/.test(id) ? next() : res.status(404).json({ message: "Record not found." })));

const staff = authorize("admin", "hr");
const admin = authorize("admin");
const reviewers = authorize("admin", "hr", "manager");

/* Dashboard and dropdowns (what each person sees is decided inside) */
router.get("/summary", protect, c.getSummary);
router.get("/aggregate-report", protect, c.getSummary); // old path, same data
router.get("/people", protect, c.people);

/* Goals and KPIs: employee own, manager team, HR all */
router.get("/goals", protect, c.getGoals);
router.post("/goals", protect, c.createGoal);
router.put("/goals/:id/progress", protect, c.updateGoalProgress);
router.put("/goals/:id", protect, c.updateGoal);
router.delete("/goals/:id", protect, c.deleteGoal);

/* Appraisals */
router.get("/appraisals", protect, c.getAppraisals);
router.post("/appraisals/bulk", protect, staff, c.bulkCreateAppraisals);
router.post("/appraisals", protect, staff, c.createAppraisal);
router.put("/appraisals/:id/self-assessment", protect, c.submitSelfAssessment);
router.put("/appraisals/:id/manager-assessment", protect, reviewers, c.submitManagerAssessment);
router.put("/appraisals/:id/reopen", protect, staff, c.reopenAppraisal);
router.put("/appraisals/:id/promotion", protect, staff, c.decidePromotion);
router.post("/appraisals/:id/promotion/apply", protect, staff, c.applyPromotion);
router.put("/appraisals/:id/increment", protect, staff, c.decideIncrement);
router.post("/appraisals/:id/increment/apply", protect, admin, c.applyIncrement);
router.put("/appraisals/:id", protect, staff, c.updateAppraisal);
router.delete("/appraisals/:id", protect, admin, c.deleteAppraisal);

/* Ratings, promotions and increments */
router.get("/ratings", protect, c.getRatings);
router.get("/promotions", protect, c.getPromotions);
router.get("/increments", protect, c.getIncrements);

module.exports = router;












