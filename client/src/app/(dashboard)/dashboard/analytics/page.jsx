"use client";

import React, { useEffect, useState, useMemo } from "react";
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
    PieChart as PieIcon,
    Activity,
    Calendar,
    ShieldAlert
} from "lucide-react";
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid
} from "recharts";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const PALETTE = {
    primary: "#4F46E5",
    secondary: "#06B6D4",
    violet: "#8B5CF6",
    amber: "#F59E0B",
    emerald: "#10B981",
    rose: "#F43F5E",
};

const PIE_COLORS = [PALETTE.primary, PALETTE.rose, PALETTE.secondary, PALETTE.amber];
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Roles allowed to view HR analytics. Adjust if your role names differ.
const ALLOWED_ROLES = ["admin", "hr"];

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
                Your role (<span className="font-bold text-slate-700 capitalize">{role || "Guest"}</span>) does not have permission to access this page.
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

    const role = user?.role?.toLowerCase() || null;
    const roleChecked = !authLoading;
    const hasAccess = role && ALLOWED_ROLES.includes(role);

    useEffect(() => {
        if (roleChecked && hasAccess) {
            fetchAnalytics();
        } else if (roleChecked) {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roleChecked, hasAccess]);

    const fetchAnalytics = async (isManual = false) => {
        if (isManual) setRefreshing(true);
        else setLoading(true);
        setErrorMsg(null);

        try {
            const [empRes, payrollRes] = await Promise.all([
                api.get("/reports/employee"),
                api.get("/reports/payroll", { params: { year: currentYear } }),
            ]);

            const empData = empRes.data || {};
            const payrollData = payrollRes.data || {};

            const byDept = empData.byDepartment || {};
            const departmentBreakdown = Object.entries(byDept).map(([name, count]) => ({
                name,
                count: Number(count),
            }));

            const monthlyTotals = payrollData.monthlyTotals || {};
            const costTrend = Object.entries(monthlyTotals)
                .sort((a, b) => Number(a[0]) - Number(b[0]))
                .map(([month, cost]) => ({
                    month: MONTH_LABELS[Number(month) - 1] || `M${month}`,
                    cost: Number(cost),
                }));

            const activeCount = empData.activeEmployees || 0;
            const exitedCount = empData.exitedEmployees || 0;
            const statusBreakdown = [
                { name: "Active Staff", value: activeCount },
                { name: "Exited Personnel", value: exitedCount },
            ].filter((item) => item.value > 0);

            const totalStaff = empData.totalEmployees || activeCount + exitedCount;
            const retentionRate = totalStaff > 0
                ? ((activeCount / totalStaff) * 100).toFixed(1)
                : "0.0";

            setData({
                totalStaff,
                activeStaff: activeCount,
                exitedStaff: exitedCount,
                totalSalaryExpense: payrollData.totalPayrollCost || 0,
                retentionRate,
                departmentBreakdown,
                costTrend,
                statusBreakdown,
            });
        } catch (err) {
            setErrorMsg(
                err.response?.data?.message ||
                "Unable to synchronize analytics telemetry from reporting services."
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const exportSummaryReport = () => {
        if (!data) return;
        const reportSnapshot = {
            generatedAt: new Date().toISOString(),
            summary: {
                headcount: data.totalStaff,
                active: data.activeStaff,
                retentionRate: `${data.retentionRate}%`,
                totalPayrollAnnual: data.totalSalaryExpense,
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
        a.download = `HR-Workforce-Analytics-${currentYear}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Wait until we know the role before deciding what to render
    if (!roleChecked) {
        return (
            <div className="min-h-[600px] w-full flex flex-col items-center justify-center space-y-3">
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
            <div className="min-h-[600px] w-full flex flex-col items-center justify-center space-y-3">
                <Loader2 size={38} className="animate-spin text-indigo-600" />
                <p className="text-sm font-bold text-slate-800">Aggregating Human Capital Metrics</p>
                <p className="text-xs text-slate-400">Compiling multi-department payroll and roster records...</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-3 lg:px-4 py-4 space-y-3 antialiased transition-all duration-300">
            {/* Top Header Card */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-300">
                <div>
                    <div className="flex items-center gap-2.5">
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                            Workforce Intelligence
                        </h1>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60 shadow-xs">
                            <Activity size={13} className="animate-pulse text-indigo-600" /> Live Dashboard
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
                        className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-2xl border border-slate-200/80 text-slate-700 hover:bg-slate-50 hover:border-slate-300 hover:text-indigo-600 text-xs font-bold transition-all duration-200 shadow-xs active:scale-95 disabled:opacity-50"
                    >
                        <RefreshCw size={15} className={refreshing ? "animate-spin text-indigo-600" : ""} />
                        <span>Sync Telemetry</span>
                    </button>

                    <button
                        type="button"
                        onClick={exportSummaryReport}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-200 transition-all duration-200 hover:shadow-md hover:shadow-indigo-300 active:scale-95"
                    >
                        <Download size={15} />
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

            {/* KPI Highlight Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-300 group">
                    <div className="flex items-center justify-between">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                            <Users size={22} />
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Total Strength</span>
                    </div>
                    <div className="mt-4">
                        <div className="text-3xl font-black tracking-tight text-slate-900 font-mono">
                            {data?.totalStaff || 0}
                        </div>
                        <p className="text-xs font-semibold text-emerald-600 mt-1 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            {data?.activeStaff || 0} active personnel on record
                        </p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all duration-300 group">
                    <div className="flex items-center justify-between">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                            <TrendingUp size={22} />
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Staff Retention</span>
                    </div>
                    <div className="mt-4">
                        <div className="text-3xl font-black tracking-tight text-slate-900 font-mono">
                            {data?.retentionRate}%
                        </div>
                        <p className="text-xs font-medium text-slate-500 mt-1">
                            Active vs historical headcounts
                        </p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-cyan-200 transition-all duration-300 group">
                    <div className="flex items-center justify-between">
                        <div className="w-12 h-12 rounded-2xl bg-cyan-50 border border-cyan-100 flex items-center justify-center text-cyan-600 group-hover:scale-110 transition-transform">
                            <DollarSign size={22} />
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Payroll ({currentYear})</span>
                    </div>
                    <div className="mt-4">
                        <div className="text-3xl font-black tracking-tight text-slate-900 font-mono">
                            ₹{((data?.totalSalaryExpense || 0) / 100000).toFixed(2)}L
                        </div>
                        <p className="text-xs font-medium text-slate-500 mt-1">
                            Year-to-date gross disbursements
                        </p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-violet-200 transition-all duration-300 group">
                    <div className="flex items-center justify-between">
                        <div className="w-12 h-12 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-600 group-hover:scale-110 transition-transform">
                            <Building2 size={22} />
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Divisions</span>
                    </div>
                    <div className="mt-4">
                        <div className="text-3xl font-black tracking-tight text-slate-900 font-mono">
                            {data?.departmentBreakdown?.length || 0}
                        </div>
                        <p className="text-xs font-medium text-slate-500 mt-1">
                            Active operational departments
                        </p>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm">
                <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2 mb-4">
                    <BarChart3 size={20} className="text-indigo-600" />
                    Fiscal Payroll Trajectory
                </h2>
                <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data?.costTrend || []}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                            <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#64748B" }} />
                            <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                            <Tooltip content={<CustomChartTooltip prefix="₹" />} />
                            <Area type="monotone" dataKey="cost" stroke={PALETTE.primary} strokeWidth={3} fill={PALETTE.primary} fillOpacity={0.1} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}