const mongoose = require("mongoose");
const Payroll = require("../models/Payroll");
const Employee = require("../models/Employee");
const Settings = require("../models/Settings");
const SalaryStructure = require("../models/SalaryStructure");
const EmployeeSalary = require("../models/EmployeeSalary");
const Reimbursement = require("../models/Reimbursement");
const Bonus = require("../models/Bonus");
const Deduction = require("../models/Deduction");
const Loan = require("../models/Loan");
const { calculatePayroll, splitSalary, round2 } = require("../utils/payrollEngine");
const { notify, notifyApprovers, notifyPayroll, userIdOfEmployee } = require("../utils/notify");
const { ymdIST } = require("../utils/accessScope");

/* ------------------------------- helpers ------------------------------- */

const roleLower = (req) => String(req.user?.role || "").toLowerCase();
const isAdminHr = (req) => ["admin", "hr"].includes(roleLower(req));
const ownEmployeeId = (req) => (req.user?.employee ? String(req.user.employee._id || req.user.employee) : "");
const idOf = (v) => String(v?._id || v || "");
const validId = (v) => mongoose.isValidObjectId(v);
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const EMP_FIELDS = "name employeeId department designation email";
const EMP_CALC_FIELDS = "name employeeId salary dateOfJoining employeeStatus isExited exitDate department designation email loginEmail";
const SHARED = ["processed", "paid"]; // an employee never sees a draft payslip

/* HR can not generate, process or pay the payslip of HR herself. An admin does that. */
const selfBlocked = (req, employeeId) => roleLower(req) === "hr" && Boolean(ownEmployeeId(req)) && idOf(employeeId) === ownEmployeeId(req);
const SELF_MESSAGE = "HR cannot generate, process or pay their own payslip. Please ask an admin.";

const parseMonthYear = (month, year) => {
    const m = Number(month);
    const y = Number(year);
    if (!Number.isInteger(m) || m < 1 || m > 12) return { error: "Please select a valid month." };
    if (!Number.isInteger(y) || y < 2000 || y > 2100) return { error: "Please select a valid year." };
    return { m, y };
};

/* A month can be paid only after it ends, unless the whole month is paid without attendance */
const checkPeriod = (m, y, fullMonth) => {
    const [cy, cm] = ymdIST().split("-").map(Number);
    if (y > cy || (y === cy && m > cm)) return "Payroll cannot be generated for a future month.";
    if (y === cy && m === cm && !fullMonth) {
        return 'This month has not ended yet. Generate it after the month ends, or choose "Pay the full month (ignore attendance)".';
    }
    return "";
};

const loadPayroll = (id) => Payroll.findById(id).populate("employee", EMP_FIELDS);

/* ------------------------------ payslip view ------------------------------ */

const EARNING_LABELS = [
    ["basic", "Basic Salary"],
    ["hra", "House Rent Allowance"],
    ["da", "Dearness Allowance"],
    ["conveyance", "Conveyance Allowance"],
    ["medical", "Medical Allowance"],
    ["special", "Special Allowance"],
    ["other", "Other Allowance"],
    ["bonus", "Bonus"],
    ["overtime", "Overtime"],
];
const DEDUCTION_LABELS = [
    ["pf", "Provident Fund"],
    ["esi", "ESI"],
    ["tds", "TDS"],
    ["loan", "Loan / Advance Recovery"],
    ["lop", "Loss of Pay"],
    ["other", "Other Deductions"],
];

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
const below100 = (x) => (x < 20 ? ONES[x] : `${TENS[Math.floor(x / 10)]}${x % 10 ? ` ${ONES[x % 10]}` : ""}`);
const below1000 = (x) => (x < 100 ? below100(x) : `${ONES[Math.floor(x / 100)]} Hundred${x % 100 ? ` ${below100(x % 100)}` : ""}`);

function inWords(amount) {
    const x = Math.round(Number(amount) || 0);
    if (x <= 0) return "Zero Rupees Only";
    const parts = [];
    const crore = Math.floor(x / 1e7);
    const lakh = Math.floor((x % 1e7) / 1e5);
    const thousand = Math.floor((x % 1e5) / 1e3);
    const rest = x % 1000;
    if (crore) parts.push(`${below1000(crore)} Crore`);
    if (lakh) parts.push(`${below100(lakh)} Lakh`);
    if (thousand) parts.push(`${below100(thousand)} Thousand`);
    if (rest) parts.push(below1000(rest));
    return `${parts.join(" ")} Rupees Only`;
}

/* The company name and address come from Settings. If Settings was never edited, the .env values are used. */
async function getCompany() {
    let s = null;
    try {
        s = await Settings.findOne().select("companyName companyAddress").lean();
    } catch {
        /* settings could not be read, the .env values are used */
    }
    const savedName = s?.companyName && s.companyName !== "My Company" ? s.companyName : "";
    return {
        name: savedName || process.env.COMPANY_NAME || process.env.EMAIL_FROM_NAME || "Company",
        address: s?.companyAddress || process.env.COMPANY_ADDRESS || "",
    };
}

// function buildSlip(p, co) {
//     const o = typeof p.toObject === "function" ? p.toObject() : p;
//     const A = o.allowances || {};
//     const D = o.deductions || {};
//     const r = round2;

//     const earnings = {
//         basic: r(o.basicSalary), hra: r(A.hra), da: r(A.da), conveyance: r(A.conveyance), medical: r(A.medical),
//         special: r(A.special), other: r(A.other), bonus: r(o.bonus), overtime: r(o.overtimePay),
//     };
//     const earningLines = EARNING_LABELS.map(([key, label]) => ({ key, label, amount: earnings[key] })).filter((l) => l.amount > 0);
//     const reimbursement = r(o.reimbursement);
//     if (reimbursement > 0) earningLines.push({ key: "reimbursement", label: "Reimbursements (not taxable)", amount: reimbursement });
//     const deductionLines = DEDUCTION_LABELS.map(([key, label]) => ({ key, label, amount: r(D[key]) })).filter((l) => l.amount > 0);

//     const daysInMonth = o.daysInMonth || 0;
//     const monthPadded = String(o.month).padStart(2, "0");
//     return {
//         _id: o._id,
//         slipNumber: `PAY-${o.year}-${monthPadded}-${String(o._id).slice(-4).toUpperCase()}`,
//         company: co,
//         employee: o.employee,
//         period: `${monthPadded}/${o.year}`,
//         periodLabel: new Date(Date.UTC(o.year, o.month - 1, 1)).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" }),
//         month: o.month,
//         year: o.year,
//         structureName: o.structureName || "",
//         monthlyGross: r(o.monthlyGross),
//         earnings,
//         earningLines,
//         deductions: D,
//         deductionLines,
//         reimbursement,
//         grossSalary: r(o.grossSalary),
//         totalEarnings: r(r(o.grossSalary) + reimbursement),
//         totalDeductions: r(o.totalDeductions),
//         netSalary: r(o.netSalary),
//         netInWords: inWords(o.netSalary),
//         status: o.status,
//         processedOn: o.processedOn,
//         paidOn: o.paidOn,
//         basis: o.basis,
//         attendance: {
//             daysInMonth,
//             workingDays: o.workingDays || 0,
//             present: o.daysPresent || 0,
//             leave: o.daysOnLeave || 0,
//             unpaid: o.unpaidDays || 0,
//             payable: daysInMonth ? daysInMonth - (o.unpaidDays || 0) : 0,
//         },
//         // the same values under the older names
//         basicSalary: earnings.basic,
//         allowances: A,
//         bonus: earnings.bonus,
//         overtimePay: earnings.overtime,
//         daysPresent: o.daysPresent || 0,
//         daysOnLeave: o.daysOnLeave || 0,
//     };
// }

function buildSlip(p, co) {
    const o = typeof p.toObject === "function" ? p.toObject() : p;
    const A = o.allowances || {};
    const D = o.deductions || {};
    const r = round2;
    const items = Array.isArray(o.items) ? o.items : [];

    const earnings = {
        basic: r(o.basicSalary), hra: r(A.hra), da: r(A.da), conveyance: r(A.conveyance), medical: r(A.medical),
        special: r(A.special), other: r(A.other), bonus: r(o.bonus), overtime: r(o.overtimePay),
    };

    /* One line per record when the records add up to the stored total, else one grouped line */
    const linesOf = (kind, key, prefix, groupLabel, stored) => {
        const list = items.filter((i) => i.kind === kind && Number(i.amount) > 0);
        const sum = r(list.reduce((total, i) => total + Number(i.amount || 0), 0));
        if (list.length && Math.abs(sum - r(stored)) < 0.02) {
            return list.map((i, n) => ({ key: `${key}-${n}`, label: `${prefix}: ${i.label}`, amount: r(i.amount) }));
        }
        return r(stored) > 0 ? [{ key, label: groupLabel, amount: r(stored) }] : [];
    };
    const single = (key, label, amount) => (r(amount) > 0 ? [{ key, label, amount: r(amount) }] : []);

    const earningLines = [
        ...single("basic", "Basic Salary", earnings.basic),
        ...single("hra", "House Rent Allowance", earnings.hra),
        ...single("da", "Dearness Allowance", earnings.da),
        ...single("conveyance", "Conveyance Allowance", earnings.conveyance),
        ...single("medical", "Medical Allowance", earnings.medical),
        ...single("special", "Special Allowance", earnings.special),
        ...single("other-allowance", "Other Allowance", earnings.other),
        ...linesOf("bonus", "bonus", "Bonus", "Bonus", o.bonus),
        ...single("overtime", "Overtime", earnings.overtime),
        ...linesOf("claim", "reimbursement", "Reimbursement", "Reimbursements (not taxable)", o.reimbursement),
    ];

    const deductionLines = [
        ...single("pf", "Provident Fund", D.pf),
        ...single("esi", "ESI", D.esi),
        ...linesOf("tds", "tds", "TDS", "TDS", D.tds),
        ...linesOf("loan", "loan", "Loan / Advance", "Loan / Advance Recovery", D.loan),
        ...single("lop", "Loss of Pay", D.lop),
        ...linesOf("other", "other", "Deduction", "Other Deductions", D.other),
    ];

    const reimbursement = r(o.reimbursement);
    const daysInMonth = o.daysInMonth || 0;
    const monthPadded = String(o.month).padStart(2, "0");

    return {
        _id: o._id,
        slipNumber: `PAY-${o.year}-${monthPadded}-${String(o._id).slice(-4).toUpperCase()}`,
        company: co,
        employee: o.employee,
        period: `${monthPadded}/${o.year}`,
        periodLabel: new Date(Date.UTC(o.year, o.month - 1, 1)).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" }),
        month: o.month,
        year: o.year,
        structureName: o.structureName || "",
        monthlyGross: r(o.monthlyGross),
        earnings,
        earningLines,
        deductions: D,
        deductionLines,
        reimbursement,
        grossSalary: r(o.grossSalary),
        totalEarnings: r(r(o.grossSalary) + reimbursement),
        totalDeductions: r(o.totalDeductions),
        netSalary: r(o.netSalary),
        netInWords: inWords(o.netSalary),
        status: o.status,
        processedOn: o.processedOn,
        paidOn: o.paidOn,
        basis: o.basis,
        attendance: {
            daysInMonth,
            workingDays: o.workingDays || 0,
            present: o.daysPresent || 0,
            leave: o.daysOnLeave || 0,
            unpaid: o.unpaidDays || 0,
            payable: daysInMonth ? daysInMonth - (o.unpaidDays || 0) : 0,
        },
        // the same values under the older names
        basicSalary: earnings.basic,
        allowances: A,
        bonus: earnings.bonus,
        overtimePay: earnings.overtime,
        daysPresent: o.daysPresent || 0,
        daysOnLeave: o.daysOnLeave || 0,
    };
}


