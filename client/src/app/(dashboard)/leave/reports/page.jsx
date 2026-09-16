"use client";

import React, { useState, useCallback, useMemo } from "react";
import {
  FileSpreadsheet,
  RefreshCw,
  Calendar,
  AlertCircle,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowRight,
  TrendingUp,
  FileText,
  ChevronDown,
  Filter,
  Printer
} from "lucide-react";
import api from "@/lib/api";

export default function LeaveReports() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);
  const [tableSearch, setTableSearch] = useState("");

  const today = new Date();
  const startOfYear = new Date(today.getFullYear(), 0, 1).toISOString().slice(0, 10);
  const endOfYear = new Date(today.getFullYear(), 11, 31).toISOString().slice(0, 10);

  const [filters, setFilters] = useState({
    startDate: startOfYear,
    endDate: endOfYear,
    leaveType: "ALL",
    status: "ALL",
  });

  const applyPreset = (type) => {
    const now = new Date();
    let start = new Date();
    const end = now.toISOString().slice(0, 10);

    if (type === "THIS_MONTH") {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (type === "LAST_30_DAYS") {
      start.setDate(now.getDate() - 30);
    } else if (type === "ALL_TIME") {
      start = new Date(now.getFullYear() - 2, 0, 1);
    }

    setFilters((prev) => ({
      ...prev,
      startDate: start.toISOString().slice(0, 10),
      endDate: end,
    }));
  };

  const handleGenerate = useCallback(
    async (e) => {
      if (e) e.preventDefault();
      setLoading(true);
      setError(null);
      setSearched(true);

      try {
        const response = await api.get("/leave");
        const resData = response?.data;

        const list = Array.isArray(resData)
          ? resData
          : Array.isArray(resData?.data)
            ? resData.data
            : Array.isArray(resData?.leaves)
              ? resData.leaves
              : [];

        const fromTimestamp = filters.startDate
          ? new Date(`${filters.startDate}T00:00:00`).getTime()
          : 0;
        const toTimestamp = filters.endDate
          ? new Date(`${filters.endDate}T23:59:59.999`).getTime()
          : Infinity;

        const filtered = list.filter((r) => {
          const itemStart = new Date(r.startDate).getTime();
          const matchesDate =
            !isNaN(itemStart) && itemStart >= fromTimestamp && itemStart <= toTimestamp;

          const matchesType =
            filters.leaveType === "ALL" ||
            r.leaveType?.toLowerCase().trim() === filters.leaveType.toLowerCase().trim();

          const matchesStatus =
            filters.status === "ALL" ||
            r.status?.toLowerCase().trim() === filters.status.toLowerCase().trim();

          return matchesDate && matchesType && matchesStatus;
        });

        setData(filtered);
      } catch (err) {
        console.error("Generate report error:", err);
        setError(
          err.response?.data?.message ||
          err.response?.data?.error ||
          "Report data load nahi ho paya. Backend connection check karein."
        );
      } finally {
        setLoading(false);
      }
    },
    [filters]
  );

  const visibleData = useMemo(() => {
    if (!tableSearch.trim()) return data;
    const q = tableSearch.toLowerCase().trim();
    return data.filter((r) => {
      const empName = (r.employee?.name || r.employeeName || "").toLowerCase();
      const empId = (r.employee?.employeeId || "").toLowerCase();
      const leaveType = (r.leaveType || "").toLowerCase();
      return empName.includes(q) || empId.includes(q) || leaveType.includes(q);
    });
  }, [data, tableSearch]);

  const metrics = useMemo(() => {
    return visibleData.reduce(
      (acc, item) => {
        acc.totalDays += Number(item.totalDays) || 0;
        const s = item.status?.toLowerCase();
        if (s === "approved") acc.approved += 1;
        else if (s === "pending") acc.pending += 1;
        else if (s === "rejected") acc.rejected += 1;
        return acc;
      },
      { totalDays: 0, approved: 0, pending: 0, rejected: 0 }
    );
  }, [visibleData]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? "-"
      : new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(d);
  };

  const exportCSV = () => {
    if (visibleData.length === 0) return;
    const headers = [
      "Emp ID",
      "Employee Name",
      "Leave Type",
      "Start Date",
      "End Date",
      "Total Days",
      "Status",
      "Reason",
    ];
    const rows = visibleData.map((r) => [
      `"${r.employee?.employeeId || ""}"`,
      `"${r.employee?.name || r.employeeName || "Unknown"}"`,
      `"${r.leaveType?.toUpperCase() || ""}"`,
      formatDate(r.startDate),
      formatDate(r.endDate),
      r.totalDays || 0,
      `"${r.status || "Pending"}"`,
      `"${(r.reason || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `Leave_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case "approved":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" /> Approved
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5" /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5" /> Pending
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 print:p-0">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs print:border-none print:shadow-none">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Leave Reports & Analytics
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full">
              Live Records
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Filter, examine aur download karein company-wide leave history
          </p>
        </div>

        <div className="flex items-center gap-2.5 print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            disabled={visibleData.length === 0}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition disabled:opacity-40"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">Print / PDF</span>
          </button>
          <button
            type="button"
            onClick={exportCSV}
            disabled={visibleData.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition disabled:opacity-40"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Parameters Form */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4 print:hidden">
        <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <Filter className="w-3.5 h-3.5 text-indigo-600" />
            <span>Quick Range Presets:</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => applyPreset("THIS_MONTH")}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => applyPreset("LAST_30_DAYS")}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
            >
              Last 30 Days
            </button>
            <button
              type="button"
              onClick={() => applyPreset("ALL_TIME")}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
            >
              All Records
            </button>
          </div>
        </div>

        <form
          onSubmit={handleGenerate}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 text-xs items-end"
        >
          <div>
            <label className="font-semibold text-slate-700 block mb-1.5">From Date</label>
            <input
              type="date"
              required
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1.5">To Date</label>
            <input
              type="date"
              required
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1.5">Leave Category</label>
            <div className="relative">
              <select
                value={filters.leaveType}
                onChange={(e) => setFilters({ ...filters, leaveType: e.target.value })}
                className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl text-slate-800 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none cursor-pointer"
              >
                <option value="ALL">All Categories</option>
                <option value="casual">Casual Leave</option>
                <option value="sick">Sick Leave</option>
                <option value="earned">Earned Leave</option>
                <option value="unpaid">Unpaid Leave</option>
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1.5">Approval Status</label>
            <div className="relative">
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl text-slate-800 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="approved">Approved Only</option>
                <option value="pending">Pending Only</option>
                <option value="rejected">Rejected Only</option>
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>{loading ? "Fetching..." : "Generate Report"}</span>
          </button>
        </form>
      </div>

      {/* KPI Cards */}
      {!loading && searched && visibleData.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Total Records
            </p>
            <div className="flex items-center justify-between mt-1">
              <h3 className="text-xl font-bold text-slate-900">{visibleData.length}</h3>
              <FileText className="w-5 h-5 text-slate-400" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Total Days
            </p>
            <div className="flex items-center justify-between mt-1">
              <h3 className="text-xl font-bold text-indigo-600">{metrics.totalDays} d</h3>
              <TrendingUp className="w-5 h-5 text-indigo-400" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Approved
            </p>
            <div className="flex items-center justify-between mt-1">
              <h3 className="text-xl font-bold text-emerald-600">{metrics.approved}</h3>
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Pending
            </p>
            <div className="flex items-center justify-between mt-1">
              <h3 className="text-xl font-bold text-amber-600">{metrics.pending}</h3>
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
          </div>
        </div>
      )}

      {/* Main Results Box */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden print:border-none print:shadow-none">
        {visibleData.length > 0 && (
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden">
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search employee or leave type..."
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <p className="text-xs text-slate-500 font-medium self-end sm:self-auto">
              Total <span className="font-bold text-slate-800">{visibleData.length}</span> records
            </p>
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-800">Generating report analysis...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center max-w-sm mx-auto p-4">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-900">Query Failed</h3>
            <p className="text-xs text-slate-500 mt-1">{error}</p>
          </div>
        ) : !searched ? (
          <div className="py-20 text-center max-w-md mx-auto p-4">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">Ready to Generate Report</h3>
            <p className="text-xs text-slate-500 mt-1">
              Date range aur filters chun kar 'Generate Report' par click karein.
            </p>
          </div>
        ) : visibleData.length === 0 ? (
          <div className="py-20 text-center max-w-md mx-auto p-4">
            <p className="text-sm font-semibold text-slate-700">Koi record nahi mila</p>
            <p className="text-xs text-slate-400 mt-1">
              Date range badal kar ya 'All Records' chun kar dobara try karein.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-6">Employee</th>
                    <th className="py-3.5 px-6">Leave Type</th>
                    <th className="py-3.5 px-6">Date Window</th>
                    <th className="py-3.5 px-6">Duration</th>
                    <th className="py-3.5 px-6">Reason</th>
                    <th className="py-3.5 px-6 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {visibleData.map((r) => {
                    const empName = r.employee?.name || r.employeeName || "Unknown Employee";
                    const empCode = r.employee?.employeeId || r.employee?.code || "—";

                    return (
                      <tr key={r._id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-4 px-6">
                          <div className="font-semibold text-slate-800 text-xs sm:text-sm">
                            {empName}
                          </div>
                          <div className="text-[11px] text-slate-400">{empCode}</div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="font-medium text-slate-700 capitalize text-xs">
                            {r.leaveType}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-slate-600 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-xs">
                            <span>{formatDate(r.startDate)}</span>
                            <ArrowRight className="w-3 h-3 text-slate-400" />
                            <span>{formatDate(r.endDate)}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-xs font-bold text-slate-800">
                            {r.totalDays} {r.totalDays === 1 ? "day" : "days"}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <p className="text-xs text-slate-500 max-w-xs truncate" title={r.reason}>
                            {r.reason || "—"}
                          </p>
                        </td>
                        <td className="py-4 px-6 text-right whitespace-nowrap">
                          {getStatusBadge(r.status)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-slate-100">
              {visibleData.map((r) => {
                const empName = r.employee?.name || r.employeeName || "Unknown";
                const empCode = r.employee?.employeeId || "";

                return (
                  <div key={r._id} className="p-4 space-y-3 bg-white">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-semibold text-slate-900 text-sm">{empName}</h4>
                        {empCode && <p className="text-[11px] text-slate-400">{empCode}</p>}
                      </div>
                      {getStatusBadge(r.status)}
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800 capitalize">
                        {r.leaveType}
                      </span>
                      <span className="font-bold text-slate-700">
                        {r.totalDays} {r.totalDays === 1 ? "day" : "days"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <span>{formatDate(r.startDate)}</span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      <span>{formatDate(r.endDate)}</span>
                    </div>

                    {r.reason && (
                      <p className="text-xs text-slate-500 pt-1 border-t border-slate-100">
                        <span className="font-medium text-slate-600">Reason: </span>
                        {r.reason}
                      </p>
                    )}
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