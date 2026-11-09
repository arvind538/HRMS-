const mongoose = require("mongoose");
const Employee = require("../models/Employee");
const Branch = require("../models/Branch");
const Department = require("../models/Department");
const Designation = require("../models/Designation");
const Location = require("../models/Location");
const Team = require("../models/Team");
const ReportingManager = require("../models/ReportingManager");

/* ------------------------------- helpers ------------------------------- */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^[+\d][\d\s-]{6,18}$/;
const validId = (v) => mongoose.isValidObjectId(v);
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const lc = (v) => String(v ?? "").trim().toLowerCase();
const bad = (res, message, status = 400) => res.status(status).json({ success: false, message });
const ACTIVE_EMP = { isExited: { $ne: true }, employeeStatus: { $not: /^(inactive|terminated|exited|resigned|absconded)$/i } };

/* a list of ids from the body: strings or objects with _id, duplicates removed */
const uniqueIds = (v) => [...new Set((Array.isArray(v) ? v : []).map((x) => String(x?._id || x || "")).filter(Boolean))];

/* How many active employees point to each record. Works whether the employee stores an id or a name. */
async function countMap(fields) {
    const expr = fields.reduceRight((acc, f) => (acc === null ? `$${f}` : { $ifNull: [`$${f}`, acc] }), null);
    const rows = await Employee.aggregate([
        { $match: ACTIVE_EMP },
        { $project: { k: expr } },
        { $group: { _id: { $toLower: { $toString: "$k" } }, n: { $sum: 1 } } },
    ]);
    return new Map(rows.filter((r) => r._id).map((r) => [r._id, r.n]));
}
const sumKeys = (map, keys) => [...new Set(keys.map(lc).filter(Boolean))].reduce((s, k) => s + (map.get(k) || 0), 0);

/* Reads and checks the fields of a create or an update. Only the fields that were sent are touched on update. */
async function readFields(fields, body, current) {
    const out = {};
    for (const [key, f] of Object.entries(fields)) {
        const v = body[key];
        if (v === undefined) {
            if (!current && f.required) return { error: `${f.label} is required.` };
            continue;
        }
        if (f.type === "string") {
            let s = String(v ?? "").trim();
            if (f.upper) s = s.toUpperCase();
            if (f.required && s.length < 2) return { error: `${f.label} must be at least 2 characters.` };
            if (s.length > (f.max || 120)) return { error: `${f.label} is too long (max ${f.max || 120} characters).` };
            if (s && f.email && !EMAIL.test(s)) return { error: "Please enter a valid email address." };
            if (s && f.phone && !PHONE.test(s)) return { error: "Please enter a valid phone number." };
            if (s && f.pincode && !/^\d{4,10}$/.test(s)) return { error: "Please enter a valid pincode." };
            if (s && f.enum && !f.enum.includes(s)) return { error: `Please select a valid ${f.label.toLowerCase()}.` };
            out[key] = s;
        } else if (f.type === "number") {
            const n = Number(v === "" ? 0 : v);
            if (!Number.isFinite(n) || n < (f.min ?? 0) || n > (f.max ?? 100000)) return { error: `${f.label} must be a number from ${f.min ?? 0} to ${f.max ?? 100000}.` };
            out[key] = n;
        } else if (f.type === "bool") {
            out[key] = v === true || v === "true";
        } else if (f.type === "id") {
            const id = String(v || "").trim();
            if (id && !validId(id)) return { error: `Please select a valid ${f.label.toLowerCase()}.` };
            if (id && !(await f.ref.exists({ _id: id }))) return { error: `${f.label} not found.` };
            out[key] = id || null;
        }
    }
    return { data: out };
}

/* ------------------------------- generic CRUD ------------------------------- */

