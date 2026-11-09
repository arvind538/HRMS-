"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, CheckCircle2, Download, Loader2, Percent, Wallet, AlertTriangle } from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { ErrorBanner, StatCard, rupeeShort, inputClass } from "@/components/payroll/ui";
import { EmptyBox, ListSkeleton, PageHeader, Pill, primaryBtn } from "@/components/payroll/common";
import { RecordList, TYPE_LABEL, downloadFile } from "@/components/compliance/shared";

const STATUTORY = ["pf", "esi", "tds", "professional-tax"];
const SHORT = { pf: "PF", esi: "ESI", tds: "TDS", "professional-tax": "Prof. tax" };

const currentFy = () => {
  const d = new Date();
  return d.getMonth() + 1 >= 4 ? d.getFullYear() : d.getFullYear() - 1;
};

export default function StatutoryReportsPage() {
  const { user } = useAuth();
  const isAdmin = String(user?.role || "").toLowerCase() === "admin";
  const fyNow = currentFy();

  const [fy, setFy] = useState(fyNow);
  const [annual, setAnnual] = useState(null);
  const [records, setRecords] = useState([]);
  const [open, setOpen] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [a, r] = await Promise.all([api.get("/compliance/reports/annual", { params: { fy } }), api.get("/compliance")]);
      setAnnual(a.data);
      setRecords(Array.isArray(r.data) ? r.data : []);
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to load the report.");
    } finally {
      setLoading(false);
    }
  }, [fy]);

  useEffect(() => {
    load();
  }, [load]);

  const inFy = useMemo(() => records.filter((r) => { const ym = r.year * 12 + r.month; return ym >= fy * 12 + 4 && ym <= (fy + 1) * 12 + 3; }), [records, fy]);

  const byType = useMemo(
    () =>
      Object.keys(TYPE_LABEL).map((type) => {
        const items = inFy.filter((r) => r.type === type);
        const filed = items.filter((r) => r.status === "filed");
        const overdue = items.filter((r) => r.status === "overdue").length;
        const onTime = filed.filter((r) => r.filedDate && new Date(r.filedDate) <= new Date(r.dueDate)).length;
        return { type, items, filed: filed.length, pending: items.filter((r) => r.status === "pending").length, overdue, onTime, paid: filed.reduce((s, r) => s + (Number(r.paidAmount) || 0), 0) };
      }),
    [inFy]
  );

  const all = byType.reduce((s, t) => ({ filed: s.filed + t.filed, overdue: s.overdue + t.overdue, onTime: s.onTime + t.onTime }), { filed: 0, overdue: 0, onTime: 0 });
  const denom = all.filed + all.overdue;
  const rate = denom ? Math.round((all.onTime / denom) * 100) : null;

  const download = async () => {
    setBusy(true);
    await downloadFile("/compliance/reports/annual", { fy, format: "csv" }, `Statutory_Summary_FY${fy}.csv`);
    setBusy(false);
  };

  const years = Array.from({ length: 5 }, (_, i) => fyNow - i);

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 py-4 space-y-4 antialiased pb-16">
      <PageHeader icon={BarChart3} title="Statutory Reports" subtitle="Month-wise PF, ESI, TDS and PT payable, and how well the filings were done." onRefresh={load} busy={loading}>
        <select value={fy} onChange={(e) => setFy(Number(e.target.value))} className={`${inputClass} !w-auto cursor-pointer border-slate-200`}>
          {years.map((y) => <option key={y} value={y}>FY {y}-{String(y + 1).slice(2)}</option>)}
        </select>
        <button type="button" onClick={download} disabled={busy || loading} className={primaryBtn}>{busy ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Export CSV</button>
      </PageHeader>

      <ErrorBanner message={error} onRetry={load} />

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden"><ListSkeleton /></div>
      ) : annual ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatCard icon={Wallet} tone="indigo" label="PF payable" value={rupeeShort(annual.totals.pf)} sub={`FY ${annual.label}`} />
            <StatCard icon={Wallet} tone="emerald" label="ESI payable" value={rupeeShort(annual.totals.esi)} />
            <StatCard icon={Wallet} tone="rose" label="TDS" value={rupeeShort(annual.totals.tds)} />
            <StatCard icon={Percent} tone={rate === null || rate >= 80 ? "emerald" : "amber"} label="Filed on time" value={rate === null ? "—" : `${rate}%`} sub={`${all.filed} filed, ${all.overdue} overdue`} />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
            <p className="px-4 sm:px-5 py-3 border-b border-slate-100 text-xs font-bold text-slate-700">Month-wise payable</p>
            {annual.months.every((m) => !m.payslips) ? (
              <EmptyBox icon={BarChart3} title="No payslips in this year" text="The amounts come from the payslips. Generate and process payroll first." />
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 sm:p-4 lg:hidden">
                  {annual.months.map((m) => (
                    <div key={m.label} className="rounded-2xl border border-slate-200 p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2"><p className="text-sm font-bold text-slate-900">{m.label}</p><Pill tone={!m.payslips ? "slate" : m.ready ? "emerald" : "amber"}>{!m.payslips ? "No payslips" : m.ready ? "Final" : "Draft left"}</Pill></div>
                      <div className="grid grid-cols-2 gap-2">
                        {STATUTORY.map((t) => <div key={t} className="rounded-xl bg-slate-50 py-2 px-2.5"><p className="text-[10px] font-bold uppercase text-slate-400">{SHORT[t]}</p><p className="text-xs font-bold text-slate-800">{rupeeShort(m[t].payable)}</p></div>)}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600 border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase"><tr><th className="px-5 py-3.5">Month</th><th className="px-4 py-3.5">Payslips</th>{STATUTORY.map((t) => <th key={t} className="px-4 py-3.5 text-right">{SHORT[t]}</th>)}<th className="px-4 py-3.5">Payslips</th></tr></thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {annual.months.map((m) => (
                        <tr key={m.label} className="hover:bg-indigo-50/40 transition-colors">
                          <td className="px-5 py-3 font-sans font-bold text-slate-900">{m.label}</td>
                          <td className="px-4 py-3">{m.payslips}</td>
                          {STATUTORY.map((t) => <td key={t} className="px-4 py-3 text-right">{m[t].payable ? rupeeShort(m[t].payable) : "—"}</td>)}
                          <td className="px-4 py-3 font-sans"><Pill tone={!m.payslips ? "slate" : m.ready ? "emerald" : "amber"}>{!m.payslips ? "None" : m.ready ? "Final" : "Draft left"}</Pill></td>
                        </tr>
                      ))}
                      <tr className="bg-slate-50 font-extrabold text-slate-900"><td className="px-5 py-3 font-sans">Total</td><td className="px-4 py-3" />{STATUTORY.map((t) => <td key={t} className="px-4 py-3 text-right">{rupeeShort(annual.totals[t])}</td>)}<td /></tr>
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
            <p className="px-4 sm:px-5 py-3 border-b border-slate-100 text-xs font-bold text-slate-700">Filing status by type</p>
            <ul className="divide-y divide-slate-100">
              {byType.map((t) => (
                <li key={t.type}>
                  <button type="button" onClick={() => setOpen(open === t.type ? "" : t.type)} className="w-full p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-4 text-left hover:bg-slate-50/70 transition cursor-pointer">
                    <p className="sm:w-56 text-sm font-bold text-slate-900">{TYPE_LABEL[t.type]}</p>
                    <div className="flex flex-wrap items-center gap-2 flex-1">
                      <Pill tone="emerald">{t.filed} filed</Pill><Pill tone="amber">{t.pending} pending</Pill>{t.overdue > 0 && <Pill tone="rose">{t.overdue} overdue</Pill>}
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-700">{rupeeShort(t.paid)} paid</span>
                  </button>
                  {open === t.type && <div className="border-t border-slate-100 bg-slate-50/40"><RecordList records={t.items} isAdmin={isAdmin} onChanged={load} emptyText="No record in this year." /></div>}
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : null}
    </div>
  );
}











