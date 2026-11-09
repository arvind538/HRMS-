const mongoose = require("mongoose");
const Attendance = require("../models/Attendance");
const Holiday = require("../models/Holiday");
const ActivityLog = require("../models/ActivityLog");
const {
    TZ,
    ymdIST,
    dayRangeIST,
    monthRangeIST,
    getScopeIds,
    inScope,
    expandIds,
    resolveUserId,
    attachPeople,
} = require("../utils/accessScope");
const { notify } = require("../utils/notify");
const { normalizeYmd, dayContext, markAbsentForDate, buildVirtualRows } = require("../utils/attendanceSync");
const { getOffInfo } = require("../utils/workCalendar");

const OFFICE_START_MINUTES = 9 * 60 + 30; // 09:30 India time
const OFFICE_END_MINUTES = 18 * 60 + 30; // 18:30 India time
const STATUSES = ["present", "absent", "late", "half-day", "on-leave"];
const WORKING_STATUSES = ["present", "late", "half-day"];

const cleanText = (value) => (typeof value === "string" ? value.trim().slice(0, 300) : "");

const pickCoords = (coords) => {
    if (!coords) return undefined;
    const lat = Number(coords.lat);
    const lng = Number(coords.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
    return { lat, lng };
};

const minutesIntoDayIST = (date) => (date.getTime() - dayRangeIST(ymdIST(date)).start.getTime()) / 60000;

const timeLabel = (v) =>
    v ? new Date(v).toLocaleTimeString("en-IN", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }) : "";

const logActivity = async (req, action) => {
    try {
        await ActivityLog.create({ user: req.user._id, action, module: "Attendance" });
    } catch (err) {
        console.error("Failed to save activity log:", err.message);
    }
};

const toPlain = (item) => (item && typeof item.toObject === "function" ? item.toObject() : { ...item });

/* Sirf admin holidays change kar sakta hai. HR sirf dekh sakta hai. */
const requireAdmin = (req, res) => {
    if (req.user?.role !== "admin") {
        res.status(403).json({ message: "Sirf admin holiday add ya remove kar sakta hai." });
        return false;
    }
    return true;
};

