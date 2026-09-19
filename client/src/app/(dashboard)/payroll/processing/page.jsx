"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Coins,
  Calendar,
  Layers,
  IndianRupee,
  Clock,
  Send
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";

export default function PayrollProcessing() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [disbursingId, setDisbursingId] = useState(null);

  const fetchBatches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/payroll/processing-queue");
      const resData = response?.data;

      const list = Array.isArray(resData)
        ? resData
        : Array.isArray(resData?.data)
          ? resData.data
          : [];

      setBatches(list);
    } catch (err) {
      console.error("Fetch processing queue error:", err);
      setError(
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Failed to load payroll processing queue from server."
      );
      setBatches([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  const handleDisburse = async (batch) => {
    const batchId = batch._id || `${batch.year}-${batch.month}`;
    const confirmed = window.confirm(
      `Are you sure you want to approve and disburse ${batch.period} payroll for ${batch.employeeCount} employees? Total payout: ₹${(batch.totalPayout || 0).toLocaleString("en-IN")}`
    );
    if (!confirmed) return;

    setDisbursingId(batchId);
    try {
      const response = await api.post(`/payroll/disburse/${batchId}`);
      toast.success(
        response?.data?.message ||
        `Batch ${batch.period} successfully approved & disbursed!`
      );
      fetchBatches();
    } catch (err) {
      console.error("Disburse error:", err);
      toast.error(
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Failed to disburse payroll batch."
      );
    } finally {
      setDisbursingId(null);
    }
  };

  const totalPendingPayout = useMemo(() => {
    return batches.reduce((acc, b) => acc + (Number(b.totalPayout) || 0), 0);
  }, [batches]);

  const totalPendingEmployees = useMemo(() => {
    return batches.reduce((acc, b) => acc + (Number(b.employeeCount) || 0), 0);
  }, [batches]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-2 lg:px-2 py-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs transition hover:shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Payroll Processing & Approval
              </h1>
              {!loading && !error && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  {batches.length} Pending {batches.length === 1 ? "Batch" : "Batches"}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Verify monthly calculations, review net disbursement totals, and authorize bank transfers
            </p>
          </div>
        </div>

        <button
          onClick={fetchBatches}
          disabled={loading}
          className="self-start sm:self-auto inline-flex items-center gap-2 px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* KPI Cards */}
      {!loading && !error && batches.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between transition hover:shadow-md">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Total Pending Disbursal
              </p>
              <h3 className="text-xl font-bold text-slate-900 mt-1">
                ₹{totalPendingPayout.toLocaleString("en-IN")}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <IndianRupee className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between transition hover:shadow-md">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Pending Employees
              </p>
              <h3 className="text-xl font-bold text-amber-600 mt-1">
                {totalPendingEmployees} Records
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between transition hover:shadow-md">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Awaiting Approval
              </p>
              <h3 className="text-xl font-bold text-slate-900 mt-1">
                {batches.length} Batches
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {/* Main Results Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden transition hover:shadow-md">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-800">
              Loading pending payroll queue...
            </p>
          </div>
        ) : error ? (
          <div className="py-16 text-center max-w-md mx-auto p-6">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-900">Failed to Load Queue</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">{error}</p>
            <button
              onClick={fetchBatches}
              className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition"
            >
              Retry Connection
            </button>
          </div>
        ) : batches.length === 0 ? (
          <div className="py-20 text-center max-w-sm mx-auto p-6">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">All Batches Disbursed</h3>
            <p className="text-xs text-slate-500 mt-1">
              There are no pending draft or processed payrolls waiting for approval.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-6">Billing Period</th>
                    <th className="py-3.5 px-6">Workforce Count</th>
                    <th className="py-3.5 px-6">Gross Pay</th>
                    <th className="py-3.5 px-6">Deductions</th>
                    <th className="py-3.5 px-6">Net Payout</th>
                    <th className="py-3.5 px-6">Current Status</th>
                    <th className="py-3.5 px-6 text-right">Authorize</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {batches.map((b) => {
                    const id = b._id || `${b.year}-${b.month}`;
                    const isProcessing = disbursingId === id;

                    return (
                      <tr key={id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 px-6 font-semibold text-slate-900">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-indigo-500" />
                            <span>Cycle {b.period}</span>
                          </div>
                        </td>

                        <td className="py-4 px-6 text-slate-600">
                          <span className="font-semibold text-slate-800">
                            {b.employeeCount}
                          </span>{" "}
                          staff members
                        </td>

                        <td className="py-4 px-6 text-slate-700 font-medium">
                          ₹{(b.totalGross || 0).toLocaleString("en-IN")}
                        </td>

                        <td className="py-4 px-6 text-rose-600 font-medium">
                          -₹{(b.totalDeductions || 0).toLocaleString("en-IN")}
                        </td>

                        <td className="py-4 px-6">
                          <span className="font-bold text-emerald-600 text-base">
                            ₹{(b.totalPayout || 0).toLocaleString("en-IN")}
                          </span>
                        </td>

                        <td className="py-4 px-6 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 capitalize">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            {b.status || "draft"}
                          </span>
                        </td>

                        <td className="py-4 px-6 text-right whitespace-nowrap">
                          <button
                            disabled={isProcessing}
                            onClick={() => handleDisburse(b)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-semibold shadow-xs transition disabled:opacity-50 cursor-pointer"
                          >
                            {isProcessing ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>Processing...</span>
                              </>
                            ) : (
                              <>
                                <Send className="w-3.5 h-3.5" />
                                <span>Approve & Disburse</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-slate-100">
              {batches.map((b) => {
                const id = b._id || `${b.year}-${b.month}`;
                const isProcessing = disbursingId === id;

                return (
                  <div key={id} className="p-4 space-y-3 bg-white hover:bg-slate-50/50 transition">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-indigo-500" />
                        <h4 className="font-bold text-slate-900 text-sm">
                          Cycle {b.period}
                        </h4>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 capitalize">
                        {b.status || "draft"}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5 text-xs">
                      <div className="flex justify-between items-center text-slate-600">
                        <span>Workforce:</span>
                        <span className="font-semibold text-slate-800">
                          {b.employeeCount} Employees
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-slate-600">
                        <span>Gross Pay:</span>
                        <span className="font-semibold text-slate-800">
                          ₹{(b.totalGross || 0).toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-slate-600">
                        <span>Total Deductions:</span>
                        <span className="font-semibold text-rose-600">
                          -₹{(b.totalDeductions || 0).toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-slate-600 pt-1 border-t border-slate-200/60">
                        <span className="font-bold text-slate-800">Net Payout:</span>
                        <span className="font-bold text-emerald-600 text-sm">
                          ₹{(b.totalPayout || 0).toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>

                    <button
                      disabled={isProcessing}
                      onClick={() => handleDisburse(b)}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition disabled:opacity-50"
                    >
                      {isProcessing ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Processing Payouts...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Approve & Disburse Batch</span>
                        </>
                      )}
                    </button>
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