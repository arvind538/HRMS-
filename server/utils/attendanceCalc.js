const Attendance = require("../models/Attendance");
const Leave = require("../models/Leave");
const User = require("../models/User");
const { monthRangeIST, ymdIST } = require("./accessScopeBase");
const { offDayMap, offInfoFrom } = require("./workCalendar");

const pad = (n) => String(n).padStart(2, "0");
const lastDay = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const norm = (s) => String(s || "").toLowerCase().trim();
const CAME = ["present", "late", "half-day", "half day"];

/* Counts every day of the given months for these employees. Records may point to an employee id or a login id, both are handled.
   Per month: workingDays, came, present, late, half, absent, leave, off (Sunday + holidays + company off), extra (worked on an off day), hours, lop (days without pay), attendancePct */
async function compute(emps, year, months) {
    const m1 = Math.min(...months), m2 = Math.max(...months);
    const from = `${year}-${pad(m1)}-01`, to = `${year}-${pad(m2)}-${pad(lastDay(year, m2))}`;
    const today = ymdIST(new Date());
    const empIds = emps.map((e) => e._id);

    const users = await User.find({ employee: { $in: empIds } }).select("_id employee").lean();
    const keyToEmp = new Map(empIds.map((i) => [String(i), String(i)]));
    users.forEach((u) => keyToEmp.set(String(u._id), String(u.employee)));
    const keys = [...keyToEmp.keys()];
    const start = monthRangeIST(m1, year).start, end = monthRangeIST(m2, year).end;

    const [records, leaves, offs] = await Promise.all([
        Attendance.find({ employee: { $in: keys }, date: { $gte: start, $lt: end } }).select("employee date status checkIn checkOut workHours isLate").lean(),
        Leave.find({ employee: { $in: keys }, status: /^approved$/i }).select("employee startDate endDate fromDate toDate").lean(),
        offDayMap(from, to),
    ]);

    const recMap = new Map();
    records.forEach((r) => {
        const id = keyToEmp.get(String(r.employee?._id || r.employee));
        const k = ymdIST(r.date);
        if (!id || !k) return;
        if (!recMap.has(id)) recMap.set(id, new Map());
        const day = recMap.get(id);
        if (!day.has(k) || (!day.get(k).checkIn && r.checkIn)) day.set(k, r);
    });

    const leaveMap = new Map();
    leaves.forEach((l) => {
        const id = keyToEmp.get(String(l.employee?._id || l.employee));
        const s = l.startDate || l.fromDate;
        const e = l.endDate || l.toDate || s;
        if (!id || !s) return; // no date means no leave (ymdIST(undefined) would give today)
        if (!leaveMap.has(id)) leaveMap.set(id, []);
        leaveMap.get(id).push([ymdIST(s), ymdIST(e)]);
    });

    const out = new Map();
    for (const e of emps) {
        const id = String(e._id);
        const join = e.dateOfJoining ? ymdIST(e.dateOfJoining) : "";
        const recs = recMap.get(id) || new Map();
        const lv = leaveMap.get(id) || [];
        const monthsOut = [], days = [];

        for (const m of months) {
            const b = { month: m, workingDays: 0, came: 0, present: 0, late: 0, half: 0, absent: 0, leave: 0, off: 0, extra: 0, hours: 0, credit: 0 };
            for (let d = 1; d <= lastDay(year, m); d++) {
                const ymd = `${year}-${pad(m)}-${pad(d)}`;
                if (ymd > today) { days.push({ d: ymd, s: "future" }); continue; }
                if (join && ymd < join) { days.push({ d: ymd, s: "none" }); continue; }

                const r = recs.get(ymd);
                const st = norm(r?.status);
                const off = offInfoFrom(offs, ymd);
                const came = Boolean(r && (r.checkIn || CAME.includes(st)));
                let s;

                if (came) {
                    s = st === "late" || r.isLate ? "late" : st.startsWith("half") ? "half" : "present";
                    b.came++;
                    b[s]++;
                    b.hours += Number(r.workHours) || (r.checkIn && r.checkOut ? Math.max(0, (new Date(r.checkOut) - new Date(r.checkIn)) / 3600000) : 0);
                    if (off.off) b.extra++;
                    else { b.workingDays++; b.credit += s === "half" ? 0.5 : 1; }
                } else if (off.off) {
                    s = off.type === "weekly" ? "off" : "holiday"; // never absent
                    b.off++;
                } else if (lv.some(([a, z]) => ymd >= a && ymd <= z)) {
                    s = "leave"; b.workingDays++; b.leave++;
                } else if (ymd === today && st !== "absent") {
                    s = "pending"; // the day is not over yet
                } else {
                    s = "absent"; b.workingDays++; b.absent++;
                }
                days.push({ d: ymd, s, n: off.off ? off.name : undefined, in: r?.checkIn || undefined, out: r?.checkOut || undefined });
            }
            const denom = b.workingDays - b.leave;
            b.attendancePct = denom > 0 ? Math.min(100, Math.round((b.credit / denom) * 100)) : 0;
            b.lop = b.absent + b.half * 0.5; // days that are not paid
            b.hours = Math.round(b.hours * 100) / 100;
            delete b.credit;
            monthsOut.push(b);
        }
        out.set(id, { months: monthsOut, days });
    }
    return out;
}

/* For payroll. Sunday, holidays and company off days are paid. Only absent days (and half of a half day) are cut.
   Returns { calendarDays, workingDays, offDays, absentDays, halfDays, leaveDays, lopDays, paidDays } */
async function payrollDays(employee, month, year) {
    const calc = (await compute([employee], year, [month])).get(String(employee._id));
    const b = calc.months[0];
    const calendarDays = lastDay(year, month);
    const today = ymdIST(new Date());
    // a month that has not finished: only the days gone by can have a cut, the rest are not counted
    const lop = Math.min(calendarDays, b.lop);
    return {
        calendarDays, workingDays: b.workingDays, offDays: b.off, absentDays: b.absent, halfDays: b.half, leaveDays: b.leave,
        lopDays: lop, paidDays: Math.max(0, calendarDays - lop), isCurrentMonth: today.startsWith(`${year}-${pad(month)}`),
    };
}

module.exports = { compute, payrollDays, lastDay };