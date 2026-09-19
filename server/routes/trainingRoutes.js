// routes/training.routes.js
const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const ctrl = require("../controllers/trainingController");

// Training Routes
router.get("/", protect, ctrl.getTrainings);
router.get("/stats", protect, ctrl.getTrainingStats); // 👈 NEW — dashboard ke liye
router.post("/", protect, authorize("admin", "hr"), ctrl.createTraining);
router.put("/:id", protect, authorize("admin", "hr"), ctrl.updateTraining);
router.put("/:id/enroll", protect, ctrl.enrollEmployee);
router.delete("/:id", protect, authorize("admin", "hr"), ctrl.deleteTraining);

// Certification Routes
router.get("/certifications", protect, ctrl.getCertifications);
router.post("/certifications", protect, authorize("admin", "hr"), ctrl.addCertification);
router.put("/certifications/:id", protect, authorize("admin", "hr"), ctrl.updateCertification);
router.delete("/certifications/:id", protect, authorize("admin", "hr"), ctrl.deleteCertification);

module.exports = router;