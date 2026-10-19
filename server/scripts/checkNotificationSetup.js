const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");

// [file, text that must be inside, what it is, required?]
const checks = [
    ["utils/notify.js", "notifyApprovers", "Notification helper", true],
    ["utils/accessScope.js", "attachPeople", "Access and date helper", true],
    ["models/Notification.js", "recipient", "Notification model", true],
    ["routes/leaveRoutes.js", "my-leaves", "Leave routes (new)", true],
    ["controllers/leaveController.js", "notifyApprovers", "Leave controller sends notifications", true],
    ["controllers/communicationController.js", "getUnreadNotificationCount", "Bell unread count", true],
    ["routes/communicationRoutes.js", "unread-count", "Bell unread count route", true],
    ["controllers/communicationController.js", "announcementAudience", "Announcement notifications", false],
    ["controllers/taskController.js", "notify(", "Task notifications", false],
    ["controllers/payrollController.js", "notifyPayroll", "Payslip notifications", false],
    ["controllers/attendanceController.js", "notify(", "Attendance notifications", false],
];

let missingRequired = 0;

checks.forEach(([file, needle, label, required]) => {
    const full = path.join(root, file);
    if (!fs.existsSync(full)) {
        console.log(`${required ? "FAIL" : "skip"}  ${label}  (file not found: ${file})`);
        if (required) missingRequired += 1;
        return;
    }
    const ok = fs.readFileSync(full, "utf8").includes(needle);
    console.log(`${ok ? "OK  " : required ? "FAIL" : "skip"}  ${label}  (${file})`);
    if (!ok && required) missingRequired += 1;
});

console.log(
    missingRequired
        ? `\n${missingRequired} required item(s) are missing. Update those files and restart the server.`
        : "\nAll required files are in place."
);