/* ------------------------------ read payslips ------------------------------ */

// @route GET /api/payroll?month=&year=&employee=&status=
exports.getPayrolls = async (req, res, next) => {
    try {
        const { month, year, employee, status } = req.query;
        const filter = {};
        if (month && month !== "ALL") filter.month = Number(month);
        if (year && year !== "ALL") filter.year = Number(year);
        if (status && status !== "ALL") filter.status = String(status).toLowerCase();

        if (isAdminHr(req)) {
            if (employee && employee !== "ALL") filter.employee = employee;
        } else {
            const own = ownEmployeeId(req);
            if (!own) return res.status(200).json([]);
            filter.employee = own;
            filter.status = SHARED.includes(filter.status) ? filter.status : { $in: SHARED };
        }

        const payrolls = await Payroll.find(filter).populate("employee", EMP_FIELDS).sort({ year: -1, month: -1, createdAt: -1 });
        res.status(200).json(payrolls);
    } catch (err) {
        next(err);
    }
};

/* Only the owner (processed or paid) and admin / HR can open a payslip */
const canOpen = (req, payroll) => {
    if (isAdminHr(req)) return true;
    const own = ownEmployeeId(req);
    return Boolean(own) && idOf(payroll.employee) === own && SHARED.includes(payroll.status);
};

// @route GET /api/payroll/:id
exports.getPayroll = async (req, res, next) => {
    try {
        const payroll = await loadPayroll(req.params.id);
        if (!payroll) return res.status(404).json({ message: "Payroll record not found." });
        if (!canOpen(req, payroll)) return res.status(403).json({ message: "You can view only your own payslips." });
        res.status(200).json(payroll);
    } catch (err) {
        next(err);
    }
};

// @route GET /api/payroll/payslip/:id
exports.getPayslip = async (req, res, next) => {
    try {
        const payroll = await Payroll.findById(req.params.id).populate("employee", `${EMP_FIELDS} dateOfJoining`);
        if (!payroll) return res.status(404).json({ message: "Payslip not found." });
        if (!canOpen(req, payroll)) return res.status(403).json({ message: "You can view only your own payslips." });
        res.status(200).json(buildSlip(payroll, await getCompany()));
    } catch (err) {
        next(err);
    }
};

// @route GET /api/payroll/payslips?month=&year=&employee=
exports.getPayslipsList = async (req, res, next) => {
    try {
        const { month, year, employee } = req.query;
        const filter = { status: { $in: SHARED } };
        if (month && month !== "ALL") filter.month = Number(month);
        if (year && year !== "ALL") filter.year = Number(year);

        if (isAdminHr(req)) {
            if (employee && employee !== "ALL") filter.employee = employee;
        } else {
            const own = ownEmployeeId(req);
            if (!own) return res.status(200).json([]);
            filter.employee = own;
        }

        const list = await Payroll.find(filter)
            .populate("employee", `${EMP_FIELDS} dateOfJoining`)
            .sort({ year: -1, month: -1, createdAt: -1 })
            .limit(500);
        const co = await getCompany();
        res.status(200).json(list.map((p) => buildSlip(p, co)));
    } catch (err) {
        next(err);
    }
};

/* ------------------------------ generate ------------------------------ */

/* Creates one payslip (or refreshes a draft). Returns { status, payroll?, reason?, warnings? }. */
async function generateOne(emp, m, y, { fullMonth, overwriteDraft, by }) {
    const existing = await Payroll.findOne({ employee: emp._id, month: m, year: y });
    if (existing && !(overwriteDraft && existing.status === "draft")) {
        return { status: "skipped", reason: existing.status === "draft" ? "Already generated (draft)" : `Already ${existing.status}`, exists: true };
    }

    const calc = await calculatePayroll(emp, m, y, { fullMonth });
    if (calc.skip) return { status: "skipped", reason: calc.skip };

    if (existing) {
        existing.set({ ...calc.values, overtimePay: existing.overtimePay, generatedBy: by });
        await existing.save();
        return { status: "updated", payroll: existing, warnings: calc.warnings };
    }

    try {
        const payroll = await Payroll.create({ ...calc.values, status: "draft", generatedBy: by });
        return { status: "created", payroll, warnings: calc.warnings };
    } catch (err) {
        if (err.code === 11000) return { status: "skipped", reason: "Already generated", exists: true };
        throw err;
    }
}

// @route POST /api/payroll/preview   { employee, month, year, fullMonth }
exports.previewPayroll = async (req, res, next) => {
    try {
        const { employee, month, year, fullMonth } = req.body;
        const { m, y, error } = parseMonthYear(month, year);
        if (error) return res.status(400).json({ message: error });
        if (!validId(employee)) return res.status(400).json({ message: "Please select an employee." });

        const emp = await Employee.findById(employee).select(EMP_CALC_FIELDS);
        if (!emp) return res.status(404).json({ message: "Employee record not found." });

        const calc = await calculatePayroll(emp, m, y, { fullMonth: Boolean(fullMonth) });
        if (calc.skip) return res.status(400).json({ message: calc.skip });

        res.json({ ...calc.values, ...Payroll.computeTotals(calc.values), employee: emp, warnings: calc.warnings, summary: calc.summary });
    } catch (err) {
        next(err);
    }
};

// @route POST /api/payroll/generate   { employee, month, year, fullMonth, overwriteDraft }
exports.generatePayroll = async (req, res, next) => {
    try {
        const { employee, month, year, fullMonth, overwriteDraft } = req.body;
        const { m, y, error } = parseMonthYear(month, year);
        if (error) return res.status(400).json({ message: error });
        if (!validId(employee)) return res.status(400).json({ message: "Please select an employee." });

        const blocked = checkPeriod(m, y, Boolean(fullMonth));
        if (blocked) return res.status(400).json({ message: blocked });

        const emp = await Employee.findById(employee).select(EMP_CALC_FIELDS);
        if (!emp) return res.status(404).json({ message: "Employee record not found." });
        if (selfBlocked(req, emp._id)) return res.status(403).json({ message: SELF_MESSAGE });

        const result = await generateOne(emp, m, y, { fullMonth: Boolean(fullMonth), overwriteDraft: Boolean(overwriteDraft), by: req.user._id });
        if (result.status === "skipped") return res.status(result.exists ? 409 : 400).json({ message: result.reason });

        const populated = await loadPayroll(result.payroll._id);
        res.status(result.status === "created" ? 201 : 200).json({ ...populated.toObject(), warnings: result.warnings });
    } catch (err) {
        next(err);
    }
};

// @route POST /api/payroll/generate-bulk   { month, year, department, fullMonth, overwriteDrafts }
exports.generateBulkPayroll = async (req, res, next) => {
    try {
        const { month, year, department, fullMonth, overwriteDrafts } = req.body;
        const { m, y, error } = parseMonthYear(month, year);
        if (error) return res.status(400).json({ message: error });

        const blocked = checkPeriod(m, y, Boolean(fullMonth));
        if (blocked) return res.status(400).json({ message: blocked });

        // The employee model keeps the status in "employeeStatus". Exited employees are checked one by one below.
        const filter = { employeeStatus: { $nin: ["Inactive"] } };
        if (department && department !== "ALL") filter.department = department;

        const employees = await Employee.find(filter).select(EMP_CALC_FIELDS).sort({ employeeId: 1 });
        if (!employees.length) return res.status(404).json({ message: "No active employee found." });

        const firstYmd = `${y}-${String(m).padStart(2, "0")}-01`;
        const results = { created: [], updated: [], skipped: [] };
        const who = (e) => ({ name: e.name, employeeId: e.employeeId });

        for (const emp of employees) {
            const exited = /exit/i.test(String(emp.employeeStatus || "")) || emp.isExited === true;
            if (exited && !emp.exitDate) {
                results.skipped.push({ ...who(emp), reason: "Exited, and the exit date is missing" });
                continue;
            }
            if (exited && ymdIST(emp.exitDate) < firstYmd) {
                results.skipped.push({ ...who(emp), reason: "Left before this month" });
                continue;
            }
            if (selfBlocked(req, emp._id)) {
                results.skipped.push({ ...who(emp), reason: "HR cannot generate their own payslip (an admin must)" });
                continue;
            }

            const r = await generateOne(emp, m, y, { fullMonth: Boolean(fullMonth), overwriteDraft: Boolean(overwriteDrafts), by: req.user._id });
            if (r.status === "skipped") results.skipped.push({ ...who(emp), reason: r.reason });
            else results[r.status].push({ ...who(emp), net: r.payroll.netSalary, warnings: r.warnings });
        }

        const done = results.created.length + results.updated.length;
        res.status(201).json({
            success: true,
            message: `${results.created.length} payslips created, ${results.updated.length} drafts refreshed, ${results.skipped.length} skipped.`,
            totalProcessed: done,
            skippedCount: results.skipped.length,
            results,
        });
    } catch (err) {
        next(err);
    }
};

// @route PUT /api/payroll/:id/recalculate   (a draft is rebuilt from the latest attendance, bonus and deductions)
exports.recalculatePayroll = async (req, res, next) => {
    try {
        const payroll = await Payroll.findById(req.params.id);
        if (!payroll) return res.status(404).json({ message: "Payroll record not found." });
        if (payroll.status !== "draft") return res.status(400).json({ message: "Only a draft payslip can be recalculated. A processed one can be reopened by an admin first." });
        if (selfBlocked(req, payroll.employee)) return res.status(403).json({ message: SELF_MESSAGE });

        const emp = await Employee.findById(payroll.employee).select(EMP_CALC_FIELDS);
        if (!emp) return res.status(404).json({ message: "Employee record not found." });

        const calc = await calculatePayroll(emp, payroll.month, payroll.year, { fullMonth: payroll.basis === "full" });
        if (calc.skip) return res.status(400).json({ message: calc.skip });

        payroll.set({ ...calc.values, overtimePay: payroll.overtimePay });
        await payroll.save();

        const populated = await loadPayroll(payroll._id);
        res.json({ ...populated.toObject(), warnings: calc.warnings });
    } catch (err) {
        next(err);
    }
};

// @route PUT /api/payroll/:id   (only pay fields can change, never the employee, month or status)
exports.updatePayroll = async (req, res, next) => {
    try {
        const payroll = await Payroll.findById(req.params.id);
        if (!payroll) return res.status(404).json({ message: "Payroll record not found." });
        if (payroll.status === "paid") return res.status(400).json({ message: "A paid payslip cannot be edited." });
        if (selfBlocked(req, payroll.employee)) return res.status(403).json({ message: SELF_MESSAGE });

        const money = (v) => Math.max(0, Number(v) || 0);
        ["basicSalary", "bonus", "overtimePay", "daysPresent", "daysOnLeave"].forEach((key) => {
            if (req.body[key] !== undefined) payroll[key] = money(req.body[key]);
        });

        const parts = {
            allowances: ["hra", "da", "conveyance", "medical", "special", "other"],
            deductions: ["pf", "esi", "tds", "loan", "lop", "other"],
        };
        Object.entries(parts).forEach(([groupName, keys]) => {
            keys.forEach((sub) => {
                if (req.body[groupName]?.[sub] !== undefined) payroll.set(`${groupName}.${sub}`, money(req.body[groupName][sub]));
            });
        });
        if (req.body.notes !== undefined) payroll.notes = String(req.body.notes).slice(0, 500);

        await payroll.save();
        res.status(200).json(await loadPayroll(payroll._id));
    } catch (err) {
        next(err);
    }
};

