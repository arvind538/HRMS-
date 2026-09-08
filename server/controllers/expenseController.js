const Expense = require("../models/Expense");

exports.getExpenses = async (req, res, next) => {
    try {
        const { employee, status, category } = req.query;
        const filter = {};
        if (employee) filter.employee = employee;
        if (status) filter.status = status;
        if (category) filter.category = category;

        const expenses = await Expense.find(filter)
            .populate("employee", "name employeeId")
            .populate("approvedBy", "name")
            .sort({ createdAt: -1 });
        res.json(expenses);
    } catch (err) {
        next(err);
    }
};

exports.submitExpense = async (req, res, next) => {
    try {
        const expense = await Expense.create(req.body);
        res.status(201).json(expense);
    } catch (err) {
        next(err);
    }
};

exports.approveExpense = async (req, res, next) => {
    try {
        const expense = await Expense.findByIdAndUpdate(
            req.params.id,
            { status: "approved", approvedBy: req.body.approvedBy, approvedOn: new Date() },
            { new: true }
        );
        if (!expense) return res.status(404).json({ message: "Expense not found" });
        res.json(expense);
    } catch (err) {
        next(err);
    }
};

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
        );
        if (!expense) return res.status(404).json({ message: "Expense not found" });
        res.json(expense);
    } catch (err) {
        next(err);
    }
};

exports.markReimbursed = async (req, res, next) => {
    try {
        const expense = await Expense.findByIdAndUpdate(
            req.params.id,
            { status: "reimbursed" },
            { new: true }
        );
        res.json(expense);
    } catch (err) {
        next(err);
    }
};

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