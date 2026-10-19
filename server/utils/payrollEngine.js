const Attendance = require("../models/Attendance");
const Leave = require("../models/Leave");
const Holiday = require("../models/Holiday");
const ShiftAssignment = require("../models/ShiftAssignment");
const Settings = require("../models/Settings");
const User = require("../models/User");
const Bonus = require("../models/Bonus");
const Deduction = require("../models/Deduction");
const Loan = require("../models/Loan");
const Reimbursement = require("../models/Reimbursement");
const SalaryStructure = require("../models/SalaryStructure");
const EmployeeSalary = require("../models/EmployeeSalary");
const { monthRangeIST, ymdIST } = require("./accessScope");
const Payroll = require("../models/Payroll");

const WEEKLY_OFF_DEFAULT = [0]; // Sunday, used when Settings has no weekly off
const DAY_INDEX = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };

const pad2 = (n) => String(n).padStart(2, "0");
const round2 = (v) => Math.round((Number(v) || 0) * 100) / 100;
const lower = (v) => String(v || "").trim().toLowerCase();
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/* A stored date (text or Date) becomes YYYY-MM-DD */
const ymdOf = (v) => {
    if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? "" : ymdIST(d);
};

/* Weekly off days of the company, for example [0, 6] for Saturday and Sunday */
async function getCompanyWeeklyOff() {
    try {
        const s = await Settings.findOne().select("weekOff").lean();
        const days = (s?.weekOff || []).map((d) => DAY_INDEX[lower(d)]).filter((n) => n !== undefined);
        return days.length ? [...new Set(days)] : WEEKLY_OFF_DEFAULT;
    } catch {
        return WEEKLY_OFF_DEFAULT;
    }
}

/*
 * Attendance and leave records belong to the login account (User), payroll belongs to the Employee profile.
 * Every id of the same person is collected: the employee id, the linked login, and (for older accounts
 * whose link was never saved) the login that has the same email.
 */
async function loginIdsOf(emp) {
    const ids = new Set([String(emp._id)]);
    const conditions = [{ employee: emp._id }];
    [emp.loginEmail, emp.email].forEach((mail) => {
        const clean = String(mail || "").trim();
        if (clean) conditions.push({ email: new RegExp(`^${escapeRegex(clean)}$`, "i") });
    });
    const users = await User.find({ $or: conditions }).select("_id").lean();
    users.forEach((u) => ids.add(String(u._id)));
    return [...ids];
}

/* One monthly salary becomes basic, HRA, DA and special allowance. Special takes the rounding rest, so the total is exact. */
function splitSalary(gross, structure) {
    const p = structure || { basicPercent: 100, hraPercent: 0, daPercent: 0, specialPercent: 0 };
    const basic = round2((gross * (p.basicPercent || 0)) / 100);
    const hra = round2((gross * (p.hraPercent || 0)) / 100);
    const da = round2((gross * (p.daPercent || 0)) / 100);
    return { basic, hra, da, special: round2(gross - basic - hra - da) };
}

/* The structure of an employee: his own, else the default one. `hold` means his salary is switched off. */
async function resolveStructure(employeeId) {
    const record = await EmployeeSalary.findOne({ employee: employeeId }).populate("salaryStructure");
    if (record && record.status !== "Active") return { hold: record.status };
    const assigned = record?.salaryStructure || null;
    const structure = assigned || (await SalaryStructure.findOne({ isDefault: true }));
    return { structure, assigned: Boolean(assigned) };
}

/*
 * Works out one payslip. Nothing is saved here.
 * Returns { skip: "reason" } or { values, warnings, summary }.
 * options.fullMonth = true pays the whole month and ignores attendance.
 */