// @route POST /api/attendance/mark  (admin / hr / manager: mark attendance for someone)
exports.markAttendance = async (req, res, next) => {
    try {
        const { status, checkInTime, notes, employee, inLocation, inCoordinates, location } = req.body;

        const targetUser = await resolveUserId(employee || req.user._id);
        if (!targetUser) {
            return res.status(404).json({ message: "This employee does not have a login account yet." });
        }

        const scope = await getScopeIds(req);
        if (!inScope(scope, targetUser)) {
            return res.status(403).json({ message: "You can mark attendance only for your own team." });
        }

        const { start, end } = dayRangeIST(req.body.date);
        if (start.getTime() > Date.now()) {
            return res.status(400).json({ message: "Attendance cannot be marked for a future date." });
        }

        const cleanStatus = String(status || "present").toLowerCase();
        if (!STATUSES.includes(cleanStatus)) {
            return res.status(400).json({ message: `Status must be one of: ${STATUSES.join(", ")}.` });
        }

        // Holiday ya weekly off par "absent" nahi lag sakta. Kaam karna ho to Present/Late/Half-day chalega.
        const ymd = normalizeYmd(req.body.date);
        const off = await getOffInfo(ymd);
        if (off.off && ["absent", "on-leave"].includes(cleanStatus)) {
            return res.status(409).json({
                message: `${ymd} is a ${off.type === "holiday" ? "holiday" : "weekly off"}${off.name ? ` (${off.name})` : ""}. Absent / On leave mark nahi ho sakta.`,
            });
        }

        // source "admin" = person ne decide kiya, automatic job is row ko dobara nahi chhuegi
        const set = {
            status: cleanStatus,
            isLate: cleanStatus === "late",
            notes: cleanText(notes),
            source: "admin",
            markedBy: req.user._id,
        };
        const update = { $set: set, $setOnInsert: { date: start } };

        if (WORKING_STATUSES.includes(cleanStatus)) {
            // Check-in time sirf tab save hota hai jab di gayi ho. Pehle "now" save ho jata tha, jo galat tha.
            if (checkInTime) {
                const when = new Date(checkInTime);
                if (Number.isNaN(when.getTime())) {
                    return res.status(400).json({ message: "Invalid check-in time." });
                }
                set.checkIn = when;
            }
        } else {
            // Absent / On leave: koi punch time nahi rehna chahiye
            update.$unset = { checkIn: 1, checkOut: 1, workHours: 1, isEarlyLeaving: 1 };
        }

        const address = cleanText(inLocation);
        if (address) set.inLocation = address;
        const coords = pickCoords(inCoordinates || location);
        if (coords) set.inCoordinates = coords;

        const record = await Attendance.findOneAndUpdate(
            { employee: targetUser, date: { $gte: start, $lt: end } },
            update,
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        const [attendance] = await attachPeople([record]);
        await logActivity(req, `Marked attendance as ${cleanStatus}`);

        res.status(201).json({ success: true, message: "Attendance status updated successfully", attendance });
    } catch (err) {
        next(err);
    }
};

// @route POST /api/attendance/mark-absent-bulk  (admin / hr / manager)
// Selected date ke "not marked / auto absent" employees ko ek click me Absent save karta hai.
exports.markAbsentBulk = async (req, res, next) => {
    try {
        const ymd = normalizeYmd(req.body.date);
        const scope = await getScopeIds(req);

        const result = await markAbsentForDate(ymd, { scope, source: "admin", markedBy: req.user._id });

        if (result.skipped === "future") {
            return res.status(400).json({ message: "Attendance cannot be marked for a future date." });
        }
        if (result.skipped === "holiday" || result.skipped === "week-off") {
            return res.status(409).json({
                message: `${ymd} is a ${result.skipped === "holiday" ? "holiday" : "weekly off"}. Attendance is not required on this day.`,
            });
        }

        await logActivity(req, `Marked ${result.created} employees absent for ${ymd}`);
        res.json({
            success: true,
            created: result.created,
            message: result.created
                ? `${result.created} employee(s) marked absent.`
                : "Everyone already has an attendance record for this date.",
        });
    } catch (err) {
        next(err);
    }
};

// @route GET /api/attendance/day-info?date=YYYY-MM-DD
// Batata hai ki date holiday / weekly off / future / abhi open hai ya nahi.
exports.getDayInfo = async (req, res, next) => {
    try {
        const ymd = normalizeYmd(req.query.date);
        const info = await dayContext(ymd);
        const off = await getOffInfo(ymd);

        // Off din ka flag hamesha frontend ko mile, chahe dayContext kuch aur bhi bheje
        res.json({
            ...info,
            isOff: Boolean(off.off),
            type: off.off ? off.type : null,
            name: off.off ? off.name || "" : "",
        });
    } catch (err) {
        next(err);
    }
};

// @route GET /api/attendance?date=&employee=&status=&month=&year=
exports.getAttendance = async (req, res, next) => {
    try {
        const { date, month, year, status } = req.query;
        const requested = String(req.query.employee || req.query.employeeId || "");
        const scope = await getScopeIds(req);
        const filter = {};

        const dayMode = !(month && year);
        const wantedStatus = status && String(status).toUpperCase() !== "ALL" ? String(status).toLowerCase() : null;

        if (requested) {
            if (!mongoose.isValidObjectId(requested) || !inScope(scope, requested)) return res.json([]);
            filter.employee = { $in: await expandIds(requested) };
        } else if (scope !== null) {
            filter.employee = { $in: scope };
        }

        // Day mode me status filter missing employees add hone ke BAAD lagta hai
        if (wantedStatus && !dayMode) filter.status = wantedStatus;

        if (!dayMode) {
            const m = Number(month);
            const y = Number(year);
            if (!(m >= 1 && m <= 12) || !(y >= 2000 && y <= 2100)) {
                return res.status(400).json({ message: "Please provide a valid month and year." });
            }
            const { start, end } = monthRangeIST(m, y);
            filter.date = { $gte: start, $lt: end };
        } else {
            const { start, end } = dayRangeIST(date);
            filter.date = { $gte: start, $lt: end };
        }

        const records = await Attendance.find(filter).sort({ date: -1, checkIn: -1 }).limit(2000);
        let list = await attachPeople(records);

        // Jin employees ka is date par row nahi hai, unhe virtual row diya jata hai.
        // Off din (holiday / weekly off) par buildVirtualRows koi absent row nahi banata.
        if (dayMode && !requested) {
            const ymd = normalizeYmd(date);
            const { rows } = await buildVirtualRows(ymd, scope);
            if (rows && rows.length) {
                const virtual = (await attachPeople(rows))
                    .map((item) => ({ ...toPlain(item), virtual: true }))
                    .sort((a, b) => String(a.employee?.name || "").localeCompare(String(b.employee?.name || "")));
                list = list.concat(virtual);
            }
        }

        if (wantedStatus && dayMode) {
            list = list.filter((item) => String(item.status || "present").toLowerCase() === wantedStatus);
        }

        res.json(list);
    } catch (err) {
        next(err);
    }
};

// @route GET /api/attendance/reports  (admin / hr / manager)
exports.getAttendanceReports = async (req, res, next) => {
    try {
        const { startDate, endDate, department, status } = req.query;
        const scope = await getScopeIds(req);
        const query = {};

        if (scope !== null) query.employee = { $in: scope };
        if (startDate && endDate) {
            query.date = { $gte: dayRangeIST(startDate).start, $lt: dayRangeIST(endDate).end };
        }
        if (status && String(status).toUpperCase() !== "ALL") {
            query.status = String(status).toLowerCase();
        }

        const records = await Attendance.find(query).sort({ date: -1 }).limit(5000);
        let list = await attachPeople(records);

        if (department && String(department).toUpperCase() !== "ALL") {
            list = list.filter(
                (item) => String(item.employee?.department || "").toUpperCase() === String(department).toUpperCase()
            );
        }

        const reports = list.map((item) => ({
            _id: item._id,
            userId: item.employee?.employeeId || String(item.employee?._id || "").slice(-6) || "N/A",
            userName: item.employee?.name || "Staff Member",
            department: item.employee?.department || "N/A",
            date: item.date ? ymdIST(item.date) : "",
            checkIn: timeLabel(item.checkIn),
            checkOut: timeLabel(item.checkOut),
            inLocation: item.inLocation || "—",
            outLocation: item.outLocation || "—",
            inCoordinates: item.inCoordinates || null,
            outCoordinates: item.outCoordinates || null,
            hours: item.workHours ? `${item.workHours}` : "",
            status: item.status || "present",
        }));

        res.status(200).json(reports);
    } catch (err) {
        next(err);
    }
};

// @route POST /api/attendance/check-in  (hamesha logged-in user ke liye)
exports.checkIn = async (req, res, next) => {
    try {
        const userId = String(req.user._id);
        const { inLocation, inCoordinates, location } = req.body;

        const now = new Date();
        const { start, end } = dayRangeIST(ymdIST(now));
        const dayFilter = { employee: userId, date: { $gte: start, $lt: end } };

        const existing = await Attendance.findOne(dayFilter);
        if (existing?.checkIn) {
            return res.status(409).json({ message: "You have already punched in today." });
        }

        // HR / admin ne aaj ko Absent ya On leave decide kiya hai to employee override nahi kar sakta.
        // System ka automatic Absent alag hai, usko punch-in replace karta hai.
        if (existing && existing.source === "admin" && ["absent", "on-leave"].includes(String(existing.status).toLowerCase())) {
            return res.status(409).json({
                message: `Your attendance for today was marked as ${existing.status} by HR. Please contact HR to correct it.`,
            });
        }

        const data = {
            status: "present",
            checkIn: now,
            isLate: minutesIntoDayIST(now) > OFFICE_START_MINUTES,
            inLocation: cleanText(inLocation),
            source: "employee",
        };
        const coords = pickCoords(inCoordinates || location);
        if (coords) data.inCoordinates = coords;

        let record;
        if (existing) {
            // Bina check-in wala row already hai (auto absent ya HR ne mark kiya): usi ko bhar do, sirf ek baar
            record = await Attendance.findOneAndUpdate({ _id: existing._id, checkIn: null }, { $set: data }, { new: true });
            if (!record) return res.status(409).json({ message: "You have already punched in today." });
        } else {
            try {
                record = await Attendance.create({ employee: userId, date: start, ...data });
            } catch (err) {
                if (err.code === 11000) {
                    return res.status(409).json({ message: "You have already punched in today." });
                }
                throw err;
            }
        }

        const [out] = await attachPeople([record]);
        res.status(201).json(out);
    } catch (err) {
        next(err);
    }
};

// @route PUT /api/attendance/check-out  (hamesha logged-in user ke liye)
exports.checkOut = async (req, res, next) => {
    try {
        const userId = String(req.user._id);
        const { outLocation, outCoordinates, location } = req.body;

        const now = new Date();
        const { start, end } = dayRangeIST(ymdIST(now));

        const record = await Attendance.findOne({ employee: userId, date: { $gte: start, $lt: end } });
        if (!record || !record.checkIn) {
            return res.status(404).json({ message: "No check-in found for today. Please punch in first." });
        }
        if (record.checkOut) {
            return res.status(409).json({ message: "You have already punched out today." });
        }

        const set = {
            checkOut: now,
            outLocation: cleanText(outLocation),
            workHours: ((now - new Date(record.checkIn)) / 3600000).toFixed(2),
            isEarlyLeaving: minutesIntoDayIST(now) < OFFICE_END_MINUTES,
        };
        const coords = pickCoords(outCoordinates || location);
        if (coords) set.outCoordinates = coords;

        // "checkOut: null" shart ki wajah se ek hi request din band kar sakti hai
        const updated = await Attendance.findOneAndUpdate({ _id: record._id, checkOut: null }, { $set: set }, { new: true });
        if (!updated) return res.status(409).json({ message: "You have already punched out today." });

        const [out] = await attachPeople([updated]);
        res.json(out);
    } catch (err) {
        next(err);
    }
};

// @route POST /api/attendance/regularize  (admin / hr / manager)
exports.regularizeAttendance = async (req, res, next) => {
    try {
        const { id, checkIn, checkOut, remarks, inLocation, outLocation } = req.body;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: "A valid attendance record id is required." });
        }

        const record = await Attendance.findById(id);
        if (!record) return res.status(404).json({ message: "Attendance record not found." });

        const scope = await getScopeIds(req);
        if (!inScope(scope, record.employee)) {
            return res.status(403).json({ message: "You can regularize attendance only for your own team." });
        }

        const inDate = checkIn ? new Date(checkIn) : record.checkIn ? new Date(record.checkIn) : null;
        const outDate = checkOut ? new Date(checkOut) : record.checkOut ? new Date(record.checkOut) : null;

        if ((inDate && Number.isNaN(inDate.getTime())) || (outDate && Number.isNaN(outDate.getTime()))) {
            return res.status(400).json({ message: "Invalid check-in or check-out time." });
        }
        if (inDate && outDate && outDate <= inDate) {
            return res.status(400).json({ message: "Check-out time must be after the check-in time." });
        }

        record.status = "present";
        record.source = "admin";
        record.markedBy = req.user._id;
        if (inDate) record.checkIn = inDate;
        if (outDate) record.checkOut = outDate;
        if (inDate && outDate) record.workHours = ((outDate - inDate) / 3600000).toFixed(2);
        if (remarks !== undefined) record.remarks = cleanText(remarks);
        if (cleanText(inLocation)) record.inLocation = cleanText(inLocation);
        if (cleanText(outLocation)) record.outLocation = cleanText(outLocation);
        await record.save();

        await logActivity(req, "Regularized an attendance record");
        await notify(await resolveUserId(record.employee), {
            type: "attendance",
            title: "Attendance updated",
            message: `Your attendance for ${ymdIST(record.date)} was corrected by ${req.user.name}.`,
            exclude: req.user._id,
        });
        const [out] = await attachPeople([record]);
        res.json(out);
    } catch (err) {
        next(err);
    }
};

