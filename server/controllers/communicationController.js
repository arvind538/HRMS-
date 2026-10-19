const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const Announcement = require("../models/Announcement");
const Notification = require("../models/Notification");
const Message = require("../models/Message");
const User = require("../models/User");
const { resolveUserId } = require("../utils/accessScope");
const { notify, announcementAudience } = require("../utils/notify");

const MESSAGE_MAX = 2000;
const CHAT_DIR = "/uploads/chat/";

/* A small, safe description of a person for the chat lists */
const contactShape = (u) => ({
    _id: u._id,
    name: u.employee?.name || u.name || "",
    role: u.role || "",
    employeeId: u.employee?.employeeId || "",
});
const withContactFields = (query) => query.select("name role employee").populate("employee", "employeeId name");

/* A message as shown in the chat list (never leaks deleted content) */
const lastShape = (m) => ({
    content: m.isDeleted ? "" : m.content,
    image: m.isDeleted ? "" : m.image || "",
    isDeleted: Boolean(m.isDeleted),
    createdAt: m.createdAt,
    sender: String(m.sender),
    isRead: Boolean(m.isRead),
});

/* delete an uploaded chat image from disk (only inside /uploads/chat) */
const removeFile = (url) => {
    const rel = typeof url === "string" ? url : url?.image;
    if (!rel || !rel.startsWith(CHAT_DIR)) return;
    fs.unlink(path.join(__dirname, "..", rel), () => { });
};

/* ============================ Announcements ============================ */

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

// exports.createAnnouncement = async (req, res, next) => {
//     try {
//         const { postedBy, _id, createdAt, updatedAt, ...body } = req.body;
//         const announcement = await Announcement.create({ ...body, postedBy: req.user._id });
//         res.status(201).json(announcement);
//     } catch (err) {
//         next(err);
//     }
// // }

exports.createAnnouncement = async (req, res, next) => {
    try {
        const { postedBy, _id, createdAt, updatedAt, ...body } = req.body;
        const announcement = await Announcement.create({ ...body, postedBy: req.user._id });

        // Tell the audience (the poster is left out)
        const ids = await announcementAudience({
            audience: body.audience,
            department: body.department,
            targetRole: body.targetRole,
        });
        await notify(ids, {
            type: "announcement",
            title: `New announcement: ${String(body.title || "").slice(0, 90)}`,
            message: String(body.content || "").slice(0, 160),
            exclude: req.user._id,
        });

        res.status(201).json(announcement);
    } catch (err) {
        next(err);
    }
};

exports.deleteAnnouncement = async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(404).json({ message: "Announcement not found." });
        }
        const removed = await Announcement.findByIdAndDelete(req.params.id);
        if (!removed) return res.status(404).json({ message: "Announcement not found." });
        res.json({ message: "Announcement removed" });
    } catch (err) {
        next(err);
    }
};

/* ============================= Notifications ============================ */

exports.getMyNotifications = async (req, res, next) => {
    try {
        const notifications = await Notification.find({ recipient: req.user._id }).sort({ createdAt: -1 }).limit(100);
        res.status(200).json(notifications);
    } catch (err) {
        next(err);
    }
};

exports.getUnreadNotificationCount = async (req, res, next) => {
    try {
        const count = await Notification.countDocuments({ recipient: req.user._id, isRead: { $ne: true } });
        res.json({ count });
    } catch (err) {
        next(err);
    }
};


// exports.getUnreadNotificationCount = async (req, res, next) => {
//     try {
//         const count = await Notification.countDocuments({ recipient: req.user._id, isRead: { $ne: true } });
//         res.json({ count });
//     } catch (err) {
//         next(err);
//     }
// };

// A person can mark only their own notification as read
exports.markNotificationRead = async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(404).json({ message: "Notification not found." });
        }
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, recipient: req.user._id },
            { isRead: true },
            { new: true }
        );
        if (!notification) return res.status(404).json({ message: "Notification not found." });
        res.json(notification);
    } catch (err) {
        next(err);
    }
};

exports.markAllRead = async (req, res, next) => {
    try {
        await Notification.updateMany({ recipient: req.user._id, isRead: false }, { isRead: true });
        res.json({ message: "All notifications marked as read" });
    } catch (err) {
        next(err);
    }
};

