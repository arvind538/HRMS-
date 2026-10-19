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







// const express = require("express");
// const router = express.Router();
// const { protect: baseProtect, authorize } = require("../middleware/authMiddleware");
// const Employee = require("../models/Employee");
// const old = require("../controllers/payrollController"); // loans, bonus, deductions, tax, reports
// const slip = require("../controllers/payslipController"); // payslips, salary, structures, claims

// const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// /*
//  * Older accounts may not have the employee profile saved on the login account.
//  * It is then found by the login or personal email. This is kept in memory for this request only.
//  */
// const attachOwnEmployee = async (req, res, next) => {
//     try {
//         if (req.user && !req.user.employee) {
//             const email = String(req.user.email || "").trim();
//             if (email) {
//                 const rx = new RegExp(`^${escapeRegex(email)}$`, "i");
//                 const emp = await Employee.findOne({ $or: [{ loginEmail: rx }, { email: rx }] }).select("_id").lean();
//                 if (emp) req.user.employee = emp._id;
//             }
//         }
//         next();
//     } catch (err) {
//         next(err);
//     }
// };

// const protect = [baseProtect, attachOwnEmployee];
// const adminHr = [...protect, authorize("admin", "hr")];

// /* A wrong id (for example "me") gives a clean 404 instead of a database error */
// router.param("id", (req, res, next, id) => {
//     if (!/^[0-9a-fA-F]{24}$/.test(id)) return res.status(404).json({ message: "Record not found." });
//     next();
// });

// /* Every logged-in person. The controller shows an employee only his own processed or paid payslips. */
// router.get("/", protect, slip.getPayrolls);
// router.get("/payslips", protect, slip.getPayslipsList);
// router.get("/payslip/:id", protect, slip.getPayslip);

// /* Reimbursements: an employee claims and sees his own, admin and HR review */
// router.get("/reimbursements", protect, slip.getReimbursements);
// router.post("/reimbursements", protect, slip.createReimbursement);
// router.put("/reimbursements/:id", protect, slip.updateReimbursement);
// router.put("/reimbursements/:id/status", ...adminHr, slip.updateReimbursementStatus);
// router.delete("/reimbursements/:id", protect, slip.deleteReimbursement);

// /* Salary structures and who gets how much */
// router.get("/structures", ...adminHr, slip.getStructures);
// router.post("/structures", ...adminHr, slip.createStructure);
// router.put("/structures/:id", ...adminHr, slip.updateStructure);
// router.delete("/structures/:id", ...adminHr, slip.deleteStructure);

// router.get("/employee-salaries", ...adminHr, slip.getEmployeeSalaries);
// router.post("/employee-salaries", ...adminHr, slip.createEmployeeSalary);
// router.put("/employee-salaries/:id", ...adminHr, slip.updateEmployeeSalary);
// router.delete("/employee-salaries/:id", ...adminHr, slip.deleteEmployeeSalary);

// /* Generate, process and pay */
// router.post("/preview", ...adminHr, slip.previewPayroll);
// router.post("/generate", ...adminHr, slip.generatePayroll);
// router.post("/generate-bulk", ...adminHr, slip.generateBulkPayroll);
// router.post("/process-bulk", ...adminHr, slip.processBulk);
// router.post("/disburse/:batchId", ...adminHr, slip.disburseBatch);
// router.get("/summary", ...adminHr, old.getPayrollSummary);
// router.get("/processing-queue", ...adminHr, old.getProcessingQueue);

// /* Reports and tax */
// router.get("/reports", ...adminHr, old.getPayrollReports);
// router.get("/tax-tds", ...adminHr, old.getTaxTdsList);
// router.post("/tax-tds", ...adminHr, old.upsertTaxProfile);

// /* Loans */
// router.get("/loans", ...adminHr, old.getLoans);
// router.post("/loans", ...adminHr, old.createLoan);
// router.put("/loans/:id", ...adminHr, old.updateLoan);
// router.put("/loans/:id/status", ...adminHr, old.updateLoanStatus);
// router.delete("/loans/:id", ...adminHr, old.deleteLoan);

// /* Deductions */
// router.get("/deductions", ...adminHr, old.getDeductions);
// router.post("/deductions", ...adminHr, old.createDeduction);
// router.put("/deductions/:id", ...adminHr, old.updateDeduction);
// router.delete("/deductions/:id", ...adminHr, old.deleteDeduction);

