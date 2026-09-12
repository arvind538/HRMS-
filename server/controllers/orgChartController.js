const Employee = require("../models/Employee"); // Aapka Employee Model

// @desc    Get hierarchical organization chart
// @route   GET /api/organization/chart
// @access  Private
exports.getOrgChart = async (req, res, next) => {
    try {
        // Saare active employees ko fetch karein (name, role/designation, department, email, avatar, reportingManager)
        const employees = await Employee.find({ status: "active" })
            .populate("department", "name")
            .populate("designation", "title")
            .populate("reportingManager", "name email");

        if (!employees || employees.length === 0) {
            return res.status(404).json({ success: false, message: "No active employees found" });
        }

        // Map format mein data convert karein
        const employeeMap = {};
        let rootNode = null;

        employees.forEach(emp => {
            employeeMap[emp._id] = {
                id: emp._id,
                name: emp.name,
                role: emp.designation?.title || "Employee",
                department: emp.department?.name || "General",
                email: emp.email,
                avatar: emp.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
                children: []
            };
        });

        // Tree structure build karein based on reportingManager
        employees.forEach(emp => {
            if (emp.reportingManager) {
                const managerId = emp.reportingManager._id || emp.reportingManager;
                if (employeeMap[managerId]) {
                    employeeMap[managerId].children.push(employeeMap[emp._id]);
                }
            } else {
                // Jiska manager nahi hai, use CEO / Root node maan lenge
                rootNode = employeeMap[emp._id];
            }
        });

        // Agar koi explicit root node nahi mila, toh pehle employee ko root bana dein
        if (!rootNode && employees.length > 0) {
            rootNode = employeeMap[employees[0]._id];
        }

        res.status(200).json({
            success: true,
            data: rootNode
        });
    } catch (err) {
        next(err);
    }
};