"use client";
import { useEffect, useState } from "react";
import { Zap, RefreshCw, Wallet, ArrowDownRight, CheckCircle2, TrendingUp, Calendar } from "lucide-react";
import api from "@/lib/api";
import Table from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import { toast } from "react-toastify";

export default function PayrollPage() {
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [payrolls, setPayrolls] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    const fetchPayrolls = async () => {
        setLoading(true);
        try {
            const { data } = await api.get("/payroll", { params: { month, year } });
            setPayrolls(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPayrolls();
    }, [month, year]);

    const handleGenerateBulk = async () => {
        setGenerating(true);
        try {
            const { data } = await api.post("/payroll/generate-bulk", { month, year });
            toast.success(data?.message || "Payroll generated successfully!");
            fetchPayrolls();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to generate payroll");
        } finally {
            setGenerating(false);
        }
    };

    // Financial Summary Computations
    const totalGross = payrolls.reduce((acc, curr) => acc + (curr.grossSalary || 0), 0);
    const totalDeductions = payrolls.reduce((acc, curr) => acc + (curr.totalDeductions || 0), 0);
    const totalNet = payrolls.reduce((acc, curr) => acc + (curr.netSalary || 0), 0);
    const paidCount = payrolls.filter((p) => p.status === "paid").length;

    const columns = [
        {
            key: "employee",
            label: "Employee",
            render: (row) => (
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center font-bold text-xs shadow-sm shadow-indigo-100">
                        {row.employee?.name?.charAt(0) || "U"}
                    </div>
                    <div>
                        <span className="font-semibold text-slate-800 block text-sm leading-snug">
                            {row.employee?.name || "—"}
                        </span>
                        <span className="text-[11px] font-medium text-slate-400 capitalize">
                            {row.employee?.department || row.employee?.role || "Staff Member"}
                        </span>
                    </div>
                </div>
            ),
        },
        {
            key: "grossSalary",
            label: "Gross",
            render: (row) => (
                <span className="font-semibold text-slate-700 text-xs sm:text-sm">
                    ₹{row.grossSalary ? row.grossSalary.toLocaleString("en-IN") : "0"}
                </span>
            ),
        },
        {
            key: "totalDeductions",
            label: "Deductions",
            render: (row) => (
                <span className="font-semibold text-rose-500 text-xs sm:text-sm">
                    - ₹{row.totalDeductions ? row.totalDeductions.toLocaleString("en-IN") : "0"}
                </span>
            ),
        },
        {
            key: "netSalary",
            label: "Net Salary",
            render: (row) => (
                <span className="inline-flex items-center gap-1 font-bold text-emerald-600 text-xs sm:text-sm bg-emerald-50/60 px-2.5 py-1 rounded-md border border-emerald-100">
                    ₹{row.netSalary ? row.netSalary.toLocaleString("en-IN") : "0"}
                </span>
            ),
        },
        {
            key: "status",
            label: "Status",
            render: (row) => {
                const badgeStyles = {
                    paid: "bg-emerald-50 text-emerald-700 border-emerald-200/70",
                    processed: "bg-blue-50 text-blue-700 border-blue-200/70",
                    pending: "bg-amber-50 text-amber-700 border-amber-200/70",
                };
                return (
                    <span
                        className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border capitalize ${badgeStyles[row.status] || "bg-slate-50 text-slate-600 border-slate-200"
                            }`}
                    >
                        <span className={`w-1.5 h-1.5 rounded-full ${row.status === 'paid' ? 'bg-emerald-500' : row.status === 'processed' ? 'bg-blue-500' : 'bg-amber-500'
                            }`} />
                        {row.status}
                    </span>
                );
            },
        },
    ];

    return (
        <div className="max-w-[1400px] mx-auto p-4 sm:p-2 lg:p-4 space-y-6 animate-in fade-in duration-300">

            {/* 1. Header & Quick Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm">
                <div>

                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Payroll Management</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Manage salaries, tax deductions, and bulk payroll disbursements</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchPayrolls}
                        className="p-2.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-all duration-200 shadow-sm"
                        title="Refresh Payroll"
                    >
                        <RefreshCw size={16} className={loading ? "animate-spin text-indigo-600" : ""} />
                    </button>

                    <Button
                        onClick={handleGenerateBulk}
                        loading={generating}
                        className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl px-4 py-2.5 font-medium shadow-md shadow-indigo-100 transition-all duration-200 flex items-center gap-2"
                    >
                        <Zap size={16} /> Generate Payroll
                    </Button>
                </div>
            </div>

            {/* 2. Key Payroll Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                    <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Gross</p>
                        <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">₹{totalGross.toLocaleString("en-IN")}</h3>
                    </div>
                    <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                        <Wallet size={20} />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                    <div>
                        <p className="text-[11px] font-bold text-rose-500 uppercase tracking-wider">Total Deductions</p>
                        <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">₹{totalDeductions.toLocaleString("en-IN")}</h3>
                    </div>
                    <div className="p-3 rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
                        <ArrowDownRight size={20} />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                    <div>
                        <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Net Disbursed</p>
                        <h3 className="text-xl sm:text-2xl font-bold text-emerald-600 mt-1">₹{totalNet.toLocaleString("en-IN")}</h3>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                        <TrendingUp size={20} />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                    <div>
                        <p className="text-[11px] font-bold text-violet-600 uppercase tracking-wider">Disbursement Rate</p>
                        <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
                            {payrolls.length > 0 ? Math.round((paidCount / payrolls.length) * 100) : 0}%
                        </h3>
                    </div>
                    <div className="p-3 rounded-xl bg-violet-50 text-violet-600 border border-violet-100">
                        <CheckCircle2 size={20} />
                    </div>
                </div>
            </div>

            {/* 3. Filter Controls Toolbar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Payroll Cycle:</span>

                    <select
                        value={month}
                        onChange={(e) => setMonth(Number(e.target.value))}
                        className="px-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all cursor-pointer"
                    >
                        {Array.from({ length: 12 }, (_, i) => (
                            <option key={i + 1} value={i + 1}>
                                {new Date(0, i).toLocaleString("default", { month: "long" })}
                            </option>
                        ))}
                    </select>

                    <input
                        type="number"
                        value={year}
                        onChange={(e) => setYear(Number(e.target.value))}
                        className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 w-24 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all"
                    />
                </div>

                <p className="text-xs text-slate-400 font-medium">
                    Showing salaries for <span className="font-semibold text-slate-700">{new Date(0, month - 1).toLocaleString("default", { month: "long" })} {year}</span>
                </p>
            </div>

            {/* 4. Table Container */}
            <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
                        <RefreshCw size={24} className="animate-spin text-indigo-600" />
                        <p className="text-xs font-semibold text-slate-500">Calculating payroll statements...</p>
                    </div>
                ) : payrolls.length === 0 ? (
                    <div className="text-center py-20 text-slate-400">
                        <Calendar size={40} className="mx-auto text-slate-300 mb-3 stroke-[1.5]" />
                        <p className="font-semibold text-slate-700 text-sm">No payroll records generated</p>
                        <p className="text-xs text-slate-400 mt-1">Click &quot;Generate Payroll&quot; to calculate payouts for {new Date(0, month - 1).toLocaleString("default", { month: "long" })} {year}.</p>
                    </div>
                ) : (
                    <Table columns={columns} data={payrolls} emptyText="No payroll generated for this month" />
                )}
            </div>

        </div>
    );
}