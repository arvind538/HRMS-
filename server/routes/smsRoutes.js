const express = require("express");
const router = express.Router();
const { getSms, sendSms, deleteSms } = require("../controllers/smsController");
const { protect } = require("../middleware/authMiddleware");

router.route("/").get(protect, getSms).post(protect, sendSms);
router.route("/:id").delete(protect, deleteSms);

module.exports = router;