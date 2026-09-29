"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
    Plus,
    Search,
    Users,
    UserCheck,
    UserX,
    UserMinus,
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
import { toast } from "react-toastify";

const isHexObjectId = (str) =>
    typeof str === "string" && /^[0-9a-fA-F]{24}$/.test(str.trim());

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
    const [departmentsList, setDepartmentsList] = useState([]);
    const [designationsList, setDesignationsList] = useState([]);
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

    // 1. Master lookup: Departments aur Designations list fetch karein
    useEffect(() => {
        async function loadLookups() {
            try {
                const [deptRes, desigRes] = await Promise.allSettled([
                    api.get("/departments"),
                    api.get("/designations"),
                ]);

                if (deptRes.status === "fulfilled") {
                    const raw = deptRes.value?.data;
                    const list = Array.isArray(raw)
                        ? raw
                        : raw?.data || raw?.departments || [];
                    setDepartmentsList(list);
                }

                if (desigRes.status === "fulfilled") {
                    const raw = desigRes.value?.data;
                    const list = Array.isArray(raw)
                        ? raw
                        : raw?.data || raw?.designations || [];
                    setDesignationsList(list);
                }
            } catch (err) {
                console.error("Lookup dropdown error:", err);
            }
        }
        loadLookups();
    }, []);

    // 2. Employees list fetch karein
    const fetchEmployees = useCallback(async (searchTerm = "") => {
        setLoading(true);
        try {
            const { data } = await api.get("/employees", {
                params: { search: searchTerm },
            });
            const list = Array.isArray(data)
                ? data
                : data?.employees || data?.data || [];
            setEmployees(list);
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

    // Click outside listener for dropdowns
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

    // Status change handler (Fixed: Automatic active hone se bachane ke liye)
    const handleStatusChange = async (employeeId, newStatus, e) => {
        e.stopPropagation();
        setActiveRowStatusDropdown(null);

        const isExit = newStatus.toLowerCase() === "exit";
        const exitDateValue = isExit ? new Date().toISOString() : null;

        // Capitalize format for mongoose schema matching
        const formattedStatus = isExit
            ? "Exit"
            : newStatus.charAt(0).toUpperCase() + newStatus.slice(1).toLowerCase();

        // 1. Optimistic UI update
        setEmployees((prev) =>
            prev.map((emp) =>
                emp._id === employeeId
                    ? {
                        ...emp,
                        status: formattedStatus,
                        employeeStatus: formattedStatus,
                        isActive: !isExit && formattedStatus !== "Inactive",
                        isExited: isExit,
                        exitDate: exitDateValue || emp.exitDate,
                    }
                    : emp
            )
        );

        // 2. Multi-strategy API update
        const payload = {
            status: formattedStatus,
            employeeStatus: formattedStatus,
            isActive: !isExit && formattedStatus !== "Inactive",
            isExited: isExit,
            exitDate: exitDateValue,
            exitReason: isExit ? "Administrative separation update" : undefined,
        };

        try {
            if (isExit) {
                // Try exit route first, fallback to standard update if 404
                try {
                    await api.put(`/employees/${employeeId}/exit`, payload);
                } catch (exitErr) {
                    console.warn("Dedicated exit endpoint failed, using standard update:", exitErr);
                    await api.put(`/employees/${employeeId}`, payload);
                }
            } else {
                await api.put(`/employees/${employeeId}`, payload);
            }

            toast.success(`Employee marked as ${formattedStatus}`);
        } catch (err) {
            console.error("Status update error on server:", err.response?.data || err.message);
            toast.error("Failed to update status on server.");
            // Rollback to original server data only on failure
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
            toast.success("Employee record deleted permanently.");
        } catch (err) {
            console.error("Failed to delete employee:", err.response?.data || err.message);
            toast.error("Failed to delete employee record.");
            fetchEmployees(search);
        } finally {
            setDeletingId(null);
        }
    };

    // Helper: Hex ID ko readable Department Name me badle
    const resolveDepartmentName = (emp) => {
        if (!emp) return "General";
        const dept = emp.department;

        if (typeof dept === "object" && dept !== null) {
            return dept.name || dept.title || "General";
        }

        if (typeof dept === "string") {
            const val = dept.trim();
            if (/^[0-9a-fA-F]{24}$/.test(val)) {
                const matched = departmentsList.find(
                    (d) => String(d._id || d.id) === val
                );
                if (matched) return matched.name || matched.title;
            }
            return val || "General";
        }

        return emp.branch || "General";
    };

    // Helper: Hex ID ko readable Designation Title me badle
    const resolveDesignationName = (emp) => {
        if (!emp) return "Staff Member";
        const desig = emp.designation;

        if (typeof desig === "object" && desig !== null) {
            return desig.title || desig.name || "Staff Member";
        }

        if (typeof desig === "string") {
            const val = desig.trim();
            if (/^[0-9a-fA-F]{24}$/.test(val)) {
                const matched = designationsList.find(
                    (d) => String(d._id || d.id) === val
                );
                if (matched) return matched.title || matched.name;
            }
            return val || "Staff Member";
        }

        return emp.role || "Staff Member";
    };

    const departments = useMemo(() => {
        const set = new Set();
        employees.forEach((emp) => {
            const d = resolveDepartmentName(emp);
            if (d && d !== "General") set.add(d);
        });
        departmentsList.forEach((d) => {
            const name = d.name || d.title;
            if (name) set.add(name);
        });
        return Array.from(set);
    }, [employees, departmentsList]);

    // Robust status normalizer
    const getNormalizedStatus = (emp) => {
        const empStatus = String(emp.employeeStatus || "").toLowerCase();
        const status = String(emp.status || "").toLowerCase();

        if (
            empStatus === "exit" ||
            empStatus === "exited" ||
            status === "exit" ||
            status === "exited" ||
            emp.isExited === true
        ) {
            return "exit";
        }
        if (
            empStatus === "inactive" ||
            status === "inactive" ||
            emp.isActive === false
        ) {
            return "inactive";
        }
        return "active";
    };

    const filteredEmployees = useMemo(() => {
        return employees.filter((emp) => {
            const dept = resolveDepartmentName(emp);
            const matchesDept =
                departmentFilter === "all" ||
                dept.toLowerCase() === departmentFilter.toLowerCase();

            const normalizedStatus = getNormalizedStatus(emp);
            const matchesStatus =
                statusFilter === "all" || normalizedStatus === statusFilter.toLowerCase();

            return matchesDept && matchesStatus;
        });
    }, [employees, departmentFilter, statusFilter]);

    // Metric Counts
    const activeCount = useMemo(
        () => employees.filter((e) => getNormalizedStatus(e) === "active").length,
        [employees]
    );

    const inactiveCount = useMemo(
        () => employees.filter((e) => getNormalizedStatus(e) === "inactive").length,
        [employees]
    );

    const exitedCount = useMemo(
        () => employees.filter((e) => getNormalizedStatus(e) === "exit").length,
        [employees]
    );

    const handleExportCSV = () => {
        const headers =
            "Employee ID,Name,Email,Phone,Department,Designation,Status,Joining Date\n";
        const rows = filteredEmployees
            .map((e) => {
                const dName = resolveDepartmentName(e);
                const desig = resolveDesignationName(e);
                const joinDate = e.dateOfJoining ? e.dateOfJoining.split("T")[0] : "";
                const curStatus = getNormalizedStatus(e);
                return `"${e.employeeId || ""}","${e.name || ""}","${e.email || ""}","${e.phone || ""}","${dName}","${desig}","${curStatus}","${joinDate}"`;
            })
            .join("\n");

        const blob = new Blob([headers + rows], {
            type: "text/csv;charset=utf-8;",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `employee-roster-${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const statusOptions = [
        { value: "all", label: "All Statuses", color: "bg-slate-400" },
        { value: "active", label: "Active", color: "bg-emerald-500" },
        { value: "inactive", label: "Inactive", color: "bg-amber-500" },
        { value: "exit", label: "Exited", color: "bg-rose-500" },
    ];

    const rowStatusChoices = [
        {
            value: "active",
            label: "Active",
            color: "bg-emerald-500",
        },
        {
            value: "inactive",
            label: "Inactive",
            color: "bg-amber-500",
        },
        {
            value: "exit",
            label: "Exited",
            color: "bg-rose-500",
        },
    ];

    const getStatusTheme = (statusStr) => {
        const s = (statusStr || "active").toLowerCase();
        if (s === "inactive") {
            return {
                badge: "bg-amber-50 text-amber-700 border-amber-200/80 hover:bg-amber-100",
                dot: "bg-amber-500",
                label: "Inactive",
            };
        }
        if (s === "exit" || s === "exited") {
            return {
                badge: "bg-rose-50 text-rose-700 border-rose-200/80 hover:bg-rose-100",
                dot: "bg-rose-500",
                label: "Exited",
            };
        }
        return {
            badge: "bg-emerald-50 text-emerald-700 border-emerald-200/80 hover:bg-emerald-100",
            dot: "bg-emerald-500",
            label: "Active",
        };
    };

    return (
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3.5 sm:py-6 space-y-4 sm:space-y-6 font-sans antialiased text-slate-900">
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
                        className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl sm:rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80 text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer"
                    >
                        <Download size={14} className="text-slate-500 shrink-0" />
                        <span>Export CSV</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => router.push("/employees/add")}
                        className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl sm:rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold shadow-sm shadow-indigo-600/20 transition-all active:scale-95 cursor-pointer"
                    >
                        <Plus size={15} className="shrink-0" />
                        <span>Add Employee</span>
                    </button>
                </div>
            </div>

            {/* Metric Cards Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[10px] sm:text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                            Total Roster
                        </span>
                        <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono mt-0.5 tracking-tight">
                            {employees.length.toLocaleString()}
                        </h3>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                        <Users size={18} />
                    </div>
                </div>

                <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[10px] sm:text-[11px] font-extrabold text-emerald-600 uppercase tracking-wider">
                            Active
                        </span>
                        <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono mt-0.5 tracking-tight">
                            {activeCount.toLocaleString()}
                        </h3>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                        <UserCheck size={18} />
                    </div>
                </div>

                <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[10px] sm:text-[11px] font-extrabold text-amber-600 uppercase tracking-wider">
                            Inactive
                        </span>
                        <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono mt-0.5 tracking-tight">
                            {inactiveCount.toLocaleString()}
                        </h3>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                        <UserMinus size={18} />
                    </div>
                </div>

                <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[10px] sm:text-[11px] font-extrabold text-rose-600 uppercase tracking-wider">
                            Exited
                        </span>
                        <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono mt-0.5 tracking-tight">
                            {exitedCount.toLocaleString()}
                        </h3>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
                        <UserX size={18} />
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

            {/* Content Section */}
            {loading ? (
                <div className="py-20 flex flex-col items-center justify-center space-y-3 bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs">
                    <Loader2 className="animate-spin text-indigo-600" size={32} />
                    <p className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                        Fetching Employee Records...
                    </p>
                </div>
            ) : filteredEmployees.length === 0 ? (
                <div className="py-16 text-center px-4 space-y-2.5 bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs">
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
                <>
                    {/* Mobile & Tablet Card Layout */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 md:hidden">
                        {filteredEmployees.map((row) => {
                            const curStatus = getNormalizedStatus(row);
                            const theme = getStatusTheme(curStatus);
                            const deptName = resolveDepartmentName(row);
                            const desigName = resolveDesignationName(row);
                            const isDeleting = deletingId === row._id;
                            const empIdTag = row.employeeId || "EMP001";
                            const dateDisplay = row.dateOfJoining
                                ? new Date(row.dateOfJoining).toLocaleDateString("en-US")
                                : "N/A";

                            return (
                                <div
                                    key={row._id}
                                    onClick={() => router.push(`/employees/profile?id=${row._id}`)}
                                    className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-3 cursor-pointer hover:border-indigo-300 transition-all"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-3 min-w-0">
                                            {row.avatar || row.photo ? (
                                                <img
                                                    src={row.avatar || row.photo}
                                                    alt={row.name}
                                                    className="w-10 h-10 rounded-2xl object-cover border border-slate-200 shrink-0 shadow-2xs"
                                                />
                                            ) : (
                                                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                                                    {getInitials(row.name)}
                                                </div>
                                            )}
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <p className="font-bold text-slate-900 text-sm truncate leading-tight">
                                                        {row.name}
                                                    </p>
                                                    <span className="font-mono text-[9px] font-bold bg-slate-100 text-slate-600 px-1 py-0.2 rounded border border-slate-200">
                                                        {empIdTag}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                                    {row.email || "No email listed"}
                                                </p>
                                            </div>
                                        </div>

                                        <span
                                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border shrink-0 ${theme.badge}`}
                                        >
                                            <span className={`w-1.5 h-1.5 rounded-full ${theme.dot}`} />
                                            <span className="uppercase">{theme.label}</span>
                                        </span>
                                    </div>

                                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                                        <div className="flex items-center gap-1.5 truncate text-[11px]">
                                            <Building2 size={13} className="text-slate-400 shrink-0" />
                                            <span className="truncate font-semibold text-slate-700">
                                                {deptName}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1 font-mono text-[11px] text-slate-400 shrink-0">
                                            <Calendar size={12} className="text-slate-400" />
                                            <span>{dateDisplay}</span>
                                        </div>
                                    </div>

                                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                                        <div className="text-[11px] font-semibold text-indigo-600 truncate max-w-[150px]">
                                            {desigName}
                                        </div>

                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    router.push(`/employees/profile?id=${row._id}`);
                                                }}
                                                className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                                                title="View Profile"
                                            >
                                                <Eye size={15} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    router.push(`/employees/add?id=${row._id}`);
                                                }}
                                                className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                                                title="Edit Details"
                                            >
                                                <Edit3 size={15} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => handleDeleteEmployee(row._id, e)}
                                                disabled={isDeleting}
                                                className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                                title="Delete Record"
                                            >
                                                {isDeleting ? (
                                                    <Loader2 size={15} className="animate-spin text-rose-600" />
                                                ) : (
                                                    <Trash2 size={15} />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
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
                                        const curStatus = getNormalizedStatus(row);
                                        const theme = getStatusTheme(curStatus);
                                        const isRowDropdownOpen =
                                            activeRowStatusDropdown === row._id;
                                        const isActionDropdownOpen =
                                            activeRowActionDropdown === row._id;
                                        const isDeleting = deletingId === row._id;
                                        const deptName = resolveDepartmentName(row);
                                        const desigName = resolveDesignationName(row);
                                        const empIdTag = row.employeeId || "EMP001";

                                        return (
                                            <tr
                                                key={row._id}
                                                className="group hover:bg-slate-50/70 transition-colors"
                                            >
                                                {/* Employee Info + Avatar + ID */}
                                                <td className="py-3.5 sm:py-4 px-5 sm:px-6">
                                                    <div
                                                        onClick={() =>
                                                            router.push(`/employees/profile?id=${row._id}`)
                                                        }
                                                        className="flex items-center gap-3 cursor-pointer"
                                                    >
                                                        {row.avatar || row.photo ? (
                                                            <img
                                                                src={row.avatar || row.photo}
                                                                alt={row.name}
                                                                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl object-cover border border-slate-200 shrink-0 shadow-2xs group-hover:scale-105 transition-transform"
                                                            />
                                                        ) : (
                                                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-2xs border border-indigo-200/80 group-hover:scale-105 transition-transform">
                                                                {getInitials(row.name)}
                                                            </div>
                                                        )}
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate text-xs sm:text-sm">
                                                                    {row.name}
                                                                </p>
                                                                <span className="font-mono text-[9px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200/80">
                                                                    {empIdTag}
                                                                </span>
                                                            </div>
                                                            <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1 mt-0.5 truncate">
                                                                <Mail
                                                                    size={11}
                                                                    className="text-slate-400 shrink-0"
                                                                />
                                                                <span className="truncate">
                                                                    {row.email || "No email registered"}
                                                                </span>
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Resolved Department Name */}
                                                <td className="py-3.5 sm:py-4 px-4">
                                                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-xl shadow-2xs">
                                                        <Building2
                                                            size={12}
                                                            className="text-slate-400 shrink-0"
                                                        />
                                                        <span className="truncate max-w-[140px] font-bold">
                                                            {deptName}
                                                        </span>
                                                    </span>
                                                </td>

                                                {/* Resolved Designation Title */}
                                                <td className="py-3.5 sm:py-4 px-4">
                                                    <p className="text-xs font-bold text-slate-800 truncate max-w-[160px]">
                                                        {desigName}
                                                    </p>
                                                    <p className="text-[11px] text-slate-400 capitalize font-medium">
                                                        {row.employmentType || "Full-time"}
                                                    </p>
                                                </td>

                                                {/* Status Dropdown (Includes Inactive, Active, Exited) */}
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
                                                            className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border capitalize shadow-2xs cursor-pointer transition-all ${theme.badge}`}
                                                        >
                                                            <span
                                                                className={`w-1.5 h-1.5 rounded-full ${theme.dot}`}
                                                            />
                                                            <span>{theme.label}</span>
                                                            <ChevronDown
                                                                size={12}
                                                                className="ml-0.5 opacity-60"
                                                            />
                                                        </button>

                                                        {isRowDropdownOpen && (
                                                            <div className="absolute left-0 mt-1.5 w-32 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-50">
                                                                {rowStatusChoices.map((choice) => (
                                                                    <button
                                                                        key={choice.value}
                                                                        type="button"
                                                                        onClick={(e) =>
                                                                            handleStatusChange(
                                                                                row._id,
                                                                                choice.value,
                                                                                e
                                                                            )
                                                                        }
                                                                        className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-indigo-50/60 hover:text-indigo-600 transition-colors"
                                                                    >
                                                                        <div className="flex items-center gap-2">
                                                                            <span
                                                                                className={`w-1.5 h-1.5 rounded-full ${choice.color}`}
                                                                            />
                                                                            <span>{choice.label}</span>
                                                                        </div>
                                                                        {curStatus === choice.value && (
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
                                                    {curStatus === "exit" && row.exitDate && (
                                                        <div className="text-[10px] text-rose-500 font-semibold mt-0.5 flex items-center gap-1">
                                                            <Calendar size={10} /> Exit:{" "}
                                                            {String(row.exitDate).split("T")[0]}
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
                                                                        router.push(
                                                                            `/employees/add?id=${row._id}`
                                                                        );
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
                    </div>
                </>
            )}
        </div>
    );
}