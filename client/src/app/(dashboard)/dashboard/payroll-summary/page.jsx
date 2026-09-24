"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    DollarSign,
    Wallet,
    ArrowDownRight,
    CheckCircle2,
    RefreshCw,
    Download,
    Loader2,
    Sparkles,
    Calendar,
    TrendingUp,
    Receipt,
    CreditCard,
    ArrowUpRight,
    ShieldAlert,
} from "lucide-react";
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
} from "recharts";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const MONTH_NAMES = [
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

const ALLOWED_ROLES = ["admin", "hr"];

function CustomChartTooltip({ active, payload, label }) {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-900/95 backdrop-blur-md text-white px-3.5 py-2.5 rounded-2xl shadow-xl border border-slate-800 text-xs space-y-1">
                <p className="font-semibold text-slate-400">{label}</p>
                <p className="text-sm font-black text-white font-mono tracking-tight">
                    ₹{Number(payload[0]?.value || 0).toLocaleString("en-IN")}
                </p>
                <p className="text-[10px] text-slate-400 font-medium">Net Disbursed</p>
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
                    Your account role (
                    <span className="font-bold text-slate-700 capitalize">
                        {role || "Employee"}
                    </span>
                    ) does not have permission to access payroll intelligence.
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

export default function PayrollSummaryPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [payrolls, setPayrolls] = useState([]);
    const [year, setYear] = useState(() => new Date().getFullYear());

    const role = user?.role?.toLowerCase() || null;
    const roleChecked = !authLoading;
    const hasAccess = Boolean(role && ALLOWED_ROLES.includes(role));

    const fetchPayrollSummary = useCallback(
        async (isManual = false) => {
            if (isManual) setRefreshing(true);
            else setLoading(true);

            try {
                const res = await api.get("/payroll", { params: { year } });
                setPayrolls(Array.isArray(res?.data) ? res.data : []);
            } catch (err) {
                console.error("Payroll summary error:", err);
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [year]
    );

    useEffect(() => {
        if (roleChecked && hasAccess) {
            fetchPayrollSummary();
        } else if (roleChecked) {
            setLoading(false);
        }
    }, [roleChecked, hasAccess, fetchPayrollSummary]);

    const totalGross = useMemo(
        () => payrolls.reduce((acc, p) => acc + (p.grossSalary || 0), 0),
        [payrolls]
    );
    const totalDeductions = useMemo(
        () => payrolls.reduce((acc, p) => acc + (p.totalDeductions || 0), 0),
        [payrolls]
    );
    const totalNet = useMemo(
        () => payrolls.reduce((acc, p) => acc + (p.netSalary || 0), 0),
        [payrolls]
    );
    const paidCount = useMemo(
        () => payrolls.filter((p) => p.status === "paid").length,
        [payrolls]
    );

    const paidPercentage = useMemo(() => {
        return payrolls.length > 0
            ? ((paidCount / payrolls.length) * 100).toFixed(1)
            : "0.0";
    }, [paidCount, payrolls.length]);

    const monthlyData = useMemo(() => {
        const monthMap = {};
        MONTH_NAMES.forEach((m) => {
            monthMap[m] = { month: m, amount: 0 };
        });

        payrolls.forEach((p) => {
            const m = p.month ? MONTH_NAMES[p.month - 1] : "Other";
            if (monthMap[m]) {
                monthMap[m].amount += p.netSalary || 0;
            }
        });

        return Object.values(monthMap);
    }, [payrolls]);

    const handleExportSnapshot = () => {
        const payload = {
            fiscalYear: year,
            generatedAt: new Date().toISOString(),
            metrics: {
                totalGrossExpenditure: totalGross,
                totalStatutoryDeductions: totalDeductions,
                totalNetDisbursed: totalNet,
                settledStatementsCount: paidCount,
                settledStatementsRate: `${paidPercentage}%`,
                totalStatements: payrolls.length,
            },
            monthlyBreakdown: monthlyData,
        };

        const blob = new Blob([JSON.stringify(payload, null, 2)], {
            type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `payroll-fiscal-summary-${year}-${new Date().toISOString().split("T")[0]
            }.json`;
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
                    Compiling Payroll Intelligence...
                </p>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 antialiased font-sans text-slate-900">
            {/* Control Header Card */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-7 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs">
                <div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                            Fiscal Payroll Analytics
                        </h1>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/70 shadow-2xs">
                            <Sparkles size={13} className="text-indigo-600 shrink-0" /> FY {year}
                        </span>
                    </div>
                    <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1 max-w-2xl">
                        Gross compensation obligations, statutory withholdings, and monthly salary disbursement metrics.
                    </p>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-xl sm:rounded-2xl px-3 py-2 shadow-2xs">
                        <Calendar size={15} className="text-indigo-600 shrink-0" />
                        <input
                            type="number"
                            value={year}
                            onChange={(e) => setYear(Number(e.target.value))}
                            className="bg-transparent text-xs font-bold text-slate-700 w-16 focus:outline-none font-mono"
                            min="2000"
                            max="2100"
                        />
                    </div>

                    <button
                        type="button"
                        onClick={() => fetchPayrollSummary(true)}
                        disabled={refreshing}
                        className="p-2.5 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80 text-xs font-bold transition-all shadow-2xs active:scale-95 disabled:opacity-60 cursor-pointer inline-flex items-center justify-center gap-2"
                        title="Sync dataset"
                    >
                        <RefreshCw
                            size={14}
                            className={
                                refreshing ? "animate-spin text-indigo-600 shrink-0" : "shrink-0"
                            }
                        />
                        <span className="hidden sm:inline">Sync</span>
                    </button>

                    <button
                        type="button"
                        onClick={handleExportSnapshot}
                        className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl sm:rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold shadow-sm shadow-indigo-100 transition-all hover:shadow-md active:scale-95 cursor-pointer"
                    >
                        <Download size={14} className="shrink-0" />
                        <span>Export Snapshot</span>
                    </button>
                </div>
            </div>

            {/* Primary KPI Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
                {/* Gross Total */}
                <div
                    onClick={() => router.push(`/payroll?year=${year}`)}
                    className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-indigo-300 hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex flex-col justify-between"
                >
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100/80 shadow-2xs group-hover:scale-105 transition-transform">
                                <Wallet size={20} className="sm:w-[22px] sm:h-[22px]" />
                            </div>
                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider group-hover:text-indigo-600 transition-colors">
                                Gross Total
                            </span>
                        </div>
                        <h3 className="text-2xl sm:text-3xl font-black text-slate-900 font-mono truncate">
                            ₹{totalGross.toLocaleString("en-IN")}
                        </h3>
                    </div>
                    <p className="text-xs font-semibold text-slate-500 mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span>Pre-deduction allocation</span>
                        <ArrowUpRight
                            size={14}
                            className="text-indigo-600 group-hover:translate-x-0.5 transition-transform"
                        />
                    </p>
                </div>

                {/* Withholdings */}
                <div
                    onClick={() => router.push(`/payroll?year=${year}&type=deductions`)}
                    className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-rose-300 hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex flex-col justify-between"
                >
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100/80 shadow-2xs group-hover:scale-105 transition-transform">
                                <ArrowDownRight size={20} className="sm:w-[22px] sm:h-[22px]" />
                            </div>
                            <span className="text-[11px] font-black text-rose-500 uppercase tracking-wider">
                                Withholdings
                            </span>
                        </div>
                        <h3 className="text-2xl sm:text-3xl font-black text-slate-900 font-mono truncate">
                            ₹{totalDeductions.toLocaleString("en-IN")}
                        </h3>
                    </div>
                    <p className="text-xs font-semibold text-rose-500 mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span>Taxes, PF & Insurance</span>
                        <ArrowUpRight
                            size={14}
                            className="group-hover:translate-x-0.5 transition-transform"
                        />
                    </p>
                </div>

                {/* Net Outflow */}
                <div
                    onClick={() => router.push(`/payroll?year=${year}&status=paid`)}
                    className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-emerald-300 hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex flex-col justify-between"
                >
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100/80 shadow-2xs group-hover:scale-105 transition-transform">
                                <DollarSign size={20} className="sm:w-[22px] sm:h-[22px]" />
                            </div>
                            <span className="text-[11px] font-black text-emerald-600 uppercase tracking-wider">
                                Net Outflow
                            </span>
                        </div>
                        <h3 className="text-2xl sm:text-3xl font-black text-slate-900 font-mono truncate">
                            ₹{totalNet.toLocaleString("en-IN")}
                        </h3>
                    </div>
                    <p className="text-xs font-semibold text-emerald-600 mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                            <TrendingUp size={12} /> Direct bank credits
                        </span>
                        <ArrowUpRight
                            size={14}
                            className="group-hover:translate-x-0.5 transition-transform"
                        />
                    </p>
                </div>

                {/* Settlement Status */}
                <div
                    onClick={() => router.push(`/payroll?year=${year}&status=paid`)}
                    className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-violet-300 hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex flex-col justify-between"
                >
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center border border-violet-100/80 shadow-2xs group-hover:scale-105 transition-transform">
                                <CheckCircle2 size={20} className="sm:w-[22px] sm:h-[22px]" />
                            </div>
                            <span className="text-[11px] font-black text-violet-600 uppercase tracking-wider">
                                Settlement
                            </span>
                        </div>
                        <h3 className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
                            {paidCount}{" "}
                            <span className="text-xs font-normal text-slate-400">
                                / {payrolls.length}
                            </span>
                        </h3>
                    </div>
                    <p className="text-xs font-semibold text-violet-600 mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span>{paidPercentage}% disbursement rate</span>
                        <ArrowUpRight
                            size={14}
                            className="group-hover:translate-x-0.5 transition-transform"
                        />
                    </p>
                </div>
            </div>

            {/* Monthly Net Salary Trajectory Bar Chart */}
            <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300 space-y-4 sm:space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100 pb-4 sm:pb-5">
                    <div>
                        <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                            <CreditCard size={18} className="text-indigo-600 shrink-0" />
                            <span>Monthly Net Salary Disbursed</span>
                        </h2>
                        <p className="text-xs font-medium text-slate-500 mt-0.5">
                            Net compensation volume released per month in {year} (click a bar to view statement details).
                        </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/60 self-start sm:self-auto font-mono">
                        <Receipt size={14} className="text-indigo-600 shrink-0" />
                        <span>Annual Total: ₹{totalNet.toLocaleString("en-IN")}</span>
                    </div>
                </div>

                {payrolls.length === 0 ? (
                    <div className="py-20 text-center space-y-1">
                        <p className="text-sm font-bold text-slate-700">
                            No payroll statements recorded
                        </p>
                        <p className="text-xs font-medium text-slate-400 max-w-sm mx-auto">
                            No salary disbursement records were found for calendar year {year}.
                        </p>
                    </div>
                ) : (
                    <div className="h-64 sm:h-72 w-full select-none pt-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={monthlyData}
                                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                                onClick={(e) => {
                                    if (e && e.activePayload && e.activePayload.length) {
                                        const selectedMonth = e.activePayload[0].payload.month;
                                        const monthIndex = MONTH_NAMES.indexOf(selectedMonth) + 1;
                                        router.push(`/payroll?year=${year}&month=${monthIndex}`);
                                    }
                                }}
                            >
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    vertical={false}
                                    stroke="#F1F5F9"
                                />
                                <XAxis
                                    dataKey="month"
                                    tick={{ fontSize: 11, fill: "#64748B", fontWeight: 600 }}
                                    tickLine={false}
                                    axisLine={false}
                                    dy={8}
                                />
                                <YAxis
                                    tick={{ fontSize: 11, fill: "#94A3B8", fontWeight: 500 }}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                                />
                                <Tooltip content={<CustomChartTooltip />} />
                                <Bar
                                    dataKey="amount"
                                    fill="#4F46E5"
                                    radius={[8, 8, 0, 0]}
                                    className="cursor-pointer hover:opacity-80 transition-opacity"
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>
        </div>
    );
}