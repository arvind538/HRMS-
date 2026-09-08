const mongoose = require("mongoose");

const departmentSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, unique: true, trim: true },
        code: { type: String, trim: true },
        branch: { type: String, trim: true },
        head: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
        description: String,
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Department", departmentSchema);