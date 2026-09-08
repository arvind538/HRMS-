const mongoose = require("mongoose");

const candidateSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        email: { type: String, required: true },
        phone: String,
        jobPosition: { type: mongoose.Schema.Types.ObjectId, ref: "JobPosition", required: true },
        resumeUrl: String,
        experience: String,
        source: { type: String, enum: ["referral", "job-portal", "linkedin", "walk-in", "other"], default: "other" },
        status: {
            type: String,
            enum: ["applied", "shortlisted", "interview-scheduled", "interviewed", "offered", "hired", "rejected"],
            default: "applied",
        },
        notes: String,
    },
    { timestamps: true }
);

module.exports = mongoose.model("Candidate", candidateSchema);