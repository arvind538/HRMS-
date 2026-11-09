"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Loader2, Lock, MoreVertical, X } from "lucide-react";
import { toast } from "react-toastify";
import api from "@/lib/api";
import { FieldError, Label, Sheet, inputClass } from "@/components/payroll/ui";
import { primaryBtn } from "@/components/payroll/common";

/* ------------------------------ constants ------------------------------ */

export const TONE = {
    slate: "bg-slate-100 text-slate-700 border-slate-200",
    sky: "bg-sky-50 text-sky-700 border-sky-200",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    violet: "bg-violet-50 text-violet-700 border-violet-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    rose: "bg-rose-50 text-rose-700 border-rose-200",
};
export const DOT = {
    slate: "bg-slate-400", sky: "bg-sky-500", indigo: "bg-indigo-500", amber: "bg-amber-500",
    violet: "bg-violet-500", emerald: "bg-emerald-500", rose: "bg-rose-500",
};

export const STAGE = {
    applied: { label: "Applied", tone: "slate" },
    shortlisted: { label: "Shortlisted", tone: "sky" },
    "interview-scheduled": { label: "Interview scheduled", tone: "indigo" },
    interviewed: { label: "Interviewed", tone: "amber" },
    offered: { label: "Offered", tone: "violet" },
    hired: { label: "Hired", tone: "emerald" },
    rejected: { label: "Rejected", tone: "rose" },
};
export const JOB_STATUS = {
    open: { label: "Open", tone: "emerald" },
    "on-hold": { label: "On hold", tone: "amber" },
    closed: { label: "Closed", tone: "slate" },
};
export const SOURCES = [["job-portal", "Job portal"], ["linkedin", "LinkedIn"], ["referral", "Referral"], ["walk-in", "Walk-in"], ["other", "Other"]];
export const EMP_TYPES = [["full-time", "Full time"], ["part-time", "Part time"], ["internship", "Internship"], ["contract", "Contract"]];

export const idOf = (v) => String(v?._id || v || "");

export async function errMsg(err, fallback = "Something went wrong.") {
    try {
        const d = err?.response?.data;
        if (d instanceof Blob) return JSON.parse(await d.text()).message || fallback;
        return d?.message || fallback;
    } catch {
        return fallback;
    }
}

/* resume: view in a new tab, or download. Uploaded files need the login token, so they are fetched as a blob. */
export async function openResume(c, download = false) {
    if (!c.hasResume) {
        if (/^https?:\/\/\S+$/i.test(c.resumeUrl || "")) window.open(c.resumeUrl, "_blank", "noopener,noreferrer");
        else toast.info("No resume was uploaded for this candidate.");
        return;
    }
    const tab = download ? null : window.open("", "_blank");
    try {
        const res = await api.get(`/recruitment/candidates/${c._id}/resume`, { params: download ? { download: 1 } : undefined, responseType: "blob" });
        const url = URL.createObjectURL(res.data);
        if (download) {
            const a = document.createElement("a");
            a.href = url;
            a.download = c.resumeName || "resume";
            document.body.appendChild(a);
            a.click();
            a.remove();
        } else if (tab) tab.location.href = url;
        setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
        tab?.close();
        toast.error(await errMsg(err, "Unable to open the resume."));
    }
}

/* ------------------------------ small pieces ------------------------------ */

