// src/app/(dashboard)/reports/leave-summary/page.jsx
"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Calendar,
    CheckCircle2,
    Clock,
    XCircle,
    RefreshCw,
    Download,
    Loader2,
    Sparkles,
    PieChart as PieIcon,
    TrendingUp,
    Layers,
    ArrowUpRight,
} from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import api from "@/lib/api";

const TYPE_COLORS = [
    "#4F46E5",
    "#06B6D4",
    "#8B5CF6",
    "#F59E0B",
    "#EC4899",
    "#10B981",
];

function CustomChartTooltip({ active, payload }) {
    if (active && payload && payload.length) {
        const item = payload[0];
        return (
            <div className="bg-slate-900/95 backdrop-blur-md text-white px-3.5 py-2.5 rounded-2xl shadow-xl border border-slate-800 text-xs space-y-1">
                <p className="font-semibold text-slate-400">{item.name} Leave</p>
                <p className="text-sm font-black text-white font-mono tracking-tight">
                    {Number(item.value).toLocaleString()} Applications
                </p>
            </div>
        );
    }
    return null;
}

export default function LeaveSummaryPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [leaves, setLeaves] = useState([]);

    const extractList = (resData) => {
        if (!resData) return [];
        if (Array.isArray(resData)) return resData;
        if (Array.isArray(resData.leaves)) return resData.leaves;
        if (Array.isArray(resData.data)) return resData.data;
        if (Array.isArray(resData.data?.leaves)) return resData.data.leaves;
        if (Array.isArray(resData.records)) return resData.records;
        if (Array.isArray(resData.docs)) return resData.docs;
        return [];
    };

    const fetchLeaves = useCallback(async (isManual = false) => {
        if (isManual) setRefreshing(true);
        else setLoading(true);

        try {
            const [leavesRes, reportsRes] = await Promise.allSettled([
                api.get("/leave"),
                api.get("/reports/leave"),
            ]);

            let extracted = [];

            if (leavesRes.status === "fulfilled") {
                extracted = extractList(leavesRes.value?.data);
            }

            if (extracted.length === 0 && reportsRes.status === "fulfilled") {
                extracted = extractList(reportsRes.value?.data);
            }

            setLeaves(extracted);
        } catch (err) {
            console.error("Leave summary fetch error:", err);
            setLeaves([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchLeaves();
    }, [fetchLeaves]);

    const stats = useMemo(() => {
        const total = leaves.length;

        const approved = leaves.filter(
            (l) => String(l.status || "").toLowerCase().trim() === "approved"
        ).length;
        const pending = leaves.filter(
            (l) => String(l.status || "").toLowerCase().trim() === "pending"
        ).length;
        const rejected = leaves.filter(
            (l) => String(l.status || "").toLowerCase().trim() === "rejected"
        ).length;

        const approvalRate =
            total > 0 ? ((approved / total) * 100).toFixed(1) : "0.0";

        const typeMap = {};
        leaves.forEach((l) => {
            const rawType = l.leaveType || l.type || l.category || "OTHER";
            const cleanType = String(rawType)
                .replace(/[-_]/g, " ")
                .toUpperCase()
                .trim();
            typeMap[cleanType] = (typeMap[cleanType] || 0) + 1;
        });

        const byType = Object.entries(typeMap)
            .map(([name, value], i) => ({
                name,
                value,
                color: TYPE_COLORS[i % TYPE_COLORS.length],
            }))
            .sort((a, b) => b.value - a.value);

        return { total, approved, pending, rejected, approvalRate, byType };
    }, [leaves]);

    const handleExportSummary = () => {
        const payload = {
            generatedAt: new Date().toISOString(),
            metrics: {
                totalApplications: stats.total,
                approvedRequests: stats.approved,
                pendingReview: stats.pending,
                rejectedRequests: stats.rejected,
                approvalRate: `${stats.approvalRate}%`,
            },
            categoryDistribution: stats.byType,
        };

        const blob = new Blob([JSON.stringify(payload, null, 2)], {
            type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `leave-distribution-summary-${new Date().toISOString().split("T")[0]
            }.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    if (loading) {
        return (
            <div className="w-full min-h-[500px] flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 size={36} className="animate-spin text-indigo-600" />
                <p className="text-xs font-bold tracking-wider text-slate-600 uppercase">
                    Compiling Leave Metrics...
                </p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 antialiased font-sans text-slate-900">
            {/* Control Header Card */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-7 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs">
                <div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                            Leave Distribution Matrix
                        </h1>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/70 shadow-2xs">
                            <Sparkles size={13} className="text-indigo-600 shrink-0" />
                            Live Telemetry
                        </span>
                    </div>
                    <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1 max-w-2xl">
                        Real-time requisition volume, category shares, and managerial approval throughput rates.
                    </p>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                    <button
                        type="button"
                        onClick={() => fetchLeaves(true)}
                        disabled={refreshing}
                        className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl sm:rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80 text-xs font-bold transition-all shadow-2xs active:scale-95 disabled:opacity-60 cursor-pointer"
                        title="Sync dataset"
                    >
                        <RefreshCw
                            size={14}
                            className={
                                refreshing ? "animate-spin text-indigo-600 shrink-0" : "shrink-0"
                            }
                        />
                        <span>Sync</span>
                    </button>

                    <button
                        type="button"
                        onClick={handleExportSummary}
                        className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl sm:rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold shadow-sm shadow-indigo-100 transition-all hover:shadow-md active:scale-95 cursor-pointer"
                    >
                        <Download size={14} className="shrink-0" />
                        <span>Export Snapshot</span>
                    </button>
                </div>
            </div>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
                {/* Total Applications */}
                <div
                    onClick={() => router.push("/leave")}
                    className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-indigo-300 hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex flex-col justify-between"
                >
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100/80 shadow-2xs group-hover:scale-105 transition-transform">
                                <Calendar size={20} className="sm:w-[22px] sm:h-[22px]" />
                            </div>
                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider group-hover:text-indigo-600 transition-colors">
                                Total Logs
                            </span>
                        </div>
                        <h3 className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
                            {stats.total.toLocaleString()}
                        </h3>
                    </div>
                    <p className="text-xs font-semibold text-slate-500 mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span>Applications submitted</span>
                        <ArrowUpRight
                            size={14}
                            className="text-indigo-600 group-hover:translate-x-0.5 transition-transform"
                        />
                    </p>
                </div>

                {/* Approved Requests */}
                <div
                    onClick={() => router.push("/leave/requests?status=approved")}
                    className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-emerald-300 hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex flex-col justify-between"
                >
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100/80 shadow-2xs group-hover:scale-105 transition-transform">
                                <CheckCircle2 size={20} className="sm:w-[22px] sm:h-[22px]" />
                            </div>
                            <span className="text-[11px] font-black text-emerald-600 uppercase tracking-wider">
                                Approved
                            </span>
                        </div>
                        <h3 className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
                            {stats.approved.toLocaleString()}
                        </h3>
                    </div>
                    <p className="text-xs font-semibold text-emerald-600 mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                            <TrendingUp size={12} /> {stats.approvalRate}% approval rate
                        </span>
                        <ArrowUpRight
                            size={14}
                            className="group-hover:translate-x-0.5 transition-transform"
                        />
                    </p>
                </div>

                {/* Pending Review */}
                <div
                    onClick={() => router.push("/leave/approval")}
                    className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-amber-300 hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex flex-col justify-between"
                >
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100/80 shadow-2xs group-hover:scale-105 transition-transform">
                                <Clock size={20} className="sm:w-[22px] sm:h-[22px]" />
                            </div>
                            <span className="text-[11px] font-black text-amber-600 uppercase tracking-wider">
                                In Review
                            </span>
                        </div>
                        <h3 className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
                            {stats.pending.toLocaleString()}
                        </h3>
                    </div>
                    <p className="text-xs font-semibold text-amber-600 mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span>Awaiting authorization</span>
                        <ArrowUpRight
                            size={14}
                            className="group-hover:translate-x-0.5 transition-transform"
                        />
                    </p>
                </div>

                {/* Rejected Requests */}
                <div
                    onClick={() => router.push("/leave/requests?status=rejected")}
                    className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-rose-300 hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex flex-col justify-between"
                >
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100/80 shadow-2xs group-hover:scale-105 transition-transform">
                                <XCircle size={20} className="sm:w-[22px] sm:h-[22px]" />
                            </div>
                            <span className="text-[11px] font-black text-rose-500 uppercase tracking-wider">
                                Declined
                            </span>
                        </div>
                        <h3 className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
                            {stats.rejected.toLocaleString()}
                        </h3>
                    </div>
                    <p className="text-xs font-semibold text-rose-500 mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span>Rejected applications</span>
                        <ArrowUpRight
                            size={14}
                            className="group-hover:translate-x-0.5 transition-transform"
                        />
                    </p>
                </div>
            </div>

            {/* Leave Category Distribution Card */}
            <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300 space-y-5 sm:space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100 pb-4 sm:pb-5">
                    <div>
                        <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                            <PieIcon size={18} className="text-indigo-600 shrink-0" />
                            <span>Leave Category Breakdown</span>
                        </h2>
                        <p className="text-xs font-medium text-slate-500 mt-0.5">
                            Proportional allocation across company policies (click any category to filter requests).
                        </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/60 self-start sm:self-auto font-mono">
                        <Layers size={14} className="text-indigo-600 shrink-0" />
                        <span>{stats.byType.length} Classification Types</span>
                    </div>
                </div>

                {stats.byType.length === 0 ? (
                    <div className="py-20 text-center text-xs font-medium text-slate-400">
                        No leave application records logged in the database.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-center pt-2">
                        {/* Donut Chart with Center Display */}
                        <div className="lg:col-span-5 flex items-center justify-center">
                            <div className="h-56 w-56 sm:h-64 sm:w-64 relative flex items-center justify-center">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={stats.byType}
                                            innerRadius={68}
                                            outerRadius={95}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {stats.byType.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<CustomChartTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
                                        {stats.total.toLocaleString()}
                                    </span>
                                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                        Applications
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Category Breakdown Progress Bars */}
                        <div className="lg:col-span-7 space-y-3">
                            {stats.byType.map((item) => {
                                const percentage =
                                    stats.total > 0
                                        ? ((item.value / stats.total) * 100).toFixed(1)
                                        : "0.0";

                                return (
                                    <div
                                        key={item.name}
                                        onClick={() =>
                                            router.push(
                                                `/leave/requests?type=${encodeURIComponent(
                                                    item.name.toLowerCase()
                                                )}`
                                            )
                                        }
                                        className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/80 hover:bg-indigo-50/50 border border-slate-200/60 hover:border-indigo-200 transition-all duration-200 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 group shadow-2xs hover:shadow-xs active:scale-95"
                                    >
                                        <div className="flex items-center gap-2.5 min-w-[140px] truncate">
                                            <span
                                                className="w-3 h-3 rounded-full shadow-xs shrink-0"
                                                style={{ backgroundColor: item.color }}
                                            />
                                            <span className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition-colors truncate">
                                                {item.name} LEAVE
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-3 sm:gap-4 flex-1 sm:max-w-xs justify-between sm:justify-end">
                                            <div className="flex-1 h-2 sm:h-2.5 bg-slate-200/70 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all duration-500"
                                                    style={{
                                                        width: `${percentage}%`,
                                                        backgroundColor: item.color,
                                                    }}
                                                />
                                            </div>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <span className="text-xs font-black text-slate-900 font-mono w-16 text-right">
                                                    {item.value}{" "}
                                                    <span className="text-[10px] text-slate-400 font-normal">
                                                        ({percentage}%)
                                                    </span>
                                                </span>
                                                <ArrowUpRight
                                                    size={14}
                                                    className="text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-transform"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}