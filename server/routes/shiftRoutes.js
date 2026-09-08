const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const ctrl = require("../controllers/shiftController");

router.get("/", protect, ctrl.getShifts);
router.post("/", protect, authorize("admin", "hr"), ctrl.createShift);
router.put("/:id", protect, authorize("admin", "hr"), ctrl.updateShift);

router.get("/roster", protect, ctrl.getRoster);
router.post("/assign", protect, authorize("admin", "hr"), ctrl.assignShift);
router.post("/assign-weekly", protect, authorize("admin", "hr"), ctrl.assignWeeklyRoster);

module.exports = router;