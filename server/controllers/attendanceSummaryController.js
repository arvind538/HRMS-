const mongoose = require("mongoose");
const Employee = require("../models/Employee");
const { getScopeIds, inScope } = require("../utils/accessScope");
const { ymdIST } = require("../utils/accessScopeBase");
const { myEmployee } = require("../utils/teamScope");
const { compute } = require("../utils/attendanceCalc");
const { _helpers: P } = require("./performanceController");

const LEFT = /^(inactive|exited|exit)$/i;
const norm = (s) => String(s || "").toLowerCase().trim();
const bad = (res, message, status = 400) => res.status(status).json({ success: false, message });
const label = (map, v) => (!v ? "" : typeof v === "object" ? v.name || v.title || "" : map.get(String(v)) || (mongoose.isValidObjectId(String(v)) ? "" : String(v)));

async function scopedEmployees(req) {
    const scope = await getScopeIds(req);
    const filter = { employeeStatus: { $not: LEFT }, status: { $not: LEFT } };
    if (scope !== null) filter._id = { $in: scope.filter((i) => mongoose.isValidObjectId(i)) };
    return Employee.find(filter).select("name employeeId department designation dateOfJoining").sort({ name: 1 }).limit(2000).lean();
}

const yearOf = (v) => { const y = Number(v); return y >= 2000 && y <= 2100 ? y : Number(ymdIST(new Date()).slice(0, 4)); };

// GET /attendance/monthly-summary?month=&year=&department=&q=   admin, HR: everyone. Manager: team.
exports.getMonthlySummary = async (req, res, next) => {
    try {
        const nowParts = ymdIST(new Date()).split("-").map(Number);
        const year = yearOf(req.query.year || nowParts[0]);
        const month = Number(req.query.month) || nowParts[1];
        if (!(month >= 1 && month <= 12)) return bad(res, "Please select a valid month.");

        const [emps, maps] = await Promise.all([scopedEmployees(req), P.nameMaps()]);
        const q = norm(req.query.q), dept = norm(req.query.department);
        const list = emps
            .map((e) => ({ e, department: label(maps.dept, e.department), designation: label(maps.desig, e.designation) }))
            .filter((x) => (!dept || norm(x.department) === dept) && (!q || `${x.e.name} ${x.e.employeeId || ""}`.toLowerCase().includes(q)));

        const calc = list.length ? await compute(list.map((x) => x.e), year, [month]) : new Map();
        const rows = list.map((x) => ({ _id: x.e._id, name: x.e.name, employeeId: x.e.employeeId, department: x.department, designation: x.designation, ...calc.get(String(x.e._id)).months[0] }));
        res.json({ success: true, year, month, data: rows });
    } catch (err) {
        next(err);
    }
};

// GET /attendance/employee-year?employee=&year=   an employee sees only himself
exports.getEmployeeYear = async (req, res, next) => {
    try {
        const year = yearOf(req.query.year);
        let target = null;
        if (req.query.employee) {
            if (!mongoose.isValidObjectId(req.query.employee)) return bad(res, "Please select a valid employee.");
            const scope = await getScopeIds(req);
            if (!inScope(scope, req.query.employee)) return bad(res, "You cannot view this employee.", 403);
            target = await Employee.findById(req.query.employee).select("name employeeId department designation dateOfJoining").lean();
        } else {
            const mine = await myEmployee(req);
            if (mine) target = await Employee.findById(mine._id).select("name employeeId department designation dateOfJoining").lean();
        }
        if (!target) return res.json({ success: true, year, employee: null, months: [], days: [], totals: {} });

        const maps = await P.nameMaps();
        const calc = (await compute([target], year, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])).get(String(target._id));
        const sum = (k) => calc.months.reduce((s, m) => s + m[k], 0);
        const active = calc.months.filter((m) => m.workingDays > 0);
        res.json({
            success: true, year,
            employee: { _id: target._id, name: target.name, employeeId: target.employeeId, department: label(maps.dept, target.department), designation: label(maps.desig, target.designation) },
            months: calc.months, days: calc.days,
            totals: {
                workingDays: sum("workingDays"), came: sum("came"), late: sum("late"), half: sum("half"), absent: sum("absent"), leave: sum("leave"), off: sum("off"), extra: sum("extra"),
                hours: Math.round(sum("hours") * 100) / 100,
                attendancePct: active.length ? Math.round(active.reduce((s, m) => s + m.attendancePct, 0) / active.length) : 0,
            },
        });
    } catch (err) {
        next(err);
    }
};










// const mongoose = require("mongoose");
// const Attendance = require("../models/Attendance");
// const Leave = require("../models/Leave");
// const Employee = require("../models/Employee");
// const User = require("../models/User");
// const { getScopeIds, inScope, expandIds } = require("../utils/accessScope");
// const { monthRangeIST, ymdIST } = require("../utils/accessScopeBase");
// const { myEmployee } = require("../utils/teamScope");
// const { offDayMap, offInfoFrom } = require("../utils/workCalendar");
// const { _helpers: P } = require("./performanceController");

