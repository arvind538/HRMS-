const mongoose = require("mongoose");
const Goal = require("../models/Goal");
const Appraisal = require("../models/Appraisal");
const Employee = require("../models/Employee");
const Department = require("../models/Department");
const Designation = require("../models/Designation");
const User = require("../models/User");
const { notify, userIdOfEmployee } = require("../utils/notify");

/* ------------------------------- constants ------------------------------- */

const GOAL_TYPES = ["goal", "kpi"];
const PRIORITIES = ["low", "medium", "high"];
const GOAL_STATUS = ["not-started", "in-progress", "completed", "overdue"];
const SETTABLE = ["not-started", "in-progress", "completed"];
const DECISIONS = ["approved", "rejected"];
const RATING = { 1: "Unsatisfactory", 2: "Needs improvement", 3: "Meets expectations", 4: "Exceeds expectations", 5: "Outstanding" };
const PERIOD = /^[A-Z0-9][A-Z0-9 \-]{2,19}$/;
const DECIDED = ["approved", "applied"];
const ACTIVE_EMP = { isExited: { $ne: true }, employeeStatus: { $not: /^(inactive|terminated|exited|resigned|absconded)$/i } };
const EMP_FIELDS = "name employeeId department designation";

/* ------------------------------- helpers ------------------------------- */

const idOf = (v) => String(v?._id || v || "");
const validId = (v) => mongoose.isValidObjectId(v);
const bad = (res, message, status = 400) => res.status(status).json({ message });
const clean = (v, max) => String(v ?? "").trim().slice(0, max);
const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const toDate = (v) => {
    if (!v) return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
};
const startOfToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
};
const roleOf = (req) => String(req.user?.role || "").toLowerCase();
const isStaff = (req) => ["admin", "hr"].includes(roleOf(req));
const statusFromProgress = (p) => (p >= 100 ? "completed" : p > 0 ? "in-progress" : "not-started");

const empPop = (q) => q.populate("employee", EMP_FIELDS);
const apprPop = (q) => q.populate("employee", EMP_FIELDS).populate("reviewedBy", "name employeeId");

/* department and designation may be saved as an id or as plain text, so both are turned into a name */
async function nameMaps() {
    const [d, g] = await Promise.all([Department.find().select("name").lean(), Designation.find().select("title").lean()]);
    return { dept: new Map(d.map((x) => [String(x._id), x.name])), desig: new Map(g.map((x) => [String(x._id), x.title])) };
}
const labelOf = (map, v) => {
    if (!v) return "";
    if (typeof v === "object" && (v.name || v.title)) return v.name || v.title;
    const raw = idOf(v);
    return map.get(raw) || (validId(raw) ? "" : raw);
};
const shapeEmp = (e, maps) => (e && typeof e === "object" && e.name ? { _id: e._id, name: e.name, employeeId: e.employeeId, department: labelOf(maps.dept, e.department), designation: labelOf(maps.desig, e.designation) } : e ? { _id: idOf(e) } : null);

async function tell(empId, title, message, link, exclude) {
    try {
        const uid = await userIdOfEmployee(empId);
        if (uid) await notify(uid, { type: "general", title, message, link, exclude });
    } catch {
        /* a failed notification never stops the work */
    }
}
async function tellHr(title, message, link) {
    try {
        const users = await User.find({ role: { $in: ["admin", "hr"] }, isActive: { $ne: false } }).select("_id").lean();
        if (users.length) await notify(users.map((u) => u._id), { type: "general", title, message, link });
    } catch {
        /* ignored */
    }
}

/* ------------------------------- who can see whom ------------------------------- */

/* the people who report to a manager (the reporting manager is saved as text or as an id) */
async function teamOf(me) {
    const p = Employee.schema.path("reportingManager");
    if (!p) return [];
    const or = [];
    if (p.instance === "ObjectId") or.push({ reportingManager: me._id });
    else {
        or.push({ reportingManager: new RegExp(`^\\s*${esc(me.name)}\\s*$`, "i") });
        if (me.employeeId) or.push({ reportingManager: new RegExp(`^\\s*${esc(me.employeeId)}\\s*$`, "i") });
    }
    const rows = await Employee.find({ $or: or, _id: { $ne: me._id }, ...ACTIVE_EMP }).select("_id").lean();
    return rows.map((r) => String(r._id));
}

/* all = Admin and HR. Others see only themselves (and a manager also the team). */
async function scopeOf(req) {
    const role = roleOf(req);
    if (isStaff(req)) return { all: true, role, me: null, team: [], ids: [] };
    const own = req.user?.employee ? idOf(req.user.employee) : "";
    const me = own && validId(own) ? await Employee.findById(own).select("name employeeId reportingManager").lean() : null;
    const team = role === "manager" && me ? await teamOf(me) : [];
    const ids = [...new Set([...(me ? [String(me._id)] : []), ...team])];
    return { all: false, role, me, team, ids };
}
const meId = (sc) => (sc.me ? String(sc.me._id) : "");
const canSee = (sc, empId) => sc.all || sc.ids.includes(idOf(empId));
const scopeFilter = (sc) => (sc.all ? {} : { employee: { $in: sc.ids } });

/* ============================== PEOPLE (for the dropdowns) ============================== */

