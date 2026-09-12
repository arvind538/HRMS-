const express = require("express");
const router = express.Router();
const { getOrgChart } = require("../controllers/orgChartController");
const { protect } = require("../middleware/authMiddleware");

router.get("/", protect, getOrgChart);

module.exports = router;