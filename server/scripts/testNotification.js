// Usage:  node scripts/testNotification.js your-login-email@example.com
require("dotenv").config();
const dns = require("dns");
try {
    dns.setServers(["8.8.8.8", "8.8.4.4"]);
} catch { }

const mongoose = require("mongoose");
const User = require("../models/User");
const Notification = require("../models/Notification");

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

(async () => {
    const email = String(process.argv[2] || "").trim();
    if (!email) {
        console.log("Usage: node scripts/testNotification.js your-login-email@example.com");
        process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000, family: 4 });

    const user = await User.findOne({ email: new RegExp(`^${escapeRegex(email)}$`, "i") });
    if (!user) {
        console.log(`No user found with the login email: ${email}`);
        process.exit(1);
    }

    await Notification.create({
        recipient: user._id,
        title: "Test notification",
        message: "If you can see this in the bell, everything on the screen side is working.",
        type: "general",
    });

    const unread = await Notification.countDocuments({ recipient: user._id, isRead: { $ne: true } });
    console.log(`Notification created for ${user.name}. Unread count is now ${unread}.`);

    await mongoose.disconnect();
})().catch((err) => {
    console.error("Failed:", err.message);
    process.exit(1);
});