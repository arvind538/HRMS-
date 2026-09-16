"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { LogIn, LogOut, Clock, Calendar, History, RefreshCw } from 'lucide-react';
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from 'react-toastify';

export default function SelfAttendance() {
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [todayRecord, setTodayRecord] = useState(null);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [punchLoading, setPunchLoading] = useState(false);
  const [error, setError] = useState(null);

  // Helper: Safely extract employee ID or user ID from Auth context
  const targetEmployeeId = user?.employee?._id || user?.employee?.id || user?.employee || user?._id || user?.id;

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchAttendanceData = useCallback(async () => {
    if (!targetEmployeeId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const today = new Date().toISOString().split('T')[0];

      const [todayRes, historyRes] = await Promise.all([
        api.get("/attendance", { params: { date: today, employee: targetEmployeeId } }),
        api.get("/attendance", { params: { employee: targetEmployeeId } }),
      ]);

      const todayList = Array.isArray(todayRes.data) ? todayRes.data : [];
      setTodayRecord(todayList[0] || null);

      const history = Array.isArray(historyRes.data) ? historyRes.data : [];
      setHistoryLogs(history.slice(0, 15));
    } catch (err) {
      console.error("Attendance fetch error:", err);
      setError(err.response?.data?.message || "Attendance data fetch nahi ho paya.");
    } finally {
      setLoading(false);
    }
  }, [targetEmployeeId]);

  useEffect(() => {
    if (targetEmployeeId) {
      fetchAttendanceData();
    } else {
      setLoading(false);
    }
  }, [targetEmployeeId, fetchAttendanceData]);

  const handlePunchAction = async (actionType) => {
    if (!targetEmployeeId) {
      toast.error("User session missing. Please log in again.");
      return;
    }

    setPunchLoading(true);
    try {
      if (actionType === 'PUNCH_IN') {
        await api.post("/attendance/check-in", { employee: targetEmployeeId });
        toast.success("Checked in successfully!");
      } else {
        await api.put("/attendance/check-out", { employee: targetEmployeeId });
        toast.success("Checked out successfully!");
      }
      await fetchAttendanceData();
    } catch (err) {
      toast.error(err.response?.data?.message || `${actionType} save nahi ho paya.`);
    } finally {
      setPunchLoading(false);
    }
  };

  const formatTime = (d) => (d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--');

  return (
    <div className="w-full space-y-6 font-sans pb-12 animate-in fade-in duration-300">

      {/* Top Section: Punch Clock & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Punch Clock Box */}
        <div className="lg:col-span-1 bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/5 rounded-full blur-xl pointer-events-none" />
          <div>
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-medium text-indigo-200 flex items-center gap-1.5 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Live Attendance
              </span>
            </div>
            <div className="my-6 text-center">
              <p className="text-3xl sm:text-4xl font-extrabold tracking-tight font-mono">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
              <p className="text-xs sm:text-sm text-indigo-200 mt-1.5 font-medium">
                {currentTime.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {!targetEmployeeId ? (
              <p className="text-xs text-amber-200 bg-amber-500/20 rounded-xl p-3 text-center">User session profile not loaded.</p>
            ) : error ? (
              <p className="text-xs text-rose-200 bg-rose-500/20 rounded-xl p-3">{error}</p>
            ) : !todayRecord?.checkIn ? (
              <button
                onClick={() => handlePunchAction('PUNCH_IN')}
                disabled={punchLoading}
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold rounded-2xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 cursor-pointer active:scale-95"
              >
                <LogIn className="w-5 h-5" /> {punchLoading ? 'Processing...' : 'Punch In'}
              </button>
            ) : (
              <button
                onClick={() => handlePunchAction('PUNCH_OUT')}
                disabled={punchLoading || !!todayRecord?.checkOut}
                className={`w-full py-3.5 font-semibold rounded-2xl transition-all duration-200 flex items-center justify-center gap-2 ${todayRecord?.checkOut
                  ? 'bg-white/10 text-white/50 cursor-not-allowed'
                  : 'bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-900/20 cursor-pointer active:scale-95'
                  }`}
              >
                <LogOut className="w-5 h-5" />
                {todayRecord?.checkOut ? 'Shift Completed' : (punchLoading ? 'Processing...' : 'Punch Out')}
              </button>
            )}
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:border-emerald-200 transition-all duration-200 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">In Time</span>
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl"><LogIn className="w-5 h-5" /></div>
            </div>
            <p className="text-2xl font-bold text-slate-800 mt-4 font-mono">{formatTime(todayRecord?.checkIn)}</p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:border-rose-200 transition-all duration-200 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">Out Time</span>
              <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl"><LogOut className="w-5 h-5" /></div>
            </div>
            <p className="text-2xl font-bold text-slate-800 mt-4 font-mono">{formatTime(todayRecord?.checkOut)}</p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:border-indigo-200 transition-all duration-200 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">Work Hours</span>
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl"><Clock className="w-5 h-5" /></div>
            </div>
            <p className="text-2xl font-bold text-slate-800 mt-4 font-mono">{todayRecord?.workHours ? `${todayRecord.workHours}h` : '0h'}</p>
          </div>
        </div>

      </div>

      {/* History Table Container */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">Recent Attendance Logs</h3>
              <p className="text-xs text-slate-400">Your past shift activities and logs</p>
            </div>
          </div>
          <button
            onClick={fetchAttendanceData}
            className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl transition cursor-pointer active:scale-95"
            title="Refresh Logs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <RefreshCw className="w-7 h-7 text-indigo-600 animate-spin mb-3" />
            <p className="text-xs font-medium">Loading attendance history...</p>
          </div>
        ) : historyLogs.length === 0 ? (
          <div className="py-20 text-center">
            <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700">Koi purana record nahi mila</p>
            <p className="text-xs text-slate-400 mt-0.5">Aapke attendance logs yahan show honge.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200/80 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Date</th>
                  <th className="py-3.5 px-6">Punch In</th>
                  <th className="py-3.5 px-6">Punch Out</th>
                  <th className="py-3.5 px-6">Work Hours</th>
                  <th className="py-3.5 px-6">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historyLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-indigo-50/40 transition-all duration-150 group">
                    <td className="py-4 px-6 font-semibold text-slate-800 text-xs sm:text-sm">
                      {new Date(log.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-4 px-6 text-slate-600 text-xs font-mono">{formatTime(log.checkIn)}</td>
                    <td className="py-4 px-6 text-slate-600 text-xs font-mono">{formatTime(log.checkOut)}</td>
                    <td className="py-4 px-6 text-slate-600 text-xs font-mono font-medium">{log.workHours ? `${log.workHours}h` : '--'}</td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border capitalize ${log.status === 'present'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : log.isLate
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${log.status === 'present' ? 'bg-emerald-500' : log.isLate ? 'bg-amber-500' : 'bg-rose-500'
                          }`} />
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}