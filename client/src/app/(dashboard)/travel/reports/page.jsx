"use client";
import { useEffect, useState } from "react";
import { Loader2, Plane, Wallet, CheckCircle2, TrendingUp, BarChart3, ArrowUpRight } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";

export default function TravelReportsPage() {
  const [travels, setTravels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/travel")
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : data?.travels || [];
        setTravels(list);
      })
      .catch((err) => {
        console.error("Reports fetch error:", err);
        toast.error("Reports load nahi hue. Dobara koshish karein.");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-2">
          <div className="h-7 bg-slate-200 rounded w-48 animate-pulse" />
          <div className="h-4 bg-slate-100 rounded w-72 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm animate-pulse h-28" />
          ))}
        </div>
      </div>
    );
  }

  const totalEstimated = travels.reduce((sum, t) => sum + (t.estimatedCost || 0), 0);
  const totalActual = travels.filter((t) => t.actualCost).reduce((sum, t) => sum + t.actualCost, 0);
  const completedCount = travels.filter((t) => t.status === "completed").length;

  const byMode = travels.reduce((acc, t) => {
    if (t.modeOfTravel) {
      const modeKey = t.modeOfTravel.trim().toLowerCase();
      acc[modeKey] = (acc[modeKey] || 0) + 1;
    }
    return acc;
  }, {});

  const maxMode = Math.max(...Object.values(byMode), 1);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Travel Reports</h1>
          <p className="text-sm text-slate-500 mt-0.5">Company-wide travel spend, analytics aur trends</p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 w-fit">
          <BarChart3 size={13} />
          Live Analytics
        </span>
      </div>

      {/* Stats Overview Cards with Smooth Hover */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Total Trips */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-300 flex items-center gap-4 group">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
            <Plane size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Total Trips</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{travels.length}</h3>
          </div>
        </div>

        {/* Completed Trips */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all duration-300 flex items-center gap-4 group">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Completed</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{completedCount}</h3>
          </div>
        </div>

        {/* Actual Spend */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-amber-200 transition-all duration-300 flex items-center gap-4 group">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
            <Wallet size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Actual Spend</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">₹{totalActual.toLocaleString()}</h3>
          </div>
        </div>
      </div>

      {/* Analytics & Breakdown Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Estimated vs Actual Summary Banner */}
        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-6 rounded-2xl shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider font-semibold text-indigo-300">Budget Overview</span>
            <div className="p-2 bg-white/10 rounded-lg text-indigo-200">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-slate-300">
              <span>Estimated Budget:</span>
              <span className="font-semibold text-white">₹{totalEstimated.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-300">
              <span>Actual Expenses:</span>
              <span className="font-semibold text-emerald-400">₹{totalActual.toLocaleString()}</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 border-t border-white/10 pt-3">
            Company-wide projected costs vs actual expenditure tracking matrix.
          </p>
        </div>

        {/* Mode of Travel Distribution Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 text-base">Mode of Travel Distribution</h3>
              <span className="text-xs text-slate-400 font-medium">{Object.keys(byMode).length} transport modes</span>
            </div>
          </div>

          {Object.keys(byMode).length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-xs">
              Koi travel mode data available nahi hai
            </div>
          ) : (
            <div className="space-y-4 my-auto">
              {Object.entries(byMode).map(([mode, count]) => {
                const percentage = Math.round((count / Math.max(travels.length, 1)) * 100);
                return (
                  <div key={mode} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-700 capitalize">{mode}</span>
                      <span className="text-slate-500 font-medium">{count} trips <span className="text-slate-400">({percentage}%)</span></span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-500"
                        style={{ width: `${(count / maxMode) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
