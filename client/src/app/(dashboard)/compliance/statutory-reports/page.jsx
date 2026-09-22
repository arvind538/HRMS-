// src/app/(dashboard)/reports/statutory/page.jsx
"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Loader2,
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
  ShieldAlert,
  ChevronRight,
  ShieldCheck,
  Calendar,
  RefreshCw,
  ArrowUpRight,
  X,
  Search,
  Percent,
  Activity,
  Receipt,
  FileSpreadsheet
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";

const TYPE_LABELS = {
  pf: "Provident Fund (PF)",
  esi: "ESI Compliance",
  tds: "TDS Filings",
  "professional-tax": "Professional Tax",
  labour: "Labour Compliance"
};

export default function StatutoryReportsPage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  // Center Modal States
  const [activeMetric, setActiveMetric] = useState(null);
  const [drilldownLogs, setDrilldownLogs] = useState([]);
  const [searchFilter, setSearchFilter] = useState("");

  const fetchComplianceData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/compliance");
      const list = Array.isArray(data) ? data : data?.data || data?.records || [];
      setRecords(list);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load statutory compliance reports.");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchComplianceData();
  }, [fetchComplianceData]);

  // Safe KPI calculations
  const filed = records.filter((r) => (r.status || "").toLowerCase() === "filed").length;
  const pending = records.filter((r) => (r.status || "").toLowerCase() === "pending" && (!r.dueDate || new Date(r.dueDate) >= new Date())).length;
  const overdue = records.filter((r) => (r.status || "").toLowerCase() === "pending" && r.dueDate && new Date(r.dueDate) < new Date()).length;
  const totalAmount = records.reduce((sum, r) => sum + (r.totalAmount || r.amount || 0), 0);

  const complianceRate = records.length > 0 ? Math.round((filed / records.length) * 100) : 0;

  // Breakdown by Type
  const byType = useMemo(() => {
    return Object.keys(TYPE_LABELS).map((type) => {
      const items = records.filter((r) => (r.type || "").toLowerCase() === type.toLowerCase());
      return {
        type,
        label: TYPE_LABELS[type],
        count: items.length,
        filed: items.filter((r) => (r.status || "").toLowerCase() === "filed").length,
        amount: items.reduce((sum, r) => sum + (r.totalAmount || r.amount || 0), 0),
        items: items,
      };
    });
  }, [records]);

  const maxCount = Math.max(...byType.map((t) => t.count), 1);

  // Open Center-Screen Modal
  const handleCardClick = (metricType, metricTitle, customPayload = null) => {
    setActiveMetric({ type: metricType, title: metricTitle, payload: customPayload });
    setSearchFilter("");

    if (metricType === "adherence") {
      setDrilldownLogs([]);
      return;
    }

    let filtered = [];
    if (metricType === "filed") {
      filtered = records.filter((r) => (r.status || "").toLowerCase() === "filed");
    } else if (metricType === "pending") {
      filtered = records.filter((r) => (r.status || "").toLowerCase() === "pending" && (!r.dueDate || new Date(r.dueDate) >= new Date()));
    } else if (metricType === "overdue") {
      filtered = records.filter((r) => (r.status || "").toLowerCase() === "pending" && r.dueDate && new Date(r.dueDate) < new Date());
    } else if (metricType === "type") {
      filtered = customPayload?.items || [];
    } else {
      filtered = records;
    }

    setDrilldownLogs(filtered);
  };

  const visibleLogs = useMemo(() => {
    return drilldownLogs.filter((item) => {
      const q = searchFilter.toLowerCase().trim();
      if (!q) return true;
      const label = (TYPE_LABELS[item.type] || item.type || "").toLowerCase();
      const ref = (item.referenceNumber || item.challanNumber || item._id || "").toLowerCase();
      const month = (item.month || item.period || "").toLowerCase();
      const notes = (item.notes || item.remarks || "").toLowerCase();
      return label.includes(q) || ref.includes(q) || month.includes(q) || notes.includes(q);
    });
  }, [drilldownLogs, searchFilter]);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 px-3 sm:px-4 lg:px-6 py-4 font-sans text-slate-900 antialiased">

      {/* Header & Controls Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Statutory Reports & Analytics
            </h1>
            <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 font-mono">
              <ShieldCheck size={12} /> Compliance Central
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            PF, ESI, TDS filings, aur professional taxes ka compliance audit. Click any card to view detailed records.
          </p>
        </div>

        <button
          onClick={fetchComplianceData}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 font-semibold px-4 py-2.5 rounded-2xl border border-slate-200 shadow-2xs transition-all duration-200 active:scale-95 cursor-pointer w-full sm:w-auto text-xs"
        >
          <RefreshCw size={14} className={loading ? "animate-spin text-indigo-600" : ""} />
          <span>Refresh Data</span>
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center border border-indigo-100 animate-pulse">
            <Loader2 className="animate-spin text-indigo-600" size={28} />
          </div>
          <p className="text-sm font-semibold text-slate-700">Synthesizing compliance filings...</p>
        </div>
      ) : (
        <>
          {/* Main 3 Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

            {/* Filed Card */}
            <div
              onClick={() => handleCardClick("filed", "Filed Compliance Returns")}
              className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-emerald-300 hover:-translate-y-1.5 transition-all duration-300 ease-out flex flex-col justify-between group cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300 shadow-2xs">
                    <CheckCircle2 size={22} />
                  </div>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-mono group-hover:bg-emerald-100">
                    Compliant
                  </span>
                </div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Successfully Filed</p>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
                    {filed}
                  </h3>
                  <span className="text-xs text-slate-400 font-semibold">filings</span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500 group-hover:text-emerald-600 transition-colors">
                <span>Inspect completed submissions</span>
                <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Pending Card */}
            <div
              onClick={() => handleCardClick("pending", "Pending Statutory Filings")}
              className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-amber-300 hover:-translate-y-1.5 transition-all duration-300 ease-out flex flex-col justify-between group cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl group-hover:bg-amber-500 group-hover:text-white transition-colors duration-300 shadow-2xs">
                    <FileCheck size={22} />
                  </div>
                  <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 font-mono group-hover:bg-amber-100">
                    In Window
                  </span>
                </div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pending Filings</p>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
                    {pending}
                  </h3>
                  <span className="text-xs text-slate-400 font-semibold">due soon</span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500 group-hover:text-amber-600 transition-colors">
                <span>Review pending timeline</span>
                <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Overdue Card */}
            <div
              onClick={() => handleCardClick("overdue", "Overdue Compliance Filings")}
              className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-rose-300 hover:-translate-y-1.5 transition-all duration-300 ease-out flex flex-col justify-between group cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl group-hover:bg-rose-600 group-hover:text-white transition-colors duration-300 shadow-2xs">
                    <AlertTriangle size={22} />
                  </div>
                  <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200 font-mono group-hover:bg-rose-100">
                    Action Needed
                  </span>
                </div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Overdue Filings</p>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
                    {overdue}
                  </h3>
                  <span className="text-xs text-slate-400 font-semibold">missed</span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500 group-hover:text-rose-600 transition-colors">
                <span>Inspect overdue penalties</span>
                <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

          </div>

          {/* Interactive Compliance Rate Card */}
          <div
            onClick={() => handleCardClick("adherence", "Statutory Compliance Audit Analysis", {
              filed,
              pending,
              overdue,
              totalAmount,
              complianceRate
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
                    Statutory Filing Adherence Rate
                  </h4>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 hidden sm:inline-flex items-center gap-1">
                    Inspect <ArrowUpRight size={12} />
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">Ratio of timely filed challans across total scheduled returns. Click to view full audit.</p>
              </div>
            </div>

            <div className="flex items-center gap-4 w-full md:w-80 shrink-0">
              <div className="flex-1 h-3.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200 shadow-inner">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-1000 ease-out group-hover:brightness-110"
                  style={{ width: `${complianceRate}%` }}
                />
              </div>
              <span className="text-base font-black text-slate-900 font-mono min-w-[4ch] text-right">
                {complianceRate}%
              </span>
              <ChevronRight size={18} className="text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all hidden sm:block" />
            </div>
          </div>

          {/* Type-wise Compliance Breakdown Card */}
          <div className="bg-white p-5 sm:p-6 lg:p-7 rounded-3xl border border-slate-200/80 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-slate-100 mb-5 sm:mb-6">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
                  <BarChart3 size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base sm:text-lg tracking-tight">
                    Type-wise Compliance Breakdown
                  </h3>
                  <p className="text-xs text-slate-500">Click any compliance category to inspect challans and contribution logs.</p>
                </div>
              </div>
              <span className="text-xs sm:text-sm font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-xl w-fit font-mono">
                Total Contribution: ₹{totalAmount.toLocaleString()}
              </span>
            </div>

            {records.length === 0 ? (
              <div className="text-center py-12 px-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <ShieldAlert className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">No compliance records found in the system</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Scheduled filings and tax payments will plot here automatically.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {byType.map((t) => {
                  const percentage = totalAmount > 0 ? Math.round((t.amount / totalAmount) * 100) : 0;

                  return (
                    <div
                      key={t.type}
                      onClick={() => handleCardClick("type", `${t.label} Logs`, t)}
                      className="group flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 rounded-2xl border border-slate-200/70 bg-slate-50/40 hover:bg-white hover:border-indigo-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                    >
                      {/* Label */}
                      <div className="w-full sm:w-56 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2.5 truncate">
                          <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 group-hover:scale-125 transition-transform" />
                          <span className="font-bold text-xs sm:text-sm text-slate-800 group-hover:text-indigo-600 transition-colors truncate">
                            {t.label}
                          </span>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-400 sm:hidden">
                          {t.filed}/{t.count} filed
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="flex-1 h-3 bg-slate-200/80 rounded-full overflow-hidden p-0.5 shadow-inner">
                        <div
                          className="h-full bg-indigo-600 group-hover:bg-indigo-500 rounded-full transition-all duration-700 ease-out"
                          style={{ width: `${Math.max((t.count / maxCount) * 100, 5)}%` }}
                        />
                      </div>

                      {/* Stats & Arrow */}
                      <div className="hidden sm:flex items-center justify-end gap-3 w-56 shrink-0">
                        <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-lg font-mono">
                          {t.filed}/{t.count} filed
                        </span>
                        <span className="text-xs font-bold text-slate-800 font-mono w-24 text-right">
                          ₹{t.amount.toLocaleString()}
                        </span>
                        <div className="p-1 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all">
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
                <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-xs">
                  {activeMetric.type === "adherence" ? <Activity size={22} /> : <FileSpreadsheet size={22} />}
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                    {activeMetric.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Statutory Records • <span className="font-bold text-indigo-600 font-mono">{drilldownLogs.length}</span> Filings
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
                  <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Statutory Adherence Score</p>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <span className="text-4xl sm:text-5xl font-extrabold text-emerald-600 font-mono tracking-tight">
                      {complianceRate}%
                    </span>
                  </div>
                  <p className="text-xs text-emerald-700 mt-1">
                    {complianceRate >= 80 ? "Organization is in full legal and statutory compliance." : "Attention needed: High pending or overdue returns detected."}
                  </p>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Compliance Status Mix</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
                      <span className="text-[11px] text-slate-500 font-medium block">Filed</span>
                      <span className="text-lg font-bold text-emerald-600 font-mono">{filed}</span>
                    </div>
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
                      <span className="text-[11px] text-slate-500 font-medium block">Pending</span>
                      <span className="text-lg font-bold text-amber-600 font-mono">{pending}</span>
                    </div>
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
                      <span className="text-[11px] text-slate-500 font-medium block">Overdue</span>
                      <span className="text-lg font-bold text-rose-600 font-mono">{overdue}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Total Disbursed Contribution:</span>
                    <span className="font-bold text-slate-900 font-mono">₹{totalAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Active Compliance Channels:</span>
                    <span className="font-bold text-slate-900 font-mono">{Object.keys(TYPE_LABELS).length} Categories</span>
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
                      placeholder="Search by compliance type, challan, or reference..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-medium"
                    />
                  </div>
                </div>

                <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-2.5">
                  {visibleLogs.length === 0 ? (
                    <div className="text-center py-16 px-4">
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto text-slate-400 mb-2">
                        <Receipt size={22} />
                      </div>
                      <p className="text-xs font-bold text-slate-700">No compliance logs found</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {searchFilter ? "No filing matches your query." : "No explicit records found for this selection."}
                      </p>
                    </div>
                  ) : (
                    visibleLogs.map((item) => {
                      const typeLabel = TYPE_LABELS[item.type] || item.type?.toUpperCase() || "Statutory Return";
                      const amount = item.totalAmount || item.amount || 0;
                      const dueDate = item.dueDate ? new Date(item.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "N/A";
                      const isOverdue = (item.status || "").toLowerCase() === "pending" && item.dueDate && new Date(item.dueDate) < new Date();
                      const status = isOverdue ? "overdue" : (item.status || "pending").toLowerCase();

                      return (
                        <div
                          key={item._id || Math.random()}
                          className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-indigo-200 hover:shadow-xs transition-all duration-200 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0 uppercase shadow-2xs">
                              {typeLabel.slice(0, 2)}
                            </div>
                            <div className="truncate">
                              <p className="text-xs font-bold text-slate-900 truncate">{typeLabel}</p>
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                                <Calendar size={11} className="text-indigo-500" /> Due: {dueDate}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-xs font-bold font-mono text-slate-800 block">
                              ₹{amount.toLocaleString()}
                            </span>
                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider inline-block mt-1 border ${status === "filed"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : status === "overdue"
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                              }`}>
                              {status}
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