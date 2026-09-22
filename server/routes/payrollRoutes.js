const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const payrollController = require("../controllers/payrollController");

const {
    getPayrolls,
    getPayroll,
    generatePayroll,
    generateBulkPayroll,
    updatePayroll,
    processPayroll,
    markAsPaid,
    getPayslip,
    getPayrollSummary,
    getProcessingQueue,
    disburseBatch,
    getPayslipsList,
    getPayrollReports,
    getTaxTdsList,
    upsertTaxProfile,
    getReimbursements,
    createReimbursement,
    updateReimbursementStatus,
    deleteReimbursement,
    getLoans,
    createLoan,
    updateLoan,
    updateLoanStatus,
    deleteLoan,
    getDeductions,
    createDeduction,
    deleteDeduction,
    getBonuses,
    createBonus,
    deleteBonus,
    getEmployeeSalaries,
    createEmployeeSalary,
    deleteEmployeeSalary,
    updateDeduction,
    updateBonus,
    updateEmployeeSalary,
    updateReimbursement,
    getPositions
} = payrollController;

// Base & Static routes
router.get("/", protect, getPayrolls);
router.get("/reports", protect, getPayrollReports);
router.get("/tax-tds", protect, getTaxTdsList);
router.post("/tax-tds", protect, upsertTaxProfile);

// Reimbursements
router.get("/reimbursements", protect, getReimbursements);
router.post("/reimbursements", protect, createReimbursement);
router.put("/reimbursements/:id", protect, updateReimbursement);
router.put("/reimbursements/:id/status", protect, updateReimbursementStatus);
router.delete("/reimbursements/:id", protect, deleteReimbursement);

// Loans
router.get("/loans", protect, getLoans);
router.post("/loans", protect, createLoan);
router.put("/loans/:id", protect, updateLoan);
router.put("/loans/:id/status", protect, updateLoanStatus);
router.delete("/loans/:id", protect, deleteLoan);

// Deductions
router.get("/deductions", protect, getDeductions);
router.post("/deductions", protect, createDeduction);
router.put("/deductions/:id", protect, updateDeduction);
router.delete("/deductions/:id", protect, deleteDeduction);

// Bonuses
router.get("/bonuses", protect, getBonuses);
router.post("/bonuses", protect, createBonus);
router.put("/bonuses/:id", protect, updateBonus);
router.delete("/bonuses/:id", protect, deleteBonus);

// Employee Salaries
router.get("/employee-salaries", protect, getEmployeeSalaries);
router.post("/employee-salaries", protect, createEmployeeSalary);
router.put("/employee-salaries/:id", protect, updateEmployeeSalary);
router.delete("/employee-salaries/:id", protect, deleteEmployeeSalary);

// Operations
router.post("/generate", protect, generatePayroll);
router.post("/generate-bulk", protect, generateBulkPayroll);
router.get("/summary", protect, getPayrollSummary);
router.get("/processing-queue", protect, getProcessingQueue);
router.post("/disburse/:batchId", protect, disburseBatch);
router.get("/payslips", protect, getPayslipsList);
router.get("/payslip/:id", protect, getPayslip);

// Dynamic routes
router.get("/:id", protect, getPayroll);
router.put("/:id", protect, updatePayroll);
router.put("/:id/process", protect, processPayroll);
router.put("/:id/mark-paid", protect, markAsPaid);

// ✅ FIXED: DELETE route added with fallback logic
router.delete("/:id", protect, async (req, res, next) => {
    // Agar controller me function bana hai toh wahi execute karega
    if (typeof payrollController.deletePayroll === "function") {
        return payrollController.deletePayroll(req, res, next);
    }

    // Safety fallback: Agar controller me function miss hai toh seedha delete karega bina crash huye
    try {
        let PayrollModel;
        try {
            PayrollModel = require("../models/Payroll");
        } catch {
            PayrollModel = require("../models/payrollModel");
        }

        const deleted = await PayrollModel.findByIdAndDelete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ success: false, message: "Payslip record not found" });
        }
        return res.status(200).json({ success: true, message: "Payslip deleted successfully" });
    } catch (err) {
        console.error("Direct delete error:", err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;