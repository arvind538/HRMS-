// src/app/(dashboard)/reports/hr/page.jsx
"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Users,
    TrendingUp,
    DollarSign,
    RefreshCw,
    Building2,
    Download,
    Loader2,
    AlertCircle,
    BarChart3,
    Activity,
    ShieldAlert,
    ArrowUpRight,
} from "lucide-react";
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
} from "recharts";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "react-toastify";

const PALETTE = {
    primary: "#4F46E5",
    secondary: "#06B6D4",
    violet: "#8B5CF6",
    amber: "#F59E0B",
    emerald: "#10B981",
    rose: "#F43F5E",
};

const MONTH_LABELS = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
];
const ALLOWED_ROLES = ["admin", "hr", "manager", "team_lead", "lead"];

const EMPLOYEE_REPORTS_ROUTE = "/reports/employee";
const PAYROLL_REPORTS_ROUTE = "/reports/payroll";

function CustomChartTooltip({ active, payload, label, prefix = "", suffix = "" }) {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-900/95 backdrop-blur-md text-white px-3.5 py-2.5 rounded-2xl shadow-xl border border-slate-800 text-xs space-y-1">
                <p className="font-semibold text-slate-400">{label}</p>
                <p className="text-sm font-black text-white font-mono tracking-tight">
                    {prefix}
                    {Number(payload[0].value).toLocaleString()}
                    {suffix}
                </p>
            </div>
        );
    }
    return null;
}

function AccessDeniedScreen({ role, router }) {
    return (
        <div className="min-h-[70vh] w-full flex flex-col items-center justify-center p-6 text-center">
            <div className="bg-rose-50/70 p-5 rounded-3xl border border-rose-100 mb-4 shadow-sm">
                <ShieldAlert size={40} className="text-rose-500" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Access Denied
            </h1>
            <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1 max-w-sm">
                Your designated role (
                <span className="font-bold text-slate-700 capitalize">
                    {role || "Guest"}
                </span>
                ) does not have authorization to access human capital analytics.
            </p>
            <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="mt-6 inline-flex items-center justify-center px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold shadow-md shadow-indigo-200 transition-all active:scale-95 cursor-pointer"
            >
                Return to Dashboard
            </button>
        </div>
    );
}

