// src/app/(dashboard)/reports/leave/page.jsx
"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Calendar,
  RefreshCw,
  ArrowUpRight,
  FileText,
  ChevronRight,
  X,
  Search,
  User,
  ShieldCheck,
  Percent,
  Activity,
  Clock
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";

export default function LeaveReportsPage() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());

  // Center Modal States
  const [activeMetric, setActiveMetric] = useState(null);
  const [drilldownLogs, setDrilldownLogs] = useState([]);
  const [drilldownLoading, setDrilldownLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/reports/leave", { params: { year } });
      setReport(data?.data || data || {});
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load leave analytics report.");
      setReport({});
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Safe Metric Counts
  const totalRequests = report?.totalRequests ?? report?.total ?? 0;
  const approvedCount = report?.approved ?? report?.approvedCount ?? 0;
  const rejectedCount = report?.rejected ?? report?.rejectedCount ?? 0;
  const pendingCount = report?.pending ?? Math.max(0, totalRequests - (approvedCount + rejectedCount));

  const approvalRate = totalRequests > 0 ? Math.round((approvedCount / totalRequests) * 100) : 0;

  const byType = useMemo(() => {
    const raw = report?.byType || report?.typeStats || {};
    const formatted = {};
    if (typeof raw === "object" && !Array.isArray(raw)) {
      Object.entries(raw).forEach(([k, v]) => {
        formatted[k] = Number(v) || 0;
      });
    } else if (Array.isArray(raw)) {
      raw.forEach((item) => {
        const typeName = item._id || item.type || item.leaveType || "General";
        const count = item.count || item.totalDays || item.days || 1;
        formatted[typeName] = count;
      });
    }
    return formatted;
  }, [report]);

  const maxCount = Math.max(...Object.values(byType), 1);

  // Open Center Modal
  const handleCardClick = async (metricType, metricTitle, customPayload = null) => {
    setActiveMetric({ type: metricType, title: metricTitle, payload: customPayload });
    setSearchFilter("");

    if (metricType === "adherence") {
      setDrilldownLogs([]);
      return;
    }

    setDrilldownLoading(true);
    try {
      const embeddedLogs = report?.records || report?.leaves || report?.leaveLogs || [];
      let filtered = [];

      if (embeddedLogs.length > 0) {
        filtered = embeddedLogs.filter((item) => {
          const status = (item.status || "").toLowerCase();
          const type = (item.leaveType || item.type || "").toLowerCase();
          if (metricType === "approved") return status === "approved";
          if (metricType === "rejected") return status === "rejected";
          if (metricType === "all") return true;
          return type === metricType.toLowerCase();
        });
      }

      if (filtered.length === 0) {
        const params = { year };
        if (metricType === "approved" || metricType === "rejected") {
          params.status = metricType;
        } else if (metricType !== "all") {
          params.leaveType = metricType;
        }

        const { data } = await api.get("/leave", { params });
        const fetchedList = Array.isArray(data) ? data : data?.data || data?.leaves || [];
        filtered = fetchedList.filter((item) => {
          const status = (item.status || "").toLowerCase();
          const type = (item.leaveType || item.type || "").toLowerCase();
          if (metricType === "approved") return status === "approved";
          if (metricType === "rejected") return status === "rejected";
          if (metricType === "all") return true;
          return type === metricType.toLowerCase();
        });
      }

      setDrilldownLogs(filtered);
    } catch {
      setDrilldownLogs([]);
    } finally {
      setDrilldownLoading(false);
    }
  };

  const visibleLogs = useMemo(() => {
    return drilldownLogs.filter((log) => {
      const q = searchFilter.toLowerCase().trim();
      if (!q) return true;
      const emp = log.employee || log.user || {};
      const name = (emp.name || emp.fullName || log.employeeName || "").toLowerCase();
      const code = (emp.employeeId || emp.empId || emp._id || "").toLowerCase();
      const type = (log.leaveType || log.type || "").toLowerCase();
      return name.includes(q) || code.includes(q) || type.includes(q);
    });
  }, [drilldownLogs, searchFilter]);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 px-3 sm:px-4 lg:px-6 py-4 font-sans text-slate-900 antialiased">

      {/* Header & Filter Controls Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Leave Analytics & Reports
            </h1>
            <span className="bg-violet-50 text-violet-700 border border-violet-200 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 font-mono">
              <ShieldCheck size={12} /> {year} Overview
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Review comprehensive employee leave requests and category-wise distribution. Click any card to view detailed records.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2.5 bg-slate-50 p-1.5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-1.5 pl-2 text-xs font-semibold text-slate-500 hidden sm:flex">
            <Calendar size={14} className="text-violet-600" /> Year:
          </div>

          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="w-24 sm:w-28 px-3 py-2 bg-white hover:border-violet-400 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all text-center shadow-2xs font-mono"
          />

          <button
            onClick={fetchReport}
            disabled={loading}
            title="Refresh Data"
            className="p-2.5 bg-white hover:bg-violet-50 text-slate-600 hover:text-violet-600 rounded-xl border border-slate-200 transition-all duration-300 shadow-2xs cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? "animate-spin text-violet-600" : ""} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
          <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center border border-violet-100 animate-pulse">
            <Loader2 className="animate-spin text-violet-600" size={28} />
          </div>
          <p className="text-sm font-semibold text-slate-700">Synthesizing leave applications...</p>
        </div>
      ) : (
        <>
          {/* Main 3 Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

            {/* Total Requests Card */}
            <div
              onClick={() => handleCardClick("all", "All Leave Applications")}
              className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-violet-300 hover:-translate-y-1.5 transition-all duration-300 ease-out flex flex-col justify-between group cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <div className="p-3 bg-violet-50 text-violet-600 rounded-2xl group-hover:bg-violet-600 group-hover:text-white transition-colors duration-300 shadow-2xs">
                    <Calendar size={22} />
                  </div>
                  <span className="text-[11px] font-bold text-violet-700 bg-violet-50 px-2.5 py-0.5 rounded-full border border-violet-200 font-mono group-hover:bg-violet-100">
                    Filed
                  </span>
                </div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Requests</p>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
                    {totalRequests}
                  </h3>
                  <span className="text-xs text-slate-400 font-semibold">applications</span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500 group-hover:text-violet-600 transition-colors">
                <span>View all applications</span>
                <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Approved Card */}
            <div
              onClick={() => handleCardClick("approved", "Approved Leave Sanctions")}
              className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-emerald-300 hover:-translate-y-1.5 transition-all duration-300 ease-out flex flex-col justify-between group cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300 shadow-2xs">
                    <CheckCircle2 size={22} />
                  </div>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-mono group-hover:bg-emerald-100">
                    Sanctioned
                  </span>
                </div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Approved Requests</p>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
                    {approvedCount}
                  </h3>
                  <span className="text-xs text-slate-400 font-semibold">sanctioned</span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500 group-hover:text-emerald-600 transition-colors">
                <span>Inspect approved list</span>
                <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Rejected Card */}
            <div
              onClick={() => handleCardClick("rejected", "Declined Applications")}
              className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-rose-300 hover:-translate-y-1.5 transition-all duration-300 ease-out flex flex-col justify-between group cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl group-hover:bg-rose-600 group-hover:text-white transition-colors duration-300 shadow-2xs">
                    <XCircle size={22} />
                  </div>
                  <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200 font-mono group-hover:bg-rose-100">
                    Declined
                  </span>
                </div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Rejected Requests</p>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
                    {rejectedCount}
                  </h3>
                  <span className="text-xs text-slate-400 font-semibold">declined</span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500 group-hover:text-rose-600 transition-colors">
                <span>View rejected logs</span>
                <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

          </div>

          {/* Interactive Adherence Rate Card */}
          <div
            onClick={() => handleCardClick("adherence", "Leave Approval Ratio Analysis", {
              totalRequests,
              approvedCount,
              rejectedCount,
              pendingCount,
              approvalRate
            })}
            className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-emerald-300 hover:-translate-y-1 transition-all duration-300 ease-out flex flex-col md:flex-row items-center justify-between gap-6 cursor-pointer group"
          >
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="p-3.5 bg-emerald-50 group-hover:bg-emerald-500 group-hover:text-white transition-colors border border-emerald-100 rounded-2xl text-emerald-600 font-bold shadow-2xs">
                <Percent size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-slate-900 text-sm sm:text-base group-hover:text-emerald-700 transition-colors">
                    Leave Approval Compliance Rate
                  </h4>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 hidden sm:inline-flex items-center gap-1">
                    Inspect <ArrowUpRight size={12} />
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">Ratio of granted approvals out of submitted requests. Click to view detailed analysis.</p>
              </div>
            </div>

            <div className="flex items-center gap-4 w-full md:w-80 shrink-0">
              <div className="flex-1 h-3.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200 shadow-inner">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-1000 ease-out group-hover:brightness-110"
                  style={{ width: `${approvalRate}%` }}
                />
              </div>
              <span className="text-base font-black text-slate-900 font-mono min-w-[4ch] text-right">
                {approvalRate}%
              </span>
              <ChevronRight size={18} className="text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all hidden sm:block" />
            </div>
          </div>

          {/* Leave Type Distribution Breakdown Card */}
          <div className="bg-white p-5 sm:p-6 lg:p-7 rounded-3xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-5 sm:mb-6 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-violet-50 text-violet-600 rounded-2xl">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base sm:text-lg tracking-tight">
                    Leave Type Distribution Breakdown
                  </h3>
                  <p className="text-xs text-slate-500">Click any leave category to inspect detailed applications.</p>
                </div>
              </div>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full w-fit font-mono">
                {Object.keys(byType).length} Categories
              </span>
            </div>

            {Object.keys(byType).length === 0 ? (
              <div className="text-center py-12 px-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">No leave classification logs found</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Applications recorded for {year} will appear here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(byType).map(([type, days]) => {
                  const percentage = totalRequests > 0 ? Math.round((days / totalRequests) * 100) : 0;

                  return (
                    <div
                      key={type}
                      onClick={() => handleCardClick(type, `${type.toUpperCase()} Leave Applications`)}
                      className="group flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 rounded-2xl border border-slate-200/70 bg-slate-50/40 hover:bg-white hover:border-violet-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                    >
                      {/* Leave Type Name */}
                      <div className="w-full sm:w-56 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2.5 truncate">
                          <div className="w-2.5 h-2.5 rounded-full bg-violet-600 group-hover:scale-125 transition-transform" />
                          <span className="font-bold text-xs sm:text-sm text-slate-800 group-hover:text-violet-600 transition-colors capitalize truncate">
                            {type}
                          </span>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-400 sm:hidden">
                          {days} Days ({percentage}%)
                        </span>
                      </div>

                      {/* Progress Bar Track */}
                      <div className="flex-1 h-3 bg-slate-200/80 rounded-full overflow-hidden p-0.5 shadow-inner">
                        <div
                          className="h-full bg-violet-600 group-hover:bg-violet-500 rounded-full transition-all duration-700 ease-out"
                          style={{ width: `${Math.max((days / maxCount) * 100, 5)}%` }}
                        />
                      </div>

                      {/* Count Days Badge & Arrow */}
                      <div className="hidden sm:flex items-center justify-end gap-3 w-40 shrink-0">
                        <span className="text-xs font-bold text-slate-700 font-mono">
                          {days} <span className="text-slate-400 font-normal font-sans">Days ({percentage}%)</span>
                        </span>
                        <div className="p-1 text-slate-400 group-hover:text-violet-600 group-hover:translate-x-1 transition-all">
                          <ChevronRight size={16} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Professional Center-Screen Popup Modal */}
      {activeMetric && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setActiveMetric(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-xl w-full max-h-[85vh] flex flex-col overflow-hidden transform scale-100 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Top Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-violet-600 text-white rounded-2xl shadow-xs">
                  {activeMetric.type === "adherence" ? <Activity size={22} /> : <Calendar size={22} />}
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                    {activeMetric.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Year {year} • <span className="font-bold text-violet-600 font-mono">{drilldownLogs.length}</span> Records
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveMetric(null)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            {activeMetric.type === "adherence" ? (
              <div className="p-6 space-y-6 overflow-y-auto">
                <div className="p-5 bg-emerald-50/60 rounded-2xl border border-emerald-100 text-center">
                  <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Leave Sanction Ratio</p>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <span className="text-4xl sm:text-5xl font-extrabold text-emerald-600 font-mono tracking-tight">
                      {approvalRate}%
                    </span>
                  </div>
                  <p className="text-xs text-emerald-700 mt-1">
                    {approvalRate >= 70 ? "Healthy approval distribution recorded." : "Lower approval compliance observed this year."}
                  </p>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Summary Breakdown</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
                      <span className="text-[11px] text-slate-500 font-medium block">Approved</span>
                      <span className="text-lg font-bold text-emerald-600 font-mono">{approvedCount}</span>
                    </div>
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
                      <span className="text-[11px] text-slate-500 font-medium block">Rejected</span>
                      <span className="text-lg font-bold text-rose-600 font-mono">{rejectedCount}</span>
                    </div>
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
                      <span className="text-[11px] text-slate-500 font-medium block">Pending</span>
                      <span className="text-lg font-bold text-amber-600 font-mono">{pendingCount}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Total Requests Processed:</span>
                    <span className="font-bold text-slate-900 font-mono">{totalRequests}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Active Categories Mapped:</span>
                    <span className="font-bold text-slate-900 font-mono">{Object.keys(byType).length} Types</span>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="p-4 border-b border-slate-100 bg-white">
                  <div className="relative">
                    <Search size={15} className="absolute left-3.5 top-3 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search employee, ID, or leave type..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition"
                    />
                  </div>
                </div>

                <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-2.5">
                  {drilldownLoading ? (
                    <div className="py-16 text-center flex flex-col items-center justify-center gap-2 text-slate-400">
                      <Loader2 className="animate-spin text-violet-600" size={30} />
                      <p className="text-xs font-semibold">Pulling records for this category...</p>
                    </div>
                  ) : visibleLogs.length === 0 ? (
                    <div className="text-center py-16 px-4">
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto text-slate-400 mb-2">
                        <User size={22} />
                      </div>
                      <p className="text-xs font-bold text-slate-700">No applications found</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {searchFilter ? "No staff matches your search query." : "No explicit applications found for this selection."}
                      </p>
                    </div>
                  ) : (
                    visibleLogs.map((log) => {
                      const emp = log.employee || log.user || {};
                      const empName = emp.name || emp.fullName || log.employeeName || "Staff Member";
                      const empCode = emp.employeeId || emp.empId || emp._id?.slice(-6) || "—";
                      const startDate = log.startDate ? new Date(log.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—";
                      const endDate = log.endDate ? new Date(log.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—";
                      const status = (log.status || "pending").toLowerCase();

                      return (
                        <div
                          key={log._id || log.id || Math.random()}
                          className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-violet-200 hover:shadow-xs transition-all duration-200 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-violet-50 border border-violet-100 text-violet-700 font-bold text-xs flex items-center justify-center shrink-0 uppercase shadow-2xs">
                              {empName.slice(0, 2)}
                            </div>
                            <div className="truncate">
                              <p className="text-xs font-bold text-slate-900 truncate">{empName}</p>
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                ID: {empCode} • {startDate} - {endDate}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border block ${status === "approved"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : status === "rejected"
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                              }`}>
                              {status}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-400 block mt-1">
                              {log.totalDays || 1} {(log.totalDays || 1) === 1 ? "day" : "days"} • {log.leaveType || "General"}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}

            {/* Modal Bottom Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/60">
              <button
                onClick={() => setActiveMetric(null)}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}