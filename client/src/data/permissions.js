// src/data/permissions.js

// Har module ka ek unique "key" hai jo uske route ke pehle segment se match karta hai
// (jaise "/employees/add" ka key "employees" hai)
// Value = kaunse roles is module ko access kar sakte hain

export const modulePermissions = {
    dashboard: ["admin", "hr", "manager", "employee"],
    employees: ["admin", "hr", "manager"], // manager sirf view karega, form-level restriction alag se
    organization: ["admin", "hr", "manager"],
    recruitment: ["admin", "hr"],
    attendance: ["admin", "hr", "manager", "employee"],
    leave: ["admin", "hr", "manager", "employee"],
    payroll: ["admin", "hr"],
    performance: ["admin", "hr", "manager", "employee"],
    training: ["admin", "hr", "manager", "employee"],
    expenses: ["admin", "hr", "manager", "employee"],
    travel: ["admin", "hr", "manager", "employee"],
    assets: ["admin", "hr", "employee"], // manager ko assets ki zaroorat nahi
    documents: ["admin", "hr", "employee"],
    communication: ["admin", "hr", "manager", "employee"],
    shifts: ["admin", "hr"],
    compliance: ["admin", "hr"],
    reports: ["admin", "hr"],
    settings: ["admin"],
    users: ["admin"],
    help: ["admin", "hr", "manager", "employee"],
    "self-service": ["admin", "hr", "manager", "employee"],
    profile: ["admin", "hr", "manager", "employee"], // sabko apni profile access honi chahiye
};

// URL ke pehle segment se module key nikaalta hai
// "/employees/add" -> "employees" | "/leave/apply" -> "leave" | "/dashboard" -> "dashboard"
export const getModuleKeyFromPath = (pathname) => {
    const segments = pathname.split("/").filter(Boolean);
    return segments[0] || "dashboard";
};

// Check karta hai kya diya gaya role, diye gaye path ko access kar sakta hai
export const canAccessPath = (role, pathname) => {
    if (!role) return false;
    const moduleKey = getModuleKeyFromPath(pathname);
    const allowedRoles = modulePermissions[moduleKey];

    // Agar module list mein hi nahi hai (jaise koi naya unlisted route), default allow kar do
    // taaki accidentally kisi valid page ko block na kar de
    if (!allowedRoles) return true;

    return allowedRoles.includes(role);
};