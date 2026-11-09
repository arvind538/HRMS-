const mongoose = require("mongoose");

const jobPositionSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, trim: true, maxlength: 120 },
        department: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
        description: { type: String, trim: true, maxlength: 4000, default: "" },
        requiredSkills: [String],
        experienceRequired: { type: String, trim: true, maxlength: 60, default: "" },
        numberOfOpenings: { type: Number, default: 1, min: 1, max: 500 },
        location: { type: String, trim: true, maxlength: 120, default: "" },
        employmentType: { type: String, enum: ["full-time", "part-time", "internship", "contract"], default: "full-time" },
        salaryRange: { type: String, trim: true, maxlength: 60, default: "" },
        status: { type: String, enum: ["open", "closed", "on-hold"], default: "open", index: true },
        // Job Post: a published position is visible on the careers page and to employees
        isPublished: { type: Boolean, default: false, index: true },
        postedOn: { type: Date },
        lastDate: { type: Date },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },
    { timestamps: true }
);

module.exports = mongoose.models.JobPosition || mongoose.model("JobPosition", jobPositionSchema);
