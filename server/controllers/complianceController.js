const mongoose = require("mongoose");
const Compliance = require("../models/Compliance");
const Employee = require("../models/Employee");
const Payroll = require("../models/Payroll");
const StatutoryProfile = require("../models/StatutoryProfile");
const Settings = require("../models/Settings");
const CFG = require("../config/complianceConfig");
const E = require("../utils/complianceEngine");
const { ymdIST } = require("../utils/accessScope");

const { n, r2 } = E;
const TYPES = ["pf", "esi", "tds", "professional-tax", "labour"];
const bad = (res, message, status = 400) => res.status(status).json({ message });
const normType = (t) => (String(t || "").toLowerCase() === "pt" ? "professional-tax" : String(t || "").toLowerCase());

const readMonthYear = (src) => {
    const [cy, cm] = ymdIST().split("-").map(Number);
    const month = src.month !== undefined && src.month !== "" ? Number(src.month) : cm;
    const year = src.year !== undefined && src.year !== "" ? Number(src.year) : cy;
    if (!Number.isInteger(month) || month < 1 || month > 12) return { error: "Please select a valid month." };
    if (!Number.isInteger(year) || year < 2000 || year > 2100) return { error: "Please select a valid year." };
    return { month, year };
};

const parseYmd = (v) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(v || ""))) return null;
    const d = new Date(`${v}T00:00:00+05:30`);
    return Number.isNaN(d.getTime()) ? null : d;
};

const cleanUrl = (v) => {
    const url = String(v || "").trim().slice(0, 500);
    if (url && !/^https?:\/\/\S+$/i.test(url)) return { error: "The document link must start with http:// or https://." };
    return { value: url };
};

const readMoney = (v) => {
    const x = Number(v);
    return Number.isFinite(x) && x >= 0 && x <= 1e9 ? r2(x) : null;
};

/* CSV cell: quoted, and a leading = + - @ is neutralised so a spreadsheet never runs it as a formula */
const cell = (v) => {
    let s = String(v ?? "");
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return `"${s.replace(/"/g, '""')}"`;
};
const sendCsv = (res, filename, head, body) => {
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(`\uFEFF${[head.map(cell).join(","), ...body.map((r) => r.map(cell).join(","))].join("\n")}`);
};

/* ------------------------------ records ------------------------------ */

/* Adds the days left, the amount the payslips say is payable, and whether the record was made by the system */
async function shapeRecords(records) {
    const today = ymdIST();
    const ctx = await E.loadContext();
    const cache = new Map();

    const out = [];
    for (const rec of records) {
        const o = rec.toObject ? rec.toObject() : rec;
        o.daysLeft = E.diffDays(today, ymdIST(o.dueDate));
        o.isAuto = Boolean(o.key);

        if (o.status !== "filed" && o.kind === "deposit" && E.STATUTORY.includes(o.type)) {
            const ck = `${o.type}-${o.year}-${o.month}`;
            if (!cache.has(ck)) cache.set(ck, await E.buildStatement(o.type, o.month, o.year, { ctx }));
            const st = cache.get(ck);
            o.computed = { payable: E.payableOf(o.type, st.totals), employees: st.totals.employees, ready: st.ready, payslips: st.payslips };
        }
        out.push(o);
    }
    return out;
}

// @route GET /api/compliance?type=&status=&year=&month=
exports.getComplianceRecords = async (req, res, next) => {
    try {
        await E.ensureSchedule();
        await E.syncOverdue();

        const { type, status, year, month } = req.query;
        const filter = {};
        if (type && type !== "ALL") {
            const t = normType(type);
            if (!TYPES.includes(t)) return bad(res, "Unknown compliance type.");
            filter.type = t;
        }
        if (status && status !== "ALL") filter.status = String(status).toLowerCase();
        if (year && year !== "ALL") filter.year = Number(year);
        if (month && month !== "ALL") filter.month = Number(month);

        const records = await Compliance.find(filter).sort({ dueDate: -1 }).limit(500);
        res.json(await shapeRecords(records));
    } catch (err) {
        next(err);
    }
};

