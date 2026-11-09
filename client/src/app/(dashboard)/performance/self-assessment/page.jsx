"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, ClipboardEdit, Clock, Eye, PenLine } from "lucide-react";
import { toast } from "react-toastify";
import api from "@/lib/api";
import { ErrorBanner, FieldError, Label, dateText, fieldBorder, inputClass } from "@/components/payroll/ui";
import { PageHeader, primaryBtn } from "@/components/payroll/common";
import { Box, FormFooter, errMsg } from "@/components/recruitment/rui";
import AppraisalDetail from "@/components/performance/AppraisalDetail";
import { APPR_ST, DataPanel, Person, Stats, StChip, StarPicker, Toolbar, useApi } from "@/components/performance/pui";

export default function SelfAssessmentPage() {
  const { data, loading, refreshing, error, load } = useApi("/performance/appraisals");
  const mine = useMemo(() => (data || []).filter((a) => a.isMine), [data]);

  const [tab, setTab] = useState("todo");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [text, setText] = useState("");
  const [rating, setRating] = useState(0);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [viewing, setViewing] = useState(null);

  const todo = mine.filter((a) => a.status === "pending-self");
  const visible = (tab === "todo" ? todo : mine.filter((a) => a.status !== "pending-self")).filter((a) => !search.trim() || a.reviewPeriod.toLowerCase().includes(search.trim().toLowerCase()));

  const openModal = (a) => {
    setText(a.selfAssessment || "");
    setRating(a.selfRating || 0);
    setErr("");
    setModal(a);
  };

  const save = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (text.trim().length < 10) return setErr("Please write at least a few lines about your work.");
    setSaving(true);
    try {
      await api.put(`/performance/appraisals/${modal._id}/self-assessment`, { selfAssessment: text.trim(), selfRating: rating || "" });
      toast.success("Self assessment submitted.");
      setModal(null);
      load({ silent: true });
    } catch (er) {
      toast.error(await errMsg(er, "Unable to submit the self assessment."));
    } finally {
      setSaving(false);
    }
  };

  const menu = (a) => [
    { label: a.selfAssessment ? "Edit assessment" : "Write assessment", icon: PenLine, run: () => openModal(a), hidden: a.status === "completed" },
    { label: "View", icon: Eye, run: () => setViewing(a) },
  ];
  const open = (a) => (a.status === "completed" ? setViewing(a) : openModal(a));

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 py-4 space-y-4 antialiased pb-16">
      <PageHeader icon={ClipboardEdit} title="Self Assessment" subtitle="Write what you achieved in the review period." onRefresh={() => load({ silent: true })} busy={loading || refreshing} />

      {!loading && !error && <Stats items={[["To write", todo.length, Clock, "indigo"], ["Submitted", mine.filter((a) => a.status !== "pending-self").length, CheckCircle2, "emerald"], ["All appraisals", mine.length, ClipboardEdit, "violet"]]} />}

      <Toolbar search={search} onSearch={setSearch} placeholder="Search period" tabs={[["todo", "To do", todo.length], ["done", "Submitted", mine.length - todo.length]]} tab={tab} onTab={setTab} />
      <ErrorBanner message={error} onRetry={() => load()} />

      <DataPanel
        loading={loading} rows={visible} icon={ClipboardEdit}
        empty={[tab === "todo" ? "Nothing to write" : "Nothing submitted yet", "Your self assessment is needed only when HR starts an appraisal for you."]}
        onOpen={open} menu={menu}
        cols={[
          { h: "Period", cell: (a) => <span className="font-mono font-bold text-slate-800">{a.reviewPeriod}</span> },
          { h: "Due", cell: (a) => <div><p>{a.dueDate ? dateText(a.dueDate) : "—"}</p>{a.isOverdue && <p className="text-[11px] font-bold text-rose-600">Overdue</p>}</div> },
          { h: "Submitted on", cell: (a) => (a.submittedSelfAt ? dateText(a.submittedSelfAt) : "—") },
          { h: "My rating", cell: (a) => (a.selfRating ? `${a.selfRating}/5` : "—") },
          { h: "Status", cell: (a) => <StChip map={APPR_ST} v={a.status} /> },
        ]}
        card={(a) => (
          <div className="space-y-2.5">
            <div><p className="text-sm font-bold text-slate-900 font-mono">{a.reviewPeriod}</p><p className="text-[11px] text-slate-400">{a.dueDate ? `Due ${dateText(a.dueDate)}` : "No due date"}</p></div>
            <StChip map={APPR_ST} v={a.status} />
            {a.status === "pending-self" && <button type="button" onClick={(e) => { e.stopPropagation(); openModal(a); }} className={`${primaryBtn} w-full`}><PenLine size={14} /> Write assessment</button>}
          </div>
        )}
      />

      {modal && (
        <Box title="Self assessment" subtitle={`${modal.reviewPeriod}${modal.dueDate ? ` • due ${dateText(modal.dueDate)}` : ""}`} onClose={() => setModal(null)} onSubmit={save} locked={saving} size="max-w-xl" footer={<FormFooter onCancel={() => setModal(null)} busy={saving} label="Submit assessment" />}>
          <div>
            <Label>Your work in this period</Label>
            <textarea rows={8} value={text} maxLength={3000} autoFocus onChange={(e) => { setText(e.target.value); setErr(""); }} placeholder="What did you achieve? What was hard? What do you want to do next?" className={`${inputClass} resize-y ${fieldBorder(err)}`} />
            <div className="flex justify-between"><FieldError>{err}</FieldError><span className="ml-auto text-[10px] text-slate-400">{text.length}/3000</span></div>
          </div>
          <div><Label>How would you rate yourself? (optional)</Label><StarPicker value={rating} onChange={setRating} /></div>
          <p className="text-[11px] text-slate-400">You can edit this until your manager completes the review.</p>
        </Box>
      )}

      {viewing && <AppraisalDetail a={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}
