const Announcement = require("../models/Announcement");
const Notification = require("../models/Notification");
const Message = require("../models/Message");

// ===== Announcements =====
exports.getAnnouncements = async (req, res, next) => {
    try {
        const announcements = await Announcement.find()
            .populate("postedBy", "name")
            .populate("department", "name")
            .sort({ pinned: -1, createdAt: -1 });
        res.json(announcements);
    } catch (err) {
        next(err);
    }
};

exports.createAnnouncement = async (req, res, next) => {
    try {
        const announcement = await Announcement.create({ ...req.body, postedBy: req.user.id });
        res.status(201).json(announcement);
    } catch (err) {
        next(err);
    }
};

exports.deleteAnnouncement = async (req, res, next) => {
    try {
        await Announcement.findByIdAndDelete(req.params.id);
        res.json({ message: "Announcement removed" });
    } catch (err) {
        next(err);
    }
};

// ===== Notifications =====
exports.getMyNotifications = async (req, res, next) => {
    try {
        const notifications = await Notification.find({ recipient: req.user.id }).sort({ createdAt: -1 }).limit(50);
        res.json(notifications);
    } catch (err) {
        next(err);
    }
};

exports.markNotificationRead = async (req, res, next) => {
    try {
        const notification = await Notification.findByIdAndUpdate(req.params.id, { isRead: true }, { new: true });
        res.json(notification);
    } catch (err) {
        next(err);
    }
};

exports.markAllRead = async (req, res, next) => {
    try {
        await Notification.updateMany({ recipient: req.user.id, isRead: false }, { isRead: true });
        res.json({ message: "All notifications marked as read" });
    } catch (err) {
        next(err);
    }
};

// ===== Messages =====
exports.getConversation = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const messages = await Message.find({
            $or: [
                { sender: req.user.id, receiver: userId },
                { sender: userId, receiver: req.user.id },
            ],
        }).sort({ createdAt: 1 });
        res.json(messages);
    } catch (err) {
        next(err);
    }
};

exports.sendMessage = async (req, res, next) => {
    try {
        const message = await Message.create({
            sender: req.user.id,
            receiver: req.body.receiver,
            content: req.body.content,
        });
        res.status(201).json(message);
    } catch (err) {
        next(err);
    }
};