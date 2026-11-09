const mongoose = require("mongoose");

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

const historySchema = new mongoose.Schema(
    {
        status: String,
        note: { type: String, maxlength: 200, default: "" },
        by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        at: { type: Date, default: Date.now },
    },
    { _id: false }
);

const candidateSchema = new mongoose.Schema(
    {
        name: { type: String, required: [true, "Candidate name is required"], trim: true, minlength: 2, maxlength: 80 },
        email: {
            type: String,
            required: [true, "Candidate email is required"],
            trim: true,
            lowercase: true,
            maxlength: 120,
            match: [EMAIL_REGEX, "Please enter a valid email address"],
            index: true,
        },
        // only digits and + are kept ("98765 43210" and "98765-43210" become 9876543210)
        phone: { type: String, trim: true, maxlength: 20, default: "", set: (v) => String(v ?? "").replace(/[^\d+]/g, "") },

        // OPTIONAL: a candidate added by hand (Interview Schedule / Offer Letters) may not have a job position yet
        jobPosition: { type: mongoose.Schema.Types.ObjectId, ref: "JobPosition", default: null, index: true },

        experience: { type: String, trim: true, maxlength: 60, default: "" },
        currentCompany: { type: String, trim: true, maxlength: 80, default: "" },
        expectedCtc: { type: String, trim: true, maxlength: 40, default: "" },
        noticePeriod: { type: String, trim: true, maxlength: 40, default: "" },
        source: { type: String, enum: ["referral", "job-portal", "linkedin", "walk-in", "manual", "other"], default: "other" },
        status: {
            type: String,
            enum: ["applied", "shortlisted", "interview-scheduled", "interviewed", "offered", "hired", "rejected"],
            default: "applied",
            index: true,
        },
        notes: { type: String, trim: true, maxlength: 1000, default: "" },

        // resume: an uploaded file (kept in CandidateResume) or a link
        resumeUrl: { type: String, trim: true, maxlength: 500, default: "" },
        resumeFile: { type: mongoose.Schema.Types.ObjectId, ref: "CandidateResume" },
        resumeName: { type: String, trim: true },
        resumeSize: { type: Number },

        statusHistory: [historySchema],
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },
    { timestamps: true }
);

// a new candidate always starts with one history line, so the timeline is never empty
candidateSchema.pre("validate", async function () {
    if (this.isNew && (!this.statusHistory || this.statusHistory.length === 0)) {
        this.statusHistory = [{ status: this.status, note: "Candidate added", by: this.createdBy }];
    }
});

module.exports = mongoose.models.Candidate || mongoose.model("Candidate", candidateSchema);











// const mongoose = require("mongoose");

// const historySchema = new mongoose.Schema(
//     {
//         status: String,
//         note: { type: String, maxlength: 200, default: "" },
//         by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
//         at: { type: Date, default: Date.now },
//     },
//     { _id: false }
// );

// const candidateSchema = new mongoose.Schema(
//     {
//         name: { type: String, required: true, trim: true, maxlength: 80 },
//         email: { type: String, required: true, trim: true, lowercase: true, maxlength: 120, index: true },
//         phone: { type: String, trim: true, maxlength: 20, default: "" },
//         jobPosition: { type: mongoose.Schema.Types.ObjectId, ref: "JobPosition", required: true, index: true },
//         experience: { type: String, trim: true, maxlength: 60, default: "" },
//         currentCompany: { type: String, trim: true, maxlength: 80, default: "" },
//         expectedCtc: { type: String, trim: true, maxlength: 40, default: "" },
//         noticePeriod: { type: String, trim: true, maxlength: 40, default: "" },
//         source: { type: String, enum: ["referral", "job-portal", "linkedin", "walk-in", "other"], default: "other" },
//         status: {
//             type: String,
//             enum: ["applied", "shortlisted", "interview-scheduled", "interviewed", "offered", "hired", "rejected"],
//             default: "applied",
//             index: true,
//         },
//         notes: { type: String, trim: true, maxlength: 1000, default: "" },

//         // resume: an uploaded file (kept in CandidateResume) or a link
//         resumeUrl: { type: String, trim: true, maxlength: 500, default: "" },
//         resumeFile: { type: mongoose.Schema.Types.ObjectId, ref: "CandidateResume" },
//         resumeName: { type: String, trim: true },
//         resumeSize: { type: Number },

//         statusHistory: [historySchema],
//         createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
//     },
//     { timestamps: true }
// );

// module.exports = mongoose.models.Candidate || mongoose.model("Candidate", candidateSchema);


