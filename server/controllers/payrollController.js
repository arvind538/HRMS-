const mongoose = require("mongoose");
const Payroll = require("../models/Payroll");
const Employee = require("../models/Employee");
const Bonus = require("../models/Bonus");
const Deduction = require("../models/Deduction");
const Loan = require("../models/Loan");
const TaxProfile = require("../models/TaxProfile");
const EmployeeSalary = require("../models/EmployeeSalary");
const { notify, userIdOfEmployee } = require("../utils/notify");

const EMP_FIELDS = "name employeeId department designation email";
const MAX_AMOUNT = 10000000;
const INACTIVE = ["Inactive", "Exited", "Exit"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/* ------------------------------- helpers ------------------------------- */

const validId = (v) => mongoose.isValidObjectId(v);
const round2 = (v) => Math.round((Number(v) || 0) * 100) / 100;
const isHex = (s) => /^[0-9a-fA-F]{24}$/.test(String(s || "").trim());
const bad = (res, message, status = 400) => res.status(status).json({ message });
const populateEmp = (query) => query.populate("employee", EMP_FIELDS);
const periodText = (m, y) => `${MONTH_NAMES[m - 1]} ${y}`;

const currentPeriod = () => {
    const [year, month] = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }).split("-").map(Number);
    return { year, month };
};

/* month and year from a request. A missing value means the current month. */
const readPeriod = (body) => {
    const now = currentPeriod();
    const month = body.month !== undefined && body.month !== "" ? Number(body.month) : now.month;
    const year = body.year !== undefined && body.year !== "" ? Number(body.year) : now.year;
    if (!Number.isInteger(month) || month < 1 || month > 12) return { error: "Please select a valid month." };
    if (!Number.isInteger(year) || year < 2000 || year > 2100) return { error: "Please select a valid year." };
    return { month, year };
};

/* a positive amount, or null */
const readAmount = (v) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 && n <= MAX_AMOUNT ? round2(n) : null;
};

/* HR cannot add or change her own bonus, deduction or loan. An admin does that. */
const ownEmployeeId = (req) => (req.user?.employee ? String(req.user.employee._id || req.user.employee) : "");
const selfBlocked = (req, employeeId) =>
    String(req.user?.role || "").toLowerCase() === "hr" && Boolean(ownEmployeeId(req)) && String(employeeId?._id || employeeId) === ownEmployeeId(req);
const SELF_MESSAGE = "HR cannot add or change their own bonus, deduction or loan. Please ask an admin.";

/* Department names (an employee may store the id or the name) */
let DepartmentModel = null;
const departmentLabels = async () => {
    try {
        DepartmentModel = DepartmentModel || mongoose.model("Department");
        const list = await DepartmentModel.find().select("name title").lean();
        return new Map(list.map((d) => [String(d._id), d.name || d.title || ""]));
    } catch {
        return new Map();
    }
};
const deptLabel = (value, labels) => {
    if (!value) return "";
    if (typeof value === "object") return value.name || value.title || "";
    const s = String(value).trim();
    return labels.get(s) || (isHex(s) ? "" : s);
};

/* Tells the employee. It never stops the work if the notification fails. */
const tellEmployee = async (req, employeeId, payload) => {
    try {
        const userId = await userIdOfEmployee(employeeId);
        if (userId) await notify(userId, { ...payload, exclude: req.user._id });
    } catch {
        /* a failed notification is ignored */
    }
};

/* Which payslip (if any) has taken each record. Used to show "In payslip" and to lock the record. */
const attachPayslip = async (docs, field) => {
    if (!docs.length) return [];
    const slips = await Payroll.find({ [field]: { $in: docs.map((d) => d._id) } })
        .select(`${field} status month year`)
        .lean();
    const map = new Map();
    slips.forEach((s) => (s[field] || []).forEach((id) => map.set(String(id), { id: s._id, status: s.status, month: s.month, year: s.year })));
    return docs.map((d) => ({ ...d, payslip: map.get(String(d._id)) || null }));
};

const lockedBy = (field, id, statuses) => Payroll.findOne({ [field]: id, status: { $in: statuses } }).select("status month year").lean();
const lockMessage = (slip, what) =>
    `This ${what} is already in the ${slip.status} payslip of ${periodText(slip.month, slip.year)}.${slip.status === "processed" ? " Reopen that payslip first." : ""}`;

/* A processed or paid payslip of that month can no longer take a new bonus or deduction. A draft only needs a recalculation. */
const periodCheck = async (employeeId, month, year) => {
    const slip = await Payroll.findOne({ employee: employeeId, month, year }).select("status").lean();
    if (!slip) return {};
    if (slip.status === "draft") {
        return { warning: `A draft payslip already exists for ${periodText(month, year)}. Open Payroll and choose Recalculate so this is included.` };
    }
    return { block: `The ${periodText(month, year)} payslip of this employee is already ${slip.status}, so this would not be added to it. Choose another month, or ask an admin to reopen that payslip.` };
};

/* ============================ employee dropdown ============================ */

// @route GET /api/payroll/employee-options   (a light list of active employees for the forms)
exports.getEmployeeOptions = async (req, res, next) => {
    try {
        const [employees, labels] = await Promise.all([
            Employee.find({ employeeStatus: { $nin: INACTIVE }, isExited: { $ne: true } })
                .select("name employeeId department")
                .sort({ name: 1 })
                .lean(),
            departmentLabels(),
        ]);
        res.json(employees.map((e) => ({ _id: e._id, name: e.name, employeeId: e.employeeId || "", department: deptLabel(e.department, labels) })));
    } catch (err) {
        next(err);
    }
};

/* ================================ reports ================================ */

// @route GET /api/payroll/reports?month=&year=&status=&department=
exports.getPayrollReports = async (req, res, next) => {
    try {
        const period = readPeriod(req.query);
        if (period.error) return bad(res, period.error);

        const filter = { month: period.month, year: period.year };
        const status = String(req.query.status || "").toLowerCase();
        if (["draft", "processed", "paid"].includes(status)) filter.status = status;

        const [payrolls, labels] = await Promise.all([
            Payroll.find(filter).populate("employee", "name employeeId department designation").sort({ createdAt: -1 }).lean(),
            departmentLabels(),
        ]);

        let rows = payrolls.map((p) => {
            const emp = p.employee || {};
            const a = p.allowances || {};
            const d = p.deductions || {};
            const allowances = ["hra", "da", "conveyance", "medical", "special", "other"].reduce((sum, k) => sum + (Number(a[k]) || 0), 0);
            return {
                _id: p._id,
                userId: emp.employeeId || "—",
                userName: emp.name || "Unknown Staff",
                department: deptLabel(emp.department, labels) || "—",
                month: p.month,
                year: p.year,
                workingDays: p.workingDays || 0,
                daysPresent: p.daysPresent || 0,
                daysOnLeave: p.daysOnLeave || 0,
                unpaidDays: p.unpaidDays || 0,
                monthlyGross: p.monthlyGross || 0,
                basic: p.basicSalary || 0,
                allowances: round2(allowances),
                bonus: p.bonus || 0,
                overtime: p.overtimePay || 0,
                reimbursement: p.reimbursement || 0,
                gross: p.grossSalary || 0,
                pf: d.pf || 0,
                esi: d.esi || 0,
                tds: d.tds || 0,
                loan: d.loan || 0,
                lop: d.lop || 0,
                other: d.other || 0,
                deductions: p.totalDeductions || 0,
                netPay: p.netSalary || 0,
                status: p.status,
            };
        });

        const wanted = String(req.query.department || "").trim().toLowerCase();
        if (wanted && wanted !== "all") rows = rows.filter((r) => r.department.toLowerCase() === wanted);

        return res.status(200).json(rows);
    } catch (err) {
        next(err);
    }
};

/* ============================== tax and TDS ============================== */

// Slabs for the old and the new regime. These are estimates. Please confirm the current rates with your CA.
const computeTax = (annualGross, regime, c80 = 0, d80 = 0, hra = 0, other = 0) => {
    let totalExemptions = regime === "NEW" ? 75000 : 50000;

    if (regime === "OLD") {
        totalExemptions += Math.min(Number(c80) || 0, 150000);
        totalExemptions += Math.min(Number(d80) || 0, 75000);
        totalExemptions += Number(hra) || 0;
        totalExemptions += Number(other) || 0;
    }

    const taxableIncome = Math.max(annualGross - totalExemptions, 0);
    let tax = 0;

    if (regime === "NEW") {
        if (taxableIncome > 2400000) tax += (taxableIncome - 2400000) * 0.3;
        if (taxableIncome > 2000000) tax += Math.min(taxableIncome - 2000000, 400000) * 0.25;
        if (taxableIncome > 1600000) tax += Math.min(taxableIncome - 1600000, 400000) * 0.2;
        if (taxableIncome > 1200000) tax += Math.min(taxableIncome - 1200000, 400000) * 0.15;
        if (taxableIncome > 800000) tax += Math.min(taxableIncome - 800000, 400000) * 0.1;
        if (taxableIncome > 400000) tax += Math.min(taxableIncome - 400000, 400000) * 0.05;
        if (taxableIncome <= 1200000) tax = 0;
    } else {
        if (taxableIncome > 1000000) tax += (taxableIncome - 1000000) * 0.3;
        if (taxableIncome > 500000) tax += Math.min(taxableIncome - 500000, 500000) * 0.2;
        if (taxableIncome > 250000) tax += Math.min(taxableIncome - 250000, 250000) * 0.05;
        if (taxableIncome <= 500000) tax = 0;
    }

    const annualTax = Math.round(tax + Math.round(tax * 0.04));
    return { taxableIncome, totalExemptions, annualTax, monthlyTDS: Math.round(annualTax / 12) };
};

const taxRow = (emp, profile = {}) => {
    const regime = profile.regime || "NEW";
    const annualGross = round2((Number(emp.salary) || 0) * 12);
    const c = computeTax(annualGross, regime, profile.section80C, profile.section80D, profile.hraExemption, profile.otherExemptions);
    return {
        _id: profile._id || emp._id,
        employee: emp,
        panNumber: profile.panNumber || emp.panNumber || emp.pan || "PENDING",
        regime,
        annualGross,
        exemptionsDeclared: c.totalExemptions,
        section80C: profile.section80C || 0,
        section80D: profile.section80D || 0,
        hraExemption: profile.hraExemption || 0,
        otherExemptions: profile.otherExemptions || 0,
        taxableIncome: c.taxableIncome,
        annualTax: c.annualTax,
        monthlyTDS: c.monthlyTDS,
    };
};

const taxEmployees = (extra = {}) =>
    Employee.find({ employeeStatus: { $nin: INACTIVE }, isExited: { $ne: true }, salary: { $gt: 0 }, ...extra })
        .select(`${EMP_FIELDS} salary panNumber pan`)
        .sort({ name: 1 })
        .lean();

// @route GET /api/payroll/tax-tds   (every active employee who has a salary)
exports.getTaxTdsList = async (req, res, next) => {
    try {
        const [employees, salaryRecords, taxProfiles] = await Promise.all([taxEmployees(), EmployeeSalary.find().select("employee status").lean(), TaxProfile.find().lean()]);

        const off = new Set(salaryRecords.filter((s) => s.status !== "Active").map((s) => String(s.employee)));
        const profiles = new Map(taxProfiles.map((p) => [String(p.employee), p]));

        return res.status(200).json(employees.filter((e) => !off.has(String(e._id))).map((e) => taxRow(e, profiles.get(String(e._id)))));
    } catch (err) {
        next(err);
    }
};

