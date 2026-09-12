const Payroll = require("../models/Payroll");
const Employee = require("../models/Employee");
const Attendance = require("../models/Attendance");
const Bonus = require("../models/Bonus");
const Deduction = require("../models/Deduction");
const Loan = require("../models/Loan");
const Reimbursement = require("../models/Reimbursement");
const TaxProfile = require("../models/TaxProfile");
const EmployeeSalary = require("../models/EmployeeSalary");


// @route GET /api/payroll/reports?month=&year=&department=
exports.getPayrollReports = async (req, res, next) => {
    try {
        const { month, year, department } = req.query;

        if (!month || !year) {
            return res.status(400).json({ message: "Month aur Year filter zaroori hai." });
        }

        const filter = {
            month: Number(month),
            year: Number(year),
        };

        let payrolls = await Payroll.find(filter)
            .populate("employee", "name employeeId department designation")
            .sort({ createdAt: -1 });

        // Department filter
        if (department && department !== "ALL") {
            payrolls = payrolls.filter(
                (p) => p.employee && p.employee.department === department
            );
        }

        const reportData = payrolls.map((p) => {
            const emp = p.employee || {};
            const deductionsObj =
                p.deductions instanceof Map
                    ? Object.fromEntries(p.deductions)
                    : p.deductions || {};

            return {
                _id: p._id,
                userId: emp.employeeId || "—",
                userName: emp.name || "Unknown Staff",
                department: emp.department || "—",
                gross: p.grossSalary || 0,
                bonus: p.bonus || 0,
                deductions: p.totalDeductions || 0,
                tds: deductionsObj.TDS || deductionsObj.tds || 0,
                netPay: p.netSalary || 0,
                status: p.status,
            };
        });

        return res.status(200).json(reportData);
    } catch (err) {
        next(err);
    }
};

