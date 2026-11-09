export const CATEGORIES = ["Login & Account", "Attendance", "Leave Management", "Payroll & Salary", "Employee Profile", "Documents & ID Card", "Technical Issue", "Grievance / Complaint", "Reimbursement", "Other"];
export const PRIORITIES = ["Low", "Medium", "High", "Urgent"];
export const STATUSES = ["Open", "Assigned", "In Progress", "Waiting for Employee", "Resolved", "Closed"];

export const STATUS_UI = {
    Open: { label: "Open", tone: "rose" },
    Assigned: { label: "Assigned", tone: "violet" },
    "In Progress": { label: "In progress", tone: "indigo" },
    "Waiting for Employee": { label: "Waiting for employee", tone: "amber" },
    Resolved: { label: "Resolved", tone: "emerald" },
    Closed: { label: "Closed", tone: "slate" },
};
export const PRIORITY_UI = { Low: "slate", Medium: "sky", High: "amber", Urgent: "rose" };
export const SLA = { Urgent: "4 hours", High: "8 hours", Medium: "24 hours", Low: "48 hours" };
export const ROLE_LABEL = { admin: "Admin", hr: "HR", manager: "Manager", employee: "Employee" };
export const QUICK = ["We are looking into this.", "Could you share more details or a screenshot?", "This is fixed now. Please check and confirm.", "Please try once more and let us know."];
export const DONE = ["Resolved", "Closed"];

export const dayKey = (v) => new Date(v).toDateString();
export const dayLabel = (v) => {
    const d = new Date(v);
    const t = new Date();
    const y = new Date();
    y.setDate(t.getDate() - 1);
    if (d.toDateString() === t.toDateString()) return "Today";
    if (d.toDateString() === y.toDateString()) return "Yesterday";
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};
export const clock = (v) => new Date(v).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
export const when = (v) => (v ? new Date(v).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "—");
export const ago = (v) => {
    const s = Math.max(0, (Date.now() - new Date(v).getTime()) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)} min ago`;
    if (s < 86400) return `${Math.floor(s / 3600)} hr ago`;
    return `${Math.floor(s / 86400)} d ago`;
};