const mongoose = require("mongoose");

const CATEGORIES = ["Login & Account", "Attendance", "Leave Management", "Payroll & Salary", "Employee Profile", "Documents & ID Card", "Technical Issue", "Grievance / Complaint", "Reimbursement", "Other"];
const PRIORITIES = ["Low", "Medium", "High", "Urgent"];
const STATUSES = ["Open", "Assigned", "In Progress", "Waiting for Employee", "Resolved", "Closed"];
const SLA_HOURS = { Urgent: 4, High: 8, Medium: 24, Low: 48 };

const supportTicketSchema = new mongoose.Schema(
    {
        ticketNumber: { type: String, unique: true, index: true },
        title: { type: String, required: true, trim: true, minlength: 5, maxlength: 120 },
        description: { type: String, required: true, trim: true, minlength: 10, maxlength: 3000 },
        category: { type: String, enum: CATEGORIES, default: "Technical Issue", index: true },
        priority: { type: String, enum: PRIORITIES, default: "Medium", index: true },
        status: { type: String, enum: STATUSES, default: "Open", index: true },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
        resolutionNotes: { type: String, trim: true, maxlength: 1000, default: "" },

        dueAt: { type: Date },
        firstResponseAt: { type: Date },
        resolvedAt: { type: Date },
        closedAt: { type: Date },

        // chat summary
        messageCount: { type: Number, default: 0 },
        lastMessageAt: { type: Date, default: Date.now, index: true },
        lastMessagePreview: { type: String, trim: true, maxlength: 120, default: "" },
        unreadForStaff: { type: Number, default: 0 },
        unreadForRequester: { type: Number, default: 0 },

        // feedback from the person who raised the ticket
        rating: { type: Number, min: 1, max: 5 },
        ratingFeedback: { type: String, trim: true, maxlength: 300, default: "" },
    },
    { timestamps: true }
);

const SupportTicket = mongoose.models.SupportTicket || mongoose.model("SupportTicket", supportTicketSchema);

module.exports = SupportTicket;
module.exports.CATEGORIES = CATEGORIES;
module.exports.PRIORITIES = PRIORITIES;
module.exports.STATUSES = STATUSES;
module.exports.SLA_HOURS = SLA_HOURS;