const User = require("../models/User");
const Employee = require("../models/Employee");
const ActivityLog = require("../models/ActivityLog");
const LoginHistory = require("../models/LoginHistory");

exports.getUsers = async (req, res, next) => {
    try {
        const { role } = req.query;
        const filter = {};
        if (role) filter.role = role;

        const users = await User.find(filter).select("-password").populate("employee", "name employeeId").sort({ createdAt: -1 });
        res.json(users);
    } catch (err) {
        next(err);
    }
};

// ✅ NAYA — Admin kisi User account ko kisi Employee record se link kar sake
exports.linkEmployee = async (req, res, next) => {
    try {
        const { employeeId } = req.body;

        const employee = await Employee.findById(employeeId);
        if (!employee) return res.status(404).json({ message: "Employee not found" });

        // Ek Employee sirf ek User se link ho — duplicate linking rokne ke liye
        const alreadyLinked = await User.findOne({ employee: employeeId });
        if (alreadyLinked && alreadyLinked._id.toString() !== req.params.id) {
            return res.status(400).json({ message: "Ye employee already kisi doosre account se linked hai" });
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { employee: employeeId },
            { new: true }
        ).select("-password").populate("employee", "name employeeId");

        if (!user) return res.status(404).json({ message: "User not found" });
        res.json(user);
    } catch (err) {
        next(err);
    }
};

exports.updateUserRole = async (req, res, next) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.id, { role: req.body.role }, { new: true }).select("-password");
        if (!user) return res.status(404).json({ message: "User not found" });
        res.json(user);
    } catch (err) {
        next(err);
    }
};

exports.toggleUserActive = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "User not found" });
        user.isActive = !user.isActive;
        await user.save();
        res.json({ message: `User ${user.isActive ? "activated" : "deactivated"}`, user });
    } catch (err) {
        next(err);
    }
};

exports.deleteUser = async (req, res, next) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: "User removed" });
    } catch (err) {
        next(err);
    }
};

exports.getLoginHistory = async (req, res, next) => {
    try {
        const { user } = req.query;
        const filter = {};
        if (user) filter.user = user;
        const history = await LoginHistory.find(filter).populate("user", "name email").sort({ loginAt: -1 }).limit(100);
        res.json(history);
    } catch (err) {
        next(err);
    }
};

exports.getActivityLogs = async (req, res, next) => {
    try {
        const { user, module } = req.query;
        const filter = {};
        if (user) filter.user = user;
        if (module) filter.module = module;
        const logs = await ActivityLog.find(filter).populate("user", "name email").sort({ createdAt: -1 }).limit(200);
        res.json(logs);
    } catch (err) {
        next(err);
    }
};



// const User = require("../models/User");
// const ActivityLog = require("../models/ActivityLog");
// const LoginHistory = require("../models/LoginHistory");

// // ===== Users CRUD =====
// exports.getUsers = async (req, res, next) => {
//     try {
//         const { role } = req.query;
//         const filter = {};
//         if (role) filter.role = role;

//         const users = await User.find(filter).select("-password").sort({ createdAt: -1 });
//         res.json(users);
//     } catch (err) {
//         next(err);
//     }
// };

// exports.updateUserRole = async (req, res, next) => {
//     try {
//         const user = await User.findByIdAndUpdate(
//             req.params.id,
//             { role: req.body.role },
//             { new: true }
//         ).select("-password");
//         if (!user) return res.status(404).json({ message: "User not found" });
//         res.json(user);
//     } catch (err) {
//         next(err);
//     }
// };

// exports.toggleUserActive = async (req, res, next) => {
//     try {
//         const user = await User.findById(req.params.id);
//         if (!user) return res.status(404).json({ message: "User not found" });

//         user.isActive = !user.isActive;
//         await user.save();
//         res.json({ message: `User ${user.isActive ? "activated" : "deactivated"}`, user });
//     } catch (err) {
//         next(err);
//     }
// };

// exports.deleteUser = async (req, res, next) => {
//     try {
//         await User.findByIdAndDelete(req.params.id);
//         res.json({ message: "User removed" });
//     } catch (err) {
//         next(err);
//     }
// };

// // ===== Login History =====
// exports.getLoginHistory = async (req, res, next) => {
//     try {
//         const { user } = req.query;
//         const filter = {};
//         if (user) filter.user = user;

//         const history = await LoginHistory.find(filter)
//             .populate("user", "name email")
//             .sort({ loginAt: -1 })
//             .limit(100);
//         res.json(history);
//     } catch (err) {
//         next(err);
//     }
// };

// // ===== Activity Logs =====
// exports.getActivityLogs = async (req, res, next) => {
//     try {
//         const { user, module } = req.query;
//         const filter = {};
//         if (user) filter.user = user;
//         if (module) filter.module = module;

//         const logs = await ActivityLog.find(filter)
//             .populate("user", "name email")
//             .sort({ createdAt: -1 })
//             .limit(200);
//         res.json(logs);
//     } catch (err) {
//         next(err);
//     }
// };