/*
cfg = {
  Model, label, fields, unique:[keys], search:[keys], statusField, populate:[[path, select]],
  counts: { fields:[employee fields], keys:(doc)=>[...], out:"employeeCount" },
  extra: async (list) => {},                  // computed fields added to every row
  check: async (body, current) => "error",    // checks that need the database, before saving
  afterSave: async (doc, body, old) => {},    // side effects after create or update
  onRename: async (oldDoc, newDoc) => {},     // cascade a changed name
  onDelete: async (doc) => {},                // clean up before a delete
  blockers: async (doc) => [{ n, text }],     // extra reasons that stop a delete
  decorate: (doc) => doc
}
*/
function makeController(cfg) {
    const { Model, label } = cfg;

    const query = (q) => cfg.populate?.reduce((qq, [p, s]) => qq.populate(p, s), q) || q;

    async function decorate(list) {
        if (cfg.counts) {
            const map = await countMap(cfg.counts.fields);
            list.forEach((d) => {
                const live = sumKeys(map, cfg.counts.keys(d));
                d[cfg.counts.out] = cfg.counts.keepStored && !live ? d[cfg.counts.out] || 0 : live;
            });
        }
        if (cfg.extra) await cfg.extra(list);
        list.forEach((d) => {
            if (cfg.statusField === "isActive") d.status = d.isActive === false ? "inactive" : "active";
            if (cfg.decorate) cfg.decorate(d);
        });
        return list;
    }

    const load = async (id) => (await decorate([await query(Model.findById(id)).lean()]))[0];

    async function clash(out, current) {
        for (const key of cfg.unique || []) {
            const val = out[key];
            if (!val) continue;
            const dup = await Model.exists({ [key]: new RegExp(`^${escapeRegex(val)}$`, "i"), ...(current ? { _id: { $ne: current._id } } : {}) });
            if (dup) return `A ${label.toLowerCase()} with this ${cfg.fields[key].label.toLowerCase()} already exists.`;
        }
        return "";
    }

    /* the frontend can send status: "active" | "inactive" for every record */
    const normalize = (body = {}) => {
        const b = { ...body };
        if (cfg.statusField === "isActive" && b.status !== undefined && b.isActive === undefined) b.isActive = b.status === "active";
        return b;
    };

    return {
        // GET /?q=&status=active|inactive
        getAll: async (req, res, next) => {
            try {
                const { q, status } = req.query;
                const filter = {};
                if (status === "active" || status === "inactive") {
                    if (cfg.statusField === "isActive") filter.isActive = status === "active";
                    else filter.status = status;
                }
                if (q) {
                    const rx = new RegExp(escapeRegex(String(q).trim().slice(0, 60)), "i");
                    filter.$or = (cfg.search || ["name"]).map((k) => ({ [k]: rx }));
                }
                const list = await query(Model.find(filter).sort(cfg.sort || { createdAt: -1 }).limit(1000)).lean();
                await decorate(list);
                res.json({ success: true, count: list.length, data: list });
            } catch (err) {
                next(err);
            }
        },

        getOne: async (req, res, next) => {
            try {
                const doc = await load(req.params.id);
                if (!doc) return bad(res, `${label} not found.`, 404);
                res.json({ success: true, data: doc });
            } catch (err) {
                next(err);
            }
        },

        create: async (req, res, next) => {
            try {
                const body = normalize(req.body);
                const input = await readFields(cfg.fields, body, null);
                if (input.error) return bad(res, input.error);
                const dup = await clash(input.data, null);
                if (dup) return bad(res, dup, 409);
                if (cfg.check) {
                    const err = await cfg.check(body, null);
                    if (err) return bad(res, err, 409);
                }
                const doc = await Model.create(input.data);
                if (cfg.afterSave) await cfg.afterSave(doc, body, null);
                res.status(201).json({ success: true, message: `${label} created successfully.`, data: await load(doc._id) });
            } catch (err) {
                if (err?.code === 11000) return bad(res, `This ${label.toLowerCase()} already exists.`, 409);
                next(err);
            }
        },

        update: async (req, res, next) => {
            try {
                const doc = await Model.findById(req.params.id);
                if (!doc) return bad(res, `${label} not found.`, 404);
                const body = normalize(req.body);
                const input = await readFields(cfg.fields, body, doc);
                if (input.error) return bad(res, input.error);
                const dup = await clash(input.data, doc);
                if (dup) return bad(res, dup, 409);
                if (cfg.check) {
                    const err = await cfg.check(body, doc);
                    if (err) return bad(res, err, 409);
                }

                const old = doc.toObject();
                doc.set(input.data);
                await doc.save();
                if (cfg.afterSave) await cfg.afterSave(doc, body, old);
                if (cfg.onRename) await cfg.onRename(old, doc.toObject());
                res.json({ success: true, message: `${label} updated successfully.`, data: await load(doc._id) });
            } catch (err) {
                if (err?.code === 11000) return bad(res, `This ${label.toLowerCase()} already exists.`, 409);
                next(err);
            }
        },

        remove: async (req, res, next) => {
            try {
                const doc = await Model.findById(req.params.id).lean();
                if (!doc) return bad(res, `${label} not found.`, 404);

                const [full] = await decorate([{ ...doc }]);
                const used = cfg.counts ? full[cfg.counts.out] : 0;
                if (used > 0 && cfg.counts.out !== "membersCount")
                    return bad(res, `${used} employee${used > 1 ? "s use" : " uses"} this ${label.toLowerCase()}. Make it inactive instead of deleting it.`, 409);
                for (const b of (cfg.blockers ? await cfg.blockers(doc) : [])) if (b.n > 0) return bad(res, b.text, 409);

                if (cfg.onDelete) await cfg.onDelete(doc);
                await Model.deleteOne({ _id: doc._id });
                res.json({ success: true, message: `${label} deleted successfully.` });
            } catch (err) {
                next(err);
            }
        },
    };
}

/* ------------------------------- reporting managers ------------------------------- */

/* Checks the reportees list before saving. Returns an error text, or "" when everything is fine. */
async function checkReportees(body, current) {
    if (body.reportees === undefined) return "";
    const ids = uniqueIds(body.reportees);
    if (!ids.length) return "";
    if (!ids.every(validId)) return "Please select valid employees.";

    const mgr = body.employee !== undefined ? String(body.employee || "") : String(current?.employee || "");
    if (!mgr) return "Link this manager to an employee first. Only a linked manager can have reportees.";
    if (ids.includes(mgr)) return "A manager cannot be a reportee of himself.";

    const live = await Employee.countDocuments({ _id: { $in: ids }, ...ACTIVE_EMP });
    if (live !== ids.length) return "Some selected employees were not found or are inactive.";

    /* an employee already under ANOTHER manager cannot be added here. Remove them there first. */
    const busy = await Employee.find({ _id: { $in: ids }, reportingManager: { $nin: [null, mgr] } })
        .select("name reportingManager")
        .populate("reportingManager", "name")
        .lean();
    if (busy.length) {
        const first = busy[0];
        return `${first.name} is already under ${first.reportingManager?.name || "another manager"}. Remove them there first.`;
    }
    return "";
}

/* Saves the reportees: sets Employee.reportingManager for the selected people, and clears it for people removed. */
async function syncReportees(doc, body, old) {
    const mgr = doc.employee ? String(doc.employee) : "";
    const prev = old?.employee ? String(old.employee) : "";

    // the manager's linked employee changed: the old reportees are no longer under this manager
    if (prev && prev !== mgr) await Employee.updateMany({ reportingManager: prev }, { $set: { reportingManager: null } });

    if (body.reportees === undefined || !mgr) return;
    const ids = uniqueIds(body.reportees);

    await Employee.updateMany({ reportingManager: mgr, _id: { $nin: ids } }, { $set: { reportingManager: null } });
    if (ids.length) await Employee.updateMany({ _id: { $in: ids } }, { $set: { reportingManager: mgr } });
}

