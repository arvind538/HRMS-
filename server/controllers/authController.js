const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const LoginHistory = require("../models/LoginHistory");

const generateToken = (id, role) =>
    jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "7d" });

// @route POST /api/auth/register
exports.register = async (req, res, next) => {
    try {
        const { name, email, password, role } = req.body;

        const exists = await User.findOne({ email });
        if (exists) return res.status(400).json({ message: "User already exists" });

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({ name, email, password: hashedPassword, role });

        // Save login history record on new account registration
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
            employee: null, // New registration ke paas employee profile nahi hoti initially
            token: generateToken(user._id, user.role),
        });
    } catch (err) {
        next(err);
    }
};

// @route POST /api/auth/login
exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email }).populate("employee", "_id name employeeId designation department");
        if (!user) return res.status(401).json({ message: "Invalid email or password" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: "Invalid email or password" });

        // Save login history on successful login
        try {
            await LoginHistory.create({
                user: user._id,
                ipAddress: req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1",
                userAgent: req.headers["user-agent"] || "Unknown",
            });
        } catch (historyErr) {
            console.error("Failed to save login history:", historyErr);
        }

        let employeeProfile = user.employee;

        // FIX: Agar user role employee hai aur profile nahi bani, toh create karte waqt 
        // department ko skip kar dein taaki ObjectId cast error na aaye.
        if (user.role === 'employee' && !employeeProfile) {
            const Employee = require("../models/Employee");
            try {
                employeeProfile = await Employee.create({
                    user: user._id,
                    name: user.name,
                    employeeId: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
                    // department field ko yahan se hata diya hai taaki ObjectId validation error na aaye
                });

                user.employee = employeeProfile._id;
                await user.save();
            } catch (createErr) {
                console.error("Failed to auto-create employee profile:", createErr.message);
            }
        }

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            employee: employeeProfile || null,
            token: generateToken(user._id, user.role),
        });
    } catch (err) {
        next(err);
    }
};
// @route GET /api/auth/me
exports.getMe = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id)
            .select("-password")
            .populate("employee", "_id name employeeId designation department");
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
