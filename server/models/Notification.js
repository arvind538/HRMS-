const mongoose = require("mongoose");

const NOTIFICATION_TTL_DAYS = 90; // old notifications are removed automatically after this many days

const notificationSchema = new mongoose.Schema(
    {
        // The login account (User id) that should see this notification. Never an Employee id.
        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 120,
        },
        message: {
            type: String,
            required: true,
            trim: true,
            maxlength: 300,
        },
        type: {
            type: String,
            enum: ["leave", "attendance", "payroll", "task", "announcement", "general"],
            default: "general",
        },
        // Where a click on the notification goes (for example "/leave" or "/tasks")
        link: {
            type: String,
            default: "",
            trim: true,
        },
        isRead: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

// Newest first for one person, and a fast unread count
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

// Automatic clean-up of old notifications
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: NOTIFICATION_TTL_DAYS * 24 * 60 * 60 });

module.exports = mongoose.models.Notification || mongoose.model("Notification", notificationSchema);