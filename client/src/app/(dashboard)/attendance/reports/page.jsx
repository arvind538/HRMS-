"use client";

import React, { useState } from 'react';
import { FileSpreadsheet, RefreshCw, Calendar, AlertCircle, BarChart3, IdCard } from 'lucide-react';
import api from "@/lib/api";
import { toast } from "react-toastify";

export default function AttendanceReports() {
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    department: 'ALL',
    status: 'ALL'
  });

  // Helper function to safely format time
  const formatTime = (timeVal) => {
    if (!timeVal) return '--';
    try {
      const date = new Date(timeVal);
      if (!isNaN(date.getTime())) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return timeVal;
    } catch {
      return timeVal;
    }
  };

  // Safe helper to deeply extract and format Employee ID
  const resolveEmpId = (item) => {
    const emp = item?.employee;
    const usr = item?.user || item?.userId;

    // Direct code / employeeId properties
    const candidate =
      (typeof emp === "object" ? emp?.employeeId || emp?.empId || emp?.code || emp?.customId : null) ||
      (typeof usr === "object" ? usr?.employeeId || usr?.empId || usr?.code : null) ||
      item?.employeeId ||
      item?.empId ||
      item?.code ||
      item?.employeeCode;

    if (candidate && String(candidate).trim() && String(candidate).toLowerCase() !== "null") {
      return String(candidate).trim();
    }

    // Fallback: Check MongoDB ObjectId string if populated
    const fallbackId =
      (typeof emp === "object" ? emp?._id || emp?.id : emp) ||
      (typeof usr === "object" ? usr?._id || usr?.id : usr) ||
      item?._id;

    if (fallbackId && typeof fallbackId === "string" && fallbackId.length >= 4) {
      return `EMP${fallbackId.slice(-4).toUpperCase()}`;
    }

    return "EMP-001";
  };

  // Safe helper to extract Employee Name
  const resolveEmpName = (item) => {
    const emp = item?.employee;
    const usr = item?.user || item?.userId;

    const candidate =
      (typeof emp === "object" ? emp?.name || emp?.fullName || emp?.username : null) ||
      (typeof usr === "object" ? usr?.name || usr?.fullName || usr?.username : null) ||
      (typeof emp === "string" && isNaN(Number(emp)) && emp.length < 24 ? emp : null) ||
      item?.userName ||
      item?.name ||
      item?.employeeName;

    return candidate || "Staff Member";
  };

  const handleFetchReport = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      let list = [];

      // 1. Dedicated Reports Endpoint
      try {
        const { data } = await api.get("/attendance/reports", { params: filters });
        list = Array.isArray(data) ? data : (data.reports || data.data || data.records || []);
      } catch {
        list = [];
      }

      // 2. Fallback to base attendance endpoint if reports route was empty
      if (list.length === 0) {
        const { data: fallbackData } = await api.get("/attendance", { params: filters });
        list = Array.isArray(fallbackData)
          ? fallbackData
          : (fallbackData.attendance || fallbackData.data || fallbackData.records || []);
      }

      const mapped = list.map((item, index) => {
        return {
          id: item._id || item.id || index,
          userId: resolveEmpId(item),
          userName: resolveEmpName(item),
          date: item.date
            ? new Date(item.date).toISOString().slice(0, 10)
            : new Date(item.createdAt || Date.now()).toISOString().slice(0, 10),
          checkIn: formatTime(item.checkIn || item.inTime),
          checkOut: formatTime(item.checkOut || item.outTime),
          hours: item.workHours
            ? `${item.workHours}h`
            : item.hours
              ? `${item.hours}h`
              : '--',
          status: item.status || 'present'
        };
      });

      setReportData(mapped);
      toast.success("Attendance report generated successfully!");
    } catch (err) {
      console.error("Report fetch error:", err);
      setError("Failed to fetch report data from server. Please verify backend connection.");
      toast.error("Failed to generate report.");
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    if (reportData.length === 0) return;
    const headers = ["Employee ID,Name,Date,Check In,Check Out,Total Hours,Status"];
    const rows = reportData.map(
      (r) =>
        `"${r.userId}","${r.userName}","${r.date}","${r.checkIn || ''}","${r.checkOut || ''}","${r.hours || ''}","${r.status}"`
    );
    const blob = new Blob([[...headers, ...rows].join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Attendance_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    toast.success("CSV report downloaded successfully!");
  };

  return (
    <div className="w-full space-y-6 font-sans pb-12 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" /> Attendance Reports & Analytics
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Generate, filter, and export detailed attendance records and insights
          </p>
        </div>
        <button
          onClick={exportCSV}
          disabled={reportData.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-md shadow-emerald-100 transition cursor-pointer active:scale-95"
        >
          <FileSpreadsheet className="w-4 h-4" /> Export to CSV
        </button>
      </div>

      {/* Filter Parameters Form */}
      <form
        onSubmit={handleFetchReport}
        className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 text-xs items-end"
      >
        <div>
          <label className="font-bold text-slate-600 uppercase tracking-wider block mb-1.5">From Date</label>
          <input
            type="date"
            required
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer font-mono"
          />
        </div>
        <div>
          <label className="font-bold text-slate-600 uppercase tracking-wider block mb-1.5">To Date</label>
          <input
            type="date"
            required
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer font-mono"
          />
        </div>
        <div>
          <label className="font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Department</label>
          <select
            value={filters.department}
            onChange={(e) => setFilters({ ...filters, department: e.target.value })}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
          >
            <option value="ALL">All Departments</option>
            <option value="ENGINEERING">Engineering</option>
            <option value="HR">HR & Admin</option>
            <option value="SALES">Sales & Marketing</option>
          </select>
        </div>
        <div>
          <label className="font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Status Filter</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="PRESENT">Present</option>
            <option value="ABSENT">Absent</option>
            <option value="LATE">Late</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition shadow-md shadow-indigo-100 cursor-pointer active:scale-95"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Generating...' : 'Generate Report'}
        </button>
      </form>

      {/* Output Table Container */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <RefreshCw className="w-7 h-7 text-indigo-600 animate-spin mb-2" />
            <p className="text-xs font-medium">Generating report, please wait...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center px-4">
            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
            <p className="text-xs text-slate-500">{error}</p>
          </div>
        ) : reportData.length === 0 ? (
          <div className="py-20 text-center px-4">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No attendance data available</p>
            <p className="text-xs text-slate-400 mt-0.5">Please select a valid date range and click &apos;Generate Report&apos;.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-50/75 border-b border-slate-200/80 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-4 px-6">Emp ID</th>
                  <th className="py-4 px-6">Employee Name</th>
                  <th className="py-4 px-6">Date</th>
                  <th className="py-4 px-6">Check In</th>
                  <th className="py-4 px-6">Check Out</th>
                  <th className="py-4 px-6">Duration</th>
                  <th className="py-4 px-6">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportData.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-indigo-50/40 hover:shadow-2xs transition-all duration-200 group cursor-pointer"
                  >
                    <td className="py-4 px-6 font-mono text-xs font-bold text-indigo-700 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <IdCard size={12} />
                        {item.userId}
                      </span>
                    </td>

                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors font-mono">
                          {item.userName ? item.userName.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <span className="font-bold text-slate-900 text-xs sm:text-sm tracking-tight group-hover:text-indigo-900 transition-colors">
                          {item.userName}
                        </span>
                      </div>
                    </td>

                    <td className="py-4 px-6 text-slate-600 text-xs font-medium whitespace-nowrap font-mono">{item.date}</td>
                    <td className="py-4 px-6 font-mono text-xs text-slate-600 whitespace-nowrap">{item.checkIn}</td>
                    <td className="py-4 px-6 font-mono text-xs text-slate-600 whitespace-nowrap">{item.checkOut}</td>
                    <td className="py-4 px-6 font-mono text-xs font-bold text-slate-700 whitespace-nowrap">{item.hours}</td>

                    <td className="py-4 px-6 whitespace-nowrap">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize border ${item.status?.toLowerCase() === 'present'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : item.status?.toLowerCase() === 'absent'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                      >
                        {item.status}
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