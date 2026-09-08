const mongoose = require("mongoose");
const reportingManagerSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        email: { type: String, trim: true },
        designation: { type: String, trim: true },
        department: { type: String, trim: true },
        teamsManaged: { type: Number, default: 0 },
        reporteesCount: { type: Number, default: 0 },
        status: { type: String, enum: ["active", "inactive"], default: "active" },
    },
    { timestamps: true }
);
module.exports = mongoose.model("ReportingManager", reportingManagerSchema);