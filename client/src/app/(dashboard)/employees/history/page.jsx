"use client";

import { useEffect, useState, useCallback } from "react";
import { History, Clock, RefreshCw, Loader2, ShieldAlert, Activity, Calendar } from "lucide-react";
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
            <div className="w-full py-28 flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 size={34} className="animate-spin text-indigo-600" />
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 animate-pulse">
                    Loading workforce audit history...
                </p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 font-sans antialiased text-slate-900">
            {/* Top Header Card */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm transition-all duration-300 hover:shadow-md">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100/80 shadow-2xs">
                            <History size={22} />
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                                Employee History & Audits
                            </h1>
                            <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-0.5">
                                Real-time audit trails of system and admin actions related to workforce modifications.
                            </p>
                        </div>
                    </div>
                </div>

                <button
                    onClick={() => fetchHistory(true)}
                    disabled={refreshing}
                    aria-label="Refresh logs"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-xl text-slate-700 text-xs font-bold transition-all disabled:opacity-50 shadow-2xs cursor-pointer active:scale-95 self-start sm:self-auto hover:border-slate-300"
                >
                    <RefreshCw size={15} className={refreshing ? "animate-spin text-indigo-600" : "text-slate-500"} />
                    <span>Refresh Logs</span>
                </button>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm p-4 rounded-2xl flex items-center gap-3 shadow-2xs">
                    <ShieldAlert size={20} className="shrink-0 text-rose-600" />
                    <span className="font-semibold">{error}</span>
                </div>
            )}

            {/* Content Section */}
            {!error && historyLogs.length === 0 ? (
                <div className="bg-white p-16 text-center rounded-3xl border border-slate-200/80 shadow-sm text-slate-400 space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto text-slate-400 border border-slate-200 shadow-2xs">
                        <Activity size={26} />
                    </div>
                    <p className="text-base font-bold text-slate-900">No activity logs recorded yet</p>
                    <p className="text-xs text-slate-400 font-medium">
                        Activity audit events will appear here once backend actions are logged.
                    </p>
                </div>
            ) : (
                <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                            Activity Timeline ({historyLogs.length} Events)
                        </h3>
                    </div>

                    <div className="space-y-3">
                        {historyLogs.map((log) => {
                            const logId = log._id || log.id || Math.random();
                            const userName = log.user?.name || log.userName || "System Administrator";
                            const actionText = log.action || log.description || "Performed workforce modification";
                            const logDate = log.createdAt || log.timestamp || new Date();

                            return (
                                <div
                                    key={logId}
                                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4.5 rounded-2xl bg-slate-50/70 border border-slate-200/60 hover:bg-white hover:border-indigo-200 hover:shadow-md transition-all duration-200 group cursor-default"
                                >
                                    <div className="flex items-start gap-3.5">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-200 shadow-2xs">
                                            <Clock size={18} />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                                {userName}
                                            </p>
                                            <p className="text-xs text-slate-600 font-medium leading-relaxed">
                                                {actionText}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="pl-13 sm:pl-0 text-left sm:text-right shrink-0">
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border border-slate-200/80 font-mono text-[11px] font-semibold text-slate-500 shadow-2xs group-hover:border-indigo-100 group-hover:text-indigo-600 transition-colors">
                                            <Calendar size={12} className="text-slate-400" />
                                            {new Date(logDate).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}