'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { LogOut, RefreshCw, AlertCircle, CheckCircle2, Search, AlertTriangle } from 'lucide-react';
import api from "@/lib/api";

export default function EarlyLeaving() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get("/attendance", { params: { month: selectedMonth, year: selectedYear } });
      const list = Array.isArray(data) ? data : (data.attendance || data.data || []);
      // Filter records where isEarlyLeaving is true
      setRecords(list.filter((r) => r.isEarlyLeaving));
    } catch (err) {
      setError(err.response?.data?.message || "Early leaving records fetch nahi ho sake.");
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Safe search filter with multi-level fallbacks
  const filteredRecords = records.filter((item) => {
    const emp = item?.employee && typeof item.employee === "object" ? item.employee : {};
    const name = emp.name || emp.fullName || emp.username || item.userName || "";
    const empId = emp.employeeId || (typeof item.employee === "string" ? item.employee : emp._id ? String(emp._id) : "");

    return name.toLowerCase().includes(searchTerm.toLowerCase()) || empId.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const formatTime = (d) => (d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--');

  return (
    <div className="w-full space-y-6 font-sans pb-12 animate-in fade-in duration-300">

      {/* Top Header & Month Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <LogOut className="w-5 h-5 text-rose-500" /> Early Leaving Tracker
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Shift khatam hone se pehle check-out kiye gaye logs monitor karein</p>
        </div>

        <div className="flex items-center gap-2.5">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString("default", { month: "long" })}</option>
            ))}
          </select>
          <input
            type="number"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="w-24 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
          />
          <button
            onClick={fetchRecords}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-xs font-semibold rounded-xl transition cursor-pointer active:scale-95"
            title="Refresh Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Search Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
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
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <RefreshCw className="w-7 h-7 text-indigo-600 animate-spin mb-2" />
            <p className="text-xs font-medium">Loading early leaving logs...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center px-4">
            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
            <p className="text-xs text-slate-500">{error}</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="py-20 text-center px-4">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">Koi Early Leaving record nahi mila</p>
            <p className="text-xs text-slate-400 mt-0.5">Sabhi check-outs time par huye hain.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/75 border-b border-slate-200/80 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-4 px-6">Employee</th>
                  <th className="py-4 px-6">Date</th>
                  <th className="py-4 px-6">Check Out Time</th>
                  <th className="py-4 px-6">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map((item) => {
                  const emp = item?.employee && typeof item.employee === "object" ? item.employee : {};
                  const empName = emp.name || emp.fullName || emp.username || item.userName || "Staff Member";
                  const empId = emp.employeeId || (typeof item.employee === "string" ? item.employee : emp._id ? String(emp._id).slice(-6) : "—");

                  return (
                    <tr key={item._id} className="hover:bg-indigo-50/40 transition-all duration-150 group">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs shrink-0">
                            {empName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 text-xs sm:text-sm">{empName}</p>
                            <p className="text-[11px] text-slate-400 font-mono">{empId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-slate-600 text-xs">
                        {item.date ? new Date(item.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : '--'}
                      </td>
                      <td className="py-4 px-6 font-mono font-bold text-rose-600 text-xs">
                        {formatTime(item.checkOut)}
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 bg-rose-50 px-3 py-1 rounded-full border border-rose-200 shadow-2xs">
                          <AlertTriangle className="w-3.5 h-3.5" /> Early Departure
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
    </div>
  );
}