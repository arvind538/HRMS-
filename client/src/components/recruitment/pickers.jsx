"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Building2, Check, ChevronDown, Globe, Home, Loader2, Plus, Search, Shuffle, X } from "lucide-react";

const FIELD =
    "w-full px-4 py-3 bg-slate-50 border rounded-xl text-base sm:text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:bg-white focus:ring-4 focus:ring-indigo-500/10";

/* ------------------------------------------------------------------ */
/* Company locations                                                   */
/* ------------------------------------------------------------------ */
export const COMPANY_OFFICE = "4paySave. — Jamdoli, Jaipur";

export const LOCATION_PRESETS = [
    { value: COMPANY_OFFICE, label: "Head Office", hint: "4paySave., Jamdoli, Jaipur", icon: Building2 },
    { value: "Remote", label: "Remote", hint: "Work from home", icon: Home },
    { value: "Hybrid", label: "Hybrid", hint: "Office + remote", icon: Shuffle },
];

/* Location: professional tiles + "Other" option for any other city */
export function LocationPicker({ value, onChange, error }) {
    const isPreset = LOCATION_PRESETS.some((p) => p.value === value);
    const [other, setOther] = useState(Boolean(value) && !isPreset);

    const pick = (v) => {
        setOther(false);
        onChange(v);
    };
    const chooseOther = () => {
        setOther(true);
        if (isPreset) onChange("");
    };

    const tile = (active) =>
        `text-left p-3 rounded-xl border transition-all duration-200 cursor-pointer ${active
            ? "border-indigo-500 bg-indigo-50/60 ring-4 ring-indigo-500/10"
            : "border-slate-200 bg-white hover:border-indigo-300 hover:shadow-sm"
        }`;
    const iconBox = (active) =>
        `w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${active ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`;

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {LOCATION_PRESETS.map((p) => {
                    const Ic = p.icon;
                    const active = !other && value === p.value;
                    return (
                        <button key={p.value} type="button" onClick={() => pick(p.value)} className={tile(active)}>
                            <span className={iconBox(active)}><Ic size={15} /></span>
                            <p className="mt-2 text-xs font-bold text-slate-800">{p.label}</p>
                            <p className="text-[11px] text-slate-400 truncate">{p.hint}</p>
                        </button>
                    );
                })}
                <button type="button" onClick={chooseOther} className={tile(other)}>
                    <span className={iconBox(other)}><Globe size={15} /></span>
                    <p className="mt-2 text-xs font-bold text-slate-800">Other</p>
                    <p className="text-[11px] text-slate-400 truncate">Any other city</p>
                </button>
            </div>

            {other && (
                <input
                    value={value || ""}
                    maxLength={120}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="e.g. Pune, Maharashtra"
                    className={`${FIELD} ${error ? "border-rose-400" : "border-slate-200 focus:border-indigo-500"}`}
                />
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Skills: type + Enter / comma se chip, cross se remove               */
/* Chip par click karne se edit nahi hota                              */
/* ------------------------------------------------------------------ */
export function SkillsInput({ value = [], onChange, max = 20, placeholder = "Type a skill and press Enter" }) {
    const [text, setText] = useState("");

    const add = (raw) => {
        const parts = String(raw)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        if (!parts.length) return setText("");

        const next = [...value];
        for (const part of parts) {
            if (next.length >= max) break;
            if (part.length > 40) continue;
            if (!next.some((s) => s.toLowerCase() === part.toLowerCase())) next.push(part);
        }
        onChange(next);
        setText("");
    };

    const remove = (name) => onChange(value.filter((s) => s !== name));

    const onKeyDown = (e) => {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault(); // form submit na ho
            add(text);
        } else if (e.key === "Backspace" && !text && value.length) {
            remove(value[value.length - 1]);
        }
    };

    return (
        <div className="w-full min-h-[52px] px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl transition focus-within:bg-white focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10">
            <div className="flex flex-wrap items-center gap-2">
                {value.map((s) => (
                    <span
                        key={s}
                        className="inline-flex items-center gap-1 pl-3 pr-1 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold select-none"
                    >
                        {s}
                        <button
                            type="button"
                            onClick={() => remove(s)}
                            aria-label={`Remove ${s}`}
                            title="Remove"
                            className="p-1 rounded-full text-indigo-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        >
                            <X size={12} />
                        </button>
                    </span>
                ))}
                <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={onKeyDown}
                    onBlur={() => text.trim() && add(text)}
                    disabled={value.length >= max}
                    placeholder={value.length ? "Add more..." : placeholder}
                    className="flex-1 min-w-[160px] bg-transparent outline-none text-sm py-1 text-slate-800 placeholder:text-slate-400 disabled:cursor-not-allowed"
                />
            </div>
            <p className="mt-1.5 text-[11px] text-slate-400">
                Enter ya comma dabao to skill add hogi · {value.length}/{max}
            </p>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Department: search, lamba list, aur "Add new" option                */
/* ------------------------------------------------------------------ */
export function DepartmentPicker({ value, options = [], onChange, onCreate, error }) {
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState("");
    const [pos, setPos] = useState(null);
    const [busy, setBusy] = useState(false);
    const btnRef = useRef(null);
    const panelRef = useRef(null);
    const searchRef = useRef(null);

    const selected = options.find((o) => o._id === value);
    const query = q.trim();
    const filtered = useMemo(
        () => options.filter((o) => o.name.toLowerCase().includes(query.toLowerCase())),
        [options, query]
    );
    const exists = options.some((o) => o.name.toLowerCase() === query.toLowerCase());

    const openPanel = () => {
        const r = btnRef.current.getBoundingClientRect();
        const openUp = r.bottom + 340 > window.innerHeight && r.top > 340;
        setPos({
            left: r.left,
            width: r.width,
            top: openUp ? undefined : r.bottom + 6,
            bottom: openUp ? window.innerHeight - r.top + 6 : undefined,
        });
        setQ("");
        setOpen(true);
    };

    useEffect(() => {
        if (!open) return;
        const onDown = (e) => {
            if (btnRef.current?.contains(e.target) || panelRef.current?.contains(e.target)) return;
            setOpen(false);
        };
        const onKey = (e) => e.key === "Escape" && setOpen(false);
        const close = () => setOpen(false);
        const t = setTimeout(() => searchRef.current?.focus(), 40);

        document.addEventListener("mousedown", onDown);
        document.addEventListener("keydown", onKey);
        window.addEventListener("resize", close);
        window.addEventListener("scroll", close, true);
        return () => {
            clearTimeout(t);
            document.removeEventListener("mousedown", onDown);
            document.removeEventListener("keydown", onKey);
            window.removeEventListener("resize", close);
            window.removeEventListener("scroll", close, true);
        };
    }, [open]);

    const pick = (id) => {
        onChange(id);
        setOpen(false);
    };

    const add = async () => {
        if (!query || busy) return;
        setBusy(true);
        try {
            const id = await onCreate(query);
            if (id) pick(id);
        } finally {
            setBusy(false);
        }
    };

    const onSearchKey = (e) => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        if (filtered.length) pick(filtered[0]._id);
        else if (query && !exists) add();
    };

    return (
        <>
            <button
                ref={btnRef}
                type="button"
                onClick={() => (open ? setOpen(false) : openPanel())}
                className={`${FIELD} flex items-center justify-between gap-2 text-left cursor-pointer ${error ? "border-rose-400" : open ? "border-indigo-500 bg-white ring-4 ring-indigo-500/10" : "border-slate-200 hover:border-indigo-300"
                    }`}
            >
                <span className={`flex items-center gap-2.5 min-w-0 ${selected ? "text-slate-800" : "text-slate-400"}`}>
                    <Building2 size={15} className="text-indigo-500 shrink-0" />
                    <span className="truncate">{selected?.name || "Select department"}</span>
                </span>
                <ChevronDown size={16} className={`text-slate-400 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
            </button>

            {open && pos &&
                createPortal(
                    <div
                        ref={panelRef}
                        role="listbox"
                        style={{
                            left: pos.left,
                            width: pos.width,
                            top: pos.top,
                            bottom: pos.bottom,
                            animation: "deptIn 160ms ease-out",
                        }}
                        className="fixed z-[140] rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10 overflow-hidden"
                    >
                        <style>{`@keyframes deptIn { from { opacity: 0; transform: translateY(-4px) scale(.98); } to { opacity: 1; transform: none; } }`}</style>

                        <div className="relative p-2 border-b border-slate-100">
                            <Search size={14} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <input
                                ref={searchRef}
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                onKeyDown={onSearchKey}
                                placeholder="Search or add department"
                                className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-slate-50 text-sm text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                            />
                        </div>

                        <ul className="max-h-60 overflow-y-auto overscroll-contain p-1.5">
                            {filtered.map((o) => (
                                <li key={o._id}>
                                    <button
                                        type="button"
                                        onClick={() => pick(o._id)}
                                        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm text-left text-slate-700 hover:bg-indigo-50 transition"
                                    >
                                        <span className="flex items-center gap-2.5 min-w-0">
                                            <Building2 size={14} className="text-slate-400 shrink-0" />
                                            <span className="truncate">{o.name}</span>
                                        </span>
                                        {o._id === value && <Check size={15} className="text-indigo-600 shrink-0" />}
                                    </button>
                                </li>
                            ))}
                            {!filtered.length && (
                                <li className="px-3 py-6 text-center text-xs text-slate-400">
                                    {query ? "No match found." : "No departments yet. Type a name to add one."}
                                </li>
                            )}
                        </ul>

                        {query && !exists && (
                            <button
                                type="button"
                                onClick={add}
                                disabled={busy}
                                className="w-full flex items-center gap-2 px-4 py-3 border-t border-slate-100 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 transition disabled:opacity-60"
                            >
                                {busy ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                                Add "{query}" as new department
                            </button>
                        )}
                    </div>,
                    document.body
                )}
        </>
    );
}