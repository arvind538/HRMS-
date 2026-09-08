const mongoose = require("mongoose");

const shiftAssignmentSchema = new mongoose.Schema(
    {
        employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
        shift: { type: mongoose.Schema.Types.ObjectId, ref: "Shift", required: true },
        date: { type: Date, required: true },
    },
    { timestamps: true }
);

// ek employee ka ek din mein ek hi shift assignment ho
shiftAssignmentSchema.index({ employee: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("ShiftAssignment", shiftAssignmentSchema);