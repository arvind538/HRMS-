const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const { getStatus, getSms, previewAudience, sendSms, deleteSms } = require("../controllers/smsController");

router.use(protect, authorize("admin", "hr"));

router.get("/status", getStatus);
router.get("/", getSms);
router.post("/audience", previewAudience);
router.post("/", sendSms);
router.delete("/:id", deleteSms);

module.exports = router;










// const express = require("express");
// const router = express.Router();
// const { getSms, sendSms, deleteSms } = require("../controllers/smsController");
// const { protect } = require("../middleware/authMiddleware");

// router.route("/").get(protect, getSms).post(protect, sendSms);
// router.route("/:id").delete(protect, deleteSms);

// module.exports = router;