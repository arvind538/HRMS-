"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Clock, Eye, PenLine, UserCheck } from "lucide-react";
import { toast } from "react-toastify";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { ErrorBanner, FieldError, Label, dateText, fieldBorder, inputClass } from "@/components/payroll/ui";
import { PageHeader, primaryBtn } from "@/components/payroll/common";
import { Box, Chip, FormFooter, errMsg } from "@/components/recruitment/rui";
import AppraisalDetail from "@/components/performance/AppraisalDetail";
import { APPR_ST, DataPanel, Person, Stars, Stats, StChip, StarPicker, Toolbar, listOf, roleOf, useApi } from "@/components/performance/pui";

const LOCK = ["approved", "applied", "rejected"];
const blank = () => ({ managerAssessment: "", rating: 0, strengths: "", areasOfImprovement: "", promotionRecommended: false, proposedDesignation: "", incrementPercent: "" });
const toForm = (a) => ({ managerAssessment: a.managerAssessment || "", rating: a.rating || 0, strengths: a.strengths || "", areasOfImprovement: a.areasOfImprovement || "", promotionRecommended: Boolean(a.promotionRecommended), proposedDesignation: a.proposedDesignation || "", incrementPercent: a.incrementPercent ? String(a.incrementPercent) : "" });

export default function ManagerAssessmentPage() {
  const { user } = useAuth();
  const staff = ["admin", "hr"].includes(roleOf(user));
  const { data, loading, refreshing, error, load } = useApi("/performance/appraisals");
  const { data: des } = useApi("/organization/designations");
  const titles = useMemo(() => listOf(des).filter((d) => d.status !== "inactive").map((d) => d.title), [des]);

  const rows = useMemo(() => (data || []).filter((a) => !a.isMine), [data]);
  const [tab, setTab] = useState("pending-manager");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(blank());
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [viewing, setViewing] = useState(null);

  const canReview = (a) => a.status === "pending-manager" || staff;
  const visible = rows.filter((a) => a.status === tab && (!search.trim() || `${a.employee?.name || ""} ${a.employee?.employeeId || ""} ${a.reviewPeriod}`.toLowerCase().includes(search.trim().toLowerCase())));
  const count = (s) => rows.filter((a) => a.status === s).length;

  const openModal = (a) => {
    setForm(a.status === "completed" ? toForm(a) : { ...blank(), ...toForm(a), rating: a.rating || 0 });
    setErrors({});
    setModal(a);
  };
  const set = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => (p[k] ? { ...p, [k]: undefined } : p));
  };

  const save = async (e) => {
    e.preventDefault();
    if (saving) return;
    const next = {};
    const pct = Number(form.incrementPercent || 0);
    if (form.managerAssessment.trim().length < 10) next.managerAssessment = "Please write your assessment (at least a few lines).";
    if (!form.rating) next.rating = "Please give a rating from 1 to 5.";
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) next.incrementPercent = "Enter 0 to 100.";
    if (form.promotionRecommended && form.proposedDesignation.trim().length < 2) next.proposedDesignation = "Enter the designation to promote to.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      await api.put(`/performance/appraisals/${modal._id}/manager-assessment`, { ...form, managerAssessment: form.managerAssessment.trim(), strengths: form.strengths.trim(), areasOfImprovement: form.areasOfImprovement.trim(), proposedDesignation: form.proposedDesignation.trim(), incrementPercent: pct });
      toast.success("Review submitted.");
      setModal(null);
      load({ silent: true });
    } catch (err) {
      toast.error(await errMsg(err, "Unable to submit the review."));
    } finally {
      setSaving(false);
    }
  };

  const menu = (a) => [
    { label: a.status === "completed" ? "Edit review" : "Review and rate", icon: PenLine, run: () => openModal(a), hidden: !canReview(a) },
    { label: "View", icon: Eye, run: () => setViewing(a) },
  ];
  const promoLocked = modal && LOCK.includes(modal.promotionStatus);
  const incLocked = modal && LOCK.includes(modal.incrementStatus);
  const cls = `${inputClass} border-slate-200 focus:border-indigo-500`;

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 py-4 space-y-4 antialiased pb-16">
      <PageHeader icon={UserCheck} title="Manager Assessment" subtitle="Read the self assessment, then rate and recommend." onRefresh={() => load({ silent: true })} busy={loading || refreshing} />

      {!loading && !error && <Stats items={[["To review", count("pending-manager"), UserCheck, "indigo"], ["Waiting for employee", count("pending-self"), Clock, "violet"], ["Completed", count("completed"), CheckCircle2, "emerald"]]} />}

      <Toolbar search={search} onSearch={setSearch} placeholder="Search employee or period" tabs={[["pending-manager", "To review", count("pending-manager")], ["pending-self", "Waiting for employee", count("pending-self")], ["completed", "Completed", count("completed")]]} tab={tab} onTab={setTab} />
      <ErrorBanner message={error} onRetry={() => load()} />

      <DataPanel
        loading={loading} rows={visible} icon={UserCheck}
        empty={[tab === "pending-manager" ? "All caught up" : "Nothing here", "Appraisals of the people who report to you show up here."]}
        onOpen={(a) => (canReview(a) ? openModal(a) : setViewing(a))} menu={menu}
        cols={[
          { h: "Employee", cell: (a) => <Person p={a.employee} /> },
          { h: "Period", cell: (a) => <span className="font-mono font-semibold text-slate-700">{a.reviewPeriod}</span> },
          { h: "Self assessment", cell: (a) => (a.selfAssessment ? <span className="block max-w-[260px] truncate italic text-slate-500">“{a.selfAssessment}”</span> : <span className="text-slate-300">Not written</span>) },
          { h: "Self rating", cell: (a) => (a.selfRating ? `${a.selfRating}/5` : "—") },
          { h: "Rating", cell: (a) => (a.rating ? <Stars value={a.rating} /> : <span className="text-slate-300">—</span>) },
          { h: "Status", cell: (a) => <StChip map={APPR_ST} v={a.status} /> },
        ]}
        card={(a) => (
          <div className="space-y-2.5">
            <Person p={a.employee} sub={a.reviewPeriod} />
            {a.selfAssessment && <p className="text-xs italic text-slate-500 line-clamp-2">“{a.selfAssessment}”</p>}
            <div className="flex flex-wrap items-center gap-2"><StChip map={APPR_ST} v={a.status} />{a.rating ? <Stars value={a.rating} /> : null}</div>
            {canReview(a) && <button type="button" onClick={(e) => { e.stopPropagation(); openModal(a); }} className={`${primaryBtn} w-full`}><PenLine size={14} /> {a.status === "completed" ? "Edit review" : "Review and rate"}</button>}
          </div>
        )}
      />

      {modal && (
        <Box title={modal.employee?.name} subtitle={`${modal.reviewPeriod} • manager assessment`} onClose={() => setModal(null)} onSubmit={save} locked={saving} size="max-w-2xl" footer={<FormFooter onCancel={() => setModal(null)} busy={saving} label={modal.status === "completed" ? "Save review" : "Complete review"} />}>
          <div className="bg-indigo-50/70 border-l-4 border-indigo-600 p-3.5 rounded-r-xl">
            <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-900 mb-1">Employee&apos;s self assessment{modal.selfRating ? ` • ${modal.selfRating}/5` : ""}</p>
            <p className="text-xs text-slate-700 italic leading-relaxed whitespace-pre-line break-words">{modal.selfAssessment ? `“${modal.selfAssessment}”` : "The employee has not written a self assessment yet."}</p>
          </div>

          <div>
            <Label>Your assessment</Label>
            <textarea rows={4} value={form.managerAssessment ?? ""} maxLength={3000} onChange={(e) => set("managerAssessment", e.target.value)} placeholder="Overall feedback on the work done" className={`${inputClass} resize-y ${fieldBorder(errors.managerAssessment)}`} />
            <FieldError>{errors.managerAssessment}</FieldError>
          </div>

          <div>
            <Label>Rating</Label>
            <StarPicker value={form.rating} onChange={(n) => set("rating", n)} />
            <FieldError>{errors.rating}</FieldError>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><Label>Strengths</Label><textarea rows={3} value={form.strengths ?? ""} maxLength={1000} onChange={(e) => set("strengths", e.target.value)} className={`${cls} resize-none`} /></div>
            <div><Label>Areas of improvement</Label><textarea rows={3} value={form.areasOfImprovement ?? ""} maxLength={1000} onChange={(e) => set("areasOfImprovement", e.target.value)} className={`${cls} resize-none`} /></div>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4 space-y-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Recommendations for HR</p>
            <label className={`flex items-center gap-3 ${promoLocked ? "opacity-60" : "cursor-pointer"}`}>
              <input type="checkbox" disabled={promoLocked} checked={form.promotionRecommended} onChange={(e) => set("promotionRecommended", e.target.checked)} className="h-4 w-4 rounded text-indigo-600 border-slate-300 cursor-pointer" />
              <span className="text-xs font-bold text-slate-800">Recommend for promotion</span>
            </label>
            {promoLocked && <Chip tone="slate">HR already decided the promotion</Chip>}
            {form.promotionRecommended && !promoLocked && (
              <div>
                <Label>Promote to</Label>
                <input list="designations" value={form.proposedDesignation ?? ""} maxLength={80} onChange={(e) => set("proposedDesignation", e.target.value)} placeholder="e.g. Senior Software Engineer" className={`${inputClass} ${fieldBorder(errors.proposedDesignation)}`} />
                <datalist id="designations">{titles.map((t) => <option key={t} value={t} />)}</datalist>
                <FieldError>{errors.proposedDesignation}</FieldError>
              </div>
            )}
            <div>
              <Label>Salary increment % (optional)</Label>
              <input type="number" min="0" max="100" disabled={incLocked} value={form.incrementPercent ?? ""} onChange={(e) => set("incrementPercent", e.target.value)} placeholder="e.g. 10" className={`${inputClass} disabled:bg-slate-100 ${fieldBorder(errors.incrementPercent)}`} />
              <FieldError>{errors.incrementPercent}</FieldError>
              {incLocked && <p className="text-[11px] text-slate-400 mt-1">HR already decided the increment.</p>}
            </div>
          </div>
        </Box>
      )}

      {viewing && <AppraisalDetail a={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}