/* ------------------------------- the six records ------------------------------- */

const STATUS = ["active", "inactive"];
const S = (label, extra = {}) => ({ type: "string", label, ...extra });

/* when a name changes, the records that store it as text must follow */
const rename = (oldName, newName, updates) => oldName && newName && oldName !== newName ? Promise.all(updates.map(([M, field]) => M.updateMany({ [field]: oldName }, { [field]: newName }))) : null;

exports.branch = makeController({
    Model: Branch, label: "Branch", search: ["name", "code", "city", "state"], sort: { name: 1 }, unique: ["name", "code"],
    fields: { name: S("Branch name", { required: true }), code: S("Code", { upper: true, max: 12 }), city: S("City"), state: S("State"), address: S("Address", { max: 300 }), phone: S("Phone", { phone: true }), email: S("Email", { email: true }), status: S("Status", { enum: STATUS }) },
    counts: { fields: ["branch"], keys: (d) => [String(d._id), d.name], out: "employeeCount" },
    blockers: async (d) => [{ n: await Department.countDocuments({ branch: d.name }), text: "Departments are attached to this branch. Move or remove them first." }],
    onRename: (o, n) => rename(o.name, n.name, [[Department, "branch"], [Employee, "branch"]]),
});

exports.department = makeController({
    Model: Department, label: "Department", search: ["name", "code", "branch"], sort: { name: 1 }, unique: ["name", "code"], statusField: "isActive",
    fields: { name: S("Department name", { required: true }), code: S("Code", { upper: true, max: 12 }), branch: S("Branch"), head: { type: "id", label: "Department head", ref: Employee }, description: S("Description", { max: 500 }), isActive: { type: "bool", label: "Active" } },
    populate: [["head", "name employeeId designation"]],
    counts: { fields: ["department"], keys: (d) => [String(d._id), d.name], out: "employeeCount" },
    onRename: (o, n) => rename(o.name, n.name, [[Designation, "department"], [Team, "department"], [Employee, "department"]]),
});

exports.designation = makeController({
    Model: Designation, label: "Designation", search: ["title", "department", "level"], sort: { title: 1 }, unique: ["title"],
    fields: { title: S("Title", { required: true }), department: S("Department"), level: S("Level", { max: 40 }), description: S("Description", { max: 500 }), status: S("Status", { enum: STATUS }) },
    counts: { fields: ["designation"], keys: (d) => [String(d._id), d.title], out: "employeeCount" },
    onRename: (o, n) => rename(o.title, n.title, [[Employee, "designation"]]),
});

exports.location = makeController({
    Model: Location, label: "Location", search: ["name", "code", "city", "state", "pincode"], sort: { name: 1 }, unique: ["name", "code"],
    fields: {
        name: S("Location name", { required: true }),
        code: S("Location code", { upper: true, max: 12 }),
        address: S("Address", { max: 300 }),
        city: S("City"),
        state: S("State"),
        country: S("Country"),
        pincode: S("Pincode", { pincode: true, max: 10 }),
        status: S("Status", { enum: STATUS }),
    },
    counts: { fields: ["workLocation"], keys: (d) => [String(d._id), d.name, d.code], out: "employeeCount" },
    onRename: (o, n) => rename(o.name, n.name, [[Employee, "workLocation"]]),
});

exports.team = makeController({
    Model: Team, label: "Team", search: ["name", "department", "teamLead"], sort: { name: 1 }, unique: ["name"],
    fields: { name: S("Team name", { required: true }), department: S("Department"), teamLead: S("Team lead"), membersCount: { type: "number", label: "Members", min: 0, max: 10000 }, description: S("Description", { max: 500 }), status: S("Status", { enum: STATUS }) },
    counts: { fields: ["team"], keys: (d) => [String(d._id), d.name], out: "membersCount", keepStored: true },
    onRename: (o, n) => rename(o.name, n.name, [[Employee, "team"]]),
});

exports.reportingManager = makeController({
    Model: ReportingManager, label: "Reporting manager", search: ["name", "email", "designation", "department"], sort: { name: 1 }, unique: ["email"],
    fields: {
        name: S("Name", { required: true }),
        email: S("Email", { email: true }),
        designation: S("Designation"),
        department: S("Department"),
        employee: { type: "id", label: "Employee", ref: Employee },
        status: S("Status", { enum: STATUS }),
    },
    populate: [["employee", "name employeeId"]],

    /* reportees come from Employee.reportingManager, so the list is always live */
    extra: async (list) => {
        const mgrIds = list.map((d) => String(d.employee?._id || d.employee || "")).filter(Boolean);
        const people = mgrIds.length
            ? await Employee.find({ reportingManager: { $in: mgrIds }, ...ACTIVE_EMP }).select("name employeeId reportingManager").sort({ name: 1 }).lean()
            : [];
        const teams = await Team.find({ status: { $ne: "inactive" } }).select("teamLead").lean();

        const by = new Map();
        people.forEach((e) => {
            const k = String(e.reportingManager);
            if (!by.has(k)) by.set(k, []);
            by.get(k).push({ _id: e._id, name: e.name, employeeId: e.employeeId });
        });

        list.forEach((d) => {
            const id = String(d.employee?._id || d.employee || "");
            const mine = id ? by.get(id) || [] : [];
            d.reportees = mine;
            d.reporteesCount = mine.length;
            d.teamsManaged = teams.filter((t) => lc(t.teamLead) === lc(d.name)).length;
        });
    },

    check: checkReportees,
    afterSave: syncReportees,

    /* deleting a manager does not delete the employees: they just have no manager now */
    onDelete: async (doc) => {
        if (doc.employee) await Employee.updateMany({ reportingManager: doc.employee }, { $set: { reportingManager: null } });
    },
});

