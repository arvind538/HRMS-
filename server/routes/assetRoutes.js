const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const ctrl = require("../controllers/assetController");

router.get("/", protect, ctrl.getAssets);
router.post("/", protect, authorize("admin", "hr"), ctrl.createAsset);
router.put("/:id/assign", protect, authorize("admin", "hr"), ctrl.assignAsset);
router.put("/:id/return", protect, authorize("admin", "hr"), ctrl.returnAsset);
router.get("/:id/history", protect, ctrl.getAssetHistory);

router.post("/maintenance", protect, authorize("admin", "hr"), ctrl.reportIssue);
router.put("/maintenance/:id/resolve", protect, authorize("admin", "hr"), ctrl.resolveIssue);

module.exports = router;