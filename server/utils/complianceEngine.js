const mongoose = require("mongoose");
const Payroll = require("../models/Payroll");
const Compliance = require("../models/Compliance");
const StatutoryProfile = require("../models/StatutoryProfile");
const TaxProfile = require("../models/TaxProfile");
const CFG = require("../config/complianceConfig");
const { ymdIST } = require("./accessScope");

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const INACTIVE = ["Inactive", "Exited", "Exit"];
const STATUTORY = ["pf", "esi", "tds", "professional-tax"];

const n = (v) => Number(v) || 0;
const r2 = (v) => Math.round((Number(v) || 0) * 100) / 100;
const pad2 = (x) => String(x).padStart(2, "0");
const isHex = (s) => /^[0-9a-fA-F]{24}$/.test(String(s || "").trim());
const monthLabel = (m, y) => `${MONTHS[m - 1]} ${y}`;
const istDate = (y, m, d) => new Date(`${y}-${pad2(m)}-${pad2(d)}T00:00:00+05:30`);
const todayStart = () => istDate(...ymdIST().split("-").map(Number));

const shiftMonth = (y, m, delta) => {
    const idx = y * 12 + (m - 1) + delta;
    return { year: Math.floor(idx / 12), month: (idx % 12) + 1 };
};

const diffDays = (fromYmd, toYmd) => Math.round((Date.UTC(...toYmd.split("-").map((v, i) => (i === 1 ? Number(v) - 1 : Number(v)))) - Date.UTC(...fromYmd.split("-").map((v, i) => (i === 1 ? Number(v) - 1 : Number(v))))) / 86400000);

/* ------------------------------ due dates and titles ------------------------------ */

function dueDateOf(type, m, y) {
    const next = shiftMonth(y, m, 1);
    if (type === "tds") return m === 3 ? istDate(next.year, 4, 30) : istDate(next.year, next.month, CFG.TDS.depositDay);
    const day = type === "pf" ? CFG.PF.dueDay : type === "esi" ? CFG.ESI.dueDay : CFG.PT.dueDay;
    return istDate(next.year, next.month, day);
}

const TITLES = {
    pf: (m, y) => `PF contribution and ECR - ${monthLabel(m, y)}`,
    esi: (m, y) => `ESI contribution - ${monthLabel(m, y)}`,
    tds: (m, y) => `TDS on salary (Sec 192) deposit - ${monthLabel(m, y)}`,
    "professional-tax": (m, y) => `Professional Tax - ${monthLabel(m, y)}`,
};

/* ------------------------------ schedule (records made automatically) ------------------------------ */

let lastEnsure = 0;

async function ensureRecord({ key, type, kind, month, year, title, dueDate }) {
    const or = [{ key }];
    // an older record of the same month, made before keys existed, is fixed instead of duplicated
    if (kind === "deposit") or.push({ type, month, year, key: { $exists: false }, kind: { $in: [null, "deposit"] } });

    const existing = await Compliance.findOne({ $or: or });
    if (existing) {
        if (!existing.key) {
            existing.key = key;
            existing.kind = kind;
            existing.title = title;
            if (existing.status !== "filed") {
                existing.dueDate = dueDate;
                existing.totalAmount = undefined; // the old made-up amount is removed
            }
            await existing.save();
        }
        return;
    }
    try {
        await Compliance.create({ key, type, kind, month, year, title, dueDate, status: "pending" });
    } catch (err) {
        if (err.code !== 11000) throw err;
    }
}

async function ensureSchedule({ force = false } = {}) {
    if (!force && Date.now() - lastEnsure < 10 * 60 * 1000) return;
    lastEnsure = Date.now();
    try {
        const [ty, tm] = ymdIST().split("-").map(Number);
        const wageMonths = [shiftMonth(ty, tm, -1), shiftMonth(ty, tm, 0)];
        const types = ["tds"];
        if (CFG.PF.enabled) types.push("pf");
        if (CFG.ESI.enabled) types.push("esi");
        if (CFG.PT.enabled && CFG.PT.slabs.length) types.push("professional-tax");

        for (const w of wageMonths) {
            for (const type of types) {
                await ensureRecord({
                    key: `${type}-${w.year}-${w.month}`,
                    type,
                    kind: "deposit",
                    month: w.month,
                    year: w.year,
                    title: TITLES[type](w.month, w.year),
                    dueDate: dueDateOf(type, w.month, w.year),
                });
            }
        }

        // TDS returns (24Q every quarter, Form 16 once a year), only when the due date is near
        const from = new Date(Date.now() - 30 * 86400000);
        const to = new Date(Date.now() + 150 * 86400000);
        const near = (d) => d >= from && d <= to;
        const fyNow = tm >= 4 ? ty : ty - 1;

        for (const fy of [fyNow - 1, fyNow]) {
            const label = `${fy}-${String(fy + 1).slice(2)}`;
            const quarters = [
                { q: 1, month: 6, year: fy, due: istDate(fy, 7, 31) },
                { q: 2, month: 9, year: fy, due: istDate(fy, 10, 31) },
                { q: 3, month: 12, year: fy, due: istDate(fy + 1, 1, 31) },
                { q: 4, month: 3, year: fy + 1, due: istDate(fy + 1, 5, 31) },
            ];
            for (const item of quarters) {
                if (!near(item.due)) continue;
                await ensureRecord({
                    key: `tds-24q-${fy}-Q${item.q}`,
                    type: "tds",
                    kind: "return",
                    month: item.month,
                    year: item.year,
                    title: `TDS return 24Q - Q${item.q} FY ${label}`,
                    dueDate: item.due,
                });
            }
            const form16 = istDate(fy + 1, 6, 15);
            if (near(form16)) {
                await ensureRecord({
                    key: `tds-form16-${fy}`,
                    type: "tds",
                    kind: "return",
                    month: 3,
                    year: fy + 1,
                    title: `Form 16 to employees - FY ${label}`,
                    dueDate: form16,
                });
            }
        }
    } catch (err) {
        console.error("Compliance schedule error:", err.message);
    }
}

