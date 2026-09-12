const Employee = require("../models/employeeModel");
const ActivityLog = require("../models/activityLogModel");

// @route GET /api/employees
exports.getEmployees = async (req, res, next) => {
    try {
        const { status, department, search } = req.query;
        let filter = {};

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

// @route GET /api/employees/profile
exports.getMyProfile = async (req, res, next) => {
    try {
        const userId = req.user?.id || req.user?._id;
        const userEmail = req.user?.email;
        const userName = req.user?.name || req.user?.username || "Staff Member";

        let employee = null;

        // 1. Pehle user ID ya email se search karein
        if (userId || userEmail) {
            employee = await Employee.findOne({
                $or: [
                    ...(userId ? [{ user: userId }, { userId: userId }, { _id: userId }] : []),
                    ...(userEmail ? [{ email: userEmail }] : [])
                ]
            })
                .populate("department", "name")
                .populate("reportingManager", "name");
        }

        // 2. Agar profile bilkul nahi milti, tabhi create karne ki koshish karein
        if (!employee && userId) {
            try {
                const count = await Employee.countDocuments();
                const employeeId = `EMP${String(count + 1).padStart(4, "0")}`;

                // Agar user ki apni email hai toh wo use karo, warna ek unique timestamp wali email banao
                const uniqueEmail = userEmail || `employee_${userId}_${Date.now()}@company.com`;

                employee = await Employee.create({
                    user: userId,
                    name: userName,
                    email: uniqueEmail,
                    employeeId: employeeId,
                    designation: req.user?.role || "Staff Member",
                    status: "active",
                    dateOfJoining: new Date()
                });
            } catch (createErr) {
                // Agar phir bhi email duplicate error aaye, toh database mein se us email wale purane record ko dhoond kar user ID update kar do
                if (createErr.code === 11000) {
                    const fallbackEmail = userEmail || `employee_${userId}@company.com`;
                    employee = await Employee.findOneAndUpdate(
                        { email: fallbackEmail },
                        { user: userId, name: userName },
                        { new: true, upsert: false }
                    );

                    // Agar fir bhi na mile toh bina unique constraint ke error ko bypass karne ke liye random email use karo
                    if (!employee) {
                        const count = await Employee.countDocuments();
                        employee = await Employee.create({
                            user: userId,
                            name: userName,
                            email: `emp_${Date.now()}_${Math.floor(Math.random() * 1000)}@company.com`,
                            employeeId: `EMP${String(count + 10).padStart(4, "0")}`,
                            designation: "Staff Member",
                            status: "active",
                            dateOfJoining: new Date()
                        });
                    }
                } else {
                    throw createErr;
                }
            }
        }

        // 3. Populate department & manager fields
        if (employee && !employee.populated("department")) {
            employee = await Employee.findById(employee._id)
                .populate("department", "name")
                .populate("reportingManager", "name");
        }

        if (!employee) {
            return res.status(404).json({
                message: "Employee profile not found. Please contact HR to link your profile."
            });
        }

        res.json(employee);
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

        if (!employee) {
            return res.status(404).json({ message: "Employee not found" });
        }
        res.json(employee);
    } catch (err) {
        next(err);
    }
};

// @route POST /api/employees
exports.createEmployee = async (req, res, next) => {
    try {
        const count = await Employee.countDocuments();
        const employeeId = `EMP${String(count + 1).padStart(4, "0")}`;

        const employee = await Employee.create({ ...req.body, employeeId });

        // ✅ Safe Activity Log Saving
        try {
            const userId = req.user?.id || req.body.userId || null;

            await ActivityLog.create({
                user: userId,
                action: `Created new employee profile: ${employee.name} (${employee.employeeId})`,
                module: "Employee",
            });
            console.log("Activity log saved successfully!");
        } catch (logErr) {
            console.error("❌ ACTIVITY LOG SAVE ERROR:", logErr.message);
        }

        res.status(201).json(employee);
    } catch (err) {
        next(err);
    }
};

// @route PUT /api/employees/:id
exports.updateEmployee = async (req, res, next) => {
    try {
        const employee = await Employee.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });

        if (!employee) {
            return res.status(404).json({ message: "Employee not found" });
        }

        // ✅ Safe Activity Log Saving
        try {
            await ActivityLog.create({
                user: req.user?.id || null,
                action: `Updated employee record: ${employee.name}`,
                module: "Employee",
            });
        } catch (logErr) {
            console.error("Failed to save activity log:", logErr.message);
        }

        res.json(employee);
    } catch (err) {
        next(err);
    }
};

