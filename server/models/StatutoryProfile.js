const mongoose = require("mongoose");

/* The statutory details of one employee. null on a flag means "decide automatically". */
const statutorySchema = new mongoose.Schema(
    {
        employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true, unique: true },
        uan: { type: String, trim: true, default: "" }, // 12 digit PF Universal Account Number
        esicNumber: { type: String, trim: true, default: "" }, // ESIC insurance (IP) number
        pfApplicable: { type: Boolean, default: null },
        esiApplicable: { type: Boolean, default: null },
        ptApplicable: { type: Boolean, default: null },
        pfOnActualWage: { type: Boolean, default: null }, // true = PF on the full basic, false = up to the ceiling
        notes: { type: String, trim: true, maxlength: 300, default: "" },
    },
    { timestamps: true }
);

module.exports = mongoose.models.StatutoryProfile || mongoose.model("StatutoryProfile", statutorySchema);