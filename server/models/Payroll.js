const mongoose = require("mongoose");

const payrollSchema = new mongoose.Schema(
    {
        employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
        month: { type: Number, required: true },
        year: { type: Number, required: true },
        basicSalary: { type: Number, required: true },
        allowances: {
            hra: { type: Number, default: 0 },
            conveyance: { type: Number, default: 0 },
            medical: { type: Number, default: 0 },
            other: { type: Number, default: 0 },
        },
        deductions: {
            pf: { type: Number, default: 0 },
            esi: { type: Number, default: 0 },
            tds: { type: Number, default: 0 },
            loan: { type: Number, default: 0 },
            other: { type: Number, default: 0 },
        },
        bonus: { type: Number, default: 0 },
        overtimePay: { type: Number, default: 0 },
        grossSalary: Number,
        totalDeductions: Number,
        netSalary: Number,
        daysPresent: Number,
        daysOnLeave: Number,
        status: { type: String, enum: ["draft", "processed", "paid"], default: "draft" },
        paidOn: Date,
    },
    { timestamps: true }
);

// FIX: "next" parameter hataya — Mongoose 7+ mein synchronous hooks ko callback nahi chahiye
payrollSchema.pre("save", function () {
    const allowanceTotal =
        this.allowances.hra + this.allowances.conveyance + this.allowances.medical + this.allowances.other;
    const deductionTotal =
        this.deductions.pf + this.deductions.esi + this.deductions.tds + this.deductions.loan + this.deductions.other;

    this.grossSalary = this.basicSalary + allowanceTotal + this.bonus + this.overtimePay;
    this.totalDeductions = deductionTotal;
    this.netSalary = this.grossSalary - deductionTotal;
    // next() ki zaroorat nahi — function khatam hote hi Mongoose khud aage badh jaayega
});

module.exports = mongoose.model("Payroll", payrollSchema);


// const mongoose = require("mongoose");

// const payrollSchema = new mongoose.Schema(
//     {
//         employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
//         month: { type: Number, required: true }, // 1-12
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

// payrollSchema.index({ employee: 1, month: 1, year: 1 }, { unique: true });

// // Save se pehle auto-calculate
// payrollSchema.pre("save", function (next) {
//     const allowanceTotal =
//         this.allowances.hra + this.allowances.conveyance + this.allowances.medical + this.allowances.other;
//     const deductionTotal =
//         this.deductions.pf + this.deductions.esi + this.deductions.tds + this.deductions.loan + this.deductions.other;

//     this.grossSalary = this.basicSalary + allowanceTotal + this.bonus + this.overtimePay;
//     this.totalDeductions = deductionTotal;
//     this.netSalary = this.grossSalary - deductionTotal;
//     next();
// });

// module.exports = mongoose.model("Payroll", payrollSchema);