// GET /people  -> Admin and HR: everyone, Manager: team and self, Employee: self
exports.people = async (req, res, next) => {
    try {
        const sc = await scopeOf(req);
        const filter = sc.all ? ACTIVE_EMP : { _id: { $in: sc.ids }, ...ACTIVE_EMP };
        const [rows, maps] = await Promise.all([Employee.find(filter).select(EMP_FIELDS).sort({ name: 1 }).limit(1000).lean(), nameMaps()]);
        res.json(rows.map((e) => ({ ...shapeEmp(e, maps), isMe: String(e._id) === meId(sc) })));
    } catch (err) {
        next(err);
    }
};

/* ============================== GOALS / KPIs ============================== */

function shapeGoal(g, maps) {
    const o = g.toObject ? g.toObject() : { ...g };
    const today = startOfToday();
    const overdue = o.status !== "completed" && o.targetDate && new Date(o.targetDate) < today;
    return {
        ...o,
        employee: shapeEmp(o.employee, maps),
        storedStatus: o.status,
        status: overdue ? "overdue" : o.status,
        isOverdue: Boolean(overdue),
        daysLeft: o.targetDate ? Math.ceil((new Date(o.targetDate) - today) / 86400000) : null,
    };
}

async function readGoal(b, current, sc) {
    const out = {};
    const title = b.title !== undefined ? clean(b.title, 150) : current?.title || "";
    if (title.length < 2) return { error: "Goal title must be at least 2 characters." };
    out.title = title;

    if (!current || (b.employee !== undefined && sc.all && idOf(b.employee) !== idOf(current.employee))) {
        const e = String(b.employee || (sc.role === "employee" ? meId(sc) : "")).trim();
        if (!validId(e)) return { error: "Please select the employee." };
        if (!(await Employee.exists({ _id: e }))) return { error: "Employee not found." };
        if (!canSee(sc, e)) return { error: "You can set goals only for yourself or your team.", code: 403 };
        out.employee = e;
    }

    if (b.description !== undefined) out.description = clean(b.description, 1000);
    if (b.type !== undefined) {
        if (!GOAL_TYPES.includes(b.type)) return { error: "Please select Goal or KPI." };
        out.type = b.type;
    }
    if (b.priority !== undefined) {
        if (!PRIORITIES.includes(b.priority)) return { error: "Please select a valid priority." };
        out.priority = b.priority;
    }
    if (b.unit !== undefined) out.unit = clean(b.unit, 20);

    for (const k of ["startDate", "targetDate"]) {
        if (b[k] === undefined) continue;
        if (!b[k]) out[k] = null;
        else {
            const d = toDate(b[k]);
            if (!d) return { error: `Please enter a valid ${k === "startDate" ? "start" : "target"} date.` };
            out[k] = d;
        }
    }
    const s = "startDate" in out ? out.startDate : current?.startDate;
    const t = "targetDate" in out ? out.targetDate : current?.targetDate;
    if (!current && !t) return { error: "Please select the target date." };
    if (s && t && t < s) return { error: "The target date cannot be before the start date." };

    for (const k of ["targetValue", "currentValue"]) {
        if (b[k] === undefined) continue;
        const n = Number(b[k] === "" ? 0 : b[k]);
        if (!Number.isFinite(n) || n < 0 || n > 1e9) return { error: `${k === "targetValue" ? "Target" : "Current"} value must be a positive number.` };
        out[k] = n;
    }

    const tv = "targetValue" in out ? out.targetValue : current?.targetValue || 0;
    const cv = "currentValue" in out ? out.currentValue : current?.currentValue || 0;
    if (tv > 0) out.progress = Math.min(100, Math.round((cv / tv) * 100));
    else if (b.progress !== undefined) {
        const n = Number(b.progress);
        if (!Number.isFinite(n) || n < 0 || n > 100) return { error: "Progress must be from 0 to 100." };
        out.progress = Math.round(n);
    } else if (b.status !== undefined && SETTABLE.includes(b.status)) {
        out.progress = b.status === "completed" ? 100 : b.status === "not-started" ? 0 : current?.progress || 1;
    }
    if (out.progress !== undefined) {
        out.status = statusFromProgress(out.progress);
        out.completedAt = out.status === "completed" ? current?.completedAt || new Date() : null;
    }
    return { data: out };
}

const canEditGoal = (req, sc, g) => sc.all || (sc.role === "manager" && sc.ids.includes(idOf(g.employee))) || (idOf(g.createdBy) === String(req.user._id) && meId(sc) === idOf(g.employee));

// GET /goals?employee=&status=&type=
exports.getGoals = async (req, res, next) => {
    try {
        const sc = await scopeOf(req);
        const { employee, status, type } = req.query;
        const filter = scopeFilter(sc);
        if (employee) {
            if (!validId(employee)) return bad(res, "Please select a valid employee.");
            if (!canSee(sc, employee)) return bad(res, "You cannot view this employee's goals.", 403);
            filter.employee = employee;
        }
        if (GOAL_TYPES.includes(type)) filter.type = type;
        const [rows, maps] = await Promise.all([empPop(Goal.find(filter).sort({ targetDate: 1 }).limit(1000)).lean(), nameMaps()]);
        let list = rows.map((g) => shapeGoal(g, maps));
        if (GOAL_STATUS.includes(status)) list = list.filter((g) => g.status === status);
        res.json(list);
    } catch (err) {
        next(err);
    }
};

