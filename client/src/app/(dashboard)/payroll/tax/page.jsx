"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Percent, Pencil, Loader2, X, Coins, IndianRupee, Scale, ShieldCheck, Info } from "lucide-react";
import { toast } from "react-toastify";
import api from "@/lib/api";
import { Avatar, ErrorBanner, FieldError, Label, Sheet, StatCard, cleanText, fieldBorder, inputClass, rupee, rupeeShort } from "@/components/payroll/ui";
import { EmptyBox, FilterTabs, ListSkeleton, PageHeader, PeriodFields, Pill, SearchBox, monthYear, primaryBtn } from "@/components/payroll/common";

const blank = { employeeId: "", regime: "NEW", panNumber: "", section80C: "", section80D: "", hraExemption: "", otherExemptions: "" };

export default function TaxTDS() {
  const now = new Date();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");

  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(blank);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [applyOpen, setApplyOpen] = useState(false);
  const [period, setPeriod] = useState({ month: now.getMonth() + 1, year: now.getFullYear() });
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState(null);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/payroll/tax-tds");
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to load the tax details. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => ({ all: rows.length, NEW: rows.filter((r) => r.regime === "NEW").length, OLD: rows.filter((r) => r.regime === "OLD").length }), [rows]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => (tab === "all" || r.regime === tab) && (!q || `${r.employee?.name || ""} ${r.employee?.employeeId || ""} ${r.panNumber || ""}`.toLowerCase().includes(q)));
  }, [rows, tab, search]);

  const totalMonthly = useMemo(() => rows.reduce((s, r) => s + (r.monthlyTDS || 0), 0), [rows]);
  const totalAnnual = useMemo(() => rows.reduce((s, r) => s + (r.annualTax || 0), 0), [rows]);

  const openModal = (r) => {
    setForm({
      employeeId: r.employee?._id || "",
      regime: r.regime || "NEW",
      panNumber: r.panNumber === "PENDING" ? "" : r.panNumber || "",
      section80C: r.section80C ? String(r.section80C) : "",
      section80D: r.section80D ? String(r.section80D) : "",
      hraExemption: r.hraExemption ? String(r.hraExemption) : "",
      otherExemptions: r.otherExemptions ? String(r.otherExemptions) : "",
    });
    setErrors({});
    setModal({ row: r });
  };

  const setField = (key, value) => {
    setForm((p) => ({ ...p, [key]: value }));
    setErrors((p) => (p[key] ? { ...p, [key]: undefined } : p));
  };

  const save = async (e) => {
    e.preventDefault();
    if (saving) return;
    const next = {};
    const pan = form.panNumber.trim().toUpperCase();
    if (pan && !/^[A-Z]{5}\d{4}[A-Z]$/.test(pan)) next.panNumber = "PAN must look like ABCDE1234F.";
    ["section80C", "section80D", "hraExemption", "otherExemptions"].forEach((k) => {
      if (form[k] !== "" && (!Number.isFinite(Number(form[k])) || Number(form[k]) < 0)) next[k] = "Enter a valid amount.";
    });
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      await api.post("/payroll/tax-tds", {
        employeeId: form.employeeId,
        regime: form.regime,
        panNumber: pan,
        section80C: Number(form.section80C) || 0,
        section80D: Number(form.section80D) || 0,
        hraExemption: Number(form.hraExemption) || 0,
        otherExemptions: Number(form.otherExemptions) || 0,
      });
      toast.success("Tax declaration saved.");
      setModal(null);
      load({ silent: true });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to save the declaration.");
    } finally {
      setSaving(false);
    }
  };

  const apply = async () => {
    if (applying) return;
    setApplying(true);
    try {
      const { data } = await api.post("/payroll/tax-tds/apply", period);
      setApplyResult(data);
      toast.success(data.message);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to add the TDS.");
    } finally {
      setApplying(false);
    }
  };

  const closeApply = () => {
    if (applying) return;
    setApplyOpen(false);
    setApplyResult(null);
  };

  const numField = (key, label) => (
    <div>
      <Label>{label}</Label>
      <input type="number" inputMode="decimal" min="0" step="any" value={form[key]} onChange={(e) => setField(key, e.target.value)} placeholder="0" className={`${inputClass} font-mono ${fieldBorder(errors[key])}`} />
      <FieldError>{errors[key]}</FieldError>
    </div>
  );

  const regimePill = (r) => <Pill tone={r.regime === "NEW" ? "indigo" : "amber"}>{r.regime} regime</Pill>;
  const empCell = (r, size) => (
    <div className="flex items-center gap-3 min-w-0">
      <Avatar name={r.employee?.name} size={size} />
      <div className="min-w-0">
        <p className="text-sm font-bold text-slate-900 truncate">{r.employee?.name || "Unknown"}</p>
        <p className="text-[11px] text-slate-500 truncate font-mono">{[r.employee?.employeeId, r.panNumber].filter(Boolean).join(" • ")}</p>
      </div>
    </div>
  );
  const editBtn = (r, cls = "") => (
    <button type="button" onClick={() => openModal(r)} className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 rounded-lg text-xs font-bold border border-slate-200 transition cursor-pointer ${cls}`}>
      <Pencil size={13} /> Edit
    </button>
  );

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 py-4 space-y-4 antialiased pb-16">
      <PageHeader icon={Percent} title="Income Tax & TDS" subtitle="Tax regime, declared deductions and the monthly TDS of every employee." onRefresh={() => load({ silent: true })} busy={loading || refreshing}>
        <button type="button" onClick={() => setApplyOpen(true)} disabled={!rows.length} className={primaryBtn}><ShieldCheck size={16} /> Apply TDS to payroll</button>
      </PageHeader>

      <div className="flex items-start gap-2.5 px-4 py-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
        <Info size={15} className="shrink-0 mt-0.5 text-amber-600" />
        <p className="font-medium">These are <b>estimates</b> from the standard slabs and the salary on the employee profile. Please confirm the rates and each person&apos;s declaration with your CA before you rely on them. <b>Apply TDS to payroll</b> adds the monthly amount as a deduction, which is then cut in that month&apos;s payslip.</p>
      </div>

      {!loading && !error && rows.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard icon={Coins} tone="rose" label="TDS per month" value={rupeeShort(totalMonthly)} />
          <StatCard icon={IndianRupee} tone="indigo" label="Annual tax" value={rupeeShort(totalAnnual)} />
          <StatCard icon={Scale} tone="emerald" label="New / Old regime" value={`${counts.NEW} / ${counts.OLD}`} />
          <StatCard icon={Percent} tone="violet" label="Employees" value={rows.length} />
        </div>
      )}

      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/70 shadow-sm space-y-3">
        <SearchBox value={search} onChange={setSearch} placeholder="Search name, ID or PAN" />
        <FilterTabs tabs={[["all", "All", counts.all], ["NEW", "New regime", counts.NEW], ["OLD", "Old regime", counts.OLD]]} value={tab} onChange={setTab} />
      </div>

      <ErrorBanner message={error} onRetry={() => load()} />

      <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
        {loading ? <ListSkeleton /> : visible.length === 0 ? (
          <EmptyBox icon={Percent} title={rows.length === 0 ? "No employee with a salary" : "Nothing matches your search"} text={rows.length === 0 ? "Set the monthly salary in Employee Salary first." : "Try another keyword or regime."} />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 sm:p-4 lg:hidden">
              {visible.map((r) => (
                <div key={r._id} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">{empCell(r, "w-10 h-10")}{regimePill(r)}</div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {[["Annual pay", rupeeShort(r.annualGross)], ["Annual tax", rupeeShort(r.annualTax)], ["TDS / month", rupeeShort(r.monthlyTDS)]].map(([l, v]) => (
                      <div key={l} className="rounded-xl bg-slate-50 py-2 px-1 min-w-0"><p className="text-[10px] font-bold uppercase text-slate-400">{l}</p><p className="text-xs font-bold text-slate-800 truncate">{v}</p></div>
                    ))}
                  </div>
                  {editBtn(r, "w-full")}
                </div>
              ))}
            </div>

            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase">
                  <tr><th className="px-5 py-3.5">Employee</th><th className="px-4 py-3.5">Regime</th><th className="px-4 py-3.5">Annual pay</th><th className="px-4 py-3.5">Exemptions</th><th className="px-4 py-3.5">Taxable income</th><th className="px-4 py-3.5">Annual tax</th><th className="px-4 py-3.5">TDS / month</th><th className="px-4 py-3.5 text-right">Action</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visible.map((r) => (
                    <tr key={r._id} className="hover:bg-indigo-50/40 transition-colors">
                      <td className="px-5 py-3.5">{empCell(r, "w-9 h-9")}</td>
                      <td className="px-4 py-3.5">{regimePill(r)}</td>
                      <td className="px-4 py-3.5 font-semibold whitespace-nowrap">{rupee(r.annualGross)}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap">{rupee(r.exemptionsDeclared)}{r.regime === "OLD" && <span className="block text-[10px] text-slate-400">80C {rupeeShort(r.section80C)}</span>}</td>
                      <td className="px-4 py-3.5 font-bold text-slate-900 whitespace-nowrap">{rupee(r.taxableIncome)}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap">{rupee(r.annualTax)}</td>
                      <td className="px-4 py-3.5 font-extrabold text-rose-600 whitespace-nowrap">{rupee(r.monthlyTDS)}</td>
                      <td className="px-4 py-3.5 text-right">{editBtn(r)}</td>
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
              <div className="min-w-0"><h3 className="text-base font-bold text-slate-900">Tax declaration</h3><p className="text-xs text-slate-400 truncate">{modal.row.employee?.name} {modal.row.employee?.employeeId ? `· ${modal.row.employee.employeeId}` : ""}</p></div>
              <button type="button" onClick={() => !saving && setModal(null)} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer" aria-label="Close"><X size={18} /></button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Tax regime</Label>
                  <select value={form.regime} onChange={(e) => setField("regime", e.target.value)} className={`${inputClass} cursor-pointer border-slate-200 focus:border-indigo-500`}>
                    <option value="NEW">New regime</option>
                    <option value="OLD">Old regime</option>
                  </select>
                </div>
                <div>
                  <Label>PAN</Label>
                  <input value={form.panNumber} maxLength={10} onChange={(e) => setField("panNumber", e.target.value.toUpperCase())} placeholder="ABCDE1234F" className={`${inputClass} font-mono uppercase ${fieldBorder(errors.panNumber)}`} />
                  <FieldError>{errors.panNumber}</FieldError>
                </div>
              </div>

              {form.regime === "OLD" ? (
                <div className="space-y-3 p-4 bg-amber-50/50 rounded-2xl border border-amber-200/60">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-amber-900">Declared deductions (old regime)</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {numField("section80C", "Section 80C (max ₹1,50,000)")}
                    {numField("section80D", "Section 80D (health)")}
                    {numField("hraExemption", "HRA exemption")}
                    {numField("otherExemptions", "Other exemptions")}
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-indigo-800 bg-indigo-50 border border-indigo-100 rounded-2xl p-4">The new regime has a standard deduction of ₹75,000 and a tax rebate. No itemised declaration is needed.</p>
              )}
            </div>

            <div className="shrink-0 border-t border-slate-100 bg-white px-5 sm:px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
              <button type="button" onClick={() => setModal(null)} disabled={saving} className="px-5 py-3 sm:py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50">Cancel</button>
              <button type="submit" disabled={saving} className={primaryBtn}>{saving && <Loader2 size={14} className="animate-spin" />}{saving ? "Saving..." : "Save Declaration"}</button>
            </div>
          </form>
        </Sheet>
      )}

      {applyOpen && (
        <Sheet onClose={closeApply} locked={applying} size="max-w-md">
          <div className="p-5 sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Apply TDS to payroll</h3>
              <p className="text-xs text-slate-500 mt-1">The monthly TDS of everyone is added as a deduction for the month you choose. Employees whose payslip is already processed or paid, or who already have a TDS entry, are skipped.</p>
            </div>

            {!applyResult ? (
              <PeriodFields label="For the payslip of" month={period.month} year={period.year} onMonth={(v) => setPeriod((p) => ({ ...p, month: v }))} onYear={(v) => setPeriod((p) => ({ ...p, year: v }))} disabled={applying} />
            ) : (
              <div className="space-y-3">
                <p className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-sm font-bold text-emerald-800">{applyResult.message}</p>
                {applyResult.inDraft > 0 && <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">{applyResult.inDraft} of them already have a draft payslip. Open Payroll and choose <b>Recalculate</b> on those drafts.</p>}
                {applyResult.skipped?.length > 0 && (
                  <ul className="divide-y divide-slate-100 max-h-44 overflow-y-auto rounded-2xl border border-slate-200 px-3">
                    {applyResult.skipped.map((s, i) => (
                      <li key={i} className="py-2 text-[11px] flex justify-between gap-3"><span className="font-semibold text-slate-700">{s.name}</span><span className="text-slate-500 text-right">{s.reason}</span></li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
              <button type="button" onClick={closeApply} disabled={applying} className="px-5 py-3 sm:py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50">{applyResult ? "Done" : "Cancel"}</button>
              {!applyResult && (
                <button type="button" onClick={apply} disabled={applying} className={primaryBtn}>{applying && <Loader2 size={14} className="animate-spin" />}{applying ? "Adding..." : `Add TDS for ${monthYear(period.month, period.year)}`}</button>
              )}
            </div>
          </div>
        </Sheet>
      )}
    </div>
  );
}