async function calculatePayroll(emp, m, y, options = {}) {
    const fullMonth = Boolean(options.fullMonth);
    const warnings = [];

    const gross = round2(emp.salary);
    if (!(gross > 0)) return { skip: "No monthly salary is set on the employee profile." };

    const resolved = await resolveStructure(emp._id);
    if (resolved.hold) return { skip: `The salary is on "${resolved.hold}" status.` };
    const structure = resolved.structure;
    if (!structure) warnings.push("No salary structure is set, so the whole salary is shown as Basic.");
    else if (!resolved.assigned) warnings.push(`The default structure "${structure.name}" was used.`);

    const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const ymd = (d) => `${y}-${pad2(m)}-${pad2(d)}`;
    const firstYmd = ymd(1);
    const lastYmd = ymd(daysInMonth);
    const range = monthRangeIST(m, y);

    // days before joining and after leaving are not paid
    const joinYmd = ymdOf(emp.dateOfJoining) || "0000-00-00";
    const exited = /exit/i.test(String(emp.employeeStatus || "")) || emp.isExited === true;
    const exitYmd = exited && emp.exitDate ? ymdOf(emp.exitDate) : "";

    const companyOff = await getCompanyWeeklyOff();
    const ids = await loginIdsOf(emp);

    const [records, leaves, holidays, roster] = await Promise.all([
        fullMonth
            ? []
            : Attendance.find({ employee: { $in: ids }, date: { $gte: range.start, $lt: range.end } }).select("status date").lean(),
        Leave.find({
            employee: { $in: ids },
            status: "approved",
            startDate: { $lte: new Date(`${lastYmd}T00:00:00.000Z`) },
            endDate: { $gte: new Date(`${firstYmd}T00:00:00.000Z`) },
        })
            .select("startDate endDate leaveType")
            .lean(),
        Holiday.find({ date: { $gte: firstYmd, $lte: lastYmd } }).lean().catch(() => []),
        ShiftAssignment.find({ employee: emp._id, date: { $gte: firstYmd, $lte: lastYmd } })
            .populate("shift", "workingDays")
            .lean()
            .catch(() => []),
    ]);

    // working days of the shift given on a day (a day without a roster entry follows the company weekly off)
    const rosterDays = new Map(roster.filter((r) => r.shift?.workingDays).map((r) => [r.date, r.shift.workingDays]));

    const presence = new Map();
    const markedLeave = new Set(); // days that HR marked as "on-leave" in attendance
    records.forEach((r) => {
        const s = lower(r.status);
        const key = ymdIST(r.date);
        if (s === "on-leave" || s === "on leave") {
            markedLeave.add(key);
            return;
        }
        const value = s === "present" || s === "late" ? 1 : s === "half-day" || s === "half day" ? 0.5 : 0;
        if (value > (presence.get(key) || 0)) presence.set(key, value);
    });

    const holidaySet = new Set(holidays.filter((h) => !h.optional).map((h) => ymdOf(h.date)));

    // "paid", "unpaid" or null for one day
    const leaveOn = (day) => {
        let found = null;
        for (const l of leaves) {
            if (ymdOf(l.startDate) <= day && day <= ymdOf(l.endDate)) {
                if (lower(l.leaveType) !== "unpaid") return "paid";
                found = "unpaid";
            }
        }
        return found;
    };

    let workingDays = 0;
    let presentDays = 0;
    let leaveDays = 0;
    let payable = 0;
    let outside = 0;

    for (let d = 1; d <= daysInMonth; d += 1) {
        const day = ymd(d);
        if (day < joinYmd || (exitYmd && day > exitYmd)) {
            outside += 1;
            continue;
        }
        const dow = new Date(`${day}T00:00:00Z`).getUTCDay();
        const shiftDays = rosterDays.get(day);
        const weeklyOff = shiftDays ? !shiftDays.includes(dow) : companyOff.includes(dow);
        if (weeklyOff || holidaySet.has(day)) continue;

        workingDays += 1;
        if (fullMonth) {
            payable += 1;
            continue;
        }
        const p = presence.get(day) || 0;
        // a day he really worked is never counted as leave
        const leave = p >= 1 ? null : leaveOn(day) || (markedLeave.has(day) ? "paid" : null);
        if (leave) leaveDays += 1;
        presentDays += p;
        payable += leave === "paid" ? 1 : p;
    }

    if (outside >= daysInMonth) return { skip: "The employee was not working in this month." };
    if (!fullMonth && workingDays > 0 && records.length === 0) {
        warnings.push("No attendance was found for this month, so every working day is counted as absent.");
    }

    const unpaidWorking = fullMonth ? 0 : Math.max(0, workingDays - payable);
    const lopDays = unpaidWorking + outside;
    const lop = round2(Math.min(gross, (gross / daysInMonth) * lopDays));

    const { basic, hra, da, special } = splitSalary(gross, structure);
    const pf = structure?.pfPercent ? round2((basic * structure.pfPercent) / 100) : 0;
    const esi = structure?.esiPercent ? round2((gross * structure.esiPercent) / 100) : 0;

    const [bonuses, pendingBonuses, manual, loans, claims, pendingClaims, openSlips] = await Promise.all([
        Bonus.find({ employee: emp._id, month: m, year: y, status: "Approved" }).lean(),
        Bonus.countDocuments({ employee: emp._id, month: m, year: y, status: "Pending" }),
        Deduction.find({ employee: emp._id, month: m, year: y, status: "Pending" }).lean(),
        Loan.find({ employee: emp._id, status: "ACTIVE", remainingBalance: { $gt: 0 } }).lean(),
        Reimbursement.find({ employee: emp._id, status: "APPROVED", date: { $lt: range.end } }).lean(),
        Reimbursement.countDocuments({ employee: emp._id, status: "PENDING", date: { $lt: range.end } }),
        Payroll.find({
            employee: emp._id,
            status: { $in: ["draft", "processed"] },
            $or: [{ "loanBreakup.0": { $exists: true } }, { "reimbursementIds.0": { $exists: true } }],
        })
            .select("month year loanBreakup reimbursementIds")
            .lean(),
    ]);

    if (pendingBonuses) warnings.push(`${pendingBonuses} bonus entr${pendingBonuses === 1 ? "y" : "ies"} of this month ${pendingBonuses === 1 ? "is" : "are"} still Pending, so not added. Approve ${pendingBonuses === 1 ? "it" : "them"} and recalculate.`);
    if (pendingClaims) warnings.push(`${pendingClaims} reimbursement claim${pendingClaims === 1 ? " is" : "s are"} waiting for approval, so not added.`);

    // what another unpaid payslip (other months) has already taken, so nothing is taken twice
    const otherSlips = openSlips.filter((s) => !(s.month === m && s.year === y));
    const takenClaims = new Set(otherSlips.flatMap((s) => (s.reimbursementIds || []).map(String)));
    const dueClaims = claims.filter((c) => !takenClaims.has(String(c._id)));
    const takenEmi = new Map();
    otherSlips.forEach((s) =>
        (s.loanBreakup || []).forEach((b) => takenEmi.set(String(b.loan), round2((takenEmi.get(String(b.loan)) || 0) + (Number(b.amount) || 0))))
    );

    const total = (list) => round2(list.reduce((sum, x) => sum + (Number(x.amount) || 0), 0));
    const bonus = total(bonuses);
    const reimbursement = total(dueClaims);

    const items = [];
    bonuses.forEach((b) => items.push({ kind: "bonus", label: b.title || "Bonus", amount: round2(b.amount) }));
    dueClaims.forEach((c) => items.push({ kind: "claim", label: String(c.description || c.category || "Claim").slice(0, 40), amount: round2(c.amount) }));

    let tds = 0;
    let loanRecovery = 0;
    let other = 0;
    manual.forEach((x) => {
        const amount = Number(x.amount) || 0;
        const kind = x.type === "TDS" ? "tds" : x.type === "LOAN_RECOVERY" ? "loan" : "other";
        if (kind === "tds") tds += amount;
        else if (kind === "loan") loanRecovery += amount;
        else other += amount;
        items.push({ kind, label: x.title || "Deduction", amount: round2(amount) });
    });

    // A loan EMI starts in the month chosen for it. It is never more than the salary that is left.
    const monthIndex = y * 12 + m;
    const startIndex = (loan) => {
        if (loan.firstEmiYear && loan.firstEmiMonth) return loan.firstEmiYear * 12 + loan.firstEmiMonth;
        const [ly, lm] = ymdIST(loan.disbursedDate || loan.createdAt || new Date()).split("-").map(Number);
        return ly * 12 + lm;
    };
    const LOAN_NAMES = { SALARY_ADVANCE: "Salary advance", COMPANY_LOAN: "Company loan", EMERGENCY_AID: "Emergency aid" };

    let room = Math.max(0, gross + bonus - (pf + esi + lop + tds + other + loanRecovery));
    const loanBreakup = [];
    let emi = 0;
    let emiWanted = 0;
    loans
        .filter((loan) => startIndex(loan) <= monthIndex)
        .forEach((loan) => {
            const left = Math.max(0, round2((Number(loan.remainingBalance) || 0) - (takenEmi.get(String(loan._id)) || 0)));
            const wanted = Math.min(Number(loan.monthlyEmi) || 0, left);
            emiWanted += wanted;
            const due = Math.min(wanted, room);
            if (due > 0) {
                loanBreakup.push({ loan: loan._id, amount: round2(due) });
                items.push({ kind: "loan", label: `${LOAN_NAMES[loan.type] || "Loan"} EMI`, amount: round2(due) });
                emi += due;
                room -= due;
            }
        });
    if (emi < emiWanted) warnings.push("The loan EMI was reduced because the salary left is not enough.");

    return {
        values: {
            employee: emp._id,
            month: m,
            year: y,
            structure: structure?._id,
            structureName: structure?.name || "Basic only",
            monthlyGross: gross,
            basicSalary: basic,
            allowances: { hra, da, special, conveyance: 0, medical: 0, other: 0 },
            deductions: { pf, esi, tds: round2(tds), loan: round2(loanRecovery + emi), lop, other: round2(other) },
            bonus,
            reimbursement,
            basis: fullMonth ? "full" : "attendance",
            daysInMonth,
            workingDays,
            daysPresent: presentDays,
            daysOnLeave: leaveDays,
            unpaidDays: lopDays,
            items,
            loanBreakup,
            bonusIds: bonuses.map((x) => x._id),
            deductionIds: manual.map((x) => x._id),
            reimbursementIds: dueClaims.map((x) => x._id),
        },
        warnings,
        summary: { workingDays, presentDays, leaveDays, lopDays, outsideDays: outside, payableDays: daysInMonth - lopDays },
    };
}

