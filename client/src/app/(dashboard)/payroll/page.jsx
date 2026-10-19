import PayrollWorkspace from "@/components/payroll/PayrollWorkspace";

export default function Page() {
    return <PayrollWorkspace />;
}



// "use client";

// import { useCallback, useEffect, useMemo, useRef, useState } from "react";
// import {
//     Zap,
//     RefreshCw,
//     Wallet,
//     ArrowDownRight,
//     CheckCircle2,
//     TrendingUp,
//     Calendar,
//     Download,
//     Eye,
//     X,
//     Loader2,
//     MoreVertical,
//     Play,
//     BadgeCheck,
//     Trash2,
//     RotateCcw,
//     AlertCircle,
//     Search,
//     FileText,
// } from "lucide-react";
// import { toast } from "react-toastify";
// import api from "@/lib/api";
// import { useAuth } from "@/context/AuthContext";

// /* -------------------------------------------------------------------------- */
// /* CONSTANTS & HELPERS                                                        */
// /* -------------------------------------------------------------------------- */

// const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
// const THIS_YEAR = new Date().getFullYear();
// const YEARS = Array.from({ length: 6 }, (_, i) => THIS_YEAR - i);

// const STATUS = {
//     draft: { label: "Draft", cls: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
//     processed: { label: "Processed", cls: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500" },
//     paid: { label: "Paid", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
// };

// const FILTERS = [
//     ["all", "All"],
//     ["draft", "Draft"],
//     ["processed", "Processed"],
//     ["paid", "Paid"],
// ];

// const lower = (v) => String(v || "").trim().toLowerCase();
// const idOf = (v) => String(v?._id || v || "");
// const isHex = (s) => /^[0-9a-fA-F]{24}$/.test(String(s || "").trim());
// const cleanText = (v) => {
//     const s = typeof v === "object" && v ? v.name || v.title || "" : String(v || "");
//     return isHex(s) ? "" : s;
// };

// const rupee = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
// const rupeeShort = (n) => `₹${Math.round(Number(n || 0)).toLocaleString("en-IN")}`;

// const dateText = (v) => {
//     if (!v) return "—";
//     const d = new Date(v);
//     return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
// };

// const inputClass =
//     "px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs font-semibold text-slate-700 outline-none transition focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 cursor-pointer";

// /* One row of the list, for admin / HR (a payroll record) and for the others (a payslip) */
// const toItem = (r, manage, ownId) => {
//     if (manage) {
//         const e = r.employee && typeof r.employee === "object" ? r.employee : {};
//         return {
//             id: r._id,
//             title: e.name || "Unknown Staff",
//             sub: [e.employeeId, cleanText(e.department)].filter(Boolean).join(" • ") || "—",
//             period: `${MONTHS[(r.month || 1) - 1]} ${r.year}`,
//             present: r.daysPresent,
//             working: r.workingDays,
//             unpaid: r.unpaidDays,
//             gross: r.grossSalary,
//             ded: r.totalDeductions,
//             net: r.netSalary,
//             status: lower(r.status),
//             paidOn: r.paidOn,
//             own: Boolean(ownId) && idOf(r.employee) === ownId,
//         };
//     }
//     const a = r.attendance || {};
//     return {
//         id: r._id,
//         title: r.periodLabel,
//         sub: r.slipNumber,
//         period: r.periodLabel,
//         present: a.present,
//         working: a.workingDays,
//         unpaid: a.unpaid,
//         gross: r.grossSalary,
//         ded: r.totalDeductions,
//         net: r.netSalary,
//         status: lower(r.status),
//         paidOn: r.paidOn,
//         own: true,
//     };
// };

// const daysText = (i) => (i.working ? `${i.present ?? 0}/${i.working}` : "—");

// /* -------------------------------------------------------------------------- */
// /* SMALL COMPONENTS                                                           */
// /* -------------------------------------------------------------------------- */

// function StatusBadge({ status }) {
//     const s = STATUS[status] || STATUS.draft;
//     return (
//         <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border whitespace-nowrap ${s.cls}`}>
//             <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
//             {s.label}
//         </span>
//     );
// }

// function StatCard({ icon: Icon, label, value, sub, tone }) {
//     const tones = {
//         indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
//         rose: "bg-rose-50 text-rose-600 border-rose-100",
//         emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
//         violet: "bg-violet-50 text-violet-600 border-violet-100",
//     };
//     return (
//         <div className="min-w-0 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/70 shadow-sm flex items-center justify-between gap-3 transition-all duration-300 hover:shadow-lg hover:border-indigo-200 group">
//             <div className="min-w-0">
//                 <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">{label}</p>
//                 <h3 className="text-lg sm:text-2xl font-bold text-slate-900 mt-1 truncate">{value}</h3>
//                 {sub && <p className="text-[11px] text-slate-400 mt-0.5 truncate">{sub}</p>}
//             </div>
//             <div className={`p-2.5 sm:p-3 rounded-xl border shrink-0 transition-transform group-hover:scale-110 ${tones[tone]}`}>
//                 <Icon size={20} />
//             </div>
//         </div>
//     );
// }

// /* Bottom sheet on mobile, centered dialog on larger screens */
// function Sheet({ onClose, locked = false, size = "max-w-lg", children }) {
//     useEffect(() => {
//         const previous = document.body.style.overflow;
//         document.body.style.overflow = "hidden";
//         const onKey = (e) => e.key === "Escape" && !locked && onClose();
//         window.addEventListener("keydown", onKey);
//         return () => {
//             document.body.style.overflow = previous;
//             window.removeEventListener("keydown", onKey);
//         };
//     }, [onClose, locked]);

//     return (
//         <div
//             className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-slate-900/50 backdrop-blur-sm"
//             onClick={() => !locked && onClose()}
//         >
//             <div
//                 className={`w-full ${size} bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92dvh] overflow-hidden`}
//                 onClick={(e) => e.stopPropagation()}
//             >
//                 {children}
//             </div>
//         </div>
//     );
// }

