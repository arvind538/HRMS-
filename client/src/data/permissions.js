// src/data/permissions.js

// ===== Har exact page (href) ke liye role rules =====
// Jo href yahan defined hai, uski yahi rule final hai — koi aur jagah check nahi hoti
const pathOverrides = {
    // ---------- Dashboard ----------
    "/dashboard": ["admin", "hr", "manager", "employee"],
    "/dashboard/analytics": ["admin", "hr"],
    "/dashboard/employee-stats": ["admin", "hr"],
    "/dashboard/attendance-summary": ["admin", "hr", "manager"],
    "/dashboard/leave-summary": ["admin", "hr", "manager"],
    "/dashboard/payroll-summary": ["admin", "hr"],

    // ---------- Employee Management ----------
    "/employees": ["admin", "hr", "manager"],
    "/employees/add": ["admin", "hr"],
    "/employees/directory": ["admin", "hr", "manager"],
    "/employees/profile": ["admin", "hr", "manager"],
    "/employees/documents": ["admin", "hr"],
    "/employees/id-cards": ["admin", "hr"],
    "/employees/emergency-contacts": ["admin", "hr"],
    "/employees/history": ["admin", "hr"],
    "/employees/exit": ["admin", "hr"],

    // ---------- Organization ----------
    "/organization/company": ["admin", "hr"],
    "/organization/branches": ["admin", "hr"],
    "/organization/departments": ["admin", "hr", "manager"],
    "/organization/designations": ["admin", "hr"],
    "/organization/teams": ["admin", "hr", "manager"],
    "/organization/locations": ["admin", "hr"],
    "/organization/managers": ["admin", "hr", "manager"],
    "/organization/chart": ["admin", "hr", "manager"],

    // ---------- Recruitment (poora sirf admin/hr) ----------
    "/recruitment/positions": ["admin", "hr"],
    "/recruitment/posts": ["admin", "hr"],
    "/recruitment/applications": ["admin", "hr"],
    "/recruitment/candidates": ["admin", "hr"],
    "/recruitment/interviews": ["admin", "hr"],
    "/recruitment/feedback": ["admin", "hr"],
    "/recruitment/offers": ["admin", "hr"],
    "/recruitment/pipeline": ["admin", "hr"],
    "/recruitment/reports": ["admin", "hr"],

    // ---------- Attendance ----------
    "/attendance": ["admin", "hr", "manager", "employee"],
    "/attendance/daily": ["admin", "hr", "manager"],
    "/attendance/monthly": ["admin", "hr", "manager"],
    "/attendance/check-in-out": ["admin", "hr", "manager"],
    "/attendance/biometric": ["admin", "hr"],
    "/attendance/self": ["admin", "hr", "manager", "employee"],
    "/attendance/late-coming": ["admin", "hr", "manager"],
    "/attendance/early-leaving": ["admin", "hr", "manager"],
    "/attendance/overtime": ["admin", "hr", "manager"],
    "/attendance/regularization": ["admin", "hr", "manager"],
    "/attendance/reports": ["admin", "hr", "manager"],

    // ---------- Leave Management ----------
    "/leave": ["admin", "hr", "manager", "employee"],
    "/leave/types": ["admin", "hr"],
    "/leave/policies": ["admin", "hr"],
    "/leave/apply": ["admin", "hr", "manager", "employee"],
    "/leave/requests": ["admin", "hr", "manager"],
    "/leave/approval": ["admin", "hr", "manager"],
    "/leave/balance": ["admin", "hr", "manager", "employee"],
    "/leave/holidays": ["admin", "hr", "manager", "employee"],
    "/leave/reports": ["admin", "hr"],

    // ---------- Payroll (poora sirf admin/hr) ----------
    "/payroll": ["admin", "hr"],
    "/payroll/structure": ["admin", "hr"],
    "/payroll/components": ["admin", "hr"],
    "/payroll/employee-salary": ["admin", "hr"],
    "/payroll/generate": ["admin", "hr"],
    "/payroll/processing": ["admin", "hr"],
    "/payroll/payslips": ["admin", "hr"],
    "/payroll/bonuses": ["admin", "hr"],
    "/payroll/deductions": ["admin", "hr"],
    "/payroll/loans": ["admin", "hr"],
    "/payroll/reimbursements": ["admin", "hr"],
    "/payroll/tax": ["admin", "hr"],
    "/payroll/reports": ["admin", "hr"],

    // ---------- Performance ----------
    "/performance": ["admin", "hr", "manager", "employee"],
    "/performance/goals": ["admin", "hr", "manager", "employee"],
    "/performance/appraisals": ["admin", "hr", "manager"],
    "/performance/reviews": ["admin", "hr", "manager"],
    "/performance/self-assessment": ["admin", "hr", "manager", "employee"],
    "/performance/manager-assessment": ["admin", "hr", "manager"],
    "/performance/rating": ["admin", "hr", "manager"],
    "/performance/promotion": ["admin", "hr"],
    "/performance/increment": ["admin", "hr"],

    // ---------- Training & Development ----------
    "/training": ["admin", "hr", "manager", "employee"],
    "/training/programs": ["admin", "hr"],
    "/training/courses": ["admin", "hr", "manager", "employee"],
    "/training/trainers": ["admin", "hr"],
    "/training/employee-training": ["admin", "hr", "manager", "employee"],
    "/training/calendar": ["admin", "hr", "manager", "employee"],
    "/training/certifications": ["admin", "hr", "manager", "employee"],
    "/training/reports": ["admin", "hr"],

    // ---------- Expenses ----------
    "/expenses": ["admin", "hr", "manager", "employee"],
    "/expenses/categories": ["admin", "hr"],
    "/expenses/submit": ["admin", "hr", "manager", "employee"],
    "/expenses/requests": ["admin", "hr", "manager"],
    "/expenses/approval": ["admin", "hr", "manager"],
    "/expenses/reports": ["admin", "hr"],

    // ---------- Travel ----------
    "/travel/requests": ["admin", "hr", "manager", "employee"],
    "/travel/approval": ["admin", "hr", "manager"],
    "/travel/plans": ["admin", "hr", "manager"],
    "/travel/expenses": ["admin", "hr", "manager"],
    "/travel/reports": ["admin", "hr"],

    // ---------- Assets (poora sirf admin/hr) ----------
    "/assets": ["admin", "hr"],
    "/assets/categories": ["admin", "hr"],
    "/assets/all": ["admin", "hr"],
    "/assets/assign": ["admin", "hr"],
    "/assets/return": ["admin", "hr"],
    "/assets/history": ["admin", "hr"],
    "/assets/maintenance": ["admin", "hr"],

    // ---------- Documents ----------
    "/documents/company": ["admin", "hr", "manager", "employee"],
    "/documents/employee": ["admin", "hr"],
    "/documents/policies": ["admin", "hr", "manager", "employee"],
    "/documents/offer-letters": ["admin", "hr"],
    "/documents/appointment-letters": ["admin", "hr"],
    "/documents/salary-letters": ["admin", "hr"],
    "/documents/experience-letters": ["admin", "hr"],
    "/documents/joining": ["admin", "hr"],

    // ---------- Communication ----------
    "/communication/announcements": ["admin", "hr", "manager", "employee"],
    "/communication/notifications": ["admin", "hr", "manager", "employee"],
    "/communication/messages": ["admin", "hr", "manager", "employee"],
    "/communication/email": ["admin", "hr"],
    "/communication/sms": ["admin", "hr"],
    "/communication/circulars": ["admin", "hr", "manager", "employee"],

    // ---------- Employee Self Service (sabke liye) ----------
    "/self-service/profile": ["admin", "hr", "manager", "employee"],
    "/self-service/attendance": ["admin", "hr", "manager", "employee"],
    "/self-service/leaves": ["admin", "hr", "manager", "employee"],
    "/self-service/payslips": ["admin", "hr", "manager", "employee"],
    "/self-service/documents": ["admin", "hr", "manager", "employee"],
    "/self-service/expenses": ["admin", "hr", "manager", "employee"],
    "/self-service/assets": ["admin", "hr", "manager", "employee"],
    "/self-service/goals": ["admin", "hr", "manager", "employee"],
    "/self-service/performance": ["admin", "hr", "manager", "employee"],
    "/self-service/requests": ["admin", "hr", "manager", "employee"],

    // ---------- Shift Management (poora sirf admin/hr) ----------
    "/shifts": ["admin", "hr"],
    "/shifts/assignment": ["admin", "hr"],
    "/shifts/roster": ["admin", "hr"],
    "/shifts/weekly": ["admin", "hr"],
    "/shifts/night": ["admin", "hr"],
    "/shifts/reports": ["admin", "hr"],

    // ---------- Compliance (poora sirf admin/hr) ----------
    "/compliance/pf": ["admin", "hr"],
    "/compliance/esi": ["admin", "hr"],
    "/compliance/tds": ["admin", "hr"],
    "/compliance/professional-tax": ["admin", "hr"],
    "/compliance/labour": ["admin", "hr"],
    "/compliance/statutory-reports": ["admin", "hr"],
    "/compliance/calendar": ["admin", "hr"],

    // ---------- Reports (poora sirf admin/hr) ----------
    "/reports/employee": ["admin", "hr"],
    "/reports/attendance": ["admin", "hr"],
    "/reports/leave": ["admin", "hr"],
    "/reports/payroll": ["admin", "hr"],
    "/reports/recruitment": ["admin", "hr"],
    "/reports/performance": ["admin", "hr"],
    "/reports/custom": ["admin", "hr"],

    // ---------- Settings (poora sirf admin) ----------
    "/settings/general": ["admin"],
    "/settings/company": ["admin"],
    "/settings/attendance": ["admin"],
    "/settings/leave": ["admin"],
    "/settings/payroll": ["admin"],
    "/settings/notifications": ["admin"],
    "/settings/workflow": ["admin"],

    // ---------- User & Access Management (poora sirf admin) ----------
    "/users": ["admin"],
    "/users/roles": ["admin"],
    "/users/permissions": ["admin"],
    "/users/login-history": ["admin"],
    "/users/activity-logs": ["admin"],

    // ---------- Help & Support (sabke liye) ----------
    "/help": ["admin", "hr", "manager", "employee"],
    "/help/faqs": ["admin", "hr", "manager", "employee"],
    "/help/tickets": ["admin", "hr", "manager", "employee"],
    "/help/contact": ["admin", "hr", "manager", "employee"],
};

