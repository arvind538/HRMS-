const mongoose = require("mongoose");

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const settingsSchema = new mongoose.Schema(
    {
        // 1. General Settings
        general: {
            timezone: { type: String, default: "Asia/Kolkata" },
            dateFormat: { type: String, default: "DD/MM/YYYY" },
            timeFormat: { type: String, enum: ["12h", "24h"], default: "12h" },
            currency: { type: String, default: "INR" },
        },

        // 2. Company Settings
        company: {
            name: { type: String, default: "My Company", trim: true, maxlength: 80 },
            address: { type: String, default: "", trim: true, maxlength: 200 },
            logo: { type: String, default: "" },
            website: { type: String, default: "", trim: true },
            email: { type: String, default: "", trim: true },
            phone: { type: String, default: "", trim: true },
            panNumber: { type: String, default: "", trim: true },
            gstNumber: { type: String, default: "", trim: true },
            cinNumber: { type: String, default: "", trim: true },
        },

        // 3. Attendance Settings
        attendance: {
            officeStartTime: { type: String, default: "09:30", match: TIME_RE },
            officeEndTime: { type: String, default: "18:30", match: TIME_RE },
            weekOff: { type: [{ type: String, enum: DAYS }], default: ["Sunday"] },
            gracePeriodMins: { type: Number, default: 15, min: 0 },
            halfDayMarkMins: { type: Number, default: 240, min: 0 }, // e.g., 4 hours
            workAvailabilityPercent: { type: Number, default: 80, min: 0, max: 100 },
            ipValidationMode: { type: String, enum: ["allow", "restrict", "none"], default: "none" },
            ipList: { type: [String], default: [] },
        },

        // 4. Leave Settings
        leave: {
            sickLeaves: { type: Number, default: 12, min: 0 },
            casualLeaves: { type: Number, default: 12, min: 0 },
            earnedLeaves: { type: Number, default: 15, min: 0 },
            carryForwardEnabled: { type: Boolean, default: false },
            leaveStartMonth: { type: String, default: "January" },
            paidLeaveStatuses: { type: [String], default: [] },
            unpaidLeaveStatuses: { type: [String], default: [] },
        },

        // 5. Payroll Settings
        // Inside your settingsSchema in models/Settings.js:

        // 5. Payroll Settings
        payroll: {
            registration: {
                pfNumber: { type: String, trim: true, maxlength: 80, select: false },
                esiNumber: { type: String, trim: true, maxlength: 80, select: false },
                tanNumber: { type: String, trim: true, maxlength: 80, select: false },
                ptNumber: { type: String, trim: true, maxlength: 80, select: false },
                ptState: { type: String, trim: true, maxlength: 80, select: false },
                labourNumber: { type: String, trim: true, maxlength: 80, select: false },
                labourAct: { type: String, trim: true, maxlength: 120, select: false },
            },

            defaultPayrun: {
                period: { type: String, enum: ["Monthly", "Weekly", "Bi-Weekly"], default: "Monthly" },
                generatingType: { type: String, enum: ["Hour", "Daily log", "None"], default: "Hour" },
                considerOvertime: { type: Boolean, default: true }
            },
            badgeValue: {
                allowances: [{
                    name: String,
                    value: Number,
                    inPercent: { type: Boolean, default: false }
                }],
                deductions: [{
                    name: String,
                    value: Number,
                    inPercent: { type: Boolean, default: false }
                }]
            },
            manageAudience: {
                restrictedPayrun: {
                    department: { type: String, default: "" },
                    employee: { type: String, default: "" }
                },
                restrictedBadge: {
                    employeeStatus: { type: String, default: "" }
                }
            }
        },

        // 6. Notification Settings
        notifications: {
            emailEnabled: { type: Boolean, default: true },
            smsEnabled: { type: Boolean, default: false },
            whatsappEnabled: { type: Boolean, default: false },
        },
        // models/Settings.js me add karein (kisi bhi jagah):
        workflowSettings: {
            multiLevelApproval: { type: Boolean, default: true }
        },
    },
    { timestamps: true }
);

module.exports = mongoose.models.Settings || mongoose.model("Settings", settingsSchema);