/* ============================ Internal chat ============================= */

// @route GET /api/communication/contacts   (everyone you can start a chat with - never the admin)
exports.getContacts = async (req, res, next) => {
    try {
        const users = await withContactFields(
            User.find({
                _id: { $ne: req.user._id },
                role: { $ne: "admin" },
                isActive: { $ne: false },
            })
        )
            .sort({ name: 1 })
            .lean();
        res.json(users.map(contactShape));
    } catch (err) {
        next(err);
    }
};

// @route GET /api/communication/conversations   (chat list: last message and unread count)
exports.getConversations = async (req, res, next) => {
    try {
        const me = req.user._id;

        const rows = await Message.aggregate([
            {
                $match: {
                    $or: [{ sender: me }, { receiver: me }],
                    deletedFor: { $ne: me }, // hide chats messages that I deleted "for me"
                },
            },
            { $sort: { createdAt: -1 } },
            {
                $group: {
                    _id: { $cond: [{ $eq: ["$sender", me] }, "$receiver", "$sender"] },
                    last: { $first: "$$ROOT" },
                    unread: {
                        $sum: {
                            $cond: [{ $and: [{ $eq: ["$receiver", me] }, { $ne: ["$isRead", true] }] }, 1, 0],
                        },
                    },
                },
            },
            { $sort: { "last.createdAt": -1 } },
            { $limit: 200 },
        ]);

        const users = await withContactFields(User.find({ _id: { $in: rows.map((r) => r._id) } })).lean();
        const byId = new Map(users.map((u) => [String(u._id), contactShape(u)]));
        const hideAdmin = req.user.role !== "admin";

        const chats = rows
            .filter((r) => byId.has(String(r._id)))
            .filter((r) => !(hideAdmin && byId.get(String(r._id)).role === "admin"))
            .map((r) => ({
                user: byId.get(String(r._id)),
                unread: r.unread,
                lastMessage: lastShape(r.last),
            }));

        res.json(chats);
    } catch (err) {
        next(err);
    }
};

// @route GET /api/communication/messages/:userId?limit=
exports.getConversation = async (req, res, next) => {
    try {
        const other = await resolveUserId(req.params.userId);
        if (!other) return res.status(404).json({ message: "Person not found." });

        const otherUser = await User.findById(other).select("role").lean();
        if (!otherUser) return res.status(404).json({ message: "Person not found." });
        if (otherUser.role === "admin" && req.user.role !== "admin") {
            return res.status(403).json({ message: "You cannot open this conversation." });
        }

        const me = req.user._id;
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 200, 1), 500);

        const latest = await Message.find({
            $or: [
                { sender: me, receiver: other },
                { sender: other, receiver: me },
            ],
            deletedFor: { $ne: me },
        })
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();

        res.json(latest.reverse());
    } catch (err) {
        next(err);
    }
};

// @route POST /api/communication/messages   multipart: { receiver, content, image? }
exports.sendMessage = async (req, res, next) => {
    const discardUpload = () => req.file && removeFile(`${CHAT_DIR}${req.file.filename}`);
    const reject = (status, message) => {
        discardUpload();
        return res.status(status).json({ message });
    };

    try {
        if (req.user.role === "admin") return reject(403, "Admin cannot send messages.");

        const content = String(req.body.content ?? "").trim();
        if (!content && !req.file) return reject(400, "Please type a message or attach an image.");
        if (content.length > MESSAGE_MAX) {
            return reject(400, `A message cannot be longer than ${MESSAGE_MAX} characters.`);
        }

        const receiverId = await resolveUserId(req.body.receiver);
        if (!receiverId) return reject(404, "Recipient not found.");
        if (receiverId === String(req.user._id)) return reject(400, "You cannot send a message to yourself.");

        const receiver = await User.findById(receiverId).select("role isActive").lean();
        if (!receiver || receiver.isActive === false) return reject(400, "This person's account is not active.");
        if (receiver.role === "admin") return reject(403, "You cannot message this user.");

        const message = await Message.create({
            sender: req.user._id,
            receiver: receiverId,
            content,
            image: req.file ? `${CHAT_DIR}${req.file.filename}` : "",
        });
        res.status(201).json(message);
    } catch (err) {
        discardUpload();
        next(err);
    }
};

