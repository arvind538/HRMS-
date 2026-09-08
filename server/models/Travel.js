const mongoose = require("mongoose");

const travelSchema = new mongoose.Schema(
    {
        employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
        purpose: { type: String, required: true },
        fromLocation: { type: String, required: true },
        toLocation: { type: String, required: true },
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        modeOfTravel: { type: String, enum: ["flight", "train", "bus", "car", "other"], default: "flight" },
        estimatedCost: Number,
        actualCost: Number,
        status: { type: String, enum: ["pending", "approved", "rejected", "completed"], default: "pending" },
        approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
        approvedOn: Date,
        rejectionReason: String,
    },
    { timestamps: true }
);

module.exports = mongoose.model("Travel", travelSchema);