/* ------------------------- process, pay and settle ------------------------- */

/* On payment: loan balances go down, and bonus, deductions and claims are marked as used. It runs only once. */
async function settlePayroll(payroll) {
    const claimed = await Payroll.findOneAndUpdate({ _id: payroll._id, settled: { $ne: true } }, { $set: { settled: true } });
    if (!claimed) return;

    for (const item of payroll.loanBreakup || []) {
        const loan = await Loan.findById(item.loan);
        if (!loan) continue;
        loan.remainingBalance = Math.max(0, round2((loan.remainingBalance || 0) - item.amount));
        if (loan.remainingBalance <= 0) loan.status = "COMPLETED";
        await loan.save();
    }

    await Promise.all([
        Deduction.updateMany({ _id: { $in: payroll.deductionIds || [] }, status: "Pending" }, { status: "Applied" }),
        Bonus.updateMany({ _id: { $in: payroll.bonusIds || [] }, status: "Approved" }, { status: "Paid" }),
        Reimbursement.updateMany({ _id: { $in: payroll.reimbursementIds || [] }, status: "APPROVED" }, { status: "PAID" }),
    ]);
}

const processOne = async (id) => {
    const updated = await Payroll.findOneAndUpdate(
        { _id: id, status: "draft" },
        { status: "processed", processedOn: new Date() },
        { new: true }
    ).populate("employee", EMP_FIELDS);
    if (updated) await notifyPayroll(updated, "processed");
    return updated;
};

const payOne = async (id) => {
    const paid = await Payroll.findOneAndUpdate(
        { _id: id, status: "processed" },
        { status: "paid", paidOn: new Date() },
        { new: true }
    ).populate("employee", EMP_FIELDS);
    if (paid) {
        await settlePayroll(paid);
        await notifyPayroll(paid, "paid");
    }
    return paid;
};

// @route PUT /api/payroll/:id/process
exports.processPayroll = async (req, res, next) => {
    try {
        const payroll = await Payroll.findById(req.params.id);
        if (!payroll) return res.status(404).json({ message: "Payroll record not found." });
        if (selfBlocked(req, payroll.employee)) return res.status(403).json({ message: SELF_MESSAGE });
        if (payroll.status !== "draft") {
            return res.status(400).json({ message: `Only a draft payslip can be processed (this one is ${payroll.status}).` });
        }

        const updated = await processOne(payroll._id);
        if (!updated) return res.status(409).json({ message: "This payslip was just processed by someone else." });
        res.status(200).json(updated);
    } catch (err) {
        next(err);
    }
};

// @route PUT /api/payroll/:id/reopen   (admin only: a processed payslip goes back to draft so it can be recalculated)
exports.reopenPayroll = async (req, res, next) => {
    try {
        const reopened = await Payroll.findOneAndUpdate(
            { _id: req.params.id, status: "processed" },
            { $set: { status: "draft" }, $unset: { processedOn: "" } },
            { new: true }
        ).populate("employee", EMP_FIELDS);

        if (!reopened) {
            const exists = await Payroll.findById(req.params.id).select("status");
            if (!exists) return res.status(404).json({ message: "Payroll record not found." });
            return res.status(400).json({
                message: exists.status === "paid" ? "A paid payslip cannot be reopened." : "Only a processed payslip can be reopened.",
            });
        }
        res.status(200).json(reopened);
    } catch (err) {
        next(err);
    }
};

// @route POST /api/payroll/process-bulk   { month, year }
exports.processBulk = async (req, res, next) => {
    try {
        const { m, y, error } = parseMonthYear(req.body.month, req.body.year);
        if (error) return res.status(400).json({ message: error });

        const drafts = await Payroll.find({ month: m, year: y, status: "draft" }).select("employee");
        if (!drafts.length) return res.status(404).json({ message: "There are no draft payslips for this month." });

        let processed = 0;
        let skipped = 0;
        for (const d of drafts) {
            if (selfBlocked(req, d.employee)) {
                skipped += 1;
                continue;
            }
            if (await processOne(d._id)) processed += 1;
        }
        res.json({ success: true, message: `${processed} payslips processed, ${skipped} skipped.`, processed, skipped });
    } catch (err) {
        next(err);
    }
};

// @route PUT /api/payroll/:id/mark-paid
exports.markAsPaid = async (req, res, next) => {
    try {
        const payroll = await Payroll.findById(req.params.id);
        if (!payroll) return res.status(404).json({ message: "Payroll record not found." });
        if (selfBlocked(req, payroll.employee)) return res.status(403).json({ message: SELF_MESSAGE });
        if (payroll.status === "paid") return res.status(400).json({ message: "This payslip is already paid." });
        if (payroll.status !== "processed") return res.status(400).json({ message: "Please process this payslip before marking it as paid." });

        const paid = await payOne(payroll._id);
        if (!paid) return res.status(409).json({ message: "This payslip was just paid by someone else." });
        res.status(200).json(paid);
    } catch (err) {
        next(err);
    }
};

// @route POST /api/payroll/disburse/:batchId   (batchId looks like 2026-9 or 2026-9-processed)
exports.disburseBatch = async (req, res, next) => {
    try {
        const [year, month] = req.params.batchId.split("-").map(Number);
        const { m, y, error } = parseMonthYear(month, year);
        if (error) return res.status(400).json({ message: "Invalid batch identifier format." });

        const processed = await Payroll.find({ month: m, year: y, status: "processed" }).select("employee");
        if (!processed.length) {
            const drafts = await Payroll.countDocuments({ month: m, year: y, status: "draft" });
            return res.status(400).json({
                message: drafts ? "These payslips are still drafts. Please process them first." : "There are no processed payslips to pay for this month.",
            });
        }

        let modifiedCount = 0;
        let skipped = 0;
        for (const p of processed) {
            if (selfBlocked(req, p.employee)) {
                skipped += 1;
                continue;
            }
            if (await payOne(p._id)) modifiedCount += 1;
        }

        res.status(200).json({
            success: true,
            message: `${modifiedCount} payslips paid${skipped ? `, ${skipped} skipped (your own payslip needs an admin)` : ""}.`,
            modifiedCount,
            skipped,
        });
    } catch (err) {
        next(err);
    }
};

// @route DELETE /api/payroll/:id   (admin only, and never a paid payslip)
exports.deletePayroll = async (req, res, next) => {
    try {
        const payroll = await Payroll.findById(req.params.id);
        if (!payroll) return res.status(404).json({ message: "Payslip record not found." });
        if (payroll.status === "paid") return res.status(400).json({ message: "A paid payslip cannot be deleted." });
        await payroll.deleteOne();
        res.status(200).json({ success: true, message: "Payslip deleted successfully." });
    } catch (err) {
        next(err);
    }
};

/* ------------------------------ salary structures ------------------------------ */

function cleanStructure(body, current = {}) {
    const pick = (key, fallback) => (body[key] !== undefined && body[key] !== "" ? Number(body[key]) : current[key] ?? fallback);

    const name = String(body.name ?? current.name ?? "").trim();
    const basicPercent = pick("basicPercent");
    const hraPercent = pick("hraPercent", 0);
    const daPercent = pick("daPercent", 0);
    // when special is not sent it takes whatever is left of the 100%
    const specialPercent = pick("specialPercent", round2(100 - (basicPercent || 0) - hraPercent - daPercent));
    const pfPercent = pick("pfPercent", 0);
    const esiPercent = pick("esiPercent", 0);

    if (name.length < 2 || name.length > 60) return { error: "Structure name must be 2 to 60 characters." };
    const all = { basicPercent, hraPercent, daPercent, specialPercent, pfPercent, esiPercent };
    for (const [key, value] of Object.entries(all)) {
        if (!Number.isFinite(value) || value < 0 || value > 100) return { error: `${key.replace("Percent", "")} must be a number from 0 to 100.` };
    }
    const total = round2(basicPercent + hraPercent + daPercent + specialPercent);
    if (Math.abs(total - 100) > 0.01) return { error: `Basic + HRA + DA + Special must be exactly 100% (now ${total}%).` };

    return { data: { name, ...all } };
}

const structureNameTaken = (name, ignoreId) =>
    SalaryStructure.exists({ name: new RegExp(`^${escapeRegex(name)}$`, "i"), ...(ignoreId ? { _id: { $ne: ignoreId } } : {}) });

// @route GET /api/payroll/structures
exports.getStructures = async (req, res, next) => {
    try {
        const [structures, usage] = await Promise.all([
            SalaryStructure.find().sort({ isDefault: -1, name: 1 }).lean(),
            EmployeeSalary.aggregate([{ $group: { _id: "$salaryStructure", count: { $sum: 1 } } }]),
        ]);
        const used = new Map(usage.map((u) => [String(u._id), u.count]));
        res.json(structures.map((s) => ({ ...s, usedBy: used.get(String(s._id)) || 0 })));
    } catch (err) {
        next(err);
    }
};

// @route POST /api/payroll/structures
exports.createStructure = async (req, res, next) => {
    try {
        const cleaned = cleanStructure(req.body);
        if (cleaned.error) return res.status(400).json({ message: cleaned.error });
        if (await structureNameTaken(cleaned.data.name)) {
            return res.status(409).json({ message: `A structure named "${cleaned.data.name}" already exists.` });
        }

        const first = !(await SalaryStructure.exists({}));
        const isDefault = first || Boolean(req.body.isDefault);
        const structure = await SalaryStructure.create({ ...cleaned.data, isDefault });
        if (isDefault) await SalaryStructure.updateMany({ _id: { $ne: structure._id } }, { isDefault: false });

        res.status(201).json(structure);
    } catch (err) {
        next(err);
    }
};

// @route PUT /api/payroll/structures/:id   (changes apply to payslips generated from now on)
exports.updateStructure = async (req, res, next) => {
    try {
        const structure = await SalaryStructure.findById(req.params.id);
        if (!structure) return res.status(404).json({ message: "Salary structure not found." });

        const cleaned = cleanStructure(req.body, structure);
        if (cleaned.error) return res.status(400).json({ message: cleaned.error });
        if (await structureNameTaken(cleaned.data.name, structure._id)) {
            return res.status(409).json({ message: `A structure named "${cleaned.data.name}" already exists.` });
        }

        Object.assign(structure, cleaned.data);
        if (req.body.isDefault === true) structure.isDefault = true;
        await structure.save();
        if (structure.isDefault) await SalaryStructure.updateMany({ _id: { $ne: structure._id } }, { isDefault: false });

        res.json(structure);
    } catch (err) {
        next(err);
    }
};

// @route DELETE /api/payroll/structures/:id
exports.deleteStructure = async (req, res, next) => {
    try {
        const structure = await SalaryStructure.findById(req.params.id);
        if (!structure) return res.status(404).json({ message: "Salary structure not found." });

        const used = await EmployeeSalary.countDocuments({ salaryStructure: structure._id });
        if (used) {
            return res.status(409).json({ message: `This structure is assigned to ${used} employee${used === 1 ? "" : "s"}. Assign them another one first.` });
        }
        await structure.deleteOne();
        res.json({ message: "Salary structure deleted successfully." });
    } catch (err) {
        next(err);
    }
};

/* ------------------------------ who gets how much ------------------------------ */

