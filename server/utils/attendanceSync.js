/**
 * Attendance sync: decides who is "missing" on a date and turns them into Absent.
 *
 * Used by:
 *   - jobs/attendanceCron.js          (automatic, every night)
 *   - scripts/backfillNov.js          (one time, for old dates)
 *   - controllers/attendanceController.js
 *        getAttendance        -> shows missing employees as virtual rows (not saved)
 *        markAbsentBulk       -> admin saves them as Absent with one click
 */
const Attendance = require("../models/Attendance");
const User = require("../models/User");
const Holiday = require("../models/Holiday");
const { ymdIST, dayRangeIST, inScope } = require("./accessScope");
const { getOffInfo } = require("./workCalendar");

/* ------------------------------------------------------------------ */
/* SETTINGS: change these to match your company                       */
/* ------------------------------------------------------------------ */
const CONFIG = {
    // 0 = Sunday, 1 = Monday ... 6 = Saturday.
    WEEKLY_OFF_DAYS: [0],

    // After this time (minutes from midnight, India time) a missing employee is shown / saved as Absent.
    // 23 * 60 + 30 = 11:30 PM. Keep it equal to the cron time in jobs/attendanceCron.js.
    CUTOFF_MINUTES: 23 * 60 + 30,
    CUTOFF_LABEL: "11:30 PM",

    // Login accounts with these roles are not tracked for attendance.
    EXCLUDED_ROLES: ["admin"],

    // Accounts with these statuses are skipped.
    INACTIVE_STATUSES: ["inactive", "terminated", "exited", "exit"],

    // Approved leave days become "on-leave" instead of "absent".
    // IMPORTANT: fieldNames Leave.js se verify karo (type server\models\Leave.js).
    LEAVE: {
        enabled: true,
        modelPath: "../models/Leave",
        employeeField: "employee",
        fromField: "startDate",
        toField: "endDate",
        statusField: "status",
        approvedValue: /^approved$/i,
    },
};

/* ------------------------------------------------------------------ */
/* Date helpers (all in India time)                                    */
/* ------------------------------------------------------------------ */
const YMD_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const normalizeYmd = (value) => (YMD_REGEX.test(String(value || "")) ? String(value) : ymdIST(new Date()));

const weekdayOf = (ymd) => new Date(`${ymd}T12:00:00+05:30`).getUTCDay();

const addDaysYmd = (ymd, n) => ymdIST(new Date(new Date(`${ymd}T12:00:00+05:30`).getTime() + n * 86400000));

const isWeeklyOff = (ymd) => CONFIG.WEEKLY_OFF_DAYS.includes(weekdayOf(ymd));

/* ------------------------------------------------------------------ */
/* Day context: holiday / weekly off / future / cutoff passed          */
/* ------------------------------------------------------------------ */
async function getOffDay(ymd) {
    const o = await getOffInfo(ymd);
    return {
        isOff: o.off,
        type: o.type === "weekly" ? "week-off" : o.type || "",
        name: o.name || "",
    };
}

async function dayContext(ymd) {
    const today = ymdIST(new Date());
    const isFuture = ymd > today;
    const isToday = ymd === today;

    let cutoffPassed = ymd < today;
    if (isToday) {
        const minutes = (Date.now() - dayRangeIST(today).start.getTime()) / 60000;
        cutoffPassed = minutes >= CONFIG.CUTOFF_MINUTES;
    }

    const off = await getOffDay(ymd);
    return { date: ymd, today, isFuture, isToday, cutoffPassed, cutoffLabel: CONFIG.CUTOFF_LABEL, ...off };
}