export const Chip = ({ tone = "slate", dot = false, children, className = "" }) => (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold whitespace-nowrap ${TONE[tone] || TONE.slate} ${className}`}>
        {dot && <span className={`w-1.5 h-1.5 rounded-full ${DOT[tone] || DOT.slate}`} />}
        {children}
    </span>
);

export const Info = ({ rows }) => (
    <dl className="rounded-2xl border border-slate-200 bg-slate-50/70 divide-y divide-slate-200/70 text-xs">
        {rows.filter(([, v]) => v !== undefined && v !== null && v !== "").map(([k, v]) => (
            <div key={k} className="flex items-start justify-between gap-4 px-4 py-2.5">
                <dt className="text-slate-400 font-semibold shrink-0">{k}</dt>
                <dd className="font-bold text-slate-800 text-right break-words min-w-0">{v}</dd>
            </div>
        ))}
    </dl>
);

/* centered popup (a bottom sheet on phones). Pass onSubmit to make it a form. */
export function Box({ title, subtitle, onClose, onSubmit, locked, size = "max-w-lg", footer, children }) {
    const Wrap = onSubmit ? "form" : "div";
    return (
        <Sheet onClose={onClose} locked={locked} size={size}>
            <Wrap {...(onSubmit ? { onSubmit, noValidate: true } : {})} className="flex flex-col min-h-0 flex-1">
                <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/70">
                    <div className="min-w-0">
                        <h3 className="text-base font-bold text-slate-900 truncate">{title}</h3>
                        {subtitle && <p className="text-xs text-slate-400 truncate">{subtitle}</p>}
                    </div>
                    <button type="button" onClick={() => !locked && onClose()} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer" aria-label="Close"><X size={18} /></button>
                </div>
                <div className="flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6 space-y-4">{children}</div>
                {footer}
            </Wrap>
        </Sheet>
    );
}

export const FooterBar = ({ children }) => (
    <div className="shrink-0 border-t border-slate-100 bg-white px-5 sm:px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">{children}</div>
);

export const FormFooter = ({ onCancel, busy, label }) => (
    <FooterBar>
        <button type="button" onClick={onCancel} disabled={busy} className="px-5 py-3 sm:py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50">Cancel</button>
        <button type="submit" disabled={busy} className={primaryBtn}>{busy && <Loader2 size={14} className="animate-spin" />}{busy ? "Saving..." : label}</button>
    </FooterBar>
);

export const ghostBtn = "inline-flex items-center justify-center gap-2 px-5 py-3 sm:py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer";

/* a reason box, used when rejecting */
export function ReasonModal({ title, subtitle, confirm = "Confirm", onClose, onSubmit }) {
    const [text, setText] = useState("");
    const [err, setErr] = useState("");
    const [busy, setBusy] = useState(false);

    const go = async (e) => {
        e.preventDefault();
        if (busy) return;
        if (text.trim().length < 3) return setErr("Please write a short reason (at least 3 characters).");
        setBusy(true);
        try {
            await onSubmit(text.trim());
            onClose();
        } catch {
            setBusy(false);
        }
    };

    return (
        <Box title={title} subtitle={subtitle} onClose={onClose} onSubmit={go} locked={busy} size="max-w-md" footer={<FormFooter onCancel={onClose} busy={busy} label={confirm} />}>
            <div>
                <Label>Reason</Label>
                <textarea rows={4} value={text} maxLength={200} autoFocus onChange={(e) => { setText(e.target.value); setErr(""); }} placeholder="e.g. Skills do not match the role" className={`${inputClass} resize-none ${err ? "border-rose-300" : "border-slate-200 focus:border-indigo-500"}`} />
                <FieldError>{err}</FieldError>
            </div>
        </Box>
    );
}

/* ------------------------------ floating menus ------------------------------ */

function useAnchor({ width, height, align }) {
    const [pos, setPos] = useState(null);
    const btn = useRef(null);
    const close = useCallback(() => setPos(null), []);

    useEffect(() => {
        if (!pos) return undefined;
        const down = (e) => { if (!e.target.closest("[data-rec-pop]") && !btn.current?.contains(e.target)) close(); };
        const key = (e) => e.key === "Escape" && close();
        document.addEventListener("mousedown", down);
        document.addEventListener("touchstart", down, { passive: true });
        window.addEventListener("scroll", close, true);
        window.addEventListener("resize", close);
        window.addEventListener("keydown", key);
        return () => {
            document.removeEventListener("mousedown", down);
            document.removeEventListener("touchstart", down);
            window.removeEventListener("scroll", close, true);
            window.removeEventListener("resize", close);
            window.removeEventListener("keydown", key);
        };
    }, [pos, close]);

    const toggle = (e) => {
        e.stopPropagation();
        if (pos) return close();
        const r = btn.current.getBoundingClientRect();
        const left = align === "right" ? r.right - width : r.left;
        setPos({
            top: r.bottom + height + 8 > window.innerHeight ? Math.max(8, r.top - height - 4) : r.bottom + 4,
            left: Math.max(8, Math.min(left, window.innerWidth - width - 8)),
        });
    };
    return { pos, btn, toggle, close };
}

/* three-dot menu: items = [{ label, icon, run, hidden, danger }] */
export function RowMenu({ items }) {
    const list = items.filter((i) => !i.hidden);
    const W = 210;
    const { pos, btn, toggle, close } = useAnchor({ width: W, height: list.length * 42 + 14, align: "right" });
    if (!list.length) return null;
    return (
        <>
            <button ref={btn} type="button" onClick={toggle} aria-haspopup="menu" aria-label="More options" className={`w-9 h-9 inline-flex items-center justify-center rounded-lg transition cursor-pointer ${pos ? "bg-indigo-100 text-indigo-700" : "text-slate-500 hover:bg-slate-100 hover:text-indigo-600"}`}>
                <MoreVertical size={17} />
            </button>
            {pos && (
                <div data-rec-pop role="menu" style={{ top: pos.top, left: pos.left, width: W }} onClick={(e) => e.stopPropagation()} className="fixed z-[70] bg-white border border-slate-200 rounded-xl shadow-xl py-1.5">
                    {list.map((i) => (
                        <button key={i.label} type="button" role="menuitem" onClick={() => { close(); i.run(); }} className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold text-left transition cursor-pointer ${i.danger ? "text-rose-600 hover:bg-rose-50" : "text-slate-700 hover:bg-indigo-50 hover:text-indigo-600"}`}>
                            <i.icon size={14} className={i.danger ? "" : "text-slate-400"} /> {i.label}
                        </button>
                    ))}
                </div>
            )}
        </>
    );
}

