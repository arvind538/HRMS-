const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware"); // apna auth middleware
const { getMyTickets, createTicket } = require("../controllers/supportController");

router.get("/tickets", protect, getMyTickets);
router.post("/tickets", protect, createTicket);

module.exports = router;