exports.createGoal = async (req, res, next) => {
    try {
        const sc = await scopeOf(req);
        const input = await readGoal(req.body || {}, null, sc);
        if (input.error) return bad(res, input.error, input.code || 400);
        const goal = await Goal.create({ progress: 0, status: "not-started", ...input.data, createdBy: req.user._id });
        if (idOf(goal.employee) !== meId(sc)) await tell(goal.employee, "New goal", `A new ${goal.type === "kpi" ? "KPI" : "goal"} was set for you: ${goal.title}`, "/performance/goals", req.user._id);
        const [full, maps] = await Promise.all([empPop(Goal.findById(goal._id)).lean(), nameMaps()]);
        res.status(201).json(shapeGoal(full, maps));
    } catch (err) {
        next(err);
    }
};

exports.updateGoal = async (req, res, next) => {
    try {
        const sc = await scopeOf(req);
        const goal = await Goal.findById(req.params.id);
        if (!goal) return bad(res, "Goal not found.", 404);
        if (!canEditGoal(req, sc, goal)) return bad(res, "You cannot edit this goal. You can update its progress.", 403);
        const input = await readGoal(req.body || {}, goal, sc);
        if (input.error) return bad(res, input.error, input.code || 400);
        goal.set(input.data);
        await goal.save();
        const [full, maps] = await Promise.all([empPop(Goal.findById(goal._id)).lean(), nameMaps()]);
        res.json(shapeGoal(full, maps));
    } catch (err) {
        next(err);
    }
};

// PUT /goals/:id/progress  { progress } or { currentValue }, and an optional { note }
exports.updateGoalProgress = async (req, res, next) => {
    try {
        const sc = await scopeOf(req);
        const goal = await Goal.findById(req.params.id);
        if (!goal) return bad(res, "Goal not found.", 404);
        if (!canSee(sc, goal.employee)) return bad(res, "You cannot update this goal.", 403);

        const b = req.body || {};
        if (goal.targetValue > 0) {
            const cv = Number(b.currentValue ?? (b.progress !== undefined ? (Number(b.progress) / 100) * goal.targetValue : NaN));
            if (!Number.isFinite(cv) || cv < 0 || cv > 1e9) return bad(res, "Enter the current value.");
            goal.currentValue = cv;
            goal.progress = Math.min(100, Math.round((cv / goal.targetValue) * 100));
        } else {
            const p = Number(b.progress);
            if (!Number.isFinite(p) || p < 0 || p > 100) return bad(res, "Progress must be from 0 to 100.");
            goal.progress = Math.round(p);
        }
        goal.status = statusFromProgress(goal.progress);
        goal.completedAt = goal.status === "completed" ? goal.completedAt || new Date() : null;
        goal.updates.push({ progress: goal.progress, currentValue: goal.currentValue, note: clean(b.note, 300), by: req.user._id, at: new Date() });
        if (goal.updates.length > 30) goal.updates = goal.updates.slice(-30);
        await goal.save();

        const [full, maps] = await Promise.all([empPop(Goal.findById(goal._id)).lean(), nameMaps()]);
        res.json(shapeGoal(full, maps));
    } catch (err) {
        next(err);
    }
};

exports.deleteGoal = async (req, res, next) => {
    try {
        const sc = await scopeOf(req);
        const goal = await Goal.findById(req.params.id);
        if (!goal) return bad(res, "Goal not found.", 404);
        if (!canEditGoal(req, sc, goal)) return bad(res, "You cannot delete this goal.", 403);
        await goal.deleteOne();
        res.json({ message: "Goal deleted." });
    } catch (err) {
        next(err);
    }
};

/* ============================== APPRAISALS ============================== */

function shapeAppraisal(a, maps, sc) {
    const o = a.toObject ? a.toObject() : { ...a };
    const empId = idOf(o.employee);
    o.promotionStatus = o.promotionStatus && o.promotionStatus !== "none" ? o.promotionStatus : o.promotionRecommended ? "pending" : "none";
    o.incrementStatus = o.incrementStatus && o.incrementStatus !== "none" ? o.incrementStatus : o.incrementPercent > 0 ? "pending" : "none";
    o.employee = shapeEmp(o.employee, maps);
    o.ratingLabel = RATING[o.rating] || "";
    o.isOverdue = Boolean(o.status !== "completed" && o.dueDate && new Date(o.dueDate) < startOfToday());
    o.isMine = empId === meId(sc);

    const senior = sc.all || (sc.role === "manager" && !o.isMine);
    if (!senior) {
        // the employee sees a promotion or increment only after HR has decided
        if (!DECIDED.includes(o.promotionStatus)) {
            delete o.promotionRecommended;
            delete o.proposedDesignation;
            delete o.promotionNote;
            o.promotionStatus = "none";
        }
        if (!DECIDED.includes(o.incrementStatus)) {
            delete o.incrementPercent;
            delete o.incrementNote;
            o.incrementStatus = "none";
        }
    }
    if (!sc.all) {
        delete o.incrementPrevSalary;
        delete o.incrementNewSalary;
    }
    return o;
}

const loadAppraisal = async (id, sc) => {
    const [full, maps] = await Promise.all([apprPop(Appraisal.findById(id)).lean(), nameMaps()]);
    return shapeAppraisal(full, maps, sc);
};

