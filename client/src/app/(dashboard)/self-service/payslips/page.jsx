"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Loader2,
  FileText,
  Calendar,
  IndianRupee,
  Printer,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Building2,
  UserCheck,
  X,
  Sparkles,
  ShieldCheck,
  CreditCard,
  Download,
  Trash2
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Badge from "@/components/ui/Badge";
import { useAuth } from "@/context/AuthContext";

export default function MyPayslipsPage() {
  const { user } = useAuth();
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Robust employee ID resolver
  const employeeId = useMemo(() => {
    return (
      user?.employee?._id ||
      user?.employee?.id ||
      (typeof user?.employee === "string" ? user?.employee : null) ||
      user?._id ||
      user?.id ||
      null
    );
  }, [user]);

  // Deep schema unwrapper
  const extractList = useCallback((resData) => {
    if (!resData) return [];
    if (Array.isArray(resData)) return resData;
    if (Array.isArray(resData?.data)) return resData.data;
    if (Array.isArray(resData?.data?.payrolls)) return resData.data.payrolls;
    if (Array.isArray(resData?.data?.records)) return resData.data.records;
    if (Array.isArray(resData?.data?.docs)) return resData.data.docs;
    if (Array.isArray(resData?.payrolls)) return resData.payrolls;
    if (Array.isArray(resData?.records)) return resData.records;
    if (Array.isArray(resData?.docs)) return resData.docs;
    if (Array.isArray(resData?.result)) return resData.result;
    return [];
  }, []);

  const fetchPayslips = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      let records = [];

      // 1. Direct personal payroll endpoints
      const directEndpoints = [
        "/payroll/my-payrolls",
        "/payroll/my-slips",
        "/payroll/me",
        "/payrolls/me",
      ];

      for (const endpoint of directEndpoints) {
        try {
          const res = await api.get(endpoint);
          const parsed = extractList(res.data);
          if (parsed && parsed.length > 0) {
            records = parsed;
            break;
          }
        } catch {
          // Probe next
        }
      }

      // 2. Query with Employee / User ID
      if (records.length === 0 && employeeId) {
        const queryEndpoints = [
          { url: "/payroll", params: { employee: employeeId } },
          { url: "/payroll", params: { employeeId: employeeId } },
          { url: "/payroll", params: { user: employeeId } },
          { url: "/payrolls", params: { employee: employeeId } },
        ];

        for (const item of queryEndpoints) {
          try {
            const res = await api.get(item.url, { params: item.params });
            const parsed = extractList(res.data);
            if (parsed && parsed.length > 0) {
              records = parsed;
              break;
            }
          } catch {
            // Continue
          }
        }
      }

      // 3. Fallback for Admin / Superadmin accounts
      if (records.length === 0 && (user?.role === "admin" || user?.role === "superadmin")) {
        try {
          const res = await api.get("/payroll");
          const parsed = extractList(res.data);
          if (parsed && parsed.length > 0) {
            records = parsed;
          }
        } catch {
          // No-op
        }
      }

      setPayrolls(records);
    } catch (err) {
      console.error("Payslips load error:", err);
      toast.error("Failed to load payroll statements.");
      setPayrolls([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [employeeId, extractList, user?.role]);

  useEffect(() => {
    fetchPayslips();
  }, [fetchPayslips]);

  // Modal ESC listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setViewing(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Delete Payslip Handler
  const handleDelete = async (id, e) => {
    if (e) e.stopPropagation();

    if (!window.confirm("Are you sure you want to delete this payslip?")) {
      return;
    }

    setDeletingId(id);
    try {
      // Direct call to standard route
      const res = await api.delete(`/payroll/${id}`);

      toast.success(res.data?.message || "Payslip deleted successfully.");
      setPayrolls((prev) => prev.filter((item) => (item._id || item.id) !== id));

      if (viewing && (viewing._id === id || viewing.id === id)) {
        setViewing(null);
      }
    } catch (err) {
      console.error("Delete payslip error:", err);
      const errMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Delete route not available on server.";
      toast.error(errMsg);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading && !refreshing) {
    return (
      <div className="py-28 flex flex-col items-center justify-center gap-3 text-slate-400">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center animate-pulse">
          <Loader2 className="animate-spin text-indigo-600 h-7 w-7" />
        </div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Loading monthly salary statements...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-14 px-4 sm:px-6 font-sans antialiased text-slate-900 animate-in fade-in duration-200">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              My Payslips
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center gap-1 font-mono">
              <Sparkles size={12} className="text-indigo-600" /> Disbursed Records
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Review monthly compensations, deductions breakdown, and print formal payment vouchers.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button
            onClick={() => fetchPayslips(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-2xs transition active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin text-indigo-600" : ""} />
            <span>Sync Slips</span>
          </button>
          <div className="text-xs font-semibold text-slate-600 bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-200">
            Total Slips: <span className="text-indigo-600 font-bold">{payrolls.length}</span>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {payrolls.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-16 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-center mx-auto text-indigo-500">
            <FileText size={28} />
          </div>
          <div className="max-w-md mx-auto">
            <p className="text-base font-bold text-slate-800">No payslips available yet</p>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              When HR processes your monthly salary cycle and disburses payroll, your payslips will automatically appear here.
            </p>
          </div>
          <button
            onClick={() => fetchPayslips(true)}
            className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-xl transition cursor-pointer"
          >
            <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
            Check again
          </button>
        </div>
      ) : (
        /* Payslips Card Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {payrolls.map((p, idx) => {
            const slipId = p._id || p.id || idx;
            const periodMonth =
              typeof p.month === "number"
                ? monthNames[p.month - 1]
                : p.month || p.period || "Monthly Slip";
            const periodYear =
              p.year || new Date(p.paymentDate || p.createdAt || Date.now()).getFullYear();
            const netAmount = p.netSalary ?? p.amount ?? p.salary ?? 0;
            const isSelected = (viewing?._id || viewing?.id) === slipId;

            return (
              <div
                key={slipId}
                onClick={() => setViewing(p)}
                tabIndex={0}
                role="button"
                onKeyDown={(e) => e.key === "Enter" && setViewing(p)}
                className={`group relative bg-white p-6 rounded-3xl border transition-all duration-200 cursor-pointer flex flex-col justify-between outline-hidden
                  ${isSelected
                    ? "border-indigo-600 ring-2 ring-indigo-500/15 shadow-md bg-indigo-50/10"
                    : "border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-xl hover:shadow-indigo-500/5 hover:border-indigo-300 hover:-translate-y-1 active:scale-[0.99]"
                  }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold font-mono px-3 py-1 bg-slate-100 text-slate-700 rounded-xl group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                      {periodYear}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {/* Card Delete Button */}
                      <button
                        type="button"
                        onClick={(e) => handleDelete(slipId, e)}
                        disabled={deletingId === slipId}
                        title="Delete payslip"
                        className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-rose-50 border border-slate-100 hover:border-rose-200 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                      >
                        {deletingId === slipId ? (
                          <Loader2 size={14} className="animate-spin text-rose-600" />
                        ) : (
                          <Trash2 size={15} />
                        )}
                      </button>
                      <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-2xs">
                        <FileText size={15} />
                      </div>
                    </div>
                  </div>

                  <h3 className="font-bold text-slate-900 text-lg group-hover:text-indigo-600 transition-colors">
                    {periodMonth}
                  </h3>
                  <p className="text-2xl font-black text-indigo-600 mt-2 font-mono tracking-tight">
                    ₹{Number(netAmount).toLocaleString()}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5 uppercase tracking-wider font-semibold">
                    Net Take-Home Salary
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono uppercase">
                    <ShieldCheck size={12} className="text-emerald-600" /> {p.status || "Paid"}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 group-hover:translate-x-1 transition-transform">
                    Inspect Voucher <ChevronRight size={13} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Center Modal for Payslip Inspection */}
      {viewing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setViewing(null)}
        >
          <div
            className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Top Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shadow-2xs">
                  <IndianRupee size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Salary Statement Voucher</h2>
                  <p className="text-xs text-slate-400 font-mono">
                    Period: {typeof viewing.month === "number" ? monthNames[viewing.month - 1] : viewing.month || ""} {viewing.year || ""}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition cursor-pointer shadow-2xs"
                >
                  <Printer size={13} /> Print
                </button>
                <button
                  onClick={() => setViewing(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5">
              {/* Employee Summary Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    Employee Record
                  </span>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">
                    {viewing.employee?.name || viewing.employee?.fullName || user?.name || "Staff Member"}
                  </p>
                  <p className="text-xs text-slate-500 font-mono">
                    ID: {viewing.employee?.employeeId || viewing.employee?.code || "EMP-CURRENT"} •{" "}
                    {viewing.employee?.designation || viewing.employee?.role || "Staff"}
                  </p>
                </div>
                <div className="sm:text-right">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    Payment Status
                  </span>
                  <p className="text-xs font-bold text-emerald-600 mt-0.5 uppercase font-mono">
                    {viewing.status || "DISBURSED / PAID"}
                  </p>
                </div>
              </div>

              {/* Earnings & Deductions Comparison */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Earnings */}
                <div className="p-4.5 rounded-2xl bg-slate-50/60 border border-slate-200/70 space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700">
                    <TrendingUp size={15} />
                    <span>Earnings</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Basic Salary</span>
                      <span className="font-semibold text-slate-900 font-mono">
                        ₹{Number(viewing.basicSalary || viewing.grossSalary || 0).toLocaleString()}
                      </span>
                    </div>

                    {viewing.allowances && typeof viewing.allowances === "object" && (
                      Array.isArray(viewing.allowances) ? (
                        viewing.allowances.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-slate-600">
                            <span className="capitalize">{item.name || item.title || "Allowance"}</span>
                            <span className="font-semibold text-slate-900 font-mono">₹{Number(item.amount || 0).toLocaleString()}</span>
                          </div>
                        ))
                      ) : (
                        Object.entries(viewing.allowances).map(([k, v]) => (
                          <div key={k} className="flex justify-between text-slate-600">
                            <span className="capitalize">{k}</span>
                            <span className="font-semibold text-slate-900 font-mono">₹{Number(v).toLocaleString()}</span>
                          </div>
                        ))
                      )
                    )}

                    <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900">
                      <span>Gross Salary</span>
                      <span className="text-emerald-700 font-mono">
                        ₹{Number(viewing.grossSalary || viewing.netSalary || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Deductions */}
                <div className="p-4.5 rounded-2xl bg-slate-50/60 border border-slate-200/70 space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-rose-600">
                    <TrendingDown size={15} />
                    <span>Deductions</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    {viewing.deductions && typeof viewing.deductions === "object" && Object.keys(viewing.deductions).length > 0 ? (
                      Array.isArray(viewing.deductions) ? (
                        viewing.deductions.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-slate-600">
                            <span className="capitalize">{item.name || item.title || "Deduction"}</span>
                            <span className="font-semibold text-rose-600 font-mono">-₹{Number(item.amount || 0).toLocaleString()}</span>
                          </div>
                        ))
                      ) : (
                        Object.entries(viewing.deductions).map(([k, v]) => (
                          <div key={k} className="flex justify-between text-slate-600">
                            <span className="capitalize">{k}</span>
                            <span className="font-semibold text-rose-600 font-mono">-₹{Number(v).toLocaleString()}</span>
                          </div>
                        ))
                      )
                    ) : (
                      <p className="text-slate-400 italic py-2">No statutory deductions recorded.</p>
                    )}
                    <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900">
                      <span>Total Deductions</span>
                      <span className="text-rose-600 font-mono">
                        -₹{Number(viewing.totalDeductions || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Net Disbursed Card */}
              <div className="p-5 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs">
                    <CreditCard size={20} />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      Net Take-Home Pay
                    </span>
                    <p className="text-2xl font-black text-indigo-950 font-mono">
                      ₹{Number(viewing.netSalary ?? viewing.amount ?? 0).toLocaleString()}
                    </p>
                  </div>
                </div>
                {viewing.paymentDate && (
                  <span className="text-xs text-slate-500 font-mono">
                    Disbursed: {new Date(viewing.paymentDate).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>

            {/* Modal Bottom Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
              {/* Modal Delete Button */}
              <button
                type="button"
                onClick={(e) => handleDelete(viewing._id || viewing.id, e)}
                disabled={deletingId === (viewing._id || viewing.id)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors cursor-pointer"
              >
                {deletingId === (viewing._id || viewing.id) ? (
                  <Loader2 size={14} className="animate-spin text-rose-600" />
                ) : (
                  <Trash2 size={14} />
                )}
                Delete Statement
              </button>

              <button
                onClick={() => setViewing(null)}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer active:scale-95"
              >
                Close Statement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}