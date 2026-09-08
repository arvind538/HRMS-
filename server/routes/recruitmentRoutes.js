const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const ctrl = require("../controllers/recruitmentController");

// Job Positions
router.get("/positions", protect, ctrl.getPositions);
router.post("/positions", protect, authorize("admin", "hr"), ctrl.createPosition);
router.put("/positions/:id", protect, authorize("admin", "hr"), ctrl.updatePosition);
router.delete("/positions/:id", protect, authorize("admin"), ctrl.deletePosition);

// Candidates
router.get("/candidates", protect, ctrl.getCandidates);
router.post("/candidates", protect, authorize("admin", "hr"), ctrl.createCandidate);
router.put("/candidates/:id/status", protect, authorize("admin", "hr"), ctrl.updateCandidateStatus);
router.get("/pipeline", protect, ctrl.getPipeline);

// Interviews
router.get("/interviews", protect, ctrl.getInterviews);
router.post("/interviews", protect, authorize("admin", "hr", "manager"), ctrl.scheduleInterview);
router.put("/interviews/:id", protect, authorize("admin", "hr", "manager"), ctrl.updateInterview);
router.put("/interviews/:id/feedback", protect, authorize("admin", "hr", "manager"), ctrl.submitFeedback);

// Offers
router.get("/offers", protect, authorize("admin", "hr"), ctrl.getOffers);
router.post("/offers", protect, authorize("admin", "hr"), ctrl.createOffer);
router.put("/offers/:id/status", protect, authorize("admin", "hr"), ctrl.updateOfferStatus);

module.exports = router;