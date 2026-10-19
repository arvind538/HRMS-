const mongoose = require("mongoose");
const Shift = require("../models/Shift");
const ShiftAssignment = require("../models/ShiftAssignment");
const Holiday = require("../models/Holiday");
const Employee = require("../models/Employee");
const { todayIST, dayOfWeek, describeShift } = require("../utils/shiftUtils");

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const MAX_BULK_DAYS = 62;

const isAdminOrHr = (req) => ["admin", "hr"].includes(String(req.user?.role || "").toLowerCase());
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const toMin = (t) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
};

/* A date that really exists, for example 2026-02-31 is refused */
const isRealDate = (s) => DATE_RE.test(String(s || "")) && new Date(`${s}T00:00:00.000Z`).toISOString().slice(0, 10) === s;

const POPULATE_EMPLOYEE = ["employee", "name employeeId"];
const POPULATE_SHIFT = ["shift", "name startTime endTime breakMinutes workingDays"];

const loadAssignment = (id) => ShiftAssignment.findById(id).populate(...POPULATE_EMPLOYEE).populate(...POPULATE_SHIFT);

/* Logged-in user -> the Employee profile of that person */
async function resolveEmployeeId(req) {
    if (req.user.employee) return req.user.employee._id || req.user.employee;
    const email = String(req.user.email || "").trim();
    if (!email) return null;
    const emp = await Employee.findOne({
        $or: [{ loginEmail: new RegExp(`^${escapeRegex(email)}$`, "i") }, { email: new RegExp(`^${escapeRegex(email)}$`, "i") }],
    }).select("_id");
    return emp ? emp._id : null;
}

/* Checks and cleans the fields of a shift. `current` holds the old values while editing. */
function cleanShift(body, current = {}) {
    const name = String(body.name ?? current.name ?? "").trim();
    const startTime = String(body.startTime ?? current.startTime ?? "").trim();
    const endTime = String(body.endTime ?? current.endTime ?? "").trim();
    const breakMinutes = body.breakMinutes !== undefined && body.breakMinutes !== "" ? Number(body.breakMinutes) : current.breakMinutes ?? 60;
    const rawDays = body.workingDays !== undefined ? body.workingDays : current.workingDays ?? [1, 2, 3, 4, 5, 6];

    if (name.length < 2 || name.length > 40) return { error: "Shift name must be 2 to 40 characters." };
    if (!TIME_RE.test(startTime)) return { error: "Start time must look like 09:30." };
    if (!TIME_RE.test(endTime)) return { error: "End time must look like 18:30." };
    if (!Number.isInteger(breakMinutes) || breakMinutes < 0 || breakMinutes > 600) {
        return { error: "Break must be a whole number of minutes between 0 and 600." };
    }

    const days = [...new Set((Array.isArray(rawDays) ? rawDays : []).map(Number))];
    if (!days.length || !days.every((d) => Number.isInteger(d) && d >= 0 && d <= 6)) {
        return { error: "Select at least one working day." };
    }

    let gross = toMin(endTime) - toMin(startTime);
    if (gross <= 0) gross += 24 * 60;
    if (breakMinutes >= gross) return { error: "The break must be shorter than the shift." };

    return { data: { name, startTime, endTime, breakMinutes, workingDays: days.sort((a, b) => a - b) } };
}

const nameTaken = (name, ignoreId) =>
    Shift.exists({ name: new RegExp(`^${escapeRegex(name)}$`, "i"), ...(ignoreId ? { _id: { $ne: ignoreId } } : {}) });

const badId = (res, what) => res.status(404).json({ message: `${what} not found` });

/* ============================ Shift templates ============================ */

// @route GET /api/shifts
exports.getShifts = async (req, res, next) => {
    try {
        const shifts = await Shift.find().sort({ startTime: 1, name: 1 });
        res.json(shifts);
    } catch (err) {
        next(err);
    }
};

// @route POST /api/shifts
exports.createShift = async (req, res, next) => {
    try {
        const cleaned = cleanShift(req.body);
        if (cleaned.error) return res.status(400).json({ message: cleaned.error });
        if (await nameTaken(cleaned.data.name)) {
            return res.status(409).json({ message: `A shift named "${cleaned.data.name}" already exists.` });
        }

        const shift = await Shift.create(cleaned.data);
        res.status(201).json(shift);
    } catch (err) {
        next(err);
    }
};

