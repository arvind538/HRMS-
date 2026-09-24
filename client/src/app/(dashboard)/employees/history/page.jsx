"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
    History,
    Clock,
    RefreshCw,
    Loader2,
    ShieldAlert,
    Activity,
    Calendar,
    Eye,
    X,
    Search,
    ChevronRight,
    Database,
    UserCheck,
} from "lucide-react";
import api from "@/lib/api";

export default function EmployeeHistoryPage() {
    const [historyLogs, setHistoryLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);

    const [searchQuery, setSearchQuery] = useState("");
    const [selectedLog, setSelectedLog] = useState(null);

    const fetchHistory = useCallback(async (isManual = false) => {
        if (isManual) setRefreshing(true);
        else setLoading(true);

        setError(null);
        try {
            const res = await api.get("/users/activity-logs", {
                params: { module: "Employee" },
            });

            const dataList = Array.isArray(res?.data)
                ? res.data
                : res?.data?.logs || res?.data?.data || [];

            setHistoryLogs(dataList);
        } catch (err) {
            console.error("History fetch error:", err);
            if (err.response?.status === 403) {
                setError("Access restricted. Only administrators have authorization to inspect workforce audit records.");
            } else {
                setError(
                    err.response?.data?.message ||
                    "Unable to synchronize workforce audit history. Please try again."
                );
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    const resolveExecutorName = (log) => {
        const rawName = log.user?.name || log.userName || log.createdBy?.name;
        if (
            rawName &&
            rawName.toLowerCase() !== "system operator" &&
            rawName.toLowerCase() !== "system"
        ) {
            return rawName;
        }
        return "Administrator";
    };

    const resolveTargetEmployee = (log) => {
        if (log.targetEmployee && log.targetEmployee !== "General Record") {
            return log.targetEmployee;
        }
        if (log.target && log.target !== "General Record") {
            return log.target;
        }
        const act = log.action || log.description || "";
        if (act.includes(":")) {
            const parts = act.split(":");
            return parts.slice(1).join(":").trim();
        }
        return "Workforce Member";
    };

    const filteredLogs = useMemo(() => {
        if (!searchQuery.trim()) return historyLogs;
        const q = searchQuery.toLowerCase();
        return historyLogs.filter((log) => {
            const uName = resolveExecutorName(log).toLowerCase();
            const action = (log.action || log.description || "").toLowerCase();
            const empTarget = resolveTargetEmployee(log).toLowerCase();
            return uName.includes(q) || action.includes(q) || empTarget.includes(q);
        });
    }, [historyLogs, searchQuery]);

    const getActionBadge = (action = "") => {
        const act = String(action).toLowerCase();
        if (
            act.includes("created") ||
            act.includes("add") ||
            act.includes("register")
        ) {
            return "bg-emerald-50 text-emerald-700 border-emerald-200";
        }
        if (
            act.includes("updated") ||
            act.includes("edit") ||
            act.includes("modify")
        ) {
            return "bg-indigo-50 text-indigo-700 border-indigo-200";
        }
        if (
            act.includes("exit") ||
            act.includes("delete") ||
            act.includes("terminate")
        ) {
            return "bg-amber-50 text-amber-700 border-amber-200";
        }
        return "bg-slate-100 text-slate-700 border-slate-200";
    };

    if (loading) {
        return (
            <div className="w-full min-h-[500px] flex flex-col items-center justify-center gap-3">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center animate-pulse">
                    <Loader2 size={26} className="animate-spin text-indigo-600" />
                </div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Loading Audit Trail Ledger...
                </p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 font-sans antialiased text-slate-900">
            {/* Top Header Card */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-7 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shadow-2xs shrink-0">
                        <History size={20} className="sm:w-[22px] sm:h-[22px]" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                            Employee History & Audits
                        </h1>
                        <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5">
                            Immutable audit trails documenting administrative operations and employee lifecycle changes.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                    <button
                        type="button"
                        onClick={() => fetchHistory(true)}
                        disabled={refreshing}
                        className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200/80 rounded-xl sm:rounded-2xl text-slate-700 text-xs font-bold transition-all disabled:opacity-50 shadow-2xs active:scale-95 cursor-pointer"
                    >
                        <RefreshCw
                            size={14}
                            className={refreshing ? "animate-spin text-indigo-600 shrink-0" : "shrink-0"}
                        />
                        <span>Refresh Logs</span>
                    </button>
                </div>
            </div>

            {/* Error Alert */}
            {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm p-4 rounded-2xl flex items-center gap-3 shadow-2xs">
                    <ShieldAlert size={18} className="shrink-0 text-rose-600" />
                    <span className="font-semibold">{error}</span>
                </div>
            )}

            {/* Main Content Area */}
            {!error && (
                <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
                    {/* Table Toolbar */}
                    <div className="p-4 sm:p-5 sm:px-8 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                            Logged Events ({filteredLogs.length})
                        </span>

                        <div className="relative w-full sm:w-72">
                            <Search
                                size={15}
                                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                            />
                            <input
                                type="text"
                                placeholder="Filter by author or target staff..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200/90 rounded-xl sm:rounded-2xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 outline-none transition shadow-2xs"
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
                    </div>

                    {filteredLogs.length === 0 ? (
                        <div className="p-12 sm:p-16 text-center text-slate-400 space-y-2.5">
                            <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto text-slate-400 shadow-2xs">
                                <Activity size={22} />
                            </div>
                            <p className="text-sm font-bold text-slate-800">
                                No activity logs found
                            </p>
                            <p className="text-xs text-slate-400 max-w-sm mx-auto font-medium">
                                No ledger records align with your current search query.
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Mobile Card Roster */}
                            <div className="grid grid-cols-1 gap-3 p-3.5 sm:p-4 md:hidden">
                                {filteredLogs.map((log) => {
                                    const logId = log._id || log.id || Math.random();
                                    const executorName = resolveExecutorName(log);
                                    const targetName = resolveTargetEmployee(log);
                                    const actionText =
                                        log.action || log.description || "Updated employee record";
                                    const logDate = log.createdAt || log.timestamp || new Date();

                                    return (
                                        <div
                                            key={logId}
                                            onClick={() => setSelectedLog(log)}
                                            className="bg-slate-50/60 hover:bg-indigo-50/50 p-4 rounded-2xl border border-slate-200/70 transition-all space-y-3 cursor-pointer shadow-2xs"
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-[11px] flex items-center justify-center font-mono shrink-0">
                                                        {executorName.charAt(0)}
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-900 truncate">
                                                        {executorName}
                                                    </span>
                                                </div>
                                                <span
                                                    className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold border truncate ${getActionBadge(
                                                        actionText
                                                    )}`}
                                                >
                                                    {actionText}
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60">
                                                <div>
                                                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                                                        Target Record
                                                    </span>
                                                    <span className="font-semibold text-slate-800 font-mono text-[11px]">
                                                        {targetName}
                                                    </span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                                                        Timestamp
                                                    </span>
                                                    <span className="text-[11px] font-mono text-slate-500">
                                                        {new Date(logDate).toLocaleDateString("en-US", {
                                                            month: "short",
                                                            day: "numeric",
                                                        })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Desktop Table View */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[750px]">
                                    <thead>
                                        <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                            <th className="py-3.5 px-6">Timestamp</th>
                                            <th className="py-3.5 px-6">Author / Executor</th>
                                            <th className="py-3.5 px-6">Action Performed</th>
                                            <th className="py-3.5 px-6">Target Record</th>
                                            <th className="py-3.5 px-6 text-right">Details</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100/80 text-xs font-medium text-slate-700">
                                        {filteredLogs.map((log) => {
                                            const logId = log._id || log.id || Math.random();
                                            const executorName = resolveExecutorName(log);
                                            const targetName = resolveTargetEmployee(log);
                                            const actionText =
                                                log.action || log.description || "Updated employee record";
                                            const logDate = log.createdAt || log.timestamp || new Date();

                                            return (
                                                <tr
                                                    key={logId}
                                                    onClick={() => setSelectedLog(log)}
                                                    className="group hover:bg-indigo-50/40 transition-colors duration-150 cursor-pointer"
                                                >
                                                    <td className="py-4 px-6 whitespace-nowrap">
                                                        <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500">
                                                            <Clock
                                                                size={13}
                                                                className="text-slate-400 group-hover:text-indigo-600 transition-colors shrink-0"
                                                            />
                                                            <span>
                                                                {new Date(logDate).toLocaleDateString("en-US", {
                                                                    month: "short",
                                                                    day: "numeric",
                                                                    year: "numeric",
                                                                })}
                                                            </span>
                                                            <span className="text-slate-300">•</span>
                                                            <span className="font-semibold text-slate-600">
                                                                {new Date(logDate).toLocaleTimeString([], {
                                                                    hour: "2-digit",
                                                                    minute: "2-digit",
                                                                })}
                                                            </span>
                                                        </div>
                                                    </td>

                                                    <td className="py-4 px-6 whitespace-nowrap">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center font-bold text-xs uppercase font-mono group-hover:bg-indigo-600 group-hover:text-white transition-colors shrink-0">
                                                                {executorName.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                                                    {executorName}
                                                                </p>
                                                                <p className="text-[10px] text-slate-400 uppercase font-mono">
                                                                    ADMIN
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td className="py-4 px-6">
                                                        <span
                                                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ${getActionBadge(
                                                                actionText
                                                            )}`}
                                                        >
                                                            {actionText}
                                                        </span>
                                                    </td>

                                                    <td className="py-4 px-6 whitespace-nowrap">
                                                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200/80 text-slate-800 font-semibold text-xs font-mono">
                                                            {targetName}
                                                        </span>
                                                    </td>

                                                    <td className="py-4 px-6 text-right whitespace-nowrap">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedLog(log);
                                                            }}
                                                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 group-hover:border-indigo-300 group-hover:text-indigo-600 text-xs font-semibold shadow-2xs hover:bg-indigo-50 transition cursor-pointer"
                                                        >
                                                            <Eye size={13} />
                                                            <span>View</span>
                                                            <ChevronRight size={12} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Detail Inspection Modal */}
            {selectedLog && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-6 bg-slate-900/50 backdrop-blur-xs transition-all duration-200"
                    onClick={() => setSelectedLog(null)}
                >
                    <div
                        className="w-full max-w-2xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Top Header */}
                        <div className="flex items-center justify-between px-5 sm:px-6 py-4 sm:py-5 border-b border-slate-100 bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl sm:rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shadow-2xs shrink-0">
                                    <Database size={18} />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm sm:text-base font-bold text-slate-900">
                                            Audit Trail Record
                                        </h3>
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                                            VERIFIED
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 font-mono truncate">
                                        UUID: {selectedLog._id || selectedLog.id}
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => setSelectedLog(null)}
                                className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer shrink-0"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
                                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                                        Author / Executor
                                    </span>
                                    <div className="flex items-center gap-2.5 mt-1">
                                        <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 font-black text-xs flex items-center justify-center font-mono shrink-0">
                                            {resolveExecutorName(selectedLog).charAt(0)}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-slate-900 truncate">
                                                {resolveExecutorName(selectedLog)}
                                            </p>
                                            <p className="text-[10px] font-mono text-slate-500 truncate">
                                                {selectedLog.user?.email || "admin@system.local"}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
                                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                                        Recorded Timestamp
                                    </span>
                                    <div className="flex items-center gap-2 text-slate-900 font-mono font-bold text-xs mt-1.5">
                                        <Clock size={14} className="text-indigo-600 shrink-0" />
                                        <span>
                                            {new Date(
                                                selectedLog.createdAt || selectedLog.timestamp
                                            ).toLocaleTimeString([], {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                                second: "2-digit",
                                            })}
                                        </span>
                                        <span className="text-slate-300">•</span>
                                        <span className="text-slate-600 font-normal truncate">
                                            {new Date(
                                                selectedLog.createdAt || selectedLog.timestamp
                                            ).toLocaleDateString("en-US", {
                                                year: "numeric",
                                                month: "short",
                                                day: "numeric",
                                            })}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 rounded-2xl bg-indigo-50/40 border border-indigo-100 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600">
                                        Audit Event
                                    </span>
                                    <span className="px-2 py-0.5 rounded-md bg-white border border-indigo-200 text-[10px] font-mono font-bold text-indigo-700">
                                        Module: {selectedLog.module || "Employee"}
                                    </span>
                                </div>
                                <p className="text-sm font-bold text-slate-900">
                                    {selectedLog.action || selectedLog.description}
                                </p>
                                <div className="pt-2 border-t border-indigo-100/60 flex items-center gap-2">
                                    <UserCheck size={14} className="text-indigo-600 shrink-0" />
                                    <span className="text-xs text-slate-600 font-medium">
                                        Target Record:
                                    </span>
                                    <span className="text-xs font-bold text-slate-900 font-mono">
                                        {resolveTargetEmployee(selectedLog)}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                                        Raw State Payload (JSON)
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono">
                                        schema v{selectedLog.__v || 0}
                                    </span>
                                </div>
                                <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-950 text-emerald-400 font-mono text-[11px] leading-relaxed max-h-56 overflow-y-auto border border-slate-800 shadow-inner">
                                    <pre className="overflow-x-auto whitespace-pre-wrap break-words">
                                        {JSON.stringify(selectedLog, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        </div>

                        {/* Modal Bottom Footer */}
                        <div className="px-5 sm:px-6 py-3.5 sm:py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end">
                            <button
                                type="button"
                                onClick={() => setSelectedLog(null)}
                                className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                            >
                                Close Inspection
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}