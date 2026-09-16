"use client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, CheckCircle2, XCircle, Clock, Timer, Calendar, RefreshCw, ArrowUpRight } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";

export default function AttendanceReportsPage() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  // Fetch real attendance reports concurrently from backend based on selected month & year
  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/reports/attendance", { params: { month, year } });
      setReport(data || {});
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load attendance analytics report.");
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 sm:space-y-6 px-3 sm:px-6 lg:px-8 py-4 sm:py-6 transition-all duration-300">

      {/* Header & Filter Controls Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-4 sm:pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Attendance Analytics & Reports</h1>
            <span className="bg-emerald-100 text-emerald-700 text-[11px] sm:text-xs font-semibold px-2.5 py-0.5 rounded-full">Monthly View</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">Review comprehensive employee attendance tracking summaries and logs.</p>
        </div>

        {/* Date Filters & Sync Controls Container */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm w-full lg:w-auto">
          <div className="flex items-center gap-1.5 pl-2 text-xs font-semibold text-slate-500 hidden sm:flex">
            <Calendar size={14} className="text-indigo-600" /> Filter:
          </div>

          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="flex-1 sm:flex-none px-3 py-2 bg-slate-50 hover:bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
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
            className="w-24 sm:w-28 px-3 py-2 bg-slate-50 hover:bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-center"
          />

          <button
            onClick={fetchReport}
            title="Refresh Report Data"
            className="p-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl transition-all duration-300 hover:rotate-180 cursor-pointer active:scale-95"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
          <Loader2 className="animate-spin text-indigo-600" size={38} />
          <p className="text-sm text-slate-500 font-medium">Loading attendance summary...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">

          {/* Present Card */}
          <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm transition-all duration-300 hover:shadow-md hover:border-emerald-100 flex items-center justify-between group">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-3 sm:p-3.5 bg-emerald-50 text-emerald-600 rounded-2xl transition-transform duration-300 group-hover:scale-110 shrink-0">
                <CheckCircle2 size={22} className="sm:w-6 sm:h-6" />
              </div>
              <div>
                <p className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Present Days</p>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5 sm:mt-1">{report?.present || 0}</h3>
              </div>
            </div>
            <span className="text-[11px] sm:text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg flex items-center gap-1 shrink-0">
              Valid <ArrowUpRight size={14} />
            </span>
          </div>

          {/* Absent Card */}
          <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm transition-all duration-300 hover:shadow-md hover:border-rose-100 flex items-center justify-between group">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-3 sm:p-3.5 bg-rose-50 text-rose-600 rounded-2xl transition-transform duration-300 group-hover:scale-110 shrink-0">
                <XCircle size={22} className="sm:w-6 sm:h-6" />
              </div>
              <div>
                <p className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Absent Days</p>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5 sm:mt-1">{report?.absent || 0}</h3>
              </div>
            </div>
            <span className="text-[11px] sm:text-xs font-semibold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg flex items-center gap-1 shrink-0">
              Missed <ArrowUpRight size={14} />
            </span>
          </div>

          {/* Late Card */}
          <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm transition-all duration-300 hover:shadow-md hover:border-amber-100 flex items-center justify-between group">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-3 sm:p-3.5 bg-amber-50 text-amber-600 rounded-2xl transition-transform duration-300 group-hover:scale-110 shrink-0">
                <Clock size={22} className="sm:w-6 sm:h-6" />
              </div>
              <div>
                <p className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Late Arrivals</p>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5 sm:mt-1">{report?.late || 0}</h3>
              </div>
            </div>
            <span className="text-[11px] sm:text-xs font-semibold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg flex items-center gap-1 shrink-0">
              Alert <ArrowUpRight size={14} />
            </span>
          </div>

          {/* Avg Work Hours Card */}
          <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm transition-all duration-300 hover:shadow-md hover:border-indigo-100 flex items-center justify-between group">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-3 sm:p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl transition-transform duration-300 group-hover:scale-110 shrink-0">
                <Timer size={22} className="sm:w-6 sm:h-6" />
              </div>
              <div>
                <p className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Avg Work Hours</p>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5 sm:mt-1">
                  {report?.avgWorkHours?.toFixed(1) || "0.0"} <span className="text-base sm:text-lg font-semibold text-slate-400">Hrs</span>
                </h3>
              </div>
            </div>
            <span className="text-[11px] sm:text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg flex items-center gap-1 shrink-0">
              Avg <ArrowUpRight size={14} />
            </span>
          </div>

        </div>
      )}

    </div>
  );
}