// @route DELETE /api/employees/:id
exports.deleteEmployee = async (req, res, next) => {
    try {
        const employee = await Employee.findByIdAndDelete(req.params.id);

        if (!employee) {
            return res.status(404).json({ message: "Employee not found" });
        }

        // ✅ Safe Activity Log Saving
        try {
            await ActivityLog.create({
                user: req.user?.id || null,
                action: `Deleted employee profile: ${employee.name}`,
                module: "Employee",
            });
        } catch (logErr) {
            console.error("Failed to save activity log:", logErr.message);
        }

        res.json({ message: "Employee removed" });
    } catch (err) {
        next(err);
    }
};

// @route PUT /api/employees/:id/exit
exports.exitEmployee = async (req, res, next) => {
    try {
        const employee = await Employee.findByIdAndUpdate(
            req.params.id,
            { status: "exit", exitDate: req.body.exitDate || new Date() },
            { new: true }
        );

        if (!employee) {
            return res.status(404).json({ message: "Employee not found" });
        }

        // ✅ Safe Activity Log Saving
        try {
            await ActivityLog.create({
                user: req.user?.id || null,
                action: `Processed exit for employee: ${employee.name}`,
                module: "Employee",
            });
        } catch (logErr) {
            console.error("Failed to save activity log:", logErr.message);
        }

        res.json(employee);
    } catch (err) {
        next(err);
    }
};






// const Employee = require("../models/employeeModel");
// const ActivityLog = require("../models/activityLogModel");

// // @route GET /api/employees
// exports.getEmployees = async (req, res, next) => {
//     try {
//         const { status, department, search } = req.query;
//         let filter = {};

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

// // @route GET /api/employees/profile
// exports.getMyProfile = async (req, res, next) => {
//     try {
//         // Pehle ID se dhoondo, agar na mile toh email se try karo
//         let employee = await Employee.findById(req.user?.id)
//             .populate("department", "name")
//             .populate("reportingManager", "name");

//         if (!employee && req.user?.email) {
//             employee = await Employee.findOne({ email: req.user.email })
//                 .populate("department", "name")
//                 .populate("reportingManager", "name");
//         }

//         if (!employee) {
//             // Agar employee profile bani hi nahi hai, toh 404 ki jagah ek basic object ya message dein
//             return res.status(404).json({
//                 message: "Employee profile not found. Please contact HR to create your profile."
//             });
//         }

//         res.json(employee);
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

//         if (!employee) {
//             return res.status(404).json({ message: "Employee not found" });
//         }
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

//         // ✅ Safe Activity Log Saving
//         try {
//             const userId = req.user?.id || req.body.userId || null;

//             await ActivityLog.create({
//                 user: userId,
//                 action: `Created new employee profile: ${employee.name} (${employee.employeeId})`,
//                 module: "Employee",
//             });
//             console.log("Activity log saved successfully!");
//         } catch (logErr) {
//             console.error("❌ ACTIVITY LOG SAVE ERROR:", logErr.message);
//         }

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

//         if (!employee) {
//             return res.status(404).json({ message: "Employee not found" });
//         }

//         // ✅ Safe Activity Log Saving
//         try {
//             await ActivityLog.create({
//                 user: req.user?.id || null,
//                 action: `Updated employee record: ${employee.name}`,
//                 module: "Employee",
//             });
//         } catch (logErr) {
//             console.error("Failed to save activity log:", logErr.message);
//         }

