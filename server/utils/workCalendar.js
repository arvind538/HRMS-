const mongoose = require("mongoose");
const CompanyOffDay = require("../models/CompanyOffDay");
const { ymdIST } = require("./accessScopeBase");

/* ONLY Sunday is the weekly off, whatever the Settings say. 0 = Sunday. */
const WEEK_OFF = [0];
const dowOf = (ymd) => new Date(`${ymd}T00:00:00Z`).getUTCDay();

/* the project's Holiday model, whatever it is called */
function holidayModel() {
    for (const n of ["Holiday", "Holidays", "PublicHoliday", "CompanyHoliday"]) if (mongoose.models[n]) return mongoose.models[n];
    for (const p of ["../models/Holiday", "../models/Holidays", "../models/PublicHoliday"]) {
        try { return require(p); } catch { /* try the next name */ }
    }
    return null;
}

const addDays = (ymd, n) => {
    const d = new Date(`${ymd}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
};

/* Map of "YYYY-MM-DD" -> { type, name } for approved company off days and public holidays (a holiday can span many days) */
async function offDayMap(from, to) {
    const map = new Map();

    const rows = await CompanyOffDay.find({ status: "approved", date: { $gte: from, $lte: to } }).select("date name").lean();
    rows.forEach((r) => map.set(r.date, { type: "company", name: r.name }));

    const Holiday = holidayModel();
    if (Holiday) {
        try {
            const list = await Holiday.find({}).lean();
            list.forEach((h) => {
                if (h.optional || h.isOptional) return; // optional holidays are not off for everyone
                const startRaw = h.date || h.startDate || h.holidayDate || h.fromDate;
                const endRaw = h.endDate || h.toDate || startRaw;
                const a = startRaw ? ymdIST(startRaw) : "";
                const z = endRaw ? ymdIST(endRaw) : a;
                if (!a) return;
                for (let d = a, i = 0; d <= z && i < 31; d = addDays(d, 1), i++) {
                    if (d >= from && d <= to && !map.has(d)) map.set(d, { type: "holiday", name: h.title || h.name || h.holiday || "Holiday" });
                }
            });
        } catch (err) {
            console.error("Holiday read failed:", err.message); // visible in the terminal, never silent
        }
    } else {
        console.warn("workCalendar: no Holiday model found, public holidays are not counted as off days.");
    }
    return map;
}

/* { off, type: "weekly" | "company" | "holiday", name } for one day, using a map from offDayMap */
function offInfoFrom(map, ymd) {
    if (WEEK_OFF.includes(dowOf(ymd))) return { off: true, type: "weekly", name: "Sunday" }; // Sunday always wins
    const hit = map.get(ymd);
    if (hit) return { off: true, ...hit };
    return { off: false };
}

const getOffInfo = async (ymd) => offInfoFrom(await offDayMap(ymd, ymd), ymd);

module.exports = { WEEK_OFF, dowOf, offDayMap, offInfoFrom, getOffInfo };









// // server/utils/workCalendar.js
// // Ek hi jagah tay karti hai ki koi din off hai ya nahi.
// // Off din: (1) Sunday (weekly off) (2) admin ne Holiday me add kiya din (company closed / holiday)
// const Holiday = require("../models/Holiday");

// const WEEK_OFF_DAYS = [0]; // 0 = Sunday. Sirf Sunday weekly off hai.

// const isYmd = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ""));

// // YYYY-MM-DD ka weekday, timezone se bina prabhavit (UTC par calculate)
// const dowOf = (ymd) => new Date(`${ymd}T00:00:00Z`).getUTCDay();

// const isWeeklyOff = (ymd) => WEEK_OFF_DAYS.includes(dowOf(ymd));

// /**
//  * Ek din ka off status (database se).
//  * @param {string} ymd  "2026-11-01"
//  * @returns {Promise<{off: boolean, type: "weekly"|"holiday"|null, name: string}>}
//  */
// async function getOffInfo(ymd) {
//     if (!isYmd(ymd)) return { off: false, type: null, name: "" };

//     // Holiday / company closure (optional holiday off nahi maana jata)
//     const holiday = await Holiday.findOne({ date: ymd }).lean();
//     if (holiday && !holiday.optional) {
//         return { off: true, type: "holiday", name: holiday.name || "Holiday" };
//     }

//     if (isWeeklyOff(ymd)) {
//         return { off: true, type: "weekly", name: "Weekly Off" };
//     }

//     return { off: false, type: null, name: "" };
// }

// /**
//  * Ek range (ya poore saal) ke sab off-days ka Map.
//  * Use:  offDayMap("2026-11-01", "2026-11-30")   ya   offDayMap(2026)
//  * @returns {Promise<Map<string, {off: boolean, type: string, name: string}>>}
//  */
// async function offDayMap(from, to) {
//     let startYmd;
//     let endYmd;

//     if (to === undefined && /^\d{4}$/.test(String(from))) {
//         // offDayMap(2026): poora saal
//         startYmd = `${from}-01-01`;
//         endYmd = `${from}-12-31`;
//     } else {
//         startYmd = String(from || "");
//         endYmd = String(to || from || "");
//     }

//     const map = new Map();
//     if (!isYmd(startYmd) || !isYmd(endYmd) || startYmd > endYmd) return map;

//     // Holidays (optional ko chhod kar)
//     const holidays = await Holiday.find({ date: { $gte: startYmd, $lte: endYmd } }).lean();
//     holidays.forEach((h) => {
//         if (!h.optional) {
//             map.set(h.date, { off: true, type: "holiday", name: h.name || "Holiday" });
//         }
//     });

//     // Sunday (weekly off) har din ke liye, holiday ko overwrite nahi karta
//     const cursor = new Date(`${startYmd}T00:00:00Z`);
//     const last = new Date(`${endYmd}T00:00:00Z`);
//     while (cursor <= last) {
//         const ymd = cursor.toISOString().slice(0, 10);
//         if (!map.has(ymd) && isWeeklyOff(ymd)) {
//             map.set(ymd, { off: true, type: "weekly", name: "Weekly Off" });
//         }
//         cursor.setUTCDate(cursor.getUTCDate() + 1);
//     }

//     return map;
// }

// /**
//  * Sync version: offDayMap se pehle se bane map me se ek din ka status dekho.
//  * Use:  offInfoFrom("2026-11-01", map)
//  * Map na ho to sirf Sunday check hota hai.
//  * @returns {{off: boolean, type: string|null, name: string}}
//  */
// function offInfoFrom(ymd, map) {
//     const none = { off: false, type: null, name: "" };
//     if (!isYmd(ymd)) return none;

//     if (map) {
//         const hit = typeof map.get === "function" ? map.get(ymd) : map[ymd];
//         if (hit) return hit;
//     }

//     if (isWeeklyOff(ymd)) return { off: true, type: "weekly", name: "Weekly Off" };
//     return none;
// }

// module.exports = { getOffInfo, offDayMap, offInfoFrom, isWeeklyOff, WEEK_OFF_DAYS };