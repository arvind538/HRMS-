"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
    Search,
    Mail,
    Phone,
    Building2,
    LayoutGrid,
    List,
    RefreshCw,
    Users,
    ExternalLink,
    ChevronDown,
    Check,
    X,
    Filter,
    Sparkles,
    Plus,
} from "lucide-react";
import api from "@/lib/api";

const getInitials = (name) => {
    if (!name) return "U";
    const parts = name.trim().split(" ").filter(Boolean);
    return parts.length > 1
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : parts[0].slice(0, 2).toUpperCase();
};

export default function EmployeeDirectoryPage() {
    const router = useRouter();
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [viewMode, setViewMode] = useState("grid");

    const [searchInput, setSearchInput] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedDept, setSelectedDept] = useState("all");
    const [selectedStatus, setSelectedStatus] = useState("all");

    const [deptOpen, setDeptOpen] = useState(false);
    const [statusOpen, setStatusOpen] = useState(false);

    const deptRef = useRef(null);
    const statusRef = useRef(null);

    // Debounce search input for smoother filtering
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearchTerm(searchInput);
        }, 200);
        return () => clearTimeout(timer);
    }, [searchInput]);

    // Close custom dropdowns on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (deptRef.current && !deptRef.current.contains(e.target)) {
                setDeptOpen(false);
            }
            if (statusRef.current && !statusRef.current.contains(e.target)) {
                setStatusOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fetchEmployees = useCallback(async (isManual = false) => {
        if (isManual) setRefreshing(true);
        else setLoading(true);

        try {
            const res = await api.get("/employees");
            const data = Array.isArray(res?.data)
                ? res.data
                : Array.isArray(res?.data?.employees)
                    ? res.data.employees
                    : [];
            setEmployees(data);
        } catch (err) {
            console.error("Employee directory fetch error:", err);
            setEmployees([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchEmployees();
    }, [fetchEmployees]);

    // Extract unique department names safely
    const departments = useMemo(() => {
        const depts = new Set();
        employees.forEach((emp) => {
            const name =
                typeof emp.department === "object"
                    ? emp.department?.name
                    : emp.department || emp.branch;
            if (name && typeof name === "string") depts.add(name.trim());
        });
        return Array.from(depts);
    }, [employees]);

    // Filter employees locally for instant response
    const filteredEmployees = useMemo(() => {
        const cleanQuery = searchTerm.trim().toLowerCase();
        const cleanDept = selectedDept.toLowerCase();
        const cleanStatus = selectedStatus.toLowerCase();

        return employees.filter((emp) => {
            const fullName = String(
                emp.name || `${emp.firstName || ""} ${emp.lastName || ""}`
            ).toLowerCase();
            const email = String(emp.email || "").toLowerCase();
            const designation = String(
                (typeof emp.designation === "object"
                    ? emp.designation?.name
                    : emp.designation) ||
                emp.role ||
                ""
            ).toLowerCase();

            const dept = String(
                (typeof emp.department === "object"
                    ? emp.department?.name
                    : emp.department) ||
                emp.branch ||
                ""
            ).toLowerCase();

            const status = String(emp.status || "active").toLowerCase();

            const matchesSearch =
                !cleanQuery ||
                fullName.includes(cleanQuery) ||
                email.includes(cleanQuery) ||
                designation.includes(cleanQuery);

            const matchesDept = cleanDept === "all" || dept === cleanDept;
            const matchesStatus = cleanStatus === "all" || status === cleanStatus;

            return matchesSearch && matchesDept && matchesStatus;
        });
    }, [employees, searchTerm, selectedDept, selectedStatus]);

    const statusOptions = [
        { value: "all", label: "All Statuses", dot: "bg-slate-400" },
        { value: "active", label: "Active", dot: "bg-emerald-500" },
        { value: "exit", label: "Exit", dot: "bg-rose-500" },
    ];

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-7 antialiased">
            {/* 1. Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs">
                <div>
                    <div className="flex items-center gap-2.5">
                        <h1 className="text-2xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                            Employee Directory
                        </h1>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/75">
                            <Sparkles size={12} /> {employees.length} Members
                        </span>
                    </div>
                    <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-1 max-w-2xl">
                        Manage staff profiles, contact information, departmental allocations, and role permissions.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
                    <button
                        type="button"
                        onClick={() => router.push("/employees/add")}
                        className="inline-flex items-center gap-2 px-4.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold shadow-sm shadow-indigo-600/20 transition-all active:scale-95 cursor-pointer"
                    >
                        <Plus size={15} />
                        <span>Add Employee</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => fetchEmployees(true)}
                        disabled={refreshing || loading}
                        className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-indigo-600 transition-all shadow-xs active:scale-95 disabled:opacity-50 cursor-pointer"
                        title="Refresh Directory"
                    >
                        <RefreshCw
                            size={15}
                            className={refreshing ? "animate-spin text-indigo-600" : ""}
                        />
                    </button>

                    <div className="flex items-center bg-slate-100/90 p-1 rounded-2xl border border-slate-200/70 shadow-inner">
                        <button
                            type="button"
                            onClick={() => setViewMode("grid")}
                            className={`p-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${viewMode === "grid"
                                ? "bg-white text-indigo-600 shadow-sm"
                                : "text-slate-500 hover:text-slate-900"
                                }`}
                            title="Grid Cards View"
                        >
                            <LayoutGrid size={16} />
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode("list")}
                            className={`p-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${viewMode === "list"
                                ? "bg-white text-indigo-600 shadow-sm"
                                : "text-slate-500 hover:text-slate-900"
                                }`}
                            title="Detailed Table View"
                        >
                            <List size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* 2. Real-time Search & Filter Toolbar */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="relative flex-1">
                    <Search
                        size={16}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                    <input
                        type="text"
                        placeholder="Search by name, designation, official email..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="w-full pl-10 pr-9 py-2.5 bg-slate-50/70 hover:bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 outline-none transition-all shadow-xs"
                    />
                    {searchInput && (
                        <button
                            type="button"
                            onClick={() => setSearchInput("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
                    {/* Department Dropdown Filter */}
                    <div className="relative flex-1 sm:w-52" ref={deptRef}>
                        <button
                            type="button"
                            onClick={() => {
                                setDeptOpen((prev) => !prev);
                                setStatusOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold rounded-2xl border transition-all duration-200 shadow-xs cursor-pointer ${deptOpen
                                ? "bg-white border-indigo-600 ring-4 ring-indigo-600/10 text-indigo-950"
                                : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                                }`}
                        >
                            <div className="flex items-center gap-2 truncate pr-2">
                                <Filter size={13} className="text-slate-400 shrink-0" />
                                <span className="truncate">
                                    {selectedDept === "all" ? "All Departments" : selectedDept}
                                </span>
                            </div>
                            <ChevronDown
                                size={14}
                                className={`text-slate-400 shrink-0 transition-transform duration-200 ${deptOpen ? "rotate-180 text-indigo-600" : ""
                                    }`}
                            />
                        </button>

                        <div
                            className={`absolute left-0 right-0 mt-2 z-50 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-2xl shadow-xl shadow-slate-900/10 py-1.5 max-h-64 overflow-y-auto transition-all duration-200 origin-top ${deptOpen
                                ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
                                : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
                                }`}
                        >
                            <div className="px-3.5 py-1.5 text-[10px] font-bold tracking-wider uppercase text-slate-400 border-b border-slate-100">
                                Department
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedDept("all");
                                    setDeptOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer ${selectedDept === "all"
                                    ? "text-indigo-600 bg-indigo-50/70 font-bold"
                                    : "text-slate-700 hover:bg-slate-50"
                                    }`}
                            >
                                <span>All Departments</span>
                                {selectedDept === "all" && <Check size={14} className="text-indigo-600" />}
                            </button>

                            {departments.map((dept) => (
                                <button
                                    key={dept}
                                    type="button"
                                    onClick={() => {
                                        setSelectedDept(dept);
                                        setDeptOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer ${selectedDept === dept
                                        ? "text-indigo-600 bg-indigo-50/70 font-bold"
                                        : "text-slate-700 hover:bg-slate-50"
                                        }`}
                                >
                                    <span className="truncate">{dept}</span>
                                    {selectedDept === dept && (
                                        <Check size={14} className="text-indigo-600 shrink-0 ml-2" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Status Dropdown Filter */}
                    <div className="relative flex-1 sm:w-44" ref={statusRef}>
                        <button
                            type="button"
                            onClick={() => {
                                setStatusOpen((prev) => !prev);
                                setDeptOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold rounded-2xl border transition-all duration-200 shadow-xs cursor-pointer ${statusOpen
                                ? "bg-white border-indigo-600 ring-4 ring-indigo-600/10 text-indigo-950"
                                : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                                }`}
                        >
                            <div className="flex items-center gap-2 truncate">
                                <span
                                    className={`w-2 h-2 rounded-full shrink-0 ${statusOptions.find((o) => o.value === selectedStatus)?.dot ||
                                        "bg-slate-400"
                                        }`}
                                />
                                <span className="truncate">
                                    {statusOptions.find((o) => o.value === selectedStatus)?.label ||
                                        "All Statuses"}
                                </span>
                            </div>
                            <ChevronDown
                                size={14}
                                className={`text-slate-400 shrink-0 transition-transform duration-200 ${statusOpen ? "rotate-180 text-indigo-600" : ""
                                    }`}
                            />
                        </button>

                        <div
                            className={`absolute left-0 right-0 mt-2 z-50 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-2xl shadow-xl shadow-slate-900/10 py-1.5 transition-all duration-200 origin-top ${statusOpen
                                ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
                                : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
                                }`}
                        >
                            <div className="px-3.5 py-1.5 text-[10px] font-bold tracking-wider uppercase text-slate-400 border-b border-slate-100">
                                Account Status
                            </div>

                            {statusOptions.map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => {
                                        setSelectedStatus(opt.value);
                                        setStatusOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer ${selectedStatus === opt.value
                                        ? "text-indigo-600 bg-indigo-50/70 font-bold"
                                        : "text-slate-700 hover:bg-slate-50"
                                        }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${opt.dot}`} />
                                        <span>{opt.label}</span>
                                    </div>
                                    {selectedStatus === opt.value && <Check size={14} className="text-indigo-600" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    <span className="text-xs font-bold text-slate-400 px-1 whitespace-nowrap hidden sm:inline">
                        <strong className="text-slate-700 font-mono">
                            {filteredEmployees.length}
                        </strong>{" "}
                        found
                    </span>
                </div>
            </div>

            {/* 3. Main Content Roster View */}
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-pulse">
                    {[...Array(8)].map((_, i) => (
                        <div
                            key={i}
                            className="bg-white rounded-3xl border border-slate-200/80 p-6 space-y-4 shadow-xs"
                        >
                            <div className="flex justify-between items-start">
                                <div className="w-12 h-12 bg-slate-100 rounded-2xl" />
                                <div className="w-16 h-5 bg-slate-100 rounded-full" />
                            </div>
                            <div className="space-y-2 pt-1">
                                <div className="h-4 bg-slate-100 rounded-md w-3/4" />
                                <div className="h-3 bg-slate-100 rounded-md w-1/2" />
                            </div>
                            <div className="h-9 bg-slate-50 rounded-xl" />
                            <div className="h-9 bg-slate-100 rounded-xl mt-4" />
                        </div>
                    ))}
                </div>
            ) : filteredEmployees.length === 0 ? (
                <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-16 text-center space-y-3 shadow-xs">
                    <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto border border-slate-200">
                        <Users size={26} className="stroke-[1.5]" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-base font-bold text-slate-900">
                            No matching employees located
                        </h3>
                        <p className="text-xs font-medium text-slate-500 max-w-sm mx-auto">
                            We could not find any employees matching your current filters. Try changing keywords or reset options.
                        </p>
                    </div>
                    {(searchTerm || selectedDept !== "all" || selectedStatus !== "all") && (
                        <button
                            type="button"
                            onClick={() => {
                                setSearchInput("");
                                setSearchTerm("");
                                setSelectedDept("all");
                                setSelectedStatus("all");
                            }}
                            className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                        >
                            Reset Filters
                        </button>
                    )}
                </div>
            ) : viewMode === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredEmployees.map((emp) => {
                        const empId = emp._id || emp.id;
                        const displayName =
                            emp.name ||
                            `${emp.firstName || ""} ${emp.lastName || ""}`.trim() ||
                            "Unnamed Staff";
                        const deptName =
                            (typeof emp.department === "object"
                                ? emp.department?.name
                                : emp.department) ||
                            emp.branch ||
                            "General";
                        const designation =
                            (typeof emp.designation === "object"
                                ? emp.designation?.name
                                : emp.designation) ||
                            emp.role ||
                            "Employee";
                        const isActive =
                            String(emp.status || "active").toLowerCase() === "active";

                        return (
                            <div
                                key={empId}
                                onClick={() => router.push("/employees/profile")}
                                className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs hover:shadow-xl hover:border-indigo-500/50 transition-all duration-300 flex flex-col justify-between group cursor-pointer hover:-translate-y-1"
                            >
                                <div>
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center font-black text-sm shadow-xs border border-indigo-200 group-hover:scale-110 transition-transform">
                                            {getInitials(displayName)}
                                        </div>
                                        <span
                                            className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full border capitalize ${isActive
                                                ? "bg-emerald-50 text-emerald-700 border-emerald-200/80 ring-1 ring-emerald-500/10"
                                                : "bg-slate-100 text-slate-600 border-slate-200"
                                                }`}
                                        >
                                            <span
                                                className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                                                    }`}
                                            />
                                            {emp.status || "active"}
                                        </span>
                                    </div>

                                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                                        {displayName}
                                    </h3>
                                    <p className="text-xs text-slate-400 font-semibold truncate mt-0.5">
                                        {designation}
                                    </p>

                                    <div className="flex items-center gap-2 text-xs text-slate-600 font-medium mt-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                        <Building2 size={13} className="text-slate-400 shrink-0" />
                                        <span className="truncate">{deptName}</span>
                                    </div>
                                </div>

                                <div className="mt-4 pt-3.5 border-t border-slate-100 space-y-1.5" onClick={(e) => e.stopPropagation()}>
                                    {emp.email && (
                                        <a
                                            href={`mailto:${emp.email}`}
                                            className="flex items-center gap-2 text-xs text-slate-500 hover:text-indigo-600 font-medium transition-colors truncate"
                                            title={emp.email}
                                        >
                                            <Mail size={12} className="text-slate-400 shrink-0" />
                                            <span className="truncate">{emp.email}</span>
                                        </a>
                                    )}

                                    {emp.phone && (
                                        <a
                                            href={`tel:${emp.phone}`}
                                            className="flex items-center gap-2 text-xs text-slate-500 hover:text-indigo-600 font-medium transition-colors truncate"
                                            title={emp.phone}
                                        >
                                            <Phone size={12} className="text-slate-400 shrink-0" />
                                            <span className="truncate">{emp.phone}</span>
                                        </a>
                                    )}

                                    <button
                                        type="button"
                                        onClick={() => router.push("/employees/profile")}
                                        className="w-full mt-2 py-2 text-xs font-bold text-indigo-700 bg-indigo-50/70 hover:bg-indigo-600 hover:text-white rounded-xl border border-indigo-200/60 transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer active:scale-98"
                                    >
                                        <span>Inspect Profile</span>
                                        <ExternalLink size={12} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                            <tr className="bg-slate-50/75 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                <th className="py-4 px-6">Personnel</th>
                                <th className="py-4 px-6">Department</th>
                                <th className="py-4 px-6">Contact Email</th>
                                <th className="py-4 px-6">Phone</th>
                                <th className="py-4 px-6">Status</th>
                                <th className="py-4 px-6 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                            {filteredEmployees.map((emp) => {
                                const empId = emp._id || emp.id;
                                const displayName =
                                    emp.name ||
                                    `${emp.firstName || ""} ${emp.lastName || ""}`.trim() ||
                                    "Unnamed Staff";
                                const deptName =
                                    (typeof emp.department === "object"
                                        ? emp.department?.name
                                        : emp.department) ||
                                    emp.branch ||
                                    "General";
                                const designation =
                                    (typeof emp.designation === "object"
                                        ? emp.designation?.name
                                        : emp.designation) ||
                                    emp.role ||
                                    "Employee";
                                const isActive =
                                    String(emp.status || "active").toLowerCase() === "active";

                                return (
                                    <tr
                                        key={empId}
                                        onClick={() => router.push("/employees/profile")}
                                        className="hover:bg-indigo-50/30 transition-colors group cursor-pointer"
                                    >
                                        <td className="py-3.5 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs border border-indigo-200 group-hover:scale-110 transition-transform">
                                                    {getInitials(displayName)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                                        {displayName}
                                                    </p>
                                                    <p className="text-[11px] font-normal text-slate-400">
                                                        {designation}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3.5 px-6 font-semibold text-slate-700">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                                                <Building2 size={12} className="text-slate-400" />
                                                <span>{deptName}</span>
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-6 text-slate-500 font-medium">
                                            {emp.email || "—"}
                                        </td>
                                        <td className="py-3.5 px-6 text-slate-500 font-medium font-mono">
                                            {emp.phone || "—"}
                                        </td>
                                        <td className="py-3.5 px-6">
                                            <span
                                                className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full border capitalize ${isActive
                                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200/80 ring-1 ring-emerald-500/10"
                                                    : "bg-slate-100 text-slate-600 border-slate-200"
                                                    }`}
                                            >
                                                <span
                                                    className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-slate-400"
                                                        }`}
                                                />
                                                {emp.status || "active"}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                type="button"
                                                onClick={() => router.push("/employees/profile")}
                                                className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl border border-indigo-100 transition-colors cursor-pointer"
                                            >
                                                <span>Profile</span>
                                                <ExternalLink size={12} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}