// @route POST /api/payroll/tax-tds
exports.upsertTaxProfile = async (req, res, next) => {
    try {
        const { employeeId, regime, panNumber, section80C, section80D, hraExemption, otherExemptions } = req.body;

        if (!validId(employeeId)) return bad(res, "Please select an employee.");
        if (!(await Employee.exists({ _id: employeeId }))) return bad(res, "Employee record not found.", 404);

        const chosen = String(regime || "NEW").toUpperCase();
        if (!["NEW", "OLD"].includes(chosen)) return bad(res, "Tax regime must be NEW or OLD.");

        const pan = String(panNumber || "").trim().toUpperCase();
        if (pan && !/^[A-Z]{5}\d{4}[A-Z]$/.test(pan)) return bad(res, "PAN must look like ABCDE1234F.");

        const money = (v) => Math.max(0, Number(v) || 0);

        await TaxProfile.findOneAndUpdate(
            { employee: employeeId },
            {
                employee: employeeId,
                regime: chosen,
                panNumber: pan,
                section80C: money(section80C),
                section80D: money(section80D),
                hraExemption: money(hraExemption),
                otherExemptions: money(otherExemptions),
            },
            { upsert: true, new: true, runValidators: true }
        );

        const emp = await taxEmployees({ _id: employeeId });
        const profile = await TaxProfile.findOne({ employee: employeeId }).lean();
        return res.status(200).json(emp[0] ? taxRow(emp[0], profile) : { ok: true });
    } catch (err) {
        next(err);
    }
};

// @route POST /api/payroll/tax-tds/apply   { month, year, employeeId? }
// Adds the monthly TDS as a deduction, so it is cut in the payslip of that month.
exports.applyTds = async (req, res, next) => {
    try {
        const period = readPeriod(req.body);
        if (period.error) return bad(res, period.error);
        const { month, year } = period;

        const only = req.body.employeeId;
        if (only && !validId(only)) return bad(res, "Please select a valid employee.");

        const [employees, profiles, salaryRecords] = await Promise.all([
            taxEmployees(only ? { _id: only } : {}),
            TaxProfile.find().lean(),
            EmployeeSalary.find().select("employee status").lean(),
        ]);
        const profileMap = new Map(profiles.map((p) => [String(p.employee), p]));
        const off = new Set(salaryRecords.filter((s) => s.status !== "Active").map((s) => String(s.employee)));

        let created = 0;
        let inDraft = 0;
        const skipped = [];

        for (const emp of employees) {
            const who = { name: emp.name, employeeId: emp.employeeId };
            if (off.has(String(emp._id))) {
                skipped.push({ ...who, reason: "Salary is switched off" });
                continue;
            }
            if (selfBlocked(req, emp._id)) {
                skipped.push({ ...who, reason: "HR cannot change their own deductions (an admin must)" });
                continue;
            }
            const row = taxRow(emp, profileMap.get(String(emp._id)));
            if (row.monthlyTDS <= 0) {
                skipped.push({ ...who, reason: "No tax is due" });
                continue;
            }
            if (await Deduction.exists({ employee: emp._id, month, year, type: "TDS" })) {
                skipped.push({ ...who, reason: "TDS is already added for this month" });
                continue;
            }
            const slip = await Payroll.findOne({ employee: emp._id, month, year }).select("status").lean();
            if (slip && slip.status !== "draft") {
                skipped.push({ ...who, reason: `The payslip is already ${slip.status}` });
                continue;
            }

            await Deduction.create({
                employee: emp._id,
                title: `TDS ${periodText(month, year)}`,
                amount: row.monthlyTDS,
                month,
                year,
                type: "TDS",
                status: "Pending",
                remarks: "Added from the Tax / TDS page",
            });
            created += 1;
            if (slip) inDraft += 1;
        }

        return res.status(200).json({
            message: `TDS added for ${created} employee${created === 1 ? "" : "s"}, ${skipped.length} skipped.`,
            created,
            inDraft,
            skipped,
        });
    } catch (err) {
        next(err);
    }
};

/* ================================= loans ================================= */

const LOAN_TYPES = ["SALARY_ADVANCE", "COMPANY_LOAN", "EMERGENCY_AID"];
const LOAN_LABEL = { SALARY_ADVANCE: "salary advance", COMPANY_LOAN: "company loan", EMERGENCY_AID: "emergency aid" };
const LOAN_FLOW = { PENDING: ["ACTIVE", "REJECTED"], ACTIVE: ["COMPLETED"], REJECTED: ["PENDING"], COMPLETED: [] };

// @route GET /api/payroll/loans?status=&employee=
exports.getLoans = async (req, res, next) => {
    try {
        const { status, employee } = req.query;
        const filter = {};
        if (status && status !== "ALL") filter.status = String(status).toUpperCase();
        if (employee && employee !== "ALL") filter.employee = employee;

        return res.status(200).json(await populateEmp(Loan.find(filter).sort({ createdAt: -1 }).limit(1000)));
    } catch (err) {
        next(err);
    }
};

// @route POST /api/payroll/loans
exports.createLoan = async (req, res, next) => {
    try {
        const { employeeId, type, emiMonths, reason } = req.body;
        const principal = readAmount(req.body.amount);
        const months = Number(emiMonths);
        const loanType = String(type || "SALARY_ADVANCE").toUpperCase();
        const status = ["PENDING", "ACTIVE"].includes(String(req.body.status || "").toUpperCase()) ? String(req.body.status).toUpperCase() : "ACTIVE";
        const first = readPeriod({ month: req.body.firstEmiMonth, year: req.body.firstEmiYear });

        if (!validId(employeeId)) return bad(res, "Please select an employee.");
        if (!(await Employee.exists({ _id: employeeId }))) return bad(res, "Employee record not found.", 404);
        if (selfBlocked(req, employeeId)) return bad(res, SELF_MESSAGE, 403);
        if (!principal) return bad(res, "Enter a valid loan amount.");
        if (!Number.isInteger(months) || months < 1 || months > 36) return bad(res, "The number of EMI months must be a whole number from 1 to 36.");
        if (!LOAN_TYPES.includes(loanType)) return bad(res, "Please select a valid loan type.");
        if (String(reason || "").trim().length < 3) return bad(res, "Please enter the reason.");
        if (first.error) return bad(res, first.error);

        const loan = await Loan.create({
            employee: employeeId,
            type: loanType,
            principal,
            emiMonths: months,
            monthlyEmi: Math.ceil(principal / months), // the last EMI is cut down to the balance
            remainingBalance: principal,
            reason: String(reason).trim().slice(0, 300),
            status,
            disbursedDate: new Date(),
            firstEmiMonth: first.month,
            firstEmiYear: first.year,
        });

        if (status === "ACTIVE") {
            await tellEmployee(req, employeeId, {
                type: "payroll",
                title: "Loan / advance approved",
                message: `Your ${LOAN_LABEL[loanType]} of ₹${principal} is approved. EMI ₹${loan.monthlyEmi} for ${months} month(s), from ${periodText(first.month, first.year)}.`,
                link: "/self-service/payslips",
            });
        }

        return res.status(201).json(await populateEmp(Loan.findById(loan._id)));
    } catch (err) {
        next(err);
    }
};

// @route PUT /api/payroll/loans/:id
exports.updateLoan = async (req, res, next) => {
    try {
        const loan = await Loan.findById(req.params.id);
        if (!loan) return bad(res, "Loan record not found.", 404);
        if (selfBlocked(req, loan.employee)) return bad(res, SELF_MESSAGE, 403);

        const recovered = round2(loan.principal - loan.remainingBalance);

        if (req.body.reason !== undefined) {
            const reason = String(req.body.reason).trim();
            if (reason.length < 3) return bad(res, "Please enter the reason.");
            loan.reason = reason.slice(0, 300);
        }
        if (req.body.type !== undefined) {
            const loanType = String(req.body.type).toUpperCase();
            if (!LOAN_TYPES.includes(loanType)) return bad(res, "Please select a valid loan type.");
            loan.type = loanType;
        }

        const changesMoney = ["amount", "emiMonths", "firstEmiMonth", "firstEmiYear"].some((k) => req.body[k] !== undefined);
        if (changesMoney) {
            if (recovered > 0) return bad(res, "EMI has already been recovered from the salary, so the amount, tenure and start month cannot be changed now.", 409);
            const slip = await lockedBy("loanBreakup.loan", loan._id, ["processed", "paid"]);
            if (slip) return bad(res, lockMessage(slip, "loan"), 409);

            const principal = req.body.amount !== undefined ? readAmount(req.body.amount) : loan.principal;
            const months = req.body.emiMonths !== undefined ? Number(req.body.emiMonths) : loan.emiMonths;
            const first = readPeriod({ month: req.body.firstEmiMonth ?? loan.firstEmiMonth, year: req.body.firstEmiYear ?? loan.firstEmiYear });
            if (!principal) return bad(res, "Enter a valid loan amount.");
            if (!Number.isInteger(months) || months < 1 || months > 36) return bad(res, "The number of EMI months must be a whole number from 1 to 36.");
            if (first.error) return bad(res, first.error);

            loan.principal = principal;
            loan.emiMonths = months;
            loan.monthlyEmi = Math.ceil(principal / months);
            loan.remainingBalance = principal;
            loan.firstEmiMonth = first.month;
            loan.firstEmiYear = first.year;
        }

        await loan.save();
        return res.status(200).json(await populateEmp(Loan.findById(loan._id)));
    } catch (err) {
        next(err);
    }
};

// @route PUT /api/payroll/loans/:id/status   { status }
exports.updateLoanStatus = async (req, res, next) => {
    try {
        const status = String(req.body.status || "").toUpperCase();
        const loan = await Loan.findById(req.params.id);
        if (!loan) return bad(res, "Loan record not found.", 404);
        if (selfBlocked(req, loan.employee)) return bad(res, SELF_MESSAGE, 403);

        if (!(LOAN_FLOW[loan.status] || []).includes(status)) {
            return bad(res, `A ${loan.status.toLowerCase()} loan cannot be changed to ${status.toLowerCase() || "this status"}.`, 409);
        }

        if (status === "COMPLETED") loan.remainingBalance = 0; // settled early: nothing more is cut
        loan.status = status;
        await loan.save();

        if (status === "ACTIVE" || status === "REJECTED") {
            await tellEmployee(req, loan.employee, {
                type: "payroll",
                title: status === "ACTIVE" ? "Loan / advance approved" : "Loan / advance rejected",
                message:
                    status === "ACTIVE"
                        ? `Your ${LOAN_LABEL[loan.type]} of ₹${loan.principal} is approved. EMI ₹${loan.monthlyEmi}.`
                        : `Your ${LOAN_LABEL[loan.type]} request of ₹${loan.principal} was rejected.`,
                link: "/self-service/payslips",
            });
        }

        return res.status(200).json(await populateEmp(Loan.findById(loan._id)));
    } catch (err) {
        next(err);
    }
};

// @route DELETE /api/payroll/loans/:id
exports.deleteLoan = async (req, res, next) => {
    try {
        const loan = await Loan.findById(req.params.id);
        if (!loan) return bad(res, "Loan record not found.", 404);
        if (selfBlocked(req, loan.employee)) return bad(res, SELF_MESSAGE, 403);
        if (loan.remainingBalance < loan.principal) {
            return bad(res, "EMI has already been recovered for this loan. Mark it completed instead of deleting it.", 409);
        }
        const slip = await lockedBy("loanBreakup.loan", loan._id, ["processed", "paid"]);
        if (slip) return bad(res, lockMessage(slip, "loan"), 409);

        await loan.deleteOne();
        return res.status(200).json({ message: "Loan record deleted successfully." });
    } catch (err) {
        next(err);
    }
};

/* =============================== deductions =============================== */

const DEDUCTION_TYPES = ["LOAN_RECOVERY", "TDS", "DAMAGE_PENALTY", "ADVANCE_SALARY", "OTHER"];

// @route GET /api/payroll/deductions?month=&year=&employee=
exports.getDeductions = async (req, res, next) => {
    try {
        const { month, year, employee } = req.query;
        const filter = {};
        if (month && month !== "ALL") filter.month = Number(month);
        if (year && year !== "ALL") filter.year = Number(year);
        if (employee && employee !== "ALL") filter.employee = employee;

        const list = await populateEmp(Deduction.find(filter).sort({ year: -1, month: -1, createdAt: -1 }).limit(1000).lean());
        return res.status(200).json(await attachPayslip(list, "deductionIds"));
    } catch (err) {
        next(err);
    }
};

