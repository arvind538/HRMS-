import { Award, Briefcase, Building2, Globe2, Layers, MapPin, ShieldCheck, UserCog, Users, Users2 } from "lucide-react";
// import { PRESETS } from "./orgPresets";

export const INDIAN_STATES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana",
    "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
    "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
    "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh",
    "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

/* Finds a state name written inside a text (case-insensitive). The longest match wins. */
export const findState = (text) => {
    const t = String(text || "").toLowerCase();
    if (!t) return "";
    return (
        INDIAN_STATES
            .filter((s) => new RegExp(`(^|[^a-z])${s.toLowerCase().replace(/ /g, "\\s+")}([^a-z]|$)`).test(t))
            .sort((a, b) => b.length - a.length)[0] || ""
    );
};

const live = (r) => r.status !== "inactive";
const act = (rows) => rows.filter(live).length;
const uniq = (rows, k) => new Set(rows.map((r) => r[k]).filter(Boolean)).size;
const sum = (rows, k) => rows.reduce((s, r) => s + (Number(r[k]) || 0), 0);
const join = (...a) => a.filter(Boolean).join(" • ");
const place = (r) => [r.city, r.state].filter(Boolean).join(", ");
export const namesOf = (list) => (Array.isArray(list) ? list.map((x) => x?.name).filter(Boolean).join(", ") : "");

const LEVELS = ["Intern", "Junior", "Mid", "Senior", "Lead", "Manager", "Director"];

