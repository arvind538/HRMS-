// controllers/orgChartController.js
const Employee = require("../models/Employee");

const DEFAULT_AVATAR =
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80";

// In statuses wale employees chart me nahi dikhenge
const INACTIVE_STATUSES = [
    "inactive", "terminated", "resigned", "exited",
    "left", "suspended", "deleted", "absconded",
];

const isInactive = (emp) => {
    if (emp.isActive === false) return true;
    const s = String(emp.status || emp.employmentStatus || "").trim().toLowerCase();
    return INACTIVE_STATUSES.includes(s);
};

// @desc    Get hierarchical organization chart
// @route   GET /api/organization/chart
// @access  Private
exports.getOrgChart = async (req, res, next) => {
    try {
        const all = await Employee.find({})
            .populate("department", "name")
            .populate("designation", "title name")
            .lean();

        const employees = all.filter((e) => !isInactive(e));

        if (!employees.length) {
            return res.status(200).json({
                success: true,
                data: null,
                message: all.length
                    ? "Saare employees inactive/terminated hain"
                    : "Database me koi employee nahi hai",
            });
        }

        const nodeMap = new Map();
        employees.forEach((emp) => {
            nodeMap.set(String(emp._id), {
                id: String(emp._id),
                name:
                    emp.name ||
                    `${emp.firstName || ""} ${emp.lastName || ""}`.trim() ||
                    emp.email ||
                    "Unnamed",
                role: emp.designation?.title || emp.designation?.name || "Employee",
                department: emp.department?.name || "General",
                email: emp.email || "",
                avatar: emp.avatar || DEFAULT_AVATAR,
                children: [],
            });
        });

        const roots = [];
        employees.forEach((emp) => {
            const node = nodeMap.get(String(emp._id));
            const managerId = emp.reportingManager ? String(emp.reportingManager) : null;
            const parent = managerId ? nodeMap.get(managerId) : null;

            if (parent && parent !== node) parent.children.push(node);
            else roots.push(node);
        });

        if (!roots.length) roots.push(nodeMap.get(String(employees[0]._id)));

        return res.status(200).json({
            success: true,
            data: roots.length === 1 ? roots[0] : roots,
        });
    } catch (err) {
        next(err);
    }
};