"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Users,
    UserCheck,
    Briefcase,
    RefreshCw,
    Download,
    Loader2,
    Sparkles,
    Layers,
    PieChart as PieIcon,
    Award,
    ArrowUpRight,
    ShieldAlert
} from "lucide-react";
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
} from "recharts";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const GENDER_COLORS = ["#4F46E5", "#EC4899", "#F59E0B", "#10B981", "#6366F1"];

// Roles allowed to view employee statistics. Adjust if your role names differ.
const ALLOWED_ROLES = ["admin", "hr"];

function CustomChartTooltip({ active, payload, label, suffix = "" }) {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-900/95 backdrop-blur-md text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-slate-800 text-xs space-y-1 animate-in fade-in zoom-in-95 duration-150">
                <p className="font-semibold text-slate-400 truncate">{label || payload[0]?.name}</p>
                <p className="text-sm font-black text-white font-mono tracking-tight">
                    {Number(payload[0]?.value || 0).toLocaleString()} {suffix}
                </p>
            </div>
        );
    }
    return null;
}

function AccessDeniedScreen({ role, router }) {
    return (
        <div className="w-full min-h-[600px] flex flex-col items-center justify-center gap-4 px-4 text-center">
            <div className="w-20 h-20 rounded-3xl bg-rose-50 border border-rose-100 flex items-center justify-center">
                <ShieldAlert size={38} className="text-rose-500" />
            </div>
            <div className="space-y-1.5">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                    Access Denied
                </h2>
                <p className="text-sm font-medium text-slate-500 max-w-xs">
                    Your role ({role || "employee"}) does not have permission to access this page.
                </p>
            </div>
            <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-bold shadow-sm shadow-indigo-200 transition-all duration-200 hover:shadow-md hover:shadow-indigo-300 active:scale-95"
            >
                Back to Dashboard
            </button>
        </div>
    );
}

