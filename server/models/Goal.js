const mongoose = require("mongoose");

const goalSchema = new mongoose.Schema(
    {
        employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
        title: { type: String, required: true },
        description: String,
        targetDate: Date,
        progress: { type: Number, default: 0, min: 0, max: 100 },
        status: { type: String, enum: ["not-started", "in-progress", "completed", "overdue"], default: "not-started" },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Goal", goalSchema);