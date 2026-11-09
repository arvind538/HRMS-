"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Gift, TrendingDown, Plus, Pencil, Trash2, Check, Loader2, X, Users, IndianRupee, Hash, Clock, Lock, Info, MoreVertical,
} from "lucide-react";
import { toast } from "react-toastify";
import api from "@/lib/api";
import { Avatar, ConfirmDialog, ErrorBanner, FieldError, Label, Sheet, StatCard, cleanText, fieldBorder, inputClass, rupee, rupeeShort } from "./ui";
import { EmployeeSelect, EmptyBox, FilterTabs, ListSkeleton, PageHeader, PeriodFields, PeriodFilter, Pill, SearchBox, monthYear, primaryBtn, useEmployeeOptions } from "./common";

const MENU_W = 190;
const MENU_H = 150; // approx height of menu (3 items + padding + hint)

const KINDS = {
    bonus: {
        api: "/payroll/bonuses",
        title: "Bonuses & Incentives",
        subtitle: "An Approved bonus is added to the payslip of the month it is made for.",
        add: "Add Bonus",
        icon: Gift,
        sign: "+",
        amountClass: "text-emerald-600",
        types: [["Performance", "Performance"], ["Festival", "Festival"], ["Retention", "Retention"], ["Discretionary", "Discretionary"]],
        defaultType: "Performance",
        statuses: ["Pending", "Approved", "Paid"],
        tone: { Pending: "amber", Approved: "emerald", Paid: "indigo" },
        createStatuses: ["Approved", "Pending"],
        editStatuses: ["Pending", "Approved"],
        eligible: "Approved",
        quick: { from: "Pending", to: "Approved", label: "Approve" },
        placeholder: "e.g. Diwali reward",
        notice: "A Pending bonus is not added to any payslip until it is approved.",
        locked: ["Paid"],
        totalLabel: "Total bonus",
    },
    deduction: {
        api: "/payroll/deductions",
        title: "Deductions & Recoveries",
        subtitle: "A Pending deduction is cut in the payslip of the month it is made for.",
        add: "Add Deduction",
        icon: TrendingDown,
        sign: "-",
        amountClass: "text-rose-600",
        types: [["OTHER", "Other"], ["LOAN_RECOVERY", "Loan recovery"], ["ADVANCE_SALARY", "Salary advance"], ["TDS", "TDS / tax"], ["DAMAGE_PENALTY", "Damage penalty"]],
        defaultType: "OTHER",
        statuses: ["Pending", "Applied", "Waived"],
        tone: { Pending: "amber", Applied: "indigo", Waived: "slate" },
        createStatuses: null,
        editStatuses: ["Pending", "Waived"],
        eligible: "Pending",
        quick: { from: "Pending", to: "Waived", label: "Waive" },
        placeholder: "e.g. Late laptop return penalty",
        notice: "A Waived deduction is never cut. Loan EMIs are handled in Loans / Advances, so do not add them here again.",
        locked: ["Applied"],
        totalLabel: "Total deductions",
    },
};

const idOf = (v) => String(v?._id || v || "");

