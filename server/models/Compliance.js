const mongoose = require("mongoose");

const complianceSchema = new mongoose.Schema(
    {
        type: { type: String, enum: ["pf", "esi", "tds", "professional-tax", "labour"], required: true },
        month: { type: Number, required: true },
        year: { type: Number, required: true },
        totalAmount: Number,
        filedDate: Date,
        dueDate: { type: Date, required: true },
        status: { type: String, enum: ["pending", "filed", "overdue"], default: "pending" },
        documentUrl: String,
        notes: String,
    },
    { timestamps: true }
);

module.exports = mongoose.model("Compliance", complianceSchema);