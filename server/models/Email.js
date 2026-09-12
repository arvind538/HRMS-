const mongoose = require("mongoose");

const emailSchema = new mongoose.Schema(
    {
        recipient: { type: String, required: true },
        subject: { type: String, required: true },
        message: { type: String, required: true },
        category: { type: String, default: "general" },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Email", emailSchema);