"use client";

import { useState } from "react";
import { ArrowUpRight, Banknote, CheckCircle2, Clock, Eye, Send, ThumbsUp, XCircle } from "lucide-react";
import { toast } from "react-toastify";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { ConfirmDialog, ErrorBanner, FieldError, Label, dateText, fieldBorder, inputClass } from "@/components/payroll/ui";
import { PageHeader, primaryBtn } from "@/components/payroll/common";
import { Box, Chip, FormFooter, ReasonModal, errMsg } from "@/components/recruitment/rui";
import AppraisalDetail from "@/components/performance/AppraisalDetail";
import { DEC_ST, DEC_TABS, DataPanel, Person, Stats, StChip, Toolbar, day, roleOf, tabsOf, useApi } from "@/components/performance/pui";

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

export default function IncrementPage() {
  const { user } = useAuth();
  const role = roleOf(user);
  const staff = ["admin", "hr"].includes(role);
  const admin = role === "admin";
  const { data, loading, refreshing, error, load } = useApi("/performance/increments");
  const rows = data || [];

  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [viewing, setViewing] = useState(null);
  const [approve, setApprove] = useState(null);
  const [reject, setReject] = useState(null);
  const [ask, setAsk] = useState(null);
  const [f, setF] = useState({ pct: "", date: "", note: "" });
  const [errs, setErrs] = useState({});
  const [saving, setSaving] = useState(false);

  const visible = rows.filter((a) => (tab === "all" || a.incrementStatus === tab) && (!search.trim() || `${a.employee?.name || ""} ${a.reviewPeriod}`.toLowerCase().includes(search.trim().toLowerCase())));
  const count = (s) => rows.filter((a) => a.incrementStatus === s).length;

  const canDecide = (a) => staff && !a.isMine && ["pending", "rejected"].includes(a.incrementStatus);
  const canReject = (a) => staff && !a.isMine && ["pending", "approved"].includes(a.incrementStatus);
  const canApply = (a) => admin && a.incrementStatus === "approved";

  const decide = async (a, body, okText) => {
    try {
      await api.put(`/performance/appraisals/${a._id}/increment`, body);
      toast.success(okText);
      setViewing(null);
      load({ silent: true });
    } catch (e) {
      toast.error(await errMsg(e, "Unable to save the decision."));
      throw e;
    }
  };

  const openApprove = (a) => {
    setF({ pct: String(a.incrementPercent || ""), date: day(a.incrementEffectiveDate) || day(new Date().toISOString()), note: "" });
    setErrs({});
    setApprove(a);
  };
  const submitApprove = async (e) => {
    e.preventDefault();
    if (saving) return;
    const n = Number(f.pct);
    const next = {};
    if (!Number.isFinite(n) || n <= 0 || n > 100) next.pct = "Enter a percent above 0, up to 100.";
    if (!f.date) next.date = "Select the date the increment starts.";
    setErrs(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      await decide(approve, { decision: "approved", incrementPercent: n, effectiveDate: f.date, note: f.note.trim() }, "Increment approved.");
      setApprove(null);
    } catch { /* the toast is already shown */ } finally { setSaving(false); }
  };

  const applyIt = (a) => setAsk({
    title: "Apply this increment to the salary?", label: "Apply to salary", danger: true,
    text: `${a.employee?.name}: salary will go up by ${a.incrementPercent}%. This changes the salary used in payroll and cannot be undone. Refresh draft payslips afterwards.`,
    run: async () => {
      try {
        await api.post(`/performance/appraisals/${a._id}/increment/apply`);
        toast.success("Salary updated.");
        setViewing(null);
        await load({ silent: true });
      } catch (e) {
        toast.error(await errMsg(e, "Unable to apply the increment."));
      }
    },
  });

  const menu = (a) => [
    { label: "View details", icon: Eye, run: () => setViewing(a) },
    { label: "Approve", icon: ThumbsUp, run: () => openApprove(a), hidden: !canDecide(a) },
    { label: "Reject", icon: XCircle, run: () => setReject(a), hidden: !canReject(a), danger: true },
    { label: "Apply to salary", icon: Send, run: () => applyIt(a), hidden: !canApply(a) },
  ];
  const pct = (a) => <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold font-mono"><ArrowUpRight size={13} />+{a.incrementPercent}%</span>;
  const salary = (a) => (a.incrementStatus === "applied" && a.incrementNewSalary ? <span className="text-xs font-semibold text-slate-700">{inr(a.incrementPrevSalary)} → <b>{inr(a.incrementNewSalary)}</b></span> : <span className="text-slate-300">—</span>);
  const cls = `${inputClass} border-slate-200 focus:border-indigo-500`;

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 py-4 space-y-4 antialiased pb-16">
      <PageHeader icon={Banknote} title="Increment" subtitle={staff ? "Managers recommend, HR approves, Admin applies to salary." : "Increments decided for you."} onRefresh={() => load({ silent: true })} busy={loading || refreshing} />

      {!loading && !error && <Stats items={[["To decide", count("pending"), Clock, "indigo"], ["Approved, not applied", count("approved"), CheckCircle2, "violet"], ["Applied", count("applied"), Banknote, "emerald"]]} />}

      <Toolbar search={search} onSearch={setSearch} placeholder="Search employee or period" tabs={tabsOf(rows, DEC_TABS, "incrementStatus")} tab={tab} onTab={setTab} />
      <ErrorBanner message={error} onRetry={() => load()} />

      <DataPanel
        loading={loading} rows={visible} icon={Banknote}
        empty={["No increments", staff ? "Recommendations appear after managers complete appraisals." : "Approved increments appear here."]}
        onOpen={setViewing} menu={menu}
        cols={[
          { h: "Employee", cell: (a) => <Person p={a.employee} /> },
          { h: "Period", cell: (a) => <span className="font-mono font-semibold text-slate-700">{a.reviewPeriod}</span> },
          { h: "Increment", cell: pct },
          { h: "Starts on", cell: (a) => (a.incrementEffectiveDate ? dateText(a.incrementEffectiveDate) : "—") },
          ...(staff ? [{ h: "Salary", cell: salary }] : []),
          { h: "Status", cell: (a) => <StChip map={DEC_ST} v={a.incrementStatus} /> },
        ]}
        card={(a) => (
          <div className="space-y-2.5">
            <Person p={a.employee} sub={`${a.reviewPeriod}${a.incrementEffectiveDate ? ` • from ${dateText(a.incrementEffectiveDate)}` : ""}`} />
            <div className="flex flex-wrap items-center gap-2"><StChip map={DEC_ST} v={a.incrementStatus} />{pct(a)}</div>
            {staff && a.incrementStatus === "applied" && salary(a)}
          </div>
        )}
      />

      {viewing && (
        <AppraisalDetail a={viewing} onClose={() => setViewing(null)}>
          {canDecide(viewing) && <button type="button" onClick={() => { const a = viewing; setViewing(null); openApprove(a); }} className={primaryBtn}><ThumbsUp size={14} /> Approve</button>}
          {canApply(viewing) && <button type="button" onClick={() => applyIt(viewing)} className={primaryBtn}><Send size={14} /> Apply to salary</button>}
          {canReject(viewing) && <button type="button" onClick={() => { setReject(viewing); setViewing(null); }} className="inline-flex items-center justify-center gap-2 px-5 py-3 sm:py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition cursor-pointer"><XCircle size={14} /> Reject</button>}
        </AppraisalDetail>
      )}

      {approve && (
        <Box title="Approve increment" subtitle={approve.employee?.name} onClose={() => setApprove(null)} onSubmit={submitApprove} locked={saving} size="max-w-md" footer={<FormFooter onCancel={() => setApprove(null)} busy={saving} label="Approve" />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Increment (%)</Label>
              <input type="number" min="0" max="100" step="0.5" value={f.pct} autoFocus onChange={(e) => { setF({ ...f, pct: e.target.value }); setErrs({ ...errs, pct: undefined }); }} className={`${inputClass} ${fieldBorder(errs.pct)}`} />
              <FieldError>{errs.pct}</FieldError>
            </div>
            <div>
              <Label>Starts on</Label>
              <input type="date" value={f.date} onChange={(e) => { setF({ ...f, date: e.target.value }); setErrs({ ...errs, date: undefined }); }} className={`${inputClass} cursor-pointer ${fieldBorder(errs.date)}`} />
              <FieldError>{errs.date}</FieldError>
            </div>
          </div>
          <div><Label>Note (optional)</Label><textarea rows={3} value={f.note} maxLength={300} onChange={(e) => setF({ ...f, note: e.target.value })} className={`${cls} resize-none`} /></div>
          <p className="text-[11px] text-slate-400">Approving does not change the salary. Admin applies it from this page on or after the start date.</p>
        </Box>
      )}

      {reject && <ReasonModal title="Reject increment" subtitle={reject.employee?.name} confirm="Reject" onClose={() => setReject(null)} onSubmit={(n) => decide(reject, { decision: "rejected", note: n }, "Increment rejected.")} />}
      {ask && <ConfirmDialog title={ask.title} text={ask.text} label={ask.label} danger={ask.danger} onConfirm={ask.run} onClose={() => setAsk(null)} />}
    </div>
  );
}
