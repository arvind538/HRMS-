const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema(
    {
        /* ---------- Personal ---------- */
        employeeId: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            uppercase: true,
        },
        firstName: { type: String, trim: true },
        lastName: { type: String, trim: true },
        name: { type: String, required: true, trim: true },
        // Personal email. Password reset links are sent here.
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        // Company login email (the User account uses this email to log in)
        loginEmail: { type: String, lowercase: true, trim: true },
        phone: { type: String, trim: true },
        gender: {
            type: String,
            enum: ["male", "female", "other"],
            default: "male",
        },
        timeZone: { type: String, trim: true },
        avatar: { type: String, default: "" },

        /* ---------- Address ---------- */
        address: { type: String, trim: true },
        city: { type: String, trim: true },
        state: { type: String, trim: true },
        pincode: { type: String, trim: true },

        /* ---------- Job ---------- */
        designation: { type: String, required: true, trim: true },
        department: { type: String, required: true, trim: true },
        branch: { type: String, trim: true, default: "" },
        team: { type: String, trim: true, default: "" },
        workLocation: { type: String, trim: true, default: "" },
        employmentType: { type: String, default: "Full-time" },
        // reportingManager: { type: String, default: "", trim: true },
        // models/Employee.js
        // reportingManager: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", default: null },
        reportingManager: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", default: null },
        dateOfJoining: { type: Date },
        employeeStatus: { type: String, default: "Active" },
        role: {
            type: String,
            enum: ["Employee", "Manager", "HR", "Admin"],
            default: "Employee",
        },
        salary: { type: Number, default: 0 },

        /* ---------- Exit ---------- */
        exitDate: { type: Date },
        exitReason: { type: String, trim: true },

        /* ---------- Identity ---------- */
        nationalIdType: { type: String, trim: true },
        nationalIdOther: { type: String, trim: true },
        idProofNumber: { type: String, trim: true, uppercase: true }, // old field, now holds the Aadhaar number
        aadhaarNumber: { type: String, trim: true },
        panNumber: { type: String, trim: true, uppercase: true },

        /* ---------- Documents (images as base64) ---------- */
        documents: {
            nationalIdFrontFileName: { type: String, default: "" }, // Aadhaar front
            nationalIdFrontFileData: { type: String, default: "" },
            nationalIdBackFileName: { type: String, default: "" }, // Aadhaar back
            nationalIdBackFileData: { type: String, default: "" },
            panCardFileName: { type: String, default: "" },
            panCardFileData: { type: String, default: "" },
            passportPhotoFileName: { type: String, default: "" },
            passportPhotoData: { type: String, default: "" },
        },

        /* ---------- Bank ---------- */
        bankDetails: {
            accountName: { type: String, trim: true },
            bankName: { type: String, trim: true },
            branchName: { type: String, trim: true },
            accountNumber: { type: String, trim: true },
            ifscCode: { type: String, trim: true, uppercase: true },
        },

        onboarding: {
            status: { type: String, enum: ["draft", "complete"], default: "complete" },
            step: { type: Number, default: 5 },
        },
    },
    { timestamps: true }
);

module.exports =
    mongoose.models.Employee || mongoose.model("Employee", employeeSchema);

