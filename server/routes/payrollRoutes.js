const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
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
    getBonuses,
    createBonus,
    deleteBonus,
    getDeductions,
    createDeduction,
    deleteDeduction,
    getLoans,
    createLoan,
    updateLoanStatus,
    deleteLoan,
    getReimbursements,
    createReimbursement,
    updateReimbursementStatus,
    deleteReimbursement,
    getTaxTdsList,
    upsertTaxProfile,
    getPayrollReports, // <-- 1. Yahan import hona chahiye
} = require("../controllers/payrollController");

// ==========================================
// STATIC ROUTES (HAMESHA /:id SE PEHLE HONGE)
// ==========================================
router.get("/summary", protect, authorize("admin", "hr"), getPayrollSummary);
router.get("/processing-queue", protect, authorize("admin", "hr"), getProcessingQueue);
router.get("/payslips", protect, authorize("admin", "hr", "employee"), getPayslipsList);
router.get("/reports", protect, authorize("admin", "hr", "finance"), getPayrollReports); // <-- 2. Yahan hona chahiye

router.get("/tax-tds", protect, authorize("admin", "hr", "employee"), getTaxTdsList);
router.post("/tax-tds", protect, authorize("admin", "hr", "employee"), upsertTaxProfile);

router.get("/bonuses", protect, authorize("admin", "hr"), getBonuses);
router.post("/bonuses", protect, authorize("admin", "hr"), createBonus);
router.delete("/bonuses/:id", protect, authorize("admin"), deleteBonus);

router.get("/deductions", protect, authorize("admin", "hr"), getDeductions);
router.post("/deductions", protect, authorize("admin", "hr"), createDeduction);
router.delete("/deductions/:id", protect, authorize("admin"), deleteDeduction);

router.get("/loans", protect, authorize("admin", "hr"), getLoans);
router.post("/loans", protect, authorize("admin", "hr"), createLoan);
router.put("/loans/:id/status", protect, authorize("admin", "hr"), updateLoanStatus);
router.delete("/loans/:id", protect, authorize("admin"), deleteLoan);

router.get("/reimbursements", protect, authorize("admin", "hr", "employee"), getReimbursements);
router.post("/reimbursements", protect, authorize("admin", "hr", "employee"), createReimbursement);
router.put("/reimbursements/:id/status", protect, authorize("admin", "hr"), updateReimbursementStatus);
router.delete("/reimbursements/:id", protect, authorize("admin"), deleteReimbursement);

router.post("/disburse/:batchId", protect, authorize("admin"), disburseBatch);
router.get("/payslip/:id", protect, getPayslip);

router.post("/generate", protect, authorize("admin", "hr"), generatePayroll);
router.post("/generate-bulk", protect, authorize("admin", "hr"), generateBulkPayroll);

router.get("/", protect, authorize("admin", "hr"), getPayrolls);
router.put("/:id/process", protect, authorize("admin", "hr"), processPayroll);
router.put("/:id/mark-paid", protect, authorize("admin"), markAsPaid);

// ==========================================
// DYNAMIC /:id ROUTE (HAMESHA AAKHIRI MEIN)
// ==========================================
router
    .route("/:id")
    .get(protect, getPayroll)
    .put(protect, authorize("admin", "hr"), updatePayroll);

module.exports = router;