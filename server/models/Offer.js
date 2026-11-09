const mongoose = require("mongoose");

const offerSchema = new mongoose.Schema(
    {
        candidate: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate", required: true, index: true },
        jobPosition: { type: mongoose.Schema.Types.ObjectId, ref: "JobPosition" },
        designation: { type: String, required: true, trim: true, maxlength: 120 },

        // job ya internship
        offerType: { type: String, enum: ["job", "internship"], default: "job", index: true },

        // job offers ke liye
        annualCtc: { type: Number, min: 0, default: 0 }, // internship: 0

        // internship offers ke liye
        durationMonths: {
            type: Number,
            min: 1,
            max: 24,
            required: function () { return this.offerType === "internship"; },
        },
        stipend: { type: Number, min: 0, default: 0 }, // 0 = completely unpaid

        // work details
        workMode: { type: String, enum: ["office", "remote", "hybrid"], default: "office" },
        location: { type: String, trim: true, maxlength: 250, default: "" },
        officeTiming: { type: String, trim: true, maxlength: 60, default: "" },
        department: { type: String, trim: true, maxlength: 80, default: "" },
        reportingTo: { type: String, trim: true, maxlength: 80, default: "" },

        // dates
        interviewDate: { type: Date, default: null },
        offerDate: { type: Date, default: Date.now },
        joiningDate: { type: Date },
        validTill: { type: Date },

        status: { type: String, enum: ["draft", "sent", "accepted", "declined", "withdrawn"], default: "sent", index: true },
        respondedOn: { type: Date },
        notes: { type: String, trim: true, maxlength: 1000, default: "" },

        // the offer letter PDF made in Documents > Offer Letters (optional)
        document: { type: mongoose.Schema.Types.ObjectId, ref: "Document" },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },
    { timestamps: true }
);

// internship me CTC hamesha 0, job me stipend/duration ki zaroorat nahi
offerSchema.pre("validate", function () {
    if (this.offerType === "internship") {
        this.annualCtc = 0;
    } else {
        this.stipend = 0;
        this.durationMonths = undefined;
    }
    // next();
});

module.exports = mongoose.models.Offer || mongoose.model("Offer", offerSchema);









// const mongoose = require("mongoose");

// const offerSchema = new mongoose.Schema(
//     {
//         candidate: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate", required: true, index: true },
//         jobPosition: { type: mongoose.Schema.Types.ObjectId, ref: "JobPosition" },
//         designation: { type: String, required: true, trim: true, maxlength: 120 },
//         annualCtc: { type: Number, min: 0, default: 0 },
//         offerDate: { type: Date, default: Date.now },
//         joiningDate: { type: Date },
//         validTill: { type: Date },
//         status: { type: String, enum: ["draft", "sent", "accepted", "declined", "withdrawn"], default: "sent", index: true },
//         respondedOn: { type: Date },
//         notes: { type: String, trim: true, maxlength: 1000, default: "" },
//         // the offer letter PDF made in Documents > Offer Letters (optional)
//         document: { type: mongoose.Schema.Types.ObjectId, ref: "Document" },
//         createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
//     },
//     { timestamps: true }
// );

// module.exports = mongoose.models.Offer || mongoose.model("Offer", offerSchema);

