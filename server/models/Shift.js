const mongoose = require("mongoose");

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/; // "09:30"

const toMin = (t) => {
    const [h, m] = String(t).split(":").map(Number);
    return h * 60 + m;
};

const shiftSchema = new mongoose.Schema(
    {
        name: { type: String, required: [true, "Shift name is required"], trim: true, maxlength: 40 }, // "Morning", "Night", "General"
        startTime: {
            type: String,
            required: [true, "Start time is required"],
            match: [TIME_RE, "Start time must look like 09:30"],
        },
        endTime: {
            type: String,
            required: [true, "End time is required"],
            match: [TIME_RE, "End time must look like 18:30"],
        },
        breakMinutes: { type: Number, default: 60, min: [0, "Break cannot be negative"], max: [600, "Break is too long"] },
        // 0 = Sunday ... 6 = Saturday. A day that is not listed here is a weekly off.
        workingDays: {
            type: [Number],
            default: [1, 2, 3, 4, 5, 6],
            // duplicates are removed and the days are kept in order
            set: (days) => [...new Set((days || []).map(Number))].filter((d) => Number.isInteger(d)).sort((a, b) => a - b),
            validate: {
                validator: (days) => days.length >= 1 && days.every((d) => d >= 0 && d <= 6),
                message: "Working days must be 0 (Sunday) to 6 (Saturday), at least one day",
            },
        },
        isNightShift: { type: Boolean, default: false },
    },
    { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// end <= start means the shift crosses midnight
shiftSchema.pre("validate", function (next) {
    if (this.startTime && this.endTime && TIME_RE.test(this.startTime) && TIME_RE.test(this.endTime)) {
        this.isNightShift = toMin(this.endTime) <= toMin(this.startTime);
    }
    next();
});

// Net working minutes (break removed). 09:30-18:30 with a 60 minute break = 480 (08h 00m)
shiftSchema.virtual("durationMinutes").get(function (next) {
    if (!this.startTime || !this.endTime) return 0;
    let diff = toMin(this.endTime) - toMin(this.startTime);
    if (diff <= 0) diff += 24 * 60;
    return Math.max(diff - (this.breakMinutes || 0), 0);
});

module.exports = mongoose.models.Shift || mongoose.model("Shift", shiftSchema);





// const mongoose = require("mongoose");

// const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/; // "09:30"

// const shiftSchema = new mongoose.Schema(
//     {
//         name: { type: String, required: true, trim: true }, // "Morning", "Night", "General"
//         startTime: { type: String, required: true, match: TIME_RE }, // "09:30"
//         endTime: { type: String, required: true, match: TIME_RE }, // "18:30"
//         breakMinutes: { type: Number, default: 60, min: 0 },
//         // 0 = Sunday ... 6 = Saturday. Isme jo din nahi hai wo "Weekly off" hai.
//         workingDays: { type: [Number], default: [1, 2, 3, 4, 5, 6] },
//         isNightShift: { type: Boolean, default: false },
//     },
//     { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
// );

// const toMin = (t) => {
//     const [h, m] = t.split(":").map(Number);
//     return h * 60 + m;
// };

// // end <= start ka matlab shift raat ko cross karti hai
// shiftSchema.pre("validate", function (next) {
//     if (this.startTime && this.endTime) {
//         this.isNightShift = toMin(this.endTime) <= toMin(this.startTime);
//     }
//     next();
// });

// // Net working minutes (break hata kar). 09:30-18:30 + 60 min break = 480 (08h 00m)
// shiftSchema.virtual("durationMinutes").get(function () {
//     if (!this.startTime || !this.endTime) return 0;
//     let diff = toMin(this.endTime) - toMin(this.startTime);
//     if (diff <= 0) diff += 24 * 60;
//     return Math.max(diff - (this.breakMinutes || 0), 0);
// });

// module.exports = mongoose.model("Shift", shiftSchema);






// const mongoose = require("mongoose");

// const shiftSchema = new mongoose.Schema(
//     {
//         name: { type: String, required: true }, // "Morning", "Night", "General"
//         startTime: { type: String, required: true }, // "09:30"
//         endTime: { type: String, required: true }, // "18:30"
//         isNightShift: { type: Boolean, default: false },
//     },
//     { timestamps: true }
// );

// module.exports = mongoose.model("Shift", shiftSchema);