// Helper: Slabs calculation for Old vs New Regime
const computeTax = (annualGross, regime, deductions80C = 0, deductions80D = 0, hra = 0) => {
    const standardDeduction = regime === "NEW" ? 75000 : 50000;
    let totalExemptions = standardDeduction;

    if (regime === "OLD") {
        totalExemptions += Math.min(Number(deductions80C) || 0, 150000);
        totalExemptions += Math.min(Number(deductions80D) || 0, 75000);
        totalExemptions += Number(hra) || 0;
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

    const cess = Math.round(tax * 0.04);
    const annualTax = Math.round(tax + cess);
    const monthlyTDS = Math.round(annualTax / 12);

    return {
        taxableIncome,
        totalExemptions,
        annualTax,
        monthlyTDS,
    };
};

// @route GET /api/payroll/tax-tds
exports.getTaxTdsList = async (req, res, next) => {
    try {
        const salaries = await EmployeeSalary.find({ status: "Active" })
            .populate("employee", "name employeeId department designation email pan");

        const taxProfiles = await TaxProfile.find();
        const profileMap = new Map();
        taxProfiles.forEach((p) => profileMap.set(String(p.employee), p));

        const result = salaries.map((sal) => {
            const emp = sal.employee;
            const profile = profileMap.get(String(emp?._id)) || {};

            const regime = profile.regime || "NEW";
            const deductions80C = profile.section80C || 0;
            const deductions80D = profile.section80D || 0;
            const hra = profile.hraExemption || 0;
            const panNumber = profile.panNumber || emp?.pan || "PENDING";

            const annualGross = Number(sal.annualCTC) || (Number(sal.grossMonthly) * 12) || 0;
            const computed = computeTax(annualGross, regime, deductions80C, deductions80D, hra);

            return {
                _id: profile._id || sal._id,
                employee: emp,
                panNumber,
                regime,
                annualGross,
                exemptionsDeclared: computed.totalExemptions,
                section80C: deductions80C,
                section80D: deductions80D,
                taxableIncome: computed.taxableIncome,
                annualTax: computed.annualTax,
                monthlyTDS: computed.monthlyTDS,
            };
        });

        return res.status(200).json(result);
    } catch (err) {
        next(err);
    }
};

// @route POST /api/payroll/tax-tds
exports.upsertTaxProfile = async (req, res, next) => {
    try {
        const { employeeId, regime, panNumber, section80C, section80D, hraExemption, otherExemptions } = req.body;

        if (!employeeId) {
            return res.status(400).json({ message: "Employee selection is mandatory." });
        }

        const updated = await TaxProfile.findOneAndUpdate(
            { employee: employeeId },
            {
                employee: employeeId,
                regime: regime || "NEW",
                panNumber: panNumber ? panNumber.trim().toUpperCase() : "",
                section80C: Number(section80C) || 0,
                section80D: Number(section80D) || 0,
                hraExemption: Number(hraExemption) || 0,
                otherExemptions: Number(otherExemptions) || 0,
            },
            { upsert: true, new: true, runValidators: true }
        ).populate("employee", "name employeeId department designation email");

        return res.status(200).json(updated);
    } catch (err) {
        next(err);
    }
};

// @route GET /api/payroll/reimbursements
exports.getReimbursements = async (req, res, next) => {
    try {
        const { status, employee } = req.query;
        const filter = {};

        if (status && status !== "ALL") filter.status = status;
        if (employee && employee !== "ALL") filter.employee = employee;

        const list = await Reimbursement.find(filter)
            .populate("employee", "name employeeId department designation email")
            .sort({ createdAt: -1 });

        return res.status(200).json(list);
    } catch (err) {
        next(err);
    }
};

// @route POST /api/payroll/reimbursements
exports.createReimbursement = async (req, res, next) => {
    try {
        const { employeeId, category, amount, billDate, description, receiptUrl } = req.body;

        if (!employeeId || !category || !amount) {
            return res.status(400).json({ message: "Employee, category, aur amount required hain." });
        }

        const item = await Reimbursement.create({
            employee: employeeId,
            category,
            amount: Number(amount),
            billDate: billDate || new Date(),
            description: description ? description.trim() : "",
            receiptUrl: receiptUrl || "",
            status: "PENDING",
        });

        const populated = await Reimbursement.findById(item._id).populate(
            "employee",
            "name employeeId department designation email"
        );

        return res.status(201).json(populated);
    } catch (err) {
        next(err);
    }
};

// @route PUT /api/payroll/reimbursements/:id/status
exports.updateReimbursementStatus = async (req, res, next) => {
    try {
        const { status } = req.body;
        const item = await Reimbursement.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        ).populate("employee", "name employeeId department designation email");

        if (!item) {
            return res.status(404).json({ message: "Reimbursement record nahi mila." });
        }

        return res.status(200).json(item);
    } catch (err) {
        next(err);
    }
};

// @route DELETE /api/payroll/reimbursements/:id
exports.deleteReimbursement = async (req, res, next) => {
    try {
        const item = await Reimbursement.findByIdAndDelete(req.params.id);
        if (!item) {
            return res.status(404).json({ message: "Reimbursement record nahi mila." });
        }
        return res.status(200).json({ message: "Reimbursement deleted successfully." });
    } catch (err) {
        next(err);
    }
};

// @route GET /api/payroll/loans?status=&employee=
exports.getLoans = async (req, res, next) => {
    try {
        const { status, employee } = req.query;
        const filter = {};

        if (status && status !== "ALL") filter.status = status;
        if (employee && employee !== "ALL") filter.employee = employee;

        const loans = await Loan.find(filter)
            .populate("employee", "name employeeId department designation email")
            .sort({ createdAt: -1 });

        return res.status(200).json(loans);
    } catch (err) {
        next(err);
    }
};

