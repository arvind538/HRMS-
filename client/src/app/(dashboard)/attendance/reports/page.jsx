"use client";

import React, { useState } from 'react';
import { FileSpreadsheet, RefreshCw, Calendar, AlertCircle, BarChart3 } from 'lucide-react';
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

  const handleFetchReport = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // Direct reports endpoint hit karein with query parameters
      const { data } = await api.get("/attendance/reports", { params: filters });
      const list = Array.isArray(data) ? data : (data.reports || data.data || []);

      const mapped = list.map(item => ({
        userId: item.userId || item.employee?.employeeId || item.employee?.empId || item.employee?.code || item.employee?._id?.slice(-6) || "N/A",
        userName: item.userName || item.employee?.name || item.employee?.fullName || "Staff Member",
        date: item.date ? new Date(item.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
        checkIn: item.checkIn ? new Date(item.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
        checkOut: item.checkOut ? new Date(item.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
        hours: item.workHours ? `${item.workHours}h` : (item.hours ? `${item.hours}h` : ''),
        status: item.status || 'present'
      }));

      setReportData(mapped);
      toast.success("Attendance report generated successfully!");
    } catch (err) {
      console.warn("Dedicated reports route failed, trying fallback logs endpoint...", err);

      // Fallback mechanism: agar /reports route 404 de toh /attendance ya /attendance/all try karein
      try {
        const { data: fallbackData } = await api.get("/attendance");
        const rawList = Array.isArray(fallbackData) ? fallbackData : (fallbackData.attendance || fallbackData.data || []);

        const mapped = rawList.map(item => ({
          userId: item.employee?.employeeId || item.employee?.empId || item.employee?.code || item.employee?._id?.slice(-6) || item.userId || "N/A",
          userName: item.employee?.name || item.employee?.fullName || item.userName || "Staff Member",
          date: new Date(item.date || item.createdAt || Date.now()).toISOString().slice(0, 10),
          checkIn: item.checkIn ? new Date(item.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
          checkOut: item.checkOut ? new Date(item.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
          hours: item.workHours ? `${item.workHours}h` : '',
          status: item.status || 'present'
        }));

        setReportData(mapped);
        toast.success("Report loaded successfully from attendance logs!");
      } catch (fallbackErr) {
        console.error("Both endpoints failed:", fallbackErr);
        setError("Failed to fetch report data from server. Please check if your backend server is running and routes exist.");
        toast.error("Failed to generate report.");
      }
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    if (reportData.length === 0) return;
    const headers = ["Employee ID,Name,Date,Check In,Check Out,Total Hours,Status"];
    const rows = reportData.map(r => `"${r.userId}","${r.userName}","${r.date}","${r.checkIn || ''}","${r.checkOut || ''}","${r.hours || ''}","${r.status}"`);
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
          <p className="text-xs text-slate-500 mt-0.5">Generate, filter, and export detailed attendance records and insights</p>
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
      <form onSubmit={handleFetchReport} className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 text-xs items-end">
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
            <p className="text-xs text-slate-400 mt-0.5">Please select a valid date range and click 'Generate Report'.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
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
                {reportData.map((item, idx) => (
                  <tr key={item._id || idx} className="hover:bg-indigo-50/40 transition-all duration-150 group">
                    <td className="py-4 px-6 font-mono text-xs font-semibold text-slate-500">{item.userId}</td>
                    <td className="py-4 px-6 font-semibold text-slate-800 text-xs sm:text-sm">{item.userName}</td>
                    <td className="py-4 px-6 text-slate-600 text-xs">{item.date}</td>
                    <td className="py-4 px-6 font-mono text-xs text-slate-600">{item.checkIn || '--'}</td>
                    <td className="py-4 px-6 font-mono text-xs text-slate-600">{item.checkOut || '--'}</td>
                    <td className="py-4 px-6 font-mono text-xs font-medium text-slate-600">{item.hours || '--'}</td>
                    <td className="py-4 px-6">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize border ${item.status?.toLowerCase() === 'present'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : item.status?.toLowerCase() === 'absent'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
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