// GET /appraisals?status=&period=&employee=
exports.getAppraisals = async (req, res, next) => {
    try {
        const sc = await scopeOf(req);
        const { status, period, employee } = req.query;
        const filter = scopeFilter(sc);
        if (["pending-self", "pending-manager", "completed"].includes(status)) filter.status = status;
        if (period) filter.reviewPeriod = String(period).toUpperCase().slice(0, 20);
        if (employee) {
            if (!validId(employee)) return bad(res, "Please select a valid employee.");
            if (!canSee(sc, employee)) return bad(res, "You cannot view this employee's appraisals.", 403);
            filter.employee = employee;
        }
        const [rows, maps] = await Promise.all([apprPop(Appraisal.find(filter).sort({ createdAt: -1 }).limit(1000)).lean(), nameMaps()]);
        res.json(rows.map((a) => shapeAppraisal(a, maps, sc)));
    } catch (err) {
        next(err);
    }
};

function readPeriod(b, current) {
    const out = {};
    const period = (b.reviewPeriod !== undefined ? clean(b.reviewPeriod, 20) : current?.reviewPeriod || "").toUpperCase();
    if (!PERIOD.test(period)) return { error: "Enter the review period, for example 2026-H1." };
    out.reviewPeriod = period;
    if (b.dueDate !== undefined) {
        if (!b.dueDate) out.dueDate = null;
        else {
            const d = toDate(b.dueDate);
            if (!d) return { error: "Please enter a valid due date." };
            out.dueDate = d;
        }
    }
    return { data: out };
}

// POST /appraisals  { employee, reviewPeriod, dueDate }
exports.createAppraisal = async (req, res, next) => {
    try {
        const sc = await scopeOf(req);
        const input = readPeriod(req.body || {}, null);
        if (input.error) return bad(res, input.error);
        const e = String(req.body?.employee || "").trim();
        if (!validId(e)) return bad(res, "Please select the employee.");
        if (!(await Employee.exists({ _id: e, ...ACTIVE_EMP }))) return bad(res, "Employee not found or not active.");
        if (await Appraisal.exists({ employee: e, reviewPeriod: input.data.reviewPeriod })) return bad(res, `This employee already has an appraisal for ${input.data.reviewPeriod}.`, 409);

        const doc = await Appraisal.create({ ...input.data, employee: e, createdBy: req.user._id });
        await tell(e, "Appraisal started", `Your ${doc.reviewPeriod} appraisal is ready. Please write your self assessment.`, "/performance/self-assessment", req.user._id);
        res.status(201).json(await loadAppraisal(doc._id, sc));
    } catch (err) {
        next(err);
    }
};

// POST /appraisals/bulk  { reviewPeriod, dueDate, employees?: [ids] }   (no employees = everyone active)
exports.bulkCreateAppraisals = async (req, res, next) => {
    try {
        const input = readPeriod(req.body || {}, null);
        if (input.error) return bad(res, input.error);

        const filter = { ...ACTIVE_EMP };
        if (Array.isArray(req.body?.employees) && req.body.employees.length) {
            const ids = req.body.employees.map(String).filter(validId);
            if (!ids.length) return bad(res, "Please select valid employees.");
            filter._id = { $in: ids };
        }
        const emps = await Employee.find(filter).select("_id").limit(2000).lean();
        if (!emps.length) return bad(res, "No active employees found.");

        const have = new Set((await Appraisal.find({ reviewPeriod: input.data.reviewPeriod, employee: { $in: emps.map((e) => e._id) } }).select("employee").lean()).map((a) => String(a.employee)));
        const fresh = emps.filter((e) => !have.has(String(e._id)));
        if (fresh.length) await Appraisal.insertMany(fresh.map((e) => ({ ...input.data, employee: e._id, createdBy: req.user._id })), { ordered: false });

        (async () => {
            for (const e of fresh) await tell(e._id, "Appraisal started", `Your ${input.data.reviewPeriod} appraisal is ready. Please write your self assessment.`, "/performance/self-assessment", req.user._id);
        })();

        res.status(201).json({ created: fresh.length, skipped: emps.length - fresh.length, message: `${fresh.length} appraisal${fresh.length === 1 ? "" : "s"} created${emps.length - fresh.length ? `, ${emps.length - fresh.length} already existed` : ""}.` });
    } catch (err) {
        next(err);
    }
};

// PUT /appraisals/:id  (HR: period and due date)
exports.updateAppraisal = async (req, res, next) => {
    try {
        const sc = await scopeOf(req);
        const a = await Appraisal.findById(req.params.id);
        if (!a) return bad(res, "Appraisal not found.", 404);
        const input = readPeriod(req.body || {}, a);
        if (input.error) return bad(res, input.error);
        if (input.data.reviewPeriod !== a.reviewPeriod && (await Appraisal.exists({ employee: a.employee, reviewPeriod: input.data.reviewPeriod, _id: { $ne: a._id } })))
            return bad(res, `This employee already has an appraisal for ${input.data.reviewPeriod}.`, 409);
        a.set(input.data);
        await a.save();
        res.json(await loadAppraisal(a._id, sc));
    } catch (err) {
        next(err);
    }
};

// PUT /appraisals/:id/reopen  (HR: send a completed appraisal back to the manager)
exports.reopenAppraisal = async (req, res, next) => {
    try {
        const sc = await scopeOf(req);
        const a = await Appraisal.findById(req.params.id);
        if (!a) return bad(res, "Appraisal not found.", 404);
        if (a.status !== "completed") return bad(res, "Only a completed appraisal can be reopened.", 409);
        if (a.promotionStatus === "applied" || a.incrementStatus === "applied") return bad(res, "A promotion or increment was already applied, so this appraisal cannot be reopened.", 409);
        a.status = "pending-manager";
        a.completedAt = undefined;
        await a.save();
        res.json(await loadAppraisal(a._id, sc));
    } catch (err) {
        next(err);
    }
};