// @route POST /api/payroll/loans
exports.createLoan = async (req, res, next) => {
    try {
        const { employeeId, type, amount, emiMonths, reason } = req.body;

        if (!employeeId || !amount || !emiMonths || !reason) {
            return res.status(400).json({ message: "Employee, amount, tenure aur reason mandatory hain." });
        }

        const principal = Number(amount);
        const months = Number(emiMonths) || 1;
        const monthlyEmi = Math.round(principal / months);

        const loan = await Loan.create({
            employee: employeeId,
            type: type || "SALARY_ADVANCE",
            principal,
            emiMonths: months,
            monthlyEmi,
            remainingBalance: principal,
            reason: reason.trim(),
            status: "ACTIVE",
            disbursedDate: new Date(),
        });

        const populated = await Loan.findById(loan._id).populate(
            "employee",
            "name employeeId department designation email"
        );

        return res.status(201).json(populated);
    } catch (err) {
        next(err);
    }
};

// @route PUT /api/payroll/loans/:id
exports.updateLoan = async (req, res, next) => {
    try {
        const loan = await Loan.findById(req.params.id);
        if (!loan) {
            return res.status(404).json({ message: "Loan record nahi mila." });
        }

        const updateData = { ...req.body };
        if (updateData.amount || updateData.emiMonths) {
            const principal = Number(updateData.amount) || loan.principal;
            const months = Number(updateData.emiMonths) || loan.emiMonths;
            updateData.principal = principal;
            updateData.emiMonths = months;
            updateData.monthlyEmi = Math.round(principal / months);
            updateData.remainingBalance = principal;
        }

        const updatedLoan = await Loan.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        ).populate("employee", "name employeeId department designation email");

        return res.status(200).json(updatedLoan);
    } catch (err) {
        next(err);
    }
};

// @route PUT /api/payroll/loans/:id/status
exports.updateLoanStatus = async (req, res, next) => {
    try {
        const { status } = req.body;
        const loan = await Loan.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        ).populate("employee", "name employeeId department designation email");

        if (!loan) {
            return res.status(404).json({ message: "Loan record nahi mila." });
        }

        return res.status(200).json(loan);
    } catch (err) {
        next(err);
    }
};

// @route DELETE /api/payroll/loans/:id
exports.deleteLoan = async (req, res, next) => {
    try {
        const loan = await Loan.findByIdAndDelete(req.params.id);
        if (!loan) {
            return res.status(404).json({ message: "Loan record nahi mila." });
        }
        return res.status(200).json({ message: "Loan record deleted successfully." });
    } catch (err) {
        next(err);
    }
};

// @route GET /api/payroll/deductions?month=&year=&employee=
exports.getDeductions = async (req, res, next) => {
    try {
        const { month, year, employee } = req.query;
        const filter = {};

        if (month && month !== "ALL") filter.month = Number(month);
        if (year && year !== "ALL") filter.year = Number(year);
        if (employee && employee !== "ALL") filter.employee = employee;

        const deductions = await Deduction.find(filter)
            .populate("employee", "name employeeId department designation email")
            .sort({ year: -1, month: -1, createdAt: -1 });

        return res.status(200).json(deductions);
    } catch (err) {
        next(err);
    }
};

// @route POST /api/payroll/deductions
exports.createDeduction = async (req, res, next) => {
    try {
        const { employeeId, title, amount, month, year, type, remarks } = req.body;

        if (!employeeId || !title || !amount) {
            return res.status(400).json({ message: "Employee, Title, aur Amount mandatory hain." });
        }

        const deduction = await Deduction.create({
            employee: employeeId,
            title: title.trim(),
            amount: Number(amount),
            month: Number(month) || new Date().getMonth() + 1,
            year: Number(year) || new Date().getFullYear(),
            type: type || "LOAN_RECOVERY",
            remarks: remarks ? remarks.trim() : "",
            status: "Pending",
        });

        const populated = await Deduction.findById(deduction._id).populate(
            "employee",
            "name employeeId department designation email"
        );

        return res.status(201).json(populated);
    } catch (err) {
        next(err);
    }
};

