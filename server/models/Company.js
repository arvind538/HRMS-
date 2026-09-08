const mongoose = require("mongoose");

const companySchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true, default: "" },
        logo: { type: String, default: "" }, // URL or base64
        email: { type: String, trim: true, default: "" },
        phone: { type: String, trim: true, default: "" },
        website: { type: String, trim: true, default: "" },
        industry: { type: String, trim: true, default: "" },
        foundedYear: { type: Number, default: null },
        registrationNumber: { type: String, trim: true, default: "" },
        gstNumber: { type: String, trim: true, default: "" },
        panNumber: { type: String, trim: true, default: "" },
        address: {
            line1: { type: String, default: "" },
            city: { type: String, default: "" },
            state: { type: String, default: "" },
            country: { type: String, default: "India" },
            pincode: { type: String, default: "" },
        },
        description: { type: String, default: "" },
        socialLinks: {
            linkedin: { type: String, default: "" },
            twitter: { type: String, default: "" },
            instagram: { type: String, default: "" },
        },
        totalEmployees: { type: Number, default: 0 },
        status: { type: String, enum: ["active", "inactive"], default: "active" },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Company", companySchema);