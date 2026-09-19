"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserX, Calendar, Building2, Loader2, RefreshCw, Mail, Trash2 } from "lucide-react";
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
            toast.error("Error fetching exit employees:", err);
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
        e.stopPropagation(); // Prevent row click or any parent triggers
        toast.success("Your Employee Exit data deleted sucessfully!")
        if (!window.confirm("Are you sure you want to permanently delete this record?")) {
            return;
        }

        setDeletingId(empId);
        try {
            // Optimistically update UI
            setExitedStaff((prev) => prev.filter((emp) => (emp._id || emp.id) !== empId));

            // Call backend delete route
            await api.delete(`/employees/${empId}`);
        } catch (err) {
            console.error("Failed to delete employee:", err.response?.data || err.message);
            // Rollback by re-fetching if API fails
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
        <div className="max-w-[1400px] mx-auto space-y-6 pb-12 transition-all duration-300">
            {/* Top Header Card */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
                <div>
                    <div className="flex items-center gap-2.5">
                        <span className="p-2.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-100/50 shadow-2xs">
                            <UserX size={20} />
                        </span>
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                            Exit Employees / Alumni ({exitedStaff.length})
                        </h1>
                    </div>
                    <p className="text-xs text-slate-500 mt-1.5 pl-11">
                        Records of former employees, voluntary resignations, and separations.
                    </p>
                </div>

                <button
                    onClick={() => fetchExited(true)}
                    disabled={refreshing}
                    aria-label="Refresh list"
                    className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:scale-95 transition-all disabled:opacity-50 shadow-2xs cursor-pointer self-start sm:self-auto"
                >
                    <RefreshCw size={16} className={refreshing ? "animate-spin text-indigo-600" : ""} />
                </button>
            </div>

            {/* Table or Empty State Container */}
            {exitedStaff.length === 0 ? (
                <div className="bg-white p-16 text-center rounded-2xl border border-slate-200/80 shadow-xs text-slate-400">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3 shadow-2xs">
                        <UserX size={22} />
                    </div>
                    <p className="text-sm font-bold text-slate-700">No exited employee records found</p>
                    <p className="text-xs text-slate-400 mt-0.5">When staff are marked as Exit/Inactive, they will appear here.</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[700px]">
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
                                            className="hover:bg-slate-50/80 active:bg-slate-100/60 transition-all duration-200 group"
                                        >
                                            {/* Employee Column */}
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-3.5">
                                                    <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center font-extrabold text-xs shrink-0 shadow-2xs">
                                                        {getInitials(empName)}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900">
                                                            {empName}
                                                        </p>
                                                        <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                                                            <Mail size={11} className="text-slate-400" />
                                                            {emp.email || "No email provided"}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Department Column */}
                                            <td className="py-4 px-6">
                                                <span className="inline-flex items-center gap-1.5 text-slate-700 font-semibold bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200/60">
                                                    <Building2 size={13} className="text-slate-400" />
                                                    {dept}
                                                </span>
                                            </td>

                                            {/* Exit Date Column */}
                                            <td className="py-4 px-6 text-slate-500">
                                                <span className="inline-flex items-center gap-1.5 font-mono text-[11px]">
                                                    <Calendar size={13} className="text-slate-400" />
                                                    {emp.exitDate ? new Date(emp.exitDate).toLocaleDateString() : "—"}
                                                </span>
                                            </td>

                                            {/* Status Badge Column */}
                                            <td className="py-4 px-6">
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200/85 uppercase tracking-wide shadow-2xs">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                                    {status}
                                                </span>
                                            </td>

                                            {/* Action / Delete Button */}
                                            <td className="py-4 px-6 text-right">
                                                <button
                                                    type="button"
                                                    onClick={(e) => handleDeleteEmployee(empId, e)}
                                                    disabled={isDeleting}
                                                    title="Permanently Delete Record"
                                                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 active:scale-95 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                                                >
                                                    {isDeleting ? (
                                                        <Loader2 size={15} className="animate-spin text-rose-600" />
                                                    ) : (
                                                        <Trash2 size={15} />
                                                    )}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}