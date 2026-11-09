const mongoose = require("mongoose");

const coordinatesSchema = new mongoose.Schema(
    {
        lat: { type: Number },
        lng: { type: Number },
    },
    { _id: false }
);

const attendanceSchema = new mongoose.Schema(
    {
        employee: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User", // login account of the person
            required: true,
        },
        date: { type: Date, required: true },
        checkIn: { type: Date },
        checkOut: { type: Date },

        inLocation: { type: String, default: "" },
        outLocation: { type: String, default: "" },
        inCoordinates: { type: coordinatesSchema, default: undefined },
        outCoordinates: { type: coordinatesSchema, default: undefined },

        workHours: { type: String },
        status: { type: String, default: "present" },
        isLate: { type: Boolean, default: false },
        isEarlyLeaving: { type: Boolean, default: false },
        notes: { type: String, default: "" },
        remarks: { type: String, default: "" },

        /* NEW: who created / last decided this record */
        // "employee" = employee punched in himself
        // "admin"    = admin / hr / manager marked it by hand
        // "system"   = created automatically (auto absent / on leave)
        source: { type: String, enum: ["employee", "admin", "system"], default: "employee" },
        markedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },
    { timestamps: true }
);

// One record per person per day. A second record for the same day is rejected by the database itself.
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });
// Fast "who is present / absent on this date" queries
attendanceSchema.index({ date: 1, status: 1 });

module.exports = mongoose.models.Attendance || mongoose.model("Attendance", attendanceSchema);

