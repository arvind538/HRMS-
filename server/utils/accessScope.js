const mongoose = require("mongoose");
const User = require("../models/User");
const Employee = require("../models/Employee");

const TZ = "Asia/Kolkata";
const DAY_MS = 24 * 60 * 60 * 1000;
const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

const lower = (v) => String(v || "").trim().toLowerCase();
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const pad2 = (n) => String(n).padStart(2, "0");

/* ------------------------- dates (India time) ------------------------- */

const ymdIST = (value = new Date()) => new Date(value).toLocaleDateString("en-CA", { timeZone: TZ });
const dayStartIST = (ymd) => new Date(`${ymd}T00:00:00.000+05:30`);

const dayRangeIST = (ymd) => {
    let day = YMD_RE.test(String(ymd || "")) ? String(ymd) : ymdIST();
    let start = dayStartIST(day);
    if (Number.isNaN(start.getTime())) {
        day = ymdIST();
        start = dayStartIST(day);
    }
    return { ymd: day, start, end: new Date(start.getTime() + DAY_MS) };
};

const monthRangeIST = (month, year) => {
    const m = Number(month);
    const y = Number(year);
    const start = dayStartIST(`${y}-${pad2(m)}-01`);
    const end = dayStartIST(`${m === 12 ? y + 1 : y}-${pad2(m === 12 ? 1 : m + 1)}-01`);
    return { start, end };
};

/* ------------------------------- roles -------------------------------- */

const roleOf = (req) => lower(req.user?.role);
const isPrivileged = (req) => ["admin", "hr"].includes(roleOf(req));

/*
 * Which ids can this user see?  null = everyone (admin, HR).
 * Attendance and leave records use the User id, payroll uses the Employee id,
 * so both ids are returned (older records may hold either one).
 */
async function getScopeIds(req) {
    const role = roleOf(req);
    if (role === "admin" || role === "hr") return null;

    const me = String(req.user._id);
    const myEmployeeId = req.user.employee ? String(req.user.employee._id || req.user.employee) : "";
    const own = [me, myEmployeeId].filter(Boolean);

    if (role !== "manager") return own;

    const profile = myEmployeeId ? await Employee.findById(myEmployeeId).select("name department").lean() : null;
    const myName = String(profile?.name || req.user.name || "").trim();

    const conditions = [];
    if (myName) conditions.push({ reportingManager: new RegExp(`^${escapeRegex(myName)}$`, "i") });
    if (profile?.department) conditions.push({ department: profile.department });
    if (!conditions.length) return own;

    const team = await Employee.find({ $or: conditions }).select("_id").lean();
    const teamIds = team.map((t) => t._id);
    const users = await User.find({ employee: { $in: teamIds } }).select("_id").lean();

    return [...new Set([...own, ...teamIds.map(String), ...users.map((u) => String(u._id))])];
}

const inScope = (ids, id) => ids === null || ids.includes(String(id?._id || id || ""));

/* ------------------------------- ids ---------------------------------- */

/* A User id or an Employee id goes in, every id of the same person comes out */
async function expandIds(id) {
    const out = new Set([String(id)]);
    if (!mongoose.isValidObjectId(id)) return [...out];
    const user = await User.findById(id).select("employee").lean();
    if (user?.employee) out.add(String(user.employee));
    const users = await User.find({ employee: id }).select("_id").lean();
    users.forEach((u) => out.add(String(u._id)));
    return [...out];
}

/* Employee id or User id in, User id out (null when the employee has no login) */
async function resolveUserId(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    const user = await User.findById(id).select("_id").lean();
    if (user) return String(user._id);
    const linked = await User.findOne({ employee: id }).select("_id").lean();
    return linked ? String(linked._id) : null;
}

/* ---------------- employee details inside any record ------------------ */

const personFromUser = (u) => ({
    _id: u._id,
    name: u.employee?.name || u.name || "",
    email: u.email || "",
    role: u.role || "",
    employeeId: u.employee?.employeeId || "",
    designation: u.employee?.designation || "",
    department: u.employee?.department || "",
});

const personFromEmployee = (e) => ({
    _id: e._id,
    name: e.name || "",
    email: e.loginEmail || e.email || "",
    role: lower(e.role),
    employeeId: e.employeeId || "",
    designation: e.designation || "",
    department: e.department || "",
});

/*
 * Replaces the id fields (for example "employee") of every record with a small object:
 * { _id, name, email, role, employeeId, designation, department }
 */
async function attachPeople(records, paths = ["employee"]) {
    const list = records.map((r) => (typeof r.toObject === "function" ? r.toObject() : r));
    const ids = new Set();
    list.forEach((r) =>
        paths.forEach((p) => {
            const id = String(r[p]?._id || r[p] || "");
            if (mongoose.isValidObjectId(id)) ids.add(id);
        })
    );
    if (!ids.size) return list;

    const idArr = [...ids];
    const users = await User.find({ _id: { $in: idArr } })
        .select("name email role employee")
        .populate("employee", "employeeId name designation department")
        .lean();
    const map = new Map(users.map((u) => [String(u._id), personFromUser(u)]));

    // Older records can hold an Employee id instead of a User id
    const missing = idArr.filter((id) => !map.has(id));
    if (missing.length) {
        const employees = await Employee.find({ _id: { $in: missing } })
            .select("employeeId name email loginEmail role designation department")
            .lean();
        employees.forEach((e) => map.set(String(e._id), personFromEmployee(e)));
    }

    return list.map((r) => {
        const copy = { ...r };
        paths.forEach((p) => {
            const id = String(r[p]?._id || r[p] || "");
            if (id) copy[p] = map.get(id) || { _id: id };
        });
        return copy;
    });
}

module.exports = {
    TZ,
    ymdIST,
    dayStartIST,
    dayRangeIST,
    monthRangeIST,
    roleOf,
    isPrivileged,
    getScopeIds,
    inScope,
    expandIds,
    resolveUserId,
    attachPeople,
};