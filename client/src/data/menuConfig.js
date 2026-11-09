// src/data/permissions.js

// Role ke hisaab se base path prefix deta hai
export const getRolePrefix = (role) => {
    switch (role) {
        case "admin":
            return "/admin";
        case "hr":
            return "/hr";
        case "manager":
            return "/manager";
        case "employee":
            return "/employee";
        default:
            return "/employee";
    }
};

// Yeh check karta hai ki user kis path par ja sakta hai
export const canAccessPath = (role, path) => {
    if (!role) return false;
    if (role === "admin") return true; // Admin sab access kar sakta hai

    // Agar path pehle se role prefix se shuru nahi hai toh base route check karo
    const rolePrefix = getRolePrefix(role);

    // Employee self-service ya general pages access kar sakte hain
    if (role === "employee" && (path.startsWith("/self-service") || path.startsWith("/help") || path === "/dashboard")) {
        return true;
    }

    return true; // Aap ise apne strict permission rules ke mutabiq modify kar sakte hain
};


import {
    LayoutDashboard, Users, Building2, Briefcase, Clock, CalendarDays,
    Wallet, TrendingUp, GraduationCap, Receipt, Plane, Package,
    FileText, MessageSquare, UserCircle, Repeat, ShieldCheck,
    BarChart3, Settings, Lock, HelpCircle, ListChecks,
} from "lucide-react";

