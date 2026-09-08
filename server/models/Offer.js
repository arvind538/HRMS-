const mongoose = require("mongoose");

const offerSchema = new mongoose.Schema(
    {
        candidate: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate", required: true },
        designation: String,
        offeredSalary: Number,
        joiningDate: Date,
        status: { type: String, enum: ["draft", "sent", "accepted", "declined", "withdrawn"], default: "draft" },
        sentOn: Date,
        respondedOn: Date,
    },
    { timestamps: true }
);

module.exports = mongoose.model("Offer", offerSchema);