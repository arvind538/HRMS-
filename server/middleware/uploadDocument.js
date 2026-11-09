
const multer = require("multer");
const {
    MAX_FILE_SIZE,
    TYPES,
    ALLOWED_TEXT,
    extOf,
} = require("../utils/documentFiles");

const upload = multer({
    storage: multer.memoryStorage(),

    limits: {
        fileSize: MAX_FILE_SIZE,
        files: 1,
    },

    fileFilter: (req, file, cb) => {
        const extension = extOf(file.originalname);

        // Allow only supported document extensions
        if (!TYPES[extension]) {
            const error = new Error(
                `This file type is not allowed. Please upload a ${ALLOWED_TEXT} file.`
            );

            error.code = "BAD_TYPE";
            return cb(error);
        }

        cb(null, true);
    },
}).single("file");

const uploadDocument = (req, res, next) => {
    upload(req, res, (err) => {
        if (!err) {
            return next();
        }

        let message = "Document upload failed.";

        if (err.code === "LIMIT_FILE_SIZE") {
            message = "The file is too large. The maximum size is 5 MB.";
        } else if (err.code === "LIMIT_FILE_COUNT") {
            message = "Only one file can be uploaded at a time.";
        } else if (err.code === "LIMIT_UNEXPECTED_FILE") {
            message = 'Invalid file field. Use the field name "file".';
        } else if (err.code === "BAD_TYPE") {
            message = err.message;
        } else if (err instanceof multer.MulterError) {
            message = err.message;
        } else if (err.message) {
            message = err.message;
        }

        return res.status(400).json({
            success: false,
            message,
        });
    });
};

module.exports = uploadDocument;
