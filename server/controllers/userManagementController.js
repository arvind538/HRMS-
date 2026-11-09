const User = require("../models/User");
const Employee = require("../models/Employee");
const ActivityLog = require("../models/ActivityLog");
const LoginHistory = require("../models/LoginHistory");
const ROLES = ["employee", "manager", "hr", "admin"];
const EMP_ROLE = { employee: "Employee", manager: "Manager", hr: "HR", admin: "Admin" };
const { teamFilter } = require("../utils/teamScope");


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

// NAYA — Admin kisi User account ko kisi Employee record se link kar sake
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
        const role = String(req.body.role || "").toLowerCase();
        if (!ROLES.includes(role)) return res.status(400).json({ message: "Role must be employee, manager, hr or admin." });
        if (String(req.params.id) === String(req.user._id)) return res.status(403).json({ message: "You cannot change your own role." });

        const user = await User.findById(req.params.id).select("-password");
        if (!user) return res.status(404).json({ message: "User not found" });
        const was = user.role;

        await User.updateOne({ _id: user._id }, { $set: { role } });
        if (user.employee) await Employee.updateOne({ _id: user.employee }, { $set: { role: EMP_ROLE[role] } }); // keep the profile in step

        let note = "";
        if (was === "manager" && role !== "manager" && user.employee) {
            const emp = await Employee.findById(user.employee).select("_id name employeeId");
            const n = emp ? await Employee.countDocuments(teamFilter(emp)) : 0;
            if (n) note = ` ${n} employees still report to him. Assign them a new manager.`;
        }
        res.json({ message: `Role changed to ${role}.${note}`, user: { ...user.toObject(), role } });
    } catch (err) {
        next(err);
    }
};

exports.toggleUserActive = async (req, res, next) => {
    try {
        if (String(req.params.id) === String(req.user._id)) return res.status(403).json({ message: "You cannot deactivate your own account." });
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "User not found" });
        const isActive = user.isActive === false;
        await User.updateOne({ _id: user._id }, { $set: { isActive } });
        res.json({ message: `User ${isActive ? "activated" : "deactivated"}`, user: { ...user.toObject(), password: undefined, isActive } });
    } catch (err) {
        next(err);
    }
};

exports.deleteUser = async (req, res, next) => {
    try {
        if (String(req.params.id) === String(req.user._id)) return res.status(403).json({ message: "You cannot delete your own account." });
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "User not found" });
        if (user.role === "admin" && (await User.countDocuments({ role: "admin" })) <= 1) return res.status(409).json({ message: "This is the only admin. Create another admin first." });
        await user.deleteOne();
        res.json({ message: "User removed" });
    } catch (err) {
        next(err);
    }
};

// exports.updateUserRole = async (req, res, next) => {
//     try {
//         const user = await User.findByIdAndUpdate(req.params.id, { role: req.body.role }, { new: true }).select("-password");
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

// Login history record delete (admin / hr)
exports.deleteLoginHistory = async (req, res) => {
    try {
        const deleted = await LoginHistory.findByIdAndDelete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ message: "Login record not found." });
        }
        res.json({ message: "Login record deleted successfully." });
    } catch (err) {
        res.status(500).json({ message: "Failed to delete login record." });
    }
};