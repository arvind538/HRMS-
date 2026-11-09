const mongoose = require("mongoose");
const Employee = require("../models/Employee");

const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const lower = (v) => String(v ?? "").trim().toLowerCase();
const LEFT = /^(inactive|exited|exit)$/i;

/* the Employee profile of the logged-in login */
async function myEmployee(req) {
    const linked = req.user?.employee ? req.user.employee._id || req.user.employee : null;
    if (linked && mongoose.isValidObjectId(linked)) {
        const e = await Employee.findById(linked).select("_id name employeeId email");
        if (e) return e;
    }
    const email = lower(req.user?.email);
    if (!email) return null;
    return Employee.findOne({ $or: [{ email }, { loginEmail: email }] }).select("_id name employeeId email");
}

/* works whether reportingManager is saved as an id or as a name / employee id */
function teamFilter(m) {
    const path = Employee.schema.path("reportingManager");
    const or = [];
    if (path?.instance === "ObjectId") or.push({ reportingManager: m._id });
    else {
        or.push({ reportingManager: new RegExp(`^\\s*${esc(m.name)}\\s*$`, "i") });
        if (m.employeeId) or.push({ reportingManager: new RegExp(`^\\s*${esc(m.employeeId)}\\s*$`, "i") });
        or.push({ reportingManager: String(m._id) });
    }
    // people who left are not part of the team
    return { $or: or, _id: { $ne: m._id }, employeeStatus: { $not: LEFT }, status: { $not: LEFT } };
}

module.exports = { myEmployee, teamFilter, lower, esc };