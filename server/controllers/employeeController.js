const Employee = require("../models/Employee");
const ActivityLog = require("../models/ActivityLog"); // ✅ ActivityLog import kiya

// @route GET /api/employees
exports.getEmployees = async (req, res, next) => {
    try {
        const { status, department, search } = req.query;
        const filter = {};
        if (status) filter.status = status;
        if (department) filter.department = department;
        if (search) filter.name = { $regex: search, $options: "i" };

        const employees = await Employee.find(filter)
            .populate("department", "name")
            .populate("reportingManager", "name")
            .sort({ createdAt: -1 });

        res.json(employees);
    } catch (err) {
        next(err);
    }
};

// @route GET /api/employees/:id
exports.getEmployee = async (req, res, next) => {
    try {
        const employee = await Employee.findById(req.params.id)
            .populate("department", "name")
            .populate("reportingManager", "name");

        if (!employee) return res.status(404).json({ message: "Employee not found" });
        res.json(employee);
    } catch (err) {
        next(err);
    }
};

exports.createEmployee = async (req, res, next) => {
    try {
        const count = await Employee.countDocuments();
        const employeeId = `EMP${String(count + 1).padStart(4, "0")}`;

        const employee = await Employee.create({ ...req.body, employeeId });

        // ✅ SAFE ACTIVITY LOG SAVING (Debugging ke sath)
        try {
            const userId = req.user?.id || req.body.userId || null;

            await ActivityLog.create({
                user: userId, // Agar user id na ho toh null chala jayega (schema ko optional karna padega ya default dena padega)
                action: `Created new employee profile: ${employee.name} (${employee.employeeId})`,
                module: "Employee",
            });
            console.log("Activity log saved successfully!");
        } catch (logErr) {
            console.error("❌ ACTIVITY LOG SAVE ERROR:", logErr.message); // Yahan exact error dikhega terminal mein
        }

        res.status(201).json(employee);
    } catch (err) {
        next(err);
    }
};

// @route PUT /api/employees/:id (✅ Activity Log Added)
exports.updateEmployee = async (req, res, next) => {
    try {
        const employee = await Employee.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });
        if (!employee) return res.status(404).json({ message: "Employee not found" });

        // ✅ Update action ka log save karein
        try {
            await ActivityLog.create({
                user: req.user?.id,
                action: `Updated employee record: ${employee.name}`,
                module: "Employee",
            });
        } catch (logErr) {
            console.error("Failed to save activity log:", logErr);
        }

        res.json(employee);
    } catch (err) {
        next(err);
    }
};

// @route DELETE /api/employees/:id (✅ Activity Log Added)
exports.deleteEmployee = async (req, res, next) => {
    try {
        const employee = await Employee.findByIdAndDelete(req.params.id);
        if (!employee) return res.status(404).json({ message: "Employee not found" });

        // ✅ Delete action ka log save karein
        try {
            await ActivityLog.create({
                user: req.user?.id,
                action: `Deleted employee profile: ${employee.name}`,
                module: "Employee",
            });
        } catch (logErr) {
            console.error("Failed to save activity log:", logErr);
        }

        res.json({ message: "Employee removed" });
    } catch (err) {
        next(err);
    }
};

// @route PUT /api/employees/:id/exit (✅ Activity Log Added)
exports.exitEmployee = async (req, res, next) => {
    try {
        const employee = await Employee.findByIdAndUpdate(
            req.params.id,
            { status: "exit", exitDate: req.body.exitDate || new Date() },
            { new: true }
        );
        if (!employee) return res.status(404).json({ message: "Employee not found" });

        // ✅ Exit action ka log save karein
        try {
            await ActivityLog.create({
                user: req.user?.id,
                action: `Processed exit for employee: ${employee.name}`,
                module: "Employee",
            });
        } catch (logErr) {
            console.error("Failed to save activity log:", logErr);
        }

        res.json(employee);
    } catch (err) {
        next(err);
    }
};








// const Employee = require("../models/Employee");

// // @route GET /api/employees
// exports.getEmployees = async (req, res, next) => {
//     try {
//         const { status, department, search } = req.query;
//         const filter = {};
//         if (status) filter.status = status;
//         if (department) filter.department = department;
//         if (search) filter.name = { $regex: search, $options: "i" };

//         const employees = await Employee.find(filter)
//             .populate("department", "name")
//             .populate("reportingManager", "name")
//             .sort({ createdAt: -1 });

//         res.json(employees);
//     } catch (err) {
//         next(err);
//     }
// };

// // @route GET /api/employees/:id
// exports.getEmployee = async (req, res, next) => {
//     try {
//         const employee = await Employee.findById(req.params.id)
//             .populate("department", "name")
//             .populate("reportingManager", "name");

//         if (!employee) return res.status(404).json({ message: "Employee not found" });
//         res.json(employee);
//     } catch (err) {
//         next(err);
//     }
// };

// // @route POST /api/employees
// exports.createEmployee = async (req, res, next) => {
//     try {
//         const count = await Employee.countDocuments();
//         const employeeId = `EMP${String(count + 1).padStart(4, "0")}`;

//         const employee = await Employee.create({ ...req.body, employeeId });
//         res.status(201).json(employee);
//     } catch (err) {
//         next(err);
//     }
// };

// // @route PUT /api/employees/:id
// exports.updateEmployee = async (req, res, next) => {
//     try {
//         const employee = await Employee.findByIdAndUpdate(req.params.id, req.body, {
//             new: true,
//             runValidators: true,
//         });
//         if (!employee) return res.status(404).json({ message: "Employee not found" });
//         res.json(employee);
//     } catch (err) {
//         next(err);
//     }
// };

// // @route DELETE /api/employees/:id
// exports.deleteEmployee = async (req, res, next) => {
//     try {
//         const employee = await Employee.findByIdAndDelete(req.params.id);
//         if (!employee) return res.status(404).json({ message: "Employee not found" });
//         res.json({ message: "Employee removed" });
//     } catch (err) {
//         next(err);
//     }
// };

// // @route PUT /api/employees/:id/exit
// exports.exitEmployee = async (req, res, next) => {
//     try {
//         const employee = await Employee.findByIdAndUpdate(
//             req.params.id,
//             { status: "exit", exitDate: req.body.exitDate || new Date() },
//             { new: true }
//         );
//         if (!employee) return res.status(404).json({ message: "Employee not found" });
//         res.json(employee);
//     } catch (err) {
//         next(err);
//     }
// };