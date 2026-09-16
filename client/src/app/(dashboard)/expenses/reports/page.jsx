"use client";
import { useEffect, useState } from "react";
import { Loader2, Wallet, TrendingUp, BarChart3, PieChart } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";

export default function ExpenseReportsPage() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/expenses")
      .then(({ data }) => setExpenses(Array.isArray(data) ? data : []))
      .catch(() => toast.error("Failed to load company expense reports. Please try again."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3 font-sans">
        <Loader2 className="animate-spin text-indigo-600" size={34} />
        <p className="text-sm font-medium text-slate-500 animate-pulse">Loading financial reports...</p>
      </div>
    );
  }

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  const reimbursed = expenses.filter((e) => e.status === "reimbursed").reduce((sum, e) => sum + e.amount, 0);

  const byCategory = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {});
  const maxCat = Math.max(...Object.values(byCategory), 1);

  return (
    <div className="space-y-6 font-sans antialiased text-slate-900 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header Section */}
      <div className="border-b border-slate-100 pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Expense Reports</h1>
          <p className="text-sm text-slate-500 mt-0.5">Comprehensive company-wide expense trends and category-wise spending breakdown.</p>
        </div>
      </div>

      {/* Metrics Cards Grid with Deep Smooth Hover Effects */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Card 1 */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm transition-all duration-300 ease-in-out hover:shadow-xl hover:border-indigo-300 hover:-translate-y-1.5 active:translate-y-0 flex items-center gap-5 group cursor-pointer relative overflow-hidden">
          <div className="absolute top-0 right-0 w-28 h-28 bg-indigo-50/50 rounded-bl-full pointer-events-none transition-transform duration-300 group-hover:scale-125" />
          <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl transition-all duration-300 group-hover:bg-indigo-600 group-hover:text-white group-hover:shadow-md group-hover:shadow-indigo-200 relative z-10">
            <Wallet size={24} />
          </div>
          <div className="relative z-10">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">Total Expenses</p>
            <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">₹{total.toLocaleString()}</h3>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm transition-all duration-300 ease-in-out hover:shadow-xl hover:border-emerald-300 hover:-translate-y-1.5 active:translate-y-0 flex items-center gap-5 group cursor-pointer relative overflow-hidden">
          <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-50/50 rounded-bl-full pointer-events-none transition-transform duration-300 group-hover:scale-125" />
          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl transition-all duration-300 group-hover:bg-emerald-600 group-hover:text-white group-hover:shadow-md group-hover:shadow-emerald-200 relative z-10">
            <TrendingUp size={24} />
          </div>
          <div className="relative z-10">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">Total Reimbursed</p>
            <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">₹{reimbursed.toLocaleString()}</h3>
          </div>
        </div>
      </div>

      {/* Category-wise Spend Analytics Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 sm:p-8 transition-all duration-300 hover:shadow-md">
        <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <BarChart3 size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Category-wise Spend Analysis</h3>
              <p className="text-xs text-slate-400">Distribution of company expenses across different categories</p>
            </div>
          </div>
          <span className="text-xs font-semibold px-3 py-1 bg-slate-100 text-slate-600 rounded-lg">
            {Object.keys(byCategory).length} Categories
          </span>
        </div>

        {Object.keys(byCategory).length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400">
              <PieChart size={20} />
            </div>
            <p className="text-xs font-semibold text-slate-400">No expense reports data available.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(byCategory).map(([cat, amount]) => {
              const percentage = Math.round((amount / (total || 1)) * 100);
              return (
                <div
                  key={cat}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3.5 rounded-xl transition-all duration-200 hover:bg-slate-50/80 border border-transparent hover:border-slate-200/60 group"
                >
                  <div className="w-36 flex items-center justify-between sm:justify-start gap-2">
                    <span className="font-bold text-slate-800 capitalize tracking-tight group-hover:text-indigo-600 transition-colors">
                      {cat}
                    </span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full sm:hidden">
                      {percentage}%
                    </span>
                  </div>

                  <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/40">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-500 ease-out group-hover:from-indigo-600 group-hover:to-violet-600"
                      style={{ width: `${Math.max((amount / maxCat) * 100, 4)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-44">
                    <span className="hidden sm:inline text-xs font-semibold text-slate-400">
                      {percentage}% of total
                    </span>
                    <span className="font-extrabold text-slate-900 tracking-tight tabular-nums text-sm">
                      ₹{amount.toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}