// URL ke pehle segment se module-key nikaalta hai (fallback ke liye)
export const getModuleKeyFromPath = (href) => {
    const segments = href.split("/").filter(Boolean);
    return segments[0] || "dashboard";
};

// ===== Module-level fallback — sirf tab use hota hai jab pathOverrides mein entry na ho =====
// Agar bhavishya mein koi naya page banao jo yahan list nahi hai, ye fallback usse handle karega
const modulePermissions = {
    dashboard: ["admin", "hr", "manager", "employee"],
    employees: ["admin", "hr", "manager"],
    organization: ["admin", "hr", "manager"],
    recruitment: ["admin", "hr"],
    attendance: ["admin", "hr", "manager", "employee"],
    leave: ["admin", "hr", "manager", "employee"],
    payroll: ["admin", "hr"],
    performance: ["admin", "hr", "manager", "employee"],
    training: ["admin", "hr", "manager", "employee"],
    expenses: ["admin", "hr", "manager", "employee"],
    travel: ["admin", "hr", "manager", "employee"],
    assets: ["admin", "hr"],
    documents: ["admin", "hr", "manager", "employee"],
    communication: ["admin", "hr", "manager", "employee"],
    "self-service": ["admin", "hr", "manager", "employee"],
    shifts: ["admin", "hr"],
    compliance: ["admin", "hr"],
    reports: ["admin", "hr"],
    settings: ["admin"],
    users: ["admin"],
    help: ["admin", "hr", "manager", "employee"],
};