//         res.json(employee);
//     } catch (err) {
//         next(err);
//     }
// };

// // @route DELETE /api/employees/:id
// exports.deleteEmployee = async (req, res, next) => {
//     try {
//         const employee = await Employee.findByIdAndDelete(req.params.id);

//         if (!employee) {
//             return res.status(404).json({ message: "Employee not found" });
//         }

//         // ✅ Safe Activity Log Saving
//         try {
//             await ActivityLog.create({
//                 user: req.user?.id || null,
//                 action: `Deleted employee profile: ${employee.name}`,
//                 module: "Employee",
//             });
//         } catch (logErr) {
//             console.error("Failed to save activity log:", logErr.message);
//         }

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

//         if (!employee) {
//             return res.status(404).json({ message: "Employee not found" });
//         }

//         // ✅ Safe Activity Log Saving
//         try {
//             await ActivityLog.create({
//                 user: req.user?.id || null,
//                 action: `Processed exit for employee: ${employee.name}`,
//                 module: "Employee",
//             });
//         } catch (logErr) {
//             console.error("Failed to save activity log:", logErr.message);
//         }

//         res.json(employee);
//     } catch (err) {
//         next(err);
//     }
// };






// // const Employee = require("../models/Employee");

// // // @route GET /api/employees
// // exports.getEmployees = async (req, res, next) => {
// //     try {
// //         const { status, department, search } = req.query;
// //         const filter = {};
// //         if (status) filter.status = status;
// //         if (department) filter.department = department;
// //         if (search) filter.name = { $regex: search, $options: "i" };

// //         const employees = await Employee.find(filter)
// //             .populate("department", "name")
// //             .populate("reportingManager", "name")
// //             .sort({ createdAt: -1 });

// //         res.json(employees);
// //     } catch (err) {
// //         next(err);
// //     }
// // };

// // // @route GET /api/employees/:id
// // exports.getEmployee = async (req, res, next) => {
// //     try {
// //         const employee = await Employee.findById(req.params.id)
// //             .populate("department", "name")
// //             .populate("reportingManager", "name");

// //         if (!employee) return res.status(404).json({ message: "Employee not found" });
// //         res.json(employee);
// //     } catch (err) {
// //         next(err);
// //     }
// // };

// // // @route POST /api/employees
// // exports.createEmployee = async (req, res, next) => {
// //     try {
// //         const count = await Employee.countDocuments();
// //         const employeeId = `EMP${String(count + 1).padStart(4, "0")}`;

// //         const employee = await Employee.create({ ...req.body, employeeId });
// //         res.status(201).json(employee);
// //     } catch (err) {
// //         next(err);
// //     }
// // };

// // // @route PUT /api/employees/:id
// // exports.updateEmployee = async (req, res, next) => {
// //     try {
// //         const employee = await Employee.findByIdAndUpdate(req.params.id, req.body, {
// //             new: true,
// //             runValidators: true,
// //         });
// //         if (!employee) return res.status(404).json({ message: "Employee not found" });
// //         res.json(employee);
// //     } catch (err) {
// //         next(err);
// //     }
// // };

// // // @route DELETE /api/employees/:id
// // exports.deleteEmployee = async (req, res, next) => {
// //     try {
// //         const employee = await Employee.findByIdAndDelete(req.params.id);
// //         if (!employee) return res.status(404).json({ message: "Employee not found" });
// //         res.json({ message: "Employee removed" });
// //     } catch (err) {
// //         next(err);
// //     }
// // };

// // // @route PUT /api/employees/:id/exit
// // exports.exitEmployee = async (req, res, next) => {
// //     try {
// //         const employee = await Employee.findByIdAndUpdate(
// //             req.params.id,
// //             { status: "exit", exitDate: req.body.exitDate || new Date() },
// //             { new: true }
// //         );
// //         if (!employee) return res.status(404).json({ message: "Employee not found" });
// //         res.json(employee);
// //     } catch (err) {
// //         next(err);
// //     }
// // };