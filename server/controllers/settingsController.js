const Settings = require("../models/Settings");

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const bad = (res, message) => res.status(400).json({ message });

// There is always exactly one settings document
exports.getSettings = async (req, res, next) => {
    try {
        let settings = await Settings.findOne();
        if (!settings) settings = await Settings.create({});
        res.json(settings);
    } catch (err) {
        next(err);
    }
};

// Only the fields below can be changed, and each one is checked
exports.updateSettings = async (req, res, next) => {
    try {
        const b = req.body || {};
        const set = {};

        if (b.companyName !== undefined) {
            const v = String(b.companyName).trim();
            if (v.length < 2 || v.length > 80) return bad(res, "Company name must be 2 to 80 characters.");
            set.companyName = v;
        }
        if (b.companyAddress !== undefined) {
            const v = String(b.companyAddress).trim();
            if (v.length > 200) return bad(res, "The address can be at most 200 characters.");
            set.companyAddress = v;
        }
        if (b.companyLogo !== undefined) {
            const v = String(b.companyLogo || "");
            if (v.length > 1500000) return bad(res, "The logo file is too large.");
            set.companyLogo = v;
        }
        for (const key of ["officeStartTime", "officeEndTime"]) {
            if (b[key] !== undefined) {
                if (!TIME_RE.test(String(b[key]))) return bad(res, "Office time must look like 09:30.");
                set[key] = String(b[key]);
            }
        }
        if (b.weekOff !== undefined) {
            if (!Array.isArray(b.weekOff)) return bad(res, "Weekly off must be a list of days.");
            const days = [];
            for (const raw of b.weekOff) {
                const day = DAYS.find((d) => d.toLowerCase() === String(raw).trim().toLowerCase());
                if (!day) return bad(res, `"${raw}" is not a valid day.`);
                if (!days.includes(day)) days.push(day);
            }
            if (days.length > 3) return bad(res, "Please select at most 3 weekly off days.");
            set.weekOff = days;
        }
        for (const key of ["sickLeaves", "casualLeaves", "earnedLeaves"]) {
            if (b.leavePolicy?.[key] !== undefined) {
                const n = Number(b.leavePolicy[key]);
                if (!Number.isInteger(n) || n < 0 || n > 365) return bad(res, "Leave days must be a whole number from 0 to 365.");
                set[`leavePolicy.${key}`] = n;
            }
        }
        if (b.payrollCycle !== undefined) {
            if (!["monthly", "bi-weekly"].includes(b.payrollCycle)) return bad(res, "Payroll cycle must be monthly or bi-weekly.");
            set.payrollCycle = b.payrollCycle;
        }
        if (b.emailNotificationsEnabled !== undefined) set.emailNotificationsEnabled = Boolean(b.emailNotificationsEnabled);

        if (!Object.keys(set).length) return bad(res, "There is nothing to update.");

        const settings = await Settings.findOneAndUpdate({}, { $set: set }, { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true });
        res.json(settings);
    } catch (err) {
        next(err);
    }
};








// const Settings = require("../models/Settings");

// // Settings hamesha ek hi document hota hai — isliye "get" mein findOne use kiya hai, find() nahi
// exports.getSettings = async (req, res, next) => {
//     try {
//         let settings = await Settings.findOne();
//         if (!settings) {
//             settings = await Settings.create({}); // pehli baar defaults ke saath bana do
//         }
//         res.json(settings);
//     } catch (err) {
//         next(err);
//     }
// };

// // upsert: true — agar document exist nahi karta toh naya bana dega, warna update karega
// exports.updateSettings = async (req, res, next) => {
//     try {
//         const settings = await Settings.findOneAndUpdate({}, req.body, {
//             new: true,
//             upsert: true,
//             runValidators: true,
//         });
//         res.json(settings);
//     } catch (err) {
//         next(err);
//     }
// };