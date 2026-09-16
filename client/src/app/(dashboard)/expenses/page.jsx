"use client";
import { useEffect, useState } from "react";
import { Loader2, Wallet, Clock, CheckCircle2, TrendingUp } from "lucide-react";
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
            <div className="py-20 text-center flex flex-col items-center justify-center space-y-3 font-sans">
                <Loader2 className="animate-spin text-indigo-600" size={32} />
                <p className="text-sm font-medium text-slate-500 animate-pulse">Loading dashboard statistics...</p>
            </div>
        );
    }

    const totalSubmitted = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalApproved = expenses.filter((e) => ["approved", "reimbursed"].includes(e.status)).reduce((sum, e) => sum + e.amount, 0);
    const pendingCount = expenses.filter((e) => e.status === "pending").length;
    const reimbursedCount = expenses.filter((e) => e.status === "reimbursed").length;

    // Helper function for status badge styling
    const getStatusBadge = (status) => {
        switch (status) {
            case "approved":
                return <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-600 rounded-full border border-emerald-200/60">Approved</span>;
            case "reimbursed":
                return <span className="px-2.5 py-1 text-xs font-semibold bg-violet-50 text-violet-600 rounded-full border border-violet-200/60">Reimbursed</span>;
            case "rejected":
                return <span className="px-2.5 py-1 text-xs font-semibold bg-rose-50 text-rose-600 rounded-full border border-rose-200/60">Rejected</span>;
            default:
                return <span className="px-2.5 py-1 text-xs font-semibold bg-amber-50 text-amber-600 rounded-full border border-amber-200/60">Pending</span>;
        }
    };

    return (
        <div className="space-y-6 font-sans antialiased text-slate-900">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 border-b border-slate-100 pb-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Expense Dashboard</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Comprehensive overview of expense submissions and approval statuses.</p>
                </div>
            </div>

            {/* Metrics Grid Cards with Active & Hover Effects */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm transition-all duration-300 ease-in-out hover:shadow-md hover:border-indigo-300 hover:-translate-y-1 active:translate-y-0 flex items-center gap-4 group cursor-pointer">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl transition-colors duration-200 group-hover:bg-indigo-600 group-hover:text-white">
                        <Wallet size={22} />
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Total Submitted</p>
                        <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">₹{totalSubmitted.toLocaleString()}</h3>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm transition-all duration-300 ease-in-out hover:shadow-md hover:border-emerald-300 hover:-translate-y-1 active:translate-y-0 flex items-center gap-4 group cursor-pointer">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl transition-colors duration-200 group-hover:bg-emerald-600 group-hover:text-white">
                        <TrendingUp size={22} />
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Approved Amount</p>
                        <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">₹{totalApproved.toLocaleString()}</h3>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm transition-all duration-300 ease-in-out hover:shadow-md hover:border-amber-300 hover:-translate-y-1 active:translate-y-0 flex items-center gap-4 group cursor-pointer">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-xl transition-colors duration-200 group-hover:bg-amber-600 group-hover:text-white">
                        <Clock size={22} />
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Pending Requests</p>
                        <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">{pendingCount}</h3>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm transition-all duration-300 ease-in-out hover:shadow-md hover:border-violet-300 hover:-translate-y-1 active:translate-y-0 flex items-center gap-4 group cursor-pointer">
                    <div className="p-3 bg-violet-50 text-violet-600 rounded-xl transition-colors duration-200 group-hover:bg-violet-600 group-hover:text-white">
                        <CheckCircle2 size={22} />
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Reimbursed</p>
                        <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">{reimbursedCount}</h3>
                    </div>
                </div>
            </div>

            {/* Recent Expenses Table Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="p-6 pb-4 flex items-center justify-between border-b border-slate-100">
                    <div>
                        <h3 className="font-bold text-slate-800 text-base">Recent Expense Records</h3>
                        <p className="text-xs text-slate-400 mt-0.5">A list of recent expense submissions across the system.</p>
                    </div>
                    <span className="text-xs font-semibold px-3 py-1 bg-slate-100 text-slate-600 rounded-lg">Latest 6 Entries</span>
                </div>

                {expenses.length === 0 ? (
                    <div className="text-center py-16">
                        <p className="text-sm font-medium text-slate-400">No expense records found.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/70 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    <th className="py-3.5 px-6">Category</th>
                                    <th className="py-3.5 px-6">Employee</th>
                                    <th className="py-3.5 px-6">Date</th>
                                    <th className="py-3.5 px-6">Status</th>
                                    <th className="py-3.5 px-6 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {expenses.slice(0, 6).map((e) => (
                                    <tr
                                        key={e._id}
                                        className="transition-colors duration-150 hover:bg-slate-50/80 group cursor-pointer"
                                    >
                                        <td className="py-4 px-6 font-semibold text-slate-800 capitalize group-hover:text-indigo-600 transition-colors">
                                            {e.category}
                                        </td>
                                        <td className="py-4 px-6 text-slate-600 font-medium">
                                            {e.employee?.name || "Unknown"}
                                        </td>
                                        <td className="py-4 px-6 text-slate-500 text-xs">
                                            {new Date(e.expenseDate).toLocaleDateString()}
                                        </td>
                                        <td className="py-4 px-6">
                                            {getStatusBadge(e.status)}
                                        </td>
                                        <td className="py-4 px-6 text-right font-bold text-slate-900 tracking-tight">
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