exports.deleteAppraisal = async (req, res, next) => {
    try {
        const a = await Appraisal.findById(req.params.id);
        if (!a) return bad(res, "Appraisal not found.", 404);
        if (a.promotionStatus === "applied" || a.incrementStatus === "applied") return bad(res, "A promotion or increment was applied from this appraisal, so it cannot be deleted.", 409);
        await a.deleteOne();
        res.json({ message: "Appraisal deleted." });
    } catch (err) {
        next(err);
    }
};

// PUT /appraisals/:id/self-assessment  { selfAssessment, selfRating? }  (only the employee, for their own appraisal)
exports.submitSelfAssessment = async (req, res, next) => {
    try {
        const sc = await scopeOf(req);
        const a = await Appraisal.findById(req.params.id);
        if (!a) return bad(res, "Appraisal not found.", 404);
        if (!meId(sc) || idOf(a.employee) !== meId(sc)) return bad(res, "You can write only your own self assessment.", 403);
        if (a.status === "completed") return bad(res, "This appraisal is already completed.", 409);

        const text = clean(req.body?.selfAssessment, 3000);
        if (text.length < 10) return bad(res, "Please write at least a few lines about your work.");
        let rating;
        if (req.body?.selfRating !== undefined && req.body.selfRating !== "" && req.body.selfRating !== null) {
            rating = Number(req.body.selfRating);
            if (!Number.isInteger(rating) || rating < 1 || rating > 5) return bad(res, "Self rating must be from 1 to 5.");
        }
        a.set({ selfAssessment: text, selfRating: rating, status: "pending-manager", submittedSelfAt: new Date() });
        await a.save();
        await tellHr("Self assessment submitted", `${sc.me.name} submitted the ${a.reviewPeriod} self assessment.`, "/performance/reviews");
        res.json(await loadAppraisal(a._id, sc));
    } catch (err) {
        next(err);
    }
};

// PUT /appraisals/:id/manager-assessment
exports.submitManagerAssessment = async (req, res, next) => {
    try {
        const sc = await scopeOf(req);
        const a = await Appraisal.findById(req.params.id);
        if (!a) return bad(res, "Appraisal not found.", 404);
        const emp = idOf(a.employee);
        if (meId(sc) && emp === meId(sc)) return bad(res, "You cannot review your own appraisal.", 403);
        if (!sc.all && !sc.team.includes(emp)) return bad(res, "You can review only the people who report to you.", 403);
        if (a.status === "pending-self" && !sc.all) return bad(res, "The employee has not written the self assessment yet.", 409);
        if (a.status === "completed" && !sc.all) return bad(res, "This appraisal is already completed.", 409);

        const b = req.body || {};
        const text = clean(b.managerAssessment, 3000);
        const rating = Number(b.rating);
        if (text.length < 10) return bad(res, "Please write your assessment (at least a few lines).");
        if (!Number.isInteger(rating) || rating < 1 || rating > 5) return bad(res, "Rating must be from 1 to 5.");

        const set = { managerAssessment: text, rating, strengths: clean(b.strengths, 1000), areasOfImprovement: clean(b.areasOfImprovement, 1000), status: "completed", completedAt: new Date() };
        if (sc.me) set.reviewedBy = sc.me._id;

        // once HR decided or applied a promotion/increment those parts stay as they are
        const promoLocked = ["approved", "applied", "rejected"].includes(a.promotionStatus);
        const incLocked = ["approved", "applied", "rejected"].includes(a.incrementStatus);
        if (!promoLocked) {
            const rec = b.promotionRecommended === true || b.promotionRecommended === "true";
            set.promotionRecommended = rec;
            set.proposedDesignation = rec ? clean(b.proposedDesignation, 80) : "";
            set.promotionStatus = rec ? "pending" : "none";
        }
        if (!incLocked) {
            const pct = Number(b.incrementPercent || 0);
            if (!Number.isFinite(pct) || pct < 0 || pct > 100) return bad(res, "Increment must be from 0 to 100 percent.");
            set.incrementPercent = pct;
            set.incrementStatus = pct > 0 ? "pending" : "none";
        }

        a.set(set);
        await a.save();
        await tell(a.employee, "Appraisal completed", `Your ${a.reviewPeriod} appraisal is completed. Your rating is ${rating}/5.`, "/performance/reviews", req.user._id);
        if (set.promotionStatus === "pending" || set.incrementStatus === "pending") await tellHr("Recommendation to review", `A ${a.reviewPeriod} appraisal has a promotion or increment recommendation.`, "/performance/promotion");
        res.json(await loadAppraisal(a._id, sc));
    } catch (err) {
        next(err);
    }
};

/* ============================== RATINGS ============================== */