// function ConfirmDialog({ ask, onClose }) {
//     const [busy, setBusy] = useState(false);
//     const danger = ask.tone === "danger";

//     const run = async () => {
//         setBusy(true);
//         try {
//             await ask.run();
//         } finally {
//             setBusy(false);
//             onClose();
//         }
//     };

//     return (
//         <Sheet onClose={onClose} locked={busy} size="max-w-md">
//             <div className="p-5 sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
//                 <div className="flex items-start gap-3.5">
//                     <div className={`w-11 h-11 shrink-0 rounded-2xl border flex items-center justify-center ${danger ? "bg-rose-50 border-rose-100 text-rose-600" : "bg-indigo-50 border-indigo-100 text-indigo-600"}`}>
//                         {danger ? <Trash2 size={18} /> : <AlertCircle size={18} />}
//                     </div>
//                     <div className="min-w-0">
//                         <h3 className="text-base font-bold text-slate-900">{ask.title}</h3>
//                         <p className="text-xs text-slate-500 mt-1 leading-relaxed">{ask.text}</p>
//                     </div>
//                 </div>
//                 <div className="mt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
//                     <button type="button" onClick={onClose} disabled={busy} className="px-5 py-3 sm:py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50">
//                         Cancel
//                     </button>
//                     <button
//                         type="button"
//                         onClick={run}
//                         disabled={busy}
//                         className={`inline-flex items-center justify-center gap-2 px-6 py-3 sm:py-2.5 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer disabled:opacity-60 ${danger ? "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20" : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20"}`}
//                     >
//                         {busy && <Loader2 size={14} className="animate-spin" />}
//                         {busy ? "Please wait..." : ask.label}
//                     </button>
//                 </div>
//             </div>
//         </Sheet>
//     );
// }

// /* Three-dot menu that is not cut off by a table */
// function ActionMenu({ items, note }) {
//     const [pos, setPos] = useState(null);
//     const triggerRef = useRef(null);
//     const WIDTH = 208;
//     const height = items.length * 40 + 16 + (note ? 40 : 0);

//     const close = useCallback(() => setPos(null), []);

//     useEffect(() => {
//         if (!pos) return undefined;
//         const onDown = (e) => {
//             if (!e.target.closest("[data-pay-menu]") && !triggerRef.current?.contains(e.target)) close();
//         };
//         const onKey = (e) => e.key === "Escape" && close();
//         document.addEventListener("mousedown", onDown);
//         document.addEventListener("touchstart", onDown, { passive: true });
//         window.addEventListener("scroll", close, true);
//         window.addEventListener("resize", close);
//         window.addEventListener("keydown", onKey);
//         return () => {
//             document.removeEventListener("mousedown", onDown);
//             document.removeEventListener("touchstart", onDown);
//             window.removeEventListener("scroll", close, true);
//             window.removeEventListener("resize", close);
//             window.removeEventListener("keydown", onKey);
//         };
//     }, [pos, close]);

//     const toggle = (e) => {
//         e.stopPropagation();
//         if (pos) return close();
//         const r = triggerRef.current.getBoundingClientRect();
//         const top = r.bottom + height > window.innerHeight ? Math.max(8, r.top - height - 4) : r.bottom + 4;
//         const left = Math.max(8, Math.min(r.right - WIDTH, window.innerWidth - WIDTH - 8));
//         setPos({ top, left });
//     };

//     return (
//         <>
//             <button
//                 ref={triggerRef}
//                 type="button"
//                 onClick={toggle}
//                 aria-haspopup="menu"
//                 aria-label="More options"
//                 className={`w-9 h-9 inline-flex items-center justify-center rounded-lg transition cursor-pointer ${pos ? "bg-indigo-100 text-indigo-700" : "text-slate-500 hover:bg-slate-100 hover:text-indigo-600"}`}
//             >
//                 <MoreVertical size={16} />
//             </button>

//             {pos && (
//                 <div
//                     data-pay-menu
//                     role="menu"
//                     style={{ top: pos.top, left: pos.left, width: WIDTH }}
//                     onClick={(e) => e.stopPropagation()}
//                     className="fixed z-[70] bg-white border border-slate-200 rounded-xl shadow-xl py-1.5"
//                 >
//                     {items.map((item) =>
//                         item === "divider" ? (
//                             <div key={Math.random()} className="my-1 border-t border-slate-100" />
//                         ) : (
//                             <button
//                                 key={item.key}
//                                 type="button"
//                                 role="menuitem"
//                                 disabled={item.disabled}
//                                 onClick={() => {
//                                     close();
//                                     item.onClick();
//                                 }}
//                                 className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold text-left transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${item.danger ? "text-rose-600 enabled:hover:bg-rose-50" : "text-slate-700 enabled:hover:bg-indigo-50 enabled:hover:text-indigo-600"}`}
//                             >
//                                 <item.icon size={14} className={item.danger ? "" : "text-slate-400"} /> {item.label}
//                             </button>
//                         )
//                     )}
//                     {note && <p className="px-3.5 pt-1 pb-1.5 text-[10px] leading-snug text-slate-400">{note}</p>}
//                 </div>
//             )}
//         </>
//     );
// }

// /* -------------------------------------------------------------------------- */
// /* PAYSLIP PREVIEW                                                            */
// /* -------------------------------------------------------------------------- */

// function Line({ label, value, strong = false, tone = "" }) {
//     return (
//         <div className={`flex items-center justify-between gap-3 py-2 text-xs ${strong ? "font-bold text-slate-900" : "text-slate-600"}`}>
//             <span className="min-w-0 break-words">{label}</span>
//             <span className={`font-mono shrink-0 ${tone || (strong ? "text-slate-900" : "text-slate-800 font-semibold")}`}>{value}</span>
//         </div>
//     );
// }

