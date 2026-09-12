const Expense = require("../models/Expense");

// 1. Get all expenses
exports.getExpenses = async (req, res, next) => {
    try {
        const filter = req.query.status ? { status: req.query.status } : {};

        const expenses = await Expense.find(filter)
            .populate("employee", "name email fullName username")
            .sort({ createdAt: -1 });

        res.status(200).json(expenses);
    } catch (err) {
        next(err);
    }
};

// 2. Submit Expense — employee ALWAYS from authenticated user, never from body
exports.submitExpense = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: user not found" });
        }

        // ⚠️ Employee collection ki ID chahiye, User ki nahi
        const employeeId = req.user.employee?._id || req.user.employee || req.user._id;

        if (!employeeId) {
            return res.status(400).json({ message: "No linked employee record found for this user" });
        }

        const { employee, employeeName, ...rest } = req.body;

        const expenseData = {
            ...rest,
            employee: employeeId,
        };

        let expense = await Expense.create(expenseData);
        expense = await expense.populate("employee", "name email fullName username");

        res.status(201).json(expense);
    } catch (err) {
        next(err);
    }
};
// 3. Approve Expense
exports.approveExpense = async (req, res, next) => {
    try {
        const expense = await Expense.findByIdAndUpdate(
            req.params.id,
            { status: "approved", approvedBy: req.body.approvedBy, approvedOn: new Date() },
            { new: true }
        ).populate("employee", "name email fullName username");
        if (!expense) return res.status(404).json({ message: "Expense not found" });
        res.json(expense);
    } catch (err) {
        next(err);
    }
};

// 4. Reject Expense
exports.rejectExpense = async (req, res, next) => {
    try {
        const expense = await Expense.findByIdAndUpdate(
            req.params.id,
            {
                status: "rejected",
                approvedBy: req.body.approvedBy,
                approvedOn: new Date(),
                rejectionReason: req.body.rejectionReason,
            },
            { new: true }
        ).populate("employee", "name email fullName username");
        if (!expense) return res.status(404).json({ message: "Expense not found" });
        res.json(expense);
    } catch (err) {
        next(err);
    }
};

// 5. Mark Reimbursed
exports.markReimbursed = async (req, res, next) => {
    try {
        const expense = await Expense.findByIdAndUpdate(
            req.params.id,
            { status: "reimbursed" },
            { new: true }
        ).populate("employee", "name email fullName username");
        if (!expense) return res.status(404).json({ message: "Expense not found" });
        res.json(expense);
    } catch (err) {
        next(err);
    }
};

// 6. Get Expense Summary
exports.getExpenseSummary = async (req, res, next) => {
    try {
        const { employee, month, year } = req.query;
        const filter = {};
        if (employee) filter.employee = employee;
        if (month && year) {
            filter.expenseDate = {
                $gte: new Date(year, month - 1, 1),
                $lte: new Date(year, month, 0, 23, 59, 59),
            };
        }

        const expenses = await Expense.find(filter);
        const summary = {
            totalSubmitted: expenses.reduce((sum, e) => sum + e.amount, 0),
            totalApproved: expenses.filter((e) => e.status === "approved" || e.status === "reimbursed")
                .reduce((sum, e) => sum + e.amount, 0),
            pendingCount: expenses.filter((e) => e.status === "pending").length,
        };

        res.json(summary);
    } catch (err) {
        next(err);
    }
};