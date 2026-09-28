const mongoose = require("mongoose");
const Employee = require("../models/Employee");
const ActivityLog = require("../models/activityLogModel");

// Helper: Generate next unique Employee ID if not provided
const generateEmployeeId = async () => {
    const count = await Employee.countDocuments();
    let counter = count + 1;
    let employeeId = `EMP${String(counter).padStart(4, "0")}`;
    let exists = await Employee.findOne({ employeeId });
    while (exists) {
        counter++;
        employeeId = `EMP${String(counter).padStart(4, "0")}`;
        exists = await Employee.findOne({ employeeId });
    }
    return employeeId;
};

// Helper: Safely resolve reportingManager to prevent Cast to ObjectId error
const sanitizeManager = (val) => {
    if (!val || typeof val !== "string" || val.trim() === "") return null;
    const str = val.trim();
    if (mongoose.Types.ObjectId.isValid(str) && str.length === 24) {
        return new mongoose.Types.ObjectId(str);
    }
    return str;
};

// Helper: Safely cast valid ObjectId or return null
const sanitizeObjectId = (val) => {
    if (!val || typeof val !== "string" || val.trim() === "") return null;
    const str = val.trim();
    return mongoose.Types.ObjectId.isValid(str) && str.length === 24 ? new mongoose.Types.ObjectId(str) : null;
};

// @route POST /api/employees
const createEmployee = async (req, res, next) => {
    try {
        const body = req.body;

        const employeeId = body.employeeId?.trim() || (await generateEmployeeId());
        const email = body.email?.trim().toLowerCase();
        const panNumber = body.panNumber?.trim().toUpperCase() || undefined;
        const idProofNumber = body.idProofNumber?.trim() || undefined;

        // 1. Check duplicate Employee ID
        const existingEmpId = await Employee.findOne({ employeeId });
        if (existingEmpId) {
            return res.status(409).json({
                message: `Employee ID "${employeeId}" already exists. Please provide a unique ID.`,
            });
        }

        // 2. Check duplicate Email
        const existingEmail = await Employee.findOne({ email });
        if (existingEmail) {
            return res.status(409).json({
                message: `Email "${email}" is already registered with another employee.`,
            });
        }

        // 3. Check duplicate PAN Number
        if (panNumber) {
            const existingPan = await Employee.findOne({ panNumber });
            if (existingPan) {
                return res.status(409).json({
                    message: `PAN Number "${panNumber}" already exists in records.`,
                });
            }
        }

        // 4. Check duplicate Government / Identity Proof Number
        if (idProofNumber) {
            const existingDocId = await Employee.findOne({ idProofNumber });
            if (existingDocId) {
                return res.status(409).json({
                    message: `Document ID Number "${idProofNumber}" is already registered with another employee.`,
                });
            }
        }

        // File upload paths (Multer vs Body fallback)
        const avatar = req.files?.avatar ? `/uploads/${req.files.avatar[0].filename}` : body.avatar || "";
        const resumeUrl = req.files?.resume ? `/uploads/${req.files.resume[0].filename}` : body.resumeFileData || "";
        const resumeFileName = req.files?.resume ? req.files.resume[0].originalname : body.resumeFileName || "";
        const idProofUrl = req.files?.idProof ? `/uploads/${req.files.idProof[0].filename}` : body.idProofFileData || "";
        const idProofFileName = req.files?.idProof ? req.files.idProof[0].originalname : body.idProofFileName || "";

        const newEmployee = new Employee({
            employeeId,
            name: body.name?.trim(),
            email,
            loginEmail: (body.loginEmail || email).trim().toLowerCase(),
            phone: body.phone?.trim() || "",
            gender: body.gender || "male",
            dateOfBirth: body.dateOfBirth || null,
            bloodGroup: body.bloodGroup || "",
            maritalStatus: body.maritalStatus || "",
            avatar,

            designation: sanitizeObjectId(body.designation) || body.designation,
            department: sanitizeObjectId(body.department) || body.department,
            branch: body.branch?.trim() || "Main Campus",
            employmentType: body.employmentType || "Full-time",
            reportingManager: sanitizeManager(body.reportingManager),
            dateOfJoining: body.dateOfJoining || null,
            employeeStatus: body.employeeStatus || "Active",
            role: body.role || "Employee",

            salary: Number(body.salary) || 0,
            bankDetails: {
                bankName: body.bankName?.trim() || body.bankDetails?.bankName?.trim() || "",
                accountNumber: body.accountNumber?.trim() || body.bankDetails?.accountNumber?.trim() || "",
                ifscCode: (body.ifscCode || body.bankDetails?.ifscCode || "").trim().toUpperCase(),
                paymentMode: body.paymentMode || body.bankDetails?.paymentMode || "Bank Transfer",
            },
            panNumber,
            uanNumber: body.uanNumber?.trim() || "",

            emergencyContact: {
                name: body.emergencyContactName?.trim() || body.emergencyContact?.name?.trim() || "",
                relation: body.emergencyContactRelation?.trim() || body.emergencyContact?.relation?.trim() || "",
                phone: body.emergencyContactPhone?.trim() || body.emergencyContact?.phone?.trim() || "",
            },

            residentialAddress: {
                street: body.address?.trim() || body.residentialAddress?.street?.trim() || "",
                city: body.city?.trim() || body.residentialAddress?.city?.trim() || "",
                state: body.state?.trim() || body.residentialAddress?.state?.trim() || "",
                pincode: body.pincode?.trim() || body.residentialAddress?.pincode?.trim() || "",
            },

            education: {
                highestQualification: body.highestQualification?.trim() || body.education?.highestQualification?.trim() || "",
                instituteName: body.instituteName?.trim() || body.education?.instituteName?.trim() || "",
                yearOfPassing: body.yearOfPassing ? Number(body.yearOfPassing) : null,
            },

            experience: {
                previousCompany: body.previousCompany?.trim() || body.experience?.previousCompany?.trim() || "",
                previousDesignation: body.previousDesignation?.trim() || body.experience?.previousDesignation?.trim() || "",
                years: body.previousExperienceYears ? Number(body.previousExperienceYears) : 0,
            },

            idProofType: body.idProofType?.trim() || "",
            idProofNumber,
            documents: {
                resumeUrl,
                resumeFileName,
                idProofUrl,
                idProofFileName,
            },
        });

        const saved = await newEmployee.save();

        try {
            const userId = req.user?.id || req.user?._id || null;
            if (ActivityLog) {
                await ActivityLog.create({
                    user: userId,
                    action: `Created new employee profile: ${saved.name} (${saved.employeeId})`,
                    module: "Employee",
                });
            }
        } catch (logErr) {
            console.error("Activity log error:", logErr.message);
        }

        return res.status(201).json({
            success: true,
            message: "Employee registered successfully",
            employee: saved,
        });
    } catch (error) {
        console.error("Employee Creation Error:", error);
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern || {})[0] || "field";
            return res.status(409).json({
                message: `A record with this ${field} already exists. It must be unique.`,
            });
        }
        return res.status(500).json({ message: "Internal server error. Failed to save employee." });
    }
};