// @route POST /api/payroll/deductions   (it is taken in the payslip of the month it is made for)
exports.createDeduction = async (req, res, next) => {
    try {
        const { employeeId, title, type, remarks } = req.body;
        const amount = readAmount(req.body.amount);
        const period = readPeriod(req.body);
        const deductionType = String(type || "OTHER").toUpperCase();

        if (!validId(employeeId)) return bad(res, "Please select an employee.");
        if (!(await Employee.exists({ _id: employeeId }))) return bad(res, "Employee record not found.", 404);
        if (selfBlocked(req, employeeId)) return bad(res, SELF_MESSAGE, 403);
        if (String(title || "").trim().length < 2) return bad(res, "Please enter a title.");
        if (!amount) return bad(res, "Enter a valid amount.");
        if (period.error) return bad(res, period.error);
        if (!DEDUCTION_TYPES.includes(deductionType)) return bad(res, "Please select a valid deduction type.");

        const check = await periodCheck(employeeId, period.month, period.year);
        if (check.block) return bad(res, check.block, 409);

        const deduction = await Deduction.create({
            employee: employeeId,
            title: String(title).trim().slice(0, 100),
            amount,
            month: period.month,
            year: period.year,
            type: deductionType,
            remarks: String(remarks || "").trim().slice(0, 300),
            status: "Pending",
        });

        await tellEmployee(req, employeeId, {
            type: "payroll",
            title: "Deduction added",
            message: `₹${amount} (${deduction.title}) will be deducted in the payslip of ${periodText(period.month, period.year)}.`,
            link: "/self-service/payslips",
        });

        const out = await populateEmp(Deduction.findById(deduction._id).lean());
        return res.status(201).json({ ...out, payslip: null, warning: check.warning || "" });
    } catch (err) {
        next(err);
    }
};

// @route PUT /api/payroll/deductions/:id
exports.updateDeduction = async (req, res, next) => {
    try {
        const deduction = await Deduction.findById(req.params.id);
        if (!deduction) return bad(res, "Deduction record not found.", 404);
        if (selfBlocked(req, deduction.employee)) return bad(res, SELF_MESSAGE, 403);
        if (deduction.status === "Applied") return bad(res, "This deduction is already taken in a paid payslip and cannot be changed.", 409);
        const slip = await lockedBy("deductionIds", deduction._id, ["processed", "paid"]);
        if (slip) return bad(res, lockMessage(slip, "deduction"), 409);

        let warning = "";

        if (req.body.title !== undefined) {
            const title = String(req.body.title).trim();
            if (title.length < 2) return bad(res, "Please enter a title.");
            deduction.title = title.slice(0, 100);
        }
        if (req.body.amount !== undefined) {
            const amount = readAmount(req.body.amount);
            if (!amount) return bad(res, "Enter a valid amount.");
            deduction.amount = amount;
        }
        if (req.body.month !== undefined || req.body.year !== undefined) {
            const period = readPeriod({ month: req.body.month ?? deduction.month, year: req.body.year ?? deduction.year });
            if (period.error) return bad(res, period.error);
            if (period.month !== deduction.month || period.year !== deduction.year) {
                const check = await periodCheck(deduction.employee, period.month, period.year);
                if (check.block) return bad(res, check.block, 409);
                warning = check.warning || "";
            }
            deduction.month = period.month;
            deduction.year = period.year;
        }
        if (req.body.type !== undefined) {
            const deductionType = String(req.body.type).toUpperCase();
            if (!DEDUCTION_TYPES.includes(deductionType)) return bad(res, "Please select a valid deduction type.");
            deduction.type = deductionType;
        }
        if (req.body.remarks !== undefined) deduction.remarks = String(req.body.remarks).trim().slice(0, 300);
        if (req.body.status !== undefined) {
            if (!["Pending", "Waived"].includes(req.body.status)) return bad(res, "Status can be changed only to Pending or Waived.");
            deduction.status = req.body.status;
        }

        await deduction.save();
        const [out] = await attachPayslip([await populateEmp(Deduction.findById(deduction._id).lean())], "deductionIds");
        return res.status(200).json({ ...out, warning });
    } catch (err) {
        next(err);
    }
};

// @route DELETE /api/payroll/deductions/:id
exports.deleteDeduction = async (req, res, next) => {
    try {
        const deduction = await Deduction.findById(req.params.id);
        if (!deduction) return bad(res, "Deduction record not found.", 404);
        if (selfBlocked(req, deduction.employee)) return bad(res, SELF_MESSAGE, 403);
        if (deduction.status === "Applied") return bad(res, "This deduction is already taken in a paid payslip and cannot be deleted.", 409);
        const slip = await lockedBy("deductionIds", deduction._id, ["processed", "paid"]);
        if (slip) return bad(res, lockMessage(slip, "deduction"), 409);

        await deduction.deleteOne();
        return res.status(200).json({ message: "Deduction record successfully removed." });
    } catch (err) {
        next(err);
    }
};

/* ================================= bonuses ================================= */

const BONUS_TYPES = ["Performance", "Festival", "Retention", "Discretionary"];

// @route GET /api/payroll/bonuses?month=&year=&employee=
exports.getBonuses = async (req, res, next) => {
    try {
        const { month, year, employee } = req.query;
        const filter = {};
        if (month && month !== "ALL") filter.month = Number(month);
        if (year && year !== "ALL") filter.year = Number(year);
        if (employee && employee !== "ALL") filter.employee = employee;

        const list = await populateEmp(Bonus.find(filter).sort({ year: -1, month: -1, createdAt: -1 }).limit(1000).lean());
        return res.status(200).json(await attachPayslip(list, "bonusIds"));
    } catch (err) {
        next(err);
    }
};

// @route POST /api/payroll/bonuses   (it is added to the payslip of the month it is made for)
exports.createBonus = async (req, res, next) => {
    try {
        const { employeeId, title, type, remarks } = req.body;
        const amount = readAmount(req.body.amount);
        const period = readPeriod(req.body);
        const bonusType = String(type || "Performance");
        const status = req.body.status === "Pending" ? "Pending" : "Approved";

        if (!validId(employeeId)) return bad(res, "Please select an employee.");
        if (!(await Employee.exists({ _id: employeeId }))) return bad(res, "Employee record not found.", 404);
        if (selfBlocked(req, employeeId)) return bad(res, SELF_MESSAGE, 403);
        if (String(title || "").trim().length < 2) return bad(res, "Please enter a title.");
        if (!amount) return bad(res, "Enter a valid amount.");
        if (period.error) return bad(res, period.error);
        if (!BONUS_TYPES.includes(bonusType)) return bad(res, "Please select a valid bonus type.");

        const check = await periodCheck(employeeId, period.month, period.year);
        if (check.block) return bad(res, check.block, 409);

        const bonus = await Bonus.create({
            employee: employeeId,
            title: String(title).trim().slice(0, 100),
            amount,
            month: period.month,
            year: period.year,
            type: bonusType,
            remarks: String(remarks || "").trim().slice(0, 300),
            status,
        });

        if (status === "Approved") {
            await tellEmployee(req, employeeId, {
                type: "payroll",
                title: "Bonus added",
                message: `A bonus of ₹${amount} (${bonus.title}) was added for ${periodText(period.month, period.year)}. It will appear in your payslip.`,
                link: "/self-service/payslips",
            });
        }

        const out = await populateEmp(Bonus.findById(bonus._id).lean());
        return res.status(201).json({ ...out, payslip: null, warning: check.warning || "" });
    } catch (err) {
        next(err);
    }
};

// @route PUT /api/payroll/bonuses/:id
exports.updateBonus = async (req, res, next) => {
    try {
        const bonus = await Bonus.findById(req.params.id);
        if (!bonus) return bad(res, "Bonus record not found.", 404);
        if (selfBlocked(req, bonus.employee)) return bad(res, SELF_MESSAGE, 403);
        if (bonus.status === "Paid") return bad(res, "This bonus is already paid with a salary and cannot be changed.", 409);
        const slip = await lockedBy("bonusIds", bonus._id, ["processed", "paid"]);
        if (slip) return bad(res, lockMessage(slip, "bonus"), 409);

        let warning = "";

        if (req.body.title !== undefined) {
            const title = String(req.body.title).trim();
            if (title.length < 2) return bad(res, "Please enter a title.");
            bonus.title = title.slice(0, 100);
        }
        if (req.body.amount !== undefined) {
            const amount = readAmount(req.body.amount);
            if (!amount) return bad(res, "Enter a valid amount.");
            bonus.amount = amount;
        }
        if (req.body.month !== undefined || req.body.year !== undefined) {
            const period = readPeriod({ month: req.body.month ?? bonus.month, year: req.body.year ?? bonus.year });
            if (period.error) return bad(res, period.error);
            if (period.month !== bonus.month || period.year !== bonus.year) {
                const check = await periodCheck(bonus.employee, period.month, period.year);
                if (check.block) return bad(res, check.block, 409);
                warning = check.warning || "";
            }
            bonus.month = period.month;
            bonus.year = period.year;
        }
        if (req.body.type !== undefined) {
            if (!BONUS_TYPES.includes(req.body.type)) return bad(res, "Please select a valid bonus type.");
            bonus.type = req.body.type;
        }
        if (req.body.remarks !== undefined) bonus.remarks = String(req.body.remarks).trim().slice(0, 300);
        if (req.body.status !== undefined) {
            if (!["Pending", "Approved"].includes(req.body.status)) return bad(res, "Status can be changed only to Pending or Approved.");
            bonus.status = req.body.status;
        }

        await bonus.save();
        const [out] = await attachPayslip([await populateEmp(Bonus.findById(bonus._id).lean())], "bonusIds");
        return res.status(200).json({ ...out, warning });
    } catch (err) {
        next(err);
    }
};

// @route DELETE /api/payroll/bonuses/:id
exports.deleteBonus = async (req, res, next) => {
    try {
        const bonus = await Bonus.findById(req.params.id);
        if (!bonus) return bad(res, "Bonus record not found.", 404);
        if (selfBlocked(req, bonus.employee)) return bad(res, SELF_MESSAGE, 403);
        if (bonus.status === "Paid") return bad(res, "This bonus is already paid with a salary and cannot be deleted.", 409);
        const slip = await lockedBy("bonusIds", bonus._id, ["processed", "paid"]);
        if (slip) return bad(res, lockMessage(slip, "bonus"), 409);

        await bonus.deleteOne();
        return res.status(200).json({ message: "Bonus allocation deleted successfully." });
    } catch (err) {
        next(err);
    }
};

/* ============================ summary and queue ============================ */

// @route GET /api/payroll/summary?month=&year=
exports.getPayrollSummary = async (req, res, next) => {
    try {
        const period = readPeriod(req.query);
        if (period.error) return bad(res, period.error);

        const payrolls = await Payroll.find({ month: period.month, year: period.year });
        const sum = (key) => round2(payrolls.reduce((total, p) => total + (Number(p[key]) || 0), 0));
        const count = (s) => payrolls.filter((p) => p.status === s).length;

        return res.status(200).json({
            totalEmployees: payrolls.length,
            totalGross: sum("grossSalary"),
            totalDeductions: sum("totalDeductions"),
            totalNet: sum("netSalary"),
            draftCount: count("draft"),
            processedCount: count("processed"),
            paidCount: count("paid"),
            pendingCount: payrolls.length - count("paid"),
        });
    } catch (err) {
        next(err);
    }
};

// @route GET /api/payroll/processing-queue
exports.getProcessingQueue = async (req, res, next) => {
    try {
        const batches = await Payroll.aggregate([
            { $match: { status: { $in: ["draft", "processed"] } } },
            {
                $group: {
                    _id: { month: "$month", year: "$year", status: "$status" },
                    month: { $first: "$month" },
                    year: { $first: "$year" },
                    status: { $first: "$status" },
                    employeeCount: { $sum: 1 },
                    totalGross: { $sum: "$grossSalary" },
                    totalDeductions: { $sum: "$totalDeductions" },
                    totalPayout: { $sum: "$netSalary" },
                },
            },
            {
                $project: {
                    _id: { $concat: [{ $toString: "$year" }, "-", { $toString: "$month" }, "-", "$status"] },
                    period: { $concat: [{ $toString: "$month" }, "/", { $toString: "$year" }] },
                    month: 1,
                    year: 1,
                    status: 1,
                    employeeCount: 1,
                    totalGross: 1,
                    totalDeductions: 1,
                    totalPayout: 1,
                },
            },
            { $sort: { year: -1, month: -1 } },
        ]);

        return res.status(200).json(batches || []);
    } catch (err) {
        next(err);
    }
};



















