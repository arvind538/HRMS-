"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FileSpreadsheet, Download, IndianRupee, Coins, Users, Wallet } from "lucide-react";
import { toast } from "react-toastify";
import api from "@/lib/api";
import { ErrorBanner, StatCard, rupee, rupeeShort, inputClass } from "@/components/payroll/ui";
import { EmptyBox, FilterTabs, ListSkeleton, PageHeader, PeriodFilter, Pill, SearchBox, monthYear, primaryBtn, useEmployeeOptions } from "@/components/payroll/common";

const TONE = { draft: "amber", processed: "blue", paid: "emerald" };

/* a cell for the CSV: quoted, and a leading = + - @ is neutralised so a spreadsheet never runs it as a formula */
const cell = (v) => {
  let s = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

const COLUMNS = [
  ["Employee ID", (r) => r.userId],
  ["Name", (r) => r.userName],
  ["Department", (r) => r.department],
  ["Working days", (r) => r.workingDays],
  ["Present", (r) => r.daysPresent],
  ["Paid leave", (r) => r.daysOnLeave],
  ["Loss of pay days", (r) => r.unpaidDays],
  ["Basic", (r) => r.basic],
  ["Allowances", (r) => r.allowances],
  ["Bonus", (r) => r.bonus],
  ["Gross", (r) => r.gross],
  ["PF", (r) => r.pf],
  ["ESI", (r) => r.esi],
  ["TDS", (r) => r.tds],
  ["Loan EMI", (r) => r.loan],
  ["Loss of pay", (r) => r.lop],
  ["Other deductions", (r) => r.other],
  ["Total deductions", (r) => r.deductions],
  ["Reimbursement", (r) => r.reimbursement],
  ["Net pay", (r) => r.netPay],
  ["Status", (r) => r.status],
];

export default function PayrollReports() {
  const employees = useEmployeeOptions();
  const [month, setMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - 1);
    return d.getMonth() + 1;
  });
  const [year, setYear] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - 1);
    return d.getFullYear();
  });
  const [status, setStatus] = useState("all");
  const [department, setDepartment] = useState("ALL");
  const [search, setSearch] = useState("");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const departments = useMemo(() => [...new Set(employees.map((e) => e.department).filter(Boolean))].sort(), [employees]);

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (month === "ALL" || year === "ALL") return;
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError("");
      try {
        const { data } = await api.get("/payroll/reports", { params: { month, year } });
        setRows(Array.isArray(data) ? data : []);
      } catch (err) {
        setRows([]);
        setError(err?.response?.data?.message || "Unable to compile the register. Please try again.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [month, year]
  );

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => (status === "all" || r.status === status) && (department === "ALL" || r.department === department) && (!q || `${r.userName} ${r.userId}`.toLowerCase().includes(q)));
  }, [rows, status, department, search]);

  const counts = useMemo(() => ({ all: rows.length, draft: rows.filter((r) => r.status === "draft").length, processed: rows.filter((r) => r.status === "processed").length, paid: rows.filter((r) => r.status === "paid").length }), [rows]);

  const totals = useMemo(() => {
    const sum = (k) => visible.reduce((t, r) => t + (Number(r[k]) || 0), 0);
    return { net: sum("netPay"), gross: sum("gross"), ded: sum("deductions"), tds: sum("tds") };
  }, [visible]);

  const exportCSV = () => {
    if (!visible.length) return toast.warn("There is no data to export.");
    const head = COLUMNS.map(([label]) => cell(label)).join(",");
    const body = visible.map((r) => COLUMNS.map(([, get]) => cell(get(r))).join(","));
    const blob = new Blob([`\uFEFF${[head, ...body].join("\n")}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Payroll_Register_${year}-${String(month).padStart(2, "0")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("The CSV file is downloaded.");
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 py-4 space-y-4 antialiased pb-16">
      <PageHeader icon={FileSpreadsheet} title="Payroll Register" subtitle={`Every payslip of ${month === "ALL" || year === "ALL" ? "a month" : monthYear(month, year)} in one place, ready to export.`} onRefresh={() => load({ silent: true })} busy={loading || refreshing}>
        <button type="button" onClick={exportCSV} disabled={!visible.length || loading} className={primaryBtn}><Download size={16} /> Export CSV</button>
      </PageHeader>

      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/70 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <PeriodFilter month={month} year={year} onMonth={setMonth} onYear={setYear} allowAll={false} />
          <select value={department} onChange={(e) => setDepartment(e.target.value)} className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:border-indigo-500 cursor-pointer">
            <option value="ALL">All departments</option>
            {departments.map((d) => (<option key={d} value={d}>{d}</option>))}
          </select>
          <SearchBox value={search} onChange={setSearch} placeholder="Search name or ID" />
        </div>
        <FilterTabs tabs={[["all", "All", counts.all], ["draft", "Draft", counts.draft], ["processed", "Processed", counts.processed], ["paid", "Paid", counts.paid]]} value={status} onChange={setStatus} />
      </div>

      <ErrorBanner message={error} onRetry={() => load()} />

      {!loading && !error && rows.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard icon={Wallet} tone="indigo" label="Gross" value={rupeeShort(totals.gross)} />
          <StatCard icon={IndianRupee} tone="rose" label="Deductions" value={rupeeShort(totals.ded)} />
          <StatCard icon={Coins} tone="amber" label="TDS withheld" value={rupeeShort(totals.tds)} />
          <StatCard icon={Users} tone="emerald" label="Net payout" value={rupeeShort(totals.net)} sub={`${visible.length} payslip${visible.length === 1 ? "" : "s"}`} />
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
        {loading ? <ListSkeleton /> : visible.length === 0 ? (
          <EmptyBox icon={FileSpreadsheet} title={rows.length === 0 ? "No payslips for this month" : "Nothing matches your filters"} text={rows.length === 0 ? "Generate the payslips of this month in Payroll first. Drafts also appear here." : "Try another status, department or keyword."} />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 sm:p-4 lg:hidden">
              {visible.map((r) => (
                <div key={r._id} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0"><p className="text-sm font-bold text-slate-900 truncate">{r.userName}</p><p className="text-[11px] text-slate-500 truncate font-mono">{r.userId} • {r.department}</p></div>
                    <Pill tone={TONE[r.status]}>{r.status}</Pill>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 space-y-1.5 text-xs">
                    {[["Gross", r.gross, ""], ["Bonus", r.bonus, "text-emerald-600"], ["Loss of pay", r.lop, "text-rose-600"], ["TDS", r.tds, "text-amber-600"], ["Loan EMI", r.loan, "text-rose-600"], ["Total deductions", r.deductions, "text-rose-600"]].map(([l, v, c]) => (
                      v > 0 || l === "Gross" || l === "Total deductions" ? <div key={l} className="flex justify-between"><span className="text-slate-500">{l}</span><span className={`font-mono font-semibold ${c || "text-slate-800"}`}>{rupee(v)}</span></div> : null
                    ))}
                    <div className="flex justify-between pt-1.5 border-t border-slate-200 font-bold"><span>Net pay</span><span className="font-mono text-indigo-700">{rupee(r.netPay)}</span></div>
                  </div>
                  <p className="text-[11px] text-slate-400">Present {r.daysPresent}/{r.workingDays}{r.unpaidDays > 0 ? ` • ${r.unpaidDays} LOP` : ""}</p>
                </div>
              ))}
            </div>

            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase">
                  <tr>
                    <th className="px-5 py-3.5">Employee</th><th className="px-3 py-3.5">Days</th><th className="px-3 py-3.5">Basic</th><th className="px-3 py-3.5">Allow.</th><th className="px-3 py-3.5">Bonus</th><th className="px-3 py-3.5">Gross</th><th className="px-3 py-3.5">PF / ESI</th><th className="px-3 py-3.5">TDS</th><th className="px-3 py-3.5">Loan</th><th className="px-3 py-3.5">LOP</th><th className="px-3 py-3.5">Other</th><th className="px-3 py-3.5 text-right">Net pay</th><th className="px-3 py-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {visible.map((r) => (
                    <tr key={r._id} className="hover:bg-indigo-50/40 transition-colors">
                      <td className="px-5 py-3 font-sans"><p className="font-bold text-slate-900 text-sm truncate max-w-[180px]">{r.userName}</p><p className="text-[11px] text-slate-400 truncate max-w-[180px]">{r.userId} • {r.department}</p></td>
                      <td className="px-3 py-3 whitespace-nowrap">{r.daysPresent}/{r.workingDays}</td>
                      <td className="px-3 py-3 whitespace-nowrap">{rupeeShort(r.basic)}</td>
                      <td className="px-3 py-3 whitespace-nowrap">{rupeeShort(r.allowances)}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-emerald-600">{r.bonus > 0 ? `+${rupeeShort(r.bonus)}` : "—"}</td>
                      <td className="px-3 py-3 whitespace-nowrap font-semibold text-slate-800">{rupeeShort(r.gross)}</td>
                      <td className="px-3 py-3 whitespace-nowrap">{rupeeShort(r.pf + r.esi)}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-amber-600">{r.tds > 0 ? rupeeShort(r.tds) : "—"}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-rose-600">{r.loan > 0 ? rupeeShort(r.loan) : "—"}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-rose-600">{r.lop > 0 ? rupeeShort(r.lop) : "—"}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-rose-600">{r.other > 0 ? rupeeShort(r.other) : "—"}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-right font-extrabold text-indigo-700 text-sm">{rupee(r.netPay)}</td>
                      <td className="px-3 py-3 font-sans"><Pill tone={TONE[r.status]}>{r.status}</Pill></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
