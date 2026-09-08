const mongoose = require("mongoose");

const assetMaintenanceSchema = new mongoose.Schema(
    {
        asset: { type: mongoose.Schema.Types.ObjectId, ref: "Asset", required: true },
        issueDescription: { type: String, required: true },
        reportedDate: { type: Date, default: Date.now },
        resolvedDate: Date,
        cost: Number,
        status: { type: String, enum: ["reported", "in-progress", "resolved"], default: "reported" },
    },
    { timestamps: true }
);

module.exports = mongoose.model("AssetMaintenance", assetMaintenanceSchema);