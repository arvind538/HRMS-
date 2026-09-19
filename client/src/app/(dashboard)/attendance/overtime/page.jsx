"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Clock, RefreshCw, AlertCircle, Search, Award } from 'lucide-react';
import api from "@/lib/api";

export default function Overtime() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const fetchOvertime = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let list = [];

      // Try fetching from primary /attendance endpoint with params
      try {
        const { data } = await api.get("/attendance", {
          params: { month: selectedMonth, year: selectedYear }
        });
        const resData = data;
        list = Array.isArray(resData) ? resData : (resData.attendance || resData.data || resData.records || []);
      } catch (err1) {
        console.warn("Primary endpoint failed, trying backup /attendance/overtime endpoint...");
        // Fallback endpoint if your backend uses a dedicated overtime route
        const { data } = await api.get("/attendance/overtime", {
          params: { month: selectedMonth, year: selectedYear }
        });
        const resData = data;
        list = Array.isArray(resData) ? resData : (resData.attendance || resData.data || resData.records || []);
      }

      // Filter records with valid overtime hours (handling both numbers and numeric strings)
      const validRecords = list.filter((r) => {
        const hours = Number(r?.overtimeHours || r?.extraHours || 0);
        return hours > 0;
      });

      setRecords(validRecords);
    } catch (err) {
      console.error("Error fetching overtime records:", err);
      setError(err.response?.data?.message || "Backend se overtime records fetch nahi ho paye. API endpoint check karein.");
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    fetchOvertime();
  }, [fetchOvertime]);

  // Secure filtering matching name or employee ID dynamically
  const filteredRecords = records.filter((item) => {
    const emp = item?.employee && typeof item.employee === "object" ? item.employee : {};
    const name = emp.name || emp.username || item.name || "";
    const empId = emp.employeeId || emp.id || "";
    return (
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      empId.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="w-full space-y-6 font-sans pb-12 animate-in fade-in duration-300">

      {/* Top Header & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Award className="w-5 h-5 text-indigo-600" /> Overtime Logs
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Monitor extra work hours and shift overtimes smoothly</p>
        </div>

        <div className="flex items-center gap-2.5">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(0, i).toLocaleString("default", { month: "long" })}
              </option>
            ))}
          </select>
          <input
            type="number"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="w-24 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
          />
          <button
            onClick={fetchOvertime}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-xs font-semibold rounded-xl transition cursor-pointer active:scale-95 disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search employee by name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition"
          />
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <RefreshCw className="w-7 h-7 text-indigo-600 animate-spin mb-2" />
            <p className="text-xs font-medium">Loading overtime records...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center px-4">
            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
            <p className="text-xs text-slate-500">{error}</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="py-20 text-center px-4">
            <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No overtime records found</p>
            <p className="text-xs text-slate-400 mt-0.5">No extra work hours logged for this period or backend response is empty.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/75 border-b border-slate-200/80 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-4 px-6">Employee</th>
                  <th className="py-4 px-6">Date</th>
                  <th className="py-4 px-6">Extra Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map((item) => {
                  const emp = item?.employee && typeof item.employee === "object" ? item.employee : {};
                  const empName = emp.name || emp.username || item.name || "Staff Member";
                  const empId = emp.employeeId || emp.id || "—";
                  const overtimeVal = item.overtimeHours || item.extraHours || 0;

                  return (
                    <tr key={item._id || Math.random()} className="hover:bg-indigo-50/40 transition-all duration-150 group">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-105 transition-transform">
                            {empName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 text-xs sm:text-sm group-hover:text-indigo-600 transition-colors">{empName}</p>
                            <p className="text-[11px] text-slate-400 font-mono">{empId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-slate-600 text-xs font-medium">
                        {item.date ? new Date(item.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center gap-1.5 font-mono font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200 text-xs group-hover:bg-indigo-100 transition-colors">
                          <Clock className="w-3.5 h-3.5 text-indigo-600" /> {overtimeVal} Hours
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