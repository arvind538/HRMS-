const mongoose = require("mongoose");

const certificationSchema = new mongoose.Schema(
    {
        employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
        training: { type: mongoose.Schema.Types.ObjectId, ref: "Training" },
        name: { type: String, required: true },
        issuedBy: String,
        issueDate: Date,
        expiryDate: Date,
        certificateUrl: String,
    },
    { timestamps: true }
);

module.exports = mongoose.model("Certification", certificationSchema);