/* pill dropdown for a status: options = [{ value, label, tone, disabled, hint }] */
export function StatusPicker({ value, options, onChange, disabled }) {
    const W = 220;
    const cur = options.find((o) => o.value === value) || { label: value || "—", tone: "slate" };
    const { pos, btn, toggle, close } = useAnchor({ width: W, height: options.length * 44 + 14, align: "left" });
    return (
        <>
            <button ref={btn} type="button" disabled={disabled} onClick={toggle} aria-haspopup="listbox" className={`inline-flex items-center gap-1.5 pl-2.5 pr-2 py-1.5 rounded-full border text-[11px] font-bold transition active:scale-95 ${TONE[cur.tone] || TONE.slate} ${disabled ? "cursor-default" : "cursor-pointer hover:shadow-sm"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${DOT[cur.tone] || DOT.slate}`} />
                {cur.label}
                {!disabled && <ChevronDown size={13} className={`transition-transform duration-200 ${pos ? "rotate-180" : ""}`} />}
            </button>
            {pos && (
                <div data-rec-pop role="listbox" style={{ top: pos.top, left: pos.left, width: W }} onClick={(e) => e.stopPropagation()} className="fixed z-[70] bg-white border border-slate-200 rounded-xl shadow-xl py-1.5">
                    {options.map((o) => (
                        <button key={o.value} type="button" role="option" aria-selected={o.value === value} disabled={o.disabled} onClick={() => { close(); if (o.value !== value) onChange(o.value); }} className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-left transition ${o.disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-indigo-50"} ${o.value === value ? "bg-indigo-50/60" : ""}`}>
                            <span className={`w-2 h-2 rounded-full shrink-0 ${DOT[o.tone] || DOT.slate}`} />
                            <span className="min-w-0 flex-1">
                                <span className="block text-slate-800">{o.label}</span>
                                {o.hint && <span className="block text-[10px] text-slate-400 font-medium">{o.hint}</span>}
                            </span>
                            {o.disabled && <Lock size={12} className="text-slate-400 shrink-0" />}
                        </button>
                    ))}
                </div>
            )}
        </>
    );
}