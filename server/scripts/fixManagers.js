require("dotenv").config();
const mongoose = require("mongoose");
const Employee = require("../models/Employee");

(async () => {
    await mongoose.connect(process.env.MONGO_URI);
    const col = Employee.collection; // raw, so old text values do not break
    const all = await col.find({}, { projection: { name: 1, employeeId: 1, reportingManager: 1 } }).toArray();
    let fixed = 0, cleared = 0;
    for (const e of all) {
        const v = e.reportingManager;
        if (!v || typeof v !== "string") continue;
        const t = v.trim().toLowerCase();
        const boss = all.find((x) => String(x._id) !== String(e._id) && (String(x.name || "").trim().toLowerCase() === t || String(x.employeeId || "").toLowerCase() === t));
        if (boss) { await col.updateOne({ _id: e._id }, { $set: { reportingManager: boss._id } }); fixed++; }
        else { await col.updateOne({ _id: e._id }, { $set: { reportingManager: null } }); cleared++; console.log("No match:", e.name, "->", v); }
    }
    console.log({ fixed, cleared });
    process.exit(0);
})();