module.exports = { calculatePayroll, splitSalary, resolveStructure, round2 };












// const Attendance = require("../models/Attendance");
// const Leave = require("../models/Leave");
// const Holiday = require("../models/Holiday");
// const ShiftAssignment = require("../models/ShiftAssignment");
// const Settings = require("../models/Settings");
// const Bonus = require("../models/Bonus");
// const Deduction = require("../models/Deduction");
// const Loan = require("../models/Loan");
// const Reimbursement = require("../models/Reimbursement");
// const SalaryStructure = require("../models/SalaryStructure");
// const EmployeeSalary = require("../models/EmployeeSalary");
// const { expandIds, monthRangeIST, ymdIST } = require("./accessScope");

// const WEEKLY_OFF_DEFAULT = [0]; // Sunday, used when Settings has no weekly off
// const DAY_INDEX = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };

// const pad2 = (n) => String(n).padStart(2, "0");
// const round2 = (v) => Math.round((Number(v) || 0) * 100) / 100;
// const lower = (v) => String(v || "").trim().toLowerCase();

// /* A stored date (text or Date) becomes YYYY-MM-DD */
// const ymdOf = (v) => {
//     if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
//     const d = new Date(v);
//     return Number.isNaN(d.getTime()) ? "" : ymdIST(d);
// };

