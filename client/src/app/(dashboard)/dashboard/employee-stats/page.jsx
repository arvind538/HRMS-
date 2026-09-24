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
    ShieldAlert,
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
const ALLOWED_ROLES = ["admin", "hr"];

function CustomChartTooltip({ active, payload, label, suffix = "" }) {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-900/95 backdrop-blur-md text-white px-3.5 py-2.5 rounded-2xl shadow-xl border border-slate-800 text-xs space-y-1">
                <p className="font-semibold text-slate-400 truncate">
                    {label || payload[0]?.name}
                </p>
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
        <div className="w-full min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4 text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-rose-50 border border-rose-100 flex items-center justify-center shadow-xs">
                <ShieldAlert size={36} className="text-rose-500" />
            </div>
            <div className="space-y-1">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Access Denied
                </h2>
                <p className="text-xs sm:text-sm font-medium text-slate-500 max-w-sm">
                    Your current account role (
                    <span className="font-bold text-slate-700 capitalize">
                        {role || "Employee"}
                    </span>
                    ) does not have authorization to access workforce demographic reports.
                </p>
            </div>
            <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="mt-2 inline-flex items-center justify-center px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs sm:text-sm font-bold shadow-sm shadow-indigo-200 transition-all duration-200 hover:shadow-md active:scale-95 cursor-pointer"
            >
                Return to Dashboard
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
    const hasAccess = Boolean(role && ALLOWED_ROLES.includes(role));

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
                const dept = emp.department?.name || emp.department || "General Division";
                const gender = emp.gender || "Unspecified";
                const desig = emp.designation || emp.role || "Staff Member";

                deptMap[dept] = (deptMap[dept] || 0) + 1;
                genderMap[gender] = (genderMap[gender] || 0) + 1;
                desigMap[desig] = (desigMap[desig] || 0) + 1;
            });

            setStats({
                total: employees.length,
                active: employees.filter((e) => (e.status || "").toLowerCase() === "active").length,
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
            console.error("Failed to load employee statistics:", err);
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
                totalWorkforce: stats.total,
                activePersonnel: stats.active,
                activityRate: `${activePercentage}%`,
                totalDepartments: stats.departments.length,
                totalRoles: stats.designations.length,
            },
            departmentDistribution: stats.departments,
            demographics: stats.genderData,
            designations: stats.designations,
        };

        const blob = new Blob([JSON.stringify(payload, null, 2)], {
            type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `workforce-demographics-${new Date().toISOString().split("T")[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    if (!roleChecked) {
        return (
            <div className="w-full min-h-[500px] flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 size={36} className="animate-spin text-indigo-600" />
                <p className="text-xs font-bold tracking-wider text-slate-600 uppercase">
                    Verifying security clearance...
                </p>
            </div>
        );
    }

    if (!hasAccess) {
        return <AccessDeniedScreen role={role} router={router} />;
    }

    if (loading) {
        return (
            <div className="w-full min-h-[500px] flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 size={36} className="animate-spin text-indigo-600" />
                <p className="text-xs font-bold tracking-wider text-slate-600 uppercase">
                    Compiling Workforce Demographics...
                </p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 antialiased font-sans text-slate-900">
            {/* Header Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-7 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs">
                <div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                            Workforce Demographics
                        </h1>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/70 shadow-2xs">
                            <Sparkles size={13} className="text-indigo-600 shrink-0" />
                            Live Analytics
                        </span>
                    </div>
                    <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1 max-w-2xl">
                        Detailed organizational telemetry showing departmental allocations, gender diversity distribution, and role designations.
                    </p>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                    <button
                        type="button"
                        onClick={() => fetchStats(true)}
                        disabled={refreshing}
                        className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl sm:rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition-all shadow-2xs active:scale-95 disabled:opacity-60 cursor-pointer"
                        title="Refresh statistics"
                    >
                        <RefreshCw
                            size={14}
                            className={refreshing ? "animate-spin text-indigo-600 shrink-0" : "shrink-0"}
                        />
                        <span>Sync</span>
                    </button>

                    <button
                        type="button"
                        onClick={handleExportStats}
                        className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl sm:rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold shadow-sm shadow-indigo-100 transition-all hover:shadow-md active:scale-95 cursor-pointer"
                    >
                        <Download size={14} className="shrink-0" />
                        <span>Export Report</span>
                    </button>
                </div>
            </div>

            {/* Top 3 Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
                {/* Total Strength */}
                <div
                    onClick={() => router.push("/employees")}
                    className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-indigo-300 hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex items-center justify-between"
                >
                    <div>
                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider group-hover:text-indigo-600 transition-colors">
                            Total Workforce
                        </span>
                        <h3 className="text-2xl sm:text-3xl font-black text-slate-900 font-mono mt-1">
                            {stats.total.toLocaleString()}
                        </h3>
                        <p className="text-xs font-semibold text-slate-500 mt-1 flex items-center gap-1">
                            <span>View full directory</span>
                            <ArrowUpRight
                                size={14}
                                className="opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-indigo-600"
                            />
                        </p>
                    </div>
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100/80 shadow-xs group-hover:scale-105 transition-transform">
                        <Users size={20} className="sm:w-[22px] sm:h-[22px]" />
                    </div>
                </div>

                {/* Active Roster */}
                <div
                    onClick={() => router.push("/employees?status=active")}
                    className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-emerald-300 hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex items-center justify-between"
                >
                    <div>
                        <span className="text-[11px] font-black text-emerald-600 uppercase tracking-wider">
                            Active Roster
                        </span>
                        <h3 className="text-2xl sm:text-3xl font-black text-slate-900 font-mono mt-1">
                            {stats.active.toLocaleString()}
                        </h3>
                        <p className="text-xs font-semibold text-emerald-600 mt-1 flex items-center gap-1">
                            <span>{activePercentage}% active status</span>
                            <ArrowUpRight
                                size={14}
                                className="opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"
                            />
                        </p>
                    </div>
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100/80 shadow-xs group-hover:scale-105 transition-transform">
                        <UserCheck size={20} className="sm:w-[22px] sm:h-[22px]" />
                    </div>
                </div>

                {/* Functional Units */}
                <div
                    onClick={() => router.push("/organization/departments")}
                    className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-violet-300 hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex items-center justify-between sm:col-span-2 lg:col-span-1"
                >
                    <div>
                        <span className="text-[11px] font-black text-violet-600 uppercase tracking-wider">
                            Departments
                        </span>
                        <h3 className="text-2xl sm:text-3xl font-black text-slate-900 font-mono mt-1">
                            {stats.departments.length}
                        </h3>
                        <p className="text-xs font-semibold text-slate-500 mt-1 flex items-center gap-1">
                            <span>Operating branches</span>
                            <ArrowUpRight
                                size={14}
                                className="opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-violet-600"
                            />
                        </p>
                    </div>
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center border border-violet-100/80 shadow-xs group-hover:scale-105 transition-transform">
                        <Briefcase size={20} className="sm:w-[22px] sm:h-[22px]" />
                    </div>
                </div>
            </div>

            {/* Dual Analytics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Department Allocation Chart */}
                <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-7 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 sm:space-y-5">
                    <div className="border-b border-slate-100 pb-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                                <Layers size={18} className="text-indigo-600 shrink-0" />
                                Department Breakdown
                            </h2>
                            <span className="text-[11px] font-bold text-slate-600 bg-slate-50 px-2.5 sm:px-3 py-1 rounded-xl border border-slate-200/60 font-mono shrink-0">
                                {stats.departments.length} Units
                            </span>
                        </div>
                        <p className="text-xs font-medium text-slate-500 mt-0.5">
                            Staff distribution across units (click a bar to filter employees)
                        </p>
                    </div>

                    {!stats.departments.length ? (
                        <div className="py-16 text-center text-xs font-medium text-slate-400">
                            No department records found in database.
                        </div>
                    ) : (
                        <div className="h-64 sm:h-72 w-full pt-1 select-none">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={stats.departments}
                                    margin={{ top: 10, right: 10, left: -20, bottom: 25 }}
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
                                        interval={0}
                                        angle={-20}
                                        textAnchor="end"
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
                                        radius={[8, 8, 0, 0]}
                                        className="cursor-pointer hover:opacity-80 transition-opacity"
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                {/* Gender Demographics Chart */}
                <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-7 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 sm:space-y-5">
                    <div className="border-b border-slate-100 pb-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                                <PieIcon size={18} className="text-indigo-600 shrink-0" />
                                Gender Demographics
                            </h2>
                            <span className="text-[11px] font-bold text-slate-600 bg-slate-50 px-2.5 sm:px-3 py-1 rounded-xl border border-slate-200/60 font-mono shrink-0">
                                Total: {stats.total}
                            </span>
                        </div>
                        <p className="text-xs font-medium text-slate-500 mt-0.5">
                            Workforce diversity and gender balance distribution
                        </p>
                    </div>

                    {!stats.genderData.length ? (
                        <div className="py-16 text-center text-xs font-medium text-slate-400">
                            No demographic records registered.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="h-44 sm:h-48 w-full flex items-center justify-center relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={stats.genderData}
                                            innerRadius={50}
                                            outerRadius={74}
                                            paddingAngle={5}
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
                                        Staff
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5 pt-3 border-t border-slate-100">
                                {stats.genderData.map((item, idx) => {
                                    const percent =
                                        stats.total > 0
                                            ? ((item.value / stats.total) * 100).toFixed(1)
                                            : "0.0";
                                    return (
                                        <div
                                            key={item.name}
                                            onClick={() =>
                                                router.push(`/employees?gender=${encodeURIComponent(item.name)}`)
                                            }
                                            className="p-2.5 sm:p-3 rounded-2xl bg-slate-50/80 hover:bg-indigo-50/50 border border-slate-200/60 hover:border-indigo-200 transition-all cursor-pointer flex flex-col items-center text-center group"
                                        >
                                            <div className="flex items-center gap-1.5 mb-1 max-w-full">
                                                <span
                                                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                                                    style={{
                                                        backgroundColor:
                                                            GENDER_COLORS[idx % GENDER_COLORS.length],
                                                    }}
                                                />
                                                <span className="text-[11px] font-bold text-slate-700 capitalize truncate group-hover:text-indigo-600 transition-colors">
                                                    {item.name}
                                                </span>
                                            </div>
                                            <div className="text-xs font-black text-slate-900 font-mono">
                                                {item.value}{" "}
                                                <span className="text-[10px] text-slate-400 font-normal">
                                                    ({percent}%)
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Role Spectrum Grid */}
            <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-7 border border-slate-200/80 shadow-xs hover:shadow-md transition-all space-y-4 sm:space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                        <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                            <Award size={18} className="text-indigo-600 shrink-0" />
                            Role & Designation Breakdown
                        </h2>
                        <p className="text-xs font-medium text-slate-500 mt-0.5">
                            Workforce headcount categorized by specific roles (click any role to filter)
                        </p>
                    </div>
                    <span className="text-[11px] font-bold text-slate-600 bg-slate-50 px-2.5 sm:px-3 py-1 rounded-xl border border-slate-200/60 font-mono shrink-0">
                        {stats.designations.length} Roles
                    </span>
                </div>

                {!stats.designations.length ? (
                    <div className="py-12 text-center text-xs font-medium text-slate-400">
                        No designations registered in system.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-3.5">
                        {stats.designations.map((item) => (
                            <div
                                key={item.name}
                                onClick={() =>
                                    router.push(`/employees?search=${encodeURIComponent(item.name)}`)
                                }
                                className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-slate-50/80 hover:bg-indigo-50/60 border border-slate-200/60 hover:border-indigo-200 transition-all duration-200 cursor-pointer group shadow-2xs hover:shadow-xs active:scale-95"
                            >
                                <span className="text-xs font-bold text-slate-800 truncate pr-2 group-hover:text-indigo-600 transition-colors">
                                    {item.name}
                                </span>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="text-xs font-black text-indigo-700 bg-indigo-50 group-hover:bg-indigo-600 group-hover:text-white border border-indigo-200/60 px-2.5 py-0.5 rounded-xl font-mono transition-colors">
                                        {item.count}
                                    </span>
                                    <ArrowUpRight
                                        size={14}
                                        className="text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all shrink-0"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}