// @route POST /api/compliance   (a manual record, for example a labour task)
exports.createComplianceRecord = async (req, res, next) => {
    try {
        const b = req.body || {};
        const type = normType(b.type || "labour");
        const period = readMonthYear(b);
        const due = parseYmd(b.dueDate);
        const title = String(b.title || "").trim();

        if (!TYPES.includes(type)) return bad(res, "Please select a valid type.");
        if (title.length < 3) return bad(res, "Please enter a title (at least 3 characters).");
        if (period.error) return bad(res, period.error);
        if (!due) return bad(res, "Please enter the due date.");

        let totalAmount;
        if (b.totalAmount !== undefined && b.totalAmount !== "") {
            totalAmount = readMoney(b.totalAmount);
            if (totalAmount === null) return bad(res, "Enter a valid amount.");
        }

        const record = await Compliance.create({
            type,
            kind: "other",
            title: title.slice(0, 150),
            month: period.month,
            year: period.year,
            dueDate: due,
            totalAmount,
            notes: String(b.notes || "").trim().slice(0, 500),
            status: due < E.todayStart() ? "overdue" : "pending",
        });
        res.status(201).json((await shapeRecords([record]))[0]);
    } catch (err) {
        next(err);
    }
};

// @route PUT /api/compliance/:id   (title, due date, notes; not after it is filed)
exports.updateComplianceRecord = async (req, res, next) => {
    try {
        const record = await Compliance.findById(req.params.id);
        if (!record) return bad(res, "Compliance record not found.", 404);
        if (record.status === "filed") return bad(res, "A filed record cannot be edited. An admin can reopen it.", 409);

        const b = req.body || {};
        if (b.title !== undefined) {
            const title = String(b.title).trim();
            if (title.length < 3) return bad(res, "Please enter a title (at least 3 characters).");
            record.title = title.slice(0, 150);
        }
        if (b.dueDate !== undefined) {
            const due = parseYmd(b.dueDate);
            if (!due) return bad(res, "Please enter a valid due date.");
            record.dueDate = due;
            record.status = due < E.todayStart() ? "overdue" : "pending";
        }
        if (b.notes !== undefined) record.notes = String(b.notes).trim().slice(0, 500);
        if (b.totalAmount !== undefined && b.totalAmount !== "" && !record.key) {
            const amount = readMoney(b.totalAmount);
            if (amount === null) return bad(res, "Enter a valid amount.");
            record.totalAmount = amount;
        }

        await record.save();
        res.json((await shapeRecords([record]))[0]);
    } catch (err) {
        next(err);
    }
};

// @route PUT /api/compliance/:id/file   { referenceNumber, paidAmount, filedDate, documentUrl, notes }
exports.markAsFiled = async (req, res, next) => {
    try {
        const record = await Compliance.findById(req.params.id);
        if (!record) return bad(res, "Compliance record not found.", 404);
        if (record.status === "filed") return bad(res, "This record is already filed.", 409);

        const b = req.body || {};
        let filedDate = new Date();
        if (b.filedDate) {
            const d = parseYmd(b.filedDate);
            if (!d) return bad(res, "Please enter a valid filing date.");
            if (d.getTime() > Date.now() + 86400000) return bad(res, "The filing date cannot be in the future.");
            filedDate = d;
        }
        const doc = cleanUrl(b.documentUrl);
        if (doc.error) return bad(res, doc.error);

        // the amount the payslips say is payable is saved with the record
        let snapshot = null;
        if (record.kind === "deposit" && E.STATUTORY.includes(record.type)) {
            const st = await E.buildStatement(record.type, record.month, record.year);
            snapshot = { payable: E.payableOf(record.type, st.totals), employees: st.totals.employees };
        }

        let paidAmount = snapshot ? snapshot.payable : n(record.totalAmount);
        if (b.paidAmount !== undefined && b.paidAmount !== "") {
            paidAmount = readMoney(b.paidAmount);
            if (paidAmount === null) return bad(res, "Enter a valid amount.");
        }

        record.set({
            status: "filed",
            filedDate,
            filedBy: req.user._id,
            documentUrl: doc.value,
            referenceNumber: String(b.referenceNumber || "").trim().slice(0, 60),
            paidAmount,
            ...(snapshot ? { totalAmount: snapshot.payable, employeeCount: snapshot.employees } : {}),
            ...(b.notes !== undefined ? { notes: String(b.notes).trim().slice(0, 500) } : {}),
        });
        await record.save();
        res.json((await shapeRecords([record]))[0]);
    } catch (err) {
        next(err);
    }
};

