// src/app/(dashboard)/reports/payroll/page.jsx
"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Loader2,
  Wallet,
  TrendingUp,
  Calendar,
  RefreshCw,
  ChevronRight,
  X,
  Search,
  User,
  ShieldCheck,
  Percent,
  Activity,
  Banknote,
  CreditCard,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";

/* ------------------------------ helpers ------------------------------ */

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const shortMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const inr = (n) => Number(n || 0).toLocaleString("en-IN");
const lakhs = (n) => ((Number(n) || 0) / 100000).toFixed(2);

const isObjectId = (v) => typeof v === "string" && /^[a-f\d]{24}$/i.test(v);

const deptName = (emp) => {
  const d = emp?.department;
  if (!d) return "";
  if (typeof d === "string") return isObjectId(d) ? "" : d.trim();
  if (typeof d === "object") return String(d.name || d.title || d.departmentName || "").trim();
  return "";
};

// Backend ke alag-alag response shapes se employees ki list nikalta hai
const normalizeEmployees = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.employees)) return data.employees;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.employees)) return data.data.employees;
  return [];
};

const logMonth = (item) => {
  if (item.month) return Number(item.month);
  const d = new Date(item.disbursedAt || item.paymentDate || item.createdAt);
  return isNaN(d.getTime()) ? null : d.getMonth() + 1;
};

const TONES = {
  emerald: { box: "bg-emerald-600", hover: "hover:border-emerald-300" },
  indigo: { box: "bg-indigo-600", hover: "hover:border-indigo-300" },
  cyan: { box: "bg-cyan-600", hover: "hover:border-cyan-300" },
};

/* ------------------------- slim stat card ------------------------- */