// GET /ratings?period=
exports.getRatings = async (req, res, next) => {
    try {
        const sc = await scopeOf(req);
        const filter = { ...scopeFilter(sc), status: "completed", rating: { $gte: 1 } };
        if (req.query.period) filter.reviewPeriod = String(req.query.period).toUpperCase().slice(0, 20);

        const [rows, maps, periods] = await Promise.all([
            apprPop(Appraisal.find(filter).sort({ rating: -1, completedAt: -1 }).limit(1000)).lean(),
            nameMaps(),
            Appraisal.distinct("reviewPeriod", { ...scopeFilter(sc), status: "completed" }),
        ]);

        const list = rows.map((a) => shapeAppraisal(a, maps, sc));
        const total = list.length;
        const distribution = [5, 4, 3, 2, 1].map((r) => {
            const count = list.filter((a) => a.rating === r).length;
            return { rating: r, label: RATING[r], count, percent: total ? Math.round((count / total) * 100) : 0 };
        });
        const dept = {};
        list.forEach((a) => {
            const n = a.employee?.department || "Not set";
            (dept[n] = dept[n] || { name: n, sum: 0, count: 0 });
            dept[n].sum += a.rating;
            dept[n].count += 1;
        });

        res.json({
            total,
            average: total ? Number((list.reduce((s, a) => s + a.rating, 0) / total).toFixed(2)) : 0,
            periods: periods.sort().reverse(),
            distribution,
            byDepartment: Object.values(dept).map((d) => ({ name: d.name, count: d.count, average: Number((d.sum / d.count).toFixed(2)) })).sort((x, y) => y.average - x.average),
            rows: list,
        });
    } catch (err) {
        next(err);
    }
};

/* ============================== PROMOTION ============================== */

const promoFilter = { $or: [{ promotionRecommended: true }, { promotionStatus: { $in: ["pending", "approved", "rejected", "applied"] } }] };
const incFilter = { $or: [{ incrementPercent: { $gt: 0 } }, { incrementStatus: { $in: ["pending", "approved", "rejected", "applied"] } }] };

async function decisionList(req, res, next, kind) {
    try {
        const sc = await scopeOf(req);
        const filter = { ...scopeFilter(sc), status: "completed", ...(kind === "promotion" ? promoFilter : incFilter) };
        const [rows, maps] = await Promise.all([apprPop(Appraisal.find(filter).sort({ completedAt: -1 }).limit(1000)).lean(), nameMaps()]);
        let list = rows.map((a) => shapeAppraisal(a, maps, sc));
        // an employee sees only what was decided in their favour
        if (!sc.all && sc.role !== "manager") list = list.filter((a) => DECIDED.includes(kind === "promotion" ? a.promotionStatus : a.incrementStatus));
        else if (!sc.all) list = list.filter((a) => !a.isMine || DECIDED.includes(kind === "promotion" ? a.promotionStatus : a.incrementStatus));
        res.json(list);
    } catch (err) {
        next(err);
    }
}
exports.getPromotions = (req, res, next) => decisionList(req, res, next, "promotion");
exports.getIncrements = (req, res, next) => decisionList(req, res, next, "increment");

const effStatus = (a, kind) => {
    const s = kind === "promotion" ? a.promotionStatus : a.incrementStatus;
    if (s && s !== "none") return s;
    return kind === "promotion" ? (a.promotionRecommended ? "pending" : "none") : a.incrementPercent > 0 ? "pending" : "none";
};

// PUT /appraisals/:id/promotion  { decision: approved|rejected, newDesignation?, note? }
exports.decidePromotion = async (req, res, next) => {
    try {
        const sc = await scopeOf(req);
        const { decision, newDesignation, note } = req.body || {};
        if (!DECISIONS.includes(decision)) return bad(res, "Please choose approve or reject.");
        const a = await Appraisal.findById(req.params.id);
        if (!a) return bad(res, "Appraisal not found.", 404);
        if (a.status !== "completed") return bad(res, "The manager has not completed this appraisal yet.", 409);
        if (effStatus(a, "promotion") === "applied") return bad(res, "This promotion is already applied.", 409);
        if (a.employee && meId(sc) && idOf(a.employee) === meId(sc)) return bad(res, "You cannot decide your own promotion.", 403);

        const title = clean(newDesignation || a.proposedDesignation, 80);
        if (decision === "approved" && title.length < 2) return bad(res, "Please enter the new designation.");
        a.set({ promotionRecommended: true, proposedDesignation: title || a.proposedDesignation, promotionStatus: decision, promotionNote: clean(note, 300), promotionDecidedBy: req.user._id, promotionDecidedAt: new Date() });
        await a.save();
        await tell(a.employee, `Promotion ${decision}`, decision === "approved" ? `Congratulations! You are promoted to ${title}.` : "Your promotion recommendation was reviewed.", "/performance/promotion", req.user._id);
        res.json(await loadAppraisal(a._id, sc));
    } catch (err) {
        next(err);
    }
};

