const Sms = require("../models/Sms");

// Get all SMS logs
exports.getSms = async (req, res) => {
    try {
        const smsList = await Sms.find().sort({ createdAt: -1 });
        res.status(200).json(smsList);
    } catch (error) {
        res.status(500).json({ message: "Server error while fetching SMS logs" });
    }
};

// Send and save SMS log
exports.sendSms = async (req, res) => {
    try {
        const { recipient, message, category } = req.body;
        if (!recipient || !message) {
            return res.status(400).json({ message: "Recipient and message are required." });
        }

        const newSms = await Sms.create({ recipient, message, category });
        res.status(201).json({ message: "SMS sent successfully", sms: newSms });
    } catch (error) {
        res.status(500).json({ message: "Server error while sending SMS" });
    }
};

// Delete SMS log
exports.deleteSms = async (req, res) => {
    try {
        await Sms.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "SMS log deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Server error while deleting SMS" });
    }
};