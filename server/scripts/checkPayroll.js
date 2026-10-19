// Usage:  node scripts/checkPayroll.js
require("dotenv").config();
const dns = require("dns");
try {
    dns.setServers(["8.8.8.8", "8.8.4.4"]);
} catch { }

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const root = path.join(__dirname, "..");
let problems = 0;

/* [file, text, label, must it be inside?] */
const fileChecks = [
    ["utils/payrollEngine.js", "loginIdsOf", "Payroll engine is the new one", true],
    ["controllers/payslipController.js", "reopenPayroll", "Payslip controller is the fixed one", true],
    ["controllers/payslipController.js", "const cleanReceipt", "Claim edit helper exists", true],
    ["controllers/payrollController.js", "exports.generateBulkPayroll", "Old generate is REMOVED from payrollController", false],
    ["controllers/payrollController.js", "exports.getPayslip =", "Old payslip code is REMOVED from payrollController", false],
    ["routes/payrollRoutes.js", "slip.generateBulkPayroll", "Routes use the new generate", true],
    ["routes/payrollRoutes.js", "reopenPayroll", "Reopen route exists", true],
];

fileChecks.forEach(([file, needle, label, mustHave]) => {
    const full = path.join(root, file);
    if (!fs.existsSync(full)) {
        console.log(`FAIL  ${label}  (file not found: ${file})`);
        problems += 1;
        return;
    }
    const has = fs.readFileSync(full, "utf8").includes(needle);
    const ok = mustHave ? has : !has;
    console.log(`${ok ? "OK  " : "FAIL"}  ${label}  (${file})`);
    if (!ok) problems += 1;
});

(async () => {
    const Payroll = require("../models/Payroll");
    ["workingDays", "unpaidDays", "basis", "loanBreakup", "settled", "allowances.special", "deductions.lop"].forEach((p) => {
        const ok = Boolean(Payroll.schema.path(p));
        console.log(`${ok ? "OK  " : "FAIL"}  Payroll model has "${p}"`);
        if (!ok) problems += 1;
    });

    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000, family: 4 });

    const total = await Payroll.collection.countDocuments({});
    const legacy = await Payroll.collection
        .aggregate([{ $match: { workingDays: { $exists: false } } }, { $group: { _id: "$status", count: { $sum: 1 } } }])
        .toArray();

    console.log(`\nPayslips in the database: ${total}`);
    if (!legacy.length) console.log("No old-format payslips. Everything was made by the new code.");
    legacy.forEach((l) => {
        const advice =
            l._id === "draft"
                ? "Generate again with 'Refresh drafts' ticked."
                : l._id === "processed"
                    ? "Admin: open the menu of the payslip, Reopen as Draft, then Generate with 'Refresh drafts'."
                    : "Paid. These cannot be changed. Delete the test ones directly in Atlas.";
        console.log(`  ${l.count} old-format ${l._id} payslip(s). ${advice}`);
    });

    console.log(problems ? `\n${problems} problem(s) found. Fix the FAIL lines first.` : "\nAll checks passed.");
    await mongoose.disconnect();
})().catch((err) => {
    console.error("Check failed:", err.message);
    process.exit(1);
});