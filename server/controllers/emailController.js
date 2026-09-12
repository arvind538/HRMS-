const Email = require("../models/Email");

// Get all email logs
exports.getEmails = async (req, res) => {
    try {
        const emails = await Email.find().sort({ createdAt: -1 });
        res.status(200).json(emails);
    } catch (error) {
        res.status(500).json({ message: "Server error while fetching emails" });
    }
};

// Send and save email log
exports.sendEmail = async (req, res) => {
    try {
        const { recipient, subject, message, category } = req.body;
        if (!recipient || !subject || !message) {
            return res.status(400).json({ message: "Please provide recipient, subject, and message." });
        }

        const newEmail = await Email.create({ recipient, subject, message, category });
        res.status(201).json({ message: "Email sent successfully", email: newEmail });
    } catch (error) {
        res.status(500).json({ message: "Server error while sending email" });
    }
};

// Delete email log
exports.deleteEmail = async (req, res) => {
    try {
        await Email.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Email log deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Server error while deleting email" });
    }
};