export default function HRAnalyticsPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);

    const currentYear = useMemo(() => new Date().getFullYear(), []);

    const currentRole = useMemo(() => {
        if (!user) return null;
        const raw = user.role || user.userRole || user.type;
        if (typeof raw === "string") return raw.toLowerCase().trim();
        if (typeof raw === "object" && raw !== null) {
            return (raw.name || raw.title || "").toLowerCase().trim();
        }
        return null;
    }, [user]);

    const roleChecked = !authLoading;
    const hasAccess = Boolean(currentRole && ALLOWED_ROLES.includes(currentRole));

    const extractList = (resData) => {
        if (!resData) return [];
        if (Array.isArray(resData)) return resData;
        if (Array.isArray(resData.employees)) return resData.employees;
        if (Array.isArray(resData.data)) return resData.data;
        if (Array.isArray(resData.records)) return resData.records;
        return [];
    };

    const fetchAnalytics = useCallback(
        async (isManual = false) => {
            if (isManual) setRefreshing(true);
            else setLoading(true);
            setErrorMsg(null);

            try {
                const [empRepRes, payRepRes, empListRes] = await Promise.allSettled([
                    api.get("/reports/employee"),
                    api.get("/reports/payroll", { params: { year: currentYear } }),
                    api.get("/employees"),
                ]);

                const empData =
                    empRepRes.status === "fulfilled" ? empRepRes.value?.data || {} : {};
                const payrollData =
                    payRepRes.status === "fulfilled" ? payRepRes.value?.data || {} : {};
                const rawEmployees =
                    empListRes.status === "fulfilled"
                        ? extractList(empListRes.value?.data)
                        : [];

                let departmentBreakdown = [];
                const byDept = empData.byDepartment || empData.data?.byDepartment;

                if (byDept && typeof byDept === "object" && !Array.isArray(byDept)) {
                    departmentBreakdown = Object.entries(byDept).map(([name, count]) => ({
                        name: name || "Unassigned",
                        count: Number(count) || 0,
                    }));
                } else if (rawEmployees.length > 0) {
                    const counts = {};
                    rawEmployees.forEach((emp) => {
                        let dName = "Unassigned";
                        if (typeof emp.department === "string" && emp.department.trim()) {
                            dName = emp.department.trim();
                        } else if (emp.department?.name) {
                            dName = emp.department.name.trim();
                        }
                        counts[dName] = (counts[dName] || 0) + 1;
                    });
                    departmentBreakdown = Object.entries(counts).map(([name, count]) => ({
                        name,
                        count,
                    }));
                }

                const monthlyTotals =
                    payrollData.monthlyTotals ||
                    payrollData.data?.monthlyTotals ||
                    {};
                const costTrend = Object.entries(monthlyTotals)
                    .sort((a, b) => Number(a[0]) - Number(b[0]))
                    .map(([month, cost]) => ({
                        month: MONTH_LABELS[Number(month) - 1] || `M${month}`,
                        cost: Number(cost),
                    }));

                const activeCount =
                    empData.activeEmployees ??
                    rawEmployees.filter(
                        (e) => (e.status || "active").toLowerCase() === "active"
                    ).length;
                const exitedCount =
                    empData.exitedEmployees ??
                    rawEmployees.filter((e) =>
                        ["inactive", "exited", "terminated"].includes(
                            (e.status || "").toLowerCase()
                        )
                    ).length;
                const totalStaff =
                    empData.totalEmployees ??
                    (rawEmployees.length > 0
                        ? rawEmployees.length
                        : activeCount + exitedCount);

                const retentionRate =
                    totalStaff > 0
                        ? ((activeCount / totalStaff) * 100).toFixed(1)
                        : "100.0";

                setData({
                    totalStaff,
                    activeStaff: activeCount,
                    exitedStaff: exitedCount,
                    totalSalaryExpense:
                        payrollData.totalPayrollCost || payrollData.totalCost || 0,
                    retentionRate,
                    departmentBreakdown,
                    costTrend,
                });
            } catch (err) {
                console.error("HR analytics fetch error:", err);
                setErrorMsg(
                    "Unable to synchronize analytics telemetry from core services."
                );
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [currentYear]
    );

    useEffect(() => {
        if (roleChecked && hasAccess) {
            fetchAnalytics();
        } else if (roleChecked) {
            setLoading(false);
        }
    }, [roleChecked, hasAccess, fetchAnalytics]);

    const exportSummaryReport = () => {
        if (!data) return;
        const reportSnapshot = {
            generatedAt: new Date().toISOString(),
            fiscalYear: currentYear,
            summary: {
                totalHeadcount: data.totalStaff,
                activeWorkforce: data.activeStaff,
                retentionRate: `${data.retentionRate}%`,
                totalPayrollAnnual: `₹${data.totalSalaryExpense}`,
            },
            departments: data.departmentBreakdown,
            monthlyExpenditure: data.costTrend,
        };

        const blob = new Blob([JSON.stringify(reportSnapshot, null, 2)], {
            type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Workforce-Intelligence-${currentYear}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Workforce intelligence report exported successfully.");
    };

    if (!roleChecked) {
        return (
            <div className="min-h-[500px] w-full flex flex-col items-center justify-center space-y-3">
                <Loader2 size={36} className="animate-spin text-indigo-600" />
                <p className="text-xs font-bold tracking-wider text-slate-600 uppercase">
                    Verifying security credentials...
                </p>
            </div>
        );
    }

    if (!hasAccess) {
        return <AccessDeniedScreen role={currentRole} router={router} />;
    }

    if (loading) {
        return (
            <div className="min-h-[500px] w-full flex flex-col items-center justify-center space-y-3">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center animate-pulse">
                    <Loader2 size={26} className="animate-spin text-indigo-600" />
                </div>
                <p className="text-sm font-bold text-slate-800">
                    Compiling Workforce Metrics
                </p>
                <p className="text-xs text-slate-400 text-center max-w-xs sm:max-w-md">
                    Synchronizing cross-department headcounts and payroll records...
                </p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 antialiased font-sans text-slate-900">
            {/* Executive Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-7 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs">
                <div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                            Workforce Intelligence
                        </h1>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60 shadow-2xs">
                            <Activity size={13} className="animate-pulse text-indigo-600 shrink-0" />
                            Live Telemetry
                        </span>
                    </div>
                    <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1 max-w-2xl">
                        Real-time organizational analytics, active staffing distribution, stability ratios, and fiscal payroll expenditure.
                    </p>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                    <button
                        type="button"
                        onClick={() => fetchAnalytics(true)}
                        disabled={refreshing}
                        className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl sm:rounded-2xl border border-slate-200 text-slate-700 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 text-xs font-bold transition-all shadow-2xs active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                        <RefreshCw
                            size={14}
                            className={refreshing ? "animate-spin text-indigo-600 shrink-0" : "shrink-0"}
                        />
                        <span>Sync Data</span>
                    </button>

                    <button
                        type="button"
                        onClick={exportSummaryReport}
                        className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl sm:rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold shadow-sm shadow-indigo-100 transition-all hover:shadow-md active:scale-95 cursor-pointer"
                    >
                        <Download size={14} className="shrink-0" />
                        <span>Export Snapshot</span>
                    </button>
                </div>
            </div>

            {errorMsg && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-semibold flex items-center gap-3 shadow-xs">
                    <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
                    <span>{errorMsg}</span>
                </div>
            )}

            {/* Primary KPI Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
                {/* Metric 1: Total Headcount */}
                <div
                    onClick={() => router.push(EMPLOYEE_REPORTS_ROUTE)}
                    className="bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-indigo-300 hover:-translate-y-1 transition-all duration-300 group cursor-pointer flex flex-col justify-between"
                >
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shadow-2xs">
                                <Users size={20} className="sm:w-[22px] sm:h-[22px]" />
                            </div>
                            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 group-hover:text-indigo-600 transition-colors">
                                Workforce
                            </span>
                        </div>
                        <div>
                            <div className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 font-mono">
                                {(data?.totalStaff || 0).toLocaleString()}
                            </div>
                            <p className="text-xs font-semibold text-emerald-600 mt-1 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                                {(data?.activeStaff || 0).toLocaleString()} active staff on roster
                            </p>
                        </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500 group-hover:text-indigo-600 transition-colors">
                        <span>View employee directory</span>
                        <ArrowUpRight
                            size={14}
                            className="text-indigo-600 group-hover:translate-x-0.5 transition-transform"
                        />
                    </div>
                </div>

                {/* Metric 2: Retention Rate */}
                <div
                    onClick={() => router.push(EMPLOYEE_REPORTS_ROUTE)}
                    className="bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-emerald-300 hover:-translate-y-1 transition-all duration-300 group cursor-pointer flex flex-col justify-between"
                >
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300 shadow-2xs">
                                <TrendingUp size={20} className="sm:w-[22px] sm:h-[22px]" />
                            </div>
                            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 group-hover:text-emerald-600 transition-colors">
                                Retention
                            </span>
                        </div>
                        <div>
                            <div className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 font-mono">
                                {data?.retentionRate}%
                            </div>
                            <p className="text-xs font-medium text-slate-500 mt-1">
                                Active versus historical roster
                            </p>
                        </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500 group-hover:text-emerald-600 transition-colors">
                        <span>Inspect retention stability</span>
                        <ArrowUpRight
                            size={14}
                            className="text-emerald-600 group-hover:translate-x-0.5 transition-transform"
                        />
                    </div>
                </div>

                {/* Metric 3: Payroll Expenditure */}
                <div
                    onClick={() => router.push(PAYROLL_REPORTS_ROUTE)}
                    className="bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-cyan-300 hover:-translate-y-1 transition-all duration-300 group cursor-pointer flex flex-col justify-between"
                >
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-cyan-50 border border-cyan-100 flex items-center justify-center text-cyan-600 group-hover:bg-cyan-600 group-hover:text-white transition-all duration-300 shadow-2xs">
                                <DollarSign size={20} className="sm:w-[22px] sm:h-[22px]" />
                            </div>
                            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 group-hover:text-cyan-600 transition-colors">
                                Payroll
                            </span>
                        </div>
                        <div>
                            <div className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 font-mono">
                                ₹{((data?.totalSalaryExpense || 0) / 100000).toFixed(2)}L
                            </div>
                            <p className="text-xs font-medium text-slate-500 mt-1">
                                Fiscal {currentYear} total expenditure
                            </p>
                        </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500 group-hover:text-cyan-600 transition-colors">
                        <span>Open payroll analytics</span>
                        <ArrowUpRight
                            size={14}
                            className="text-cyan-600 group-hover:translate-x-0.5 transition-transform"
                        />
                    </div>
                </div>

                {/* Metric 4: Department Count */}
                <div
                    onClick={() => router.push(EMPLOYEE_REPORTS_ROUTE)}
                    className="bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-violet-300 hover:-translate-y-1 transition-all duration-300 group cursor-pointer flex flex-col justify-between"
                >
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-600 group-hover:bg-violet-600 group-hover:text-white transition-all duration-300 shadow-2xs">
                                <Building2 size={20} className="sm:w-[22px] sm:h-[22px]" />
                            </div>
                            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 group-hover:text-violet-600 transition-colors">
                                Departments
                            </span>
                        </div>
                        <div>
                            <div className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 font-mono">
                                {data?.departmentBreakdown?.length || 0}
                            </div>
                            <p className="text-xs font-medium text-slate-500 mt-1">
                                Active operational divisions
                            </p>
                        </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500 group-hover:text-violet-600 transition-colors">
                        <span>View department breakdown</span>
                        <ArrowUpRight
                            size={14}
                            className="text-violet-600 group-hover:translate-x-0.5 transition-transform"
                        />
                    </div>
                </div>
            </div>

            {/* Chart Section */}
            <div
                onClick={() => router.push(PAYROLL_REPORTS_ROUTE)}
                className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer group"
            >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-5 sm:mb-6">
                    <div>
                        <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2 group-hover:text-indigo-600 transition-colors">
                            <BarChart3 size={18} className="text-indigo-600 shrink-0" />
                            <span>Payroll Expenditure Trajectory</span>
                            <ArrowUpRight
                                size={16}
                                className="text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-transform shrink-0"
                            />
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Click anywhere on the chart to inspect monthly ledger records and salary statements.
                        </p>
                    </div>
                    <span className="self-start sm:self-auto text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full font-mono">
                        Fiscal Year {currentYear}
                    </span>
                </div>

                <div className="h-64 sm:h-72 w-full select-none">
                    {!data?.costTrend || data.costTrend.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                            No payroll data points available for this fiscal period.
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                                data={data.costTrend}
                                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                            >
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    vertical={false}
                                    stroke="#F1F5F9"
                                />
                                <XAxis
                                    dataKey="month"
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fontSize: 11, fill: "#64748B", fontWeight: 600 }}
                                    dy={8}
                                />
                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fontSize: 11, fill: "#94A3B8", fontWeight: 500 }}
                                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                                />
                                <Tooltip content={<CustomChartTooltip prefix="₹" />} />
                                <Area
                                    type="monotone"
                                    dataKey="cost"
                                    stroke={PALETTE.primary}
                                    strokeWidth={2.5}
                                    fill={PALETTE.primary}
                                    fillOpacity={0.12}
                                    activeDot={{
                                        r: 5,
                                        stroke: PALETTE.primary,
                                        strokeWidth: 2,
                                        fill: "#ffffff",
                                    }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>
        </div>
    );
}