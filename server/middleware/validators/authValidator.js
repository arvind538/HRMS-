// middleware/validators/authValidator.js
const { body, validationResult } = require("express-validator");

// Ye function har validator chain ke baad chalta hai — check karta hai koi error toh nahi aaya
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // Saari errors ek clean array mein bhej rahe hain, taaki frontend field-by-field dikha sake
        return res.status(400).json({
            message: "Validation failed",
            errors: errors.array().map((err) => ({
                field: err.path,
                message: err.msg,
            })),
        });
    }
    next();
};

// ===== Register validation rules =====
exports.registerValidation = [
    body("name")
        .trim()
        .notEmpty().withMessage("Name is required")
        .isLength({ min: 3 }).withMessage("Name must be at least 3 characters")
        .matches(/^[a-zA-Z\s]+$/).withMessage("Name must be at least 3 characters required"),

    body("email")
        .trim()
        .notEmpty().withMessage("Email is required")
        .isEmail().withMessage("Invalid email format")
        .normalizeEmail(),

    body("password")
        .notEmpty().withMessage("Password is required")
        .isLength({ min: 6 }).withMessage("Password must be at least 6 characters")
        .matches(/\d/).withMessage("Password max 6 characters required"),

    body("role")
        .optional()
        .isIn(["admin", "hr", "manager", "employee"]).withMessage("Role base admin, hr, manager, or employee is required"),

    handleValidationErrors,
];

// ===== Login validation rules =====
exports.loginValidation = [
    body("email")
        .trim()
        .notEmpty().withMessage("Email is required")
        .isEmail().withMessage("email correct formate required"),

    body("password")
        .notEmpty().withMessage("Password is required"),

    handleValidationErrors,
];