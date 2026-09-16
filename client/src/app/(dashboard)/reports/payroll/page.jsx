"use client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, Wallet, TrendingUp, Calendar, RefreshCw, ArrowUpRight } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function PayrollReportsPage() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());

  // Fetch real payroll data concurrently from backend based on selected year
  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/reports/payroll", { params: { year } });
      setReport(data || {});
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load payroll analytics report.");
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const monthlyTotals = report?.monthlyTotals || {};
  const maxAmount = Math.max(...Object.values(monthlyTotals), 1);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 sm:space-y-6 px-3 sm:px-6 lg:px-8 py-4 sm:py-6 transition-all duration-300">

      {/* Header & Filter Controls Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4 sm:pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Payroll Financial Reports</h1>
            <span className="bg-emerald-100 text-emerald-700 text-[11px] sm:text-xs font-semibold px-2.5 py-0.5 rounded-full">Fiscal Overview</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">Monitor company-wide yearly payroll cost distribution and monthly expenditure trends.</p>
        </div>

        {/* Year Filter & Sync Actions Container */}
        <div className="flex items-center gap-2 sm:gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center gap-1.5 pl-2 text-xs font-semibold text-slate-500 hidden sm:flex">
            <Calendar size={14} className="text-emerald-600" /> Year:
          </div>

          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="w-full sm:w-28 px-3 py-2 bg-slate-50 hover:bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-center"
          />

          <button
            onClick={fetchReport}
            title="Refresh Payroll Data"
            className="p-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl transition-all duration-300 hover:rotate-180 cursor-pointer active:scale-95 shrink-0"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
          <Loader2 className="animate-spin text-emerald-600" size={38} />
          <p className="text-sm text-slate-500 font-medium">Loading payroll financial data...</p>
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-6">

          {/* Summary Metric Card */}
          <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm transition-all duration-300 hover:shadow-md hover:border-emerald-100 flex items-center justify-between max-w-md group">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-3 sm:p-3.5 bg-emerald-50 text-emerald-600 rounded-2xl transition-transform duration-300 group-hover:scale-110 shrink-0">
                <Wallet size={22} className="sm:w-6 sm:h-6" />
              </div>
              <div>
                <p className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Total Cost ({year})</p>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5 sm:mt-1">
                  ₹{((report?.totalPayrollCost || 0) / 100000).toFixed(1)} <span className="text-base font-semibold text-slate-500">Lakhs</span>
                </h3>
              </div>
            </div>
            <span className="text-[11px] sm:text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg flex items-center gap-1 shrink-0">
              Disbursed <ArrowUpRight size={14} />
            </span>
          </div>

          {/* Month-wise Cost Trend Breakdown Container */}
          <div className="bg-white p-4 sm:p-6 lg:p-8 rounded-2xl border border-slate-200 shadow-sm transition-all duration-300 hover:shadow-md">
            <div className="flex items-center justify-between mb-5 sm:mb-6">
              <div className="flex items-center gap-2">
                <TrendingUp size={18} className="text-emerald-600 shrink-0" />
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">Month-wise Expenditure Trends</h3>
              </div>
              <span className="text-[11px] sm:text-xs text-slate-400 font-medium">Monthly Outflow in INR</span>
            </div>

            {Object.keys(monthlyTotals).length === 0 ? (
              <div className="text-center py-10 sm:py-12 text-slate-400 text-xs sm:text-sm">
                No payroll distribution entries found for the selected financial year.
              </div>
            ) : (
              <div className="space-y-3.5 sm:space-y-4">
                {Object.entries(monthlyTotals)
                  .sort((a, b) => Number(a[0]) - Number(b[0]))
                  .map(([month, amount]) => (
                    <div key={month} className="group flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm bg-slate-50/60 p-3 sm:p-3.5 rounded-xl border border-slate-100 transition-all hover:bg-slate-50">

                      {/* Month Label */}
                      <div className="w-full sm:w-24 font-semibold text-slate-800 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                        <span>{monthNames[Number(month) - 1]}</span>
                      </div>

                      {/* Progress Bar Track */}
                      <div className="flex-1 h-3 sm:h-3.5 bg-slate-200/70 rounded-full overflow-hidden p-0.5 shadow-inner w-full">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-700 ease-out"
                          style={{ width: `${(amount / maxAmount) * 100}%` }}
                        />
                      </div>

                      {/* Cost Amount Badge */}
                      <div className="flex sm:w-32 justify-between sm:justify-end items-center text-xs font-bold text-slate-900 bg-white px-3 sm:px-2.5 py-1.5 sm:py-1 rounded-lg border border-slate-200 shadow-xs">
                        <span className="sm:hidden text-slate-400 font-normal">Amount:</span>
                        <span>₹{amount.toLocaleString()}</span>
                      </div>

                    </div>
                  ))}
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}