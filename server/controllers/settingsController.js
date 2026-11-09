const Settings = require("../models/Settings");

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const bad = (res, message) => res.status(400).json({ message });

exports.getSettings = async (req, res, next) => {
    try {
        let settings = await Settings.findOne();
        if (!settings) settings = await Settings.create({});
        res.json(settings);
    } catch (err) {
        next(err);
    }
};

exports.updateSettings = async (req, res, next) => {
    try {
        const b = req.body || {};
        const set = {};

        // --- General Settings ---
        if (b.general) {
            if (b.general.timezone !== undefined) set["general.timezone"] = String(b.general.timezone).trim();
            if (b.general.dateFormat !== undefined) set["general.dateFormat"] = String(b.general.dateFormat).trim();
            if (b.general.timeFormat !== undefined) {
                if (!["12h", "24h"].includes(b.general.timeFormat)) return bad(res, "Time format must be 12h or 24h.");
                set["general.timeFormat"] = b.general.timeFormat;
            }
            if (b.general.currency !== undefined) set["general.currency"] = String(b.general.currency).trim();
        }

        // --- Company Settings ---
        if (b.company) {
            if (b.company.name !== undefined) {
                const v = String(b.company.name).trim();
                if (v.length < 2 || v.length > 80) return bad(res, "Company name must be 2 to 80 characters.");
                set["company.name"] = v;
            }
            if (b.company.address !== undefined) {
                const v = String(b.company.address).trim();
                if (v.length > 200) return bad(res, "Address can be at most 200 characters.");
                set["company.address"] = v;
            }
            if (b.company.logo !== undefined) {
                const v = String(b.company.logo || "");
                if (v.length > 1500000) return bad(res, "Logo file is too large.");
                set["company.logo"] = v;
            }
            const stringFields = ["website", "email", "phone", "panNumber", "gstNumber", "cinNumber"];
            stringFields.forEach(field => {
                if (b.company[field] !== undefined) set[`company.${field}`] = String(b.company[field]).trim();
            });
        }

        // --- Attendance Settings ---
        if (b.attendance) {
            for (const key of ["officeStartTime", "officeEndTime"]) {
                if (b.attendance[key] !== undefined) {
                    if (!TIME_RE.test(String(b.attendance[key]))) return bad(res, "Office time must look like 09:30.");
                    set[`attendance.${key}`] = String(b.attendance[key]);
                }
            }
            if (b.attendance.weekOff !== undefined) {
                if (!Array.isArray(b.attendance.weekOff)) return bad(res, "Weekly off must be a list of days.");
                const days = [];
                for (const raw of b.attendance.weekOff) {
                    const day = DAYS.find((d) => d.toLowerCase() === String(raw).trim().toLowerCase());
                    if (!day) return bad(res, `"${raw}" is not a valid day.`);
                    if (!days.includes(day)) days.push(day);
                }
                if (days.length > 3) return bad(res, "Select at most 3 weekly off days.");
                set["attendance.weekOff"] = days;
            }
            if (b.attendance.gracePeriodMins !== undefined) set["attendance.gracePeriodMins"] = Number(b.attendance.gracePeriodMins) || 0;
            if (b.attendance.halfDayMarkMins !== undefined) set["attendance.halfDayMarkMins"] = Number(b.attendance.halfDayMarkMins) || 0;
            if (b.attendance.workAvailabilityPercent !== undefined) set["attendance.workAvailabilityPercent"] = Number(b.attendance.workAvailabilityPercent) || 80;
            if (b.attendance.ipValidationMode !== undefined) set["attendance.ipValidationMode"] = String(b.attendance.ipValidationMode);
            if (Array.isArray(b.attendance.ipList)) set["attendance.ipList"] = b.attendance.ipList;
        }

        // --- Leave Settings ---
        if (b.leave) {
            for (const key of ["sickLeaves", "casualLeaves", "earnedLeaves"]) {
                if (b.leave[key] !== undefined) {
                    const n = Number(b.leave[key]);
                    if (!Number.isInteger(n) || n < 0 || n > 365) return bad(res, "Leave days must be a whole number from 0 to 365.");
                    set[`leave.${key}`] = n;
                }
            }
            if (b.leave.carryForwardEnabled !== undefined) set["leave.carryForwardEnabled"] = Boolean(b.leave.carryForwardEnabled);
            if (b.leave.leaveStartMonth !== undefined) set["leave.leaveStartMonth"] = String(b.leave.leaveStartMonth);
            if (Array.isArray(b.leave.paidLeaveStatuses)) set["leave.paidLeaveStatuses"] = b.leave.paidLeaveStatuses;
            if (Array.isArray(b.leave.unpaidLeaveStatuses)) set["leave.unpaidLeaveStatuses"] = b.leave.unpaidLeaveStatuses;
        }

        // --- Payroll Settings ---
        if (b.payroll) {
            if (b.payroll.defaultPayrun) {
                if (b.payroll.defaultPayrun.period !== undefined) set["payroll.defaultPayrun.period"] = String(b.payroll.defaultPayrun.period);
                if (b.payroll.defaultPayrun.generatingType !== undefined) set["payroll.defaultPayrun.generatingType"] = String(b.payroll.defaultPayrun.generatingType);
                if (b.payroll.defaultPayrun.considerOvertime !== undefined) set["payroll.defaultPayrun.considerOvertime"] = Boolean(b.payroll.defaultPayrun.considerOvertime);
            }

            if (b.payroll.badgeValue) {
                if (Array.isArray(b.payroll.badgeValue.allowances)) set["payroll.badgeValue.allowances"] = b.payroll.badgeValue.allowances;
                if (Array.isArray(b.payroll.badgeValue.deductions)) set["payroll.badgeValue.deductions"] = b.payroll.badgeValue.deductions;
            }

            if (b.payroll.manageAudience) {
                if (b.payroll.manageAudience.restrictedPayrun) {
                    if (b.payroll.manageAudience.restrictedPayrun.department !== undefined) set["payroll.manageAudience.restrictedPayrun.department"] = String(b.payroll.manageAudience.restrictedPayrun.department);
                    if (b.payroll.manageAudience.restrictedPayrun.employee !== undefined) set["payroll.manageAudience.restrictedPayrun.employee"] = String(b.payroll.manageAudience.restrictedPayrun.employee);
                }
                if (b.payroll.manageAudience.restrictedBadge) {
                    if (b.payroll.manageAudience.restrictedBadge.employeeStatus !== undefined) set["payroll.manageAudience.restrictedBadge.employeeStatus"] = String(b.payroll.manageAudience.restrictedBadge.employeeStatus);
                }
            }
        }

        // --- Notification Settings ---
        if (b.notifications) {
            if (b.notifications.emailEnabled !== undefined) set["notifications.emailEnabled"] = Boolean(b.notifications.emailEnabled);
            if (b.notifications.smsEnabled !== undefined) set["notifications.smsEnabled"] = Boolean(b.notifications.smsEnabled);
            if (b.notifications.whatsappEnabled !== undefined) set["notifications.whatsappEnabled"] = Boolean(b.notifications.whatsappEnabled);
        }

        // --- Workflow Settings (ADDED THIS PART) ---
        if (b.workflowSettings) {
            if (b.workflowSettings.multiLevelApproval !== undefined) {
                set["workflowSettings.multiLevelApproval"] = Boolean(b.workflowSettings.multiLevelApproval);
            }
        }

        if (!Object.keys(set).length) return bad(res, "There is nothing to update.");

        const settings = await Settings.findOneAndUpdate(
            {},
            { $set: set },
            { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
        );
        res.json(settings);
    } catch (err) {
        next(err);
    }
};