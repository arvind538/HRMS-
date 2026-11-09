const mongoose = require("mongoose");

const appraisalSchema = new mongoose.Schema(
    {
        employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true, index: true },
        reviewPeriod: { type: String, required: true, trim: true, uppercase: true, maxlength: 20 }, // e.g. 2026-H1
        dueDate: { type: Date },

        selfAssessment: { type: String, trim: true, maxlength: 3000 },
        selfRating: { type: Number, min: 1, max: 5 },
        submittedSelfAt: { type: Date },

        managerAssessment: { type: String, trim: true, maxlength: 3000 },
        rating: { type: Number, min: 1, max: 5, index: true },
        strengths: { type: String, trim: true, maxlength: 1000 },
        areasOfImprovement: { type: String, trim: true, maxlength: 1000 },
        reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
        completedAt: { type: Date },

        status: { type: String, enum: ["pending-self", "pending-manager", "completed"], default: "pending-self", index: true },

        // promotion
        promotionRecommended: { type: Boolean, default: false },
        proposedDesignation: { type: String, trim: true, maxlength: 80 },
        promotionStatus: { type: String, enum: ["none", "pending", "approved", "rejected", "applied"], default: "none", index: true },
        promotionNote: { type: String, trim: true, maxlength: 300 },
        promotionDecidedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        promotionDecidedAt: { type: Date },
        promotionFrom: { type: String, trim: true },
        promotionAppliedAt: { type: Date },

        // increment
        incrementPercent: { type: Number, min: 0, max: 100 },
        incrementStatus: { type: String, enum: ["none", "pending", "approved", "rejected", "applied"], default: "none", index: true },
        incrementNote: { type: String, trim: true, maxlength: 300 },
        incrementEffectiveDate: { type: Date },
        incrementDecidedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        incrementDecidedAt: { type: Date },
        incrementPrevSalary: { type: Number },
        incrementNewSalary: { type: Number },
        incrementAppliedAt: { type: Date },
        incrementAppliedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },
    { timestamps: true }
);

appraisalSchema.index({ employee: 1, reviewPeriod: 1 });

module.exports = mongoose.models.Appraisal || mongoose.model("Appraisal", appraisalSchema);

















// const mongoose = require("mongoose");

// const appraisalSchema = new mongoose.Schema(
//     {
//         employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
//         reviewPeriod: { type: String, required: true }, // e.g. "2026-H1"
//         selfAssessment: String,
//         managerAssessment: String,
//         rating: { type: Number, min: 1, max: 5 },
//         strengths: String,
//         areasOfImprovement: String,
//         status: {
//             type: String,
//             enum: ["pending-self", "pending-manager", "completed"],
//             default: "pending-self",
//         },
//         reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
//         promotionRecommended: { type: Boolean, default: false },
//         incrementPercent: Number,
//     },
//     { timestamps: true }
// );

// module.exports = mongoose.model("Appraisal", appraisalSchema);