// @route DELETE /api/payroll/deductions/:id
exports.deleteDeduction = async (req, res, next) => {
    try {
        const deduction = await Deduction.findByIdAndDelete(req.params.id);
        if (!deduction) {
            return res.status(404).json({ message: "Deduction record nahi mila." });
        }
        return res.status(200).json({ message: "Deduction record successfully removed." });
    } catch (err) {
        next(err);
    }
};

// @route GET /api/payroll/bonuses?month=&year=&employee=
exports.getBonuses = async (req, res, next) => {
    try {
        const { month, year, employee } = req.query;
        const filter = {};

        if (month && month !== "ALL") filter.month = Number(month);
        if (year && year !== "ALL") filter.year = Number(year);
        if (employee && employee !== "ALL") filter.employee = employee;

        const bonuses = await Bonus.find(filter)
            .populate("employee", "name employeeId department designation email")
            .sort({ year: -1, month: -1, createdAt: -1 });

        return res.status(200).json(bonuses);
    } catch (err) {
        next(err);
    }
};

// @route POST /api/payroll/bonuses
exports.createBonus = async (req, res, next) => {
    try {
        const { employeeId, title, amount, month, year, type, remarks } = req.body;

        if (!employeeId || !title || !amount) {
            return res.status(400).json({ message: "Employee, Title, aur Amount mandatory hain." });
        }

        const bonus = await Bonus.create({
            employee: employeeId,
            title: title.trim(),
            amount: Number(amount),
            month: Number(month) || new Date().getMonth() + 1,
            year: Number(year) || new Date().getFullYear(),
            type: type || "Performance",
            remarks: remarks ? remarks.trim() : "",
            status: "Approved",
        });

        const populated = await Bonus.findById(bonus._id).populate(
            "employee",
            "name employeeId department designation email"
        );

        return res.status(201).json(populated);
    } catch (err) {
        next(err);
    }
};

// @route DELETE /api/payroll/bonuses/:id
exports.deleteBonus = async (req, res, next) => {
    try {
        const bonus = await Bonus.findByIdAndDelete(req.params.id);
        if (!bonus) {
            return res.status(404).json({ message: "Bonus record nahi mila." });
        }
        return res.status(200).json({ message: "Bonus allocation deleted successfully." });
    } catch (err) {
        next(err);
    }
};

// ==========================================
// EMPLOYEE SALARIES CONTROLLER FUNCTIONS (ADDED)
// ==========================================

// @route GET /api/payroll/employee-salaries
exports.getEmployeeSalaries = async (req, res, next) => {
    try {
        const salaries = await EmployeeSalary.find({})
            .populate("employee", "name employeeId department designation email")
            .sort({ createdAt: -1 });

        return res.status(200).json(salaries);
    } catch (err) {
        next(err);
    }
};

// @route POST /api/payroll/employee-salaries
exports.createEmployeeSalary = async (req, res, next) => {
    try {
        const { employeeId, basicMonthly, grossMonthly, annualCTC, allowances, deductions } = req.body;

        if (!employeeId) {
            return res.status(400).json({ message: "Employee ID dena zaroori hai." });
        }

        const existing = await EmployeeSalary.findOne({ employee: employeeId });
        if (existing) {
            return res.status(400).json({ message: "Is employee ki salary mapping pehle se bani hui hai." });
        }

        const salary = await EmployeeSalary.create({
            employee: employeeId,
            basicMonthly: Number(basicMonthly) || 0,
            grossMonthly: Number(grossMonthly) || 0,
            annualCTC: Number(annualCTC) || 0,
            allowances: allowances || {},
            deductions: deductions || {},
            status: "Active",
        });

        const populated = await EmployeeSalary.findById(salary._id).populate(
            "employee",
            "name employeeId department designation email"
        );

        return res.status(201).json(populated);
    } catch (err) {
        next(err);
    }
};

