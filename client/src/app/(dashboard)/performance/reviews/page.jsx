"use client";

import { useMemo, useState } from "react";
import { Eye, FileText, RotateCcw, Star } from "lucide-react";
import { toast } from "react-toastify";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { ConfirmDialog, ErrorBanner, dateText } from "@/components/payroll/ui";
import { PageHeader, primaryBtn } from "@/components/payroll/common";
import { Chip, errMsg } from "@/components/recruitment/rui";
import AppraisalDetail from "@/components/performance/AppraisalDetail";
import { APPR_ST, DEC_ST, DataPanel, Person, Stars, Stats, StChip, Toolbar, roleOf, selectCls, tabsOf, useApi } from "@/components/performance/pui";
import { CheckCircle2, ClipboardCheck } from "lucide-react";

export default function PerformanceReviewsPage() {
  const { user } = useAuth();
  const staff = ["admin", "hr"].includes(roleOf(user));
  const { data, loading, refreshing, error, load } = useApi("/performance/appraisals");
  const rows = data || [];

  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("completed");
  const [period, setPeriod] = useState("ALL");
  const [viewing, setViewing] = useState(null);
  const [ask, setAsk] = useState(null);

  const periods = useMemo(() => [...new Set(rows.map((a) => a.reviewPeriod))].sort().reverse(), [rows]);
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((a) => (tab === "all" || a.status === tab) && (period === "ALL" || a.reviewPeriod === period) && (!q || `${a.employee?.name || ""} ${a.employee?.employeeId || ""}`.toLowerCase().includes(q)));
  }, [rows, tab, period, search]);

  const rated = rows.filter((a) => a.rating);
  const avg = rated.length ? (rated.reduce((s, a) => s + a.rating, 0) / rated.length).toFixed(1) : "—";

  const reopen = (a) => setAsk({
    title: "Reopen this appraisal?", text: `${a.employee?.name} • ${a.reviewPeriod}. It goes back to the manager for changes.`, label: "Reopen",
    run: async () => {
      try {
        await api.put(`/performance/appraisals/${a._id}/reopen`);
        toast.success("Appraisal reopened.");
        setViewing(null);
        await load({ silent: true });
      } catch (err) {
        toast.error(await errMsg(err, "Unable to reopen."));
      }
    },
  });

  const menu = (a) => [
    { label: "View review", icon: Eye, run: () => setViewing(a) },
    { label: "Reopen", icon: RotateCcw, run: () => reopen(a), hidden: !staff || a.status !== "completed" },
  ];
  const marks = (a) => (
    <div className="flex flex-wrap gap-1.5">
      {a.promotionStatus && a.promotionStatus !== "none" && <Chip tone={DEC_ST[a.promotionStatus].tone}>Promotion: {DEC_ST[a.promotionStatus].label}</Chip>}
      {a.incrementStatus && a.incrementStatus !== "none" && <Chip tone={DEC_ST[a.incrementStatus].tone}>Increment: {DEC_ST[a.incrementStatus].label}</Chip>}
    </div>
  );

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 py-4 space-y-4 antialiased pb-16">
      <PageHeader icon={FileText} title="Performance Reviews" subtitle="All appraisals with their feedback." onRefresh={() => load({ silent: true })} busy={loading || refreshing} />

      {!loading && !error && <Stats items={[["Reviews", rows.length, FileText, "indigo"], ["Completed", rows.filter((a) => a.status === "completed").length, CheckCircle2, "emerald"], ["Average rating", avg, Star, "violet"]]} />}

      <Toolbar search={search} onSearch={setSearch} placeholder="Search employee" tabs={tabsOf(rows, APPR_ST, "status")} tab={tab} onTab={setTab}>
        {periods.length > 1 && (
          <select value={period} onChange={(e) => setPeriod(e.target.value)} className={selectCls}>
            <option value="ALL">All periods</option>
            {periods.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        )}
      </Toolbar>
      <ErrorBanner message={error} onRetry={() => load()} />

      <DataPanel
        loading={loading} rows={visible} icon={ClipboardCheck}
        empty={["No reviews here", "Reviews appear once appraisal cycles start."]}
        onOpen={setViewing} menu={menu}
        cols={[
          { h: "Employee", cell: (a) => <Person p={a.employee} /> },
          { h: "Period", cell: (a) => <span className="font-mono font-semibold text-slate-700">{a.reviewPeriod}</span> },
          { h: "Rating", cell: (a) => (a.rating ? <span className="inline-flex items-center gap-2"><Stars value={a.rating} /><span className="text-[11px] font-semibold text-slate-500">{a.ratingLabel}</span></span> : <span className="text-slate-300">—</span>) },
          { h: "Recommendations", cell: (a) => marks(a) },
          { h: "Completed", cell: (a) => (a.completedAt ? dateText(a.completedAt) : "—") },
          { h: "Status", cell: (a) => <StChip map={APPR_ST} v={a.status} /> },
        ]}
        card={(a) => (
          <div className="space-y-2.5">
            <Person p={a.employee} sub={a.reviewPeriod} />
            <div className="flex flex-wrap items-center gap-2"><StChip map={APPR_ST} v={a.status} />{a.rating ? <Stars value={a.rating} /> : null}</div>
            {marks(a)}
          </div>
        )}
      />

      {viewing && <AppraisalDetail a={viewing} onClose={() => setViewing(null)} />}
      {ask && <ConfirmDialog title={ask.title} text={ask.text} label={ask.label} onConfirm={ask.run} onClose={() => setAsk(null)} />}
    </div>
  );
}
