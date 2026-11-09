"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Download, ExternalLink, Eye, FileText, Filter, Loader2, RotateCcw, Search, Users } from "lucide-react";
import { toast } from "react-toastify";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { ErrorBanner, FieldError, Label, dateText, inputClass } from "@/components/payroll/ui";
import { EmptyBox, PageHeader, primaryBtn } from "@/components/payroll/common";
import { Box, Chip, FooterBar, Info, errMsg, ghostBtn } from "@/components/recruitment/rui";
import { APPR_ST, Bar, DEC_ST, DEC_TABS, DataList, GOAL_ST, Person, Stars, Stats, StChip, listOf, roleOf, useApi } from "@/components/performance/pui";
import { downloadCsv } from "@/lib/csv";

const MODULES = {
  goals: { label: "Goals report", map: GOAL_ST, link: "/performance/goals" },
  appraisals: { label: "Appraisals report", map: APPR_ST, link: "/performance/appraisals" },
  promotions: { label: "Promotions report", map: DEC_ST, link: "/performance/promotion", statuses: DEC_TABS },
  increments: { label: "Increments report", map: DEC_ST, link: "/performance/increment", statuses: DEC_TABS },
};
const blank = { reportType: "goals", department: "", designation: "", employee: "", status: "", period: "", startDate: "", endDate: "", q: "" };
const PAGE = 100;
const sel = `${inputClass} border-slate-200 focus:border-indigo-500 cursor-pointer`;

