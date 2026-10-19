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




// // server/routes/emailRoutes.js
// const express = require("express");
// const router = express.Router();
// const { getEmails, sendEmail, deleteEmail } = require("../controllers/emailController");
// const { protect } = require("../middleware/authMiddleware"); // Agar authentication zaroori hai

// router.route("/").get(protect, getEmails).post(protect, sendEmail);
// router.route("/:id").delete(protect, deleteEmail);

// module.exports = router;