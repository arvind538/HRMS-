const mongoose = require("mongoose");

const updateSchema = new mongoose.Schema(
    {
        progress: { type: Number, min: 0, max: 100 },
        currentValue: { type: Number, min: 0 },
        note: { type: String, trim: true, maxlength: 300, default: "" },
        by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        at: { type: Date, default: Date.now },
    },
    { _id: false }
);

const goalSchema = new mongoose.Schema(
    {
        employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true, index: true },
        title: { type: String, required: true, trim: true, maxlength: 150 },
        description: { type: String, trim: true, maxlength: 1000, default: "" },
        type: { type: String, enum: ["goal", "kpi"], default: "goal" },
        priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
        startDate: { type: Date },
        targetDate: { type: Date, index: true },
        // a KPI has a number to reach (for example 50 sales). Progress is worked out from it.
        targetValue: { type: Number, min: 0, default: 0 },
        currentValue: { type: Number, min: 0, default: 0 },
        unit: { type: String, trim: true, maxlength: 20, default: "" },
        progress: { type: Number, default: 0, min: 0, max: 100 },
        // "overdue" is worked out from the target date when the goal is shown, it is not stored
        status: { type: String, enum: ["not-started", "in-progress", "completed", "overdue"], default: "not-started", index: true },
        completedAt: { type: Date },
        updates: [updateSchema],
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },
    { timestamps: true }
);

module.exports = mongoose.models.Goal || mongoose.model("Goal", goalSchema);
