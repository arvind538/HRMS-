"use client";

import { useEffect, useState, useCallback } from "react";
import { History, Clock, RefreshCw, Loader2, AlertCircle, ShieldAlert } from "lucide-react";
import api from "@/lib/api";

export default function EmployeeHistoryPage() {
    const [historyLogs, setHistoryLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);

    const fetchHistory = useCallback(async (isManual = false) => {
        if (isManual) setRefreshing(true);
        else setLoading(true);

        setError(null);
        try {
            const res = await api.get("/users/activity-logs", { params: { module: "Employee" } });

            // Safe fallback to extract array from multiple backend response patterns
            const dataList = Array.isArray(res?.data)
                ? res.data
                : res?.data?.logs || res?.data?.data || [];

            setHistoryLogs(dataList);
        } catch (err) {
            console.error("History fetch error:", err);
            if (err.response?.status === 403) {
                setError("Sirf Admin hi is history ko dekh sakta hai.");
            } else {
                setError(err.response?.data?.message || "History load nahi ho payi. Kripya dobara koshish karein.");
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    if (loading) {
        return (
            <div className="w-full py-28 flex flex-col items-center justify-center gap-2 text-slate-400">
                <Loader2 size={32} className="animate-spin text-indigo-600" />
                <p className="text-xs font-semibold">Loading workforce audit history...</p>
            </div>
        );
    }

    return (
        <div className="max-w-[1400px] mx-auto space-y-6 pb-12 transition-all duration-300">
            {/* Top Header Card */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
                <div>
                    <div className="flex items-center gap-2.5">
                        <span className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100/50 shadow-2xs">
                            <History size={20} />
                        </span>
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                            Employee History & Audits
                        </h1>
                    </div>
                    <p className="text-xs text-slate-500 mt-1.5 pl-11">
                        Recorded system and admin actions related to workforce modifications.
                    </p>
                </div>

                <button
                    onClick={() => fetchHistory(true)}
                    disabled={refreshing}
                    aria-label="Refresh logs"
                    className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:scale-95 transition-all disabled:opacity-50 shadow-2xs cursor-pointer self-start sm:self-auto"
                >
                    <RefreshCw size={16} className={refreshing ? "animate-spin text-indigo-600" : ""} />
                </button>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="bg-rose-50 border border-rose-200/70 text-rose-700 text-xs p-4 rounded-2xl flex items-center gap-2.5 shadow-2xs">
                    <ShieldAlert size={18} className="shrink-0 text-rose-600" />
                    <span className="font-medium">{error}</span>
                </div>
            )}

            {/* Content Section */}
            {!error && historyLogs.length === 0 ? (
                <div className="bg-white p-16 text-center rounded-2xl border border-slate-200/80 shadow-xs text-slate-400">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3 shadow-2xs">
                        <History size={22} />
                    </div>
                    <p className="text-sm font-bold text-slate-700">No activity logs recorded yet</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                        Activity audit events will appear here once backend actions are logged.
                    </p>
                </div>
            ) : (
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
                    {historyLogs.map((log) => {
                        const logId = log._id || log.id || Math.random();
                        const userName = log.user?.name || log.userName || "System User";
                        const actionText = log.action || log.description || "Performed an action";
                        const logDate = log.createdAt || log.timestamp || new Date();

                        return (
                            <div
                                key={logId}
                                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-50/60 border border-slate-100 hover:bg-slate-50 hover:border-slate-200/80 active:scale-[0.998] transition-all duration-200 group shadow-2xs"
                            >
                                <div className="flex items-start gap-3.5">
                                    <div className="p-2.5 bg-indigo-50 border border-indigo-100/50 text-indigo-600 rounded-xl shrink-0 group-hover:bg-indigo-100/60 transition-colors shadow-2xs">
                                        <Clock size={16} />
                                    </div>
                                    <div className="text-xs space-y-0.5">
                                        <p className="font-bold text-slate-900 group-hover:text-indigo-950 transition-colors">
                                            {userName}
                                        </p>
                                        <p className="text-slate-600 font-medium">
                                            {actionText}
                                        </p>
                                    </div>
                                </div>

                                <div className="pl-11 sm:pl-0 text-left sm:text-right shrink-0">
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-white border border-slate-200/60 font-mono text-[11px] text-slate-500 shadow-2xs">
                                        {new Date(logDate).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}