// const LEFT = /^(inactive|exited|exit)$/i;
// const pad = (n) => String(n).padStart(2, "0");
// const lastDay = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
// const norm = (s) => String(s || "").toLowerCase().trim();
// const CAME = ["present", "late", "half-day", "half day"];
// const bad = (res, message, status = 400) => res.status(status).json({ success: false, message });
// const label = (map, v) => (!v ? "" : typeof v === "object" ? v.name || v.title || "" : map.get(String(v)) || (mongoose.isValidObjectId(String(v)) ? "" : String(v)));

// /* Counts every day of the given months for these employees. Records may point to an employee id or a login id, both are handled. */
// async function compute(emps, year, months) {
//     const m1 = Math.min(...months), m2 = Math.max(...months);
//     const from = `${year}-${pad(m1)}-01`, to = `${year}-${pad(m2)}-${pad(lastDay(year, m2))}`;
//     const today = ymdIST(new Date());
//     const empIds = emps.map((e) => e._id);

//     const users = await User.find({ employee: { $in: empIds } }).select("_id employee").lean();
//     const keyToEmp = new Map(empIds.map((i) => [String(i), String(i)]));
//     users.forEach((u) => keyToEmp.set(String(u._id), String(u.employee)));
//     const keys = [...keyToEmp.keys()];
//     const start = monthRangeIST(m1, year).start, end = monthRangeIST(m2, year).end;

//     const [records, leaves, offs] = await Promise.all([
//         Attendance.find({ employee: { $in: keys }, date: { $gte: start, $lt: end } }).select("employee date status checkIn checkOut workHours isLate").lean(),
//         Leave.find({ employee: { $in: keys }, status: /^approved$/i }).select("employee startDate endDate fromDate toDate").lean(),
//         // Leave.find({ employee: { $in: keys }, status: /^approved$/i, startDate: { $lte: end }, endDate: { $gte: start } }).select("employee startDate endDate").lean(),
//         offDayMap(from, to),
//     ]);

//     const recMap = new Map();
//     records.forEach((r) => {
//         const id = keyToEmp.get(String(r.employee?._id || r.employee));
//         const k = ymdIST(r.date);
//         if (!id || !k) return;
//         if (!recMap.has(id)) recMap.set(id, new Map());
//         const day = recMap.get(id);
//         if (!day.has(k) || (!day.get(k).checkIn && r.checkIn)) day.set(k, r);
//     });

//     const leaveMap = new Map();
//     leaves.forEach((l) => {
//         const id = keyToEmp.get(String(l.employee?._id || l.employee));
//         const s = l.startDate || l.fromDate;
//         const e = l.endDate || l.toDate || s;
//         if (!id || !s) return; // no date means no leave (ymdIST(undefined) would give today)
//         if (!leaveMap.has(id)) leaveMap.set(id, []);
//         leaveMap.get(id).push([ymdIST(s), ymdIST(e)]);
//     });


//     // const leaveMap = new Map();
//     // leaves.forEach((l) => {
//     //     const id = keyToEmp.get(String(l.employee?._id || l.employee));
//     //     if (!id) return;
//     //     if (!leaveMap.has(id)) leaveMap.set(id, []);
//     //     leaveMap.get(id).push([ymdIST(l.startDate), ymdIST(l.endDate)]);
//     // });

//     const out = new Map();
//     for (const e of emps) {
//         const id = String(e._id);
//         const join = e.dateOfJoining ? ymdIST(e.dateOfJoining) : "";
//         const recs = recMap.get(id) || new Map();
//         const lv = leaveMap.get(id) || [];
//         const monthsOut = [], days = [];

//         for (const m of months) {
//             const b = { month: m, workingDays: 0, came: 0, present: 0, late: 0, half: 0, absent: 0, leave: 0, off: 0, extra: 0, hours: 0, credit: 0 };
//             for (let d = 1; d <= lastDay(year, m); d++) {
//                 const ymd = `${year}-${pad(m)}-${pad(d)}`;
//                 if (ymd > today) { days.push({ d: ymd, s: "future" }); continue; }
//                 if (join && ymd < join) { days.push({ d: ymd, s: "none" }); continue; }

//                 const r = recs.get(ymd);
//                 const st = norm(r?.status);
//                 const off = offInfoFrom(offs, ymd);
//                 const came = Boolean(r && (r.checkIn || CAME.includes(st)));
//                 let s;

