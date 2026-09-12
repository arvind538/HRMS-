const mongoose = require("mongoose");

const smsSchema = new mongoose.Schema(
    {
        recipient: { type: String, required: true },
        message: { type: String, required: true },
        category: { type: String, default: "general" },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Sms", smsSchema);