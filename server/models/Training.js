const mongoose = require("mongoose");

const trainingSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: String,
    trainer: String,
    category: String,
    startDate: Date,
    endDate: Date,
    mode: { type: String, enum: ["online", "offline", "hybrid"], default: "online" },

    // Fix: Default capacity set kar di hai taaki undefined ya 0 hone par error na aaye
    maxParticipants: { type: Number, default: 50 },

    status: { type: String, enum: ["upcoming", "ongoing", "completed", "cancelled"], default: "upcoming" },

    enrolledEmployees: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Employee"
        }
    ]
}, { timestamps: true });

// Prevent model overwrite error & schema caching issues in nodemon
module.exports = mongoose.models.Training || mongoose.model("Training", trainingSchema);