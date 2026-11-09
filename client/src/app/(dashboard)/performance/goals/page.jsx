"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Eye, Pencil, Plus, Target, Trash2, TrendingUp } from "lucide-react";
import { toast } from "react-toastify";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { ConfirmDialog, ErrorBanner, FieldError, Label, dateText, fieldBorder, inputClass } from "@/components/payroll/ui";
import { PageHeader, primaryBtn } from "@/components/payroll/common";
import { Box, Chip, FooterBar, FormFooter, Info, errMsg, ghostBtn, idOf } from "@/components/recruitment/rui";
import { Bar, DataPanel, GOAL_ST, Person, Stats, StChip, Toolbar, day, roleOf, selectCls, tabsOf, useApi } from "@/components/performance/pui";

const PRIORITY = [["low", "Low"], ["medium", "Medium"], ["high", "High"]];
const blank = (folks) => ({ employee: folks.length === 1 ? folks[0]._id : "", title: "", description: "", type: "goal", priority: "medium", startDate: day(new Date().toISOString()), targetDate: "", targetValue: "", currentValue: "", unit: "" });
const toForm = (g) => ({ employee: idOf(g.employee), title: g.title || "", description: g.description || "", type: g.type || "goal", priority: g.priority || "medium", startDate: day(g.startDate), targetDate: day(g.targetDate), targetValue: g.targetValue ? String(g.targetValue) : "", currentValue: g.currentValue ? String(g.currentValue) : "", unit: g.unit || "" });
const when = (g) => (g.status === "completed" || g.daysLeft === null ? "" : g.daysLeft < 0 ? `${-g.daysLeft} days late` : g.daysLeft === 0 ? "Due today" : `${g.daysLeft} days left`);
const barTone = (g) => (g.status === "completed" ? "bg-emerald-500" : g.status === "overdue" ? "bg-rose-500" : "bg-indigo-500");

/* update how far a goal has reached */
function ProgressModal({ goal, onClose, onDone }) {
  const kpi = goal.targetValue > 0;
  const [val, setVal] = useState(String(kpi ? goal.currentValue || 0 : goal.progress || 0));
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const n = Number(val);
  const pct = kpi ? Math.min(100, Math.round((n / goal.targetValue) * 100) || 0) : Math.min(100, Math.max(0, n || 0));

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (!Number.isFinite(n) || n < 0 || (!kpi && n > 100)) return setErr(kpi ? "Enter the current value." : "Progress must be from 0 to 100.");
    setBusy(true);
    try {
      await api.put(`/performance/goals/${goal._id}/progress`, kpi ? { currentValue: n, note } : { progress: n, note });
      toast.success("Progress updated.");
      onDone();
      onClose();
    } catch (er) {
      toast.error(await errMsg(er, "Unable to update the progress."));
      setBusy(false);
    }
  };

  return (
    <Box title="Update progress" subtitle={goal.title} onClose={onClose} onSubmit={submit} locked={busy} size="max-w-md" footer={<FormFooter onCancel={onClose} busy={busy} label="Save progress" />}>
      <div>
        <Label>{kpi ? `Current value${goal.unit ? ` (${goal.unit})` : ""} — target ${goal.targetValue}` : "Progress (%)"}</Label>
        {kpi ? (
          <input type="number" min="0" value={val} onChange={(e) => { setVal(e.target.value); setErr(""); }} className={`${inputClass} ${fieldBorder(err)}`} />
        ) : (
          <input type="range" min="0" max="100" step="5" value={n || 0} onChange={(e) => { setVal(e.target.value); setErr(""); }} className="w-full accent-indigo-600 cursor-pointer" />
        )}
        <FieldError>{err}</FieldError>
        <div className="mt-3 space-y-1.5"><div className="flex justify-between text-xs font-bold text-slate-700"><span>Progress</span><span className="font-mono">{pct}%</span></div><Bar value={pct} tone={pct >= 100 ? "bg-emerald-500" : "bg-indigo-500"} /></div>
      </div>
      <div>
        <Label>Note (optional)</Label>
        <textarea rows={3} value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder="What was done?" className={`${inputClass} resize-none border-slate-200 focus:border-indigo-500`} />
      </div>
    </Box>
  );
}

