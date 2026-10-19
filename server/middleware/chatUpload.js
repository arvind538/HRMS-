const multer = require("multer");
const path = require("path");
const fs = require("fs");

const dir = path.join(__dirname, "..", "uploads", "chat");
fs.mkdirSync(dir, { recursive: true });

module.exports = multer({
    storage: multer.diskStorage({
        destination: dir,
        filename: (req, file, cb) =>
            cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${path.extname(file.originalname)}`),
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) =>
        file.mimetype.startsWith("image/") ? cb(null, true) : cb(new Error("Only images allowed")),
});