const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
    {
        employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
        category: { type: String, required: true }, // travel, food, supplies, etc.
        amount: { type: Number, required: true },
        description: String,
        expenseDate: { type: Date, required: true },
        receiptUrl: String,
        status: { type: String, enum: ["pending", "approved", "rejected", "reimbursed"], default: "pending" },
        approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
        approvedOn: Date,
        rejectionReason: String,
    },
    { timestamps: true }
);

module.exports = mongoose.model("Expense", expenseSchema);