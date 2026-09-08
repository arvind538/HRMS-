const dns = require("dns");
dns.setServers(['8.8.8.8', '8.8.4.4']);

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
const app = express();
connectDB();

app.use(cors({
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    optionsSuccessStatus: 200,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", (req, res) => res.json({ status: "OK" }));


app.use("/api/users", userRoutes);
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
app.use("/api/users", userManagementRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port:${PORT}`);
});