// function PayslipModal({ id, onClose, onDownload, downloading }) {
//     const [slip, setSlip] = useState(null);
//     const [error, setError] = useState("");
//     const [tick, setTick] = useState(0);

//     useEffect(() => {
//         let alive = true;
//         setSlip(null);
//         setError("");
//         api
//             .get(`/payroll/payslip/${id}`)
//             .then(({ data }) => alive && setSlip(data))
//             .catch((err) => alive && setError(err?.response?.data?.message || "Unable to load this payslip."));
//         return () => {
//             alive = false;
//         };
//     }, [id, tick]);

//     const emp = slip?.employee || {};
//     const a = slip?.attendance || {};

//     return (
//         <Sheet onClose={onClose} size="max-w-2xl">
//             <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/70">
//                 <div className="min-w-0">
//                     <h3 className="text-base font-bold text-slate-900 truncate">{slip ? `Payslip · ${slip.periodLabel}` : "Payslip"}</h3>
//                     {slip && <p className="text-[11px] text-slate-400 font-mono">{slip.slipNumber}</p>}
//                 </div>
//                 <div className="flex items-center gap-2 shrink-0">
//                     {slip && <StatusBadge status={lower(slip.status)} />}
//                     <button type="button" onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer" aria-label="Close">
//                         <X size={18} />
//                     </button>
//                 </div>
//             </div>

//             <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">
//                 {error ? (
//                     <div className="py-10 text-center space-y-3">
//                         <AlertCircle className="mx-auto text-rose-500" size={28} />
//                         <p className="text-sm font-semibold text-slate-700">{error}</p>
//                         <button type="button" onClick={() => setTick((t) => t + 1)} className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer">
//                             Retry
//                         </button>
//                     </div>
//                 ) : !slip ? (
//                     <div className="space-y-3 animate-pulse">
//                         {[0, 1, 2, 3].map((n) => (
//                             <div key={n} className="h-16 rounded-2xl bg-slate-100" />
//                         ))}
//                     </div>
//                 ) : (
//                     <>
//                         <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 text-white p-4 sm:p-5">
//                             <p className="text-base sm:text-lg font-bold">{slip.company?.name}</p>
//                             {slip.company?.address && <p className="text-[11px] text-white/80 mt-0.5">{slip.company.address}</p>}
//                         </div>

//                         <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 p-4 text-xs">
//                             {[
//                                 ["Employee", emp.name],
//                                 ["Employee ID", emp.employeeId],
//                                 ["Designation", cleanText(emp.designation)],
//                                 ["Department", cleanText(emp.department)],
//                                 ["Date of Joining", dateText(emp.dateOfJoining)],
//                                 ["Paid On", dateText(slip.paidOn)],
//                             ].map(([label, value]) => (
//                                 <div key={label} className="min-w-0">
//                                     <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
//                                     <p className="font-bold text-slate-800 mt-0.5 break-words">{value || "—"}</p>
//                                 </div>
//                             ))}
//                         </div>

//                         <div>
//                             <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
//                                 {[
//                                     ["Working Days", a.workingDays],
//                                     ["Present", a.present],
//                                     ["Paid Leave", a.leave],
//                                     ["Loss of Pay", a.unpaid],
//                                 ].map(([label, value]) => (
//                                     <div key={label} className="rounded-xl bg-slate-50 border border-slate-200/70 py-2.5">
//                                         <p className="text-lg font-extrabold font-mono text-slate-900">{value ?? 0}</p>
//                                         <p className="text-[10px] font-bold uppercase text-slate-400">{label}</p>
//                                     </div>
//                                 ))}
//                             </div>
//                             {slip.basis === "full" && (
//                                 <p className="mt-2 text-[11px] text-slate-400">Paid for the full month (attendance was not applied).</p>
//                             )}
//                         </div>

//                         <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
//                             <div className="rounded-2xl border border-slate-200 p-4">
//                                 <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 mb-1">Earnings</p>
//                                 <div className="divide-y divide-slate-100">
//                                     {slip.earningLines.map((l) => (
//                                         <Line key={l.key} label={l.label} value={rupee(l.amount)} />
//                                     ))}
//                                 </div>
//                                 <div className="border-t-2 border-slate-200 mt-1">
//                                     <Line label="Total Earnings" value={rupee(slip.totalEarnings)} strong />
//                                 </div>
//                             </div>

//                             <div className="rounded-2xl border border-slate-200 p-4">
//                                 <p className="text-[11px] font-bold uppercase tracking-wider text-rose-600 mb-1">Deductions</p>
//                                 <div className="divide-y divide-slate-100">
//                                     {slip.deductionLines.length ? (
//                                         slip.deductionLines.map((l) => <Line key={l.key} label={l.label} value={rupee(l.amount)} />)
//                                     ) : (
//                                         <p className="py-3 text-xs text-slate-400">No deductions this month.</p>
//                                     )}
//                                 </div>
//                                 <div className="border-t-2 border-slate-200 mt-1">
//                                     <Line label="Total Deductions" value={rupee(slip.totalDeductions)} strong />
//                                 </div>
//                             </div>
//                         </div>

//                         <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 sm:p-5">
//                             <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Net Pay</p>
//                             <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600 font-mono mt-0.5">{rupee(slip.netSalary)}</p>
//                             <p className="text-xs text-slate-600 mt-1">{slip.netInWords}</p>
//                         </div>
//                     </>
//                 )}
//             </div>

