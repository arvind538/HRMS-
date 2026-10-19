const mongoose = require("mongoose");

// Links an employee to a salary structure. The salary amount itself lives on the employee profile.
const EmployeeSalarySchema = new mongoose.Schema(
    {
        employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true, unique: true },
        salaryStructure: { type: mongoose.Schema.Types.ObjectId, ref: "SalaryStructure" },
        annualCTC: { type: Number, default: 0 },
        grossMonthly: { type: Number, default: 0 },
        status: { type: String, enum: ["Active", "Inactive", "On Hold"], default: "Active" },
        effectiveDate: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

module.exports = mongoose.models.EmployeeSalary || mongoose.model("EmployeeSalary", EmployeeSalarySchema);










// const mongoose = require("mongoose");

// const EmployeeSalarySchema = new mongoose.Schema(
//     {
//         employee: {
//             type: mongoose.Schema.Types.ObjectId,
//             ref: "Employee",
//             required: true,
//             unique: true,
//         },
//         salaryStructure: {
//             type: mongoose.Schema.Types.ObjectId,
//             ref: "SalaryStructure",
//         },
//         annualCTC: {
//             type: Number,
//             required: true,
//         },
//         grossMonthly: {
//             type: Number,
//             required: true,
//         },
//         status: {
//             type: String,
//             enum: ["Active", "Inactive", "On Hold"],
//             default: "Active",
//         },
//         effectiveDate: {
//             type: Date,
//             default: Date.now,
//         },
//     },
//     { timestamps: true }
// );

// module.exports = mongoose.model("EmployeeSalary", EmployeeSalarySchema);