/* ------------------------------- overview, summary, org chart ------------------------------- */

// GET /overview  (company page: live headcount and the whole structure, any logged-in user)
exports.overview = async (req, res, next) => {
    try {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const [branches, departments, designations, locations, teams, total, joined, unassigned, mBranch, mDept, mDesig, mLoc, mTeam] = await Promise.all([
            Branch.find({ status: { $ne: "inactive" } }).sort({ name: 1 }).lean(),
            Department.find({ isActive: { $ne: false } }).populate("head", "name employeeId").sort({ name: 1 }).lean(),
            Designation.find({ status: { $ne: "inactive" } }).sort({ title: 1 }).lean(),
            Location.find({ status: { $ne: "inactive" } }).sort({ name: 1 }).lean(),
            Team.find({ status: { $ne: "inactive" } }).sort({ name: 1 }).lean(),
            Employee.countDocuments(ACTIVE_EMP),
            Employee.countDocuments({ ...ACTIVE_EMP, createdAt: { $gte: monthStart } }),
            Employee.countDocuments({ ...ACTIVE_EMP, $or: [{ department: null }, { department: { $exists: false } }, { department: "" }] }),
            countMap(["branch"]), countMap(["department"]), countMap(["designation"]), countMap(["workLocation"]), countMap(["team"]),
        ]);

        res.json({
            success: true,
            data: {
                company: { totalEmployees: total, joinedThisMonth: joined, withoutDepartment: unassigned },
                counts: { branches: branches.length, departments: departments.length, designations: designations.length, locations: locations.length, teams: teams.length },
                branches: branches.map((b) => ({ _id: b._id, name: b.name, code: b.code, city: b.city, state: b.state, employeeCount: sumKeys(mBranch, [String(b._id), b.name]) })),
                departments: departments.map((d) => ({ _id: d._id, name: d.name, code: d.code, branch: d.branch, head: d.head ? { name: d.head.name, employeeId: d.head.employeeId } : null, employeeCount: sumKeys(mDept, [String(d._id), d.name]) })),
                designations: designations.map((d) => ({ _id: d._id, title: d.title, department: d.department, level: d.level, employeeCount: sumKeys(mDesig, [String(d._id), d.title]) })),
                locations: locations.map((l) => ({ _id: l._id, name: l.name, code: l.code, city: l.city, state: l.state, country: l.country, employeeCount: sumKeys(mLoc, [String(l._id), l.name, l.code]) })),
                teams: teams.map((t) => ({ _id: t._id, name: t.name, department: t.department, teamLead: t.teamLead, membersCount: sumKeys(mTeam, [String(t._id), t.name]) || t.membersCount || 0 })),
            },
        });
    } catch (err) {
        next(err);
    }
};

// GET /summary  (cards for the Organization pages)
exports.summary = async (req, res, next) => {
    try {
        const [branches, departments, designations, locations, teams, managers, unassigned] = await Promise.all([
            Branch.countDocuments({ status: { $ne: "inactive" } }),
            Department.countDocuments({ isActive: { $ne: false } }),
            Designation.countDocuments({ status: { $ne: "inactive" } }),
            Location.countDocuments({ status: { $ne: "inactive" } }),
            Team.countDocuments({ status: { $ne: "inactive" } }),
            ReportingManager.countDocuments({ status: { $ne: "inactive" } }),
            Employee.countDocuments({ ...ACTIVE_EMP, $or: [{ department: null }, { department: { $exists: false } }, { department: "" }] }),
        ]);
        res.json({ success: true, data: { branches, departments, designations, locations, teams, reportingManagers: managers, employeesWithoutDepartment: unassigned } });
    } catch (err) {
        next(err);
    }
};

// GET /org-chart  (company > departments > people, plus who reports to whom)
exports.orgChart = async (req, res, next) => {
    try {
        let company = "";
        try {
            const Settings = require("../models/Settings");
            company = (await Settings.findOne().select("companyName").lean())?.companyName || "";
        } catch {
            /* the chart works without it */
        }

        const [departments, teams, employees] = await Promise.all([
            Department.find({ isActive: { $ne: false } }).populate("head", "name employeeId designation").sort({ name: 1 }).lean(),
            Team.find({ status: { $ne: "inactive" } }).sort({ name: 1 }).lean(),
            Employee.find(ACTIVE_EMP)
                .select("name employeeId designation department reportingManager")
                .populate("reportingManager", "name employeeId")
                .lean(),
        ]);

        const byDept = new Map();
        employees.forEach((e) => {
            const k = lc(e.department);
            if (!byDept.has(k)) byDept.set(k, []);
            byDept.get(k).push(e);
        });

        const person = (e) => ({ _id: e._id, name: e.name, employeeId: e.employeeId, designation: typeof e.designation === "string" ? e.designation : e.designation?.title || "" });

        const nodes = departments.map((d) => {
            const people = byDept.get(lc(d.name)) || [];
            const roles = {};
            people.forEach((p) => {
                const t = person(p).designation || "Not set";
                roles[t] = (roles[t] || 0) + 1;
            });
            return {
                _id: d._id, name: d.name, code: d.code, branch: d.branch, head: d.head || null, employeeCount: people.length,
                designations: Object.entries(roles).map(([title, count]) => ({ title, count })).sort((a, b) => b.count - a.count),
                teams: teams.filter((t) => lc(t.department) === lc(d.name)).map((t) => ({ _id: t._id, name: t.name, teamLead: t.teamLead, membersCount: t.membersCount })),
                members: people.slice(0, 60).map(person),
            };
        });

        /* group by the manager's id, the name comes from the populated employee */
        const managers = {};
        employees.forEach((e) => {
            const m = e.reportingManager;
            if (!m?._id) return;
            const k = String(m._id);
            if (!managers[k]) managers[k] = { name: m.name, employeeId: m.employeeId, reportees: [] };
            managers[k].reportees.push(person(e));
        });

        res.json({
            success: true,
            data: {
                company, totalEmployees: employees.length, departments: nodes,
                unassigned: employees.filter((e) => !lc(e.department)).length,
                managers: Object.values(managers)
                    .map((m) => ({ name: m.name, employeeId: m.employeeId, reporteesCount: m.reportees.length, reportees: m.reportees.slice(0, 60) }))
                    .sort((a, b) => b.reporteesCount - a.reporteesCount),
            },
        });
    } catch (err) {
        next(err);
    }
};