export default function EmployeeStatisticsPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        departments: [],
        genderData: [],
        designations: [],
    });

    const role = user?.role?.toLowerCase() || null;
    const roleChecked = !authLoading;
    const hasAccess = role && ALLOWED_ROLES.includes(role);

    const fetchStats = useCallback(async (isManual = false) => {
        if (isManual) setRefreshing(true);
        else setLoading(true);

        try {
            const res = await api.get("/employees");
            const employees = Array.isArray(res?.data) ? res.data : [];

            const deptMap = {};
            const genderMap = {};
            const desigMap = {};

            employees.forEach((emp) => {
                const dept = emp.department?.name || emp.department || "General";
                const gender = emp.gender || "Not Specified";
                const desig = emp.designation || emp.role || "Staff";

                deptMap[dept] = (deptMap[dept] || 0) + 1;
                genderMap[gender] = (genderMap[gender] || 0) + 1;
                desigMap[desig] = (desigMap[desig] || 0) + 1;
            });

            setStats({
                total: employees.length,
                active: employees.filter((e) => e.status === "active").length,
                departments: Object.entries(deptMap)
                    .map(([name, count]) => ({ name, count }))
                    .sort((a, b) => b.count - a.count),
                genderData: Object.entries(genderMap)
                    .map(([name, value]) => ({ name, value }))
                    .sort((a, b) => b.value - a.value),
                designations: Object.entries(desigMap)
                    .map(([name, count]) => ({ name, count }))
                    .sort((a, b) => b.count - a.count),
            });
        } catch (err) {
            console.error("Employee stats load error:", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        if (roleChecked && hasAccess) {
            fetchStats();
        } else if (roleChecked) {
            setLoading(false);
        }
    }, [roleChecked, hasAccess, fetchStats]);

    const activePercentage = useMemo(() => {
        return stats.total > 0 ? ((stats.active / stats.total) * 100).toFixed(1) : "0.0";
    }, [stats.total, stats.active]);

    const handleExportStats = () => {
        const payload = {
            generatedAt: new Date().toISOString(),
            metrics: {
                totalStrength: stats.total,
                activeHeadcount: stats.active,
                activeRate: `${activePercentage}%`,
                departmentsCount: stats.departments.length,
            },
            departments: stats.departments,
            demographics: stats.genderData,
            designations: stats.designations,
        };

        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `employee-demographics-report-${new Date().toISOString().split("T")[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    // Wait until we know the role before deciding what to render
    if (!roleChecked) {
        return (
            <div className="w-full min-h-[600px] flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 size={38} className="animate-spin text-indigo-600" />
                <p className="text-xs font-bold tracking-wider text-slate-600 uppercase">
                    Verifying access...
                </p>
            </div>
        );
    }

    if (!hasAccess) {
        return <AccessDeniedScreen role={role} router={router} />;
    }

    if (loading) {
        return (
            <div className="w-full min-h-[600px] flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 size={38} className="animate-spin text-indigo-600" />
                <p className="text-xs font-bold tracking-wider text-slate-600 uppercase">
                    Compiling Employee Telemetry...
                </p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-3 lg:px-4 py-4 space-y-3 antialiased transition-all duration-300">
            {/* Top Control Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/85 shadow-xs hover:shadow-md transition-all duration-300">
                <div>
                    <div className="flex items-center gap-2.5">
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                            Workforce Statistics
                        </h1>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/70 shadow-xs">
                            <Sparkles size={13} className="text-indigo-600" /> Live Demographics
                        </span>
                    </div>
                    <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
                        Comprehensive organizational distribution across departments, roles, and demographic markers.
                    </p>
                </div>

                <div className="flex items-center gap-3 self-start sm:self-auto">
                    <button
                        type="button"
                        onClick={() => fetchStats(true)}
                        disabled={refreshing}
                        className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80 text-xs font-bold transition-all shadow-xs active:scale-95 disabled:opacity-60"
                        title="Sync dataset"
                    >
                        <RefreshCw size={15} className={refreshing ? "animate-spin text-indigo-600" : ""} />
                        <span>Sync</span>
                    </button>

                    <button
                        type="button"
                        onClick={handleExportStats}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold shadow-sm shadow-indigo-200 transition-all duration-200 hover:shadow-md hover:shadow-indigo-300 active:scale-95"
                    >
                        <Download size={15} />
                        <span>Export Snapshot</span>
                    </button>
                </div>
            </div>

            {/* Counter Summary Cards (Linked to /employees and /employees?status=active) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Total Strength -> /employees */}
                <div
                    onClick={() => router.push("/employees")}
                    className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all duration-300 cursor-pointer group flex items-center justify-between"
                >
                    <div>
                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider group-hover:text-indigo-600 transition-colors">
                            Total Strength
                        </span>
                        <h3 className="text-3xl font-black text-slate-900 font-mono mt-1">
                            {stats.total.toLocaleString()}
                        </h3>
                        <p className="text-xs font-semibold text-slate-500 mt-0.5 flex items-center gap-1">
                            Recorded personnel profiles <ArrowUpRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-indigo-600" />
                        </p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100/80 shadow-xs group-hover:scale-110 transition-transform duration-300">
                        <Users size={22} />
                    </div>
                </div>

                {/* Active Roster -> /employees?status=active */}
                <div
                    onClick={() => router.push("/employees?status=active")}
                    className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all duration-300 cursor-pointer group flex items-center justify-between"
                >
                    <div>
                        <span className="text-[11px] font-black text-emerald-600 uppercase tracking-wider">
                            Active Roster
                        </span>
                        <h3 className="text-3xl font-black text-slate-900 font-mono mt-1">
                            {stats.active.toLocaleString()}
                        </h3>
                        <p className="text-xs font-semibold text-emerald-600 mt-0.5 flex items-center gap-1">
                            {activePercentage}% operational activity rate <ArrowUpRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                        </p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100/80 shadow-xs group-hover:scale-110 transition-transform duration-300">
                        <UserCheck size={22} />
                    </div>
                </div>

                {/* Functional Units -> /organization/departments */}
                <div
                    onClick={() => router.push("/organization/departments")}
                    className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md hover:border-violet-300 transition-all duration-300 cursor-pointer group flex items-center justify-between"
                >
                    <div>
                        <span className="text-[11px] font-black text-violet-600 uppercase tracking-wider">
                            Functional Units
                        </span>
                        <h3 className="text-3xl font-black text-slate-900 font-mono mt-1">
                            {stats.departments.length}
                        </h3>
                        <p className="text-xs font-semibold text-slate-500 mt-0.5 flex items-center gap-1">
                            Active departmental branches <ArrowUpRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-violet-600" />
                        </p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center border border-violet-100/80 shadow-xs group-hover:scale-110 transition-transform duration-300">
                        <Briefcase size={22} />
                    </div>
                </div>
            </div>

            {/* Visual Analytics Dual Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Department Distribution Bar Chart */}
                <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between space-y-5">
                    <div className="border-b border-slate-100 pb-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                                <Layers size={18} className="text-indigo-600" />
                                Departmental Split
                            </h2>
                            <span className="text-[11px] font-bold text-slate-600 bg-slate-50 px-3 py-1 rounded-xl border border-slate-200/60 font-mono">
                                {stats.departments.length} Units
                            </span>
                        </div>
                        <p className="text-xs font-medium text-slate-500 mt-0.5">
                            Employee allocation across operational business units (Click bar to filter)
                        </p>
                    </div>

                    {!stats.departments.length ? (
                        <div className="py-20 text-center text-xs font-medium text-slate-400">
                            No departmental affiliations logged in database.
                        </div>
                    ) : (
                        <div className="h-64 w-full pt-1">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={stats.departments}
                                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                                    onClick={(e) => {
                                        if (e && e.activePayload && e.activePayload.length) {
                                            const deptName = e.activePayload[0].payload.name;
                                            router.push(`/employees?department=${encodeURIComponent(deptName)}`);
                                        }
                                    }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                    <XAxis
                                        dataKey="name"
                                        tick={{ fontSize: 11, fill: "#64748B", fontWeight: 600 }}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        allowDecimals={false}
                                        tick={{ fontSize: 11, fill: "#94A3B8", fontWeight: 500 }}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <Tooltip content={<CustomChartTooltip suffix="Members" />} />
                                    <Bar
                                        dataKey="count"
                                        fill="#4F46E5"
                                        radius={[10, 10, 0, 0]}
                                        className="cursor-pointer hover:opacity-85 transition-opacity"
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                {/* Demographics Ratio Donut Chart */}
                <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between space-y-5">
                    <div className="border-b border-slate-100 pb-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                                <PieIcon size={18} className="text-indigo-600" />
                                Demographics Ratio
                            </h2>
                            <span className="text-[11px] font-bold text-slate-600 bg-slate-50 px-3 py-1 rounded-xl border border-slate-200/60 font-mono">
                                Total: {stats.total}
                            </span>
                        </div>
                        <p className="text-xs font-medium text-slate-500 mt-0.5">
                            Gender representation and diversity parameters
                        </p>
                    </div>

                    {!stats.genderData.length ? (
                        <div className="py-20 text-center text-xs font-medium text-slate-400">
                            No demographic entries recorded.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="h-44 w-full flex items-center justify-center relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={stats.genderData}
                                            innerRadius={55}
                                            outerRadius={78}
                                            paddingAngle={6}
                                            dataKey="value"
                                        >
                                            {stats.genderData.map((_, index) => (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={GENDER_COLORS[index % GENDER_COLORS.length]}
                                                />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<CustomChartTooltip suffix="Employees" />} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-2xl font-black text-slate-900 font-mono">
                                        {stats.total}
                                    </span>
                                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                        Total
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-3 border-t border-slate-100">
                                {stats.genderData.map((item, idx) => {
                                    const percent = stats.total > 0 ? ((item.value / stats.total) * 100).toFixed(1) : 0;
                                    return (
                                        <div
                                            key={item.name}
                                            onClick={() => router.push(`/employees?gender=${encodeURIComponent(item.name)}`)}
                                            className="p-3 rounded-2xl bg-slate-50/80 hover:bg-indigo-50/50 border border-slate-200/60 hover:border-indigo-200 transition-all duration-200 cursor-pointer flex flex-col items-center text-center group"
                                        >
                                            <div className="flex items-center gap-1.5 mb-0.5">
                                                <span
                                                    className="w-2.5 h-2.5 rounded-full shadow-xs"
                                                    style={{ backgroundColor: GENDER_COLORS[idx % GENDER_COLORS.length] }}
                                                />
                                                <span className="text-[11px] font-bold text-slate-700 capitalize truncate max-w-[90px] group-hover:text-indigo-600 transition-colors">
                                                    {item.name}
                                                </span>
                                            </div>
                                            <div className="text-xs font-black text-slate-900 font-mono">
                                                {item.value}{" "}
                                                <span className="text-[10px] text-slate-400 font-normal">({percent}%)</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Role / Designation Distribution Grid (Clickable Cards) */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-300 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                        <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                            <Award size={18} className="text-indigo-600" />
                            Role & Designation Spectrum
                        </h2>
                        <p className="text-xs font-medium text-slate-500 mt-0.5">
                            Workforce headcount distributed across specific job designations (Click card to filter roster)
                        </p>
                    </div>
                    <span className="text-[11px] font-bold text-slate-600 bg-slate-50 px-3 py-1 rounded-xl border border-slate-200/60 font-mono">
                        {stats.designations.length} Roles
                    </span>
                </div>

                {!stats.designations.length ? (
                    <div className="py-12 text-center text-xs font-medium text-slate-400">
                        No designation assignments recorded.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                        {stats.designations.map((item) => (
                            <div
                                key={item.name}
                                onClick={() => router.push(`/employees?search=${encodeURIComponent(item.name)}`)}
                                className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/80 hover:bg-indigo-50/60 border border-slate-200/60 hover:border-indigo-200 transition-all duration-200 cursor-pointer group shadow-2xs hover:shadow-xs active:scale-95"
                            >
                                <span className="text-xs font-bold text-slate-800 truncate pr-2 group-hover:text-indigo-600 transition-colors">
                                    {item.name}
                                </span>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="text-xs font-black text-indigo-700 bg-indigo-50 group-hover:bg-indigo-600 group-hover:text-white border border-indigo-200/60 px-2.5 py-1 rounded-xl font-mono transition-colors">
                                        {item.count}
                                    </span>
                                    <ArrowUpRight size={14} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}