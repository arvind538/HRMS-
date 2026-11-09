const mongoose = require("mongoose");

const interviewSchema = new mongoose.Schema(
    {
        candidate: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate", required: true, index: true },
        interviewer: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", index: true },
        round: { type: String, enum: ["screening", "technical", "hr", "final"], default: "screening" },
        scheduledAt: { type: Date, required: true, index: true },
        durationMins: { type: Number, default: 45, min: 15, max: 480 },
        mode: { type: String, enum: ["in-person", "video", "phone"], default: "video" },
        meetingLink: { type: String, trim: true, maxlength: 500, default: "" },
        location: { type: String, trim: true, maxlength: 200, default: "" },
        status: { type: String, enum: ["scheduled", "completed", "cancelled", "no-show"], default: "scheduled", index: true },
        notes: { type: String, trim: true, maxlength: 1000, default: "" },
        feedback: { type: String, trim: true, maxlength: 2000 },
        rating: { type: Number, min: 1, max: 5 },
        recommendation: { type: String, enum: ["hire", "reject", "next-round"], default: null },
        feedbackAt: { type: Date },
        scheduledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },
    { timestamps: true }
);

module.exports = mongoose.models.Interview || mongoose.model("Interview", interviewSchema);