// @route DELETE /api/payroll/employee-salaries/:id
exports.deleteEmployeeSalary = async (req, res, next) => {
    try {
        const salary = await EmployeeSalary.findByIdAndDelete(req.params.id);
        if (!salary) {
            return res.status(404).json({ message: "Salary mapping record nahi mila." });
        }
        return res.status(200).json({ message: "Salary mapping deleted successfully." });
    } catch (err) {
        next(err);
    }
};

// ==========================================
// EXISTING UPDATE HANDLERS
// ==========================================

// @route PUT /api/payroll/deductions/:id
exports.updateDeduction = async (req, res, next) => {
    try {
        const deduction = await Deduction.findById(req.params.id);
        if (!deduction) {
            return res.status(404).json({ message: "Deduction record nahi mila." });
        }

        const updateData = { ...req.body };
        if (updateData.amount) {
            updateData.amount = Number(updateData.amount);
        }

        const updatedDeduction = await Deduction.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        ).populate("employee", "name employeeId department designation email");

        return res.status(200).json(updatedDeduction);
    } catch (err) {
        next(err);
    }
};

// @route PUT /api/payroll/bonuses/:id
exports.updateBonus = async (req, res, next) => {
    try {
        const bonus = await Bonus.findById(req.params.id);
        if (!bonus) {
            return res.status(404).json({ message: "Bonus record nahi mila." });
        }

        const updateData = { ...req.body };
        if (updateData.amount) {
            updateData.amount = Number(updateData.amount);
        }

        const updatedBonus = await Bonus.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        ).populate("employee", "name employeeId department designation email");

        return res.status(200).json(updatedBonus);
    } catch (err) {
        next(err);
    }
};

// @route PUT /api/payroll/employee-salaries/:id
exports.updateEmployeeSalary = async (req, res, next) => {
    try {
        const salary = await EmployeeSalary.findById(req.params.id);
        if (!salary) {
            return res.status(404).json({ message: "Employee salary mapping record nahi mila." });
        }

        const updatedSalary = await EmployeeSalary.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        ).populate("employee", "name employeeId department designation email");

        return res.status(200).json(updatedSalary);
    } catch (err) {
        next(err);
    }
};

const parseMonthYear = (month, year) => {
    const m = Number(month);
    const y = Number(year);
    if (isNaN(m) || m < 1 || m > 12) {
        throw new Error("Valid month (1-12) provide karna zaroori hai.");
    }
    if (isNaN(y) || y < 2000 || y > 2100) {
        throw new Error("Valid financial year provide karna zaroori hai.");
    }
    return { m, y };
};

// @route GET /api/payroll?month=&year=&employee=&status=
exports.getPayrolls = async (req, res, next) => {
    try {
        const { month, year, employee, status } = req.query;
        const filter = {};

        if (month && month !== "ALL") filter.month = Number(month);
        if (year && year !== "ALL") filter.year = Number(year);
        if (employee && employee !== "ALL") filter.employee = employee;
        if (status && status !== "ALL") filter.status = status.toLowerCase();

        const payrolls = await Payroll.find(filter)
            .populate("employee", "name employeeId department designation email")
            .sort({ year: -1, month: -1, createdAt: -1 });

        return res.status(200).json(payrolls);
    } catch (err) {
        next(err);
    }
};

// @route GET /api/payroll/:id
exports.getPayroll = async (req, res, next) => {
    try {
        const payroll = await Payroll.findById(req.params.id).populate(
            "employee",
            "name employeeId department designation email"
        );
        if (!payroll) {
            return res.status(404).json({ message: "Payroll record nahi mila." });
        }
        return res.status(200).json(payroll);
    } catch (err) {
        next(err);
    }
};

