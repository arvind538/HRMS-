// src/app/(dashboard)/reports/attendance/page.jsx
"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Timer,
  Calendar,
  RefreshCw,
  ChevronRight,
  X,
  Search,
  User,
  CalendarDays,
  ShieldCheck,
  Percent,
  Activity,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";

/* ------------------------------ helpers ------------------------------ */

const TONES = {
  emerald: { box: "bg-emerald-600", hover: "hover:border-emerald-300" },
  rose: { box: "bg-rose-600", hover: "hover:border-rose-300" },
  amber: { box: "bg-amber-500", hover: "hover:border-amber-300" },
  indigo: { box: "bg-indigo-600", hover: "hover:border-indigo-300" },
};

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

export default function AttendanceReportsPage() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  // Modal states (activeMetric ko close ke baad bhi rakha hai taaki close animation me content na ude)
  const [modalOpen, setModalOpen] = useState(false);
  const [activeMetric, setActiveMetric] = useState(null);
  const [drilldownLogs, setDrilldownLogs] = useState([]);
  const [drilldownLoading, setDrilldownLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");

  const closeModal = useCallback(() => setModalOpen(false), []);

  // Fetch report data
  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/reports/attendance", { params: { month, year } });
      setReport(data?.data || data || {});
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load attendance analytics report.");
      setReport({});
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Safe KPI calculations
  const presentDays = report?.present ?? report?.presentDays ?? report?.totalPresent ?? 0;
  const absentDays = report?.absent ?? report?.absentDays ?? report?.totalAbsent ?? 0;
  const lateDays = report?.late ?? report?.lateArrivals ?? report?.totalLate ?? 0;
  const halfDays = report?.halfDay ?? report?.halfDays ?? 0;
  const avgWorkHours = Number(report?.avgWorkHours || report?.averageHours || 0);

  const totalRecordedSessions = presentDays + absentDays + halfDays;
  const attendanceRate =
    totalRecordedSessions > 0 ? Math.round((presentDays / totalRecordedSessions) * 100) : 0;

  const avgHoursText = avgWorkHours > 0 ? avgWorkHours.toFixed(1) : "0.0";

  // Card click -> open modal
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
        if (metricType === "present") return status === "present";
        if (metricType === "absent") return status === "absent";
        if (metricType === "late") return status === "late" || item.isLate;
        return true;
      };

      // 1. Report ke andar logs ho to wahi use karo
      const embeddedLogs = report?.records || report?.logs || report?.attendanceLogs || [];
      let filtered = embeddedLogs.length > 0 ? embeddedLogs.filter(matches) : [];

      // 2. Fallback: attendance endpoint
      if (filtered.length === 0) {
        const { data } = await api.get("/attendance", {
          params: {
            month,
            year,
            status: metricType === "hours" ? undefined : metricType,
          },
        });
        const fetchedList = Array.isArray(data) ? data : data?.data || data?.records || [];
        filtered = fetchedList.filter(matches);
      }

      setDrilldownLogs(filtered);
    } catch {
      setDrilldownLogs([]);
    } finally {
      setDrilldownLoading(false);
    }
  };

  // Search filter for modal records
  const visibleLogs = useMemo(() => {
    const q = searchFilter.toLowerCase().trim();
    if (!q) return drilldownLogs;
    return drilldownLogs.filter((log) => {
      const emp = log.employee || log.user || {};
      const name = String(emp.name || log.employeeName || "").toLowerCase();
      const code = String(emp.employeeId || emp.empId || "").toLowerCase();
      return name.includes(q) || code.includes(q);
    });
  }, [drilldownLogs, searchFilter]);

  const monthName = new Date(0, month - 1).toLocaleString("default", { month: "long" });

  return (
    <div className="w-full max-w-7xl mx-auto space-y-3 sm:space-y-4 px-3 sm:px-4 lg:px-6 py-3 sm:py-4 font-sans text-slate-900 antialiased">
      {/* Header & filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white px-4 py-3 sm:px-5 sm:py-4 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-base sm:text-xl font-bold tracking-tight text-slate-900">
              Attendance Analytics & Reports
            </h1>
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 font-mono">
              <ShieldCheck size={11} /> {monthName} {year}
            </span>
          </div>
          <p className="hidden sm:block text-xs text-slate-500 mt-0.5">
            Monthly presence, punctuality aur punch logs. Kisi bhi card par click karke detail dekhein.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
          <div className="hidden lg:flex items-center gap-1.5 pl-2 text-xs font-semibold text-slate-500">
            <Calendar size={14} className="text-indigo-600" /> Filter:
          </div>

          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            aria-label="Select month"
            className="flex-1 md:flex-none px-3 py-1.5 bg-white hover:border-indigo-400 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
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
            min={2000}
            max={2100}
            aria-label="Year"
            onChange={(e) => {
              const v = Number(e.target.value);
              if (v >= 2000 && v <= 2100) setYear(v);
              else if (e.target.value === "") setYear(new Date().getFullYear());
            }}
            className="w-20 px-2 py-1.5 bg-white hover:border-indigo-400 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-center font-mono"
          />

          <button
            onClick={fetchReport}
            disabled={loading}
            title="Refresh Data"
            className="shrink-0 p-2 bg-white hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-lg border border-slate-200 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-indigo-600" : ""} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[45vh] gap-3">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center border border-indigo-100">
            <Loader2 className="animate-spin text-indigo-600" size={28} />
          </div>
          <p className="text-sm font-semibold text-slate-700">Synthesizing attendance logs...</p>
        </div>
      ) : (
        <>
          {/* Slim metric cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
            <StatCard
              icon={CheckCircle2}
              tone="emerald"
              value={presentDays}
              unit="shifts"
              label="Present Days"
              onClick={() => handleCardClick("present", "Present Logs Overview")}
            />
            <StatCard
              icon={XCircle}
              tone="rose"
              value={absentDays}
              unit="absences"
              label="Absent Logs"
              onClick={() => handleCardClick("absent", "Absent Employees List")}
            />
            <StatCard
              icon={Clock}
              tone="amber"
              value={lateDays}
              unit="marked"
              label="Late Arrivals"
              onClick={() => handleCardClick("late", "Late Arrivals Details")}
            />
            <StatCard
              icon={Timer}
              tone="indigo"
              value={avgHoursText}
              unit="hrs/day"
              label="Avg Work Hours"
              onClick={() => handleCardClick("hours", "Work Hours Performance")}
            />
          </div>

          {/* Monthly adherence (slim) */}
          <button
            type="button"
            onClick={() => handleCardClick("adherence", "Monthly Adherence Analytics")}
            className="group w-full text-left bg-white px-3.5 py-3 sm:px-4 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-emerald-300 hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-200 flex flex-col md:flex-row md:items-center gap-3 md:gap-6 cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500/40"
          >
            <div className="flex items-center gap-3 min-w-0 md:flex-1">
              <div className="w-10 h-10 shrink-0 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                <Percent size={18} />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-slate-900 text-sm group-hover:text-emerald-700 transition-colors truncate">
                  Monthly Adherence Rate
                </h4>
                <p className="text-[11px] text-slate-500 truncate sm:whitespace-normal">
                  Present shifts ka total recorded shifts se ratio. Detail ke liye click karein.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 md:w-80 shrink-0">
              <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${attendanceRate}%` }}
                />
              </div>
              <span className="text-base font-black text-slate-900 font-mono min-w-[4ch] text-right">
                {attendanceRate}%
              </span>
              <ChevronRight
                size={16}
                className="text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all"
              />
            </div>
          </button>
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
                  {activeMetric.type === "adherence" ? <Activity size={18} /> : <CalendarDays size={18} />}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate">
                    {activeMetric.title}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-500">
                    {monthName} {year} Overview
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
                    Overall Shift Reliability
                  </p>
                  <span className="block mt-1 text-4xl font-extrabold text-emerald-600 font-mono tracking-tight">
                    {attendanceRate}%
                  </span>
                  <p className="text-xs text-emerald-700 mt-1">
                    {attendanceRate >= 80
                      ? "Healthy organizational presence recorded."
                      : "Adherence is lower than benchmark target (80%)."}
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Monthly Factor Breakdown
                  </h4>
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                      <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium block">Present</span>
                      <span className="text-lg font-bold text-emerald-600 font-mono">{presentDays}</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                      <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium block">Late</span>
                      <span className="text-lg font-bold text-amber-600 font-mono">{lateDays}</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                      <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium block">Absent</span>
                      <span className="text-lg font-bold text-rose-600 font-mono">{absentDays}</span>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Total Shifts Evaluated:</span>
                    <span className="font-bold text-slate-900 font-mono">{totalRecordedSessions}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Average Daily Productive Hours:</span>
                    <span className="font-bold text-slate-900 font-mono">{avgHoursText} hrs</span>
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
                      placeholder="Search employee by name or ID..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                    />
                  </div>
                </div>

                <div className="px-3 sm:px-4 py-3 flex-1 overflow-y-auto space-y-2">
                  {drilldownLoading ? (
                    <div className="py-14 text-center flex flex-col items-center justify-center gap-2 text-slate-400">
                      <Loader2 className="animate-spin text-indigo-600" size={30} />
                      <p className="text-xs font-semibold">Pulling records for this metric...</p>
                    </div>
                  ) : visibleLogs.length === 0 ? (
                    <div className="text-center py-12 px-4">
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto text-slate-400 mb-2">
                        <User size={22} />
                      </div>
                      <p className="text-xs font-bold text-slate-700">No log entries found</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {searchFilter
                          ? "No staff matches your search query."
                          : "No explicit logs registered in backend for this category."}
                      </p>
                    </div>
                  ) : (
                    visibleLogs.map((log, i) => {
                      const emp = log.employee || log.user || {};
                      const empName = emp.name || emp.username || log.employeeName || "Staff Member";
                      const empCode =
                        emp.employeeId || emp.empId || (emp._id ? String(emp._id).slice(-6) : "—");
                      const logDate = log.date
                        ? new Date(log.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
                        : "—";
                      const inTime = log.checkIn
                        ? new Date(log.checkIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        : "--:--";

                      return (
                        <div
                          key={log._id || log.id || i}
                          className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-indigo-200 transition-all duration-200 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0 uppercase">
                              {String(empName).slice(0, 2)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate">{empName}</p>
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                                ID: {empCode} • {logDate}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-[11px] font-mono font-bold text-slate-700 block">
                              In: {inTime}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-400 capitalize">
                              {log.workHours ? `${log.workHours}h logged` : log.status || "marked"}
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