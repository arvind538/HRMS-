"use client";

import { useMemo, useState } from "react";
import { Award, Eye, Star, Trophy, Users } from "lucide-react";
import { ErrorBanner } from "@/components/payroll/ui";
import { PageHeader } from "@/components/payroll/common";
import AppraisalDetail from "@/components/performance/AppraisalDetail";
import { Bar, DataPanel, Person, Stars, Stats, Toolbar, selectCls, useApi } from "@/components/performance/pui";

export default function PerformanceRatingPage() {
  const [period, setPeriod] = useState("");
  const [search, setSearch] = useState("");
  const [viewing, setViewing] = useState(null);
  const { data, loading, refreshing, error, load } = useApi("/performance/ratings", period ? { period } : {});
  const d = data || { rows: [], distribution: [], byDepartment: [], periods: [], total: 0, average: 0 };

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return d.rows.filter((a) => !q || `${a.employee?.name || ""} ${a.employee?.employeeId || ""} ${a.employee?.department || ""}`.toLowerCase().includes(q));
  }, [d.rows, search]);

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 py-4 space-y-4 antialiased pb-16">
      <PageHeader icon={Trophy} title="Performance Ratings" subtitle="Final ratings, best first." onRefresh={() => load({ silent: true })} busy={loading || refreshing} />

      {!loading && !error && <Stats items={[["Average rating", d.total ? d.average.toFixed(1) : "—", Star, "indigo"], ["Rated reviews", d.total, Users, "emerald"], ["Outstanding (5★)", d.distribution[0]?.count || 0, Award, "violet"]]} />}

      {!loading && d.total > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <section className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-4 sm:p-5">
            <h2 className="text-sm font-bold text-slate-900 mb-3">Rating spread</h2>
            <ul className="space-y-2.5">
              {d.distribution.map((r) => (
                <li key={r.rating}>
                  <div className="flex items-center justify-between text-xs mb-1"><span className="inline-flex items-center gap-2 font-bold text-slate-700"><Stars value={r.rating} size={11} />{r.label}</span><span className="font-bold text-slate-800">{r.count} <span className="text-slate-400 font-semibold">({r.percent}%)</span></span></div>
                  <Bar value={r.percent} tone="bg-amber-400" />
                </li>
              ))}
            </ul>
          </section>
          <section className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-4 sm:p-5">
            <h2 className="text-sm font-bold text-slate-900 mb-3">By department</h2>
            <ul className="space-y-3">
              {d.byDepartment.slice(0, 6).map((x) => (
                <li key={x.name}>
                  <div className="flex items-center justify-between text-xs mb-1"><span className="font-bold text-slate-700 truncate">{x.name}</span><span className="text-slate-500 font-semibold shrink-0 ml-3">{x.average} ★ • {x.count}</span></div>
                  <Bar value={(x.average / 5) * 100} />
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      <Toolbar search={search} onSearch={setSearch} placeholder="Search employee or department">
        {d.periods.length > 0 && (
          <select value={period} onChange={(e) => setPeriod(e.target.value)} className={selectCls}>
            <option value="">All periods</option>
            {d.periods.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        )}
      </Toolbar>
      <ErrorBanner message={error} onRetry={() => load()} />

      <DataPanel
        loading={loading} rows={visible} icon={Trophy}
        empty={["No ratings yet", "Ratings appear after managers complete appraisals."]}
        onOpen={setViewing}
        menu={(a) => [{ label: "View review", icon: Eye, run: () => setViewing(a) }]}
        cols={[
          { h: "Employee", cell: (a) => <Person p={a.employee} /> },
          { h: "Designation", cell: (a) => a.employee?.designation || "—" },
          { h: "Period", cell: (a) => <span className="font-mono font-semibold text-slate-700">{a.reviewPeriod}</span> },
          { h: "Rating", cell: (a) => <span className="inline-flex items-center gap-2"><Stars value={a.rating} size={15} /><b className="font-mono text-slate-800">{a.rating}.0</b><span className="text-[11px] text-slate-400">{a.ratingLabel}</span></span> },
        ]}
        card={(a) => (
          <div className="space-y-2.5">
            <Person p={a.employee} sub={`${a.reviewPeriod} • ${a.employee?.designation || ""}`} />
            <div className="flex items-center gap-2"><Stars value={a.rating} size={15} /><b className="font-mono text-slate-800 text-sm">{a.rating}.0</b><span className="text-[11px] text-slate-400">{a.ratingLabel}</span></div>
          </div>
        )}
      />

      {viewing && <AppraisalDetail a={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}
