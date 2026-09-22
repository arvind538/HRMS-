"use client";
import { useEffect, useState } from "react";
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
    Briefcase,
    AlertCircle,
    Clock,
    ShieldCheck,
    Eye,
    ChevronRight
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";

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
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    // Center Modal Selected Employee State
    const [selectedStaff, setSelectedStaff] = useState(null);

    const fetchExited = async (isManual = false) => {
        if (isManual) setRefreshing(true);
        else setLoading(true);

        try {
            const res = await api.get("/employees");

            const dataList = Array.isArray(res?.data)
                ? res.data
                : res?.data?.employees || res?.data?.data || [];

            const filtered = dataList.filter((e) => {
                const status = (e.status || "").toLowerCase();
                return (
                    status === "exit" ||
                    status === "exited" ||
                    status === "inactive" ||
                    status === "resigned" ||
                    status === "terminated"
                );
            });

            setExitedStaff(filtered);
        } catch (err) {
            toast.error("Error fetching exit employees");
            setExitedStaff([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchExited();
    }, []);

    const handleDeleteEmployee = async (empId, e) => {
        e.stopPropagation(); // Modal open hone se roke
        if (!window.confirm("Are you sure you want to permanently delete this record?")) {
            return;
        }

        setDeletingId(empId);
        try {
            setExitedStaff((prev) => prev.filter((emp) => (emp._id || emp.id) !== empId));
            await api.delete(`/employees/${empId}`);
            toast.success("Employee record deleted permanently!");
            if (selectedStaff && (selectedStaff._id || selectedStaff.id) === empId) {
                setSelectedStaff(null);
            }
        } catch (err) {
            console.error("Failed to delete employee:", err.response?.data || err.message);
            toast.error("Failed to delete record");
            fetchExited();
        } finally {
            setDeletingId(null);
        }
    };

    if (loading) {
        return (
            <div className="w-full py-28 flex flex-col items-center justify-center gap-2 text-slate-400">
                <Loader2 size={32} className="animate-spin text-indigo-600" />
                <p className="text-xs font-semibold">Loading alumni records...</p>
            </div>
        );
    }

    return (
        <div className="max-w-[1400px] mx-auto space-y-6 pb-12 transition-all duration-300 font-sans antialiased text-slate-900">

            {/* Top Header Card */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
                <div>
                    <div className="flex items-center gap-2.5">
                        <span className="p-2.5 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 shadow-2xs">
                            <UserX size={20} />
                        </span>
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                            Exit Employees / Alumni ({exitedStaff.length})
                        </h1>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 pl-11">
                        Records of former personnel, voluntary resignations, and organizational separations.
                    </p>
                </div>

                <button
                    onClick={() => fetchExited(true)}
                    disabled={refreshing}
                    aria-label="Refresh list"
                    className="p-2.5 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 rounded-xl text-slate-600 active:scale-95 transition-all disabled:opacity-50 shadow-2xs cursor-pointer self-start sm:self-auto"
                >
                    <RefreshCw size={16} className={refreshing ? "animate-spin text-indigo-600" : ""} />
                </button>
            </div>

            {/* Empty State */}
            {exitedStaff.length === 0 ? (
                <div className="bg-white p-16 text-center rounded-3xl border border-slate-200/80 shadow-xs text-slate-400">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3 shadow-2xs">
                        <UserX size={22} />
                    </div>
                    <p className="text-sm font-bold text-slate-700">No exited employee records found</p>
                    <p className="text-xs text-slate-400 mt-0.5">When staff are marked as Exit/Inactive, they will appear here.</p>
                </div>
            ) : (
                <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[750px]">
                            <thead>
                                <tr className="bg-slate-50/75 border-b border-slate-200/70 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                    <th className="py-4 px-6">Employee</th>
                                    <th className="py-4 px-6">Department</th>
                                    <th className="py-4 px-6">Exit Date</th>
                                    <th className="py-4 px-6">Status</th>
                                    <th className="py-4 px-6 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                                {exitedStaff.map((emp) => {
                                    const empId = emp._id || emp.id;
                                    const empName = emp.name || emp.fullName || "Unnamed Staff";
                                    const dept = emp.department?.name || emp.department || emp.branch || "General";
                                    const status = emp.status || "Exit";
                                    const isDeleting = deletingId === empId;

                                    return (
                                        <tr
                                            key={empId}
                                            onClick={() => setSelectedStaff(emp)}
                                            className="hover:bg-rose-50/30 transition-all duration-150 group cursor-pointer"
                                        >
                                            {/* Employee Column */}
                                            <td className="py-4 px-6 whitespace-nowrap">
                                                <div className="flex items-center gap-3.5">
                                                    <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center font-extrabold text-xs shrink-0 shadow-2xs group-hover:scale-105 group-hover:bg-rose-600 group-hover:text-white transition-all">
                                                        {getInitials(empName)}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900 group-hover:text-rose-600 transition-colors">
                                                            {empName}
                                                        </p>
                                                        <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 font-mono">
                                                            <Mail size={11} className="text-slate-400" />
                                                            {emp.email || "No email provided"}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Department Column */}
                                            <td className="py-4 px-6 whitespace-nowrap">
                                                <span className="inline-flex items-center gap-1.5 text-slate-700 font-semibold bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200/70">
                                                    <Building2 size={13} className="text-slate-400" />
                                                    {dept}
                                                </span>
                                            </td>

                                            {/* Exit Date Column */}
                                            <td className="py-4 px-6 text-slate-500 whitespace-nowrap">
                                                <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold text-slate-600">
                                                    <Calendar size={13} className="text-slate-400" />
                                                    {emp.exitDate ? new Date(emp.exitDate).toLocaleDateString() : (emp.updatedAt ? new Date(emp.updatedAt).toLocaleDateString() : "—")}
                                                </span>
                                            </td>

                                            {/* Status Badge */}
                                            <td className="py-4 px-6 whitespace-nowrap">
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 uppercase tracking-wide">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                                    {status}
                                                </span>
                                            </td>

                                            {/* Action Buttons */}
                                            <td className="py-4 px-6 text-right whitespace-nowrap">
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
            )}

            {/* Smooth Center Pop-up Modal */}
            {selectedStaff && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 backdrop-blur-xs transition-all duration-200"
                    onClick={() => setSelectedStaff(null)}
                >
                    <div
                        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center font-bold text-sm shadow-2xs">
                                    {getInitials(selectedStaff.name || selectedStaff.fullName)}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-base font-bold text-slate-900">
                                            {selectedStaff.name || selectedStaff.fullName}
                                        </h3>
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 uppercase font-mono">
                                            {selectedStaff.status || "EXITED"}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 font-mono">
                                        ID: {selectedStaff.employeeId || (selectedStaff._id ? `EMP${String(selectedStaff._id).slice(-4).toUpperCase()}` : "EMP-ALUMNI")}
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={() => setSelectedStaff(null)}
                                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Modal Body Content */}
                        <div className="p-6 overflow-y-auto space-y-5">

                            {/* Row 1: Contact Information */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
                                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                                        Work Email Address
                                    </span>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Mail size={15} className="text-rose-500" />
                                        <p className="text-xs font-bold text-slate-800 font-mono truncate">
                                            {selectedStaff.email || "No email record"}
                                        </p>
                                    </div>
                                </div>

                                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
                                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                                        Phone Contact
                                    </span>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Phone size={15} className="text-sky-500" />
                                        <p className="text-xs font-bold text-slate-800 font-mono">
                                            {selectedStaff.phone || selectedStaff.phoneNumber || "Not Configured"}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Row 2: Employment Parameters */}
                            <div className="p-4.5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-3">
                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                                    Separation & Corporate Overview
                                </span>

                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    <div>
                                        <span className="text-[10px] text-slate-400">Designation</span>
                                        <p className="text-xs font-bold text-slate-900 mt-0.5">
                                            {selectedStaff.designation || "Staff Associate"}
                                        </p>
                                    </div>

                                    <div>
                                        <span className="text-[10px] text-slate-400">Department</span>
                                        <p className="text-xs font-bold text-slate-900 mt-0.5">
                                            {selectedStaff.department?.name || selectedStaff.department || selectedStaff.branch || "General"}
                                        </p>
                                    </div>

                                    <div>
                                        <span className="text-[10px] text-slate-400">Exit / Separation Date</span>
                                        <p className="text-xs font-bold text-rose-600 mt-0.5 font-mono">
                                            {selectedStaff.exitDate ? new Date(selectedStaff.exitDate).toLocaleDateString() : (selectedStaff.updatedAt ? new Date(selectedStaff.updatedAt).toLocaleDateString() : "Separated")}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Row 3: Additional Notes / Reason */}
                            <div className="p-4 rounded-2xl bg-rose-50/40 border border-rose-100 space-y-1.5">
                                <div className="flex items-center gap-1.5 text-rose-700">
                                    <AlertCircle size={15} />
                                    <span className="text-xs font-bold">Reason for Separation</span>
                                </div>
                                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                                    {selectedStaff.exitReason || selectedStaff.resignationReason || selectedStaff.remarks || "Standard separation process completed. Access rights revoked."}
                                </p>
                            </div>

                        </div>

                        {/* Modal Bottom Footer */}
                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                            <span className="text-[11px] text-slate-400 font-mono">
                                System Record • Archived
                            </span>

                            <button
                                onClick={() => setSelectedStaff(null)}
                                className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
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