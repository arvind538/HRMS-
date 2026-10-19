// src/app/(dashboard)/reports/recruitment/page.jsx
"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Loader2,
  Users,
  UserCheck,
  RefreshCw,
  UserPlus,
  ChevronRight,
  X,
  Search,
  User,
  ShieldCheck,
  Percent,
  Activity,
  Briefcase,
  Mail,
  Phone,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";

/* ------------------------------ helpers ------------------------------ */

const STATUS_COLOR_MAP = {
  applied: { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200", dot: "bg-slate-400" },
  shortlisted: { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200", dot: "bg-sky-500" },
  "interview-scheduled": { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200", dot: "bg-indigo-500" },
  interviewed: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", dot: "bg-amber-500" },
  offered: { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200", dot: "bg-violet-500" },
  hired: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500" },
  rejected: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", dot: "bg-rose-500" },
};

// Funnel ka natural order (baaki unknown stages end me)
const STAGE_ORDER = [
  "applied",
  "shortlisted",
  "interview-scheduled",
  "interviewed",
  "offered",
  "hired",
  "rejected",
];

const TONES = {
  indigo: { box: "bg-indigo-600", hover: "hover:border-indigo-300" },
  emerald: { box: "bg-emerald-600", hover: "hover:border-emerald-300" },
  amber: { box: "bg-amber-500", hover: "hover:border-amber-300" },
};

// Backend ke alag-alag response shapes se candidates ki list nikalta hai
const extractList = (resData) => {
  if (!resData) return [];
  if (Array.isArray(resData)) return resData;
  if (Array.isArray(resData.candidates)) return resData.candidates;
  if (Array.isArray(resData.applications)) return resData.applications;
  if (Array.isArray(resData.data)) return resData.data;
  if (Array.isArray(resData.data?.candidates)) return resData.data.candidates;
  if (Array.isArray(resData.data?.applications)) return resData.data.applications;
  if (Array.isArray(resData.records)) return resData.records;
  return [];
};

const statusOf = (c) => String(c.status || "applied").toLowerCase();

/* ------------------------- slim stat card ------------------------- */

function StatCard({ icon: Icon, value, unit, label, tone, onClick }) {
  const t = TONES[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group w-full text-left flex items-center gap-3 bg-white px-3.5 py-3 rounded-2xl border border-slate-200/80 shadow-sm ${t.hover} hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500/40`}
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

export default function RecruitmentReportsPage() {
  const [report, setReport] = useState(null);
  const [allCandidates, setAllCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal states (activeMetric close ke baad bhi rakha hai taaki close animation me content na ude)
  const [modalOpen, setModalOpen] = useState(false);
  const [activeMetric, setActiveMetric] = useState(null);
  const [drilldownLogs, setDrilldownLogs] = useState([]);
  const [drilldownLoading, setDrilldownLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");

  const closeModal = useCallback(() => setModalOpen(false), []);

  // Report + candidate roster ek saath fetch
  const fetchReportData = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const [reportRes, candidateRes] = await Promise.allSettled([
        api.get("/reports/recruitment"),
        api
          .get("/candidates")
          .catch(() => api.get("/recruitment/candidates"))
          .catch(() => api.get("/recruitment")),
      ]);

      const reportData = reportRes.status === "fulfilled" ? reportRes.value?.data : null;
      const candidatesData = candidateRes.status === "fulfilled" ? candidateRes.value?.data : null;

      const parsedReport = reportData?.data || reportData || {};
      const parsedCandidates = extractList(candidatesData);

      // Report ke andar embedded candidates fallback
      const embeddedList = extractList(parsedReport);
      const combinedCandidates = parsedCandidates.length > 0 ? parsedCandidates : embeddedList;

      setReport(parsedReport);
      setAllCandidates(combinedCandidates);
    } catch (err) {
      console.error("Recruitment fetch error:", err);
      toast.error("Failed to load recruitment report data.");
      setReport({});
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // Safe metric counts
  const totalCandidates = report?.totalCandidates ?? report?.total ?? allCandidates.length;
  const hiredCount =
    report?.hired ??
    report?.hiredCount ??
    allCandidates.filter((c) => statusOf(c) === "hired").length;
  const rejectedCount =
    report?.rejected ??
    report?.rejectedCount ??
    allCandidates.filter((c) => statusOf(c) === "rejected").length;
  const inPipelineCount = Math.max(0, totalCandidates - hiredCount - rejectedCount);

  const conversionRate = totalCandidates > 0 ? Math.round((hiredCount / totalCandidates) * 100) : 0;

  // Status breakdown
  const byStatus = useMemo(() => {
    const raw = report?.byStatus || report?.statusCounts || {};
    const formatted = {};

    if (typeof raw === "object" && !Array.isArray(raw) && Object.keys(raw).length > 0) {
      Object.entries(raw).forEach(([k, v]) => {
        formatted[k.toLowerCase()] = Number(v) || 0;
      });
      return formatted;
    }

    if (Array.isArray(raw) && raw.length > 0) {
      raw.forEach((item) => {
        const statusKey = String(item._id || item.status || "applied").toLowerCase();
        formatted[statusKey] = item.count || item.total || 1;
      });
      return formatted;
    }

    // Report ne group nahi kiya to candidates list se nikaalo
    allCandidates.forEach((cand) => {
      const st = statusOf(cand);
      formatted[st] = (formatted[st] || 0) + 1;
    });

    return formatted;
  }, [report, allCandidates]);

  const statusEntries = useMemo(() => {
    const rank = (s) => {
      const i = STAGE_ORDER.indexOf(s);
      return i === -1 ? STAGE_ORDER.length : i;
    };
    return Object.entries(byStatus).sort((a, b) => rank(a[0]) - rank(b[0]));
  }, [byStatus]);

  const maxCount = Math.max(...Object.values(byStatus), 1);

  // Card / row click -> open modal
  const handleCardClick = async (metricType, metricTitle) => {
    setActiveMetric({ type: metricType, title: metricTitle });
    setSearchFilter("");
    setModalOpen(true);

    if (metricType === "conversion") {
      setDrilldownLogs([]);
      return;
    }

    setDrilldownLoading(true);
    try {
      const matches = (cand) => {
        const st = statusOf(cand);
        if (metricType === "all") return true;
        if (metricType === "hired") return st === "hired";
        if (metricType === "pipeline") return st !== "hired" && st !== "rejected";
        return st === metricType.toLowerCase();
      };

      // 1. Pehle memory me jo candidates hain (instant)
      let filtered = allCandidates.filter(matches);

      // 2. Khaali ho to alag-alag endpoints se fetch
      if (filtered.length === 0) {
        let fetchedData = null;
        try {
          const res = await api.get("/candidates", {
            params: metricType !== "all" ? { status: metricType } : {},
          });
          fetchedData = res.data;
        } catch {
          try {
            const res = await api.get("/recruitment/candidates");
            fetchedData = res.data;
          } catch {
            const res = await api.get("/recruitment");
            fetchedData = res.data;
          }
        }

        const rawList = extractList(fetchedData);
        if (rawList.length > 0) filtered = rawList.filter(matches);
      }

      setDrilldownLogs(filtered);
    } catch (err) {
      console.error("Modal fetch error:", err);
      setDrilldownLogs([]);
    } finally {
      setDrilldownLoading(false);
    }
  };

  const visibleLogs = useMemo(() => {
    const q = searchFilter.toLowerCase().trim();
    if (!q) return drilldownLogs;
    return drilldownLogs.filter((log) => {
      const name = String(log.name || log.fullName || log.applicantName || "").toLowerCase();
      const email = String(log.email || "").toLowerCase();
      const position = String(log.position || log.role || log.jobTitle || log.job?.title || "").toLowerCase();
      const status = statusOf(log);
      return name.includes(q) || email.includes(q) || position.includes(q) || status.includes(q);
    });
  }, [drilldownLogs, searchFilter]);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-3 sm:space-y-4 px-3 sm:px-4 lg:px-6 py-3 sm:py-4 font-sans text-slate-900 antialiased">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 bg-white px-4 py-3 sm:px-5 sm:py-4 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-base sm:text-xl font-bold tracking-tight text-slate-900">
              Recruitment & Hiring Reports
            </h1>
            <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 font-mono">
              <ShieldCheck size={11} /> Talent Pipeline
            </span>
          </div>
          <p className="hidden sm:block text-xs text-slate-500 mt-0.5">
            Candidate pipeline, stages aur hiring success rate. Kisi bhi card par click karke profiles dekhein.
          </p>
        </div>

        <button
          onClick={() => fetchReportData(true)}
          disabled={loading || refreshing}
          title="Refresh Funnel"
          className="shrink-0 inline-flex items-center justify-center gap-2 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 font-semibold p-2.5 sm:px-4 sm:py-2 rounded-xl border border-slate-200 transition-all active:scale-95 cursor-pointer text-xs disabled:opacity-60"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin text-indigo-600" : ""} />
          <span className="hidden sm:inline">Refresh Funnel</span>
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[45vh] gap-3">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center border border-indigo-100">
            <Loader2 className="animate-spin text-indigo-600" size={28} />
          </div>
          <p className="text-sm font-semibold text-slate-700">Synthesizing recruitment funnel...</p>
        </div>
      ) : (
        <>
          {/* Slim summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
            <StatCard
              icon={Users}
              tone="indigo"
              value={totalCandidates}
              unit="applicants"
              label="Total Candidates"
              onClick={() => handleCardClick("all", "Candidate Master Pool")}
            />
            <StatCard
              icon={UserCheck}
              tone="emerald"
              value={hiredCount}
              unit="onboarded"
              label="Hired Applicants"
              onClick={() => handleCardClick("hired", "Hired & Converted Candidates")}
            />
            <StatCard
              icon={Activity}
              tone="amber"
              value={inPipelineCount}
              unit="in review"
              label="Active Pipeline"
              onClick={() => handleCardClick("pipeline", "Active Pipeline Review")}
            />
          </div>

          {/* Conversion rate (slim) */}
          <button
            type="button"
            onClick={() => handleCardClick("conversion", "Talent Acquisition Funnel Metrics")}
            className="group w-full text-left bg-white px-3.5 py-3 sm:px-4 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-emerald-300 hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-200 flex flex-col md:flex-row md:items-center gap-3 md:gap-6 cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500/40"
          >
            <div className="flex items-center gap-3 min-w-0 md:flex-1">
              <div className="w-10 h-10 shrink-0 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                <Percent size={18} />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-slate-900 text-sm group-hover:text-emerald-700 transition-colors truncate">
                  Hiring Conversion Rate
                </h4>
                <p className="text-[11px] text-slate-500 truncate sm:whitespace-normal">
                  Poore candidate funnel me se onboard hue applicants ka ratio. Detail ke liye click karein.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 md:w-80 shrink-0">
              <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${conversionRate}%` }}
                />
              </div>
              <span className="text-base font-black text-slate-900 font-mono min-w-[4ch] text-right">
                {conversionRate}%
              </span>
              <ChevronRight
                size={16}
                className="text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all"
              />
            </div>
          </button>

          {/* Status breakdown stages */}
          <div className="bg-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-3 sm:mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
                  <UserPlus size={18} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base tracking-tight truncate">
                    Candidate Status Breakdown
                  </h3>
                  <p className="text-[11px] text-slate-500 truncate">
                    Stage par click karke us round ke candidates dekhein.
                  </p>
                </div>
              </div>
              <span className="shrink-0 text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full font-mono">
                {statusEntries.length} Stages
              </span>
            </div>

            {statusEntries.length === 0 ? (
              <div className="text-center py-10 px-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <Users className="w-9 h-9 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">No candidate pipeline data records found</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Active job applications will appear categorized by their interview state.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {statusEntries.map(([status, count]) => {
                  const percentage = totalCandidates > 0 ? Math.round((count / totalCandidates) * 100) : 0;
                  const colors = STATUS_COLOR_MAP[status] || STATUS_COLOR_MAP.applied;
                  const label = status.replace(/-/g, " ");

                  return (
                    <button
                      type="button"
                      key={status}
                      onClick={() => handleCardClick(status, `${label.toUpperCase()} Candidates`)}
                      className="group w-full text-left flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-3 py-2.5 sm:px-4 rounded-xl border border-slate-200/70 bg-slate-50/40 hover:bg-white hover:border-indigo-300 hover:shadow-md transition-all duration-200 cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500/40"
                    >
                      {/* Stage (+ count on mobile) */}
                      <div className="flex items-center justify-between gap-2 sm:w-52 shrink-0 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${colors.dot}`} />
                          <span className="font-bold text-xs sm:text-sm text-slate-800 group-hover:text-indigo-600 transition-colors capitalize truncate">
                            {label}
                          </span>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-500 sm:hidden shrink-0 font-mono">
                          {count} ({percentage}%)
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="flex-1 h-2 bg-slate-200/80 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ease-out ${colors.dot}`}
                          style={{ width: `${Math.max((count / maxCount) * 100, 4)}%` }}
                        />
                      </div>

                      {/* Count (desktop) */}
                      <div className="hidden sm:flex items-center justify-end gap-2 w-40 shrink-0">
                        <span className="text-xs font-bold text-slate-700 font-mono">
                          {count}{" "}
                          <span className="text-slate-400 font-normal font-sans">({percentage}%)</span>
                        </span>
                        <ChevronRight
                          size={15}
                          className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all"
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
                <div className="p-2.5 bg-indigo-600 text-white rounded-xl shrink-0">
                  {activeMetric.type === "conversion" ? <Activity size={18} /> : <Briefcase size={18} />}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate">
                    {activeMetric.title}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-500">
                    Talent Funnel
                    {activeMetric.type !== "conversion" && (
                      <>
                        {" "}•{" "}
                        <span className="font-bold text-indigo-600 font-mono">{drilldownLogs.length}</span> Records
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
            {activeMetric.type === "conversion" ? (
              <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
                <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100 text-center">
                  <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                    Hiring Funnel Conversion
                  </p>
                  <span className="block mt-1 text-4xl font-extrabold text-emerald-600 font-mono tracking-tight">
                    {conversionRate}%
                  </span>
                  <p className="text-xs text-emerald-700 mt-1">
                    {conversionRate >= 15
                      ? "Healthy applicant conversion to job offers."
                      : "High applicant drop-off observed across interview rounds."}
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Pipeline Composition
                  </h4>
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                      <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium block">Total</span>
                      <span className="text-lg font-bold text-indigo-600 font-mono">{totalCandidates}</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                      <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium block">Hired</span>
                      <span className="text-lg font-bold text-emerald-600 font-mono">{hiredCount}</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                      <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium block">In Review</span>
                      <span className="text-lg font-bold text-amber-600 font-mono">{inPipelineCount}</span>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Active Review Stages:</span>
                    <span className="font-bold text-slate-900 font-mono">{statusEntries.length} Levels</span>
                  </div>
                  <div className="flex justify-between items-center gap-3 text-slate-600">
                    <span>Direct Success Index:</span>
                    <span className="font-bold text-slate-900 font-mono text-right">
                      {hiredCount} hires / {totalCandidates} applicants
                    </span>
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
                      placeholder="Search candidate name, email, or role..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-medium"
                    />
                  </div>
                </div>

                <div className="px-3 sm:px-4 py-3 flex-1 overflow-y-auto space-y-2">
                  {drilldownLoading ? (
                    <div className="py-14 text-center flex flex-col items-center justify-center gap-2 text-slate-400">
                      <Loader2 className="animate-spin text-indigo-600" size={30} />
                      <p className="text-xs font-semibold">Pulling candidate records...</p>
                    </div>
                  ) : visibleLogs.length === 0 ? (
                    <div className="text-center py-12 px-4">
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto text-slate-400 mb-2">
                        <User size={22} />
                      </div>
                      <p className="text-xs font-bold text-slate-700">No candidate records found</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {searchFilter
                          ? "No profiles match your search criteria."
                          : "No explicit candidates found in this round."}
                      </p>
                    </div>
                  ) : (
                    visibleLogs.map((candidate, i) => {
                      const name = candidate.name || candidate.fullName || candidate.applicantName || "Candidate";
                      const position =
                        candidate.position || candidate.jobTitle || candidate.role || candidate.job?.title || "Applicant";
                      const email = candidate.email || "";
                      const phone = candidate.phone || candidate.mobile || "";
                      const status = statusOf(candidate);
                      const colors = STATUS_COLOR_MAP[status] || STATUS_COLOR_MAP.applied;

                      return (
                        <div
                          key={candidate._id || candidate.id || i}
                          className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-indigo-200 transition-all duration-200 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0 uppercase">
                              {String(name).slice(0, 2)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate">{name}</p>
                              <p className="text-[11px] text-slate-500 truncate">{position}</p>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5 min-w-0">
                                {email && (
                                  <span className="flex items-center gap-1 truncate">
                                    <Mail size={10} className="shrink-0" />
                                    <span className="truncate">{email}</span>
                                  </span>
                                )}
                                {phone && (
                                  <span className="hidden sm:flex items-center gap-1 shrink-0">
                                    <Phone size={10} /> {phone}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <span
                            className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${colors.bg} ${colors.text} ${colors.border}`}
                          >
                            {status.replace(/-/g, " ")}
                          </span>
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