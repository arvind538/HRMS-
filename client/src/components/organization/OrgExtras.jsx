"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import api from "@/lib/api";
import { inputClass } from "@/components/payroll/ui";
import { primaryBtn } from "@/components/payroll/common";
import { Box, FooterBar, ghostBtn } from "@/components/recruitment/rui";

/* An input that also shows a list of common choices. items = [{ key, label, hint, preset }] */
export function Combo({ value, onChange, onPick, items, taken, placeholder, className, maxLength }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const away = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
        document.addEventListener("mousedown", away);
        document.addEventListener("touchstart", away, { passive: true });
        return () => { document.removeEventListener("mousedown", away); document.removeEventListener("touchstart", away); };
    }, []);

    const q = String(value || "").trim().toLowerCase();
    const list = items.filter((i) => !q || i.label.toLowerCase().includes(q)).slice(0, 80);

    return (
        <div ref={ref} className="relative">
            <input
                value={value ?? ""}
                maxLength={maxLength}
                placeholder={placeholder}
                autoComplete="off"
                onFocus={() => setOpen(true)}
                onChange={(e) => { onChange(e.target.value); setOpen(true); }}
                onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
                className={`${className} pr-10`}
            />
            <button type="button" tabIndex={-1} aria-label="Show list" onClick={() => setOpen((o) => !o)} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-indigo-600 cursor-pointer">
                <ChevronDown size={16} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
            </button>
            {open && list.length > 0 && (
                <ul role="listbox" className="absolute z-30 mt-1.5 w-full max-h-56 overflow-y-auto overscroll-contain bg-white border border-slate-200 rounded-xl shadow-xl py-1.5">
                    {list.map((i) => {
                        const used = taken.has(i.key);
                        return (
                            <li key={i.key}>
                                <button type="button" role="option" disabled={used} onClick={() => { onPick(i.preset); setOpen(false); }} className={`w-full flex items-center justify-between gap-3 px-3.5 py-2 text-left text-xs transition ${used ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-indigo-50"}`}>
                                    <span className="min-w-0"><span className="block font-semibold text-slate-800 truncate">{i.label}</span>{i.hint && <span className="block text-[10px] text-slate-400 truncate">{i.hint}</span>}</span>
                                    {used && <span className="shrink-0 text-[10px] font-bold text-emerald-600">Already added</span>}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}

/* Tick the common ones you need and add them all at once */
export function BulkAdd({ cfg, rows, onClose, onDone }) {
    const key = cfg.fields[0].key;
    const have = new Set(rows.map((r) => String(r[key] || "").trim().toLowerCase()));
    const items = cfg.presets.filter((p) => !have.has(p[key].toLowerCase()));
    const [sel, setSel] = useState(() => new Set());
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(0);

    const flip = (k) => setSel((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });
    const all = sel.size === items.length && items.length > 0;

    const run = async (e) => {
        e?.preventDefault();
        if (busy || !sel.size) return;
        setBusy(true);
        let ok = 0, fail = 0;
        for (const p of items.filter((x) => sel.has(x[key]))) {
            try {
                await api.post(`/organization/${cfg.path}`, { ...p, status: "active" });
                ok++;
            } catch {
                fail++;
            }
            setDone(ok + fail);
        }
        setBusy(false);
        if (ok) toast.success(`${ok} ${cfg.title.toLowerCase()} added.`);
        if (fail) toast.error(`${fail} could not be added (maybe they already exist).`);
        onDone();
        onClose();
    };

    return (
        <Box title={`Add common ${cfg.title.toLowerCase()}`} subtitle="Tick the ones your company needs" onClose={onClose} onSubmit={run} locked={busy} size="max-w-lg" footer={
            <FooterBar>
                <button type="button" onClick={onClose} disabled={busy} className={ghostBtn}>Cancel</button>
                <button type="submit" disabled={busy || !sel.size} className={`${primaryBtn} disabled:opacity-50`}>{busy && <Loader2 size={14} className="animate-spin" />}{busy ? `Adding ${done}/${sel.size}...` : `Add ${sel.size} selected`}</button>
            </FooterBar>
        }>
            {items.length === 0 ? (
                <p className="py-8 text-center text-xs font-semibold text-slate-400">Everything in the common list is already added.</p>
            ) : (
                <>
                    <button type="button" onClick={() => setSel(all ? new Set() : new Set(items.map((p) => p[key])))} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer">{all ? "Clear all" : `Select all (${items.length})`}</button>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {items.map((p) => {
                            const on = sel.has(p[key]);
                            return (
                                <li key={p[key]}>
                                    <button type="button" onClick={() => flip(p[key])} aria-pressed={on} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition cursor-pointer ${on ? "border-indigo-500 bg-indigo-50 ring-4 ring-indigo-100" : "border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50"}`}>
                                        <span className={`w-5 h-5 shrink-0 rounded-md border flex items-center justify-center ${on ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300 bg-white"}`}>{on && <Check size={13} strokeWidth={3} />}</span>
                                        <span className="min-w-0"><span className="block text-xs font-bold text-slate-800 truncate">{p[key]}</span><span className="block text-[10px] text-slate-400 truncate">{[p.code, p.level, p.department].filter(Boolean).join(" • ")}</span></span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </>
            )}
        </Box>
    );
}

/* Several employees for one reporting manager.
   people:    [{ _id, name, employeeId }]
   value:     employee ids already chosen for this manager
   elsewhere: Map(employeeId -> manager name) for employees already under another manager (locked) */
export function ReporteePicker({ people, value, onChange, elsewhere, placeholder }) {
    const [q, setQ] = useState("");
    const chosen = new Set(value);
    const term = q.trim().toLowerCase();

    /* chosen employees come first, so this manager's team is always at the top */
    const list = people
        .filter((p) => !term || `${p.name} ${p.employeeId || ""}`.toLowerCase().includes(term))
        .sort((a, b) => Number(chosen.has(b._id)) - Number(chosen.has(a._id)) || String(a.name).localeCompare(String(b.name)));

    const toggle = (id) => onChange(chosen.has(id) ? value.filter((x) => x !== id) : [...value, id]);

    return (
        <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2 text-[11px]">
                <span className="font-bold text-slate-500">{value.length} selected</span>
                {value.length > 0 && <button type="button" onClick={() => onChange([])} className="font-bold text-rose-600 hover:text-rose-700 cursor-pointer">Clear all</button>}
            </div>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder || "Search employee by name or ID"} className={`${inputClass} w-full`} />
            <ul className="max-h-60 overflow-y-auto overscroll-contain rounded-xl border border-slate-200 divide-y divide-slate-100">
                {list.length === 0 && <li className="px-3.5 py-6 text-center text-xs text-slate-400">No employee found.</li>}
                {list.map((p) => {
                    const on = chosen.has(p._id);
                    const owner = elsewhere.get(p._id);
                    const locked = !on && Boolean(owner);
                    return (
                        <li key={p._id}>
                            <button type="button" disabled={locked} onClick={() => toggle(p._id)} aria-pressed={on}
                                className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-left transition ${locked ? "opacity-50 cursor-not-allowed" : on ? "bg-indigo-50/70 cursor-pointer" : "hover:bg-slate-50 cursor-pointer"}`}>
                                <span className={`w-5 h-5 shrink-0 rounded-md border flex items-center justify-center ${on ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300 bg-white"}`}>{on && <Check size={13} strokeWidth={3} />}</span>
                                <span className="min-w-0 flex-1">
                                    <span className="block text-xs font-bold text-slate-800 truncate">{p.name}{p.employeeId ? ` (${p.employeeId})` : ""}</span>
                                    {locked && <span className="block text-[10px] font-semibold text-amber-600">Already under {owner}. Remove there first.</span>}
                                </span>
                            </button>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

