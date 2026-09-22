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
    ArrowUpRight
} from "lucide-react";
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid
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

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const ALLOWED_ROLES = ["admin", "hr", "manager", "team_lead", "lead"];

// Target route: change to "/reports/employees" if you renamed the folder, otherwise "/reports/employee"
const EMPLOYEE_REPORTS_ROUTE = "/reports/employee";
const PAYROLL_REPORTS_ROUTE = "/reports/payroll";

function CustomChartTooltip({ active, payload, label, prefix = "", suffix = "" }) {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-900/95 backdrop-blur-md text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-slate-800 text-xs space-y-1 animate-in fade-in zoom-in-95 duration-150">
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
        <div className="min-h-[80vh] w-full flex flex-col items-center justify-center p-6 text-center">
            <div className="bg-rose-50/60 p-5 rounded-3xl border border-rose-100 mb-4 shadow-sm">
                <ShieldAlert size={40} className="text-rose-500" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Access Denied</h1>
            <p className="text-xs font-medium text-slate-500 mt-1 max-w-sm">
                Your role (<span className="font-bold text-slate-700 capitalize">{role || "Guest"}</span>) does not have permission to view workforce intelligence.
            </p>
            <button
                onClick={() => router.push("/dashboard")}
                className="mt-6 inline-flex items-center justify-center px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-200 transition-all active:scale-95 cursor-pointer"
            >
                Back to Dashboard
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
        if (typeof raw === "object" && raw !== null) return (raw.name || raw.title || "").toLowerCase().trim();
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

    const fetchAnalytics = useCallback(async (isManual = false) => {
        if (isManual) setRefreshing(true);
        else setLoading(true);
        setErrorMsg(null);

        try {
            const [empRepRes, payRepRes, empListRes] = await Promise.allSettled([
                api.get("/reports/employee"),
                api.get("/reports/payroll", { params: { year: currentYear } }),
                api.get("/employees")
            ]);

            const empData = empRepRes.status === "fulfilled" ? empRepRes.value?.data || {} : {};
            const payrollData = payRepRes.status === "fulfilled" ? payRepRes.value?.data || {} : {};
            const rawEmployees = empListRes.status === "fulfilled" ? extractList(empListRes.value?.data) : [];

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
                    if (typeof emp.department === "string" && emp.department.trim()) dName = emp.department.trim();
                    else if (emp.department?.name) dName = emp.department.name.trim();
                    counts[dName] = (counts[dName] || 0) + 1;
                });
                departmentBreakdown = Object.entries(counts).map(([name, count]) => ({ name, count }));
            }

            const monthlyTotals = payrollData.monthlyTotals || payrollData.data?.monthlyTotals || {};
            const costTrend = Object.entries(monthlyTotals)
                .sort((a, b) => Number(a[0]) - Number(b[0]))
                .map(([month, cost]) => ({
                    month: MONTH_LABELS[Number(month) - 1] || `M${month}`,
                    cost: Number(cost),
                }));

            const activeCount = empData.activeEmployees ?? rawEmployees.filter(e => (e.status || "active").toLowerCase() === "active").length;
            const exitedCount = empData.exitedEmployees ?? rawEmployees.filter(e => ["inactive", "exited", "terminated"].includes((e.status || "").toLowerCase())).length;
            const totalStaff = empData.totalEmployees ?? (rawEmployees.length > 0 ? rawEmployees.length : activeCount + exitedCount);

            const retentionRate = totalStaff > 0
                ? ((activeCount / totalStaff) * 100).toFixed(1)
                : "100.0";

            setData({
                totalStaff,
                activeStaff: activeCount,
                exitedStaff: exitedCount,
                totalSalaryExpense: payrollData.totalPayrollCost || payrollData.totalCost || 0,
                retentionRate,
                departmentBreakdown,
                costTrend,
            });
        } catch (err) {
            console.error("HR analytics fetch error:", err);
            setErrorMsg("Unable to synchronize complete telemetry records from backend services.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [currentYear]);

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
        toast.success("Workforce analytics snapshot exported successfully!");
    };

    if (!roleChecked) {
        return (
            <div className="min-h-[600px] w-full flex flex-col items-center justify-center space-y-3">
                <Loader2 size={38} className="animate-spin text-indigo-600" />
                <p className="text-xs font-bold tracking-wider text-slate-600 uppercase">
                    Verifying access credentials...
                </p>
            </div>
        );
    }

    if (!hasAccess) {
        return <AccessDeniedScreen role={currentRole} router={router} />;
    }

    if (loading) {
        return (
            <div className="min-h-[600px] w-full flex flex-col items-center justify-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center animate-pulse">
                    <Loader2 size={28} className="animate-spin text-indigo-600" />
                </div>
                <p className="text-sm font-bold text-slate-800">Aggregating Human Capital Metrics</p>
                <p className="text-xs text-slate-400">Compiling multi-department payroll and roster records...</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-3 lg:px-4 py-4 space-y-6 antialiased font-sans text-slate-900">

            {/* Top Header Card */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300">
                <div>
                    <div className="flex items-center gap-2.5">
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                            Workforce Intelligence
                        </h1>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60 shadow-xs">
                            <Activity size={13} className="animate-pulse text-indigo-600" /> Live Analytics
                        </span>
                    </div>
                    <p className="text-sm font-medium text-slate-500 mt-1 max-w-2xl">
                        Real-time organizational telemetry, active headcounts, attrition ratios, and fiscal payroll expenditure.
                    </p>
                </div>

                <div className="flex items-center gap-3 self-start md:self-auto">
                    <button
                        type="button"
                        onClick={() => fetchAnalytics(true)}
                        disabled={refreshing}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-slate-200 text-slate-700 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 text-xs font-bold transition-all duration-200 shadow-2xs active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                        <RefreshCw size={14} className={refreshing ? "animate-spin text-indigo-600" : ""} />
                        <span>Sync Telemetry</span>
                    </button>

                    <button
                        type="button"
                        onClick={exportSummaryReport}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-100 transition-all duration-200 hover:shadow-md active:scale-95 cursor-pointer"
                    >
                        <Download size={14} />
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

            {/* KPI Highlight Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

                {/* 1. Total Strength */}
                <div
                    onClick={() => router.push(EMPLOYEE_REPORTS_ROUTE)}
                    className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-indigo-300 hover:-translate-y-1.5 transition-all duration-300 ease-out group cursor-pointer flex flex-col justify-between"
                >
                    <div>
                        <div className="flex items-center justify-between mb-3.5">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shadow-2xs">
                                <Users size={22} />
                            </div>
                            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 group-hover:text-indigo-600 transition-colors">
                                Total Pool
                            </span>
                        </div>
                        <div>
                            <div className="text-3xl font-black tracking-tight text-slate-900 font-mono">
                                {data?.totalStaff || 0}
                            </div>
                            <p className="text-xs font-semibold text-emerald-600 mt-1 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                {data?.activeStaff || 0} active personnel on record
                            </p>
                        </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500 group-hover:text-indigo-600 transition-colors">
                        <span>View employee directory</span>
                        <ArrowUpRight size={14} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-indigo-600" />
                    </div>
                </div>

                {/* 2. Staff Retention */}
                <div
                    onClick={() => router.push(EMPLOYEE_REPORTS_ROUTE)}
                    className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-emerald-300 hover:-translate-y-1.5 transition-all duration-300 ease-out group cursor-pointer flex flex-col justify-between"
                >
                    <div>
                        <div className="flex items-center justify-between mb-3.5">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300 shadow-2xs">
                                <TrendingUp size={22} />
                            </div>
                            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 group-hover:text-emerald-600 transition-colors">
                                Stability
                            </span>
                        </div>
                        <div>
                            <div className="text-3xl font-black tracking-tight text-slate-900 font-mono">
                                {data?.retentionRate}%
                            </div>
                            <p className="text-xs font-medium text-slate-500 mt-1">
                                Active vs historical headcounts
                            </p>
                        </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500 group-hover:text-emerald-600 transition-colors">
                        <span>Inspect workforce stability</span>
                        <ArrowUpRight size={14} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-emerald-600" />
                    </div>
                </div>

                {/* 3. Payroll Expenses */}
                <div
                    onClick={() => router.push(PAYROLL_REPORTS_ROUTE)}
                    className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-cyan-300 hover:-translate-y-1.5 transition-all duration-300 ease-out group cursor-pointer flex flex-col justify-between"
                >
                    <div>
                        <div className="flex items-center justify-between mb-3.5">
                            <div className="w-12 h-12 rounded-2xl bg-cyan-50 border border-cyan-100 flex items-center justify-center text-cyan-600 group-hover:bg-cyan-600 group-hover:text-white transition-all duration-300 shadow-2xs">
                                <DollarSign size={22} />
                            </div>
                            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 group-hover:text-cyan-600 transition-colors">
                                Disbursements
                            </span>
                        </div>
                        <div>
                            <div className="text-3xl font-black tracking-tight text-slate-900 font-mono">
                                ₹{((data?.totalSalaryExpense || 0) / 100000).toFixed(2)}L
                            </div>
                            <p className="text-xs font-medium text-slate-500 mt-1">
                                Fiscal {currentYear} disbursements
                            </p>
                        </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500 group-hover:text-cyan-600 transition-colors">
                        <span>Open payroll analytics</span>
                        <ArrowUpRight size={14} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-cyan-600" />
                    </div>
                </div>

                {/* 4. Divisions */}
                <div
                    onClick={() => router.push(EMPLOYEE_REPORTS_ROUTE)}
                    className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-violet-300 hover:-translate-y-1.5 transition-all duration-300 ease-out group cursor-pointer flex flex-col justify-between"
                >
                    <div>
                        <div className="flex items-center justify-between mb-3.5">
                            <div className="w-12 h-12 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-600 group-hover:bg-violet-600 group-hover:text-white transition-all duration-300 shadow-2xs">
                                <Building2 size={22} />
                            </div>
                            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 group-hover:text-violet-600 transition-colors">
                                Divisions
                            </span>
                        </div>
                        <div>
                            <div className="text-3xl font-black tracking-tight text-slate-900 font-mono">
                                {data?.departmentBreakdown?.length || 0}
                            </div>
                            <p className="text-xs font-medium text-slate-500 mt-1">
                                Operational department units
                            </p>
                        </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500 group-hover:text-violet-600 transition-colors">
                        <span>View department distribution</span>
                        <ArrowUpRight size={14} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-violet-600" />
                    </div>
                </div>

            </div>

            {/* Chart & Trend Section */}
            <div
                onClick={() => router.push(PAYROLL_REPORTS_ROUTE)}
                className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer group"
            >
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2 group-hover:text-indigo-600 transition-colors">
                            <BarChart3 size={20} className="text-indigo-600" />
                            Fiscal Payroll Trajectory
                            <ArrowUpRight size={16} className="text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">Click chart to view monthly ledger entries and salary slips.</p>
                    </div>
                    <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full font-mono">
                        {currentYear} Run Rate
                    </span>
                </div>

                <div className="h-72 w-full">
                    {data?.costTrend?.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                            No payroll data points recorded for this fiscal year yet.
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data?.costTrend || []}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#64748B" }} />
                                <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                                <Tooltip content={<CustomChartTooltip prefix="₹" />} />
                                <Area type="monotone" dataKey="cost" stroke={PALETTE.primary} strokeWidth={3} fill={PALETTE.primary} fillOpacity={0.1} />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

        </div>
    );
}