"use client";
import { useEffect, useState } from "react";
import { Loader2, Tag, TrendingUp, Layers } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";

// Backend does not have a separate Category model — these are standard categories used in the Submit Expense form
const COMMON_CATEGORIES = ["travel", "food", "supplies", "accommodation", "communication", "other"];

export default function ExpenseCategoriesPage() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/expenses")
      .then(({ data }) => setExpenses(Array.isArray(data) ? data : []))
      .catch(() => toast.error("Failed to load category data. Please try again."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="py-20 text-center flex flex-col items-center justify-center space-y-3 font-sans">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
        <p className="text-sm font-medium text-slate-500 animate-pulse">Loading expense categories...</p>
      </div>
    );
  }

  const usage = COMMON_CATEGORIES.map((cat) => {
    const items = expenses.filter((e) => e.category === cat);
    return {
      category: cat,
      count: items.length,
      total: items.reduce((sum, e) => sum + e.amount, 0)
    };
  });

  const maxCount = Math.max(...usage.map((u) => u.count), 1);

  return (
    <div className="space-y-6 font-sans antialiased text-slate-900">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 border-b border-slate-100 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Expense Categories</h1>
          <p className="text-sm text-slate-500 mt-0.5">Overview and usage tracking of categories used within the submit expense form.</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/60 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600">
          <Layers size={14} className="text-indigo-600" />
          <span>Total Categories: {COMMON_CATEGORIES.length}</span>
        </div>
      </div>

      {/* Categories Grid Cards with Deep Smooth Hover & Dynamic Progress */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {usage.map((u) => {
          const percentage = Math.round((u.count / maxCount) * 100);
          return (
            <div
              key={u.category}
              className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm transition-all duration-300 ease-in-out hover:shadow-xl hover:border-indigo-300 hover:-translate-y-1.5 active:translate-y-0 group cursor-pointer relative overflow-hidden flex flex-col justify-between"
            >
              {/* Subtle Background Accent on Hover */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50/50 rounded-bl-full pointer-events-none transition-transform duration-300 group-hover:scale-125" />

              <div>
                {/* Icon & Count Badge */}
                <div className="flex items-center justify-between mb-4 relative z-10">
                  <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center transition-all duration-300 group-hover:bg-indigo-600 group-hover:text-white group-hover:shadow-md group-hover:shadow-indigo-200">
                    <Tag size={20} />
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full border border-slate-200/60 transition-colors group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-100">
                    {u.count} {u.count === 1 ? "Item" : "Items"}
                  </span>
                </div>

                {/* Title & Total Amount */}
                <h4 className="font-bold text-slate-900 capitalize text-lg tracking-tight group-hover:text-indigo-600 transition-colors">
                  {u.category}
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">Total Expense Value</p>
                <p className="text-xl font-extrabold text-slate-900 tracking-tight mt-1">
                  ₹{u.total.toLocaleString()}
                </p>
              </div>

              {/* Dynamic Progress Bar Section */}
              <div className="mt-5 pt-4 border-t border-slate-100 relative z-10 space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-slate-500">
                  <span>Usage Ratio</span>
                  <span className="text-indigo-600 font-bold">{percentage}%</span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/40">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-500 ease-out group-hover:from-indigo-600 group-hover:to-violet-600"
                    style={{ width: `${Math.max(percentage, 5)}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}