//             <div className="shrink-0 border-t border-slate-100 bg-white px-5 sm:px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
//                 <button type="button" onClick={onClose} className="px-5 py-3 sm:py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer">
//                     Close
//                 </button>
//                 <button
//                     type="button"
//                     onClick={() => onDownload(id)}
//                     disabled={!slip || downloading}
//                     className="inline-flex items-center justify-center gap-2 px-6 py-3 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
//                 >
//                     {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
//                     Download PDF
//                 </button>
//             </div>
//         </Sheet>
//     );
// }

// /* -------------------------------------------------------------------------- */
// /* GENERATE PAYSLIPS (admin and HR)                                           */
// /* -------------------------------------------------------------------------- */

// function GenerateModal({ month, year, onClose, onDone }) {
//     const [scope, setScope] = useState("all");
//     const [employees, setEmployees] = useState([]);
//     const [employee, setEmployee] = useState("");
//     const [fullMonth, setFullMonth] = useState(false);
//     const [overwrite, setOverwrite] = useState(false);
//     const [busy, setBusy] = useState(false);
//     const [error, setError] = useState("");
//     const [result, setResult] = useState(null);

//     useEffect(() => {
//         api
//             .get("/employees")
//             .then(({ data }) => {
//                 const list = Array.isArray(data) ? data : data?.employees || data?.data || [];
//                 setEmployees(
//                     list
//                         .filter((e) => !/inactive|exit/i.test(String(e.employeeStatus || "")))
//                         .map((e) => ({ id: e._id, label: `${e.name} (${e.employeeId || "—"})` }))
//                         .sort((a, b) => a.label.localeCompare(b.label))
//                 );
//             })
//             .catch(() => { });
//     }, []);

//     const now = new Date();
//     const openPeriod = year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1);
//     const periodLabel = `${MONTHS[month - 1]} ${year}`;

//     const submit = async () => {
//         if (busy) return;
//         if (scope === "one" && !employee) {
//             setError("Please select an employee.");
//             return;
//         }
//         setBusy(true);
//         setError("");
//         try {
//             if (scope === "one") {
//                 const { data } = await api.post("/payroll/generate", { employee, month, year, fullMonth, overwriteDraft: overwrite });
//                 setResult({ single: true, warnings: data.warnings || [] });
//             } else {
//                 const { data } = await api.post("/payroll/generate-bulk", { month, year, fullMonth, overwriteDrafts: overwrite });
//                 setResult(data);
//             }
//             onDone();
//         } catch (err) {
//             setError(err?.response?.data?.message || "Unable to generate the payslips.");
//         } finally {
//             setBusy(false);
//         }
//     };

//     const created = result?.results?.created?.length || 0;
//     const updated = result?.results?.updated?.length || 0;
//     const skipped = result?.results?.skipped || [];
//     const warned = [...(result?.results?.created || []), ...(result?.results?.updated || [])].filter((x) => x.warnings?.length);

//     return (
//         <Sheet onClose={onClose} locked={busy} size="max-w-xl">
//             <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/70">
//                 <div className="min-w-0">
//                     <h3 className="text-base font-bold text-slate-900">Generate Payslips</h3>
//                     <p className="text-xs text-slate-400">For {periodLabel}. They are created as drafts first.</p>
//                 </div>
//                 <button type="button" onClick={onClose} disabled={busy} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer" aria-label="Close">
//                     <X size={18} />
//                 </button>
//             </div>

//             <div className="flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6 space-y-4">
//                 {result ? (
//                     <div className="space-y-4">
//                         <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 flex items-start gap-3">
//                             <CheckCircle2 className="text-emerald-600 shrink-0 mt-0.5" size={18} />
//                             <div className="text-sm">
//                                 <p className="font-bold text-emerald-800">{result.single ? "Payslip generated" : result.message}</p>
//                                 {!result.single && (
//                                     <p className="text-xs text-emerald-700 mt-0.5">
//                                         {created} created · {updated} refreshed · {skipped.length} skipped
//                                     </p>
//                                 )}
//                             </div>
//                         </div>

//                         {warned.length > 0 || result.warnings?.length > 0 ? (
//                             <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4">
//                                 <p className="text-xs font-bold text-amber-800 mb-1.5">Please check</p>
//                                 <ul className="space-y-1 text-[11px] text-amber-800 max-h-32 overflow-y-auto">
//                                     {(result.warnings || []).map((w, i) => (
//                                         <li key={i}>• {w}</li>
//                                     ))}
//                                     {warned.slice(0, 15).map((x) => (
//                                         <li key={x.employeeId + x.name}>
//                                             • {x.name}: {x.warnings.join(" ")}
//                                         </li>
//                                     ))}
//                                 </ul>
//                             </div>
//                         ) : null}

//                         {skipped.length > 0 && (
//                             <div className="rounded-2xl border border-slate-200 p-4">
//                                 <p className="text-xs font-bold text-slate-700 mb-1.5">Skipped ({skipped.length})</p>
//                                 <ul className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
//                                     {skipped.map((s, i) => (
//                                         <li key={i} className="py-2 text-[11px] flex items-start justify-between gap-3">
//                                             <span className="font-semibold text-slate-700">
//                                                 {s.name} <span className="text-slate-400 font-mono">{s.employeeId}</span>
//                                             </span>
//                                             <span className="text-slate-500 text-right">{s.reason}</span>
//                                         </li>
//                                     ))}
//                                 </ul>
//                             </div>
//                         )}
//                     </div>
//                 ) : (
//                     <>
//                         <div className="grid grid-cols-2 gap-2.5">
//                             {[
//                                 ["all", "All employees"],
//                                 ["one", "One employee"],
//                             ].map(([key, label]) => (
//                                 <button
//                                     key={key}
//                                     type="button"
//                                     onClick={() => setScope(key)}
//                                     className={`py-3 rounded-xl border text-xs font-bold transition cursor-pointer ${scope === key ? "border-indigo-500 bg-indigo-50 text-indigo-700 ring-4 ring-indigo-500/10" : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300"}`}
//                                 >
//                                     {label}
//                                 </button>
//                             ))}
//                         </div>