/*
 fields: key, label, type (text|email|tel|textarea|number|select|multi), required, col (2 = full width), max, upper
         select options: options: [..] or from: "departments" | "branches" | "designations" | "employees" (+ by: "id" | "name")
         unique: true  -> an item already used by another row is disabled in the dropdown
         multi         -> several employees, shown with ReporteePicker
 cols:   main = avatar + title + sub | get = text | chip = coloured pill | count = number pill | status = Active/Inactive
*/
export const ORG = {
    branches: {
        path: "branches", singular: "Branch", title: "Branches", subtitle: "Company branches, their codes and contact details.", icon: Building2, add: "Add Branch",
        lookups: [],
        fields: [
            { key: "name", label: "Branch name", required: true, col: 2, max: 120, placeholder: "e.g. Jaipur Head Office" },
            { key: "code", label: "Branch code", upper: true, max: 12, placeholder: "e.g. JPR01" },
            { key: "phone", label: "Phone", type: "tel", placeholder: "+91 98765 43210" },
            { key: "city", label: "City" },
            { key: "state", label: "State" },
            { key: "email", label: "Email", type: "email", col: 2, placeholder: "branch@company.com" },
            { key: "address", label: "Address", type: "textarea", col: 2, max: 300 },
        ],
        name: (r) => r.name, sub: (r) => join(r.code, place(r)),
        cols: [{ h: "Branch", main: true }, { h: "Code", chip: "indigo", get: (r) => r.code }, { h: "Location", get: place }, { h: "Phone", get: (r) => r.phone }, { h: "Employees", count: (r) => r.employeeCount }, { h: "Status", status: true }],
        details: (r) => [["Code", r.code], ["City", r.city], ["State", r.state], ["Phone", r.phone], ["Email", r.email], ["Address", r.address], ["Employees", r.employeeCount]],
        stats: (rows) => [["Total branches", rows.length, Building2, "indigo"], ["Active", act(rows), ShieldCheck, "emerald"], ["States covered", uniq(rows, "state"), MapPin, "violet"]],
        filter: { key: "state", label: "All states" },
    },

    departments: {
        path: "departments", singular: "Department", title: "Departments", subtitle: "Business divisions, their heads and staff strength.", icon: Layers, add: "Add Department",
        lookups: ["branches", "employees"],
        fields: [
            { key: "name", label: "Department name", required: true, col: 2, max: 120, placeholder: "e.g. Engineering" },
            { key: "code", label: "Code", upper: true, max: 12, placeholder: "e.g. ENG" },
            { key: "branch", label: "Branch", type: "select", from: "branches", placeholder: "Select branch" },
            { key: "head", label: "Department Head", type: "select", from: "employees", by: "id", placeholder: "Select head", col: 2 },
            { key: "description", label: "Description", type: "textarea", col: 2, max: 500 },
        ],
        name: (r) => r.name, sub: (r) => join(r.code, r.branch),
        cols: [{ h: "Department", main: true }, { h: "Code", chip: "indigo", get: (r) => r.code }, { h: "Head", get: (r) => r.head?.name }, { h: "Branch", get: (r) => r.branch }, { h: "Employees", count: (r) => r.employeeCount }, { h: "Status", status: true }],
        details: (r) => [["Code", r.code], ["Branch", r.branch], ["Head", r.head ? `${r.head.name}${r.head.employeeId ? ` (${r.head.employeeId})` : ""}` : ""], ["Employees", r.employeeCount], ["Description", r.description]],
        stats: (rows) => [["Total departments", rows.length, Layers, "indigo"], ["Active", act(rows), ShieldCheck, "emerald"], ["Employees", sum(rows, "employeeCount"), Users, "violet"]],
        filter: { key: "branch", label: "All branches" },
    },

    designations: {
        path: "designations", singular: "Designation", title: "Designations", subtitle: "Job titles, their level and department.", icon: Briefcase, add: "Add Designation",
        lookups: ["departments"],
        fields: [
            { key: "title", label: "Designation title", required: true, col: 2, max: 120, placeholder: "e.g. Senior Software Engineer" },
            { key: "department", label: "Department", type: "select", from: "departments", empty: "Not set" },
            { key: "level", label: "Level", type: "select", options: LEVELS, empty: "Not set" },
            { key: "description", label: "Responsibilities", type: "textarea", col: 2, max: 500 },
        ],
        name: (r) => r.title, sub: (r) => join(r.department, r.level),
        cols: [{ h: "Designation", main: true }, { h: "Department", get: (r) => r.department }, { h: "Level", chip: "violet", get: (r) => r.level }, { h: "Employees", count: (r) => r.employeeCount }, { h: "Status", status: true }],
        details: (r) => [["Department", r.department], ["Level", r.level], ["Employees", r.employeeCount], ["Responsibilities", r.description]],
        stats: (rows) => [["Total designations", rows.length, Briefcase, "indigo"], ["Active", act(rows), ShieldCheck, "emerald"], ["Levels", uniq(rows, "level"), Award, "violet"]],
        filter: { key: "department", label: "All departments" },
    },

    locations: {
        path: "locations", singular: "Location", title: "Locations", subtitle: "Offices and work places with their codes and addresses.", icon: MapPin, add: "Add Location",
        lookups: [],
        fields: [
            { key: "name", label: "Location name", required: true, col: 2, max: 120, placeholder: "e.g. Office Floor 1" },
            { key: "code", label: "Location code", upper: true, max: 12, placeholder: "e.g. HO-F1" },
            { key: "city", label: "City" },
            { key: "state", label: "State" },
            { key: "country", label: "Country", default: "India" },
            { key: "pincode", label: "Pincode", max: 10, placeholder: "302001" },
            { key: "address", label: "Address", type: "textarea", col: 2, max: 300 },
        ],
        name: (r) => r.name, sub: (r) => join(r.code, place(r)),
        cols: [{ h: "Location", main: true }, { h: "Code", chip: "indigo", get: (r) => r.code }, { h: "Country", get: (r) => r.country }, { h: "Pincode", chip: "slate", get: (r) => r.pincode }, { h: "Employees", count: (r) => r.employeeCount }, { h: "Status", status: true }],
        details: (r) => [["Code", r.code], ["City", r.city], ["State", r.state], ["Country", r.country], ["Pincode", r.pincode], ["Address", r.address], ["Employees", r.employeeCount]],
        stats: (rows) => [["Total locations", rows.length, MapPin, "indigo"], ["Active", act(rows), ShieldCheck, "emerald"], ["Countries", uniq(rows, "country"), Globe2, "violet"]],
        filter: { key: "country", label: "All countries" },
    },

    teams: {
        path: "teams", singular: "Team", title: "Teams", subtitle: "Teams inside departments and who leads them.", icon: Users2, add: "Add Team",
        lookups: ["departments", "employees"],
        fields: [
            { key: "name", label: "Team name", required: true, col: 2, max: 120, placeholder: "e.g. Frontend Squad" },
            { key: "department", label: "Department", type: "select", from: "departments", empty: "Not set" },
            { key: "teamLead", label: "Team lead", type: "select", from: "employees", by: "name", empty: "Not assigned" },
            { key: "membersCount", label: "Members (used if no employee is linked)", type: "number", col: 2 },
            { key: "description", label: "Objective", type: "textarea", col: 2, max: 500 },
        ],
        name: (r) => r.name, sub: (r) => join(r.department, r.teamLead),
        cols: [{ h: "Team", main: true }, { h: "Department", get: (r) => r.department }, { h: "Team lead", get: (r) => r.teamLead }, { h: "Members", count: (r) => r.membersCount }, { h: "Status", status: true }],
        details: (r) => [["Department", r.department], ["Team lead", r.teamLead], ["Members", r.membersCount], ["Objective", r.description]],
        stats: (rows) => [["Total teams", rows.length, Users2, "indigo"], ["Active", act(rows), ShieldCheck, "emerald"], ["Members", sum(rows, "membersCount"), Users, "violet"]],
        filter: { key: "department", label: "All departments" },
    },

    "reporting-managers": {
        path: "reporting-managers", singular: "Reporting manager", title: "Reporting Managers", subtitle: "Managers and the employees assigned under each one.", icon: UserCog, add: "Add Manager",
        lookups: ["designations", "departments", "employees"],
        fields: [
            { key: "employee", label: "Linked employee (fills the name)", type: "select", from: "employees", by: "id", empty: "Not linked", col: 2, fillName: true, unique: true },
            { key: "name", label: "Manager name", required: true, col: 2, max: 120 },
            { key: "email", label: "Email", type: "email", col: 2, placeholder: "manager@company.com" },
            { key: "designation", label: "Designation", type: "select", from: "designations", empty: "Not set" },
            { key: "department", label: "Department", type: "select", from: "departments", empty: "Not set" },
            { key: "reportees", label: "Reportees (employees under this manager)", type: "multi", from: "employees", by: "id", col: 2 },
        ],
        name: (r) => r.name, sub: (r) => r.email || r.designation,
        cols: [{ h: "Manager", main: true }, { h: "Designation", get: (r) => r.designation }, { h: "Department", get: (r) => r.department }, { h: "Reportees", count: (r) => r.reporteesCount }, { h: "Status", status: true }],
        details: (r) => [["Email", r.email], ["Designation", r.designation], ["Department", r.department], ["Linked employee", r.employee?.name ? `${r.employee.name}${r.employee.employeeId ? ` (${r.employee.employeeId})` : ""}` : ""], ["Reportees", namesOf(r.reportees)], ["Reportees count", r.reporteesCount]],
        stats: (rows) => [["Total managers", rows.length, UserCog, "indigo"], ["Active", act(rows), ShieldCheck, "emerald"], ["Reportees", sum(rows, "reporteesCount"), Users, "violet"]],
        filter: { key: "department", label: "All departments" },
    },
};

import { PRESETS } from "./orgPresets";
Object.entries(PRESETS).forEach(([key, list]) => {
    if (!ORG[key]) return;
    ORG[key].presets = list;
    ORG[key].fields[0].suggest = true;
});

