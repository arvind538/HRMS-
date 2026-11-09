const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const ctrl = require("../controllers/settingsController");

router.get("/", protect, ctrl.getSettings);
router.put("/", protect, authorize("admin"), ctrl.updateSettings); // Sirf admin hi settings update kar sakta hai

module.exports = router;