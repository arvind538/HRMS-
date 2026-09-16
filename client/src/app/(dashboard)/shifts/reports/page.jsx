"use client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, Users, BarChart3, Clock, RefreshCw, ArrowUpRight } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";

export default function ShiftReportsPage() {
  const [shifts, setShifts] = useState([]);
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch real shift and roster information concurrently from backend
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const nextMonth = new Date();
      nextMonth.setDate(nextMonth.getDate() + 30);
      const endDate = nextMonth.toISOString().split("T")[0];

      const [shiftsRes, rosterRes] = await Promise.all([
        api.get("/shifts"),
        api.get("/shifts/roster", { params: { startDate: today, endDate } }),
      ]);

      setShifts(Array.isArray(shiftsRes.data) ? shiftsRes.data : []);
      setRoster(Array.isArray(rosterRes.data) ? rosterRes.data : []);
    } catch (err) {
      toast.error("Failed to load shift performance reports.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 px-4">
        <Loader2 className="animate-spin text-indigo-600" size={38} />
        <p className="text-sm text-slate-500 font-medium">Generating analytics reports...</p>
      </div>
    );
  }

  // Calculate shift-wise distribution counts securely
  const byShift = shifts.map((s) => ({
    name: s.name,
    isNight: s.isNightShift,
    count: roster.filter((r) => r.shift?._id === s._id).length,
  }));

  const maxCount = Math.max(...byShift.map((s) => s.count), 1);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 sm:space-y-6 px-3 sm:px-6 lg:px-8 py-4 sm:py-6 transition-all duration-300">

      {/* Header & Sync Controls (Mobile friendly stack & wrap) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4 sm:pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Shift Reports & Analytics</h1>
            <span className="bg-indigo-100 text-indigo-700 text-[11px] sm:text-xs font-semibold px-2.5 py-0.5 rounded-full">30-Day Outlook</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">Analyze shift-wise employee allocation metrics and distribution trends.</p>
        </div>
        <button
          onClick={fetchData}
          className="inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 font-medium px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm transition-all duration-300 hover:shadow group w-full sm:w-auto cursor-pointer active:scale-95"
        >
          <RefreshCw size={16} className="text-indigo-600 transition-transform duration-500 group-hover:rotate-180" /> Refresh Data
        </button>
      </div>

      {/* Analytics Summary Metric Cards (Responsive 1 col on mobile, 2 cols on tablet/desktop) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">

        {/* Total Assignments Card */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm transition-all duration-300 hover:shadow-md hover:border-indigo-100 flex items-center justify-between group">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="p-3 sm:p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl transition-transform duration-300 group-hover:scale-110 shrink-0">
              <Users size={22} className="sm:w-6 sm:h-6" />
            </div>
            <div>
              <p className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Total Assignments</p>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5 sm:mt-1">{roster.length}</h3>
            </div>
          </div>
          <span className="text-[11px] sm:text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg flex items-center gap-1 shrink-0">
            Active <ArrowUpRight size={14} />
          </span>
        </div>

        {/* Active Shift Templates Card */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm transition-all duration-300 hover:shadow-md hover:border-violet-100 flex items-center justify-between group">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="p-3 sm:p-3.5 bg-violet-50 text-violet-600 rounded-2xl transition-transform duration-300 group-hover:scale-110 shrink-0">
              <Clock size={22} className="sm:w-6 sm:h-6" />
            </div>
            <div>
              <p className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Shift Templates</p>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5 sm:mt-1">{shifts.length}</h3>
            </div>
          </div>
          <span className="text-[11px] sm:text-xs font-semibold text-violet-600 bg-violet-50 px-2.5 py-1 rounded-lg flex items-center gap-1 shrink-0">
            Configured <ArrowUpRight size={14} />
          </span>
        </div>

      </div>

      {/* Shift Distribution Visual Bars Container (Fully Adaptive layout for small screens) */}
      <div className="bg-white p-4 sm:p-6 lg:p-8 rounded-2xl border border-slate-200 shadow-sm transition-all duration-300 hover:shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5 sm:mb-6">
          <div className="flex items-center gap-2">
            <BarChart3 size={18} className="text-indigo-600 shrink-0" />
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">Shift-wise Distribution Trends</h3>
          </div>
          <span className="text-[11px] sm:text-xs text-slate-400 font-medium">Relative Employee Count</span>
        </div>

        {byShift.length === 0 ? (
          <div className="text-center py-10 sm:py-12 text-slate-400 text-xs sm:text-sm">
            No shift distribution data available for evaluation.
          </div>
        ) : (
          <div className="space-y-3.5 sm:space-y-4">
            {byShift.map((s) => (
              <div key={s.name} className="group flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm bg-slate-50/60 p-3 sm:p-3.5 rounded-xl border border-slate-100 transition-all hover:bg-slate-50">

                {/* Shift Name & Tag */}
                <div className="w-full sm:w-44 font-semibold text-slate-800 truncate flex items-center justify-between sm:justify-start gap-2">
                  <div className="flex items-center gap-2 truncate">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${s.isNight ? "bg-violet-600" : "bg-indigo-600"}`} />
                    <span className="truncate">{s.name}</span>
                  </div>
                  {s.isNight && (
                    <span className="text-[10px] text-violet-600 bg-violet-100 px-1.5 py-0.5 rounded font-medium shrink-0">
                      Night
                    </span>
                  )}
                </div>

                {/* Progress Bar Track */}
                <div className="flex-1 h-3 sm:h-3.5 bg-slate-200/70 rounded-full overflow-hidden p-0.5 shadow-inner w-full">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${s.isNight ? "bg-gradient-to-r from-violet-500 to-violet-600" : "bg-gradient-to-r from-indigo-500 to-indigo-600"}`}
                    style={{ width: `${(s.count / maxCount) * 100}%` }}
                  />
                </div>

                {/* Count Badge (Full width spacing on mobile row, fixed width on tablet+) */}
                <div className="flex sm:w-16 justify-between sm:justify-end items-center text-xs font-bold text-slate-900 bg-white px-3 sm:px-2.5 py-1.5 sm:py-1 rounded-lg border border-slate-200 shadow-xs">
                  <span className="sm:hidden text-slate-400 font-normal">Assigned Employees:</span>
                  <span>{s.count} <span className="text-slate-400 font-normal sm:inline">Emp</span></span>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}