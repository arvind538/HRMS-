"use client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, Users, UserCheck, UserX, Building2, RefreshCw, ArrowUpRight } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";

export default function EmployeeReportsPage() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch real employee reports concurrently from the backend
  const fetchReportData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/reports/employee");
      setReport(data || {});
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load employee analytics report.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 px-4">
        <Loader2 className="animate-spin text-indigo-600" size={38} />
        <p className="text-sm text-slate-500 font-medium">Loading workforce statistics...</p>
      </div>
    );
  }

  const byDept = report?.byDepartment || {};
  const maxCount = Math.max(...Object.values(byDept), 1);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 sm:space-y-6 px-3 sm:px-6 lg:px-8 py-4 sm:py-6 transition-all duration-300">

      {/* Header & Sync Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4 sm:pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Employee Analytics & Reports</h1>
            <span className="bg-indigo-100 text-indigo-700 text-[11px] sm:text-xs font-semibold px-2.5 py-0.5 rounded-full">Live Overview</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">Monitor workforce distribution, active headcounts, and department stats.</p>
        </div>
        <button
          onClick={fetchReportData}
          className="inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 font-medium px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm transition-all duration-300 hover:shadow group w-full sm:w-auto cursor-pointer active:scale-95"
        >
          <RefreshCw size={16} className="text-indigo-600 transition-transform duration-500 group-hover:rotate-180" /> Refresh Data
        </button>
      </div>

      {/* Summary Metric Cards (1 col on mobile, 3 cols on tablet/desktop) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">

        {/* Total Employees Card */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm transition-all duration-300 hover:shadow-md hover:border-indigo-100 flex items-center justify-between group">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="p-3 sm:p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl transition-transform duration-300 group-hover:scale-110 shrink-0">
              <Users size={22} className="sm:w-6 sm:h-6" />
            </div>
            <div>
              <p className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Total Employees</p>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5 sm:mt-1">{report?.totalEmployees || 0}</h3>
            </div>
          </div>
          <span className="text-[11px] sm:text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg flex items-center gap-1 shrink-0">
            All <ArrowUpRight size={14} />
          </span>
        </div>

        {/* Active Employees Card */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm transition-all duration-300 hover:shadow-md hover:border-emerald-100 flex items-center justify-between group">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="p-3 sm:p-3.5 bg-emerald-50 text-emerald-600 rounded-2xl transition-transform duration-300 group-hover:scale-110 shrink-0">
              <UserCheck size={22} className="sm:w-6 sm:h-6" />
            </div>
            <div>
              <p className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Active Staff</p>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5 sm:mt-1">{report?.activeEmployees || 0}</h3>
            </div>
          </div>
          <span className="text-[11px] sm:text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg flex items-center gap-1 shrink-0">
            Online <ArrowUpRight size={14} />
          </span>
        </div>

        {/* Exited Employees Card */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm transition-all duration-300 hover:shadow-md hover:border-rose-100 flex items-center justify-between group">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="p-3 sm:p-3.5 bg-rose-50 text-rose-600 rounded-2xl transition-transform duration-300 group-hover:scale-110 shrink-0">
              <UserX size={22} className="sm:w-6 sm:h-6" />
            </div>
            <div>
              <p className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Exited Staff</p>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5 sm:mt-1">{report?.exitedEmployees || 0}</h3>
            </div>
          </div>
          <span className="text-[11px] sm:text-xs font-semibold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg flex items-center gap-1 shrink-0">
            Archived <ArrowUpRight size={14} />
          </span>
        </div>

      </div>

      {/* Department-wise Headcount Distribution Card */}
      <div className="bg-white p-4 sm:p-6 lg:p-8 rounded-2xl border border-slate-200 shadow-sm transition-all duration-300 hover:shadow-md">
        <div className="flex items-center justify-between mb-5 sm:mb-6">
          <div className="flex items-center gap-2">
            <Building2 size={18} className="text-indigo-600 shrink-0" />
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">Department-wise Headcount Distribution</h3>
          </div>
          <span className="text-[11px] sm:text-xs text-slate-400 font-medium">Relative Strength</span>
        </div>

        {Object.keys(byDept).length === 0 ? (
          <div className="text-center py-10 sm:py-12 text-slate-400 text-xs sm:text-sm">
            No department breakdown metrics available at the moment.
          </div>
        ) : (
          <div className="space-y-3.5 sm:space-y-4">
            {Object.entries(byDept).map(([name, count]) => (
              <div key={name} className="group flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm bg-slate-50/60 p-3 sm:p-3.5 rounded-xl border border-slate-100 transition-all hover:bg-slate-50">

                {/* Department Name */}
                <div className="w-full sm:w-48 font-semibold text-slate-800 truncate flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
                  <span className="truncate">{name}</span>
                </div>

                {/* Progress Bar Track */}
                <div className="flex-1 h-3 sm:h-3.5 bg-slate-200/70 rounded-full overflow-hidden p-0.5 shadow-inner w-full">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${(count / maxCount) * 100}%` }}
                  />
                </div>

                {/* Headcount Count Badge */}
                <div className="flex sm:w-20 justify-between sm:justify-end items-center text-xs font-bold text-slate-900 bg-white px-3 sm:px-2.5 py-1.5 sm:py-1 rounded-lg border border-slate-200 shadow-xs">
                  <span className="sm:hidden text-slate-400 font-normal">Headcount:</span>
                  <span>{count} <span className="text-slate-400 font-normal sm:inline">Emp</span></span>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}