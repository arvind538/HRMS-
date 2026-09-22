// src/app/(dashboard)/reports/recruitment/page.jsx
"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Loader2,
  Users,
  UserCheck,
  RefreshCw,
  ArrowUpRight,
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
  Calendar
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";

const STATUS_COLOR_MAP = {
  applied: { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200", dot: "bg-slate-400" },
  shortlisted: { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200", dot: "bg-sky-500" },
  "interview-scheduled": { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200", dot: "bg-indigo-500" },
  interviewed: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", dot: "bg-amber-500" },
  offered: { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200", dot: "bg-violet-500" },
  hired: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500" },
  rejected: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", dot: "bg-rose-500" },
};

export default function RecruitmentReportsPage() {
  const [report, setReport] = useState(null);
  const [allCandidates, setAllCandidates] = useState([]);
  const [loading, setLoading] = useState(true);

  // Center Modal States
  const [activeMetric, setActiveMetric] = useState(null);
  const [drilldownLogs, setDrilldownLogs] = useState([]);
  const [drilldownLoading, setDrilldownLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");

  // Helper to extract candidate array from any response format
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

  // Fetch report data + full candidate roster concurrently
  const fetchReportData = useCallback(async () => {
    setLoading(true);
    try {
      const [reportRes, candidateRes] = await Promise.allSettled([
        api.get("/reports/recruitment"),
        // Try standard candidates endpoint
        api.get("/candidates").catch(() => api.get("/recruitment/candidates")).catch(() => api.get("/recruitment"))
      ]);

      const reportData = reportRes.status === "fulfilled" ? reportRes.value?.data : null;
      const candidatesData = candidateRes.status === "fulfilled" ? candidateRes.value?.data : null;

      const parsedReport = reportData?.data || reportData || {};
      const parsedCandidates = extractList(candidatesData);

      // Embedded candidates inside report as fallback
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
    }
  }, []);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // Safe Metric Counts
  const totalCandidates = report?.totalCandidates ?? report?.total ?? allCandidates.length ?? 0;
  const hiredCount = report?.hired ?? report?.hiredCount ?? allCandidates.filter(c => (c.status || "").toLowerCase() === "hired").length ?? 0;
  const rejectedCount = report?.rejected ?? report?.rejectedCount ?? allCandidates.filter(c => (c.status || "").toLowerCase() === "rejected").length ?? 0;
  const inPipelineCount = Math.max(0, totalCandidates - hiredCount - rejectedCount);

  const conversionRate = totalCandidates > 0 ? Math.round((hiredCount / totalCandidates) * 100) : 0;

  // Status Breakdown Aggregation
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
        const statusKey = (item._id || item.status || "applied").toLowerCase();
        formatted[statusKey] = item.count || item.total || 1;
      });
      return formatted;
    }

    // Dynamic fallback from candidates list if report didn't group them
    if (allCandidates.length > 0) {
      allCandidates.forEach((cand) => {
        const st = (cand.status || "applied").toLowerCase();
        formatted[st] = (formatted[st] || 0) + 1;
      });
    }

    return formatted;
  }, [report, allCandidates]);

  const maxCount = Math.max(...Object.values(byStatus), 1);

  // Open Center Modal
  const handleCardClick = async (metricType, metricTitle, customPayload = null) => {
    setActiveMetric({ type: metricType, title: metricTitle, payload: customPayload });
    setSearchFilter("");

    if (metricType === "conversion") {
      setDrilldownLogs([]);
      return;
    }

    setDrilldownLoading(true);
    try {
      // 1. First priority: Check local memory state (Instant & reliable)
      let filtered = allCandidates.filter((cand) => {
        const st = (cand.status || "applied").toLowerCase();
        if (metricType === "all") return true;
        if (metricType === "hired") return st === "hired";
        if (metricType === "pipeline") return st !== "hired" && st !== "rejected";
        return st === metricType.toLowerCase();
      });

      // 2. If memory is empty, fetch dynamically across multiple endpoints
      if (filtered.length === 0) {
        let fetchedData = null;
        try {
          const res = await api.get("/candidates", { params: metricType !== "all" ? { status: metricType } : {} });
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
        if (rawList.length > 0) {
          filtered = rawList.filter((cand) => {
            const st = (cand.status || "applied").toLowerCase();
            if (metricType === "all") return true;
            if (metricType === "hired") return st === "hired";
            if (metricType === "pipeline") return st !== "hired" && st !== "rejected";
            return st === metricType.toLowerCase();
          });
        }
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
    return drilldownLogs.filter((log) => {
      const q = searchFilter.toLowerCase().trim();
      if (!q) return true;
      const name = (log.name || log.fullName || "").toLowerCase();
      const email = (log.email || "").toLowerCase();
      const position = (log.position || log.role || log.jobTitle || log.job?.title || "").toLowerCase();
      const status = (log.status || "").toLowerCase();
      return name.includes(q) || email.includes(q) || position.includes(q) || status.includes(q);
    });
  }, [drilldownLogs, searchFilter]);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 px-3 sm:px-4 lg:px-6 py-4 font-sans text-slate-900 antialiased">

      {/* Header & Controls Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Recruitment & Hiring Reports
            </h1>
            <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 font-mono">
              <ShieldCheck size={12} /> Talent Pipeline
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Monitor candidate pipelines, applicant status stages, and hiring success rates. Click any card to inspect candidate profiles.
          </p>
        </div>

        <button
          onClick={fetchReportData}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 font-semibold px-4 py-2.5 rounded-2xl border border-slate-200 shadow-2xs transition-all duration-200 active:scale-95 cursor-pointer w-full sm:w-auto text-xs"
        >
          <RefreshCw size={14} className={loading ? "animate-spin text-indigo-600" : ""} />
          <span>Refresh Funnel</span>
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center border border-indigo-100 animate-pulse">
            <Loader2 className="animate-spin text-indigo-600" size={28} />
          </div>
          <p className="text-sm font-semibold text-slate-700">Synthesizing recruitment funnel...</p>
        </div>
      ) : (
        <>
          {/* Main 3 Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

            {/* Total Candidates Card */}
            <div
              onClick={() => handleCardClick("all", "Candidate Master Pool")}
              className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-indigo-300 hover:-translate-y-1.5 transition-all duration-300 ease-out flex flex-col justify-between group cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300 shadow-2xs">
                    <Users size={22} />
                  </div>
                  <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200 font-mono group-hover:bg-indigo-100">
                    Total Pool
                  </span>
                </div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Candidates</p>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
                    {totalCandidates}
                  </h3>
                  <span className="text-xs text-slate-400 font-semibold">applicants</span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500 group-hover:text-indigo-600 transition-colors">
                <span>View candidate registry</span>
                <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Hired Candidates Card */}
            <div
              onClick={() => handleCardClick("hired", "Hired & Converted Candidates")}
              className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-emerald-300 hover:-translate-y-1.5 transition-all duration-300 ease-out flex flex-col justify-between group cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300 shadow-2xs">
                    <UserCheck size={22} />
                  </div>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-mono group-hover:bg-emerald-100">
                    Converted
                  </span>
                </div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Hired Applicants</p>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
                    {hiredCount}
                  </h3>
                  <span className="text-xs text-slate-400 font-semibold">onboarded</span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500 group-hover:text-emerald-600 transition-colors">
                <span>Inspect hired profiles</span>
                <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* In-Pipeline Card */}
            <div
              onClick={() => handleCardClick("pipeline", "Active Pipeline Review")}
              className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-amber-300 hover:-translate-y-1.5 transition-all duration-300 ease-out flex flex-col justify-between group cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl group-hover:bg-amber-500 group-hover:text-white transition-colors duration-300 shadow-2xs">
                    <Activity size={22} />
                  </div>
                  <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 font-mono group-hover:bg-amber-100">
                    Active
                  </span>
                </div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Pipeline</p>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
                    {inPipelineCount}
                  </h3>
                  <span className="text-xs text-slate-400 font-semibold">in review</span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500 group-hover:text-amber-600 transition-colors">
                <span>Review active rounds</span>
                <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

          </div>

          {/* Interactive Conversion Compliance Card */}
          <div
            onClick={() => handleCardClick("conversion", "Talent Acquisition Funnel Metrics", {
              totalCandidates,
              hiredCount,
              inPipelineCount,
              conversionRate
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
                    Hiring Conversion Rate
                  </h4>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 hidden sm:inline-flex items-center gap-1">
                    Inspect <ArrowUpRight size={12} />
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">Ratio of successfully onboarded applicants from the entire candidate funnel.</p>
              </div>
            </div>

            <div className="flex items-center gap-4 w-full md:w-80 shrink-0">
              <div className="flex-1 h-3.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200 shadow-inner">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-1000 ease-out group-hover:brightness-110"
                  style={{ width: `${conversionRate}%` }}
                />
              </div>
              <span className="text-base font-black text-slate-900 font-mono min-w-[4ch] text-right">
                {conversionRate}%
              </span>
              <ChevronRight size={18} className="text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all hidden sm:block" />
            </div>
          </div>

          {/* Candidate Status Breakdown Stages Container */}
          <div className="bg-white p-5 sm:p-6 lg:p-7 rounded-3xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-5 sm:mb-6 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base sm:text-lg tracking-tight">
                    Candidate Status Breakdown Stages
                  </h3>
                  <p className="text-xs text-slate-500">Click any stage bar to view candidates progressing in that round.</p>
                </div>
              </div>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full w-fit font-mono">
                {Object.keys(byStatus).length} Stages
              </span>
            </div>

            {Object.keys(byStatus).length === 0 ? (
              <div className="text-center py-12 px-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">No candidate pipeline data records found</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Active job applications will appear categorized by their interview state.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(byStatus).map(([status, count]) => {
                  const percentage = totalCandidates > 0 ? Math.round((count / totalCandidates) * 100) : 0;
                  const colors = STATUS_COLOR_MAP[status] || STATUS_COLOR_MAP.applied;

                  return (
                    <div
                      key={status}
                      onClick={() => handleCardClick(status, `${status.replace(/-/g, " ").toUpperCase()} Candidates`)}
                      className="group flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 rounded-2xl border border-slate-200/70 bg-slate-50/40 hover:bg-white hover:border-indigo-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                    >
                      {/* Stage Name */}
                      <div className="w-full sm:w-56 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2.5 truncate">
                          <div className={`w-2.5 h-2.5 rounded-full ${colors.dot} group-hover:scale-125 transition-transform`} />
                          <span className="font-bold text-xs sm:text-sm text-slate-800 group-hover:text-indigo-600 transition-colors capitalize truncate">
                            {status.replace(/-/g, " ")}
                          </span>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-400 sm:hidden">
                          {count} ({percentage}%)
                        </span>
                      </div>

                      {/* Progress Bar Track */}
                      <div className="flex-1 h-3 bg-slate-200/80 rounded-full overflow-hidden p-0.5 shadow-inner">
                        <div
                          className="h-full bg-indigo-600 group-hover:bg-indigo-500 rounded-full transition-all duration-700 ease-out"
                          style={{ width: `${Math.max((count / maxCount) * 100, 5)}%` }}
                        />
                      </div>

                      {/* Count Badge & Arrow */}
                      <div className="hidden sm:flex items-center justify-end gap-3 w-44 shrink-0">
                        <span className="text-xs font-bold text-slate-700 font-mono">
                          {count} <span className="text-slate-400 font-normal font-sans">profiles ({percentage}%)</span>
                        </span>
                        <div className="p-1 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all">
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
                <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-xs">
                  {activeMetric.type === "conversion" ? <Activity size={22} /> : <Briefcase size={22} />}
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                    {activeMetric.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Talent Funnel • <span className="font-bold text-indigo-600 font-mono">{drilldownLogs.length}</span> Records
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
            {activeMetric.type === "conversion" ? (
              <div className="p-6 space-y-6 overflow-y-auto">
                <div className="p-5 bg-emerald-50/60 rounded-2xl border border-emerald-100 text-center">
                  <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Hiring Funnel Conversion</p>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <span className="text-4xl sm:text-5xl font-extrabold text-emerald-600 font-mono tracking-tight">
                      {conversionRate}%
                    </span>
                  </div>
                  <p className="text-xs text-emerald-700 mt-1">
                    {conversionRate >= 15 ? "Healthy applicant conversion to job offers." : "High applicant drop-off observed across interview rounds."}
                  </p>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pipeline Composition</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
                      <span className="text-[11px] text-slate-500 font-medium block">Total Applicants</span>
                      <span className="text-lg font-bold text-indigo-600 font-mono">{totalCandidates}</span>
                    </div>
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
                      <span className="text-[11px] text-slate-500 font-medium block">Hired</span>
                      <span className="text-lg font-bold text-emerald-600 font-mono">{hiredCount}</span>
                    </div>
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
                      <span className="text-[11px] text-slate-500 font-medium block">Under Review</span>
                      <span className="text-lg font-bold text-amber-600 font-mono">{inPipelineCount}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Active Review Stages:</span>
                    <span className="font-bold text-slate-900 font-mono">{Object.keys(byStatus).length} Levels</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Direct Success Index:</span>
                    <span className="font-bold text-slate-900 font-mono">{hiredCount} hires from {totalCandidates} applicants</span>
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
                      placeholder="Search candidate name, email, or role..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-medium"
                    />
                  </div>
                </div>

                <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-2.5">
                  {drilldownLoading ? (
                    <div className="py-16 text-center flex flex-col items-center justify-center gap-2 text-slate-400">
                      <Loader2 className="animate-spin text-indigo-600" size={30} />
                      <p className="text-xs font-semibold">Pulling candidate records...</p>
                    </div>
                  ) : visibleLogs.length === 0 ? (
                    <div className="text-center py-16 px-4">
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto text-slate-400 mb-2">
                        <User size={22} />
                      </div>
                      <p className="text-xs font-bold text-slate-700">No candidate records found</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {searchFilter ? "No profiles match your search criteria." : "No explicit candidates found in this round."}
                      </p>
                    </div>
                  ) : (
                    visibleLogs.map((candidate) => {
                      const name = candidate.name || candidate.fullName || candidate.applicantName || "Candidate";
                      const position = candidate.position || candidate.jobTitle || candidate.role || candidate.job?.title || "Applicant";
                      const email = candidate.email || "No email provided";
                      const status = (candidate.status || "applied").toLowerCase();
                      const colors = STATUS_COLOR_MAP[status] || STATUS_COLOR_MAP.applied;

                      return (
                        <div
                          key={candidate._id || candidate.id || Math.random()}
                          className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-indigo-200 hover:shadow-xs transition-all duration-200 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0 uppercase shadow-2xs">
                              {name.slice(0, 2)}
                            </div>
                            <div className="truncate">
                              <p className="text-xs font-bold text-slate-900 truncate">{name}</p>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5 truncate">
                                <span>{position}</span>
                                <span>•</span>
                                <span className="flex items-center gap-1"><Mail size={11} /> {email}</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border capitalize ${colors.bg} ${colors.text} ${colors.border}`}>
                              {status.replace(/-/g, " ")}
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