// POST /appraisals/:id/promotion/apply  (changes the designation of the employee)
exports.applyPromotion = async (req, res, next) => {
    let claimed = null;
    try {
        const sc = await scopeOf(req);
        const a = await Appraisal.findById(req.params.id);
        if (!a) return bad(res, "Appraisal not found.", 404);
        if (a.promotionStatus !== "approved") return bad(res, a.promotionStatus === "applied" ? "This promotion is already applied." : "Approve the promotion first.", 409);
        const title = clean(a.proposedDesignation, 80);
        if (!title) return bad(res, "The new designation is missing.");

        const path = Employee.schema.path("designation");
        if (!path) return bad(res, "The employee record has no designation field.", 500);
        let value = title;
        if (path.instance === "ObjectId") {
            const d = await Designation.findOne({ title: new RegExp(`^${esc(title)}$`, "i") }).select("_id").lean();
            if (!d) return bad(res, `The designation "${title}" is not in Organization > Designations. Add it first.`, 409);
            value = d._id;
        }

        // claim it first so two clicks cannot apply it twice
        claimed = await Appraisal.findOneAndUpdate({ _id: a._id, promotionStatus: "approved" }, { promotionStatus: "applied", promotionAppliedAt: new Date() }, { new: false });
        if (!claimed) return bad(res, "This promotion is already applied.", 409);

        const [before, maps] = await Promise.all([Employee.findById(a.employee).select("designation").lean(), nameMaps()]);
        const r = await Employee.updateOne({ _id: a.employee }, { designation: value });
        if (!r.matchedCount) throw new Error("Employee not found.");
        await Appraisal.updateOne({ _id: a._id }, { promotionFrom: labelOf(maps.desig, before?.designation) });
        await tell(a.employee, "Designation updated", `Your designation is now ${title}.`, "/performance/promotion", req.user._id);
        res.json(await loadAppraisal(a._id, sc));
    } catch (err) {
        if (claimed) await Appraisal.updateOne({ _id: claimed._id }, { promotionStatus: "approved", $unset: { promotionAppliedAt: 1 } }).catch(() => { });
        next(err);
    }
};

/* ============================== INCREMENT ============================== */

// PUT /appraisals/:id/increment  { decision, incrementPercent?, effectiveDate?, note? }
exports.decideIncrement = async (req, res, next) => {
    try {
        const sc = await scopeOf(req);
        const { decision, incrementPercent, effectiveDate, note } = req.body || {};
        if (!DECISIONS.includes(decision)) return bad(res, "Please choose approve or reject.");
        const a = await Appraisal.findById(req.params.id);
        if (!a) return bad(res, "Appraisal not found.", 404);
        if (a.status !== "completed") return bad(res, "The manager has not completed this appraisal yet.", 409);
        if (effStatus(a, "increment") === "applied") return bad(res, "This increment is already applied to the salary.", 409);
        if (meId(sc) && idOf(a.employee) === meId(sc)) return bad(res, "You cannot decide your own increment.", 403);

        const pct = incrementPercent !== undefined && incrementPercent !== "" ? Number(incrementPercent) : a.incrementPercent;
        if (decision === "approved" && (!Number.isFinite(pct) || pct <= 0 || pct > 100)) return bad(res, "Enter the increment percent (more than 0, up to 100).");
        let eff = a.incrementEffectiveDate;
        if (effectiveDate) {
            eff = toDate(effectiveDate);
            if (!eff) return bad(res, "Please enter a valid effective date.");
        }
        if (decision === "approved" && !eff) return bad(res, "Please select the date from which the increment starts.");

        a.set({ incrementPercent: Number.isFinite(pct) ? pct : a.incrementPercent, incrementStatus: decision, incrementEffectiveDate: eff, incrementNote: clean(note, 300), incrementDecidedBy: req.user._id, incrementDecidedAt: new Date() });
        await a.save();
        await tell(a.employee, `Increment ${decision}`, decision === "approved" ? `Your increment of ${pct}% is approved.` : "Your increment recommendation was reviewed.", "/performance/increment", req.user._id);
        res.json(await loadAppraisal(a._id, sc));
    } catch (err) {
        next(err);
    }
};

// POST /appraisals/:id/increment/apply  (Admin: raises the salary used by payroll)
exports.applyIncrement = async (req, res, next) => {
    let claimed = null;
    try {
        const sc = await scopeOf(req);
        const a = await Appraisal.findById(req.params.id);
        if (!a) return bad(res, "Appraisal not found.", 404);
        if (a.incrementStatus !== "approved") return bad(res, a.incrementStatus === "applied" ? "This increment is already applied." : "Approve the increment first.", 409);
        if (a.incrementEffectiveDate && new Date(a.incrementEffectiveDate) > new Date()) return bad(res, `This increment starts on ${new Date(a.incrementEffectiveDate).toLocaleDateString("en-GB")}. Apply it on or after that date.`, 409);

        const emp = await Employee.findById(a.employee).select("salary name").lean();
        if (!emp) return bad(res, "Employee not found.", 404);
        const prev = Number(emp.salary);
        if (!Number.isFinite(prev) || prev <= 0) return bad(res, "This employee has no salary set. Set the salary in Payroll > Employee Salary first.", 409);
        const next_ = Math.round(prev * (1 + a.incrementPercent / 100));

        claimed = await Appraisal.findOneAndUpdate({ _id: a._id, incrementStatus: "approved" }, { incrementStatus: "applied", incrementAppliedAt: new Date(), incrementAppliedBy: req.user._id, incrementPrevSalary: prev, incrementNewSalary: next_ }, { new: false });
        if (!claimed) return bad(res, "This increment is already applied.", 409);

        const r = await Employee.updateOne({ _id: a.employee, salary: prev }, { salary: next_ });
        if (!r.matchedCount) throw new Error("The salary changed while applying. Please try again.");
        await tell(a.employee, "Salary updated", `Your increment of ${a.incrementPercent}% is applied to your salary.`, "/performance/increment", req.user._id);
        res.json(await loadAppraisal(a._id, sc));
    } catch (err) {
        if (claimed) await Appraisal.updateOne({ _id: claimed._id }, { incrementStatus: "approved", $unset: { incrementAppliedAt: 1, incrementAppliedBy: 1, incrementPrevSalary: 1, incrementNewSalary: 1 } }).catch(() => { });
        next(err);
    }
};

