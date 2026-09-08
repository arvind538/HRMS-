// models/ActivityLog.js

const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false }, // ✅ required: false kar dein
        action: { type: String, required: true },
        module: { type: String, required: true },
        loginAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

module.exports = mongoose.model("ActivityLog", activityLogSchema);

// const mongoose = require("mongoose");

// const activityLogSchema = new mongoose.Schema(
//     {
//         user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
//         action: { type: String, required: true }, // "created employee", "approved leave", etc.
//         module: String, // "Employee", "Leave", "Payroll"
//         ipAddress: String,
//     },
//     { timestamps: true }
// );

// module.exports = mongoose.model("ActivityLog", activityLogSchema);