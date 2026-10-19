"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PlayCircle, CheckCircle2, Loader2, AlertCircle, Coins, Eye, ArrowRight, Info } from "lucide-react";
import { toast } from "react-toastify";
import api from "@/lib/api";
import { Avatar, Label, MONTHS, cleanText, inputClass, rupee } from "@/components/payroll/ui";

const THIS_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => THIS_YEAR - i);

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
          <li key={i}>• {w}</li>
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
  const [employee, setEmployee] = useState("");
  const [fullMonth, setFullMonth] = useState(false);
  const [overwrite, setOverwrite] = useState(false);

  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    api
      .get("/payroll/employee-salaries")
      .then(({ data }) =>
        setEmployees(
          (Array.isArray(data) ? data : [])
            .filter((r) => r.employee?._id)
            .map((r) => ({ id: r.employee._id, label: `${r.employee.name} (${r.employee.employeeId || "—"})`, salary: r.grossMonthly }))
            .sort((a, b) => a.label.localeCompare(b.label))
        )
      )
      .catch(() => { });
  }, []);

  // any change makes the old preview and result outdated
  useEffect(() => {
    setPreview(null);
    setResult(null);
    setError("");
  }, [month, year, scope, employee, fullMonth, overwrite]);

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
      const { data } = await api.post("/payroll/preview", { employee, month, year, fullMonth });
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
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 py-4 space-y-4 antialiased pb-16">
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
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className={`${inputClass} cursor-pointer border-slate-200 focus:border-indigo-500`}>
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Year</Label>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} className={`${inputClass} cursor-pointer border-slate-200 focus:border-indigo-500`}>
              {YEARS.map((y) => (
                <option key={y} value={y}>{y}</option>
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
          {scope === "one" && (
            <select value={employee} onChange={(e) => setEmployee(e.target.value)} className={`${inputClass} mt-3 cursor-pointer border-slate-200 focus:border-indigo-500`}>
              <option value="">Select employee</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.label}</option>
              ))}
            </select>
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
            <Avatar name={preview.employee?.name} size="w-11 h-11" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">{preview.employee?.name}</p>
              <p className="text-[11px] text-slate-500 truncate">{[preview.employee?.employeeId, cleanText(preview.employee?.department), preview.structureName].filter(Boolean).join(" • ")}</p>
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
                    ? `${result.payroll?.employee?.name || "Employee"} · Net ${rupee(result.payroll?.netSalary)}`
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

// import React, { useState } from "react";
// import {
//   PlayCircle,
//   CheckCircle2,
//   RefreshCw,
//   AlertCircle,
//   Coins,
//   FileCheck2
// } from "lucide-react";
// import api from "@/lib/api";
// import { toast } from "react-toastify";

// export default function GeneratePayroll() {
//   const currentYear = new Date().getFullYear().toString();
//   const currentMonth = String(new Date().getMonth() + 1).padStart(2, "0");

//   const [month, setMonth] = useState(currentMonth);
//   const [year, setYear] = useState(currentYear);
//   const [generating, setGenerating] = useState(false);
//   const [result, setResult] = useState(null);
//   const [error, setError] = useState(null);

//   const monthNames = [
//     { value: "01", name: "January" },
//     { value: "02", name: "February" },
//     { value: "03", name: "March" },
//     { value: "04", name: "April" },
//     { value: "05", name: "May" },
//     { value: "06", name: "June" },
//     { value: "07", name: "July" },
//     { value: "08", name: "August" },
//     { value: "09", name: "September" },
//     { value: "10", name: "October" },
//     { value: "11", name: "November" },
//     { value: "12", name: "December" },
//   ];

//   const handleGenerate = async (e) => {
//     e.preventDefault();
//     setGenerating(true);
//     setError(null);
//     setResult(null);

//     try {
//       const response = await api.post("/payroll/generate-bulk", {
//         month: Number(month),
//         year: Number(year),
//       });

//       const resData = response?.data;
//       setResult(resData);
//       toast.success(`Payroll processed successfully for ${month}/${year}!`);
//     } catch (err) {
//       console.error("Payroll generation error:", err);
//       const errMsg =
//         err.response?.data?.message ||
//         err.response?.data?.error ||
//         "Payroll generation failed. Please verify employee salary assignments.";
//       setError(errMsg);
//       toast.error(errMsg);
//     } finally {
//       setGenerating(false);
//     }
//   };

//   return (
//     <div className="max-w-5xl mx-auto space-y-3 px-4 sm:px-2 py-3 font-sans">
//       {/* Top Banner Header */}
//       <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-all duration-300 hover:shadow-xl hover:border-indigo-200">
//         <div className="flex items-center gap-3.5">
//           <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 transition-transform duration-300 hover:scale-105">
//             <Coins className="w-6 h-6" />
//           </div>
//           <div>
//             <div className="flex items-center gap-2.5">
//               <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
//                 Run Monthly Payroll Engine
//               </h1>
//               <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
//                 Statutory Engine
//               </span>
//             </div>
//             <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
//               Compute active CTCs, structure ratios, PF/PT statutory cuts, and finalize monthly pay
//             </p>
//           </div>
//         </div>
//       </div>

//       {/* Process Flow Information Cards with Hover Lift */}
//       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//         <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2 transition-all duration-300 hover:shadow-xl hover:border-indigo-300 hover:-translate-y-1 group">
//           <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
//             1
//           </div>
//           <h4 className="font-bold text-slate-800 text-sm group-hover:text-indigo-600 transition-colors">Read Active Mappings</h4>
//           <p className="text-xs text-slate-500">
//             Pulls all staff assigned under active CTC contracts and salary templates.
//           </p>
//         </div>

//         <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2 transition-all duration-300 hover:shadow-xl hover:border-indigo-300 hover:-translate-y-1 group">
//           <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
//             2
//           </div>
//           <h4 className="font-bold text-slate-800 text-sm group-hover:text-indigo-600 transition-colors">Calculate Deductions</h4>
//           <p className="text-xs text-slate-500">
//             Auto-computes Employee PF (12% of Basic) and applicable Professional Tax.
//           </p>
//         </div>

//         <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2 transition-all duration-300 hover:shadow-xl hover:border-indigo-300 hover:-translate-y-1 group">
//           <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
//             3
//           </div>
//           <h4 className="font-bold text-slate-800 text-sm group-hover:text-indigo-600 transition-colors">Finalize Net Payout</h4>
//           <p className="text-xs text-slate-500">
//             Locks take-home figures and prepares records for banking disbursement.
//           </p>
//         </div>
//       </div>

//       {/* Main Execution Card */}
//       <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden transition-all duration-300 hover:shadow-md">
//         <div className="p-5 sm:p-6 border-b border-slate-100">
//           <h3 className="text-base font-bold text-slate-900">Select Payroll Cycle</h3>
//           <p className="text-xs text-slate-500 mt-0.5">
//             Choose the target calendar month and financial year to compute
//           </p>
//         </div>

//         <form onSubmit={handleGenerate} className="p-5 sm:p-6 space-y-5">
//           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//             <div>
//               <label className="block text-xs font-semibold text-slate-700 mb-1.5">
//                 Payroll Month
//               </label>
//               <div className="relative">
//                 <select
//                   value={month}
//                   onChange={(e) => setMonth(e.target.value)}
//                   className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer transition"
//                 >
//                   {monthNames.map((m) => (
//                     <option key={m.value} value={m.value}>
//                       {m.name} ({m.value})
//                     </option>
//                   ))}
//                 </select>
//               </div>
//             </div>

//             <div>
//               <label className="block text-xs font-semibold text-slate-700 mb-1.5">
//                 Financial Year
//               </label>
//               <input
//                 type="number"
//                 min="2020"
//                 max="2035"
//                 required
//                 value={year}
//                 onChange={(e) => setYear(e.target.value)}
//                 className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-mono"
//               />
//             </div>
//           </div>

//           {error && (
//             <div className="p-4 bg-rose-50 border border-rose-200/80 rounded-xl flex items-start gap-2.5 text-rose-700 text-xs">
//               <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
//               <div>
//                 <p className="font-semibold">Batch Generation Failed</p>
//                 <p className="mt-0.5 text-rose-600">{error}</p>
//               </div>
//             </div>
//           )}

//           <div className="pt-2">
//             <button
//               type="submit"
//               disabled={generating}
//               className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 text-white font-semibold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-indigo-100 transition-all duration-200 cursor-pointer active:scale-95"
//             >
//               {generating ? (
//                 <>
//                   <RefreshCw className="w-4 h-4 animate-spin" />
//                   <span>Computing Salaries & Deductions...</span>
//                 </>
//               ) : (
//                 <>
//                   <PlayCircle className="w-4 h-4" />
//                   <span>Execute Monthly Payroll Batch</span>
//                 </>
//               )}
//             </button>
//           </div>
//         </form>
//       </div>

//       {/* Generation Result Banner & Summary Breakdown */}
//       {result && (
//         <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
//           <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
//             <div className="flex items-center gap-3">
//               <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
//                 <CheckCircle2 className="w-5 h-5" />
//               </div>
//               <div>
//                 <h4 className="font-bold text-emerald-900 text-sm">
//                   Batch Run Completed Successfully!
//                 </h4>
//                 <p className="text-xs text-emerald-700 mt-0.5">
//                   Processed salary calculations for cycle{" "}
//                   <strong>{result.month || `${month}/${year}`}</strong>
//                 </p>
//               </div>
//             </div>

//             <div className="flex items-center gap-4 text-xs font-semibold self-start sm:self-auto">
//               <div className="bg-white/90 px-3.5 py-2 rounded-xl border border-emerald-200 shadow-xs">
//                 <span className="text-slate-500">Processed: </span>
//                 <span className="text-slate-900 font-bold">
//                   {result.totalProcessed || 0} Staff
//                 </span>
//               </div>
//               <div className="bg-white/90 px-3.5 py-2 rounded-xl border border-emerald-200 shadow-xs">
//                 <span className="text-slate-500">Net Payout: </span>
//                 <span className="text-emerald-700 font-bold">
//                   ₹{(result.totalDisbursed || 0).toLocaleString("en-IN")}
//                 </span>
//               </div>
//             </div>
//           </div>

//           {/* Detailed Processed Employee Table */}
//           {result.records && result.records.length > 0 && (
//             <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden transition-all duration-300 hover:shadow-md">
//               <div className="p-4 border-b border-slate-100 flex items-center justify-between">
//                 <div className="flex items-center gap-2">
//                   <FileCheck2 className="w-4 h-4 text-indigo-600" />
//                   <h3 className="font-bold text-slate-800 text-xs sm:text-sm">
//                     Calculated Payroll Breakdown
//                   </h3>
//                 </div>
//                 <span className="text-xs text-slate-400 font-medium">
//                   {result.records.length} Employees Included
//                 </span>
//               </div>

//               <div className="overflow-x-auto">
//                 <table className="w-full text-left border-collapse text-xs">
//                   <thead>
//                     <tr className="bg-slate-50/75 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
//                       <th className="py-3.5 px-5">Employee</th>
//                       <th className="py-3.5 px-5">Gross Pay</th>
//                       <th className="py-3.5 px-5">Basic (Earnings)</th>
//                       <th className="py-3.5 px-5">PF / Deductions</th>
//                       <th className="py-3.5 px-5 text-right">Net Payable</th>
//                     </tr>
//                   </thead>
//                   <tbody className="divide-y divide-slate-100">
//                     {result.records.map((rec, idx) => (
//                       <tr key={idx} className="hover:bg-indigo-50/40 transition-colors duration-150">
//                         <td className="py-3.5 px-5">
//                           <div className="font-bold text-slate-800">
//                             {rec.employee?.name || "Unknown"}
//                           </div>
//                           <div className="text-[11px] text-slate-400 font-mono">
//                             {rec.employee?.employeeId || "—"}
//                           </div>
//                         </td>
//                         <td className="py-3.5 px-5 font-semibold text-slate-700">
//                           ₹{(rec.grossMonthly || 0).toLocaleString("en-IN")}
//                         </td>
//                         <td className="py-3.5 px-5 text-slate-600 font-mono">
//                           ₹{(rec.earnings?.basic || 0).toLocaleString("en-IN")}
//                         </td>
//                         <td className="py-3.5 px-5 text-rose-600 font-medium font-mono">
//                           -₹{(rec.deductions?.total || 0).toLocaleString("en-IN")}
//                         </td>
//                         <td className="py-3.5 px-5 text-right font-bold text-emerald-600 text-sm font-mono">
//                           ₹{(rec.netPayable || 0).toLocaleString("en-IN")}
//                         </td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>
//             </div>
//           )}
//         </div>
//       )}
//     </div>
//   );
// }