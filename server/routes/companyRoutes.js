const express = require("express");
const router = express.Router();
const { getCompany, updateCompany } = require("../controllers/companyController");
const { protect, authorize } = require("../middleware/authMiddleware");

// Public ya Protected GET route (Agar aap chahte hain ki authenticated users hi company profile dekhein)
router.route("/")
    .get(protect, getCompany)
    .put(protect, authorize("admin", "hr"), updateCompany); // Admin ya HR hi company profile update kar sakte hain

module.exports = router;