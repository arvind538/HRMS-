const mongoose = require("mongoose");

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const settingsSchema = new mongoose.Schema(
    {
        companyName: { type: String, default: "My Company", trim: true, maxlength: 80 },
        companyAddress: { type: String, default: "", trim: true, maxlength: 200 },
        companyLogo: String,
        officeStartTime: { type: String, default: "09:30", match: TIME_RE },
        officeEndTime: { type: String, default: "18:30", match: TIME_RE },
        weekOff: { type: [{ type: String, enum: DAYS }], default: ["Sunday"] }, // for example ["Saturday", "Sunday"]
        leavePolicy: {
            sickLeaves: { type: Number, default: 12, min: 0 },
            casualLeaves: { type: Number, default: 12, min: 0 },
            earnedLeaves: { type: Number, default: 15, min: 0 },
        },
        payrollCycle: { type: String, enum: ["monthly", "bi-weekly"], default: "monthly" },
        emailNotificationsEnabled: { type: Boolean, default: true },
    },
    { timestamps: true }
);

module.exports = mongoose.models.Settings || mongoose.model("Settings", settingsSchema);





// const mongoose = require("mongoose");

// const settingsSchema = new mongoose.Schema(
//     {
//         companyName: { type: String, default: "My Company" },
//         companyLogo: String,
//         officeStartTime: { type: String, default: "09:30" },
//         officeEndTime: { type: String, default: "18:30" },
//         weekOff: [{ type: String }], // ["Saturday", "Sunday"]
//         leavePolicy: {
//             sickLeaves: { type: Number, default: 12 },
//             casualLeaves: { type: Number, default: 12 },
//             earnedLeaves: { type: Number, default: 15 },
//         },
//         payrollCycle: { type: String, enum: ["monthly", "bi-weekly"], default: "monthly" },
//         emailNotificationsEnabled: { type: Boolean, default: true },
//     },
//     { timestamps: true }
// );

// module.exports = mongoose.model("Settings", settingsSchema);