export default function CustomReportsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const uid = String(user?._id || user?.id || "");
  const senior = ["admin", "hr", "manager"].includes(roleOf(user));
  const storeKey = `customReport:${uid}`;

  const { data: deps } = useApi("/organization/departments");
  const { data: des } = useApi("/organization/designations");
  const { data: people } = useApi("/performance/people");
  const depList = useMemo(() => listOf(deps).filter((x) => x.status !== "inactive"), [deps]);
  const desList = useMemo(() => listOf(des).filter((x) => x.status !== "inactive"), [des]);
  const folks = people || [];

  const [f, setF] = useState(blank);
  const [errors, setErrors] = useState({});
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [ran, setRan] = useState(null); // the filters of the report on screen
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [show, setShow] = useState(PAGE);
  const [viewing, setViewing] = useState(null);

  /* bring back the last report after a refresh */
  useEffect(() => {
    if (!uid) return;
    try {
      const s = JSON.parse(sessionStorage.getItem(storeKey) || "null");
      if (s && Array.isArray(s.rows) && s.ran && MODULES[s.ran.reportType]) {
        setRows(s.rows); setSummary(s.summary || null); setRan(s.ran); setF({ ...blank, ...s.ran });
      }
    } catch { /* ignore a broken saved value */ }
  }, [uid, storeKey]);

  const set = (k, v) => {
    setF((p) => ({ ...p, [k]: v, ...(k === "reportType" ? { status: "", period: "" } : {}) }));
    setErrors((p) => (p[k] ? { ...p, [k]: undefined } : p));
  };

  const run = async (e) => {
    e?.preventDefault();
    if (loading) return;
    const next = {};
    if (f.startDate && f.endDate && f.endDate < f.startDate) next.endDate = "The end date cannot be before the start date.";
    if (f.period && !/^[A-Za-z0-9][A-Za-z0-9 -]{2,19}$/.test(f.period.trim())) next.period = "Use a period like 2026-H1.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    setError("");
    try {
      const params = Object.fromEntries(Object.entries(f).filter(([, v]) => String(v).trim() !== "").map(([k, v]) => [k, String(v).trim()]));
      const { data } = await api.get("/reports/custom", { params });
      const list = Array.isArray(data?.data) ? data.data : [];
      setRows(list); setSummary(data?.summary || null); setRan(f); setShow(PAGE);
      try { sessionStorage.setItem(storeKey, JSON.stringify({ rows: list, summary: data?.summary || null, ran: f })); } catch { /* storage full */ }
      if (!list.length) toast.info("No records match these filters.");
    } catch (err) {
      setError(await errMsg(err, "Unable to generate the report."));
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setF(blank); setErrors({}); setRows([]); setSummary(null); setRan(null); setError("");
    try { sessionStorage.removeItem(storeKey); } catch { /* ignore */ }
  };

  const mod = MODULES[ran?.reportType] || MODULES.goals;
  const statusList = Object.entries((MODULES[f.reportType].statuses || MODULES[f.reportType].map)).map(([k, s]) => [k, s.label]);
  const type = ran?.reportType;

  const exportCsv = () =>
    downloadCsv(`${type}-report-${new Date().toISOString().slice(0, 10)}.csv`, ["Employee", "Employee ID", "Department", "Designation", "Details", "Period", "Status", "Progress %", "Rating", "Increment %", "Date"],
      rows.map((r) => [r.employee?.name, r.employee?.employeeId, r.employee?.department, r.employee?.designation, r.title, r.period, mod.map[r.status]?.label || r.status, r.progress || "", r.rating || "", r.incrementPercent || "", r.date ? String(r.date).slice(0, 10) : ""]));

  const result = (r) => (r.type === "goals" ? <div className="w-32"><Bar value={r.progress} tone={r.status === "completed" ? "bg-emerald-500" : "bg-indigo-500"} /><p className="text-[11px] font-semibold text-slate-500 mt-1">{r.progress}%</p></div>
    : r.rating ? <Stars value={r.rating} /> : r.type === "increments" && r.incrementPercent ? <b className="font-mono text-emerald-700">+{r.incrementPercent}%</b> : <span className="text-slate-300">—</span>);

  const menu = (r) => [
    { label: "View details", icon: Eye, run: () => setViewing(r) },
    { label: "Open in module", icon: ExternalLink, run: () => router.push(MODULES[r.type].link) },
  ];

  const done = summary ? (summary.byStatus?.completed || 0) + (summary.byStatus?.applied || 0) : 0;
  const third = type === "goals" ? ["Average progress", `${summary?.averageProgress || 0}%`] : ["Average rating", summary?.averageRating ? summary.averageRating.toFixed(1) : "—"];
  const visible = rows.slice(0, show);

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 py-4 space-y-4 antialiased pb-16">
      <PageHeader icon={FileText} title="Custom Reports" subtitle="Pick the filters you need and build a report. You see only the data you are allowed to see." />

      <form onSubmit={run} className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-4 sm:p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-indigo-600"><Filter size={16} /> Report filters</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div><Label>Report</Label><select value={f.reportType} onChange={(e) => set("reportType", e.target.value)} className={sel}>{Object.entries(MODULES).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}</select></div>
          <div><Label>Status</Label><select value={f.status} onChange={(e) => set("status", e.target.value)} className={sel}><option value="">All statuses</option>{statusList.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          {f.reportType !== "goals" && (
            <div><Label>Review period</Label><input value={f.period} maxLength={20} onChange={(e) => set("period", e.target.value)} placeholder="e.g. 2026-H1" className={`${inputClass} font-mono uppercase border-slate-200 focus:border-indigo-500`} /><FieldError>{errors.period}</FieldError></div>
          )}
          {senior && (
            <>
              <div><Label>Department</Label><select value={f.department} onChange={(e) => set("department", e.target.value)} className={sel}><option value="">All departments</option>{depList.map((d) => <option key={d._id} value={d.name}>{d.name}</option>)}</select></div>
              <div><Label>Designation</Label><select value={f.designation} onChange={(e) => set("designation", e.target.value)} className={sel}><option value="">All designations</option>{desList.map((d) => <option key={d._id} value={d.title}>{d.title}</option>)}</select></div>
              {folks.length > 1 && <div><Label>Employee</Label><select value={f.employee} onChange={(e) => set("employee", e.target.value)} className={sel}><option value="">Everyone</option>{folks.map((p) => <option key={p._id} value={p._id}>{p.name}{p.employeeId ? ` (${p.employeeId})` : ""}</option>)}</select></div>}
            </>
          )}
          <div><Label>{f.reportType === "goals" ? "Target date from" : "Started from"}</Label><input type="date" value={f.startDate} onChange={(e) => set("startDate", e.target.value)} className={sel} /></div>
          <div><Label>{f.reportType === "goals" ? "Target date to" : "Started until"}</Label><input type="date" value={f.endDate} onChange={(e) => set("endDate", e.target.value)} className={sel} /><FieldError>{errors.endDate}</FieldError></div>
          <div><Label>Search</Label><input value={f.q} maxLength={60} onChange={(e) => set("q", e.target.value)} placeholder="Name, ID or title" className={`${inputClass} border-slate-200 focus:border-indigo-500`} /></div>
        </div>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
          <button type="button" onClick={reset} className={ghostBtn}><RotateCcw size={14} /> Reset</button>
          <button type="submit" disabled={loading} className={`${primaryBtn} disabled:opacity-60`}>{loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />} Generate report</button>
        </div>
      </form>

      <ErrorBanner message={error} onRetry={() => run()} />

      {summary && ran && <Stats items={[["Records", summary.total, Users, "indigo"], ["Completed / applied", done, CheckCircle2, "emerald"], [third[0], third[1], FileText, "violet"]]} />}

      <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900">{ran ? `${mod.label} (${rows.length})` : "Report results"}</h2>
          {rows.length > 0 && <button type="button" onClick={exportCsv} className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 active:scale-95 px-3 py-2 rounded-xl transition cursor-pointer"><Download size={13} /> Export CSV</button>}
        </div>

        {loading ? <div className="py-16 flex justify-center"><Loader2 className="animate-spin text-indigo-600" size={30} /></div>
          : !ran ? <EmptyBox icon={Filter} title="Build your report" text='Choose the filters above and click "Generate report".' />
            : rows.length === 0 ? <EmptyBox icon={FileText} title="No records found" text="Try fewer filters or a wider date range." />
              : (
                <>
                  <DataList
                    rows={visible} onOpen={setViewing} menu={menu}
                    cols={[
                      { h: "Employee", cell: (r) => <Person p={r.employee} /> },
                      { h: "Details", cell: (r) => <div className="min-w-0"><p className="font-semibold text-slate-800 truncate max-w-[220px]">{r.title}</p>{r.period && <p className="text-[11px] text-slate-400 font-mono">{r.period}</p>}</div> },
                      { h: "Department", cell: (r) => r.employee?.department || "—" },
                      { h: "Result", cell: result },
                      { h: "Status", cell: (r) => <StChip map={mod.map} v={r.status} /> },
                      { h: "Date", cell: (r) => (r.date ? dateText(r.date) : "—") },
                    ]}
                    card={(r) => (
                      <div className="space-y-2.5">
                        <Person p={r.employee} />
                        <div><p className="text-sm font-bold text-slate-900 break-words">{r.title}</p><p className="text-[11px] text-slate-400">{[r.period, r.date ? dateText(r.date) : ""].filter(Boolean).join(" • ")}</p></div>
                        <div className="flex flex-wrap items-center gap-2"><StChip map={mod.map} v={r.status} />{r.type === "goals" ? <Chip tone="violet">{r.progress}%</Chip> : r.rating ? <Stars value={r.rating} /> : null}</div>
                      </div>
                    )}
                  />
                  {rows.length > show && (
                    <div className="p-3 text-center border-t border-slate-100"><button type="button" onClick={() => setShow((n) => n + PAGE)} className={ghostBtn}>Show more ({rows.length - show} left)</button></div>
                  )}
                </>
              )}
      </div>

      {viewing && (
        <Box title={viewing.employee?.name || "Record"} subtitle={mod.label} onClose={() => setViewing(null)} footer={
          <FooterBar>
            <button type="button" onClick={() => router.push(MODULES[viewing.type].link)} className={primaryBtn}><ExternalLink size={14} /> Open in module</button>
            <button type="button" onClick={() => setViewing(null)} className={ghostBtn}>Close</button>
          </FooterBar>
        }>
          <div className="flex flex-wrap items-center gap-2"><StChip map={mod.map} v={viewing.status} />{viewing.rating ? <Stars value={viewing.rating} size={15} /> : null}</div>
          <Info rows={[["Employee ID", viewing.employee?.employeeId], ["Department", viewing.employee?.department], ["Designation", viewing.employee?.designation], ["Details", viewing.title], ["Period", viewing.period], ["Progress", viewing.type === "goals" ? `${viewing.progress}%` : ""], ["Increment", viewing.incrementPercent ? `${viewing.incrementPercent}%` : ""], ["Date", viewing.date ? dateText(viewing.date) : ""]]} />
          {viewing.note && <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/70 border border-slate-200 rounded-2xl p-3.5 whitespace-pre-line break-words">{viewing.note}</p>}
        </Box>
      )}
    </div>
  );
}