export const menuConfig = [
    {
        label: "Dashboard",
        icon: LayoutDashboard,
        children: [
            { label: "overview", href: "/dashboard" },

        ],
    },

    {
        label: "Tasks",
        icon: ListChecks,
        children: [
            { label: "overview", href: "/tasks" },
        ],
    },
    {
        label: "My Team",
        icon: Users,
        href: "/team"

    },


    {
        label: "Employee Management",
        icon: Users,
        children: [
            { label: "All Employees", href: "/employees" },
            { label: "Add Employee", href: "/employees/add" },
            { label: "Employee ID Cards", href: "/employees/id-cards" },
            { label: "Emergency Contacts", href: "/employees/emergency-contacts" },
            { label: "Employee History", href: "/employees/history" },
            { label: "Exited Employees", href: "/employees/exit" },
        ],
    },
    {
        label: "Organization",
        icon: Building2,
        children: [
            { label: "Company", href: "/organization/company" },
            { label: "Branches", href: "/organization/branches" },
            { label: "Departments", href: "/organization/departments" },
            { label: "Designations", href: "/organization/designations" },
            { label: "Teams", href: "/organization/teams" },
            { label: "Locations", href: "/organization/locations" },
            { label: "Reporting Managers", href: "/organization/managers" },
            { label: "Organization Chart", href: "/organization/chart" },
        ],
    },
    {
        label: "Recruitment",
        icon: Briefcase,
        children: [
            { label: "Job Positions", href: "/recruitment/positions" },
            { label: "Job Posts", href: "/recruitment/posts" },
            { label: "Job Applications", href: "/recruitment/applications" },
            { label: "Candidates", href: "/recruitment/candidates" },
            { label: "Interview Schedule", href: "/recruitment/interviews" },
            { label: "Interview Feedback", href: "/recruitment/feedback" },
            { label: "Offer Letters", href: "/recruitment/offers" },
            { label: "Recruitment Pipeline", href: "/recruitment/pipeline" },
            { label: "Recruitment Reports", href: "/recruitment/reports" },
        ],
    },
    {
        label: "Attendance",
        icon: Clock,
        children: [
            { label: "Attendance list", href: "/attendance" },
            { label: "Daily Attendance", href: "/attendance/daily" },
            { label: "Attendance Monthly ", href: "/attendance/monthly" },
            { label: "Attendance Summary", href: "/attendance/summary" },
            { label: "Off Days", href: "/attendance/off-days" },
        ],
    },
    {
        label: "Leave Management",
        icon: CalendarDays,
        children: [
            { label: "Leave Dashboard", href: "/leave" },
            { label: "Leave Types", href: "/leave/types" },
            { label: "Leave Policies", href: "/leave/policies" },
            { label: "Apply Leave", href: "/leave/apply" },
            { label: "Leave Requests", href: "/leave/requests" },
            { label: "Leave Approval", href: "/leave/approval" },
            { label: "Leave Balance", href: "/leave/balance" },
            { label: "Holiday Calendar", href: "/leave/holidays" },
            { label: "Leave Reports", href: "/leave/reports" },
        ],
    },
    {
        label: "Payroll",
        icon: Wallet,
        children: [
            { label: "Payroll Dashboard", href: "/payroll" },
            { label: "Salary Structure", href: "/payroll/structure" },
            { label: "Salary Components", href: "/payroll/components" },
            { label: "Employee Salary", href: "/payroll/employee-salary" },
            { label: "Generate Payroll", href: "/payroll/generate" },
            { label: "Payroll Processing", href: "/payroll/processing" },
            // { label: "Payslips", href: "/payroll/payslips" },
            { label: "Bonuses", href: "/payroll/bonuses" },
            { label: "Deductions", href: "/payroll/deductions" },
            { label: "Loans / Advances", href: "/payroll/loans" },
            { label: "Reimbursements", href: "/payroll/reimbursements" },
            { label: "Tax / TDS", href: "/payroll/tax" },
            { label: "Payroll Reports", href: "/payroll/reports" },
        ],
    },
    {
        label: "Performance",
        icon: TrendingUp,
        children: [
            { label: "Performance Dashboard", href: "/performance" },
            { label: "Goals / KPIs", href: "/performance/goals" },
            { label: "Appraisals", href: "/performance/appraisals" },
            { label: "Performance Reviews", href: "/performance/reviews" },
            { label: "Self Assessment", href: "/performance/self-assessment" },
            { label: "Manager Assessment", href: "/performance/manager-assessment" },
            { label: "Performance Rating", href: "/performance/rating" },
            { label: "Promotion", href: "/performance/promotion" },
            { label: "Increment", href: "/performance/increment" },
        ],
    },
    // {
    //     label: "Training & Development",
    //     icon: GraduationCap,
    //     children: [
    //         { label: "Training Dashboard", href: "/training" },
    //         { label: "Training Programs", href: "/training/programs" },
    //         { label: "Courses", href: "/training/courses" },
    //         { label: "Trainers", href: "/training/trainers" },
    //         { label: "Employee Training", href: "/training/employee-training" },
    //         { label: "Training Calendar", href: "/training/calendar" },
    //         { label: "Certifications", href: "/training/certifications" },
    //         { label: "Training Reports", href: "/training/reports" },
    //     ],
    // },
    {
        label: "Expenses",
        icon: Receipt,
        children: [
            { label: "Expense Dashboard", href: "/expenses" },
            { label: "Expense Categories", href: "/expenses/categories" },
            { label: "Submit Expense", href: "/expenses/submit" },
            { label: "Expense Requests", href: "/expenses/requests" },
            { label: "Expense Approval", href: "/expenses/approval" },
            { label: "Expense Reports", href: "/expenses/reports" },
        ],
    },
    {
        label: "Travel",
        icon: Plane,
        children: [
            { label: "Travel Requests", href: "/travel/requests" },
            { label: "Travel Approval", href: "/travel/approval" },
            { label: "Travel Plans", href: "/travel/plans" },
            { label: "Travel Expenses", href: "/travel/expenses" },
            { label: "Travel Reports", href: "/travel/reports" },
        ],
    },
    // {
    //     label: "Assets",
    //     icon: Package,
    //     children: [
    //         { label: "Asset Dashboard", href: "/assets" },
    //         { label: "Asset Categories", href: "/assets/categories" },
    //         { label: "All Assets", href: "/assets/all" },
    //         { label: "Assign Asset", href: "/assets/assign" },
    //         { label: "Return Asset", href: "/assets/return" },
    //         { label: "Asset History", href: "/assets/history" },
    //         { label: "Asset Maintenance", href: "/assets/maintenance" },
    //     ],
    // },
    {
        label: "Documents",
        icon: FileText,
        children: [
            { label: "Company Documents", href: "/documents/company" },
            { label: "Employee Documents", href: "/documents/employee" },
            { label: "HR Policies", href: "/documents/policies" },
            { label: "Offer Letters", href: "/documents/offer-letters" },
            { label: "Appointment Letters", href: "/documents/appointment-letters" },
            { label: "Salary Letters", href: "/documents/salary-letters" },
            { label: "Experience Letters", href: "/documents/experience-letters" },
            { label: "Joining Documents", href: "/documents/joining" },
        ],
    },
    {
        label: "Communication",
        icon: MessageSquare,
        children: [
            { label: "Announcements", href: "/communication/announcements" },
            { label: "Notifications", href: "/communication/notifications" },
            { label: "Internal Messages", href: "/communication/messages" },
            { label: "Email", href: "/communication/email" },
            { label: "SMS", href: "/communication/sms" },
            // { label: "Employee Circulars", href: "/communication/circulars" },
        ],
    },
    {
        label: "Employee Self Service",
        icon: UserCircle,
        children: [
            { label: "My Profile", href: "/self-service/profile" },
            { label: "My Attendance", href: "/self-service/attendance" },
            { label: "My Leaves", href: "/self-service/leaves" },
            { label: "My Payslips", href: "/self-service/payslips" },
            { label: "My Documents", href: "/self-service/documents" },
            { label: "My Expenses", href: "/self-service/expenses" },
            // { label: "My Assets", href: "/self-service/assets" },
            // { label: "My Goals", href: "/self-service/goals" },
            { label: "My Performance", href: "/self-service/performance" },
            { label: "My Requests", href: "/self-service/requests" },
        ],
    },
    {
        label: "Shift Management",
        icon: Repeat,
        children: [
            { label: "Shifts", href: "/shifts" },
            { label: "Shift Assignment", href: "/shifts/assignment" },
            { label: "Shift Roster", href: "/shifts/roster" },
            { label: "Weekly Schedule", href: "/shifts/weekly" },
            { label: "Night Shift", href: "/shifts/night" },
            { label: "Shift Reports", href: "/shifts/reports" },
        ],
    },
    {
        label: "Compliance",
        icon: ShieldCheck,
        children: [
            { label: "PF", href: "/compliance/pf" },
            { label: "ESI", href: "/compliance/esi" },
            { label: "TDS", href: "/compliance/tds" },
            { label: "Professional Tax", href: "/compliance/professional-tax" },
            { label: "Labour Compliance", href: "/compliance/labour" },
            { label: "Statutory Reports", href: "/compliance/statutory-reports" },
            { label: "Compliance Calendar", href: "/compliance/calendar" },
        ],
    },
    {
        label: "Reports",
        icon: BarChart3,
        children: [
            { label: "Employee Reports", href: "/reports/employee" },
            { label: "Attendance Reports", href: "/reports/attendance" },
            { label: "Leave Reports", href: "/reports/leave" },
            { label: "Payroll Reports", href: "/reports/payroll" },
            { label: "Recruitment Reports", href: "/reports/recruitment" },
            { label: "Performance Reports", href: "/reports/performance" },
            { label: "Custom Reports", href: "/reports/custom" },
        ],
    },
    {
        label: "Settings",
        icon: Settings,
        children: [
            { label: "General Settings", href: "/settings/general" },
            { label: "Company Settings", href: "/settings/company" },
            { label: "Attendance Settings", href: "/settings/attendance" },
            { label: "Leave Settings", href: "/settings/leave" },
            { label: "Payroll Settings", href: "/settings/payroll" },
            { label: "Notification Settings", href: "/settings/notifications" },
            { label: "Workflow Settings", href: "/settings/workflow" },
        ],
    },
    {
        label: "User & Access Management",
        icon: Lock,
        children: [
            { label: "Users", href: "/users" },
            { label: "Roles", href: "/users/roles" },
            { label: "Permissions", href: "/users/permissions" },
            { label: "Login History", href: "/users/login-history" },
            // { label: "Activity Logs", href: "/users/activity-logs" },
        ],
    },
    {
        label: "Help & Support",
        icon: HelpCircle,
        children: [
            { label: "Help Center", href: "/help" },
            { label: "FAQs", href: "/help/faqs" },
            { label: "Support Tickets", href: "/help/tickets" },
            { label: "Contact HR", href: "/help/contact" },
        ],
    },
];



