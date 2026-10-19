const mongoose = require("mongoose");

const emailLogSchema = new mongoose.Schema(
    {
        sentBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        subject: { type: String, required: true, trim: true, maxlength: 200 },
        message: { type: String, required: true, maxlength: 5000 },
        category: { type: String, enum: ["general", "announcement", "reminder", "policy", "urgent"], default: "general" },
        audience: { type: String, enum: ["all", "department", "role", "custom"], required: true },
        audienceLabel: { type: String, default: "" },
        recipientCount: { type: Number, default: 0 },
        sentCount: { type: Number, default: 0 },
        failedCount: { type: Number, default: 0 },
        recipientsPreview: [{ _id: false, name: String, address: String }],
        status: { type: String, enum: ["sending", "sent", "partial", "failed"], default: "sending" },
        errorSummary: { type: String, default: "" },
    },
    { timestamps: true }
);

emailLogSchema.index({ createdAt: -1 });

module.exports = mongoose.models.EmailLog || mongoose.model("EmailLog", emailLogSchema);