// @route POST /api/payroll/generate
exports.generatePayroll = async (req, res, next) => {
    try {
        const { employee, month, year, allowances, deductions, bonus, overtimePay } = req.body;

        if (!employee) {
            return res.status(400).json({ message: "Employee ID provide karna zaroori hai." });
        }

        const { m, y } = parseMonthYear(month, year);

        const existing = await Payroll.findOne({ employee, month: m, year: y });
        if (existing) {
            return res.status(400).json({ message: `Is employee ka ${m}/${y} ka payroll pehle se bana hua hai.` });
        }

        const emp = await Employee.findById(employee);
        if (!emp) {
            return res.status(404).json({ message: "Employee record nahi mila." });
        }

        const startDate = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
        const endDate = new Date(Date.UTC(y, m, 0, 23, 59, 59));

        const attendanceRecords = await Attendance.find({
            employee,
            date: { $gte: startDate, $lte: endDate },
        });

        const daysPresent = attendanceRecords.filter((r) => r.status?.toLowerCase() === "present").length;
        const daysOnLeave = attendanceRecords.filter((r) => r.status?.toLowerCase() === "on-leave").length;

        const baseSalary = Number(emp.salary) || 0;

        const payroll = await Payroll.create({
            employee,
            month: m,
            year: y,
            basicSalary: baseSalary,
            allowances: allowances || {},
            deductions: deductions || {},
            bonus: Number(bonus) || 0,
            overtimePay: Number(overtimePay) || 0,
            daysPresent,
            daysOnLeave,
            status: "draft",
        });

        const populated = await Payroll.findById(payroll._id).populate(
            "employee",
            "name employeeId department designation email"
        );

        return res.status(201).json(populated);
    } catch (err) {
        next(err);
    }
};

// @route POST /api/payroll/generate-bulk
exports.generateBulkPayroll = async (req, res, next) => {
    try {
        const { month, year, department } = req.body;
        const { m, y } = parseMonthYear(month, year);

        const filter = { status: "active" };
        if (department && department !== "ALL") filter.department = department;

        const employees = await Employee.find(filter);
        if (!employees.length) {
            return res.status(404).json({ message: "Koi active employee nahi mila." });
        }

        const results = { created: [], skipped: [] };
        const startDate = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
        const endDate = new Date(Date.UTC(y, m, 0, 23, 59, 59));

        for (const emp of employees) {
            const exists = await Payroll.findOne({ employee: emp._id, month: m, year: y });
            if (exists) {
                results.skipped.push({ name: emp.name, employeeId: emp.employeeId, reason: "Already generated" });
                continue;
            }

            const attendanceRecords = await Attendance.find({
                employee: emp._id,
                date: { $gte: startDate, $lte: endDate },
            });

            const daysPresent = attendanceRecords.filter((r) => r.status?.toLowerCase() === "present").length;
            const daysOnLeave = attendanceRecords.filter((r) => r.status?.toLowerCase() === "on-leave").length;

            const payroll = await Payroll.create({
                employee: emp._id,
                month: m,
                year: y,
                basicSalary: Number(emp.salary) || 0,
                daysPresent,
                daysOnLeave,
                status: "draft",
            });

            results.created.push(payroll);
        }

        return res.status(201).json({
            success: true,
            message: `${results.created.length} payroll records generated, ${results.skipped.length} skipped.`,
            totalProcessed: results.created.length,
            skippedCount: results.skipped.length,
            results,
        });
    } catch (err) {
        next(err);
    }
};

// @route PUT /api/payroll/:id
exports.updatePayroll = async (req, res, next) => {
    try {
        const payroll = await Payroll.findById(req.params.id);
        if (!payroll) {
            return res.status(404).json({ message: "Payroll record nahi mila." });
        }

        if (payroll.status === "paid") {
            return res.status(400).json({ message: "Paid payroll ko edit nahi kiya ja sakta." });
        }

        Object.assign(payroll, req.body);
        await payroll.save();

        const updated = await Payroll.findById(payroll._id).populate(
            "employee",
            "name employeeId department designation email"
        );

        return res.status(200).json(updated);
    } catch (err) {
        next(err);
    }
};

