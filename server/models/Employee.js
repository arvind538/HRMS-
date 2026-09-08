const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema(
    {
        employeeId: { type: String, unique: true },
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, unique: true, lowercase: true },
        phone: String,
        department: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
        designation: String,
        branch: String,
        reportingManager: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
        dateOfJoining: Date,
        dateOfBirth: Date,
        gender: { type: String, enum: ["male", "female", "other"] },
        address: String,
        emergencyContact: {
            name: String,
            relation: String,
            phone: String,
        },
        salary: Number,
        profileImage: String,
        documents: [{ name: String, url: String }],
        status: { type: String, enum: ["active", "exit", "probation"], default: "active" },
        exitDate: Date,
    },
    { timestamps: true }
);

module.exports = mongoose.model("Employee", employeeSchema);