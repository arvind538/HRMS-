const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const { getStatus, getEmails, previewAudience, sendEmail, deleteEmail } = require("../controllers/emailController");

router.use(protect, authorize("admin", "hr"));

router.get("/status", getStatus);
router.get("/", getEmails);
router.post("/audience", previewAudience);
router.post("/", sendEmail);
router.delete("/:id", deleteEmail);

module.exports = router;




