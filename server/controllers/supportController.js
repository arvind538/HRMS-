const SupportTicket = require("../models/SupportTicket");
const { CATEGORIES, PRIORITIES } = SupportTicket;

const generateTicketNumber = () => {
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `TKT-${Date.now().toString().slice(-6)}${rand}`;
};

// GET /api/support/tickets  -> logged-in user ke apne tickets
exports.getMyTickets = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;

        const tickets = await SupportTicket.find({ createdBy: userId })
            .sort({ createdAt: -1 })
            .populate("assignedTo", "name");

        res.status(200).json({ success: true, tickets });
    } catch (error) {
        console.error("getMyTickets error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch tickets." });
    }
};

// POST /api/support/tickets
exports.createTicket = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const { title, description, category, priority } = req.body;

        if (!title || title.trim().length < 5 || title.trim().length > 120) {
            return res.status(400).json({ success: false, message: "Title must be 5-120 characters." });
        }
        if (!description || description.trim().length < 10 || description.trim().length > 3000) {
            return res.status(400).json({ success: false, message: "Description must be 10-3000 characters." });
        }
        if (!CATEGORIES.includes(category)) {
            return res.status(400).json({ success: false, message: "Invalid category." });
        }
        if (!PRIORITIES.includes(priority)) {
            return res.status(400).json({ success: false, message: "Invalid priority." });
        }

        // status, createdBy, assignedTo client se kabhi nahi lete (security)
        const ticket = await SupportTicket.create({
            ticketNumber: generateTicketNumber(),
            title: title.trim(),
            description: description.trim(),
            category,
            priority,
            createdBy: userId,
        });

        res.status(201).json({ success: true, ticket });
    } catch (error) {
        console.error("createTicket error:", error);
        res.status(500).json({ success: false, message: "Failed to create ticket." });
    }
};