//                         {scope === "one" && (
//                             <select value={employee} onChange={(e) => setEmployee(e.target.value)} className={`${inputClass} w-full`}>
//                                 <option value="">Select employee</option>
//                                 {employees.map((e) => (
//                                     <option key={e.id} value={e.id}>
//                                         {e.label}
//                                     </option>
//                                 ))}
//                             </select>
//                         )}

//                         <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 hover:border-indigo-300 transition cursor-pointer">
//                             <input type="checkbox" checked={fullMonth} onChange={(e) => setFullMonth(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600" />
//                             <span>
//                                 <span className="block text-sm font-bold text-slate-800">Pay the full month (ignore attendance)</span>
//                                 <span className="block text-[11px] text-slate-400 mt-0.5">No Loss of Pay is cut. It also lets you generate the running month.</span>
//                             </span>
//                         </label>

//                         <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 hover:border-indigo-300 transition cursor-pointer">
//                             <input type="checkbox" checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600" />
//                             <span>
//                                 <span className="block text-sm font-bold text-slate-800">Refresh drafts that already exist</span>
//                                 <span className="block text-[11px] text-slate-400 mt-0.5">Rebuilds them from the latest attendance, bonus and deductions. Processed and paid payslips are never touched.</span>
//                             </span>
//                         </label>

//                         {openPeriod && !fullMonth && (
//                             <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
//                                 <AlertCircle size={15} className="shrink-0 mt-0.5" />
//                                 <p className="font-medium">{periodLabel} has not ended yet. Choose an earlier month, or tick &quot;Pay the full month&quot;.</p>
//                             </div>
//                         )}

//                         {error && (
//                             <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
//                                 <AlertCircle size={15} className="shrink-0 mt-0.5" />
//                                 <p className="font-medium break-words">{error}</p>
//                             </div>
//                         )}
//                     </>
//                 )}
//             </div>

//             <div className="shrink-0 border-t border-slate-100 bg-white px-5 sm:px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
//                 {result ? (
//                     <button type="button" onClick={onClose} className="px-6 py-3 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition cursor-pointer">
//                         Done
//                     </button>
//                 ) : (
//                     <>
//                         <button type="button" onClick={onClose} disabled={busy} className="px-5 py-3 sm:py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50">
//                             Cancel
//                         </button>
//                         <button
//                             type="button"
//                             onClick={submit}
//                             disabled={busy}
//                             className="inline-flex items-center justify-center gap-2 px-6 py-3 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 transition cursor-pointer disabled:opacity-60"
//                         >
//                             {busy ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
//                             {busy ? "Generating..." : "Generate"}
//                         </button>
//                     </>
//                 )}
//             </div>
//         </Sheet>
//     );
// }

// /* -------------------------------------------------------------------------- */
// /* PAGE                                                                       */
// /* -------------------------------------------------------------------------- */

// export default function PayrollPage() {
//     const { user } = useAuth();
//     const role = lower(user?.role);
//     const manage = role === "admin" || role === "hr"; // generate, process and pay
//     const isAdmin = role === "admin";
//     const ownId = String(user?.employee?._id || user?.employee || "");

//     // admin and HR start with the last finished month, everyone else with the whole current year
//     const [month, setMonth] = useState(() => {
//         const d = new Date();
//         d.setDate(1);
//         d.setMonth(d.getMonth() - 1);
//         return d.getMonth() + 1;
//     });
//     const [year, setYear] = useState(() => {
//         const d = new Date();
//         d.setDate(1);
//         d.setMonth(d.getMonth() - 1);
//         return d.getFullYear();
//     });
//     const [ready, setReady] = useState(false);

//     const [rows, setRows] = useState([]);
//     const [loading, setLoading] = useState(true);
//     const [refreshing, setRefreshing] = useState(false);
//     const [error, setError] = useState("");

//     const [search, setSearch] = useState("");
//     const [filter, setFilter] = useState("all");

//     const [generateOpen, setGenerateOpen] = useState(false);
//     const [slipId, setSlipId] = useState("");
//     const [ask, setAsk] = useState(null);
//     const [busyId, setBusyId] = useState("");
//     const [bulkBusy, setBulkBusy] = useState("");
//     const [downloadingId, setDownloadingId] = useState("");

//     useEffect(() => {
//         if (!user || ready) return;
//         if (!manage) {
//             setMonth("ALL");
//             setYear(THIS_YEAR);
//         }
//         setReady(true);
//     }, [user, manage, ready]);

//     const fetchRows = useCallback(
//         async ({ silent = false } = {}) => {
//             if (!user || !ready) return;
//             if (silent) setRefreshing(true);
//             else setLoading(true);
//             setError("");
//             try {
//                 const params = manage ? { month, year } : { year, ...(month !== "ALL" ? { month } : {}) };
//                 const { data } = await api.get(manage ? "/payroll" : "/payroll/payslips", { params });
//                 setRows(Array.isArray(data) ? data : []);
//             } catch (err) {
//                 setError(err?.response?.data?.message || "Unable to load the payslips. Please try again.");
//             } finally {
//                 setLoading(false);
//                 setRefreshing(false);
//             }
//         },
//         [user, ready, manage, month, year]
//     );

//     useEffect(() => {
//         fetchRows();
//     }, [fetchRows]);

//     const items = useMemo(() => rows.map((r) => toItem(r, manage, ownId)), [rows, manage, ownId]);

//     const stats = useMemo(() => {
//         const sum = (key) => items.reduce((total, i) => total + (Number(i[key]) || 0), 0);
//         const count = (s) => items.filter((i) => i.status === s).length;
//         return { gross: sum("gross"), ded: sum("ded"), net: sum("net"), draft: count("draft"), processed: count("processed"), paid: count("paid"), total: items.length };
//     }, [items]);

