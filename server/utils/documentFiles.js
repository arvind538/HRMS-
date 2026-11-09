
const path = require("path");

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const TYPES = {
    ".pdf": {
        mime: "application/pdf",
        sig: [0x25, 0x50, 0x44, 0x46],
    },
    ".png": {
        mime: "image/png",
        sig: [0x89, 0x50, 0x4e, 0x47],
    },
    ".jpg": {
        mime: "image/jpeg",
        sig: [0xff, 0xd8, 0xff],
    },
    ".jpeg": {
        mime: "image/jpeg",
        sig: [0xff, 0xd8, 0xff],
    },
    ".doc": {
        mime: "application/msword",
        sig: [0xd0, 0xcf, 0x11, 0xe0],
    },
    ".docx": {
        mime:
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        sig: [0x50, 0x4b],
    },
    ".xls": {
        mime: "application/vnd.ms-excel",
        sig: [0xd0, 0xcf, 0x11, 0xe0],
    },
    ".xlsx": {
        mime:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        sig: [0x50, 0x4b],
    },
};

const ALLOWED_TEXT = "PDF, JPG, PNG, DOC, DOCX, XLS or XLSX";

const extOf = (name) =>
    path.extname(String(name || "")).toLowerCase();

const cleanName = (name) =>
    path
        .basename(String(name || "document"))
        .replace(/[^\w .()-]/g, "_")
        .slice(0, 120) || "document";

function checkFile(file) {
    if (!file || !file.buffer) {
        return { error: "No file was received." };
    }

    const ext = extOf(file.originalname);
    const type = TYPES[ext];

    if (!type) {
        return {
            error: `This file type is not allowed. Please upload a ${ALLOWED_TEXT} file.`,
        };
    }

    if (!file.size || file.buffer.length === 0) {
        return { error: "The file is empty." };
    }

    if (file.size > MAX_FILE_SIZE) {
        return {
            error: "The file is too large. The limit is 5 MB.",
        };
    }

    const head = [...file.buffer.subarray(0, type.sig.length)];

    if (!type.sig.every((byte, index) => head[index] === byte)) {
        return {
            error: `The content of this file does not match a ${ext} file.`,
        };
    }

    return {
        ext,
        mime: type.mime,
        name: cleanName(file.originalname),
    };
}

module.exports = {
    MAX_FILE_SIZE,
    TYPES,
    ALLOWED_TEXT,
    extOf,
    checkFile,
};