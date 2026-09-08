const mongoose = require("mongoose");

const SalaryStructureSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        basicPercent: { type: Number, required: true },
        hraPercent: { type: Number, required: true },
        daPercent: { type: Number, default: 0 },
        specialPercent: { type: Number, required: true },
    },
    { timestamps: true }
);

module.exports = mongoose.model("SalaryStructure", SalaryStructureSchema);