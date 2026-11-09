"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Scale, X } from "lucide-react";
import { toast } from "react-toastify";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { ConfirmDialog, ErrorBanner, FieldError, Label, Sheet, fieldBorder, inputClass } from "@/components/payroll/ui";
import { FilterTabs, ListSkeleton, PageHeader, primaryBtn } from "@/components/payroll/common";
import { RecordList, RegistrationCard, ymdLocal } from "@/components/compliance/shared";

const IDEAS = ["Minimum wages review", "Payment of Bonus (annual)", "Gratuity provision", "Shops & Establishment renewal", "Muster roll / registers update"];
const blank = { title: "", dueDate: "", totalAmount: "", notes: "" };

export default function LabourCompliancePage() {
  const { user } = useAuth();
  const isAdmin = String(user?.role || "").toLowerCase() === "admin";

  const [tab, setTab] = useState("tasks");
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(blank);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [ask, setAsk] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/compliance", { params: { type: "labour" } });
      setRecords(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to load the tasks.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openModal = (r = null) => {
    setForm(r ? { title: r.title || "", dueDate: ymdLocal(new Date(r.dueDate)), totalAmount: r.totalAmount ? String(r.totalAmount) : "", notes: r.notes || "" } : blank);
    setErrors({});
    setModal({ row: r });
  };
  const set = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => (p[k] ? { ...p, [k]: undefined } : p));
  };

  const save = async (e) => {
    e.preventDefault();
    if (saving) return;
    const next = {};
    if (form.title.trim().length < 3) next.title = "Please enter a title (at least 3 characters).";
    if (!form.dueDate) next.dueDate = "Please choose the due date.";
    if (form.totalAmount !== "" && (!Number.isFinite(Number(form.totalAmount)) || Number(form.totalAmount) < 0)) next.totalAmount = "Enter a valid amount.";
    setErrors(next);
    if (Object.keys(next).length) return;

    const [y, m] = form.dueDate.split("-").map(Number);
    const body = { title: form.title.trim(), dueDate: form.dueDate, notes: form.notes.trim(), ...(form.totalAmount !== "" ? { totalAmount: Number(form.totalAmount) } : {}) };

    setSaving(true);
    try {
      if (modal.row) await api.put(`/compliance/${modal.row._id}`, body);
      else await api.post("/compliance", { ...body, type: "labour", month: m, year: y });
      toast.success("Saved.");
      setModal(null);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to save the task.");
    } finally {
      setSaving(false);
    }
  };

  const remove = (r) =>
    setAsk({
      title: "Delete this task?",
      text: r.title,
      run: async () => {
        try {
          await api.delete(`/compliance/${r._id}`);
          toast.success("Task deleted.");
          load();
        } catch (err) {
          toast.error(err?.response?.data?.message || "Unable to delete.");
        }
      },
    });

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 py-4 space-y-4 antialiased pb-16">
      <PageHeader icon={Scale} title="Labour Compliance" subtitle="Registers, licences, minimum wages, bonus and gratuity: your own due dates in one place." onRefresh={load} busy={loading}>
        <button type="button" onClick={() => openModal()} className={primaryBtn}><Plus size={16} /> Add task</button>
      </PageHeader>

      <FilterTabs tabs={[["tasks", "Tasks", records.length], ["registration", "Registration"]]} value={tab} onChange={setTab} />

      {tab === "tasks" ? (
        <>
          <ErrorBanner message={error} onRetry={load} />
          <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
            {loading ? <ListSkeleton /> : <RecordList records={records} isAdmin={isAdmin} onChanged={load} onEdit={openModal} onDelete={remove} emptyText='No task yet. Click "Add task" to add the first one.' />}
          </div>
        </>
      ) : (
        <RegistrationCard isAdmin={isAdmin} fields={[["labourNumber", "Establishment / licence number", "e.g. LBR/2026/REG/9876"], ["labourAct", "Applicable Act", "e.g. Shops & Establishment Act"]]} />
      )}

      {modal && (
        <Sheet onClose={() => setModal(null)} locked={saving} size="max-w-lg">
          <form onSubmit={save} noValidate className="flex flex-col min-h-0 flex-1">
            <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/70">
              <h3 className="text-base font-bold text-slate-900">{modal.row ? "Edit task" : "New labour task"}</h3>
              <button type="button" onClick={() => !saving && setModal(null)} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer" aria-label="Close"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6 space-y-4">
              <div>
                <Label>Title</Label>
                <input value={form.title} maxLength={150} onChange={(e) => set("title", e.target.value)} className={`${inputClass} ${fieldBorder(errors.title)}`} />
                <FieldError>{errors.title}</FieldError>
                {!modal.row && <div className="flex flex-wrap gap-1.5 mt-2">{IDEAS.map((i) => <button key={i} type="button" onClick={() => set("title", i)} className="px-2.5 py-1 rounded-full border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-[11px] font-semibold text-slate-600 cursor-pointer">{i}</button>)}</div>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Due date</Label>
                  <input type="date" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} className={`${inputClass} ${fieldBorder(errors.dueDate)}`} />
                  <FieldError>{errors.dueDate}</FieldError>
                </div>
                <div>
                  <Label>Amount (₹, optional)</Label>
                  <input type="number" inputMode="decimal" min="0" step="any" value={form.totalAmount} onChange={(e) => set("totalAmount", e.target.value)} className={`${inputClass} ${fieldBorder(errors.totalAmount)}`} />
                  <FieldError>{errors.totalAmount}</FieldError>
                </div>
              </div>
              <div>
                <Label>Notes (optional)</Label>
                <textarea rows={2} value={form.notes} maxLength={500} onChange={(e) => set("notes", e.target.value)} className={`${inputClass} resize-none border-slate-200 focus:border-indigo-500`} />
              </div>
            </div>
            <div className="shrink-0 border-t border-slate-100 bg-white px-5 sm:px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
              <button type="button" onClick={() => setModal(null)} disabled={saving} className="px-5 py-3 sm:py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50">Cancel</button>
              <button type="submit" disabled={saving} className={primaryBtn}>{saving && <Loader2 size={14} className="animate-spin" />}{saving ? "Saving..." : "Save"}</button>
            </div>
          </form>
        </Sheet>
      )}

      {ask && <ConfirmDialog title={ask.title} text={ask.text} label="Delete" danger onConfirm={ask.run} onClose={() => setAsk(null)} />}
    </div>
  );
}