// /* Weekly off days of the company, for example [0, 6] for Saturday and Sunday */
// async function getCompanyWeeklyOff() {
//     try {
//         const s = await Settings.findOne().select("weekOff").lean();
//         const days = (s?.weekOff || []).map((d) => DAY_INDEX[lower(d)]).filter((n) => n !== undefined);
//         return days.length ? [...new Set(days)] : WEEKLY_OFF_DEFAULT;
//     } catch {
//         return WEEKLY_OFF_DEFAULT;
//     }
// }

// /* One monthly salary becomes basic, HRA, DA and special allowance. Special takes the rounding rest, so the total is exact. */
// function splitSalary(gross, structure) {
//     const p = structure || { basicPercent: 100, hraPercent: 0, daPercent: 0, specialPercent: 0 };
//     const basic = round2((gross * (p.basicPercent || 0)) / 100);
//     const hra = round2((gross * (p.hraPercent || 0)) / 100);
//     const da = round2((gross * (p.daPercent || 0)) / 100);
//     return { basic, hra, da, special: round2(gross - basic - hra - da) };
// }

// /* The structure of an employee: his own, else the default one. `hold` means his salary is switched off. */
// async function resolveStructure(employeeId) {
//     const record = await EmployeeSalary.findOne({ employee: employeeId }).populate("salaryStructure");
//     if (record && record.status !== "Active") return { hold: record.status };
//     const assigned = record?.salaryStructure || null;
//     const structure = assigned || (await SalaryStructure.findOne({ isDefault: true }));
//     return { structure, assigned: Boolean(assigned) };
// }

// /*
//  * Works out one payslip. Nothing is saved here.
//  * Returns { skip: "reason" } or { values, warnings, summary }.
//  * options.fullMonth = true pays the whole month and ignores attendance.
//  */
// async function calculatePayroll(emp, m, y, options = {}) {
//     const fullMonth = Boolean(options.fullMonth);
//     const warnings = [];

//     const gross = round2(emp.salary);
//     if (!(gross > 0)) return { skip: "No monthly salary is set on the employee profile." };

//     const resolved = await resolveStructure(emp._id);
//     if (resolved.hold) return { skip: `The salary is on "${resolved.hold}" status.` };
//     const structure = resolved.structure;
//     if (!structure) warnings.push("No salary structure is set, so the whole salary is shown as Basic.");
//     else if (!resolved.assigned) warnings.push(`The default structure "${structure.name}" was used.`);

//     const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
//     const ymd = (d) => `${y}-${pad2(m)}-${pad2(d)}`;
//     const firstYmd = ymd(1);
//     const lastYmd = ymd(daysInMonth);
//     const range = monthRangeIST(m, y);