// /* Bonuses */
// router.get("/bonuses", ...adminHr, old.getBonuses);
// router.post("/bonuses", ...adminHr, old.createBonus);
// router.put("/bonuses/:id", ...adminHr, old.updateBonus);
// router.delete("/bonuses/:id", ...adminHr, old.deleteBonus);

// /* One payslip (must stay below the fixed paths above) */
// router.get("/:id", protect, slip.getPayroll);
// router.put("/:id", ...adminHr, slip.updatePayroll);
// router.put("/:id/recalculate", ...adminHr, slip.recalculatePayroll);
// router.put("/:id/process", ...adminHr, slip.processPayroll);
// router.put("/:id/mark-paid", ...adminHr, slip.markAsPaid);
// router.delete("/:id", ...protect, authorize("admin"), slip.deletePayroll);

// module.exports = router;





// const express = require("express");
// const router = express.Router();
// const { protect, authorize } = require("../middleware/authMiddleware");
// const old = require("../controllers/payrollController"); // loans, bonus, deductions, tax, reports
// const slip = require("../controllers/payslipController"); // payslips, salary, structures, claims

// const adminHr = [protect, authorize("admin", "hr")];

// /* A wrong id (for example "me") gives a clean 404 instead of a database error */
// router.param("id", (req, res, next, id) => {
//     if (!/^[0-9a-fA-F]{24}$/.test(id)) return res.status(404).json({ message: "Record not found." });
//     next();
// });

// /* Every logged-in person. The controller shows an employee only his own processed or paid payslips. */
// router.get("/", protect, slip.getPayrolls);
// router.get("/payslips", protect, slip.getPayslipsList);
// router.get("/payslip/:id", protect, slip.getPayslip);
// router.put("/reimbursements/:id", protect, slip.updateReimbursement);

// /* Reimbursements: an employee claims and sees his own, admin and HR review */
// router.get("/reimbursements", protect, slip.getReimbursements);
// router.post("/reimbursements", protect, slip.createReimbursement);
// router.put("/reimbursements/:id", ...adminHr, slip.updateReimbursement);
// router.put("/reimbursements/:id/status", ...adminHr, slip.updateReimbursementStatus);
// router.delete("/reimbursements/:id", protect, slip.deleteReimbursement);

// /* Salary structures and who gets how much */
// router.get("/structures", ...adminHr, slip.getStructures);
// router.post("/structures", ...adminHr, slip.createStructure);
// router.put("/structures/:id", ...adminHr, slip.updateStructure);
// router.delete("/structures/:id", ...adminHr, slip.deleteStructure);

// router.get("/employee-salaries", ...adminHr, slip.getEmployeeSalaries);
// router.post("/employee-salaries", ...adminHr, slip.createEmployeeSalary);
// router.put("/employee-salaries/:id", ...adminHr, slip.updateEmployeeSalary);
// router.delete("/employee-salaries/:id", ...adminHr, slip.deleteEmployeeSalary);

// /* Generate, process and pay */
// router.post("/preview", ...adminHr, slip.previewPayroll);
// router.post("/generate", ...adminHr, slip.generatePayroll);
// router.post("/generate-bulk", ...adminHr, slip.generateBulkPayroll);
// router.post("/process-bulk", ...adminHr, slip.processBulk);
// router.post("/disburse/:batchId", ...adminHr, slip.disburseBatch);
// router.get("/summary", ...adminHr, old.getPayrollSummary);
// router.get("/processing-queue", ...adminHr, old.getProcessingQueue);

// /* Reports and tax */
// router.get("/reports", ...adminHr, old.getPayrollReports);
// router.get("/tax-tds", ...adminHr, old.getTaxTdsList);
// router.post("/tax-tds", ...adminHr, old.upsertTaxProfile);

// /* Loans */
// router.get("/loans", ...adminHr, old.getLoans);
// router.post("/loans", ...adminHr, old.createLoan);
// router.put("/loans/:id", ...adminHr, old.updateLoan);
// router.put("/loans/:id/status", ...adminHr, old.updateLoanStatus);
// router.delete("/loans/:id", ...adminHr, old.deleteLoan);

// /* Deductions */
// router.get("/deductions", ...adminHr, old.getDeductions);
// router.post("/deductions", ...adminHr, old.createDeduction);
// router.put("/deductions/:id", ...adminHr, old.updateDeduction);
// router.delete("/deductions/:id", ...adminHr, old.deleteDeduction);

