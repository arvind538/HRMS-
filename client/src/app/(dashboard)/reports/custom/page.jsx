"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Filter, FileText, Download, Loader2, Search, AlertCircle } from "lucide-react";

export default function CustomReportsPage() {
  // Filter States
  const [reportType, setReportType] = useState("goals");
  const [department, setDepartment] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Data & UI States
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  // 1. Page load hone par sessionStorage se purana data wapas laana
  useEffect(() => {
    const savedData = sessionStorage.getItem("customReportData");
    const savedSearchStatus = sessionStorage.getItem("hasSearched");

    if (savedData) {
      setReportData(JSON.parse(savedData));
      setHasSearched(savedSearchStatus === "true");
    }
  }, []);

  // Backend se custom report fetch karne ka function
  const handleGenerateReport = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      setHasSearched(true);

      const params = new URLSearchParams();
      if (reportType) params.append("reportType", reportType);
      if (department) params.append("department", department);
      if (role) params.append("role", role);
      if (status) params.append("status", status);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const response = await api.get(`/reports/custom?${params.toString()}`);
      const resultData = response.data.data || [];

      setReportData(resultData);

      // 2. Data milte hi sessionStorage mein save kar dena taaki refresh par na ude
      sessionStorage.setItem("customReportData", JSON.stringify(resultData));
      sessionStorage.setItem("hasSearched", "true");

    } catch (err) {
      console.error("Error fetching custom report:", err);
      setError(err.response?.data?.message || "Failed to generate report from server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 p-4 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/85 shadow-xs transition-all">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Custom Reports Builder</h1>
        <p className="text-sm text-gray-500 mt-1">
          Create custom reports using your choice of filters (date range, department, role)
        </p>
      </div>

      {/* Filter Builder Form */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4 text-indigo-600 font-semibold">
          <Filter className="w-5 h-5" />
          <span>Report Filters</span>
        </div>

        <form onSubmit={handleGenerateReport} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

          {/* Report Type */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Report Module</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full rounded-xl border border-gray-300 p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition"
            >
              <option value="goals">Goals Report</option>
              <option value="appraisals">Appraisals Report</option>
            </select>
          </div>

          {/* Department Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Department</label>
            <input
              type="text"
              placeholder="e.g. Engineering"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full rounded-xl border border-gray-300 p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition"
            />
          </div>

          {/* Role Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
            <input
              type="text"
              placeholder="e.g. Developer, Manager"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-xl border border-gray-300 p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-xl border border-gray-300 p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition"
            >
              <option value="">All Status</option>
              <option value="completed">Completed</option>
              <option value="in-progress">In-Progress</option>
              <option value="pending-manager">Pending Manager</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-xl border border-gray-300 p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-xl border border-gray-300 p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition"
            />
          </div>

          {/* Submit Button */}
          <div className="lg:col-span-3 flex justify-end mt-2">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white font-medium text-sm rounded-xl hover:bg-indigo-700 transition shadow-sm disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Generate Report
            </button>
          </div>
        </form>
      </div>

      {/* Results Section */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Report Results ({reportData.length})</h2>
          {reportData.length > 0 && (
            <button
              onClick={() => alert("Export feature can be linked here!")}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          )}
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!hasSearched ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            Upar diye gaye filters select karein aur &quot;Generate Report&quot; par click karein.
          </div>
        ) : loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          </div>
        ) : reportData.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            Koi data nahi mila selected filters ke mutabiq.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b text-xs font-semibold text-gray-500 uppercase bg-gray-50/50">
                  <th className="p-3">Employee Name</th>
                  <th className="p-3">Title / Details</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm text-gray-700">
                {reportData.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50 transition">
                    <td className="p-3 font-medium text-gray-900">
                      {item.employee?.name || "N/A"}
                    </td>
                    <td className="p-3">{item.title || item.goalName || "Performance Item"}</td>
                    <td className="p-3">{item.employee?.department || "General"}</td>
                    <td className="p-3">
                      <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-600">
                        {item.status || "Active"}
                      </span>
                    </td>
                    <td className="p-3 text-xs text-gray-500">
                      {new Date(item.createdAt || Date.now()).toLocaleDateString()}
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