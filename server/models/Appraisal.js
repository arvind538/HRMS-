const mongoose = require("mongoose");

const appraisalSchema = new mongoose.Schema(
    {
        employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
        reviewPeriod: { type: String, required: true }, // e.g. "2026-H1"
        selfAssessment: String,
        managerAssessment: String,
        rating: { type: Number, min: 1, max: 5 },
        strengths: String,
        areasOfImprovement: String,
        status: {
            type: String,
            enum: ["pending-self", "pending-manager", "completed"],
            default: "pending-self",
        },
        reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
        promotionRecommended: { type: Boolean, default: false },
        incrementPercent: Number,
    },
    { timestamps: true }
);

module.exports = mongoose.model("Appraisal", appraisalSchema);