// const mongoose = require("mongoose");
// const Payroll = require("../models/Payroll");
// const Employee = require("../models/Employee");
// const Bonus = require("../models/Bonus");
// const Deduction = require("../models/Deduction");
// const Loan = require("../models/Loan");
// const TaxProfile = require("../models/TaxProfile");
// const EmployeeSalary = require("../models/EmployeeSalary");

// const EMP_FIELDS = "name employeeId department designation email";
// const MAX_AMOUNT = 10000000;

// const validId = (v) => mongoose.isValidObjectId(v);
// const round2 = (v) => Math.round((Number(v) || 0) * 100) / 100;
// const populateEmp = (query) => query.populate("employee", EMP_FIELDS);

// const currentPeriod = () => {
//     const [year, month] = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }).split("-").map(Number);
//     return { year, month };
// };

// /* month and year from a request. A missing value means the current month. */
// const readPeriod = (body) => {
//     const now = currentPeriod();
//     const month = body.month !== undefined && body.month !== "" ? Number(body.month) : now.month;
//     const year = body.year !== undefined && body.year !== "" ? Number(body.year) : now.year;
//     if (!Number.isInteger(month) || month < 1 || month > 12) return { error: "Please select a valid month." };
//     if (!Number.isInteger(year) || year < 2000 || year > 2100) return { error: "Please select a valid year." };
//     return { month, year };
// };

// /* a positive amount, or null */
// const readAmount = (v) => {
//     const n = Number(v);
//     return Number.isFinite(n) && n > 0 && n <= MAX_AMOUNT ? round2(n) : null;
// };

// const bad = (res, message, status = 400) => res.status(status).json({ message });

// /* ================================ reports ================================ */

// // @route GET /api/payroll/reports?month=&year=&department=
// exports.getPayrollReports = async (req, res, next) => {
//     try {
//         const { month, year, department } = req.query;
//         if (!month || !year) return bad(res, "Please select the month and the year.");

//         let payrolls = await Payroll.find({ month: Number(month), year: Number(year) })
//             .populate("employee", "name employeeId department designation")
//             .sort({ createdAt: -1 });

//         if (department && department !== "ALL") {
//             payrolls = payrolls.filter((p) => p.employee && p.employee.department === department);
//         }

//         const reportData = payrolls.map((p) => {
//             const emp = p.employee || {};
//             const d = p.deductions || {};
//             return {
//                 _id: p._id,
//                 userId: emp.employeeId || "—",
//                 userName: emp.name || "Unknown Staff",
//                 department: emp.department || "—",
//                 gross: p.grossSalary || 0,
//                 bonus: p.bonus || 0,
//                 deductions: p.totalDeductions || 0,
//                 lop: d.lop || 0,
//                 tds: d.tds || 0,
//                 netPay: p.netSalary || 0,
//                 workingDays: p.workingDays || 0,
//                 daysPresent: p.daysPresent || 0,
//                 unpaidDays: p.unpaidDays || 0,
//                 status: p.status,
//             };
//         });

//         return res.status(200).json(reportData);
//     } catch (err) {
//         next(err);
//     }
// };

// /* ============================== tax and TDS ============================== */

// // Slabs for the old and the new regime. Please confirm the current rates with your CA.
// const computeTax = (annualGross, regime, deductions80C = 0, deductions80D = 0, hra = 0) => {
//     const standardDeduction = regime === "NEW" ? 75000 : 50000;
//     let totalExemptions = standardDeduction;

//     if (regime === "OLD") {
//         totalExemptions += Math.min(Number(deductions80C) || 0, 150000);
//         totalExemptions += Math.min(Number(deductions80D) || 0, 75000);
//         totalExemptions += Number(hra) || 0;
//     }

//     const taxableIncome = Math.max(annualGross - totalExemptions, 0);
//     let tax = 0;

//     if (regime === "NEW") {
//         if (taxableIncome > 2400000) tax += (taxableIncome - 2400000) * 0.3;
//         if (taxableIncome > 2000000) tax += Math.min(taxableIncome - 2000000, 400000) * 0.25;
//         if (taxableIncome > 1600000) tax += Math.min(taxableIncome - 1600000, 400000) * 0.2;
//         if (taxableIncome > 1200000) tax += Math.min(taxableIncome - 1200000, 400000) * 0.15;
//         if (taxableIncome > 800000) tax += Math.min(taxableIncome - 800000, 400000) * 0.1;
//         if (taxableIncome > 400000) tax += Math.min(taxableIncome - 400000, 400000) * 0.05;
//         if (taxableIncome <= 1200000) tax = 0;
//     } else {
//         if (taxableIncome > 1000000) tax += (taxableIncome - 1000000) * 0.3;
//         if (taxableIncome > 500000) tax += Math.min(taxableIncome - 500000, 500000) * 0.2;
//         if (taxableIncome > 250000) tax += Math.min(taxableIncome - 250000, 250000) * 0.05;
//         if (taxableIncome <= 500000) tax = 0;
//     }

//     const cess = Math.round(tax * 0.04);
//     const annualTax = Math.round(tax + cess);
//     return { taxableIncome, totalExemptions, annualTax, monthlyTDS: Math.round(annualTax / 12) };
// };

// // @route GET /api/payroll/tax-tds   (every active employee who has a salary)
// exports.getTaxTdsList = async (req, res, next) => {
//     try {
//         const [employees, salaryRecords, taxProfiles] = await Promise.all([
//             Employee.find({ employeeStatus: { $nin: ["Inactive", "Exited", "Exit"] }, salary: { $gt: 0 } })
//                 .select(`${EMP_FIELDS} salary panNumber pan`)
//                 .sort({ name: 1 })
//                 .lean(),
//             EmployeeSalary.find().select("employee status").lean(),
//             TaxProfile.find().lean(),
//         ]);

//         const switchedOff = new Set(salaryRecords.filter((s) => s.status !== "Active").map((s) => String(s.employee)));
//         const profileMap = new Map(taxProfiles.map((p) => [String(p.employee), p]));

//         const result = employees
//             .filter((emp) => !switchedOff.has(String(emp._id)))
//             .map((emp) => {
//                 const profile = profileMap.get(String(emp._id)) || {};
//                 const regime = profile.regime || "NEW";
//                 const annualGross = round2((Number(emp.salary) || 0) * 12);
//                 const computed = computeTax(annualGross, regime, profile.section80C || 0, profile.section80D || 0, profile.hraExemption || 0);

//                 return {
//                     _id: profile._id || emp._id,
//                     employee: emp,
//                     panNumber: profile.panNumber || emp.panNumber || emp.pan || "PENDING",
//                     regime,
//                     annualGross,
//                     exemptionsDeclared: computed.totalExemptions,
//                     section80C: profile.section80C || 0,
//                     section80D: profile.section80D || 0,
//                     taxableIncome: computed.taxableIncome,
//                     annualTax: computed.annualTax,
//                     monthlyTDS: computed.monthlyTDS,
//                 };
//             });

//         return res.status(200).json(result);
//     } catch (err) {
//         next(err);
//     }
// };

// // @route POST /api/payroll/tax-tds
// exports.upsertTaxProfile = async (req, res, next) => {
//     try {
//         const { employeeId, regime, panNumber, section80C, section80D, hraExemption, otherExemptions } = req.body;

//         if (!validId(employeeId)) return bad(res, "Please select an employee.");
//         if (!(await Employee.exists({ _id: employeeId }))) return bad(res, "Employee record not found.", 404);

//         const chosenRegime = String(regime || "NEW").toUpperCase();
//         if (!["NEW", "OLD"].includes(chosenRegime)) return bad(res, "Tax regime must be NEW or OLD.");

//         const pan = String(panNumber || "").trim().toUpperCase();
//         if (pan && !/^[A-Z]{5}\d{4}[A-Z]$/.test(pan)) return bad(res, "PAN must look like ABCDE1234F.");

//         const money = (v) => Math.max(0, Number(v) || 0);

//         const updated = await TaxProfile.findOneAndUpdate(
//             { employee: employeeId },
//             {
//                 employee: employeeId,
//                 regime: chosenRegime,
//                 panNumber: pan,
//                 section80C: money(section80C),
//                 section80D: money(section80D),
//                 hraExemption: money(hraExemption),
//                 otherExemptions: money(otherExemptions),
//             },
//             { upsert: true, new: true, runValidators: true }
//         ).populate("employee", EMP_FIELDS);

//         return res.status(200).json(updated);
//     } catch (err) {
//         next(err);
//     }
// };

// /* ================================= loans ================================= */

// const LOAN_TYPES = ["SALARY_ADVANCE", "COMPANY_LOAN", "EMERGENCY_AID"];
// const LOAN_STATUSES = ["PENDING", "ACTIVE", "COMPLETED", "REJECTED"];

// // @route GET /api/payroll/loans?status=&employee=
// exports.getLoans = async (req, res, next) => {
//     try {
//         const { status, employee } = req.query;
//         const filter = {};
//         if (status && status !== "ALL") filter.status = String(status).toUpperCase();
//         if (employee && employee !== "ALL") filter.employee = employee;

//         return res.status(200).json(await populateEmp(Loan.find(filter).sort({ createdAt: -1 })));
//     } catch (err) {
//         next(err);
//     }
// };

// // @route POST /api/payroll/loans
// exports.createLoan = async (req, res, next) => {
//     try {
//         const { employeeId, type, emiMonths, reason } = req.body;
//         const principal = readAmount(req.body.amount);
//         const months = Number(emiMonths);
//         const loanType = String(type || "SALARY_ADVANCE").toUpperCase();

//         if (!validId(employeeId)) return bad(res, "Please select an employee.");
//         if (!(await Employee.exists({ _id: employeeId }))) return bad(res, "Employee record not found.", 404);
//         if (!principal) return bad(res, "Enter a valid loan amount.");
//         if (!Number.isInteger(months) || months < 1 || months > 36) return bad(res, "The number of EMI months must be a whole number from 1 to 36.");
//         if (!LOAN_TYPES.includes(loanType)) return bad(res, "Please select a valid loan type.");
//         if (String(reason || "").trim().length < 3) return bad(res, "Please enter the reason.");

//         const loan = await Loan.create({
//             employee: employeeId,
//             type: loanType,
//             principal,
//             emiMonths: months,
//             monthlyEmi: Math.ceil(principal / months), // the last EMI is cut down to the balance
//             remainingBalance: principal,
//             reason: String(reason).trim().slice(0, 300),
//             status: "ACTIVE",
//             disbursedDate: new Date(),
//         });

//         return res.status(201).json(await populateEmp(Loan.findById(loan._id)));
//     } catch (err) {
//         next(err);
//     }
// };

// // @route PUT /api/payroll/loans/:id
// exports.updateLoan = async (req, res, next) => {
//     try {
//         const loan = await Loan.findById(req.params.id);
//         if (!loan) return bad(res, "Loan record not found.", 404);

//         const recovered = round2(loan.principal - loan.remainingBalance);

//         if (req.body.reason !== undefined) {
//             const reason = String(req.body.reason).trim();
//             if (reason.length < 3) return bad(res, "Please enter the reason.");
//             loan.reason = reason.slice(0, 300);
//         }
//         if (req.body.type !== undefined) {
//             const loanType = String(req.body.type).toUpperCase();
//             if (!LOAN_TYPES.includes(loanType)) return bad(res, "Please select a valid loan type.");
//             loan.type = loanType;
//         }

//         const changesMoney = req.body.amount !== undefined || req.body.emiMonths !== undefined;
//         if (changesMoney) {
//             if (recovered > 0) return bad(res, "EMI has already been recovered from the salary, so the amount and tenure cannot be changed now.", 409);

//             const principal = req.body.amount !== undefined ? readAmount(req.body.amount) : loan.principal;
//             const months = req.body.emiMonths !== undefined ? Number(req.body.emiMonths) : loan.emiMonths;
//             if (!principal) return bad(res, "Enter a valid loan amount.");
//             if (!Number.isInteger(months) || months < 1 || months > 36) return bad(res, "The number of EMI months must be a whole number from 1 to 36.");

//             loan.principal = principal;
//             loan.emiMonths = months;
//             loan.monthlyEmi = Math.ceil(principal / months);
//             loan.remainingBalance = principal;
//         }

