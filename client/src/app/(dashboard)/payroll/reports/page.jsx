"use client";

import React, { useState, useMemo } from "react";
import {
  FileSpreadsheet,
  RefreshCw,
  Calendar,
  AlertCircle,
  IndianRupee,
  Users,
  Coins,
  Download
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";

export default function PayrollReports() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const currentYear = new Date().getFullYear().toString();
  const currentMonth = String(new Date().getMonth() + 1).padStart(2, "0");

  const [filters, setFilters] = useState({
    month: currentMonth,
    year: currentYear,
    department: "ALL",
  });

  const monthNames = [
    { value: "01", name: "January" },
    { value: "02", name: "February" },
    { value: "03", name: "March" },
    { value: "04", name: "April" },
    { value: "05", name: "May" },
    { value: "06", name: "June" },
    { value: "07", name: "July" },
    { value: "08", name: "August" },
    { value: "09", name: "September" },
    { value: "10", name: "October" },
    { value: "11", name: "November" },
    { value: "12", name: "December" },
  ];

  const handleGenerate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setData([]);

    try {
      const params = new URLSearchParams(filters).toString();
      const response = await api.get(`/payroll/reports?${params}`);

      const resData = response?.data;
      const list = Array.isArray(resData)
        ? resData
        : Array.isArray(resData?.data)
          ? resData.data
          : Array.isArray(resData?.reports)
            ? resData.reports
            : [];

      setData(list);

      if (list.length === 0) {
        toast.info(`No processed payrolls found for ${filters.month}/${filters.year}.`);
      } else {
        toast.success(`Payroll register compiled with ${list.length} records.`);
      }
    } catch (err) {
      console.error("Report generation error:", err);
      const errMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Failed to compile payroll register from server.";
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    if (data.length === 0) {
      toast.warn("No data available to export.");
      return;
    }

    const headers = [
      "Employee ID",
      "Employee Name",
      "Department",
      "Gross Salary (INR)",
      "Bonuses (INR)",
      "Total Deductions (INR)",
      "TDS Withheld (INR)",
      "Net Payout (INR)",
      "Disbursement Status"
    ];

    const rows = data.map((r) => [
      `"${r.userId || r.employeeId || "—"}"`,
      `"${r.userName || r.name || "Unknown"}"`,
      `"${r.department || r.employee?.department || "General"}"`,
      `"${r.gross || r.grossSalary || 0}"`,
      `"${r.bonus || 0}"`,
      `"${r.deductions || r.totalDeductions || 0}"`,
      `"${r.tds || 0}"`,
      `"${r.netPay || r.netSalary || 0}"`,
      `"${r.status || "—"}"`
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `Payroll_Register_${filters.department}_${filters.month}_${filters.year}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("CSV Export Downloaded!");
  };

  const totalNetPayout = useMemo(() => {
    return data.reduce((sum, r) => sum + (Number(r.netPay || r.netSalary) || 0), 0);
  }, [data]);

  const totalTdsWithheld = useMemo(() => {
    return data.reduce((sum, r) => sum + (Number(r.tds) || 0), 0);
  }, [data]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-3 lg:px-4 py-3 font-sans">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs transition-all duration-300 hover:shadow-xl hover:border-indigo-200">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 transition-transform duration-300 hover:scale-105">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Payroll Register & Audit Reports
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Compile monthly disbursement ledgers, verify payouts, and export bank/tax compliance CSV statements
            </p>
          </div>
        </div>

        <button
          onClick={exportCSV}
          disabled={data.length === 0 || loading}
          className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl shadow-xs transition-all duration-200 cursor-pointer active:scale-95"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV Statement</span>
        </button>
      </div>

      {/* Filter Form Controls */}
      <form
        onSubmit={handleGenerate}
        className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end transition-all duration-300 hover:shadow-md"
      >
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Target Month
          </label>
          <select
            value={filters.month}
            onChange={(e) => setFilters({ ...filters, month: e.target.value })}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer transition font-medium"
          >
            {monthNames.map((m) => (
              <option key={m.value} value={m.value}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Financial Year
          </label>
          <input
            type="number"
            min="2020"
            max="2035"
            required
            value={filters.year}
            onChange={(e) => setFilters({ ...filters, year: e.target.value })}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono transition"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Department Filter
          </label>
          <select
            value={filters.department}
            onChange={(e) => setFilters({ ...filters, department: e.target.value })}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer transition font-medium"
          >
            <option value="ALL">All Departments</option>
            <option value="IT">Engineering & Tech</option>
            <option value="HR">Human Resources</option>
            <option value="FINANCE">Finance</option>
            <option value="SALES">Sales & Marketing</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer active:scale-95 shadow-md shadow-indigo-100"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>{loading ? "Compiling Ledger..." : "Generate Ledger"}</span>
        </button>
      </form>

      {/* KPI Overview (Shown only when data is generated) */}
      {!loading && !error && data.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between transition-all duration-300 hover:shadow-xl hover:border-indigo-200 group">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-indigo-600 transition-colors">
                Total Net Disbursement
              </p>
              <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1 font-mono">
                ₹{totalNetPayout.toLocaleString("en-IN")}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <IndianRupee className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between transition-all duration-300 hover:shadow-xl hover:border-rose-200 group">
            <div>
              <p className="text-[11px] font-bold text-rose-500 uppercase tracking-wider">
                TDS Withheld (Compliance)
              </p>
              <h3 className="text-xl sm:text-2xl font-extrabold text-rose-600 mt-1 font-mono">
                ₹{totalTdsWithheld.toLocaleString("en-IN")}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Coins className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between transition-all duration-300 hover:shadow-xl hover:border-emerald-200 group">
            <div>
              <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
                Employees Compiled
              </p>
              <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
                {data.length} Records
              </h3>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {/* Main Report Results */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden transition-all duration-300 hover:shadow-md">
        {loading ? (
          <div className="py-24 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-800">Compiling financial ledgers...</p>
            <p className="text-xs text-slate-500">This may take a moment for large datasets.</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center max-w-md mx-auto p-6">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-900">Failed to Compile Report</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">{error}</p>
          </div>
        ) : data.length === 0 ? (
          <div className="py-24 text-center max-w-sm mx-auto p-6">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">No Processed Data Found</h3>
            <p className="text-xs text-slate-500 mt-1">
              Select a valid Month/Year and click 'Generate Ledger' to view bank payout records.
              Draft payrolls will not appear here.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-4 px-6">Employee Code & Name</th>
                    <th className="py-4 px-6">Department</th>
                    <th className="py-4 px-6">Gross Pay</th>
                    <th className="py-4 px-6">Bonus</th>
                    <th className="py-4 px-6">Deductions</th>
                    <th className="py-4 px-6">Tax / TDS</th>
                    <th className="py-4 px-6 font-bold text-slate-900 text-right">Net Take-Home</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {data.map((r, idx) => {
                    const name = r.userName || r.name || r.employee?.name || "Unknown Staff";
                    const empCode = r.userId || r.employeeId || r.employee?.employeeId || "—";
                    const dept = r.department || r.employee?.department || "General";
                    const gross = r.gross || r.grossSalary || 0;
                    const bonus = r.bonus || 0;
                    const deductions = r.deductions || r.totalDeductions || 0;
                    const tds = r.tds || 0;
                    const netPay = r.netPay || r.netSalary || 0;

                    return (
                      <tr key={r._id || idx} className="hover:bg-indigo-50/40 transition-colors duration-150 group">
                        <td className="py-4 px-6">
                          <div className="font-bold text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors">
                            {name}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            {empCode}
                          </div>
                        </td>
                        <td className="py-4 px-6 text-slate-600 text-xs font-semibold capitalize">
                          <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700">
                            {dept}
                          </span>
                        </td>
                        <td className="py-4 px-6 font-semibold text-slate-700 font-mono">
                          ₹{gross.toLocaleString("en-IN")}
                        </td>
                        <td className="py-4 px-6 font-semibold text-emerald-600 font-mono">
                          +₹{bonus.toLocaleString("en-IN")}
                        </td>
                        <td className="py-4 px-6 font-semibold text-rose-600 font-mono">
                          -₹{deductions.toLocaleString("en-IN")}
                        </td>
                        <td className="py-4 px-6 font-semibold text-amber-600 font-mono">
                          -₹{tds.toLocaleString("en-IN")}
                        </td>
                        <td className="py-4 px-6 font-extrabold text-indigo-700 text-base text-right font-mono">
                          ₹{netPay.toLocaleString("en-IN")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden divide-y divide-slate-100">
              {data.map((r, idx) => {
                const name = r.userName || r.name || r.employee?.name || "Unknown Staff";
                const empCode = r.userId || r.employeeId || r.employee?.employeeId || "—";
                const dept = r.department || r.employee?.department || "General";
                const gross = r.gross || r.grossSalary || 0;
                const bonus = r.bonus || 0;
                const deductions = r.deductions || r.totalDeductions || 0;
                const tds = r.tds || 0;
                const netPay = r.netPay || r.netSalary || 0;

                return (
                  <div key={r._id || idx} className="p-4 space-y-3 bg-white hover:bg-slate-50 transition-colors">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{name}</h4>
                      <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                        <span>{empCode}</span>
                        <span>• {dept}</span>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-2 text-xs">
                      <div className="flex justify-between items-center text-slate-600">
                        <span className="font-medium">Gross Salary:</span>
                        <span className="font-bold text-slate-800 font-mono">₹{gross.toLocaleString("en-IN")}</span>
                      </div>
                      {bonus > 0 && (
                        <div className="flex justify-between items-center text-slate-600">
                          <span className="font-medium">Bonuses:</span>
                          <span className="font-bold text-emerald-600 font-mono">+₹{bonus.toLocaleString("en-IN")}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center text-slate-600">
                        <span className="font-medium">Total Deductions:</span>
                        <span className="font-bold text-rose-600 font-mono">-₹{deductions.toLocaleString("en-IN")}</span>
                      </div>
                      {tds > 0 && (
                        <div className="flex justify-between items-center text-slate-600">
                          <span className="font-medium">TDS Withheld:</span>
                          <span className="font-bold text-amber-600 font-mono">-₹{tds.toLocaleString("en-IN")}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center text-slate-900 font-bold pt-2 mt-1 border-t border-slate-200/60">
                        <span>Net Disbursement:</span>
                        <span className="text-indigo-700 text-sm font-black font-mono">₹{netPay.toLocaleString("en-IN")}</span>
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