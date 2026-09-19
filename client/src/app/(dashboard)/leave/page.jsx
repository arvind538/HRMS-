"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    Clock,
    CheckCircle2,
    XCircle,
    AlertCircle,
    RefreshCw,
    Users,
    CalendarCheck,
} from "lucide-react";
import api from "@/lib/api";

export default function LeaveDashboard() {
    const [stats, setStats] = useState({
        onLeaveToday: 0,
        pendingRequests: 0,
        approvedCount: 0,
        rejectedCount: 0,
        todayLeaveList: [],
        recentPendingList: [],
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Safe data unwrapper (works with both { data: [...] } and direct [...])
    const extractArray = (res) => {
        if (!res) return [];
        if (Array.isArray(res.data)) return res.data;
        if (res.data && Array.isArray(res.data.data)) return res.data.data;
        if (res.data && Array.isArray(res.data.leaves)) return res.data.leaves;
        return [];
    };

    // 🌟 Robust Helper Functions for Extracting Employee Details cleanly
    const getEmployeeName = (item) => {
        const target = item.employee || item.user || {};
        if (typeof target === "object" && target !== null) {
            return target.name || target.fullName || target.username || item.employeeName || item.userName || "Staff Member";
        }
        return item.employeeName || item.userName || "Staff Member";
    };

    const getEmployeeRole = (item) => {
        const target = item.employee || item.user || {};
        if (typeof target === "object" && target !== null) {
            return target.designation || target.department || target.role || item.department || "Staff";
        }
        return item.department || "Staff";
    };

    const fetchDashboardData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const now = new Date();
            const currentYear = now.getFullYear();
            const currentMonth = now.getMonth();

            // Today normalized to midnight for accurate date-range checks
            const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

            // Parallel API calls
            const [allLeavesRes, pendingRes] = await Promise.all([
                api.get("/leave"),
                api.get("/leave", { params: { status: "pending" } }).catch(() => null),
            ]);

            const allLeaves = extractArray(allLeavesRes);
            let pendingLeaves = extractArray(pendingRes);

            // Fallback filter if separate pending endpoint returns empty
            if (!pendingLeaves.length && allLeaves.length) {
                pendingLeaves = allLeaves.filter(
                    (l) => String(l.status).toLowerCase() === "pending"
                );
            }

            // 1. On Leave Today calculation
            const todayEmployees = [];
            const onLeaveTodayCount = allLeaves.filter((l) => {
                if (String(l.status).toLowerCase() !== "approved") return false;
                if (!l.startDate || !l.endDate) return false;

                const s = new Date(l.startDate);
                const e = new Date(l.endDate);
                const startMidnight = new Date(s.getFullYear(), s.getMonth(), s.getDate()).getTime();
                const endMidnight = new Date(e.getFullYear(), e.getMonth(), e.getDate()).getTime();

                const isToday = todayMidnight >= startMidnight && todayMidnight <= endMidnight;
                if (isToday) {
                    todayEmployees.push({
                        id: l._id || l.id,
                        name: getEmployeeName(l),
                        role: getEmployeeRole(l),
                        type: l.leaveType || l.type || "Casual Leave",
                        days: l.totalDays || 1,
                    });
                }
                return isToday;
            }).length;

            // 2. Approved this month
            const approvedThisMonth = allLeaves.filter((l) => {
                if (String(l.status).toLowerCase() !== "approved") return false;
                const refDate = l.approvedOn || l.updatedAt || l.startDate;
                if (!refDate) return false;
                const d = new Date(refDate);
                return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            }).length;

            // 3. Rejected leaves (This Year)
            const rejectedCount = allLeaves.filter((l) => {
                if (String(l.status).toLowerCase() !== "rejected") return false;
                const refDate = l.updatedAt || l.startDate;
                if (!refDate) return true;
                return new Date(refDate).getFullYear() === currentYear;
            }).length;

            setStats({
                onLeaveToday: onLeaveTodayCount,
                pendingRequests: pendingLeaves.length,
                approvedCount: approvedThisMonth,
                rejectedCount,
                todayLeaveList: todayEmployees.slice(0, 5),
                recentPendingList: pendingLeaves.slice(0, 5),
            });
        } catch (err) {
            console.error("Leave dashboard fetch error:", err);
            if (err.response?.status === 401) {
                setError("Your session has expired. Please log in again.");
            } else if (err.response?.status === 403) {
                setError("You do not have the required permissions to view leave metrics.");
            } else {
                setError(err.response?.data?.message || "Failed to synchronize data from the server.");
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    return (
        <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4 lg:px-0 font-sans">
            {/* Header bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 bg-white p-5 rounded-2xl shadow-xs">
                <div>
                    <div className="flex items-center gap-2.5">
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                            Leave & Attendance Intelligence
                        </h1>
                        <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
                        </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1">
                        Real-time tracking of staff availability, pending approvals, and monthly utilization.
                    </p>
                </div>

                <button
                    onClick={fetchDashboardData}
                    disabled={loading}
                    className="inline-flex items-center justify-center gap-2 self-start sm:self-auto px-4 py-2.5 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 active:scale-95 border border-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 shadow-2xs hover:shadow-md disabled:opacity-50 cursor-pointer"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-600" : "text-slate-500"}`} />
                    <span>{loading ? "Syncing..." : "Refresh Metrics"}</span>
                </button>
            </div>

            {/* Error State */}
            {error && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl shadow-xs">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                        <p className="text-xs sm:text-sm font-medium">{error}</p>
                    </div>
                    <button
                        onClick={fetchDashboardData}
                        className="px-3.5 py-1.5 bg-white text-rose-700 text-xs font-semibold rounded-lg border border-rose-200 hover:bg-rose-100/50 transition-colors shadow-2xs self-end sm:self-auto cursor-pointer"
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                <MetricCard
                    label="On Leave Today"
                    value={stats.onLeaveToday}
                    icon={<Users className="w-5 h-5 text-blue-600" />}
                    badgeBg="bg-blue-50"
                    subtext="Active out-of-office staff"
                    loading={loading}
                />
                <MetricCard
                    label="Pending Approvals"
                    value={stats.pendingRequests}
                    icon={<Clock className="w-5 h-5 text-amber-600" />}
                    badgeBg="bg-amber-50"
                    subtext="Requires HR/Manager review"
                    highlight={stats.pendingRequests > 0}
                    loading={loading}
                />
                <MetricCard
                    label="Approved This Month"
                    value={stats.approvedCount}
                    icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                    badgeBg="bg-emerald-50"
                    subtext="Processed calendar month"
                    loading={loading}
                />
                <MetricCard
                    label="Rejected Requests"
                    value={stats.rejectedCount}
                    icon={<XCircle className="w-5 h-5 text-rose-600" />}
                    badgeBg="bg-rose-50"
                    subtext="Total declined (Yearly)"
                    loading={loading}
                />
            </div>

            {/* Bottom Contextual Grids (Today Out & Pending Reviews) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Out Today List */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs hover:shadow-xl hover:border-indigo-200 transition-all duration-300 flex flex-col justify-between group">
                    <div>
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <CalendarCheck className="w-4 h-4 text-blue-600" />
                                <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
                                    Out of Office Today
                                </h3>
                            </div>
                            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                                {stats.todayLeaveList.length} Members
                            </span>
                        </div>

                        <div className="mt-4 divide-y divide-slate-100">
                            {loading ? (
                                <div className="py-8 text-center text-xs text-slate-400">Checking daily attendance logs...</div>
                            ) : stats.todayLeaveList.length === 0 ? (
                                <div className="py-10 text-center text-xs text-slate-500 font-medium">
                                    ✨ Full team operational! No employees are on leave today.
                                </div>
                            ) : (
                                stats.todayLeaveList.map((emp, i) => (
                                    <div key={emp.id || i} className="py-3.5 flex items-center justify-between gap-3 group/item hover:bg-indigo-50/40 px-3 rounded-xl transition-all duration-200">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700 shrink-0 group-hover/item:bg-indigo-100 group-hover/item:text-indigo-700 transition-colors">
                                                {emp.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="truncate">
                                                <p className="text-xs sm:text-sm font-semibold text-slate-900 truncate group-hover/item:text-indigo-600 transition-colors">{emp.name}</p>
                                                <p className="text-[11px] text-slate-500 truncate">{emp.role}</p>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-100 capitalize">
                                                {emp.type}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Pending Requests Preview */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs hover:shadow-xl hover:border-amber-200 transition-all duration-300 flex flex-col justify-between group">
                    <div>
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-amber-600" />
                                <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
                                    Pending Approvals Queue
                                </h3>
                            </div>
                            <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                                {stats.pendingRequests} pending
                            </span>
                        </div>

                        <div className="mt-4 divide-y divide-slate-100">
                            {loading ? (
                                <div className="py-8 text-center text-xs text-slate-400">Scanning pending inbox...</div>
                            ) : stats.recentPendingList.length === 0 ? (
                                <div className="py-10 text-center text-xs text-slate-500 font-medium">
                                    🎉 All caught up! There are no pending leave requests to review.
                                </div>
                            ) : (
                                stats.recentPendingList.map((item, i) => {
                                    const employeeName = getEmployeeName(item);
                                    return (
                                        <div key={item._id || item.id || i} className="py-3.5 flex items-center justify-between gap-3 group/item hover:bg-amber-50/40 px-3 rounded-xl transition-all duration-200">
                                            <div className="truncate">
                                                <p className="text-xs sm:text-sm font-semibold text-slate-900 truncate group-hover/item:text-amber-700 transition-colors">
                                                    {employeeName}
                                                </p>
                                                <p className="text-[11px] text-slate-500 mt-0.5 capitalize">
                                                    {item.leaveType || item.type || "Leave"} • {item.totalDays || 1} day(s)
                                                </p>
                                            </div>
                                            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200 shrink-0 group-hover/item:bg-amber-100 transition-colors">
                                                Action Required
                                            </span>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function MetricCard({ label, value, icon, badgeBg, subtext, highlight = false, loading = false }) {
    return (
        <div
            className={`bg-white border rounded-2xl p-5 shadow-xs transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group ${highlight ? "border-amber-300 ring-2 ring-amber-500/10" : "border-slate-200/90 hover:border-indigo-300"
                }`}
        >
            <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider group-hover:text-indigo-600 transition-colors">{label}</span>
                <div className={`p-2.5 rounded-xl ${badgeBg} transition-transform duration-300 group-hover:scale-110`}>{icon}</div>
            </div>

            <div className="mt-3">
                {loading ? (
                    <div className="h-8 w-16 bg-slate-100 animate-pulse rounded-lg mt-1" />
                ) : (
                    <div className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
                        {Number(value).toLocaleString()}
                    </div>
                )}
                <p className="text-[11px] font-medium text-slate-500 mt-1">{subtext}</p>
            </div>
        </div>
    );
}