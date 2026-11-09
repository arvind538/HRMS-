const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const ctrl = require("../controllers/communicationController");

// Announcements
router.get("/announcements", protect, ctrl.getAnnouncements);
router.post("/announcements", protect, authorize("admin", "hr"), ctrl.createAnnouncement);
router.delete("/announcements/:id", protect, authorize("admin", "hr"), ctrl.deleteAnnouncement);

// Notifications (the fixed paths must stay above the ones with :id)
router.get("/notifications/unread-count", protect, ctrl.getUnreadNotificationCount);
router.get("/notifications", protect, ctrl.getMyNotifications);
router.put("/notifications/mark-all-read", protect, ctrl.markAllRead);
router.put("/notifications/:id/read", protect, ctrl.markNotificationRead);

// Internal chat
router.get("/contacts", protect, ctrl.getContacts);
router.get("/conversations", protect, ctrl.getConversations);
router.get("/unread-count", protect, ctrl.getUnreadCount);
router.get("/messages/:userId", protect, ctrl.getConversation);
router.put("/messages/:userId/read", protect, ctrl.markConversationRead);
router.post("/messages", protect, ctrl.sendMessage);

module.exports = router;