/* ------------------------------------------------------------------ */
/* Who must have attendance on this date                               */
/* ------------------------------------------------------------------ */
async function eligibleUsers(ymd) {
    const query = {};
    if (CONFIG.EXCLUDED_ROLES.length) {
        query.role = { $nin: CONFIG.EXCLUDED_ROLES.map((r) => new RegExp(`^${r}$`, "i")) };
    }
    query.isActive = { $ne: false };
    query.status = { $nin: CONFIG.INACTIVE_STATUSES.map((s) => new RegExp(`^${s}$`, "i")) };

    const users = await User.find(query).select("_id name role createdAt dateOfJoining joiningDate").lean();

    // Nobody is marked absent for days before he joined.
    return users.filter((u) => {
        const joined = u.dateOfJoining || u.joiningDate || u.createdAt;
        return !joined || ymdIST(new Date(joined)) <= ymd;
    });
}

async function leaveUserIds(ymd, userIds) {
    const L = CONFIG.LEAVE;
    if (!L.enabled || !userIds.length) return new Set();
    try {
        const Leave = require(L.modelPath);
        const { start, end } = dayRangeIST(ymd);
        const rows = await Leave.find({
            [L.employeeField]: { $in: userIds },
            [L.statusField]: L.approvedValue,
            [L.fromField]: { $lt: end },
            [L.toField]: { $gte: start },
        })
            .select(L.employeeField)
            .lean();
        return new Set(rows.map((r) => String(r[L.employeeField])));
    } catch (err) {
        console.error("Leave lookup failed, ignoring leaves:", err.message);
        return new Set();
    }
}

/* Eligible employees (inside the viewer's scope) who have NO attendance row on this date */
async function findMissing(ymd, scope = null) {
    const { start, end } = dayRangeIST(ymd);
    const users = (await eligibleUsers(ymd)).filter((u) => inScope(scope, u._id));
    if (!users.length) return { missing: [], leaveSet: new Set() };

    const ids = users.map((u) => u._id);
    const existing = await Attendance.distinct("employee", { employee: { $in: ids }, date: { $gte: start, $lt: end } });
    const have = new Set(existing.map(String));

    const missing = users.filter((u) => !have.has(String(u._id)));
    const leaveSet = await leaveUserIds(ymd, missing.map((u) => u._id));
    return { missing, leaveSet };
}

/* ------------------------------------------------------------------ */
/* 1) Save Absent rows (cron, backfill, admin bulk button)             */
/* ------------------------------------------------------------------ */
async function markAbsentForDate(ymd, { scope = null, source = "system", markedBy, force = false } = {}) {
    const ctx = await dayContext(ymd);
    if (ctx.isFuture) return { created: 0, skipped: "future", ctx };
    if (ctx.isOff && !force) return { created: 0, skipped: ctx.type, ctx };

    const { start } = dayRangeIST(ymd);
    const { missing, leaveSet } = await findMissing(ymd, scope);
    if (!missing.length) return { created: 0, skipped: "", ctx };

    const ops = missing.map((u) => {
        const onLeave = leaveSet.has(String(u._id));
        const doc = {
            status: onLeave ? "on-leave" : "absent",
            isLate: false,
            source,
            notes: onLeave ? "Approved leave" : source === "system" ? "Auto marked absent: no punch-in" : "Marked absent by admin",
        };
        if (markedBy) doc.markedBy = markedBy;
        return {
            updateOne: {
                filter: { employee: u._id, date: start },
                // $setOnInsert never overwrites a row that already exists (employee punched in meanwhile)
                update: { $setOnInsert: doc },
                upsert: true,
            },
        };
    });

    let created = 0;
    try {
        const result = await Attendance.bulkWrite(ops, { ordered: false });
        created = result.upsertedCount ?? result.nUpserted ?? 0;
    } catch (err) {
        // 11000 = duplicate: someone punched in at the same moment. That is fine, the other row wins.
        if (err.code !== 11000 && !err.writeErrors?.every?.((e) => e.code === 11000)) throw err;
        created = err.result?.upsertedCount ?? 0;
    }
    return { created, skipped: "", ctx };
}