const shapeSalaryRow = (emp, record, defaultStructure) => {
    const structure = record?.salaryStructure || defaultStructure || null;
    const gross = Number(emp.salary) || 0;
    return {
        _id: record?._id || null, // null = no record yet (the employee uses the default structure)
        assigned: Boolean(record),
        employee: emp,
        salaryStructure: record?.salaryStructure || null,
        effectiveStructure: structure ? { _id: structure._id, name: structure.name } : null,
        usingDefault: !record?.salaryStructure,
        grossMonthly: gross,
        annualCTC: round2(gross * 12),
        breakup: splitSalary(gross, structure),
        status: record?.status || "Active",
        effectiveDate: record?.effectiveDate || null,
    };
};

// @route GET /api/payroll/employee-salaries   (every active employee, with the salary and breakup he will get)
exports.getEmployeeSalaries = async (req, res, next) => {
    try {
        const [employees, records, defaultStructure] = await Promise.all([
            Employee.find({ employeeStatus: { $nin: ["Inactive", "Exited", "Exit"] } })
                .select("name employeeId department designation email salary")
                .sort({ name: 1 })
                .lean(),
            EmployeeSalary.find().populate("salaryStructure").lean(),
            SalaryStructure.findOne({ isDefault: true }).lean(),
        ]);
        const byEmployee = new Map(records.map((r) => [String(r.employee), r]));
        res.json(employees.map((emp) => shapeSalaryRow(emp, byEmployee.get(String(emp._id)), defaultStructure)));
    } catch (err) {
        next(err);
    }
};

/* Saves the structure, status and (when sent) the monthly salary of one employee */
async function saveSalary(employeeId, body, res) {
    const emp = await Employee.findById(employeeId).select("name employeeId department designation email salary");
    if (!emp) {
        res.status(404).json({ message: "Employee record not found." });
        return null;
    }

    const set = { effectiveDate: new Date() };
    const unset = {};

    const structureId = body.salaryStructure ?? body.structure;
    if (structureId) {
        if (!validId(structureId) || !(await SalaryStructure.exists({ _id: structureId }))) {
            res.status(400).json({ message: "The selected salary structure was not found." });
            return null;
        }
        set.salaryStructure = structureId;
    } else if (structureId === "" || structureId === null) {
        unset.salaryStructure = "";
    }

    if (body.status !== undefined) {
        if (!["Active", "Inactive", "On Hold"].includes(body.status)) {
            res.status(400).json({ message: "Status must be Active, Inactive or On Hold." });
            return null;
        }
        set.status = body.status;
    }

    // The salary amount lives on the employee profile, so it is saved there
    let gross = Number(emp.salary) || 0;
    const sentGross = body.grossMonthly ?? body.monthlySalary;
    if (sentGross !== undefined && sentGross !== "") {
        const value = Number(sentGross);
        if (!Number.isFinite(value) || value <= 0 || value > 10000000) {
            res.status(400).json({ message: "Monthly salary must be a number greater than 0." });
            return null;
        }
        gross = value;
        emp.salary = value;
        await Employee.updateOne({ _id: emp._id }, { $set: { salary: value } });
    }
    set.grossMonthly = gross;
    set.annualCTC = round2(gross * 12);

    const record = await EmployeeSalary.findOneAndUpdate(
        { employee: emp._id },
        { $set: set, ...(Object.keys(unset).length ? { $unset: unset } : {}) },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    ).populate("salaryStructure");

    const defaultStructure = await SalaryStructure.findOne({ isDefault: true }).lean();
    return shapeSalaryRow(emp.toObject(), record.toObject(), defaultStructure);
}

// @route POST /api/payroll/employee-salaries   { employeeId, salaryStructure, grossMonthly?, status? }
exports.createEmployeeSalary = async (req, res, next) => {
    try {
        const employeeId = req.body.employeeId || req.body.employee;
        if (!validId(employeeId)) return res.status(400).json({ message: "Please select an employee." });
        const row = await saveSalary(employeeId, req.body, res);
        if (row) res.status(201).json(row);
    } catch (err) {
        next(err);
    }
};

// @route PUT /api/payroll/employee-salaries/:id   (:id is the id of the salary record)
exports.updateEmployeeSalary = async (req, res, next) => {
    try {
        const record = await EmployeeSalary.findById(req.params.id);
        if (!record) return res.status(404).json({ message: "Employee salary record not found." });
        const row = await saveSalary(record.employee, req.body, res);
        if (row) res.json(row);
    } catch (err) {
        next(err);
    }
};

// @route DELETE /api/payroll/employee-salaries/:id   (the employee goes back to the default structure)
exports.deleteEmployeeSalary = async (req, res, next) => {
    try {
        const removed = await EmployeeSalary.findByIdAndDelete(req.params.id);
        if (!removed) return res.status(404).json({ message: "Employee salary record not found." });
        res.json({ message: "Salary assignment removed. The default structure will be used." });
    } catch (err) {
        next(err);
    }
};

/* ------------------------------- reimbursements ------------------------------- */

const CLAIM_CATEGORIES = ["TRAVEL", "INTERNET", "MEAL", "TRAINING", "MEDICAL", "OTHER"];
const populateClaim = (query) => query.populate("employee", EMP_FIELDS).populate("reviewedBy", "name");

const parseClaimDate = (v) => {
    if (!v) return new Date();
    const d = new Date(`${String(v).slice(0, 10)}T00:00:00.000+05:30`);
    return Number.isNaN(d.getTime()) ? null : d;
};

/* A receipt link must be empty or a web address (http or https) */
const cleanReceipt = (v) => {
    const url = String(v || "").trim().slice(0, 500);
    if (url && !/^https?:\/\/\S+$/i.test(url)) return { error: "The receipt link must start with http:// or https://." };
    return { value: url };
};

// @route GET /api/payroll/reimbursements?status=&employee=
exports.getReimbursements = async (req, res, next) => {
    try {
        const { status, employee } = req.query;
        const filter = {};
        if (status && status !== "ALL") filter.status = String(status).toUpperCase();

        if (isAdminHr(req)) {
            if (employee && employee !== "ALL") filter.employee = employee;
        } else {
            const own = ownEmployeeId(req);
            if (!own) return res.json([]);
            filter.employee = own;
        }

        res.json(await populateClaim(Reimbursement.find(filter).sort({ createdAt: -1 }).limit(500)));
    } catch (err) {
        next(err);
    }
};

// @route POST /api/payroll/reimbursements   (an employee claims for himself, admin / HR can add for anyone)
exports.createReimbursement = async (req, res, next) => {
    try {
        const target = isAdminHr(req) && (req.body.employeeId || req.body.employee) ? req.body.employeeId || req.body.employee : ownEmployeeId(req);
        if (!target || !validId(target)) {
            return res.status(400).json({ message: "Your account has no employee profile, so a claim cannot be made." });
        }
        if (!(await Employee.exists({ _id: target }))) return res.status(404).json({ message: "Employee record not found." });

        const category = String(req.body.category || "OTHER").toUpperCase();
        const amount = Number(req.body.amount);
        const description = String(req.body.description || "").trim();
        const date = parseClaimDate(req.body.date || req.body.billDate);
        const receipt = cleanReceipt(req.body.receiptUrl);

        if (!CLAIM_CATEGORIES.includes(category)) return res.status(400).json({ message: "Please select a valid category." });
        if (!Number.isFinite(amount) || amount <= 0 || amount > 1000000) return res.status(400).json({ message: "Enter a valid amount." });
        if (description.length < 3) return res.status(400).json({ message: "Please describe the expense." });
        if (!date || date.getTime() > Date.now() + 24 * 3600 * 1000) return res.status(400).json({ message: "The bill date is not valid." });
        if (receipt.error) return res.status(400).json({ message: receipt.error });

        const claim = await Reimbursement.create({
            employee: target,
            category,
            amount,
            date,
            description: description.slice(0, 500),
            receiptUrl: receipt.value,
            status: "PENDING",
        });

        const employeeUser = await userIdOfEmployee(target);
        if (employeeUser) {
            await notifyApprovers(employeeUser, {
                type: "payroll",
                title: "New reimbursement claim",
                message: `A reimbursement claim of ₹${amount} (${category.toLowerCase()}) is waiting for review.`,
                link: "/payroll/reimbursements",
            });
        }

        res.status(201).json(await populateClaim(Reimbursement.findById(claim._id)));
    } catch (err) {
        next(err);
    }
};

// @route PUT /api/payroll/reimbursements/:id   (admin / HR, or the owner, only while pending)
exports.updateReimbursement = async (req, res, next) => {
    try {
        const claim = await Reimbursement.findById(req.params.id);
        if (!claim) return res.status(404).json({ message: "Reimbursement record not found." });

        const owner = idOf(claim.employee) === ownEmployeeId(req);
        if (!isAdminHr(req) && !owner) return res.status(403).json({ message: "You can edit only your own claims." });
        if (claim.status !== "PENDING") return res.status(400).json({ message: "Only a pending claim can be edited." });

        if (req.body.category !== undefined) {
            const category = String(req.body.category).toUpperCase();
            if (!CLAIM_CATEGORIES.includes(category)) return res.status(400).json({ message: "Please select a valid category." });
            claim.category = category;
        }
        if (req.body.amount !== undefined) {
            const amount = Number(req.body.amount);
            if (!Number.isFinite(amount) || amount <= 0 || amount > 1000000) return res.status(400).json({ message: "Enter a valid amount." });
            claim.amount = amount;
        }
        if (req.body.description !== undefined) {
            const description = String(req.body.description).trim();
            if (description.length < 3) return res.status(400).json({ message: "Please describe the expense." });
            claim.description = description.slice(0, 500);
        }
        if (req.body.date !== undefined || req.body.billDate !== undefined) {
            const date = parseClaimDate(req.body.date || req.body.billDate);
            if (!date) return res.status(400).json({ message: "The bill date is not valid." });
            claim.date = date;
        }
        if (req.body.receiptUrl !== undefined) {
            const receipt = cleanReceipt(req.body.receiptUrl);
            if (receipt.error) return res.status(400).json({ message: receipt.error });
            claim.receiptUrl = receipt.value;
        }

        await claim.save();
        res.json(await populateClaim(Reimbursement.findById(claim._id)));
    } catch (err) {
        next(err);
    }
};

// @route PUT /api/payroll/reimbursements/:id/status   { status: "APPROVED" | "REJECTED", note }
exports.updateReimbursementStatus = async (req, res, next) => {
    try {
        const status = String(req.body.status || "").toUpperCase();
        if (!["APPROVED", "REJECTED"].includes(status)) return res.status(400).json({ message: "Status must be APPROVED or REJECTED." });

        const claim = await Reimbursement.findById(req.params.id);
        if (!claim) return res.status(404).json({ message: "Reimbursement record not found." });
        // a claim is reviewed once; an approved one may already be inside a payslip
        if (claim.status !== "PENDING") return res.status(400).json({ message: `This claim is already ${claim.status.toLowerCase()}.` });
        if (selfBlocked(req, claim.employee)) return res.status(403).json({ message: "You cannot review your own claim. Please ask an admin." });

        claim.status = status;
        claim.reviewedBy = req.user._id;
        claim.reviewedAt = new Date();
        claim.reviewNote = String(req.body.note || "").trim().slice(0, 300);
        await claim.save();

        const employeeUser = await userIdOfEmployee(claim.employee);
        await notify(employeeUser, {
            type: "payroll",
            title: status === "APPROVED" ? "Reimbursement approved" : "Reimbursement rejected",
            message:
                status === "APPROVED"
                    ? `Your claim of ₹${claim.amount} was approved and will be paid with your salary.`
                    : `Your claim of ₹${claim.amount} was rejected.${claim.reviewNote ? ` Reason: ${claim.reviewNote}` : ""}`,
            link: "/payroll/reimbursements",
            exclude: req.user._id,
        });

        res.json(await populateClaim(Reimbursement.findById(claim._id)));
    } catch (err) {
        next(err);
    }
};

