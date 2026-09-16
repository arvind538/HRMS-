"use client";
import { useEffect, useState } from "react";
import { Loader2, Users, UserCheck } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";

export default function RecruitmentReportsPage() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/reports/recruitment")
      .then(({ data }) => setReport(data))
      .catch((err) => toast.error(err.response?.data?.message || "Failed to load recruitment report."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="py-16 text-center"><Loader2 className="animate-spin mx-auto text-indigo-600" /></div>;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-12">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Recruitment Reports</h1>
        <p className="text-xs text-slate-500 mt-0.5">Summary of the active hiring funnel</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center gap-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 hover:border-indigo-300 cursor-pointer">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><Users size={20} /></div>
          <div>
            <p className="text-xs text-slate-400 uppercase font-semibold">Total Candidates</p>
            <h3 className="text-2xl font-bold text-slate-900">{report?.totalCandidates || 0}</h3>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center gap-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 hover:border-emerald-300 cursor-pointer">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><UserCheck size={20} /></div>
          <div>
            <p className="text-xs text-slate-400 uppercase font-semibold">Hired</p>
            <h3 className="text-2xl font-bold text-slate-900">{report?.hired || 0}</h3>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <h3 className="font-semibold text-slate-800 mb-4 text-sm">Status Breakdown</h3>
        <div className="space-y-2.5">
          {Object.entries(report?.byStatus || {}).map(([status, count]) => (
            <div
              key={status}
              className="flex items-center justify-between text-sm p-3 rounded-xl bg-slate-50/60 border border-slate-100 hover:bg-indigo-50/40 hover:border-indigo-200 transition-all duration-200"
            >
              <span className="capitalize font-medium text-slate-600">{status}</span>
              <span className="font-bold text-slate-800">{count}</span>
            </div>
          ))}
          {(!report?.byStatus || Object.keys(report.byStatus).length === 0) && (
            <p className="text-xs text-slate-400 italic py-2 text-center">No status metrics available.</p>
          )}
        </div>
      </div>
    </div>
  );
}