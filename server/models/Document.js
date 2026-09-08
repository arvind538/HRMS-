const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
    {
        title: { type: String, required: true },
        category: {
            type: String,
            enum: ["company-policy", "offer-letter", "appointment-letter", "salary-letter", "experience-letter", "joining-document", "other"],
            required: true,
        },
        // agar employee-specific document hai (offer letter, salary letter, etc.) — company-wide policy ke liye ye null rahega
        employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", default: null },
        fileUrl: { type: String, required: true },
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        visibility: { type: String, enum: ["all-employees", "specific-employee", "hr-only"], default: "specific-employee" },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Document", documentSchema);