//     const visible = useMemo(() => {
//         const q = search.trim().toLowerCase();
//         return items.filter((i) => (filter === "all" || i.status === filter) && (!q || `${i.title} ${i.sub}`.toLowerCase().includes(q)));
//     }, [items, filter, search]);

//     /* ---- actions ---- */
//     const downloadById = async (id) => {
//         if (downloadingId) return;
//         setDownloadingId(id);
//         try {
//             const { data } = await api.get(`/payroll/payslip/${id}`);
//             const { downloadPayslipPdf } = await import("@/lib/payslipPdf");
//             await downloadPayslipPdf(data);
//         } catch (err) {
//             toast.error(err?.response?.data?.message || "Unable to create the PDF.");
//         } finally {
//             setDownloadingId("");
//         }
//     };

//     const act = async (kind, item) => {
//         if (busyId) return;
//         setBusyId(item.id);
//         try {
//             if (kind === "process") await api.put(`/payroll/${item.id}/process`);
//             else if (kind === "pay") await api.put(`/payroll/${item.id}/mark-paid`);
//             else if (kind === "recalc") await api.put(`/payroll/${item.id}/recalculate`);
//             else if (kind === "delete") await api.delete(`/payroll/${item.id}`);
//             toast.success({ process: "Payslip processed.", pay: "Marked as paid.", recalc: "Payslip recalculated.", delete: "Payslip deleted." }[kind]);
//             await fetchRows({ silent: true });
//         } catch (err) {
//             toast.error(err?.response?.data?.message || "This action could not be completed.");
//         } finally {
//             setBusyId("");
//         }
//     };

//     const bulk = async (kind) => {
//         setBulkBusy(kind);
//         try {
//             const { data } =
//                 kind === "process" ? await api.post("/payroll/process-bulk", { month, year }) : await api.post(`/payroll/disburse/${year}-${month}`);
//             toast.success(data?.message || "Done.");
//             await fetchRows({ silent: true });
//         } catch (err) {
//             toast.error(err?.response?.data?.message || "This action could not be completed.");
//         } finally {
//             setBulkBusy("");
//         }
//     };

//     const periodText = month === "ALL" ? `All of ${year}` : `${MONTHS[month - 1]} ${year}`;

//     const renderActions = (item) => {
//         if (!manage) {
//             return (
//                 <div className="inline-flex items-center gap-1.5">
//                     <button type="button" onClick={() => setSlipId(item.id)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 text-xs font-bold transition cursor-pointer">
//                         <Eye size={13} /> View
//                     </button>
//                     <button
//                         type="button"
//                         onClick={() => downloadById(item.id)}
//                         disabled={downloadingId === item.id}
//                         className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition cursor-pointer disabled:opacity-60"
//                     >
//                         {downloadingId === item.id ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />} PDF
//                     </button>
//                 </div>
//             );
//         }
//         if (busyId === item.id) return <Loader2 size={18} className="animate-spin text-indigo-600 mx-auto" />;

//         const menu = [
//             { key: "view", label: "View Payslip", icon: Eye, onClick: () => setSlipId(item.id) },
//             { key: "pdf", label: "Download PDF", icon: Download, onClick: () => downloadById(item.id) },
//         ];
//         if (item.status === "draft") {
//             menu.push("divider");
//             menu.push({ key: "recalc", label: "Recalculate", icon: RotateCcw, disabled: item.own, onClick: () => act("recalc", item) });
//             menu.push({ key: "process", label: "Process", icon: Play, disabled: item.own, onClick: () => act("process", item) });
//         }
//         if (item.status === "processed") {
//             menu.push("divider");
//             menu.push({
//                 key: "pay",
//                 label: "Mark as Paid",
//                 icon: BadgeCheck,
//                 disabled: item.own,
//                 onClick: () =>
//                     setAsk({
//                         title: "Mark this payslip as paid?",
//                         text: `${item.title}: ${rupee(item.net)}. Loan EMI, bonus and claims in this payslip will be settled. This cannot be undone.`,
//                         label: "Mark as Paid",
//                         run: () => act("pay", item),
//                     }),
//             });
//         }
//         if (isAdmin && item.status !== "paid") {
//             menu.push("divider");
//             menu.push({
//                 key: "delete",
//                 label: "Delete",
//                 icon: Trash2,
//                 danger: true,
//                 onClick: () =>
//                     setAsk({ title: "Delete this payslip?", text: `The ${item.period} payslip of ${item.title} will be removed.`, label: "Delete", tone: "danger", run: () => act("delete", item) }),
//             });
//         }
//         return <ActionMenu items={menu} note={item.own && item.status !== "paid" ? "Your own payslip needs an admin to process or pay." : ""} />;
//     };

//     return (
//         <div className="max-w-[1400px] mx-auto px-3 sm:px-4 py-4 space-y-4 antialiased pb-16">
//             {/* Header */}
//             <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/70 shadow-sm">
//                 <div className="min-w-0">
//                     <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">{manage ? "Payroll Management" : "My Payslips"}</h1>
//                     <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
//                         {manage ? "Generate, process and pay salaries, and open any payslip." : "Your salary slips. Open one to see the full details or download it as a PDF."}
//                     </p>
//                 </div>

//                 <div className="flex flex-wrap items-center gap-2.5">
//                     <button
//                         type="button"
//                         onClick={() => fetchRows({ silent: true })}
//                         disabled={loading || refreshing}
//                         className="p-3 sm:p-2.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition cursor-pointer disabled:opacity-50"
//                         aria-label="Refresh"
//                         title="Refresh"
//                     >
//                         <RefreshCw size={16} className={loading || refreshing ? "animate-spin text-indigo-600" : ""} />
//                     </button>

