const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const ctrl = require("../controllers/documentController");

router.get("/", protect, ctrl.getDocuments);
router.post("/", protect, authorize("admin", "hr"), ctrl.uploadDocument);
router.delete("/:id", protect, authorize("admin", "hr"), ctrl.deleteDocument);

module.exports = router;