// @route DELETE /api/payroll/reimbursements/:id
exports.deleteReimbursement = async (req, res, next) => {
    try {
        const claim = await Reimbursement.findById(req.params.id);
        if (!claim) return res.status(404).json({ message: "Reimbursement record not found." });
        if (claim.status === "PAID") return res.status(400).json({ message: "A paid claim cannot be deleted." });

        const owner = idOf(claim.employee) === ownEmployeeId(req);
        if (!isAdminHr(req) && !(owner && claim.status === "PENDING")) {
            return res.status(403).json({ message: "You can delete only your own pending claims." });
        }
        if (await Payroll.exists({ reimbursementIds: claim._id })) {
            return res.status(409).json({ message: "This claim is already inside a payslip. Delete or reopen that payslip first." });
        }
        await claim.deleteOne();
        res.json({ message: "Reimbursement deleted successfully." });
    } catch (err) {
        next(err);
    }
};










// const mongoose = require("mongoose");
// const Payroll = require("../models/Payroll");
// const Employee = require("../models/Employee");
// const SalaryStructure = require("../models/SalaryStructure");
// const EmployeeSalary = require("../models/EmployeeSalary");
// const Reimbursement = require("../models/Reimbursement");
// const Bonus = require("../models/Bonus");
// const Deduction = require("../models/Deduction");
// const Loan = require("../models/Loan");
// const { calculatePayroll, splitSalary, round2 } = require("../utils/payrollEngine");
// const { notify, notifyApprovers, notifyPayroll, userIdOfEmployee } = require("../utils/notify");
// const { ymdIST } = require("../utils/accessScope");

// /* ------------------------------- helpers ------------------------------- */

// const roleLower = (req) => String(req.user?.role || "").toLowerCase();
// const isAdminHr = (req) => ["admin", "hr"].includes(roleLower(req));
// const ownEmployeeId = (req) => (req.user?.employee ? String(req.user.employee._id || req.user.employee) : "");
// const idOf = (v) => String(v?._id || v || "");
// const validId = (v) => mongoose.isValidObjectId(v);

// const EMP_FIELDS = "name employeeId department designation email";
// const EMP_CALC_FIELDS = "name employeeId salary dateOfJoining employeeStatus isExited exitDate department designation email";
// const SHARED = ["processed", "paid"]; // an employee never sees a draft payslip

// /* HR can not generate, process or pay the payslip of HR herself. An admin does that. */
// const selfBlocked = (req, employeeId) => roleLower(req) === "hr" && Boolean(ownEmployeeId(req)) && idOf(employeeId) === ownEmployeeId(req);
// const SELF_MESSAGE = "HR cannot generate, process or pay their own payslip. Please ask an admin.";

// const parseMonthYear = (month, year) => {
//     const m = Number(month);
//     const y = Number(year);
//     if (!Number.isInteger(m) || m < 1 || m > 12) return { error: "Please select a valid month." };
//     if (!Number.isInteger(y) || y < 2000 || y > 2100) return { error: "Please select a valid year." };
//     return { m, y };
// };

// /* A month can be paid only after it ends, unless the whole month is paid without attendance */
// const checkPeriod = (m, y, fullMonth) => {
//     const [cy, cm] = ymdIST().split("-").map(Number);
//     if (y > cy || (y === cy && m > cm)) return "Payroll cannot be generated for a future month.";
//     if (y === cy && m === cm && !fullMonth) {
//         return 'This month has not ended yet. Generate it after the month ends, or choose "Pay the full month (ignore attendance)".';
//     }
//     return "";
// };

// const loadPayroll = (id) => Payroll.findById(id).populate("employee", EMP_FIELDS);

// /* ------------------------------ payslip view ------------------------------ */

// const EARNING_LABELS = [
//     ["basic", "Basic Salary"],
//     ["hra", "House Rent Allowance"],
//     ["da", "Dearness Allowance"],
//     ["conveyance", "Conveyance Allowance"],
//     ["medical", "Medical Allowance"],
//     ["special", "Special Allowance"],
//     ["other", "Other Allowance"],
//     ["bonus", "Bonus"],
//     ["overtime", "Overtime"],
// ];
// const DEDUCTION_LABELS = [
//     ["pf", "Provident Fund"],
//     ["esi", "ESI"],
//     ["tds", "TDS"],
//     ["loan", "Loan / Advance Recovery"],
//     ["lop", "Loss of Pay"],
//     ["other", "Other Deductions"],
// ];

// const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
// const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
// const below100 = (x) => (x < 20 ? ONES[x] : `${TENS[Math.floor(x / 10)]}${x % 10 ? ` ${ONES[x % 10]}` : ""}`);
// const below1000 = (x) => (x < 100 ? below100(x) : `${ONES[Math.floor(x / 100)]} Hundred${x % 100 ? ` ${below100(x % 100)}` : ""}`);

// function inWords(amount) {
//     const x = Math.round(Number(amount) || 0);
//     if (x <= 0) return "Zero Rupees Only";
//     const parts = [];
//     const crore = Math.floor(x / 1e7);
//     const lakh = Math.floor((x % 1e7) / 1e5);
//     const thousand = Math.floor((x % 1e5) / 1e3);
//     const rest = x % 1000;
//     if (crore) parts.push(`${below1000(crore)} Crore`);
//     if (lakh) parts.push(`${below100(lakh)} Lakh`);
//     if (thousand) parts.push(`${below100(thousand)} Thousand`);
//     if (rest) parts.push(below1000(rest));
//     return `${parts.join(" ")} Rupees Only`;
// }

// const company = () => ({
//     name: process.env.COMPANY_NAME || process.env.EMAIL_FROM_NAME || "Company",
//     address: process.env.COMPANY_ADDRESS || "",
// });

// function buildSlip(p) {
//     const o = typeof p.toObject === "function" ? p.toObject() : p;
//     const A = o.allowances || {};
//     const D = o.deductions || {};
//     const r = round2;

//     const earnings = {
//         basic: r(o.basicSalary), hra: r(A.hra), da: r(A.da), conveyance: r(A.conveyance), medical: r(A.medical),
//         special: r(A.special), other: r(A.other), bonus: r(o.bonus), overtime: r(o.overtimePay),
//     };
//     const earningLines = EARNING_LABELS.map(([key, label]) => ({ key, label, amount: earnings[key] })).filter((l) => l.amount > 0);
//     const reimbursement = r(o.reimbursement);
//     if (reimbursement > 0) earningLines.push({ key: "reimbursement", label: "Reimbursements (not taxable)", amount: reimbursement });
//     const deductionLines = DEDUCTION_LABELS.map(([key, label]) => ({ key, label, amount: r(D[key]) })).filter((l) => l.amount > 0);

//     const monthPadded = String(o.month).padStart(2, "0");
//     return {
//         _id: o._id,
//         slipNumber: `PAY-${o.year}-${monthPadded}-${String(o._id).slice(-4).toUpperCase()}`,
//         company: company(),
//         employee: o.employee,
//         period: `${monthPadded}/${o.year}`,
//         periodLabel: new Date(Date.UTC(o.year, o.month - 1, 1)).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" }),
//         month: o.month,
//         year: o.year,
//         structureName: o.structureName || "",
//         monthlyGross: r(o.monthlyGross),
//         earnings,
//         earningLines,
//         deductions: D,
//         deductionLines,
//         reimbursement,
//         grossSalary: r(o.grossSalary),
//         totalEarnings: r(r(o.grossSalary) + reimbursement),
//         totalDeductions: r(o.totalDeductions),
//         netSalary: r(o.netSalary),
//         netInWords: inWords(o.netSalary),
//         status: o.status,
//         processedOn: o.processedOn,
//         paidOn: o.paidOn,
//         basis: o.basis,
//         attendance: {
//             daysInMonth: o.daysInMonth || 0,
//             workingDays: o.workingDays || 0,
//             present: o.daysPresent || 0,
//             leave: o.daysOnLeave || 0,
//             unpaid: o.unpaidDays || 0,
//         },
//         // the same values under the older names
//         basicSalary: earnings.basic,
//         allowances: A,
//         bonus: earnings.bonus,
//         overtimePay: earnings.overtime,
//         daysPresent: o.daysPresent || 0,
//         daysOnLeave: o.daysOnLeave || 0,
//     };
// }

// /* ------------------------------ read payslips ------------------------------ */

// // @route GET /api/payroll?month=&year=&employee=&status=
// exports.getPayrolls = async (req, res, next) => {
//     try {
//         const { month, year, employee, status } = req.query;
//         const filter = {};
//         if (month && month !== "ALL") filter.month = Number(month);
//         if (year && year !== "ALL") filter.year = Number(year);
//         if (status && status !== "ALL") filter.status = String(status).toLowerCase();

//         if (isAdminHr(req)) {
//             if (employee && employee !== "ALL") filter.employee = employee;
//         } else {
//             const own = ownEmployeeId(req);
//             if (!own) return res.status(200).json([]);
//             filter.employee = own;
//             filter.status = SHARED.includes(filter.status) ? filter.status : { $in: SHARED };
//         }

//         const payrolls = await Payroll.find(filter).populate("employee", EMP_FIELDS).sort({ year: -1, month: -1, createdAt: -1 });
//         res.status(200).json(payrolls);
//     } catch (err) {
//         next(err);
//     }
// };

// /* Only the owner (processed or paid) and admin / HR can open a payslip */
// const canOpen = (req, payroll) => {
//     if (isAdminHr(req)) return true;
//     const own = ownEmployeeId(req);
//     return Boolean(own) && idOf(payroll.employee) === own && SHARED.includes(payroll.status);
// };

// // @route GET /api/payroll/:id
// exports.getPayroll = async (req, res, next) => {
//     try {
//         const payroll = await loadPayroll(req.params.id);
//         if (!payroll) return res.status(404).json({ message: "Payroll record not found." });
//         if (!canOpen(req, payroll)) return res.status(403).json({ message: "You can view only your own payslips." });
//         res.status(200).json(payroll);
//     } catch (err) {
//         next(err);
//     }
// };

// // @route GET /api/payroll/payslip/:id
// exports.getPayslip = async (req, res, next) => {
//     try {
//         const payroll = await Payroll.findById(req.params.id).populate("employee", `${EMP_FIELDS} dateOfJoining`);
//         if (!payroll) return res.status(404).json({ message: "Payslip not found." });
//         if (!canOpen(req, payroll)) return res.status(403).json({ message: "You can view only your own payslips." });
//         res.status(200).json(buildSlip(payroll));
//     } catch (err) {
//         next(err);
//     }
// };

// // @route GET /api/payroll/payslips?month=&year=&employee=
// exports.getPayslipsList = async (req, res, next) => {
//     try {
//         const { month, year, employee } = req.query;
//         const filter = { status: { $in: SHARED } };
//         if (month && month !== "ALL") filter.month = Number(month);
//         if (year && year !== "ALL") filter.year = Number(year);

//         if (isAdminHr(req)) {
//             if (employee && employee !== "ALL") filter.employee = employee;
//         } else {
//             const own = ownEmployeeId(req);
//             if (!own) return res.status(200).json([]);
//             filter.employee = own;
//         }

