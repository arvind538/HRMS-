// src/app/(dashboard)/expenses/dashboard/page.jsx
"use client";
import { useEffect, useState } from "react";
import { Loader2, Wallet, Clock, CheckCircle2, TrendingUp, ArrowUpRight } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import { useAuth } from "@/context/AuthContext";

export default function ExpenseDashboardPage() {
    const { user } = useAuth();
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const isManager = ["admin", "hr", "manager"].includes(user?.role);

    useEffect(() => {
        const params = isManager ? {} : { employee: user?.employee?._id };
        api.get("/expenses", { params })
            .then(({ data }) => setExpenses(Array.isArray(data) ? data : []))
            .catch(() => toast.error("Failed to load dashboard data. Please try again."))
            .finally(() => setLoading(false));
    }, [user, isManager]);

    if (loading) {
        return (
            <div className="py-24 text-center flex flex-col items-center justify-center space-y-3 font-sans">
                <Loader2 className="animate-spin text-indigo-600" size={36} />
                <p className="text-sm font-semibold text-slate-500 animate-pulse">Loading dashboard metrics...</p>
            </div>
        );
    }

    const totalSubmitted = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalApproved = expenses.filter((e) => ["approved", "reimbursed"].includes(e.status)).reduce((sum, e) => sum + e.amount, 0);
    const pendingCount = expenses.filter((e) => e.status === "pending").length;
    const reimbursedCount = expenses.filter((e) => e.status === "reimbursed").length;

    const getStatusBadge = (status) => {
        switch (status) {
            case "approved":
                return <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200/60 shadow-2xs">Approved</span>;
            case "reimbursed":
                return <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider bg-violet-50 text-violet-700 rounded-full border border-violet-200/60 shadow-2xs">Reimbursed</span>;
            case "rejected":
                return <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider bg-rose-50 text-rose-700 rounded-full border border-rose-200/60 shadow-2xs">Rejected</span>;
            default:
                return <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider bg-amber-50 text-amber-700 rounded-full border border-amber-200/60 shadow-2xs">Pending</span>;
        }
    };

    return (
        <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-3 lg:px-4 py-3 font-sans  text-slate-900">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5 bg-white p-6 rounded-3xl shadow-xs">
                <div>
                    <h1 className="text-2xl sm:text-2xl font-bold tracking-tight text-slate-900">Expense Dashboard</h1>
                    <p className="text-sm text-slate-500 mt-1">Comprehensive overview of expense submissions, approvals, and real-time statuses.</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-100 shadow-2xs">
                        <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
                        Live Overview
                    </span>
                </div>
            </div>

            {/* Metrics Grid Cards with Smooth Professional Hover Effects */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* Total Submitted Card */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs transition-all duration-300 ease-in-out hover:shadow-xl hover:border-indigo-300 hover:-translate-y-1 active:translate-y-0 flex items-center justify-between group cursor-pointer">
                    <div className="space-y-1">
                        <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">Total Submitted</p>
                        <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">₹{totalSubmitted.toLocaleString()}</h3>
                    </div>
                    <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl transition-all duration-300 group-hover:bg-indigo-600 group-hover:text-white group-hover:scale-110 shadow-inner">
                        <Wallet size={24} />
                    </div>
                </div>

                {/* Approved Amount Card */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs transition-all duration-300 ease-in-out hover:shadow-xl hover:border-emerald-300 hover:-translate-y-1 active:translate-y-0 flex items-center justify-between group cursor-pointer">
                    <div className="space-y-1">
                        <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">Approved Amount</p>
                        <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">₹{totalApproved.toLocaleString()}</h3>
                    </div>
                    <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-2xl transition-all duration-300 group-hover:bg-emerald-600 group-hover:text-white group-hover:scale-110 shadow-inner">
                        <TrendingUp size={24} />
                    </div>
                </div>

                {/* Pending Requests Card */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs transition-all duration-300 ease-in-out hover:shadow-xl hover:border-amber-300 hover:-translate-y-1 active:translate-y-0 flex items-center justify-between group cursor-pointer">
                    <div className="space-y-1">
                        <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">Pending Requests</p>
                        <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{pendingCount}</h3>
                    </div>
                    <div className="p-3.5 bg-amber-50 text-amber-600 rounded-2xl transition-all duration-300 group-hover:bg-amber-600 group-hover:text-white group-hover:scale-110 shadow-inner">
                        <Clock size={24} />
                    </div>
                </div>

                {/* Reimbursed Card */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs transition-all duration-300 ease-in-out hover:shadow-xl hover:border-violet-300 hover:-translate-y-1 active:translate-y-0 flex items-center justify-between group cursor-pointer">
                    <div className="space-y-1">
                        <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">Reimbursed</p>
                        <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{reimbursedCount}</h3>
                    </div>
                    <div className="p-3.5 bg-violet-50 text-violet-600 rounded-2xl transition-all duration-300 group-hover:bg-violet-600 group-hover:text-white group-hover:scale-110 shadow-inner">
                        <CheckCircle2 size={24} />
                    </div>
                </div>
            </div>

            {/* Recent Expenses Table Card */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="p-6 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100">
                    <div>
                        <h3 className="font-extrabold text-slate-900 text-lg">Recent Expense Records</h3>
                        <p className="text-xs text-slate-500 mt-0.5">A list of recent expense submissions tracked across the system.</p>
                    </div>
                    <span className="text-xs font-bold px-3.5 py-1.5 bg-slate-100 text-slate-700 rounded-xl w-fit shadow-2xs">
                        Latest 6 Entries
                    </span>
                </div>

                {expenses.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-sm font-semibold text-slate-400">No expense records found.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto w-full">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    <th className="py-4 px-6">Category</th>
                                    <th className="py-4 px-6">Employee</th>
                                    <th className="py-4 px-6">Date</th>
                                    <th className="py-4 px-6">Status</th>
                                    <th className="py-4 px-6 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {expenses.slice(0, 6).map((e) => (
                                    <tr
                                        key={e._id}
                                        className="transition-all duration-200 hover:bg-indigo-50/30 group cursor-pointer"
                                    >
                                        <td className="py-4 px-6 font-bold text-slate-800 capitalize group-hover:text-indigo-600 transition-colors">
                                            {e.category}
                                        </td>
                                        <td className="py-4 px-6 text-slate-600 font-medium">
                                            {e.employee?.name || "Unknown"}
                                        </td>
                                        <td className="py-4 px-6 text-slate-500 text-xs font-medium">
                                            {new Date(e.expenseDate).toLocaleDateString()}
                                        </td>
                                        <td className="py-4 px-6">
                                            {getStatusBadge(e.status)}
                                        </td>
                                        <td className="py-4 px-6 text-right font-black text-slate-900 tracking-tight">
                                            ₹{e.amount.toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}