// GET /pincode/:pin  (city, state and country from the India Post pincode directory)
const pinCache = new Map();
exports.pincodeLookup = async (req, res, next) => {
    try {
        const pin = String(req.params.pin || "");
        if (!/^[1-9]\d{5}$/.test(pin)) return bad(res, "Enter a valid 6-digit pincode.");

        if (!pinCache.has(pin)) {
            const r = await fetch(`https://api.postalpincode.in/pincode/${pin}`, { signal: AbortSignal.timeout(8000) });
            const [first] = await r.json();
            const office = first?.Status === "Success" ? first.PostOffice?.[0] : null;
            pinCache.set(pin, office ? { city: office.District || office.Block || "", state: office.State || "", country: office.Country || "India" } : null);
        }
        res.json({ success: true, data: pinCache.get(pin) });
    } catch {
        // if the directory is down, the form still works and the user types manually
        res.json({ success: true, data: null });
    }
};




// const mongoose = require("mongoose");
// const Employee = require("../models/Employee");
// const Branch = require("../models/Branch");
// const Department = require("../models/Department");
// const Designation = require("../models/Designation");
// const Location = require("../models/Location");
// const Team = require("../models/Team");
// const ReportingManager = require("../models/ReportingManager");

// /* ------------------------------- helpers ------------------------------- */

// const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// const PHONE = /^[+\d][\d\s-]{6,18}$/;
// const validId = (v) => mongoose.isValidObjectId(v);
// const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// const lc = (v) => String(v ?? "").trim().toLowerCase();
// const bad = (res, message, status = 400) => res.status(status).json({ success: false, message });
// // const ACTIVE_EMP = { isExited: { $ne: true } };
// const ACTIVE_EMP = { isExited: { $ne: true }, employeeStatus: { $not: /^(inactive|terminated|exited|resigned|absconded)$/i } };
// /* How many active employees point to each record. Works whether the employee stores an id or a name. */
// async function countMap(fields) {
//     const expr = fields.reduceRight((acc, f) => (acc === null ? `$${f}` : { $ifNull: [`$${f}`, acc] }), null);
//     const rows = await Employee.aggregate([
//         { $match: ACTIVE_EMP },
//         { $project: { k: expr } },
//         { $group: { _id: { $toLower: { $toString: "$k" } }, n: { $sum: 1 } } },
//     ]);
//     return new Map(rows.filter((r) => r._id).map((r) => [r._id, r.n]));
// }
// const sumKeys = (map, keys) => [...new Set(keys.map(lc).filter(Boolean))].reduce((s, k) => s + (map.get(k) || 0), 0);

// /* Reads and checks the fields of a create or an update. Only the fields that were sent are touched on update. */
// async function readFields(fields, body, current) {
//     const out = {};
//     for (const [key, f] of Object.entries(fields)) {
//         const v = body[key];
//         if (v === undefined) {
//             if (!current && f.required) return { error: `${f.label} is required.` };
//             continue;
//         }
//         if (f.type === "string") {
//             let s = String(v ?? "").trim();
//             if (f.upper) s = s.toUpperCase();
//             if (f.required && s.length < 2) return { error: `${f.label} must be at least 2 characters.` };
//             if (s.length > (f.max || 120)) return { error: `${f.label} is too long (max ${f.max || 120} characters).` };
//             if (s && f.email && !EMAIL.test(s)) return { error: "Please enter a valid email address." };
//             if (s && f.phone && !PHONE.test(s)) return { error: "Please enter a valid phone number." };
//             if (s && f.pincode && !/^\d{4,10}$/.test(s)) return { error: "Please enter a valid pincode." };
//             if (s && f.enum && !f.enum.includes(s)) return { error: `Please select a valid ${f.label.toLowerCase()}.` };
//             out[key] = s;
//         } else if (f.type === "number") {
//             const n = Number(v === "" ? 0 : v);
//             if (!Number.isFinite(n) || n < (f.min ?? 0) || n > (f.max ?? 100000)) return { error: `${f.label} must be a number from ${f.min ?? 0} to ${f.max ?? 100000}.` };
//             out[key] = n;
//         } else if (f.type === "bool") {
//             out[key] = v === true || v === "true";
//         } else if (f.type === "id") {
//             const id = String(v || "").trim();
//             if (id && !validId(id)) return { error: `Please select a valid ${f.label.toLowerCase()}.` };
//             if (id && !(await f.ref.exists({ _id: id }))) return { error: `${f.label} not found.` };
//             out[key] = id || null;
//         }
//     }
//     return { data: out };
// }