//     // days before joining and after leaving are not paid
//     const joinYmd = ymdOf(emp.dateOfJoining) || "0000-00-00";
//     const exited = /exit/i.test(String(emp.employeeStatus || "")) || emp.isExited === true;
//     const exitYmd = exited && emp.exitDate ? ymdOf(emp.exitDate) : "";

//     const companyOff = await getCompanyWeeklyOff();
//     const ids = await expandIds(emp._id); // attendance and leave use the login (User) id

//     const [records, leaves, holidays, roster] = await Promise.all([
//         fullMonth
//             ? []
//             : Attendance.find({ employee: { $in: ids }, date: { $gte: range.start, $lt: range.end } }).select("status date").lean(),
//         Leave.find({
//             employee: { $in: ids },
//             status: "approved",
//             startDate: { $lte: new Date(`${lastYmd}T00:00:00.000Z`) },
//             endDate: { $gte: new Date(`${firstYmd}T00:00:00.000Z`) },
//         })
//             .select("startDate endDate leaveType")
//             .lean(),
//         Holiday.find({ date: { $gte: firstYmd, $lte: lastYmd } }).lean().catch(() => []),
//         ShiftAssignment.find({ employee: emp._id, date: { $gte: firstYmd, $lte: lastYmd } })
//             .populate("shift", "workingDays")
//             .lean()
//             .catch(() => []),
//     ]);

//     // working days of the shift given on a day (a day without a roster entry follows the company weekly off)
//     const rosterDays = new Map(roster.filter((r) => r.shift?.workingDays).map((r) => [r.date, r.shift.workingDays]));

//     const presence = new Map();
//     records.forEach((r) => {
//         const s = lower(r.status);
//         const value = s === "present" || s === "late" ? 1 : s === "half-day" || s === "half day" ? 0.5 : 0;
//         const key = ymdIST(r.date);
//         if (value > (presence.get(key) || 0)) presence.set(key, value);
//     });

//     const holidaySet = new Set(holidays.filter((h) => !h.optional).map((h) => ymdOf(h.date)));

//     // "paid", "unpaid" or null for one day
//     const leaveOn = (day) => {
//         let found = null;
//         for (const l of leaves) {
//             if (ymdOf(l.startDate) <= day && day <= ymdOf(l.endDate)) {
//                 if (lower(l.leaveType) !== "unpaid") return "paid";
//                 found = "unpaid";
//             }
//         }
//         return found;
//     };

//     let workingDays = 0;
//     let presentDays = 0;
//     let leaveDays = 0;
//     let payable = 0;
//     let outside = 0;

//     for (let d = 1; d <= daysInMonth; d += 1) {
//         const day = ymd(d);
//         if (day < joinYmd || (exitYmd && day > exitYmd)) {
//             outside += 1;
//             continue;
//         }
//         const dow = new Date(`${day}T00:00:00Z`).getUTCDay();
//         const shiftDays = rosterDays.get(day);
//         const weeklyOff = shiftDays ? !shiftDays.includes(dow) : companyOff.includes(dow);
//         if (weeklyOff || holidaySet.has(day)) continue;

//         workingDays += 1;
//         if (fullMonth) {
//             payable += 1;
//             continue;
//         }
//         const p = presence.get(day) || 0;
//         const leave = leaveOn(day);
//         if (leave) leaveDays += 1;
//         presentDays += p;
//         payable += leave === "paid" ? 1 : p;
//     }

//     if (outside >= daysInMonth) return { skip: "The employee was not working in this month." };
//     if (!fullMonth && workingDays > 0 && records.length === 0) {
//         warnings.push("No attendance was found for this month, so every working day is counted as absent.");
//     }

//     const unpaidWorking = fullMonth ? 0 : Math.max(0, workingDays - payable);
//     const lopDays = unpaidWorking + outside;
//     const lop = round2(Math.min(gross, (gross / daysInMonth) * lopDays));

//     const { basic, hra, da, special } = splitSalary(gross, structure);
//     const pf = structure?.pfPercent ? round2((basic * structure.pfPercent) / 100) : 0;
//     const esi = structure?.esiPercent ? round2((gross * structure.esiPercent) / 100) : 0;

//     const [bonuses, manual, loans, claims] = await Promise.all([
//         Bonus.find({ employee: emp._id, month: m, year: y, status: "Approved" }).lean(),
//         Deduction.find({ employee: emp._id, month: m, year: y, status: "Pending" }).lean(),
//         Loan.find({ employee: emp._id, status: "ACTIVE", remainingBalance: { $gt: 0 }, disbursedDate: { $lt: range.end } }).lean(),
//         Reimbursement.find({ employee: emp._id, status: "APPROVED", date: { $lt: range.end } }).lean(),
//     ]);

