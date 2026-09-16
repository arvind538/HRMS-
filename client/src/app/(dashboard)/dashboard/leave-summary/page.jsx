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
    ShieldCheck
} from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import api from "@/lib/api";

const TYPE_COLORS = ["#4F46E5", "#06B6D4", "#8B5CF6", "#F59E0B", "#EC4899", "#10B981"];

function CustomChartTooltip({ active, payload }) {
    if (active && payload && payload.length) {
        const item = payload[0];
        return (
            <div className="bg-slate-900/95 backdrop-blur-md text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-slate-800 text-xs space-y-1 animate-in fade-in zoom-in-95 duration-150">
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

    const fetchLeaves = useCallback(async (isManual = false) => {
        if (isManual) setRefreshing(true);
        else setLoading(true);

        try {
            const res = await api.get("/leave");
            setLeaves(Array.isArray(res?.data) ? res.data : []);
        } catch (err) {
            console.error("Leave summary fetch error:", err);
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
        const approved = leaves.filter((l) => l.status === "approved").length;
        const pending = leaves.filter((l) => l.status === "pending").length;
        const rejected = leaves.filter((l) => l.status === "rejected").length;

        const approvalRate = total > 0 ? ((approved / total) * 100).toFixed(1) : "0.0";

        const typeMap = {};
        leaves.forEach((l) => {
            const type = l.leaveType ? l.leaveType.toUpperCase() : "OTHER";
            typeMap[type] = (typeMap[type] || 0) + 1;
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
                approved: stats.approved,
                pending: stats.pending,
                rejected: stats.rejected,
                approvalRate: `${stats.approvalRate}%`,
            },
            typeBreakdown: stats.byType,
        };

        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `leave-distribution-summary-${new Date().toISOString().split("T")[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    if (loading) {
        return (
            <div className="w-full min-h-[600px] flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 size={38} className="animate-spin text-indigo-600" />
                <p className="text-xs font-bold tracking-wider text-slate-600 uppercase">
                    Compiling Leave Analytics...
                </p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-6 antialiased transition-all duration-300">
            {/* Control Header Card */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-300">
                <div>
                    <div className="flex items-center gap-2.5">
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                            Leave Distribution Matrix
                        </h1>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/70 shadow-xs">
                            <Sparkles size={13} className="text-indigo-600" /> Live Telemetry
                        </span>
                    </div>
                    <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
                        Real-time status breakdown, category distribution, and approval throughput metrics.
                    </p>
                </div>

                <div className="flex items-center gap-3 self-start sm:self-auto">
                    <button
                        type="button"
                        onClick={() => fetchLeaves(true)}
                        disabled={refreshing}
                        className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80 text-xs font-bold transition-all shadow-xs active:scale-95 disabled:opacity-60"
                        title="Sync dataset"
                    >
                        <RefreshCw size={15} className={refreshing ? "animate-spin text-indigo-600" : ""} />
                        <span>Sync</span>
                    </button>

                    <button
                        type="button"
                        onClick={handleExportSummary}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold shadow-sm shadow-indigo-200 transition-all duration-200 hover:shadow-md hover:shadow-indigo-300 active:scale-95"
                    >
                        <Download size={15} />
                        <span>Export Snapshot</span>
                    </button>
                </div>
            </div>

            {/* Top 4 KPI Metrics with Specific Route Mapping */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Logs -> /leave */}
                <div
                    onClick={() => router.push("/leave")}
                    className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all duration-300 cursor-pointer group"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 group-hover:scale-110 transition-transform duration-300">
                            <Calendar size={22} />
                        </div>
                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider group-hover:text-indigo-600 transition-colors">Total Logs</span>
                    </div>
                    <h3 className="text-3xl font-black text-slate-900 font-mono">{stats.total.toLocaleString()}</h3>
                    <p className="text-xs font-semibold text-slate-500 mt-1 flex items-center gap-1">
                        Applications Submitted <ArrowUpRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-indigo-600" />
                    </p>
                </div>

                {/* Approved -> /leave/requests?status=approved */}
                <div
                    onClick={() => router.push("/leave/requests?status=approved")}
                    className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all duration-300 cursor-pointer group"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 group-hover:scale-110 transition-transform duration-300">
                            <CheckCircle2 size={22} />
                        </div>
                        <span className="text-[11px] font-black text-emerald-600 uppercase tracking-wider">Approved</span>
                    </div>
                    <h3 className="text-3xl font-black text-slate-900 font-mono">{stats.approved.toLocaleString()}</h3>
                    <p className="text-xs font-semibold text-emerald-600 mt-1 flex items-center gap-1">
                        <TrendingUp size={12} /> {stats.approvalRate}% endorsement rate <ArrowUpRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </p>
                </div>

                {/* Pending -> /leave/approval (Approval workflow page) */}
                <div
                    onClick={() => router.push("/leave/approval")}
                    className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md hover:border-amber-300 transition-all duration-300 cursor-pointer group"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 group-hover:scale-110 transition-transform duration-300">
                            <Clock size={22} />
                        </div>
                        <span className="text-[11px] font-black text-amber-600 uppercase tracking-wider">In Review</span>
                    </div>
                    <h3 className="text-3xl font-black text-slate-900 font-mono">{stats.pending.toLocaleString()}</h3>
                    <p className="text-xs font-semibold text-amber-600 mt-1 flex items-center gap-1">
                        Pending Approval <ArrowUpRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </p>
                </div>

                {/* Rejected -> /leave/requests?status=rejected */}
                <div
                    onClick={() => router.push("/leave/requests?status=rejected")}
                    className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md hover:border-rose-300 transition-all duration-300 cursor-pointer group"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 group-hover:scale-110 transition-transform duration-300">
                            <XCircle size={22} />
                        </div>
                        <span className="text-[11px] font-black text-rose-500 uppercase tracking-wider">Declined</span>
                    </div>
                    <h3 className="text-3xl font-black text-slate-900 font-mono">{stats.rejected.toLocaleString()}</h3>
                    <p className="text-xs font-semibold text-rose-500 mt-1 flex items-center gap-1">
                        Rejected Requests <ArrowUpRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </p>
                </div>
            </div>

            {/* Leave Type Distribution Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-300 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-5">
                    <div>
                        <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                            <PieIcon size={20} className="text-indigo-600" />
                            Leave Category Breakdown
                        </h2>
                        <p className="text-xs font-medium text-slate-500 mt-0.5">
                            Proportional share and total volume categorized by leave policies (Click category to view requests)
                        </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-slate-50 px-3.5 py-1.5 rounded-xl border border-slate-200/60 self-start sm:self-auto font-mono">
                        <Layers size={14} className="text-indigo-600" />
                        <span>{stats.byType.length} Classification Types</span>
                    </div>
                </div>

                {stats.byType.length === 0 ? (
                    <div className="py-24 text-center text-xs font-medium text-slate-400">
                        No leave application records logged in the system.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-2">
                        {/* Donut Chart with Center Metric */}
                        <div className="lg:col-span-5 flex items-center justify-center">
                            <div className="h-64 w-64 relative flex items-center justify-center">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={stats.byType}
                                            innerRadius={72}
                                            outerRadius={100}
                                            paddingAngle={6}
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
                                    <span className="text-3xl font-black text-slate-900 font-mono">
                                        {stats.total}
                                    </span>
                                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                        Applications
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* List & Progress Visual Bars (Redirects to /leave/requests?type=...) */}
                        <div className="lg:col-span-7 space-y-3.5">
                            {stats.byType.map((item) => {
                                const percentage = stats.total > 0 ? ((item.value / stats.total) * 100).toFixed(1) : 0;
                                return (
                                    <div
                                        key={item.name}
                                        onClick={() => router.push(`/leave/requests?type=${encodeURIComponent(item.name.toLowerCase())}`)}
                                        className="p-4 rounded-2xl bg-slate-50/80 hover:bg-indigo-50/50 border border-slate-200/60 hover:border-indigo-200 transition-all duration-200 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group shadow-2xs"
                                    >
                                        <div className="flex items-center gap-3 min-w-[150px]">
                                            <span
                                                className="w-3.5 h-3.5 rounded-full shadow-xs shrink-0"
                                                style={{ backgroundColor: item.color }}
                                            />
                                            <span className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                                                {item.name} LEAVE
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-4 flex-1 sm:max-w-xs justify-end">
                                            <div className="flex-1 h-2.5 bg-slate-200/70 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all duration-500"
                                                    style={{ width: `${percentage}%`, backgroundColor: item.color }}
                                                />
                                            </div>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <span className="text-xs font-black text-slate-900 font-mono w-16 text-right">
                                                    {item.value}{" "}
                                                    <span className="text-[10px] text-slate-400 font-normal">({percentage}%)</span>
                                                </span>
                                                <ArrowUpRight size={14} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
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