// @route PUT /api/compliance/:id/reopen   (admin only)
exports.reopenRecord = async (req, res, next) => {
    try {
        const record = await Compliance.findById(req.params.id);
        if (!record) return bad(res, "Compliance record not found.", 404);
        if (record.status !== "filed") return bad(res, "Only a filed record can be reopened.", 409);

        record.status = record.dueDate < E.todayStart() ? "overdue" : "pending";
        record.filedDate = undefined;
        record.filedBy = undefined;
        record.paidAmount = undefined;
        record.referenceNumber = undefined;
        record.documentUrl = undefined;
        await record.save();
        res.json((await shapeRecords([record]))[0]);
    } catch (err) {
        next(err);
    }
};

// @route DELETE /api/compliance/:id   (admin only, manual and not filed)
exports.deleteRecord = async (req, res, next) => {
    try {
        const record = await Compliance.findById(req.params.id);
        if (!record) return bad(res, "Compliance record not found.", 404);
        if (record.key) return bad(res, "This record is made by the system and cannot be deleted.", 409);
        if (record.status === "filed") return bad(res, "A filed record cannot be deleted. Reopen it first.", 409);
        await record.deleteOne();
        res.json({ message: "Compliance record deleted." });
    } catch (err) {
        next(err);
    }
};

/* ------------------------------ calendar and summary ------------------------------ */

// @route GET /api/compliance/calendar?days=60
exports.getComplianceCalendar = async (req, res, next) => {
    try {
        await E.ensureSchedule();
        await E.syncOverdue();

        const days = Math.min(365, Math.max(7, Number(req.query.days) || 60));
        const start = E.todayStart();
        const end = new Date(start.getTime() + days * 86400000);

        const [overdue, upcoming, recent] = await Promise.all([
            Compliance.find({ status: "overdue" }).sort({ dueDate: 1 }).limit(100),
            Compliance.find({ status: "pending", dueDate: { $gte: start, $lte: end } }).sort({ dueDate: 1 }).limit(100),
            Compliance.find({ status: "filed" }).sort({ filedDate: -1 }).limit(10),
        ]);

        res.json({
            today: ymdIST(),
            overdue: await shapeRecords(overdue),
            upcoming: await shapeRecords(upcoming),
            recentlyFiled: await shapeRecords(recent),
        });
    } catch (err) {
        next(err);
    }
};

// @route GET /api/compliance/summary?year=
exports.getSummary = async (req, res, next) => {
    try {
        await E.ensureSchedule();
        await E.syncOverdue();

        const year = req.query.year ? Number(req.query.year) : Number(ymdIST().split("-")[0]);
        const start = E.todayStart();
        const in7 = new Date(start.getTime() + 7 * 86400000);

        const [byType, dueSoon, overdue, next5] = await Promise.all([
            Compliance.aggregate([{ $match: { year } }, { $group: { _id: { type: "$type", status: "$status" }, count: { $sum: 1 }, paid: { $sum: { $ifNull: ["$paidAmount", 0] } } } }]),
            Compliance.countDocuments({ status: "pending", dueDate: { $gte: start, $lte: in7 } }),
            Compliance.countDocuments({ status: "overdue" }),
            Compliance.find({ status: { $in: ["pending", "overdue"] } }).sort({ dueDate: 1 }).limit(5),
        ]);

        const types = {};
        TYPES.forEach((t) => (types[t] = { pending: 0, overdue: 0, filed: 0, paid: 0 }));
        byType.forEach((g) => {
            if (types[g._id.type]) {
                types[g._id.type][g._id.status] = g.count;
                types[g._id.type].paid = r2(types[g._id.type].paid + g.paid);
            }
        });

        res.json({ year, overdue, dueIn7Days: dueSoon, types, next: await shapeRecords(next5) });
    } catch (err) {
        next(err);
    }
};

