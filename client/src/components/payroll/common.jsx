"use client";

import { useEffect, useState } from "react";
import { Calendar, RefreshCw, Search, X } from "lucide-react";
import api from "@/lib/api";
import { MONTHS, Label, FieldError, inputClass, fieldBorder } from "./ui";

const THIS_YEAR = new Date().getFullYear();
export const YEARS = Array.from({ length: 7 }, (_, i) => THIS_YEAR + 1 - i);
export const monthYear = (m, y) => `${MONTHS[(Number(m) || 1) - 1]} ${y}`;

export const primaryBtn =
    "inline-flex items-center justify-center gap-2 px-5 py-3 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-indigo-600/20 transition active:scale-95 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed";
const filterSelect =
    "px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs font-semibold text-slate-700 outline-none transition focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 cursor-pointer";

/* A light list of active employees for the forms (admin and HR) */
export function useEmployeeOptions() {
    const [list, setList] = useState([]);
    useEffect(() => {
        let alive = true;
        api
            .get("/payroll/employee-options")
            .then(({ data }) => alive && setList(Array.isArray(data) ? data : []))
            .catch(() => { });
        return () => {
            alive = false;
        };
    }, []);
    return list;
}

export function EmployeeSelect({ value, onChange, options, error, disabled = false, label = "Employee" }) {
    return (
        <div>
            <Label>{label}</Label>
            <select value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} className={`${inputClass} cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${fieldBorder(error)}`}>
                <option value="">Select employee</option>
                {options.map((e) => (
                    <option key={e._id} value={e._id}>
                        {e.name} ({e.employeeId || "—"})
                    </option>
                ))}
            </select>
            <FieldError>{error}</FieldError>
        </div>
    );
}

/* Month and year inside a form */
export function PeriodFields({ month, year, onMonth, onYear, disabled = false, label }) {
    const years = YEARS.includes(Number(year)) ? YEARS : [Number(year), ...YEARS];
    const base = `${inputClass} cursor-pointer border-slate-200 focus:border-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed`;
    return (
        <div>
            {label && <Label>{label}</Label>}
            <div className="grid grid-cols-2 gap-3">
                <select value={month} disabled={disabled} onChange={(e) => onMonth(Number(e.target.value))} className={base}>
                    {MONTHS.map((m, i) => (
                        <option key={m} value={i + 1}>{m}</option>
                    ))}
                </select>
                <select value={year} disabled={disabled} onChange={(e) => onYear(Number(e.target.value))} className={base}>
                    {years.map((y) => (
                        <option key={y} value={y}>{y}</option>
                    ))}
                </select>
            </div>
        </div>
    );
}

/* Month and year in a filter bar (can show "All") */
export function PeriodFilter({ month, year, onMonth, onYear, allowAll = true }) {
    const years = year === "ALL" || YEARS.includes(Number(year)) ? YEARS : [Number(year), ...YEARS];
    const pick = (fn) => (e) => fn(e.target.value === "ALL" ? "ALL" : Number(e.target.value));
    return (
        <div className="flex items-center gap-2.5">
            <Calendar size={15} className="text-slate-400 shrink-0" />
            <select value={month} onChange={pick(onMonth)} className={filterSelect}>
                {allowAll && <option value="ALL">All months</option>}
                {MONTHS.map((m, i) => (
                    <option key={m} value={i + 1}>{m}</option>
                ))}
            </select>
            <select value={year} onChange={pick(onYear)} className={filterSelect}>
                {allowAll && <option value="ALL">All years</option>}
                {years.map((y) => (
                    <option key={y} value={y}>{y}</option>
                ))}
            </select>
        </div>
    );
}

const PILL = {
    slate: "bg-slate-100 text-slate-600 border-slate-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    rose: "bg-rose-50 text-rose-700 border-rose-200",
    violet: "bg-violet-50 text-violet-700 border-violet-200",
};

export function Pill({ tone = "slate", children }) {
    return <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap ${PILL[tone] || PILL.slate}`}>{children}</span>;
}

export function SearchBox({ value, onChange, placeholder }) {
    return (
        <div className="relative sm:max-w-sm flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full pl-9 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs outline-none transition focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" />
            {value && (
                <button type="button" onClick={() => onChange("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 cursor-pointer" aria-label="Clear search">
                    <X size={14} />
                </button>
            )}
        </div>
    );
}

/* tabs = [[key, label, count], ...] */
export function FilterTabs({ tabs, value, onChange }) {
    return (
        <div className="flex gap-2 overflow-x-auto">
            {tabs.map(([key, label, count]) => (
                <button key={key} type="button" onClick={() => onChange(key)} className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border transition cursor-pointer ${value === key ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"}`}>
                    {label}
                    {count !== undefined && <span className={`px-1.5 rounded-full text-[10px] ${value === key ? "bg-white/20" : "bg-slate-100 text-slate-500"}`}>{count}</span>}
                </button>
            ))}
        </div>
    );
}

export function PageHeader({ icon: Icon, title, subtitle, onRefresh, busy, children }) {
    return (
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm">
            <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 sm:w-12 sm:h-12 shrink-0 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20">
                    <Icon size={20} />
                </div>
                <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">{title}</h1>
                    <p className="text-xs sm:text-sm text-slate-500 mt-0.5">{subtitle}</p>
                </div>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
                {onRefresh && (
                    <button type="button" onClick={onRefresh} disabled={busy} className="p-3 sm:p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl transition disabled:opacity-50 cursor-pointer" aria-label="Refresh">
                        <RefreshCw size={16} className={busy ? "animate-spin text-indigo-600" : ""} />
                    </button>
                )}
                {children}
            </div>
        </div>
    );
}

export function ListSkeleton({ rows = 4 }) {
    return (
        <div className="divide-y divide-slate-100">
            {Array.from({ length: rows }).map((_, n) => (
                <div key={n} className="p-4 sm:p-5 flex gap-3.5 animate-pulse">
                    <div className="w-10 h-10 rounded-full bg-slate-100 shrink-0" />
                    <div className="flex-1 space-y-2.5">
                        <div className="h-3.5 w-1/3 rounded bg-slate-100" />
                        <div className="h-3 w-1/2 rounded bg-slate-100" />
                    </div>
                </div>
            ))}
        </div>
    );
}

export function EmptyBox({ icon: Icon, title, text }) {
    return (
        <div className="text-center py-16 px-4">
            <Icon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-700">{title}</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">{text}</p>
        </div>
    );
}