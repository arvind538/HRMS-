"use client";

import { useMemo, useState } from "react";
import { Award, BarChart3, Building2, ChevronRight, ClipboardCheck, Download, Percent, Star, Target, TrendingUp } from "lucide-react";
import { ErrorBanner, dateText } from "@/components/payroll/ui";
import { EmptyBox, ListSkeleton, PageHeader, SearchBox, primaryBtn } from "@/components/payroll/common";
import { Box, FooterBar, ghostBtn } from "@/components/recruitment/rui";
import { APPR_ST, Bar, GOAL_ST, StChip, Stars, useApi, listOf } from "@/components/performance/pui";
import { downloadCsv } from "@/lib/csv";

const same = (a, b) => String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
const arr = (v) => (Array.isArray(v) ? v : []);
const obj = (v) => (v && typeof v === "object" && !Array.isArray(v) ? v : {});

const Panel = ({ icon: I, title, sub, children }) => (
  <section className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-4 sm:p-5 hover:border-indigo-200 hover:shadow-md transition-all duration-300">
    <div className="flex items-center gap-2.5 pb-3 mb-3 border-b border-slate-100">
      <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100"><I size={16} /></span>
      <div className="min-w-0"><h2 className="text-sm font-bold text-slate-900">{title}</h2>{sub && <p className="text-[11px] text-slate-400">{sub}</p>}</div>
    </div>
    {children}
  </section>
);

const TONE = {
  indigo: "bg-indigo-50 text-indigo-600 border-indigo-100 group-hover:bg-indigo-600",
  emerald: "bg-emerald-50 text-emerald-600 border-emerald-100 group-hover:bg-emerald-600",
  amber: "bg-amber-50 text-amber-600 border-amber-100 group-hover:bg-amber-500",
  rose: "bg-rose-50 text-rose-600 border-rose-100 group-hover:bg-rose-600",
};

function Tile({ icon: I, tone, label, value, hint, onClick }) {
  return (
    <button type="button" onClick={onClick} className="group text-left bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm hover:shadow-lg hover:border-indigo-300 hover:-translate-y-1 active:scale-[0.98] transition-all duration-200 cursor-pointer min-w-0">
      <div className="flex items-center justify-between">
        <span className={`w-10 h-10 rounded-xl border flex items-center justify-center group-hover:text-white transition-colors ${TONE[tone]}`}><I size={18} /></span>
        <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition" />
      </div>
      <p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 truncate">{label}</p>
      <p className="text-2xl font-extrabold font-mono text-slate-900 leading-tight">{value}</p>
      <p className="text-[11px] text-slate-500 truncate">{hint}</p>
    </button>
  );
}

