const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema(
    {
        employeeId: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            uppercase: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        loginEmail: {
            type: String,
            lowercase: true,
            trim: true,
        },
        phone: {
            type: String,
            trim: true,
        },
        gender: {
            type: String,
            enum: ["male", "female", "other"],
            default: "male",
        },
        dateOfBirth: {
            type: Date,
        },
        bloodGroup: {
            type: String,
            trim: true,
        },
        maritalStatus: {
            type: String,
            trim: true,
        },
        avatar: {
            type: String,
            default: "",
        },

        // Job / Org Details
        designation: {
            type: String,
            required: true,
            trim: true,
        },
        department: {
            type: String,
            required: true,
            trim: true,
        },
        branch: {
            type: String,
            default: "Main Campus",
            trim: true,
        },
        employmentType: {
            type: String,
            default: "Full-time",
        },
        reportingManager: {
            type: String,
            default: null,
        },
        dateOfJoining: {
            type: Date,
        },
        employeeStatus: {
            type: String,
            default: "Active",
        },
        role: {
            type: String,
            enum: ["Employee", "Manager", "HR", "Admin"],
            default: "Employee",
        },

        // Salary & Bank Details
        salary: {
            type: Number,
            default: 0,
        },
        bankDetails: {
            bankName: { type: String, trim: true },
            accountNumber: { type: String, trim: true },
            ifscCode: { type: String, trim: true, uppercase: true },
            paymentMode: { type: String, default: "Bank Transfer" },
        },
        panNumber: {
            type: String,
            trim: true,
            uppercase: true,
            sparse: true,
            unique: true,
        },
        uanNumber: {
            type: String,
            trim: true,
        },

        // Emergency Contact
        emergencyContact: {
            name: { type: String, trim: true },
            relation: { type: String, trim: true },
            phone: { type: String, trim: true },
        },

        // Residential Address
        residentialAddress: {
            street: { type: String, trim: true },
            city: { type: String, trim: true },
            state: { type: String, trim: true },
            pincode: { type: String, trim: true },
        },

        // Education & Prior Experience
        education: {
            highestQualification: { type: String, trim: true },
            instituteName: { type: String, trim: true },
            yearOfPassing: { type: Number },
        },
        experience: {
            previousCompany: { type: String, trim: true },
            previousDesignation: { type: String, trim: true },
            years: { type: Number, default: 0 },
        },

        // Document Details
        idProofType: {
            type: String,
            trim: true,
        },
        idProofNumber: {
            type: String,
            trim: true,
            sparse: true,
            unique: true,
        },
        documents: {
            resumeUrl: { type: String, default: "" },
            resumeFileName: { type: String, default: "" },
            idProofUrl: { type: String, default: "" },
            idProofFileName: { type: String, default: "" },
        },
    },
    { timestamps: true }
);

module.exports = mongoose.models.Employee || mongoose.model("Employee", employeeSchema);