//                 if (came) {
//                     s = st === "late" || r.isLate ? "late" : st.startsWith("half") ? "half" : "present";
//                     b.came++;
//                     b[s]++;
//                     b.hours += Number(r.workHours) || (r.checkIn && r.checkOut ? Math.max(0, (new Date(r.checkOut) - new Date(r.checkIn)) / 3600000) : 0);
//                     if (off.off) b.extra++;
//                     else { b.workingDays++; b.credit += s === "half" ? 0.5 : 1; }
//                 } else if (off.off) {
//                     s = off.type === "weekly" ? "off" : "holiday";
//                     b.off++;
//                 } else if (lv.some(([a, z]) => ymd >= a && ymd <= z)) {
//                     s = "leave"; b.workingDays++; b.leave++;
//                 } else if (ymd === today && st !== "absent") {
//                     s = "pending"; // the day is not over yet
//                 } else {
//                     s = "absent"; b.workingDays++; b.absent++;
//                 }
//                 days.push({ d: ymd, s, n: off.off ? off.name : undefined, in: r?.checkIn || undefined, out: r?.checkOut || undefined });
//             }
//             const denom = b.workingDays - b.leave;
//             b.attendancePct = denom > 0 ? Math.min(100, Math.round((b.credit / denom) * 100)) : 0;
//             b.hours = Math.round(b.hours * 100) / 100;
//             delete b.credit;
//             monthsOut.push(b);
//         }
//         out.set(id, { months: monthsOut, days });
//     }
//     return out;
// }

// async function scopedEmployees(req) {
//     const scope = await getScopeIds(req);
//     const filter = { employeeStatus: { $not: LEFT }, status: { $not: LEFT } };
//     if (scope !== null) filter._id = { $in: scope.filter((i) => mongoose.isValidObjectId(i)) };
//     return Employee.find(filter).select("name employeeId department designation dateOfJoining").sort({ name: 1 }).limit(2000).lean();
// }

// const yearOf = (v) => { const y = Number(v); return y >= 2000 && y <= 2100 ? y : Number(ymdIST(new Date()).slice(0, 4)); };

// // GET /attendance/monthly-summary?month=&year=&department=&q=   admin, HR: everyone. Manager: team.
// exports.getMonthlySummary = async (req, res, next) => {
//     try {
//         const nowParts = ymdIST(new Date()).split("-").map(Number);
//         const year = yearOf(req.query.year || nowParts[0]);
//         const month = Number(req.query.month) || nowParts[1];
//         if (!(month >= 1 && month <= 12)) return bad(res, "Please select a valid month.");

//         const [emps, maps] = await Promise.all([scopedEmployees(req), P.nameMaps()]);
//         const q = norm(req.query.q), dept = norm(req.query.department);
//         const list = emps
//             .map((e) => ({ e, department: label(maps.dept, e.department), designation: label(maps.desig, e.designation) }))
//             .filter((x) => (!dept || norm(x.department) === dept) && (!q || `${x.e.name} ${x.e.employeeId || ""}`.toLowerCase().includes(q)));

//         const calc = list.length ? await compute(list.map((x) => x.e), year, [month]) : new Map();
//         const rows = list.map((x) => ({ _id: x.e._id, name: x.e.name, employeeId: x.e.employeeId, department: x.department, designation: x.designation, ...calc.get(String(x.e._id)).months[0] }));
//         res.json({ success: true, year, month, data: rows });
//     } catch (err) {
//         next(err);
//     }
// };

// // GET /attendance/employee-year?employee=&year=   an employee sees only himself
// exports.getEmployeeYear = async (req, res, next) => {
//     try {
//         const year = yearOf(req.query.year);
//         let target = null;
//         if (req.query.employee) {
//             if (!mongoose.isValidObjectId(req.query.employee)) return bad(res, "Please select a valid employee.");
//             const scope = await getScopeIds(req);
//             if (!inScope(scope, req.query.employee)) return bad(res, "You cannot view this employee.", 403);
//             target = await Employee.findById(req.query.employee).select("name employeeId department designation dateOfJoining").lean();
//         } else {
//             const mine = await myEmployee(req);
//             if (mine) target = await Employee.findById(mine._id).select("name employeeId department designation dateOfJoining").lean();
//         }
//         if (!target) return res.json({ success: true, year, employee: null, months: [], days: [], totals: {} });

//         const maps = await P.nameMaps();
//         const calc = (await compute([target], year, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])).get(String(target._id));
//         const sum = (k) => calc.months.reduce((s, m) => s + m[k], 0);
//         const active = calc.months.filter((m) => m.workingDays > 0);
//         res.json({
//             success: true, year,
//             employee: { _id: target._id, name: target.name, employeeId: target.employeeId, department: label(maps.dept, target.department), designation: label(maps.desig, target.designation) },
//             months: calc.months, days: calc.days,
//             totals: {
//                 workingDays: sum("workingDays"), came: sum("came"), late: sum("late"), half: sum("half"), absent: sum("absent"), leave: sum("leave"), extra: sum("extra"),
//                 hours: Math.round(sum("hours") * 100) / 100,
//                 attendancePct: active.length ? Math.round(active.reduce((s, m) => s + m.attendancePct, 0) / active.length) : 0,
//             },
//         });
//     } catch (err) {
//         next(err);
//     }
// };