// /* ------------------------------- generic CRUD ------------------------------- */

// /*
// cfg = {
//   Model, label, fields, unique:[keys], search:[keys], statusField, populate:[[path, select]],
//   counts: { fields:[employee fields], keys:(doc)=>[...], out:"employeeCount", keepStored? },
//   blockers: async (doc) => [{ n, text }],   // extra reasons that stop a delete
//   onRename: async (oldDoc, newDoc) => {},    // cascade a changed name
//   extra: async (list) => {},                  // add more computed fields
//   decorate: (doc) => doc
// }
// */
// function makeController(cfg) {
//     const { Model, label } = cfg;

//     const query = (q) => cfg.populate?.reduce((qq, [p, s]) => qq.populate(p, s), q) || q;

//     async function decorate(list) {
//         if (cfg.counts) {
//             const map = await countMap(cfg.counts.fields);
//             list.forEach((d) => {
//                 const live = sumKeys(map, cfg.counts.keys(d));
//                 d[cfg.counts.out] = cfg.counts.keepStored && !live ? d[cfg.counts.out] || 0 : live;
//             });
//         }
//         if (cfg.extra) await cfg.extra(list);
//         list.forEach((d) => {
//             if (cfg.statusField === "isActive") d.status = d.isActive === false ? "inactive" : "active";
//             if (cfg.decorate) cfg.decorate(d);
//         });
//         return list;
//     }

//     const load = async (id) => (await decorate([await query(Model.findById(id)).lean()]))[0];

//     async function clash(out, current) {
//         for (const key of cfg.unique || []) {
//             const val = out[key];
//             if (!val) continue;
//             const dup = await Model.exists({ [key]: new RegExp(`^${escapeRegex(val)}$`, "i"), ...(current ? { _id: { $ne: current._id } } : {}) });
//             if (dup) return `A ${label.toLowerCase()} with this ${cfg.fields[key].label.toLowerCase()} already exists.`;
//         }
//         return "";
//     }

//     /* the frontend can send status: "active" | "inactive" for every record */
//     const normalize = (body = {}) => {
//         const b = { ...body };
//         if (cfg.statusField === "isActive" && b.status !== undefined && b.isActive === undefined) b.isActive = b.status === "active";
//         return b;
//     };

//     return {
//         // GET /?q=&status=active|inactive
//         getAll: async (req, res, next) => {
//             try {
//                 const { q, status } = req.query;
//                 const filter = {};
//                 if (status === "active" || status === "inactive") {
//                     if (cfg.statusField === "isActive") filter.isActive = status === "active";
//                     else filter.status = status;
//                 }
//                 if (q) {
//                     const rx = new RegExp(escapeRegex(String(q).trim().slice(0, 60)), "i");
//                     filter.$or = (cfg.search || ["name"]).map((k) => ({ [k]: rx }));
//                 }
//                 const list = await query(Model.find(filter).sort(cfg.sort || { createdAt: -1 }).limit(1000)).lean();
//                 await decorate(list);
//                 res.json({ success: true, count: list.length, data: list });
//             } catch (err) {
//                 next(err);
//             }
//         },

//         getOne: async (req, res, next) => {
//             try {
//                 const doc = await load(req.params.id);
//                 if (!doc) return bad(res, `${label} not found.`, 404);
//                 res.json({ success: true, data: doc });
//             } catch (err) {
//                 next(err);
//             }
//         },

//         create: async (req, res, next) => {
//             try {
//                 const input = await readFields(cfg.fields, normalize(req.body), null);
//                 if (input.error) return bad(res, input.error);
//                 const dup = await clash(input.data, null);
//                 if (dup) return bad(res, dup, 409);
//                 const doc = await Model.create(input.data);
//                 res.status(201).json({ success: true, message: `${label} created successfully.`, data: await load(doc._id) });
//             } catch (err) {
//                 if (err?.code === 11000) return bad(res, `This ${label.toLowerCase()} already exists.`, 409);
//                 next(err);
//             }
//         },

//         update: async (req, res, next) => {
//             try {
//                 const doc = await Model.findById(req.params.id);
//                 if (!doc) return bad(res, `${label} not found.`, 404);
//                 const input = await readFields(cfg.fields, normalize(req.body), doc);
//                 if (input.error) return bad(res, input.error);
//                 const dup = await clash(input.data, doc);
//                 if (dup) return bad(res, dup, 409);

//                 const old = doc.toObject();
//                 doc.set(input.data);
//                 await doc.save();
//                 if (cfg.onRename) await cfg.onRename(old, doc.toObject());
//                 res.json({ success: true, message: `${label} updated successfully.`, data: await load(doc._id) });
//             } catch (err) {
//                 if (err?.code === 11000) return bad(res, `This ${label.toLowerCase()} already exists.`, 409);
//                 next(err);
//             }
//         },

//         remove: async (req, res, next) => {
//             try {
//                 const doc = await Model.findById(req.params.id).lean();
//                 if (!doc) return bad(res, `${label} not found.`, 404);

//                 const [full] = await decorate([{ ...doc }]);
//                 const used = cfg.counts ? full[cfg.counts.out] : 0;
//                 if (used > 0 && cfg.counts.out !== "membersCount" && cfg.counts.out !== "reporteesCount")
//                     return bad(res, `${used} employee${used > 1 ? "s use" : " uses"} this ${label.toLowerCase()}. Make it inactive instead of deleting it.`, 409);
//                 for (const b of (cfg.blockers ? await cfg.blockers(doc) : [])) if (b.n > 0) return bad(res, b.text, 409);

