"use client";

import React, { useState } from "react";
import {
  PlayCircle,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Coins,
  FileCheck2
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";

export default function GeneratePayroll() {
  const currentYear = new Date().getFullYear().toString();
  const currentMonth = String(new Date().getMonth() + 1).padStart(2, "0");

  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(currentYear);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

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
    setGenerating(true);
    setError(null);
    setResult(null);

    try {
      const response = await api.post("/payroll/generate-bulk", {
        month: Number(month),
        year: Number(year),
      });

      const resData = response?.data;
      setResult(resData);
      toast.success(`Payroll processed successfully for ${month}/${year}!`);
    } catch (err) {
      console.error("Payroll generation error:", err);
      const errMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Payroll generation failed. Please verify employee salary assignments.";
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4 px-4 sm:px-4 py-6">
      {/* Top Banner Header */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition hover:shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Run Monthly Payroll Engine
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Statutory Engine
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Compute active CTCs, structure ratios, PF/PT statutory cuts, and finalize monthly pay
            </p>
          </div>
        </div>
      </div>

      {/* Process Flow Information Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1.5 transition hover:shadow-md">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
            1
          </div>
          <h4 className="font-bold text-slate-800 text-sm">Read Active Mappings</h4>
          <p className="text-xs text-slate-500">
            Pulls all staff assigned under active CTC contracts and salary templates.
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1.5 transition hover:shadow-md">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
            2
          </div>
          <h4 className="font-bold text-slate-800 text-sm">Calculate Deductions</h4>
          <p className="text-xs text-slate-500">
            Auto-computes Employee PF (12% of Basic) and applicable Professional Tax.
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1.5 transition hover:shadow-md">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
            3
          </div>
          <h4 className="font-bold text-slate-800 text-sm">Finalize Net Payout</h4>
          <p className="text-xs text-slate-500">
            Locks take-home figures and prepares records for banking disbursement.
          </p>
        </div>
      </div>

      {/* Main Execution Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden transition hover:shadow-md">
        <div className="p-5 sm:p-6 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">Select Payroll Cycle</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Choose the target calendar month and financial year to compute
          </p>
        </div>

        <form onSubmit={handleGenerate} className="p-5 sm:p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Payroll Month
              </label>
              <div className="relative">
                <select
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer transition"
                >
                  {monthNames.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.name} ({m.value})
                    </option>
                  ))}
                </select>
              </div>
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
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
            </div>
          </div>

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200/80 rounded-xl flex items-start gap-2.5 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Batch Generation Failed</p>
                <p className="mt-0.5 text-rose-600">{error}</p>
              </div>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={generating}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 text-white font-semibold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition"
            >
              {generating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Computing Salaries & Deductions...</span>
                </>
              ) : (
                <>
                  <PlayCircle className="w-4 h-4" />
                  <span>Execute Monthly Payroll Batch</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Generation Result Banner & Summary Breakdown */}
      {result && (
        <div className="space-y-4 animate-in fade-in zoom-in-95 duration-150">
          <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-emerald-900 text-sm">
                  Batch Run Completed Successfully!
                </h4>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Processed salary calculations for cycle{" "}
                  <strong>{result.month || `${month}/${year}`}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-semibold self-start sm:self-auto">
              <div className="bg-white/90 px-3 py-1.5 rounded-lg border border-emerald-200 shadow-xs">
                <span className="text-slate-500">Processed: </span>
                <span className="text-slate-900 font-bold">
                  {result.totalProcessed || 0} Staff
                </span>
              </div>
              <div className="bg-white/90 px-3 py-1.5 rounded-lg border border-emerald-200 shadow-xs">
                <span className="text-slate-500">Net Payout: </span>
                <span className="text-emerald-700 font-bold">
                  ₹{(result.totalDisbursed || 0).toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </div>

          {/* Detailed Processed Employee Table */}
          {result.records && result.records.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden transition hover:shadow-md">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-indigo-600" />
                  <h3 className="font-bold text-slate-800 text-xs sm:text-sm">
                    Calculated Payroll Breakdown
                  </h3>
                </div>
                <span className="text-xs text-slate-400 font-medium">
                  {result.records.length} Employees Included
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/75 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                      <th className="py-3.5 px-5">Employee</th>
                      <th className="py-3.5 px-5">Gross Pay</th>
                      <th className="py-3.5 px-5">Basic (Earnings)</th>
                      <th className="py-3.5 px-5">PF / Deductions</th>
                      <th className="py-3.5 px-5 text-right">Net Payable</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {result.records.map((rec, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-5">
                          <div className="font-bold text-slate-800">
                            {rec.employee?.name || "Unknown"}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {rec.employee?.employeeId || "—"}
                          </div>
                        </td>
                        <td className="py-3.5 px-5 font-semibold text-slate-700">
                          ₹{(rec.grossMonthly || 0).toLocaleString("en-IN")}
                        </td>
                        <td className="py-3.5 px-5 text-slate-600">
                          ₹{(rec.earnings?.basic || 0).toLocaleString("en-IN")}
                        </td>
                        <td className="py-3.5 px-5 text-rose-600 font-medium">
                          -₹{(rec.deductions?.total || 0).toLocaleString("en-IN")}
                        </td>
                        <td className="py-3.5 px-5 text-right font-bold text-emerald-600 text-sm">
                          ₹{(rec.netPayable || 0).toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}