//         await loan.save();
//         return res.status(200).json(await populateEmp(Loan.findById(loan._id)));
//     } catch (err) {
//         next(err);
//     }
// };

// // @route PUT /api/payroll/loans/:id/status
// exports.updateLoanStatus = async (req, res, next) => {
//     try {
//         const status = String(req.body.status || "").toUpperCase();
//         if (!LOAN_STATUSES.includes(status)) return bad(res, `Status must be one of: ${LOAN_STATUSES.join(", ")}.`);

//         const loan = await Loan.findByIdAndUpdate(req.params.id, { status }, { new: true });
//         if (!loan) return bad(res, "Loan record not found.", 404);

//         return res.status(200).json(await populateEmp(Loan.findById(loan._id)));
//     } catch (err) {
//         next(err);
//     }
// };

// // @route DELETE /api/payroll/loans/:id
// exports.deleteLoan = async (req, res, next) => {
//     try {
//         const loan = await Loan.findById(req.params.id);
//         if (!loan) return bad(res, "Loan record not found.", 404);
//         if (loan.remainingBalance < loan.principal) {
//             return bad(res, "EMI has already been recovered for this loan. Mark it completed or rejected instead of deleting it.", 409);
//         }
//         await loan.deleteOne();
//         return res.status(200).json({ message: "Loan record deleted successfully." });
//     } catch (err) {
//         next(err);
//     }
// };

// /* =============================== deductions =============================== */

// const DEDUCTION_TYPES = ["LOAN_RECOVERY", "TDS", "DAMAGE_PENALTY", "ADVANCE_SALARY", "OTHER"];

// // @route GET /api/payroll/deductions?month=&year=&employee=
// exports.getDeductions = async (req, res, next) => {
//     try {
//         const { month, year, employee } = req.query;
//         const filter = {};
//         if (month && month !== "ALL") filter.month = Number(month);
//         if (year && year !== "ALL") filter.year = Number(year);
//         if (employee && employee !== "ALL") filter.employee = employee;

//         return res.status(200).json(await populateEmp(Deduction.find(filter).sort({ year: -1, month: -1, createdAt: -1 })));
//     } catch (err) {
//         next(err);
//     }
// };

// // @route POST /api/payroll/deductions   (it is taken in the payslip of the month it is made for)
// exports.createDeduction = async (req, res, next) => {
//     try {
//         const { employeeId, title, type, remarks } = req.body;
//         const amount = readAmount(req.body.amount);
//         const period = readPeriod(req.body);
//         const deductionType = String(type || "OTHER").toUpperCase();

//         if (!validId(employeeId)) return bad(res, "Please select an employee.");
//         if (!(await Employee.exists({ _id: employeeId }))) return bad(res, "Employee record not found.", 404);
//         if (String(title || "").trim().length < 2) return bad(res, "Please enter a title.");
//         if (!amount) return bad(res, "Enter a valid amount.");
//         if (period.error) return bad(res, period.error);
//         if (!DEDUCTION_TYPES.includes(deductionType)) return bad(res, "Please select a valid deduction type.");

//         const deduction = await Deduction.create({
//             employee: employeeId,
//             title: String(title).trim().slice(0, 100),
//             amount,
//             month: period.month,
//             year: period.year,
//             type: deductionType,
//             remarks: String(remarks || "").trim().slice(0, 300),
//             status: "Pending",
//         });

//         return res.status(201).json(await populateEmp(Deduction.findById(deduction._id)));
//     } catch (err) {
//         next(err);
//     }
// };

// // @route PUT /api/payroll/deductions/:id
// exports.updateDeduction = async (req, res, next) => {
//     try {
//         const deduction = await Deduction.findById(req.params.id);
//         if (!deduction) return bad(res, "Deduction record not found.", 404);
//         if (deduction.status === "Applied") return bad(res, "This deduction is already taken in a paid payslip and cannot be changed.", 409);

//         if (req.body.title !== undefined) {
//             const title = String(req.body.title).trim();
//             if (title.length < 2) return bad(res, "Please enter a title.");
//             deduction.title = title.slice(0, 100);
//         }
//         if (req.body.amount !== undefined) {
//             const amount = readAmount(req.body.amount);
//             if (!amount) return bad(res, "Enter a valid amount.");
//             deduction.amount = amount;
//         }
//         if (req.body.month !== undefined || req.body.year !== undefined) {
//             const period = readPeriod({ month: req.body.month ?? deduction.month, year: req.body.year ?? deduction.year });
//             if (period.error) return bad(res, period.error);
//             deduction.month = period.month;
//             deduction.year = period.year;
//         }
//         if (req.body.type !== undefined) {
//             const deductionType = String(req.body.type).toUpperCase();
//             if (!DEDUCTION_TYPES.includes(deductionType)) return bad(res, "Please select a valid deduction type.");
//             deduction.type = deductionType;
//         }
//         if (req.body.remarks !== undefined) deduction.remarks = String(req.body.remarks).trim().slice(0, 300);
//         if (req.body.status !== undefined) {
//             if (!["Pending", "Waived"].includes(req.body.status)) return bad(res, "Status can be changed only to Pending or Waived.");
//             deduction.status = req.body.status;
//         }

//         await deduction.save();
//         return res.status(200).json(await populateEmp(Deduction.findById(deduction._id)));
//     } catch (err) {
//         next(err);
//     }
// };

// // @route DELETE /api/payroll/deductions/:id
// exports.deleteDeduction = async (req, res, next) => {
//     try {
//         const deduction = await Deduction.findById(req.params.id);
//         if (!deduction) return bad(res, "Deduction record not found.", 404);
//         if (deduction.status === "Applied") return bad(res, "This deduction is already taken in a paid payslip and cannot be deleted.", 409);
//         await deduction.deleteOne();
//         return res.status(200).json({ message: "Deduction record successfully removed." });
//     } catch (err) {
//         next(err);
//     }
// };

// /* ================================= bonuses ================================= */

// const BONUS_TYPES = ["Performance", "Festival", "Retention", "Discretionary"];

// // @route GET /api/payroll/bonuses?month=&year=&employee=
// exports.getBonuses = async (req, res, next) => {
//     try {
//         const { month, year, employee } = req.query;
//         const filter = {};
//         if (month && month !== "ALL") filter.month = Number(month);
//         if (year && year !== "ALL") filter.year = Number(year);
//         if (employee && employee !== "ALL") filter.employee = employee;

//         return res.status(200).json(await populateEmp(Bonus.find(filter).sort({ year: -1, month: -1, createdAt: -1 })));
//     } catch (err) {
//         next(err);
//     }
// };

// // @route POST /api/payroll/bonuses   (it is added to the payslip of the month it is made for)
// exports.createBonus = async (req, res, next) => {
//     try {
//         const { employeeId, title, type, remarks } = req.body;
//         const amount = readAmount(req.body.amount);
//         const period = readPeriod(req.body);
//         const bonusType = String(type || "Performance");

//         if (!validId(employeeId)) return bad(res, "Please select an employee.");
//         if (!(await Employee.exists({ _id: employeeId }))) return bad(res, "Employee record not found.", 404);
//         if (String(title || "").trim().length < 2) return bad(res, "Please enter a title.");
//         if (!amount) return bad(res, "Enter a valid amount.");
//         if (period.error) return bad(res, period.error);
//         if (!BONUS_TYPES.includes(bonusType)) return bad(res, "Please select a valid bonus type.");

//         const bonus = await Bonus.create({
//             employee: employeeId,
//             title: String(title).trim().slice(0, 100),
//             amount,
//             month: period.month,
//             year: period.year,
//             type: bonusType,
//             remarks: String(remarks || "").trim().slice(0, 300),
//             status: "Approved",
//         });

//         return res.status(201).json(await populateEmp(Bonus.findById(bonus._id)));
//     } catch (err) {
//         next(err);
//     }
// };

// // @route PUT /api/payroll/bonuses/:id
// exports.updateBonus = async (req, res, next) => {
//     try {
//         const bonus = await Bonus.findById(req.params.id);
//         if (!bonus) return bad(res, "Bonus record not found.", 404);
//         if (bonus.status === "Paid") return bad(res, "This bonus is already paid with a salary and cannot be changed.", 409);

//         if (req.body.title !== undefined) {
//             const title = String(req.body.title).trim();
//             if (title.length < 2) return bad(res, "Please enter a title.");
//             bonus.title = title.slice(0, 100);
//         }
//         if (req.body.amount !== undefined) {
//             const amount = readAmount(req.body.amount);
//             if (!amount) return bad(res, "Enter a valid amount.");
//             bonus.amount = amount;
//         }
//         if (req.body.month !== undefined || req.body.year !== undefined) {
//             const period = readPeriod({ month: req.body.month ?? bonus.month, year: req.body.year ?? bonus.year });
//             if (period.error) return bad(res, period.error);
//             bonus.month = period.month;
//             bonus.year = period.year;
//         }
//         if (req.body.type !== undefined) {
//             if (!BONUS_TYPES.includes(req.body.type)) return bad(res, "Please select a valid bonus type.");
//             bonus.type = req.body.type;
//         }
//         if (req.body.remarks !== undefined) bonus.remarks = String(req.body.remarks).trim().slice(0, 300);
//         if (req.body.status !== undefined) {
//             if (!["Pending", "Approved"].includes(req.body.status)) return bad(res, "Status can be changed only to Pending or Approved.");
//             bonus.status = req.body.status;
//         }

//         await bonus.save();
//         return res.status(200).json(await populateEmp(Bonus.findById(bonus._id)));
//     } catch (err) {
//         next(err);
//     }
// };

// // @route DELETE /api/payroll/bonuses/:id
// exports.deleteBonus = async (req, res, next) => {
//     try {
//         const bonus = await Bonus.findById(req.params.id);
//         if (!bonus) return bad(res, "Bonus record not found.", 404);
//         if (bonus.status === "Paid") return bad(res, "This bonus is already paid with a salary and cannot be deleted.", 409);
//         await bonus.deleteOne();
//         return res.status(200).json({ message: "Bonus allocation deleted successfully." });
//     } catch (err) {
//         next(err);
//     }
// };

// /* ============================ summary and queue ============================ */

// // @route GET /api/payroll/summary?month=&year=
// exports.getPayrollSummary = async (req, res, next) => {
//     try {
//         const period = readPeriod(req.query);
//         if (period.error) return bad(res, period.error);

//         const payrolls = await Payroll.find({ month: period.month, year: period.year });
//         const sum = (key) => round2(payrolls.reduce((total, p) => total + (Number(p[key]) || 0), 0));
//         const count = (s) => payrolls.filter((p) => p.status === s).length;

//         return res.status(200).json({
//             totalEmployees: payrolls.length,
//             totalGross: sum("grossSalary"),
//             totalDeductions: sum("totalDeductions"),
//             totalNet: sum("netSalary"),
//             draftCount: count("draft"),
//             processedCount: count("processed"),
//             paidCount: count("paid"),
//             pendingCount: payrolls.length - count("paid"),
//         });
//     } catch (err) {
//         next(err);
//     }
// };

// // @route GET /api/payroll/processing-queue
// exports.getProcessingQueue = async (req, res, next) => {
//     try {
//         const batches = await Payroll.aggregate([
//             { $match: { status: { $in: ["draft", "processed"] } } },
//             {
//                 $group: {
//                     _id: { month: "$month", year: "$year", status: "$status" },
//                     month: { $first: "$month" },
//                     year: { $first: "$year" },
//                     status: { $first: "$status" },
//                     employeeCount: { $sum: 1 },
//                     totalGross: { $sum: "$grossSalary" },
//                     totalDeductions: { $sum: "$totalDeductions" },
//                     totalPayout: { $sum: "$netSalary" },
//                 },
//             },
//             {
//                 $project: {
//                     _id: { $concat: [{ $toString: "$year" }, "-", { $toString: "$month" }, "-", "$status"] },
//                     period: { $concat: [{ $toString: "$month" }, "/", { $toString: "$year" }] },
//                     month: 1,
//                     year: 1,
//                     status: 1,
//                     employeeCount: 1,
//                     totalGross: 1,
//                     totalDeductions: 1,
//                     totalPayout: 1,
//                 },
//             },
//             { $sort: { year: -1, month: -1 } },
//         ]);

