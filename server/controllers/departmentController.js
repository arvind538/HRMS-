const Department = require("../models/Department");
const Employee = require("../models/Employee");

// Helper field string to populate full employee profile
const POPULATE_HEAD_FIELDS = "name firstName lastName fullName email employeeId designation";

// Helper function to attach employee count
const attachEmployeeCount = async (deptDoc) => {
    const employeeCount = await Employee.countDocuments({
        department: deptDoc._id,
        status: "active",
    });
    return { ...deptDoc.toObject(), employeeCount };
};

// @route GET /api/departments
// Sab departments laata hai, saath mein head employee ka naam aur active employee count
exports.getDepartments = async (req, res, next) => {
    try {
        const { isActive, branch } = req.query;
        const filter = {};
        if (isActive !== undefined) filter.isActive = isActive === "true";
        if (branch) filter.branch = branch;

        const departments = await Department.find(filter)
            .populate("head", POPULATE_HEAD_FIELDS)
            .sort({ name: 1 });

        // Har department ke active employees count add karna
        const departmentsWithCount = await Promise.all(
            departments.map((dept) => attachEmployeeCount(dept))
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
            POPULATE_HEAD_FIELDS
        );
        if (!department) return res.status(404).json({ message: "Department not found" });

        const employees = await Employee.find({ department: department._id }).select(
            "name firstName lastName fullName employeeId designation status"
        );

        res.json({ ...department.toObject(), employees });
    } catch (err) {
        next(err);
    }
};

// @route POST /api/departments
exports.createDepartment = async (req, res, next) => {
    try {
        const payload = { ...req.body };

        // Empty string ya undefined aane par null set karein
        if (!payload.head || payload.head === "" || payload.head === "null") {
            payload.head = null;
        }

        const newDept = await Department.create(payload);

        // Created department ko populate karke return karein
        const populatedDept = await Department.findById(newDept._id).populate(
            "head",
            POPULATE_HEAD_FIELDS
        );

        const result = await attachEmployeeCount(populatedDept);
        res.status(201).json(result);
    } catch (err) {
        next(err);
    }
};

// @route PUT /api/departments/:id
exports.updateDepartment = async (req, res, next) => {
    try {
        const payload = { ...req.body };

        // Agar head remove kiya gaya ho toh null karein
        if (!payload.head || payload.head === "" || payload.head === "null") {
            payload.head = null;
        }

        const updatedDepartment = await Department.findByIdAndUpdate(
            req.params.id,
            payload,
            {
                new: true,
                runValidators: true,
            }
        ).populate("head", POPULATE_HEAD_FIELDS);

        if (!updatedDepartment) {
            return res.status(404).json({ message: "Department not found" });
        }

        const result = await attachEmployeeCount(updatedDepartment);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

// @route DELETE /api/departments/:id
// Agar department mein active employees hain toh delete nahi hone denge
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
exports.toggleDepartmentStatus = async (req, res, next) => {
    try {
        const department = await Department.findById(req.params.id);
        if (!department) return res.status(404).json({ message: "Department not found" });

        department.isActive = !department.isActive;
        await department.save();

        const populated = await Department.findById(department._id).populate(
            "head",
            POPULATE_HEAD_FIELDS
        );

        const result = await attachEmployeeCount(populated);
        res.json(result);
    } catch (err) {
        next(err);
    }
};