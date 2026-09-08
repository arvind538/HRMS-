const mongoose = require("mongoose");

const loginHistorySchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        ipAddress: String,
        userAgent: String,
        loginAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

module.exports = mongoose.model("LoginHistory", loginHistorySchema);