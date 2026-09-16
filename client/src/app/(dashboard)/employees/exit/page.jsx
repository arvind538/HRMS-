"use client";
import { useEffect, useState } from "react";
import { UserX, Calendar, Building2, Loader2, RefreshCw } from "lucide-react";
import api from "@/lib/api";

export default function ExitEmployeesPage() {
    const [exitedStaff, setExitedStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchExited = async (isManual = false) => {
        if (isManual) setRefreshing(true);
        else setLoading(true);

        try {
            const res = await api.get("/employees", { params: { status: "inactive" } });

            // Backend response ko safely extract karna (chahe direct array ho ya object wrap ho)
            const dataList = Array.isArray(res?.data)
                ? res.data
                : res?.data?.employees || res?.data?.data || [];

            // Inactive, resigned ya terminated status wale employees ko filter karna
            const filtered = dataList.filter((e) => {
                const status = (e.status || "").toLowerCase();
                return status === "inactive" || status === "resigned" || status === "terminated";
            });

            setExitedStaff(filtered);
        } catch (err) {
            console.error("Error fetching exit employees:", err);
            setExitedStaff([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchExited();
    }, []);

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
                            Exit Employees / Alumni
                        </h1>
                    </div>
                    <p className="text-xs text-slate-500 mt-1.5 pl-11">
                        Records of former employees, resignations, and terminations.
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
                    <p className="text-xs text-slate-400 mt-0.5">All current staff statuses are active.</p>
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
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                                {exitedStaff.map((emp) => {
                                    const empId = emp._id || emp.id || Math.random();
                                    const empName = emp.name || emp.fullName || "Unnamed Staff";
                                    const dept = emp.department?.name || emp.department || "General";
                                    const status = emp.status || "Inactive";

                                    return (
                                        <tr
                                            key={empId}
                                            className="hover:bg-slate-50/80 active:bg-slate-100/60 transition-all duration-200 group"
                                        >
                                            {/* Employee Column */}
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs group-hover:border-rose-200 group-hover:bg-rose-50/50 group-hover:text-rose-600 transition-all">
                                                        {empName.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900 group-hover:text-slate-950 transition-colors">
                                                            {empName}
                                                        </p>
                                                        <p className="text-[11px] text-slate-400">
                                                            {emp.employeeId || emp.email || "Alumni Record"}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Department Column */}
                                            <td className="py-4 px-6">
                                                <span className="inline-flex items-center gap-1.5 text-slate-700 font-semibold">
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
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200/70 uppercase tracking-wide shadow-2xs">
                                                    {status}
                                                </span>
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