// @route PUT /api/employees/:id
const updateEmployee = async (req, res, next) => {
    try {
        const { id } = req.params;
        const body = req.body;

        const existing = await Employee.findById(id);
        if (!existing) {
            return res.status(404).json({ message: "Employee record not found." });
        }

        // Validate uniqueness on update
        if (body.employeeId && body.employeeId !== existing.employeeId) {
            const dup = await Employee.findOne({ employeeId: body.employeeId, _id: { $ne: id } });
            if (dup) return res.status(409).json({ message: `Employee ID "${body.employeeId}" is already taken.` });
        }

        if (body.email && body.email.toLowerCase() !== existing.email) {
            const dup = await Employee.findOne({ email: body.email.toLowerCase(), _id: { $ne: id } });
            if (dup) return res.status(409).json({ message: `Email "${body.email}" is already used by another employee.` });
        }

        if (body.panNumber && body.panNumber.toUpperCase() !== existing.panNumber) {
            const dup = await Employee.findOne({ panNumber: body.panNumber.toUpperCase(), _id: { $ne: id } });
            if (dup) return res.status(409).json({ message: `PAN Number "${body.panNumber}" is already in use.` });
        }

        if (body.idProofNumber && body.idProofNumber !== existing.idProofNumber) {
            const dup = await Employee.findOne({ idProofNumber: body.idProofNumber, _id: { $ne: id } });
            if (dup) return res.status(409).json({ message: `Document ID Number "${body.idProofNumber}" is already registered.` });
        }

        const updateData = {
            ...body,
            reportingManager: body.reportingManager ? sanitizeManager(body.reportingManager) : existing.reportingManager,
            department: body.department ? (sanitizeObjectId(body.department) || body.department) : existing.department,
            designation: body.designation ? (sanitizeObjectId(body.designation) || body.designation) : existing.designation,
        };

        // Preserve and merge nested documents if files are uploaded
        if (req.files?.avatar) updateData.avatar = `/uploads/${req.files.avatar[0].filename}`;
        if (req.files?.resume) {
            updateData["documents.resumeUrl"] = `/uploads/${req.files.resume[0].filename}`;
            updateData["documents.resumeFileName"] = req.files.resume[0].originalname;
        }
        if (req.files?.idProof) {
            updateData["documents.idProofUrl"] = `/uploads/${req.files.idProof[0].filename}`;
            updateData["documents.idProofFileName"] = req.files.idProof[0].originalname;
        }

        const updated = await Employee.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true, runValidators: true }
        )
            .populate("department", "name")
            .populate({
                path: "reportingManager",
                select: "name firstName lastName designation",
                match: { _id: { $exists: true } },
            })
            .populate("designation", "title name");

        try {
            const userId = req.user?.id || req.user?._id || null;
            if (ActivityLog) {
                await ActivityLog.create({
                    user: userId,
                    action: `Updated employee profile: ${updated.name} (${updated.employeeId})`,
                    module: "Employee",
                });
            }
        } catch (logErr) {
            console.error("Activity log error:", logErr.message);
        }

        return res.status(200).json({
            success: true,
            message: "Employee updated successfully",
            employee: updated,
            data: updated,
        });
    } catch (error) {
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern || {})[0] || "field";
            return res.status(409).json({ message: `${field} must be unique across all employees.` });
        }
        return res.status(500).json({ message: "Failed to update employee profile." });
    }
};

