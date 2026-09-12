const mongoose = require("mongoose");

const deviceSchema = new mongoose.Schema({
    name: { type: String, required: true },
    ipAddress: { type: String, required: true },
    port: { type: Number, default: 4370 },
    location: { type: String, required: true },
    model: { type: String, default: "ZKTeco" },
    status: { type: String, enum: ["online", "offline"], default: "online" },
    lastSync: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model("Device", deviceSchema);