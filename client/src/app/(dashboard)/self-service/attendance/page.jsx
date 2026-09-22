"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Loader2,
  Calendar,
  Clock,
  ShieldAlert,
  X,
  Timer,
  ChevronRight,
  FileText,
  Briefcase,
  UserCheck,
  Sparkles,
  RefreshCw,
  TrendingUp,
  User,
  CalendarDays,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Badge from "@/components/ui/Badge";
import { useAuth } from "@/context/AuthContext";

export default function MyAttendancePage() {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Safe employee resolver
  const employeeId = useMemo(() => {
    return (
      user?.employee?._id ||
      user?.employee?.id ||
      (typeof user?.employee === "string" ? user?.employee : null) ||
      user?._id ||
      user?.id ||
      null
    );
  }, [user]);

  // Deep unwrapper for multiple backend response standards
  const extractList = useCallback((resData) => {
    if (!resData) return [];
    if (Array.isArray(resData)) return resData;
    if (Array.isArray(resData?.data)) return resData.data;
    if (Array.isArray(resData?.attendance)) return resData.attendance;
    if (Array.isArray(resData?.records)) return resData.records;
    if (Array.isArray(resData?.docs)) return resData.docs;
    if (Array.isArray(resData?.result)) return resData.result;
    return [];
  }, []);

  const fetchData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      let dataList = [];

      // 1. Direct personal attendance route
      try {
        const res = await api.get("/attendance/my-attendance", {
          params: { month, year }
        });
        dataList = extractList(res.data);
      } catch {
        // Fallback
      }

      // 2. Query with employee param
      if (dataList.length === 0 && employeeId) {
        try {
          const res = await api.get("/attendance", {
            params: { employee: employeeId, month, year }
          });
          dataList = extractList(res.data);
        } catch {
          // Fallback
        }
      }

      // 3. Admin fallback (filter by employee or current user)
      if (dataList.length === 0 && (user?.role === "admin" || user?.role === "superadmin")) {
        try {
          const res = await api.get("/attendance", { params: { month, year } });
          const allRecords = extractList(res.data);
          dataList = allRecords.filter((r) => {
            const empRef = r.employee?._id || r.employee?.id || r.employee || r.user;
            return String(empRef) === String(employeeId);
          });
          if (dataList.length === 0) dataList = allRecords; // Show all if individual filter fails
        } catch {
          // No-op
        }
      }

      setRecords(dataList);
    } catch (err) {
      console.error("Attendance fetch error:", err);
      toast.error("Failed to load attendance records.");
      setRecords([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [employeeId, month, year, extractList, user?.role]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Modal ESC key listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setSelectedRecord(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Helper to extract employee details safely from record or user session
  const getRecordEmployee = (record) => {
    const empObj = record?.employee || user?.employee || user;
    const name =
      (typeof empObj === "object" ? empObj?.name || empObj?.fullName : null) ||
      user?.name ||
      "Sandeep";
    const code =
      (typeof empObj === "object" ? empObj?.employeeId || empObj?.code : null) ||
      user?.employeeId ||
      "EMP0006";
    const role =
      (typeof empObj === "object" ? empObj?.designation || empObj?.role : null) ||
      user?.role ||
      "Employee";

    return { name, code, role };
  };

  const statusVariant = {
    present: "success",
    absent: "danger",
    "half-day": "info",
    "on-leave": "warning",
    "on leave": "warning",
    late: "warning"
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return "—";
    try {
      return new Date(timeStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return timeStr;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric"
      });
    } catch {
      return dateStr;
    }
  };

  // Quick Metric Calculations
  const stats = useMemo(() => {
    const presentCount = records.filter(
      (r) => (r.status || "").toLowerCase() === "present"
    ).length;
    const leaveCount = records.filter((r) =>
      (r.status || "").toLowerCase().includes("leave")
    ).length;
    const totalHours = records.reduce(
      (acc, curr) => acc + (parseFloat(curr.workHours) || 0),
      0
    );

    return {
      presentCount,
      leaveCount,
      totalHours: totalHours.toFixed(1)
    };
  }, [records]);

  const currentEmp = getRecordEmployee(null);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-14 px-4 sm:px-6 font-sans antialiased text-slate-900 animate-in fade-in duration-200">
      {/* Top Header Card with Logged-in User Identity */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-black text-2xl flex items-center justify-center shadow-md shadow-indigo-100 shrink-0 font-mono">
            {currentEmp.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                {currentEmp.name}&apos;s Attendance
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 font-mono">
                <CheckCircle2 size={12} className="text-emerald-600" /> Active Profile
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 flex items-center gap-2">
              <span className="font-semibold text-slate-700 font-mono">ID: {currentEmp.code}</span>
              <span className="text-slate-300">•</span>
              <span className="capitalize text-slate-500 font-medium">{currentEmp.role}</span>
              <span className="text-slate-300">•</span>
              <span>Track monthly log sessions, check-ins, and total work hours.</span>
            </p>
          </div>
        </div>

        {/* Month & Year Selectors with Sync Button */}
        <div className="flex items-center gap-2.5 flex-wrap self-start lg:self-auto">
          <div className="relative">
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(0, i).toLocaleString("default", { month: "long" })}
                </option>
              ))}
            </select>
          </div>

          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="w-20 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-center font-mono"
          />

          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="p-2.5 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 border border-slate-200 rounded-xl text-xs font-semibold transition-all shadow-2xs active:scale-95 disabled:opacity-50 cursor-pointer"
            title="Sync Attendance Logs"
          >
            <RefreshCw size={15} className={refreshing ? "animate-spin text-indigo-600" : ""} />
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Days Present</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1 font-mono">{stats.presentCount}</h3>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100/70">
            <CheckCircle2 size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Leave Days</p>
            <h3 className="text-2xl font-black text-amber-600 mt-1 font-mono">{stats.leaveCount}</h3>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl border border-amber-100/70">
            <CalendarDays size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Logged Hours</p>
            <h3 className="text-2xl font-black text-indigo-600 mt-1 font-mono">{stats.totalHours} hrs</h3>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100/70">
            <Timer size={22} />
          </div>
        </div>
      </div>

      {/* Warning if no Employee ID */}
      {!employeeId && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 text-amber-800">
          <ShieldAlert size={20} className="text-amber-600 shrink-0" />
          <p className="text-xs sm:text-sm">
            <strong className="font-semibold">Session Alert:</strong> No employee profile tagged with current login. Showing general system entries.
          </p>
        </div>
      )}

      {/* Attendance Table Container */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading && !refreshing ? (
          <div className="py-24 text-center">
            <Loader2 className="animate-spin mx-auto text-indigo-600 h-8 w-8" />
            <p className="text-sm text-slate-400 mt-2 font-medium">Loading attendance records...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto text-slate-300">
              <Calendar size={26} />
            </div>
            <p className="text-sm font-semibold text-slate-700">No attendance records found</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              There are no recorded logs for {currentEmp.name} in this selected month and year.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[760px] border-collapse">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Check In</th>
                  <th className="px-6 py-4">Check Out</th>
                  <th className="px-6 py-4">Work Hours</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {records.map((r, index) => {
                  const empInfo = getRecordEmployee(r);
                  const isSelected = selectedRecord?._id === r._id;
                  const statusKey = (r.status || "present").toLowerCase().trim();

                  return (
                    <tr
                      key={r._id || index}
                      onClick={() => setSelectedRecord(r)}
                      tabIndex={0}
                      onKeyDown={(e) => e.key === "Enter" && setSelectedRecord(r)}
                      className={`group cursor-pointer transition-all duration-150 outline-hidden
                        ${isSelected
                          ? "bg-indigo-50/70 border-l-4 border-indigo-600"
                          : "hover:bg-indigo-50/30 hover:border-l-4 hover:border-indigo-400"
                        }`}
                    >
                      {/* Employee Info Column */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center border border-slate-200 font-mono group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                            {empInfo.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors">
                              {empInfo.name}
                            </p>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {empInfo.code}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Date Column */}
                      <td className="px-6 py-4 font-semibold text-slate-800 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${statusKey === "present"
                              ? "bg-emerald-500"
                              : statusKey.includes("leave")
                                ? "bg-amber-500"
                                : "bg-slate-300"
                              }`}
                          />
                          {formatDate(r.date)}
                        </div>
                      </td>

                      {/* Check In */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {r.checkIn ? (
                          <span className="inline-flex items-center gap-1.5 text-slate-700 bg-slate-50 group-hover:bg-white px-2.5 py-1 rounded-xl border border-slate-200/80 text-xs font-semibold font-mono">
                            <Clock size={13} className="text-emerald-600" />
                            {formatTime(r.checkIn)}
                          </span>
                        ) : (
                          <span className="text-slate-300 font-mono">—</span>
                        )}
                      </td>

                      {/* Check Out */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {r.checkOut ? (
                          <span className="inline-flex items-center gap-1.5 text-slate-700 bg-slate-50 group-hover:bg-white px-2.5 py-1 rounded-xl border border-slate-200/80 text-xs font-semibold font-mono">
                            <Clock size={13} className="text-rose-500" />
                            {formatTime(r.checkOut)}
                          </span>
                        ) : (
                          <span className="text-slate-300 font-mono">—</span>
                        )}
                      </td>

                      {/* Work Hours */}
                      <td className="px-6 py-4 font-bold text-slate-800 whitespace-nowrap font-mono">
                        {r.workHours ? `${r.workHours} hrs` : "—"}
                      </td>

                      {/* Status Badge */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={statusVariant[statusKey] || "neutral"}>
                          {r.status ? r.status.replace(/[-_]/g, " ") : "Pending"}
                        </Badge>
                      </td>

                      {/* Action */}
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all">
                          Inspect <ChevronRight size={14} />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Attendance Record Details Center Modal */}
      {selectedRecord && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setSelectedRecord(null)}
        >
          <div
            className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-b from-slate-50/90 to-white">
              <div className="flex items-center gap-3.5">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100 shadow-2xs">
                  <Calendar size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-none">
                    Attendance Log Details
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 font-medium">
                    {formatDate(selectedRecord.date)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
              {/* Employee Summary Card in Modal */}
              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-bold text-sm flex items-center justify-center shadow-xs font-mono">
                    {getRecordEmployee(selectedRecord).name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Logged Employee
                    </span>
                    <h4 className="font-bold text-slate-900 text-sm">
                      {getRecordEmployee(selectedRecord).name}
                    </h4>
                    <p className="text-[11px] text-slate-500 font-mono">
                      ID: {getRecordEmployee(selectedRecord).code}
                    </p>
                  </div>
                </div>

                <Badge variant={statusVariant[(selectedRecord.status || "present").toLowerCase().trim()] || "neutral"}>
                  {selectedRecord.status ? selectedRecord.status.replace(/[-_]/g, " ") : "Pending"}
                </Badge>
              </div>

              {/* Timing Breakdown */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 bg-slate-50/70 border border-slate-100 rounded-2xl">
                  <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                    <Clock size={13} className="text-emerald-600" /> Check In Time
                  </p>
                  <p className="font-bold text-slate-900 mt-1 text-sm font-mono">
                    {formatTime(selectedRecord.checkIn)}
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50/70 border border-slate-100 rounded-2xl">
                  <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                    <Clock size={13} className="text-rose-500" /> Check Out Time
                  </p>
                  <p className="font-bold text-slate-900 mt-1 text-sm font-mono">
                    {formatTime(selectedRecord.checkOut)}
                  </p>
                </div>
              </div>

              {/* Work Hours & Schedule */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 bg-indigo-50/40 border border-indigo-100 rounded-2xl">
                  <p className="text-xs text-indigo-500 font-medium flex items-center gap-1.5">
                    <Timer size={13} className="text-indigo-600" /> Total Duration
                  </p>
                  <p className="font-black text-indigo-950 mt-1 text-base font-mono">
                    {selectedRecord.workHours ? `${selectedRecord.workHours} hrs` : "0 hrs"}
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50/70 border border-slate-100 rounded-2xl">
                  <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                    <Briefcase size={13} className="text-slate-400" /> Work Shift
                  </p>
                  <p className="font-semibold text-slate-800 mt-1 text-xs capitalize">
                    {selectedRecord.shift || selectedRecord.shiftType || "Standard Enterprise"}
                  </p>
                </div>
              </div>

              {/* Notes / Remarks */}
              {selectedRecord.remarks && (
                <div className="p-3.5 bg-slate-50/80 border border-slate-100 rounded-2xl space-y-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <FileText size={12} /> Log Remarks
                  </p>
                  <p className="text-slate-700 text-xs leading-relaxed">
                    {selectedRecord.remarks}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="px-5 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-100 active:scale-95 transition-all shadow-2xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}