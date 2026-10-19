// src/app/(dashboard)/reports/leave/page.jsx
"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Calendar,
  RefreshCw,
  FileText,
  ChevronRight,
  X,
  Search,
  User,
  ShieldCheck,
  Percent,
  Activity,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";

/* ------------------------------ helpers ------------------------------ */

const TONES = {
  violet: { box: "bg-violet-600", hover: "hover:border-violet-300" },
  emerald: { box: "bg-emerald-600", hover: "hover:border-emerald-300" },
  rose: { box: "bg-rose-600", hover: "hover:border-rose-300" },
};

const fmtShort = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—";

/* ------------------------- slim stat card ------------------------- */

function StatCard({ icon: Icon, value, unit, label, tone, onClick }) {
  const t = TONES[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group w-full text-left flex items-center gap-3 bg-white px-3.5 py-3 rounded-2xl border border-slate-200/80 shadow-sm ${t.hover} hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-violet-500/40`}
    >
      <div className={`w-10 h-10 shrink-0 rounded-xl ${t.box} text-white flex items-center justify-center shadow-sm`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xl font-extrabold leading-tight text-slate-900 font-mono">
          {value}
          {unit && <span className="ml-1 text-[11px] font-semibold text-slate-400 font-sans">{unit}</span>}
        </p>
        <p className="text-[11px] text-slate-500 font-medium truncate">{label}</p>
      </div>
      <ChevronRight
        size={16}
        className="shrink-0 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all"
      />
    </button>
  );
}

/* --------------------- animated modal (reusable) --------------------- */

function Modal({ open, onClose, children }) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const id = requestAnimationFrame(() =>
        requestAnimationFrame(() => setVisible(true))
      );
      return () => cancelAnimationFrame(id);
    }
    setVisible(false);
    const t = setTimeout(() => setMounted(false), 250);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!mounted) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [mounted, onClose]);

  if (!mounted) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}
      />
      <div
        className={`relative w-full sm:max-w-xl bg-white shadow-2xl rounded-t-3xl sm:rounded-3xl max-h-[88vh] flex flex-col overflow-hidden transition-all duration-300 ease-out ${visible
          ? "opacity-100 translate-y-0 sm:scale-100"
          : "opacity-0 translate-y-8 sm:translate-y-0 sm:scale-95"
          }`}
      >
        {children}
      </div>
    </div>
  );
}

/* ------------------------------- page -------------------------------- */

export default function LeaveReportsPage() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());

  // Modal states (activeMetric close ke baad bhi rakha hai taaki close animation me content na ude)
  const [modalOpen, setModalOpen] = useState(false);
  const [activeMetric, setActiveMetric] = useState(null);
  const [drilldownLogs, setDrilldownLogs] = useState([]);
  const [drilldownLoading, setDrilldownLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");

  const closeModal = useCallback(() => setModalOpen(false), []);

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

  // Safe metric counts
  const totalRequests = report?.totalRequests ?? report?.total ?? 0;
  const approvedCount = report?.approved ?? report?.approvedCount ?? 0;
  const rejectedCount = report?.rejected ?? report?.rejectedCount ?? 0;
  const pendingCount =
    report?.pending ?? Math.max(0, totalRequests - (approvedCount + rejectedCount));

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

  const typeEntries = useMemo(
    () => Object.entries(byType).sort((a, b) => b[1] - a[1]),
    [byType]
  );
  const maxCount = Math.max(...Object.values(byType), 1);

  // Card / row click -> open modal
  const handleCardClick = async (metricType, metricTitle) => {
    setActiveMetric({ type: metricType, title: metricTitle });
    setSearchFilter("");
    setModalOpen(true);

    if (metricType === "adherence") {
      setDrilldownLogs([]);
      return;
    }

    setDrilldownLoading(true);
    try {
      const matches = (item) => {
        const status = (item.status || "").toLowerCase();
        const type = (item.leaveType || item.type || "").toLowerCase();
        if (metricType === "approved") return status === "approved";
        if (metricType === "rejected") return status === "rejected";
        if (metricType === "all") return true;
        return type === metricType.toLowerCase();
      };

      const embeddedLogs = report?.records || report?.leaves || report?.leaveLogs || [];
      let filtered = embeddedLogs.length > 0 ? embeddedLogs.filter(matches) : [];

      if (filtered.length === 0) {
        const params = { year };
        if (metricType === "approved" || metricType === "rejected") {
          params.status = metricType;
        } else if (metricType !== "all") {
          params.leaveType = metricType;
        }

        const { data } = await api.get("/leave", { params });
        const fetchedList = Array.isArray(data) ? data : data?.data || data?.leaves || [];
        filtered = fetchedList.filter(matches);
      }

      setDrilldownLogs(filtered);
    } catch {
      setDrilldownLogs([]);
    } finally {
      setDrilldownLoading(false);
    }
  };

  const visibleLogs = useMemo(() => {
    const q = searchFilter.toLowerCase().trim();
    if (!q) return drilldownLogs;
    return drilldownLogs.filter((log) => {
      const emp = log.employee || log.user || {};
      const name = String(emp.name || emp.fullName || log.employeeName || "").toLowerCase();
      const code = String(emp.employeeId || emp.empId || emp._id || "").toLowerCase();
      const type = String(log.leaveType || log.type || "").toLowerCase();
      return name.includes(q) || code.includes(q) || type.includes(q);
    });
  }, [drilldownLogs, searchFilter]);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-3 sm:space-y-4 px-3 sm:px-4 lg:px-6 py-3 sm:py-4 font-sans text-slate-900 antialiased">
      {/* Header & year filter */}
      <div className="flex items-center justify-between gap-3 bg-white px-4 py-3 sm:px-5 sm:py-4 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-base sm:text-xl font-bold tracking-tight text-slate-900">
              Leave Analytics & Reports
            </h1>
            <span className="bg-violet-50 text-violet-700 border border-violet-200 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 font-mono">
              <ShieldCheck size={11} /> {year}
            </span>
          </div>
          <p className="hidden sm:block text-xs text-slate-500 mt-0.5">
            Leave requests aur category-wise distribution. Kisi bhi card par click karke records dekhein.
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
          <div className="hidden sm:flex items-center gap-1.5 pl-2 text-xs font-semibold text-slate-500">
            <Calendar size={14} className="text-violet-600" /> Year:
          </div>

          <input
            type="number"
            value={year}
            min={2000}
            max={2100}
            aria-label="Year"
            onChange={(e) => {
              const v = Number(e.target.value);
              if (v >= 2000 && v <= 2100) setYear(v);
              else if (e.target.value === "") setYear(new Date().getFullYear());
            }}
            className="w-20 sm:w-24 px-2 py-1.5 bg-white hover:border-violet-400 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all text-center font-mono"
          />

          <button
            onClick={fetchReport}
            disabled={loading}
            title="Refresh Data"
            className="p-2 bg-white hover:bg-violet-50 text-slate-600 hover:text-violet-600 rounded-lg border border-slate-200 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-violet-600" : ""} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[45vh] gap-3">
          <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center border border-violet-100">
            <Loader2 className="animate-spin text-violet-600" size={28} />
          </div>
          <p className="text-sm font-semibold text-slate-700">Synthesizing leave applications...</p>
        </div>
      ) : (
        <>
          {/* Slim summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
            <StatCard
              icon={Calendar}
              tone="violet"
              value={totalRequests}
              unit="apps"
              label="Total Requests"
              onClick={() => handleCardClick("all", "All Leave Applications")}
            />
            <StatCard
              icon={CheckCircle2}
              tone="emerald"
              value={approvedCount}
              unit="sanctioned"
              label="Approved Requests"
              onClick={() => handleCardClick("approved", "Approved Leave Sanctions")}
            />
            <StatCard
              icon={XCircle}
              tone="rose"
              value={rejectedCount}
              unit="declined"
              label="Rejected Requests"
              onClick={() => handleCardClick("rejected", "Declined Applications")}
            />
          </div>

          {/* Approval rate (slim) */}
          <button
            type="button"
            onClick={() => handleCardClick("adherence", "Leave Approval Ratio Analysis")}
            className="group w-full text-left bg-white px-3.5 py-3 sm:px-4 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-emerald-300 hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-200 flex flex-col md:flex-row md:items-center gap-3 md:gap-6 cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500/40"
          >
            <div className="flex items-center gap-3 min-w-0 md:flex-1">
              <div className="w-10 h-10 shrink-0 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                <Percent size={18} />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-slate-900 text-sm group-hover:text-emerald-700 transition-colors truncate">
                  Leave Approval Compliance Rate
                </h4>
                <p className="text-[11px] text-slate-500 truncate sm:whitespace-normal">
                  Submitted requests me se approved ka ratio. Detail ke liye click karein.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 md:w-80 shrink-0">
              <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${approvalRate}%` }}
                />
              </div>
              <span className="text-base font-black text-slate-900 font-mono min-w-[4ch] text-right">
                {approvalRate}%
              </span>
              <ChevronRight
                size={16}
                className="text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all"
              />
            </div>
          </button>

          {/* Leave type distribution */}
          <div className="bg-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-3 sm:mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 bg-violet-50 text-violet-600 rounded-xl shrink-0">
                  <FileText size={18} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base tracking-tight truncate">
                    Leave Type Distribution
                  </h3>
                  <p className="text-[11px] text-slate-500 truncate">
                    Category par click karke applications dekhein.
                  </p>
                </div>
              </div>
              <span className="shrink-0 text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full font-mono">
                {typeEntries.length} Types
              </span>
            </div>

            {typeEntries.length === 0 ? (
              <div className="text-center py-10 px-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <FileText className="w-9 h-9 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">No leave classification logs found</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Applications recorded for {year} will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {typeEntries.map(([type, days]) => {
                  const percentage = totalRequests > 0 ? Math.round((days / totalRequests) * 100) : 0;

                  return (
                    <button
                      type="button"
                      key={type}
                      onClick={() => handleCardClick(type, `${type.toUpperCase()} Leave Applications`)}
                      className="group w-full text-left flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-3 py-2.5 sm:px-4 rounded-xl border border-slate-200/70 bg-slate-50/40 hover:bg-white hover:border-violet-300 hover:shadow-md transition-all duration-200 cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-violet-500/40"
                    >
                      {/* Name (+ count on mobile) */}
                      <div className="flex items-center justify-between gap-2 sm:w-52 shrink-0 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2 h-2 rounded-full shrink-0 bg-violet-600" />
                          <span className="font-bold text-xs sm:text-sm text-slate-800 group-hover:text-violet-600 transition-colors capitalize truncate">
                            {type}
                          </span>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-500 sm:hidden shrink-0 font-mono">
                          {days} ({percentage}%)
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="flex-1 h-2 bg-slate-200/80 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-violet-600 group-hover:bg-violet-500 rounded-full transition-all duration-700 ease-out"
                          style={{ width: `${Math.max((days / maxCount) * 100, 4)}%` }}
                        />
                      </div>

                      {/* Count (desktop) */}
                      <div className="hidden sm:flex items-center justify-end gap-2 w-36 shrink-0">
                        <span className="text-xs font-bold text-slate-700 font-mono">
                          {days}{" "}
                          <span className="text-slate-400 font-normal font-sans">({percentage}%)</span>
                        </span>
                        <ChevronRight
                          size={15}
                          className="text-slate-300 group-hover:text-violet-600 group-hover:translate-x-0.5 transition-all"
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Details popup (center on desktop, bottom sheet on mobile) */}
      <Modal open={modalOpen} onClose={closeModal}>
        {activeMetric && (
          <>
            {/* Header */}
            <div className="px-4 py-3.5 sm:px-5 sm:py-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/60">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 bg-violet-600 text-white rounded-xl shrink-0">
                  {activeMetric.type === "adherence" ? <Activity size={18} /> : <Calendar size={18} />}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate">
                    {activeMetric.title}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-500">
                    Year {year}
                    {activeMetric.type !== "adherence" && (
                      <>
                        {" "}•{" "}
                        <span className="font-bold text-violet-600 font-mono">{drilldownLogs.length}</span> Records
                      </>
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="shrink-0 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            {activeMetric.type === "adherence" ? (
              <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
                <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100 text-center">
                  <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                    Leave Sanction Ratio
                  </p>
                  <span className="block mt-1 text-4xl font-extrabold text-emerald-600 font-mono tracking-tight">
                    {approvalRate}%
                  </span>
                  <p className="text-xs text-emerald-700 mt-1">
                    {approvalRate >= 70
                      ? "Healthy approval distribution recorded."
                      : "Lower approval compliance observed this year."}
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Summary Breakdown
                  </h4>
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                      <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium block">Approved</span>
                      <span className="text-lg font-bold text-emerald-600 font-mono">{approvedCount}</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                      <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium block">Rejected</span>
                      <span className="text-lg font-bold text-rose-600 font-mono">{rejectedCount}</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                      <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium block">Pending</span>
                      <span className="text-lg font-bold text-amber-600 font-mono">{pendingCount}</span>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Total Requests Processed:</span>
                    <span className="font-bold text-slate-900 font-mono">{totalRequests}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Active Categories Mapped:</span>
                    <span className="font-bold text-slate-900 font-mono">{typeEntries.length} Types</span>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="px-4 py-3 border-b border-slate-100 bg-white">
                  <div className="relative">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search employee, ID, or leave type..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition"
                    />
                  </div>
                </div>

                <div className="px-3 sm:px-4 py-3 flex-1 overflow-y-auto space-y-2">
                  {drilldownLoading ? (
                    <div className="py-14 text-center flex flex-col items-center justify-center gap-2 text-slate-400">
                      <Loader2 className="animate-spin text-violet-600" size={30} />
                      <p className="text-xs font-semibold">Pulling records for this category...</p>
                    </div>
                  ) : visibleLogs.length === 0 ? (
                    <div className="text-center py-12 px-4">
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto text-slate-400 mb-2">
                        <User size={22} />
                      </div>
                      <p className="text-xs font-bold text-slate-700">No applications found</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {searchFilter
                          ? "No staff matches your search query."
                          : "No explicit applications found for this selection."}
                      </p>
                    </div>
                  ) : (
                    visibleLogs.map((log, i) => {
                      const emp = log.employee || log.user || {};
                      const empName = emp.name || emp.fullName || log.employeeName || "Staff Member";
                      const empCode =
                        emp.employeeId || emp.empId || (emp._id ? String(emp._id).slice(-6) : "—");
                      const status = (log.status || "pending").toLowerCase();
                      const days = log.totalDays || 1;

                      return (
                        <div
                          key={log._id || log.id || i}
                          className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-violet-200 transition-all duration-200 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-violet-50 border border-violet-100 text-violet-700 font-bold text-xs flex items-center justify-center shrink-0 uppercase">
                              {String(empName).slice(0, 2)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate">{empName}</p>
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                                ID: {empCode} • {fmtShort(log.startDate)} - {fmtShort(log.endDate)}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${status === "approved"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : status === "rejected"
                                  ? "bg-rose-50 text-rose-700 border-rose-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                                }`}
                            >
                              {status}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-400 block mt-0.5 capitalize">
                              {days} {days === 1 ? "day" : "days"} • {log.leaveType || "General"}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}

            {/* Footer */}
            <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/60">
              <button
                onClick={closeModal}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer active:scale-[0.99]"
              >
                Close Details
              </button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}