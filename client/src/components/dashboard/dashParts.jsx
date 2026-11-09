"use client";

import { useEffect, useRef, useState } from "react";
import {
    AlertCircle, ArrowRight, ArrowUpRight, Calendar, CalendarCheck, CheckCircle2, Clock, Download, Loader2, LogIn, LogOut,
    Moon, Target, TrendingUp, User, Wallet, X, Zap,
} from "lucide-react";
import {
    DAY_STYLE, DOT, LEGEND, TASK_TABS, TONES, WEEKDAYS, assignerText, assigneeText, formatDate, formatDuration, formatHours, formatMoney,
    formatTime, formatYMD, getInitials, getPunchAction, isTaskCancelled, isTaskDone, isTaskHigh, isTaskSubmitted, lower, monthLabel,
    taskDue, taskProgress,
} from "./dashUtils";

const ENERGY_OPTIONS = [
    { value: "Focused", icon: Target }, { value: "Busy", icon: Zap }, { value: "Available", icon: CheckCircle2 }, { value: "Away", icon: Moon },
];
const linkBtn = "inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-bold bg-indigo-50 hover:bg-indigo-100 active:scale-95 px-3 py-1.5 rounded-xl border border-indigo-100 transition self-start cursor-pointer";

/* ------------------------------ basic blocks ------------------------------ */

export function Panel({ icon: Icon, title, subtitle, right, children, className = "" }) {
    return (
        <section className={`min-w-0 bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm space-y-3 hover:shadow-md hover:border-indigo-200/70 transition-all duration-300 ${className}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="min-w-0">
                    <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        {Icon && <Icon size={15} className="text-indigo-600 shrink-0" />}<span className="truncate">{title}</span>
                    </h2>
                    {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
                </div>
                {right}
            </div>
            {children}
        </section>
    );
}

export function EmptyState({ icon: Icon = AlertCircle, text, tone = "text-slate-300", action }) {
    return (
        <div className="py-8 text-center text-xs text-slate-400 space-y-2">
            <Icon size={26} className={`mx-auto ${tone}`} />
            <p className="font-medium text-slate-500">{text}</p>
            {action}
        </div>
    );
}
export const NoData = ({ text = "No data found" }) => <p className="py-8 text-center text-xs text-slate-400 font-medium">{text}</p>;

export function StatCard({ label, value, sub, icon: Icon, tone, onClick }) {
    const t = TONES[tone] || TONES.indigo;
    return (
        <div onClick={onClick} className={`min-w-0 bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-sm transition-all duration-200 flex flex-col justify-between ${onClick ? `cursor-pointer ${t.hover} hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98]` : ""}`}>
            <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">{label}</span>
                <div className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center border ${t.box}`}><Icon size={14} /></div>
            </div>
            <div className="mt-2 min-w-0">
                <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 font-mono truncate">{value}</h3>
                <p className={`text-[11px] font-medium truncate ${t.sub}`}>{sub}</p>
            </div>
        </div>
    );
}

export const InfoRow = ({ label, value }) => (
    <div className="flex items-center justify-between gap-4 py-2.5 border-b border-slate-100 last:border-0 text-xs">
        <span className="text-slate-400 shrink-0">{label}</span>
        <span className="font-semibold text-slate-800 text-right truncate">{value ?? "—"}</span>
    </div>
);

export function WidgetCard({ title, right, footer, children }) {
    return (
        <div className="min-w-0 h-full bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col hover:shadow-md hover:border-indigo-200/70 transition-all duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 sm:px-5 py-3.5 border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-900 shrink-0">{title}</h2>
                {right && <div className="min-w-0 max-w-full">{right}</div>}
            </div>
            <div className="flex-1 min-h-[96px]">{children}</div>
            {footer && <div className="border-t border-slate-100 px-4 py-3 text-center">{footer}</div>}
        </div>
    );
}
export const FooterLink = ({ label, onClick }) => (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 active:scale-95 transition cursor-pointer">
        {label} <ArrowRight size={12} />
    </button>
);

export function PeriodToggle({ value, onChange }) {
    return (
        <div className="inline-flex p-0.5 rounded-xl bg-slate-100 border border-slate-200 self-start shrink-0">
            {[["week", "Weekly"], ["month", "Monthly"]].map(([k, l]) => (
                <button key={k} type="button" onClick={() => onChange(k)} className={`px-3.5 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${value === k ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>{l}</button>
            ))}
        </div>
    );
}

export function TaskTabs({ tab, setTab }) {
    return (
        <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 sm:flex-wrap sm:justify-end">
            {TASK_TABS.map(([k, l]) => (
                <button key={k} type="button" onClick={() => setTab(k)} className={`shrink-0 whitespace-nowrap px-3 py-1 rounded-full text-[11px] font-semibold border transition cursor-pointer ${tab === k ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"}`}>{l}</button>
            ))}
        </div>
    );
}

export const CustomAttendanceTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const row = payload[0]?.payload || {};
    return (
        <div className="bg-slate-900/95 text-white p-3 rounded-xl shadow-2xl border border-slate-800 text-xs min-w-[140px]">
            <p className="font-semibold text-slate-300 mb-2 border-b border-slate-800 pb-1.5 flex items-center justify-between"><span>{row.label || label}</span><Clock size={12} className="text-slate-400" /></p>
            <div className="space-y-1.5 font-medium">
                <div className="flex justify-between gap-3"><span className="text-indigo-300">Present</span><b className="font-mono">{payload[0]?.value ?? 0}</b></div>
                <div className="flex justify-between gap-3"><span className="text-rose-300">Absent</span><b className="font-mono">{payload[1]?.value ?? 0}</b></div>
                {row.late > 0 && <div className="flex justify-between gap-3"><span className="text-amber-300">Late</span><b className="font-mono">{row.late}</b></div>}
            </div>
        </div>
    );
};

/* ------------------------------ popups ------------------------------ */

export function ListModal({ title, subtitle, tabs, onClose, children }) {
    const closeRef = useRef(onClose);
    closeRef.current = onClose;
    useEffect(() => {
        const onKey = (e) => e.key === "Escape" && closeRef.current();
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        document.addEventListener("keydown", onKey);
        return () => { document.body.style.overflow = prev; document.removeEventListener("keydown", onKey); };
    }, []);
    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-[2px] p-0 sm:p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div className="w-full sm:max-w-2xl bg-white rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col max-h-[90dvh] animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between gap-3 px-4 sm:px-5 py-4 border-b border-slate-100">
                    <div className="min-w-0"><h3 className="text-base font-bold text-slate-900">{title}</h3>{subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}</div>
                    <button type="button" onClick={onClose} aria-label="Close" className="shrink-0 w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500 flex items-center justify-center cursor-pointer"><X size={16} /></button>
                </div>
                {tabs && <div className="px-4 sm:px-5 pt-3">{tabs}</div>}
                <div className="flex-1 overflow-y-auto overscroll-contain min-h-[120px]">{children}</div>
            </div>
        </div>
    );
}

