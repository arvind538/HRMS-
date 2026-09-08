const EmployeeSalary = require("../models/EmployeeSalary");

exports.getEmployeeSalaries = async (req, res, next) => {
    try {
        const records = await EmployeeSalary.find()
            .populate("employee", "name employeeId department email")
            .populate("salaryStructure", "name basicPercent hraPercent specialPercent")
            .sort({ createdAt: -1 });

        return res.status(200).json(records);
    } catch (err) {
        next(err);
    }
};

exports.assignOrUpdateSalary = async (req, res, next) => {
    try {
        const { employeeId, salaryStructureId, annualCTC, status } = req.body;

        if (!employeeId || !annualCTC) {
            return res.status(400).json({ message: "Employee and Annual CTC are required." });
        }

        const ctcNumber = Number(annualCTC);
        const grossMonthly = Math.round(ctcNumber / 12);

        const updated = await EmployeeSalary.findOneAndUpdate(
            { employee: employeeId },
            {
                employee: employeeId,
                salaryStructure: salaryStructureId || null,
                annualCTC: ctcNumber,
                grossMonthly,
                status: status || "Active",
            },
            { upsert: true, new: true, runValidators: true }
        )
            .populate("employee", "name employeeId department email")
            .populate("salaryStructure", "name");

        return res.status(200).json(updated);
    } catch (err) {
        next(err);
    }
};