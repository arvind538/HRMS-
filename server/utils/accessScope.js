const mongoose = require("mongoose");
const Employee = require("../models/Employee");
const User = require("../models/User");
const { myEmployee, teamFilter, lower } = require("./teamScope");
const base = require("./accessScopeBase");

const roleOf = (req) => lower(req.user?.role);
const isPrivileged = (req) => ["admin", "hr"].includes(roleOf(req)); // admin and HR see everything

/* null = sees everything. Otherwise a list of ids (employee ids and login ids) the person may see. */
async function getScopeIds(req) {
    if (!req.user) return [];
    if (isPrivileged(req)) return null;
    if (req._scopeIds) return req._scopeIds;

    const ids = new Set([String(req.user._id)]);
    const me = await myEmployee(req);
    if (me) ids.add(String(me._id));

    if (roleOf(req) === "manager" && me) {
        const team = await Employee.find(teamFilter(me)).select("_id email loginEmail").lean();
        const emails = team.flatMap((t) => [t.email, t.loginEmail]).map(lower).filter(Boolean);
        team.forEach((t) => ids.add(String(t._id)));
        if (team.length) {
            const users = await User.find({
                $or: [{ employee: { $in: team.map((t) => t._id) } }, { email: { $in: emails } }],
            })
                .select("_id")
                .lean();
            users.forEach((u) => ids.add(String(u._id)));
        }
    }
    req._scopeIds = [...ids];
    return req._scopeIds;
}

const inScope = (scope, id) => scope === null || scope.includes(String(id?._id || id));

/* a task points to a login id. This accepts a login id or an employee id and returns the login id (or null). */
async function resolveUserId(v) {
    const id = String(v?._id || v || "");
    if (!mongoose.isValidObjectId(id)) return null;

    const direct = await User.findOne({ _id: id, isActive: { $ne: false } }).select("_id").lean();
    if (direct) return String(direct._id);

    const byRef = await User.findOne({ employee: id, isActive: { $ne: false } }).select("_id").lean();
    if (byRef) return String(byRef._id);

    const emp = await Employee.findById(id).select("email loginEmail").lean();
    if (!emp) return null;

    const emails = [emp.loginEmail, emp.email].map(lower).filter(Boolean);
    const u = emails.length
        ? await User.findOne({ email: { $in: emails }, isActive: { $ne: false } }).select("_id").lean()
        : null;
    return u ? String(u._id) : null;
}

/* fields used when the caller does not pass any (this was the cause of the crash) */
const DEFAULT_PEOPLE_FIELDS = ["employee", "user", "assignedTo", "assignedBy", "createdBy", "approvedBy"];

const isPlainRef = (x) => x && typeof x === "object" && !(x instanceof mongoose.Types.ObjectId);

/*
  Replaces ids in the given fields by { _id, userId, name, email, role, employeeId }.
  - attachPeople(docs)                    -> uses DEFAULT_PEOPLE_FIELDS
  - attachPeople(docs, "employee")        -> single field
  - attachPeople(docs, ["employee","x"])  -> many fields
  An id can be a login (User) id OR an Employee id. Both work.
  Returns an array if you passed an array, otherwise a single object.
*/
async function attachPeople(docs, fields = DEFAULT_PEOPLE_FIELDS) {
    if (!docs) return Array.isArray(docs) ? [] : docs;

    const wasArray = Array.isArray(docs);
    const fieldList = (Array.isArray(fields) ? fields : [fields]).filter(Boolean);
    const list = (wasArray ? docs : [docs]).map((d) => (d && d.toObject ? d.toObject() : { ...d }));
    const finish = () => (wasArray ? list : list[0]);

    if (!fieldList.length) return finish();

    /* 1. collect every referenced id */
    const ids = new Set();
    list.forEach((d) =>
        fieldList.forEach((f) =>
            [].concat(d[f] || []).forEach((x) => {
                const id = String(x?._id || x || "");
                if (mongoose.isValidObjectId(id)) ids.add(id);
            })
        )
    );
    if (!ids.size) return finish();
    const idList = [...ids];

    /* 2. look them up as login ids and as employee ids */
    const users = await User.find({ $or: [{ _id: { $in: idList } }, { employee: { $in: idList } }] })
        .select("name email role employee")
        .populate("employee", "employeeId")
        .lean();

    const map = new Map();
    users.forEach((u) => {
        const empId = u.employee?._id ? String(u.employee._id) : u.employee ? String(u.employee) : "";
        const info = {
            userId: u._id,
            name: u.name,
            email: u.email,
            role: u.role,
            employeeId: u.employee?.employeeId || "",
        };
        map.set(String(u._id), { _id: u._id, ...info });
        if (empId) map.set(empId, { _id: empId, ...info });
    });

    /* 3. fallback: ids that are only Employee ids (no login account) */
    const missing = idList.filter((id) => !map.has(id));
    if (missing.length) {
        const emps = await Employee.find({ _id: { $in: missing } })
            .select("name email loginEmail employeeId")
            .lean();
        emps.forEach((e) =>
            map.set(String(e._id), {
                _id: e._id,
                userId: null,
                name: e.name,
                email: e.email || e.loginEmail,
                role: "",
                employeeId: e.employeeId || "",
            })
        );
    }

    /* 4. swap ids with the people info */
    const swap = (x) => {
        if (!x) return x;
        const found = map.get(String(x._id || x));
        if (!found) return x;
        return isPlainRef(x) ? { ...found, ...x } : found; // keep already-populated fields
    };

    list.forEach((d) =>
        fieldList.forEach((f) => {
            if (d[f]) d[f] = Array.isArray(d[f]) ? d[f].map(swap) : swap(d[f]);
        })
    );

    return finish();
}

module.exports = {
    ...base,
    roleOf,
    isPrivileged,
    getScopeIds,
    inScope,
    attachPeople,
    resolveUserId,
};