//                     {manage && (
//                         <>
//                             {stats.draft > 0 && (
//                                 <button
//                                     type="button"
//                                     disabled={Boolean(bulkBusy)}
//                                     onClick={() =>
//                                         setAsk({
//                                             title: `Process ${stats.draft} draft payslip${stats.draft === 1 ? "" : "s"}?`,
//                                             text: `${periodText}. Employees will get a notification and can see these payslips. HR's own payslip is left for an admin.`,
//                                             label: "Process All",
//                                             run: () => bulk("process"),
//                                         })
//                                     }
//                                     className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition cursor-pointer disabled:opacity-60"
//                                 >
//                                     {bulkBusy === "process" ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} Process All ({stats.draft})
//                                 </button>
//                             )}
//                             {stats.processed > 0 && (
//                                 <button
//                                     type="button"
//                                     disabled={Boolean(bulkBusy)}
//                                     onClick={() =>
//                                         setAsk({
//                                             title: `Pay ${stats.processed} processed payslip${stats.processed === 1 ? "" : "s"}?`,
//                                             text: `${periodText}. Loan EMIs, bonuses and claims included in them will be settled. This cannot be undone.`,
//                                             label: "Pay All",
//                                             run: () => bulk("pay"),
//                                         })
//                                     }
//                                     className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition cursor-pointer disabled:opacity-60"
//                                 >
//                                     {bulkBusy === "pay" ? <Loader2 size={14} className="animate-spin" /> : <BadgeCheck size={14} />} Pay All ({stats.processed})
//                                 </button>
//                             )}
//                             <button
//                                 type="button"
//                                 onClick={() => setGenerateOpen(true)}
//                                 className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition cursor-pointer"
//                             >
//                                 <Zap size={14} /> Generate Payslips
//                             </button>
//                         </>
//                     )}
//                 </div>
//             </div>

//             {/* Summary */}
//             <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
//                 <StatCard icon={Wallet} tone="indigo" label={manage ? "Total Gross" : "Total Earnings"} value={rupeeShort(stats.gross)} />
//                 <StatCard icon={ArrowDownRight} tone="rose" label="Total Deductions" value={rupeeShort(stats.ded)} />
//                 <StatCard icon={TrendingUp} tone="emerald" label={manage ? "Net Payable" : "Net Pay"} value={rupeeShort(stats.net)} />
//                 {manage ? (
//                     <StatCard icon={CheckCircle2} tone="violet" label="Paid" value={`${stats.paid}/${stats.total}`} sub={`${stats.total ? Math.round((stats.paid / stats.total) * 100) : 0}% disbursed`} />
//                 ) : (
//                     <StatCard icon={FileText} tone="violet" label="Payslips" value={stats.total} sub={periodText} />
//                 )}
//             </div>

//             {/* Filters */}
//             <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/70 shadow-sm space-y-3">
//                 <div className="flex flex-wrap items-center gap-2.5">
//                     <Calendar size={15} className="text-slate-400" />
//                     <select value={month} onChange={(e) => setMonth(e.target.value === "ALL" ? "ALL" : Number(e.target.value))} className={inputClass}>
//                         {!manage && <option value="ALL">All months</option>}
//                         {MONTHS.map((m, i) => (
//                             <option key={m} value={i + 1}>
//                                 {m}
//                             </option>
//                         ))}
//                     </select>
//                     <select value={year} onChange={(e) => setYear(Number(e.target.value))} className={inputClass}>
//                         {YEARS.map((y) => (
//                             <option key={y} value={y}>
//                                 {y}
//                             </option>
//                         ))}
//                     </select>

//                     {manage && (
//                         <div className="relative flex-1 min-w-[180px] sm:max-w-xs ml-auto">
//                             <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
//                             <input
//                                 value={search}
//                                 onChange={(e) => setSearch(e.target.value)}
//                                 placeholder="Search employee or ID"
//                                 className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs outline-none transition focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
//                             />
//                         </div>
//                     )}
//                 </div>

//                 {manage && (
//                     <div className="flex gap-2 overflow-x-auto">
//                         {FILTERS.map(([key, label]) => (
//                             <button
//                                 key={key}
//                                 type="button"
//                                 onClick={() => setFilter(key)}
//                                 className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border transition cursor-pointer ${filter === key ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"}`}
//                             >
//                                 {label}
//                                 <span className={`px-1.5 rounded-full text-[10px] ${filter === key ? "bg-white/20" : "bg-slate-100 text-slate-500"}`}>{key === "all" ? stats.total : stats[key]}</span>
//                             </button>
//                         ))}
//                     </div>
//                 )}
//             </div>

//             {error && (
//                 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl">
//                     <div className="flex items-center gap-3 min-w-0">
//                         <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
//                         <p className="text-xs sm:text-sm font-medium">{error}</p>
//                     </div>
//                     <button type="button" onClick={() => fetchRows()} className="self-end sm:self-auto px-3.5 py-1.5 bg-white text-rose-700 text-xs font-semibold rounded-lg border border-rose-200 hover:bg-rose-100/50 transition cursor-pointer">
//                         Retry
//                     </button>
//                 </div>
//             )}

