const mongoose = require("mongoose");

const holidaySchema = new mongoose.Schema(
    {
        title: { type: String, required: true, trim: true },
        date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ }, // "YYYY-MM-DD"
        year: { type: String, required: true }, // "2026" (filtering ke liye)
        type: {
            type: String,
            enum: ["National", "Gazetted", "Restricted", "Regional"],
            default: "National",
        },
        description: { type: String, trim: true },
        optional: { type: Boolean, default: false },
    },
    { timestamps: true }
);

// Auto-seed do baar chal jaye (2 requests ek saath) to duplicate na bane
holidaySchema.index({ date: 1, title: 1 }, { unique: true });

module.exports = mongoose.model("Holiday", holidaySchema);





// const mongoose = require("mongoose");

// const holidaySchema = new mongoose.Schema(
//     {
//         title: { type: String, required: true, trim: true },
//         date: { type: String, required: true }, // Format: "YYYY-MM-DD"
//         year: { type: String, required: true }, // Format: "2026" (filtering ke liye)
//         type: {
//             type: String,
//             enum: ["National", "Gazetted", "Restricted", "Regional"],
//             default: "National"
//         },
//         description: { type: String, trim: true },
//         optional: { type: Boolean, default: false },
//     },
//     { timestamps: true }
// );

// module.exports = mongoose.model("Holiday", holidaySchema);