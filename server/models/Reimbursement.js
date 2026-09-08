const mongoose = require("mongoose");

const ReimbursementSchema = new mongoose.Schema(
    {
        employee: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Employee",
            required: true,
        },
        category: {
            type: String,
            enum: ["TRAVEL", "INTERNET", "MEAL", "TRAINING", "MEDICAL", "OTHER"],
            default: "TRAVEL",
        },
        amount: {
            type: Number,
            required: true,
            min: 1,
        },
        date: {
            type: Date,
            required: true,
            default: Date.now,
        },
        description: {
            type: String,
            required: true,
            trim: true,
        },
        status: {
            type: String,
            enum: ["PENDING", "APPROVED", "REJECTED", "PAID"],
            default: "PENDING",
        },
        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        reviewedAt: {
            type: Date,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Reimbursement", ReimbursementSchema);