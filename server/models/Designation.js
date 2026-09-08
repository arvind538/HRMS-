const mongoose = require("mongoose");
const designationSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, trim: true },
        department: { type: String, trim: true },
        level: { type: String, trim: true },
        description: { type: String, trim: true },
        status: { type: String, enum: ["active", "inactive"], default: "active" },
    },
    { timestamps: true }
);
module.exports = mongoose.model("Designation", designationSchema);