// @route PUT /api/communication/messages/:userId/read
exports.markConversationRead = async (req, res, next) => {
    try {
        const other = await resolveUserId(req.params.userId);
        if (!other) return res.status(404).json({ message: "Person not found." });

        const result = await Message.updateMany(
            { sender: other, receiver: req.user._id, isRead: { $ne: true } },
            { $set: { isRead: true, readAt: new Date() } }
        );
        res.json({ updated: result.modifiedCount || 0 });
    } catch (err) {
        next(err);
    }
};

// @route GET /api/communication/unread-count
exports.getUnreadCount = async (req, res, next) => {
    try {
        const count = await Message.countDocuments({
            receiver: req.user._id,
            isRead: { $ne: true },
            deletedFor: { $ne: req.user._id },
        });
        res.json({ count });
    } catch (err) {
        next(err);
    }
};

// @route DELETE /api/communication/messages   { ids: [], forEveryone: bool }
exports.deleteMessages = async (req, res, next) => {
    try {
        const ids = (Array.isArray(req.body.ids) ? req.body.ids : [])
            .filter((id) => mongoose.isValidObjectId(id))
            .slice(0, 500);
        if (!ids.length) return res.status(400).json({ message: "No messages selected." });

        const me = req.user._id;
        const isAdmin = req.user.role === "admin";

        if (req.body.forEveryone) {
            // admin can remove any message, everyone else only their own
            const filter = isAdmin ? { _id: { $in: ids } } : { _id: { $in: ids }, sender: me };
            const withImages = await Message.find({ ...filter, image: { $exists: true, $ne: "" } }).select("image").lean();
            const result = await Message.updateMany(filter, { $set: { isDeleted: true, content: "", image: "" } });
            withImages.forEach(removeFile);
            return res.json({ success: true, updated: result.modifiedCount || 0 });
        }

        // "delete for me": hidden only for this person, and only in chats they belong to
        const result = await Message.updateMany(
            { _id: { $in: ids }, $or: [{ sender: me }, { receiver: me }] },
            { $addToSet: { deletedFor: me } }
        );
        res.json({ success: true, updated: result.modifiedCount || 0 });
    } catch (err) {
        next(err);
    }
};

/* ============================ Admin monitoring =========================== */

// @route GET /api/communication/admin/conversations   (every chat between two people)
exports.adminConversations = async (req, res, next) => {
    try {
        const rows = await Message.aggregate([
            {
                $addFields: {
                    pair: {
                        $cond: [{ $lt: ["$sender", "$receiver"] }, ["$sender", "$receiver"], ["$receiver", "$sender"]],
                    },
                },
            },
            { $sort: { createdAt: -1 } },
            { $group: { _id: "$pair", last: { $first: "$$ROOT" }, total: { $sum: 1 } } },
            { $sort: { "last.createdAt": -1 } },
            { $limit: 300 },
        ]);

        const ids = [...new Set(rows.flatMap((r) => r._id.map(String)))];
        const users = await withContactFields(User.find({ _id: { $in: ids } })).lean();
        const byId = new Map(users.map((u) => [String(u._id), contactShape(u)]));

        const out = rows
            .filter((r) => r._id.every((id) => byId.has(String(id))))
            .map((r) => ({
                users: r._id.map((id) => byId.get(String(id))),
                total: r.total,
                lastMessage: lastShape(r.last),
            }));

        res.json(out);
    } catch (err) {
        next(err);
    }
};

// @route GET /api/communication/admin/messages/:a/:b?limit=
exports.adminMessages = async (req, res, next) => {
    try {
        const { a, b } = req.params;
        if (!mongoose.isValidObjectId(a) || !mongoose.isValidObjectId(b)) {
            return res.status(404).json({ message: "Conversation not found." });
        }
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 300, 1), 500);

        const latest = await Message.find({
            $or: [
                { sender: a, receiver: b },
                { sender: b, receiver: a },
            ],
        })
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();

        res.json(latest.reverse());
    } catch (err) {
        next(err);
    }
};




