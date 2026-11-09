"use client";

import { useCallback, useEffect, useState } from "react";
import { Star } from "lucide-react";
import api from "@/lib/api";
import { Avatar, StatCard } from "@/components/payroll/ui";
import { EmptyBox, FilterTabs, ListSkeleton, SearchBox } from "@/components/payroll/common";
import { Chip, RowMenu, errMsg } from "@/components/recruitment/rui";

export const GOAL_ST = {
    "not-started": { label: "Not started", tone: "slate" },
    "in-progress": { label: "In progress", tone: "indigo" },
    completed: { label: "Completed", tone: "emerald" },
    overdue: { label: "Overdue", tone: "rose" },
};
export const APPR_ST = {
    "pending-self": { label: "Awaiting self assessment", tone: "amber" },
    "pending-manager": { label: "Awaiting manager", tone: "sky" },
    completed: { label: "Completed", tone: "emerald" },
};
export const DEC_ST = {
    none: { label: "None", tone: "slate" },
    pending: { label: "Pending", tone: "amber" },
    approved: { label: "Approved", tone: "sky" },
    rejected: { label: "Rejected", tone: "rose" },
    applied: { label: "Applied", tone: "emerald" },
};
export const DEC_TABS = { pending: DEC_ST.pending, approved: DEC_ST.approved, rejected: DEC_ST.rejected, applied: DEC_ST.applied };

export const selectCls = "px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:border-indigo-500 cursor-pointer max-w-full";

export const roleOf = (u) => String(u?.role || "").toLowerCase();
export const day = (v) => (v ? String(v).slice(0, 10) : "");
export const listOf = (d) => (Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : []);
export const defaultPeriod = () => {
    const d = new Date();
    return `${d.getFullYear()}-H${d.getMonth() < 6 ? 1 : 2}`;
};
export const tabsOf = (rows, map, key, all = "All") => [["all", all, rows.length], ...Object.entries(map).map(([k, s]) => [k, s.label, rows.filter((r) => r[key] === k).length])];

/* loads a url and keeps data, loading, error. load({ silent }) refreshes without the big skeleton */
export function useApi(url, params = {}) {
    const key = JSON.stringify(params);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");

    const load = useCallback(async ({ silent = false } = {}) => {
        if (silent) setRefreshing(true);
        else setLoading(true);
        setError("");
        try {
            const res = await api.get(url, { params: JSON.parse(key) });
            setData(res.data);
        } catch (err) {
            setError(await errMsg(err, "Unable to load the data."));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [url, key]);

    useEffect(() => { load(); }, [load]);
    return { data, loading, refreshing, error, load };
}

/* ------------------------------ small pieces ------------------------------ */

export const StChip = ({ map, v }) => {
    const s = map[v] || map.none || { label: v || "—", tone: "slate" };
    return <Chip tone={s.tone} dot>{s.label}</Chip>;
};

export function Person({ p, sub }) {
    return (
        <div className="flex items-center gap-2.5 min-w-0">
            <Avatar name={p?.name || "?"} size="w-9 h-9" />
            <div className="min-w-0">
                <p className="font-semibold text-slate-900 text-sm truncate max-w-[200px]">{p?.name || "Employee"}</p>
                <p className="text-[11px] text-slate-400 truncate max-w-[200px]">{sub ?? ([p?.employeeId, p?.department].filter(Boolean).join(" • ") || "—")}</p>
            </div>
        </div>
    );
}

export const Stars = ({ value = 0, size = 13 }) => (
    <span className="inline-flex gap-0.5" aria-label={`${value} out of 5`}>
        {[1, 2, 3, 4, 5].map((s) => <Star key={s} size={size} className={s <= value ? "fill-amber-400 text-amber-400" : "text-slate-200"} />)}
    </span>
);

export function StarPicker({ value, onChange }) {
    const [hover, setHover] = useState(0);
    return (
        <div className="inline-flex items-center gap-1 p-1.5 bg-slate-50 border border-slate-200 rounded-xl">
            {[1, 2, 3, 4, 5].map((s) => (
                <button key={s} type="button" aria-label={`${s} star`} onClick={() => onChange(s === value ? 0 : s)} onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(0)} className="p-1 transition hover:scale-110 cursor-pointer">
                    <Star size={24} className={s <= (hover || value) ? "fill-amber-400 text-amber-400" : "text-slate-300"} />
                </button>
            ))}
            <span className="ml-2 mr-1 text-sm font-bold text-slate-700 font-mono">{value || 0}/5</span>
        </div>
    );
}

export const Bar = ({ value = 0, tone = "bg-indigo-500" }) => (
    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${tone}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
);

/* ------------------------------ page parts ------------------------------ */

export const Stats = ({ items }) => (
    <div className={`grid grid-cols-2 gap-3 sm:gap-4 ${items.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
        {items.map(([label, value, I, tone], i) => (
            <div key={label} className={items.length === 3 && i === 2 ? "col-span-2 lg:col-span-1" : ""}><StatCard icon={I} tone={tone} label={label} value={value} /></div>
        ))}
    </div>
);

export function Toolbar({ search, onSearch, placeholder, tabs, tab, onTab, children }) {
    return (
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/70 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
                <SearchBox value={search} onChange={onSearch} placeholder={placeholder} />
                {children}
            </div>
            {tabs && <FilterTabs tabs={tabs} value={tab} onChange={onTab} />}
        </div>
    );
}

/* cards on phone and tablet, a table on desktop. cols = [{ h, cell(r) }], card(r) = card body, menu(r) = three-dot items */
export function DataList({ rows, cols, card, menu, onOpen }) {
    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 sm:p-4 lg:hidden">
                {rows.map((r) => (
                    <div key={r._id} onClick={() => onOpen?.(r)} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 hover:border-indigo-200 hover:shadow-sm transition cursor-pointer">
                        <div className="flex items-start gap-3">
                            <div className="min-w-0 flex-1">{card(r)}</div>
                            <div onClick={(e) => e.stopPropagation()}><RowMenu items={menu(r)} /></div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600 border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                        <tr>
                            {cols.map((c, i) => <th key={c.h} className={`${i === 0 ? "px-5" : "px-4"} py-3.5`}>{c.h}</th>)}
                            <th className="px-4 py-3.5 text-center w-20">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {rows.map((r) => (
                            <tr key={r._id} onClick={() => onOpen?.(r)} className="hover:bg-indigo-50/40 transition-colors cursor-pointer">
                                {cols.map((c, i) => <td key={c.h} className={`${i === 0 ? "px-5" : "px-4"} py-3 align-middle whitespace-nowrap`}>{c.cell(r)}</td>)}
                                <td className="px-4 py-3 align-middle text-center" onClick={(e) => e.stopPropagation()}><RowMenu items={menu(r)} /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}

/* the white box with skeleton, empty text and the list. empty = [title, text] */
export function DataPanel({ loading, rows, icon, empty, ...list }) {
    return (
        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
            {loading ? <ListSkeleton /> : rows.length === 0 ? <EmptyBox icon={icon} title={empty[0]} text={empty[1]} /> : <DataList rows={rows} {...list} />}
        </div>
    );
}