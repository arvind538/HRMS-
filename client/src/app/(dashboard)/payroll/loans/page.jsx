"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Landmark, Plus, Pencil, Trash2, Check, X, Loader2, IndianRupee, Clock, CheckCircle2, Info } from "lucide-react";
import { toast } from "react-toastify";
import api from "@/lib/api";
import { Avatar, ConfirmDialog, ErrorBanner, FieldError, Label, Sheet, StatCard, cleanText, fieldBorder, inputClass, rupee, rupeeShort } from "@/components/payroll/ui";
import { EmployeeSelect, EmptyBox, FilterTabs, ListSkeleton, PageHeader, PeriodFields, Pill, SearchBox, monthYear, primaryBtn, useEmployeeOptions } from "@/components/payroll/common";

const TYPES = [["SALARY_ADVANCE", "Salary advance"], ["COMPANY_LOAN", "Company loan"], ["EMERGENCY_AID", "Emergency aid"]];
const TYPE_LABEL = Object.fromEntries(TYPES);
const TONE = { PENDING: "amber", ACTIVE: "emerald", COMPLETED: "indigo", REJECTED: "rose" };
const TABS = ["PENDING", "ACTIVE", "COMPLETED", "REJECTED"];
const idOf = (v) => String(v?._id || v || "");

