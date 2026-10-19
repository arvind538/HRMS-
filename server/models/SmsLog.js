const mongoose = require("mongoose");

const smsLogSchema = new mongoose.Schema(
    {
        sentBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        message: { type: String, required: true, maxlength: 160 },
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

smsLogSchema.index({ createdAt: -1 });

module.exports = mongoose.models.SmsLog || mongoose.model("SmsLog", smsLogSchema);