//         return res.status(200).json(batches || []);
//     } catch (err) {
//         next(err);
//     }
// };








// const Payroll = require("../models/Payroll");
// const Employee = require("../models/Employee");
// const Settings = require("../models/Settings");
// const Attendance = require("../models/Attendance");
// const Bonus = require("../models/Bonus");
// const Deduction = require("../models/Deduction");
// const Loan = require("../models/Loan");
// const Reimbursement = require("../models/Reimbursement");
// const TaxProfile = require("../models/TaxProfile");
// const EmployeeSalary = require("../models/EmployeeSalary");
// const { notifyPayroll } = require("../utils/notify");


// // @route GET /api/payroll/reports?month=&year=&department=
// exports.getPayrollReports = async (req, res, next) => {
//     try {
//         const { month, year, department } = req.query;

//         if (!month || !year) {
//             return res.status(400).json({ message: "Month aur Year filter zaroori hai." });
//         }

//         const filter = {
//             month: Number(month),
//             year: Number(year),
//         };

//         let payrolls = await Payroll.find(filter)
//             .populate("employee", "name employeeId department designation")
//             .sort({ createdAt: -1 });

//         // Department filter
//         if (department && department !== "ALL") {
//             payrolls = payrolls.filter(
//                 (p) => p.employee && p.employee.department === department
//             );
//         }

//         const reportData = payrolls.map((p) => {
//             const emp = p.employee || {};
//             const deductionsObj =
//                 p.deductions instanceof Map
//                     ? Object.fromEntries(p.deductions)
//                     : p.deductions || {};

//             return {
//                 _id: p._id,
//                 userId: emp.employeeId || "—",
//                 userName: emp.name || "Unknown Staff",
//                 department: emp.department || "—",
//                 gross: p.grossSalary || 0,
//                 bonus: p.bonus || 0,
//                 deductions: p.totalDeductions || 0,
//                 tds: deductionsObj.TDS || deductionsObj.tds || 0,
//                 netPay: p.netSalary || 0,
//                 status: p.status,
//             };
//         });

//         return res.status(200).json(reportData);
//     } catch (err) {
//         next(err);
//     }
// };

// // Helper: Slabs calculation for Old vs New Regime
// const computeTax = (annualGross, regime, deductions80C = 0, deductions80D = 0, hra = 0) => {
//     const standardDeduction = regime === "NEW" ? 75000 : 50000;
//     let totalExemptions = standardDeduction;

//     if (regime === "OLD") {
//         totalExemptions += Math.min(Number(deductions80C) || 0, 150000);
//         totalExemptions += Math.min(Number(deductions80D) || 0, 75000);
//         totalExemptions += Number(hra) || 0;
//     }

//     const taxableIncome = Math.max(annualGross - totalExemptions, 0);
//     let tax = 0;

//     if (regime === "NEW") {
//         if (taxableIncome > 2400000) tax += (taxableIncome - 2400000) * 0.3;
//         if (taxableIncome > 2000000) tax += Math.min(taxableIncome - 2000000, 400000) * 0.25;
//         if (taxableIncome > 1600000) tax += Math.min(taxableIncome - 1600000, 400000) * 0.2;
//         if (taxableIncome > 1200000) tax += Math.min(taxableIncome - 1200000, 400000) * 0.15;
//         if (taxableIncome > 800000) tax += Math.min(taxableIncome - 800000, 400000) * 0.1;
//         if (taxableIncome > 400000) tax += Math.min(taxableIncome - 400000, 400000) * 0.05;

//         if (taxableIncome <= 1200000) tax = 0;
//     } else {
//         if (taxableIncome > 1000000) tax += (taxableIncome - 1000000) * 0.3;
//         if (taxableIncome > 500000) tax += Math.min(taxableIncome - 500000, 500000) * 0.2;
//         if (taxableIncome > 250000) tax += Math.min(taxableIncome - 250000, 250000) * 0.05;

//         if (taxableIncome <= 500000) tax = 0;
//     }

//     const cess = Math.round(tax * 0.04);
//     const annualTax = Math.round(tax + cess);
//     const monthlyTDS = Math.round(annualTax / 12);

//     return {
//         taxableIncome,
//         totalExemptions,
//         annualTax,
//         monthlyTDS,
//     };
// };

// // @route GET /api/payroll/tax-tds
// exports.getTaxTdsList = async (req, res, next) => {
//     try {
//         const salaries = await EmployeeSalary.find({ status: "Active" })
//             .populate("employee", "name employeeId department designation email pan");

//         const taxProfiles = await TaxProfile.find();
//         const profileMap = new Map();
//         taxProfiles.forEach((p) => profileMap.set(String(p.employee), p));

//         const result = salaries.map((sal) => {
//             const emp = sal.employee;
//             const profile = profileMap.get(String(emp?._id)) || {};

//             const regime = profile.regime || "NEW";
//             const deductions80C = profile.section80C || 0;
//             const deductions80D = profile.section80D || 0;
//             const hra = profile.hraExemption || 0;
//             const panNumber = profile.panNumber || emp?.pan || "PENDING";

//             const annualGross = Number(sal.annualCTC) || (Number(sal.grossMonthly) * 12) || 0;
//             const computed = computeTax(annualGross, regime, deductions80C, deductions80D, hra);

//             return {
//                 _id: profile._id || sal._id,
//                 employee: emp,
//                 panNumber,
//                 regime,
//                 annualGross,
//                 exemptionsDeclared: computed.totalExemptions,
//                 section80C: deductions80C,
//                 section80D: deductions80D,
//                 taxableIncome: computed.taxableIncome,
//                 annualTax: computed.annualTax,
//                 monthlyTDS: computed.monthlyTDS,
//             };
//         });

//         return res.status(200).json(result);
//     } catch (err) {
//         next(err);
//     }
// };

// // @route POST /api/payroll/tax-tds
// exports.upsertTaxProfile = async (req, res, next) => {
//     try {
//         const { employeeId, regime, panNumber, section80C, section80D, hraExemption, otherExemptions } = req.body;

//         if (!employeeId) {
//             return res.status(400).json({ message: "Employee selection is mandatory." });
//         }

//         const updated = await TaxProfile.findOneAndUpdate(
//             { employee: employeeId },
//             {
//                 employee: employeeId,
//                 regime: regime || "NEW",
//                 panNumber: panNumber ? panNumber.trim().toUpperCase() : "",
//                 section80C: Number(section80C) || 0,
//                 section80D: Number(section80D) || 0,
//                 hraExemption: Number(hraExemption) || 0,
//                 otherExemptions: Number(otherExemptions) || 0,
//             },
//             { upsert: true, new: true, runValidators: true }
//         ).populate("employee", "name employeeId department designation email");

//         return res.status(200).json(updated);
//     } catch (err) {
//         next(err);
//     }
// };

// // @route GET /api/payroll/reimbursements
// exports.getReimbursements = async (req, res, next) => {
//     try {
//         const { status, employee } = req.query;
//         const filter = {};

//         if (status && status !== "ALL") filter.status = status;
//         if (employee && employee !== "ALL") filter.employee = employee;

//         const list = await Reimbursement.find(filter)
//             .populate("employee", "name employeeId department designation email")
//             .sort({ createdAt: -1 });

//         return res.status(200).json(list);
//     } catch (err) {
//         next(err);
//     }
// };

// // @route POST /api/payroll/reimbursements
// exports.createReimbursement = async (req, res, next) => {
//     try {
//         const { employeeId, category, amount, billDate, description, receiptUrl } = req.body;

//         if (!employeeId || !category || !amount) {
//             return res.status(400).json({ message: "Employee, category, aur amount required hain." });
//         }

//         const item = await Reimbursement.create({
//             employee: employeeId,
//             category,
//             amount: Number(amount),
//             billDate: billDate || new Date(),
//             description: description ? description.trim() : "",
//             receiptUrl: receiptUrl || "",
//             status: "PENDING",
//         });

//         const populated = await Reimbursement.findById(item._id).populate(
//             "employee",
//             "name employeeId department designation email"
//         );

//         return res.status(201).json(populated);
//     } catch (err) {
//         next(err);
//     }
// };

// // @route PUT /api/payroll/reimbursements/:id/status
// exports.updateReimbursementStatus = async (req, res, next) => {
//     try {
//         const { status } = req.body;
//         const item = await Reimbursement.findByIdAndUpdate(
//             req.params.id,
//             { status },
//             { new: true }
//         ).populate("employee", "name employeeId department designation email");

//         if (!item) {
//             return res.status(404).json({ message: "Reimbursement record nahi mila." });
//         }

//         return res.status(200).json(item);
//     } catch (err) {
//         next(err);
//     }
// };

// // @route DELETE /api/payroll/reimbursements/:id
// exports.deleteReimbursement = async (req, res, next) => {
//     try {
//         const item = await Reimbursement.findByIdAndDelete(req.params.id);
//         if (!item) {
//             return res.status(404).json({ message: "Reimbursement record nahi mila." });
//         }
//         return res.status(200).json({ message: "Reimbursement deleted successfully." });
//     } catch (err) {
//         next(err);
//     }
// };

// // @route GET /api/payroll/loans?status=&employee=
// exports.getLoans = async (req, res, next) => {
//     try {
//         const { status, employee } = req.query;
//         const filter = {};

//         if (status && status !== "ALL") filter.status = status;
//         if (employee && employee !== "ALL") filter.employee = employee;

//         const loans = await Loan.find(filter)
//             .populate("employee", "name employeeId department designation email")
//             .sort({ createdAt: -1 });

//         return res.status(200).json(loans);
//     } catch (err) {
//         next(err);
//     }
// };

// // @route POST /api/payroll/loans
// exports.createLoan = async (req, res, next) => {
//     try {
//         const { employeeId, type, amount, emiMonths, reason } = req.body;

//         if (!employeeId || !amount || !emiMonths || !reason) {
//             return res.status(400).json({ message: "Employee, amount, tenure aur reason mandatory hain." });
//         }

//         const principal = Number(amount);
//         const months = Number(emiMonths) || 1;
//         const monthlyEmi = Math.round(principal / months);

//         const loan = await Loan.create({
//             employee: employeeId,
//             type: type || "SALARY_ADVANCE",
//             principal,
//             emiMonths: months,
//             monthlyEmi,
//             remainingBalance: principal,
//             reason: reason.trim(),
//             status: "ACTIVE",
//             disbursedDate: new Date(),
//         });

//         const populated = await Loan.findById(loan._id).populate(
//             "employee",
//             "name employeeId department designation email"
//         );

//         return res.status(201).json(populated);
//     } catch (err) {
//         next(err);
//     }
// };

// // @route PUT /api/payroll/loans/:id
// exports.updateLoan = async (req, res, next) => {
//     try {
//         const loan = await Loan.findById(req.params.id);
//         if (!loan) {
//             return res.status(404).json({ message: "Loan record nahi mila." });
//         }

//         const updateData = { ...req.body };
//         if (updateData.amount || updateData.emiMonths) {
//             const principal = Number(updateData.amount) || loan.principal;
//             const months = Number(updateData.emiMonths) || loan.emiMonths;
//             updateData.principal = principal;
//             updateData.emiMonths = months;
//             updateData.monthlyEmi = Math.round(principal / months);
//             updateData.remainingBalance = principal;
//         }

//         const updatedLoan = await Loan.findByIdAndUpdate(
//             req.params.id,
//             updateData,
//             { new: true, runValidators: true }
//         ).populate("employee", "name employeeId department designation email");

//         return res.status(200).json(updatedLoan);
//     } catch (err) {
//         next(err);
//     }
// };

// // @route PUT /api/payroll/loans/:id/status
// exports.updateLoanStatus = async (req, res, next) => {
//     try {
//         const { status } = req.body;
//         const loan = await Loan.findByIdAndUpdate(
//             req.params.id,
//             { status },
//             { new: true }
//         ).populate("employee", "name employeeId department designation email");

//         if (!loan) {
//             return res.status(404).json({ message: "Loan record nahi mila." });
//         }

//         return res.status(200).json(loan);
//     } catch (err) {
//         next(err);
//     }
// };

