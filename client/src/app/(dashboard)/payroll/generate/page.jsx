"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PlayCircle, CheckCircle2, Loader2, AlertCircle, Coins, Eye, ArrowRight, Info, RefreshCw } from "lucide-react";
import { toast } from "react-toastify";
import api from "@/lib/api";
import { Avatar, Label, MONTHS, cleanText, inputClass, rupee } from "@/components/payroll/ui";

const THIS_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => THIS_YEAR + i);

/* ---- helpers (they work even if the API sends the fields under another name) ---- */
const asList = (d, keys) => (Array.isArray(d) ? d : keys.map((k) => d?.[k]).find(Array.isArray) || []);
const idOf = (v) => String((v && typeof v === "object" ? v._id || v.id : v) || "");
const nameOf = (e = {}) =>
  e.name ||
  e.fullName ||
  e.employeeName ||
  [e.firstName, e.middleName, e.lastName].filter(Boolean).join(" ") ||
  (e.email || e.loginEmail || "").split("@")[0] ||
  "Unnamed employee";
const codeOf = (e = {}) => e.employeeId || e.empId || e.employeeCode || e.code || "";
const INACTIVE = /^(inactive|exited|exit|terminated)$/i;

/* the monthly salary: from the salary record if it has one, otherwise from the employee profile */
const salaryOf = (rec, emp) => {
  const fromRecord = Number(rec?.grossMonthly ?? rec?.grossSalary ?? 0) || 0;
  return fromRecord > 0 ? fromRecord : Number(emp?.salary ?? emp?.grossMonthly ?? emp?.monthlySalary ?? 0) || 0;
};

/* why a payslip cannot be generated for this person (empty = fine) */
const blockedFor = (salary, status) => {
  if (!(salary > 0)) return "salary not set";
  if (status && status !== "Active") return `salary ${String(status).toLowerCase()}`;
  return "";
};

const earningLines = (p) =>
  [
    ["Basic Salary", p.basicSalary],
    ["House Rent Allowance", p.allowances?.hra],
    ["Dearness Allowance", p.allowances?.da],
    ["Special Allowance", p.allowances?.special],
    ["Bonus", p.bonus],
    ["Reimbursements (not taxable)", p.reimbursement],
  ].filter(([, amount]) => Number(amount) > 0);

const deductionLines = (p) =>
  [
    ["Provident Fund", p.deductions?.pf],
    ["ESI", p.deductions?.esi],
    ["TDS", p.deductions?.tds],
    ["Loan / Advance Recovery", p.deductions?.loan],
    ["Loss of Pay", p.deductions?.lop],
    ["Other Deductions", p.deductions?.other],
  ].filter(([, amount]) => Number(amount) > 0);

function Lines({ title, tone, lines, total, totalLabel }) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <p className={`text-[11px] font-bold uppercase tracking-wider mb-1 ${tone}`}>{title}</p>
      <div className="divide-y divide-slate-100">
        {lines.length ? (
          lines.map(([label, amount]) => (
            <div key={label} className="flex items-center justify-between gap-3 py-2 text-xs text-slate-600">
              <span className="min-w-0 break-words">{label}</span>
              <span className="font-mono font-semibold text-slate-800 shrink-0">{rupee(amount)}</span>
            </div>
          ))
        ) : (
          <p className="py-3 text-xs text-slate-400">None this month.</p>
        )}
      </div>
      <div className="flex items-center justify-between gap-3 pt-2 mt-1 border-t-2 border-slate-200 text-xs font-bold text-slate-900">
        <span>{totalLabel}</span>
        <span className="font-mono">{rupee(total)}</span>
      </div>
    </div>
  );
}

function Warnings({ list }) {
  if (!list?.length) return null;
  return (
    <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4">
      <p className="text-xs font-bold text-amber-800 mb-1.5">Please check</p>
      <ul className="space-y-1 text-[11px] text-amber-800">
        {list.map((w, i) => (
          <li key={i}>{w}</li>
        ))}
      </ul>
    </div>
  );
}