// @route PUT /api/shifts/:id
exports.updateShift = async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return badId(res, "Shift");
        const shift = await Shift.findById(req.params.id);
        if (!shift) return badId(res, "Shift");

        const cleaned = cleanShift(req.body, shift);
        if (cleaned.error) return res.status(400).json({ message: cleaned.error });
        if (await nameTaken(cleaned.data.name, shift._id)) {
            return res.status(409).json({ message: `A shift named "${cleaned.data.name}" already exists.` });
        }

        Object.assign(shift, cleaned.data);
        await shift.save(); // save() recalculates isNightShift
        res.json(shift);
    } catch (err) {
        next(err);
    }
};

// @route DELETE /api/shifts/:id   (?force=true also removes the roster entries of this shift)
exports.deleteShift = async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return badId(res, "Shift");
        const shift = await Shift.findById(req.params.id);
        if (!shift) return badId(res, "Shift");

        const used = await ShiftAssignment.countDocuments({ shift: shift._id });
        if (used && req.query.force !== "true") {
            return res.status(409).json({
                message: `This shift is used in ${used} roster entr${used === 1 ? "y" : "ies"}. Remove those first, or delete with force.`,
                assignments: used,
            });
        }

        if (used) await ShiftAssignment.deleteMany({ shift: shift._id });
        await shift.deleteOne();
        res.json({ message: used ? `Shift and ${used} roster entries deleted` : "Shift deleted", removedAssignments: used });
    } catch (err) {
        next(err);
    }
};

/* ================================= Roster ================================= */

// @route GET /api/shifts/roster?startDate=&endDate=&employee=
exports.getRoster = async (req, res, next) => {
    try {
        const { startDate, endDate, employee } = req.query;
        const filter = {};

        if (isAdminOrHr(req)) {
            if (employee) {
                if (!mongoose.isValidObjectId(employee)) return res.json([]);
                filter.employee = employee;
            }
        } else {
            // An employee sees only his own roster
            const own = await resolveEmployeeId(req);
            if (!own) return res.json([]);
            filter.employee = own;
        }

        if (startDate || endDate) {
            if ((startDate && !isRealDate(startDate)) || (endDate && !isRealDate(endDate))) {
                return res.status(400).json({ message: "Dates must look like YYYY-MM-DD." });
            }
            filter.date = {};
            if (startDate) filter.date.$gte = startDate;
            if (endDate) filter.date.$lte = endDate;
        }

        const roster = await ShiftAssignment.find(filter)
            .populate(...POPULATE_EMPLOYEE)
            .populate(...POPULATE_SHIFT)
            .sort({ date: 1 })
            .limit(3000);
        res.json(roster);
    } catch (err) {
        next(err);
    }
};

// @route POST /api/shifts/assign
exports.assignShift = async (req, res, next) => {
    try {
        const { employee, shift, date } = req.body;

        if (!mongoose.isValidObjectId(employee)) return res.status(400).json({ message: "Please select an employee." });
        if (!mongoose.isValidObjectId(shift)) return res.status(400).json({ message: "Please select a shift." });
        if (!isRealDate(date)) return res.status(400).json({ message: "Date must look like YYYY-MM-DD." });

        const [emp, sh] = await Promise.all([Employee.exists({ _id: employee }), Shift.exists({ _id: shift })]);
        if (!emp) return res.status(404).json({ message: "Employee not found" });
        if (!sh) return res.status(404).json({ message: "Shift not found" });

        const assignment = await ShiftAssignment.create({ employee, shift, date, assignedBy: req.user._id });
        res.status(201).json(await loadAssignment(assignment._id));
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ message: "This employee already has a shift for this date. Edit that entry instead." });
        }
        next(err);
    }
};

