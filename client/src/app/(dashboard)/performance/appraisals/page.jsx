"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, ClipboardCheck, Clock, Eye, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { ConfirmDialog, ErrorBanner, FieldError, Label, dateText, fieldBorder, inputClass } from "@/components/payroll/ui";
import { PageHeader, primaryBtn } from "@/components/payroll/common";
import { Box, Chip, FormFooter, errMsg } from "@/components/recruitment/rui";
import AppraisalDetail from "@/components/performance/AppraisalDetail";
import { APPR_ST, DataPanel, Person, Stars, Stats, StChip, Toolbar, day, defaultPeriod, roleOf, tabsOf, useApi } from "@/components/performance/pui";

const PERIOD = /^[A-Z0-9][A-Z0-9 -]{2,19}$/i;
const blank = () => ({ mode: "all", employee: "", reviewPeriod: defaultPeriod(), dueDate: "" });

export default function AppraisalsPage() {
  const { user } = useAuth();
  const role = roleOf(user);
  const staff = ["admin", "hr"].includes(role);
  const admin = role === "admin";

  const { data, loading, refreshing, error, load } = useApi("/performance/appraisals");
  const { data: people } = useApi("/performance/people");
  const rows = data || [];

  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(blank());
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [ask, setAsk] = useState(null);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((a) => (tab === "all" || a.status === tab) && (!q || `${a.employee?.name || ""} ${a.employee?.employeeId || ""} ${a.reviewPeriod}`.toLowerCase().includes(q)));
  }, [rows, tab, search]);

  const count = (s) => rows.filter((a) => a.status === s).length;

  const openModal = (a = null) => {
    setForm(a ? { mode: "one", employee: "", reviewPeriod: a.reviewPeriod, dueDate: day(a.dueDate) } : blank());
    setErrors({});
    setModal({ row: a });
  };
  const set = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => (p[k] ? { ...p, [k]: undefined } : p));
  };

  const save = async (e) => {
    e.preventDefault();
    if (saving) return;
    const next = {};
    if (!PERIOD.test(form.reviewPeriod.trim())) next.reviewPeriod = "Enter the period, for example 2026-H1.";
    if (!modal.row && form.mode === "one" && !form.employee) next.employee = "Please select the employee.";
    setErrors(next);
    if (Object.keys(next).length) return;

    const body = { reviewPeriod: form.reviewPeriod.trim().toUpperCase(), dueDate: form.dueDate };
    setSaving(true);
    try {
      if (modal.row) {
        await api.put(`/performance/appraisals/${modal.row._id}`, body);
        toast.success("Appraisal updated.");
      } else if (form.mode === "all") {
        const res = await api.post("/performance/appraisals/bulk", body);
        toast.success(res.data?.message || "Appraisals created.");
      } else {
        await api.post("/performance/appraisals", { ...body, employee: form.employee });
        toast.success("Appraisal started.");
      }
      setModal(null);
      load({ silent: true });
    } catch (err) {
      toast.error(await errMsg(err, "Unable to save the appraisal."));
    } finally {
      setSaving(false);
    }
  };

  const act = (a, kind) => {
    const reopen = kind === "reopen";
    setAsk({
      title: reopen ? "Reopen this appraisal?" : "Delete this appraisal?",
      text: reopen ? `${a.employee?.name} • ${a.reviewPeriod}. It goes back to the manager for changes.` : `${a.employee?.name} • ${a.reviewPeriod}. This cannot be undone.`,
      label: reopen ? "Reopen" : "Delete", danger: !reopen,
      run: async () => {
        try {
          if (reopen) await api.put(`/performance/appraisals/${a._id}/reopen`);
          else await api.delete(`/performance/appraisals/${a._id}`);
          toast.success(reopen ? "Appraisal reopened." : "Appraisal deleted.");
          setViewing(null);
          await load({ silent: true });
        } catch (err) {
          toast.error(await errMsg(err, "Unable to complete this."));
        }
      },
    });
  };

  const menu = (a) => [
    { label: "View details", icon: Eye, run: () => setViewing(a) },
    { label: "Edit period or date", icon: Pencil, run: () => openModal(a), hidden: !staff },
    { label: "Reopen", icon: RotateCcw, run: () => act(a, "reopen"), hidden: !staff || a.status !== "completed" },
    { label: "Delete", icon: Trash2, run: () => act(a, "delete"), hidden: !admin, danger: true },
  ];

  const cls = `${inputClass} border-slate-200 focus:border-indigo-500`;

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 py-4 space-y-4 antialiased pb-16">
      <PageHeader icon={ClipboardCheck} title="Appraisals" subtitle="Review cycles: self assessment, then manager review." onRefresh={() => load({ silent: true })} busy={loading || refreshing}>
        {staff && <button type="button" onClick={() => openModal()} className={primaryBtn}><Plus size={16} /> Start Appraisals</button>}
      </PageHeader>

      {!loading && !error && <Stats items={[["Awaiting self", count("pending-self"), Clock, "indigo"], ["Awaiting manager", count("pending-manager"), ClipboardCheck, "violet"], ["Completed", count("completed"), CheckCircle2, "emerald"]]} />}

      <Toolbar search={search} onSearch={setSearch} placeholder="Search employee or period" tabs={tabsOf(rows, APPR_ST, "status")} tab={tab} onTab={setTab} />
      <ErrorBanner message={error} onRetry={() => load()} />

      <DataPanel
        loading={loading} rows={visible} icon={ClipboardCheck}
        empty={[rows.length ? "Nothing matches your search" : "No appraisals yet", rows.length ? "Try another tab or keyword." : staff ? 'Click "Start Appraisals" to begin a cycle.' : "HR will start the cycle."]}
        onOpen={setViewing} menu={menu}
        cols={[
          { h: "Employee", cell: (a) => <Person p={a.employee} /> },
          { h: "Period", cell: (a) => <span className="font-mono font-semibold text-slate-700">{a.reviewPeriod}</span> },
          { h: "Due", cell: (a) => <div><p>{a.dueDate ? dateText(a.dueDate) : "—"}</p>{a.isOverdue && <p className="text-[11px] font-bold text-rose-600">Overdue</p>}</div> },
          { h: "Self assessment", cell: (a) => (a.submittedSelfAt ? <Chip tone="emerald">Submitted</Chip> : <Chip tone="amber">Pending</Chip>) },
          { h: "Rating", cell: (a) => (a.rating ? <span className="inline-flex items-center gap-2"><Stars value={a.rating} /><b className="font-mono text-slate-700">{a.rating}</b></span> : <span className="text-slate-300">—</span>) },
          { h: "Status", cell: (a) => <StChip map={APPR_ST} v={a.status} /> },
        ]}
        card={(a) => (
          <div className="space-y-2.5">
            <Person p={a.employee} sub={`${a.reviewPeriod}${a.dueDate ? ` • due ${dateText(a.dueDate)}` : ""}`} />
            <div className="flex flex-wrap items-center gap-2"><StChip map={APPR_ST} v={a.status} />{a.isOverdue && <Chip tone="rose">Overdue</Chip>}{a.rating ? <Stars value={a.rating} /> : null}</div>
          </div>
        )}
      />

      {modal && (
        <Box title={modal.row ? "Edit appraisal" : "Start appraisals"} subtitle={modal.row ? modal.row.employee?.name : "Pick who and for which period"} onClose={() => setModal(null)} onSubmit={save} locked={saving} size="max-w-md" footer={<FormFooter onCancel={() => setModal(null)} busy={saving} label={modal.row ? "Save changes" : form.mode === "all" ? "Start for everyone" : "Start appraisal"} />}>
          {!modal.row && (
            <div>
              <Label>For</Label>
              <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl">
                {[["all", "Everyone"], ["one", "One employee"]].map(([k, l]) => <button key={k} type="button" onClick={() => set("mode", k)} className={`py-2.5 sm:py-2 text-xs font-bold rounded-lg transition cursor-pointer ${form.mode === k ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>{l}</button>)}
              </div>
              {form.mode === "all" && <p className="text-[11px] text-slate-400 mt-1.5">All active employees get an appraisal. People who already have one for this period are skipped.</p>}
            </div>
          )}
          {!modal.row && form.mode === "one" && (
            <div>
              <Label>Employee</Label>
              <select value={form.employee ?? ""} onChange={(e) => set("employee", e.target.value)} className={`${inputClass} cursor-pointer ${fieldBorder(errors.employee)}`}>
                <option value="">Select employee</option>
                {(people || []).map((p) => <option key={p._id} value={p._id}>{p.name}{p.employeeId ? ` (${p.employeeId})` : ""}</option>)}
              </select>
              <FieldError>{errors.employee}</FieldError>
            </div>
          )}
          <div>
            <Label>Review period</Label>
            <input value={form.reviewPeriod ?? ""} maxLength={20} onChange={(e) => set("reviewPeriod", e.target.value)} placeholder="e.g. 2026-H1" className={`${inputClass} font-mono uppercase ${fieldBorder(errors.reviewPeriod)}`} />
            <FieldError>{errors.reviewPeriod}</FieldError>
          </div>
          <div><Label>Due date (optional)</Label><input type="date" value={form.dueDate ?? ""} onChange={(e) => set("dueDate", e.target.value)} className={`${cls} cursor-pointer`} /></div>
        </Box>
      )}

      {viewing && <AppraisalDetail a={viewing} onClose={() => setViewing(null)} />}
      {ask && <ConfirmDialog title={ask.title} text={ask.text} label={ask.label} danger={ask.danger} onConfirm={ask.run} onClose={() => setAsk(null)} />}
    </div>
  );
}