export default function GeneratePayroll() {
  const router = useRouter();

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
  const [scope, setScope] = useState("all");
  const [employees, setEmployees] = useState([]);
  const [empLoading, setEmpLoading] = useState(true);
  const [empError, setEmpError] = useState("");
  const [employee, setEmployee] = useState("");
  const [fullMonth, setFullMonth] = useState(false);
  const [overwrite, setOverwrite] = useState(false);

  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  /* Every active employee (names come from /employees), joined with the salary records */
  const loadEmployees = useCallback(async () => {
    setEmpLoading(true);
    setEmpError("");

    const [salRes, empRes] = await Promise.allSettled([api.get("/payroll/employee-salaries"), api.get("/employees")]);
    const salaryRows = salRes.status === "fulfilled" ? asList(salRes.value.data, ["salaries", "employeeSalaries", "data", "rows"]) : [];
    const people = empRes.status === "fulfilled" ? asList(empRes.value.data, ["employees", "data"]) : [];

    if (salRes.status === "rejected" && empRes.status === "rejected") {
      setEmployees([]);
      setEmpError(empRes.reason?.response?.data?.message || "Unable to load the employees. Please try again.");
      setEmpLoading(false);
      return;
    }

    const saved = new Map(salaryRows.map((r) => [idOf(r.employee), r]));
    const map = new Map();

    people
      .filter((e) => !INACTIVE.test(e.employeeStatus || ""))
      .forEach((emp) => {
        const id = idOf(emp);
        const rec = saved.get(id);
        const recEmp = rec && typeof rec.employee === "object" ? rec.employee : {};
        const merged = { ...recEmp, ...emp };
        const salary = salaryOf(rec, emp);
        map.set(id, { id, name: nameOf(merged), code: codeOf(merged), salary, blocked: blockedFor(salary, rec?.status) });
      });

    /* salary records whose employee is missing from the employee list (for example a manager's limited view) */
    salaryRows.forEach((r) => {
      const id = idOf(r.employee);
      if (!id || map.has(id)) return;
      const emp = typeof r.employee === "object" ? r.employee : {};
      const salary = salaryOf(r, emp);
      map.set(id, { id, name: nameOf(emp), code: codeOf(emp), salary, blocked: blockedFor(salary, r.status) });
    });

    setEmployees([...map.values()].sort((a, b) => a.name.localeCompare(b.name)));
    setEmpLoading(false);
  }, []);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  useEffect(() => {
    setPreview(null);
    setResult(null);
    setError("");
  }, [month, year, scope, employee, fullMonth, overwrite]);

  const ready = useMemo(() => employees.filter((e) => !e.blocked), [employees]);
  const skippedPeople = employees.length - ready.length;
  const picked = employees.find((e) => e.id === employee) || null;

  const now = new Date();
  const cy = now.getFullYear();
  const cm = now.getMonth() + 1;
  const future = year > cy || (year === cy && month > cm);
  const running = year === cy && month === cm;
  const periodLabel = `${MONTHS[month - 1]} ${year}`;
  const blockedReason = future ? "A future month cannot be generated." : "";
  const needsEmployee = scope === "one" && !employee;

  const runPreview = async () => {
    if (previewing || needsEmployee || future) return;
    setPreviewing(true);
    setError("");
    try {
      const { data } = await api.post("/payroll/preview", {
        employee,
        month: Number(month),
        year: Number(year),
        fullMonth,
      });
      setPreview(data);
    } catch (err) {
      setPreview(null);
      setError(err?.response?.data?.message || "Unable to prepare the preview.");
    } finally {
      setPreviewing(false);
    }
  };

  const generate = async (e) => {
    e.preventDefault();
    if (generating || needsEmployee || future) return;
    setGenerating(true);
    setError("");
    setResult(null);
    try {
      if (scope === "one") {
        const { data } = await api.post("/payroll/generate", { employee, month, year, fullMonth, overwriteDraft: overwrite });
        setResult({ single: true, payroll: data, warnings: data.warnings || [] });
        toast.success("Payslip generated.");
      } else {
        const { data } = await api.post("/payroll/generate-bulk", { month, year, fullMonth, overwriteDrafts: overwrite });
        setResult(data);
        toast.success(data.message || "Payslips generated.");
      }
    } catch (err) {
      const message = err?.response?.data?.message || "Payslip generation failed.";
      setError(message);
      toast.error(message);
    } finally {
      setGenerating(false);
    }
  };

  const made = useMemo(() => [...(result?.results?.created || []), ...(result?.results?.updated || [])], [result]);
  const skipped = result?.results?.skipped || [];
  const warned = made.filter((x) => x.warnings?.length);

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 py-4 space-y-4 antialiased pb-16">
      {/* Header */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm flex items-center gap-3.5">
        <div className="w-11 h-11 sm:w-12 sm:h-12 shrink-0 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20">
          <Coins size={20} />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Generate Payslips</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Create the monthly payslips as drafts. You process and pay them from the Payroll page.</p>
        </div>
      </div>

      {/* How it works */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        {[
          ["1", "Salary and structure", "Takes the monthly salary of the employee profile and splits it by the salary structure."],
          ["2", "Attendance and leave", "Cuts Loss of Pay for absent days. Holidays, weekly offs and paid leave are not cut."],
          ["3", "Bonus, deductions, loan", "Adds approved bonus and claims, and takes the loan EMI and manual deductions of that month."],
        ].map(([n, title, text]) => (
          <div key={n} className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-indigo-300 group">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs group-hover:bg-indigo-600 group-hover:text-white transition-colors">{n}</div>
            <h4 className="font-bold text-slate-800 text-sm mt-2.5">{title}</h4>
            <p className="text-xs text-slate-500 mt-1">{text}</p>
          </div>
        ))}
      </div>

      {/* Form */}
      <form onSubmit={generate} noValidate className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm p-4 sm:p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Payroll Month</Label>
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className={`${inputClass} cursor-pointer border-slate-200 focus:border-indigo-500 bg-white text-slate-800`}>
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1} className="bg-white text-slate-800">{m}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Year</Label>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} className={`${inputClass} cursor-pointer border-slate-200 focus:border-indigo-500 bg-white text-slate-800`}>
              {YEARS.map((y) => (
                <option key={y} value={y} className="bg-white text-slate-800">{y}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <Label>For</Label>
          <div className="grid grid-cols-2 gap-2.5">
            {[["all", "All employees"], ["one", "One employee"]].map(([key, label]) => (
              <button key={key} type="button" onClick={() => setScope(key)} className={`py-3 rounded-xl border text-xs font-bold transition cursor-pointer ${scope === key ? "border-indigo-500 bg-indigo-50 text-indigo-700 ring-4 ring-indigo-500/10" : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300"}`}>
                {label}
              </button>
            ))}
          </div>

          {scope === "all" && !empLoading && employees.length > 0 && (
            <p className="text-[11px] text-slate-500 mt-2.5">
              <b className="text-slate-700">{ready.length}</b> employee{ready.length === 1 ? "" : "s"} will get a payslip.
              {skippedPeople > 0 && <> {skippedPeople} will be skipped (salary not set or on hold).</>}
            </p>
          )}

          {scope === "one" && (
            <div className="mt-3 space-y-2.5">
              <select value={employee} onChange={(e) => setEmployee(e.target.value)} disabled={empLoading} className={`${inputClass} cursor-pointer border-slate-200 focus:border-indigo-500 bg-white text-slate-800 disabled:opacity-60`}>
                <option value="" className="bg-white text-slate-400">
                  {empLoading ? "Loading employees..." : `Select employee (${ready.length} available)`}
                </option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id} disabled={Boolean(e.blocked)} className="bg-white text-slate-800">
                    {e.name}
                    {e.code ? ` (${e.code})` : ""}
                    {e.blocked ? ` - ${e.blocked}` : ""}
                  </option>
                ))}
              </select>

              {empError && (
                <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                  <span className="font-medium">{empError}</span>
                  <button type="button" onClick={loadEmployees} className="inline-flex items-center gap-1.5 font-bold underline cursor-pointer shrink-0">
                    <RefreshCw size={12} /> Retry
                  </button>
                </div>
              )}

              {!empLoading && !empError && employees.length === 0 && (
                <p className="text-[11px] text-amber-700">No active employee found. Add employees first, then set their salary in Employee Salary.</p>
              )}

              {picked && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <Avatar name={picked.name} />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{picked.name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{picked.code || "—"}</p>
                  </div>
                  <span className="ml-auto text-xs font-bold font-mono text-slate-800 shrink-0">{rupee(picked.salary)}<span className="text-[10px] text-slate-400 font-sans font-semibold"> / month</span></span>
                </div>
              )}
            </div>
          )}
        </div>

        <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 hover:border-indigo-300 transition cursor-pointer">
          <input type="checkbox" checked={fullMonth} onChange={(e) => setFullMonth(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600" />
          <span>
            <span className="block text-sm font-bold text-slate-800">Pay the full month (ignore attendance)</span>
            <span className="block text-[11px] text-slate-400 mt-0.5">No Loss of Pay is cut. It also lets you generate the running month.</span>
          </span>
        </label>

        <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 hover:border-indigo-300 transition cursor-pointer">
          <input type="checkbox" checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600" />
          <span>
            <span className="block text-sm font-bold text-slate-800">Refresh drafts that already exist</span>
            <span className="block text-[11px] text-slate-400 mt-0.5">Rebuilds them from the latest attendance, bonus and deductions. Processed and paid payslips are never touched.</span>
          </span>
        </label>

        {blockedReason && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            <p className="font-medium">{blockedReason}</p>
          </div>
        )}
        {running && !fullMonth && !future && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
            <Info size={15} className="shrink-0 mt-0.5" />
            <p className="font-medium">{periodLabel} has not ended yet. Choose an earlier month, or tick &quot;Pay the full month&quot;.</p>
          </div>
        )}
        {error && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            <p className="font-medium break-words">{error}</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
          {scope === "one" && (
            <button type="button" onClick={runPreview} disabled={previewing || needsEmployee || future} className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs sm:text-sm font-bold transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
              {previewing ? <Loader2 size={15} className="animate-spin" /> : <Eye size={15} />} Preview
            </button>
          )}
          <button type="submit" disabled={generating || needsEmployee || future} className="flex-1 inline-flex items-center justify-center gap-2 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md shadow-indigo-600/20 transition cursor-pointer active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed">
            {generating ? <Loader2 size={16} className="animate-spin" /> : <PlayCircle size={16} />}
            {generating ? "Generating..." : `Generate ${scope === "all" ? "for all employees" : "payslip"} · ${periodLabel}`}
          </button>
        </div>
      </form>

      {/* Preview */}
      {preview && (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm p-4 sm:p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Avatar name={preview.employee?.name || picked?.name} size="w-11 h-11" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">{preview.employee?.name || picked?.name}</p>
              <p className="text-[11px] text-slate-500 truncate">{[preview.employee?.employeeId || picked?.code, cleanText(preview.employee?.department), preview.structureName].filter(Boolean).join(" • ")}</p>
            </div>
            <span className="ml-auto text-[10px] font-bold uppercase text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">Preview only</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center">
            {[["Monthly Salary", rupee(preview.monthlyGross)], ["Working Days", preview.workingDays], ["Present", preview.daysPresent], ["Paid Leave", preview.daysOnLeave], ["Loss of Pay Days", preview.unpaidDays]].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-slate-50 border border-slate-200/70 py-2.5 px-1 min-w-0">
                <p className="text-sm font-extrabold font-mono text-slate-900 truncate">{value ?? 0}</p>
                <p className="text-[10px] font-bold uppercase text-slate-400">{label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Lines title="Earnings" tone="text-emerald-600" lines={earningLines(preview)} total={Number(preview.grossSalary) + Number(preview.reimbursement || 0)} totalLabel="Total Earnings" />
            <Lines title="Deductions" tone="text-rose-600" lines={deductionLines(preview)} total={preview.totalDeductions} totalLabel="Total Deductions" />
          </div>

          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Net Pay</p>
            <p className="text-2xl font-extrabold text-emerald-600 font-mono">{rupee(preview.netSalary)}</p>
          </div>
          <Warnings list={preview.warnings} />
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-3">
          <div className="bg-emerald-50 border border-emerald-200 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0"><CheckCircle2 size={20} /></div>
              <div className="min-w-0">
                <h4 className="font-bold text-emerald-900 text-sm">{result.single ? "Payslip generated as a draft" : result.message}</h4>
                <p className="text-xs text-emerald-700 mt-0.5">
                  {result.single
                    ? `${result.payroll?.employee?.name || picked?.name || "Employee"} · Net ${rupee(result.payroll?.netSalary)}`
                    : `${result.results?.created?.length || 0} created · ${result.results?.updated?.length || 0} refreshed · ${skipped.length} skipped`}
                </p>
              </div>
            </div>
            <button type="button" onClick={() => router.push("/payroll")} className="inline-flex items-center justify-center gap-2 px-5 py-3 sm:py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition cursor-pointer">
              Process and pay <ArrowRight size={14} />
            </button>
          </div>

          <Warnings list={[...(result.warnings || []), ...warned.slice(0, 15).map((x) => `${x.name}: ${x.warnings.join(" ")}`)]} />

          {!result.single && made.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <p className="px-4 py-3 border-b border-slate-100 text-xs font-bold text-slate-700">Generated ({made.length})</p>
              <ul className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {made.map((x) => (
                  <li key={`${x.employeeId}-${x.name}`} className="px-4 py-2.5 flex items-center justify-between gap-3 text-xs">
                    <span className="font-semibold text-slate-800 truncate">{x.name} <span className="text-slate-400 font-mono">{x.employeeId}</span></span>
                    <span className="font-mono font-bold text-emerald-600 shrink-0">{rupee(x.net)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {skipped.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <p className="px-4 py-3 border-b border-slate-100 text-xs font-bold text-slate-700">Skipped ({skipped.length})</p>
              <ul className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {skipped.map((s, i) => (
                  <li key={i} className="px-4 py-2.5 text-[11px] flex items-start justify-between gap-3">
                    <span className="font-semibold text-slate-700">{s.name} <span className="text-slate-400 font-mono">{s.employeeId}</span></span>
                    <span className="text-slate-500 text-right">{s.reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}











// "use client";

// import { useEffect, useMemo, useState } from "react";
// import { useRouter } from "next/navigation";
// import { PlayCircle, CheckCircle2, Loader2, AlertCircle, Coins, Eye, ArrowRight, Info } from "lucide-react";
// import { toast } from "react-toastify";
// import api from "@/lib/api";
// import { Avatar, Label, MONTHS, cleanText, inputClass, rupee } from "@/components/payroll/ui";

// const THIS_YEAR = new Date().getFullYear();
// const YEARS = Array.from({ length: 6 }, (_, i) => THIS_YEAR - i);

// const earningLines = (p) =>
//   [
//     ["Basic Salary", p.basicSalary],
//     ["House Rent Allowance", p.allowances?.hra],
//     ["Dearness Allowance", p.allowances?.da],
//     ["Special Allowance", p.allowances?.special],
//     ["Bonus", p.bonus],
//     ["Reimbursements (not taxable)", p.reimbursement],
//   ].filter(([, amount]) => Number(amount) > 0);

// const deductionLines = (p) =>
//   [
//     ["Provident Fund", p.deductions?.pf],
//     ["ESI", p.deductions?.esi],
//     ["TDS", p.deductions?.tds],
//     ["Loan / Advance Recovery", p.deductions?.loan],
//     ["Loss of Pay", p.deductions?.lop],
//     ["Other Deductions", p.deductions?.other],
//   ].filter(([, amount]) => Number(amount) > 0);

// function Lines({ title, tone, lines, total, totalLabel }) {
//   return (
//     <div className="rounded-2xl border border-slate-200 p-4">
//       <p className={`text-[11px] font-bold uppercase tracking-wider mb-1 ${tone}`}>{title}</p>
//       <div className="divide-y divide-slate-100">
//         {lines.length ? (
//           lines.map(([label, amount]) => (
//             <div key={label} className="flex items-center justify-between gap-3 py-2 text-xs text-slate-600">
//               <span className="min-w-0 break-words">{label}</span>
//               <span className="font-mono font-semibold text-slate-800 shrink-0">{rupee(amount)}</span>
//             </div>
//           ))
//         ) : (
//           <p className="py-3 text-xs text-slate-400">None this month.</p>
//         )}
//       </div>
//       <div className="flex items-center justify-between gap-3 pt-2 mt-1 border-t-2 border-slate-200 text-xs font-bold text-slate-900">
//         <span>{totalLabel}</span>
//         <span className="font-mono">{rupee(total)}</span>
//       </div>
//     </div>
//   );
// }

// function Warnings({ list }) {
//   if (!list?.length) return null;
//   return (
//     <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4">
//       <p className="text-xs font-bold text-amber-800 mb-1.5">Please check</p>
//       <ul className="space-y-1 text-[11px] text-amber-800">
//         {list.map((w, i) => (
//           <li key={i}>{w}</li>
//         ))}
//       </ul>
//     </div>
//   );
// }

// export default function GeneratePayroll() {
//   const router = useRouter();

//   const [month, setMonth] = useState(() => {
//     const d = new Date();
//     d.setDate(1);
//     d.setMonth(d.getMonth() - 1);
//     return d.getMonth() + 1;
//   });
//   const [year, setYear] = useState(() => {
//     const d = new Date();
//     d.setDate(1);
//     d.setMonth(d.getMonth() - 1);
//     return d.getFullYear();
//   });
//   const [scope, setScope] = useState("all");
//   const [employees, setEmployees] = useState([]);
//   const [employee, setEmployee] = useState("");
//   const [fullMonth, setFullMonth] = useState(false);
//   const [overwrite, setOverwrite] = useState(false);

//   const [preview, setPreview] = useState(null);
//   const [previewing, setPreviewing] = useState(false);
//   const [generating, setGenerating] = useState(false);
//   const [error, setError] = useState("");
//   const [result, setResult] = useState(null);

//   useEffect(() => {
//     api
//       .get("/payroll/employee-salaries")
//       .then(({ data }) => {
//         const list = Array.isArray(data) ? data : data?.salaries || data?.employees || [];
//         setEmployees(
//           list
//             .map((r) => {
//               const emp = r.employee || r;
//               if (!emp?._id && !emp?.id) return null;
//               const empId = emp._id || emp.id;
//               const empName = emp.name || emp.fullName || "Unnamed";
//               const code = emp.employeeId || emp.code || "—";
//               return {
//                 id: empId,
//                 label: `${empName} (${code})`,
//                 salary: r.grossMonthly || r.grossSalary || 0,
//               };
//             })
//             .filter(Boolean)
//             .sort((a, b) => a.label.localeCompare(b.label))
//         );
//       })
//       .catch(() => { });
//   }, []);

//   useEffect(() => {
//     setPreview(null);
//     setResult(null);
//     setError("");
//   }, [month, year, scope, employee, fullMonth, overwrite]);

//   const now = new Date();
//   const cy = now.getFullYear();
//   const cm = now.getMonth() + 1;
//   const future = year > cy || (year === cy && month > cm);
//   const running = year === cy && month === cm;
//   const periodLabel = `${MONTHS[month - 1]} ${year}`;
//   const blockedReason = future ? "A future month cannot be generated." : "";
//   const needsEmployee = scope === "one" && !employee;

//   // const runPreview = async () => {
//   //   if (previewing || needsEmployee || future) return;
//   //   setPreviewing(true);
//   //   setError("");
//   //   try {
//   //     const { data } = await api.post("/payroll/preview", { employee, month, year, fullMonth });
//   //     setPreview(data);
//   //   } catch (err) {
//   //     setPreview(null);
//   //     setError(err?.response?.data?.message || "Unable to prepare the preview.");
//   //   } finally {
//   //     setPreviewing(false);
//   //   }
//   // };

//   // GeneratePayroll.jsx ka key submission function snippet
//   const runPreview = async () => {
//     if (previewing || needsEmployee || future) return;
//     setPreviewing(true);
//     setError("");
//     try {
//       // fullMonth aur baaki parameters properly bhej rahe hain
//       const { data } = await api.post("/payroll/preview", {
//         employee,
//         month: Number(month),
//         year: Number(year),
//         fullMonth
//       });
//       setPreview(data);
//     } catch (err) {
//       setPreview(null);
//       setError(err?.response?.data?.message || "Unable to prepare the preview.");
//     } finally {
//       setPreviewing(false);
//     }
//   };

//   const generate = async (e) => {
//     e.preventDefault();
//     if (generating || needsEmployee || future) return;
//     setGenerating(true);
//     setError("");
//     setResult(null);
//     try {
//       if (scope === "one") {
//         const { data } = await api.post("/payroll/generate", { employee, month, year, fullMonth, overwriteDraft: overwrite });
//         setResult({ single: true, payroll: data, warnings: data.warnings || [] });
//         toast.success("Payslip generated.");
//       } else {
//         const { data } = await api.post("/payroll/generate-bulk", { month, year, fullMonth, overwriteDrafts: overwrite });
//         setResult(data);
//         toast.success(data.message || "Payslips generated.");
//       }
//     } catch (err) {
//       const message = err?.response?.data?.message || "Payslip generation failed.";
//       setError(message);
//       toast.error(message);
//     } finally {
//       setGenerating(false);
//     }
//   };

//   const made = useMemo(() => [...(result?.results?.created || []), ...(result?.results?.updated || [])], [result]);
//   const skipped = result?.results?.skipped || [];
//   const warned = made.filter((x) => x.warnings?.length);

//   return (
//     <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 py-4 space-y-4 antialiased pb-16">
//       {/* Header */}
//       <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm flex items-center gap-3.5">
//         <div className="w-11 h-11 sm:w-12 sm:h-12 shrink-0 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20">
//           <Coins size={20} />
//         </div>
//         <div className="min-w-0">
//           <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Generate Payslips</h1>
//           <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Create the monthly payslips as drafts. You process and pay them from the Payroll page.</p>
//         </div>
//       </div>

//       {/* How it works */}
//       <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
//         {[
//           ["1", "Salary and structure", "Takes the monthly salary of the employee profile and splits it by the salary structure."],
//           ["2", "Attendance and leave", "Cuts Loss of Pay for absent days. Holidays, weekly offs and paid leave are not cut."],
//           ["3", "Bonus, deductions, loan", "Adds approved bonus and claims, and takes the loan EMI and manual deductions of that month."],
//         ].map(([n, title, text]) => (
//           <div key={n} className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-indigo-300 group">
//             <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs group-hover:bg-indigo-600 group-hover:text-white transition-colors">{n}</div>
//             <h4 className="font-bold text-slate-800 text-sm mt-2.5">{title}</h4>
//             <p className="text-xs text-slate-500 mt-1">{text}</p>
//           </div>
//         ))}
//       </div>

//       {/* Form */}
//       <form onSubmit={generate} noValidate className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm p-4 sm:p-6 space-y-5">
//         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//           <div>
//             <Label>Payroll Month</Label>
//             <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className={`${inputClass} cursor-pointer border-slate-200 focus:border-indigo-500 bg-white text-slate-800`}>
//               {MONTHS.map((m, i) => (
//                 <option key={m} value={i + 1} className="bg-white text-slate-800">{m}</option>
//               ))}
//             </select>
//           </div>
//           <div>
//             <Label>Year</Label>
//             <select value={year} onChange={(e) => setYear(Number(e.target.value))} className={`${inputClass} cursor-pointer border-slate-200 focus:border-indigo-500 bg-white text-slate-800`}>
//               {YEARS.map((y) => (
//                 <option key={y} value={y} className="bg-white text-slate-800">{y}</option>
//               ))}
//             </select>
//           </div>
//         </div>

//         <div>
//           <Label>For</Label>
//           <div className="grid grid-cols-2 gap-2.5">
//             {[["all", "All employees"], ["one", "One employee"]].map(([key, label]) => (
//               <button key={key} type="button" onClick={() => setScope(key)} className={`py-3 rounded-xl border text-xs font-bold transition cursor-pointer ${scope === key ? "border-indigo-500 bg-indigo-50 text-indigo-700 ring-4 ring-indigo-500/10" : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300"}`}>
//                 {label}
//               </button>
//             ))}
//           </div>
//           {scope === "one" && (
//             <select value={employee} onChange={(e) => setEmployee(e.target.value)} className={`${inputClass} mt-3 cursor-pointer border-slate-200 focus:border-indigo-500 bg-white text-slate-800`}>
//               <option value="" className="bg-white text-slate-400">Select employee ({employees.length} available)</option>
//               {employees.map((e) => (
//                 <option key={e.id} value={e.id} className="bg-white text-slate-800">{e.label}</option>
//               ))}
//             </select>
//           )}
//         </div>

//         <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 hover:border-indigo-300 transition cursor-pointer">
//           <input type="checkbox" checked={fullMonth} onChange={(e) => setFullMonth(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600" />
//           <span>
//             <span className="block text-sm font-bold text-slate-800">Pay the full month (ignore attendance)</span>
//             <span className="block text-[11px] text-slate-400 mt-0.5">No Loss of Pay is cut. It also lets you generate the running month.</span>
//           </span>
//         </label>

//         <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 hover:border-indigo-300 transition cursor-pointer">
//           <input type="checkbox" checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600" />
//           <span>
//             <span className="block text-sm font-bold text-slate-800">Refresh drafts that already exist</span>
//             <span className="block text-[11px] text-slate-400 mt-0.5">Rebuilds them from the latest attendance, bonus and deductions. Processed and paid payslips are never touched.</span>
//           </span>
//         </label>

//         {blockedReason && (
//           <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
//             <AlertCircle size={15} className="shrink-0 mt-0.5" />
//             <p className="font-medium">{blockedReason}</p>
//           </div>
//         )}
//         {running && !fullMonth && !future && (
//           <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
//             <Info size={15} className="shrink-0 mt-0.5" />
//             <p className="font-medium">{periodLabel} has not ended yet. Choose an earlier month, or tick &quot;Pay the full month&quot;.</p>
//           </div>
//         )}
//         {error && (
//           <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
//             <AlertCircle size={15} className="shrink-0 mt-0.5" />
//             <p className="font-medium break-words">{error}</p>
//           </div>
//         )}

//         <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
//           {scope === "one" && (
//             <button type="button" onClick={runPreview} disabled={previewing || needsEmployee || future} className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs sm:text-sm font-bold transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
//               {previewing ? <Loader2 size={15} className="animate-spin" /> : <Eye size={15} />} Preview
//             </button>
//           )}
//           <button type="submit" disabled={generating || needsEmployee || future} className="flex-1 inline-flex items-center justify-center gap-2 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md shadow-indigo-600/20 transition cursor-pointer active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed">
//             {generating ? <Loader2 size={16} className="animate-spin" /> : <PlayCircle size={16} />}
//             {generating ? "Generating..." : `Generate ${scope === "all" ? "for all employees" : "payslip"} · ${periodLabel}`}
//           </button>
//         </div>
//       </form>

//       {/* Preview */}
//       {preview && (
//         <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm p-4 sm:p-6 space-y-4">
//           <div className="flex items-center gap-3">
//             <Avatar name={preview.employee?.name} size="w-11 h-11" />
//             <div className="min-w-0">
//               <p className="text-sm font-bold text-slate-900 truncate">{preview.employee?.name}</p>
//               <p className="text-[11px] text-slate-500 truncate">{[preview.employee?.employeeId, cleanText(preview.employee?.department), preview.structureName].filter(Boolean).join(" • ")}</p>
//             </div>
//             <span className="ml-auto text-[10px] font-bold uppercase text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">Preview only</span>
//           </div>

//           <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center">
//             {[["Monthly Salary", rupee(preview.monthlyGross)], ["Working Days", preview.workingDays], ["Present", preview.daysPresent], ["Paid Leave", preview.daysOnLeave], ["Loss of Pay Days", preview.unpaidDays]].map(([label, value]) => (
//               <div key={label} className="rounded-xl bg-slate-50 border border-slate-200/70 py-2.5 px-1 min-w-0">
//                 <p className="text-sm font-extrabold font-mono text-slate-900 truncate">{value ?? 0}</p>
//                 <p className="text-[10px] font-bold uppercase text-slate-400">{label}</p>
//               </div>
//             ))}
//           </div>

//           <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
//             <Lines title="Earnings" tone="text-emerald-600" lines={earningLines(preview)} total={Number(preview.grossSalary) + Number(preview.reimbursement || 0)} totalLabel="Total Earnings" />
//             <Lines title="Deductions" tone="text-rose-600" lines={deductionLines(preview)} total={preview.totalDeductions} totalLabel="Total Deductions" />
//           </div>

//           <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4">
//             <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Net Pay</p>
//             <p className="text-2xl font-extrabold text-emerald-600 font-mono">{rupee(preview.netSalary)}</p>
//           </div>
//           <Warnings list={preview.warnings} />
//         </div>
//       )}

//       {/* Result */}
//       {result && (
//         <div className="space-y-3">
//           <div className="bg-emerald-50 border border-emerald-200 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
//             <div className="flex items-start gap-3 min-w-0">
//               <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0"><CheckCircle2 size={20} /></div>
//               <div className="min-w-0">
//                 <h4 className="font-bold text-emerald-900 text-sm">{result.single ? "Payslip generated as a draft" : result.message}</h4>
//                 <p className="text-xs text-emerald-700 mt-0.5">
//                   {result.single
//                     ? `${result.payroll?.employee?.name || "Employee"} · Net ${rupee(result.payroll?.netSalary)}`
//                     : `${result.results?.created?.length || 0} created · ${result.results?.updated?.length || 0} refreshed · ${skipped.length} skipped`}
//                 </p>
//               </div>
//             </div>
//             <button type="button" onClick={() => router.push("/payroll")} className="inline-flex items-center justify-center gap-2 px-5 py-3 sm:py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition cursor-pointer">
//               Process and pay <ArrowRight size={14} />
//             </button>
//           </div>

//           <Warnings list={[...(result.warnings || []), ...warned.slice(0, 15).map((x) => `${x.name}: ${x.warnings.join(" ")}`)]} />

//           {!result.single && made.length > 0 && (
//             <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
//               <p className="px-4 py-3 border-b border-slate-100 text-xs font-bold text-slate-700">Generated ({made.length})</p>
//               <ul className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
//                 {made.map((x) => (
//                   <li key={`${x.employeeId}-${x.name}`} className="px-4 py-2.5 flex items-center justify-between gap-3 text-xs">
//                     <span className="font-semibold text-slate-800 truncate">{x.name} <span className="text-slate-400 font-mono">{x.employeeId}</span></span>
//                     <span className="font-mono font-bold text-emerald-600 shrink-0">{rupee(x.net)}</span>
//                   </li>
//                 ))}
//               </ul>
//             </div>
//           )}

//           {skipped.length > 0 && (
//             <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
//               <p className="px-4 py-3 border-b border-slate-100 text-xs font-bold text-slate-700">Skipped ({skipped.length})</p>
//               <ul className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
//                 {skipped.map((s, i) => (
//                   <label key={i} className="px-4 py-2.5 text-[11px] flex items-start justify-between gap-3">
//                     <span className="font-semibold text-slate-700">{s.name} <span className="text-slate-400 font-mono">{s.employeeId}</span></span>
//                     <span className="text-slate-500 text-right">{s.reason}</span>
//                   </label>
//                 ))}
//               </ul>
//             </div>
//           )}
//         </div>
//       )}
//     </div>
//   );
// }
