const mongoose = require("mongoose");

const BonusSchema = new mongoose.Schema(
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
            enum: ["Performance", "Festival", "Retention", "Discretionary"],
            default: "Performance",
        },
        status: {
            type: String,
            enum: ["Pending", "Approved", "Paid"],
            default: "Approved",
        },
        remarks: {
            type: String,
            default: "",
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Bonus", BonusSchema);