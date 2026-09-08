const mongoose = require("mongoose");

const EmployeeSalarySchema = new mongoose.Schema(
    {
        employee: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Employee",
            required: true,
            unique: true,
        },
        salaryStructure: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "SalaryStructure",
        },
        annualCTC: {
            type: Number,
            required: true,
        },
        grossMonthly: {
            type: Number,
            required: true,
        },
        status: {
            type: String,
            enum: ["Active", "Inactive", "On Hold"],
            default: "Active",
        },
        effectiveDate: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("EmployeeSalary", EmployeeSalarySchema);