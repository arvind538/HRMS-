const express = require("express");
const router = express.Router();
const { protect: baseProtect, authorize } = require("../middleware/authMiddleware");
const Employee = require("../models/Employee");
const old = require("../controllers/payrollController"); // loans, bonus, deductions, tax, reports, summary
const slip = require("../controllers/payslipController"); // payslips, salary, structures, claims

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/*
 * Older accounts may not have the employee profile saved on the login account.
 * It is then found by the login or personal email. This is kept in memory for this request only.
 */
const attachOwnEmployee = async (req, res, next) => {
    try {
        if (req.user && !req.user.employee) {
            const email = String(req.user.email || "").trim();
            if (email) {
                const rx = new RegExp(`^${escapeRegex(email)}$`, "i");
                const emp = await Employee.findOne({ $or: [{ loginEmail: rx }, { email: rx }] }).select("_id").lean();
                if (emp) req.user.employee = emp._id;
            }
        }
        next();
    } catch (err) {
        next(err);
    }
};

const protect = [baseProtect, attachOwnEmployee];
const adminHr = [...protect, authorize("admin", "hr")];

/* A wrong id (for example "me") gives a clean 404 instead of a database error */
router.param("id", (req, res, next, id) => {
    if (!/^[0-9a-fA-F]{24}$/.test(id)) return res.status(404).json({ message: "Record not found." });
    next();
});

/* Every logged-in person. The controller shows an employee only his own processed or paid payslips. */
router.get("/", protect, slip.getPayrolls);
router.get("/employee-options", ...adminHr, old.getEmployeeOptions);
router.get("/payslips", protect, slip.getPayslipsList);
router.get("/payslip/:id", protect, slip.getPayslip);

/* Reimbursements: an employee claims and sees his own, admin and HR review */
router.get("/reimbursements", protect, slip.getReimbursements);
router.post("/reimbursements", protect, slip.createReimbursement);
router.put("/reimbursements/:id", protect, slip.updateReimbursement);
router.put("/reimbursements/:id/status", ...adminHr, slip.updateReimbursementStatus);
router.delete("/reimbursements/:id", protect, slip.deleteReimbursement);

/* Salary structures and who gets how much */
router.get("/structures", ...adminHr, slip.getStructures);
router.post("/structures", ...adminHr, slip.createStructure);
router.put("/structures/:id", ...adminHr, slip.updateStructure);
router.delete("/structures/:id", ...adminHr, slip.deleteStructure);

router.get("/employee-salaries", ...adminHr, slip.getEmployeeSalaries);
router.post("/employee-salaries", ...adminHr, slip.createEmployeeSalary);
router.put("/employee-salaries/:id", ...adminHr, slip.updateEmployeeSalary);
router.delete("/employee-salaries/:id", ...adminHr, slip.deleteEmployeeSalary);

/* Generate, process and pay */
router.post("/preview", ...adminHr, slip.previewPayroll);
router.post("/generate", ...adminHr, slip.generatePayroll);
router.post("/generate-bulk", ...adminHr, slip.generateBulkPayroll);
router.post("/process-bulk", ...adminHr, slip.processBulk);
router.post("/disburse/:batchId", ...adminHr, slip.disburseBatch);
router.get("/summary", ...adminHr, old.getPayrollSummary);
router.get("/processing-queue", ...adminHr, old.getProcessingQueue);

/* Reports and tax */
router.get("/reports", ...adminHr, old.getPayrollReports);
router.get("/tax-tds", ...adminHr, old.getTaxTdsList);
router.post("/tax-tds", ...adminHr, old.upsertTaxProfile);
router.post("/tax-tds/apply", ...adminHr, old.applyTds);

/* Loans */
router.get("/loans", ...adminHr, old.getLoans);
router.post("/loans", ...adminHr, old.createLoan);
router.put("/loans/:id", ...adminHr, old.updateLoan);
router.put("/loans/:id/status", ...adminHr, old.updateLoanStatus);
router.delete("/loans/:id", ...adminHr, old.deleteLoan);

/* Deductions */
router.get("/deductions", ...adminHr, old.getDeductions);
router.post("/deductions", ...adminHr, old.createDeduction);
router.put("/deductions/:id", ...adminHr, old.updateDeduction);
router.delete("/deductions/:id", ...adminHr, old.deleteDeduction);

/* Bonuses */
router.get("/bonuses", ...adminHr, old.getBonuses);
router.post("/bonuses", ...adminHr, old.createBonus);
router.put("/bonuses/:id", ...adminHr, old.updateBonus);
router.delete("/bonuses/:id", ...adminHr, old.deleteBonus);

/* One payslip (must stay below the fixed paths above) */
router.get("/:id", protect, slip.getPayroll);
router.put("/:id", ...adminHr, slip.updatePayroll);
router.put("/:id/recalculate", ...adminHr, slip.recalculatePayroll);
router.put("/:id/process", ...adminHr, slip.processPayroll);
router.put("/:id/reopen", ...protect, authorize("admin"), slip.reopenPayroll);
router.put("/:id/mark-paid", ...adminHr, slip.markAsPaid);
router.delete("/:id", ...protect, authorize("admin"), slip.deletePayroll);

module.exports = router;