//         const list = await Payroll.find(filter)
//             .populate("employee", `${EMP_FIELDS} dateOfJoining`)
//             .sort({ year: -1, month: -1, createdAt: -1 })
//             .limit(500);
//         res.status(200).json(list.map(buildSlip));
//     } catch (err) {
//         next(err);
//     }
// };

// /* ------------------------------ generate ------------------------------ */

// /* Creates one payslip (or refreshes a draft). Returns { status, payroll?, reason?, warnings? }. */
// async function generateOne(emp, m, y, { fullMonth, overwriteDraft, by }) {
//     const existing = await Payroll.findOne({ employee: emp._id, month: m, year: y });
//     if (existing && !(overwriteDraft && existing.status === "draft")) {
//         return { status: "skipped", reason: existing.status === "draft" ? "Already generated (draft)" : `Already ${existing.status}`, exists: true };
//     }

//     const calc = await calculatePayroll(emp, m, y, { fullMonth });
//     if (calc.skip) return { status: "skipped", reason: calc.skip };

//     if (existing) {
//         existing.set({ ...calc.values, overtimePay: existing.overtimePay, generatedBy: by });
//         await existing.save();
//         return { status: "updated", payroll: existing, warnings: calc.warnings };
//     }

//     try {
//         const payroll = await Payroll.create({ ...calc.values, status: "draft", generatedBy: by });
//         return { status: "created", payroll, warnings: calc.warnings };
//     } catch (err) {
//         if (err.code === 11000) return { status: "skipped", reason: "Already generated", exists: true };
//         throw err;
//     }
// }

// // @route POST /api/payroll/preview   { employee, month, year, fullMonth }
// exports.previewPayroll = async (req, res, next) => {
//     try {
//         const { employee, month, year, fullMonth } = req.body;
//         const { m, y, error } = parseMonthYear(month, year);
//         if (error) return res.status(400).json({ message: error });
//         if (!validId(employee)) return res.status(400).json({ message: "Please select an employee." });

//         const emp = await Employee.findById(employee).select(EMP_CALC_FIELDS);
//         if (!emp) return res.status(404).json({ message: "Employee record not found." });

//         const calc = await calculatePayroll(emp, m, y, { fullMonth: Boolean(fullMonth) });
//         if (calc.skip) return res.status(400).json({ message: calc.skip });

//         res.json({ ...calc.values, ...Payroll.computeTotals(calc.values), employee: emp, warnings: calc.warnings, summary: calc.summary });
//     } catch (err) {
//         next(err);
//     }
// };

// // @route POST /api/payroll/generate   { employee, month, year, fullMonth, overwriteDraft }
// exports.generatePayroll = async (req, res, next) => {
//     try {
//         const { employee, month, year, fullMonth, overwriteDraft } = req.body;
//         const { m, y, error } = parseMonthYear(month, year);
//         if (error) return res.status(400).json({ message: error });
//         if (!validId(employee)) return res.status(400).json({ message: "Please select an employee." });

//         const blocked = checkPeriod(m, y, Boolean(fullMonth));
//         if (blocked) return res.status(400).json({ message: blocked });

//         const emp = await Employee.findById(employee).select(EMP_CALC_FIELDS);
//         if (!emp) return res.status(404).json({ message: "Employee record not found." });
//         if (selfBlocked(req, emp._id)) return res.status(403).json({ message: SELF_MESSAGE });

//         const result = await generateOne(emp, m, y, { fullMonth: Boolean(fullMonth), overwriteDraft: Boolean(overwriteDraft), by: req.user._id });
//         if (result.status === "skipped") return res.status(result.exists ? 409 : 400).json({ message: result.reason });

//         const populated = await loadPayroll(result.payroll._id);
//         res.status(result.status === "created" ? 201 : 200).json({ ...populated.toObject(), warnings: result.warnings });
//     } catch (err) {
//         next(err);
//     }
// };

// // @route POST /api/payroll/generate-bulk   { month, year, department, fullMonth, overwriteDrafts }
// exports.generateBulkPayroll = async (req, res, next) => {
//     try {
//         const { month, year, department, fullMonth, overwriteDrafts } = req.body;
//         const { m, y, error } = parseMonthYear(month, year);
//         if (error) return res.status(400).json({ message: error });

//         const blocked = checkPeriod(m, y, Boolean(fullMonth));
//         if (blocked) return res.status(400).json({ message: blocked });

//         // The employee model keeps the status in "employeeStatus". Exited employees are checked one by one below.
//         const filter = { employeeStatus: { $nin: ["Inactive"] } };
//         if (department && department !== "ALL") filter.department = department;

//         const employees = await Employee.find(filter).select(EMP_CALC_FIELDS).sort({ employeeId: 1 });
//         if (!employees.length) return res.status(404).json({ message: "No active employee found." });

//         const firstYmd = `${y}-${String(m).padStart(2, "0")}-01`;
//         const results = { created: [], updated: [], skipped: [] };
//         const who = (e) => ({ name: e.name, employeeId: e.employeeId });

//         for (const emp of employees) {
//             const exited = /exit/i.test(String(emp.employeeStatus || "")) || emp.isExited === true;
//             if (exited && !emp.exitDate) {
//                 results.skipped.push({ ...who(emp), reason: "Exited, and the exit date is missing" });
//                 continue;
//             }
//             if (exited && ymdIST(emp.exitDate) < firstYmd) {
//                 results.skipped.push({ ...who(emp), reason: "Left before this month" });
//                 continue;
//             }
//             if (selfBlocked(req, emp._id)) {
//                 results.skipped.push({ ...who(emp), reason: "HR cannot generate their own payslip (an admin must)" });
//                 continue;
//             }

//             const r = await generateOne(emp, m, y, { fullMonth: Boolean(fullMonth), overwriteDraft: Boolean(overwriteDrafts), by: req.user._id });
//             if (r.status === "skipped") results.skipped.push({ ...who(emp), reason: r.reason });
//             else results[r.status].push({ ...who(emp), net: r.payroll.netSalary, warnings: r.warnings });
//         }

//         const done = results.created.length + results.updated.length;
//         res.status(201).json({
//             success: true,
//             message: `${results.created.length} payslips created, ${results.updated.length} drafts refreshed, ${results.skipped.length} skipped.`,
//             totalProcessed: done,
//             skippedCount: results.skipped.length,
//             results,
//         });
//     } catch (err) {
//         next(err);
//     }
// };

// // @route PUT /api/payroll/:id/recalculate   (a draft is rebuilt from the latest attendance, bonus and deductions)
// exports.recalculatePayroll = async (req, res, next) => {
//     try {
//         const payroll = await Payroll.findById(req.params.id);
//         if (!payroll) return res.status(404).json({ message: "Payroll record not found." });
//         if (payroll.status !== "draft") return res.status(400).json({ message: "Only a draft payslip can be recalculated." });
//         if (selfBlocked(req, payroll.employee)) return res.status(403).json({ message: SELF_MESSAGE });

//         const emp = await Employee.findById(payroll.employee).select(EMP_CALC_FIELDS);
//         if (!emp) return res.status(404).json({ message: "Employee record not found." });

//         const calc = await calculatePayroll(emp, payroll.month, payroll.year, { fullMonth: payroll.basis === "full" });
//         if (calc.skip) return res.status(400).json({ message: calc.skip });

//         payroll.set({ ...calc.values, overtimePay: payroll.overtimePay });
//         await payroll.save();

//         const populated = await loadPayroll(payroll._id);
//         res.json({ ...populated.toObject(), warnings: calc.warnings });
//     } catch (err) {
//         next(err);
//     }
// };

// // @route PUT /api/payroll/:id   (only pay fields can change, never the employee, month or status)
// exports.updatePayroll = async (req, res, next) => {
//     try {
//         const payroll = await Payroll.findById(req.params.id);
//         if (!payroll) return res.status(404).json({ message: "Payroll record not found." });
//         if (payroll.status === "paid") return res.status(400).json({ message: "A paid payslip cannot be edited." });
//         if (selfBlocked(req, payroll.employee)) return res.status(403).json({ message: SELF_MESSAGE });

//         const money = (v) => Math.max(0, Number(v) || 0);
//         ["basicSalary", "bonus", "overtimePay", "daysPresent", "daysOnLeave"].forEach((key) => {
//             if (req.body[key] !== undefined) payroll[key] = money(req.body[key]);
//         });

//         const parts = {
//             allowances: ["hra", "da", "conveyance", "medical", "special", "other"],
//             deductions: ["pf", "esi", "tds", "loan", "lop", "other"],
//         };
//         Object.entries(parts).forEach(([groupName, keys]) => {
//             keys.forEach((sub) => {
//                 if (req.body[groupName]?.[sub] !== undefined) payroll.set(`${groupName}.${sub}`, money(req.body[groupName][sub]));
//             });
//         });
//         if (req.body.notes !== undefined) payroll.notes = String(req.body.notes).slice(0, 500);

//         await payroll.save();
//         res.status(200).json(await loadPayroll(payroll._id));
//     } catch (err) {
//         next(err);
//     }
// };

// /* ------------------------- process, pay and settle ------------------------- */

// /* On payment: loan balances go down, and bonus, deductions and claims are marked as used. It runs only once. */
// async function settlePayroll(payroll) {
//     const claimed = await Payroll.findOneAndUpdate({ _id: payroll._id, settled: { $ne: true } }, { $set: { settled: true } });
//     if (!claimed) return;

//     for (const item of payroll.loanBreakup || []) {
//         const loan = await Loan.findById(item.loan);
//         if (!loan) continue;
//         loan.remainingBalance = Math.max(0, round2((loan.remainingBalance || 0) - item.amount));
//         if (loan.remainingBalance <= 0) loan.status = "COMPLETED";
//         await loan.save();
//     }

//     await Promise.all([
//         Deduction.updateMany({ _id: { $in: payroll.deductionIds || [] }, status: "Pending" }, { status: "Applied" }),
//         Bonus.updateMany({ _id: { $in: payroll.bonusIds || [] }, status: "Approved" }, { status: "Paid" }),
//         Reimbursement.updateMany({ _id: { $in: payroll.reimbursementIds || [] }, status: "APPROVED" }, { status: "PAID" }),
//     ]);
// }

// const processOne = async (id) => {
//     const updated = await Payroll.findOneAndUpdate(
//         { _id: id, status: "draft" },
//         { status: "processed", processedOn: new Date() },
//         { new: true }
//     ).populate("employee", EMP_FIELDS);
//     if (updated) await notifyPayroll(updated, "processed");
//     return updated;
// };

// const payOne = async (id) => {
//     const paid = await Payroll.findOneAndUpdate(
//         { _id: id, status: "processed" },
//         { status: "paid", paidOn: new Date() },
//         { new: true }
//     ).populate("employee", EMP_FIELDS);
//     if (paid) {
//         await settlePayroll(paid);
//         await notifyPayroll(paid, "paid");
//     }
//     return paid;
// };

// // @route PUT /api/payroll/:id/process
// exports.processPayroll = async (req, res, next) => {
//     try {
//         const payroll = await Payroll.findById(req.params.id);
//         if (!payroll) return res.status(404).json({ message: "Payroll record not found." });
//         if (selfBlocked(req, payroll.employee)) return res.status(403).json({ message: SELF_MESSAGE });
//         if (payroll.status !== "draft") {
//             return res.status(400).json({ message: `Only a draft payslip can be processed (this one is ${payroll.status}).` });
//         }

//         const updated = await processOne(payroll._id);
//         if (!updated) return res.status(409).json({ message: "This payslip was just processed by someone else." });
//         res.status(200).json(updated);
//     } catch (err) {
//         next(err);
//     }
// };