//                 await Model.deleteOne({ _id: doc._id });
//                 res.json({ success: true, message: `${label} deleted successfully.` });
//             } catch (err) {
//                 next(err);
//             }
//         },
//     };
// }

// // GET /overview  (company page: live headcount and the whole structure, any logged-in user)
// exports.overview = async (req, res, next) => {
//     try {
//         const now = new Date();
//         const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
//         const [branches, departments, designations, locations, teams, total, joined, unassigned, mBranch, mDept, mDesig, mLoc, mTeam] = await Promise.all([
//             Branch.find({ status: { $ne: "inactive" } }).sort({ name: 1 }).lean(),
//             Department.find({ isActive: { $ne: false } }).populate("head", "name employeeId").sort({ name: 1 }).lean(),
//             Designation.find({ status: { $ne: "inactive" } }).sort({ title: 1 }).lean(),
//             Location.find({ status: { $ne: "inactive" } }).sort({ name: 1 }).lean(),
//             Team.find({ status: { $ne: "inactive" } }).sort({ name: 1 }).lean(),
//             Employee.countDocuments(ACTIVE_EMP),
//             Employee.countDocuments({ ...ACTIVE_EMP, createdAt: { $gte: monthStart } }),
//             Employee.countDocuments({ ...ACTIVE_EMP, $or: [{ department: null }, { department: { $exists: false } }] }),
//             countMap(["branch"]), countMap(["department"]), countMap(["designation"]), countMap(["location", "workLocation"]), countMap(["team"]),
//         ]);

//         res.json({
//             success: true,
//             data: {
//                 company: { totalEmployees: total, joinedThisMonth: joined, withoutDepartment: unassigned },
//                 counts: { branches: branches.length, departments: departments.length, designations: designations.length, locations: locations.length, teams: teams.length },
//                 branches: branches.map((b) => ({ _id: b._id, name: b.name, code: b.code, city: b.city, state: b.state, employeeCount: sumKeys(mBranch, [String(b._id), b.name]) })),
//                 departments: departments.map((d) => ({ _id: d._id, name: d.name, code: d.code, branch: d.branch, head: d.head ? { name: d.head.name, employeeId: d.head.employeeId } : null, employeeCount: sumKeys(mDept, [String(d._id), d.name]) })),
//                 designations: designations.map((d) => ({ _id: d._id, title: d.title, department: d.department, level: d.level, employeeCount: sumKeys(mDesig, [String(d._id), d.title]) })),
//                 locations: locations.map((l) => ({ _id: l._id, name: l.name, city: l.city, state: l.state, country: l.country, employeeCount: sumKeys(mLoc, [String(l._id), l.name]) })),
//                 teams: teams.map((t) => ({ _id: t._id, name: t.name, department: t.department, teamLead: t.teamLead, membersCount: sumKeys(mTeam, [String(t._id), t.name]) || t.membersCount || 0 })),
//             },
//         });
//     } catch (err) {
//         next(err);
//     }
// };


// /* ------------------------------- the six records ------------------------------- */

// const STATUS = ["active", "inactive"];
// const S = (label, extra = {}) => ({ type: "string", label, ...extra });

// /* when a name changes, the records that store it as text must follow */
// const rename = (oldName, newName, updates) => oldName && newName && oldName !== newName ? Promise.all(updates.map(([M, field]) => M.updateMany({ [field]: oldName }, { [field]: newName }))) : null;

// exports.branch = makeController({
//     Model: Branch, label: "Branch", search: ["name", "code", "city", "state"], sort: { name: 1 }, unique: ["name", "code"],
//     fields: { name: S("Branch name", { required: true }), code: S("Code", { upper: true, max: 12 }), city: S("City"), state: S("State"), address: S("Address", { max: 300 }), phone: S("Phone", { phone: true }), email: S("Email", { email: true }), status: S("Status", { enum: STATUS }) },
//     counts: { fields: ["branch"], keys: (d) => [String(d._id), d.name], out: "employeeCount" },
//     blockers: async (d) => [{ n: await Department.countDocuments({ branch: d.name }), text: "Departments are attached to this branch. Move or remove them first." }],
//     onRename: (o, n) => rename(o.name, n.name, [[Department, "branch"]]),
// });

// exports.department = makeController({
//     Model: Department, label: "Department", search: ["name", "code", "branch"], sort: { name: 1 }, unique: ["name", "code"], statusField: "isActive",
//     fields: { name: S("Department name", { required: true }), code: S("Code", { upper: true, max: 12 }), branch: S("Branch"), head: { type: "id", label: "Department head", ref: Employee }, description: S("Description", { max: 500 }), isActive: { type: "bool", label: "Active" } },
//     populate: [["head", "name employeeId designation"]],
//     counts: { fields: ["department"], keys: (d) => [String(d._id), d.name], out: "employeeCount" },
//     onRename: (o, n) => rename(o.name, n.name, [[Designation, "department"], [Team, "department"], [ReportingManager, "department"]]),
// });

// exports.designation = makeController({
//     Model: Designation, label: "Designation", search: ["title", "department", "level"], sort: { title: 1 }, unique: ["title"],
//     fields: { title: S("Title", { required: true }), department: S("Department"), level: S("Level", { max: 40 }), description: S("Description", { max: 500 }), status: S("Status", { enum: STATUS }) },
//     counts: { fields: ["designation"], keys: (d) => [String(d._id), d.title], out: "employeeCount" },
//     onRename: (o, n) => rename(o.title, n.title, [[ReportingManager, "designation"]]),
// });

