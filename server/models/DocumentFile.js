const mongoose = require("mongoose");

/* The bytes of an uploaded document. They are kept apart so the document list stays light. */
const documentFileSchema = new mongoose.Schema(
    {
        document: { type: mongoose.Schema.Types.ObjectId, ref: "Document", required: true, index: true },
        data: { type: Buffer, required: true },
        contentType: { type: String, required: true },
    },
    { timestamps: true }
);

module.exports = mongoose.models.DocumentFile || mongoose.model("DocumentFile", documentFileSchema);