export default function PerformanceReportsPage() {
  const sum = useApi("/performance/summary");
  const gl = useApi("/performance/goals");
  const ap = useApi("/performance/appraisals");

  /* every value is made safe first, so a missing key can never crash the page */
  const d = sum.data && typeof sum.data === "object" ? sum.data : null;
  const g = obj(d?.goals);
  const a = obj(d?.appraisals);
  const distribution = arr(a.distribution);
  const topPerformers = arr(d?.topPerformers);
  const departments = arr(d?.departments);

  const goals = useMemo(() => arr(listOf(gl.data)), [gl.data]);
  const appraisals = useMemo(() => arr(listOf(ap.data)), [ap.data]);
  const loading = sum.loading || gl.loading || ap.loading;
  const refreshing = sum.refreshing || gl.refreshing || ap.refreshing;
  const error = sum.error || gl.error || ap.error;
  const reload = () => { sum.load({ silent: true }); gl.load({ silent: true }); ap.load({ silent: true }); };

  const [view, setView] = useState(null); // { title, subtitle, rows, map }
  const [search, setSearch] = useState("");

  const goalRows = (list) => list.map((x) => ({ _id: x._id, emp: x.employee, title: x.title, sub: `${x.employee?.department || "—"} • due ${x.targetDate ? dateText(x.targetDate) : "—"}`, status: x.status, value: `${x.progress ?? 0}%` }));
  const apprRows = (list) => list.map((x) => ({ _id: x._id, emp: x.employee, title: `${x.reviewPeriod} appraisal`, sub: x.ratingLabel || "Not rated yet", status: x.status, value: x.rating ? `${x.rating}/5` : "—" }));

  const open = (title, subtitle, rows, map) => { setSearch(""); setView({ title, subtitle, rows, map }); };

  const apprRate = a.total ? Math.round(((a.completed || 0) / a.total) * 100) : 0;
  const spreadTotal = distribution.reduce((s, r) => s + (r?.count || 0), 0);
  const scope = d?.scope;

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return arr(view?.rows).filter((i) => !q || `${i.emp?.name || ""} ${i.emp?.employeeId || ""} ${i.title || ""}`.toLowerCase().includes(q));
  }, [view, search]);

  const exportView = () => {
    if (!view) return;
    const map = obj(view.map);
    downloadCsv(
      `${String(view.title).replace(/\s+/g, "-").toLowerCase()}.csv`,
      ["Employee", "Employee ID", "Department", "Item", "Status", "Result"],
      shown.map((i) => [i.emp?.name, i.emp?.employeeId, i.emp?.department, i.title, map[i.status]?.label || i.status, i.value])
    );
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 py-4 space-y-4 antialiased pb-16">
      <PageHeader
        icon={BarChart3}
        title="Performance Reports"
        subtitle={scope === "company" ? "Goals, ratings and departments of the whole company. Click any card to see the records." : scope === "team" ? "Your team's goals and ratings. Click any card to see the records." : "Your own goals and ratings."}
        onRefresh={reload}
        busy={loading || refreshing}
      />
      <ErrorBanner message={error} onRetry={reload} />

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden"><ListSkeleton /></div>
      ) : d ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Tile icon={Target} tone="indigo" label="Goal completion" value={`${g.completionRate || 0}%`} hint={`${g.completed || 0} of ${g.total || 0} goals`} onClick={() => open("Goals", `${goals.length} goals`, goalRows(goals), GOAL_ST)} />
            <Tile icon={Award} tone="amber" label="Average rating" value={a.averageRating ? Number(a.averageRating).toFixed(1) : "—"} hint="out of 5.0" onClick={() => open("Rated appraisals", "Completed reviews", apprRows(appraisals.filter((x) => x.rating)), APPR_ST)} />
            <Tile icon={ClipboardCheck} tone="emerald" label="Open appraisals" value={(a.pendingSelf || 0) + (a.pendingManager || 0)} hint={`${a.pendingSelf || 0} self, ${a.pendingManager || 0} manager`} onClick={() => open("Open appraisals", "Waiting for self or manager review", apprRows(appraisals.filter((x) => x.status !== "completed")), APPR_ST)} />
            <Tile icon={TrendingUp} tone="rose" label="Overdue goals" value={g.overdue || 0} hint="past the target date" onClick={() => open("Overdue goals", "Target date has passed", goalRows(goals.filter((x) => x.status === "overdue")), GOAL_ST)} />
          </div>

          <Panel icon={Percent} title="Completion at a glance" sub="How much of the work is finished">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><div className="flex justify-between text-xs font-bold text-slate-700 mb-1.5"><span>Goals completed</span><span className="font-mono">{g.completionRate || 0}%</span></div><Bar value={g.completionRate || 0} tone="bg-emerald-500" /></div>
              <div><div className="flex justify-between text-xs font-bold text-slate-700 mb-1.5"><span>Appraisals completed</span><span className="font-mono">{apprRate}%</span></div><Bar value={apprRate} tone="bg-indigo-500" /></div>
            </div>
          </Panel>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel icon={Star} title="Rating spread" sub={`${spreadTotal} rated reviews`}>
              {spreadTotal > 0 ? (
                <ul className="space-y-2.5">
                  {distribution.map((r) => (
                    <li key={r.rating}>
                      <div className="flex items-center justify-between text-xs mb-1"><span className="inline-flex items-center gap-2 font-bold text-slate-700"><Stars value={r.rating} size={11} />{r.label}</span><b className="text-slate-800">{r.count || 0}</b></div>
                      <Bar value={((r.count || 0) / spreadTotal) * 100} tone="bg-amber-400" />
                    </li>
                  ))}
                </ul>
              ) : <p className="py-6 text-center text-xs font-semibold text-slate-400">No completed appraisals yet.</p>}
            </Panel>

            <Panel icon={Award} title="Top performers" sub="Highest rated reviews">
              {topPerformers.length > 0 ? (
                <ul className="divide-y divide-slate-100">
                  {topPerformers.map((x) => (
                    <li key={x._id} className="py-2.5 flex items-center gap-3">
                      <div className="min-w-0 flex-1"><p className="text-xs font-bold text-slate-900 truncate">{x.employee?.name}</p><p className="text-[11px] text-slate-400 truncate">{x.employee?.department} • {x.reviewPeriod}</p></div>
                      <Stars value={x.rating} />
                    </li>
                  ))}
                </ul>
              ) : <p className="py-6 text-center text-xs font-semibold text-slate-400">No ratings yet.</p>}
            </Panel>
          </div>

          <Panel icon={Building2} title="Department-wise performance" sub="Click a department to see its goals">
            {departments.length === 0 ? (
              <EmptyBox icon={Building2} title="No department data" text="Goals appear here once they are assigned." />
            ) : (
              <div className="space-y-2.5">
                {departments.map((x) => (
                  <button
                    key={x.name}
                    type="button"
                    onClick={() => open(`${x.name} goals`, `${x.goalsCompleted || 0} of ${x.goals || 0} completed`, goalRows(goals.filter((y) => same(y.employee?.department, x.name) || (x.name === "Not set" && !y.employee?.department))), GOAL_ST)}
                    className="w-full group flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3.5 rounded-2xl border border-slate-200/70 bg-slate-50/40 hover:bg-white hover:border-indigo-300 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-200 cursor-pointer text-left"
                  >
                    <span className="sm:w-52 font-bold text-xs sm:text-sm text-slate-800 group-hover:text-indigo-600 transition-colors truncate">{x.name}</span>
                    <div className="flex-1"><Bar value={x.score || 0} /></div>
                    <span className="sm:w-56 text-xs font-bold text-slate-700 font-mono">{x.score || 0}% <span className="font-sans font-normal text-slate-400">({x.goalsCompleted || 0}/{x.goals || 0} goals{x.averageRating ? ` • ${x.averageRating}★` : ""})</span></span>
                    <ChevronRight size={16} className="hidden sm:block text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition" />
                  </button>
                ))}
              </div>
            )}
          </Panel>
        </>
      ) : !error ? (
        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm"><EmptyBox icon={BarChart3} title="No report data" text="Nothing came back from the server. Click refresh to try again." /></div>
      ) : null}

      {view && (
        <Box
          title={view.title}
          subtitle={view.subtitle}
          onClose={() => setView(null)}
          size="max-w-xl"
          footer={
            <FooterBar>
              <button type="button" disabled={!shown.length} onClick={exportView} className={`${primaryBtn} disabled:opacity-40`}><Download size={14} /> Export CSV</button>
              <button type="button" onClick={() => setView(null)} className={ghostBtn}>Close</button>
            </FooterBar>
          }
        >
          <SearchBox value={search} onChange={setSearch} placeholder="Search employee or item" />
          {shown.length === 0 ? (
            <p className="py-10 text-center text-xs font-semibold text-slate-400">No records found.</p>
          ) : (
            <ul className="space-y-2">
              {shown.map((i) => (
                <li key={i._id} className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-indigo-200 p-3 transition">
                  <div className="w-10 h-10 shrink-0 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center uppercase">{(i.emp?.name || "?").slice(0, 2)}</div>
                  <div className="min-w-0 flex-1"><p className="text-xs font-bold text-slate-900 truncate">{i.emp?.name || "Employee"}</p><p className="text-[11px] text-slate-600 truncate">{i.title}</p><p className="text-[10px] text-slate-400 truncate">{i.sub}</p></div>
                  <div className="text-right shrink-0 space-y-1"><p className="text-xs font-bold font-mono text-indigo-600">{i.value}</p><StChip map={obj(view.map)} v={i.status} /></div>
                </li>
              ))}
            </ul>
          )}
        </Box>
      )}
    </div>
  );
}