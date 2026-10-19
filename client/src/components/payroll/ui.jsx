"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Loader2, Trash2 } from "lucide-react";

export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export const isHex = (s) => /^[0-9a-fA-F]{24}$/.test(String(s || "").trim());

/* Text of a field that can be a populated object or a plain id (an id is never shown on screen) */
export const cleanText = (v) => {
    const s = typeof v === "object" && v ? v.name || v.title || "" : String(v || "");
    return isHex(s) ? "" : s;
};

export const round2 = (v) => Math.round((Number(v) || 0) * 100) / 100;
export const rupee = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const rupeeShort = (n) => `₹${Math.round(Number(n || 0)).toLocaleString("en-IN")}`;

export const dateText = (v) => {
    if (!v) return "—";
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

export const inputClass =
    "w-full px-4 py-3 bg-slate-50 border rounded-xl text-base sm:text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:bg-white focus:ring-4 focus:ring-indigo-500/10";
export const fieldBorder = (bad) => (bad ? "border-rose-400" : "border-slate-200 focus:border-indigo-500");

export function Label({ children }) {
    return <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">{children}</label>;
}

export function FieldError({ children }) {
    if (!children) return null;
    return (
        <p className="flex items-start gap-1.5 mt-1.5 text-[11px] font-semibold text-rose-600">
            <AlertCircle size={13} className="shrink-0 mt-px" />
            <span>{children}</span>
        </p>
    );
}

export function Avatar({ name, size = "w-9 h-9" }) {
    return (
        <div className={`${size} rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center font-bold text-xs shrink-0`}>
            {String(name || "?").trim().charAt(0).toUpperCase()}
        </div>
    );
}

const TONES = {
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    rose: "bg-rose-50 text-rose-600 border-rose-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    violet: "bg-violet-50 text-violet-600 border-violet-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
};

export function StatCard({ icon: Icon, label, value, sub, tone = "indigo" }) {
    return (
        <div className="min-w-0 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/70 shadow-sm flex items-center justify-between gap-3 transition-all duration-300 hover:shadow-lg hover:border-indigo-200 group">
            <div className="min-w-0">
                <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">{label}</p>
                <h3 className="text-lg sm:text-2xl font-bold text-slate-900 mt-1 truncate">{value}</h3>
                {sub && <p className="text-[11px] text-slate-400 mt-0.5 truncate">{sub}</p>}
            </div>
            <div className={`p-2.5 sm:p-3 rounded-xl border shrink-0 transition-transform group-hover:scale-110 ${TONES[tone]}`}>
                <Icon size={20} />
            </div>
        </div>
    );
}

export function ErrorBanner({ message, onRetry }) {
    if (!message) return null;
    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl">
            <div className="flex items-center gap-3 min-w-0">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <p className="text-xs sm:text-sm font-medium break-words">{message}</p>
            </div>
            {onRetry && (
                <button type="button" onClick={onRetry} className="self-end sm:self-auto px-3.5 py-1.5 bg-white text-rose-700 text-xs font-semibold rounded-lg border border-rose-200 hover:bg-rose-100/50 transition cursor-pointer">
                    Retry
                </button>
            )}
        </div>
    );
}

/* Bottom sheet on mobile, centered dialog on larger screens */
export function Sheet({ onClose, locked = false, size = "max-w-lg", children }) {
    useEffect(() => {
        const previous = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const onKey = (e) => e.key === "Escape" && !locked && onClose();
        window.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = previous;
            window.removeEventListener("keydown", onKey);
        };
    }, [onClose, locked]);

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-slate-900/50 backdrop-blur-sm" onClick={() => !locked && onClose()}>
            <div className={`w-full ${size} bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92dvh] overflow-hidden`} onClick={(e) => e.stopPropagation()}>
                {children}
            </div>
        </div>
    );
}

/* onConfirm does the work and shows its own toast. The dialog closes when it is done. */
export function ConfirmDialog({ title, text, label = "Confirm", danger = false, onConfirm, onClose }) {
    const [busy, setBusy] = useState(false);

    const run = async () => {
        setBusy(true);
        try {
            await onConfirm();
        } finally {
            setBusy(false);
            onClose();
        }
    };

    return (
        <Sheet onClose={onClose} locked={busy} size="max-w-md">
            <div className="p-5 sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
                <div className="flex items-start gap-3.5">
                    <div className={`w-11 h-11 shrink-0 rounded-2xl border flex items-center justify-center ${danger ? "bg-rose-50 border-rose-100 text-rose-600" : "bg-indigo-50 border-indigo-100 text-indigo-600"}`}>
                        {danger ? <Trash2 size={18} /> : <AlertCircle size={18} />}
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-base font-bold text-slate-900">{title}</h3>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">{text}</p>
                    </div>
                </div>
                <div className="mt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
                    <button type="button" onClick={onClose} disabled={busy} className="px-5 py-3 sm:py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50">
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={run}
                        disabled={busy}
                        className={`inline-flex items-center justify-center gap-2 px-6 py-3 sm:py-2.5 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer disabled:opacity-60 ${danger ? "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20" : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20"}`}
                    >
                        {busy && <Loader2 size={14} className="animate-spin" />}
                        {busy ? "Please wait..." : label}
                    </button>
                </div>
            </div>
        </Sheet>
    );
}