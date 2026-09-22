// server/models/ActivityLog.js
const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User", // User collection ka reference
        default: null
    },
    userName: {
        type: String,
        default: "Admin"
    },
    action: {
        type: String,
        required: true
    },
    module: {
        type: String,
        default: "Employee"
    },
    targetEmployee: {
        type: String,
        default: ""
    }
}, { timestamps: true });

module.exports = mongoose.models.ActivityLog || mongoose.model("ActivityLog", activityLogSchema);