/* A pending record whose due date is over becomes overdue */
const syncOverdue = () => Compliance.updateMany({ status: "pending", dueDate: { $lt: todayStart() } }, { $set: { status: "overdue" } });

/* ------------------------------ department names ------------------------------ */

async function departmentLabels() {
    try {
        const list = await mongoose.model("Department").find().select("name title").lean();
        return new Map(list.map((d) => [String(d._id), d.name || d.title || ""]));
    } catch {
        return new Map();
    }
}
const deptLabel = (value, labels) => {
    if (!value) return "";
    if (typeof value === "object") return value.name || value.title || "";
    const s = String(value).trim();
    return labels.get(s) || (isHex(s) ? "" : s);
};

/* ------------------------------ monthly statement ------------------------------ */

async function loadContext() {
    const [profiles, taxProfiles, labels] = await Promise.all([StatutoryProfile.find().lean(), TaxProfile.find().select("employee panNumber").lean(), departmentLabels()]);
    return {
        profiles: new Map(profiles.map((p) => [String(p.employee), p])),
        tax: new Map(taxProfiles.map((t) => [String(t.employee), t])),
        labels,
    };
}

const ptFor = (earned) => {
    for (const slab of CFG.PT.slabs) if (slab.upTo === null || earned <= slab.upTo) return slab.amount;
    return 0;
};

/* One payslip becomes a row of the statement, or null when that law does not apply to the employee */
function rowFor(type, p, prof) {
    const d = p.deductions || {};
    const a = p.allowances || {};
    const frac = p.daysInMonth ? Math.max(0, p.daysInMonth - n(p.unpaidDays)) / p.daysInMonth : 1; // the part of the month that is paid
    const earnedGross = Math.max(0, r2(n(p.grossSalary) - n(d.lop)));

    if (type === "pf") {
        const applicable = prof.pfApplicable ?? (CFG.PF.enabled && n(d.pf) > 0);
        if (!applicable) return null;
        const wage = r2((n(p.basicSalary) + n(a.da)) * frac);
        const onActual = prof.pfOnActualWage ?? CFG.PF.onActualWage;
        const epsWages = Math.min(wage, CFG.PF.wageCeiling);
        const pfWages = onActual ? wage : epsWages;
        const employee = Math.round((pfWages * CFG.PF.employeeRate) / 100);
        const employerTotal = Math.round((pfWages * CFG.PF.employeeRate) / 100);
        const eps = Math.round((epsWages * CFG.PF.epsRate) / 100);
        const epf = Math.max(0, employerTotal - eps);
        const admin = Math.round((epsWages * CFG.PF.adminRate) / 100);
        const edli = Math.round((epsWages * CFG.PF.edliRate) / 100);
        return {
            grossWages: Math.round(earnedGross),
            pfWages: Math.round(pfWages),
            epsWages: Math.round(epsWages),
            employee,
            eps,
            epf,
            admin,
            edli,
            payable: employee + employerTotal + admin + edli,
            deducted: r2(n(d.pf)),
            difference: r2(employee - n(d.pf)),
        };
    }

    if (type === "esi") {
        const contractGross = n(p.monthlyGross) || n(p.grossSalary);
        const applicable = prof.esiApplicable ?? (CFG.ESI.enabled && contractGross <= CFG.ESI.wageCeiling);
        if (!applicable) return null;
        const employee = Math.ceil(r2((earnedGross * CFG.ESI.employeeRate) / 100));
        const employer = Math.ceil(r2((earnedGross * CFG.ESI.employerRate) / 100));
        return {
            wages: Math.round(earnedGross),
            employee,
            employer,
            payable: employee + employer,
            deducted: r2(n(d.esi)),
            difference: r2(employee - n(d.esi)),
        };
    }

    if (type === "professional-tax") {
        const applicable = prof.ptApplicable ?? CFG.PT.enabled;
        if (!applicable || !CFG.PT.slabs.length) return null;
        const amount = ptFor(earnedGross);
        return { wages: Math.round(earnedGross), amount, payable: amount };
    }

    if (type === "tds") {
        if (n(d.tds) <= 0) return null;
        return { taxableWages: Math.round(earnedGross), tds: r2(d.tds), payable: r2(d.tds) };
    }
    return null;
}