//             {/* List */}
//             <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
//                 {loading ? (
//                     <div className="divide-y divide-slate-100">
//                         {[0, 1, 2, 3].map((n) => (
//                             <div key={n} className="p-4 sm:p-5 flex gap-3.5 animate-pulse">
//                                 <div className="w-10 h-10 rounded-full bg-slate-100 shrink-0" />
//                                 <div className="flex-1 space-y-2.5">
//                                     <div className="h-3.5 w-1/3 rounded bg-slate-100" />
//                                     <div className="h-3 w-1/2 rounded bg-slate-100" />
//                                 </div>
//                             </div>
//                         ))}
//                     </div>
//                 ) : visible.length === 0 ? (
//                     <div className="text-center py-16 sm:py-20 px-4">
//                         <Calendar size={40} className="mx-auto text-slate-300 mb-3 stroke-[1.5]" />
//                         <p className="font-semibold text-slate-700 text-sm">{items.length === 0 ? "No payslips found" : "Nothing matches your search"}</p>
//                         <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
//                             {items.length === 0
//                                 ? manage
//                                     ? `Click "Generate Payslips" to create the payslips of ${periodText}.`
//                                     : `There is no processed payslip for ${periodText} yet. It appears here once HR processes it.`
//                                 : "Try another keyword or status."}
//                         </p>
//                     </div>
//                 ) : (
//                     <>
//                         {/* Mobile and tablet: cards */}
//                         <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 sm:p-4 lg:hidden">
//                             {visible.map((i) => (
//                                 <div key={i.id} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
//                                     <div className="flex items-start justify-between gap-2">
//                                         <div className="flex items-center gap-3 min-w-0">
//                                             <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center font-bold text-xs shrink-0">
//                                                 {String(i.title || "?").charAt(0).toUpperCase()}
//                                             </div>
//                                             <div className="min-w-0">
//                                                 <p className="text-sm font-bold text-slate-900 truncate">{i.title}</p>
//                                                 <p className="text-[11px] text-slate-500 truncate">{manage ? `${i.period} • ${i.sub}` : i.sub}</p>
//                                             </div>
//                                         </div>
//                                         <StatusBadge status={i.status} />
//                                     </div>

//                                     <div className="grid grid-cols-3 gap-2 text-center">
//                                         {[
//                                             ["Gross", rupeeShort(i.gross), "text-slate-800"],
//                                             ["Deductions", `-${rupeeShort(i.ded)}`, "text-rose-600"],
//                                             ["Net", rupeeShort(i.net), "text-emerald-600"],
//                                         ].map(([label, value, cls]) => (
//                                             <div key={label} className="rounded-xl bg-slate-50 py-2 px-1 min-w-0">
//                                                 <p className="text-[10px] font-bold uppercase text-slate-400">{label}</p>
//                                                 <p className={`text-xs font-bold truncate ${cls}`}>{value}</p>
//                                             </div>
//                                         ))}
//                                     </div>

//                                     <div className="flex items-center justify-between gap-2">
//                                         <p className="text-[11px] text-slate-400">
//                                             Days {daysText(i)}
//                                             {i.unpaid > 0 ? ` • ${i.unpaid} LOP` : ""}
//                                         </p>
//                                         {renderActions(i)}
//                                     </div>
//                                 </div>
//                             ))}
//                         </div>

//                         {/* Desktop: table */}
//                         <div className="hidden lg:block overflow-x-auto">
//                             <table className="w-full text-left text-xs text-slate-600 border-collapse">
//                                 <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase">
//                                     <tr>
//                                         <th className="px-5 py-3.5">{manage ? "Employee" : "Period"}</th>
//                                         <th className="px-4 py-3.5">Days</th>
//                                         <th className="px-4 py-3.5">Gross</th>
//                                         <th className="px-4 py-3.5">Deductions</th>
//                                         <th className="px-4 py-3.5">Net Salary</th>
//                                         <th className="px-4 py-3.5">Status</th>
//                                         <th className="px-4 py-3.5 text-center">Action</th>
//                                     </tr>
//                                 </thead>
//                                 <tbody className="divide-y divide-slate-100">
//                                     {visible.map((i) => (
//                                         <tr key={i.id} onClick={() => setSlipId(i.id)} className="hover:bg-indigo-50/40 transition-colors cursor-pointer">
//                                             <td className="px-5 py-3.5">
//                                                 <div className="flex items-center gap-3">
//                                                     <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center font-bold text-xs shrink-0">
//                                                         {String(i.title || "?").charAt(0).toUpperCase()}
//                                                     </div>
//                                                     <div className="min-w-0">
//                                                         <p className="font-semibold text-slate-800 text-sm truncate max-w-[220px]">{i.title}</p>
//                                                         <p className="text-[11px] text-slate-400 truncate max-w-[220px]">{manage ? `${i.sub}` : i.sub}</p>
//                                                     </div>
//                                                 </div>
//                                             </td>
//                                             <td className="px-4 py-3.5 font-mono text-slate-700 whitespace-nowrap">
//                                                 {daysText(i)}
//                                                 {i.unpaid > 0 && <span className="ml-1.5 text-[10px] font-bold text-rose-500">{i.unpaid} LOP</span>}
//                                             </td>
//                                             <td className="px-4 py-3.5 font-semibold text-slate-700 whitespace-nowrap">{rupee(i.gross)}</td>
//                                             <td className="px-4 py-3.5 font-semibold text-rose-500 whitespace-nowrap">- {rupee(i.ded)}</td>
//                                             <td className="px-4 py-3.5 whitespace-nowrap">
//                                                 <span className="inline-flex font-bold text-emerald-600 bg-emerald-50/70 px-2.5 py-1 rounded-md border border-emerald-100">{rupee(i.net)}</span>
//                                             </td>
//                                             <td className="px-4 py-3.5">
//                                                 <StatusBadge status={i.status} />
//                                             </td>
//                                             <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
//                                                 {renderActions(i)}
//                                             </td>
//                                         </tr>
//                                     ))}
//                                 </tbody>
//                             </table>
//                         </div>
//                     </>
//                 )}
//             </div>

//             {generateOpen && <GenerateModal month={Number(month)} year={year} onClose={() => setGenerateOpen(false)} onDone={() => fetchRows({ silent: true })} />}
//             {slipId && <PayslipModal id={slipId} onClose={() => setSlipId("")} onDownload={downloadById} downloading={downloadingId === slipId} />}
//             {ask && <ConfirmDialog ask={ask} onClose={() => setAsk(null)} />}
//         </div>
//     );
// }