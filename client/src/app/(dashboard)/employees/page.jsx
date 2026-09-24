"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
    Plus,
    Search,
    Users,
    UserCheck,
    UserX,
    Loader2,
    Filter,
    Download,
    Building2,
    Mail,
    Sparkles,
    X,
    ChevronDown,
    Check,
    Calendar,
    Edit3,
    Trash2,
    MoreVertical,
    Eye,
} from "lucide-react";
import api from "@/lib/api";

const getInitials = (name) => {
    if (!name) return "U";
    const parts = name.trim().split(" ").filter(Boolean);
    return parts.length > 1
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : parts[0].slice(0, 2).toUpperCase();
};

export default function EmployeesPage() {
    const router = useRouter();
    const [employees, setEmployees] = useState([]);
    const [search, setSearch] = useState("");
    const [departmentFilter, setDepartmentFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [loading, setLoading] = useState(true);

    const [deptOpen, setDeptOpen] = useState(false);
    const [statusOpen, setStatusOpen] = useState(false);

    const [activeRowStatusDropdown, setActiveRowStatusDropdown] = useState(null);
    const [activeRowActionDropdown, setActiveRowActionDropdown] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    const deptDropdownRef = useRef(null);
    const statusDropdownRef = useRef(null);

    const fetchEmployees = useCallback(async (searchTerm = "") => {
        setLoading(true);
        try {
            const { data } = await api.get("/employees", {
                params: { search: searchTerm },
            });
            setEmployees(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to load employee list:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchEmployees();
    }, [fetchEmployees]);

    useEffect(() => {
        const delay = setTimeout(() => fetchEmployees(search), 350);
        return () => clearTimeout(delay);
    }, [search, fetchEmployees]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (
                deptDropdownRef.current &&
                !deptDropdownRef.current.contains(e.target)
            ) {
                setDeptOpen(false);
            }
            if (
                statusDropdownRef.current &&
                !statusDropdownRef.current.contains(e.target)
            ) {
                setStatusOpen(false);
            }
            if (!e.target.closest(".row-status-dropdown-container")) {
                setActiveRowStatusDropdown(null);
            }
            if (!e.target.closest(".row-action-dropdown-container")) {
                setActiveRowActionDropdown(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleStatusChange = async (employeeId, newStatus, e) => {
        e.stopPropagation();
        setActiveRowStatusDropdown(null);

        try {
            const exitDateValue =
                newStatus === "exit" ? new Date().toISOString().split("T")[0] : null;

            setEmployees((prev) =>
                prev.map((emp) =>
                    emp._id === employeeId
                        ? {
                            ...emp,
                            status: newStatus,
                            exitDate: exitDateValue || emp.exitDate,
                        }
                        : emp
                )
            );

            if (newStatus === "exit") {
                await api.put(`/employees/${employeeId}/exit`, {
                    status: newStatus,
                    exitDate: exitDateValue,
                });
            } else {
                await api.put(`/employees/${employeeId}`, { status: newStatus });
            }
        } catch (err) {
            console.error(
                "Backend validation error:",
                err.response?.data || err.message
            );
            fetchEmployees(search);
        }
    };

    const handleDeleteEmployee = async (employeeId, e) => {
        e.stopPropagation();
        setActiveRowActionDropdown(null);

        if (
            !window.confirm(
                "Are you sure you want to permanently delete this employee record?"
            )
        ) {
            return;
        }

        setDeletingId(employeeId);
        try {
            setEmployees((prev) => prev.filter((emp) => emp._id !== employeeId));
            await api.delete(`/employees/${employeeId}`);
        } catch (err) {
            console.error(
                "Failed to delete employee:",
                err.response?.data || err.message
            );
            fetchEmployees(search);
        } finally {
            setDeletingId(null);
        }
    };

    const departments = useMemo(() => {
        const set = new Set();
        employees.forEach((emp) => {
            const d = emp.department?.name || emp.department || emp.branch;
            if (d) set.add(d);
        });
        return Array.from(set);
    }, [employees]);

    const filteredEmployees = useMemo(() => {
        return employees.filter((emp) => {
            const dept =
                emp.department?.name || emp.department || emp.branch || "";
            const matchesDept =
                departmentFilter === "all" ||
                dept.toLowerCase() === departmentFilter.toLowerCase();

            const empStatus = (emp.status || "active").toLowerCase();
            const matchesStatus =
                statusFilter === "all" ||
                empStatus === statusFilter.toLowerCase();

            return matchesDept && matchesStatus;
        });
    }, [employees, departmentFilter, statusFilter]);

    const activeCount = useMemo(
        () =>
            employees.filter(
                (e) => (e.status || "active").toLowerCase() === "active"
            ).length,
        [employees]
    );

    const exitedCount = useMemo(
        () =>
            employees.filter((e) => (e.status || "").toLowerCase() === "exit")
                .length,
        [employees]
    );

    const handleExportCSV = () => {
        const headers =
            "Employee ID,Name,Email,Department,Designation,Status,Exit Date\n";
        const rows = filteredEmployees
            .map(
                (e) =>
                    `"${e.employeeId || ""}","${e.name || ""}","${e.email || ""}","${e.department?.name || e.department || e.branch || ""
                    }","${e.designation || ""}","${e.status || "active"}","${e.exitDate || ""
                    }"`
            )
            .join("\n");

        const blob = new Blob([headers + rows], {
            type: "text/csv;charset=utf-8;",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `employee-directory-${new Date().toISOString().split("T")[0]
            }.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const statusOptions = [
        { value: "all", label: "All Statuses", color: "bg-slate-400" },
        { value: "active", label: "Active", color: "bg-emerald-500" },
        { value: "exit", label: "Exited", color: "bg-rose-500" },
    ];

    const rowStatusChoices = [
        { value: "active", label: "Active", color: "bg-emerald-500" },
        { value: "exit", label: "Exited", color: "bg-rose-500" },
    ];

    return (
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 font-sans antialiased text-slate-900">
            {/* Top Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-7 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs">
                <div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                            Staff Directory
                        </h1>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/75 shadow-2xs">
                            <Sparkles size={13} className="text-indigo-600 shrink-0" />
                            {employees.length} Records
                        </span>
                    </div>
                    <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1 max-w-2xl leading-relaxed">
                        Manage employee profiles, team assignments, department allocations, and account permissions in real time.
                    </p>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                    <button
                        type="button"
                        onClick={handleExportCSV}
                        className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl sm:rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80 text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer hover:border-slate-300"
                    >
                        <Download size={14} className="text-slate-500 shrink-0" />
                        <span>Export CSV</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => router.push("/employees/add")}
                        className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl sm:rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold shadow-sm shadow-indigo-600/20 transition-all active:scale-95 hover:shadow-md cursor-pointer"
                    >
                        <Plus size={15} className="shrink-0" />
                        <span>Add Employee</span>
                    </button>
                </div>
            </div>

            {/* Metric Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
                <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex items-center justify-between transition-all hover:shadow-md hover:border-indigo-200 group cursor-pointer">
                    <div>
                        <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider group-hover:text-indigo-600 transition-colors">
                            Total Roster
                        </span>
                        <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono mt-1 tracking-tight">
                            {employees.length.toLocaleString()}
                        </h3>
                        <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                            Registered workforce profiles
                        </p>
                    </div>
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100/80 shadow-2xs group-hover:scale-105 transition-transform">
                        <Users size={20} className="sm:w-[22px] sm:h-[22px]" />
                    </div>
                </div>

                <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex items-center justify-between transition-all hover:shadow-md hover:border-emerald-200 group cursor-pointer">
                    <div>
                        <span className="text-[11px] font-extrabold text-emerald-600 uppercase tracking-wider">
                            Active Employees
                        </span>
                        <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono mt-1 tracking-tight">
                            {activeCount.toLocaleString()}
                        </h3>
                        <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                            Currently on active duty
                        </p>
                    </div>
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100/80 shadow-2xs group-hover:scale-105 transition-transform">
                        <UserCheck size={20} className="sm:w-[22px] sm:h-[22px]" />
                    </div>
                </div>

                <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex items-center justify-between transition-all hover:shadow-md hover:border-rose-200 group cursor-pointer">
                    <div>
                        <span className="text-[11px] font-extrabold text-rose-600 uppercase tracking-wider">
                            Exited Staff
                        </span>
                        <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono mt-1 tracking-tight">
                            {exitedCount.toLocaleString()}
                        </h3>
                        <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                            Former employee records
                        </p>
                    </div>
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100/80 shadow-2xs group-hover:scale-105 transition-transform">
                        <UserX size={20} className="sm:w-[22px] sm:h-[22px]" />
                    </div>
                </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs p-3.5 sm:p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="relative flex-1">
                    <Search
                        size={16}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name, email, or employee ID..."
                        className="w-full pl-10 pr-9 py-2.5 sm:py-3 bg-slate-50/70 hover:bg-slate-50 border border-slate-200/80 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 outline-none transition-all shadow-2xs"
                    />
                    {search && (
                        <button
                            type="button"
                            onClick={() => setSearch("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 sm:gap-3">
                    {/* Department Filter */}
                    <div className="relative flex-1 sm:w-52" ref={deptDropdownRef}>
                        <button
                            type="button"
                            onClick={() => {
                                setDeptOpen((prev) => !prev);
                                setStatusOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs font-bold rounded-xl sm:rounded-2xl border transition-all shadow-2xs cursor-pointer ${deptOpen
                                ? "bg-white border-indigo-600 ring-4 ring-indigo-600/10 text-indigo-950 shadow-xs"
                                : "bg-white border-slate-200/80 text-slate-700 hover:border-slate-300"
                                }`}
                        >
                            <div className="flex items-center gap-2 truncate pr-2">
                                <Filter size={13} className="text-slate-400 shrink-0" />
                                <span className="truncate">
                                    {departmentFilter === "all"
                                        ? "All Departments"
                                        : departmentFilter}
                                </span>
                            </div>
                            <ChevronDown
                                size={14}
                                className={`text-slate-400 shrink-0 transition-transform duration-200 ${deptOpen ? "rotate-180 text-indigo-600" : ""
                                    }`}
                            />
                        </button>

                        <div
                            className={`absolute left-0 right-0 mt-2 z-50 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-2xl shadow-xl shadow-slate-900/10 py-1.5 max-h-60 overflow-y-auto transition-all duration-200 origin-top ${deptOpen
                                ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
                                : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
                                }`}
                        >
                            <button
                                type="button"
                                onClick={() => {
                                    setDepartmentFilter("all");
                                    setDeptOpen(false);
                                }}
                                className="w-full flex items-center justify-between px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-indigo-50/60 hover:text-indigo-600 cursor-pointer transition-colors"
                            >
                                <span>All Departments</span>
                                {departmentFilter === "all" && (
                                    <Check size={14} className="text-indigo-600" />
                                )}
                            </button>
                            {departments.map((dept) => (
                                <button
                                    key={dept}
                                    type="button"
                                    onClick={() => {
                                        setDepartmentFilter(dept);
                                        setDeptOpen(false);
                                    }}
                                    className="w-full flex items-center justify-between px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-indigo-50/60 hover:text-indigo-600 cursor-pointer transition-colors"
                                >
                                    <span className="truncate">{dept}</span>
                                    {departmentFilter === dept && (
                                        <Check size={14} className="text-indigo-600" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Status Filter */}
                    <div className="relative flex-1 sm:w-44" ref={statusDropdownRef}>
                        <button
                            type="button"
                            onClick={() => {
                                setStatusOpen((prev) => !prev);
                                setDeptOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs font-bold rounded-xl sm:rounded-2xl border transition-all shadow-2xs cursor-pointer ${statusOpen
                                ? "bg-white border-indigo-600 ring-4 ring-indigo-600/10 text-indigo-950 shadow-xs"
                                : "bg-white border-slate-200/80 text-slate-700 hover:border-slate-300"
                                }`}
                        >
                            <div className="flex items-center gap-2 truncate">
                                <span
                                    className={`w-2 h-2 rounded-full shrink-0 ${statusOptions.find((o) => o.value === statusFilter)?.color ||
                                        "bg-slate-400"
                                        }`}
                                />
                                <span className="truncate">
                                    {statusOptions.find((o) => o.value === statusFilter)?.label ||
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
                            {statusOptions.map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => {
                                        setStatusFilter(opt.value);
                                        setStatusOpen(false);
                                    }}
                                    className="w-full flex items-center justify-between px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-indigo-50/60 hover:text-indigo-600 cursor-pointer transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${opt.color}`} />
                                        <span>{opt.label}</span>
                                    </div>
                                    {statusFilter === opt.value && (
                                        <Check size={14} className="text-indigo-600" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Directory Table */}
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
                {loading ? (
                    <div className="py-20 flex flex-col items-center justify-center space-y-3">
                        <Loader2 className="animate-spin text-indigo-600" size={32} />
                        <p className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                            Fetching Employee Records...
                        </p>
                    </div>
                ) : filteredEmployees.length === 0 ? (
                    <div className="py-16 text-center px-4 space-y-2.5">
                        <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto border border-slate-200 shadow-2xs">
                            <UserX size={24} />
                        </div>
                        <p className="text-sm sm:text-base font-bold text-slate-900">
                            No matching employee profiles found
                        </p>
                        <p className="text-xs text-slate-400 font-medium">
                            Try adjusting your search criteria or resetting filters.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[700px]">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                                    <th className="py-3.5 px-5 sm:px-6">Employee</th>
                                    <th className="py-3.5 px-4">Department</th>
                                    <th className="py-3.5 px-4">Designation</th>
                                    <th className="py-3.5 px-4">Status</th>
                                    <th className="py-3.5 px-5 sm:px-6 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {filteredEmployees.map((row) => {
                                    const currentStatus = (row.status || "active").toLowerCase();
                                    const isRowDropdownOpen =
                                        activeRowStatusDropdown === row._id;
                                    const isActionDropdownOpen =
                                        activeRowActionDropdown === row._id;
                                    const isDeleting = deletingId === row._id;

                                    return (
                                        <tr
                                            key={row._id}
                                            className="group hover:bg-slate-50/70 transition-colors"
                                        >
                                            {/* Employee Info */}
                                            <td className="py-3.5 sm:py-4 px-5 sm:px-6">
                                                <div
                                                    onClick={() =>
                                                        router.push(`/employees/profile?id=${row._id}`)
                                                    }
                                                    className="flex items-center gap-3 cursor-pointer"
                                                >
                                                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-2xs border border-indigo-200/80 group-hover:scale-105 transition-transform">
                                                        {getInitials(row.name)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate text-xs sm:text-sm">
                                                            {row.name}
                                                        </p>
                                                        <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1 mt-0.5 truncate">
                                                            <Mail size={11} className="text-slate-400 shrink-0" />
                                                            <span className="truncate">
                                                                {row.email || "No email registered"}
                                                            </span>
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Department */}
                                            <td className="py-3.5 sm:py-4 px-4">
                                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-xl shadow-2xs">
                                                    <Building2
                                                        size={12}
                                                        className="text-slate-400 shrink-0"
                                                    />
                                                    <span className="truncate max-w-[120px]">
                                                        {row.department?.name ||
                                                            row.department ||
                                                            "General"}
                                                    </span>
                                                </span>
                                            </td>

                                            {/* Designation */}
                                            <td className="py-3.5 sm:py-4 px-4">
                                                <p className="text-xs font-bold text-slate-800 truncate max-w-[130px]">
                                                    {row.designation || "Staff Member"}
                                                </p>
                                                <p className="text-[11px] text-slate-400 capitalize font-medium">
                                                    {row.role || "Employee"}
                                                </p>
                                            </td>

                                            {/* Status */}
                                            <td className="py-3.5 sm:py-4 px-4 relative">
                                                <div className="relative row-status-dropdown-container inline-block">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActiveRowStatusDropdown(
                                                                isRowDropdownOpen ? null : row._id
                                                            );
                                                            setActiveRowActionDropdown(null);
                                                        }}
                                                        className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border capitalize shadow-2xs cursor-pointer transition-all ${currentStatus === "active"
                                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200/80 hover:bg-emerald-100"
                                                            : "bg-rose-50 text-rose-700 border-rose-200/80 hover:bg-rose-100"
                                                            }`}
                                                    >
                                                        <span
                                                            className={`w-1.5 h-1.5 rounded-full ${currentStatus === "active"
                                                                ? "bg-emerald-500"
                                                                : "bg-rose-500"
                                                                }`}
                                                        />
                                                        <span>{currentStatus === "exit" ? "Exited" : currentStatus}</span>
                                                        <ChevronDown size={12} className="ml-0.5 opacity-60" />
                                                    </button>

                                                    {isRowDropdownOpen && (
                                                        <div className="absolute left-0 mt-1.5 w-32 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-50">
                                                            {rowStatusChoices.map((choice) => (
                                                                <button
                                                                    key={choice.value}
                                                                    type="button"
                                                                    onClick={(e) =>
                                                                        handleStatusChange(row._id, choice.value, e)
                                                                    }
                                                                    className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-indigo-50/60 hover:text-indigo-600 transition-colors"
                                                                >
                                                                    <div className="flex items-center gap-2">
                                                                        <span
                                                                            className={`w-1.5 h-1.5 rounded-full ${choice.color}`}
                                                                        />
                                                                        <span>{choice.label}</span>
                                                                    </div>
                                                                    {currentStatus === choice.value && (
                                                                        <Check
                                                                            size={12}
                                                                            className="text-indigo-600"
                                                                        />
                                                                    )}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                {currentStatus === "exit" && row.exitDate && (
                                                    <div className="text-[10px] text-rose-500 font-semibold mt-0.5 flex items-center gap-1">
                                                        <Calendar size={10} /> Exit: {row.exitDate}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Action Menu */}
                                            <td className="py-3.5 sm:py-4 px-5 sm:px-6 text-right relative">
                                                <div className="relative row-action-dropdown-container inline-block">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActiveRowActionDropdown(
                                                                isActionDropdownOpen ? null : row._id
                                                            );
                                                            setActiveRowStatusDropdown(null);
                                                        }}
                                                        disabled={isDeleting}
                                                        className="inline-flex p-1.5 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-all cursor-pointer"
                                                        title="More options"
                                                    >
                                                        {isDeleting ? (
                                                            <Loader2
                                                                size={15}
                                                                className="animate-spin text-rose-600"
                                                            />
                                                        ) : (
                                                            <MoreVertical size={15} />
                                                        )}
                                                    </button>

                                                    {isActionDropdownOpen && (
                                                        <div className="absolute right-0 mt-1.5 w-36 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-50 text-left">
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    router.push(
                                                                        `/employees/profile?id=${row._id}`
                                                                    );
                                                                }}
                                                                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors cursor-pointer"
                                                            >
                                                                <Eye size={13} className="text-slate-400" />
                                                                <span>View Profile</span>
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    router.push(`/employees/add?id=${row._id}`);
                                                                }}
                                                                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors cursor-pointer"
                                                            >
                                                                <Edit3 size={13} className="text-slate-400" />
                                                                <span>Edit Details</span>
                                                            </button>

                                                            <div className="my-1 border-t border-slate-100" />

                                                            <button
                                                                type="button"
                                                                onClick={(e) =>
                                                                    handleDeleteEmployee(row._id, e)
                                                                }
                                                                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                                            >
                                                                <Trash2 size={13} />
                                                                <span>Delete Record</span>
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}