const mongoose = require("mongoose");

const TaxProfileSchema = new mongoose.Schema(
    {
        employee: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Employee",
            required: true,
            unique: true,
        },
        panNumber: {
            type: String,
            trim: true,
            uppercase: true,
            default: "",
        },
        regime: {
            type: String,
            enum: ["NEW", "OLD"],
            default: "NEW",
        },
        financialYear: {
            type: String,
            default: "2026-2027",
        },
        section80C: {
            type: Number,
            default: 0,
            max: 150000,
        },
        section80D: {
            type: Number,
            default: 0,
            max: 100000,
        },
        hraExemption: {
            type: Number,
            default: 0,
        },
        otherExemptions: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("TaxProfile", TaxProfileSchema);