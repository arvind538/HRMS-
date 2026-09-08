const mongoose = require("mongoose");

const LoanSchema = new mongoose.Schema(
    {
        employee: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Employee",
            required: true,
        },
        type: {
            type: String,
            enum: ["SALARY_ADVANCE", "COMPANY_LOAN", "EMERGENCY_AID"],
            default: "SALARY_ADVANCE",
        },
        principal: {
            type: Number,
            required: true,
            min: 1,
        },
        emiMonths: {
            type: Number,
            required: true,
            min: 1,
            max: 36,
        },
        monthlyEmi: {
            type: Number,
            required: true,
        },
        remainingBalance: {
            type: Number,
            required: true,
        },
        status: {
            type: String,
            enum: ["PENDING", "ACTIVE", "COMPLETED", "REJECTED"],
            default: "PENDING",
        },
        reason: {
            type: String,
            required: true,
            trim: true,
        },
        disbursedDate: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Loan", LoanSchema);