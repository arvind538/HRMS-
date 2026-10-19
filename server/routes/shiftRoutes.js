const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const ctrl = require("../controllers/shiftController");

const adminHr = authorize("admin", "hr");

/* The roster can be reached by three names, so the page works whichever one it calls */
const ASSIGN_ITEM = ["/assign/:id", "/assignments/:id", "/roster/:id"];

// Dashboard
router.get("/today", protect, ctrl.getToday);

// Roster
router.get(["/roster", "/assignments"], protect, ctrl.getRoster);
router.post(["/assign", "/assignments"], protect, adminHr, ctrl.assignShift);
router.post("/assign-weekly", protect, adminHr, ctrl.assignWeeklyRoster);
router.put(ASSIGN_ITEM, protect, adminHr, ctrl.updateAssignment);
router.delete(ASSIGN_ITEM, protect, adminHr, ctrl.removeAssignment);

// Shift templates (these must stay below the fixed paths above)
router.get("/", protect, ctrl.getShifts);
router.post("/", protect, adminHr, ctrl.createShift);
router.put("/:id", protect, adminHr, ctrl.updateShift);
router.delete("/:id", protect, adminHr, ctrl.deleteShift);

module.exports = router;




// const express = require("express");
// const router = express.Router();
// const { protect, authorize } = require("../middleware/authMiddleware");
// const ctrl = require("../controllers/shiftController");

// const adminHr = authorize("admin", "hr");

// // Dashboard
// router.get("/today", protect, ctrl.getToday);

// // Roster
// router.get("/roster", protect, ctrl.getRoster);
// router.post("/assign", protect, adminHr, ctrl.assignShift);
// router.post("/assign-weekly", protect, adminHr, ctrl.assignWeeklyRoster);
// router.delete("/assign/:id", protect, adminHr, ctrl.removeAssignment);

// // Shift templates
// router.get("/", protect, ctrl.getShifts);
// router.post("/", protect, adminHr, ctrl.createShift);
// router.put("/:id", protect, adminHr, ctrl.updateShift);
// router.delete("/:id", protect, adminHr, ctrl.deleteShift);

// module.exports = router;





// const express = require("express");
// const router = express.Router();
// const { protect, authorize } = require("../middleware/authMiddleware");
// const ctrl = require("../controllers/shiftController");

// router.get("/", protect, ctrl.getShifts);
// router.post("/", protect, authorize("admin", "hr"), ctrl.createShift);
// router.put("/:id", protect, authorize("admin", "hr"), ctrl.updateShift);

// router.get("/roster", protect, ctrl.getRoster);
// router.post("/assign", protect, authorize("admin", "hr"), ctrl.assignShift);
// router.post("/assign-weekly", protect, authorize("admin", "hr"), ctrl.assignWeeklyRoster);

// module.exports = router;