export default function GoalsPage() {
  const { user } = useAuth();
  const role = roleOf(user);
  const senior = ["admin", "hr", "manager"].includes(role);
  const uid = String(user?._id || user?.id || "");

  const { data, loading, refreshing, error, load } = useApi("/performance/goals");
  const { data: people } = useApi("/performance/people");
  const rows = data || [];
  const folks = people || [];

  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [emp, setEmp] = useState("ALL");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(blank([]));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [prog, setProg] = useState(null);
  const [ask, setAsk] = useState(null);

  const canEdit = (g) => senior || String(g.createdBy) === uid;
  const done = rows.filter((g) => g.status === "completed").length;
  const late = rows.filter((g) => g.status === "overdue").length;

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((g) => (tab === "all" || g.status === tab) && (emp === "ALL" || idOf(g.employee) === emp) && (!q || `${g.title} ${g.employee?.name || ""} ${g.description || ""}`.toLowerCase().includes(q)));
  }, [rows, tab, emp, search]);

  const openModal = (g = null) => {
    setForm(g ? toForm(g) : blank(folks));
    setErrors({});
    setModal({ row: g });
  };
  const set = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => (p[k] ? { ...p, [k]: undefined } : p));
  };

  const save = async (e) => {
    e.preventDefault();
    if (saving) return;
    const next = {};
    if (!form.employee) next.employee = "Please select the employee.";
    if (form.title.trim().length < 2) next.title = "Please enter the goal title.";
    if (!form.targetDate) next.targetDate = "Please select the target date.";
    else if (form.startDate && form.targetDate < form.startDate) next.targetDate = "The target date cannot be before the start date.";
    if (form.type === "kpi" && !(Number(form.targetValue) > 0)) next.targetValue = "Enter the number to reach.";
    setErrors(next);
    if (Object.keys(next).length) return;

    const kpi = form.type === "kpi";
    const body = { employee: form.employee, title: form.title.trim(), description: form.description.trim(), type: form.type, priority: form.priority, startDate: form.startDate, targetDate: form.targetDate, unit: kpi ? form.unit.trim() : "", targetValue: kpi ? Number(form.targetValue) : 0, currentValue: kpi ? Number(form.currentValue || 0) : 0 };
    setSaving(true);
    try {
      if (modal.row) await api.put(`/performance/goals/${modal.row._id}`, body);
      else await api.post("/performance/goals", body);
      toast.success(modal.row ? "Goal updated." : "Goal created.");
      setModal(null);
      load({ silent: true });
    } catch (err) {
      toast.error(await errMsg(err, "Unable to save the goal."));
    } finally {
      setSaving(false);
    }
  };

  const remove = (g) => setAsk({
    title: "Delete this goal?", text: `${g.title}. This cannot be undone.`, label: "Delete", danger: true,
    run: async () => {
      try {
        await api.delete(`/performance/goals/${g._id}`);
        toast.success("Goal deleted.");
        await load({ silent: true });
      } catch (err) {
        toast.error(await errMsg(err, "Unable to delete the goal."));
      }
    },
  });

  const menu = (g) => [
    { label: "View details", icon: Eye, run: () => setViewing(g) },
    { label: "Update progress", icon: TrendingUp, run: () => setProg(g) },
    { label: "Edit", icon: Pencil, run: () => openModal(g), hidden: !canEdit(g) },
    { label: "Delete", icon: Trash2, run: () => remove(g), hidden: !canEdit(g), danger: true },
  ];

  const progressCell = (g) => (
    <div className="w-40 space-y-1">
      <Bar value={g.progress} tone={barTone(g)} />
      <p className="text-[11px] font-semibold text-slate-500">{g.progress}%{g.targetValue > 0 ? ` • ${g.currentValue}/${g.targetValue} ${g.unit || ""}` : ""}</p>
    </div>
  );
  const cls = `${inputClass} border-slate-200 focus:border-indigo-500`;
  const toggle = (key, list) => (
    <div className={`grid gap-1 p-1 bg-slate-100 rounded-xl ${list.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
      {list.map(([k, l]) => <button key={k} type="button" onClick={() => set(key, k)} className={`py-2.5 sm:py-2 text-xs font-bold rounded-lg transition cursor-pointer ${form[key] === k ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>{l}</button>)}
    </div>
  );

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 py-4 space-y-4 antialiased pb-16">
      <PageHeader icon={Target} title="Goals & KPIs" subtitle="Targets for each employee and how far they have reached." onRefresh={() => load({ silent: true })} busy={loading || refreshing}>
        <button type="button" onClick={() => openModal()} className={primaryBtn}><Plus size={16} /> New Goal</button>
      </PageHeader>

      {!loading && !error && <Stats items={[["Total goals", rows.length, Target, "indigo"], ["Completed", done, CheckCircle2, "emerald"], ["Overdue", late, AlertTriangle, "violet"]]} />}

      <Toolbar search={search} onSearch={setSearch} placeholder="Search goal or employee" tabs={tabsOf(rows, GOAL_ST, "status")} tab={tab} onTab={setTab}>
        {senior && folks.length > 1 && (
          <select value={emp} onChange={(e) => setEmp(e.target.value)} className={selectCls}>
            <option value="ALL">All employees</option>
            {folks.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
          </select>
        )}
      </Toolbar>

      <ErrorBanner message={error} onRetry={() => load()} />

      <DataPanel
        loading={loading} rows={visible} icon={Target}
        empty={[rows.length ? "Nothing matches your search" : "No goals yet", rows.length ? "Try another tab or keyword." : 'Click "New Goal" to add the first one.']}
        onOpen={setViewing} menu={menu}
        cols={[
          { h: "Goal", cell: (g) => <div className="min-w-0"><p className="font-semibold text-slate-900 text-sm truncate max-w-[240px]">{g.title}</p><p className="text-[11px] text-slate-400">{g.type === "kpi" ? "KPI" : "Goal"} • {g.priority} priority</p></div> },
          { h: "Employee", cell: (g) => <Person p={g.employee} /> },
          { h: "Target date", cell: (g) => <div><p className="font-medium text-slate-700">{g.targetDate ? dateText(g.targetDate) : "—"}</p>{when(g) && <p className={`text-[11px] font-semibold ${g.isOverdue ? "text-rose-600" : "text-slate-400"}`}>{when(g)}</p>}</div> },
          { h: "Progress", cell: progressCell },
          { h: "Status", cell: (g) => <StChip map={GOAL_ST} v={g.status} /> },
        ]}
        card={(g) => (
          <div className="space-y-2.5">
            <div><p className="text-sm font-bold text-slate-900 break-words">{g.title}</p><p className="text-[11px] text-slate-400">{g.employee?.name} • {g.targetDate ? dateText(g.targetDate) : "no date"}</p></div>
            <Bar value={g.progress} tone={barTone(g)} />
            <div className="flex flex-wrap items-center gap-2"><StChip map={GOAL_ST} v={g.status} /><Chip tone="violet">{g.progress}%</Chip>{when(g) && <span className={`text-[11px] font-semibold ${g.isOverdue ? "text-rose-600" : "text-slate-400"}`}>{when(g)}</span>}</div>
          </div>
        )}
      />

      {/* create / edit */}
      {modal && (
        <Box title={modal.row ? "Edit goal" : "New goal"} subtitle="Set a target and a date" onClose={() => setModal(null)} onSubmit={save} locked={saving} size="max-w-2xl" footer={<FormFooter onCancel={() => setModal(null)} busy={saving} label={modal.row ? "Save changes" : "Create goal"} />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label>Employee</Label>
              <select value={form.employee ?? ""} disabled={folks.length === 1} onChange={(e) => set("employee", e.target.value)} className={`${inputClass} cursor-pointer disabled:bg-slate-100 ${fieldBorder(errors.employee)}`}>
                <option value="">Select employee</option>
                {folks.map((p) => <option key={p._id} value={p._id}>{p.name}{p.employeeId ? ` (${p.employeeId})` : ""}{p.isMe ? " — me" : ""}</option>)}
              </select>
              <FieldError>{errors.employee}</FieldError>
            </div>
            <div className="sm:col-span-2">
              <Label>Title</Label>
              <input value={form.title ?? ""} maxLength={150} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Close 40 support tickets" className={`${inputClass} ${fieldBorder(errors.title)}`} />
              <FieldError>{errors.title}</FieldError>
            </div>
            <div><Label>Type</Label>{toggle("type", [["goal", "Goal"], ["kpi", "KPI (number)"]])}</div>
            <div><Label>Priority</Label>{toggle("priority", PRIORITY)}</div>
            <div><Label>Start date</Label><input type="date" value={form.startDate ?? ""} onChange={(e) => set("startDate", e.target.value)} className={`${cls} cursor-pointer`} /></div>
            <div>
              <Label>Target date</Label>
              <input type="date" value={form.targetDate ?? ""} onChange={(e) => set("targetDate", e.target.value)} className={`${inputClass} cursor-pointer ${fieldBorder(errors.targetDate)}`} />
              <FieldError>{errors.targetDate}</FieldError>
            </div>
            {form.type === "kpi" && (
              <>
                <div>
                  <Label>Number to reach</Label>
                  <input type="number" min="0" value={form.targetValue ?? ""} onChange={(e) => set("targetValue", e.target.value)} placeholder="e.g. 40" className={`${inputClass} ${fieldBorder(errors.targetValue)}`} />
                  <FieldError>{errors.targetValue}</FieldError>
                </div>
                <div><Label>Unit (optional)</Label><input value={form.unit ?? ""} maxLength={20} onChange={(e) => set("unit", e.target.value)} placeholder="tickets, sales, hours" className={cls} /></div>
                <div className="sm:col-span-2"><Label>Done so far</Label><input type="number" min="0" value={form.currentValue ?? ""} onChange={(e) => set("currentValue", e.target.value)} className={cls} /></div>
              </>
            )}
            <div className="sm:col-span-2"><Label>Description (optional)</Label><textarea rows={3} value={form.description ?? ""} maxLength={1000} onChange={(e) => set("description", e.target.value)} className={`${cls} resize-none`} /></div>
          </div>
        </Box>
      )}

      {/* details */}
      {viewing && (
        <Box title={viewing.title} subtitle={viewing.employee?.name} onClose={() => setViewing(null)} footer={
          <FooterBar>
            <button type="button" onClick={() => { const g = viewing; setViewing(null); setProg(g); }} className={primaryBtn}><TrendingUp size={14} /> Update progress</button>
            {canEdit(viewing) && <button type="button" onClick={() => { const g = viewing; setViewing(null); openModal(g); }} className={ghostBtn}><Pencil size={14} /> Edit</button>}
            <button type="button" onClick={() => setViewing(null)} className={ghostBtn}>Close</button>
          </FooterBar>
        }>
          <div className="flex flex-wrap items-center gap-2"><StChip map={GOAL_ST} v={viewing.status} /><Chip tone="slate">{viewing.type === "kpi" ? "KPI" : "Goal"}</Chip><Chip tone="violet">{viewing.priority} priority</Chip></div>
          <div className="space-y-1.5"><div className="flex justify-between text-xs font-bold text-slate-700"><span>Progress</span><span className="font-mono">{viewing.progress}%</span></div><Bar value={viewing.progress} tone={barTone(viewing)} /></div>
          <Info rows={[["Employee", viewing.employee?.name], ["Department", viewing.employee?.department], ["Start date", viewing.startDate ? dateText(viewing.startDate) : ""], ["Target date", viewing.targetDate ? dateText(viewing.targetDate) : ""], ["Time", when(viewing)], ["Target value", viewing.targetValue > 0 ? `${viewing.targetValue} ${viewing.unit || ""}` : ""], ["Done so far", viewing.targetValue > 0 ? `${viewing.currentValue} ${viewing.unit || ""}` : ""], ["Completed on", viewing.completedAt ? dateText(viewing.completedAt) : ""]]} />
          {viewing.description && <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/70 border border-slate-200 rounded-2xl p-3.5 whitespace-pre-line break-words">{viewing.description}</p>}
          {viewing.updates?.length > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Updates</p>
              <ul className="space-y-2">
                {[...viewing.updates].reverse().slice(0, 6).map((u, i) => <li key={i} className="flex items-start gap-3 text-xs"><Chip tone="indigo">{u.progress}%</Chip><div className="min-w-0"><p className="text-slate-700 font-medium break-words">{u.note || "Progress updated"}</p><p className="text-[11px] text-slate-400">{dateText(u.at)}</p></div></li>)}
              </ul>
            </div>
          )}
        </Box>
      )}

      {prog && <ProgressModal goal={prog} onClose={() => setProg(null)} onDone={() => load({ silent: true })} />}
      {ask && <ConfirmDialog title={ask.title} text={ask.text} label={ask.label} danger={ask.danger} onConfirm={ask.run} onClose={() => setAsk(null)} />}
    </div>
  );
}