// /* Bonuses */
// router.get("/bonuses", ...adminHr, old.getBonuses);
// router.post("/bonuses", ...adminHr, old.createBonus);
// router.put("/bonuses/:id", ...adminHr, old.updateBonus);
// router.delete("/bonuses/:id", ...adminHr, old.deleteBonus);

// /* One payslip (must stay below the fixed paths above) */
// router.get("/:id", protect, slip.getPayroll);
// router.put("/:id", ...adminHr, slip.updatePayroll);
// router.put("/:id/recalculate", ...adminHr, slip.recalculatePayroll);
// router.put("/:id/process", ...adminHr, slip.processPayroll);
// router.put("/:id/mark-paid", ...adminHr, slip.markAsPaid);
// router.delete("/:id", protect, authorize("admin"), slip.deletePayroll);

// module.exports = router;











// const express = require("express");
// const router = express.Router();
// const { protect, authorize } = require("../middleware/authMiddleware");
// const c = require("../controllers/payrollController");

// const adminHr = [protect, authorize("admin", "hr")];

// /* Every logged-in user. The controller shows an employee only their own processed or paid payslips. */
// router.get("/", protect, c.getPayrolls);
// router.get("/payslips", protect, c.getPayslipsList);
// router.get("/payslip/:id", protect, c.getPayslip);

// /* Reports and tax */
// router.get("/reports", ...adminHr, c.getPayrollReports);
// router.get("/tax-tds", ...adminHr, c.getTaxTdsList);
// router.post("/tax-tds", ...adminHr, c.upsertTaxProfile);

// /* Reimbursements */
// router.get("/reimbursements", ...adminHr, c.getReimbursements);
// router.post("/reimbursements", ...adminHr, c.createReimbursement);
// router.put("/reimbursements/:id", ...adminHr, c.updateReimbursement);
// router.put("/reimbursements/:id/status", ...adminHr, c.updateReimbursementStatus);
// router.delete("/reimbursements/:id", ...adminHr, c.deleteReimbursement);

// /* Loans */
// router.get("/loans", ...adminHr, c.getLoans);
// router.post("/loans", ...adminHr, c.createLoan);
// router.put("/loans/:id", ...adminHr, c.updateLoan);
// router.put("/loans/:id/status", ...adminHr, c.updateLoanStatus);
// router.delete("/loans/:id", ...adminHr, c.deleteLoan);

// /* Deductions */
// router.get("/deductions", ...adminHr, c.getDeductions);
// router.post("/deductions", ...adminHr, c.createDeduction);
// router.put("/deductions/:id", ...adminHr, c.updateDeduction);
// router.delete("/deductions/:id", ...adminHr, c.deleteDeduction);

// /* Bonuses */
// router.get("/bonuses", ...adminHr, c.getBonuses);
// router.post("/bonuses", ...adminHr, c.createBonus);
// router.put("/bonuses/:id", ...adminHr, c.updateBonus);
// router.delete("/bonuses/:id", ...adminHr, c.deleteBonus);

// /* Employee salaries */
// router.get("/employee-salaries", ...adminHr, c.getEmployeeSalaries);
// router.post("/employee-salaries", ...adminHr, c.createEmployeeSalary);
// router.put("/employee-salaries/:id", ...adminHr, c.updateEmployeeSalary);
// router.delete("/employee-salaries/:id", ...adminHr, c.deleteEmployeeSalary);

// /* Operations */
// router.post("/generate", ...adminHr, c.generatePayroll);
// router.post("/generate-bulk", ...adminHr, c.generateBulkPayroll);
// router.get("/summary", ...adminHr, c.getPayrollSummary);
// router.get("/processing-queue", ...adminHr, c.getProcessingQueue);
// router.post("/disburse/:batchId", ...adminHr, c.disburseBatch);

// /* One payroll (must stay after the fixed paths above) */
// router.get("/:id", protect, c.getPayroll);
// router.put("/:id", ...adminHr, c.updatePayroll);
// router.put("/:id/process", ...adminHr, c.processPayroll);
// router.put("/:id/mark-paid", ...adminHr, c.markAsPaid);
// router.delete("/:id", protect, authorize("admin"), c.deletePayroll);

// module.exports = router;





// // const express = require("express");
// // const router = express.Router();
// // const { protect, authorize } = require("../middleware/authMiddleware");
// // const payrollController = require("../controllers/payrollController");

