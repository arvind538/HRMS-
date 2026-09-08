const Employee = require("../models/Employee");
const Attendance = require("../models/Attendance");
const Leave = require("../models/Leave");
const Payroll = require("../models/Payroll");
const Candidate = require("../models/Candidate");

exports.getEmployeeReport = async (req, res, next) => {
    try {
        const employees = await Employee.find().populate("department", "name");

        const byDepartment = {};
        employees.forEach((e) => {
            const dept = e.department?.name || "Unassigned";
            byDepartment[dept] = (byDepartment[dept] || 0) + 1;
        });

        res.json({
            totalEmployees: employees.length,
            activeEmployees: employees.filter((e) => e.status === "active").length,
            exitedEmployees: employees.filter((e) => e.status === "exit").length,
            byDepartment,
        });
    } catch (err) {
        next(err);
    }
};

exports.getAttendanceReport = async (req, res, next) => {
    try {
        const { month, year } = req.query;
        const filter = {};
        if (month && year) {
            filter.date = {
                $gte: new Date(year, month - 1, 1),
                $lte: new Date(year, month, 0, 23, 59, 59),
            };
        }

        const records = await Attendance.find(filter);
        res.json({
            totalRecords: records.length,
            present: records.filter((r) => r.status === "present").length,
            absent: records.filter((r) => r.status === "absent").length,
            late: records.filter((r) => r.isLate).length,
            avgWorkHours:
                records.reduce((sum, r) => sum + (r.workHours || 0), 0) / (records.length || 1),
        });
    } catch (err) {
        next(err);
    }
};

exports.getLeaveReport = async (req, res, next) => {
    try {
        const { year } = req.query;
        const filter = {};
        if (year) {
            filter.startDate = { $gte: new Date(year, 0, 1), $lte: new Date(year, 11, 31) };
        }

        const leaves = await Leave.find(filter);
        const byType = {};
        leaves.forEach((l) => {
            byType[l.leaveType] = (byType[l.leaveType] || 0) + l.totalDays;
        });

        res.json({
            totalRequests: leaves.length,
            approved: leaves.filter((l) => l.status === "approved").length,
            rejected: leaves.filter((l) => l.status === "rejected").length,
            byType,
        });
    } catch (err) {
        next(err);
    }
};

exports.getPayrollReport = async (req, res, next) => {
    try {
        const { year } = req.query;
        const filter = {};
        if (year) filter.year = Number(year);

        const payrolls = await Payroll.find(filter);
        const monthlyTotals = {};
        payrolls.forEach((p) => {
            monthlyTotals[p.month] = (monthlyTotals[p.month] || 0) + p.netSalary;
        });

        res.json({
            totalPayrollCost: payrolls.reduce((sum, p) => sum + p.netSalary, 0),
            monthlyTotals,
        });
    } catch (err) {
        next(err);
    }
};

exports.getRecruitmentReport = async (req, res, next) => {
    try {
        const candidates = await Candidate.find();
        const byStatus = {};
        candidates.forEach((c) => {
            byStatus[c.status] = (byStatus[c.status] || 0) + 1;
        });

        res.json({
            totalCandidates: candidates.length,
            hired: candidates.filter((c) => c.status === "hired").length,
            byStatus,
        });
    } catch (err) {
        next(err);
    }
};