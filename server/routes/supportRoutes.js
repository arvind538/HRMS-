const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const c = require("../controllers/supportController");

router.param("id", (req, res, next, id) => (/^[0-9a-fA-F]{24}$/.test(id) ? next() : res.status(404).json({ success: false, message: "Ticket not found." })));

const staff = authorize("admin", "hr");
const admin = authorize("admin");

router.get("/summary", protect, c.getSummary);
router.get("/contacts", protect, c.getContacts);

router.get("/tickets", protect, c.getTickets);
router.post("/tickets", protect, c.createTicket);
router.get("/tickets/:id", protect, c.getTicket);
router.post("/tickets/:id/messages", protect, c.postMessage);
router.put("/tickets/:id/status", protect, staff, c.setStatus);
router.put("/tickets/:id/assign", protect, staff, c.assignTicket);
router.put("/tickets/:id/close", protect, c.closeTicket);
router.put("/tickets/:id/reopen", protect, c.reopenTicket);
router.post("/tickets/:id/rating", protect, c.rateTicket);
router.put("/tickets/:id", protect, staff, c.updateTicket);
router.delete("/tickets/:id", protect, admin, c.deleteTicket);

module.exports = router;