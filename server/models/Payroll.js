const mongoose = require("mongoose");

const ALLOWANCE_KEYS = ["hra", "da", "conveyance", "medical", "special", "other"];
const DEDUCTION_KEYS = ["pf", "esi", "tds", "loan", "lop", "other"];

const n = (v) => Number(v) || 0;
const round2 = (v) => Math.round((Number(v) || 0) * 100) / 100;
const group = (keys) => Object.fromEntries(keys.map((k) => [k, { type: Number, default: 0 }]));

/* gross = basic + allowances + bonus + overtime.  net = gross - deductions + reimbursements */
function computeTotals(v) {
    const a = v.allowances || {};
    const d = v.deductions || {};
    const allowance = ALLOWANCE_KEYS.reduce((sum, k) => sum + n(a[k]), 0);
    const deduction = DEDUCTION_KEYS.reduce((sum, k) => sum + n(d[k]), 0);
    const grossSalary = round2(n(v.basicSalary) + allowance + n(v.bonus) + n(v.overtimePay));
    const totalDeductions = round2(deduction);
    return { grossSalary, totalDeductions, netSalary: round2(grossSalary - totalDeductions + n(v.reimbursement)) };
}

const payrollSchema = new mongoose.Schema(
    {
        employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
        month: { type: Number, required: true, min: 1, max: 12 },
        year: { type: Number, required: true },

        structure: { type: mongoose.Schema.Types.ObjectId, ref: "SalaryStructure" },
        structureName: { type: String, default: "" },
        monthlyGross: { type: Number, default: 0 }, // the full-month salary before any cut

        basicSalary: { type: Number, default: 0 },
        allowances: group(ALLOWANCE_KEYS),
        deductions: group(DEDUCTION_KEYS),
        bonus: { type: Number, default: 0 },
        overtimePay: { type: Number, default: 0 },
        reimbursement: { type: Number, default: 0 },

        grossSalary: Number,
        totalDeductions: Number,
        netSalary: Number,

        // attendance summary
        basis: { type: String, enum: ["attendance", "full"], default: "attendance" },
        daysInMonth: { type: Number, default: 0 },
        workingDays: { type: Number, default: 0 },
        daysPresent: { type: Number, default: 0 },
        daysOnLeave: { type: Number, default: 0 },
        unpaidDays: { type: Number, default: 0 },

        // one line per bonus, deduction, loan EMI and claim, so the payslip can show them by name
        items: [
            {
                _id: false,
                kind: { type: String, enum: ["bonus", "tds", "loan", "other", "claim"] },
                label: { type: String, default: "" },
                amount: { type: Number, default: 0 },
            },
        ],

        // what was taken into this payslip (settled when it is paid)
        loanBreakup: [{ _id: false, loan: { type: mongoose.Schema.Types.ObjectId, ref: "Loan" }, amount: Number }],
        bonusIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Bonus" }],
        deductionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Deduction" }],
        reimbursementIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Reimbursement" }],
        settled: { type: Boolean, default: false },

        status: { type: String, enum: ["draft", "processed", "paid"], default: "draft" },
        processedOn: Date,
        paidOn: Date,
        generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        notes: { type: String, default: "", maxlength: 500 },
    },
    { timestamps: true }
);

// one payslip per employee per month
payrollSchema.index({ employee: 1, month: 1, year: 1 }, { unique: true });

payrollSchema.statics.computeTotals = computeTotals;

payrollSchema.pre("save", function () {
    Object.assign(this, computeTotals(this));
});

module.exports = mongoose.models.Payroll || mongoose.model("Payroll", payrollSchema);



// const mongoose = require("mongoose");

// const ALLOWANCE_KEYS = ["hra", "da", "conveyance", "medical", "special", "other"];
// const DEDUCTION_KEYS = ["pf", "esi", "tds", "loan", "lop", "other"];

// const n = (v) => Number(v) || 0;
// const round2 = (v) => Math.round((Number(v) || 0) * 100) / 100;
// const group = (keys) => Object.fromEntries(keys.map((k) => [k, { type: Number, default: 0 }]));

// /* gross = basic + allowances + bonus + overtime.  net = gross - deductions + reimbursements */
// function computeTotals(v) {
//     const a = v.allowances || {};
//     const d = v.deductions || {};
//     const allowance = ALLOWANCE_KEYS.reduce((sum, k) => sum + n(a[k]), 0);
//     const deduction = DEDUCTION_KEYS.reduce((sum, k) => sum + n(d[k]), 0);
//     const grossSalary = round2(n(v.basicSalary) + allowance + n(v.bonus) + n(v.overtimePay));
//     const totalDeductions = round2(deduction);
//     return { grossSalary, totalDeductions, netSalary: round2(grossSalary - totalDeductions + n(v.reimbursement)) };
// }

// const payrollSchema = new mongoose.Schema(
//     {
//         employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
//         month: { type: Number, required: true, min: 1, max: 12 },
//         year: { type: Number, required: true },

//         structure: { type: mongoose.Schema.Types.ObjectId, ref: "SalaryStructure" },
//         structureName: { type: String, default: "" },
//         monthlyGross: { type: Number, default: 0 }, // the full-month salary before any cut

//         basicSalary: { type: Number, default: 0 },
//         allowances: group(ALLOWANCE_KEYS),
//         deductions: group(DEDUCTION_KEYS),
//         bonus: { type: Number, default: 0 },
//         overtimePay: { type: Number, default: 0 },
//         reimbursement: { type: Number, default: 0 },