// ===== MAIN FUNCTION — poore app mein sirf yahi call hoga =====
export const canAccessPath = (role, href) => {
    if (!role || !href) return false;

    // Step 1: exact path override check karo
    if (pathOverrides[href]) {
        return pathOverrides[href].includes(role);
    }

    // Step 2: nahi mila toh module-level fallback
    const moduleKey = getModuleKeyFromPath(href);
    const allowedRoles = modulePermissions[moduleKey];
    if (!allowedRoles) return true; // completely unknown module — safety allow

    return allowedRoles.includes(role);
};




// // src/data/permissions.js

// // Har module ka ek unique "key" hai jo uske route ke pehle segment se match karta hai
// // (jaise "/employees/add" ka key "employees" hai)
// // Value = kaunse roles is module ko access kar sakte hain

// export const modulePermissions = {
//     dashboard: ["admin", "hr", "manager", "employee"],
//     employees: ["admin", "hr", "manager"], // manager sirf view karega, form-level restriction alag se
//     organization: ["admin", "hr", "manager"],
//     recruitment: ["admin", "hr"],
//     attendance: ["admin", "hr", "manager", "employee"],
//     leave: ["admin", "hr", "manager", "employee"],
//     payroll: ["admin", "hr"],
//     performance: ["admin", "hr", "manager", "employee"],
//     training: ["admin", "hr", "manager", "employee"],
//     expenses: ["admin", "hr", "manager", "employee"],
//     travel: ["admin", "hr", "manager", "employee"],
//     assets: ["admin", "hr", "employee"], // manager ko assets ki zaroorat nahi
//     documents: ["admin", "hr", "employee"],
//     communication: ["admin", "hr", "manager", "employee"],
//     shifts: ["admin", "hr"],
//     compliance: ["admin", "hr"],
//     reports: ["admin", "hr"],
//     settings: ["admin"],
//     users: ["admin"],
//     help: ["admin", "hr", "manager", "employee"],
//     "self-service": ["admin", "hr", "manager", "employee"],
//     profile: ["admin", "hr", "manager", "employee"], // sabko apni profile access honi chahiye
// };

// // URL ke pehle segment se module key nikaalta hai
// // "/employees/add" -> "employees" | "/leave/apply" -> "leave" | "/dashboard" -> "dashboard"
// export const getModuleKeyFromPath = (pathname) => {
//     const segments = pathname.split("/").filter(Boolean);
//     return segments[0] || "dashboard";
// };

// // Check karta hai kya diya gaya role, diye gaye path ko access kar sakta hai
// export const canAccessPath = (role, pathname) => {
//     if (!role) return false;
//     const moduleKey = getModuleKeyFromPath(pathname);
//     const allowedRoles = modulePermissions[moduleKey];

//     // Agar module list mein hi nahi hai (jaise koi naya unlisted route), default allow kar do
//     // taaki accidentally kisi valid page ko block na kar de
//     if (!allowedRoles) return true;

//     return allowedRoles.includes(role);
// };