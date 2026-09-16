"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  FileText,
  RefreshCw,
  AlertCircle,
  Search,
  Printer,
  Eye,
  X,
  Calendar,
  CheckCircle2,
  ReceiptText
} from "lucide-react";
import api from "@/lib/api";

export default function Payslips() {
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSlip, setSelectedSlip] = useState(null);

  const fetchPayslips = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/payroll/payslips");
      const resData = response?.data;

      const list = Array.isArray(resData)
        ? resData
        : Array.isArray(resData?.data)
          ? resData.data
          : [];

      setPayslips(list);
    } catch (err) {
      console.error("Fetch payslips error:", err);
      setError(
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Failed to load salary slips from the server."
      );
      setPayslips([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayslips();
  }, [fetchPayslips]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return payslips;
    return payslips.filter((p) => {
      const name = p.employee?.name || "";
      const code = p.employee?.employeeId || "";
      const slipNo = p.slipNumber || "";
      const period = p.period || "";
      return (
        name.toLowerCase().includes(q) ||
        code.toLowerCase().includes(q) ||
        slipNo.toLowerCase().includes(q) ||
        period.toLowerCase().includes(q)
      );
    });
  }, [payslips, searchQuery]);

  const totalDisbursed = useMemo(() => {
    return filtered.reduce((sum, item) => sum + (Number(item.netSalary) || 0), 0);
  }, [filtered]);

  const printPayslip = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-2 lg:px-4 py-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs transition hover:shadow-md print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <ReceiptText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Generated Salary Slips
              </h1>
              {!loading && !error && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {payslips.length} Disbursed
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Access digital monthly payslips, statutory breakdowns, and downloadable employee copies
            </p>
          </div>
        </div>

        <button
          onClick={fetchPayslips}
          disabled={loading}
          className="self-start sm:self-auto inline-flex items-center gap-2 px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI Overview */}
      {!loading && !error && payslips.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 print:hidden">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between transition hover:shadow-md">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Total Disbursed Slips
              </p>
              <h3 className="text-xl font-bold text-slate-900 mt-1">{filtered.length} Records</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between transition hover:shadow-md">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Total Cumulative Net Paid
              </p>
              <h3 className="text-xl font-bold text-emerald-600 mt-1">
                ₹{totalDisbursed.toLocaleString("en-IN")}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {/* Search Input */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-3 transition hover:shadow-md print:hidden">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by employee name, ID or slip number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
          />
        </div>
        <p className="text-xs text-slate-500 font-medium hidden sm:block">
          Showing <span className="font-bold text-slate-800">{filtered.length}</span> payslips
        </p>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden transition hover:shadow-md print:hidden">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-800">Loading payslip records...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center max-w-md mx-auto p-6">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-900">Failed to Load Payslips</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">{error}</p>
            <button
              onClick={fetchPayslips}
              className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition cursor-pointer"
            >
              Try Again
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center max-w-sm mx-auto p-6">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">No Payslips Available</h3>
            <p className="text-xs text-slate-500 mt-1">
              Finalize and disburse payroll batches from 'Payroll Processing' to generate digital slips.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-6">Slip ID</th>
                    <th className="py-3.5 px-6">Employee</th>
                    <th className="py-3.5 px-6">Pay Cycle</th>
                    <th className="py-3.5 px-6">Gross Pay</th>
                    <th className="py-3.5 px-6">Total Cuts</th>
                    <th className="py-3.5 px-6">Net Take-Home</th>
                    <th className="py-3.5 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filtered.map((p) => {
                    const empName = p.employee?.name || "Unknown Employee";
                    const empCode = p.employee?.employeeId || "—";
                    const dept = p.employee?.department || "";

                    return (
                      <tr key={p._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 px-6 font-mono text-xs text-indigo-600 font-semibold">
                          {p.slipNumber}
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-semibold text-slate-900 leading-tight">
                            {empName}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                            <span>{empCode}</span>
                            {dept && <span>• {dept}</span>}
                          </div>
                        </td>
                        <td className="py-4 px-6 whitespace-nowrap text-slate-600 text-xs">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{p.period}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6 font-medium text-slate-700">
                          ₹{(p.grossSalary || 0).toLocaleString("en-IN")}
                        </td>
                        <td className="py-4 px-6 font-medium text-rose-600">
                          -₹{(p.totalDeductions || 0).toLocaleString("en-IN")}
                        </td>
                        <td className="py-4 px-6 font-bold text-slate-900 text-base">
                          ₹{(p.netSalary || 0).toLocaleString("en-IN")}
                        </td>
                        <td className="py-4 px-6 text-right whitespace-nowrap">
                          <button
                            onClick={() => setSelectedSlip(p)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold border border-indigo-200 transition cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View & Print</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-slate-100">
              {filtered.map((p) => {
                const empName = p.employee?.name || "Unknown";
                const empCode = p.employee?.employeeId || "";

                return (
                  <div key={p._id} className="p-4 space-y-3 bg-white hover:bg-slate-50/50 transition">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono text-[11px] text-indigo-600 font-semibold">
                          {p.slipNumber}
                        </span>
                        <h4 className="font-semibold text-slate-900 text-sm">{empName}</h4>
                        {empCode && <p className="text-[11px] text-slate-400">{empCode}</p>}
                      </div>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {p.period}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1 text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span>Gross Salary:</span>
                        <span className="font-semibold text-slate-800">
                          ₹{(p.grossSalary || 0).toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Deductions:</span>
                        <span className="font-semibold text-rose-600">
                          -₹{(p.totalDeductions || 0).toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-900 font-bold pt-1 border-t border-slate-200">
                        <span>Net Payable:</span>
                        <span className="text-indigo-600 text-sm">
                          ₹{(p.netSalary || 0).toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedSlip(p)}
                      className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border border-indigo-200 transition cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View & Print Payslip</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Printable Digital Payslip Modal */}
      {selectedSlip && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            {/* Modal Controls */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-4 print:hidden">
              <div className="flex items-center gap-2">
                <ReceiptText className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-base">Digital Salary Certificate</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={printPayslip}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Slip</span>
                </button>
                <button
                  onClick={() => setSelectedSlip(null)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Official Print Header */}
            <div className="border border-slate-200 rounded-2xl p-6 space-y-6">
              <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">
                    PAYROLL STATEMENT
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5 font-mono">
                    Reference: {selectedSlip.slipNumber}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full uppercase">
                    Cycle {selectedSlip.period}
                  </span>
                  <p className="text-[11px] text-slate-400 mt-1">Status: Paid & Authorized</p>
                </div>
              </div>

              {/* Employee Particulars Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50/70 p-4 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400">Employee Name:</span>
                  <p className="font-bold text-slate-900 mt-0.5">
                    {selectedSlip.employee?.name || "—"}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400">Employee ID:</span>
                  <p className="font-bold text-slate-900 mt-0.5">
                    {selectedSlip.employee?.employeeId || "—"}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400">Department:</span>
                  <p className="font-medium text-slate-800 mt-0.5">
                    {selectedSlip.employee?.department || "General Staff"}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400">Days Present / Leaves:</span>
                  <p className="font-medium text-slate-800 mt-0.5">
                    {selectedSlip.daysPresent} Days / {selectedSlip.daysOnLeave} Leave
                  </p>
                </div>
              </div>

              {/* Two Column Earnings vs Deductions Table */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Earnings */}
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-1 text-[11px] uppercase tracking-wider">
                    Earnings & Allowances
                  </h4>
                  <div className="space-y-1.5 text-slate-600">
                    <div className="flex justify-between">
                      <span>Basic Pay:</span>
                      <strong className="text-slate-900">
                        ₹{(selectedSlip.basicSalary || 0).toLocaleString("en-IN")}
                      </strong>
                    </div>
                    {Object.entries(selectedSlip.allowances || {}).map(([key, val]) => (
                      <div key={key} className="flex justify-between capitalize">
                        <span>{key}:</span>
                        <strong className="text-slate-900">
                          ₹{Number(val || 0).toLocaleString("en-IN")}
                        </strong>
                      </div>
                    ))}
                    {selectedSlip.bonus > 0 && (
                      <div className="flex justify-between">
                        <span>Bonus:</span>
                        <strong className="text-slate-900">
                          ₹{selectedSlip.bonus.toLocaleString("en-IN")}
                        </strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* Deductions */}
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-1 text-[11px] uppercase tracking-wider">
                    Statutory Deductions
                  </h4>
                  <div className="space-y-1.5 text-slate-600">
                    {Object.keys(selectedSlip.deductions || {}).length > 0 ? (
                      Object.entries(selectedSlip.deductions || {}).map(([key, val]) => (
                        <div key={key} className="flex justify-between capitalize">
                          <span>{key}:</span>
                          <strong className="text-rose-600">
                            -₹{Number(val || 0).toLocaleString("en-IN")}
                          </strong>
                        </div>
                      ))
                    ) : (
                      <div className="flex justify-between">
                        <span>Statutory PF / PT:</span>
                        <strong className="text-rose-600">
                          -₹{(selectedSlip.totalDeductions || 0).toLocaleString("en-IN")}
                        </strong>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Net Payout Banner */}
              <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">
                    Net Take-Home Pay
                  </span>
                  <p className="text-xs text-slate-500 mt-0.5">Disbursed directly to registered bank account</p>
                </div>
                <h3 className="text-2xl font-black text-indigo-700">
                  ₹{(selectedSlip.netSalary || 0).toLocaleString("en-IN")}
                </h3>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}