// Bulk: a whole week or month at once. overwrite=true changes the shift that is already there.
// @route POST /api/shifts/assign-weekly
exports.assignWeeklyRoster = async (req, res, next) => {
    try {
        const { employee, shift, overwrite } = req.body;
        const dates = Array.isArray(req.body.dates) ? [...new Set(req.body.dates)] : [];

        if (!mongoose.isValidObjectId(employee)) return res.status(400).json({ message: "Please select an employee." });
        if (!mongoose.isValidObjectId(shift)) return res.status(400).json({ message: "Please select a shift." });
        if (!dates.length || !dates.every(isRealDate)) {
            return res.status(400).json({ message: "dates must be a list like ['2026-10-19', '2026-10-20']." });
        }
        if (dates.length > MAX_BULK_DAYS) {
            return res.status(400).json({ message: `You can assign at most ${MAX_BULK_DAYS} days at a time.` });
        }

        const [emp, sh] = await Promise.all([Employee.exists({ _id: employee }), Shift.exists({ _id: shift })]);
        if (!emp) return res.status(404).json({ message: "Employee not found" });
        if (!sh) return res.status(404).json({ message: "Shift not found" });

        const fields = { shift, assignedBy: req.user._id };
        const ops = dates.map((date) => ({
            updateOne: {
                filter: { employee, date },
                update: overwrite ? { $set: fields } : { $setOnInsert: fields },
                upsert: true,
            },
        }));

        const r = await ShiftAssignment.bulkWrite(ops);
        res.status(201).json({
            created: r.upsertedCount,
            updated: overwrite ? r.modifiedCount : 0,
            skipped: overwrite ? 0 : dates.length - r.upsertedCount,
        });
    } catch (err) {
        next(err);
    }
};

// @route PUT /api/shifts/assign/:id   { shift, date? }  (change the shift, or move it to another date)
exports.updateAssignment = async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return badId(res, "Assignment");
        const assignment = await ShiftAssignment.findById(req.params.id);
        if (!assignment) return badId(res, "Assignment");

        const { shift, date } = req.body;

        if (shift !== undefined) {
            if (!mongoose.isValidObjectId(shift)) return res.status(400).json({ message: "Please select a shift." });
            if (!(await Shift.exists({ _id: shift }))) return res.status(404).json({ message: "Shift not found" });
            assignment.shift = shift;
        }
        if (date !== undefined) {
            if (!isRealDate(date)) return res.status(400).json({ message: "Date must look like YYYY-MM-DD." });
            assignment.date = date;
        }
        assignment.assignedBy = req.user._id;

        await assignment.save();
        res.json(await loadAssignment(assignment._id));
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ message: "This employee already has a shift for that date." });
        }
        next(err);
    }
};

// @route DELETE /api/shifts/assign/:id
exports.removeAssignment = async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return badId(res, "Assignment");
        const removed = await ShiftAssignment.findByIdAndDelete(req.params.id);
        if (!removed) return badId(res, "Assignment");
        res.json({ message: "Assignment removed" });
    } catch (err) {
        next(err);
    }
};

/* ============================ Dashboard: today ============================ */

// GET /api/shifts/today   (admin / HR can also pass ?employee=<id>)
exports.getToday = async (req, res, next) => {
    try {
        const date = todayIST();
        const dow = dayOfWeek(date);

        const asked = req.query.employee;
        const employeeId =
            isAdminOrHr(req) && asked && mongoose.isValidObjectId(asked) ? asked : await resolveEmployeeId(req);

        const [holidays, assignment] = await Promise.all([
            Holiday.find({ date }).lean(),
            employeeId ? ShiftAssignment.findOne({ employee: employeeId, date }).populate("shift") : null,
        ]);

        const shift = assignment ? assignment.shift : null;
        const mainHoliday = holidays.find((h) => !h.optional) || null;
        const optionalHoliday = holidays.find((h) => h.optional) || null;

        let status;
        if (mainHoliday) status = "holiday";
        else if (shift ? !shift.workingDays.includes(dow) : dow === 0) status = "weekly_off";
        else if (shift) status = "working";
        else status = "not_assigned";

        const shiftInfo = describeShift(shift);

        res.json({
            date,
            day: dow, // 0 = Sunday
            status, // holiday | weekly_off | working | not_assigned
            shift: shiftInfo, // null means "Not Assigned"
            holiday: mainHoliday || optionalHoliday, // an optional holiday has holiday.optional = true
            goalMinutes: shiftInfo ? shiftInfo.durationMinutes : 480, // the goal of the work ring
        });
    } catch (err) {
        next(err);
    }
};


// const Shift = require("../models/Shift");
// const ShiftAssignment = require("../models/ShiftAssignment");
// const Holiday = require("../models/Holiday");
// const Employee = require("../models/Employee");
// const { todayIST, dayOfWeek, describeShift } = require("../utils/shiftUtils");

// const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// const isAdminOrHr = (req) => ["admin", "hr"].includes(req.user?.role);

