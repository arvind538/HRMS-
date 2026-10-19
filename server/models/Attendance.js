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
    },
    { timestamps: true }
);

// One record per person per day. A second punch in on the same day is rejected by the database itself.
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

module.exports = mongoose.models.Attendance || mongoose.model("Attendance", attendanceSchema);





// const mongoose = require("mongoose");

// const coordinatesSchema = new mongoose.Schema(
//     {
//         lat: { type: Number },
//         lng: { type: Number },
//     },
//     { _id: false }
// );

// const attendanceSchema = new mongoose.Schema(
//     {
//         employee: {
//             type: mongoose.Schema.Types.ObjectId,
//             ref: "User", // Agar aapka model 'Employee' hai toh yahan "Employee" likhein
//             required: true,
//         },
//         date: {
//             type: Date,
//             required: true,
//         },
//         checkIn: {
//             type: Date,
//         },
//         checkOut: {
//             type: Date,
//         },

//         // Punch In / Out location (readable address)
//         inLocation: {
//             type: String,
//             default: "",
//         },
//         outLocation: {
//             type: String,
//             default: "",
//         },

//         // Punch In / Out ke exact coordinates (Google Maps link ke liye)
//         inCoordinates: {
//             type: coordinatesSchema,
//             default: undefined,
//         },
//         outCoordinates: {
//             type: coordinatesSchema,
//             default: undefined,
//         },

//         workHours: {
//             type: String,
//         },
//         status: {
//             type: String,
//             default: "present",
//         },
//         isLate: {
//             type: Boolean,
//             default: false,
//         },
//         isEarlyLeaving: {
//             type: Boolean,
//             default: false,
//         },
//         notes: {
//             type: String,
//             default: "",
//         },
//         remarks: {
//             type: String,
//             default: "",
//         },
//     },
//     { timestamps: true }
// );

// module.exports = mongoose.model("Attendance", attendanceSchema);



// const mongoose = require("mongoose");

// const attendanceSchema = new mongoose.Schema({
//     employee: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "User", // Agar aapka model 'Employee' hai toh yahan "Employee" likhein
//         required: true
//     },
//     date: {
//         type: Date,
//         required: true
//     },
//     checkIn: {
//         type: Date
//     },
//     checkOut: {
//         type: Date
//     },
//     workHours: {
//         type: String
//     },
//     status: {
//         type: String,
//         default: "present"
//     },
//     isLate: {
//         type: Boolean,
//         default: false
//     },
//     isEarlyLeaving: {
//         type: Boolean,
//         default: false
//     },
//     notes: {
//         type: String,
//         default: ""
//     },
//     remarks: {
//         type: String,
//         default: ""
//     }
// }, { timestamps: true });

// module.exports = mongoose.model("Attendance", attendanceSchema);