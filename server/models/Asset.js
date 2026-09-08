const mongoose = require("mongoose");

const assetSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        category: { type: String, required: true }, // laptop, mobile, furniture, etc.
        serialNumber: { type: String, unique: true, sparse: true },
        purchaseDate: Date,
        purchaseCost: Number,
        assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", default: null },
        assignedDate: Date,
        returnedDate: Date,
        condition: { type: String, enum: ["new", "good", "damaged", "under-repair"], default: "new" },
        status: { type: String, enum: ["available", "assigned", "maintenance", "retired"], default: "available" },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Asset", assetSchema);