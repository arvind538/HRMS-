'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { LogIn, LogOut, Search, RefreshCw, Clock, AlertCircle, CheckCircle2, Calendar } from 'lucide-react';
import api from "@/lib/api";

export default function CheckInOutManager() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get("/attendance", { params: { date: selectedDate } });
      setRecords(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.response?.data?.message || "Backend se connect nahi ho paya.");
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const filteredRecords = records.filter((item) => {
    const emp = item?.employee && typeof item.employee === "object" ? item.employee : {};
    const name = emp.name || emp.username || "";
    const empId = emp.employeeId || "";

    const matchesSearch =
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      empId.toLowerCase().includes(searchTerm.toLowerCase());

    const isCheckedIn = !!item.checkIn && !item.checkOut;
    const isCheckedOut = !!item.checkIn && !!item.checkOut;
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'CHECKED_IN' && isCheckedIn) ||
      (statusFilter === 'CHECKED_OUT' && isCheckedOut);

    return matchesSearch && matchesStatus;
  });

  const formatTime = (d) => (d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--');

  return (
    <div className="w-full space-y-6 font-sans pb-10">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Check-In / Check-Out Logs</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Live status aur daily attendance records monitor karein</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700 cursor-pointer"
          />
          <button
            onClick={fetchRecords}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-medium rounded-xl transition shadow-sm disabled:opacity-50 active:scale-95 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 font-medium cursor-pointer"
        >
          <option value="ALL">All Status</option>
          <option value="CHECKED_IN">Checked In (still working)</option>
          <option value="CHECKED_OUT">Checked Out (shift done)</option>
        </select>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
            <p className="text-xs sm:text-sm text-slate-500 font-medium">Fetching live records...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <AlertCircle className="w-10 h-10 text-rose-500 mb-2" />
            <h3 className="text-base font-semibold text-slate-800">Data fetch nahi ho paya</h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm">{error}</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <Calendar className="w-10 h-10 text-slate-300 mb-2" />
            <h3 className="text-base font-semibold text-slate-800">Koi record nahi mila</h3>
            <p className="text-xs text-slate-400 mt-0.5">Is date par koi activity available nahi hai.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-6">Employee</th>
                    <th className="py-3.5 px-6">Status</th>
                    <th className="py-3.5 px-6">Check In</th>
                    <th className="py-3.5 px-6">Check Out</th>
                    <th className="py-3.5 px-6">Total Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredRecords.map((item) => {
                    const emp = item?.employee && typeof item.employee === "object" ? item.employee : {};
                    const empName = emp.name || emp.username || "Staff Member";
                    // Safe string handling for employee ID to avoid object rendering crash
                    const empId = emp.employeeId || (typeof item.employee === "string" ? item.employee : emp._id ? String(emp._id).slice(-6) : "—");
                    const isCheckedIn = !!item.checkIn && !item.checkOut;

                    return (
                      <tr key={item._id} className="hover:bg-indigo-50/40 transition-all duration-150 group">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                              {empName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800 text-xs sm:text-sm">{empName}</p>
                              <p className="text-[11px] text-slate-400 font-mono">{empId}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${isCheckedIn
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}>
                            {isCheckedIn ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                            {isCheckedIn ? 'CHECKED IN' : 'CHECKED OUT'}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-slate-600 text-xs font-mono">
                          <div className="flex items-center gap-1.5"><LogIn className="w-3.5 h-3.5 text-emerald-600" />{formatTime(item.checkIn)}</div>
                        </td>
                        <td className="py-4 px-6 text-slate-600 text-xs font-mono">
                          <div className="flex items-center gap-1.5"><LogOut className="w-3.5 h-3.5 text-rose-500" />{formatTime(item.checkOut)}</div>
                        </td>
                        <td className="py-4 px-6 text-slate-600 text-xs font-mono font-semibold">
                          {item.workHours ? `${item.workHours}h` : '--'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredRecords.map((item) => {
                const emp = item?.employee && typeof item.employee === "object" ? item.employee : {};
                const empName = emp.name || emp.username || "Staff Member";
                const empId = emp.employeeId || (typeof item.employee === "string" ? item.employee : emp._id ? String(emp._id).slice(-6) : "—");
                const isCheckedIn = !!item.checkIn && !item.checkOut;

                return (
                  <div key={item._id} className="p-4 space-y-3 hover:bg-slate-50 transition">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {empName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-800">{empName}</h4>
                          <p className="text-[10px] text-slate-400 font-mono">{empId}</p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${isCheckedIn
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                        {isCheckedIn ? 'CHECKED IN' : 'CHECKED OUT'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl text-center text-xs font-mono">
                      <div>
                        <p className="text-[10px] text-slate-400 font-sans">Check In</p>
                        <p className="font-semibold text-slate-700">{formatTime(item.checkIn)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-sans">Check Out</p>
                        <p className="font-semibold text-slate-700">{formatTime(item.checkOut)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-sans">Hours</p>
                        <p className="font-semibold text-slate-700">{item.workHours ? `${item.workHours}h` : '--'}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}