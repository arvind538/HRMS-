const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
    {
        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User", // ya "Employee", aapke project ke relation ke hisab se
            required: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
        },
        message: {
            type: String,
            required: true,
            trim: true,
        },
        type: {
            type: String,
            enum: ["leave", "attendance", "payroll", "general"],
            default: "general",
        },
        isRead: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);