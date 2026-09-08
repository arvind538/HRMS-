const mongoose = require("mongoose");
const teamSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        department: { type: String, trim: true },
        teamLead: { type: String, trim: true },
        membersCount: { type: Number, default: 0 },
        description: { type: String, trim: true },
        status: { type: String, enum: ["active", "inactive"], default: "active" },
    },
    { timestamps: true }
);
module.exports = mongoose.model("Team", teamSchema);