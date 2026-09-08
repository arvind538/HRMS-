const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
    {
        employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
        date: { type: Date, required: true },
        checkIn: Date,
        checkOut: Date,
        status: {
            type: String,
            enum: ["present", "absent", "half-day", "late", "on-leave"],
            default: "present",
        },
        workHours: Number,
        isLate: { type: Boolean, default: false },
        isEarlyLeaving: { type: Boolean, default: false },
        overtimeHours: { type: Number, default: 0 },
        remarks: String,
    },
    { timestamps: true }
);

// ek employee ka ek din mein ek hi attendance record ho
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", attendanceSchema);