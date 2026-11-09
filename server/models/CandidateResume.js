const mongoose = require("mongoose");

/* The bytes of an uploaded resume, kept apart so candidate lists stay light */
const schema = new mongoose.Schema(
    {
        candidate: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate", required: true, index: true },
        data: { type: Buffer, required: true },
        contentType: { type: String, required: true },
    },
    { timestamps: true }
);

module.exports = mongoose.models.CandidateResume || mongoose.model("CandidateResume", schema);