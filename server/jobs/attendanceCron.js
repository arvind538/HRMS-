const cron = require("node-cron");
const { markAbsentForDate } = require("../utils/attendanceSync");
const { ymdIST } = require("../utils/accessScope");

// Har raat 11:30 PM (India time) par aaj ki missing attendance Absent / On leave save karo
cron.schedule(
    "30 23 * * *",
    async () => {
        try {
            const result = await markAbsentForDate(ymdIST(new Date()), { source: "system" });
            console.log("[attendanceCron] absent sync:", result.created, "created", result.skipped ? `(skipped: ${result.skipped})` : "");
        } catch (err) {
            console.error("[attendanceCron] failed:", err.message);
        }
    },
    { timezone: "Asia/Kolkata" }
);

module.exports = {};










// /**
//  * Automatic Absent job.
//  *
//  *   23:30 IST  -> marks today's missing employees as Absent
//  *   00:10 IST  -> safety run for yesterday (in case the 23:30 run failed)
//  *   on start   -> catches up the last 3 days (server was down / restarted)
//  *
//  * It is safe to run many times: rows that already exist are never changed (unique index + $setOnInsert).
//  * Holidays and weekly off days are skipped automatically.
//  *
//  * Install once:  npm i node-cron
//  */
// const cron = require("node-cron");
// const { ymdIST, TZ } = require("../utils/accessScope");
// const { dayContext, markAbsentForDate, addDaysYmd } = require("../utils/attendanceSync");

// const TIMEZONE = typeof TZ === "string" && TZ ? TZ : "Asia/Kolkata";

// async function runFor(ymd, reason) {
//     try {
//         const ctx = await dayContext(ymd);
//         if (ctx.isFuture || !ctx.cutoffPassed) return; // the day is still open
//         const result = await markAbsentForDate(ymd, { source: "system" });
//         if (result.skipped) {
//             console.log(`[attendance-cron] ${ymd} skipped (${result.skipped}) [${reason}]`);
//         } else {
//             console.log(`[attendance-cron] ${ymd}: ${result.created} marked absent [${reason}]`);
//         }
//     } catch (err) {
//         console.error(`[attendance-cron] ${ymd} failed [${reason}]:`, err.message);
//     }
// }

// exports.start = () => {
//     const today = () => ymdIST(new Date());

//     cron.schedule("30 23 * * *", () => runFor(today(), "nightly"), { timezone: TIMEZONE });
//     cron.schedule("10 0 * * *", () => runFor(addDaysYmd(today(), -1), "safety"), { timezone: TIMEZONE });

//     // Catch up after a restart (wait a little so the database connection is ready)
//     setTimeout(async () => {
//         for (let i = 3; i >= 0; i--) await runFor(addDaysYmd(today(), -i), "startup");
//     }, 15000);

//     console.log(`[attendance-cron] scheduled (23:30 and 00:10, ${TIMEZONE})`);
// };