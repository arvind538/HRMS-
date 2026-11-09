require("dotenv").config();
const mongoose = require("mongoose");
const Employee = require("../models/Employee");

const OBJECT_ID = /^[a-f\d]{24}$/i;
const norm = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
const strip = (s) => norm(s).replace(/\s+(sir|madam|mam|ma'am)$/, "");

(async () => {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);

    const col = Employee.collection; // raw collection: no casting, so the old text values can be read
    const all = await col.find({}).project({ name: 1, firstName: 1, lastName: 1, reportingManager: 1 }).toArray();
    const nameOf = (e) => norm(e.name || `${e.firstName || ""} ${e.lastName || ""}`);

    let fixed = 0;
    const cleared = [];

    for (const e of all) {
        const v = e.reportingManager;
        if (typeof v !== "string") continue; // ObjectId or empty = already fine

        if (OBJECT_ID.test(v)) {
            await col.updateOne({ _id: e._id }, { $set: { reportingManager: new mongoose.Types.ObjectId(v) } });
            fixed++;
            continue;
        }

        const base = strip(v);
        const exact = all.filter((x) => nameOf(x) === base);
        const starts = all.filter((x) => nameOf(x).startsWith(`${base} `));
        const matches = exact.length ? exact : starts;

        if (matches.length === 1 && String(matches[0]._id) !== String(e._id)) {
            await col.updateOne({ _id: e._id }, { $set: { reportingManager: matches[0]._id } });
            fixed++;
        } else {
            await col.updateOne({ _id: e._id }, { $set: { reportingManager: null } });
            cleared.push(`${nameOf(e) || e._id}  (was "${v}")`);
        }
    }

    console.log(`Fixed: ${fixed}`);
    console.log(`Cleared (no matching employee): ${cleared.length}`);
    cleared.forEach((c) => console.log("  -", c));
    process.exit(0);
})();








// require("dotenv").config();
// const mongoose = require("mongoose");
// const Employee = require("../models/Employee");

// (async () => {
//     await mongoose.connect(process.env.MONGO_URI);
//     const col = Employee.collection; // raw collection, mongoose casting se bachne ke liye
//     const all = await col.find({}).project({ name: 1, firstName: 1, lastName: 1, reportingManager: 1 }).toArray();

//     const nameOf = (e) => (e.name || `${e.firstName || ""} ${e.lastName || ""}`).trim().toLowerCase();
//     const byName = new Map(all.map((e) => [nameOf(e), e._id]));

//     let fixed = 0;
//     let cleared = 0;
//     for (const e of all) {
//         const v = e.reportingManager;
//         if (!v || typeof v !== "string") continue; // ObjectId ya khali hai, theek hai
//         const hit = byName.get(v.trim().toLowerCase().replace(/\s+sir$/, "")) || byName.get(v.trim().toLowerCase());
//         if (hit && String(hit) !== String(e._id)) {
//             await col.updateOne({ _id: e._id }, { $set: { reportingManager: hit } });
//             fixed++;
//         } else {
//             await col.updateOne({ _id: e._id }, { $set: { reportingManager: null } });
//             cleared++;
//         }
//     }
//     console.log(`Fixed: ${fixed}, cleared (manager not found): ${cleared}`);
//     process.exit(0);
// })();