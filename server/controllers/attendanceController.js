const Attendance = require("../models/Attendance");
const ActivityLog = require("../models/ActivityLog");

// Helper: Date ka time zero karne ke liye (Pure din ki exact matching ke liye)
const getNormalizedDate = (dateInput = new Date()) => {
    const d = new Date(dateInput);
    d.setHours(0, 0, 0, 0);
    return d;
};

// @route POST /api/attendance/mark
exports.markAttendance = async (req, res, next) => {
    try {
        const { status, checkInTime, notes, employee } = req.body;
        const targetEmployee = employee || req.user?.employee || req.user?.id;

        // Date ko properly normalize karein ya selected record date use karein
        const today = getNormalizedDate();

        const cleanStatus = (status || "present").toLowerCase();

        const attendance = await Attendance.findOneAndUpdate(
            { employee: targetEmployee, date: today },
            {
                employee: targetEmployee,
                date: today,
                status: cleanStatus,
                checkIn: checkInTime ? new Date(checkInTime) : new Date(),
                isLate: cleanStatus === "late",
                notes: notes || ""
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        try {
            await ActivityLog.create({
                user: req.user?.id || targetEmployee,
                action: `Marked attendance as ${cleanStatus}`,
                module: "Attendance",
            });
        } catch (logErr) {
            console.error("Failed to save activity log:", logErr);
        }

        res.status(201).json({
            success: true,
            message: "Attendance status updated successfully",
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
        if (status && status !== 'ALL') filter.status = status.toLowerCase();

        if (date) {
            const start = new Date(date);
            start.setHours(0, 0, 0, 0);
            const end = new Date(date);
            end.setHours(23, 59, 59, 999);
            filter.date = { $gte: start, $lte: end };
        } else if (month && year) {
            filter.date = {
                $gte: new Date(year, month - 1, 1, 0, 0, 0),
                $lte: new Date(year, month, 0, 23, 59, 59),
            };
        } else {
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const todayEnd = new Date(todayStart);
            todayEnd.setHours(23, 59, 59, 999);
            filter.date = { $gte: todayStart, $lte: todayEnd };
        }

        let query = Attendance.find(filter).sort({ date: -1 });

        try {
            query = query.populate("employee", "employeeId name department role");
        } catch (popErr) {
            console.log("Population skipped:", popErr.message);
        }

        const records = await query;
        res.json(records);
    } catch (err) {
        next(err);
    }
};

// @route GET /api/attendance/reports
exports.getAttendanceReports = async (req, res, next) => {
    try {
        const { startDate, endDate, department, status } = req.query;
        let query = {};

        if (startDate && endDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            query.date = { $gte: start, $lte: end };
        }

        if (status && status !== 'ALL') {
            query.status = status.toLowerCase();
        }

        let attendanceRecords = await Attendance.find(query)
            .populate("employee", "employeeId name department role")
            .sort({ date: -1 });

        // Department filter logic
        if (department && department !== 'ALL') {
            attendanceRecords = attendanceRecords.filter(item =>
                item.employee?.department?.toUpperCase() === department.toUpperCase()
            );
        }

        // Map data to match exact frontend expectations
        const formattedReports = attendanceRecords.map(item => ({
            _id: item._id,
            userId: item.employee?.employeeId || item.employee?._id?.slice(-6) || "N/A",
            userName: item.employee?.name || "Staff Member",
            department: item.employee?.department || "N/A",
            date: item.date ? new Date(item.date).toISOString().slice(0, 10) : "",
            checkIn: item.checkIn ? new Date(item.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
            checkOut: item.checkOut ? new Date(item.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
            hours: item.workHours ? `${item.workHours}` : '',
            status: item.status || 'present'
        }));

        res.status(200).json(formattedReports);
    } catch (err) {
        next(err);
    }
};

// @route POST /api/attendance/check-in
exports.checkIn = async (req, res, next) => {
    try {
        const { employee } = req.body;
        if (!employee) {
            return res.status(400).json({ message: "Employee ID is required for check-in" });
        }

        const today = getNormalizedDate();

        const existing = await Attendance.findOne({ employee, date: today });
        if (existing) {
            return res.status(400).json({ message: "Already checked in today" });
        }

        const now = new Date();
        const officeStart = new Date();
        officeStart.setHours(9, 30, 0, 0);

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
        if (!employee) {
            return res.status(400).json({ message: "Employee ID is required for check-out" });
        }

        const today = getNormalizedDate();

        const record = await Attendance.findOne({ employee, date: today });
        if (!record) {
            return res.status(404).json({ message: "No check-in found for today. Please check-in first." });
        }

        const now = new Date();
        record.checkOut = now;

        const diffMs = now - new Date(record.checkIn);
        record.workHours = (diffMs / (1000 * 60 * 60)).toFixed(2);

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
                $gte: new Date(year, month - 1, 1, 0, 0, 0),
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