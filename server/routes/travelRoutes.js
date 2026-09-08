const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const ctrl = require("../controllers/travelController");

router.get("/", protect, ctrl.getTravelRequests);
router.post("/", protect, ctrl.createTravelRequest);
router.put("/:id/approve", protect, authorize("admin", "hr", "manager"), ctrl.approveTravelRequest);
router.put("/:id/reject", protect, authorize("admin", "hr", "manager"), ctrl.rejectTravelRequest);
router.put("/:id/complete", protect, authorize("admin", "hr"), ctrl.updateActualCost);

module.exports = router;