//     const total = (list) => round2(list.reduce((sum, x) => sum + (Number(x.amount) || 0), 0));
//     const bonus = total(bonuses);
//     const reimbursement = total(claims);

//     let tds = 0;
//     let loanRecovery = 0;
//     let other = 0;
//     manual.forEach((x) => {
//         const amount = Number(x.amount) || 0;
//         if (x.type === "TDS") tds += amount;
//         else if (x.type === "LOAN_RECOVERY") loanRecovery += amount;
//         else other += amount;
//     });

//     // The loan EMI is never more than the salary that is left
//     let room = Math.max(0, gross + bonus - (pf + esi + lop + tds + other + loanRecovery));
//     const loanBreakup = [];
//     let emi = 0;
//     let emiWanted = 0;
//     loans.forEach((loan) => {
//         const wanted = Math.min(Number(loan.monthlyEmi) || 0, Number(loan.remainingBalance) || 0);
//         emiWanted += wanted;
//         const due = Math.min(wanted, room);
//         if (due > 0) {
//             loanBreakup.push({ loan: loan._id, amount: round2(due) });
//             emi += due;
//             room -= due;
//         }
//     });
//     if (emi < emiWanted) warnings.push("The loan EMI was reduced because the salary left is not enough.");

//     return {
//         values: {
//             employee: emp._id,
//             month: m,
//             year: y,
//             structure: structure?._id,
//             structureName: structure?.name || "Basic only",
//             monthlyGross: gross,
//             basicSalary: basic,
//             allowances: { hra, da, special, conveyance: 0, medical: 0, other: 0 },
//             deductions: { pf, esi, tds: round2(tds), loan: round2(loanRecovery + emi), lop, other: round2(other) },
//             bonus,
//             reimbursement,
//             basis: fullMonth ? "full" : "attendance",
//             daysInMonth,
//             workingDays,
//             daysPresent: presentDays,
//             daysOnLeave: leaveDays,
//             unpaidDays: lopDays,
//             loanBreakup,
//             bonusIds: bonuses.map((x) => x._id),
//             deductionIds: manual.map((x) => x._id),
//             reimbursementIds: claims.map((x) => x._id),
//         },
//         warnings,
//         summary: { workingDays, presentDays, leaveDays, lopDays, outsideDays: outside },
//     };
// }

// module.exports = { calculatePayroll, splitSalary, resolveStructure, round2 };







// const Attendance = require("../models/Attendance");
// const Leave = require("../models/Leave");
// const Holiday = require("../models/Holiday");
// const Bonus = require("../models/Bonus");
// const Deduction = require("../models/Deduction");
// const Loan = require("../models/Loan");
// const Reimbursement = require("../models/Reimbursement");
// const SalaryStructure = require("../models/SalaryStructure");
// const EmployeeSalary = require("../models/EmployeeSalary");
// const { expandIds, monthRangeIST, ymdIST } = require("./accessScope");
// const ShiftAssignment = require("../models/ShiftAssignment");

// const WEEKLY_OFF_DAYS = [0]; // 0 = Sunday. Example for Saturday and Sunday: [0, 6]

// const pad2 = (n) => String(n).padStart(2, "0");
// const round2 = (v) => Math.round((Number(v) || 0) * 100) / 100;
// const lower = (v) => String(v || "").trim().toLowerCase();

// /* A stored date (text or Date) becomes YYYY-MM-DD */
// const ymdOf = (v) => {
//     if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
//     const d = new Date(v);
//     return Number.isNaN(d.getTime()) ? "" : ymdIST(d);
// };

// /* One monthly salary becomes basic, HRA, DA and special allowance. Special takes the rounding rest, so the total is exact. */
// function splitSalary(gross, structure) {
//     const p = structure || { basicPercent: 100, hraPercent: 0, daPercent: 0, specialPercent: 0 };
//     const basic = round2((gross * (p.basicPercent || 0)) / 100);
//     const hra = round2((gross * (p.hraPercent || 0)) / 100);
//     const da = round2((gross * (p.daPercent || 0)) / 100);
//     return { basic, hra, da, special: round2(gross - basic - hra - da) };
// }

// /* The structure of an employee: his own, else the default one. `hold` means his salary is switched off. */
// async function resolveStructure(employeeId) {
//     const record = await EmployeeSalary.findOne({ employee: employeeId }).populate("salaryStructure");
//     if (record && record.status !== "Active") return { hold: record.status };
//     const assigned = record?.salaryStructure || null;
//     const structure = assigned || (await SalaryStructure.findOne({ isDefault: true }));
//     return { structure, assigned: Boolean(assigned) };
// }

