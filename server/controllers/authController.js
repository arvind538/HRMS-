const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const LoginHistory = require("../models/LoginHistory"); // ✅ LoginHistory model import kiya

const generateToken = (id, role) =>
    jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "7d" });

exports.register = async (req, res, next) => {
    try {
        const { name, email, password, role } = req.body;

        const exists = await User.findOne({ email });
        if (exists) return res.status(400).json({ message: "User already exists" });

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({ name, email, password: hashedPassword, role });

        // ✅ Naya account register hone par bhi login history record save karein
        try {
            await LoginHistory.create({
                user: user._id,
                ipAddress: req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1",
                userAgent: req.headers["user-agent"] || "Unknown",
            });
        } catch (historyErr) {
            console.error("Failed to save login history on register:", historyErr);
        }

        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user._id, user.role),
        });
    } catch (err) {
        next(err);
    }
};

exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email }).populate("employee", "_id name employeeId designation department");
        if (!user) return res.status(401).json({ message: "Invalid email or password" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: "Invalid email or password" });

        // ✅ LOGIN SUCCESS HONE PAR HISTORY SAVE KAREIN
        try {
            await LoginHistory.create({
                user: user._id,
                ipAddress: req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1",
                userAgent: req.headers["user-agent"] || "Unknown",
            });
        } catch (historyErr) {
            console.error("Failed to save login history:", historyErr);
        }

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            employee: user.employee || null,
            token: generateToken(user._id, user.role),
        });
    } catch (err) {
        next(err);
    }
};

exports.getMe = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id).select("-password").populate("employee", "_id name employeeId designation department");
        res.json(user);
    } catch (err) {
        next(err);
    }
};


// const bcrypt = require("bcryptjs");
// const jwt = require("jsonwebtoken");
// const User = require("../models/User");

// const generateToken = (id, role) =>
//     jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "7d" });

// // @route POST /api/auth/register
// exports.register = async (req, res, next) => {
//     try {
//         const { name, email, password, role } = req.body;

//         const exists = await User.findOne({ email });
//         if (exists) return res.status(400).json({ message: "User already exists" });

//         const hashedPassword = await bcrypt.hash(password, 10);
//         const user = await User.create({ name, email, password: hashedPassword, role });

//         res.status(201).json({
//             _id: user._id,
//             name: user.name,
//             email: user.email,
//             role: user.role,
//             token: generateToken(user._id, user.role),
//         });
//     } catch (err) {
//         next(err);
//     }
// };

// // @route POST /api/auth/login
// exports.login = async (req, res, next) => {
//     try {
//         const { email, password } = req.body;

//         const user = await User.findOne({ email });
//         if (!user) return res.status(401).json({ message: "Invalid email or password" });

//         const isMatch = await bcrypt.compare(password, user.password);
//         if (!isMatch) return res.status(401).json({ message: "Invalid email or password" });

//         res.json({
//             _id: user._id,
//             name: user.name,
//             email: user.email,
//             role: user.role,
//             token: generateToken(user._id, user.role),
//         });
//     } catch (err) {
//         next(err);
//     }
// };

// // @route GET /api/auth/me
// exports.getMe = async (req, res, next) => {
//     try {
//         const user = await User.findById(req.user.id).select("-password");
//         res.json(user);
//     } catch (err) {
//         next(err);
//     }
// };
