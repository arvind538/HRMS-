const Attendance = require("../models/Attendance");
const ActivityLog = require("../models/ActivityLog"); // ✅ ActivityLog import kiya

exports.markAttendance = async (req, res, next) => {
    try {
        // 1. Aapka jo bhi original attendance data/logic hai wo yahan rahega
        const { status, checkInTime, notes } = req.body;

        // Example check ya creation jo aapke project mein pehle se hai:
        const attendance = await Attendance.create({
            employee: req.user.employee || req.user.id, // jo bhi field aapke model mein ho
            status: status || "Present",
            checkInTime: checkInTime || new Date(),
            notes: notes || ""
        });

        // 2. ✅ Activity Log safely save karein (is se error nahi aayegi)
        try {
            await ActivityLog.create({
                user: req.user.id,
                action: `Marked attendance as ${status || "Present"}`,
                module: "Attendance",
            });
        } catch (logErr) {
            console.error("Failed to save activity log:", logErr);
        }

        res.status(201).json({
            success: true,
            message: "Attendance marked successfully",
            attendance,
        });
    } catch (err) {
        next(err);
    }
};
// @route GET /api/attendance?date=&employee=&status=
exports.getAttendance = async (req, res, next) => {
    try {
        const { date, employee, month, year, status } = req.query;
        const filter = {};

        if (employee) filter.employee = employee;
        if (status) filter.status = status;
        if (date) {
            const start = new Date(date);
            const end = new Date(date);
            end.setHours(23, 59, 59, 999);
            filter.date = { $gte: start, $lte: end };
        } else if (month && year) {
            filter.date = {
                $gte: new Date(year, month - 1, 1),
                $lte: new Date(year, month, 0, 23, 59, 59),
            };
        }

        const records = await Attendance.find(filter)
            .populate("employee", "name employeeId department")
            .sort({ date: -1 });

        res.json(records);
    } catch (err) {
        next(err);
    }
};

// @route POST /api/attendance/check-in
exports.checkIn = async (req, res, next) => {
    try {
        const { employee } = req.body;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const existing = await Attendance.findOne({ employee, date: today });
        if (existing) return res.status(400).json({ message: "Already checked in today" });

        const now = new Date();
        const officeStart = new Date();
        officeStart.setHours(9, 30, 0, 0); // office start time 9:30 AM — settings se aayega

        const record = await Attendance.create({
            employee,
            date: today,
            checkIn: now,
            status: "present",
            isLate: now > officeStart,
        });

        res.status(201).json(record);
    } catch (err) {
        next(err);
    }
};

// @route PUT /api/attendance/check-out
exports.checkOut = async (req, res, next) => {
    try {
        const { employee } = req.body;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const record = await Attendance.findOne({ employee, date: today });
        if (!record) return res.status(404).json({ message: "No check-in found for today" });

        const now = new Date();
        record.checkOut = now;
        record.workHours = ((now - record.checkIn) / (1000 * 60 * 60)).toFixed(2);

        const officeEnd = new Date();
        officeEnd.setHours(18, 30, 0, 0);
        record.isEarlyLeaving = now < officeEnd;

        await record.save();
        res.json(record);
    } catch (err) {
        next(err);
    }
};

// @route POST /api/attendance/regularize
exports.regularizeAttendance = async (req, res, next) => {
    try {
        const { id, checkIn, checkOut, remarks } = req.body;
        const record = await Attendance.findByIdAndUpdate(
            id,
            { checkIn, checkOut, remarks, status: "present" },
            { new: true }
        );
        res.json(record);
    } catch (err) {
        next(err);
    }
};

// @route GET /api/attendance/summary/:employeeId
exports.getAttendanceSummary = async (req, res, next) => {
    try {
        const { month, year } = req.query;
        const filter = { employee: req.params.employeeId };

        if (month && year) {
            filter.date = {
                $gte: new Date(year, month - 1, 1),
                $lte: new Date(year, month, 0, 23, 59, 59),
            };
        }

        const records = await Attendance.find(filter);
        const summary = {
            present: records.filter((r) => r.status === "present").length,
            absent: records.filter((r) => r.status === "absent").length,
            late: records.filter((r) => r.isLate).length,
            onLeave: records.filter((r) => r.status === "on-leave").length,
            totalOvertimeHours: records.reduce((sum, r) => sum + (r.overtimeHours || 0), 0),
        };

        res.json(summary);
    } catch (err) {
        next(err);
    }
};