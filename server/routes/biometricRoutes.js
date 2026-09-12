const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { getDevices, addDevice, syncDevice } = require("../controllers/biometricController");

router.get("/devices", protect, getDevices);
router.post("/devices", protect, addDevice);
router.post("/sync/:id", protect, syncDevice);

module.exports = router;