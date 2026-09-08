const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const ctrl = require("../controllers/trainingController");

router.get("/", protect, ctrl.getTrainings);
router.post("/", protect, authorize("admin", "hr"), ctrl.createTraining);
router.put("/:id", protect, authorize("admin", "hr"), ctrl.updateTraining);
router.put("/:id/enroll", protect, ctrl.enrollEmployee);
router.delete("/:id", protect, authorize("admin", "hr"), ctrl.deleteTraining);

router.get("/certifications", protect, ctrl.getCertifications);
router.post("/certifications", protect, authorize("admin", "hr"), ctrl.addCertification);

module.exports = router;