// /*
//  * Works out one payslip. Nothing is saved here.
//  * Returns { skip: "reason" } or { values, warnings, summary }.
//  * options.fullMonth = true pays the whole month and ignores attendance.
//  */
// async function calculatePayroll(emp, m, y, options = {}) {
//     const fullMonth = Boolean(options.fullMonth);
//     const warnings = [];

//     const gross = round2(emp.salary);
//     if (!(gross > 0)) return { skip: "No monthly salary is set on the employee profile." };

//     const resolved = await resolveStructure(emp._id);
//     if (resolved.hold) return { skip: `The salary is on "${resolved.hold}" status.` };
//     const structure = resolved.structure;
//     if (!structure) warnings.push("No salary structure is set, so the whole salary is shown as Basic.");
//     else if (!resolved.assigned) warnings.push(`The default structure "${structure.name}" was used.`);

//     const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
//     const ymd = (d) => `${y}-${pad2(m)}-${pad2(d)}`;
//     const firstYmd = ymd(1);
//     const lastYmd = ymd(daysInMonth);
//     const range = monthRangeIST(m, y);

//     // days before joining and after leaving are not paid
//     const joinYmd = ymdOf(emp.dateOfJoining) || "0000-00-00";
//     const exited = /exit/i.test(String(emp.employeeStatus || "")) || emp.isExited === true;
//     const exitYmd = exited && emp.exitDate ? ymdOf(emp.exitDate) : "";

//     const ids = await expandIds(emp._id); // attendance and leave use the login (User) id
//     const [records, leaves, holidays, roster] = await Promise.all([
//         fullMonth
//             ? []
//             : Attendance.find({ employee: { $in: ids }, date: { $gte: range.start, $lt: range.end } }).select("status date").lean(),
//         Leave.find({
//             employee: { $in: ids },
//             status: "approved",
//             startDate: { $lte: new Date(`${lastYmd}T00:00:00.000Z`) },
//             endDate: { $gte: new Date(`${firstYmd}T00:00:00.000Z`) },
//         })
//             .select("startDate endDate leaveType")
//             .lean(),
//         Holiday.find({ date: { $gte: firstYmd, $lte: lastYmd } }).lean().catch(() => []),
//         ShiftAssignment.find({ employee: emp._id, date: { $gte: firstYmd, $lte: lastYmd } })
//             .populate("shift", "workingDays")
//             .lean()
//             .catch(() => []),
//     ]);

//     // the working days of the shift that was given on a day (a day without a roster entry follows WEEKLY_OFF_DAYS)
//     const rosterDays = new Map(roster.filter((r) => r.shift?.workingDays).map((r) => [r.date, r.shift.workingDays]));


//     // const ids = await expandIds(emp._id); // attendance and leave use the login (User) id
//     // const [records, leaves, holidays] = await Promise.all([
//     //     fullMonth
//     //         ? []
//     //         : Attendance.find({ employee: { $in: ids }, date: { $gte: range.start, $lt: range.end } }).select("status date").lean(),
//     //     Leave.find({
//     //         employee: { $in: ids },
//     //         status: "approved",
//     //         startDate: { $lte: new Date(`${lastYmd}T00:00:00.000Z`) },
//     //         endDate: { $gte: new Date(`${firstYmd}T00:00:00.000Z`) },
//     //     })
//     //         .select("startDate endDate leaveType")
//     //         .lean(),
//     //     Holiday.find({ date: { $gte: firstYmd, $lte: lastYmd } }).lean().catch(() => []),
//     // ]);

//     const presence = new Map();
//     records.forEach((r) => {
//         const s = lower(r.status);
//         const value = s === "present" || s === "late" ? 1 : s === "half-day" || s === "half day" ? 0.5 : 0;
//         const key = ymdIST(r.date);
//         if (value > (presence.get(key) || 0)) presence.set(key, value);
//     });

//     const holidaySet = new Set(holidays.filter((h) => !h.optional).map((h) => ymdOf(h.date)));

//     // "paid", "unpaid" or null for one day
//     const leaveOn = (day) => {
//         let found = null;
//         for (const l of leaves) {
//             if (ymdOf(l.startDate) <= day && day <= ymdOf(l.endDate)) {
//                 if (lower(l.leaveType) !== "unpaid") return "paid";
//                 found = "unpaid";
//             }
//         }
//         return found;
//     };

//     let workingDays = 0;
//     let presentDays = 0;
//     let leaveDays = 0;
//     let payable = 0;
//     let outside = 0;

