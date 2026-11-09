"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Award, CheckCircle2, Clock, Eye, Send, ThumbsUp, XCircle } from "lucide-react";
import { toast } from "react-toastify";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { ConfirmDialog, ErrorBanner, FieldError, Label, dateText, fieldBorder, inputClass } from "@/components/payroll/ui";
import { PageHeader, primaryBtn } from "@/components/payroll/common";
import { Box, Chip, FooterBar, FormFooter, ReasonModal, errMsg, ghostBtn } from "@/components/recruitment/rui";
import AppraisalDetail from "@/components/performance/AppraisalDetail";
import { DEC_ST, DEC_TABS, DataPanel, Person, Stars, Stats, StChip, Toolbar, listOf, roleOf, tabsOf, useApi } from "@/components/performance/pui";

export default function PromotionPage() {
  const { user } = useAuth();
  const staff = ["admin", "hr"].includes(roleOf(user));
  const { data, loading, refreshing, error, load } = useApi("/performance/promotions");
  const { data: des } = useApi("/organization/designations");
  const titles = useMemo(() => listOf(des).filter((d) => d.status !== "inactive").map((d) => d.title), [des]);
  const rows = data || [];

  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [viewing, setViewing] = useState(null);
  const [approve, setApprove] = useState(null);
  const [reject, setReject] = useState(null);
  const [ask, setAsk] = useState(null);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  const visible = rows.filter((a) => (tab === "all" || a.promotionStatus === tab) && (!search.trim() || `${a.employee?.name || ""} ${a.proposedDesignation || ""}`.toLowerCase().includes(search.trim().toLowerCase())));
  const count = (s) => rows.filter((a) => a.promotionStatus === s).length;

  const canDecide = (a) => staff && !a.isMine && ["pending", "rejected"].includes(a.promotionStatus);
  const canReject = (a) => staff && !a.isMine && ["pending", "approved"].includes(a.promotionStatus);
  const canApply = (a) => staff && a.promotionStatus === "approved";

  const decide = async (a, body, okText) => {
    try {
      await api.put(`/performance/appraisals/${a._id}/promotion`, body);
      toast.success(okText);
      setViewing(null);
      load({ silent: true });
    } catch (e) {
      toast.error(await errMsg(e, "Unable to save the decision."));
      throw e;
    }
  };

  const openApprove = (a) => {
    setTitle(a.proposedDesignation || "");
    setNote("");
    setErr("");
    setApprove(a);
  };
  const submitApprove = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (title.trim().length < 2) return setErr("Please enter the new designation.");
    setSaving(true);
    try {
      await decide(approve, { decision: "approved", newDesignation: title.trim(), note: note.trim() }, "Promotion approved.");
      setApprove(null);
    } catch { /* the toast is already shown */ } finally { setSaving(false); }
  };

  const applyIt = (a) => setAsk({
    title: "Apply this promotion?", label: "Apply now",
    text: `${a.employee?.name}'s designation will change to ${a.proposedDesignation}. This updates the employee record.`,
    run: async () => {
      try {
        await api.post(`/performance/appraisals/${a._id}/promotion/apply`);
        toast.success("Designation updated.");
        setViewing(null);
        await load({ silent: true });
      } catch (e) {
        toast.error(await errMsg(e, "Unable to apply the promotion."));
      }
    },
  });

  const menu = (a) => [
    { label: "View details", icon: Eye, run: () => setViewing(a) },
    { label: "Approve", icon: ThumbsUp, run: () => openApprove(a), hidden: !canDecide(a) },
    { label: "Reject", icon: XCircle, run: () => setReject(a), hidden: !canReject(a), danger: true },
    { label: "Apply to employee", icon: Send, run: () => applyIt(a), hidden: !canApply(a) },
  ];
  const move = (a) => (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
      <span className="text-slate-400">{a.promotionFrom || a.employee?.designation || "—"}</span><ArrowRight size={12} className="text-slate-300" />{a.proposedDesignation || "—"}
    </span>
  );

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 py-4 space-y-4 antialiased pb-16">
      <PageHeader icon={Award} title="Promotion" subtitle={staff ? "Managers recommend, HR decides." : "Promotions decided for you."} onRefresh={() => load({ silent: true })} busy={loading || refreshing} />

      {!loading && !error && <Stats items={[["To decide", count("pending"), Clock, "indigo"], ["Approved", count("approved"), CheckCircle2, "violet"], ["Applied", count("applied"), Award, "emerald"]]} />}

      <Toolbar search={search} onSearch={setSearch} placeholder="Search employee or designation" tabs={tabsOf(rows, DEC_TABS, "promotionStatus")} tab={tab} onTab={setTab} />
      <ErrorBanner message={error} onRetry={() => load()} />

      <DataPanel
        loading={loading} rows={visible} icon={Award}
        empty={["No promotions", staff ? "Recommendations appear after managers complete appraisals." : "Approved promotions appear here."]}
        onOpen={setViewing} menu={menu}
        cols={[
          { h: "Employee", cell: (a) => <Person p={a.employee} /> },
          { h: "Role change", cell: move },
          { h: "Period", cell: (a) => <span className="font-mono font-semibold text-slate-700">{a.reviewPeriod}</span> },
          { h: "Rating", cell: (a) => (a.rating ? <Stars value={a.rating} /> : "—") },
          { h: "Status", cell: (a) => <StChip map={DEC_ST} v={a.promotionStatus} /> },
        ]}
        card={(a) => (
          <div className="space-y-2.5">
            <Person p={a.employee} sub={a.reviewPeriod} />
            {move(a)}
            <div className="flex flex-wrap items-center gap-2"><StChip map={DEC_ST} v={a.promotionStatus} />{a.rating ? <Stars value={a.rating} /> : null}</div>
          </div>
        )}
      />

      {viewing && (
        <AppraisalDetail a={viewing} onClose={() => setViewing(null)}>
          {canDecide(viewing) && <button type="button" onClick={() => { const a = viewing; setViewing(null); openApprove(a); }} className={primaryBtn}><ThumbsUp size={14} /> Approve</button>}
          {canApply(viewing) && <button type="button" onClick={() => applyIt(viewing)} className={primaryBtn}><Send size={14} /> Apply</button>}
          {canReject(viewing) && <button type="button" onClick={() => { setReject(viewing); setViewing(null); }} className="inline-flex items-center justify-center gap-2 px-5 py-3 sm:py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition cursor-pointer"><XCircle size={14} /> Reject</button>}
        </AppraisalDetail>
      )}

      {approve && (
        <Box title="Approve promotion" subtitle={approve.employee?.name} onClose={() => setApprove(null)} onSubmit={submitApprove} locked={saving} size="max-w-md" footer={<FormFooter onCancel={() => setApprove(null)} busy={saving} label="Approve" />}>
          <div className="flex items-center gap-2 text-xs"><Chip tone="slate">{approve.employee?.designation || "No designation"}</Chip><ArrowRight size={13} className="text-slate-300" /><Chip tone="emerald">{title || "?"}</Chip></div>
          <div>
            <Label>New designation</Label>
            <input list="promo-titles" value={title} maxLength={80} autoFocus onChange={(e) => { setTitle(e.target.value); setErr(""); }} className={`${inputClass} ${fieldBorder(err)}`} />
            <datalist id="promo-titles">{titles.map((t) => <option key={t} value={t} />)}</datalist>
            <FieldError>{err}</FieldError>
          </div>
          <div><Label>Note (optional)</Label><textarea rows={3} value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} className={`${inputClass} resize-none border-slate-200 focus:border-indigo-500`} /></div>
          <p className="text-[11px] text-slate-400">Approving does not change the employee yet. Use <b>Apply</b> afterwards.</p>
        </Box>
      )}

      {reject && <ReasonModal title="Reject promotion" subtitle={reject.employee?.name} confirm="Reject" onClose={() => setReject(null)} onSubmit={(n) => decide(reject, { decision: "rejected", note: n }, "Promotion rejected.")} />}
      {ask && <ConfirmDialog title={ask.title} text={ask.text} label={ask.label} onConfirm={ask.run} onClose={() => setAsk(null)} />}
    </div>
  );
}
