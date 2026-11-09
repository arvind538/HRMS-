// server/middleware/uploadAvatar.js
// File disk par nahi, memory me aati hai. Wahan se seedha Cloudinary par jati hai.
const multer = require("multer");

const fileFilter = (req, file, cb) => {
    const ok = ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype);
    cb(ok ? null : new Error("Only JPG, PNG or WebP images are allowed"), ok);
};

module.exports = multer({
    storage: multer.memoryStorage(),
    fileFilter,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
});










// const multer = require("multer");
// const path = require("path");
// const fs = require("fs");
// const crypto = require("crypto");

// const dir = path.join(__dirname, "..", "uploads", "avatars");
// fs.mkdirSync(dir, { recursive: true });

// const storage = multer.diskStorage({
//     destination: (req, file, cb) => cb(null, dir),
//     filename: (req, file, cb) => {
//         const ext = path.extname(file.originalname).toLowerCase();
//         cb(null, `${req.user.id}-${crypto.randomBytes(6).toString("hex")}${ext}`);
//     },
// });

// const fileFilter = (req, file, cb) => {
//     const ok = ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype);
//     cb(ok ? null : new Error("Sirf JPG, PNG ya WebP image allowed hai"), ok);
// };

// module.exports = multer({
//     storage,
//     fileFilter,
//     limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
// });