const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema(
    {
        companyName: { type: String, default: "My Company" },
        companyLogo: String,
        officeStartTime: { type: String, default: "09:30" },
        officeEndTime: { type: String, default: "18:30" },
        weekOff: [{ type: String }], // ["Saturday", "Sunday"]
        leavePolicy: {
            sickLeaves: { type: Number, default: 12 },
            casualLeaves: { type: Number, default: 12 },
            earnedLeaves: { type: Number, default: 15 },
        },
        payrollCycle: { type: String, enum: ["monthly", "bi-weekly"], default: "monthly" },
        emailNotificationsEnabled: { type: Boolean, default: true },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Settings", settingsSchema);