/* ------------------------------------------------------------------ */
/* 2) Date range ke liye Absent save karo (backfill)                  */
/*    Future aur holiday / weekly off skip hote hain.                 */
/* ------------------------------------------------------------------ */
async function markAbsentRange(fromYmd, toYmd, { scope = null, source = "system", markedBy } = {}) {
    const summary = { days: 0, created: 0, skipped: [] };
    const last = normalizeYmd(toYmd);
    let cursor = normalizeYmd(fromYmd);

    for (let i = 0; i < 400 && cursor <= last; i++) {
        const res = await markAbsentForDate(cursor, { scope, source, markedBy });
        summary.days += 1;
        summary.created += res.created;
        if (res.skipped) summary.skipped.push({ date: cursor, reason: res.skipped });
        cursor = addDaysYmd(cursor, 1);
    }
    return summary;
}

/* ------------------------------------------------------------------ */
/* 3) Virtual rows for the admin list (nothing is saved)               */
/*    status: absent | not-marked | on-leave | week-off | holiday      */
/* ------------------------------------------------------------------ */
async function buildVirtualRows(ymd, scope = null) {
    const ctx = await dayContext(ymd);
    if (ctx.isFuture) return { ctx, rows: [] };

    const { start } = dayRangeIST(ymd);
    const { missing, leaveSet } = await findMissing(ymd, scope);

    const rows = missing.map((u) => {
        let status;
        if (leaveSet.has(String(u._id))) status = "on-leave";
        else if (ctx.isOff) status = ctx.type; // "week-off" or "holiday"
        else if (ctx.cutoffPassed) status = "absent";
        else status = "not-marked";

        // Unsaved document, only used to build the response
        return new Attendance({ employee: u._id, date: start, status, isLate: false, source: "system" });
    });

    return { ctx, rows };
}

module.exports = {
    CONFIG,
    normalizeYmd,
    addDaysYmd,
    dayContext,
    markAbsentForDate,
    markAbsentRange,
    buildVirtualRows,
};










// /**
//  * Attendance sync: decides who is "missing" on a date and turns them into Absent.
//  *
//  * Used by:
//  *   - jobs/attendanceCron.js          (automatic, every night)
//  *   - scripts/backfillAttendance.js   (one time, for old dates)
//  *   - controllers/attendanceController.js
//  *        getAttendance        -> shows missing employees as virtual rows (not saved)
//  *        markAbsentBulk       -> admin saves them as Absent with one click
//  */
// const Attendance = require("../models/Attendance");
// const User = require("../models/User");
// const Holiday = require("../models/Holiday");
// const { ymdIST, dayRangeIST, inScope } = require("./accessScope");
// const { getOffInfo } = require("./workCalendar");

// /* ------------------------------------------------------------------ */
// /* SETTINGS: change these to match your company                       */
// /* ------------------------------------------------------------------ */
// const CONFIG = {
//     // 0 = Sunday, 1 = Monday ... 6 = Saturday. Example for Sunday + 2nd/4th Saturday style: handle in isWeeklyOff().
//     WEEKLY_OFF_DAYS: [0],

//     // After this time (minutes from midnight, India time) a missing employee is shown / saved as Absent.
//     // 23 * 60 + 30 = 11:30 PM. Keep it equal to the cron time in jobs/attendanceCron.js.
//     CUTOFF_MINUTES: 23 * 60 + 30,
//     CUTOFF_LABEL: "11:30 PM",

//     // Login accounts with these roles are not tracked for attendance.
//     EXCLUDED_ROLES: ["admin"],

//     // Accounts with these statuses are skipped (only works if your User model has isActive / status).
//     INACTIVE_STATUSES: ["inactive", "terminated", "exited", "exit"],

//     // Optional: if you have a Leave model, approved leave days become "on-leave" instead of "absent".
//     // Set enabled: true and fix the field names below. Leave it false if you are not sure.
//     LEAVE: {
//         enabled: true,
//         modelPath: "../models/Leave",
//         employeeField: "employee",
//         fromField: "startDate",
//         toField: "endDate",
//         statusField: "status",
//         approvedValue: /^approved$/i,
//     },
// };