//         grossSalary: Number,
//         totalDeductions: Number,
//         netSalary: Number,

//         // attendance summary
//         basis: { type: String, enum: ["attendance", "full"], default: "attendance" },
//         daysInMonth: { type: Number, default: 0 },
//         workingDays: { type: Number, default: 0 },
//         daysPresent: { type: Number, default: 0 },
//         daysOnLeave: { type: Number, default: 0 },
//         unpaidDays: { type: Number, default: 0 },

//         // what was taken into this payslip (settled when it is paid)
//         loanBreakup: [{ _id: false, loan: { type: mongoose.Schema.Types.ObjectId, ref: "Loan" }, amount: Number }],
//         bonusIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Bonus" }],
//         deductionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Deduction" }],
//         reimbursementIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Reimbursement" }],
//         settled: { type: Boolean, default: false },

//         status: { type: String, enum: ["draft", "processed", "paid"], default: "draft" },
//         processedOn: Date,
//         paidOn: Date,
//         generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
//         notes: { type: String, default: "", maxlength: 500 },
//     },
//     { timestamps: true }
// );

// // one payslip per employee per month
// payrollSchema.index({ employee: 1, month: 1, year: 1 }, { unique: true });

// payrollSchema.statics.computeTotals = computeTotals;

// payrollSchema.pre("save", function () {
//     Object.assign(this, computeTotals(this));
// });

// module.exports = mongoose.models.Payroll || mongoose.model("Payroll", payrollSchema);







// const mongoose = require("mongoose");

// const payrollSchema = new mongoose.Schema(
//     {
//         employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
//         month: { type: Number, required: true },
//         year: { type: Number, required: true },
//         basicSalary: { type: Number, required: true },
//         allowances: {
//             hra: { type: Number, default: 0 },
//             conveyance: { type: Number, default: 0 },
//             medical: { type: Number, default: 0 },
//             other: { type: Number, default: 0 },
//         },
//         deductions: {
//             pf: { type: Number, default: 0 },
//             esi: { type: Number, default: 0 },
//             tds: { type: Number, default: 0 },
//             loan: { type: Number, default: 0 },
//             other: { type: Number, default: 0 },
//         },
//         bonus: { type: Number, default: 0 },
//         overtimePay: { type: Number, default: 0 },
//         grossSalary: Number,
//         totalDeductions: Number,
//         netSalary: Number,
//         daysPresent: Number,
//         daysOnLeave: Number,
//         status: { type: String, enum: ["draft", "processed", "paid"], default: "draft" },
//         paidOn: Date,
//     },
//     { timestamps: true }
// );

// // FIX: "next" parameter hataya — Mongoose 7+ mein synchronous hooks ko callback nahi chahiye
// payrollSchema.pre("save", function () {
//     const allowanceTotal =
//         this.allowances.hra + this.allowances.conveyance + this.allowances.medical + this.allowances.other;
//     const deductionTotal =
//         this.deductions.pf + this.deductions.esi + this.deductions.tds + this.deductions.loan + this.deductions.other;

//     this.grossSalary = this.basicSalary + allowanceTotal + this.bonus + this.overtimePay;
//     this.totalDeductions = deductionTotal;
//     this.netSalary = this.grossSalary - deductionTotal;
//     // next() ki zaroorat nahi — function khatam hote hi Mongoose khud aage badh jaayega
// });

// module.exports = mongoose.model("Payroll", payrollSchema);


// // const mongoose = require("mongoose");

// // const payrollSchema = new mongoose.Schema(
// //     {
// //         employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
// //         month: { type: Number, required: true }, // 1-12
// //         year: { type: Number, required: true },
// //         basicSalary: { type: Number, required: true },
// //         allowances: {
// //             hra: { type: Number, default: 0 },
// //             conveyance: { type: Number, default: 0 },
// //             medical: { type: Number, default: 0 },
// //             other: { type: Number, default: 0 },
// //         },
// //         deductions: {
// //             pf: { type: Number, default: 0 },
// //             esi: { type: Number, default: 0 },
// //             tds: { type: Number, default: 0 },
// //             loan: { type: Number, default: 0 },
// //             other: { type: Number, default: 0 },
// //         },
// //         bonus: { type: Number, default: 0 },
// //         overtimePay: { type: Number, default: 0 },
// //         grossSalary: Number,
// //         totalDeductions: Number,
// //         netSalary: Number,
// //         daysPresent: Number,
// //         daysOnLeave: Number,
// //         status: { type: String, enum: ["draft", "processed", "paid"], default: "draft" },
// //         paidOn: Date,
// //     },
// //     { timestamps: true }
// // );

// // payrollSchema.index({ employee: 1, month: 1, year: 1 }, { unique: true });

// // // Save se pehle auto-calculate
// // payrollSchema.pre("save", function (next) {
// //     const allowanceTotal =
// //         this.allowances.hra + this.allowances.conveyance + this.allowances.medical + this.allowances.other;
// //     const deductionTotal =
// //         this.deductions.pf + this.deductions.esi + this.deductions.tds + this.deductions.loan + this.deductions.other;

// //     this.grossSalary = this.basicSalary + allowanceTotal + this.bonus + this.overtimePay;
// //     this.totalDeductions = deductionTotal;
// //     this.netSalary = this.grossSalary - deductionTotal;
// //     next();
// // });

// // module.exports = mongoose.model("Payroll", payrollSchema);