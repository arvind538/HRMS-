const mongoose = require("mongoose");

const schema = new mongoose.Schema(
    {
        date: { type: String, required: true, unique: true, match: /^\d{4}-\d{2}-\d{2}$/ }, // India day, YYYY-MM-DD
        name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
        reason: { type: String, trim: true, maxlength: 300, default: "" },
        status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },
        requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        decidedAt: { type: Date },
        decisionNote: { type: String, trim: true, maxlength: 300, default: "" },
    },
    { timestamps: true }
);

module.exports = mongoose.models.CompanyOffDay || mongoose.model("CompanyOffDay", schema);