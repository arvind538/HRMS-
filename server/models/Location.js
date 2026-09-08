const mongoose = require("mongoose");
const locationSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        address: { type: String, trim: true },
        city: { type: String, trim: true },
        state: { type: String, trim: true },
        country: { type: String, trim: true, default: "India" },
        pincode: { type: String, trim: true },
        status: { type: String, enum: ["active", "inactive"], default: "active" },
    },
    { timestamps: true }
);
module.exports = mongoose.model("Location", locationSchema);