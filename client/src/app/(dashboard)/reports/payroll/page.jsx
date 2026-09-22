// src/app/(dashboard)/reports/payroll/page.jsx
"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Loader2,
  Wallet,
  TrendingUp,
  Calendar,
  RefreshCw,
  ArrowUpRight,
  ChevronRight,
  X,
  Search,
  User,
  ShieldCheck,
  Percent,
  Activity,
  Banknote,
  CreditCard,
  Building
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const shortMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function PayrollReportsPage() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());

  // Center Modal States
  const [activeMetric, setActiveMetric] = useState(null);
  const [drilldownLogs, setDrilldownLogs] = useState([]);
  const [drilldownLoading, setDrilldownLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/reports/payroll", { params: { year } });
      setReport(data?.data || data || {});
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load payroll analytics report.");
      setReport({});
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Calculations
  const totalPayrollCost = report?.totalPayrollCost ?? report?.totalCost ?? report?.totalExpenditure ?? 0;
  const processedPayrollsCount = report?.processedCount ?? report?.totalPayrolls ?? report?.disbursedSalariesCount ?? 0;

  const monthlyTotals = useMemo(() => {
    const raw = report?.monthlyTotals || report?.monthlyCost || {};
    const formatted = {};
    if (typeof raw === "object" && !Array.isArray(raw)) {
      Object.entries(raw).forEach(([k, v]) => {
        formatted[Number(k)] = Number(v) || 0;
      });
    } else if (Array.isArray(raw)) {
      raw.forEach((item) => {
        const monthNum = item.month || item._id;
        const amt = item.total || item.amount || item.cost || 0;
        if (monthNum) formatted[Number(monthNum)] = amt;
      });
    }
    return formatted;
  }, [report]);

  const activeMonthsCount = Object.values(monthlyTotals).filter(v => v > 0).length || 1;
  const avgMonthlyBurn = Math.round(totalPayrollCost / activeMonthsCount);
  const maxAmount = Math.max(...Object.values(monthlyTotals), 1);

  // Budget Adherence / Burn rate calculation (Benchmark vs actual)
  const budgetUtilization = report?.budgetUtilization ?? (totalPayrollCost > 0 ? Math.min(100, Math.round((totalPayrollCost / (avgMonthlyBurn * 12 || 1)) * 100)) : 0);

  // Open Center Modal
  const handleCardClick = async (metricType, metricTitle, customPayload = null) => {
    setActiveMetric({ type: metricType, title: metricTitle, payload: customPayload });
    setSearchFilter("");

    if (metricType === "adherence") {
      setDrilldownLogs([]);
      return;
    }

    setDrilldownLoading(true);
    try {
      // 1. Direct logs inside report if backend provided them
      const embeddedLogs = report?.records || report?.payrolls || report?.disbursements || [];
      let filtered = [];

      if (embeddedLogs.length > 0) {
        filtered = embeddedLogs.filter((item) => {
          if (metricType === "all") return true;
          const monthIndex = new Date(item.disbursedAt || item.paymentDate || item.createdAt).getMonth() + 1;
          return Number(item.month || monthIndex) === Number(metricType);
        });
      }

      // 2. Fetch specific logs via payroll API if not in report response
      if (filtered.length === 0) {
        const params = { year };
        if (metricType !== "all") {
          params.month = metricType;
        }

        const { data } = await api.get("/payroll", { params });
        const fetchedList = Array.isArray(data) ? data : data?.data || data?.payrolls || [];
        filtered = fetchedList.filter((item) => {
          if (metricType === "all") return true;
          const monthIndex = new Date(item.disbursedAt || item.paymentDate || item.createdAt).getMonth() + 1;
          return Number(item.month || monthIndex) === Number(metricType);
        });
      }

      setDrilldownLogs(filtered);
    } catch {
      setDrilldownLogs([]);
    } finally {
      setDrilldownLoading(false);
    }
  };

  const visibleLogs = useMemo(() => {
    return drilldownLogs.filter((log) => {
      const q = searchFilter.toLowerCase().trim();
      if (!q) return true;
      const emp = log.employee || log.user || {};
      const name = (emp.name || emp.fullName || log.employeeName || "").toLowerCase();
      const code = (emp.employeeId || emp.empId || emp._id || "").toLowerCase();
      const designation = (emp.designation || log.designation || "").toLowerCase();
      return name.includes(q) || code.includes(q) || designation.includes(q);
    });
  }, [drilldownLogs, searchFilter]);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 px-3 sm:px-4 lg:px-6 py-4 font-sans text-slate-900 antialiased">

      {/* Header & Filter Controls Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Payroll Financial Reports
            </h1>
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 font-mono">
              <ShieldCheck size={12} /> Fiscal {year}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Monitor company-wide yearly payroll disbursement, run rates, and monthly expenditure trends.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2.5 bg-slate-50 p-1.5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-1.5 pl-2 text-xs font-semibold text-slate-500 hidden sm:flex">
            <Calendar size={14} className="text-emerald-600" /> Year:
          </div>

          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="w-24 sm:w-28 px-3 py-2 bg-white hover:border-emerald-400 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-center shadow-2xs font-mono"
          />

          <button
            onClick={fetchReport}
            disabled={loading}
            title="Refresh Data"
            className="p-2.5 bg-white hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 rounded-xl border border-slate-200 transition-all duration-300 shadow-2xs cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? "animate-spin text-emerald-600" : ""} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center border border-emerald-100 animate-pulse">
            <Loader2 className="animate-spin text-emerald-600" size={28} />
          </div>
          <p className="text-sm font-semibold text-slate-700">Synthesizing payroll financial data...</p>
        </div>
      ) : (
        <>
          {/* Main 3 Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

            {/* Total Cost Card */}
            <div
              onClick={() => handleCardClick("all", `Fiscal Year ${year} Full Payroll Ledger`)}
              className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-emerald-300 hover:-translate-y-1.5 transition-all duration-300 ease-out flex flex-col justify-between group cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300 shadow-2xs">
                    <Wallet size={22} />
                  </div>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-mono group-hover:bg-emerald-100">
                    Disbursed
                  </span>
                </div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Payroll Cost ({year})</p>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
                    ₹{((totalPayrollCost || 0) / 100000).toFixed(2)}
                  </h3>
                  <span className="text-xs text-slate-400 font-semibold">Lakhs</span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500 group-hover:text-emerald-600 transition-colors">
                <span>View disbursement list</span>
                <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Average Monthly Run Rate */}
            <div
              onClick={() => handleCardClick("all", "Monthly Run Rate Assessment")}
              className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-indigo-300 hover:-translate-y-1.5 transition-all duration-300 ease-out flex flex-col justify-between group cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300 shadow-2xs">
                    <TrendingUp size={22} />
                  </div>
                  <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100 font-mono group-hover:bg-indigo-100">
                    Avg / Mo
                  </span>
                </div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Avg Monthly Burn</p>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
                    ₹{((avgMonthlyBurn || 0) / 100000).toFixed(2)}
                  </h3>
                  <span className="text-xs text-slate-400 font-semibold">Lakhs</span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500 group-hover:text-indigo-600 transition-colors">
                <span>Inspect run rate</span>
                <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Total Processed Slips */}
            <div
              onClick={() => handleCardClick("all", "Salary Invoices & Slips Issued")}
              className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-cyan-300 hover:-translate-y-1.5 transition-all duration-300 ease-out flex flex-col justify-between group cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <div className="p-3 bg-cyan-50 text-cyan-600 rounded-2xl group-hover:bg-cyan-600 group-hover:text-white transition-colors duration-300 shadow-2xs">
                    <Banknote size={22} />
                  </div>
                  <span className="text-[11px] font-bold text-cyan-700 bg-cyan-50 px-2.5 py-0.5 rounded-full border border-cyan-200 font-mono group-hover:bg-cyan-100">
                    Slips
                  </span>
                </div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Salary Slips Processed</p>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
                    {processedPayrollsCount || totalPayrollCost > 0 ? (processedPayrollsCount || "Issued") : 0}
                  </h3>
                  <span className="text-xs text-slate-400 font-semibold">records</span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500 group-hover:text-cyan-600 transition-colors">
                <span>View slip history</span>
                <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

          </div>

          {/* Interactive Compliance / Budget Card */}
          <div
            onClick={() => handleCardClick("adherence", "Fiscal Year Payroll Run-rate Analysis", {
              totalPayrollCost,
              avgMonthlyBurn,
              activeMonthsCount,
              budgetUtilization
            })}
            className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-emerald-300 hover:-translate-y-1 transition-all duration-300 ease-out flex flex-col md:flex-row items-center justify-between gap-6 cursor-pointer group"
          >
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="p-3.5 bg-emerald-50 group-hover:bg-emerald-500 group-hover:text-white transition-colors border border-emerald-100 rounded-2xl text-emerald-600 font-bold shadow-2xs">
                <Percent size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-slate-900 text-sm sm:text-base group-hover:text-emerald-700 transition-colors">
                    Payroll Budget Utilization
                  </h4>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 hidden sm:inline-flex items-center gap-1">
                    Inspect <ArrowUpRight size={12} />
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">Estimated compensation disbursement execution vs planned fiscal targets.</p>
              </div>
            </div>

            <div className="flex items-center gap-4 w-full md:w-80 shrink-0">
              <div className="flex-1 h-3.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200 shadow-inner">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-1000 ease-out group-hover:brightness-110"
                  style={{ width: `${budgetUtilization}%` }}
                />
              </div>
              <span className="text-base font-black text-slate-900 font-mono min-w-[4ch] text-right">
                {budgetUtilization}%
              </span>
              <ChevronRight size={18} className="text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all hidden sm:block" />
            </div>
          </div>

          {/* Month-wise Cost Trend Breakdown Container */}
          <div className="bg-white p-5 sm:p-6 lg:p-7 rounded-3xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-5 sm:mb-6 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl">
                  <TrendingUp size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base sm:text-lg tracking-tight">
                    Month-wise Expenditure Trends
                  </h3>
                  <p className="text-xs text-slate-500">Click any month to inspect individual salary disbursements.</p>
                </div>
              </div>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full w-fit font-mono">
                {Object.keys(monthlyTotals).length} Months Logged
              </span>
            </div>

            {Object.keys(monthlyTotals).length === 0 ? (
              <div className="text-center py-12 px-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <Wallet className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">No payroll distribution entries found</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Payroll processed for fiscal {year} will automatically plot here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(monthlyTotals)
                  .sort((a, b) => Number(a[0]) - Number(b[0]))
                  .map(([monthNum, amount]) => {
                    const percentage = totalPayrollCost > 0 ? Math.round((amount / totalPayrollCost) * 100) : 0;
                    const mName = shortMonths[Number(monthNum) - 1] || `M${monthNum}`;

                    return (
                      <div
                        key={monthNum}
                        onClick={() => handleCardClick(monthNum, `${monthNames[Number(monthNum) - 1] || mName} Payroll Register`)}
                        className="group flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 rounded-2xl border border-slate-200/70 bg-slate-50/40 hover:bg-white hover:border-emerald-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                      >
                        {/* Month Label */}
                        <div className="w-full sm:w-44 flex items-center justify-between shrink-0">
                          <div className="flex items-center gap-2.5 truncate">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-600 group-hover:scale-125 transition-transform" />
                            <span className="font-bold text-xs sm:text-sm text-slate-800 group-hover:text-emerald-600 transition-colors truncate">
                              {monthNames[Number(monthNum) - 1] || `Month ${monthNum}`}
                            </span>
                          </div>
                          <span className="text-[11px] font-semibold text-slate-400 sm:hidden">
                            ₹{amount.toLocaleString()} ({percentage}%)
                          </span>
                        </div>

                        {/* Progress Bar Track */}
                        <div className="flex-1 h-3 bg-slate-200/80 rounded-full overflow-hidden p-0.5 shadow-inner">
                          <div
                            className="h-full bg-emerald-600 group-hover:bg-emerald-500 rounded-full transition-all duration-700 ease-out"
                            style={{ width: `${Math.max((amount / maxAmount) * 100, 5)}%` }}
                          />
                        </div>

                        {/* Amount Badge & Arrow */}
                        <div className="hidden sm:flex items-center justify-end gap-3 w-48 shrink-0">
                          <span className="text-xs font-bold text-slate-700 font-mono">
                            ₹{amount.toLocaleString()} <span className="text-slate-400 font-normal font-sans">({percentage}%)</span>
                          </span>
                          <div className="p-1 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all">
                            <ChevronRight size={16} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Professional Center-Screen Popup Modal */}
      {activeMetric && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setActiveMetric(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-xl w-full max-h-[85vh] flex flex-col overflow-hidden transform scale-100 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Top Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-xs">
                  {activeMetric.type === "adherence" ? <Activity size={22} /> : <CreditCard size={22} />}
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                    {activeMetric.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Fiscal {year} • <span className="font-bold text-emerald-600 font-mono">{drilldownLogs.length}</span> Records
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveMetric(null)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            {activeMetric.type === "adherence" ? (
              <div className="p-6 space-y-6 overflow-y-auto">
                <div className="p-5 bg-emerald-50/60 rounded-2xl border border-emerald-100 text-center">
                  <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Annual Budget Allocation</p>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <span className="text-4xl sm:text-5xl font-extrabold text-emerald-600 font-mono tracking-tight">
                      ₹{((totalPayrollCost || 0) / 100000).toFixed(2)}
                    </span>
                    <span className="text-sm font-bold text-emerald-700 self-end mb-1">Lakhs Total</span>
                  </div>
                  <p className="text-xs text-emerald-700 mt-1">
                    Disbursed across {activeMonthsCount} active financial monthly cycles.
                  </p>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Financial Indicators</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
                      <span className="text-[11px] text-slate-500 font-medium block">Average Monthly Burn</span>
                      <span className="text-base font-bold text-emerald-600 font-mono">₹{avgMonthlyBurn.toLocaleString()}</span>
                    </div>
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
                      <span className="text-[11px] text-slate-500 font-medium block">Active Cycle Periods</span>
                      <span className="text-base font-bold text-indigo-600 font-mono">{activeMonthsCount} Months</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Yearly Net Disbursed:</span>
                    <span className="font-bold text-slate-900 font-mono">₹{totalPayrollCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Highest Single Month Outflow:</span>
                    <span className="font-bold text-slate-900 font-mono">₹{maxAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="p-4 border-b border-slate-100 bg-white">
                  <div className="relative">
                    <Search size={15} className="absolute left-3.5 top-3 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search staff, designation, or employee ID..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition font-medium"
                    />
                  </div>
                </div>

                <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-2.5">
                  {drilldownLoading ? (
                    <div className="py-16 text-center flex flex-col items-center justify-center gap-2 text-slate-400">
                      <Loader2 className="animate-spin text-emerald-600" size={30} />
                      <p className="text-xs font-semibold">Pulling payroll salary logs...</p>
                    </div>
                  ) : visibleLogs.length === 0 ? (
                    <div className="text-center py-16 px-4">
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto text-slate-400 mb-2">
                        <User size={22} />
                      </div>
                      <p className="text-xs font-bold text-slate-700">No payroll entries found</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {searchFilter ? "No staff matches your search query." : "No explicit salary disbursements registered in this cycle."}
                      </p>
                    </div>
                  ) : (
                    visibleLogs.map((log) => {
                      const emp = log.employee || log.user || {};
                      const empName = emp.name || emp.fullName || log.employeeName || "Staff Member";
                      const empCode = emp.employeeId || emp.empId || emp._id?.slice(-6) || "—";
                      const designation = emp.designation || log.designation || "Personnel";
                      const netSalary = log.netSalary ?? log.netAmount ?? log.salary ?? log.amount ?? 0;
                      const payDate = log.paymentDate || log.disbursedAt || log.createdAt;
                      const dateStr = payDate ? new Date(payDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "Disbursed";

                      return (
                        <div
                          key={log._id || log.id || Math.random()}
                          className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-emerald-200 hover:shadow-xs transition-all duration-200 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center shrink-0 uppercase shadow-2xs">
                              {empName.slice(0, 2)}
                            </div>
                            <div className="truncate">
                              <p className="text-xs font-bold text-slate-900 truncate">{empName}</p>
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                ID: {empCode} • {designation}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-xs font-bold font-mono text-emerald-700 block">
                              ₹{Number(netSalary).toLocaleString()}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-400 block mt-0.5">
                              {dateStr}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}

            {/* Modal Bottom Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/60">
              <button
                onClick={() => setActiveMetric(null)}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}