// @route GET /api/employees
const getEmployees = async (req, res, next) => {
    try {
        const { status, department, search } = req.query;
        let filter = {};

        if (status) filter.employeeStatus = status;
        if (department) filter.department = department;
        if (search) filter.name = { $regex: search, $options: "i" };

        const employees = await Employee.find(filter)
            .populate("department", "name")
            .populate({
                path: "reportingManager",
                select: "name firstName lastName designation",
                match: { _id: { $exists: true } },
            })
            .populate("designation", "title name")
            .sort({ createdAt: -1 });

        return res.status(200).json(employees);
    } catch (err) {
        next(err);
    }
};

// @route GET /api/employees/profile
const getMyProfile = async (req, res, next) => {
    try {
        const userId = req.user?.id || req.user?._id;
        const userEmail = req.user?.email;
        const userName = req.user?.name || req.user?.username || "Staff Member";

        let employee = null;

        if (userId || userEmail) {
            employee = await Employee.findOne({
                $or: [
                    ...(userId ? [{ user: userId }, { userId: userId }, { _id: userId }] : []),
                    ...(userEmail ? [{ email: userEmail }] : [])
                ]
            })
                .populate("department", "name")
                .populate({
                    path: "reportingManager",
                    select: "name firstName lastName designation",
                    match: { _id: { $exists: true } },
                })
                .populate("designation", "title name");
        }

        if (!employee && userId) {
            try {
                const employeeId = await generateEmployeeId();
                const uniqueEmail = userEmail || `employee_${userId}_${Date.now()}@company.com`;

                employee = await Employee.create({
                    user: userId,
                    name: userName,
                    email: uniqueEmail,
                    employeeId: employeeId,
                    designation: req.user?.role || "Staff Member",
                    employeeStatus: "Active",
                    dateOfJoining: new Date()
                });
            } catch (createErr) {
                if (createErr.code === 11000) {
                    const fallbackEmail = userEmail || `employee_${userId}@company.com`;
                    employee = await Employee.findOneAndUpdate(
                        { email: fallbackEmail },
                        { user: userId, name: userName },
                        { new: true, upsert: false }
                    );
                } else {
                    throw createErr;
                }
            }
        }

        if (!employee) {
            return res.status(404).json({
                message: "Employee profile not found. Please contact HR to link your profile."
            });
        }

        return res.status(200).json(employee);
    } catch (err) {
        next(err);
    }
};

// @route GET /api/employees/:id
const getEmployeeById = async (req, res, next) => {
    try {
        const employee = await Employee.findById(req.params.id)
            .populate("department", "name")
            .populate({
                path: "reportingManager",
                select: "name firstName lastName designation",
                match: { _id: { $exists: true } },
            })
            .populate("designation", "title name");

        if (!employee) {
            return res.status(404).json({ message: "Employee not found" });
        }

        return res.status(200).json({
            success: true,
            data: employee,
            employee: employee,
        });
    } catch (error) {
        next(error);
    }
};

// @route DELETE /api/employees/:id
const deleteEmployee = async (req, res, next) => {
    try {
        const employee = await Employee.findByIdAndDelete(req.params.id);

        if (!employee) {
            return res.status(404).json({ message: "Employee not found" });
        }

        try {
            const userId = req.user?.id || req.user?._id || null;
            if (ActivityLog) {
                await ActivityLog.create({
                    user: userId,
                    action: `Deleted employee profile: ${employee.name}`,
                    module: "Employee",
                });
            }
        } catch (logErr) {
            console.error("Activity log error:", logErr.message);
        }

        return res.status(200).json({ message: "Employee removed successfully" });
    } catch (err) {
        next(err);
    }
};

// @route PUT /api/employees/:id/exit
const exitEmployee = async (req, res, next) => {
    try {
        const employee = await Employee.findByIdAndUpdate(
            req.params.id,
            { employeeStatus: "Exit", exitDate: req.body.exitDate || new Date() },
            { new: true }
        );

        if (!employee) {
            return res.status(404).json({ message: "Employee not found" });
        }

        try {
            const userId = req.user?.id || req.user?._id || null;
            if (ActivityLog) {
                await ActivityLog.create({
                    user: userId,
                    action: `Processed exit for employee: ${employee.name}`,
                    module: "Employee",
                });
            }
        } catch (logErr) {
            console.error("Activity log error:", logErr.message);
        }

        return res.status(200).json(employee);
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getEmployees,
    getMyProfile,
    getEmployeeById,
    getEmployee: getEmployeeById,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    exitEmployee,
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