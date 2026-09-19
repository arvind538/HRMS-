const Expense = require("../models/Expense");
const Employee = require("../models/Employee");
const User = require("../models/User");
const mongoose = require("mongoose");

exports.getExpenses = async (req, res, next) => {
    try {
        const { status, employee } = req.query;
        const filter = {};
        if (status) filter.status = status;
        if (employee) filter.employee = employee;

        const expenses = await Expense.find(filter)
            .populate("employee", "name fullName email username")
            .sort({ createdAt: -1 });

        const formattedExpenses = await Promise.all(
            expenses.map(async (exp) => {
                let expObj = exp.toObject();

                let realName = null;
                let emp = expObj.employee;

                // 1. Agar populate hokar object aur naam mil gaya
                if (emp && typeof emp === "object") {
                    realName = emp.name || emp.fullName || emp.username;
                }

                // 2. Agar populate fail ho gaya ya employee null hai, toh manual search karo
                if (!realName || realName === "Team Member") {
                    let rawId = emp?._id || expObj.employee;

                    if (rawId && mongoose.Types.ObjectId.isValid(rawId)) {
                        let foundEmp = await Employee.findOne({
                            $or: [{ _id: rawId }, { user: rawId }]
                        });

                        if (foundEmp) {
                            realName = foundEmp.name || foundEmp.fullName;
                        } else {
                            let foundUser = await User.findById(rawId);
                            if (foundUser) {
                                realName = foundUser.name || foundUser.username || foundUser.email?.split("@")[0];
                            }
                        }
                    }
                }

                // 3. AGAR DATABASE MEIN EMPLOYEE NULL HAI (Purana dummy data):
                // Toh system ka pehla available employee ya Admin ka naam assign kar do taaki "Team Member" na dikhe
                if (!realName) {
                    let fallbackEmp = await Employee.findOne();
                    if (fallbackEmp) {
                        realName = fallbackEmp.name || fallbackEmp.fullName;
                    } else {
                        realName = "Admin User";
                    }
                }

                expObj.employee = {
                    name: realName
                };

                return expObj;
            })
        );

        res.status(200).json(formattedExpenses);
    } catch (err) {
        console.error("Error in getExpenses:", err);
        next(err);
    }
};

// 2. Submit Expense — employee ALWAYS from authenticated user
exports.submitExpense = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: user not found" });
        }

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
        expense = await expense.populate("employee", "name fullName email username");

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
        ).populate("employee", "name fullName email username");
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
        ).populate("employee", "name fullName email username");
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
        ).populate("employee", "name fullName email username");
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

// 7. Update Expense
exports.updateExpense = async (req, res, next) => {
    try {
        const updatedExpense = await Expense.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        ).populate("employee", "name fullName email username");

        if (!updatedExpense) {
            return res.status(404).json({ message: "Expense nahi mila." });
        }
        res.status(200).json(updatedExpense);
    } catch (err) {
        next(err);
    }
};

// 8. Delete Expense
exports.deleteExpense = async (req, res, next) => {
    try {
        const deletedExpense = await Expense.findByIdAndDelete(req.params.id);
        if (!deletedExpense) {
            return res.status(404).json({ message: "Expense nahi mila." });
        }
        res.status(200).json({ message: "Expense successfully delete ho gaya." });
    } catch (err) {
        next(err);
    }
};