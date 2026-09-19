const mongoose = require("mongoose");

const leaveSchema = new mongoose.Schema(
    {
        // 💡 Note: Agar aapke project mein user model ka naam "User" hai, 
        // toh ref: "User" rakhein. Agar "Employee" hai toh "Employee" rakhein.
        employee: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User", // <-- Apne project ke mutabiq "User" ya "Employee" set karein
            required: true
        },
        leaveType: {
            type: String,
            enum: ["sick", "casual", "earned", "unpaid", "maternity", "paternity"],
            required: true,
        },
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        totalDays: Number,
        reason: { type: String, required: true },
        status: {
            type: String,
            enum: ["pending", "approved", "rejected", "cancelled"],
            default: "pending",
        },
        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User" // <-- Ise bhi same model reference dein
        },
        approvedOn: Date,
        rejectionReason: String,
    },
    { timestamps: true }
);

// Prevent overwrite model error in next.js or dev hot-reloads
module.exports = mongoose.models.Leave || mongoose.model("Leave", leaveSchema);