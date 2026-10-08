const Attendance = require("../models/Attendance");
const ActivityLog = require("../models/ActivityLog");

// Helper: Date ka time zero karne ke liye (Pure din ki exact matching ke liye)
const getNormalizedDate = (dateInput = new Date()) => {
    const d = new Date(dateInput);
    d.setHours(0, 0, 0, 0);
    return d;
};

// Helper: text clean karne ke liye (fake default kabhi nahi lagayenge)
const cleanText = (value) => (typeof value === "string" ? value.trim() : "");

// Helper: valid {lat, lng} object banane ke liye, warna undefined
const pickCoords = (coords) => {
    if (!coords) return undefined;
    const lat = Number(coords.lat);
    const lng = Number(coords.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
    return { lat, lng };
};

// @route POST /api/attendance/mark
exports.markAttendance = async (req, res, next) => {
    try {
        const {
            status,
            checkInTime,
            notes,
            employee,
            inLocation,
            inCoordinates,
            location,
        } = req.body;
        const targetEmployee = employee || req.user?.employee || req.user?.id;

        if (!targetEmployee) {
            return res.status(400).json({ message: "Employee ID is missing. Please log in again." });
        }

        const today = getNormalizedDate();
        const cleanStatus = (status || "present").toLowerCase();

        const update = {
            employee: targetEmployee,
            date: today,
            status: cleanStatus,
            checkIn: checkInTime ? new Date(checkInTime) : new Date(),
            isLate: cleanStatus === "late",
            notes: notes || "",
        };

        // Location sirf tab set hogi jab frontend se aayi ho (purana data overwrite nahi hoga)
        const cleanedIn = cleanText(inLocation);
        if (cleanedIn) update.inLocation = cleanedIn;

        const coords = pickCoords(inCoordinates || location);
        if (coords) update.inCoordinates = coords;

        let attendance = await Attendance.findOneAndUpdate(
            { employee: targetEmployee, date: today },
            { $set: update },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        attendance = await attendance.populate("employee", "employeeId name department role");

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
        if (status && status !== "ALL") filter.status = status.toLowerCase();

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

        const records = await Attendance.find(filter)
            .populate("employee", "employeeId name department role")
            .sort({ date: -1 });

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

        if (status && status !== "ALL") {
            query.status = status.toLowerCase();
        }

        let attendanceRecords = await Attendance.find(query)
            .populate("employee", "employeeId name department role")
            .sort({ date: -1 });

        if (department && department !== "ALL") {
            attendanceRecords = attendanceRecords.filter(
                (item) => item.employee?.department?.toUpperCase() === department.toUpperCase()
            );
        }

        const formattedReports = attendanceRecords.map((item) => ({
            _id: item._id,
            userId: item.employee?.employeeId || item.employee?._id?.toString().slice(-6) || "N/A",
            userName: item.employee?.name || "Staff Member",
            department: item.employee?.department || "N/A",
            date: item.date ? new Date(item.date).toISOString().slice(0, 10) : "",
            checkIn: item.checkIn
                ? new Date(item.checkIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                : "",
            checkOut: item.checkOut
                ? new Date(item.checkOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                : "",
            inLocation: item.inLocation || "—",
            outLocation: item.outLocation || "—",
            inCoordinates: item.inCoordinates || null,
            outCoordinates: item.outCoordinates || null,
            hours: item.workHours ? `${item.workHours}` : "",
            status: item.status || "present",
        }));

        res.status(200).json(formattedReports);
    } catch (err) {
        next(err);
    }
};

// @route POST /api/attendance/check-in
exports.checkIn = async (req, res, next) => {
    try {
        const targetEmployee = req.body.employee || req.user?.employee || req.user?.id;
        const { inLocation, inCoordinates, location } = req.body;

        if (!targetEmployee) {
            return res
                .status(400)
                .json({ message: "Employee ID is required for check-in. Please login again." });
        }

        const today = getNormalizedDate();

        let existing = await Attendance.findOne({ employee: targetEmployee, date: today });
        if (existing && existing.checkIn) {
            return res.status(400).json({ message: "Already checked in today" });
        }

        const now = new Date();
        const officeStart = new Date();
        officeStart.setHours(9, 30, 0, 0);

        const address = cleanText(inLocation);
        const coords = pickCoords(inCoordinates || location);

        let record;
        if (existing) {
            existing.checkIn = now;
            existing.status = "present";
            existing.isLate = now > officeStart;
            existing.inLocation = address;
            if (coords) existing.inCoordinates = coords;
            await existing.save();
            record = existing;
        } else {
            record = await Attendance.create({
                employee: targetEmployee,
                date: today,
                checkIn: now,
                status: "present",
                isLate: now > officeStart,
                inLocation: address,
                ...(coords && { inCoordinates: coords }),
            });
        }

        record = await record.populate("employee", "employeeId name department role");
        res.status(201).json(record);
    } catch (err) {
        next(err);
    }
};

// @route PUT /api/attendance/check-out
exports.checkOut = async (req, res, next) => {
    try {
        const targetEmployee = req.body.employee || req.user?.employee || req.user?.id;
        const { outLocation, outCoordinates, location } = req.body;

        if (!targetEmployee) {
            return res.status(400).json({ message: "Employee ID is required for check-out" });
        }

        const today = getNormalizedDate();

        let record = await Attendance.findOne({ employee: targetEmployee, date: today });
        if (!record) {
            return res
                .status(404)
                .json({ message: "No check-in found for today. Please check-in first." });
        }

        if (!record.checkIn) {
            return res
                .status(400)
                .json({ message: "Check-in time missing for today. Please check-in first." });
        }

        const now = new Date();
        record.checkOut = now;
        record.outLocation = cleanText(outLocation);

        const coords = pickCoords(outCoordinates || location);
        if (coords) record.outCoordinates = coords;

        const diffMs = now - new Date(record.checkIn);
        record.workHours = (diffMs / (1000 * 60 * 60)).toFixed(2);

        const officeEnd = new Date();
        officeEnd.setHours(18, 30, 0, 0);
        record.isEarlyLeaving = now < officeEnd;

        await record.save();
        record = await record.populate("employee", "employeeId name department role");

        res.json(record);
    } catch (err) {
        next(err);
    }
};

// @route POST /api/attendance/regularize
exports.regularizeAttendance = async (req, res, next) => {
    try {
        const { id, checkIn, checkOut, remarks, inLocation, outLocation } = req.body;

        // Sirf wahi fields update hongi jo bheji gayi hain
        const update = { status: "present" };
        if (checkIn) update.checkIn = checkIn;
        if (checkOut) update.checkOut = checkOut;
        if (remarks !== undefined) update.remarks = remarks;
        if (cleanText(inLocation)) update.inLocation = cleanText(inLocation);
        if (cleanText(outLocation)) update.outLocation = cleanText(outLocation);

        const record = await Attendance.findByIdAndUpdate(id, { $set: update }, { new: true }).populate(
            "employee",
            "employeeId name department role"
        );

        if (!record) {
            return res.status(404).json({ message: "Attendance record nahi mila." });
        }

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

// @route DELETE /api/attendance/:id
exports.deleteAttendance = async (req, res, next) => {
    try {
        const { id } = req.params;
        const deletedRecord = await Attendance.findByIdAndDelete(id);

        if (!deletedRecord) {
            return res.status(404).json({ message: "Attendance record database mein nahi mila." });
        }

        res.status(200).json({ success: true, message: "Attendance record successfully delete ho gaya." });
    } catch (err) {
        next(err);
    }
};




// const Attendance = require("../models/Attendance");
// const ActivityLog = require("../models/ActivityLog");

// // Helper: Date ka time zero karne ke liye (Pure din ki exact matching ke liye)
// const getNormalizedDate = (dateInput = new Date()) => {
//     const d = new Date(dateInput);
//     d.setHours(0, 0, 0, 0);
//     return d;
// };

// // @route POST /api/attendance/mark
// exports.markAttendance = async (req, res, next) => {
//     try {
//         const { status, checkInTime, notes, employee } = req.body;
//         // Priority: explicit employee body -> logged in user's employee ref -> logged in user's id
//         const targetEmployee = employee || req.user?.employee || req.user?.id;

//         if (!targetEmployee) {
//             return res.status(400).json({ message: "Employee ID is missing. Please log in again." });
//         }

//         const today = getNormalizedDate();
//         const cleanStatus = (status || "present").toLowerCase();

//         let attendance = await Attendance.findOneAndUpdate(
//             { employee: targetEmployee, date: today },
//             {
//                 employee: targetEmployee,
//                 date: today,
//                 status: cleanStatus,
//                 checkIn: checkInTime ? new Date(checkInTime) : new Date(),
//                 isLate: cleanStatus === "late",
//                 notes: notes || ""
//             },
//             { upsert: true, new: true, setDefaultsOnInsert: true }
//         );

//         // Populate employee details immediately so response contains name & employeeId
//         attendance = await attendance.populate("employee", "employeeId name department role");

//         try {
//             await ActivityLog.create({
//                 user: req.user?.id || targetEmployee,
//                 action: `Marked attendance as ${cleanStatus}`,
//                 module: "Attendance",
//             });
//         } catch (logErr) {
//             console.error("Failed to save activity log:", logErr);
//         }

//         res.status(201).json({
//             success: true,
//             message: "Attendance status updated successfully",
//             attendance,
//         });
//     } catch (err) {
//         next(err);
//     }
// };

// // @route GET /api/attendance?date=&employee=&status=
// exports.getAttendance = async (req, res, next) => {
//     try {
//         const { date, employee, month, year, status } = req.query;
//         const filter = {};

//         if (employee) filter.employee = employee;
//         if (status && status !== 'ALL') filter.status = status.toLowerCase();

//         if (date) {
//             const start = new Date(date);
//             start.setHours(0, 0, 0, 0);
//             const end = new Date(date);
//             end.setHours(23, 59, 59, 999);
//             filter.date = { $gte: start, $lte: end };
//         } else if (month && year) {
//             filter.date = {
//                 $gte: new Date(year, month - 1, 1, 0, 0, 0), $lte: new Date(year, month, 0, 23, 59, 59),
//             };
//         } else {
//             const todayStart = new Date();
//             todayStart.setHours(0, 0, 0, 0);
//             const todayEnd = new Date(todayStart);
//             todayEnd.setHours(23, 59, 59, 999);
//             filter.date = { $gte: todayStart, $lte: todayEnd };
//         }

//         // Hamesha employee details populate karein taaki frontend par naam show ho sake
//         const records = await Attendance.find(filter)
//             .populate("employee", "employeeId name department role")
//             .sort({ date: -1 });

//         res.json(records);
//     } catch (err) {
//         next(err);
//     }
// };

// // @route GET /api/attendance/reports
// exports.getAttendanceReports = async (req, res, next) => {
//     try {
//         const { startDate, endDate, department, status } = req.query;
//         let query = {};

//         if (startDate && endDate) {
//             const start = new Date(startDate);
//             start.setHours(0, 0, 0, 0);
//             const end = new Date(endDate);
//             end.setHours(23, 59, 59, 999);
//             query.date = { $gte: start, $lte: end };
//         }

//         if (status && status !== 'ALL') {
//             query.status = status.toLowerCase();
//         }

//         let attendanceRecords = await Attendance.find(query)
//             .populate("employee", "employeeId name department role")
//             .sort({ date: -1 });

//         // Department filter logic
//         if (department && department !== 'ALL') {
//             attendanceRecords = attendanceRecords.filter(item =>
//                 item.employee?.department?.toUpperCase() === department.toUpperCase()
//             );
//         }

//         const formattedReports = attendanceRecords.map(item => ({
//             _id: item._id,
//             userId: item.employee?.employeeId || item.employee?._id?.toString().slice(-6) || "N/A",
//             userName: item.employee?.name || "Staff Member",
//             department: item.employee?.department || "N/A",
//             date: item.date ? new Date(item.date).toISOString().slice(0, 10) : "",
//             checkIn: item.checkIn ? new Date(item.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
//             checkOut: item.checkOut ? new Date(item.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
//             hours: item.workHours ? `${item.workHours}` : '',
//             status: item.status || 'present'
//         }));

//         res.status(200).json(formattedReports);
//     } catch (err) {
//         next(err);
//     }
// };

// // @route POST /api/attendance/check-in
// exports.checkIn = async (req, res, next) => {
//     try {
//         // req.body se ya authenticated user (`req.user`) se employee ID fetch karein
//         const targetEmployee = req.body.employee || req.user?.employee || req.user?.id;

//         if (!targetEmployee) {
//             return res.status(400).json({ message: "Employee ID is required for check-in. Please login again." });
//         }

//         const today = getNormalizedDate();

//         let existing = await Attendance.findOne({ employee: targetEmployee, date: today });
//         if (existing && existing.checkIn) {
//             return res.status(400).json({ message: "Already checked in today" });
//         }

//         const now = new Date();
//         const officeStart = new Date();
//         officeStart.setHours(9, 30, 0, 0);

//         let record;
//         if (existing) {
//             existing.checkIn = now;
//             existing.status = "present";
//             existing.isLate = now > officeStart;
//             await existing.save();
//             record = existing;
//         } else {
//             record = await Attendance.create({
//                 employee: targetEmployee,
//                 date: today,
//                 checkIn: now,
//                 status: "present",
//                 isLate: now > officeStart,
//             });
//         }

//         // Return populated record so frontend gets the employee name instantly
//         record = await record.populate("employee", "employeeId name department role");

//         res.status(201).json(record);
//     } catch (err) {
//         next(err);
//     }
// };

// // @route PUT /api/attendance/check-out
// exports.checkOut = async (req, res, next) => {
//     try {
//         const targetEmployee = req.body.employee || req.user?.employee || req.user?.id;
//         if (!targetEmployee) {
//             return res.status(400).json({ message: "Employee ID is required for check-out" });
//         }

//         const today = getNormalizedDate();

//         let record = await Attendance.findOne({ employee: targetEmployee, date: today });
//         if (!record) {
//             return res.status(404).json({ message: "No check-in found for today. Please check-in first." });
//         }

//         const now = new Date();
//         record.checkOut = now;

//         const diffMs = now - new Date(record.checkIn);
//         record.workHours = (diffMs / (1000 * 60 * 60)).toFixed(2);

//         const officeEnd = new Date();
//         officeEnd.setHours(18, 30, 0, 0);
//         record.isEarlyLeaving = now < officeEnd;

//         await record.save();
//         record = await record.populate("employee", "employeeId name department role");

//         res.json(record);
//     } catch (err) {
//         next(err);
//     }
// };

// // @route POST /api/attendance/regularize
// exports.regularizeAttendance = async (req, res, next) => {
//     try {
//         const { id, checkIn, checkOut, remarks } = req.body;
//         let record = await Attendance.findByIdAndUpdate(
//             id,
//             { checkIn, checkOut, remarks, status: "present" },
//             { new: true }
//         ).populate("employee", "employeeId name department role");

//         res.json(record);
//     } catch (err) {
//         next(err);
//     }
// };

// // @route GET /api/attendance/summary/:employeeId
// exports.getAttendanceSummary = async (req, res, next) => {
//     try {
//         const { month, year } = req.query;
//         const filter = { employee: req.params.employeeId };

//         if (month && year) {
//             filter.date = {
//                 $gte: new Date(year, month - 1, 1, 0, 0, 0), $lte: new Date(year, month, 0, 23, 59, 59),
//             };
//         }

//         const records = await Attendance.find(filter);
//         const summary = {
//             present: records.filter((r) => r.status === "present").length,
//             absent: records.filter((r) => r.status === "absent").length,
//             late: records.filter((r) => r.isLate).length,
//             onLeave: records.filter((r) => r.status === "on-leave").length,
//             totalOvertimeHours: records.reduce((sum, r) => sum + (r.overtimeHours || 0), 0),
//         };

//         res.json(summary);
//     } catch (err) {
//         next(err);
//     }
// };

// // @route DELETE /api/attendance/:id
// exports.deleteAttendance = async (req, res, next) => {
//     try {
//         const { id } = req.params;

//         // Check karein ki ID valid format mein hai ya nahi
//         const deletedRecord = await Attendance.findByIdAndDelete(id);

//         if (!deletedRecord) {
//             return res.status(404).json({ message: "Attendance record database mein nahi mila." });
//         }

//         res.status(200).json({ success: true, message: "Attendance record successfully delete ho gaya." });
//     } catch (err) {
//         next(err);
//     }
// };