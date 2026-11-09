const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, trim: true, maxlength: 150 },
        description: { type: String, trim: true, maxlength: 500, default: "" },
        category: { type: String, required: true, index: true },

        // either an uploaded file (file + fileName...) or a link (fileUrl)
        fileUrl: { type: String, trim: true, maxlength: 500 },
        file: { type: mongoose.Schema.Types.ObjectId, ref: "DocumentFile" },
        fileName: { type: String, trim: true },
        fileType: { type: String, trim: true },
        fileSize: { type: Number },

        employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", default: null, index: true },
        visibility: { type: String, enum: ["specific-employee", "all-employees"], default: "all-employees" },
        audience: { type: String, enum: ["employee", "admin-hr"], default: "employee", index: true },
        docType: { type: String, trim: true, maxlength: 80, default: "" },
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    },
    { timestamps: true }
);

documentSchema.pre("validate", function () {
    if (!this.fileUrl && !this.file) this.invalidate("fileUrl", "Please upload a file or give a link.");
});

module.exports = mongoose.models.Document || mongoose.model("Document", documentSchema);