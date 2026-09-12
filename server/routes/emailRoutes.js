// server/routes/emailRoutes.js
const express = require("express");
const router = express.Router();
const { getEmails, sendEmail, deleteEmail } = require("../controllers/emailController");
const { protect } = require("../middleware/authMiddleware"); // Agar authentication zaroori hai

router.route("/").get(protect, getEmails).post(protect, sendEmail);
router.route("/:id").delete(protect, deleteEmail);

module.exports = router;