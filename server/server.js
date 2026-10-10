const dns = require("dns");
try {
    dns.setServers(["8.8.8.8", "8.8.4.4"]);
} catch (err) {
    console.warn("DNS servers could not be set:", err.message);
}

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const { errorHandler, notFound } = require("./middleware/errorMiddleware");

const employeeSalaryRoutes = require("./routes/employeeSalaryRoutes");
const authRoutes = require("./routes/authRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const leaveRoutes = require("./routes/leaveRoutes");
const departmentRoutes = require("./routes/departmentRoutes");
const payrollRoutes = require("./routes/payrollRoutes");
const recruitmentRoutes = require("./routes/recruitmentRoutes");
const performanceRoutes = require("./routes/performanceRoutes");
const trainingRoutes = require("./routes/trainingRoutes");
const assetRoutes = require("./routes/assetRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const travelRoutes = require("./routes/travelRoutes");
const documentRoutes = require("./routes/documentRoutes");
const communicationRoutes = require("./routes/communicationRoutes");
const shiftRoutes = require("./routes/shiftRoutes");
const complianceRoutes = require("./routes/complianceRoutes");
const reportRoutes = require("./routes/reportRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const userManagementRoutes = require("./routes/userManagementRoutes");
const companyRoutes = require("./routes/companyRoutes");
const organizationRoutes = require("./routes/organizationRoutes");
const salaryStructureRoutes = require("./routes/salaryStructureRoutes");
const salaryComponentRoutes = require("./routes/salaryComponentRoutes");
const userRoutes = require("./routes/userRoutes");
const emailRoutes = require("./routes/emailRoutes");
const smsRoutes = require("./routes/smsRoutes");
const biometricRoutes = require("./routes/biometricRoutes");
const branchRoutes = require("./routes/branchRoutes");
const orgChartRoutes = require("./routes/orgChartRoutes");
const holidayRoutes = require("./routes/holidayRoutes");
const designationRoutes = require("./routes/designationRoutes");

/* -------------------------------------------------------------------------- */
/* STARTUP CHECKS                                                             */
/* -------------------------------------------------------------------------- */

if (!process.env.JWT_SECRET) {
    console.error("FATAL: JWT_SECRET is missing. Add it to your environment variables.");
    process.exit(1);
}

// Shows in the Render logs right after every deploy (secret values are never printed)
const mailProvider = process.env.BREVO_API_KEY
    ? "Brevo API"
    : process.env.SMTP_USER && process.env.SMTP_PASS
        ? "SMTP"
        : "NOT CONFIGURED";

console.log("Mail config:", {
    provider: mailProvider,
    from: process.env.EMAIL_FROM || process.env.SMTP_USER || null,
    frontendUrl: process.env.FRONTEND_URL || null,
});

if (mailProvider === "NOT CONFIGURED") {
    console.warn("WARNING: No email service is set. Forgot password emails will NOT be sent.");
}
if (mailProvider === "SMTP" && process.env.RENDER) {
    console.warn("WARNING: Render free plan blocks SMTP ports. Use BREVO_API_KEY for email.");
}
if (!process.env.FRONTEND_URL) {
    console.warn("WARNING: FRONTEND_URL is missing. Password reset links will be broken.");
}
if (process.env.FRONTEND_URL && process.env.RENDER && /localhost|127\.0\.0\.1/.test(process.env.FRONTEND_URL)) {
    console.warn("WARNING: FRONTEND_URL points to localhost on Render. Reset links will not open.");
}

/* -------------------------------------------------------------------------- */
/* APP SETUP                                                                  */
/* -------------------------------------------------------------------------- */

const app = express();
app.set("trust proxy", 1); // Required on Render, otherwise rate limit treats all users as one IP
app.disable("x-powered-by");
connectDB();

/* CORS: fixed list + FRONTEND_URL + optional CORS_ORIGINS (comma separated) from the environment */
const normalizeOrigin = (o) => String(o || "").trim().replace(/\/+$/, "");
const fromEnv = (v) => String(v || "").split(",").map(normalizeOrigin).filter(Boolean);

const allowedOrigins = [
    ...new Set(
        [
            "https://hrms-system-live.vercel.app",
            "https://hrms-theta-beryl.vercel.app",
            "http://localhost:3000",
            "http://localhost:5173",
            ...fromEnv(process.env.FRONTEND_URL),
            ...fromEnv(process.env.CORS_ORIGINS),
        ].map(normalizeOrigin)
    ),
];

app.use(
    cors({
        origin(origin, callback) {
            // No origin = Postman, server to server calls, mobile apps
            if (!origin || allowedOrigins.includes(normalizeOrigin(origin))) return callback(null, true);
            const err = new Error("This origin is not allowed by CORS.");
            err.status = 403;
            return callback(err);
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
        optionsSuccessStatus: 200,
    })
);

// Large limit because employee photos and ID documents are sent as base64
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

/* -------------------------------------------------------------------------- */
/* ROUTES                                                                     */
/* -------------------------------------------------------------------------- */

app.get("/", (req, res) => res.json({ status: "OK", service: "HRMS API" }));
app.get("/api/health", (req, res) => res.json({ status: "OK" }));

// More specific paths must come before their parent paths
app.use("/api/designations", designationRoutes);
app.use("/api/holiday", holidayRoutes);
app.use("/api/organization/chart", orgChartRoutes);
app.use("/api/organization/branches", branchRoutes);
app.use("/api/biometric", biometricRoutes);
app.use("/api/sms", smsRoutes);
app.use("/api/emails", emailRoutes);
app.use("/api/payroll/employee-salaries", employeeSalaryRoutes);
app.use("/api/payroll/components", salaryComponentRoutes);
app.use("/api/payroll/salary-structures", salaryStructureRoutes);
app.use("/api/organization", organizationRoutes);
app.use("/api/company", companyRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/leave", leaveRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/payroll", payrollRoutes);
app.use("/api/recruitment", recruitmentRoutes);
app.use("/api/performance", performanceRoutes);
app.use("/api/training", trainingRoutes);
app.use("/api/assets", assetRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/travel", travelRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/communication", communicationRoutes);
app.use("/api/shifts", shiftRoutes);
app.use("/api/compliance", complianceRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/settings", settingsRoutes);

// Both routers share /api/users: userRoutes only has /activity-logs, the rest is admin management
app.use("/api/users", userRoutes);
app.use("/api/users", userManagementRoutes);

/* -------------------------------------------------------------------------- */
/* ERROR HANDLING                                                             */
/* -------------------------------------------------------------------------- */

// Errors thrown by routes and middleware
app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);

    if (err.type === "entity.too.large" || err.status === 413) {
        return res.status(413).json({
            success: false,
            message: "The uploaded data is too large. Please upload smaller files (maximum 10 MB each).",
        });
    }

    if (err.type === "entity.parse.failed") {
        return res.status(400).json({ success: false, message: "Invalid request data." });
    }

    if (err.status === 403 && /CORS/i.test(err.message || "")) {
        return res.status(403).json({ success: false, message: err.message });
    }

    console.error("Server Error:", err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || "Internal Server Error",
    });
});

// Unknown routes (kept after the handler above, exactly as before)
app.use(notFound);
app.use(errorHandler);

/* -------------------------------------------------------------------------- */
/* START                                                                      */
/* -------------------------------------------------------------------------- */

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
    console.log(`Server running on port:${PORT}`);
});

process.on("unhandledRejection", (reason) => {
    console.error("Unhandled promise rejection:", reason);
});

// Render stops the old server with SIGTERM on every deploy: finish running requests first
const shutdown = (signal) => {
    console.log(`${signal} received. Shutting down...`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));





