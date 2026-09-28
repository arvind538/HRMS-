const mongoose = require("mongoose");

const departmentSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Department name is required"],
            unique: true,
            trim: true,
        },
        code: {
            type: String,
            trim: true,
            uppercase: true,
        },
        branch: {
            type: String,
            trim: true,
            default: "",
        },
        head: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Employee",
            default: null,
        },
        description: {
            type: String,
            trim: true,
            default: "",
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Virtual field taaki employee count dynamically populate ho sake
departmentSchema.virtual("employeeCount", {
    ref: "Employee",
    localField: "_id",
    foreignField: "department",
    count: true,
});

// Duplicate model compilation error prevention
module.exports =
    mongoose.models.Department ||
    mongoose.model("Department", departmentSchema);