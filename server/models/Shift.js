const mongoose = require("mongoose");

const shiftSchema = new mongoose.Schema(
    {
        name: { type: String, required: true }, // "Morning", "Night", "General"
        startTime: { type: String, required: true }, // "09:30"
        endTime: { type: String, required: true }, // "18:30"
        isNightShift: { type: Boolean, default: false },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Shift", shiftSchema);