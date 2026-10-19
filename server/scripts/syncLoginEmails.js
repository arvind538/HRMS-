const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);


require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const Employee = require("../models/Employee");

const APPLY = process.argv.includes("--apply"); // without --apply it only prints what it would change
const CI = { locale: "en", strength: 2 };
const lower = (v) => String(v || "").trim().toLowerCase();

(async () => {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    console.log(APPLY ? "MODE: APPLY (changes will be saved)" : "MODE: DRY RUN (nothing is changed)");

    const employees = await Employee.find({}).select("_id name email loginEmail");
    let fixed = 0;
    let skipped = 0;

    for (const emp of employees) {
        const loginEmail = lower(emp.loginEmail || emp.email);

        // Find this employee's login account
        let user = await User.findOne({ employee: emp._id });
        if (!user) {
            for (const mail of [emp.email, emp.loginEmail].map(lower).filter(Boolean)) {
                const found = await User.findOne({ email: mail }).collation(CI);
                if (found && (!found.employee || String(found.employee) === String(emp._id))) {
                    user = found;
                    break;
                }
            }
        }

        if (!user) {
            console.log(`NO LOGIN  ${emp.name} (${loginEmail}): no User account. Set a password from Edit Employee.`);
            skipped++;
            continue;
        }

        const problems = [];
        if (lower(user.email) !== loginEmail) problems.push(`login email "${user.email}" -> "${loginEmail}"`);
        if (!user.employee) problems.push("link to employee profile");
        if (!problems.length) continue;

        const clash = await User.findOne({ email: loginEmail, _id: { $ne: user._id } })
            .collation(CI)
            .select("_id");
        if (clash) {
            console.log(`CONFLICT  ${emp.name}: ${loginEmail} is already used by another account. Fix it by hand.`);
            skipped++;
            continue;
        }

        console.log(`${APPLY ? "FIXED    " : "WOULD FIX"} ${emp.name}: ${problems.join(", ")}`);
        if (APPLY) {
            await User.updateOne({ _id: user._id }, { $set: { email: loginEmail, employee: emp._id } });
        }
        fixed++;
    }

    console.log(`\nDone. ${APPLY ? "Fixed" : "To fix"}: ${fixed}, skipped: ${skipped}, total employees: ${employees.length}`);
    await mongoose.disconnect();
})().catch((err) => {
    console.error("Sync failed:", err.message);
    process.exit(1);
});