// // @route DELETE /api/payroll/loans/:id
// exports.deleteLoan = async (req, res, next) => {
//     try {
//         const loan = await Loan.findByIdAndDelete(req.params.id);
//         if (!loan) {
//             return res.status(404).json({ message: "Loan record nahi mila." });
//         }
//         return res.status(200).json({ message: "Loan record deleted successfully." });
//     } catch (err) {
//         next(err);
//     }
// };

// // @route GET /api/payroll/deductions?month=&year=&employee=
// exports.getDeductions = async (req, res, next) => {
//     try {
//         const { month, year, employee } = req.query;
//         const filter = {};

//         if (month && month !== "ALL") filter.month = Number(month);
//         if (year && year !== "ALL") filter.year = Number(year);
//         if (employee && employee !== "ALL") filter.employee = employee;

//         const deductions = await Deduction.find(filter)
//             .populate("employee", "name employeeId department designation email")
//             .sort({ year: -1, month: -1, createdAt: -1 });

//         return res.status(200).json(deductions);
//     } catch (err) {
//         next(err);
//     }
// };

// // @route POST /api/payroll/deductions
// exports.createDeduction = async (req, res, next) => {
//     try {
//         const { employeeId, title, amount, month, year, type, remarks } = req.body;

//         if (!employeeId || !title || !amount) {
//             return res.status(400).json({ message: "Employee, Title, aur Amount mandatory hain." });
//         }

//         const deduction = await Deduction.create({
//             employee: employeeId,
//             title: title.trim(),
//             amount: Number(amount),
//             month: Number(month) || new Date().getMonth() + 1,
//             year: Number(year) || new Date().getFullYear(),
//             type: type || "LOAN_RECOVERY",
//             remarks: remarks ? remarks.trim() : "",
//             status: "Pending",
//         });

//         const populated = await Deduction.findById(deduction._id).populate(
//             "employee",
//             "name employeeId department designation email"
//         );

//         return res.status(201).json(populated);
//     } catch (err) {
//         next(err);
//     }
// };

// // @route DELETE /api/payroll/deductions/:id
// exports.deleteDeduction = async (req, res, next) => {
//     try {
//         const deduction = await Deduction.findByIdAndDelete(req.params.id);
//         if (!deduction) {
//             return res.status(404).json({ message: "Deduction record nahi mila." });
//         }
//         return res.status(200).json({ message: "Deduction record successfully removed." });
//     } catch (err) {
//         next(err);
//     }
// };

// // @route GET /api/payroll/bonuses?month=&year=&employee=
// exports.getBonuses = async (req, res, next) => {
//     try {
//         const { month, year, employee } = req.query;
//         const filter = {};

//         if (month && month !== "ALL") filter.month = Number(month);
//         if (year && year !== "ALL") filter.year = Number(year);
//         if (employee && employee !== "ALL") filter.employee = employee;

//         const bonuses = await Bonus.find(filter)
//             .populate("employee", "name employeeId department designation email")
//             .sort({ year: -1, month: -1, createdAt: -1 });

//         return res.status(200).json(bonuses);
//     } catch (err) {
//         next(err);
//     }
// };

// // @route POST /api/payroll/bonuses
// exports.createBonus = async (req, res, next) => {
//     try {
//         const { employeeId, title, amount, month, year, type, remarks } = req.body;

//         if (!employeeId || !title || !amount) {
//             return res.status(400).json({ message: "Employee, Title, aur Amount mandatory hain." });
//         }

//         const bonus = await Bonus.create({
//             employee: employeeId,
//             title: title.trim(),
//             amount: Number(amount),
//             month: Number(month) || new Date().getMonth() + 1,
//             year: Number(year) || new Date().getFullYear(),
//             type: type || "Performance",
//             remarks: remarks ? remarks.trim() : "",
//             status: "Approved",
//         });

//         const populated = await Bonus.findById(bonus._id).populate(
//             "employee",
//             "name employeeId department designation email"
//         );

//         return res.status(201).json(populated);
//     } catch (err) {
//         next(err);
//     }
// };

// // @route DELETE /api/payroll/bonuses/:id
// exports.deleteBonus = async (req, res, next) => {
//     try {
//         const bonus = await Bonus.findByIdAndDelete(req.params.id);
//         if (!bonus) {
//             return res.status(404).json({ message: "Bonus record nahi mila." });
//         }
//         return res.status(200).json({ message: "Bonus allocation deleted successfully." });
//     } catch (err) {
//         next(err);
//     }
// };

// // ==========================================
// // EMPLOYEE SALARIES CONTROLLER FUNCTIONS (ADDED)
// // ==========================================

// // @route GET /api/payroll/employee-salaries
// exports.getEmployeeSalaries = async (req, res, next) => {
//     try {
//         const salaries = await EmployeeSalary.find({})
//             .populate("employee", "name employeeId department designation email")
//             .sort({ createdAt: -1 });

//         return res.status(200).json(salaries);
//     } catch (err) {
//         next(err);
//     }
// };

// // @route POST /api/payroll/employee-salaries
// exports.createEmployeeSalary = async (req, res, next) => {
//     try {
//         const { employeeId, basicMonthly, grossMonthly, annualCTC, allowances, deductions } = req.body;

//         if (!employeeId) {
//             return res.status(400).json({ message: "Employee ID dena zaroori hai." });
//         }

//         const existing = await EmployeeSalary.findOne({ employee: employeeId });
//         if (existing) {
//             return res.status(400).json({ message: "Is employee ki salary mapping pehle se bani hui hai." });
//         }

//         const salary = await EmployeeSalary.create({
//             employee: employeeId,
//             basicMonthly: Number(basicMonthly) || 0,
//             grossMonthly: Number(grossMonthly) || 0,
//             annualCTC: Number(annualCTC) || 0,
//             allowances: allowances || {},
//             deductions: deductions || {},
//             status: "Active",
//         });

//         const populated = await EmployeeSalary.findById(salary._id).populate(
//             "employee",
//             "name employeeId department designation email"
//         );

//         return res.status(201).json(populated);
//     } catch (err) {
//         next(err);
//     }
// };

// // @route DELETE /api/payroll/employee-salaries/:id
// exports.deleteEmployeeSalary = async (req, res, next) => {
//     try {
//         const salary = await EmployeeSalary.findByIdAndDelete(req.params.id);
//         if (!salary) {
//             return res.status(404).json({ message: "Salary mapping record nahi mila." });
//         }
//         return res.status(200).json({ message: "Salary mapping deleted successfully." });
//     } catch (err) {
//         next(err);
//     }
// };

// // ==========================================
// // EXISTING UPDATE HANDLERS
// // ==========================================

// // @route PUT /api/payroll/deductions/:id
// exports.updateDeduction = async (req, res, next) => {
//     try {
//         const deduction = await Deduction.findById(req.params.id);
//         if (!deduction) {
//             return res.status(404).json({ message: "Deduction record nahi mila." });
//         }

//         const updateData = { ...req.body };
//         if (updateData.amount) {
//             updateData.amount = Number(updateData.amount);
//         }

//         const updatedDeduction = await Deduction.findByIdAndUpdate(
//             req.params.id,
//             updateData,
//             { new: true, runValidators: true }
//         ).populate("employee", "name employeeId department designation email");

//         return res.status(200).json(updatedDeduction);
//     } catch (err) {
//         next(err);
//     }
// };

// // @route PUT /api/payroll/bonuses/:id
// exports.updateBonus = async (req, res, next) => {
//     try {
//         const bonus = await Bonus.findById(req.params.id);
//         if (!bonus) {
//             return res.status(404).json({ message: "Bonus record nahi mila." });
//         }

//         const updateData = { ...req.body };
//         if (updateData.amount) {
//             updateData.amount = Number(updateData.amount);
//         }

//         const updatedBonus = await Bonus.findByIdAndUpdate(
//             req.params.id,
//             updateData,
//             { new: true, runValidators: true }
//         ).populate("employee", "name employeeId department designation email");

//         return res.status(200).json(updatedBonus);
//     } catch (err) {
//         next(err);
//     }
// };

// // @route PUT /api/payroll/employee-salaries/:id
// exports.updateEmployeeSalary = async (req, res, next) => {
//     try {
//         const salary = await EmployeeSalary.findById(req.params.id);
//         if (!salary) {
//             return res.status(404).json({ message: "Employee salary mapping record nahi mila." });
//         }

//         const updatedSalary = await EmployeeSalary.findByIdAndUpdate(
//             req.params.id,
//             req.body,
//             { new: true, runValidators: true }
//         ).populate("employee", "name employeeId department designation email");

//         return res.status(200).json(updatedSalary);
//     } catch (err) {
//         next(err);
//     }
// };

// const parseMonthYear = (month, year) => {
//     const m = Number(month);
//     const y = Number(year);
//     if (isNaN(m) || m < 1 || m > 12) {
//         throw new Error("Valid month (1-12) provide karna zaroori hai.");
//     }
//     if (isNaN(y) || y < 2000 || y > 2100) {
//         throw new Error("Valid financial year provide karna zaroori hai.");
//     }
//     return { m, y };
// };

// // @route GET /api/payroll?month=&year=&employee=&status=
// exports.getPayrolls = async (req, res, next) => {
//     try {
//         const { month, year, employee, status } = req.query;
//         const filter = {};

//         if (month && month !== "ALL") filter.month = Number(month);
//         if (year && year !== "ALL") filter.year = Number(year);
//         if (employee && employee !== "ALL") filter.employee = employee;
//         if (status && status !== "ALL") filter.status = status.toLowerCase();

//         const payrolls = await Payroll.find(filter)
//             .populate("employee", "name employeeId department designation email")
//             .sort({ year: -1, month: -1, createdAt: -1 });

//         return res.status(200).json(payrolls);
//     } catch (err) {
//         next(err);
//     }
// };

// // @route GET /api/payroll/:id
// exports.getPayroll = async (req, res, next) => {
//     try {
//         const payroll = await Payroll.findById(req.params.id).populate(
//             "employee",
//             "name employeeId department designation email"
//         );
//         if (!payroll) {
//             return res.status(404).json({ message: "Payroll record nahi mila." });
//         }
//         return res.status(200).json(payroll);
//     } catch (err) {
//         next(err);
//     }
// };

// // @route POST /api/payroll/generate
// exports.generatePayroll = async (req, res, next) => {
//     try {
//         const { employee, month, year, allowances, deductions, bonus, overtimePay } = req.body;

//         if (!employee) {
//             return res.status(400).json({ message: "Employee ID provide karna zaroori hai." });
//         }

//         const { m, y } = parseMonthYear(month, year);

//         const existing = await Payroll.findOne({ employee, month: m, year: y });
//         if (existing) {
//             return res.status(400).json({ message: `Is employee ka ${m}/${y} ka payroll pehle se bana hua hai.` });
//         }

//         const emp = await Employee.findById(employee);
//         if (!emp) {
//             return res.status(404).json({ message: "Employee record nahi mila." });
//         }

//         const startDate = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
//         const endDate = new Date(Date.UTC(y, m, 0, 23, 59, 59));

//         const attendanceRecords = await Attendance.find({
//             employee,
//             date: { $gte: startDate, $lte: endDate },
//         });

//         const daysPresent = attendanceRecords.filter((r) => r.status?.toLowerCase() === "present").length;
//         const daysOnLeave = attendanceRecords.filter((r) => r.status?.toLowerCase() === "on-leave").length;

//         const baseSalary = Number(emp.salary) || 0;

//         const payroll = await Payroll.create({
//             employee,
//             month: m,
//             year: y,
//             basicSalary: baseSalary,
//             allowances: allowances || {},
//             deductions: deductions || {},
//             bonus: Number(bonus) || 0,
//             overtimePay: Number(overtimePay) || 0,
//             daysPresent,
//             daysOnLeave,
//             status: "draft",
//         });

//         const populated = await Payroll.findById(payroll._id).populate(
//             "employee",
//             "name employeeId department designation email"
//         );

//         return res.status(201).json(populated);
//     } catch (err) {
//         next(err);
//     }
// };

// // @route POST /api/payroll/generate-bulk
// exports.generateBulkPayroll = async (req, res, next) => {
//     try {
//         const { month, year, department } = req.body;
//         const { m, y } = parseMonthYear(month, year);

