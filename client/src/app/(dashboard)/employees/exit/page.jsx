"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
    UserX,
    Calendar,
    Building2,
    Loader2,
    RefreshCw,
    Mail,
    Trash2,
    X,
    Phone,
    AlertCircle,
    Eye,
    ChevronRight,
    Search,
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

export default function ExitEmployeesPage() {
    const router = useRouter();
    const [exitedStaff, setExitedStaff] = useState([]);
    const [departmentsMap, setDepartmentsMap] = useState({});
    const [designationsMap, setDesignationsMap] = useState({});
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [selectedStaff, setSelectedStaff] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");

    const fetchLookupData = async () => {
        try {
            const [deptRes, desigRes] = await Promise.allSettled([
                api.get("/departments"),
                api.get("/designations"),
            ]);

            if (deptRes.status === "fulfilled") {
                const dData = Array.isArray(deptRes.value?.data)
                    ? deptRes.value.data
                    : deptRes.value?.data?.departments || deptRes.value?.data?.data || [];
                const dMap = {};
                dData.forEach((item) => {
                    const id = String(item._id || item.id || "");
                    if (id) dMap[id] = item.name || item.title || item.departmentName;
                });
                setDepartmentsMap(dMap);
            }

            if (desigRes.status === "fulfilled") {
                const desData = Array.isArray(desigRes.value?.data)
                    ? desigRes.value.data
                    : desigRes.value?.data?.designations || desigRes.value?.data?.data || [];
                const desMap = {};
                desData.forEach((item) => {
                    const id = String(item._id || item.id || "");
                    if (id) desMap[id] = item.name || item.title || item.designationName;
                });
                setDesignationsMap(desMap);
            }
        } catch {
            // Lookup error handled safely
        }
    };

    const fetchExited = async (isManual = false) => {
        if (isManual) setRefreshing(true);
        else setLoading(true);

        try {
            await fetchLookupData();

            // Core endpoint fetch (Avoid /employees/exit to prevent CastError)
            const res = await api.get("/employees");
            const dataList = Array.isArray(res?.data)
                ? res.data
                : res?.data?.employees || res?.data?.data || [];

            // Local storage avatars cache merge
            let storedAvatars = {};
            try {
                storedAvatars = JSON.parse(
                    localStorage.getItem("4ps_emp_avatars") || "{}"
                );
            } catch { }

            const prepared = dataList.map((emp) => {
                const id = String(emp._id || emp.id || "");
                if (storedAvatars[id] && !emp.avatar) {
                    return { ...emp, avatar: storedAvatars[id] };
                }
                return emp;
            });

            // KEY FIX: Har tarah ke exit fields ko check karein (employeeStatus, status, isExited, exitDate)
            const exitKeywords = [
                "exit",
                "exited",
                "resigned",
                "resignation",
                "terminated",
                "termination",
                "inactive",
                "left",
                "separated",
                "relieved",
            ];

            const filtered = prepared.filter((e) => {
                const empStatus = String(e.employeeStatus || "").toLowerCase().trim();
                const status = String(e.status || "").toLowerCase().trim();
                const resStatus = String(e.resignationStatus || "").toLowerCase().trim();

                const isMarkedExit =
                    exitKeywords.some((k) => empStatus.includes(k)) ||
                    exitKeywords.some((k) => status.includes(k)) ||
                    exitKeywords.some((k) => resStatus.includes(k));

                const hasExitFlags =
                    e.isExited === true ||
                    e.isActive === false ||
                    Boolean(e.exitDate && !["active", "probation"].includes(status));

                return isMarkedExit || hasExitFlags;
            });

            setExitedStaff(filtered);
        } catch (err) {
            console.error("Failed to load exit employee list:", err);
            toast.error("Unable to load departed employee records");
            setExitedStaff([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchExited();
    }, []);

    const getEmpName = (emp) =>
        emp?.name ||
        `${emp?.firstName || ""} ${emp?.lastName || ""}`.trim() ||
        "Unnamed Staff";

    const getDepartment = (emp) => {
        if (!emp) return "General";
        const depVal = emp.department;

        if (typeof depVal === "object" && depVal !== null) {
            return depVal.name || depVal.title || depVal.departmentName || "General";
        }

        if (typeof depVal === "string") {
            const trimmed = depVal.trim();
            if (departmentsMap[trimmed]) return departmentsMap[trimmed];
            if (isHexObjectId(trimmed)) return "Operations";
            return trimmed || "General";
        }

        return "General";
    };

    const getDesignation = (emp) => {
        if (!emp) return "Staff Member";
        const desVal = emp.designation;

        if (typeof desVal === "object" && desVal !== null) {
            return desVal.name || desVal.title || desVal.designationName || "Staff Member";
        }

        if (typeof desVal === "string") {
            const trimmed = desVal.trim();
            if (designationsMap[trimmed]) return designationsMap[trimmed];
            if (isHexObjectId(trimmed)) return emp.role || "Executive";
            return trimmed || emp.role || "Staff Member";
        }

        return emp.role || "Staff Member";
    };

    const getCleanEmpId = (emp, index) => {
        const rawId = emp.employeeId || emp.empId || emp.code;
        if (rawId && !isHexObjectId(String(rawId))) {
            return String(rawId).toUpperCase();
        }
        const suffix = emp._id
            ? String(emp._id).slice(-4).toUpperCase()
            : `${index + 1}`.padStart(4, "0");
        return `EMP${suffix}`;
    };

    const handleDeleteEmployee = async (empId, e) => {
        e.stopPropagation();
        if (!window.confirm("Are you sure you want to permanently delete this alumni record?")) {
            return;
        }

        setDeletingId(empId);
        try {
            setExitedStaff((prev) =>
                prev.filter((emp) => String(emp._id || emp.id) !== String(empId))
            );
            await api.delete(`/employees/${empId}`);
            toast.success("Employee record deleted permanently.");
            if (selectedStaff && String(selectedStaff._id || selectedStaff.id) === String(empId)) {
                setSelectedStaff(null);
            }
        } catch (err) {
            console.error("Failed to delete employee:", err.response?.data || err.message);
            toast.error("Failed to delete record from server.");
            fetchExited();
        } finally {
            setDeletingId(null);
        }
    };

    const filteredStaff = useMemo(() => {
        if (!searchQuery.trim()) return exitedStaff;
        const q = searchQuery.toLowerCase().trim();

        return exitedStaff.filter((emp, index) => {
            const name = getEmpName(emp).toLowerCase();
            const email = String(emp.email || "").toLowerCase();
            const dept = getDepartment(emp).toLowerCase();
            const designation = getDesignation(emp).toLowerCase();
            const code = getCleanEmpId(emp, index).toLowerCase();

            return (
                name.includes(q) ||
                email.includes(q) ||
                dept.includes(q) ||
                designation.includes(q) ||
                code.includes(q)
            );
        });
    }, [exitedStaff, searchQuery, departmentsMap, designationsMap]);

    if (loading) {
        return (
            <div className="w-full min-h-[500px] flex flex-col items-center justify-center gap-2 text-slate-400">
                <Loader2 size={32} className="animate-spin text-rose-600" />
                <p className="text-xs font-semibold tracking-wide text-slate-600">
                    Loading separated employee ledger...
                </p>
            </div>
        );
    }

    return (
        <div className="w-full space-y-4 sm:space-y-6 pb-12 font-sans antialiased text-slate-900">
            {/* Top Header Card */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs">
                <div>
                    <div className="flex items-center gap-3">
                        <span className="p-2.5 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 shadow-2xs shrink-0">
                            <UserX size={22} />
                        </span>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                                    Departed Staff & Alumni
                                </h1>
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                    {exitedStaff.length} Records
                                </span>
                            </div>
                            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                                Archived records of separated team members, completed contracts, and resignations.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-72">
                        <Search
                            size={15}
                            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                        />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search alumni by name, ID, or dept..."
                            className="w-full pl-9 pr-9 py-2.5 bg-slate-50 hover:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-400 transition-all shadow-2xs"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    <button
                        onClick={() => fetchExited(true)}
                        disabled={refreshing}
                        aria-label="Refresh list"
                        className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-600 hover:text-rose-600 active:scale-95 transition-all disabled:opacity-50 shadow-2xs cursor-pointer shrink-0"
                        title="Refresh Directory"
                    >
                        <RefreshCw
                            size={16}
                            className={refreshing ? "animate-spin text-rose-600" : ""}
                        />
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            {filteredStaff.length === 0 ? (
                <div className="bg-white p-12 sm:p-16 text-center rounded-2xl border border-slate-200 shadow-xs text-slate-400 space-y-2.5">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto text-slate-400 shadow-2xs">
                        <UserX size={22} />
                    </div>
                    <p className="text-sm font-bold text-slate-800">No separated employee records found</p>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        {searchQuery
                            ? `No alumni match "${searchQuery}". Check your search filter.`
                            : "Employees marked as exited, resigned, or inactive will be listed here automatically."}
                    </p>
                </div>
            ) : (
                <>
                    {/* Mobile & Tablet Card Layout */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 md:hidden">
                        {filteredStaff.map((emp, index) => {
                            const empId = emp._id || emp.id;
                            const empName = getEmpName(emp);
                            const dept = getDepartment(emp);
                            const designation = getDesignation(emp);
                            const token = getCleanEmpId(emp, index);
                            const status = emp.employeeStatus || emp.status || "Exited";
                            const isDeleting = deletingId === empId;
                            const avatarSrc = emp.avatar || emp.photo;
                            const formattedDate = emp.exitDate
                                ? new Date(emp.exitDate).toLocaleDateString()
                                : emp.updatedAt
                                    ? new Date(emp.updatedAt).toLocaleDateString()
                                    : "—";

                            return (
                                <div
                                    key={empId}
                                    onClick={() => setSelectedStaff(emp)}
                                    className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 hover:border-rose-300 hover:shadow-md shadow-xs space-y-3 cursor-pointer transition-all"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-11 h-11 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                                                {avatarSrc ? (
                                                    <img
                                                        src={avatarSrc}
                                                        alt={empName}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <span className="font-extrabold text-rose-600 text-xs">
                                                        {getInitials(empName)}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-bold text-slate-900 text-sm truncate">{empName}</p>
                                                <p className="text-[11px] text-slate-400 font-mono">
                                                    {token} • {designation}
                                                </p>
                                            </div>
                                        </div>
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 uppercase shrink-0">
                                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                            {status}
                                        </span>
                                    </div>

                                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                                        <div className="flex items-center gap-1.5 truncate">
                                            <Building2 size={13} className="text-slate-400 shrink-0" />
                                            <span className="truncate">{dept}</span>
                                        </div>
                                        <div className="flex items-center gap-1 font-mono text-[11px] text-slate-500 shrink-0">
                                            <Calendar size={12} className="text-slate-400" />
                                            <span>{formattedDate}</span>
                                        </div>
                                    </div>

                                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedStaff(emp);
                                            }}
                                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 text-xs font-semibold transition-colors"
                                        >
                                            <Eye size={13} />
                                            <span>Details</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => handleDeleteEmployee(empId, e)}
                                            disabled={isDeleting}
                                            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                                            title="Permanently Delete Record"
                                        >
                                            {isDeleting ? (
                                                <Loader2 size={15} className="animate-spin text-rose-600" />
                                            ) : (
                                                <Trash2 size={15} />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[850px]">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                        <th className="py-4 px-6 min-w-[260px]">Employee</th>
                                        <th className="py-4 px-5 w-36">Employee ID</th>
                                        <th className="py-4 px-5 min-w-[180px]">Department</th>
                                        <th className="py-4 px-5 min-w-[140px]">Exit Date</th>
                                        <th className="py-4 px-5 min-w-[130px]">Status</th>
                                        <th className="py-4 px-6 text-right w-40">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-xs sm:text-sm font-medium text-slate-700">
                                    {filteredStaff.map((emp, index) => {
                                        const empId = emp._id || emp.id;
                                        const empName = getEmpName(emp);
                                        const dept = getDepartment(emp);
                                        const designation = getDesignation(emp);
                                        const token = getCleanEmpId(emp, index);
                                        const status = emp.employeeStatus || emp.status || "Exited";
                                        const isDeleting = deletingId === empId;
                                        const avatarSrc = emp.avatar || emp.photo;

                                        return (
                                            <tr
                                                key={empId}
                                                onClick={() => setSelectedStaff(emp)}
                                                className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                                            >
                                                {/* Employee with Real Avatar */}
                                                <td className="py-3.5 px-6 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs group-hover:border-rose-300 transition-colors">
                                                            {avatarSrc ? (
                                                                <img
                                                                    src={avatarSrc}
                                                                    alt={empName}
                                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                                                />
                                                            ) : (
                                                                <span className="font-extrabold text-rose-600 text-xs">
                                                                    {getInitials(empName)}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-bold text-slate-900 group-hover:text-rose-600 transition-colors truncate">
                                                                {empName}
                                                            </p>
                                                            <p className="text-[11px] text-slate-400 flex items-center gap-1 font-mono truncate">
                                                                <Mail size={11} className="text-slate-400 shrink-0" />
                                                                {emp.email || "No email"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Clean Employee ID */}
                                                <td className="py-3.5 px-5">
                                                    <span className="inline-block px-2.5 py-1 bg-slate-100 text-slate-700 font-mono font-bold text-xs rounded-lg border border-slate-200">
                                                        {token}
                                                    </span>
                                                </td>

                                                {/* Department Name */}
                                                <td className="py-3.5 px-5 whitespace-nowrap">
                                                    <div>
                                                        <span className="inline-flex items-center gap-1.5 text-slate-800 font-semibold">
                                                            <Building2 size={13} className="text-slate-400" />
                                                            {dept}
                                                        </span>
                                                        <span className="text-[11px] text-slate-400 block font-normal">
                                                            {designation}
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Separation Date */}
                                                <td className="py-3.5 px-5 text-slate-500 whitespace-nowrap">
                                                    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold text-slate-600">
                                                        <Calendar size={13} className="text-slate-400" />
                                                        {emp.exitDate
                                                            ? new Date(emp.exitDate).toLocaleDateString()
                                                            : emp.updatedAt
                                                                ? new Date(emp.updatedAt).toLocaleDateString()
                                                                : "—"}
                                                    </span>
                                                </td>

                                                {/* Status Badge */}
                                                <td className="py-3.5 px-5 whitespace-nowrap">
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 uppercase tracking-wide">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                                        {status}
                                                    </span>
                                                </td>

                                                {/* Action buttons */}
                                                <td className="py-3.5 px-6 text-right whitespace-nowrap">
                                                    <div className="inline-flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedStaff(emp);
                                                            }}
                                                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 group-hover:border-rose-300 group-hover:text-rose-600 text-xs font-semibold shadow-2xs hover:bg-rose-50 transition cursor-pointer"
                                                        >
                                                            <Eye size={13} />
                                                            <span>Details</span>
                                                            <ChevronRight size={12} />
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={(e) => handleDeleteEmployee(empId, e)}
                                                            disabled={isDeleting}
                                                            title="Permanently Delete Record"
                                                            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 active:scale-95 transition shadow-2xs cursor-pointer disabled:opacity-50"
                                                        >
                                                            {isDeleting ? (
                                                                <Loader2 size={15} className="animate-spin text-rose-600" />
                                                            ) : (
                                                                <Trash2 size={15} />
                                                            )}
                                                        </button>
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

            {/* Details Inspection Modal */}
            {selectedStaff && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-6 bg-slate-900/50 backdrop-blur-xs transition-all duration-200"
                    onClick={() => setSelectedStaff(null)}
                >
                    <div
                        className="w-full max-w-2xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-5 sm:px-6 py-4 sm:py-5 border-b border-slate-100 bg-slate-50/50">
                            <div className="flex items-center gap-3.5">
                                <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                                    {selectedStaff.avatar || selectedStaff.photo ? (
                                        <img
                                            src={selectedStaff.avatar || selectedStaff.photo}
                                            alt={getEmpName(selectedStaff)}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <span className="font-extrabold text-rose-600 text-sm">
                                            {getInitials(getEmpName(selectedStaff))}
                                        </span>
                                    )}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-base font-bold text-slate-900">
                                            {getEmpName(selectedStaff)}
                                        </h3>
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 uppercase font-mono">
                                            {selectedStaff.employeeStatus || selectedStaff.status || "EXITED"}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                                        ID: {getCleanEmpId(selectedStaff, 0)}
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => setSelectedStaff(null)}
                                className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
                                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                                        Work Email Address
                                    </span>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Mail size={15} className="text-rose-500 shrink-0" />
                                        <p className="text-xs font-bold text-slate-800 font-mono truncate">
                                            {selectedStaff.email || "No email on record"}
                                        </p>
                                    </div>
                                </div>

                                <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
                                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                                        Phone Contact
                                    </span>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Phone size={15} className="text-sky-500 shrink-0" />
                                        <p className="text-xs font-bold text-slate-800 font-mono">
                                            {selectedStaff.phone || selectedStaff.phoneNumber || "Not Configured"}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-3">
                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                                    Separation & Corporate Overview
                                </span>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div>
                                        <span className="text-[10px] text-slate-400 block">Designation</span>
                                        <p className="text-xs font-bold text-slate-900 mt-0.5">
                                            {getDesignation(selectedStaff)}
                                        </p>
                                    </div>

                                    <div>
                                        <span className="text-[10px] text-slate-400 block">Department</span>
                                        <p className="text-xs font-bold text-slate-900 mt-0.5">
                                            {getDepartment(selectedStaff)}
                                        </p>
                                    </div>

                                    <div>
                                        <span className="text-[10px] text-slate-400 block">Exit / Separation Date</span>
                                        <p className="text-xs font-bold text-rose-600 mt-0.5 font-mono">
                                            {selectedStaff.exitDate
                                                ? new Date(selectedStaff.exitDate).toLocaleDateString()
                                                : selectedStaff.updatedAt
                                                    ? new Date(selectedStaff.updatedAt).toLocaleDateString()
                                                    : "Separated"}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 rounded-2xl bg-rose-50/40 border border-rose-100 space-y-1.5">
                                <div className="flex items-center gap-1.5 text-rose-700">
                                    <AlertCircle size={15} />
                                    <span className="text-xs font-bold">Reason for Separation</span>
                                </div>
                                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                                    {selectedStaff.exitReason ||
                                        selectedStaff.resignationReason ||
                                        selectedStaff.remarks ||
                                        "Standard separation process completed. Corporate access credentials revoked."}
                                </p>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-5 sm:px-6 py-3.5 sm:py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                            <span className="text-[11px] text-slate-400 font-mono">
                                System Record • Archived
                            </span>

                            <button
                                type="button"
                                onClick={() => setSelectedStaff(null)}
                                className="px-5 sm:px-6 py-2 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                            >
                                Close Profile
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}