//     for (let d = 1; d <= daysInMonth; d += 1) {
//         const day = ymd(d);
//         if (day < joinYmd || (exitYmd && day > exitYmd)) {
//             outside += 1;
//             continue;
//         }
//         const dow = new Date(`${day}T00:00:00Z`).getUTCDay();
//         if (WEEKLY_OFF_DAYS.includes(dow) || holidaySet.has(day)) continue;
//         const shiftDays = rosterDays.get(day);
//         const weeklyOff = shiftDays ? !shiftDays.includes(dow) : WEEKLY_OFF_DAYS.includes(dow);
//         if (weeklyOff || holidaySet.has(day)) continue;

//         workingDays += 1;
//         if (fullMonth) {
//             payable += 1;
//             continue;
//         }
//         const p = presence.get(day) || 0;
//         const leave = leaveOn(day);
//         if (leave) leaveDays += 1;
//         presentDays += p;
//         payable += leave === "paid" ? 1 : p;
//     }

//     if (outside >= daysInMonth) return { skip: "The employee was not working in this month." };
//     if (!fullMonth && workingDays > 0 && records.length === 0) {
//         warnings.push("No attendance was found for this month, so every working day is counted as absent.");
//     }

//     const unpaidWorking = fullMonth ? 0 : Math.max(0, workingDays - payable);
//     const lopDays = unpaidWorking + outside;
//     const lop = round2(Math.min(gross, (gross / daysInMonth) * lopDays));

//     const { basic, hra, da, special } = splitSalary(gross, structure);
//     const pf = structure?.pfPercent ? round2((basic * structure.pfPercent) / 100) : 0;
//     const esi = structure?.esiPercent ? round2((gross * structure.esiPercent) / 100) : 0;

//     const [bonuses, manual, loans, claims] = await Promise.all([
//         Bonus.find({ employee: emp._id, month: m, year: y, status: "Approved" }).lean(),
//         Deduction.find({ employee: emp._id, month: m, year: y, status: "Pending" }).lean(),
//         Loan.find({ employee: emp._id, status: "ACTIVE", remainingBalance: { $gt: 0 }, disbursedDate: { $lt: range.end } }).lean(),
//         Reimbursement.find({ employee: emp._id, status: "APPROVED", date: { $lt: range.end } }).lean(),
//     ]);

//     const total = (list) => round2(list.reduce((sum, x) => sum + (Number(x.amount) || 0), 0));
//     const bonus = total(bonuses);
//     const reimbursement = total(claims);

//     let tds = 0;
//     let loanRecovery = 0;
//     let other = 0;
//     manual.forEach((x) => {
//         const amount = Number(x.amount) || 0;
//         if (x.type === "TDS") tds += amount;
//         else if (x.type === "LOAN_RECOVERY") loanRecovery += amount;
//         else other += amount;
//     });

//     // The loan EMI is never more than the salary that is left
//     let room = Math.max(0, gross + bonus - (pf + esi + lop + tds + other + loanRecovery));
//     const loanBreakup = [];
//     let emi = 0;
//     let emiWanted = 0;
//     loans.forEach((loan) => {
//         const wanted = Math.min(Number(loan.monthlyEmi) || 0, Number(loan.remainingBalance) || 0);
//         emiWanted += wanted;
//         const due = Math.min(wanted, room);
//         if (due > 0) {
//             loanBreakup.push({ loan: loan._id, amount: round2(due) });
//             emi += due;
//             room -= due;
//         }
//     });
//     if (emi < emiWanted) warnings.push("The loan EMI was reduced because the salary left is not enough.");

//     return {
//         values: {
//             employee: emp._id,
//             month: m,
//             year: y,
//             structure: structure?._id,
//             structureName: structure?.name || "Basic only",
//             monthlyGross: gross,
//             basicSalary: basic,
//             allowances: { hra, da, special, conveyance: 0, medical: 0, other: 0 },
//             deductions: { pf, esi, tds: round2(tds), loan: round2(loanRecovery + emi), lop, other: round2(other) },
//             bonus,
//             reimbursement,
//             basis: fullMonth ? "full" : "attendance",
//             daysInMonth,
//             workingDays,
//             daysPresent: presentDays,
//             daysOnLeave: leaveDays,
//             unpaidDays: lopDays,
//             loanBreakup,
//             bonusIds: bonuses.map((x) => x._id),
//             deductionIds: manual.map((x) => x._id),
//             reimbursementIds: claims.map((x) => x._id),
//         },
//         warnings,
//         summary: { workingDays, presentDays, leaveDays, lopDays, outsideDays: outside },
//     };
// }

// module.exports = { calculatePayroll, splitSalary, resolveStructure, round2, WEEKLY_OFF_DAYS };