// // const {
// //     getPayrolls,
// //     getPayroll,
// //     generatePayroll,
// //     generateBulkPayroll,
// //     updatePayroll,
// //     processPayroll,
// //     markAsPaid,
// //     getPayslip,
// //     getPayrollSummary,
// //     getProcessingQueue,
// //     disburseBatch,
// //     getPayslipsList,
// //     getPayrollReports,
// //     getTaxTdsList,
// //     upsertTaxProfile,
// //     getReimbursements,
// //     createReimbursement,
// //     updateReimbursementStatus,
// //     deleteReimbursement,
// //     getLoans,
// //     createLoan,
// //     updateLoan,
// //     updateLoanStatus,
// //     deleteLoan,
// //     getDeductions,
// //     createDeduction,
// //     deleteDeduction,
// //     getBonuses,
// //     createBonus,
// //     deleteBonus,
// //     getEmployeeSalaries,
// //     createEmployeeSalary,
// //     deleteEmployeeSalary,
// //     updateDeduction,
// //     updateBonus,
// //     updateEmployeeSalary,
// //     updateReimbursement,
// //     getPositions
// // } = payrollController;

// // // Base & Static routes
// // router.get("/", protect, getPayrolls);
// // router.get("/reports", protect, getPayrollReports);
// // router.get("/tax-tds", protect, getTaxTdsList);
// // router.post("/tax-tds", protect, upsertTaxProfile);

// // // Reimbursements
// // router.get("/reimbursements", protect, getReimbursements);
// // router.post("/reimbursements", protect, createReimbursement);
// // router.put("/reimbursements/:id", protect, updateReimbursement);
// // router.put("/reimbursements/:id/status", protect, updateReimbursementStatus);
// // router.delete("/reimbursements/:id", protect, deleteReimbursement);

// // // Loans
// // router.get("/loans", protect, getLoans);
// // router.post("/loans", protect, createLoan);
// // router.put("/loans/:id", protect, updateLoan);
// // router.put("/loans/:id/status", protect, updateLoanStatus);
// // router.delete("/loans/:id", protect, deleteLoan);

// // // Deductions
// // router.get("/deductions", protect, getDeductions);
// // router.post("/deductions", protect, createDeduction);
// // router.put("/deductions/:id", protect, updateDeduction);
// // router.delete("/deductions/:id", protect, deleteDeduction);

// // // Bonuses
// // router.get("/bonuses", protect, getBonuses);
// // router.post("/bonuses", protect, createBonus);
// // router.put("/bonuses/:id", protect, updateBonus);
// // router.delete("/bonuses/:id", protect, deleteBonus);

// // // Employee Salaries
// // router.get("/employee-salaries", protect, getEmployeeSalaries);
// // router.post("/employee-salaries", protect, createEmployeeSalary);
// // router.put("/employee-salaries/:id", protect, updateEmployeeSalary);
// // router.delete("/employee-salaries/:id", protect, deleteEmployeeSalary);

// // // Operations
// // router.post("/generate", protect, generatePayroll);
// // router.post("/generate-bulk", protect, generateBulkPayroll);
// // router.get("/summary", protect, getPayrollSummary);
// // router.get("/processing-queue", protect, getProcessingQueue);
// // router.post("/disburse/:batchId", protect, disburseBatch);
// // router.get("/payslips", protect, getPayslipsList);
// // router.get("/payslip/:id", protect, getPayslip);

// // // Dynamic routes
// // router.get("/:id", protect, getPayroll);
// // router.put("/:id", protect, updatePayroll);
// // router.put("/:id/process", protect, processPayroll);
// // router.put("/:id/mark-paid", protect, markAsPaid);

// // // ✅ FIXED: DELETE route added with fallback logic
// // router.delete("/:id", protect, async (req, res, next) => {
// //     // Agar controller me function bana hai toh wahi execute karega
// //     if (typeof payrollController.deletePayroll === "function") {
// //         return payrollController.deletePayroll(req, res, next);
// //     }

// //     // Safety fallback: Agar controller me function miss hai toh seedha delete karega bina crash huye
// //     try {
// //         let PayrollModel;
// //         try {
// //             PayrollModel = require("../models/Payroll");
// //         } catch {
// //             PayrollModel = require("../models/payrollModel");
// //         }

// //         const deleted = await PayrollModel.findByIdAndDelete(req.params.id);
// //         if (!deleted) {
// //             return res.status(404).json({ success: false, message: "Payslip record not found" });
// //         }
// //         return res.status(200).json({ success: true, message: "Payslip deleted successfully" });
// //     } catch (err) {
// //         console.error("Direct delete error:", err);
// //         return res.status(500).json({ success: false, message: err.message });
// //     }
// // });

// // module.exports = router;