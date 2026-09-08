const mongoose = require("mongoose");

const interviewSchema = new mongoose.Schema(
    {
        candidate: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate", required: true },
        interviewer: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
        round: { type: String, enum: ["screening", "technical", "hr", "final"], default: "screening" },
        scheduledAt: { type: Date, required: true },
        mode: { type: String, enum: ["in-person", "video", "phone"], default: "video" },
        status: { type: String, enum: ["scheduled", "completed", "cancelled", "no-show"], default: "scheduled" },
        feedback: String,
        rating: { type: Number, min: 1, max: 5 },
        recommendation: { type: String, enum: ["hire", "reject", "next-round"], default: null },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Interview", interviewSchema);