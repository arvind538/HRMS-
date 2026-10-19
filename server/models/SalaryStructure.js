const mongoose = require("mongoose");

const percent = (extra = {}) => ({
    type: Number,
    min: [0, "Percent cannot be negative"],
    max: [100, "Percent cannot be more than 100"],
    ...extra,
});

const SalaryStructureSchema = new mongoose.Schema(
    {
        name: { type: String, required: [true, "Structure name is required"], trim: true, maxlength: 60, unique: true },
        // these four must add up to exactly 100
        basicPercent: percent({ required: [true, "Basic percent is required"] }),
        hraPercent: percent({ required: [true, "HRA percent is required"] }),
        daPercent: percent({ default: 0 }),
        specialPercent: percent({ required: [true, "Special allowance percent is required"] }),
        // deductions (0 = not applied). Check the rates with your CA.
        pfPercent: percent({ default: 0 }), // % of basic
        esiPercent: percent({ default: 0 }), // % of gross
        // used for every employee who has no structure assigned
        isDefault: { type: Boolean, default: false },
    },
    { timestamps: true }
);

SalaryStructureSchema.pre("validate", function () {
    const total = ["basicPercent", "hraPercent", "daPercent", "specialPercent"].reduce((sum, key) => sum + (Number(this[key]) || 0), 0);
    if (Math.abs(total - 100) > 0.01) {
        this.invalidate("basicPercent", `Basic + HRA + DA + Special must be exactly 100% (now ${Math.round(total * 100) / 100}%)`);
    }
});

module.exports = mongoose.models.SalaryStructure || mongoose.model("SalaryStructure", SalaryStructureSchema);