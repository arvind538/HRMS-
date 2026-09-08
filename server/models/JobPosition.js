const mongoose = require("mongoose");

const jobPositionSchema = new mongoose.Schema(
    {
        title: { type: String, required: true },
        department: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
        description: String,
        requiredSkills: [String],
        experienceRequired: String,
        numberOfOpenings: { type: Number, default: 1 },
        status: { type: String, enum: ["open", "closed", "on-hold"], default: "open" },
    },
    { timestamps: true }
);

module.exports = mongoose.model("JobPosition", jobPositionSchema);