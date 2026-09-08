const mongoose = require("mongoose");

const announcementSchema = new mongoose.Schema(
    {
        title: { type: String, required: true },
        content: { type: String, required: true },
        postedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        audience: { type: String, enum: ["all", "department", "specific-role"], default: "all" },
        department: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
        role: String,
        pinned: { type: Boolean, default: false },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Announcement", announcementSchema);