// @route GET /api/attendance/summary/:employeeId?month=&year=
exports.getAttendanceSummary = async (req, res, next) => {
    try {
        const { month, year } = req.query;
        const target = req.params.employeeId;

        const scope = await getScopeIds(req);
        if (!mongoose.isValidObjectId(target) || !inScope(scope, target)) {
            return res.status(403).json({ message: "You are not allowed to view this attendance summary." });
        }

        const filter = { employee: { $in: await expandIds(target) } };
        if (month && year) {
            const m = Number(month);
            const y = Number(year);
            if (!(m >= 1 && m <= 12) || !(y >= 2000 && y <= 2100)) {
                return res.status(400).json({ message: "Please provide a valid month and year." });
            }
            const { start, end } = monthRangeIST(m, y);
            filter.date = { $gte: start, $lt: end };
        }

        const records = await Attendance.find(filter);
        res.json({
            present: records.filter((r) => r.status === "present").length,
            absent: records.filter((r) => r.status === "absent").length,
            halfDay: records.filter((r) => r.status === "half-day").length,
            late: records.filter((r) => r.isLate).length,
            onLeave: records.filter((r) => r.status === "on-leave").length,
            totalOvertimeHours: records.reduce((sum, r) => sum + (r.overtimeHours || 0), 0),
        });
    } catch (err) {
        next(err);
    }
};

