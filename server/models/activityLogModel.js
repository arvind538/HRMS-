const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Employee", // ya "User", aapke auth system ke hisab se
            default: null
        },
        action: {
            type: String,
            required: true
        },
        module: {
            type: String,
            required: true
        },
    },
    { timestamps: true }
);

// ✅ Safe check to prevent OverwriteModelError
module.exports = mongoose.models.ActivityLog || mongoose.model("ActivityLog", activityLogSchema);