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
  ArrowUpRight
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";

export default function AttendanceReportsPage() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  // Center Modal States
  const [activeMetric, setActiveMetric] = useState(null);
  const [drilldownLogs, setDrilldownLogs] = useState([]);
  const [drilldownLoading, setDrilldownLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");

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
  const attendanceRate = totalRecordedSessions > 0 ? Math.round((presentDays / totalRecordedSessions) * 100) : 0;

  // Handle Card Click to Open Center Modal
  const handleCardClick = async (metricType, metricTitle, customPayload = null) => {
    setActiveMetric({ type: metricType, title: metricTitle, payload: customPayload });
    setSearchFilter("");

    if (metricType === "adherence") {
      setDrilldownLogs([]);
      return;
    }

    setDrilldownLoading(true);
    try {
      // 1. Check if logs are already provided inside report
      const embeddedLogs = report?.records || report?.logs || report?.attendanceLogs || [];
      let filtered = [];

      if (embeddedLogs.length > 0) {
        filtered = embeddedLogs.filter((item) => {
          const status = (item.status || "").toLowerCase();
          if (metricType === "present") return status === "present";
          if (metricType === "absent") return status === "absent";
          if (metricType === "late") return status === "late" || item.isLate;
          return true;
        });
      }

      // 2. Fallback to attendance endpoint
      if (filtered.length === 0) {
        const { data } = await api.get("/attendance", {
          params: {
            month,
            year,
            status: metricType === "hours" ? undefined : metricType
          }
        });
        const fetchedList = Array.isArray(data) ? data : data?.data || data?.records || [];
        filtered = fetchedList.filter((item) => {
          const st = (item.status || "").toLowerCase();
          if (metricType === "present") return st === "present";
          if (metricType === "absent") return st === "absent";
          if (metricType === "late") return st === "late" || item.isLate;
          return true;
        });
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
    return drilldownLogs.filter((log) => {
      const q = searchFilter.toLowerCase().trim();
      if (!q) return true;
      const emp = log.employee || log.user || {};
      const name = (emp.name || log.employeeName || "").toLowerCase();
      const code = (emp.employeeId || emp.empId || "").toLowerCase();
      return name.includes(q) || code.includes(q);
    });
  }, [drilldownLogs, searchFilter]);

  const monthName = new Date(0, month - 1).toLocaleString("default", { month: "long" });

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 px-3 sm:px-4 lg:px-6 py-4 font-sans text-slate-900 antialiased">

      {/* Header & Controls Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Attendance Analytics & Reports
            </h1>
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 font-mono">
              <ShieldCheck size={12} /> {monthName} {year}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Review monthly presence indexes, shift punctuality, and punch logs. Click any card to view detailed employee lists.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5 bg-slate-50 p-1.5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-1.5 pl-2 text-xs font-semibold text-slate-500 hidden sm:flex">
            <Calendar size={14} className="text-indigo-600" /> Filter:
          </div>

          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="px-3 py-2 bg-white hover:border-indigo-400 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer shadow-2xs"
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
            className="w-20 sm:w-24 px-3 py-2 bg-white hover:border-indigo-400 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-center shadow-2xs font-mono"
          />

          <button
            onClick={fetchReport}
            disabled={loading}
            title="Refresh Data"
            className="p-2.5 bg-white hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-xl border border-slate-200 transition-all duration-300 shadow-2xs cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? "animate-spin text-indigo-600" : ""} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center border border-indigo-100 animate-pulse">
            <Loader2 className="animate-spin text-indigo-600" size={28} />
          </div>
          <p className="text-sm font-semibold text-slate-700">Synthesizing attendance logs...</p>
        </div>
      ) : (
        <>
          {/* Main 4 Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

            {/* Present Card */}
            <div
              onClick={() => handleCardClick("present", "Present Logs Overview")}
              className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-emerald-300 hover:-translate-y-1.5 transition-all duration-300 ease-out flex flex-col justify-between group cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300 shadow-2xs">
                    <CheckCircle2 size={22} />
                  </div>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-mono group-hover:bg-emerald-100">
                    On-Time
                  </span>
                </div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Present Days</p>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
                    {presentDays}
                  </h3>
                  <span className="text-xs text-slate-400 font-semibold">shifts</span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500 group-hover:text-emerald-600 transition-colors">
                <span>View employee list</span>
                <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Absent Card */}
            <div
              onClick={() => handleCardClick("absent", "Absent Employees List")}
              className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-rose-300 hover:-translate-y-1.5 transition-all duration-300 ease-out flex flex-col justify-between group cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl group-hover:bg-rose-600 group-hover:text-white transition-colors duration-300 shadow-2xs">
                    <XCircle size={22} />
                  </div>
                  <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200 font-mono group-hover:bg-rose-100">
                    Missed
                  </span>
                </div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Absent Logs</p>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
                    {absentDays}
                  </h3>
                  <span className="text-xs text-slate-400 font-semibold">absences</span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500 group-hover:text-rose-600 transition-colors">
                <span>Investigate records</span>
                <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Late Card */}
            <div
              onClick={() => handleCardClick("late", "Late Arrivals Details")}
              className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-amber-300 hover:-translate-y-1.5 transition-all duration-300 ease-out flex flex-col justify-between group cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl group-hover:bg-amber-500 group-hover:text-white transition-colors duration-300 shadow-2xs">
                    <Clock size={22} />
                  </div>
                  <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 font-mono group-hover:bg-amber-100">
                    Delay Check
                  </span>
                </div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Late Arrivals</p>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
                    {lateDays}
                  </h3>
                  <span className="text-xs text-slate-400 font-semibold">marked</span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500 group-hover:text-amber-600 transition-colors">
                <span>Inspect timings</span>
                <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Avg Work Hours Card */}
            <div
              onClick={() => handleCardClick("hours", "Work Hours Performance")}
              className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-indigo-300 hover:-translate-y-1.5 transition-all duration-300 ease-out flex flex-col justify-between group cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300 shadow-2xs">
                    <Timer size={22} />
                  </div>
                  <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100 font-mono group-hover:bg-indigo-100">
                    Productivity
                  </span>
                </div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Avg Work Hours</p>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
                    {avgWorkHours > 0 ? avgWorkHours.toFixed(1) : "0.0"}
                  </h3>
                  <span className="text-xs text-slate-400 font-semibold">hrs / day</span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500 group-hover:text-indigo-600 transition-colors">
                <span>View hour logs</span>
                <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

          </div>

          {/* Interactive Monthly Adherence Rate Card */}
          <div
            onClick={() => handleCardClick("adherence", "Monthly Adherence Analytics", {
              presentDays,
              absentDays,
              lateDays,
              totalRecordedSessions,
              attendanceRate
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
                    Monthly Adherence Rate
                  </h4>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 hidden sm:inline-flex items-center gap-1">
                    Inspect <ArrowUpRight size={12} />
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">Ratio of confirmed on-time present shifts across total staff. Click to see deep breakdown.</p>
              </div>
            </div>

            <div className="flex items-center gap-4 w-full md:w-80 shrink-0">
              <div className="flex-1 h-3.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200 shadow-inner">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-1000 ease-out group-hover:brightness-110"
                  style={{ width: `${attendanceRate}%` }}
                />
              </div>
              <span className="text-base font-black text-slate-900 font-mono min-w-[4ch] text-right">
                {attendanceRate}%
              </span>
              <ChevronRight size={18} className="text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all hidden sm:block" />
            </div>
          </div>
        </>
      )}

      {/* 🌟 Professional Center-Screen Popup Modal */}
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
                  {activeMetric.type === "adherence" ? <Activity size={22} /> : <CalendarDays size={22} />}
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                    {activeMetric.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {monthName} {year} Overview
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
              // Deep Adherence Breakdown Screen
              <div className="p-6 space-y-6 overflow-y-auto">
                <div className="p-5 bg-emerald-50/60 rounded-2xl border border-emerald-100 text-center">
                  <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Overall Shift Reliability</p>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <span className="text-4xl sm:text-5xl font-extrabold text-emerald-600 font-mono tracking-tight">
                      {attendanceRate}%
                    </span>
                  </div>
                  <p className="text-xs text-emerald-700 mt-1">
                    {attendanceRate >= 80 ? "Healthy organizational presence recorded." : "Adherence is lower than benchmark target (80%)."}
                  </p>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Monthly Factor Breakdown</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
                      <span className="text-[11px] text-slate-500 font-medium block">Present Shifts</span>
                      <span className="text-lg font-bold text-emerald-600 font-mono">{presentDays}</span>
                    </div>
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
                      <span className="text-[11px] text-slate-500 font-medium block">Late Marks</span>
                      <span className="text-lg font-bold text-amber-600 font-mono">{lateDays}</span>
                    </div>
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
                      <span className="text-[11px] text-slate-500 font-medium block">Total Absences</span>
                      <span className="text-lg font-bold text-rose-600 font-mono">{absentDays}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Total Shifts Evaluated:</span>
                    <span className="font-bold text-slate-900 font-mono">{totalRecordedSessions}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Average Daily Productive Hours:</span>
                    <span className="font-bold text-slate-900 font-mono">{avgWorkHours > 0 ? avgWorkHours.toFixed(1) : "0.0"} hrs</span>
                  </div>
                </div>
              </div>
            ) : (
              // Standard Employee Logs List View
              <>
                <div className="p-4 border-b border-slate-100 bg-white">
                  <div className="relative">
                    <Search size={15} className="absolute left-3.5 top-3 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search employee by name or ID..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                    />
                  </div>
                </div>

                <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-2.5">
                  {drilldownLoading ? (
                    <div className="py-16 text-center flex flex-col items-center justify-center gap-2 text-slate-400">
                      <Loader2 className="animate-spin text-indigo-600" size={30} />
                      <p className="text-xs font-semibold">Pulling records for this metric...</p>
                    </div>
                  ) : visibleLogs.length === 0 ? (
                    <div className="text-center py-16 px-4">
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto text-slate-400 mb-2">
                        <User size={22} />
                      </div>
                      <p className="text-xs font-bold text-slate-700">No log entries found</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {searchFilter ? "No staff matches your search query." : "No explicit logs registered in backend for this category."}
                      </p>
                    </div>
                  ) : (
                    visibleLogs.map((log) => {
                      const emp = log.employee || log.user || {};
                      const empName = emp.name || emp.username || log.employeeName || "Staff Member";
                      const empCode = emp.employeeId || emp.empId || emp._id?.slice(-6) || "—";
                      const logDate = log.date ? new Date(log.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—";
                      const inTime = log.checkIn ? new Date(log.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--";

                      return (
                        <div
                          key={log._id || log.id || Math.random()}
                          className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-indigo-200 hover:shadow-xs transition-all duration-200 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0 uppercase shadow-2xs">
                              {empName.slice(0, 2)}
                            </div>
                            <div className="truncate">
                              <p className="text-xs font-bold text-slate-900 truncate">{empName}</p>
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                ID: {empCode} • Date: {logDate}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-[11px] font-mono font-bold text-slate-700 block">
                              In: {inTime}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-400 capitalize">
                              {log.workHours ? `${log.workHours}h logged` : (log.status || "marked")}
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