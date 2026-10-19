const mongoose = require("mongoose");

// Roster: kis employee ki kis din kaun si shift hai.
// date ko "YYYY-MM-DD" string rakha hai (Holiday ki tarah) taaki IST/UTC ka date-shift bug na aaye.
const shiftAssignmentSchema = new mongoose.Schema(
    {
        employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
        shift: { type: mongoose.Schema.Types.ObjectId, ref: "Shift", required: true },
        date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
        assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },
    { timestamps: true }
);

// Ek employee ki ek din me ek hi shift
shiftAssignmentSchema.index({ employee: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("ShiftAssignment", shiftAssignmentSchema);






// const mongoose = require("mongoose");

// const shiftAssignmentSchema = new mongoose.Schema(
//     {
//         employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
//         shift: { type: mongoose.Schema.Types.ObjectId, ref: "Shift", required: true },
//         date: { type: Date, required: true },
//     },
//     { timestamps: true }
// );

// // ek employee ka ek din mein ek hi shift assignment ho
// shiftAssignmentSchema.index({ employee: 1, date: 1 }, { unique: true });

// module.exports = mongoose.model("ShiftAssignment", shiftAssignmentSchema);