/* ------------------------------ statements and reports ------------------------------ */

const STATEMENT_CSV = {
    pf: {
        head: ["Employee ID", "Name", "UAN", "Days paid", "PF wages", "EPS wages", "Employee EPF (12%)", "Employer EPS (8.33%)", "Employer EPF", "Admin charges", "EDLI", "Total payable", "Cut in payslip", "Difference"],
        row: (r) => [r.employeeId, r.name, r.uan, r.daysPaid, r.pfWages, r.epsWages, r.employee, r.eps, r.epf, r.admin, r.edli, r.payable, r.deducted, r.difference],
    },
    esi: {
        head: ["Employee ID", "Name", "ESIC number", "Days paid", "Wages", "Employee (0.75%)", "Employer (3.25%)", "Total payable", "Cut in payslip", "Difference"],
        row: (r) => [r.employeeId, r.name, r.esicNumber, r.daysPaid, r.wages, r.employee, r.employer, r.payable, r.deducted, r.difference],
    },
    tds: {
        head: ["Employee ID", "Name", "PAN", "Taxable wages", "TDS deducted"],
        row: (r) => [r.employeeId, r.name, r.pan, r.taxableWages, r.tds],
    },
    "professional-tax": {
        head: ["Employee ID", "Name", "Wages", "Professional tax"],
        row: (r) => [r.employeeId, r.name, r.wages, r.amount],
    },
};