// /* ------------------------------------------------------------------ */
// /* Date helpers (all in India time)                                    */
// /* ------------------------------------------------------------------ */
// const YMD_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// const normalizeYmd = (value) => (YMD_REGEX.test(String(value || "")) ? String(value) : ymdIST(new Date()));

// const weekdayOf = (ymd) => new Date(`${ymd}T12:00:00+05:30`).getUTCDay();

// const addDaysYmd = (ymd, n) => ymdIST(new Date(new Date(`${ymd}T12:00:00+05:30`).getTime() + n * 86400000));

// const isWeeklyOff = (ymd) => CONFIG.WEEKLY_OFF_DAYS.includes(weekdayOf(ymd));

// /* ------------------------------------------------------------------ */
// /* Day context: holiday / weekly off / future / cutoff passed          */
// /* ------------------------------------------------------------------ */
// // async function getOffDay(ymd) {
// //     const holiday = await Holiday.findOne({ date: ymd }).lean();
// //     if (holiday) return { isOff: true, type: "holiday", name: holiday.name || "Holiday" };
// //     if (isWeeklyOff(ymd)) return { isOff: true, type: "week-off", name: "Weekly off" };
// //     return { isOff: false, type: "", name: "" };
// // }

// async function getOffDay(ymd) {
//     const o = await getOffInfo(ymd);
//     return {
//         isOff: o.off,
//         type: o.type === "weekly" ? "week-off" : o.type || "",
//         name: o.name || "",
//     };
// }

// async function dayContext(ymd) {
//     const today = ymdIST(new Date());
//     const isFuture = ymd > today;
//     const isToday = ymd === today;

//     let cutoffPassed = ymd < today;
//     if (isToday) {
//         const minutes = (Date.now() - dayRangeIST(today).start.getTime()) / 60000;
//         cutoffPassed = minutes >= CONFIG.CUTOFF_MINUTES;
//     }

//     const off = await getOffDay(ymd);
//     return { date: ymd, today, isFuture, isToday, cutoffPassed, cutoffLabel: CONFIG.CUTOFF_LABEL, ...off };
// }

// /* ------------------------------------------------------------------ */
// /* Who must have attendance on this date                               */
// /* ------------------------------------------------------------------ */
// async function eligibleUsers(ymd) {
//     const query = {};
//     if (CONFIG.EXCLUDED_ROLES.length) {
//         query.role = { $nin: CONFIG.EXCLUDED_ROLES.map((r) => new RegExp(`^${r}$`, "i")) };
//     }
//     query.isActive = { $ne: false };
//     query.status = { $nin: CONFIG.INACTIVE_STATUSES.map((s) => new RegExp(`^${s}$`, "i")) };

//     const users = await User.find(query).select("_id name role createdAt dateOfJoining joiningDate").lean();

//     // Nobody is marked absent for days before he joined.
//     return users.filter((u) => {
//         const joined = u.dateOfJoining || u.joiningDate || u.createdAt;
//         return !joined || ymdIST(new Date(joined)) <= ymd;
//     });
// }

// async function leaveUserIds(ymd, userIds) {
//     const L = CONFIG.LEAVE;
//     if (!L.enabled || !userIds.length) return new Set();
//     try {
//         const Leave = require(L.modelPath);
//         const { start, end } = dayRangeIST(ymd);
//         const rows = await Leave.find({
//             [L.employeeField]: { $in: userIds },
//             [L.statusField]: L.approvedValue,
//             [L.fromField]: { $lt: end },
//             [L.toField]: { $gte: start },
//         })
//             .select(L.employeeField)
//             .lean();
//         return new Set(rows.map((r) => String(r[L.employeeField])));
//     } catch (err) {
//         console.error("Leave lookup failed, ignoring leaves:", err.message);
//         return new Set();
//     }
// }

