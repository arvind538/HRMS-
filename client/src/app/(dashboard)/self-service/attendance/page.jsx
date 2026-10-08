"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Loader2,
  Calendar,
  Clock,
  ShieldAlert,
  X,
  Timer,
  RefreshCw,
  MapPin,
  Eye,
  CheckCircle2
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import { useAuth } from "@/context/AuthContext";

export default function MyAttendancePage() {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedRecord, setSelectedRecord] = useState(null);

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

      try {
        const res = await api.get("/attendance/my-attendance", {
          params: { month, year }
        });
        dataList = extractList(res.data);
      } catch { }

      if (dataList.length === 0 && employeeId) {
        try {
          const res = await api.get("/attendance", {
            params: { employee: employeeId, month, year }
          });
          dataList = extractList(res.data);
        } catch { }
      }

      if (dataList.length === 0) {
        try {
          const res = await api.get("/attendance", { params: { month, year } });
          const allRecords = extractList(res.data);
          dataList = allRecords.filter((r) => {
            const empRef = r.employee?._id || r.employee?.id || r.employee || r.user;
            return String(empRef) === String(employeeId);
          });
          if (dataList.length === 0) dataList = allRecords;
        } catch { }
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
  }, [employeeId, month, year, extractList]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ESC key listener for modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setSelectedRecord(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const getRecordEmployee = (record) => {
    const empObj = record?.employee || user?.employee || user;
    const name =
      (typeof empObj === "object" ? empObj?.name || empObj?.fullName : null) ||
      user?.name ||
      "Staff Member";
    const code =
      (typeof empObj === "object" ? empObj?.employeeId || empObj?.code : null) ||
      user?.employeeId ||
      "EMP-006";
    const role =
      (typeof empObj === "object" ? empObj?.department || empObj?.role : null) ||
      user?.role ||
      "Employee";

    return { name, code, role };
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
      return new Date(dateStr).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const stats = useMemo(() => {
    const presentCount = records.filter(
      (r) => (r.status || "").toLowerCase() === "present" || (r.status || "").toLowerCase() === "half-day"
    ).length;
    const leaveCount = records.filter((r) =>
      (r.status || "").toLowerCase().includes("leave")
    ).length;
    const totalHours = records.reduce(
      (acc, curr) => acc + (parseFloat(curr.workHours) || parseFloat(curr.hours) || 0),
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
    <div className="space-y-6 max-w-[1500px] mx-auto pb-14 px-4 sm:px-6 font-sans antialiased text-slate-900 animate-in fade-in duration-200">
      {/* Top Header Card */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white font-black text-2xl flex items-center justify-center shadow-md shadow-indigo-100 shrink-0">
            {currentEmp.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                Attendance list
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 size={12} className="text-emerald-600" /> Active Profile
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Real-time attendance logs, punch times, and shift analytics for <span className="font-bold text-slate-700">{currentEmp.name}</span>
            </p>
          </div>
        </div>

        {/* Month & Year Selectors with Sync Button */}
        <div className="flex items-center gap-2.5 flex-wrap self-start lg:self-auto">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition cursor-pointer"
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
            className="w-20 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 text-center font-mono focus:outline-none"
          />

          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-xs font-semibold transition active:scale-95 disabled:opacity-50 cursor-pointer"
            title="Sync Records"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin text-indigo-600" : ""} />
          </button>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Days Present</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1 font-mono">{stats.presentCount}</h3>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
            <CheckCircle2 size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Leave Days</p>
            <h3 className="text-2xl font-black text-amber-600 mt-1 font-mono">{stats.leaveCount}</h3>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl border border-amber-100">
            <Calendar size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Total Work Hours</p>
            <h3 className="text-2xl font-black text-indigo-600 mt-1 font-mono">{stats.totalHours} hrs</h3>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
            <Timer size={22} />
          </div>
        </div>
      </div>

      {/* Attendance Table Container matching Image layout */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading && !refreshing ? (
          <div className="py-24 text-center">
            <Loader2 className="animate-spin mx-auto text-indigo-600 h-8 w-8" />
            <p className="text-sm text-slate-400 mt-2 font-medium">Loading attendance logs...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Calendar size={36} className="mx-auto text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">No attendance records found</p>
            <p className="text-xs text-slate-400">No attendance data found for this month/year.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[1100px] border-collapse">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Profile</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Leave</th>
                  <th className="px-6 py-4">Punch records</th>
                  <th className="px-6 py-4">Punch In</th>
                  <th className="px-6 py-4">In Location</th>
                  <th className="px-6 py-4">Out Location</th>
                  <th className="px-6 py-4">Punch Out</th>
                  <th className="px-6 py-4">Behavior</th>
                  <th className="px-6 py-4">Break Times</th>
                  <th className="px-6 py-4">Total Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {records.map((r, index) => {
                  const empInfo = getRecordEmployee(r);
                  const logsCount = r.logs?.length || 1;
                  const isLate = r.behavior === "Late" || (r.checkIn && new Date(r.checkIn).getHours() > 10);

                  return (
                    <tr key={r._id || index} className="hover:bg-slate-50/60 transition-colors">
                      {/* Profile */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                            {empInfo.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block text-xs">{empInfo.name}</span>
                            <span className="text-[11px] font-semibold text-slate-400">ID: {empInfo.code}</span>
                          </div>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="px-6 py-4 text-xs font-semibold text-slate-700 whitespace-nowrap">
                        {formatDate(r.date)}
                      </td>

                      {/* Leave */}
                      <td className="px-6 py-4 text-xs font-semibold text-slate-400 whitespace-nowrap">
                        {r.leave || "—"}
                      </td>

                      {/* Punch Records Button */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedRecord(r)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-bold hover:bg-indigo-100 transition cursor-pointer shadow-2xs"
                        >
                          <Eye size={12} />
                          {logsCount > 1 ? `View All (${logsCount})` : "View Details"}
                        </button>
                      </td>

                      {/* Punch In */}
                      <td className="px-6 py-4 font-bold text-slate-700 whitespace-nowrap">
                        {formatTime(r.checkIn)}
                      </td>

                      {/* In Location */}
                      <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <MapPin size={12} className="text-indigo-500" />
                          <span>{r.inLocation || "Office HQ"}</span>
                        </div>
                      </td>

                      {/* Out Location */}
                      <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <MapPin size={12} className="text-rose-400" />
                          <span>{r.outLocation || "—"}</span>
                        </div>
                      </td>

                      {/* Punch Out */}
                      <td className="px-6 py-4 font-bold text-slate-700 whitespace-nowrap">
                        {formatTime(r.checkOut)}
                      </td>

                      {/* Behavior */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-[11px] font-bold border ${isLate ? "bg-rose-50 text-rose-600 border-rose-200" : "bg-emerald-50 text-emerald-600 border-emerald-200"}`}>
                          {isLate ? "Late" : "Regular"}
                        </span>
                      </td>

                      {/* Break Times */}
                      <td className="px-6 py-4 text-xs font-semibold text-slate-600 whitespace-nowrap">
                        {r.breakTimes || "0h 0m"}
                      </td>

                      {/* Total Hours */}
                      <td className="px-6 py-4 font-bold text-slate-900 whitespace-nowrap font-mono">
                        {r.workHours ? `${r.workHours} hrs` : "0h 0m"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detailed View Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150" onClick={() => setSelectedRecord(null)}>
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  {getRecordEmployee(selectedRecord).name} — {formatDate(selectedRecord.date)}
                </h3>
                <p className="text-xs text-slate-400">Detailed punch logs and location mapping</p>
              </div>
              <button onClick={() => setSelectedRecord(null)} className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-600 cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/60">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">First In</span>
                  <span className="font-bold text-slate-800 text-xs mt-1 block">{formatTime(selectedRecord.checkIn)}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/60">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Last Out</span>
                  <span className="font-bold text-slate-800 text-xs mt-1 block">{formatTime(selectedRecord.checkOut)}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/60">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Total Hours</span>
                  <span className="font-bold text-slate-800 text-xs mt-1 block">{selectedRecord.workHours ? `${selectedRecord.workHours} hrs` : "—"}</span>
                </div>
              </div>

              <div className="bg-slate-50/60 p-4 rounded-2xl border border-slate-200/60 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px]">1</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 text-[10px]">Punch In</span>
                    <span className="text-slate-700">{formatTime(selectedRecord.checkIn)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200 text-[10px]">Punch Out</span>
                    <span className="text-slate-700">{formatTime(selectedRecord.checkOut)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                  <MapPin size={12} className="text-indigo-500 shrink-0" />
                  <span>in: {selectedRecord.inLocation || "Office HQ"} | out: {selectedRecord.outLocation || "—"}</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button onClick={() => setSelectedRecord(null)} className="px-5 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl cursor-pointer">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}