// // ⚠️ Logged-in user -> Employee document. Apne project ke hisaab se adjust karo.
// // (Yahan maana hai: User me `employee` field ho, ya Employee me `user` field ho.)
// async function resolveEmployeeId(req) {
//     if (req.user.employee) return req.user.employee;
//     const emp = await Employee.findOne({ user: req.user._id }).select("_id");
//     return emp ? emp._id : null;
// }

// // ===== Shifts (templates) =====
// exports.getShifts = async (req, res, next) => {
//     try {
//         const shifts = await Shift.find().sort({ startTime: 1 });
//         res.json(shifts);
//     } catch (err) {
//         next(err);
//     }
// };

// exports.createShift = async (req, res, next) => {
//     try {
//         const { name, startTime, endTime, breakMinutes, workingDays } = req.body;
//         const shift = await Shift.create({ name, startTime, endTime, breakMinutes, workingDays });
//         res.status(201).json(shift);
//     } catch (err) {
//         next(err);
//     }
// };

// exports.updateShift = async (req, res, next) => {
//     try {
//         const shift = await Shift.findById(req.params.id);
//         if (!shift) return res.status(404).json({ message: "Shift not found" });

//         ["name", "startTime", "endTime", "breakMinutes", "workingDays"].forEach((f) => {
//             if (req.body[f] !== undefined) shift[f] = req.body[f];
//         });
//         await shift.save(); // save() se validation + isNightShift dobara calculate hota hai
//         res.json(shift);
//     } catch (err) {
//         next(err);
//     }
// };

// exports.deleteShift = async (req, res, next) => {
//     try {
//         const inUse = await ShiftAssignment.exists({ shift: req.params.id });
//         if (inUse) {
//             return res.status(400).json({ message: "Shift roster me assigned hai, pehle assignments hatao" });
//         }
//         const shift = await Shift.findByIdAndDelete(req.params.id);
//         if (!shift) return res.status(404).json({ message: "Shift not found" });
//         res.json({ message: "Shift deleted" });
//     } catch (err) {
//         next(err);
//     }
// };

// // ===== Roster =====
// exports.getRoster = async (req, res, next) => {
//     try {
//         const { startDate, endDate, employee } = req.query;
//         const filter = {};

//         if (isAdminOrHr(req)) {
//             if (employee) filter.employee = employee;
//         } else {
//             // Employee sirf apna roster dekh sakta hai
//             filter.employee = await resolveEmployeeId(req);
//         }

//         if (startDate && endDate) filter.date = { $gte: startDate, $lte: endDate }; // "YYYY-MM-DD"

//         const roster = await ShiftAssignment.find(filter)
//             .populate("employee", "name employeeId")
//             .populate("shift", "name startTime endTime breakMinutes workingDays")
//             .sort({ date: 1 });
//         res.json(roster);
//     } catch (err) {
//         next(err);
//     }
// };

// exports.assignShift = async (req, res, next) => {
//     try {
//         const { employee, shift, date } = req.body;
//         if (!DATE_RE.test(date || "")) {
//             return res.status(400).json({ message: "date format YYYY-MM-DD hona chahiye" });
//         }
//         const assignment = await ShiftAssignment.create({ employee, shift, date, assignedBy: req.user._id });
//         res.status(201).json(assignment);
//     } catch (err) {
//         if (err.code === 11000) {
//             return res.status(400).json({ message: "Employee already has a shift assigned for this date" });
//         }
//         next(err);
//     }
// };

// // Bulk: poore hafte/mahine ka roster ek saath. overwrite=true ho to purani shift badal deta hai.
// exports.assignWeeklyRoster = async (req, res, next) => {
//     try {
//         const { employee, shift, dates, overwrite } = req.body;
//         if (!Array.isArray(dates) || !dates.length || !dates.every((d) => DATE_RE.test(d))) {
//             return res.status(400).json({ message: "dates = ['YYYY-MM-DD', ...] chahiye" });
//         }

//         const fields = { shift, assignedBy: req.user._id };
//         const ops = dates.map((date) => ({
//             updateOne: {
//                 filter: { employee, date },
//                 update: overwrite ? { $set: fields } : { $setOnInsert: fields },
//                 upsert: true,
//             },
//         }));

//         const r = await ShiftAssignment.bulkWrite(ops);
//         res.status(201).json({
//             created: r.upsertedCount,
//             updated: overwrite ? r.modifiedCount : 0,
//             skipped: overwrite ? 0 : dates.length - r.upsertedCount,
//         });
//     } catch (err) {
//         next(err);
//     }
// };

