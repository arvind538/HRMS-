const mongoose = require("mongoose");

const CATEGORIES = [
    "Login & Account",
    "Attendance",
    "Leave Management",
    "Payroll & Salary",
    "Employee Profile",
    "Documents & ID Card",
    "Technical Issue",
    "Other",
];
const PRIORITIES = ["Low", "Medium", "High", "Urgent"];
const STATUSES = [
    "Open",
    "Assigned",
    "In Progress",
    "Waiting for Employee",
    "Resolved",
    "Closed",
];

const supportTicketSchema = new mongoose.Schema(
    {
        ticketNumber: { type: String, unique: true, index: true },
        title: { type: String, required: true, trim: true, minlength: 5, maxlength: 120 },
        description: { type: String, required: true, trim: true, minlength: 10, maxlength: 3000 },
        category: { type: String, enum: CATEGORIES, default: "Technical Issue" },
        priority: { type: String, enum: PRIORITIES, default: "Medium" },
        status: { type: String, enum: STATUSES, default: "Open" },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        resolutionNotes: { type: String, default: "" },
    },
    { timestamps: true }
);

module.exports = mongoose.model("SupportTicket", supportTicketSchema);
module.exports.CATEGORIES = CATEGORIES;
module.exports.PRIORITIES = PRIORITIES;