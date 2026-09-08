const mongoose = require("mongoose");

const DeductionSchema = new mongoose.Schema(
    {
        employee: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Employee",
            required: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
        },
        amount: {
            type: Number,
            required: true,
            min: 1,
        },
        month: {
            type: Number,
            required: true,
            min: 1,
            max: 12,
        },
        year: {
            type: Number,
            required: true,
        },
        type: {
            type: String,
            enum: ["LOAN_RECOVERY", "TDS", "DAMAGE_PENALTY", "ADVANCE_SALARY", "OTHER"],
            default: "LOAN_RECOVERY",
        },
        status: {
            type: String,
            enum: ["Pending", "Applied", "Waived"],
            default: "Pending",
        },
        remarks: {
            type: String,
            default: "",
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Deduction", DeductionSchema);