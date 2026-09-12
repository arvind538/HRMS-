const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const ctrl = require("../controllers/communicationController");

// ===== Announcements Routes =====
router.get("/announcements", protect, ctrl.getAnnouncements);
router.post("/announcements", protect, authorize("admin", "hr"), ctrl.createAnnouncement);
router.delete("/announcements/:id", protect, authorize("admin", "hr"), ctrl.deleteAnnouncement);

// ===== Notifications Routes =====
router.get("/notifications", protect, ctrl.getMyNotifications);
router.put("/notifications/:id/read", protect, ctrl.markNotificationRead);
router.put("/notifications/mark-all-read", protect, ctrl.markAllRead);

// ===== Internal Messages Routes =====
router.get("/messages/:userId", protect, ctrl.getConversation);
router.post("/messages", protect, ctrl.sendMessage);

module.exports = router;