/* ============================== DASHBOARD ============================== */

// GET /summary  (also served on the old /aggregate-report path)
exports.getSummary = async (req, res, next) => {
    try {
        const sc = await scopeOf(req);
        const f = scopeFilter(sc);
        const today = startOfToday();
        const [goals, appraisals, maps] = await Promise.all([
            empPop(Goal.find(f).select("employee title status targetDate progress").limit(5000)).lean(),
            apprPop(Appraisal.find(f).select("employee status rating reviewPeriod dueDate promotionStatus promotionRecommended incrementStatus incrementPercent reviewedBy").limit(5000)).lean(),
            nameMaps(),
        ]);

        const gs = goals.map((g) => shapeGoal(g, maps));
        const count = (s) => gs.filter((g) => g.status === s).length;
        const done = count("completed");
        const goalStats = {
            total: gs.length, completed: done, inProgress: count("in-progress"), notStarted: count("not-started"), overdue: count("overdue"),
            completionRate: gs.length ? Number(((done / gs.length) * 100).toFixed(1)) : 0,
            averageProgress: gs.length ? Math.round(gs.reduce((s, g) => s + (g.progress || 0), 0) / gs.length) : 0,
        };

        const completed = appraisals.filter((a) => a.status === "completed" && a.rating);
        const distribution = [5, 4, 3, 2, 1].map((r) => ({ rating: r, label: RATING[r], count: completed.filter((a) => a.rating === r).length }));
        const appraisalStats = {
            total: appraisals.length,
            pendingSelf: appraisals.filter((a) => a.status === "pending-self").length,
            pendingManager: appraisals.filter((a) => a.status === "pending-manager").length,
            completed: appraisals.filter((a) => a.status === "completed").length,
            overdue: appraisals.filter((a) => a.status !== "completed" && a.dueDate && new Date(a.dueDate) < today).length,
            averageRating: completed.length ? Number((completed.reduce((s, a) => s + a.rating, 0) / completed.length).toFixed(2)) : 0,
            distribution,
        };

        const dept = {};
        const bucket = (e) => { const n = labelOf(maps.dept, e?.department) || "Not set"; return (dept[n] = dept[n] || { name: n, goals: 0, goalsCompleted: 0, ratingSum: 0, ratingCount: 0 }); };
        gs.forEach((g) => { const b = bucket(g.employee); b.goals++; if (g.status === "completed") b.goalsCompleted++; });
        completed.forEach((a) => { const b = bucket(a.employee); b.ratingSum += a.rating; b.ratingCount++; });
        const departments = Object.values(dept).map((d) => ({
            name: d.name, goals: d.goals, goalsCompleted: d.goalsCompleted,
            score: d.goals ? Math.round((d.goalsCompleted / d.goals) * 100) : 0,
            averageRating: d.ratingCount ? Number((d.ratingSum / d.ratingCount).toFixed(2)) : 0,
        })).sort((a, b) => b.score - a.score);

        const me = meId(sc);
        const senior = sc.all || sc.role === "manager";
        const pending = {
            mySelfAssessments: appraisals.filter((a) => idOf(a.employee) === me && a.status === "pending-self").length,
            toReview: appraisals.filter((a) => a.status === "pending-manager" && idOf(a.employee) !== me && (sc.all || sc.team.includes(idOf(a.employee)))).length,
            promotions: sc.all ? appraisals.filter((a) => a.status === "completed" && effStatus(a, "promotion") === "pending").length : 0,
            increments: sc.all ? appraisals.filter((a) => a.status === "completed" && effStatus(a, "increment") === "pending").length : 0,
        };

        const topPerformers = senior ? completed.filter((a) => idOf(a.employee) !== me || sc.all).sort((a, b) => b.rating - a.rating).slice(0, 5).map((a) => ({ _id: a._id, employee: shapeEmp(a.employee, maps), rating: a.rating, ratingLabel: RATING[a.rating], reviewPeriod: a.reviewPeriod })) : [];
        const upcomingDeadlines = gs.filter((g) => g.status !== "completed" && g.daysLeft !== null && g.daysLeft <= 14).sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 8).map((g) => ({ _id: g._id, title: g.title, employee: g.employee, targetDate: g.targetDate, daysLeft: g.daysLeft, progress: g.progress, status: g.status }));

        res.json({
            role: sc.role, scope: sc.all ? "company" : sc.role === "manager" ? "team" : "self",
            goals: goalStats, appraisals: appraisalStats, pending, departments, topPerformers, upcomingDeadlines,
            // the same numbers under the names the old dashboard used
            goalCompletionRate: goalStats.completionRate, averageAppraisalRating: appraisalStats.averageRating, totalAppraisals: appraisalStats.completed,
            teamPerformanceScore: `${goalStats.completionRate}%`,
            departmentBreakdown: departments.map((d) => ({ name: d.name, score: d.score, goalsCompleted: d.goalsCompleted })),
        });
    } catch (err) {
        next(err);
    }
};

// helpers shared with the reports controller
exports._helpers = { scopeOf, scopeFilter, canSee, nameMaps, empPop, apprPop, shapeGoal, shapeAppraisal };