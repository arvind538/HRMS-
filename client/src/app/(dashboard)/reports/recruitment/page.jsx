"use client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, Users, UserCheck, RefreshCw, ArrowUpRight, UserPlus } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Badge from "@/components/ui/Badge";

const STATUS_VARIANT = {
  applied: "neutral",
  shortlisted: "info",
  "interview-scheduled": "indigo",
  interviewed: "warning",
  offered: "warning",
  hired: "success",
  rejected: "danger",
};

export default function RecruitmentReportsPage() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch real recruitment reports concurrently from backend
  const fetchReportData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/reports/recruitment");
      setReport(data || {});
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load recruitment analytics report.");
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
        <p className="text-sm text-slate-500 font-medium">Loading recruitment funnel analytics...</p>
      </div>
    );
  }

  const byStatus = report?.byStatus || {};

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 sm:space-y-6 px-3 sm:px-6 lg:px-8 py-4 sm:py-6 transition-all duration-300">

      {/* Header & Sync Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4 sm:pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Recruitment & Hiring Reports</h1>
            <span className="bg-indigo-100 text-indigo-700 text-[11px] sm:text-xs font-semibold px-2.5 py-0.5 rounded-full">Funnel Summary</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">Monitor candidate pipelines, applicant status stages, and hiring success rates.</p>
        </div>
        <button
          onClick={fetchReportData}
          className="inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 font-medium px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm transition-all duration-300 hover:shadow group w-full sm:w-auto cursor-pointer active:scale-95"
        >
          <RefreshCw size={16} className="text-indigo-600 transition-transform duration-500 group-hover:rotate-180" /> Refresh Data
        </button>
      </div>

      {/* Analytics Summary Metric Cards (1 col on mobile, 2 cols on tablet/desktop) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">

        {/* Total Candidates Card */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm transition-all duration-300 hover:shadow-md hover:border-indigo-100 flex items-center justify-between group">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="p-3 sm:p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl transition-transform duration-300 group-hover:scale-110 shrink-0">
              <Users size={22} className="sm:w-6 sm:h-6" />
            </div>
            <div>
              <p className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Total Candidates</p>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5 sm:mt-1">{report?.totalCandidates || 0}</h3>
            </div>
          </div>
          <span className="text-[11px] sm:text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg flex items-center gap-1 shrink-0">
            Pipeline <ArrowUpRight size={14} />
          </span>
        </div>

        {/* Hired Candidates Card */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm transition-all duration-300 hover:shadow-md hover:border-emerald-100 flex items-center justify-between group">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="p-3 sm:p-3.5 bg-emerald-50 text-emerald-600 rounded-2xl transition-transform duration-300 group-hover:scale-110 shrink-0">
              <UserCheck size={22} className="sm:w-6 sm:h-6" />
            </div>
            <div>
              <p className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Hired Applicants</p>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5 sm:mt-1">{report?.hired || 0}</h3>
            </div>
          </div>
          <span className="text-[11px] sm:text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg flex items-center gap-1 shrink-0">
            Converted <ArrowUpRight size={14} />
          </span>
        </div>

      </div>

      {/* Status Breakdown Grid Container */}
      <div className="bg-white p-4 sm:p-6 lg:p-8 rounded-2xl border border-slate-200 shadow-sm transition-all duration-300 hover:shadow-md">
        <div className="flex items-center justify-between mb-5 sm:mb-6">
          <div className="flex items-center gap-2">
            <UserPlus size={18} className="text-indigo-600 shrink-0" />
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">Candidate Status Breakdown Stages</h3>
          </div>
          <span className="text-[11px] sm:text-xs text-slate-400 font-medium">Stage Distribution</span>
        </div>

        {Object.keys(byStatus).length === 0 ? (
          <div className="text-center py-10 sm:py-12 text-slate-400 text-xs sm:text-sm">
            No candidate pipeline data records found for analysis.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
            {Object.entries(byStatus).map(([status, count]) => (
              <div
                key={status}
                className="flex items-center justify-between p-3.5 sm:p-4 bg-slate-50/70 hover:bg-white rounded-xl border border-slate-200/60 shadow-xs transition-all duration-300 hover:shadow-md hover:border-indigo-200 group"
              >
                <div className="truncate pr-2">
                  <Badge variant={STATUS_VARIANT[status] || "neutral"} className="capitalize">
                    {status.replace(/-/g, " ")}
                  </Badge>
                </div>
                <span className="font-extrabold text-slate-900 text-base bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-xs group-hover:text-indigo-600 transition-colors shrink-0">
                  {count}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}