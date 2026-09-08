const Department = require("../models/Department");
const Employee = require("../models/Employee");

// @route GET /api/departments
// Sab departments laata hai, saath mein head employee ka naam bhi populate karke
exports.getDepartments = async (req, res, next) => {
    try {
        const { isActive, branch } = req.query;
        const filter = {};
        if (isActive !== undefined) filter.isActive = isActive === "true";
        if (branch) filter.branch = branch;

        const departments = await Department.find(filter)
            .populate("head", "name employeeId")
            .sort({ name: 1 });

        // har department mein kitne employees hain, wo count bhi jod dete hain
        const departmentsWithCount = await Promise.all(
            departments.map(async (dept) => {
                const employeeCount = await Employee.countDocuments({
                    department: dept._id,
                    status: "active",
                });
                return { ...dept.toObject(), employeeCount };
            })
        );

        res.json(departmentsWithCount);
    } catch (err) {
        next(err);
    }
};

// @route GET /api/departments/:id
exports.getDepartment = async (req, res, next) => {
    try {
        const department = await Department.findById(req.params.id).populate(
            "head",
            "name employeeId designation"
        );
        if (!department) return res.status(404).json({ message: "Department not found" });

        const employees = await Employee.find({ department: department._id }).select(
            "name employeeId designation status"
        );

        res.json({ ...department.toObject(), employees });
    } catch (err) {
        next(err);
    }
};

// @route POST /api/departments
exports.createDepartment = async (req, res, next) => {
    try {
        const department = await Department.create(req.body);
        res.status(201).json(department);
    } catch (err) {
        next(err);
    }
};

// @route PUT /api/departments/:id
exports.updateDepartment = async (req, res, next) => {
    try {
        const department = await Department.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });
        if (!department) return res.status(404).json({ message: "Department not found" });
        res.json(department);
    } catch (err) {
        next(err);
    }
};

// @route DELETE /api/departments/:id
// Agar department mein active employees hain toh delete nahi hone denge — safety check
exports.deleteDepartment = async (req, res, next) => {
    try {
        const activeEmployees = await Employee.countDocuments({
            department: req.params.id,
            status: "active",
        });

        if (activeEmployees > 0) {
            return res.status(400).json({
                message: `Cannot delete — ${activeEmployees} active employee(s) assigned to this department`,
            });
        }

        const department = await Department.findByIdAndDelete(req.params.id);
        if (!department) return res.status(404).json({ message: "Department not found" });
        res.json({ message: "Department removed" });
    } catch (err) {
        next(err);
    }
};

// @route PUT /api/departments/:id/toggle-status
// Department ko active/inactive karne ke liye quick toggle
exports.toggleDepartmentStatus = async (req, res, next) => {
    try {
        const department = await Department.findById(req.params.id);
        if (!department) return res.status(404).json({ message: "Department not found" });

        department.isActive = !department.isActive;
        await department.save();
        res.json(department);
    } catch (err) {
        next(err);
    }
};