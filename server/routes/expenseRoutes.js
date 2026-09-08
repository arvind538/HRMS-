const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const ctrl = require("../controllers/expenseController");

router.get("/summary", protect, ctrl.getExpenseSummary);
router.get("/", protect, ctrl.getExpenses);
router.post("/", protect, ctrl.submitExpense);
router.put("/:id/approve", protect, authorize("admin", "hr", "manager"), ctrl.approveExpense);
router.put("/:id/reject", protect, authorize("admin", "hr", "manager"), ctrl.rejectExpense);
router.put("/:id/reimburse", protect, authorize("admin", "hr"), ctrl.markReimbursed);

module.exports = router;