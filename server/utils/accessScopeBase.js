const mongoose = require("mongoose");
const Employee = require("../models/Employee");
const User = require("../models/User");
const { lower } = require("./teamScope");

const pad = (n) => String(n).padStart(2, "0");
const IST = "+05:30";

/* any date (Date, ISO string, YYYY-MM-DD) -> "YYYY-MM-DD" of the India day */
function ymdIST(v = new Date()) {
    if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

/* one India day: { start, end } where start <= time < end. No date = today. */
function dayRangeIST(date) {
    const ymd = ymdIST(date || new Date()) || ymdIST(new Date());
    const start = new Date(`${ymd}T00:00:00.000${IST}`);
    return { start, end: new Date(start.getTime() + 86400000) };
}

/* first day of the month (India time) and the first day of the next month.
   If month/year is missing or wrong, current India month is used. */
function monthRangeIST(month, year) {
    let m = Number(month);
    let y = Number(year);

    if (!Number.isInteger(m) || m < 1 || m > 12 || !Number.isInteger(y) || y < 1970) {
        const [cy, cm] = ymdIST(new Date()).split("-").map(Number);
        y = cy;
        m = cm;
    }

    const start = new Date(`${y}-${pad(m)}-01T00:00:00.000${IST}`);
    const end = new Date(`${m === 12 ? y + 1 : y}-${pad(m === 12 ? 1 : m + 1)}-01T00:00:00.000${IST}`);
    return { start, end };
}

/* employee ids or login ids -> both kinds of ids, so attendance (employee id) and tasks (login id) both match.
   null means "sees everything" and stays null. */
async function expandIds(ids) {
    if (ids === null || ids === undefined) return null;

    const list = [
        ...new Set(
            []
                .concat(ids)
                .map((x) => String(x?._id || x))
                .filter((x) => mongoose.isValidObjectId(x))
        ),
    ];
    if (!list.length) return [];

    const [users, emps] = await Promise.all([
        User.find({ $or: [{ _id: { $in: list } }, { employee: { $in: list } }] }).select("_id employee").lean(),
        Employee.find({ _id: { $in: list } }).select("email loginEmail").lean(),
    ]);

    const out = new Set(list);
    users.forEach((u) => {
        out.add(String(u._id));
        if (u.employee) out.add(String(u.employee));
    });

    const emails = emps.flatMap((e) => [e.email, e.loginEmail]).map(lower).filter(Boolean);
    if (emails.length) {
        (await User.find({ email: { $in: emails } }).select("_id").lean()).forEach((u) => out.add(String(u._id)));
    }
    return [...out];
}

module.exports = { ymdIST, dayRangeIST, monthRangeIST, expandIds };