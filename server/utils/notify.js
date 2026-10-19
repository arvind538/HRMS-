const mongoose = require("mongoose");
const Notification = require("../models/Notification");
const User = require("../models/User");
const Employee = require("../models/Employee");

/* Where a click on a notification goes. Change a path here if your menu uses another one. */
// const LINKS = {
//     leave: "/leave",
//     task: "/tasks",
//     payroll: "/payroll",
//     attendance: "/attendance",
//     announcement: "/announcements",
//     general: "",
// };

const LINKS = {
    leave: "/leave", // admin, HR and manager: the Leave Dashboard where they approve
    task: "/tasks",
    payroll: "/self-service/payslips",
    attendance: "/attendance",
    announcement: "/communication/announcements",
    general: "",
};

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const isHex = (s) => /^[0-9a-fA-F]{24}$/.test(String(s || "").trim());

/* Sends one notification to one or many User ids. Never throws. Returns how many were created. */
async function notify(recipients, { title, message, type = "general", link, exclude } = {}) {
    try {
        const list = Array.isArray(recipients) ? recipients : [recipients];
        const ids = [...new Set(list.map((r) => String(r?._id || r || "")))].filter(
            (id) => mongoose.isValidObjectId(id) && id !== String(exclude || "")
        );
        if (!ids.length) return 0;

        await Notification.insertMany(
            ids.map((recipient) => ({
                recipient,
                title: String(title || "Notification").slice(0, 120),
                message: String(message || title || "").slice(0, 300),
                type,
                link: link ?? LINKS[type] ?? "",
            })),
            { ordered: false }
        );
        return ids.length;
    } catch (err) {
        console.error("Notification error:", err.message);
        return 0;
    }
}

async function userIdsByRole(roles) {
    const users = await User.find({ role: { $in: roles }, isActive: { $ne: false } }).select("_id").lean();
    return users.map((u) => String(u._id));
}

/* The login account of an employee's reporting manager (the manager is stored by name or id) */
async function managerUserIdOf(userId) {
    const user = await User.findById(userId).select("employee").lean();
    if (!user?.employee) return null;

    const emp = await Employee.findById(user.employee).select("reportingManager").lean();
    const ref = String(emp?.reportingManager?._id || emp?.reportingManager || "").trim();
    if (!ref) return null;

    const boss = isHex(ref)
        ? await Employee.findById(ref).select("_id").lean()
        : await Employee.findOne({ name: new RegExp(`^${escapeRegex(ref)}$`, "i") }).select("_id").lean();
    if (!boss) return null;

    const bossUser = await User.findOne({ employee: boss._id, isActive: { $ne: false } }).select("_id").lean();
    return bossUser ? String(bossUser._id) : null;
}

/* Admin, HR and the manager of this person (the person himself is left out) */
async function notifyApprovers(userId, payload) {
    try {
        const [staff, manager] = await Promise.all([userIdsByRole(["admin", "hr"]), managerUserIdOf(userId)]);
        const ids = [...new Set([...staff, manager].filter(Boolean))].filter((id) => id !== String(userId));
        return notify(ids, payload);
    } catch (err) {
        console.error("Approver notification error:", err.message);
        return 0;
    }
}

async function userIdOfEmployee(employeeId) {
    const user = await User.findOne({ employee: employeeId }).select("_id").lean();
    return user ? String(user._id) : null;
}

/* Payslip notification for the employee of a payroll record */
async function notifyPayroll(payroll, kind) {
    try {
        const userId = await userIdOfEmployee(payroll.employee?._id || payroll.employee);
        if (!userId) return 0;
        const period = new Date(Date.UTC(payroll.year, payroll.month - 1, 1)).toLocaleDateString("en-IN", {
            month: "long",
            year: "numeric",
            timeZone: "UTC",
        });
        return notify(userId, {
            type: "payroll",
            title: kind === "paid" ? "Salary paid" : "Payslip ready",
            message: kind === "paid" ? `Your salary for ${period} has been paid.` : `Your payslip for ${period} is ready to view.`,
        });
    } catch (err) {
        console.error("Payroll notification error:", err.message);
        return 0;
    }
}

/* User ids that an announcement is meant for */
async function announcementAudience({ audience, department, targetRole }) {
    try {
        if (audience === "department" && department) {
            const values = [String(department)];
            try {
                const label = await mongoose.model("Department").findById(department).select("name title").lean();
                if (label?.name || label?.title) values.push(label.name || label.title);
            } catch {
                /* Department model is not registered: the id alone is used */
            }
            const employees = await Employee.find({ department: { $in: values } }).select("_id").lean();
            const users = await User.find({ isActive: { $ne: false }, employee: { $in: employees.map((e) => e._id) } })
                .select("_id")
                .lean();
            return users.map((u) => String(u._id));
        }
        if (audience === "specific-role" && targetRole) return userIdsByRole([String(targetRole).toLowerCase()]);

        const users = await User.find({ isActive: { $ne: false } }).select("_id").lean();
        return users.map((u) => String(u._id));
    } catch (err) {
        console.error("Announcement audience error:", err.message);
        return [];
    }
}

module.exports = { notify, notifyApprovers, notifyPayroll, announcementAudience, userIdOfEmployee };