const SUM_KEYS = {
    pf: ["grossWages", "pfWages", "epsWages", "employee", "eps", "epf", "admin", "edli", "payable", "deducted", "difference"],
    esi: ["wages", "employee", "employer", "payable", "deducted", "difference"],
    "professional-tax": ["wages", "amount", "payable"],
    tds: ["taxableWages", "tds", "payable"],
};

/*
 * The statement of one law for one salary month, built from the payslips.
 * A draft payslip is not counted unless includeDraft is true.
 */
async function buildStatement(type, month, year, { includeDraft = false, ctx } = {}) {
    const context = ctx || (await loadContext());
    const payrolls = await Payroll.find({ month, year })
        .populate("employee", "name employeeId department designation panNumber dateOfJoining")
        .lean();

    const counts = { total: payrolls.length, draft: 0, processed: 0, paid: 0 };
    payrolls.forEach((p) => {
        if (counts[p.status] !== undefined) counts[p.status] += 1;
    });

    const counted = payrolls.filter((p) => p.status !== "draft" || includeDraft);
    const rows = [];

    counted.forEach((p) => {
        const emp = p.employee || {};
        const prof = context.profiles.get(String(emp._id)) || {};
        const calc = rowFor(type, p, prof);
        if (!calc) return;
        const pan = context.tax.get(String(emp._id))?.panNumber || emp.panNumber || "";
        rows.push({
            payslipId: p._id,
            payslipStatus: p.status,
            employeeId: emp.employeeId || "",
            name: emp.name || "Unknown",
            department: deptLabel(emp.department, context.labels),
            designation: typeof emp.designation === "object" ? emp.designation?.name || "" : isHex(emp.designation) ? "" : emp.designation || "",
            uan: prof.uan || "",
            esicNumber: prof.esicNumber || "",
            pan,
            panMissing: type === "tds" ? !pan : undefined,
            daysPaid: Math.max(0, n(p.daysInMonth) - n(p.unpaidDays)),
            ncpDays: n(p.unpaidDays),
            mismatch: calc.difference !== undefined ? Math.abs(calc.difference) > 1 : false,
            ...calc,
        });
    });
    rows.sort((x, y) => x.name.localeCompare(y.name));

    const totals = { employees: rows.length };
    (SUM_KEYS[type] || []).forEach((k) => {
        totals[k] = r2(rows.reduce((s, r) => s + n(r[k]), 0));
    });
    if (type === "pf") {
        totals.accounts = {
            ac01: r2(totals.employee + totals.epf), // EPF: employee share and employer's EPF share
            ac10: totals.eps, // pension
            ac02: totals.admin, // admin charges
            ac21: totals.edli, // insurance
        };
    }

    const notes = [];
    if (!counts.total) notes.push("No payslip exists for this month yet. Generate and process the payroll first.");
    if (counts.draft && !includeDraft) notes.push(`${counts.draft} payslip(s) are still draft and are not counted. Process them, then the amounts are final.`);
    if (type === "professional-tax" && !CFG.PT.slabs.length) notes.push("Professional Tax slabs are not set (PT_SLABS in .env), so nothing is calculated.");
    if (type === "pf" && rows.some((r) => !r.uan)) notes.push(`${rows.filter((r) => !r.uan).length} employee(s) have no UAN. The ECR file needs it.`);
    if (type === "esi" && rows.some((r) => !r.esicNumber)) notes.push(`${rows.filter((r) => !r.esicNumber).length} employee(s) have no ESIC number.`);
    if (type === "tds" && rows.some((r) => r.panMissing)) notes.push(`${rows.filter((r) => r.panMissing).length} employee(s) have no PAN. TDS can be higher for them.`);
    if (rows.some((r) => r.mismatch)) notes.push("For some employees the amount cut in the payslip differs from the statutory amount. See the Difference column.");

    return {
        type,
        month,
        year,
        periodLabel: monthLabel(month, year),
        dueDate: dueDateOf(type, month, year),
        payslips: counts,
        ready: counts.total > 0 && counts.draft === 0,
        rows,
        totals,
        notes,
    };
}

/* The one amount that has to be deposited */
function payableOf(type, totals) {
    if (!totals) return 0;
    return r2(totals.payable || 0);
}

module.exports = {
    STATUTORY,
    INACTIVE,
    MONTHS,
    n,
    r2,
    isHex,
    monthLabel,
    istDate,
    todayStart,
    shiftMonth,
    diffDays,
    dueDateOf,
    ensureSchedule,
    syncOverdue,
    departmentLabels,
    deptLabel,
    loadContext,
    buildStatement,
    payableOf,
};