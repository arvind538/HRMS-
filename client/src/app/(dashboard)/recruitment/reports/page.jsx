
"use client";

import { useCallback, useEffect, useState } from "react";
import { BarChart3, Briefcase, CalendarClock, FileCheck2, Users } from "lucide-react";
import api from "@/lib/api";
import { ErrorBanner, StatCard } from "@/components/payroll/ui";
import { ListSkeleton, PageHeader } from "@/components/payroll/common";
import { DOT, STAGE, errMsg } from "@/components/recruitment/rui";

export default function RecruitmentReportsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const res = await api.get("/recruitment/summary");
      setData(res.data);
    } catch (err) {
      setError(await errMsg(err, "Unable to load the recruitment report."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const c = data?.candidates || {};
  const total = c.total || 0;
  const pct = (n) => (total ? Math.round(((n || 0) / total) * 100) : 0);

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 py-4 space-y-4 antialiased pb-16">
      <PageHeader icon={BarChart3} title="Recruitment Reports" subtitle="A summary of the hiring funnel." onRefresh={() => load({ silent: true })} busy={loading || refreshing} />

      <ErrorBanner message={error} onRetry={() => load()} />

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden"><ListSkeleton /></div>
      ) : data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatCard icon={Briefcase} tone="indigo" label="Open positions" value={data.openPositions} />
            <StatCard icon={Users} tone="emerald" label="Total candidates" value={total} />
            <StatCard icon={CalendarClock} tone="violet" label="Interviews this week" value={data.upcomingInterviews} />
            <StatCard icon={FileCheck2} tone="indigo" label="Offers awaiting reply" value={data.pendingOffers} />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-4 sm:p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-sm font-bold text-slate-900">Candidates by stage</h2>
              <span className="text-xs font-semibold text-slate-400">Hired: {pct(c.hired)}% • Rejected: {pct(c.rejected)}%</span>
            </div>
            {total === 0 ? (
              <p className="py-8 text-center text-xs font-semibold text-slate-400">No candidates yet.</p>
            ) : (
              <ul className="space-y-3">
                {Object.entries(STAGE).map(([k, s]) => (
                  <li key={k} className="group">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="inline-flex items-center gap-2 font-bold text-slate-700"><span className={`w-2 h-2 rounded-full ${DOT[s.tone]}`} />{s.label}</span>
                      <span className="font-bold text-slate-800">{c[k] || 0} <span className="text-slate-400 font-semibold">({pct(c[k])}%)</span></span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className={`h-full rounded-full ${DOT[s.tone]} transition-all duration-700 group-hover:opacity-80`} style={{ width: `${pct(c[k])}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