// @route DELETE /api/attendance/:id  (admin / hr)
exports.deleteAttendance = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) {
            return res.status(404).json({ message: "Attendance record not found." });
        }

        const deleted = await Attendance.findByIdAndDelete(id);
        if (!deleted) return res.status(404).json({ message: "Attendance record not found." });

        await logActivity(req, "Deleted an attendance record");
        res.status(200).json({ success: true, message: "Attendance record deleted successfully." });
    } catch (err) {
        next(err);
    }
};

/* ------------------------------------------------------------------ */
/* Holidays: list (admin / hr), add and remove (sirf admin)            */
/* ------------------------------------------------------------------ */

// @route GET /api/attendance/holidays?year=2026
exports.listHolidays = async (req, res, next) => {
    try {
        const year = Number(req.query.year) || Number(ymdIST(new Date()).slice(0, 4));
        const holidays = await Holiday.find({ date: { $gte: `${year}-01-01`, $lte: `${year}-12-31` } })
            .sort({ date: 1 })
            .lean();
        res.json(holidays);
    } catch (err) {
        next(err);
    }
};

// @route POST /api/attendance/holidays   body: { date, name }   (sirf admin)
exports.addHoliday = async (req, res, next) => {
    try {
        if (!requireAdmin(req, res)) return;

        const date = String(req.body.date || "");
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return res.status(400).json({ message: "A valid date (YYYY-MM-DD) is required." });
        }
        const name = cleanText(req.body.name).slice(0, 80) || "Holiday";

        const holiday = await Holiday.findOneAndUpdate(
            { date },
            { $set: { name }, $setOnInsert: { createdBy: req.user._id } },
            { upsert: true, new: true }
        );

        await logActivity(req, `Added holiday ${date} (${name})`);
        res.status(201).json({ success: true, message: "Holiday saved.", holiday });
    } catch (err) {
        next(err);
    }
};

// @route DELETE /api/attendance/holidays/:date   (sirf admin)
exports.deleteHoliday = async (req, res, next) => {
    try {
        if (!requireAdmin(req, res)) return;

        const deleted = await Holiday.findOneAndDelete({ date: req.params.date });
        if (!deleted) return res.status(404).json({ message: "Holiday not found." });
        await logActivity(req, `Removed holiday ${req.params.date}`);
        res.json({ success: true, message: "Holiday removed." });
    } catch (err) {
        next(err);
    }
};
