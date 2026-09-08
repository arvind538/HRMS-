const mongoose = require("mongoose");

const leaveSchema = new mongoose.Schema(
    {
        employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
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
        approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
        approvedOn: Date,
        rejectionReason: String,
    },
    { timestamps: true }
);

module.exports = mongoose.model("Leave", leaveSchema);