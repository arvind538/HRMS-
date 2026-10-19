

const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
    {
        // Both ids are User (login account) ids
        sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

        // Empty is allowed: image-only messages and "deleted for everyone" messages have no text
        content: { type: String, default: "", trim: true, maxlength: 2000 },
        image: { type: String, default: "" },

        isRead: { type: Boolean, default: false },
        readAt: { type: Date },

        isDeleted: { type: Boolean, default: false },
        deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    },
    { timestamps: true }
);

// A new message must carry text or an image
messageSchema.pre("validate", function () {
    if (!this.content && !this.image && !this.isDeleted) {
        this.invalidate("content", "A message needs text or an image.");
    }
});

messageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
messageSchema.index({ receiver: 1, isRead: 1 });
messageSchema.index({ deletedFor: 1 });

module.exports = mongoose.models.Message || mongoose.model("Message", messageSchema);

// const mongoose = require("mongoose");

// const messageSchema = new mongoose.Schema(
//     {
//         // Both ids are User (login account) ids
//         sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
//         receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
//         content: { type: String, required: true, trim: true, maxlength: 2000 },
//         isRead: { type: Boolean, default: false },
//         readAt: { type: Date },
//         image: { type: String, default: "" },
//         isDeleted: { type: Boolean, default: false },
//         deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
//     },
//     { timestamps: true }
// );

// messageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
// messageSchema.index({ receiver: 1, isRead: 1 });

// module.exports = mongoose.models.Message || mongoose.model("Message", messageSchema);



// const mongoose = require("mongoose");

// const messageSchema = new mongoose.Schema(
//     {
//         sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
//         receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
//         content: { type: String, required: true },
//         isRead: { type: Boolean, default: false },
//     },
//     { timestamps: true }
// );

// module.exports = mongoose.model("Message", messageSchema);