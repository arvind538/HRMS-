/**
 * One-time script: creates Absent rows for OLD dates where employees have no attendance row.
 *
 * Run from the backend folder:
 *   node scripts/backfillAttendance.js --from=2026-10-01 --to=2026-10-29
 *   node scripts/backfillAttendance.js            (default: last 30 days up to yesterday)
 *
 * Before running, add your holidays (POST /api/attendance/holidays), otherwise holidays become Absent.
 * Weekly off days and days before an employee joined are skipped automatically.
 */
require("dotenv").config();
const mongoose = require("mongoose");
const { ymdIST } = require("../utils/accessScope");
const { addDaysYmd, markAbsentForDate } = require("../utils/attendanceSync");

const arg = (name) => {
    const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
    return hit ? hit.split("=")[1] : "";
};

(async () => {
    const today = ymdIST(new Date());
    const to = arg("to") || addDaysYmd(today, -1);
    const from = arg("from") || addDaysYmd(to, -29);

    const ok = /^\d{4}-\d{2}-\d{2}$/;
    if (!ok.test(from) || !ok.test(to) || from > to) {
        console.error("Use valid dates: --from=YYYY-MM-DD --to=YYYY-MM-DD (from must not be after to)");
        process.exit(1);
    }
    if (to >= today) {
        console.error("--to must be before today. Today is handled by the nightly job.");
        process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    console.log(`Backfilling ${from} -> ${to}`);

    let day = from;
    let total = 0;
    let guard = 0;
    while (day <= to && guard++ < 400) {
        const r = await markAbsentForDate(day, { source: "system" });
        console.log(`${day}: ${r.skipped ? `skipped (${r.skipped})` : `${r.created} absent rows created`}`);
        total += r.created || 0;
        day = addDaysYmd(day, 1);
    }

    console.log(`Done. ${total} rows created.`);
    await mongoose.disconnect();
})().catch((err) => {
    console.error(err);
    process.exit(1);
});