export default function AdjustmentPage({ kind }) {
    const cfg = KINDS[kind];
    const Icon = cfg.icon;
    const typeLabel = Object.fromEntries(cfg.types);
    const employees = useEmployeeOptions();
    const now = new Date();

    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");
    const [month, setMonth] = useState("ALL");
    const [year, setYear] = useState(now.getFullYear());
    const [tab, setTab] = useState("all");
    const [search, setSearch] = useState("");

    const blank = () => ({ employeeId: "", title: "", amount: "", month: now.getMonth() + 1, year: now.getFullYear(), type: cfg.defaultType, remarks: "", status: cfg.createStatuses?.[0] || "" });
    const [modal, setModal] = useState(null); // { row }
    const [form, setForm] = useState(blank());
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [busyId, setBusyId] = useState("");
    const [ask, setAsk] = useState(null);

    // Three-dot menu: kaunsa row open hai aur menu kahan dikhe
    const [menu, setMenu] = useState(null); // { row, top, left }
    const menuRef = useRef(null);

    const load = useCallback(
        async ({ silent = false } = {}) => {
            if (silent) setRefreshing(true);
            else setLoading(true);
            setError("");
            try {
                const params = {};
                if (month !== "ALL") params.month = month;
                if (year !== "ALL") params.year = year;
                const { data } = await api.get(cfg.api, { params });
                setRows(Array.isArray(data) ? data : []);
            } catch (err) {
                setError(err?.response?.data?.message || "Unable to load the records. Please try again.");
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [cfg.api, month, year]
    );

    useEffect(() => {
        load();
    }, [load]);

    /* Menu ko bahar click, Escape, scroll ya resize par band karo */
    useEffect(() => {
        if (!menu) return;
        const onDown = (e) => {
            if (menuRef.current?.contains(e.target)) return;
            if (e.target.closest?.("[data-menu-btn]")) return;
            setMenu(null);
        };
        const onKey = (e) => e.key === "Escape" && setMenu(null);
        const close = () => setMenu(null);

        document.addEventListener("mousedown", onDown);
        document.addEventListener("keydown", onKey);
        window.addEventListener("resize", close);
        window.addEventListener("scroll", close, true);
        return () => {
            document.removeEventListener("mousedown", onDown);
            document.removeEventListener("keydown", onKey);
            window.removeEventListener("resize", close);
            window.removeEventListener("scroll", close, true);
        };
    }, [menu]);

    const isLocked = (r) => cfg.locked.includes(r.status) || (r.payslip && ["processed", "paid"].includes(r.payslip.status));
    const lockText = (r) =>
        cfg.locked.includes(r.status) ? "Already settled with a paid payslip." : `Already in the ${r.payslip?.status} payslip. ${r.payslip?.status === "processed" ? "Reopen that payslip first." : ""}`;

    const counts = useMemo(() => {
        const c = { all: rows.length };
        cfg.statuses.forEach((s) => (c[s] = rows.filter((r) => r.status === s).length));
        return c;
    }, [rows, cfg.statuses]);

    const visible = useMemo(() => {
        const q = search.trim().toLowerCase();
        return rows.filter((r) => {
            if (tab !== "all" && r.status !== tab) return false;
            if (!q) return true;
            return `${r.employee?.name || ""} ${r.employee?.employeeId || ""} ${r.title || ""} ${typeLabel[r.type] || ""}`.toLowerCase().includes(q);
        });
    }, [rows, tab, search, typeLabel]);

    const stats = useMemo(() => {
        const live = rows.filter((r) => r.status !== "Waived");
        return {
            total: live.reduce((s, r) => s + (Number(r.amount) || 0), 0),
            people: new Set(rows.map((r) => idOf(r.employee))).size,
            waiting: rows.filter((r) => r.status === cfg.eligible && !r.payslip).length,
        };
    }, [rows, cfg.eligible]);

    /* ---- form ---- */
    const openModal = (row = null) => {
        setMenu(null);
        setForm(
            row
                ? { employeeId: idOf(row.employee), title: row.title || "", amount: String(row.amount ?? ""), month: row.month, year: row.year, type: row.type, remarks: row.remarks || "", status: row.status }
                : blank()
        );
        setErrors({});
        setModal({ row });
    };

    const setField = (key, value) => {
        setForm((p) => ({ ...p, [key]: value }));
        setErrors((p) => (p[key] ? { ...p, [key]: undefined } : p));
    };

    const save = async (e) => {
        e.preventDefault();
        if (saving) return;
        const next = {};
        if (!modal.row && !form.employeeId) next.employeeId = "Please select an employee.";
        if (form.title.trim().length < 2) next.title = "Please enter a title (at least 2 characters).";
        const amount = Number(form.amount);
        if (!Number.isFinite(amount) || amount <= 0) next.amount = "Enter a valid amount.";
        else if (amount > 10000000) next.amount = "This amount is too high. Please check it.";
        setErrors(next);
        if (Object.keys(next).length) return;

        const payload = { title: form.title.trim(), amount, month: form.month, year: form.year, type: form.type, remarks: form.remarks.trim() };
        if (form.status && (modal.row ? cfg.editStatuses.includes(form.status) : cfg.createStatuses)) payload.status = form.status;

        setSaving(true);
        try {
            const res = modal.row ? await api.put(`${cfg.api}/${modal.row._id}`, payload) : await api.post(cfg.api, { ...payload, employeeId: form.employeeId });
            toast.success(modal.row ? "Record updated." : "Record added.");
            if (res.data?.warning) toast.warning(res.data.warning, { autoClose: 9000 });
            setModal(null);
            load({ silent: true });
        } catch (err) {
            toast.error(err?.response?.data?.message || "Unable to save the record.");
        } finally {
            setSaving(false);
        }
    };

    const quick = async (r) => {
        setBusyId(r._id);
        try {
            await api.put(`${cfg.api}/${r._id}`, { status: cfg.quick.to });
            toast.success(`Marked as ${cfg.quick.to}.`);
            await load({ silent: true });
        } catch (err) {
            toast.error(err?.response?.data?.message || "Unable to change the status.");
        } finally {
            setBusyId("");
        }
    };

    const remove = (r) => {
        setMenu(null);
        setAsk({
            title: "Delete this record?",
            text: `${r.employee?.name}: ${r.title} (${rupee(r.amount)}, ${monthYear(r.month, r.year)}). This cannot be undone.`,
            run: async () => {
                try {
                    await api.delete(`${cfg.api}/${r._id}`);
                    toast.success("Record deleted.");
                    await load({ silent: true });
                } catch (err) {
                    toast.error(err?.response?.data?.message || "Unable to delete the record.");
                }
            },
        });
    };

    /* ---- three-dot menu ---- */
    const openMenu = (e, row) => {
        e.stopPropagation();
        if (menu?.row?._id === row._id) return setMenu(null);

        const r = e.currentTarget.getBoundingClientRect();
        const openUp = r.bottom + MENU_H + 8 > window.innerHeight;
        setMenu({
            row,
            top: openUp ? r.top - MENU_H - 6 : r.bottom + 6,
            left: Math.max(8, r.right - MENU_W),
        });
    };

    /* Menu me kaunse buttons dikhenge: quick action, edit, delete */
    const buildItems = (r) => {
        const locked = isLocked(r);
        const items = [];
        if (r.status === cfg.quick.from && !locked) {
            items.push({ key: "quick", label: cfg.quick.label, icon: Check, tone: "emerald", run: () => { setMenu(null); quick(r); } });
        }
        items.push({ key: "edit", label: "Edit", icon: Pencil, tone: "slate", disabled: locked, hint: lockText(r), run: () => openModal(r) });
        items.push({ key: "delete", label: "Delete", icon: Trash2, tone: "rose", disabled: locked, hint: lockText(r), run: () => remove(r) });
        return items;
    };

    const TONE_CLS = {
        slate: "text-slate-700 enabled:hover:bg-slate-100",
        emerald: "text-emerald-700 enabled:hover:bg-emerald-50",
        rose: "text-rose-600 enabled:hover:bg-rose-50",
    };

    /* ---- pieces of one row ---- */
    const empCell = (r, size) => (
        <div className="flex items-center gap-3 min-w-0">
            <Avatar name={r.employee?.name} size={size} />
            <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">{r.employee?.name || "Unknown"}</p>
                <p className="text-[11px] text-slate-500 truncate">{[r.employee?.employeeId, cleanText(r.employee?.department)].filter(Boolean).join(" • ") || "—"}</p>
            </div>
        </div>
    );
    const statusPill = (r) => <Pill tone={cfg.tone[r.status]}>{r.status}</Pill>;
    const slipPill = (r) =>
        r.payslip ? (
            <Pill tone={r.payslip.status === "draft" ? "amber" : r.payslip.status === "processed" ? "blue" : "indigo"}>In {r.payslip.status} payslip</Pill>
        ) : r.status === cfg.eligible ? (
            <Pill tone="slate">Not in a payslip yet</Pill>
        ) : (
            <span className="text-[11px] text-slate-400">—</span>
        );

    const actions = (r) => {
        if (busyId === r._id) return <Loader2 size={18} className="animate-spin text-indigo-600 ml-auto" />;
        const isOpen = menu?.row?._id === r._id;
        return (
            <div className="flex items-center justify-end gap-1.5">
                {isLocked(r) && <Lock size={14} className="text-slate-300" title={lockText(r)} />}
                <button
                    type="button"
                    data-menu-btn
                    onClick={(e) => openMenu(e, r)}
                    aria-haspopup="menu"
                    aria-expanded={isOpen}
                    aria-label="More actions"
                    title="More actions"
                    className={`p-2 rounded-lg transition-all duration-150 active:scale-95 ${isOpen ? "bg-slate-100 text-slate-800" : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                        }`}
                >
                    <MoreVertical size={16} />
                </button>
            </div>
        );
    };

    const money = (r) => (
        <span className={`font-extrabold font-mono ${cfg.amountClass}`}>
            {cfg.sign}
            {rupee(r.amount)}
        </span>
    );

    return (
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 py-4 space-y-4 antialiased pb-16">
            <style>{`@keyframes adjMenuIn { from { opacity: 0; transform: translateY(-4px) scale(.97); } to { opacity: 1; transform: none; } }`}</style>

            <PageHeader icon={Icon} title={cfg.title} subtitle={cfg.subtitle} onRefresh={() => load({ silent: true })} busy={loading || refreshing}>
                <button type="button" onClick={() => openModal(null)} className={primaryBtn}>
                    <Plus size={16} /> {cfg.add}
                </button>
            </PageHeader>

            <div className="flex items-start gap-2.5 px-4 py-3 rounded-2xl bg-indigo-50/60 border border-indigo-100 text-indigo-900 text-xs">
                <Info size={15} className="shrink-0 mt-0.5 text-indigo-500" />
                <p className="font-medium">{cfg.notice} Add it <b>before</b> generating the payslip of that month, or choose <b>Recalculate</b> on the draft payslip afterwards.</p>
            </div>

            {!loading && !error && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <StatCard icon={IndianRupee} tone={kind === "bonus" ? "emerald" : "rose"} label={cfg.totalLabel} value={rupeeShort(stats.total)} sub="Without waived" />
                    <StatCard icon={Users} tone="indigo" label="Employees" value={stats.people} />
                    <StatCard icon={Hash} tone="violet" label="Records" value={rows.length} />
                    <StatCard icon={Clock} tone="amber" label="Not in a payslip" value={stats.waiting} sub="Waiting for the next payslip" />
                </div>
            )}

            <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/70 shadow-sm space-y-3">
                <div className="flex flex-wrap items-center gap-2.5">
                    <PeriodFilter month={month} year={year} onMonth={setMonth} onYear={setYear} />
                    <SearchBox value={search} onChange={setSearch} placeholder="Search employee, ID or title" />
                </div>
                <FilterTabs tabs={[["all", "All", counts.all], ...cfg.statuses.map((s) => [s, s, counts[s]])]} value={tab} onChange={setTab} />
            </div>

            <ErrorBanner message={error} onRetry={() => load()} />

            <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
                {loading ? (
                    <ListSkeleton />
                ) : visible.length === 0 ? (
                    <EmptyBox icon={Icon} title={rows.length === 0 ? "No records yet" : "Nothing matches your search"} text={rows.length === 0 ? `Click "${cfg.add}" to add the first one.` : "Try another keyword, month or status."} />
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 sm:p-4 lg:hidden">
                            {visible.map((r) => (
                                <div key={r._id} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                                    <div className="flex items-start justify-between gap-2">
                                        {empCell(r, "w-10 h-10")}
                                        {statusPill(r)}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-800 break-words">{r.title}</p>
                                        <p className="text-[11px] text-slate-500">{typeLabel[r.type] || r.type} • {monthYear(r.month, r.year)}</p>
                                        {r.remarks && <p className="text-[11px] text-slate-400 mt-1 break-words line-clamp-2">{r.remarks}</p>}
                                    </div>
                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                        <span className="text-lg">{money(r)}</span>
                                        {slipPill(r)}
                                    </div>
                                    <div className="pt-1 border-t border-slate-100">{actions(r)}</div>
                                </div>
                            ))}
                        </div>

                        <div className="hidden lg:block overflow-x-auto">
                            <table className="w-full text-left text-xs text-slate-600 border-collapse">
                                <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase">
                                    <tr>
                                        <th className="px-5 py-3.5">Employee</th>
                                        <th className="px-4 py-3.5">Title</th>
                                        <th className="px-4 py-3.5">Month</th>
                                        <th className="px-4 py-3.5">Amount</th>
                                        <th className="px-4 py-3.5">Status</th>
                                        <th className="px-4 py-3.5">Payslip</th>
                                        <th className="px-4 py-3.5 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {visible.map((r) => (
                                        <tr key={r._id} className="hover:bg-indigo-50/40 transition-colors">
                                            <td className="px-5 py-3.5">{empCell(r, "w-9 h-9")}</td>
                                            <td className="px-4 py-3.5 max-w-[220px]">
                                                <p className="font-semibold text-slate-800 text-sm truncate">{r.title}</p>
                                                <p className="text-[11px] text-slate-400 truncate">{typeLabel[r.type] || r.type}{r.remarks ? ` • ${r.remarks}` : ""}</p>
                                            </td>
                                            <td className="px-4 py-3.5 whitespace-nowrap">{monthYear(r.month, r.year)}</td>
                                            <td className="px-4 py-3.5 whitespace-nowrap text-sm">{money(r)}</td>
                                            <td className="px-4 py-3.5">{statusPill(r)}</td>
                                            <td className="px-4 py-3.5">{slipPill(r)}</td>
                                            <td className="px-4 py-3.5">{actions(r)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>

            {/* Three-dot menu (fixed, table ke andar clip nahi hota) */}
            {menu && (
                <div
                    ref={menuRef}
                    role="menu"
                    style={{ top: menu.top, left: menu.left, width: MENU_W, animation: "adjMenuIn 150ms ease-out" }}
                    className="fixed z-[120] origin-top-right rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10"
                >
                    {isLocked(menu.row) && (
                        <p className="px-3 pt-1.5 pb-2 text-[11px] font-semibold text-slate-400 leading-snug border-b border-slate-100 mb-1">
                            {lockText(menu.row)}
                        </p>
                    )}
                    {buildItems(menu.row).map((it) => {
                        const Ico = it.icon;
                        return (
                            <button
                                key={it.key}
                                type="button"
                                role="menuitem"
                                disabled={it.disabled}
                                onClick={it.run}
                                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed ${TONE_CLS[it.tone]}`}
                            >
                                <Ico size={15} />
                                {it.label}
                            </button>
                        );
                    })}
                </div>
            )}

            {modal && (
                <Sheet onClose={() => setModal(null)} locked={saving} size="max-w-lg">
                    <form onSubmit={save} noValidate className="flex flex-col min-h-0 flex-1">
                        <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/70">
                            <div className="min-w-0">
                                <h3 className="text-base font-bold text-slate-900">{modal.row ? `Edit ${kind}` : cfg.add}</h3>
                                <p className="text-xs text-slate-400">It goes into the payslip of the month you choose.</p>
                            </div>
                            <button type="button" onClick={() => !saving && setModal(null)} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer" aria-label="Close"><X size={18} /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6 space-y-4">
                            <EmployeeSelect value={form.employeeId} onChange={(v) => setField("employeeId", v)} options={employees} error={errors.employeeId} disabled={Boolean(modal.row)} />

                            <div>
                                <Label>Title</Label>
                                <input value={form.title} maxLength={100} onChange={(e) => setField("title", e.target.value)} placeholder={cfg.placeholder} className={`${inputClass} ${fieldBorder(errors.title)}`} />
                                <FieldError>{errors.title}</FieldError>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <Label>Type</Label>
                                    <select value={form.type} onChange={(e) => setField("type", e.target.value)} className={`${inputClass} cursor-pointer border-slate-200 focus:border-indigo-500`}>
                                        {cfg.types.map(([v, l]) => (<option key={v} value={v}>{l}</option>))}
                                    </select>
                                </div>
                                <div>
                                    <Label>Amount (₹)</Label>
                                    <input type="number" inputMode="decimal" min="1" step="any" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} placeholder="e.g. 2500" className={`${inputClass} ${fieldBorder(errors.amount)}`} />
                                    <FieldError>{errors.amount}</FieldError>
                                </div>
                            </div>

                            <PeriodFields label="For the payslip of" month={form.month} year={form.year} onMonth={(v) => setField("month", v)} onYear={(v) => setField("year", v)} />

                            {(modal.row ? cfg.editStatuses : cfg.createStatuses) && (
                                <div>
                                    <Label>Status</Label>
                                    <select value={form.status} onChange={(e) => setField("status", e.target.value)} className={`${inputClass} cursor-pointer border-slate-200 focus:border-indigo-500`}>
                                        {(modal.row ? cfg.editStatuses : cfg.createStatuses).map((s) => (<option key={s} value={s}>{s}</option>))}
                                    </select>
                                </div>
                            )}

                            <div>
                                <Label>Remarks (optional)</Label>
                                <textarea rows={2} value={form.remarks} maxLength={300} onChange={(e) => setField("remarks", e.target.value)} className={`${inputClass} resize-none border-slate-200 focus:border-indigo-500`} />
                            </div>
                        </div>

                        <div className="shrink-0 border-t border-slate-100 bg-white px-5 sm:px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
                            <button type="button" onClick={() => setModal(null)} disabled={saving} className="px-5 py-3 sm:py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50">Cancel</button>
                            <button type="submit" disabled={saving} className={primaryBtn}>
                                {saving && <Loader2 size={14} className="animate-spin" />}
                                {saving ? "Saving..." : modal.row ? "Save Changes" : "Save"}
                            </button>
                        </div>
                    </form>
                </Sheet>
            )}

            {ask && <ConfirmDialog title={ask.title} text={ask.text} label="Delete" danger onConfirm={ask.run} onClose={() => setAsk(null)} />}
        </div>
    );
}










// "use client";

// import { useCallback, useEffect, useMemo, useState } from "react";
// import { Gift, TrendingDown, Plus, Pencil, Trash2, Check, Loader2, X, Users, IndianRupee, Hash, Clock, Lock, Info } from "lucide-react";
// import { toast } from "react-toastify";
// import api from "@/lib/api";
// import { Avatar, ConfirmDialog, ErrorBanner, FieldError, Label, Sheet, StatCard, cleanText, fieldBorder, inputClass, rupee, rupeeShort } from "./ui";
// import { EmployeeSelect, EmptyBox, FilterTabs, ListSkeleton, PageHeader, PeriodFields, PeriodFilter, Pill, SearchBox, monthYear, primaryBtn, useEmployeeOptions } from "./common";

// const KINDS = {
//     bonus: {
//         api: "/payroll/bonuses",
//         title: "Bonuses & Incentives",
//         subtitle: "An Approved bonus is added to the payslip of the month it is made for.",
//         add: "Add Bonus",
//         icon: Gift,
//         sign: "+",
//         amountClass: "text-emerald-600",
//         types: [["Performance", "Performance"], ["Festival", "Festival"], ["Retention", "Retention"], ["Discretionary", "Discretionary"]],
//         defaultType: "Performance",
//         statuses: ["Pending", "Approved", "Paid"],
//         tone: { Pending: "amber", Approved: "emerald", Paid: "indigo" },
//         createStatuses: ["Approved", "Pending"],
//         editStatuses: ["Pending", "Approved"],
//         eligible: "Approved",
//         quick: { from: "Pending", to: "Approved", label: "Approve" },
//         placeholder: "e.g. Diwali reward",
//         notice: "A Pending bonus is not added to any payslip until it is approved.",
//         locked: ["Paid"],
//         totalLabel: "Total bonus",
//     },
//     deduction: {
//         api: "/payroll/deductions",
//         title: "Deductions & Recoveries",
//         subtitle: "A Pending deduction is cut in the payslip of the month it is made for.",
//         add: "Add Deduction",
//         icon: TrendingDown,
//         sign: "-",
//         amountClass: "text-rose-600",
//         types: [["OTHER", "Other"], ["LOAN_RECOVERY", "Loan recovery"], ["ADVANCE_SALARY", "Salary advance"], ["TDS", "TDS / tax"], ["DAMAGE_PENALTY", "Damage penalty"]],
//         defaultType: "OTHER",
//         statuses: ["Pending", "Applied", "Waived"],
//         tone: { Pending: "amber", Applied: "indigo", Waived: "slate" },
//         createStatuses: null,
//         editStatuses: ["Pending", "Waived"],
//         eligible: "Pending",
//         quick: { from: "Pending", to: "Waived", label: "Waive" },
//         placeholder: "e.g. Late laptop return penalty",
//         notice: "A Waived deduction is never cut. Loan EMIs are handled in Loans / Advances, so do not add them here again.",
//         locked: ["Applied"],
//         totalLabel: "Total deductions",
//     },
// };

// const idOf = (v) => String(v?._id || v || "");

// export default function AdjustmentPage({ kind }) {
//     const cfg = KINDS[kind];
//     const Icon = cfg.icon;
//     const typeLabel = Object.fromEntries(cfg.types);
//     const employees = useEmployeeOptions();
//     const now = new Date();

//     const [rows, setRows] = useState([]);
//     const [loading, setLoading] = useState(true);
//     const [refreshing, setRefreshing] = useState(false);
//     const [error, setError] = useState("");
//     const [month, setMonth] = useState("ALL");
//     const [year, setYear] = useState(now.getFullYear());
//     const [tab, setTab] = useState("all");
//     const [search, setSearch] = useState("");

//     const blank = () => ({ employeeId: "", title: "", amount: "", month: now.getMonth() + 1, year: now.getFullYear(), type: cfg.defaultType, remarks: "", status: cfg.createStatuses?.[0] || "" });
//     const [modal, setModal] = useState(null); // { row }
//     const [form, setForm] = useState(blank());
//     const [errors, setErrors] = useState({});
//     const [saving, setSaving] = useState(false);
//     const [busyId, setBusyId] = useState("");
//     const [ask, setAsk] = useState(null);

//     const load = useCallback(
//         async ({ silent = false } = {}) => {
//             if (silent) setRefreshing(true);
//             else setLoading(true);
//             setError("");
//             try {
//                 const params = {};
//                 if (month !== "ALL") params.month = month;
//                 if (year !== "ALL") params.year = year;
//                 const { data } = await api.get(cfg.api, { params });
//                 setRows(Array.isArray(data) ? data : []);
//             } catch (err) {
//                 setError(err?.response?.data?.message || "Unable to load the records. Please try again.");
//             } finally {
//                 setLoading(false);
//                 setRefreshing(false);
//             }
//         },
//         [cfg.api, month, year]
//     );

//     useEffect(() => {
//         load();
//     }, [load]);

//     const isLocked = (r) => cfg.locked.includes(r.status) || (r.payslip && ["processed", "paid"].includes(r.payslip.status));
//     const lockText = (r) =>
//         cfg.locked.includes(r.status) ? "Already settled with a paid payslip." : `Already in the ${r.payslip?.status} payslip. ${r.payslip?.status === "processed" ? "Reopen that payslip first." : ""}`;

//     const counts = useMemo(() => {
//         const c = { all: rows.length };
//         cfg.statuses.forEach((s) => (c[s] = rows.filter((r) => r.status === s).length));
//         return c;
//     }, [rows, cfg.statuses]);

//     const visible = useMemo(() => {
//         const q = search.trim().toLowerCase();
//         return rows.filter((r) => {
//             if (tab !== "all" && r.status !== tab) return false;
//             if (!q) return true;
//             return `${r.employee?.name || ""} ${r.employee?.employeeId || ""} ${r.title || ""} ${typeLabel[r.type] || ""}`.toLowerCase().includes(q);
//         });
//     }, [rows, tab, search, typeLabel]);

//     const stats = useMemo(() => {
//         const live = rows.filter((r) => r.status !== "Waived");
//         return {
//             total: live.reduce((s, r) => s + (Number(r.amount) || 0), 0),
//             people: new Set(rows.map((r) => idOf(r.employee))).size,
//             waiting: rows.filter((r) => r.status === cfg.eligible && !r.payslip).length,
//         };
//     }, [rows, cfg.eligible]);

//     /* ---- form ---- */
//     const openModal = (row = null) => {
//         setForm(
//             row
//                 ? { employeeId: idOf(row.employee), title: row.title || "", amount: String(row.amount ?? ""), month: row.month, year: row.year, type: row.type, remarks: row.remarks || "", status: row.status }
//                 : blank()
//         );
//         setErrors({});
//         setModal({ row });
//     };

//     const setField = (key, value) => {
//         setForm((p) => ({ ...p, [key]: value }));
//         setErrors((p) => (p[key] ? { ...p, [key]: undefined } : p));
//     };

//     const save = async (e) => {
//         e.preventDefault();
//         if (saving) return;
//         const next = {};
//         if (!modal.row && !form.employeeId) next.employeeId = "Please select an employee.";
//         if (form.title.trim().length < 2) next.title = "Please enter a title (at least 2 characters).";
//         const amount = Number(form.amount);
//         if (!Number.isFinite(amount) || amount <= 0) next.amount = "Enter a valid amount.";
//         else if (amount > 10000000) next.amount = "This amount is too high. Please check it.";
//         setErrors(next);
//         if (Object.keys(next).length) return;

//         const payload = { title: form.title.trim(), amount, month: form.month, year: form.year, type: form.type, remarks: form.remarks.trim() };
//         if (form.status && (modal.row ? cfg.editStatuses.includes(form.status) : cfg.createStatuses)) payload.status = form.status;

//         setSaving(true);
//         try {
//             const res = modal.row ? await api.put(`${cfg.api}/${modal.row._id}`, payload) : await api.post(cfg.api, { ...payload, employeeId: form.employeeId });
//             toast.success(modal.row ? "Record updated." : "Record added.");
//             if (res.data?.warning) toast.warning(res.data.warning, { autoClose: 9000 });
//             setModal(null);
//             load({ silent: true });
//         } catch (err) {
//             toast.error(err?.response?.data?.message || "Unable to save the record.");
//         } finally {
//             setSaving(false);
//         }
//     };

//     const quick = async (r) => {
//         setBusyId(r._id);
//         try {
//             await api.put(`${cfg.api}/${r._id}`, { status: cfg.quick.to });
//             toast.success(`Marked as ${cfg.quick.to}.`);
//             await load({ silent: true });
//         } catch (err) {
//             toast.error(err?.response?.data?.message || "Unable to change the status.");
//         } finally {
//             setBusyId("");
//         }
//     };

//     const remove = (r) =>
//         setAsk({
//             title: "Delete this record?",
//             text: `${r.employee?.name}: ${r.title} (${rupee(r.amount)}, ${monthYear(r.month, r.year)}). This cannot be undone.`,
//             run: async () => {
//                 try {
//                     await api.delete(`${cfg.api}/${r._id}`);
//                     toast.success("Record deleted.");
//                     await load({ silent: true });
//                 } catch (err) {
//                     toast.error(err?.response?.data?.message || "Unable to delete the record.");
//                 }
//             },
//         });

//     /* ---- pieces of one row ---- */
//     const empCell = (r, size) => (
//         <div className="flex items-center gap-3 min-w-0">
//             <Avatar name={r.employee?.name} size={size} />
//             <div className="min-w-0">
//                 <p className="text-sm font-bold text-slate-900 truncate">{r.employee?.name || "Unknown"}</p>
//                 <p className="text-[11px] text-slate-500 truncate">{[r.employee?.employeeId, cleanText(r.employee?.department)].filter(Boolean).join(" • ") || "—"}</p>
//             </div>
//         </div>
//     );
//     const statusPill = (r) => <Pill tone={cfg.tone[r.status]}>{r.status}</Pill>;
//     const slipPill = (r) =>
//         r.payslip ? (
//             <Pill tone={r.payslip.status === "draft" ? "amber" : r.payslip.status === "processed" ? "blue" : "indigo"}>In {r.payslip.status} payslip</Pill>
//         ) : r.status === cfg.eligible ? (
//             <Pill tone="slate">Not in a payslip yet</Pill>
//         ) : (
//             <span className="text-[11px] text-slate-400">—</span>
//         );

//     const actions = (r) => {
//         if (busyId === r._id) return <Loader2 size={18} className="animate-spin text-indigo-600" />;
//         const locked = isLocked(r);
//         const icon = "inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed";
//         return (
//             <div className="flex items-center justify-end gap-1.5">
//                 {locked && <Lock size={14} className="text-slate-300" title={lockText(r)} />}
//                 {r.status === cfg.quick.from && !locked && (
//                     <button type="button" onClick={() => quick(r)} className="inline-flex items-center gap-1 px-3 h-9 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer">
//                         <Check size={13} /> {cfg.quick.label}
//                     </button>
//                 )}
//                 <button type="button" disabled={locked} onClick={() => openModal(r)} title={locked ? lockText(r) : "Edit"} className={`${icon} enabled:hover:text-indigo-600 enabled:hover:bg-indigo-50`} aria-label="Edit">
//                     <Pencil size={15} />
//                 </button>
//                 <button type="button" disabled={locked} onClick={() => remove(r)} title={locked ? lockText(r) : "Delete"} className={`${icon} enabled:hover:text-rose-600 enabled:hover:bg-rose-50`} aria-label="Delete">
//                     <Trash2 size={15} />
//                 </button>
//             </div>
//         );
//     };

//     const money = (r) => (
//         <span className={`font-extrabold font-mono ${cfg.amountClass}`}>
//             {cfg.sign}
//             {rupee(r.amount)}
//         </span>
//     );

//     return (
//         <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 py-4 space-y-4 antialiased pb-16">
//             <PageHeader icon={Icon} title={cfg.title} subtitle={cfg.subtitle} onRefresh={() => load({ silent: true })} busy={loading || refreshing}>
//                 <button type="button" onClick={() => openModal(null)} className={primaryBtn}>
//                     <Plus size={16} /> {cfg.add}
//                 </button>
//             </PageHeader>

//             <div className="flex items-start gap-2.5 px-4 py-3 rounded-2xl bg-indigo-50/60 border border-indigo-100 text-indigo-900 text-xs">
//                 <Info size={15} className="shrink-0 mt-0.5 text-indigo-500" />
//                 <p className="font-medium">{cfg.notice} Add it <b>before</b> generating the payslip of that month, or choose <b>Recalculate</b> on the draft payslip afterwards.</p>
//             </div>

//             {!loading && !error && (
//                 <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
//                     <StatCard icon={IndianRupee} tone={kind === "bonus" ? "emerald" : "rose"} label={cfg.totalLabel} value={rupeeShort(stats.total)} sub="Without waived" />
//                     <StatCard icon={Users} tone="indigo" label="Employees" value={stats.people} />
//                     <StatCard icon={Hash} tone="violet" label="Records" value={rows.length} />
//                     <StatCard icon={Clock} tone="amber" label="Not in a payslip" value={stats.waiting} sub="Waiting for the next payslip" />
//                 </div>
//             )}

//             <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/70 shadow-sm space-y-3">
//                 <div className="flex flex-wrap items-center gap-2.5">
//                     <PeriodFilter month={month} year={year} onMonth={setMonth} onYear={setYear} />
//                     <SearchBox value={search} onChange={setSearch} placeholder="Search employee, ID or title" />
//                 </div>
//                 <FilterTabs tabs={[["all", "All", counts.all], ...cfg.statuses.map((s) => [s, s, counts[s]])]} value={tab} onChange={setTab} />
//             </div>

//             <ErrorBanner message={error} onRetry={() => load()} />

//             <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
//                 {loading ? (
//                     <ListSkeleton />
//                 ) : visible.length === 0 ? (
//                     <EmptyBox icon={Icon} title={rows.length === 0 ? "No records yet" : "Nothing matches your search"} text={rows.length === 0 ? `Click "${cfg.add}" to add the first one.` : "Try another keyword, month or status."} />
//                 ) : (
//                     <>
//                         <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 sm:p-4 lg:hidden">
//                             {visible.map((r) => (
//                                 <div key={r._id} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
//                                     <div className="flex items-start justify-between gap-2">
//                                         {empCell(r, "w-10 h-10")}
//                                         {statusPill(r)}
//                                     </div>
//                                     <div>
//                                         <p className="text-sm font-bold text-slate-800 break-words">{r.title}</p>
//                                         <p className="text-[11px] text-slate-500">{typeLabel[r.type] || r.type} • {monthYear(r.month, r.year)}</p>
//                                         {r.remarks && <p className="text-[11px] text-slate-400 mt-1 break-words line-clamp-2">{r.remarks}</p>}
//                                     </div>
//                                     <div className="flex items-center justify-between gap-2 flex-wrap">
//                                         <span className="text-lg">{money(r)}</span>
//                                         {slipPill(r)}
//                                     </div>
//                                     {actions(r)}
//                                 </div>
//                             ))}
//                         </div>

//                         <div className="hidden lg:block overflow-x-auto">
//                             <table className="w-full text-left text-xs text-slate-600 border-collapse">
//                                 <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase">
//                                     <tr>
//                                         <th className="px-5 py-3.5">Employee</th>
//                                         <th className="px-4 py-3.5">Title</th>
//                                         <th className="px-4 py-3.5">Month</th>
//                                         <th className="px-4 py-3.5">Amount</th>
//                                         <th className="px-4 py-3.5">Status</th>
//                                         <th className="px-4 py-3.5">Payslip</th>
//                                         <th className="px-4 py-3.5 text-right">Action</th>
//                                     </tr>
//                                 </thead>
//                                 <tbody className="divide-y divide-slate-100">
//                                     {visible.map((r) => (
//                                         <tr key={r._id} className="hover:bg-indigo-50/40 transition-colors">
//                                             <td className="px-5 py-3.5">{empCell(r, "w-9 h-9")}</td>
//                                             <td className="px-4 py-3.5 max-w-[220px]">
//                                                 <p className="font-semibold text-slate-800 text-sm truncate">{r.title}</p>
//                                                 <p className="text-[11px] text-slate-400 truncate">{typeLabel[r.type] || r.type}{r.remarks ? ` • ${r.remarks}` : ""}</p>
//                                             </td>
//                                             <td className="px-4 py-3.5 whitespace-nowrap">{monthYear(r.month, r.year)}</td>
//                                             <td className="px-4 py-3.5 whitespace-nowrap text-sm">{money(r)}</td>
//                                             <td className="px-4 py-3.5">{statusPill(r)}</td>
//                                             <td className="px-4 py-3.5">{slipPill(r)}</td>
//                                             <td className="px-4 py-3.5">{actions(r)}</td>
//                                         </tr>
//                                     ))}
//                                 </tbody>
//                             </table>
//                         </div>
//                     </>
//                 )}
//             </div>

//             {modal && (
//                 <Sheet onClose={() => setModal(null)} locked={saving} size="max-w-lg">
//                     <form onSubmit={save} noValidate className="flex flex-col min-h-0 flex-1">
//                         <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/70">
//                             <div className="min-w-0">
//                                 <h3 className="text-base font-bold text-slate-900">{modal.row ? `Edit ${kind}` : cfg.add}</h3>
//                                 <p className="text-xs text-slate-400">It goes into the payslip of the month you choose.</p>
//                             </div>
//                             <button type="button" onClick={() => !saving && setModal(null)} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer" aria-label="Close"><X size={18} /></button>
//                         </div>

//                         <div className="flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6 space-y-4">
//                             <EmployeeSelect value={form.employeeId} onChange={(v) => setField("employeeId", v)} options={employees} error={errors.employeeId} disabled={Boolean(modal.row)} />

//                             <div>
//                                 <Label>Title</Label>
//                                 <input value={form.title} maxLength={100} onChange={(e) => setField("title", e.target.value)} placeholder={cfg.placeholder} className={`${inputClass} ${fieldBorder(errors.title)}`} />
//                                 <FieldError>{errors.title}</FieldError>
//                             </div>

//                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//                                 <div>
//                                     <Label>Type</Label>
//                                     <select value={form.type} onChange={(e) => setField("type", e.target.value)} className={`${inputClass} cursor-pointer border-slate-200 focus:border-indigo-500`}>
//                                         {cfg.types.map(([v, l]) => (<option key={v} value={v}>{l}</option>))}
//                                     </select>
//                                 </div>
//                                 <div>
//                                     <Label>Amount (₹)</Label>
//                                     <input type="number" inputMode="decimal" min="1" step="any" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} placeholder="e.g. 2500" className={`${inputClass} ${fieldBorder(errors.amount)}`} />
//                                     <FieldError>{errors.amount}</FieldError>
//                                 </div>
//                             </div>

//                             <PeriodFields label="For the payslip of" month={form.month} year={form.year} onMonth={(v) => setField("month", v)} onYear={(v) => setField("year", v)} />

//                             {(modal.row ? cfg.editStatuses : cfg.createStatuses) && (
//                                 <div>
//                                     <Label>Status</Label>
//                                     <select value={form.status} onChange={(e) => setField("status", e.target.value)} className={`${inputClass} cursor-pointer border-slate-200 focus:border-indigo-500`}>
//                                         {(modal.row ? cfg.editStatuses : cfg.createStatuses).map((s) => (<option key={s} value={s}>{s}</option>))}
//                                     </select>
//                                 </div>
//                             )}

//                             <div>
//                                 <Label>Remarks (optional)</Label>
//                                 <textarea rows={2} value={form.remarks} maxLength={300} onChange={(e) => setField("remarks", e.target.value)} className={`${inputClass} resize-none border-slate-200 focus:border-indigo-500`} />
//                             </div>
//                         </div>

//                         <div className="shrink-0 border-t border-slate-100 bg-white px-5 sm:px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
//                             <button type="button" onClick={() => setModal(null)} disabled={saving} className="px-5 py-3 sm:py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50">Cancel</button>
//                             <button type="submit" disabled={saving} className={primaryBtn}>
//                                 {saving && <Loader2 size={14} className="animate-spin" />}
//                                 {saving ? "Saving..." : modal.row ? "Save Changes" : "Save"}
//                             </button>
//                         </div>
//                     </form>
//                 </Sheet>
//             )}

//             {ask && <ConfirmDialog title={ask.title} text={ask.text} label="Delete" danger onConfirm={ask.run} onClose={() => setAsk(null)} />}
//         </div>
//     );
// }

