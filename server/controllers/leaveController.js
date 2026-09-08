const Leave = require("../models/Leave");

// Helper: Safely calculate days between dates
const calculateDays = (start, end) => {
    const startDate = new Date(start);
    const endDate = new Date(end);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error("Invalid start or end date provided.");
    }

    const diffTime = endDate.getTime() - startDate.getTime();
    if (diffTime < 0) {
        throw new Error("End date start date se pehle nahi ho sakti.");
    }

    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
};

// @route GET /api/leave?employee=&status=&leaveType=
exports.getLeaves = async (req, res, next) => {
    try {
        const { employee, status, leaveType } = req.query;
        const filter = {};

        if (employee) filter.employee = employee;
        if (status) filter.status = status;
        if (leaveType) filter.leaveType = leaveType;

        const leaves = await Leave.find(filter)
            .populate("employee", "name employeeId department email")
            .populate("approvedBy", "name email")
            .sort({ createdAt: -1 });

        return res.status(200).json(leaves);
    } catch (err) {
        next(err);
    }
};

// @route POST /api/leave/apply
exports.applyLeave = async (req, res, next) => {
    try {
        const { leaveType, startDate, endDate, reason } = req.body;

        // Employee ID fallback: prefer logged-in auth user, fallback to body
        const employee = req.user?.employee || req.user?._id || req.body.employee;

        if (!employee) {
            return res.status(400).json({ message: "Employee ID provide karna zaroori hai." });
        }

        if (!startDate || !endDate || !leaveType) {
            return res.status(400).json({ message: "Leave type, start date, aur end date required hain." });
        }

        const totalDays = calculateDays(startDate, endDate);

        const leave = await Leave.create({
            employee,
            leaveType,
            startDate,
            endDate,
            totalDays,
            reason,
            status: "pending",
        });

        const populatedLeave = await Leave.findById(leave._id)
            .populate("employee", "name employeeId department");

        return res.status(201).json(populatedLeave);
    } catch (err) {
        next(err);
    }
};

// @route PUT /api/leave/:id/approve
exports.approveLeave = async (req, res, next) => {
    try {
        // Auth token se approver lein taaki frontend par depend na hona pade
        const approverId = req.user?.employee || req.user?._id || req.body.approvedBy;

        const leave = await Leave.findByIdAndUpdate(
            req.params.id,
            {
                status: "approved",
                approvedBy: approverId,
                approvedOn: new Date(),
            },
            { new: true }
        )
            .populate("employee", "name employeeId department email")
            .populate("approvedBy", "name");

        if (!leave) {
            return res.status(404).json({ message: "Leave request nahi mili." });
        }

        return res.status(200).json(leave);
    } catch (err) {
        next(err);
    }
};

// @route PUT /api/leave/:id/reject
exports.rejectLeave = async (req, res, next) => {
    try {
        const approverId = req.user?.employee || req.user?._id || req.body.approvedBy;
        const reason = req.body.rejectionReason?.trim() || "Rejected by administrator";

        const leave = await Leave.findByIdAndUpdate(
            req.params.id,
            {
                status: "rejected",
                approvedBy: approverId,
                approvedOn: new Date(),
                rejectionReason: reason,
            },
            { new: true }
        )
            .populate("employee", "name employeeId department email")
            .populate("approvedBy", "name");

        if (!leave) {
            return res.status(404).json({ message: "Leave request nahi mili." });
        }

        return res.status(200).json(leave);
    } catch (err) {
        next(err);
    }
};

// @route PUT /api/leave/:id/cancel
exports.cancelLeave = async (req, res, next) => {
    try {
        const leave = await Leave.findByIdAndUpdate(
            req.params.id,
            { status: "cancelled" },
            { new: true }
        )
            .populate("employee", "name employeeId department");

        if (!leave) {
            return res.status(404).json({ message: "Leave request nahi mili." });
        }

        return res.status(200).json(leave);
    } catch (err) {
        next(err);
    }
};

// @route GET /api/leave/balance/:employeeId
exports.getLeaveBalance = async (req, res, next) => {
    try {
        const { employeeId } = req.params;
        const year = parseInt(req.query.year) || new Date().getFullYear();

        // Specific calendar year date range
        const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);
        const endOfYear = new Date(`${year}-12-31T23:59:59.999Z`);

        const approvedLeaves = await Leave.find({
            employee: employeeId,
            status: "approved",
            startDate: { $gte: startOfYear, $lte: endOfYear }
        });

        const usedByType = {};
        approvedLeaves.forEach((l) => {
            usedByType[l.leaveType] = (usedByType[l.leaveType] || 0) + (l.totalDays || 0);
        });

        const allotted = {
            sick: 12,
            casual: 12,
            earned: 15,
            maternity: 180,
            paternity: 15,
            unpaid: 0,
        };

        const balance = Object.keys(allotted).map((type) => {
            const used = usedByType[type] || 0;
            const total = allotted[type];
            return {
                leaveType: type,
                allotted: total,
                used,
                remaining: total === 0 ? 0 : Math.max(0, total - used),
            };
        });

        return res.status(200).json(balance);
    } catch (err) {
        next(err);
    }
};