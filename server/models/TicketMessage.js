const mongoose = require("mongoose");

const ticketMessageSchema = new mongoose.Schema(
    {
        ticket: { type: mongoose.Schema.Types.ObjectId, ref: "SupportTicket", required: true, index: true },
        sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        senderRole: { type: String, trim: true },
        text: { type: String, required: true, trim: true, maxlength: 2000 },
        internal: { type: Boolean, default: false }, // an HR note, hidden from the employee
        system: { type: Boolean, default: false }, // "status changed", "assigned" lines
    },
    { timestamps: true }
);

module.exports = mongoose.models.TicketMessage || mongoose.model("TicketMessage", ticketMessageSchema);