function StatCard({ icon: Icon, prefix, value, unit, label, tone, onClick }) {
  const t = TONES[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group w-full text-left flex items-center gap-3 bg-white px-3.5 py-3 rounded-2xl border border-slate-200/80 shadow-sm ${t.hover} hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500/40`}
    >
      <div className={`w-10 h-10 shrink-0 rounded-xl ${t.box} text-white flex items-center justify-center shadow-sm`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xl font-extrabold leading-tight text-slate-900 font-mono truncate">
          {prefix}
          {value}
          {unit && <span className="ml-1 text-[11px] font-semibold text-slate-400 font-sans">{unit}</span>}
        </p>
        <p className="text-[11px] text-slate-500 font-medium truncate">{label}</p>
      </div>
      <ChevronRight
        size={16}
        className="shrink-0 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all"
      />
    </button>
  );
}

/* --------------------- animated modal (reusable) --------------------- */

function Modal({ open, onClose, children }) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const id = requestAnimationFrame(() =>
        requestAnimationFrame(() => setVisible(true))
      );
      return () => cancelAnimationFrame(id);
    }
    setVisible(false);
    const t = setTimeout(() => setMounted(false), 250);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!mounted) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [mounted, onClose]);

  if (!mounted) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}
      />
      <div
        className={`relative w-full sm:max-w-xl bg-white shadow-2xl rounded-t-3xl sm:rounded-3xl max-h-[88vh] flex flex-col overflow-hidden transition-all duration-300 ease-out ${visible
          ? "opacity-100 translate-y-0 sm:scale-100"
          : "opacity-0 translate-y-8 sm:translate-y-0 sm:scale-95"
          }`}
      >
        {children}
      </div>
    </div>
  );
}

/* ------------------------------- page -------------------------------- */

export default function PayrollReportsPage() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());

  // Employees lookup (payroll record me employee sirf ID reference ho to naam/ID yahin se milega)
  const [empMap, setEmpMap] = useState(null);

  // Modal states (activeMetric close ke baad bhi rakha hai taaki close animation me content na ude)
  const [modalOpen, setModalOpen] = useState(false);
  const [activeMetric, setActiveMetric] = useState(null);
  const [drilldownLogs, setDrilldownLogs] = useState([]);
  const [drilldownLoading, setDrilldownLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");

  const closeModal = useCallback(() => setModalOpen(false), []);

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
  const totalPayrollCost =
    report?.totalPayrollCost ?? report?.totalCost ?? report?.totalExpenditure ?? 0;
  const processedPayrollsCount =
    report?.processedCount ?? report?.totalPayrolls ?? report?.disbursedSalariesCount ?? 0;
  const embeddedCount = (report?.records || report?.payrolls || report?.disbursements || []).length;
  const slipsCount = processedPayrollsCount || embeddedCount || 0;

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
        if (monthNum) formatted[Number(monthNum)] = Number(amt) || 0;
      });
    }
    return formatted;
  }, [report]);

  const monthEntries = useMemo(
    () => Object.entries(monthlyTotals).sort((a, b) => Number(a[0]) - Number(b[0])),
    [monthlyTotals]
  );

  const activeMonthsCount = Object.values(monthlyTotals).filter((v) => v > 0).length || 1;
  const avgMonthlyBurn = Math.round(totalPayrollCost / activeMonthsCount);
  const maxAmount = Math.max(...Object.values(monthlyTotals), 1);

  // Backend budgetUtilization de to wahi; warna estimate (payroll chale hue mahine / 12)
  const budgetUtilization =
    report?.budgetUtilization ??
    (totalPayrollCost > 0
      ? Math.min(100, Math.round((totalPayrollCost / (avgMonthlyBurn * 12 || 1)) * 100))
      : 0);

  // Employees ko ek baar fetch karke map banata hai (_id aur employeeId dono se lookup)
  const ensureEmployees = useCallback(async () => {
    if (empMap) return;
    try {
      const { data } = await api.get("/employees");
      const map = {};
      normalizeEmployees(data).forEach((e) => {
        if (e._id) map[String(e._id)] = e;
        if (e.employeeId) map[String(e.employeeId)] = e;
        if (e.empId) map[String(e.empId)] = e;
      });
      setEmpMap(map);
    } catch {
      setEmpMap({}); // lookup fail ho to bhi payroll list dikhni chahiye
    }
  }, [empMap]);

  // Payroll record se employee ki poori details nikalta hai (populated object ya ID reference dono)
  const resolveEmployee = useCallback(
    (log) => {
      const raw = log.employee || log.user || null;
      const populated = raw && typeof raw === "object" ? raw : {};
      const refs = [
        typeof raw === "string" ? raw : null,
        populated._id,
        typeof log.employeeId === "string" ? log.employeeId : null,
        log.empId,
      ].filter(Boolean);

      let fromMap = null;
      for (const r of refs) {
        if (empMap?.[String(r)]) {
          fromMap = empMap[String(r)];
          break;
        }
      }
      const emp = { ...(fromMap || {}), ...populated };

      const code =
        emp.employeeId ||
        emp.empId ||
        emp.code ||
        (typeof log.employeeId === "string" && !isObjectId(log.employeeId) ? log.employeeId : "") ||
        "";

      return {
        name: emp.name || emp.fullName || emp.username || log.employeeName || "Staff Member",
        code: code || "—",
        designation: emp.designation || log.designation || emp.role || "Employee",
        department: deptName(emp) || deptName(log),
      };
    },
    [empMap]
  );

  // Card / row click -> open modal
  const handleCardClick = async (metricType, metricTitle) => {
    setActiveMetric({ type: metricType, title: metricTitle });
    setSearchFilter("");
    setModalOpen(true);

    if (metricType === "adherence") {
      setDrilldownLogs([]);
      return;
    }

    setDrilldownLoading(true);
    try {
      const matches = (item) => {
        if (metricType === "all") return true;
        return logMonth(item) === Number(metricType);
      };

      const embeddedLogs = report?.records || report?.payrolls || report?.disbursements || [];
      let filtered = embeddedLogs.length > 0 ? embeddedLogs.filter(matches) : [];

      if (filtered.length === 0) {
        const params = { year };
        if (metricType !== "all") params.month = metricType;

        const { data } = await api.get("/payroll", { params });
        const fetchedList = Array.isArray(data) ? data : data?.data || data?.payrolls || [];
        filtered = fetchedList.filter(matches);
      }

      setDrilldownLogs(filtered);
      await ensureEmployees();
    } catch {
      setDrilldownLogs([]);
    } finally {
      setDrilldownLoading(false);
    }
  };

  const visibleLogs = useMemo(() => {
    const q = searchFilter.toLowerCase().trim();
    if (!q) return drilldownLogs;
    return drilldownLogs.filter((log) => {
      const e = resolveEmployee(log);
      return (
        e.name.toLowerCase().includes(q) ||
        String(e.code).toLowerCase().includes(q) ||
        e.designation.toLowerCase().includes(q) ||
        e.department.toLowerCase().includes(q)
      );
    });
  }, [drilldownLogs, searchFilter, resolveEmployee]);

  const visibleTotal = useMemo(
    () =>
      visibleLogs.reduce(
        (sum, l) => sum + Number(l.netSalary ?? l.netAmount ?? l.salary ?? l.amount ?? 0),
        0
      ),
    [visibleLogs]
  );

  return (
    <div className="w-full max-w-7xl mx-auto space-y-3 sm:space-y-4 px-3 sm:px-4 lg:px-6 py-3 sm:py-4 font-sans text-slate-900 antialiased">
      {/* Header & year filter */}
      <div className="flex items-center justify-between gap-3 bg-white px-4 py-3 sm:px-5 sm:py-4 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-base sm:text-xl font-bold tracking-tight text-slate-900">
              Payroll Financial Reports
            </h1>
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 font-mono">
              <ShieldCheck size={11} /> Fiscal {year}
            </span>
          </div>
          <p className="hidden sm:block text-xs text-slate-500 mt-0.5">
            Yearly payroll disbursement, run rate aur monthly expenditure trends.
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
          <div className="hidden sm:flex items-center gap-1.5 pl-2 text-xs font-semibold text-slate-500">
            <Calendar size={14} className="text-emerald-600" /> Year:
          </div>

          <input
            type="number"
            value={year}
            min={2000}
            max={2100}
            aria-label="Year"
            onChange={(e) => {
              const v = Number(e.target.value);
              if (v >= 2000 && v <= 2100) setYear(v);
              else if (e.target.value === "") setYear(new Date().getFullYear());
            }}
            className="w-20 sm:w-24 px-2 py-1.5 bg-white hover:border-emerald-400 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-center font-mono"
          />

          <button
            onClick={fetchReport}
            disabled={loading}
            title="Refresh Data"
            className="p-2 bg-white hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 rounded-lg border border-slate-200 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-emerald-600" : ""} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[45vh] gap-3">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center border border-emerald-100">
            <Loader2 className="animate-spin text-emerald-600" size={28} />
          </div>
          <p className="text-sm font-semibold text-slate-700">Synthesizing payroll financial data...</p>
        </div>
      ) : (
        <>
          {/* Slim summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
            <StatCard
              icon={Wallet}
              tone="emerald"
              prefix="₹"
              value={lakhs(totalPayrollCost)}
              unit="Lakhs"
              label={`Total Payroll Cost (${year})`}
              onClick={() => handleCardClick("all", `Fiscal Year ${year} Full Payroll Ledger`)}
            />
            <StatCard
              icon={TrendingUp}
              tone="indigo"
              prefix="₹"
              value={lakhs(avgMonthlyBurn)}
              unit="Lakhs"
              label="Avg Monthly Burn"
              onClick={() => handleCardClick("all", "Monthly Run Rate Assessment")}
            />
            <StatCard
              icon={Banknote}
              tone="cyan"
              value={slipsCount > 0 ? slipsCount : totalPayrollCost > 0 ? "—" : 0}
              unit="records"
              label="Salary Slips Processed"
              onClick={() => handleCardClick("all", "Salary Invoices & Slips Issued")}
            />
          </div>

          {/* Budget utilization (slim) */}
          <button
            type="button"
            onClick={() => handleCardClick("adherence", "Fiscal Year Payroll Run-rate Analysis")}
            className="group w-full text-left bg-white px-3.5 py-3 sm:px-4 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-emerald-300 hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-200 flex flex-col md:flex-row md:items-center gap-3 md:gap-6 cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500/40"
          >
            <div className="flex items-center gap-3 min-w-0 md:flex-1">
              <div className="w-10 h-10 shrink-0 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                <Percent size={18} />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-slate-900 text-sm group-hover:text-emerald-700 transition-colors truncate">
                  Payroll Budget Utilization
                </h4>
                <p className="text-[11px] text-slate-500 truncate sm:whitespace-normal">
                  Planned fiscal target ke against estimated payroll execution. Detail ke liye click karein.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 md:w-80 shrink-0">
              <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${budgetUtilization}%` }}
                />
              </div>
              <span className="text-base font-black text-slate-900 font-mono min-w-[4ch] text-right">
                {budgetUtilization}%
              </span>
              <ChevronRight
                size={16}
                className="text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all"
              />
            </div>
          </button>

          {/* Month-wise expenditure */}
          <div className="bg-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-3 sm:mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
                  <TrendingUp size={18} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base tracking-tight truncate">
                    Month-wise Expenditure Trends
                  </h3>
                  <p className="text-[11px] text-slate-500 truncate">
                    Month par click karke salary disbursements dekhein.
                  </p>
                </div>
              </div>
              <span className="shrink-0 text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full font-mono">
                {monthEntries.length} Months
              </span>
            </div>

            {monthEntries.length === 0 ? (
              <div className="text-center py-10 px-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <Wallet className="w-9 h-9 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">No payroll distribution entries found</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Payroll processed for fiscal {year} will automatically plot here.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {monthEntries.map(([monthNum, amount]) => {
                  const percentage = totalPayrollCost > 0 ? Math.round((amount / totalPayrollCost) * 100) : 0;
                  const mFull = monthNames[Number(monthNum) - 1] || `Month ${monthNum}`;

                  return (
                    <button
                      type="button"
                      key={monthNum}
                      onClick={() => handleCardClick(monthNum, `${mFull} Payroll Register`)}
                      className="group w-full text-left flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-3 py-2.5 sm:px-4 rounded-xl border border-slate-200/70 bg-slate-50/40 hover:bg-white hover:border-emerald-300 hover:shadow-md transition-all duration-200 cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500/40"
                    >
                      {/* Month (+ amount on mobile) */}
                      <div className="flex items-center justify-between gap-2 sm:w-44 shrink-0 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2 h-2 rounded-full shrink-0 bg-emerald-600" />
                          <span className="font-bold text-xs sm:text-sm text-slate-800 group-hover:text-emerald-600 transition-colors truncate">
                            {mFull}
                          </span>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-500 sm:hidden shrink-0 font-mono">
                          ₹{inr(amount)} ({percentage}%)
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="flex-1 h-2 bg-slate-200/80 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-600 group-hover:bg-emerald-500 rounded-full transition-all duration-700 ease-out"
                          style={{ width: `${Math.max((amount / maxAmount) * 100, 4)}%` }}
                        />
                      </div>

                      {/* Amount (desktop) */}
                      <div className="hidden sm:flex items-center justify-end gap-2 w-48 shrink-0">
                        <span className="text-xs font-bold text-slate-700 font-mono">
                          ₹{inr(amount)}{" "}
                          <span className="text-slate-400 font-normal font-sans">({percentage}%)</span>
                        </span>
                        <ChevronRight
                          size={15}
                          className="text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all"
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Details popup (center on desktop, bottom sheet on mobile) */}
      <Modal open={modalOpen} onClose={closeModal}>
        {activeMetric && (
          <>
            {/* Header */}
            <div className="px-4 py-3.5 sm:px-5 sm:py-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/60">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 bg-emerald-600 text-white rounded-xl shrink-0">
                  {activeMetric.type === "adherence" ? <Activity size={18} /> : <CreditCard size={18} />}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate">
                    {activeMetric.title}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 truncate">
                    Fiscal {year}
                    {activeMetric.type !== "adherence" && !drilldownLoading && (
                      <>
                        {" "}•{" "}
                        <span className="font-bold text-emerald-600 font-mono">{visibleLogs.length}</span> Records
                        {" "}•{" "}
                        <span className="font-bold text-slate-700 font-mono">₹{inr(visibleTotal)}</span>
                      </>
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="shrink-0 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            {activeMetric.type === "adherence" ? (
              <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
                <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100 text-center">
                  <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                    Annual Payroll Disbursed
                  </p>
                  <div className="flex items-end justify-center gap-2 mt-1">
                    <span className="text-3xl sm:text-4xl font-extrabold text-emerald-600 font-mono tracking-tight">
                      ₹{lakhs(totalPayrollCost)}
                    </span>
                    <span className="text-sm font-bold text-emerald-700 mb-1">Lakhs</span>
                  </div>
                  <p className="text-xs text-emerald-700 mt-1">
                    {activeMonthsCount} active monthly cycles me disburse hua.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Financial Indicators
                  </h4>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                      <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium block">
                        Avg Monthly Burn
                      </span>
                      <span className="text-sm sm:text-base font-bold text-emerald-600 font-mono">
                        ₹{inr(avgMonthlyBurn)}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                      <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium block">
                        Active Cycles
                      </span>
                      <span className="text-sm sm:text-base font-bold text-indigo-600 font-mono">
                        {activeMonthsCount} Months
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Yearly Net Disbursed:</span>
                    <span className="font-bold text-slate-900 font-mono">₹{inr(totalPayrollCost)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Highest Single Month Outflow:</span>
                    <span className="font-bold text-slate-900 font-mono">
                      ₹{inr(Object.values(monthlyTotals).length ? maxAmount : 0)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="px-4 py-3 border-b border-slate-100 bg-white">
                  <div className="relative">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search name, employee ID, designation or department..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition font-medium"
                    />
                  </div>
                </div>

                <div className="px-3 sm:px-4 py-3 flex-1 overflow-y-auto space-y-2">
                  {drilldownLoading ? (
                    <div className="py-14 text-center flex flex-col items-center justify-center gap-2 text-slate-400">
                      <Loader2 className="animate-spin text-emerald-600" size={30} />
                      <p className="text-xs font-semibold">Pulling payroll salary logs...</p>
                    </div>
                  ) : visibleLogs.length === 0 ? (
                    <div className="text-center py-12 px-4">
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto text-slate-400 mb-2">
                        <User size={22} />
                      </div>
                      <p className="text-xs font-bold text-slate-700">No payroll entries found</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {searchFilter
                          ? "No staff matches your search query."
                          : "No explicit salary disbursements registered in this cycle."}
                      </p>
                    </div>
                  ) : (
                    visibleLogs.map((log, i) => {
                      const e = resolveEmployee(log);
                      const netSalary = log.netSalary ?? log.netAmount ?? log.salary ?? log.amount ?? 0;
                      const payDate = log.paymentDate || log.disbursedAt || log.createdAt;
                      const m = logMonth(log);
                      const dateStr = payDate
                        ? new Date(payDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                        : m
                          ? `${shortMonths[m - 1]} ${log.year || year}`
                          : "Disbursed";
                      const status = log.status ? String(log.status) : "";

                      return (
                        <div
                          key={log._id || log.id || i}
                          className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-emerald-200 transition-all duration-200 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center shrink-0 uppercase">
                              {String(e.name).slice(0, 2)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate">{e.name}</p>
                              <p className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">
                                <span className="font-bold text-slate-700">ID: {e.code}</span>
                                {" • "}
                                {e.designation}
                              </p>
                              {e.department && (
                                <p className="text-[10px] text-emerald-600 font-medium truncate">{e.department}</p>
                              )}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-xs font-bold font-mono text-emerald-700 block">
                              ₹{inr(netSalary)}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-400 block mt-0.5">
                              {dateStr}
                            </span>
                            {status && (
                              <span className="inline-block mt-0.5 px-1.5 py-px rounded-full text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                                {status}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}

            {/* Footer */}
            <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/60">
              <button
                onClick={closeModal}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer active:scale-[0.99]"
              >
                Close Details
              </button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}