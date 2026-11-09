const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadDocument"); // same upload middleware as Documents (field "file", 5 MB)
const ctrl = require("../controllers/recruitmentController");
const { getCandidateOptions, quickAddCandidate } = require("../controllers/candidateOptionsController");

/* A wrong id gives a clean 404 instead of a database error */
router.param("id", (req, res, next, id) => {
    if (!/^[0-9a-fA-F]{24}$/.test(id)) return res.status(404).json({ message: "Record not found." });
    next();
});



router.get("/candidate-options", protect, authorize("admin", "hr", "manager"), getCandidateOptions);
router.post("/candidates/quick", protect, authorize("admin", "hr"), quickAddCandidate);

// ... tumhare baaki routes (/candidates, /candidates/:id, /interviews, /offers ...) iske neeche



const team = authorize("admin", "hr", "manager");
const staff = authorize("admin", "hr");
const admin = authorize("admin");

/* Public: careers page and apply form (no login) */
router.get("/public/jobs", ctrl.publicJobs);
router.post("/public/apply/:id", upload, ctrl.publicApply);

/* Dashboard cards */
router.get("/summary", protect, team, ctrl.getSummary);

/* Job positions and job posts */
router.get("/positions", protect, ctrl.getPositions);
router.post("/positions", protect, staff, ctrl.createPosition);
router.put("/positions/:id", protect, staff, ctrl.updatePosition);
router.delete("/positions/:id", protect, admin, ctrl.deletePosition);

/* Candidates and applications */
router.get("/pipeline", protect, team, ctrl.getPipeline);
router.get("/candidates", protect, team, ctrl.getCandidates);
router.post("/candidates", protect, staff, upload, ctrl.createCandidate);
router.get("/candidates/:id", protect, team, ctrl.getCandidate);
router.get("/candidates/:id/resume", protect, team, ctrl.getResume);
router.put("/candidates/:id/status", protect, staff, ctrl.updateCandidateStatus);
router.put("/candidates/:id", protect, staff, upload, ctrl.updateCandidate);
router.delete("/candidates/:id", protect, admin, ctrl.deleteCandidate);

/* Interviews (an interviewer of any role sees only their own) */
router.get("/interviews", protect, ctrl.getInterviews);
router.post("/interviews", protect, team, ctrl.scheduleInterview);
router.put("/interviews/:id/feedback", protect, ctrl.submitFeedback);
router.put("/interviews/:id", protect, team, ctrl.updateInterview);
router.delete("/interviews/:id", protect, staff, ctrl.deleteInterview);

/* Offers */
router.get("/offers", protect, staff, ctrl.getOffers);
router.post("/offers", protect, staff, ctrl.createOffer);
router.put("/offers/:id/status", protect, staff, ctrl.updateOfferStatus);
router.put("/offers/:id", protect, staff, ctrl.updateOffer);
router.delete("/offers/:id", protect, admin, ctrl.deleteOffer);

module.exports = router;