//         // const filter = { status: "active" };
//         const filter = { employeeStatus: { $nin: ["Inactive", "Exited", "Exit"] } };
//         if (department && department !== "ALL") filter.department = department;

//         const employees = await Employee.find(filter);
//         if (!employees.length) {
//             return res.status(404).json({ message: "Koi active employee nahi mila." });
//         }

//         const results = { created: [], skipped: [] };
//         const startDate = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
//         const endDate = new Date(Date.UTC(y, m, 0, 23, 59, 59));

//         for (const emp of employees) {
//             const exists = await Payroll.findOne({ employee: emp._id, month: m, year: y });
//             if (exists) {
//                 results.skipped.push({ name: emp.name, employeeId: emp.employeeId, reason: "Already generated" });
//                 continue;
//             }

//             const attendanceRecords = await Attendance.find({
//                 employee: emp._id,
//                 date: { $gte: startDate, $lte: endDate },
//             });

//             const daysPresent = attendanceRecords.filter((r) => r.status?.toLowerCase() === "present").length;
//             const daysOnLeave = attendanceRecords.filter((r) => r.status?.toLowerCase() === "on-leave").length;

//             const payroll = await Payroll.create({
//                 employee: emp._id,
//                 month: m,
//                 year: y,
//                 basicSalary: Number(emp.salary) || 0,
//                 daysPresent,
//                 daysOnLeave,
//                 status: "draft",
//             });

//             results.created.push(payroll);
//         }

//         return res.status(201).json({
//             success: true,
//             message: `${results.created.length} payroll records generated, ${results.skipped.length} skipped.`,
//             totalProcessed: results.created.length,
//             skippedCount: results.skipped.length,
//             results,
//         });
//     } catch (err) {
//         next(err);
//     }
// };

// // @route PUT /api/payroll/:id
// exports.updatePayroll = async (req, res, next) => {
//     try {
//         const payroll = await Payroll.findById(req.params.id);
//         if (!payroll) {
//             return res.status(404).json({ message: "Payroll record nahi mila." });
//         }

//         if (payroll.status === "paid") {
//             return res.status(400).json({ message: "Paid payroll ko edit nahi kiya ja sakta." });
//         }

//         Object.assign(payroll, req.body);
//         await payroll.save();

//         const updated = await Payroll.findById(payroll._id).populate(
//             "employee",
//             "name employeeId department designation email"
//         );

//         return res.status(200).json(updated);
//     } catch (err) {
//         next(err);
//     }
// };

// // @route PUT /api/payroll/:id/process
// exports.processPayroll = async (req, res, next) => {
//     try {
//         const payroll = await Payroll.findByIdAndUpdate(
//             req.params.id,
//             { status: "processed" },
//             { new: true }
//         ).populate("employee", "name employeeId department designation email");

//         if (!payroll) {
//             return res.status(404).json({ message: "Payroll record nahi mila." });
//         }
//         await notifyPayroll(payroll, "processed");
//         return res.status(200).json(payroll);
//     } catch (err) {
//         next(err);
//     }
// };

// // @route PUT /api/payroll/:id/mark-paid
// exports.markAsPaid = async (req, res, next) => {
//     try {
//         const payroll = await Payroll.findByIdAndUpdate(
//             req.params.id,
//             { status: "paid", paidOn: new Date() },
//             { new: true }
//         ).populate("employee", "name employeeId department designation email");

//         if (!payroll) {
//             return res.status(404).json({ message: "Payroll record nahi mila." });
//         }
//         await notifyPayroll(payroll, "paid");
//         return res.status(200).json(payroll);
//     } catch (err) {
//         next(err);
//     }
// };

// // @route GET /api/payroll/payslip/:id
// exports.getPayslip = async (req, res, next) => {
//     try {
//         const payroll = await Payroll.findById(req.params.id).populate(
//             "employee",
//             "name employeeId email designation department dateOfJoining"
//         );
//         if (!payroll) {
//             return res.status(404).json({ message: "Payslip record nahi mila." });
//         }

//         const allowancesObj = payroll.allowances instanceof Map
//             ? Object.fromEntries(payroll.allowances)
//             : (payroll.allowances || {});

//         const deductionsObj = payroll.deductions instanceof Map
//             ? Object.fromEntries(payroll.deductions)
//             : (payroll.deductions || {});

//         return res.status(200).json({
//             employee: payroll.employee,
//             period: `${payroll.month}/${payroll.year}`,
//             earnings: {
//                 basic: payroll.basicSalary || 0,
//                 ...allowancesObj,
//                 bonus: payroll.bonus || 0,
//                 overtime: payroll.overtimePay || 0,
//             },
//             deductions: deductionsObj,
//             grossSalary: payroll.grossSalary || 0,
//             totalDeductions: payroll.totalDeductions || 0,
//             netSalary: payroll.netSalary || 0,
//             status: payroll.status,
//             paidOn: payroll.paidOn,
//             attendance: {
//                 present: payroll.daysPresent || 0,
//                 leave: payroll.daysOnLeave || 0,
//             },
//         });
//     } catch (err) {
//         next(err);
//     }
// };

// // @route GET /api/payroll/summary
// exports.getPayrollSummary = async (req, res, next) => {
//     try {
//         const { month, year } = req.query;
//         if (!month || !year) {
//             return res.status(400).json({ message: "Month aur Year provide karna zaroori hai." });
//         }

//         const { m, y } = parseMonthYear(month, year);
//         const payrolls = await Payroll.find({ month: m, year: y });

//         const summary = {
//             totalEmployees: payrolls.length,
//             totalGross: payrolls.reduce((sum, p) => sum + (Number(p.grossSalary) || 0), 0),
//             totalDeductions: payrolls.reduce((sum, p) => sum + (Number(p.totalDeductions) || 0), 0),
//             totalNet: payrolls.reduce((sum, p) => sum + (Number(p.netSalary) || 0), 0),
//             paidCount: payrolls.filter((p) => p.status === "paid").length,
//             pendingCount: payrolls.filter((p) => p.status !== "paid").length,
//         };

//         return res.status(200).json(summary);
//     } catch (err) {
//         next(err);
//     }
// };

// // @route GET /api/payroll/processing-queue
// exports.getProcessingQueue = async (req, res, next) => {
//     try {
//         const batches = await Payroll.aggregate([
//             {
//                 $match: {
//                     status: { $in: ["draft", "processed"] },
//                 },
//             },
//             {
//                 $group: {
//                     _id: { month: "$month", year: "$year", status: "$status" },
//                     month: { $first: "$month" },
//                     year: { $first: "$year" },
//                     status: { $first: "$status" },
//                     employeeCount: { $sum: 1 },
//                     totalGross: { $sum: "$grossSalary" },
//                     totalDeductions: { $sum: "$totalDeductions" },
//                     totalPayout: { $sum: "$netSalary" },
//                 },
//             },
//             {
//                 $project: {
//                     _id: {
//                         $concat: [
//                             { $toString: "$year" },
//                             "-",
//                             { $toString: "$month" },
//                             "-",
//                             "$status",
//                         ],
//                     },
//                     period: {
//                         $concat: [
//                             { $toString: "$month" },
//                             "/",
//                             { $toString: "$year" },
//                         ],
//                     },
//                     month: 1,
//                     year: 1,
//                     status: 1,
//                     employeeCount: 1,
//                     totalGross: 1,
//                     totalDeductions: 1,
//                     totalPayout: 1,
//                 },
//             },
//             { $sort: { year: -1, month: -1 } },
//         ]);

//         return res.status(200).json(batches || []);
//     } catch (err) {
//         next(err);
//     }
// };

// // @route POST /api/payroll/disburse/:batchId
// exports.disburseBatch = async (req, res, next) => {
//     try {
//         const { batchId } = req.params;
//         const parts = batchId.split("-");
//         const year = Number(parts[0]);
//         const month = Number(parts[1]);

//         if (isNaN(year) || isNaN(month)) {
//             return res.status(400).json({ message: "Invalid batch identifier format." });
//         }
//         const affected = await Payroll.find({ year, month, status: { $in: ["draft", "processed"] } }).select("employee month year").lean();

//         const updated = await Payroll.updateMany(
//             {
//                 year,
//                 month,
//                 status: { $in: ["draft", "processed"] },
//             },
//             {
//                 $set: {
//                     status: "paid",
//                     paidOn: new Date(),
//                 },
//             }
//         );
//         await Promise.all(affected.map((p) => notifyPayroll(p, "paid")));

//         return res.status(200).json({
//             success: true,
//             message: `${updated.modifiedCount} payroll records successfully disbursed and marked as paid.`,
//             modifiedCount: updated.modifiedCount,
//         });
//     } catch (err) {
//         next(err);
//     }
// };

// // @route GET /api/payroll/payslips
// exports.getPayslipsList = async (req, res, next) => {
//     try {
//         const { month, year, employee } = req.query;
//         const filter = { status: { $in: ["paid", "processed"] } };

//         if (month && month !== "ALL") filter.month = Number(month);
//         if (year && year !== "ALL") filter.year = Number(year);
//         if (employee && employee !== "ALL") filter.employee = employee;

//         const payslips = await Payroll.find(filter)
//             .populate("employee", "name employeeId department designation email dateOfJoining")
//             .sort({ year: -1, month: -1, createdAt: -1 });

//         const formatted = payslips.map((p) => {
//             const allowancesObj =
//                 p.allowances instanceof Map
//                     ? Object.fromEntries(p.allowances)
//                     : p.allowances || {};
//             const deductionsObj =
//                 p.deductions instanceof Map
//                     ? Object.fromEntries(p.deductions)
//                     : p.deductions || {};

//             const slipCode = String(p._id).slice(-4).toUpperCase();
//             const monthPadded = String(p.month).padStart(2, "0");

//             return {
//                 _id: p._id,
//                 slipNumber: `PAY-${p.year}-${monthPadded}-${slipCode}`,
//                 employee: p.employee,
//                 period: `${monthPadded}/${p.year}`,
//                 month: p.month,
//                 year: p.year,
//                 basicSalary: p.basicSalary || 0,
//                 allowances: allowancesObj,
//                 deductions: deductionsObj,
//                 bonus: p.bonus || 0,
//                 overtimePay: p.overtimePay || 0,
//                 grossSalary: p.grossSalary || 0,
//                 totalDeductions: p.totalDeductions || 0,
//                 netSalary: p.netSalary || 0,
//                 status: p.status,
//                 paidOn: p.paidOn,
//                 daysPresent: p.daysPresent || 0,
//                 daysOnLeave: p.daysOnLeave || 0,
//             };
//         });

//         return res.status(200).json(formatted);
//     } catch (err) {
//         next(err);
//     }
// };

// // @route PUT /api/payroll/reimbursements/:id
// exports.updateReimbursement = async (req, res, next) => {
//     try {
//         const { employeeId, category, amount, billDate, description, receiptUrl } = req.body;

//         const item = await Reimbursement.findById(req.params.id);
//         if (!item) {
//             return res.status(404).json({ message: "Reimbursement record nahi mila." });
//         }

//         const updateData = {};
//         if (employeeId) updateData.employee = employeeId;
//         if (category) updateData.category = category;
//         if (amount !== undefined) updateData.amount = Number(amount);
//         if (billDate) updateData.billDate = billDate;
//         if (description !== undefined) updateData.description = description.trim();
//         if (receiptUrl !== undefined) updateData.receiptUrl = receiptUrl.trim();

//         const updatedItem = await Reimbursement.findByIdAndUpdate(
//             req.params.id,
//             updateData,
//             { new: true, runValidators: true }
//         ).populate("employee", "name employeeId department designation email");

//         return res.status(200).json(updatedItem);
//     } catch (err) {
//         next(err);
//     }
// };


// exports.deletePayroll = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const deleted = await Payroll.findByIdAndDelete(id);

//         if (!deleted) {
//             return res.status(404).json({ message: "Payslip record not found in database" });
//         }

//         return res.status(200).json({ success: true, message: "Payslip deleted successfully" });
//     } catch (error) {
//         console.error("Delete payroll error:", error);
//         return res.status(500).json({ message: "Server error deleting payslip", error: error.message });
//     }
// };