export default function LoansPage() {
  const employees = useEmployeeOptions();
  const now = new Date();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");

  const blank = () => ({ employeeId: "", type: "SALARY_ADVANCE", amount: "", emiMonths: "3", firstEmiMonth: now.getMonth() + 1, firstEmiYear: now.getFullYear(), reason: "", status: "ACTIVE" });
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(blank());
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [ask, setAsk] = useState(null);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/payroll/loans");
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to load the loans. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const c = { all: rows.length };
    TABS.forEach((s) => (c[s] = rows.filter((r) => r.status === s).length));
    return c;
  }, [rows]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => (tab === "all" || r.status === tab) && (!q || `${r.employee?.name || ""} ${r.employee?.employeeId || ""} ${r.reason || ""}`.toLowerCase().includes(q)));
  }, [rows, tab, search]);

  const stats = useMemo(() => {
    const live = rows.filter((r) => r.status === "ACTIVE");
    return {
      principal: live.reduce((s, r) => s + (r.principal || 0), 0),
      outstanding: live.reduce((s, r) => s + (r.remainingBalance || 0), 0),
      monthly: live.reduce((s, r) => s + Math.min(r.monthlyEmi || 0, r.remainingBalance || 0), 0),
    };
  }, [rows]);

  const recovered = (r) => Math.max(0, (r.principal || 0) - (r.remainingBalance || 0));
  const emiStart = (r) => (r.firstEmiMonth && r.firstEmiYear ? monthYear(r.firstEmiMonth, r.firstEmiYear) : "Month of approval");

  const openModal = (row = null) => {
    setForm(
      row
        ? { employeeId: idOf(row.employee), type: row.type, amount: String(row.principal), emiMonths: String(row.emiMonths), firstEmiMonth: row.firstEmiMonth || now.getMonth() + 1, firstEmiYear: row.firstEmiYear || now.getFullYear(), reason: row.reason || "", status: row.status }
        : blank()
    );
    setErrors({});
    setModal({ row });
  };

  const setField = (key, value) => {
    setForm((p) => ({ ...p, [key]: value }));
    setErrors((p) => (p[key] ? { ...p, [key]: undefined } : p));
  };

  const moneyLocked = modal?.row && recovered(modal.row) > 0;
  const emiPreview = Number(form.amount) > 0 && Number(form.emiMonths) > 0 ? Math.ceil(Number(form.amount) / Number(form.emiMonths)) : 0;

  const save = async (e) => {
    e.preventDefault();
    if (saving) return;
    const next = {};
    if (!modal.row && !form.employeeId) next.employeeId = "Please select an employee.";
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) next.amount = "Enter a valid amount.";
    else if (amount > 10000000) next.amount = "This amount is too high. Please check it.";
    const months = Number(form.emiMonths);
    if (!Number.isInteger(months) || months < 1 || months > 36) next.emiMonths = "Enter 1 to 36 months.";
    if (form.reason.trim().length < 3) next.reason = "Please enter the reason.";
    setErrors(next);
    if (Object.keys(next).length) return;

    const payload = { type: form.type, amount, emiMonths: months, firstEmiMonth: form.firstEmiMonth, firstEmiYear: form.firstEmiYear, reason: form.reason.trim() };
    if (moneyLocked) {
      delete payload.amount;
      delete payload.emiMonths;
      delete payload.firstEmiMonth;
      delete payload.firstEmiYear;
    }

    setSaving(true);
    try {
      if (modal.row) await api.put(`/payroll/loans/${modal.row._id}`, payload);
      else await api.post("/payroll/loans", { ...payload, employeeId: form.employeeId, status: form.status });
      toast.success(modal.row ? "Loan updated." : "Loan saved.");
      setModal(null);
      load({ silent: true });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to save the loan.");
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (r, status, okText) => {
    setBusyId(r._id);
    try {
      await api.put(`/payroll/loans/${r._id}/status`, { status });
      toast.success(okText);
      await load({ silent: true });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to change the status.");
    } finally {
      setBusyId("");
    }
  };

  const complete = (r) =>
    setAsk({
      title: "Mark this loan as completed?",
      text: `${r.employee?.name}: the remaining ${rupee(r.remainingBalance)} will not be cut from the salary any more.`,
      label: "Mark Completed",
      danger: false,
      run: () => setStatus(r, "COMPLETED", "Loan completed."),
    });

  const remove = (r) =>
    setAsk({
      title: "Delete this loan?",
      text: `${r.employee?.name}: ${rupee(r.principal)}. This cannot be undone.`,
      label: "Delete",
      danger: true,
      run: async () => {
        try {
          await api.delete(`/payroll/loans/${r._id}`);
          toast.success("Loan deleted.");
          await load({ silent: true });
        } catch (err) {
          toast.error(err?.response?.data?.message || "Unable to delete the loan.");
        }
      },
    });

  const empCell = (r, size) => (
    <div className="flex items-center gap-3 min-w-0">
      <Avatar name={r.employee?.name} size={size} />
      <div className="min-w-0">
        <p className="text-sm font-bold text-slate-900 truncate">{r.employee?.name || "Unknown"}</p>
        <p className="text-[11px] text-slate-500 truncate">{[r.employee?.employeeId, cleanText(r.employee?.department)].filter(Boolean).join(" • ") || "—"}</p>
      </div>
    </div>
  );

  const progress = (r) => {
    const pct = r.principal ? Math.min(100, Math.round((recovered(r) / r.principal) * 100)) : 0;
    return (
      <div className="min-w-[120px]">
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} /></div>
        <p className="text-[10px] text-slate-400 mt-1">{rupeeShort(recovered(r))} of {rupeeShort(r.principal)} recovered</p>
      </div>
    );
  };

  const actions = (r) => {
    if (busyId === r._id) return <Loader2 size={18} className="animate-spin text-indigo-600" />;
    const icon = "inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 transition cursor-pointer";
    return (
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        {r.status === "PENDING" && (
          <>
            <button type="button" onClick={() => setStatus(r, "ACTIVE", "Loan approved. The EMI starts from the chosen month.")} className="inline-flex items-center gap-1 px-3 h-9 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer"><Check size={13} /> Approve</button>
            <button type="button" onClick={() => setStatus(r, "REJECTED", "Loan rejected.")} className="inline-flex items-center gap-1 px-3 h-9 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition cursor-pointer"><X size={13} /> Reject</button>
          </>
        )}
        {r.status === "ACTIVE" && (
          <button type="button" onClick={() => complete(r)} className="inline-flex items-center gap-1 px-3 h-9 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition cursor-pointer"><CheckCircle2 size={13} /> Completed</button>
        )}
        {r.status === "REJECTED" && (
          <button type="button" onClick={() => setStatus(r, "PENDING", "Moved back to pending.")} className="inline-flex items-center gap-1 px-3 h-9 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition cursor-pointer">Reopen</button>
        )}
        {r.status !== "COMPLETED" && <button type="button" onClick={() => openModal(r)} className={`${icon} hover:text-indigo-600 hover:bg-indigo-50`} aria-label="Edit"><Pencil size={15} /></button>}
        <button type="button" onClick={() => remove(r)} className={`${icon} hover:text-rose-600 hover:bg-rose-50`} aria-label="Delete"><Trash2 size={15} /></button>
      </div>
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 py-4 space-y-4 antialiased pb-16">
      <PageHeader icon={Landmark} title="Loans & Salary Advance" subtitle="The EMI is cut in the payslip every month, from the month you choose." onRefresh={() => load({ silent: true })} busy={loading || refreshing}>
        <button type="button" onClick={() => openModal(null)} className={primaryBtn}><Plus size={16} /> Add Loan / Advance</button>
      </PageHeader>

      <div className="flex items-start gap-2.5 px-4 py-3 rounded-2xl bg-indigo-50/60 border border-indigo-100 text-indigo-900 text-xs">
        <Info size={15} className="shrink-0 mt-0.5 text-indigo-500" />
        <p className="font-medium">Only an <b>Active</b> loan is cut. The EMI is never more than the salary that is left, and the loan becomes <b>Completed</b> when the balance reaches 0 (when the payslip is paid).</p>
      </div>

      {!loading && !error && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard icon={IndianRupee} tone="indigo" label="Active principal" value={rupeeShort(stats.principal)} />
          <StatCard icon={Clock} tone="rose" label="Outstanding" value={rupeeShort(stats.outstanding)} />
          <StatCard icon={IndianRupee} tone="amber" label="EMI per month" value={rupeeShort(stats.monthly)} sub="Active loans" />
          <StatCard icon={CheckCircle2} tone="emerald" label="Active loans" value={counts.ACTIVE || 0} />
        </div>
      )}

      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/70 shadow-sm space-y-3">
        <SearchBox value={search} onChange={setSearch} placeholder="Search employee, ID or reason" />
        <FilterTabs tabs={[["all", "All", counts.all], ...TABS.map((s) => [s, s.charAt(0) + s.slice(1).toLowerCase(), counts[s]])]} value={tab} onChange={setTab} />
      </div>

      <ErrorBanner message={error} onRetry={() => load()} />

      <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
        {loading ? <ListSkeleton /> : visible.length === 0 ? (
          <EmptyBox icon={Landmark} title={rows.length === 0 ? "No loans yet" : "Nothing matches your search"} text={rows.length === 0 ? 'Click "Add Loan / Advance" to add the first one.' : "Try another keyword or status."} />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 sm:p-4 lg:hidden">
              {visible.map((r) => (
                <div key={r._id} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">{empCell(r, "w-10 h-10")}<Pill tone={TONE[r.status]}>{r.status}</Pill></div>
                  <p className="text-[11px] text-slate-500">{TYPE_LABEL[r.type] || r.type} • {r.reason}</p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {[["Principal", rupeeShort(r.principal)], ["EMI", rupeeShort(r.monthlyEmi)], ["Balance", rupeeShort(r.remainingBalance)]].map(([l, v]) => (
                      <div key={l} className="rounded-xl bg-slate-50 py-2 px-1 min-w-0"><p className="text-[10px] font-bold uppercase text-slate-400">{l}</p><p className="text-xs font-bold text-slate-800 truncate">{v}</p></div>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-400">{r.emiMonths} months • EMI from {emiStart(r)}</p>
                  {progress(r)}
                  {actions(r)}
                </div>
              ))}
            </div>

            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase">
                  <tr>
                    <th className="px-5 py-3.5">Employee</th><th className="px-4 py-3.5">Type & reason</th><th className="px-4 py-3.5">Principal</th><th className="px-4 py-3.5">EMI</th><th className="px-4 py-3.5">Recovered</th><th className="px-4 py-3.5">Balance</th><th className="px-4 py-3.5">Status</th><th className="px-4 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visible.map((r) => (
                    <tr key={r._id} className="hover:bg-indigo-50/40 transition-colors">
                      <td className="px-5 py-3.5">{empCell(r, "w-9 h-9")}</td>
                      <td className="px-4 py-3.5 max-w-[200px]"><p className="font-semibold text-slate-800 truncate">{TYPE_LABEL[r.type] || r.type}</p><p className="text-[11px] text-slate-400 truncate">{r.reason}</p></td>
                      <td className="px-4 py-3.5 font-bold text-slate-900 whitespace-nowrap">{rupee(r.principal)}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap"><span className="font-bold text-rose-600">{rupee(r.monthlyEmi)}</span><span className="block text-[10px] text-slate-400">{r.emiMonths} months from {emiStart(r)}</span></td>
                      <td className="px-4 py-3.5">{progress(r)}</td>
                      <td className="px-4 py-3.5 font-semibold whitespace-nowrap">{rupee(r.remainingBalance)}</td>
                      <td className="px-4 py-3.5"><Pill tone={TONE[r.status]}>{r.status}</Pill></td>
                      <td className="px-4 py-3.5">{actions(r)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {modal && (
        <Sheet onClose={() => setModal(null)} locked={saving} size="max-w-lg">
          <form onSubmit={save} noValidate className="flex flex-col min-h-0 flex-1">
            <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/70">
              <div className="min-w-0"><h3 className="text-base font-bold text-slate-900">{modal.row ? "Edit Loan" : "New Loan / Advance"}</h3><p className="text-xs text-slate-400">The EMI is cut from the salary every month.</p></div>
              <button type="button" onClick={() => !saving && setModal(null)} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer" aria-label="Close"><X size={18} /></button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6 space-y-4">
              <EmployeeSelect value={form.employeeId} onChange={(v) => setField("employeeId", v)} options={employees} error={errors.employeeId} disabled={Boolean(modal.row)} />

              {moneyLocked && <p className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">EMI is already recovered, so the amount, months and start month cannot be changed.</p>}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Type</Label>
                  <select value={form.type} onChange={(e) => setField("type", e.target.value)} className={`${inputClass} cursor-pointer border-slate-200 focus:border-indigo-500`}>
                    {TYPES.map(([v, l]) => (<option key={v} value={v}>{l}</option>))}
                  </select>
                </div>
                <div>
                  <Label>Amount (₹)</Label>
                  <input type="number" inputMode="decimal" min="1" step="any" disabled={moneyLocked} value={form.amount} onChange={(e) => setField("amount", e.target.value)} placeholder="e.g. 25000" className={`${inputClass} disabled:opacity-60 ${fieldBorder(errors.amount)}`} />
                  <FieldError>{errors.amount}</FieldError>
                </div>
                <div>
                  <Label>Number of EMIs (months)</Label>
                  <input type="number" inputMode="numeric" min="1" max="36" disabled={moneyLocked} value={form.emiMonths} onChange={(e) => setField("emiMonths", e.target.value)} className={`${inputClass} disabled:opacity-60 ${fieldBorder(errors.emiMonths)}`} />
                  <FieldError>{errors.emiMonths}</FieldError>
                </div>
                {!modal.row && (
                  <div>
                    <Label>Status</Label>
                    <select value={form.status} onChange={(e) => setField("status", e.target.value)} className={`${inputClass} cursor-pointer border-slate-200 focus:border-indigo-500`}>
                      <option value="ACTIVE">Active (approved)</option>
                      <option value="PENDING">Pending (needs approval)</option>
                    </select>
                  </div>
                )}
              </div>

              <PeriodFields label="First EMI is cut in the payslip of" month={form.firstEmiMonth} year={form.firstEmiYear} onMonth={(v) => setField("firstEmiMonth", v)} onYear={(v) => setField("firstEmiYear", v)} disabled={moneyLocked} />

              {emiPreview > 0 && <p className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">EMI: {rupee(emiPreview)} per month. The last EMI is cut down to the remaining balance.</p>}

              <div>
                <Label>Reason</Label>
                <textarea rows={2} value={form.reason} maxLength={300} onChange={(e) => setField("reason", e.target.value)} placeholder="e.g. Medical emergency" className={`${inputClass} resize-none ${fieldBorder(errors.reason)}`} />
                <FieldError>{errors.reason}</FieldError>
              </div>
            </div>

            <div className="shrink-0 border-t border-slate-100 bg-white px-5 sm:px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
              <button type="button" onClick={() => setModal(null)} disabled={saving} className="px-5 py-3 sm:py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50">Cancel</button>
              <button type="submit" disabled={saving} className={primaryBtn}>{saving && <Loader2 size={14} className="animate-spin" />}{saving ? "Saving..." : modal.row ? "Save Changes" : "Save Loan"}</button>
            </div>
          </form>
        </Sheet>
      )}

      {ask && <ConfirmDialog title={ask.title} text={ask.text} label={ask.label} danger={ask.danger} onConfirm={ask.run} onClose={() => setAsk(null)} />}
    </div>
  );
}