// @route GET /api/compliance/monthly/:type?month=&year=&includeDraft=1&format=csv|ecr
exports.getMonthlyStatement = async (req, res, next) => {
    try {
        const type = normType(req.params.type);
        if (!E.STATUTORY.includes(type)) return bad(res, "Type must be pf, esi, tds or pt.");
        const period = readMonthYear(req.query);
        if (period.error) return bad(res, period.error);

        const statement = await E.buildStatement(type, period.month, period.year, { includeDraft: req.query.includeDraft === "1" || req.query.includeDraft === "true" });
        const stamp = `${period.year}-${String(period.month).padStart(2, "0")}`;
        const format = String(req.query.format || "").toLowerCase();

        if (format === "csv") {
            const def = STATEMENT_CSV[type];
            return sendCsv(res, `${type}_${stamp}.csv`, def.head, statement.rows.map(def.row));
        }

        if (format === "ecr") {
            if (type !== "pf") return bad(res, "An ECR file exists only for PF.");
            const missing = statement.rows.filter((r) => !/^\d{12}$/.test(r.uan));
            if (missing.length) {
                return bad(res, `UAN is missing or not 12 digits for: ${missing.slice(0, 8).map((r) => r.name).join(", ")}${missing.length > 8 ? ` and ${missing.length - 8} more` : ""}. Add it in Compliance, Employees.`);
            }
            // EPFO ECR text format, one member per line. Please validate it on the EPFO portal before the final upload.
            const lines = statement.rows.map((r) =>
                [r.uan, r.name.replace(/#~#/g, " "), r.grossWages, r.pfWages, r.epsWages, r.epsWages, r.employee, r.eps, r.epf, r.ncpDays, 0].join("#~#")
            );
            res.setHeader("Content-Type", "text/plain; charset=utf-8");
            res.setHeader("Content-Disposition", `attachment; filename="ECR_${stamp}.txt"`);
            return res.send(lines.join("\n"));
        }

        res.json(statement);
    } catch (err) {
        next(err);
    }
};

// @route GET /api/compliance/reports/annual?fy=2026   (FY 2026-27 is April 2026 to March 2027)
exports.getAnnualReport = async (req, res, next) => {
    try {
        const [cy, cm] = ymdIST().split("-").map(Number);
        const fy = req.query.fy ? Number(req.query.fy) : cm >= 4 ? cy : cy - 1;
        if (!Number.isInteger(fy) || fy < 2000 || fy > 2100) return bad(res, "Please select a valid financial year.");

        const ctx = await E.loadContext();
        const months = [];
        for (let i = 0; i < 12; i += 1) months.push(E.shiftMonth(fy, 4, i));

        const rows = [];
        for (const m of months) {
            const entry = { month: m.month, year: m.year, label: E.monthLabel(m.month, m.year) };
            let ready = true;
            let payslips = 0;
            for (const type of E.STATUTORY) {
                const st = await E.buildStatement(type, m.month, m.year, { ctx });
                payslips = st.payslips.total;
                ready = st.ready;
                entry[type] = { employees: st.totals.employees, payable: E.payableOf(type, st.totals), totals: st.totals };
            }
            entry.payslips = payslips;
            entry.ready = ready;
            rows.push(entry);
        }

        const total = (type) => r2(rows.reduce((s, r) => s + n(r[type].payable), 0));
        const totals = { pf: total("pf"), esi: total("esi"), tds: total("tds"), "professional-tax": total("professional-tax") };

        if (String(req.query.format || "").toLowerCase() === "csv") {
            return sendCsv(
                res,
                `Statutory_Summary_FY${fy}-${String(fy + 1).slice(2)}.csv`,
                ["Month", "Payslips", "PF payable", "ESI payable", "TDS", "Professional tax"],
                rows.map((r) => [r.label, r.payslips, r.pf.payable, r.esi.payable, r.tds.payable, r["professional-tax"].payable])
            );
        }

        res.json({ fy, label: `${fy}-${String(fy + 1).slice(2)}`, months: rows, totals });
    } catch (err) {
        next(err);
    }
};

/* ------------------------------ employees (statutory details) ------------------------------ */

const triState = (v) => {
    if (v === undefined) return { skip: true };
    if (v === null || v === "" || v === "auto") return { value: null };
    if (v === true || v === "true") return { value: true };
    if (v === false || v === "false") return { value: false };
    return { error: true };
};

// @route GET /api/compliance/employees
exports.getStatutoryEmployees = async (req, res, next) => {
    try {
        const [employees, profiles, latest, labels] = await Promise.all([
            Employee.find({ employeeStatus: { $nin: E.INACTIVE }, isExited: { $ne: true } })
                .select("name employeeId department designation salary panNumber dateOfJoining")
                .sort({ name: 1 })
                .lean(),
            StatutoryProfile.find().lean(),
            Payroll.aggregate([{ $sort: { year: -1, month: -1 } }, { $group: { _id: "$employee", pf: { $first: "$deductions.pf" }, esi: { $first: "$deductions.esi" } } }]),
            E.departmentLabels(),
        ]);
        const profMap = new Map(profiles.map((p) => [String(p.employee), p]));
        const lastMap = new Map(latest.map((l) => [String(l._id), l]));

        res.json(
            employees.map((emp) => {
                const prof = profMap.get(String(emp._id)) || {};
                const last = lastMap.get(String(emp._id)) || {};
                const pf = prof.pfApplicable ?? (CFG.PF.enabled && n(last.pf) > 0);
                const esi = prof.esiApplicable ?? (CFG.ESI.enabled && n(emp.salary) > 0 && n(emp.salary) <= CFG.ESI.wageCeiling);
                const pt = prof.ptApplicable ?? CFG.PT.enabled;

                const missing = [];
                if (pf && !/^\d{12}$/.test(prof.uan || "")) missing.push("UAN");
                if (esi && !prof.esicNumber) missing.push("ESIC number");
                if (!emp.panNumber) missing.push("PAN");

                return {
                    _id: emp._id,
                    employeeId: emp.employeeId || "",
                    name: emp.name,
                    department: E.deptLabel(emp.department, labels),
                    salary: n(emp.salary),
                    pan: emp.panNumber || "",
                    uan: prof.uan || "",
                    esicNumber: prof.esicNumber || "",
                    pfApplicable: prof.pfApplicable ?? null,
                    esiApplicable: prof.esiApplicable ?? null,
                    ptApplicable: prof.ptApplicable ?? null,
                    pfOnActualWage: prof.pfOnActualWage ?? null,
                    effective: { pf, esi, pt },
                    missing,
                    notes: prof.notes || "",
                };
            })
        );
    } catch (err) {
        next(err);
    }
};

// @route PUT /api/compliance/employees/:employeeId
exports.updateStatutoryProfile = async (req, res, next) => {
    try {
        const { employeeId } = req.params;
        if (!(await Employee.exists({ _id: employeeId }))) return bad(res, "Employee record not found.", 404);

        const b = req.body || {};
        const set = {};

        if (b.uan !== undefined) {
            const uan = String(b.uan).trim();
            if (uan && !/^\d{12}$/.test(uan)) return bad(res, "UAN must be 12 digits.");
            set.uan = uan;
        }
        if (b.esicNumber !== undefined) {
            const esic = String(b.esicNumber).trim();
            if (esic && !/^\d{10,17}$/.test(esic)) return bad(res, "ESIC number must be 10 to 17 digits.");
            set.esicNumber = esic;
        }
        for (const key of ["pfApplicable", "esiApplicable", "ptApplicable", "pfOnActualWage"]) {
            const t = triState(b[key]);
            if (t.error) return bad(res, `${key} must be true, false or auto.`);
            if (!t.skip) set[key] = t.value;
        }
        if (b.notes !== undefined) set.notes = String(b.notes).trim().slice(0, 300);
        if (!Object.keys(set).length) return bad(res, "There is nothing to update.");

        const profile = await StatutoryProfile.findOneAndUpdate({ employee: employeeId }, { $set: set }, { upsert: true, new: true, setDefaultsOnInsert: true });
        res.json(profile);
    } catch (err) {
        next(err);
    }
};

/* ------------------------------ registration numbers ------------------------------ */

const REG_FIELDS = ["pfNumber", "esiNumber", "tanNumber", "ptNumber", "ptState", "labourNumber", "labourAct"];
const readRegistration = async () => {
    const s = await Settings.findOne().select(REG_FIELDS.map((f) => `+registration.${f}`).join(" ")).lean();
    const reg = s?.registration || {};
    return Object.fromEntries(REG_FIELDS.map((f) => [f, reg[f] || ""]));
};

// @route GET /api/compliance/registration   (admin / HR)
exports.getRegistration = async (req, res, next) => {
    try {
        res.json(await readRegistration());
    } catch (err) {
        next(err);
    }
};

// @route PUT /api/compliance/registration   (admin only)
exports.updateRegistration = async (req, res, next) => {
    try {
        const set = {};
        for (const f of REG_FIELDS) {
            if (req.body?.[f] === undefined) continue;
            const v = String(req.body[f]).trim().slice(0, 120);
            if (f === "tanNumber" && v && !/^[A-Za-z]{4}\d{5}[A-Za-z]$/.test(v)) return bad(res, "TAN must look like ABCD12345E.");
            set[`registration.${f}`] = f === "tanNumber" ? v.toUpperCase() : v;
        }
        if (!Object.keys(set).length) return bad(res, "There is nothing to update.");
        await Settings.findOneAndUpdate({}, { $set: set }, { upsert: true, new: true, setDefaultsOnInsert: true });
        res.json(await readRegistration());
    } catch (err) {
        next(err);
    }
};