// // @route POST /api/payroll/process-bulk   { month, year }
// exports.processBulk = async (req, res, next) => {
//     try {
//         const { m, y, error } = parseMonthYear(req.body.month, req.body.year);
//         if (error) return res.status(400).json({ message: error });

//         const drafts = await Payroll.find({ month: m, year: y, status: "draft" }).select("employee");
//         if (!drafts.length) return res.status(404).json({ message: "There are no draft payslips for this month." });

//         let processed = 0;
//         let skipped = 0;
//         for (const d of drafts) {
//             if (selfBlocked(req, d.employee)) {
//                 skipped += 1;
//                 continue;
//             }
//             if (await processOne(d._id)) processed += 1;
//         }
//         res.json({ success: true, message: `${processed} payslips processed, ${skipped} skipped.`, processed, skipped });
//     } catch (err) {
//         next(err);
//     }
// };

// // @route PUT /api/payroll/:id/mark-paid
// exports.markAsPaid = async (req, res, next) => {
//     try {
//         const payroll = await Payroll.findById(req.params.id);
//         if (!payroll) return res.status(404).json({ message: "Payroll record not found." });
//         if (selfBlocked(req, payroll.employee)) return res.status(403).json({ message: SELF_MESSAGE });
//         if (payroll.status === "paid") return res.status(400).json({ message: "This payslip is already paid." });
//         if (payroll.status !== "processed") return res.status(400).json({ message: "Please process this payslip before marking it as paid." });

//         const paid = await payOne(payroll._id);
//         if (!paid) return res.status(409).json({ message: "This payslip was just paid by someone else." });
//         res.status(200).json(paid);
//     } catch (err) {
//         next(err);
//     }
// };

// // @route POST /api/payroll/disburse/:batchId   (batchId looks like 2026-9 or 2026-9-processed)
// exports.disburseBatch = async (req, res, next) => {
//     try {
//         const [year, month] = req.params.batchId.split("-").map(Number);
//         const { m, y, error } = parseMonthYear(month, year);
//         if (error) return res.status(400).json({ message: "Invalid batch identifier format." });

//         const processed = await Payroll.find({ month: m, year: y, status: "processed" }).select("employee");
//         if (!processed.length) {
//             const drafts = await Payroll.countDocuments({ month: m, year: y, status: "draft" });
//             return res.status(400).json({
//                 message: drafts ? "These payslips are still drafts. Please process them first." : "There are no processed payslips to pay for this month.",
//             });
//         }

//         let modifiedCount = 0;
//         let skipped = 0;
//         for (const p of processed) {
//             if (selfBlocked(req, p.employee)) {
//                 skipped += 1;
//                 continue;
//             }
//             if (await payOne(p._id)) modifiedCount += 1;
//         }

//         res.status(200).json({
//             success: true,
//             message: `${modifiedCount} payslips paid${skipped ? `, ${skipped} skipped (your own payslip needs an admin)` : ""}.`,
//             modifiedCount,
//             skipped,
//         });
//     } catch (err) {
//         next(err);
//     }
// };

// // @route DELETE /api/payroll/:id   (admin only, and never a paid payslip)
// exports.deletePayroll = async (req, res, next) => {
//     try {
//         const payroll = await Payroll.findById(req.params.id);
//         if (!payroll) return res.status(404).json({ message: "Payslip record not found." });
//         if (payroll.status === "paid") return res.status(400).json({ message: "A paid payslip cannot be deleted." });
//         await payroll.deleteOne();
//         res.status(200).json({ success: true, message: "Payslip deleted successfully." });
//     } catch (err) {
//         next(err);
//     }
// };

// /* ------------------------------ salary structures ------------------------------ */

// const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// function cleanStructure(body, current = {}) {
//     const pick = (key, fallback) => (body[key] !== undefined && body[key] !== "" ? Number(body[key]) : current[key] ?? fallback);

//     const name = String(body.name ?? current.name ?? "").trim();
//     const basicPercent = pick("basicPercent");
//     const hraPercent = pick("hraPercent", 0);
//     const daPercent = pick("daPercent", 0);
//     // when special is not sent it takes whatever is left of the 100%
//     const specialPercent = pick("specialPercent", round2(100 - (basicPercent || 0) - hraPercent - daPercent));
//     const pfPercent = pick("pfPercent", 0);
//     const esiPercent = pick("esiPercent", 0);

//     if (name.length < 2 || name.length > 60) return { error: "Structure name must be 2 to 60 characters." };
//     const all = { basicPercent, hraPercent, daPercent, specialPercent, pfPercent, esiPercent };
//     for (const [key, value] of Object.entries(all)) {
//         if (!Number.isFinite(value) || value < 0 || value > 100) return { error: `${key.replace("Percent", "")} must be a number from 0 to 100.` };
//     }
//     const total = round2(basicPercent + hraPercent + daPercent + specialPercent);
//     if (Math.abs(total - 100) > 0.01) return { error: `Basic + HRA + DA + Special must be exactly 100% (now ${total}%).` };

//     return { data: { name, ...all } };
// }

// const structureNameTaken = (name, ignoreId) =>
//     SalaryStructure.exists({ name: new RegExp(`^${escapeRegex(name)}$`, "i"), ...(ignoreId ? { _id: { $ne: ignoreId } } : {}) });

// // @route GET /api/payroll/structures
// exports.getStructures = async (req, res, next) => {
//     try {
//         const [structures, usage] = await Promise.all([
//             SalaryStructure.find().sort({ isDefault: -1, name: 1 }).lean(),
//             EmployeeSalary.aggregate([{ $group: { _id: "$salaryStructure", count: { $sum: 1 } } }]),
//         ]);
//         const used = new Map(usage.map((u) => [String(u._id), u.count]));
//         res.json(structures.map((s) => ({ ...s, usedBy: used.get(String(s._id)) || 0 })));
//     } catch (err) {
//         next(err);
//     }
// };

// // @route POST /api/payroll/structures
// exports.createStructure = async (req, res, next) => {
//     try {
//         const cleaned = cleanStructure(req.body);
//         if (cleaned.error) return res.status(400).json({ message: cleaned.error });
//         if (await structureNameTaken(cleaned.data.name)) {
//             return res.status(409).json({ message: `A structure named "${cleaned.data.name}" already exists.` });
//         }

//         const first = !(await SalaryStructure.exists({}));
//         const isDefault = first || Boolean(req.body.isDefault);
//         const structure = await SalaryStructure.create({ ...cleaned.data, isDefault });
//         if (isDefault) await SalaryStructure.updateMany({ _id: { $ne: structure._id } }, { isDefault: false });

//         res.status(201).json(structure);
//     } catch (err) {
//         next(err);
//     }
// };

// // @route PUT /api/payroll/structures/:id   (changes apply to payslips generated from now on)
// exports.updateStructure = async (req, res, next) => {
//     try {
//         const structure = await SalaryStructure.findById(req.params.id);
//         if (!structure) return res.status(404).json({ message: "Salary structure not found." });

//         const cleaned = cleanStructure(req.body, structure);
//         if (cleaned.error) return res.status(400).json({ message: cleaned.error });
//         if (await structureNameTaken(cleaned.data.name, structure._id)) {
//             return res.status(409).json({ message: `A structure named "${cleaned.data.name}" already exists.` });
//         }

//         Object.assign(structure, cleaned.data);
//         if (req.body.isDefault === true) structure.isDefault = true;
//         await structure.save();
//         if (structure.isDefault) await SalaryStructure.updateMany({ _id: { $ne: structure._id } }, { isDefault: false });

//         res.json(structure);
//     } catch (err) {
//         next(err);
//     }
// };

// // @route DELETE /api/payroll/structures/:id
// exports.deleteStructure = async (req, res, next) => {
//     try {
//         const structure = await SalaryStructure.findById(req.params.id);
//         if (!structure) return res.status(404).json({ message: "Salary structure not found." });

//         const used = await EmployeeSalary.countDocuments({ salaryStructure: structure._id });
//         if (used) {
//             return res.status(409).json({ message: `This structure is assigned to ${used} employee${used === 1 ? "" : "s"}. Assign them another one first.` });
//         }
//         await structure.deleteOne();
//         res.json({ message: "Salary structure deleted successfully." });
//     } catch (err) {
//         next(err);
//     }
// };

// /* ------------------------------ who gets how much ------------------------------ */

// const shapeSalaryRow = (emp, record, defaultStructure) => {
//     const structure = record?.salaryStructure || defaultStructure || null;
//     const gross = Number(emp.salary) || 0;
//     return {
//         _id: record?._id || null, // null = no record yet (the employee uses the default structure)
//         assigned: Boolean(record),
//         employee: emp,
//         salaryStructure: record?.salaryStructure || null,
//         effectiveStructure: structure ? { _id: structure._id, name: structure.name } : null,
//         usingDefault: !record?.salaryStructure,
//         grossMonthly: gross,
//         annualCTC: round2(gross * 12),
//         breakup: splitSalary(gross, structure),
//         status: record?.status || "Active",
//         effectiveDate: record?.effectiveDate || null,
//     };
// };

// // @route GET /api/payroll/employee-salaries   (every active employee, with the salary and breakup he will get)
// exports.getEmployeeSalaries = async (req, res, next) => {
//     try {
//         const [employees, records, defaultStructure] = await Promise.all([
//             Employee.find({ employeeStatus: { $nin: ["Inactive", "Exited", "Exit"] } })
//                 .select("name employeeId department designation email salary")
//                 .sort({ name: 1 })
//                 .lean(),
//             EmployeeSalary.find().populate("salaryStructure").lean(),
//             SalaryStructure.findOne({ isDefault: true }).lean(),
//         ]);
//         const byEmployee = new Map(records.map((r) => [String(r.employee), r]));
//         res.json(employees.map((emp) => shapeSalaryRow(emp, byEmployee.get(String(emp._id)), defaultStructure)));
//     } catch (err) {
//         next(err);
//     }
// };

// /* Saves the structure, status and (when sent) the monthly salary of one employee */
// async function saveSalary(employeeId, body, res) {
//     const emp = await Employee.findById(employeeId).select("name employeeId department designation email salary");
//     if (!emp) {
//         res.status(404).json({ message: "Employee record not found." });
//         return null;
//     }

//     const set = { effectiveDate: new Date() };
//     const unset = {};

//     const structureId = body.salaryStructure ?? body.structure;
//     if (structureId) {
//         if (!validId(structureId) || !(await SalaryStructure.exists({ _id: structureId }))) {
//             res.status(400).json({ message: "The selected salary structure was not found." });
//             return null;
//         }
//         set.salaryStructure = structureId;
//     } else if (structureId === "" || structureId === null) {
//         unset.salaryStructure = "";
//     }

//     if (body.status !== undefined) {
//         if (!["Active", "Inactive", "On Hold"].includes(body.status)) {
//             res.status(400).json({ message: "Status must be Active, Inactive or On Hold." });
//             return null;
//         }
//         set.status = body.status;
//     }

//     // The salary amount lives on the employee profile, so it is saved there
//     let gross = Number(emp.salary) || 0;
//     const sentGross = body.grossMonthly ?? body.monthlySalary;
//     if (sentGross !== undefined && sentGross !== "") {
//         const value = Number(sentGross);
//         if (!Number.isFinite(value) || value <= 0 || value > 10000000) {
//             res.status(400).json({ message: "Monthly salary must be a number greater than 0." });
//             return null;
//         }
//         gross = value;
//         emp.salary = value;
//         await Employee.updateOne({ _id: emp._id }, { $set: { salary: value } });
//     }
//     set.grossMonthly = gross;
//     set.annualCTC = round2(gross * 12);

