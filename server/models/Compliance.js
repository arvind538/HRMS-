const mongoose = require("mongoose");

const complianceSchema = new mongoose.Schema(
    {
        type: { type: String, enum: ["pf", "esi", "tds", "professional-tax", "labour"], required: true },
        kind: { type: String, enum: ["deposit", "return", "other"], default: "deposit" },
        key: { type: String, trim: true }, // set only on records made by the system, it stops duplicates
        title: { type: String, trim: true, maxlength: 150 },
        month: { type: Number, required: true, min: 1, max: 12 }, // the salary month the filing is about
        year: { type: Number, required: true },
        dueDate: { type: Date, required: true },
        status: { type: String, enum: ["pending", "filed", "overdue"], default: "pending" },

        totalAmount: Number, // what the payslips say is payable (saved when filed)
        paidAmount: Number, // what was really paid
        employeeCount: Number,
        referenceNumber: { type: String, trim: true, maxlength: 60 }, // challan, TRRN or acknowledgement number
        filedDate: Date,
        filedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        documentUrl: { type: String, trim: true, maxlength: 500 },
        notes: { type: String, trim: true, maxlength: 500 },
    },
    { timestamps: true }
);

complianceSchema.index({ key: 1 }, { unique: true, sparse: true });
complianceSchema.index({ status: 1, dueDate: 1 });
complianceSchema.index({ type: 1, year: 1, month: 1 });

module.exports = mongoose.models.Compliance || mongoose.model("Compliance", complianceSchema);








// const mongoose = require("mongoose");

// const complianceSchema = new mongoose.Schema(
//     {
//         type: { type: String, enum: ["pf", "esi", "tds", "professional-tax", "labour"], required: true },
//         month: { type: Number, required: true },
//         year: { type: Number, required: true },
//         totalAmount: Number,
//         filedDate: Date,
//         dueDate: { type: Date, required: true },
//         status: { type: String, enum: ["pending", "filed", "overdue"], default: "pending" },
//         documentUrl: String,
//         notes: String,
//     },
//     { timestamps: true }
// );

// module.exports = mongoose.model("Compliance", complianceSchema);