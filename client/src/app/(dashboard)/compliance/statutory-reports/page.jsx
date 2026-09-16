"use client";
import { useEffect, useState } from "react";
import { Loader2, FileCheck, CheckCircle2, AlertTriangle, BarChart3, ShieldAlert } from "lucide-react";
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

  useEffect(() => {
    api.get("/compliance")
      .then(({ data }) => setRecords(Array.isArray(data) ? data : []))
      .catch((err) => toast.error(err.response?.data?.message || "Failed to load statutory compliance reports."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] w-full">
        <Loader2 className="animate-spin text-indigo-600 w-8 h-8" />
      </div>
    );
  }

  const filed = records.filter((r) => r.status === "filed").length;
  const pending = records.filter((r) => r.status === "pending" && new Date(r.dueDate) >= new Date()).length;
  const overdue = records.filter((r) => r.status === "pending" && new Date(r.dueDate) < new Date()).length;
  const totalAmount = records.reduce((sum, r) => sum + (r.totalAmount || 0), 0);

  const byType = Object.keys(TYPE_LABELS).map((type) => {
    const items = records.filter((r) => r.type === type);
    return {
      type,
      label: TYPE_LABELS[type],
      count: items.length,
      filed: items.filter((r) => r.status === "filed").length,
      amount: items.reduce((sum, r) => sum + (r.totalAmount || 0), 0),
    };
  });
  const maxCount = Math.max(...byType.map((t) => t.count), 1);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

      {/* Header Section */}
      <div className="border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl shadow-inner">
            <BarChart3 size={24} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Statutory Reports & Analytics
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Comprehensive combined summary and tracking metrics for all organization compliance types.
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">

        {/* Filed Card */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 flex items-center gap-4 group">
          <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-xl transition-transform duration-300 group-hover:scale-110">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Successfully Filed</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{filed}</h3>
          </div>
        </div>

        {/* Pending Card */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 flex items-center gap-4 group">
          <div className="p-3.5 bg-amber-50 text-amber-600 rounded-xl transition-transform duration-300 group-hover:scale-110">
            <FileCheck size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Filings</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{pending}</h3>
          </div>
        </div>

        {/* Overdue Card */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 flex items-center gap-4 group">
          <div className="p-3.5 bg-rose-50 text-rose-600 rounded-xl transition-transform duration-300 group-hover:scale-110">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Overdue Filings</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{overdue}</h3>
          </div>
        </div>

      </div>

      {/* Type-wise Breakdown Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 p-5 sm:p-8 space-y-6">

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
            Type-wise Compliance Breakdown
          </h3>
          <span className="text-xs sm:text-sm font-semibold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg w-fit">
            Total Contribution: ₹{totalAmount.toLocaleString()}
          </span>
        </div>

        {records.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <ShieldAlert size={36} className="mx-auto text-slate-300" />
            <p className="text-sm font-medium text-slate-500">No compliance records found in the system.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {byType.map((t) => (
              <div key={t.type} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl transition-colors hover:bg-slate-50/80">

                {/* Label */}
                <span className="w-full sm:w-48 text-sm font-semibold text-slate-700">
                  {t.label}
                </span>

                {/* Progress Bar */}
                <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-500"
                    style={{ width: `${(t.count / maxCount) * 100}%` }}
                  />
                </div>

                {/* Metrics Stats */}
                <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto">
                  <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                    {t.filed}/{t.count} filed
                  </span>
                  <span className="text-sm font-bold text-slate-800 w-28 text-right">
                    ₹{t.amount.toLocaleString()}
                  </span>
                </div>

              </div>
            ))}
          </div>
        )}

      </div>

    </div>
  );
}