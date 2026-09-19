const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User", // Agar aapka model 'Employee' hai toh yahan "Employee" likhein
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    checkIn: {
        type: Date
    },
    checkOut: {
        type: Date
    },
    workHours: {
        type: String
    },
    status: {
        type: String,
        default: "present"
    },
    isLate: {
        type: Boolean,
        default: false
    },
    isEarlyLeaving: {
        type: Boolean,
        default: false
    },
    notes: {
        type: String,
        default: ""
    },
    remarks: {
        type: String,
        default: ""
    }
}, { timestamps: true });

module.exports = mongoose.model("Attendance", attendanceSchema);