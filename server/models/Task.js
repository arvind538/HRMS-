const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, trim: true, maxlength: 150 },
        description: { type: String, trim: true, maxlength: 2000, default: "" },
        assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        priority: { type: String, enum: ["low", "medium", "high", "urgent"], default: "medium" },
        status: {
            type: String,
            enum: ["pending", "in-progress", "submitted", "completed", "cancelled"],
            default: "pending",
        },
        dueDate: { type: Date },
        completedAt: { type: Date },

        // Overall progress (0-100), updated by the employee every day
        progress: { type: Number, min: 0, max: 100, default: 0 },

        // Daily work log: one entry per day (date = "YYYY-MM-DD", India time)
        updates: [
            {
                _id: false,
                date: { type: String, required: true },
                progress: { type: Number, min: 0, max: 100, required: true },
                note: { type: String, trim: true, maxlength: 500 },
                createdAt: { type: Date, default: Date.now },
            },
        ],

        // Work submitted for review
        submission: {
            note: { type: String, trim: true, maxlength: 1000 },
            link: { type: String, trim: true, maxlength: 500 },
            submittedAt: { type: Date },
        },

        // Manager / admin review (approve or rework)
        review: {
            comment: { type: String, trim: true, maxlength: 500 },
            reviewedAt: { type: Date },
            reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        },
    },
    { timestamps: true }
);

taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ dueDate: 1 });

module.exports = mongoose.models.Task || mongoose.model("Task", taskSchema);





// const mongoose = require("mongoose");

// const taskSchema = new mongoose.Schema(
//     {
//         title: { type: String, required: true, trim: true, maxlength: 150 },
//         description: { type: String, trim: true, maxlength: 2000, default: "" },
//         assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
//         assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
//         priority: { type: String, enum: ["low", "medium", "high", "urgent"], default: "medium" },
//         status: { type: String, enum: ["pending", "in-progress", "completed", "cancelled"], default: "pending" },
//         dueDate: { type: Date },
//         completedAt: { type: Date },
//     },
//     { timestamps: true }
// );

// taskSchema.index({ assignedTo: 1, status: 1 });
// taskSchema.index({ dueDate: 1 });

// module.exports = mongoose.models.Task || mongoose.model("Task", taskSchema);