export function HolidayList({ holidays, todayYMD }) {
    if (holidays.length === 0) return <NoData text="No holidays found for this year" />;
    const upcoming = holidays.filter((h) => h.key >= todayYMD);
    const past = holidays.filter((h) => h.key < todayYMD).reverse();
    const row = (h, faded) => {
        const d = new Date(`${h.key}T00:00:00`);
        const isToday = h.key === todayYMD;
        return (
            <li key={h._id || `${h.key}-${h.title}`} className={`flex items-start gap-3 px-4 sm:px-5 py-3 ${faded ? "opacity-60" : ""} ${isToday ? "bg-amber-50/60" : ""}`}>
                <div className="w-12 shrink-0 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100 text-center py-1.5">
                    <p className="text-base font-extrabold leading-none">{d.getDate()}</p>
                    <p className="text-[10px] font-bold uppercase mt-0.5">{d.toLocaleDateString("en-IN", { month: "short" })}</p>
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 break-words">{h.title}</p>
                    <p className="text-[11px] text-slate-500">{d.toLocaleDateString("en-IN", { weekday: "long" })}{h.description ? ` · ${h.description}` : ""}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                    {isToday && <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">Today</span>}
                    {h.optional && <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-violet-50 text-violet-700 border border-violet-200">Optional</span>}
                </div>
            </li>
        );
    };
    return (
        <div>
            {upcoming.length > 0 && <><p className="px-4 sm:px-5 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Upcoming</p><ul className="divide-y divide-slate-100">{upcoming.map((h) => row(h, false))}</ul></>}
            {past.length > 0 && <><p className="px-4 sm:px-5 pt-4 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Past</p><ul className="divide-y divide-slate-100">{past.map((h) => row(h, true))}</ul></>}
        </div>
    );
}

/* modes: progress (daily update), submit (work for review), rework (manager sends it back) */
export function TaskActionModal({ state, progress, setProgress, note, setNote, link, setLink, busy, onClose, onSave }) {
    if (!state) return null;
    const { mode, task } = state;
    const cfg = {
        progress: { title: "Today's Work Update", label: "What did you work on today? *", btn: "Save Update" },
        submit: { title: "Submit Work for Review", label: "What did you complete? *", btn: "Submit for Review" },
        rework: { title: "Send back for rework", label: "What should the employee fix? *", btn: "Send back" },
    }[mode];
    return (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-[2px] p-0 sm:p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl p-5 space-y-4 max-h-[90dvh] overflow-y-auto animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                <div><h3 className="text-base font-bold text-slate-900">{cfg.title}</h3><p className="text-xs text-slate-500 mt-0.5 break-words">{task.title || task.name}</p></div>
                {mode === "progress" && (
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between"><label className="text-xs font-semibold text-slate-600">How much of the task is done?</label><span className="text-sm font-extrabold text-indigo-600 font-mono">{progress}%</span></div>
                        <input type="range" min="0" max="100" step="5" value={progress} onChange={(e) => setProgress(Number(e.target.value))} className="w-full accent-indigo-600 cursor-pointer" />
                    </div>
                )}
                {mode === "submit" && <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">Current progress: <b className="text-slate-700">{taskProgress(task)}%</b>. You can submit even if the task is only partly done.</p>}
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600">{cfg.label}</label>
                    <textarea rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Short summary..." className="w-full rounded-xl border border-slate-200 px-3 py-2 text-base sm:text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
                </div>
                {mode === "submit" && (
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-600">Link (optional)</label>
                        <input type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://drive.google.com/..." className="w-full rounded-xl border border-slate-200 px-3 py-2 text-base sm:text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
                    </div>
                )}
                <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
                    <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 active:scale-95 transition cursor-pointer">Cancel</button>
                    <button type="button" onClick={onSave} disabled={busy} className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white text-xs font-bold active:scale-95 transition disabled:opacity-60 cursor-pointer ${mode === "rework" ? "bg-rose-600 hover:bg-rose-700" : "bg-indigo-600 hover:bg-indigo-700"}`}>
                        {busy && <Loader2 size={13} className="animate-spin" />}{cfg.btn}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ------------------------------ tasks ------------------------------ */

const statusPill = (t, done, submitted, cancelled) =>
    done ? "bg-emerald-50 text-emerald-700 border-emerald-200" : submitted ? "bg-violet-50 text-violet-700 border-violet-200" : cancelled ? "bg-slate-100 text-slate-500 border-slate-200" : isTaskHigh(t) ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-slate-50 text-slate-600 border-slate-200";

export function EmployeeTaskRow({ t, todayYMD, onProgress, onSubmit }) {
    const by = assignerText(t);
    const done = isTaskDone(t), submitted = isTaskSubmitted(t), cancelled = isTaskCancelled(t);
    const open = !done && !submitted && !cancelled;
    const rework = open && t.review?.comment;
    const todayUpdate = Array.isArray(t.updates) ? t.updates.find((u) => u.date === todayYMD) : null;
    return (
        <li className="px-4 sm:px-5 py-3 space-y-2 hover:bg-slate-50/60 transition-colors">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 break-words">{t.title || t.name || "Untitled task"}</p>
                    <p className="text-[11px] text-slate-400 truncate">{taskDue(t) ? `Due ${formatDate(taskDue(t))}` : "No due date"}{by ? ` · by ${by}` : ""}</p>
                </div>
                <span className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold border capitalize ${statusPill(t, done, submitted, cancelled)}`}>{done ? "Done" : submitted ? "In Review" : cancelled ? "Cancelled" : t.priority || "Pending"}</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className={`h-full rounded-full transition-all duration-500 ${done ? "bg-emerald-500" : "bg-indigo-500"}`} style={{ width: `${taskProgress(t)}%` }} /></div>
                <span className="text-[10px] font-semibold text-slate-500 font-mono w-9 text-right">{taskProgress(t)}%</span>
            </div>
            {rework && <p className="text-[11px] text-rose-700 bg-rose-50 border border-rose-100 rounded-lg px-2.5 py-1.5 break-words">Rework requested: {t.review.comment}</p>}
            {open && todayUpdate && <p className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-1.5 break-words">Today: {todayUpdate.progress}% · {todayUpdate.note}</p>}
            {open && (
                <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => onProgress(t)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-indigo-200 text-indigo-700 hover:bg-indigo-50 active:scale-95 transition text-[11px] font-bold cursor-pointer"><TrendingUp size={12} /> {todayUpdate ? "Edit Today's Update" : "Add Today's Update"}</button>
                    <button type="button" onClick={() => onSubmit(t)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition text-white text-[11px] font-bold cursor-pointer"><CheckCircle2 size={12} /> {rework ? "Resubmit Work" : "Submit Work"}</button>
                </div>
            )}
        </li>
    );
}

export function TeamTaskRow({ t, onReview }) {
    const to = assigneeText(t);
    const submitted = isTaskSubmitted(t);
    const last = Array.isArray(t.updates) && t.updates.length ? t.updates[t.updates.length - 1] : null;
    return (
        <li className="py-2.5 space-y-2">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 break-words">{t.title || t.name || "Untitled task"}</p>
                    <p className="text-[11px] text-slate-400 truncate">{to ? `To ${to} · ` : ""}{taskDue(t) ? `Due ${formatDate(taskDue(t))}` : "No due date"}</p>
                </div>
                <span className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold border capitalize ${statusPill(t, isTaskDone(t), submitted, false)}`}>{isTaskDone(t) ? "Done" : t.status || t.priority || "Pending"}</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className={`h-full rounded-full transition-all duration-500 ${isTaskDone(t) ? "bg-emerald-500" : "bg-indigo-500"}`} style={{ width: `${taskProgress(t)}%` }} /></div>
                <span className="text-[10px] font-semibold text-slate-500 font-mono w-9 text-right">{taskProgress(t)}%</span>
            </div>
            {last && !submitted && <p className="text-[11px] text-slate-500 break-words">Latest update ({formatYMD(last.date)}): {last.note}</p>}
            {submitted && (
                <div className="rounded-lg bg-violet-50 border border-violet-100 px-2.5 py-2 space-y-2">
                    <p className="text-[11px] text-violet-800 break-words">{t.submission?.note}{t.submission?.link && <> <a href={t.submission.link} target="_blank" rel="noreferrer" className="underline font-semibold">Open link</a></>}</p>
                    <div className="flex gap-2">
                        <button type="button" onClick={() => onReview(t, "approve")} className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition text-white text-[11px] font-bold cursor-pointer">Approve</button>
                        <button type="button" onClick={() => onReview(t, "rework")} className="px-3 py-2 rounded-lg bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 active:scale-95 transition text-[11px] font-bold cursor-pointer">Rework</button>
                    </div>
                </div>
            )}
        </li>
    );
}

/* ------------------------------ attendance ------------------------------ */

function WorkRing({ ms, goalMs }) {
    const size = 128, r = 56, c = 2 * Math.PI * r;
    const progress = Math.min(1, goalMs > 0 ? ms / goalMs : 0);
    const angle = progress * 2 * Math.PI - Math.PI / 2;
    return (
        <div className="relative w-32 h-32 sm:w-36 sm:h-36 shrink-0">
            <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="8" />
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#fff" strokeWidth="8" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - progress)} className="transition-all duration-700" />
            </svg>
            <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 w-full h-full pointer-events-none"><circle cx={size / 2 + r * Math.cos(angle)} cy={size / 2 + r * Math.sin(angle)} r="5" fill="#fff" /></svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-3">
                <span className="text-[9px] sm:text-[10px] font-semibold text-white/80 leading-tight">Today&apos;s Work Duration</span>
                <span className="text-lg sm:text-xl font-extrabold font-mono text-white leading-tight mt-0.5">{formatDuration(ms)}</span>
                <span className="text-[9px] sm:text-[10px] font-medium text-white/70 mt-0.5">of {formatDuration(goalMs)}</span>
            </div>
        </div>
    );
}

export function EmployeeHero({ name, roleLabel, avatar, att, now, busy, onPunch, energy, setEnergy, shiftName, shiftTime, goalMs, onViewAttendance }) {
    const action = getPunchAction(att, busy);
    const workMs = !att.hasIn ? 0 : Math.max(0, (att.hasOut ? att.lastOut.getTime() : now) - att.firstIn.getTime());
    const punchStyle = action.type === "checkout" ? "bg-rose-500 hover:bg-rose-600 text-white" : action.type === "checkin" ? "bg-emerald-500 hover:bg-emerald-600 text-white" : "bg-white/15 text-white/80 cursor-not-allowed";

    /* image load na ho to toota icon nahi, initials dikhao */
    const [imgFailed, setImgFailed] = useState(false);
    useEffect(() => { setImgFailed(false); }, [avatar]);

    return (
        <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-900 text-white p-4 sm:p-6 shadow-sm">
            <div className="pointer-events-none absolute -right-16 -top-20 w-72 h-72 rounded-full bg-white/5" aria-hidden="true" />
            <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 lg:gap-4 items-center">
                <div className="md:col-span-2 lg:col-span-5 min-w-0 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                            {avatar && !imgFailed ? (
                                <img
                                    key={avatar}
                                    src={avatar}
                                    alt={name || "Profile"}
                                    referrerPolicy="no-referrer"
                                    onError={() => setImgFailed(true)}
                                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border-2 border-white/40"
                                />
                            ) : (
                                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-emerald-600 border-2 border-white/40 flex items-center justify-center text-sm sm:text-base font-bold">
                                    {name ? getInitials(name) : <User size={22} />}
                                </div>
                            )}
                            <span className="absolute -right-0.5 -bottom-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-indigo-700" />
                        </div>
                        <div className="min-w-0"><p className="text-base sm:text-lg font-bold truncate">{name}</p><p className="text-xs text-white/80">{roleLabel}</p><span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-white/15 text-[10px] font-semibold">Online</span></div>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-white/80 mb-2">How is your energy level today?</p>
                        <div className="flex flex-wrap gap-2">
                            {ENERGY_OPTIONS.map(({ value, icon: Icon }) => (
                                <button key={value} type="button" onClick={() => setEnergy(value)} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition active:scale-95 cursor-pointer ${energy === value ? "bg-white text-indigo-700 border-white" : "bg-white/10 text-white border-white/25 hover:bg-white/20"}`}><Icon size={12} />{value}</button>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="md:col-span-1 lg:col-span-3 flex justify-center"><WorkRing ms={workMs} goalMs={goalMs} /></div>
                <div className="md:col-span-1 lg:col-span-4 min-w-0 space-y-4 flex flex-col lg:items-end">
                    <div className="flex flex-wrap items-start gap-x-8 gap-y-3 lg:justify-end">
                        <div className="min-w-0"><p className="flex items-center gap-1.5 text-[10px] text-white/70 font-medium"><Calendar size={11} /> Work Shift</p><p className="text-sm font-bold mt-0.5 break-words">{shiftName || "Not Assigned"}</p>{shiftTime && <p className="text-[11px] text-white/80 mt-0.5">{shiftTime}</p>}</div>
                        <div><p className="flex items-center gap-1.5 text-[10px] text-white/70 font-medium"><LogIn size={11} /> {att.hasOut ? "Checked out at" : "Checked in at"}</p><p className="text-sm font-bold mt-0.5">{att.hasOut ? formatTime(att.lastOut) : att.hasIn ? formatTime(att.firstIn) : "Not yet"}</p></div>
                    </div>
                    <div className="flex flex-col sm:flex-row md:flex-col xl:flex-row gap-2.5 w-full lg:w-auto">
                        <button type="button" onClick={() => action.type && onPunch(action.type)} disabled={action.disabled} className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-bold shadow-lg shadow-black/10 transition active:scale-95 disabled:opacity-80 cursor-pointer ${punchStyle}`}>
                            {busy || !att.loaded ? <Loader2 size={15} className="animate-spin" /> : action.type === "checkout" ? <LogOut size={15} /> : <LogIn size={15} />}{action.label}
                        </button>
                        <button type="button" onClick={onViewAttendance} className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/25 text-xs font-bold transition active:scale-95 cursor-pointer"><Calendar size={15} /> View Attendance</button>
                    </div>
                </div>
            </div>
        </section>
    );
}

export function PunchBar({ att, busy, onPunch, onView }) {
    const action = getPunchAction(att, busy);
    const text = !att.loaded ? "Checking today's attendance..." : att.hasIn && att.hasOut ? `Completed for today. In: ${formatTime(att.firstIn)} · Out: ${formatTime(att.lastOut)}` : att.hasIn ? `You punched in at ${formatTime(att.firstIn)}. Punch out at the end of your day.` : "You have not punched in yet today.";
    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0"><Clock size={16} /></div>
                <div className="min-w-0"><p className="text-sm font-bold text-slate-900">My Attendance</p><p className="text-xs text-slate-500">{text}</p></div>
            </div>
            <div className="flex gap-2">
                <button type="button" onClick={() => action.type && onPunch(action.type)} disabled={action.disabled} className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition active:scale-95 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed cursor-pointer ${action.type === "checkout" ? "bg-rose-600 hover:bg-rose-700" : "bg-indigo-600 hover:bg-indigo-700"}`}>
                    {busy ? <Loader2 size={14} className="animate-spin" /> : action.type === "checkout" ? <LogOut size={14} /> : <LogIn size={14} />}{action.label}
                </button>
                <button type="button" onClick={onView} className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 active:scale-95 transition cursor-pointer">View</button>
            </div>
        </div>
    );
}

export function MyAttendanceSection({ data, view, setView, onOpen }) {
    if (!data) return null;
    const cur = view === "week" ? data.week : data.month;
    const s = cur.stats;
    const tiles = [["Present", s.present, "text-emerald-600"], ["Late", s.late, "text-amber-600"], ["Absent", s.absent, "text-rose-600"], ["Leave", s.leave, "text-violet-600"], ["Hours", formatHours(s.hours), "text-indigo-600"], ["Attendance", `${s.rate}%`, "text-slate-900"]];
    return (
        <Panel icon={CalendarCheck} title="My Attendance" subtitle={view === "week" ? "Last 7 days · only Sunday is off" : data.month.label}
            right={<div className="flex flex-wrap items-center gap-2"><PeriodToggle value={view} onChange={setView} /><button type="button" onClick={onOpen} className={linkBtn}><span>Full report</span><ArrowUpRight size={12} /></button></div>}>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                {tiles.map(([l, v, c]) => <div key={l} className="rounded-xl bg-slate-50/80 border border-slate-200/70 px-3 py-2.5 min-w-0 hover:bg-white hover:border-indigo-200 transition"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">{l}</p><p className={`text-lg font-extrabold font-mono truncate ${c}`}>{v}</p></div>)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-1">
                <div className="lg:col-span-7 min-w-0">
                    {view === "week" ? (
                        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                            {data.week.days.map((d) => (
                                <div key={d.ymd} className={`rounded-xl border p-1.5 sm:p-2 text-center min-w-0 hover:-translate-y-0.5 transition ${DAY_STYLE[d.status].chip}`}>
                                    <p className="text-[9px] sm:text-[10px] font-bold uppercase">{WEEKDAYS[d.dow]}</p>
                                    <p className="text-sm sm:text-base font-extrabold leading-tight">{d.day}</p>
                                    <p className="text-[9px] sm:text-[10px] font-semibold truncate">{DAY_STYLE[d.status].short}</p>
                                    <p className="text-[9px] opacity-70 hidden sm:block truncate">{d.in ? formatTime(d.in) : "—"}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="max-w-md">
                            <div className="grid grid-cols-7 gap-1 mb-1">{WEEKDAYS.map((w) => <p key={w} className="text-[10px] font-bold uppercase text-slate-400 text-center">{w.slice(0, 1)}<span className="hidden sm:inline">{w.slice(1)}</span></p>)}</div>
                            <div className="grid grid-cols-7 gap-1">
                                {Array.from({ length: data.month.offset }).map((_, i) => <div key={`b${i}`} />)}
                                {data.month.days.map((d) => <div key={d.ymd} title={`${formatYMD(d.ymd)}: ${DAY_STYLE[d.status].label || "Upcoming"}${d.in ? ` · In ${formatTime(d.in)}` : ""}`} className={`aspect-square rounded-lg flex items-center justify-center text-[11px] sm:text-xs font-bold hover:scale-105 transition ${DAY_STYLE[d.status].cell}`}>{d.day}</div>)}
                            </div>
                        </div>
                    )}
                    <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-3">{LEGEND.map((k) => <span key={k} className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-slate-500"><span className={`w-2.5 h-2.5 rounded-full ${DAY_STYLE[k].dot}`} />{DAY_STYLE[k].label}</span>)}</div>
                </div>
                <div className="lg:col-span-5 min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Recent punches</p>
                    {data.recent.length === 0 ? <NoData text="No punches recorded yet" /> : (
                        <ul className="space-y-2">
                            {data.recent.map((r) => (
                                <li key={r.ymd} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50/70 border border-slate-200/70 px-3 py-2.5 hover:bg-white hover:border-indigo-200 transition">
                                    <div className="min-w-0"><p className="text-xs font-bold text-slate-800">{formatYMD(r.ymd)}</p><p className="text-[11px] text-slate-500 truncate">In {r.in ? formatTime(r.in) : "—"} · Out {r.out ? formatTime(r.out) : "—"}</p></div>
                                    <div className="flex items-center gap-2 shrink-0">{r.late && <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Late</span>}<span className="text-xs font-bold font-mono text-slate-700">{r.out ? formatHours(r.hours) : "Working"}</span></div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </Panel>
    );
}

export function TodayBoard({ board, scopeLabel, onOpen }) {
    const total = Math.max(1, board.onTime + board.late + board.onLeave + board.notMarked);
    const seg = [["bg-emerald-500", board.onTime], ["bg-amber-500", board.late], ["bg-violet-500", board.onLeave], ["bg-slate-300", board.notMarked]];
    const tiles = [["Present", board.present, "text-emerald-600"], ["Late", board.late, "text-amber-600"], ["On leave", board.onLeave, "text-violet-600"], ["Not marked", board.notMarked, "text-slate-600"]];
    return (
        <Panel icon={Clock} title="Today's Attendance" subtitle={scopeLabel} className="h-full" right={<button type="button" onClick={onOpen} className={linkBtn}><span>Open</span><ArrowUpRight size={12} /></button>}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">{tiles.map(([l, v, c]) => <div key={l} className="rounded-xl bg-slate-50/80 border border-slate-200/70 px-3 py-2.5 hover:bg-white hover:border-indigo-200 transition"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{l}</p><p className={`text-xl font-extrabold font-mono ${c}`}>{v}</p></div>)}</div>
            <div className="flex h-2.5 w-full rounded-full overflow-hidden bg-slate-100">{seg.map(([c, v], i) => (v > 0 ? <div key={i} className={`${c} transition-all duration-700`} style={{ width: `${(v / total) * 100}%` }} /> : null))}</div>
            {board.list.length === 0 ? <NoData text="Nobody has punched in yet today" /> : (
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {board.list.map((p) => (
                        <li key={p.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50/60 border border-slate-200/60 px-3 py-2 hover:bg-white hover:border-indigo-200 transition">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0">{getInitials(p.name)}</div>
                                <div className="min-w-0"><p className="text-xs font-bold text-slate-900 truncate">{p.name}</p><p className="text-[11px] text-slate-500 truncate">In {formatTime(p.in)}{p.out ? ` · Out ${formatTime(p.out)}` : ""}</p></div>
                            </div>
                            <span className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold border ${p.late ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>{p.late ? "Late" : "On time"}</span>
                        </li>
                    ))}
                </ul>
            )}
        </Panel>
    );
}

/* ------------------------------ payroll ------------------------------ */

export function PayslipPanel({ payslip, onOpen, onDownload, downloading, title = "Latest Payslip" }) {
    return (
        <Panel icon={Wallet} title={title} subtitle="Your most recent processed salary" right={<button type="button" onClick={onOpen} className={linkBtn}><span>View All</span><ArrowUpRight size={12} /></button>}>
            {!payslip ? <EmptyState icon={Wallet} tone="text-indigo-300" text="No payslip has been processed for you yet." /> : (
                <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0"><p className="text-xs text-slate-400">{payslip.monthNo ? monthLabel(payslip.monthNo, payslip.yearNo) : "Latest payslip"}</p><p className="text-2xl font-extrabold text-slate-900 font-mono truncate">{formatMoney(payslip.net)}</p><p className="text-[11px] text-slate-500">Net salary</p></div>
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border capitalize shrink-0 ${lower(payslip.status) === "paid" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>{payslip.status || "processed"}</span>
                    </div>
                    <div className="rounded-xl bg-slate-50/70 border border-slate-200/70 px-3">
                        <InfoRow label="Gross salary" value={formatMoney(payslip.gross)} />
                        {payslip.bonus > 0 && <InfoRow label="Bonus included" value={formatMoney(payslip.bonus)} />}
                        <InfoRow label="Deductions" value={`- ${formatMoney(payslip.deductions)}`} />
                        {payslip.reimbursement > 0 && <InfoRow label="Reimbursement" value={`+ ${formatMoney(payslip.reimbursement)}`} />}
                        <InfoRow label="Days present" value={payslip.present === undefined || payslip.present === null ? "—" : payslip.working ? `${payslip.present} / ${payslip.working}` : payslip.present} />
                        <InfoRow label="Paid leave days" value={payslip.leave ?? "—"} />
                        {Number(payslip.unpaid) > 0 && <InfoRow label="Loss of pay days" value={payslip.unpaid} />}
                    </div>
                    <button type="button" onClick={() => onDownload(payslip.id)} disabled={!payslip.id || downloading} className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] transition text-white text-xs font-bold disabled:opacity-60 cursor-pointer">
                        {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}Download PDF
                    </button>
                </div>
            )}
        </Panel>
    );
}

/* ------------------------------ new: attention, shortcuts, summaries ------------------------------ */

/* items = [{ n, text, href, tone }] */
export function AttentionPanel({ items, onGo }) {
    return (
        <Panel icon={AlertCircle} title="Needs your attention" subtitle={items.length ? `${items.length} things are waiting` : "Nothing is pending"} className="h-full">
            {items.length === 0 ? <EmptyState icon={CheckCircle2} tone="text-emerald-400" text="You are all caught up." /> : (
                <ul className="space-y-2">
                    {items.map((i) => (
                        <li key={i.text}>
                            <button type="button" onClick={() => onGo(i.href)} className="w-full flex items-center gap-3 rounded-xl border border-slate-200/70 bg-slate-50/60 px-3 py-2.5 text-left hover:bg-white hover:border-indigo-300 hover:shadow-sm active:scale-[0.99] transition cursor-pointer group">
                                <span className={`w-2 h-2 rounded-full shrink-0 ${DOT[i.tone] || DOT.indigo}`} />
                                <span className="min-w-0 flex-1 text-xs font-semibold text-slate-700 group-hover:text-indigo-700 truncate"><b className="font-mono text-slate-900 mr-1">{i.n}</b>{i.text}</span>
                                <ArrowRight size={13} className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition shrink-0" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </Panel>
    );
}

/* items = [{ label, icon, href }] */
export function QuickActions({ items, onGo }) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {items.map(({ label, icon: Icon, href }) => (
                <button key={label} type="button" onClick={() => onGo(href)} className="flex items-center gap-2.5 bg-white rounded-xl border border-slate-200/80 px-3 py-2.5 text-left shadow-sm hover:border-indigo-300 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-200 cursor-pointer group min-w-0">
                    <span className="w-8 h-8 shrink-0 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors"><Icon size={15} /></span>
                    <span className="text-xs font-bold text-slate-700 group-hover:text-indigo-700 truncate">{label}</span>
                </button>
            ))}
        </div>
    );
}

/* tiles = [[label, value, "text-color"]] */
export function MiniStats({ icon, title, subtitle, tiles, onOpen, empty }) {
    return (
        <Panel icon={icon} title={title} subtitle={subtitle} right={<button type="button" onClick={onOpen} className={linkBtn}><span>Open</span><ArrowUpRight size={12} /></button>}>
            {empty ? <NoData text={empty} /> : (
                <div className="grid grid-cols-2 gap-2.5">
                    {tiles.map(([l, v, c]) => <div key={l} className="rounded-xl bg-slate-50/80 border border-slate-200/70 px-3 py-2.5 min-w-0 hover:bg-white hover:border-indigo-200 transition"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">{l}</p><p className={`text-lg font-extrabold font-mono truncate ${c}`}>{v}</p></div>)}
                </div>
            )}
        </Panel>
    );
}

export function HolidayMini({ holidays, todayYMD, onOpen }) {
    const next = holidays.filter((h) => h.key >= todayYMD && !h.optional).slice(0, 4);
    return (
        <Panel icon={Calendar} title="Upcoming holidays" subtitle="Only Sunday is the weekly off" right={<button type="button" onClick={onOpen} className={linkBtn}><span>Calendar</span><ArrowUpRight size={12} /></button>}>
            {next.length === 0 ? <NoData text="No upcoming holidays" /> : (
                <ul className="space-y-2">
                    {next.map((h) => {
                        const d = new Date(`${h.key}T00:00:00`);
                        return (
                            <li key={h.key + h.title} className="flex items-center gap-3 rounded-xl bg-slate-50/70 border border-slate-200/70 px-3 py-2 hover:bg-white hover:border-indigo-200 transition">
                                <div className="w-10 shrink-0 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 text-center py-1"><p className="text-sm font-extrabold leading-none">{d.getDate()}</p><p className="text-[9px] font-bold uppercase">{d.toLocaleDateString("en-IN", { month: "short" })}</p></div>
                                <div className="min-w-0"><p className="text-xs font-bold text-slate-800 truncate">{h.title}</p><p className="text-[11px] text-slate-500">{d.toLocaleDateString("en-IN", { weekday: "long" })}</p></div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </Panel>
    );
}









// "use client";

// import { useEffect, useRef } from "react";
// import {
//     AlertCircle, ArrowRight, ArrowUpRight, Calendar, CalendarCheck, CheckCircle2, Clock, Download, Loader2, LogIn, LogOut,
//     Moon, Target, TrendingUp, User, Wallet, X, Zap,
// } from "lucide-react";
// import {
//     DAY_STYLE, DOT, LEGEND, TASK_TABS, TONES, WEEKDAYS, assignerText, assigneeText, formatDate, formatDuration, formatHours, formatMoney,
//     formatTime, formatYMD, getInitials, getPunchAction, isTaskCancelled, isTaskDone, isTaskHigh, isTaskSubmitted, lower, monthLabel,
//     taskDue, taskProgress,
// } from "./dashUtils";

// const ENERGY_OPTIONS = [
//     { value: "Focused", icon: Target }, { value: "Busy", icon: Zap }, { value: "Available", icon: CheckCircle2 }, { value: "Away", icon: Moon },
// ];
// const linkBtn = "inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-bold bg-indigo-50 hover:bg-indigo-100 active:scale-95 px-3 py-1.5 rounded-xl border border-indigo-100 transition self-start cursor-pointer";

// /* ------------------------------ basic blocks ------------------------------ */

// export function Panel({ icon: Icon, title, subtitle, right, children, className = "" }) {
//     return (
//         <section className={`min-w-0 bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm space-y-3 hover:shadow-md hover:border-indigo-200/70 transition-all duration-300 ${className}`}>
//             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
//                 <div className="min-w-0">
//                     <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
//                         {Icon && <Icon size={15} className="text-indigo-600 shrink-0" />}<span className="truncate">{title}</span>
//                     </h2>
//                     {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
//                 </div>
//                 {right}
//             </div>
//             {children}
//         </section>
//     );
// }

// export function EmptyState({ icon: Icon = AlertCircle, text, tone = "text-slate-300", action }) {
//     return (
//         <div className="py-8 text-center text-xs text-slate-400 space-y-2">
//             <Icon size={26} className={`mx-auto ${tone}`} />
//             <p className="font-medium text-slate-500">{text}</p>
//             {action}
//         </div>
//     );
// }
// export const NoData = ({ text = "No data found" }) => <p className="py-8 text-center text-xs text-slate-400 font-medium">{text}</p>;

// export function StatCard({ label, value, sub, icon: Icon, tone, onClick }) {
//     const t = TONES[tone] || TONES.indigo;
//     return (
//         <div onClick={onClick} className={`min-w-0 bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-sm transition-all duration-200 flex flex-col justify-between ${onClick ? `cursor-pointer ${t.hover} hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98]` : ""}`}>
//             <div className="flex items-center justify-between gap-2">
//                 <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">{label}</span>
//                 <div className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center border ${t.box}`}><Icon size={14} /></div>
//             </div>
//             <div className="mt-2 min-w-0">
//                 <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 font-mono truncate">{value}</h3>
//                 <p className={`text-[11px] font-medium truncate ${t.sub}`}>{sub}</p>
//             </div>
//         </div>
//     );
// }

// export const InfoRow = ({ label, value }) => (
//     <div className="flex items-center justify-between gap-4 py-2.5 border-b border-slate-100 last:border-0 text-xs">
//         <span className="text-slate-400 shrink-0">{label}</span>
//         <span className="font-semibold text-slate-800 text-right truncate">{value ?? "—"}</span>
//     </div>
// );

// export function WidgetCard({ title, right, footer, children }) {
//     return (
//         <div className="min-w-0 h-full bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col hover:shadow-md hover:border-indigo-200/70 transition-all duration-300">
//             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 sm:px-5 py-3.5 border-b border-slate-100">
//                 <h2 className="text-sm font-bold text-slate-900 shrink-0">{title}</h2>
//                 {right && <div className="min-w-0 max-w-full">{right}</div>}
//             </div>
//             <div className="flex-1 min-h-[96px]">{children}</div>
//             {footer && <div className="border-t border-slate-100 px-4 py-3 text-center">{footer}</div>}
//         </div>
//     );
// }
// export const FooterLink = ({ label, onClick }) => (
//     <button type="button" onClick={onClick} className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 active:scale-95 transition cursor-pointer">
//         {label} <ArrowRight size={12} />
//     </button>
// );

// export function PeriodToggle({ value, onChange }) {
//     return (
//         <div className="inline-flex p-0.5 rounded-xl bg-slate-100 border border-slate-200 self-start shrink-0">
//             {[["week", "Weekly"], ["month", "Monthly"]].map(([k, l]) => (
//                 <button key={k} type="button" onClick={() => onChange(k)} className={`px-3.5 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${value === k ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>{l}</button>
//             ))}
//         </div>
//     );
// }

// export function TaskTabs({ tab, setTab }) {
//     return (
//         <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 sm:flex-wrap sm:justify-end">
//             {TASK_TABS.map(([k, l]) => (
//                 <button key={k} type="button" onClick={() => setTab(k)} className={`shrink-0 whitespace-nowrap px-3 py-1 rounded-full text-[11px] font-semibold border transition cursor-pointer ${tab === k ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"}`}>{l}</button>
//             ))}
//         </div>
//     );
// }

// export const CustomAttendanceTooltip = ({ active, payload, label }) => {
//     if (!active || !payload?.length) return null;
//     const row = payload[0]?.payload || {};
//     return (
//         <div className="bg-slate-900/95 text-white p-3 rounded-xl shadow-2xl border border-slate-800 text-xs min-w-[140px]">
//             <p className="font-semibold text-slate-300 mb-2 border-b border-slate-800 pb-1.5 flex items-center justify-between"><span>{row.label || label}</span><Clock size={12} className="text-slate-400" /></p>
//             <div className="space-y-1.5 font-medium">
//                 <div className="flex justify-between gap-3"><span className="text-indigo-300">Present</span><b className="font-mono">{payload[0]?.value ?? 0}</b></div>
//                 <div className="flex justify-between gap-3"><span className="text-rose-300">Absent</span><b className="font-mono">{payload[1]?.value ?? 0}</b></div>
//                 {row.late > 0 && <div className="flex justify-between gap-3"><span className="text-amber-300">Late</span><b className="font-mono">{row.late}</b></div>}
//             </div>
//         </div>
//     );
// };

// /* ------------------------------ popups ------------------------------ */

// export function ListModal({ title, subtitle, tabs, onClose, children }) {
//     const closeRef = useRef(onClose);
//     closeRef.current = onClose;
//     useEffect(() => {
//         const onKey = (e) => e.key === "Escape" && closeRef.current();
//         const prev = document.body.style.overflow;
//         document.body.style.overflow = "hidden";
//         document.addEventListener("keydown", onKey);
//         return () => { document.body.style.overflow = prev; document.removeEventListener("keydown", onKey); };
//     }, []);
//     return (
//         <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-[2px] p-0 sm:p-4 animate-in fade-in duration-200" onClick={onClose}>
//             <div className="w-full sm:max-w-2xl bg-white rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col max-h-[90dvh] animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
//                 <div className="flex items-start justify-between gap-3 px-4 sm:px-5 py-4 border-b border-slate-100">
//                     <div className="min-w-0"><h3 className="text-base font-bold text-slate-900">{title}</h3>{subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}</div>
//                     <button type="button" onClick={onClose} aria-label="Close" className="shrink-0 w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500 flex items-center justify-center cursor-pointer"><X size={16} /></button>
//                 </div>
//                 {tabs && <div className="px-4 sm:px-5 pt-3">{tabs}</div>}
//                 <div className="flex-1 overflow-y-auto overscroll-contain min-h-[120px]">{children}</div>
//             </div>
//         </div>
//     );
// }

// export function HolidayList({ holidays, todayYMD }) {
//     if (holidays.length === 0) return <NoData text="No holidays found for this year" />;
//     const upcoming = holidays.filter((h) => h.key >= todayYMD);
//     const past = holidays.filter((h) => h.key < todayYMD).reverse();
//     const row = (h, faded) => {
//         const d = new Date(`${h.key}T00:00:00`);
//         const isToday = h.key === todayYMD;
//         return (
//             <li key={h._id || `${h.key}-${h.title}`} className={`flex items-start gap-3 px-4 sm:px-5 py-3 ${faded ? "opacity-60" : ""} ${isToday ? "bg-amber-50/60" : ""}`}>
//                 <div className="w-12 shrink-0 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100 text-center py-1.5">
//                     <p className="text-base font-extrabold leading-none">{d.getDate()}</p>
//                     <p className="text-[10px] font-bold uppercase mt-0.5">{d.toLocaleDateString("en-IN", { month: "short" })}</p>
//                 </div>
//                 <div className="min-w-0 flex-1">
//                     <p className="text-xs font-bold text-slate-900 break-words">{h.title}</p>
//                     <p className="text-[11px] text-slate-500">{d.toLocaleDateString("en-IN", { weekday: "long" })}{h.description ? ` · ${h.description}` : ""}</p>
//                 </div>
//                 <div className="flex flex-col items-end gap-1 shrink-0">
//                     {isToday && <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">Today</span>}
//                     {h.optional && <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-violet-50 text-violet-700 border border-violet-200">Optional</span>}
//                 </div>
//             </li>
//         );
//     };
//     return (
//         <div>
//             {upcoming.length > 0 && <><p className="px-4 sm:px-5 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Upcoming</p><ul className="divide-y divide-slate-100">{upcoming.map((h) => row(h, false))}</ul></>}
//             {past.length > 0 && <><p className="px-4 sm:px-5 pt-4 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Past</p><ul className="divide-y divide-slate-100">{past.map((h) => row(h, true))}</ul></>}
//         </div>
//     );
// }

// /* modes: progress (daily update), submit (work for review), rework (manager sends it back) */
// export function TaskActionModal({ state, progress, setProgress, note, setNote, link, setLink, busy, onClose, onSave }) {
//     if (!state) return null;
//     const { mode, task } = state;
//     const cfg = {
//         progress: { title: "Today's Work Update", label: "What did you work on today? *", btn: "Save Update" },
//         submit: { title: "Submit Work for Review", label: "What did you complete? *", btn: "Submit for Review" },
//         rework: { title: "Send back for rework", label: "What should the employee fix? *", btn: "Send back" },
//     }[mode];
//     return (
//         <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-[2px] p-0 sm:p-4 animate-in fade-in duration-200" onClick={onClose}>
//             <div className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl p-5 space-y-4 max-h-[90dvh] overflow-y-auto animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
//                 <div><h3 className="text-base font-bold text-slate-900">{cfg.title}</h3><p className="text-xs text-slate-500 mt-0.5 break-words">{task.title || task.name}</p></div>
//                 {mode === "progress" && (
//                     <div className="space-y-1.5">
//                         <div className="flex items-center justify-between"><label className="text-xs font-semibold text-slate-600">How much of the task is done?</label><span className="text-sm font-extrabold text-indigo-600 font-mono">{progress}%</span></div>
//                         <input type="range" min="0" max="100" step="5" value={progress} onChange={(e) => setProgress(Number(e.target.value))} className="w-full accent-indigo-600 cursor-pointer" />
//                     </div>
//                 )}
//                 {mode === "submit" && <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">Current progress: <b className="text-slate-700">{taskProgress(task)}%</b>. You can submit even if the task is only partly done.</p>}
//                 <div className="space-y-1.5">
//                     <label className="text-xs font-semibold text-slate-600">{cfg.label}</label>
//                     <textarea rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Short summary..." className="w-full rounded-xl border border-slate-200 px-3 py-2 text-base sm:text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
//                 </div>
//                 {mode === "submit" && (
//                     <div className="space-y-1.5">
//                         <label className="text-xs font-semibold text-slate-600">Link (optional)</label>
//                         <input type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://drive.google.com/..." className="w-full rounded-xl border border-slate-200 px-3 py-2 text-base sm:text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
//                     </div>
//                 )}
//                 <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
//                     <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 active:scale-95 transition cursor-pointer">Cancel</button>
//                     <button type="button" onClick={onSave} disabled={busy} className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white text-xs font-bold active:scale-95 transition disabled:opacity-60 cursor-pointer ${mode === "rework" ? "bg-rose-600 hover:bg-rose-700" : "bg-indigo-600 hover:bg-indigo-700"}`}>
//                         {busy && <Loader2 size={13} className="animate-spin" />}{cfg.btn}
//                     </button>
//                 </div>
//             </div>
//         </div>
//     );
// }

// /* ------------------------------ tasks ------------------------------ */

// const statusPill = (t, done, submitted, cancelled) =>
//     done ? "bg-emerald-50 text-emerald-700 border-emerald-200" : submitted ? "bg-violet-50 text-violet-700 border-violet-200" : cancelled ? "bg-slate-100 text-slate-500 border-slate-200" : isTaskHigh(t) ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-slate-50 text-slate-600 border-slate-200";

// export function EmployeeTaskRow({ t, todayYMD, onProgress, onSubmit }) {
//     const by = assignerText(t);
//     const done = isTaskDone(t), submitted = isTaskSubmitted(t), cancelled = isTaskCancelled(t);
//     const open = !done && !submitted && !cancelled;
//     const rework = open && t.review?.comment;
//     const todayUpdate = Array.isArray(t.updates) ? t.updates.find((u) => u.date === todayYMD) : null;
//     return (
//         <li className="px-4 sm:px-5 py-3 space-y-2 hover:bg-slate-50/60 transition-colors">
//             <div className="flex items-start justify-between gap-3">
//                 <div className="min-w-0">
//                     <p className="text-xs font-semibold text-slate-800 break-words">{t.title || t.name || "Untitled task"}</p>
//                     <p className="text-[11px] text-slate-400 truncate">{taskDue(t) ? `Due ${formatDate(taskDue(t))}` : "No due date"}{by ? ` · by ${by}` : ""}</p>
//                 </div>
//                 <span className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold border capitalize ${statusPill(t, done, submitted, cancelled)}`}>{done ? "Done" : submitted ? "In Review" : cancelled ? "Cancelled" : t.priority || "Pending"}</span>
//             </div>
//             <div className="flex items-center gap-2">
//                 <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className={`h-full rounded-full transition-all duration-500 ${done ? "bg-emerald-500" : "bg-indigo-500"}`} style={{ width: `${taskProgress(t)}%` }} /></div>
//                 <span className="text-[10px] font-semibold text-slate-500 font-mono w-9 text-right">{taskProgress(t)}%</span>
//             </div>
//             {rework && <p className="text-[11px] text-rose-700 bg-rose-50 border border-rose-100 rounded-lg px-2.5 py-1.5 break-words">Rework requested: {t.review.comment}</p>}
//             {open && todayUpdate && <p className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-1.5 break-words">Today: {todayUpdate.progress}% · {todayUpdate.note}</p>}
//             {open && (
//                 <div className="flex flex-wrap gap-2">
//                     <button type="button" onClick={() => onProgress(t)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-indigo-200 text-indigo-700 hover:bg-indigo-50 active:scale-95 transition text-[11px] font-bold cursor-pointer"><TrendingUp size={12} /> {todayUpdate ? "Edit Today's Update" : "Add Today's Update"}</button>
//                     <button type="button" onClick={() => onSubmit(t)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition text-white text-[11px] font-bold cursor-pointer"><CheckCircle2 size={12} /> {rework ? "Resubmit Work" : "Submit Work"}</button>
//                 </div>
//             )}
//         </li>
//     );
// }

// export function TeamTaskRow({ t, onReview }) {
//     const to = assigneeText(t);
//     const submitted = isTaskSubmitted(t);
//     const last = Array.isArray(t.updates) && t.updates.length ? t.updates[t.updates.length - 1] : null;
//     return (
//         <li className="py-2.5 space-y-2">
//             <div className="flex items-start justify-between gap-3">
//                 <div className="min-w-0">
//                     <p className="text-xs font-semibold text-slate-800 break-words">{t.title || t.name || "Untitled task"}</p>
//                     <p className="text-[11px] text-slate-400 truncate">{to ? `To ${to} · ` : ""}{taskDue(t) ? `Due ${formatDate(taskDue(t))}` : "No due date"}</p>
//                 </div>
//                 <span className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold border capitalize ${statusPill(t, isTaskDone(t), submitted, false)}`}>{isTaskDone(t) ? "Done" : t.status || t.priority || "Pending"}</span>
//             </div>
//             <div className="flex items-center gap-2">
//                 <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className={`h-full rounded-full transition-all duration-500 ${isTaskDone(t) ? "bg-emerald-500" : "bg-indigo-500"}`} style={{ width: `${taskProgress(t)}%` }} /></div>
//                 <span className="text-[10px] font-semibold text-slate-500 font-mono w-9 text-right">{taskProgress(t)}%</span>
//             </div>
//             {last && !submitted && <p className="text-[11px] text-slate-500 break-words">Latest update ({formatYMD(last.date)}): {last.note}</p>}
//             {submitted && (
//                 <div className="rounded-lg bg-violet-50 border border-violet-100 px-2.5 py-2 space-y-2">
//                     <p className="text-[11px] text-violet-800 break-words">{t.submission?.note}{t.submission?.link && <> <a href={t.submission.link} target="_blank" rel="noreferrer" className="underline font-semibold">Open link</a></>}</p>
//                     <div className="flex gap-2">
//                         <button type="button" onClick={() => onReview(t, "approve")} className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition text-white text-[11px] font-bold cursor-pointer">Approve</button>
//                         <button type="button" onClick={() => onReview(t, "rework")} className="px-3 py-2 rounded-lg bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 active:scale-95 transition text-[11px] font-bold cursor-pointer">Rework</button>
//                     </div>
//                 </div>
//             )}
//         </li>
//     );
// }

// /* ------------------------------ attendance ------------------------------ */

// function WorkRing({ ms, goalMs }) {
//     const size = 128, r = 56, c = 2 * Math.PI * r;
//     const progress = Math.min(1, goalMs > 0 ? ms / goalMs : 0);
//     const angle = progress * 2 * Math.PI - Math.PI / 2;
//     return (
//         <div className="relative w-32 h-32 sm:w-36 sm:h-36 shrink-0">
//             <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
//                 <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="8" />
//                 <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#fff" strokeWidth="8" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - progress)} className="transition-all duration-700" />
//             </svg>
//             <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 w-full h-full pointer-events-none"><circle cx={size / 2 + r * Math.cos(angle)} cy={size / 2 + r * Math.sin(angle)} r="5" fill="#fff" /></svg>
//             <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-3">
//                 <span className="text-[9px] sm:text-[10px] font-semibold text-white/80 leading-tight">Today&apos;s Work Duration</span>
//                 <span className="text-lg sm:text-xl font-extrabold font-mono text-white leading-tight mt-0.5">{formatDuration(ms)}</span>
//                 <span className="text-[9px] sm:text-[10px] font-medium text-white/70 mt-0.5">of {formatDuration(goalMs)}</span>
//             </div>
//         </div>
//     );
// }

// export function EmployeeHero({ name, roleLabel, avatar, att, now, busy, onPunch, energy, setEnergy, shiftName, shiftTime, goalMs, onViewAttendance }) {
//     const action = getPunchAction(att, busy);
//     const workMs = !att.hasIn ? 0 : Math.max(0, (att.hasOut ? att.lastOut.getTime() : now) - att.firstIn.getTime());
//     const punchStyle = action.type === "checkout" ? "bg-rose-500 hover:bg-rose-600 text-white" : action.type === "checkin" ? "bg-emerald-500 hover:bg-emerald-600 text-white" : "bg-white/15 text-white/80 cursor-not-allowed";
//     return (
//         <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-900 text-white p-4 sm:p-6 shadow-sm">
//             <div className="pointer-events-none absolute -right-16 -top-20 w-72 h-72 rounded-full bg-white/5" aria-hidden="true" />
//             <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 lg:gap-4 items-center">
//                 <div className="md:col-span-2 lg:col-span-5 min-w-0 space-y-4">
//                     <div className="flex items-center gap-3">
//                         <div className="relative shrink-0">
//                             {avatar ? <img src={avatar} alt="" className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border-2 border-white/40" /> : <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-emerald-600 border-2 border-white/40 flex items-center justify-center"><User size={22} /></div>}
//                             <span className="absolute -right-0.5 -bottom-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-indigo-700" />
//                         </div>
//                         <div className="min-w-0"><p className="text-base sm:text-lg font-bold truncate">{name}</p><p className="text-xs text-white/80">{roleLabel}</p><span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-white/15 text-[10px] font-semibold">Online</span></div>
//                     </div>
//                     <div>
//                         <p className="text-xs font-medium text-white/80 mb-2">How is your energy level today?</p>
//                         <div className="flex flex-wrap gap-2">
//                             {ENERGY_OPTIONS.map(({ value, icon: Icon }) => (
//                                 <button key={value} type="button" onClick={() => setEnergy(value)} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition active:scale-95 cursor-pointer ${energy === value ? "bg-white text-indigo-700 border-white" : "bg-white/10 text-white border-white/25 hover:bg-white/20"}`}><Icon size={12} />{value}</button>
//                             ))}
//                         </div>
//                     </div>
//                 </div>
//                 <div className="md:col-span-1 lg:col-span-3 flex justify-center"><WorkRing ms={workMs} goalMs={goalMs} /></div>
//                 <div className="md:col-span-1 lg:col-span-4 min-w-0 space-y-4 flex flex-col lg:items-end">
//                     <div className="flex flex-wrap items-start gap-x-8 gap-y-3 lg:justify-end">
//                         <div className="min-w-0"><p className="flex items-center gap-1.5 text-[10px] text-white/70 font-medium"><Calendar size={11} /> Work Shift</p><p className="text-sm font-bold mt-0.5 break-words">{shiftName || "Not Assigned"}</p>{shiftTime && <p className="text-[11px] text-white/80 mt-0.5">{shiftTime}</p>}</div>
//                         <div><p className="flex items-center gap-1.5 text-[10px] text-white/70 font-medium"><LogIn size={11} /> {att.hasOut ? "Checked out at" : "Checked in at"}</p><p className="text-sm font-bold mt-0.5">{att.hasOut ? formatTime(att.lastOut) : att.hasIn ? formatTime(att.firstIn) : "Not yet"}</p></div>
//                     </div>
//                     <div className="flex flex-col sm:flex-row md:flex-col xl:flex-row gap-2.5 w-full lg:w-auto">
//                         <button type="button" onClick={() => action.type && onPunch(action.type)} disabled={action.disabled} className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-bold shadow-lg shadow-black/10 transition active:scale-95 disabled:opacity-80 cursor-pointer ${punchStyle}`}>
//                             {busy || !att.loaded ? <Loader2 size={15} className="animate-spin" /> : action.type === "checkout" ? <LogOut size={15} /> : <LogIn size={15} />}{action.label}
//                         </button>
//                         <button type="button" onClick={onViewAttendance} className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/25 text-xs font-bold transition active:scale-95 cursor-pointer"><Calendar size={15} /> View Attendance</button>
//                     </div>
//                 </div>
//             </div>
//         </section>
//     );
// }

// export function PunchBar({ att, busy, onPunch, onView }) {
//     const action = getPunchAction(att, busy);
//     const text = !att.loaded ? "Checking today's attendance..." : att.hasIn && att.hasOut ? `Completed for today. In: ${formatTime(att.firstIn)} · Out: ${formatTime(att.lastOut)}` : att.hasIn ? `You punched in at ${formatTime(att.firstIn)}. Punch out at the end of your day.` : "You have not punched in yet today.";
//     return (
//         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 hover:shadow-md transition-shadow">
//             <div className="flex items-center gap-3 min-w-0">
//                 <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0"><Clock size={16} /></div>
//                 <div className="min-w-0"><p className="text-sm font-bold text-slate-900">My Attendance</p><p className="text-xs text-slate-500">{text}</p></div>
//             </div>
//             <div className="flex gap-2">
//                 <button type="button" onClick={() => action.type && onPunch(action.type)} disabled={action.disabled} className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition active:scale-95 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed cursor-pointer ${action.type === "checkout" ? "bg-rose-600 hover:bg-rose-700" : "bg-indigo-600 hover:bg-indigo-700"}`}>
//                     {busy ? <Loader2 size={14} className="animate-spin" /> : action.type === "checkout" ? <LogOut size={14} /> : <LogIn size={14} />}{action.label}
//                 </button>
//                 <button type="button" onClick={onView} className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 active:scale-95 transition cursor-pointer">View</button>
//             </div>
//         </div>
//     );
// }

// export function MyAttendanceSection({ data, view, setView, onOpen }) {
//     if (!data) return null;
//     const cur = view === "week" ? data.week : data.month;
//     const s = cur.stats;
//     const tiles = [["Present", s.present, "text-emerald-600"], ["Late", s.late, "text-amber-600"], ["Absent", s.absent, "text-rose-600"], ["Leave", s.leave, "text-violet-600"], ["Hours", formatHours(s.hours), "text-indigo-600"], ["Attendance", `${s.rate}%`, "text-slate-900"]];
//     return (
//         <Panel icon={CalendarCheck} title="My Attendance" subtitle={view === "week" ? "Last 7 days · only Sunday is off" : data.month.label}
//             right={<div className="flex flex-wrap items-center gap-2"><PeriodToggle value={view} onChange={setView} /><button type="button" onClick={onOpen} className={linkBtn}><span>Full report</span><ArrowUpRight size={12} /></button></div>}>
//             <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
//                 {tiles.map(([l, v, c]) => <div key={l} className="rounded-xl bg-slate-50/80 border border-slate-200/70 px-3 py-2.5 min-w-0 hover:bg-white hover:border-indigo-200 transition"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">{l}</p><p className={`text-lg font-extrabold font-mono truncate ${c}`}>{v}</p></div>)}
//             </div>
//             <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-1">
//                 <div className="lg:col-span-7 min-w-0">
//                     {view === "week" ? (
//                         <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
//                             {data.week.days.map((d) => (
//                                 <div key={d.ymd} className={`rounded-xl border p-1.5 sm:p-2 text-center min-w-0 hover:-translate-y-0.5 transition ${DAY_STYLE[d.status].chip}`}>
//                                     <p className="text-[9px] sm:text-[10px] font-bold uppercase">{WEEKDAYS[d.dow]}</p>
//                                     <p className="text-sm sm:text-base font-extrabold leading-tight">{d.day}</p>
//                                     <p className="text-[9px] sm:text-[10px] font-semibold truncate">{DAY_STYLE[d.status].short}</p>
//                                     <p className="text-[9px] opacity-70 hidden sm:block truncate">{d.in ? formatTime(d.in) : "—"}</p>
//                                 </div>
//                             ))}
//                         </div>
//                     ) : (
//                         <div className="max-w-md">
//                             <div className="grid grid-cols-7 gap-1 mb-1">{WEEKDAYS.map((w) => <p key={w} className="text-[10px] font-bold uppercase text-slate-400 text-center">{w.slice(0, 1)}<span className="hidden sm:inline">{w.slice(1)}</span></p>)}</div>
//                             <div className="grid grid-cols-7 gap-1">
//                                 {Array.from({ length: data.month.offset }).map((_, i) => <div key={`b${i}`} />)}
//                                 {data.month.days.map((d) => <div key={d.ymd} title={`${formatYMD(d.ymd)}: ${DAY_STYLE[d.status].label || "Upcoming"}${d.in ? ` · In ${formatTime(d.in)}` : ""}`} className={`aspect-square rounded-lg flex items-center justify-center text-[11px] sm:text-xs font-bold hover:scale-105 transition ${DAY_STYLE[d.status].cell}`}>{d.day}</div>)}
//                             </div>
//                         </div>
//                     )}
//                     <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-3">{LEGEND.map((k) => <span key={k} className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-slate-500"><span className={`w-2.5 h-2.5 rounded-full ${DAY_STYLE[k].dot}`} />{DAY_STYLE[k].label}</span>)}</div>
//                 </div>
//                 <div className="lg:col-span-5 min-w-0">
//                     <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Recent punches</p>
//                     {data.recent.length === 0 ? <NoData text="No punches recorded yet" /> : (
//                         <ul className="space-y-2">
//                             {data.recent.map((r) => (
//                                 <li key={r.ymd} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50/70 border border-slate-200/70 px-3 py-2.5 hover:bg-white hover:border-indigo-200 transition">
//                                     <div className="min-w-0"><p className="text-xs font-bold text-slate-800">{formatYMD(r.ymd)}</p><p className="text-[11px] text-slate-500 truncate">In {r.in ? formatTime(r.in) : "—"} · Out {r.out ? formatTime(r.out) : "—"}</p></div>
//                                     <div className="flex items-center gap-2 shrink-0">{r.late && <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Late</span>}<span className="text-xs font-bold font-mono text-slate-700">{r.out ? formatHours(r.hours) : "Working"}</span></div>
//                                 </li>
//                             ))}
//                         </ul>
//                     )}
//                 </div>
//             </div>
//         </Panel>
//     );
// }

// export function TodayBoard({ board, scopeLabel, onOpen }) {
//     const total = Math.max(1, board.onTime + board.late + board.onLeave + board.notMarked);
//     const seg = [["bg-emerald-500", board.onTime], ["bg-amber-500", board.late], ["bg-violet-500", board.onLeave], ["bg-slate-300", board.notMarked]];
//     const tiles = [["Present", board.present, "text-emerald-600"], ["Late", board.late, "text-amber-600"], ["On leave", board.onLeave, "text-violet-600"], ["Not marked", board.notMarked, "text-slate-600"]];
//     return (
//         <Panel icon={Clock} title="Today's Attendance" subtitle={scopeLabel} className="h-full" right={<button type="button" onClick={onOpen} className={linkBtn}><span>Open</span><ArrowUpRight size={12} /></button>}>
//             <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">{tiles.map(([l, v, c]) => <div key={l} className="rounded-xl bg-slate-50/80 border border-slate-200/70 px-3 py-2.5 hover:bg-white hover:border-indigo-200 transition"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{l}</p><p className={`text-xl font-extrabold font-mono ${c}`}>{v}</p></div>)}</div>
//             <div className="flex h-2.5 w-full rounded-full overflow-hidden bg-slate-100">{seg.map(([c, v], i) => (v > 0 ? <div key={i} className={`${c} transition-all duration-700`} style={{ width: `${(v / total) * 100}%` }} /> : null))}</div>
//             {board.list.length === 0 ? <NoData text="Nobody has punched in yet today" /> : (
//                 <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
//                     {board.list.map((p) => (
//                         <li key={p.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50/60 border border-slate-200/60 px-3 py-2 hover:bg-white hover:border-indigo-200 transition">
//                             <div className="flex items-center gap-2.5 min-w-0">
//                                 <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0">{getInitials(p.name)}</div>
//                                 <div className="min-w-0"><p className="text-xs font-bold text-slate-900 truncate">{p.name}</p><p className="text-[11px] text-slate-500 truncate">In {formatTime(p.in)}{p.out ? ` · Out ${formatTime(p.out)}` : ""}</p></div>
//                             </div>
//                             <span className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold border ${p.late ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>{p.late ? "Late" : "On time"}</span>
//                         </li>
//                     ))}
//                 </ul>
//             )}
//         </Panel>
//     );
// }

// /* ------------------------------ payroll ------------------------------ */

// export function PayslipPanel({ payslip, onOpen, onDownload, downloading, title = "Latest Payslip" }) {
//     return (
//         <Panel icon={Wallet} title={title} subtitle="Your most recent processed salary" right={<button type="button" onClick={onOpen} className={linkBtn}><span>View All</span><ArrowUpRight size={12} /></button>}>
//             {!payslip ? <EmptyState icon={Wallet} tone="text-indigo-300" text="No payslip has been processed for you yet." /> : (
//                 <div className="space-y-3">
//                     <div className="flex items-center justify-between gap-3">
//                         <div className="min-w-0"><p className="text-xs text-slate-400">{payslip.monthNo ? monthLabel(payslip.monthNo, payslip.yearNo) : "Latest payslip"}</p><p className="text-2xl font-extrabold text-slate-900 font-mono truncate">{formatMoney(payslip.net)}</p><p className="text-[11px] text-slate-500">Net salary</p></div>
//                         <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border capitalize shrink-0 ${lower(payslip.status) === "paid" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>{payslip.status || "processed"}</span>
//                     </div>
//                     <div className="rounded-xl bg-slate-50/70 border border-slate-200/70 px-3">
//                         <InfoRow label="Gross salary" value={formatMoney(payslip.gross)} />
//                         {payslip.bonus > 0 && <InfoRow label="Bonus included" value={formatMoney(payslip.bonus)} />}
//                         <InfoRow label="Deductions" value={`- ${formatMoney(payslip.deductions)}`} />
//                         {payslip.reimbursement > 0 && <InfoRow label="Reimbursement" value={`+ ${formatMoney(payslip.reimbursement)}`} />}
//                         <InfoRow label="Days present" value={payslip.present === undefined || payslip.present === null ? "—" : payslip.working ? `${payslip.present} / ${payslip.working}` : payslip.present} />
//                         <InfoRow label="Paid leave days" value={payslip.leave ?? "—"} />
//                         {Number(payslip.unpaid) > 0 && <InfoRow label="Loss of pay days" value={payslip.unpaid} />}
//                     </div>
//                     <button type="button" onClick={() => onDownload(payslip.id)} disabled={!payslip.id || downloading} className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] transition text-white text-xs font-bold disabled:opacity-60 cursor-pointer">
//                         {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}Download PDF
//                     </button>
//                 </div>
//             )}
//         </Panel>
//     );
// }

// /* ------------------------------ new: attention, shortcuts, summaries ------------------------------ */

// /* items = [{ n, text, href, tone }] */
// export function AttentionPanel({ items, onGo }) {
//     return (
//         <Panel icon={AlertCircle} title="Needs your attention" subtitle={items.length ? `${items.length} things are waiting` : "Nothing is pending"} className="h-full">
//             {items.length === 0 ? <EmptyState icon={CheckCircle2} tone="text-emerald-400" text="You are all caught up." /> : (
//                 <ul className="space-y-2">
//                     {items.map((i) => (
//                         <li key={i.text}>
//                             <button type="button" onClick={() => onGo(i.href)} className="w-full flex items-center gap-3 rounded-xl border border-slate-200/70 bg-slate-50/60 px-3 py-2.5 text-left hover:bg-white hover:border-indigo-300 hover:shadow-sm active:scale-[0.99] transition cursor-pointer group">
//                                 <span className={`w-2 h-2 rounded-full shrink-0 ${DOT[i.tone] || DOT.indigo}`} />
//                                 <span className="min-w-0 flex-1 text-xs font-semibold text-slate-700 group-hover:text-indigo-700 truncate"><b className="font-mono text-slate-900 mr-1">{i.n}</b>{i.text}</span>
//                                 <ArrowRight size={13} className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition shrink-0" />
//                             </button>
//                         </li>
//                     ))}
//                 </ul>
//             )}
//         </Panel>
//     );
// }

// /* items = [{ label, icon, href }] */
// export function QuickActions({ items, onGo }) {
//     return (
//         <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
//             {items.map(({ label, icon: Icon, href }) => (
//                 <button key={label} type="button" onClick={() => onGo(href)} className="flex items-center gap-2.5 bg-white rounded-xl border border-slate-200/80 px-3 py-2.5 text-left shadow-sm hover:border-indigo-300 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-200 cursor-pointer group min-w-0">
//                     <span className="w-8 h-8 shrink-0 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors"><Icon size={15} /></span>
//                     <span className="text-xs font-bold text-slate-700 group-hover:text-indigo-700 truncate">{label}</span>
//                 </button>
//             ))}
//         </div>
//     );
// }

// /* tiles = [[label, value, "text-color"]] */
// export function MiniStats({ icon, title, subtitle, tiles, onOpen, empty }) {
//     return (
//         <Panel icon={icon} title={title} subtitle={subtitle} right={<button type="button" onClick={onOpen} className={linkBtn}><span>Open</span><ArrowUpRight size={12} /></button>}>
//             {empty ? <NoData text={empty} /> : (
//                 <div className="grid grid-cols-2 gap-2.5">
//                     {tiles.map(([l, v, c]) => <div key={l} className="rounded-xl bg-slate-50/80 border border-slate-200/70 px-3 py-2.5 min-w-0 hover:bg-white hover:border-indigo-200 transition"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">{l}</p><p className={`text-lg font-extrabold font-mono truncate ${c}`}>{v}</p></div>)}
//                 </div>
//             )}
//         </Panel>
//     );
// }

// export function HolidayMini({ holidays, todayYMD, onOpen }) {
//     const next = holidays.filter((h) => h.key >= todayYMD && !h.optional).slice(0, 4);
//     return (
//         <Panel icon={Calendar} title="Upcoming holidays" subtitle="Only Sunday is the weekly off" right={<button type="button" onClick={onOpen} className={linkBtn}><span>Calendar</span><ArrowUpRight size={12} /></button>}>
//             {next.length === 0 ? <NoData text="No upcoming holidays" /> : (
//                 <ul className="space-y-2">
//                     {next.map((h) => {
//                         const d = new Date(`${h.key}T00:00:00`);
//                         return (
//                             <li key={h.key + h.title} className="flex items-center gap-3 rounded-xl bg-slate-50/70 border border-slate-200/70 px-3 py-2 hover:bg-white hover:border-indigo-200 transition">
//                                 <div className="w-10 shrink-0 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 text-center py-1"><p className="text-sm font-extrabold leading-none">{d.getDate()}</p><p className="text-[9px] font-bold uppercase">{d.toLocaleDateString("en-IN", { month: "short" })}</p></div>
//                                 <div className="min-w-0"><p className="text-xs font-bold text-slate-800 truncate">{h.title}</p><p className="text-[11px] text-slate-500">{d.toLocaleDateString("en-IN", { weekday: "long" })}</p></div>
//                             </li>
//                         );
//                     })}
//                 </ul>
//             )}
//         </Panel>
//     );
// }