// @route PUT /api/payroll/:id/process
exports.processPayroll = async (req, res, next) => {
    try {
        const payroll = await Payroll.findByIdAndUpdate(
            req.params.id,
            { status: "processed" },
            { new: true }
        ).populate("employee", "name employeeId department designation email");

        if (!payroll) {
            return res.status(404).json({ message: "Payroll record nahi mila." });
        }
        return res.status(200).json(payroll);
    } catch (err) {
        next(err);
    }
};

// @route PUT /api/payroll/:id/mark-paid
exports.markAsPaid = async (req, res, next) => {
    try {
        const payroll = await Payroll.findByIdAndUpdate(
            req.params.id,
            { status: "paid", paidOn: new Date() },
            { new: true }
        ).populate("employee", "name employeeId department designation email");

        if (!payroll) {
            return res.status(404).json({ message: "Payroll record nahi mila." });
        }
        return res.status(200).json(payroll);
    } catch (err) {
        next(err);
    }
};

// @route GET /api/payroll/payslip/:id
exports.getPayslip = async (req, res, next) => {
    try {
        const payroll = await Payroll.findById(req.params.id).populate(
            "employee",
            "name employeeId email designation department dateOfJoining"
        );
        if (!payroll) {
            return res.status(404).json({ message: "Payslip record nahi mila." });
        }

        const allowancesObj = payroll.allowances instanceof Map
            ? Object.fromEntries(payroll.allowances)
            : (payroll.allowances || {});

        const deductionsObj = payroll.deductions instanceof Map
            ? Object.fromEntries(payroll.deductions)
            : (payroll.deductions || {});

        return res.status(200).json({
            employee: payroll.employee,
            period: `${payroll.month}/${payroll.year}`,
            earnings: {
                basic: payroll.basicSalary || 0,
                ...allowancesObj,
                bonus: payroll.bonus || 0,
                overtime: payroll.overtimePay || 0,
            },
            deductions: deductionsObj,
            grossSalary: payroll.grossSalary || 0,
            totalDeductions: payroll.totalDeductions || 0,
            netSalary: payroll.netSalary || 0,
            status: payroll.status,
            paidOn: payroll.paidOn,
            attendance: {
                present: payroll.daysPresent || 0,
                leave: payroll.daysOnLeave || 0,
            },
        });
    } catch (err) {
        next(err);
    }
};

// @route GET /api/payroll/summary
exports.getPayrollSummary = async (req, res, next) => {
    try {
        const { month, year } = req.query;
        if (!month || !year) {
            return res.status(400).json({ message: "Month aur Year provide karna zaroori hai." });
        }

        const { m, y } = parseMonthYear(month, year);
        const payrolls = await Payroll.find({ month: m, year: y });

        const summary = {
            totalEmployees: payrolls.length,
            totalGross: payrolls.reduce((sum, p) => sum + (Number(p.grossSalary) || 0), 0),
            totalDeductions: payrolls.reduce((sum, p) => sum + (Number(p.totalDeductions) || 0), 0),
            totalNet: payrolls.reduce((sum, p) => sum + (Number(p.netSalary) || 0), 0),
            paidCount: payrolls.filter((p) => p.status === "paid").length,
            pendingCount: payrolls.filter((p) => p.status !== "paid").length,
        };

        return res.status(200).json(summary);
    } catch (err) {
        next(err);
    }
};