// exports.removeAssignment = async (req, res, next) => {
//     try {
//         const a = await ShiftAssignment.findByIdAndDelete(req.params.id);
//         if (!a) return res.status(404).json({ message: "Assignment not found" });
//         res.json({ message: "Assignment removed" });
//     } catch (err) {
//         next(err);
//     }
// };

// // ===== Dashboard: aaj ka schedule =====
// // GET /api/shifts/today   (admin/HR ke liye ?employee=<id> bhi chalega)
// exports.getToday = async (req, res, next) => {
//     try {
//         const date = todayIST();
//         const dow = dayOfWeek(date);

//         const employeeId =
//             isAdminOrHr(req) && req.query.employee ? req.query.employee : await resolveEmployeeId(req);

//         const [holidays, assignment] = await Promise.all([
//             Holiday.find({ date }).lean(),
//             employeeId
//                 ? ShiftAssignment.findOne({ employee: employeeId, date }).populate("shift")
//                 : null,
//         ]);

//         const shift = assignment ? assignment.shift : null;
//         const mainHoliday = holidays.find((h) => !h.optional) || null;
//         const optionalHoliday = holidays.find((h) => h.optional) || null;

//         let status;
//         if (mainHoliday) status = "holiday";
//         else if (shift ? !shift.workingDays.includes(dow) : dow === 0) status = "weekly_off";
//         else if (shift) status = "working";
//         else status = "not_assigned";

//         const shiftInfo = describeShift(shift);

//         res.json({
//             date,
//             day: dow, // 0 = Sunday
//             status, // holiday | weekly_off | working | not_assigned
//             shift: shiftInfo, // null ho to "Not Assigned"
//             holiday: mainHoliday || optionalHoliday, // optional holiday me holiday.optional = true
//             goalMinutes: shiftInfo ? shiftInfo.durationMinutes : 480, // work ring ka goal
//         });
//     } catch (err) {
//         next(err);
//     }
// };












// const Shift = require("../models/Shift");
// const ShiftAssignment = require("../models/ShiftAssignment");

// // ===== Shifts (templates) =====
// exports.getShifts = async (req, res, next) => {
//     try {
//         const shifts = await Shift.find().sort({ startTime: 1 });
//         res.json(shifts);
//     } catch (err) {
//         next(err);
//     }
// };

// exports.createShift = async (req, res, next) => {
//     try {
//         const shift = await Shift.create(req.body);
//         res.status(201).json(shift);
//     } catch (err) {
//         next(err);
//     }
// };

// exports.updateShift = async (req, res, next) => {
//     try {
//         const shift = await Shift.findByIdAndUpdate(req.params.id, req.body, { new: true });
//         res.json(shift);
//     } catch (err) {
//         next(err);
//     }
// };

// // ===== Shift Assignments =====
// exports.getRoster = async (req, res, next) => {
//     try {
//         const { startDate, endDate, employee } = req.query;
//         const filter = {};
//         if (employee) filter.employee = employee;
//         if (startDate && endDate) {
//             filter.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
//         }

//         const roster = await ShiftAssignment.find(filter)
//             .populate("employee", "name employeeId")
//             .populate("shift", "name startTime endTime")
//             .sort({ date: 1 });
//         res.json(roster);
//     } catch (err) {
//         next(err);
//     }
// };

// exports.assignShift = async (req, res, next) => {
//     try {
//         const assignment = await ShiftAssignment.create(req.body);
//         res.status(201).json(assignment);
//     } catch (err) {
//         if (err.code === 11000) {
//             return res.status(400).json({ message: "Employee already has a shift assigned for this date" });
//         }
//         next(err);
//     }
// };

// // bulk assignment — poore hafte ka roster ek saath banane ke liye
// exports.assignWeeklyRoster = async (req, res, next) => {
//     try {
//         const { employee, shift, dates } = req.body; // dates = array of date strings
//         const results = { created: [], skipped: [] };

//         for (const date of dates) {
//             const exists = await ShiftAssignment.findOne({ employee, date });
//             if (exists) {
//                 results.skipped.push(date);
//                 continue;
//             }
//             const assignment = await ShiftAssignment.create({ employee, shift, date });
//             results.created.push(assignment);
//         }

//         res.status(201).json(results);
//     } catch (err) {
//         next(err);
//     }
// };