// /* Eligible employees (inside the viewer's scope) who have NO attendance row on this date */
// async function findMissing(ymd, scope = null) {
//     const { start, end } = dayRangeIST(ymd);
//     const users = (await eligibleUsers(ymd)).filter((u) => inScope(scope, u._id));
//     if (!users.length) return { missing: [], leaveSet: new Set() };

//     const ids = users.map((u) => u._id);
//     const existing = await Attendance.distinct("employee", { employee: { $in: ids }, date: { $gte: start, $lt: end } });
//     const have = new Set(existing.map(String));

//     const missing = users.filter((u) => !have.has(String(u._id)));
//     const leaveSet = await leaveUserIds(ymd, missing.map((u) => u._id));
//     return { missing, leaveSet };
// }

// /* ------------------------------------------------------------------ */
// /* 1) Save Absent rows (cron, backfill, admin bulk button)             */
// /* ------------------------------------------------------------------ */
// async function markAbsentForDate(ymd, { scope = null, source = "system", markedBy, force = false } = {}) {
//     const ctx = await dayContext(ymd);
//     if (ctx.isFuture) return { created: 0, skipped: "future", ctx };
//     if (ctx.isOff && !force) return { created: 0, skipped: ctx.type, ctx };

//     const { start } = dayRangeIST(ymd);
//     const { missing, leaveSet } = await findMissing(ymd, scope);
//     if (!missing.length) return { created: 0, skipped: "", ctx };

//     const ops = missing.map((u) => {
//         const onLeave = leaveSet.has(String(u._id));
//         const doc = {
//             status: onLeave ? "on-leave" : "absent",
//             isLate: false,
//             source,
//             notes: onLeave ? "Approved leave" : source === "system" ? "Auto marked absent: no punch-in" : "Marked absent by admin",
//         };
//         if (markedBy) doc.markedBy = markedBy;
//         return {
//             updateOne: {
//                 filter: { employee: u._id, date: start },
//                 // $setOnInsert never overwrites a row that already exists (employee punched in meanwhile)
//                 update: { $setOnInsert: doc },
//                 upsert: true,
//             },
//         };
//     });

//     let created = 0;
//     try {
//         const result = await Attendance.bulkWrite(ops, { ordered: false });
//         created = result.upsertedCount ?? result.nUpserted ?? 0;
//     } catch (err) {
//         // 11000 = duplicate: someone punched in at the same moment. That is fine, the other row wins.
//         if (err.code !== 11000 && !err.writeErrors?.every?.((e) => e.code === 11000)) throw err;
//         created = err.result?.upsertedCount ?? 0;
//     }
//     return { created, skipped: "", ctx };
// }

// /* ------------------------------------------------------------------ */
// /* 2) Virtual rows for the admin list (nothing is saved)               */
// /*    status: absent | not-marked | on-leave | week-off | holiday      */
// /* ------------------------------------------------------------------ */
// async function buildVirtualRows(ymd, scope = null) {
//     const ctx = await dayContext(ymd);
//     if (ctx.isFuture) return { ctx, rows: [] };

//     const { start } = dayRangeIST(ymd);
//     const { missing, leaveSet } = await findMissing(ymd, scope);

//     const rows = missing.map((u) => {
//         let status;
//         if (leaveSet.has(String(u._id))) status = "on-leave";
//         else if (ctx.isOff) status = ctx.type; // "week-off" or "holiday"
//         else if (ctx.cutoffPassed) status = "absent";
//         else status = "not-marked";

//         // Unsaved document, only used to build the response
//         return new Attendance({ employee: u._id, date: start, status, isLate: false, source: "system" });
//     });

//     return { ctx, rows };
// }

// module.exports = {
//     CONFIG,
//     normalizeYmd,
//     addDaysYmd,
//     dayContext,
//     markAbsentForDate,
//     buildVirtualRows,
// };