// @route GET /api/payroll/processing-queue
exports.getProcessingQueue = async (req, res, next) => {
    try {
        const batches = await Payroll.aggregate([
            {
                $match: {
                    status: { $in: ["draft", "processed"] },
                },
            },
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
                    _id: {
                        $concat: [
                            { $toString: "$year" },
                            "-",
                            { $toString: "$month" },
                            "-",
                            "$status",
                        ],
                    },
                    period: {
                        $concat: [
                            { $toString: "$month" },
                            "/",
                            { $toString: "$year" },
                        ],
                    },
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

// @route POST /api/payroll/disburse/:batchId
exports.disburseBatch = async (req, res, next) => {
    try {
        const { batchId } = req.params;
        const parts = batchId.split("-");
        const year = Number(parts[0]);
        const month = Number(parts[1]);

        if (isNaN(year) || isNaN(month)) {
            return res.status(400).json({ message: "Invalid batch identifier format." });
        }

        const updated = await Payroll.updateMany(
            {
                year,
                month,
                status: { $in: ["draft", "processed"] },
            },
            {
                $set: {
                    status: "paid",
                    paidOn: new Date(),
                },
            }
        );

        return res.status(200).json({
            success: true,
            message: `${updated.modifiedCount} payroll records successfully disbursed and marked as paid.`,
            modifiedCount: updated.modifiedCount,
        });
    } catch (err) {
        next(err);
    }
};

// @route GET /api/payroll/payslips
exports.getPayslipsList = async (req, res, next) => {
    try {
        const { month, year, employee } = req.query;
        const filter = { status: { $in: ["paid", "processed"] } };

        if (month && month !== "ALL") filter.month = Number(month);
        if (year && year !== "ALL") filter.year = Number(year);
        if (employee && employee !== "ALL") filter.employee = employee;

        const payslips = await Payroll.find(filter)
            .populate("employee", "name employeeId department designation email dateOfJoining")
            .sort({ year: -1, month: -1, createdAt: -1 });

        const formatted = payslips.map((p) => {
            const allowancesObj =
                p.allowances instanceof Map
                    ? Object.fromEntries(p.allowances)
                    : p.allowances || {};
            const deductionsObj =
                p.deductions instanceof Map
                    ? Object.fromEntries(p.deductions)
                    : p.deductions || {};

            const slipCode = String(p._id).slice(-4).toUpperCase();
            const monthPadded = String(p.month).padStart(2, "0");

            return {
                _id: p._id,
                slipNumber: `PAY-${p.year}-${monthPadded}-${slipCode}`,
                employee: p.employee,
                period: `${monthPadded}/${p.year}`,
                month: p.month,
                year: p.year,
                basicSalary: p.basicSalary || 0,
                allowances: allowancesObj,
                deductions: deductionsObj,
                bonus: p.bonus || 0,
                overtimePay: p.overtimePay || 0,
                grossSalary: p.grossSalary || 0,
                totalDeductions: p.totalDeductions || 0,
                netSalary: p.netSalary || 0,
                status: p.status,
                paidOn: p.paidOn,
                daysPresent: p.daysPresent || 0,
                daysOnLeave: p.daysOnLeave || 0,
            };
        });

        return res.status(200).json(formatted);
    } catch (err) {
        next(err);
    }
};

// @route PUT /api/payroll/reimbursements/:id
exports.updateReimbursement = async (req, res, next) => {
    try {
        const { employeeId, category, amount, billDate, description, receiptUrl } = req.body;

        const item = await Reimbursement.findById(req.params.id);
        if (!item) {
            return res.status(404).json({ message: "Reimbursement record nahi mila." });
        }

        const updateData = {};
        if (employeeId) updateData.employee = employeeId;
        if (category) updateData.category = category;
        if (amount !== undefined) updateData.amount = Number(amount);
        if (billDate) updateData.billDate = billDate;
        if (description !== undefined) updateData.description = description.trim();
        if (receiptUrl !== undefined) updateData.receiptUrl = receiptUrl.trim();

        const updatedItem = await Reimbursement.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        ).populate("employee", "name employeeId department designation email");

        return res.status(200).json(updatedItem);
    } catch (err) {
        next(err);
    }
};