// exports.location = makeController({
//     Model: Location, label: "Location", search: ["name", "city", "state", "pincode"], sort: { name: 1 }, unique: ["name"],
//     fields: { name: S("Location name", { required: true }), address: S("Address", { max: 300 }), city: S("City"), state: S("State"), country: S("Country"), pincode: S("Pincode", { pincode: true, max: 10 }), status: S("Status", { enum: STATUS }) },
//     counts: { fields: ["location", "workLocation"], keys: (d) => [String(d._id), d.name], out: "employeeCount" },
// });

// exports.team = makeController({
//     Model: Team, label: "Team", search: ["name", "department", "teamLead"], sort: { name: 1 }, unique: ["name"],
//     fields: { name: S("Team name", { required: true }), department: S("Department"), teamLead: S("Team lead"), membersCount: { type: "number", label: "Members", min: 0, max: 10000 }, description: S("Description", { max: 500 }), status: S("Status", { enum: STATUS }) },
//     counts: { fields: ["team"], keys: (d) => [String(d._id), d.name], out: "membersCount", keepStored: true },
//     onRename: (o, n) => rename(o.name, n.name, []),
// });

// exports.reportingManager = makeController({
//     Model: ReportingManager, label: "Reporting manager", search: ["name", "email", "designation", "department"], sort: { name: 1 }, unique: ["email"],
//     fields: { name: S("Name", { required: true }), email: S("Email", { email: true }), designation: S("Designation"), department: S("Department"), employee: { type: "id", label: "Employee", ref: Employee }, status: S("Status", { enum: STATUS }) },
//     populate: [["employee", "name employeeId"]],
//     counts: { fields: ["reportingManager"], keys: (d) => [d.name, String(d.employee?._id || d.employee || "")], out: "reporteesCount", keepStored: true },
//     extra: async (list) => {
//         const teams = await Team.find({ status: { $ne: "inactive" } }).select("teamLead").lean();
//         list.forEach((d) => (d.teamsManaged = teams.filter((t) => lc(t.teamLead) === lc(d.name)).length || d.teamsManaged || 0));
//     },
// });

// /* ------------------------------- summary and chart ------------------------------- */

// // GET /summary  (cards for the Organization pages)
// exports.summary = async (req, res, next) => {
//     try {
//         const [branches, departments, designations, locations, teams, managers, unassigned] = await Promise.all([
//             Branch.countDocuments({ status: { $ne: "inactive" } }),
//             Department.countDocuments({ isActive: { $ne: false } }),
//             Designation.countDocuments({ status: { $ne: "inactive" } }),
//             Location.countDocuments({ status: { $ne: "inactive" } }),
//             Team.countDocuments({ status: { $ne: "inactive" } }),
//             ReportingManager.countDocuments({ status: { $ne: "inactive" } }),
//             Employee.countDocuments({ ...ACTIVE_EMP, $or: [{ department: null }, { department: { $exists: false } }] }),
//         ]);
//         res.json({ success: true, data: { branches, departments, designations, locations, teams, reportingManagers: managers, employeesWithoutDepartment: unassigned } });
//     } catch (err) {
//         next(err);
//     }
// };

// // GET /org-chart  (company > departments > people, plus who reports to whom)
// exports.orgChart = async (req, res, next) => {
//     try {
//         let company = "";
//         try {
//             const Settings = require("../models/Settings");
//             company = (await Settings.findOne().select("companyName").lean())?.companyName || "";
//         } catch {
//             /* the chart works without it */
//         }

//         const [departments, teams, employees] = await Promise.all([
//             Department.find({ isActive: { $ne: false } }).populate("head", "name employeeId designation").sort({ name: 1 }).lean(),
//             Team.find({ status: { $ne: "inactive" } }).sort({ name: 1 }).lean(),
//             Employee.find(ACTIVE_EMP).select("name employeeId designation department reportingManager").lean(),
//         ]);

//         const byDept = new Map();
//         employees.forEach((e) => {
//             const k = String(e.department?._id || e.department || "");
//             if (!byDept.has(k)) byDept.set(k, []);
//             byDept.get(k).push(e);
//         });

//         const person = (e) => ({ _id: e._id, name: e.name, employeeId: e.employeeId, designation: typeof e.designation === "string" ? e.designation : e.designation?.title || "" });

//         const nodes = departments.map((d) => {
//             const people = byDept.get(String(d._id)) || byDept.get(lc(d.name)) || [];
//             const roles = {};
//             people.forEach((p) => {
//                 const t = person(p).designation || "Not set";
//                 roles[t] = (roles[t] || 0) + 1;
//             });
//             return {
//                 _id: d._id, name: d.name, code: d.code, branch: d.branch, head: d.head || null, employeeCount: people.length,
//                 designations: Object.entries(roles).map(([title, count]) => ({ title, count })).sort((a, b) => b.count - a.count),
//                 teams: teams.filter((t) => lc(t.department) === lc(d.name)).map((t) => ({ _id: t._id, name: t.name, teamLead: t.teamLead, membersCount: t.membersCount })),
//                 members: people.slice(0, 60).map(person),
//             };
//         });

//         const managers = {};
//         employees.forEach((e) => {
//             const m = String(e.reportingManager || "").trim();
//             if (m) (managers[m] = managers[m] || []).push(person(e));
//         });

//         res.json({
//             success: true,
//             data: {
//                 company, totalEmployees: employees.length, departments: nodes,
//                 unassigned: employees.filter((e) => !e.department).length,
//                 managers: Object.entries(managers).map(([name, reportees]) => ({ name, reporteesCount: reportees.length, reportees: reportees.slice(0, 60) })).sort((a, b) => b.reporteesCount - a.reporteesCount),
//             },
//         });
//     } catch (err) {
//         next(err);
//     }
// };