const express = require("express");
const router = express.Router();
const { getCompany, updateCompany } = require("../controllers/companyController");
const { protect, authorize } = require("../middleware/authMiddleware"); // apna auth middleware use karo agar hai

router.get("/", getCompany);
router.put("/", updateCompany);
router.get("/", protect, getCompany);
router.put("/", protect, authorize("admin"), updateCompany);

module.exports = router;