//     const record = await EmployeeSalary.findOneAndUpdate(
//         { employee: emp._id },
//         { $set: set, ...(Object.keys(unset).length ? { $unset: unset } : {}) },
//         { upsert: true, new: true, setDefaultsOnInsert: true }
//     ).populate("salaryStructure");

//     const defaultStructure = await SalaryStructure.findOne({ isDefault: true }).lean();
//     return shapeSalaryRow(emp.toObject(), record.toObject(), defaultStructure);
// }

// // @route POST /api/payroll/employee-salaries   { employeeId, salaryStructure, grossMonthly?, status? }
// exports.createEmployeeSalary = async (req, res, next) => {
//     try {
//         const employeeId = req.body.employeeId || req.body.employee;
//         if (!validId(employeeId)) return res.status(400).json({ message: "Please select an employee." });
//         const row = await saveSalary(employeeId, req.body, res);
//         if (row) res.status(201).json(row);
//     } catch (err) {
//         next(err);
//     }
// };

// // @route PUT /api/payroll/employee-salaries/:id   (:id is the id of the salary record)
// exports.updateEmployeeSalary = async (req, res, next) => {
//     try {
//         const record = await EmployeeSalary.findById(req.params.id);
//         if (!record) return res.status(404).json({ message: "Employee salary record not found." });
//         const row = await saveSalary(record.employee, req.body, res);
//         if (row) res.json(row);
//     } catch (err) {
//         next(err);
//     }
// };

// // @route DELETE /api/payroll/employee-salaries/:id   (the employee goes back to the default structure)
// exports.deleteEmployeeSalary = async (req, res, next) => {
//     try {
//         const removed = await EmployeeSalary.findByIdAndDelete(req.params.id);
//         if (!removed) return res.status(404).json({ message: "Employee salary record not found." });
//         res.json({ message: "Salary assignment removed. The default structure will be used." });
//     } catch (err) {
//         next(err);
//     }
// };

// /* ------------------------------- reimbursements ------------------------------- */

// const CLAIM_CATEGORIES = ["TRAVEL", "INTERNET", "MEAL", "TRAINING", "MEDICAL", "OTHER"];
// const populateClaim = (query) => query.populate("employee", EMP_FIELDS).populate("reviewedBy", "name");

// const parseClaimDate = (v) => {
//     if (!v) return new Date();
//     const d = new Date(`${String(v).slice(0, 10)}T00:00:00.000+05:30`);
//     return Number.isNaN(d.getTime()) ? null : d;
// };

// // @route GET /api/payroll/reimbursements?status=&employee=
// exports.getReimbursements = async (req, res, next) => {
//     try {
//         const { status, employee } = req.query;
//         const filter = {};
//         if (status && status !== "ALL") filter.status = String(status).toUpperCase();

//         if (isAdminHr(req)) {
//             if (employee && employee !== "ALL") filter.employee = employee;
//         } else {
//             const own = ownEmployeeId(req);
//             if (!own) return res.json([]);
//             filter.employee = own;
//         }

//         res.json(await populateClaim(Reimbursement.find(filter).sort({ createdAt: -1 }).limit(500)));
//     } catch (err) {
//         next(err);
//     }
// };

// // @route POST /api/payroll/reimbursements   (an employee claims for himself, admin / HR can add for anyone)
// exports.createReimbursement = async (req, res, next) => {
//     try {
//         const target = isAdminHr(req) && (req.body.employeeId || req.body.employee) ? req.body.employeeId || req.body.employee : ownEmployeeId(req);
//         if (!target || !validId(target)) {
//             return res.status(400).json({ message: "Your account has no employee profile, so a claim cannot be made." });
//         }
//         if (!(await Employee.exists({ _id: target }))) return res.status(404).json({ message: "Employee record not found." });

//         const category = String(req.body.category || "OTHER").toUpperCase();
//         const amount = Number(req.body.amount);
//         const description = String(req.body.description || "").trim();
//         const date = parseClaimDate(req.body.date || req.body.billDate);

//         if (!CLAIM_CATEGORIES.includes(category)) return res.status(400).json({ message: "Please select a valid category." });
//         if (!Number.isFinite(amount) || amount <= 0 || amount > 1000000) return res.status(400).json({ message: "Enter a valid amount." });
//         if (description.length < 3) return res.status(400).json({ message: "Please describe the expense." });
//         if (!date || date.getTime() > Date.now() + 24 * 3600 * 1000) return res.status(400).json({ message: "The bill date is not valid." });

//         const claim = await Reimbursement.create({
//             employee: target,
//             category,
//             amount,
//             date,
//             description,
//             receiptUrl: String(req.body.receiptUrl || "").trim().slice(0, 500),
//             status: "PENDING",
//         });

//         const employeeUser = await userIdOfEmployee(target);
//         if (employeeUser) {
//             await notifyApprovers(employeeUser, {
//                 type: "payroll",
//                 title: "New reimbursement claim",
//                 message: `A reimbursement claim of ₹${amount} (${category.toLowerCase()}) is waiting for review.`,
//             });
//         }

//         res.status(201).json(await populateClaim(Reimbursement.findById(claim._id)));
//     } catch (err) {
//         next(err);
//     }
// };

// // @route PUT /api/payroll/reimbursements/:id   (admin / HR, only while pending)
// // exports.updateReimbursement = async (req, res, next) => {
// //     try {
// //         const claim = await Reimbursement.findById(req.params.id);
// //         if (!claim) return res.status(404).json({ message: "Reimbursement record not found." });
// //         if (claim.status !== "PENDING") return res.status(400).json({ message: "Only a pending claim can be edited." });

// //         if (req.body.category !== undefined) {
// //             const category = String(req.body.category).toUpperCase();
// //             if (!CLAIM_CATEGORIES.includes(category)) return res.status(400).json({ message: "Please select a valid category." });
// //             claim.category = category;
// //         }
// //         if (req.body.amount !== undefined) {
// //             const amount = Number(req.body.amount);
// //             if (!Number.isFinite(amount) || amount <= 0 || amount > 1000000) return res.status(400).json({ message: "Enter a valid amount." });
// //             claim.amount = amount;
// //         }
// //         if (req.body.description !== undefined) {
// //             const description = String(req.body.description).trim();
// //             if (description.length < 3) return res.status(400).json({ message: "Please describe the expense." });
// //             claim.description = description.slice(0, 500);
// //         }
// //         if (req.body.date !== undefined || req.body.billDate !== undefined) {
// //             const date = parseClaimDate(req.body.date || req.body.billDate);

// //             if (!date) return res.status(400).json({ message: "The bill date is not valid." });
// //             claim.date = date;
// //         }
// //         if (req.body.receiptUrl !== undefined) claim.receiptUrl = String(req.body.receiptUrl).trim().slice(0, 500);

// //         await claim.save();
// //         res.json(await populateClaim(Reimbursement.findById(claim._id)));
// //     } catch (err) {
// //         next(err);
// //     }
// // };

// // @route PUT /api/payroll/reimbursements/:id   (admin / HR, or the owner, only while pending)
// exports.updateReimbursement = async (req, res, next) => {
//     try {
//         const claim = await Reimbursement.findById(req.params.id);
//         if (!claim) return res.status(404).json({ message: "Reimbursement record not found." });

//         const owner = idOf(claim.employee) === ownEmployeeId(req);
//         if (!isAdminHr(req) && !owner) return res.status(403).json({ message: "You can edit only your own claims." });
//         if (claim.status !== "PENDING") return res.status(400).json({ message: "Only a pending claim can be edited." });

//         if (req.body.category !== undefined) {
//             const category = String(req.body.category).toUpperCase();
//             if (!CLAIM_CATEGORIES.includes(category)) return res.status(400).json({ message: "Please select a valid category." });
//             claim.category = category;
//         }
//         if (req.body.amount !== undefined) {
//             const amount = Number(req.body.amount);
//             if (!Number.isFinite(amount) || amount <= 0 || amount > 1000000) return res.status(400).json({ message: "Enter a valid amount." });
//             claim.amount = amount;
//         }
//         if (req.body.description !== undefined) {
//             const description = String(req.body.description).trim();
//             if (description.length < 3) return res.status(400).json({ message: "Please describe the expense." });
//             claim.description = description.slice(0, 500);
//         }
//         if (req.body.date !== undefined || req.body.billDate !== undefined) {
//             const date = parseClaimDate(req.body.date || req.body.billDate);
//             if (!date) return res.status(400).json({ message: "The bill date is not valid." });
//             claim.date = date;
//         }
//         if (req.body.receiptUrl !== undefined) {
//             const receipt = cleanReceipt(req.body.receiptUrl);
//             if (receipt.error) return res.status(400).json({ message: receipt.error });
//             claim.receiptUrl = receipt.value;
//         }

//         await claim.save();
//         res.json(await populateClaim(Reimbursement.findById(claim._id)));
//     } catch (err) {
//         next(err);
//     }
// };







// // @route PUT /api/payroll/reimbursements/:id/status   { status: "APPROVED" | "REJECTED", note }
// exports.updateReimbursementStatus = async (req, res, next) => {
//     try {
//         const status = String(req.body.status || "").toUpperCase();
//         if (!["APPROVED", "REJECTED"].includes(status)) return res.status(400).json({ message: "Status must be APPROVED or REJECTED." });

//         const claim = await Reimbursement.findById(req.params.id);
//         if (!claim) return res.status(404).json({ message: "Reimbursement record not found." });
//         if (claim.status === "PAID") return res.status(400).json({ message: "This claim is already paid." });
//         if (selfBlocked(req, claim.employee)) return res.status(403).json({ message: "You cannot review your own claim. Please ask an admin." });

//         claim.status = status;
//         claim.reviewedBy = req.user._id;
//         claim.reviewedAt = new Date();
//         claim.reviewNote = String(req.body.note || "").trim().slice(0, 300);
//         await claim.save();

//         const employeeUser = await userIdOfEmployee(claim.employee);
//         await notify(employeeUser, {
//             type: "payroll",
//             title: status === "APPROVED" ? "Reimbursement approved" : "Reimbursement rejected",
//             message:
//                 status === "APPROVED"
//                     ? `Your claim of ₹${claim.amount} was approved and will be paid with your salary.`
//                     : `Your claim of ₹${claim.amount} was rejected.${claim.reviewNote ? ` Reason: ${claim.reviewNote}` : ""}`,
//             exclude: req.user._id,
//         });

//         res.json(await populateClaim(Reimbursement.findById(claim._id)));
//     } catch (err) {
//         next(err);
//     }
// };

// // @route DELETE /api/payroll/reimbursements/:id
// exports.deleteReimbursement = async (req, res, next) => {
//     try {
//         const claim = await Reimbursement.findById(req.params.id);
//         if (!claim) return res.status(404).json({ message: "Reimbursement record not found." });
//         if (claim.status === "PAID") return res.status(400).json({ message: "A paid claim cannot be deleted." });

//         const owner = idOf(claim.employee) === ownEmployeeId(req);
//         if (!isAdminHr(req) && !(owner && claim.status === "PENDING")) {
//             return res.status(403).json({ message: "You can delete only your own pending claims." });
//         }
//         await claim.deleteOne();
//         res.json({ message: "Reimbursement deleted successfully." });
//     } catch (err) {
//         next(err);
//     }
// };