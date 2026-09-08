const mongoose = require("mongoose");

const SalaryComponentSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        type: { type: String, enum: ["EARNING", "DEDUCTION"], required: true },
        calculationType: { type: String, enum: ["FIXED", "PERCENTAGE"], default: "FIXED" },
        isTaxable: { type: Boolean, default: true },
        description: { type: String, default: "" },
    },
    { timestamps: true }
);

module.exports = mongoose.model("SalaryComponent", SalaryComponentSchema);