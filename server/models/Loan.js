const mongoose = require("mongoose");

const LoanSchema = new mongoose.Schema(
    {
        employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
        type: { type: String, enum: ["SALARY_ADVANCE", "COMPANY_LOAN", "EMERGENCY_AID"], default: "SALARY_ADVANCE" },
        principal: { type: Number, required: true, min: 1 },
        emiMonths: { type: Number, required: true, min: 1, max: 36 },
        monthlyEmi: { type: Number, required: true },
        remainingBalance: { type: Number, required: true },
        status: { type: String, enum: ["PENDING", "ACTIVE", "COMPLETED", "REJECTED"], default: "PENDING" },
        reason: { type: String, required: true, trim: true },
        disbursedDate: { type: Date, default: Date.now },
        // the first payslip that takes an EMI (older loans without it start in the month they were given)
        firstEmiMonth: { type: Number, min: 1, max: 12 },
        firstEmiYear: { type: Number, min: 2000, max: 2100 },
    },
    { timestamps: true }
);

module.exports = mongoose.models.Loan || mongoose.model("Loan", LoanSchema);






// const mongoose = require("mongoose");

// const LoanSchema = new mongoose.Schema(
//     {
//         employee: {
//             type: mongoose.Schema.Types.ObjectId,
//             ref: "Employee",
//             required: true,
//         },
//         type: {
//             type: String,
//             enum: ["SALARY_ADVANCE", "COMPANY_LOAN", "EMERGENCY_AID"],
//             default: "SALARY_ADVANCE",
//         },
//         principal: {
//             type: Number,
//             required: true,
//             min: 1,
//         },
//         emiMonths: {
//             type: Number,
//             required: true,
//             min: 1,
//             max: 36,
//         },
//         monthlyEmi: {
//             type: Number,
//             required: true,
//         },
//         remainingBalance: {
//             type: Number,
//             required: true,
//         },
//         status: {
//             type: String,
//             enum: ["PENDING", "ACTIVE", "COMPLETED", "REJECTED"],
//             default: "PENDING",
//         },
//         reason: {
//             type: String,
//             required: true,
//             trim: true,
//         },
//         disbursedDate: {
//             type: Date,
//             default: Date.now,
//         },
//     },
//     { timestamps: true }
// );

// module.exports = mongoose.model("Loan", LoanSchema);