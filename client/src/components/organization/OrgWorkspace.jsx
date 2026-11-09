"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, Eye, Pencil, Plus, Power, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { ConfirmDialog, ErrorBanner, FieldError, Label, StatCard, dateText, fieldBorder, inputClass } from "@/components/payroll/ui";
import { EmptyBox, FilterTabs, ListSkeleton, PageHeader, SearchBox, primaryBtn } from "@/components/payroll/common";
import { Box, Chip, FooterBar, FormFooter, Info, RowMenu, errMsg, ghostBtn, idOf } from "@/components/recruitment/rui";
import { ORG, findState, namesOf } from "./orgConfig";
import { BulkAdd, Combo, ReporteePicker } from "./OrgExtras";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^[+\d][\d\s-]{6,18}$/;
const initials = (s) => {
    const p = String(s || "").trim().split(/\s+/).filter(Boolean);
    return (p.length > 1 ? p[0][0] + p[1][0] : String(s || "?").slice(0, 2)).toUpperCase();
};
const rowsOf = (res) => (Array.isArray(res?.data?.data) ? res.data.data : Array.isArray(res?.data) ? res.data : []);

export default function OrgWorkspace({ kind }) {
    const cfg = ORG[kind];
    const Icon = cfg.icon;
    const { user } = useAuth();
    const role = String(user?.role || "").toLowerCase();
    const canManage = ["admin", "hr"].includes(role);
    const canDelete = role === "admin";
    const base = `/organization/${cfg.path}`;

    const [rows, setRows] = useState([]);
    const [lookups, setLookups] = useState({});
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [tab, setTab] = useState("all");
    const [filter, setFilter] = useState("ALL");

    const [modal, setModal] = useState(null);
    const [form, setForm] = useState({});
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [viewing, setViewing] = useState(null);
    const [ask, setAsk] = useState(null);
    const [bulk, setBulk] = useState(false);

    const currentId = modal?.row?._id;

    /* ---------- lists ---------- */

    const load = useCallback(async ({ silent = false } = {}) => {
        if (silent) setRefreshing(true);
        else setLoading(true);
        setError("");
        try {
            const res = await api.get(base);
            setRows(rowsOf(res));
        } catch (err) {
            setError(await errMsg(err, `Unable to load ${cfg.title.toLowerCase()}.`));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [base, cfg.title]);

    useEffect(() => { if (user) load(); }, [user, load]);

    useEffect(() => {
        if (!canManage || !cfg.lookups.length) return;
        cfg.lookups.forEach((name) => {
            const url = name === "employees" ? "/payroll/employee-options" : `/organization/${name}`;
            api.get(url).then((res) => setLookups((p) => ({ ...p, [name]: rowsOf(res) }))).catch(() => { });
        });
    }, [canManage, cfg]);

    const counts = useMemo(() => ({ all: rows.length, active: rows.filter((r) => r.status !== "inactive").length, inactive: rows.filter((r) => r.status === "inactive").length }), [rows]);
    const filterValues = useMemo(() => (cfg.filter ? [...new Set(rows.map((r) => r[cfg.filter.key]).filter(Boolean))].sort() : []), [rows, cfg]);

    /* search also looks inside reportees: typing an employee name finds their manager */
    const visible = useMemo(() => {
        const q = search.trim().toLowerCase();
        return rows.filter((r) => {
            if (tab === "active" && r.status === "inactive") return false;
            if (tab === "inactive" && r.status !== "inactive") return false;
            if (filter !== "ALL" && r[cfg.filter.key] !== filter) return false;
            return !q || [cfg.name(r), cfg.sub(r), ...cfg.cols.map((c) => c.get?.(r)), namesOf(r.reportees)].join(" ").toLowerCase().includes(q);
        });
    }, [rows, tab, filter, search, cfg]);

    /* ---------- "already used" rules ---------- */

    /* value of a unique field (e.g. linked employee) -> the row that already uses it, excluding the row being edited */
    const usedBy = (key) => {
        const map = new Map();
        rows.forEach((r) => {
            if (r._id === currentId) return;
            const id = idOf(r[key]);
            if (id) map.set(id, cfg.name(r));
        });
        return map;
    };

    /* employee id -> manager name, for employees already under another manager */
    const reporteeElsewhere = () => {
        const map = new Map();
        rows.forEach((r) => {
            if (r._id === currentId) return;
            (r.reportees || []).forEach((p) => map.set(idOf(p), cfg.name(r)));
        });
        return map;
    };

    /* lowercase names already added, so presets that exist are disabled */
    const presetNamesTaken = (fd) => new Set(rows.filter((r) => r._id !== currentId).map((r) => String(r[fd.key] || "").trim().toLowerCase()));

    /* ---------- dropdown options ---------- */

    const optionsOf = (f, current) => {
        let list = [];
        if (Array.isArray(f.options)) list = f.options.map((o) => ({ value: o, label: o }));
        else if (f.from === "employees") list = (lookups.employees || []).map((e) => ({ value: f.by === "id" ? e._id : e.name, label: `${e.name}${e.employeeId ? ` (${e.employeeId})` : ""}` }));
        else list = (lookups[f.from] || []).filter((x) => x.status !== "inactive").map((x) => { const v = x.title || x.name; return { value: v, label: v }; });
        if (current && !list.some((o) => o.value === current)) list = [{ value: current, label: current }, ...list];
        return list;
    };

    /* ---------- form ---------- */

    const openModal = (row = null) => {
        const f = {};
        cfg.fields.forEach((fd) => {
            if (fd.type === "multi") {
                f[fd.key] = row ? (row[fd.key] || []).map(idOf) : [];
                return;
            }
            const v = row ? (fd.type === "select" && fd.by === "id" ? idOf(row[fd.key]) : row[fd.key]) : fd.default;
            f[fd.key] = v === undefined || v === null ? (fd.type === "number" ? 0 : "") : v;
        });
        f.status = row?.status === "inactive" ? "inactive" : "active";
        setForm(f);
        setErrors({});
        setModal({ row });
    };

    const set = (k, v) => {
        setForm((p) => ({ ...p, [k]: v }));
        setErrors((p) => (p[k] ? { ...p, [k]: undefined } : p));
    };

    /* fills only the EMPTY fields of this form, never overwrites what the user typed */
    const fillEmpty = (patch) =>
        setForm((prev) => {
            const next = { ...prev };
            Object.entries(patch).forEach(([k, v]) => {
                if (k in prev && !prev[k] && v) next[k] = v;
            });
            return next;
        });

    /* pincode -> city, state, country (through our backend) */
    const lookupPin = async (pin) => {
        try {
            const { data } = await api.get(`/organization/pincode/${pin}`);
            if (data?.data) fillEmpty({ city: data.data.city, state: data.data.state, country: data.data.country });
        } catch {
            /* the user can type it manually */
        }
    };

    /* every textarea and text input goes through here, so address and pincode can auto-fill */
    const fieldChange = (fd, value) => {
        set(fd.key, fd.upper ? value.toUpperCase() : value);

        if (fd.key === "pincode") {
            const pin = value.replace(/\D/g, "");
            if (/^[1-9]\d{5}$/.test(pin)) lookupPin(pin);
        }

        if (fd.key === "address" && value.trim()) {
            fillEmpty({ country: "India" });
            const state = findState(value);
            if (state) fillEmpty({ state });
            const pin = value.match(/(?<!\d)[1-9]\d{5}(?!\d)/)?.[0];
            if (pin) lookupPin(pin);
        }
    };

    /* Fill the preset's other values (code, city, state...) where the field is still empty */
    const applyPreset = (fd, p) =>
        setForm((prev) => {
            const next = { ...prev, [fd.key]: p[fd.key] };
            Object.entries(p).forEach(([k, v]) => {
                if (k !== fd.key && k in prev && !prev[k]) next[k] = v;
            });
            return next;
        });

    /* Typing the exact name of a preset fills the rest automatically */
    const setText = (fd, value) => {
        set(fd.key, value);
        const typed = value.trim().toLowerCase();
        if (!typed || !cfg.presets) return;
        const hit = cfg.presets.find((p) => String(p[fd.key] || "").toLowerCase() === typed);
        if (hit && !presetNamesTaken(fd).has(typed)) applyPreset(fd, hit);
    };

    const pick = (fd, value) => {
        set(fd.key, value);
        if (fd.fillName && value) {
            const e = (lookups.employees || []).find((x) => x._id === value);
            if (e && !String(form.name || "").trim()) set("name", e.name);
        }
    };

    const save = async (e) => {
        e.preventDefault();
        if (saving) return;
        const next = {};
        const body = { status: form.status };
        const elsewhere = reporteeElsewhere();

        cfg.fields.forEach((fd) => {
            let v = form[fd.key];

            if (fd.type === "multi") {
                const ids = Array.isArray(v) ? v : [];
                if (ids.some((id) => elsewhere.has(id))) next[fd.key] = "Some employees are already under another manager. Remove them there first.";
                body[fd.key] = ids;
                return;
            }

            if (fd.type === "number") {
                const n = Number(v === "" ? 0 : v);
                if (!Number.isFinite(n) || n < 0) next[fd.key] = "Enter a valid number.";
                body[fd.key] = n;
                return;
            }

            /* id-based dropdown: empty means "not set", send null not "" */
            if (fd.type === "select" && fd.by === "id") {
                if (v && fd.unique && usedBy(fd.key).has(v)) next[fd.key] = `This ${fd.label.toLowerCase()} is already linked to ${usedBy(fd.key).get(v)}.`;
                body[fd.key] = v ? v : null;
                return;
            }

            v = String(v ?? "").trim();
            if (fd.upper) v = v.toUpperCase();
            if (fd.required && v.length < 2) next[fd.key] = `${fd.label} is required (at least 2 characters).`;
            else if (v && fd.type === "email" && !EMAIL.test(v)) next[fd.key] = "Enter a valid email address.";
            else if (v && fd.type === "tel" && !PHONE.test(v)) next[fd.key] = "Enter a valid phone number.";
            else if (v && fd.key === "pincode" && !/^\d{4,10}$/.test(v)) next[fd.key] = "Enter a valid pincode.";
            body[fd.key] = v;
        });

        setErrors(next);
        if (Object.keys(next).length) return;

        setSaving(true);
        try {
            if (modal.row) await api.put(`${base}/${modal.row._id}`, body);
            else await api.post(base, body);
            toast.success(`${cfg.singular} ${modal.row ? "updated" : "created"}.`);
            setModal(null);
            load({ silent: true });
        } catch (err) {
            toast.error(await errMsg(err, `Unable to save the ${cfg.singular.toLowerCase()}.`));
        } finally {
            setSaving(false);
        }
    };

    const toggle = async (r) => {
        const status = r.status === "inactive" ? "active" : "inactive";
        try {
            await api.put(`${base}/${r._id}`, { status });
            toast.success(`Marked as ${status}.`);
            setViewing(null);
            load({ silent: true });
        } catch (err) {
            toast.error(await errMsg(err, "Unable to change the status."));
        }
    };

    const remove = (r) =>
        setAsk({
            title: `Delete this ${cfg.singular.toLowerCase()}?`,
            text: `${cfg.name(r)}. This cannot be undone. If employees use it, make it inactive instead.`,
            run: async () => {
                try {
                    await api.delete(`${base}/${r._id}`);
                    toast.success(`${cfg.singular} deleted.`);
                    await load({ silent: true });
                } catch (err) {
                    toast.error(await errMsg(err, `Unable to delete the ${cfg.singular.toLowerCase()}.`));
                }
            },
        });

    const menuFor = (r) => [
        { label: "View details", icon: Eye, run: () => setViewing(r) },
        { label: "Edit", icon: Pencil, run: () => openModal(r), hidden: !canManage },
        { label: r.status === "inactive" ? "Make active" : "Make inactive", icon: Power, run: () => toggle(r), hidden: !canManage },
        { label: "Delete", icon: Trash2, run: () => remove(r), hidden: !canDelete, danger: true },
    ];

    const status = (r) => <Chip tone={r.status === "inactive" ? "rose" : "emerald"} dot>{r.status === "inactive" ? "Inactive" : "Active"}</Chip>;
    const mark = (r) => <div className="w-10 h-10 shrink-0 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center font-extrabold text-xs">{initials(cfg.name(r))}</div>;
    const cell = (c, r) => {
        if (c.main) return <div className="flex items-center gap-3 min-w-0">{mark(r)}<div className="min-w-0"><p className="font-semibold text-slate-900 text-sm truncate max-w-[220px]">{cfg.name(r)}</p><p className="text-[11px] text-slate-400 truncate max-w-[220px]">{cfg.sub(r) || "—"}</p></div></div>;
        if (c.status) return status(r);
        if (c.count) return <Chip tone="violet">{c.count(r) || 0}</Chip>;
        const v = c.get?.(r);
        if (!v) return <span className="text-slate-300">—</span>;
        return c.chip ? <Chip tone={c.chip}>{v}</Chip> : <span className="font-medium text-slate-700 truncate block max-w-[180px]">{v}</span>;
    };

    const selectCls = "px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:border-indigo-500 cursor-pointer max-w-full";

    /* select: an option already used by another row is shown disabled */
    const renderSelect = (fd) => {
        const opts = optionsOf(fd, form[fd.key]);
        const taken = fd.unique ? usedBy(fd.key) : null;
        const noData = Boolean(fd.from) && fd.from !== "employees" ? Array.isArray(lookups[fd.from]) && opts.length === 0 : false;
        return (
            <>
                <div className="relative">
                    <select
                        value={form[fd.key] ?? ""}
                        onChange={(e) => pick(fd, e.target.value)}
                        className={`${inputClass} ${fieldBorder(errors[fd.key])} w-full min-w-0 appearance-none pr-9 truncate cursor-pointer`}
                    >
                        <option value="">{fd.empty || fd.placeholder || `Select ${fd.label.toLowerCase()}`}</option>
                        {opts.map((o) => {
                            const owner = taken?.get(o.value);
                            return (
                                <option key={o.value} value={o.value} disabled={Boolean(owner) && o.value !== form[fd.key]}>
                                    {owner ? `${o.label} (linked to ${owner})` : o.label}
                                </option>
                            );
                        })}
                    </select>
                    <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
                {noData && <p className="mt-1 text-[11px] text-amber-600">No {fd.from} added yet. Add one first.</p>}
            </>
        );
    };

    return (
        <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 py-4 space-y-4 antialiased pb-16">
            <PageHeader icon={Icon} title={cfg.title} subtitle={cfg.subtitle} onRefresh={() => load({ silent: true })} busy={loading || refreshing}>
                {/* {canManage && cfg.presets && (
                    <button type="button" onClick={() => setBulk(true)} className="inline-flex items-center justify-center gap-2 px-4 py-3 sm:py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs sm:text-sm font-bold transition cursor-pointer" />
                )} */}
                {canManage && <button type="button" onClick={() => openModal()} className={primaryBtn}><Plus size={16} /> {cfg.add}</button>}
            </PageHeader>

            {!loading && !error && (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {cfg.stats(rows).map(([label, value, I, tone], i) => (
                        <div key={label} className={i === 2 ? "col-span-2 lg:col-span-1" : ""}><StatCard icon={I} tone={tone} label={label} value={value} /></div>
                    ))}
                </div>
            )}

            <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/70 shadow-sm space-y-3">
                <div className="flex flex-wrap items-center gap-2.5">
                    <SearchBox value={search} onChange={setSearch} placeholder={kind === "reporting-managers" ? "Search manager or employee name" : `Search ${cfg.title.toLowerCase()}`} />
                    {filterValues.length > 1 && (
                        <select value={filter} onChange={(e) => setFilter(e.target.value)} className={selectCls}>
                            <option value="ALL">{cfg.filter.label}</option>
                            {filterValues.map((v) => <option key={v} value={v}>{v}</option>)}
                        </select>
                    )}
                </div>
                <FilterTabs tabs={[["all", "All", counts.all], ["active", "Active", counts.active], ["inactive", "Inactive", counts.inactive]]} value={tab} onChange={setTab} />
            </div>

            <ErrorBanner message={error} onRetry={() => load()} />

            <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
                {loading ? <ListSkeleton /> : visible.length === 0 ? (
                    <EmptyBox icon={Icon} title={rows.length ? "Nothing matches your search" : `No ${cfg.title.toLowerCase()} yet`} text={rows.length ? "Try another keyword or filter." : canManage ? `Click "${cfg.add}" to add the first one.` : "Nothing has been added yet."} />
                ) : (
                    <>
                        {/* mobile and tablet: cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 sm:p-4 lg:hidden">
                            {visible.map((r) => (
                                <div key={r._id} onClick={() => setViewing(r)} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 space-y-3 hover:border-indigo-200 hover:shadow-sm transition cursor-pointer">
                                    <div className="flex items-start gap-3">
                                        {mark(r)}
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-bold text-slate-900 break-words">{cfg.name(r)}</p>
                                            <p className="text-[11px] text-slate-400 break-words">{cfg.sub(r) || "—"}</p>
                                        </div>
                                        <div onClick={(e) => e.stopPropagation()}><RowMenu items={menuFor(r)} /></div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        {status(r)}
                                        {cfg.cols.filter((c) => c.count).map((c) => <Chip key={c.h} tone="violet">{c.count(r) || 0} {c.h.toLowerCase()}</Chip>)}
                                        <span className="text-[11px] text-slate-400 font-medium">{dateText(r.createdAt)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* desktop: table */}
                        <div className="hidden lg:block overflow-x-auto">
                            <table className="w-full text-left text-xs text-slate-600 border-collapse">
                                <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                                    <tr>
                                        {cfg.cols.map((c, i) => <th key={c.h} className={i === 0 ? "px-5 py-3.5" : "px-4 py-3.5"}>{c.h}</th>)}
                                        <th className="px-4 py-3.5 text-center w-20">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {visible.map((r) => (
                                        <tr key={r._id} onClick={() => setViewing(r)} className="hover:bg-indigo-50/40 transition-colors cursor-pointer">
                                            {cfg.cols.map((c, i) => <td key={c.h} className={`${i === 0 ? "px-5" : "px-4"} py-3 align-middle whitespace-nowrap`}>{cell(c, r)}</td>)}
                                            <td className="px-4 py-3 align-middle text-center" onClick={(e) => e.stopPropagation()}><RowMenu items={menuFor(r)} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>

            {/* add / edit */}
            {modal && (
                <Box title={modal.row ? `Edit ${cfg.singular.toLowerCase()}` : cfg.add} subtitle="Fill the details below" onClose={() => setModal(null)} onSubmit={save} locked={saving} size="max-w-xl" footer={<FormFooter onCancel={() => setModal(null)} busy={saving} label={modal.row ? "Save changes" : `Create ${cfg.singular.toLowerCase()}`} />}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {cfg.fields.map((fd) => (
                            <div key={fd.key} className={`min-w-0 ${fd.col === 2 ? "sm:col-span-2" : ""}`}>
                                <Label>{fd.label}{fd.required ? " *" : ""}</Label>

                                {fd.type === "multi" ? (
                                    <ReporteePicker
                                        people={lookups[fd.from] || []}
                                        value={Array.isArray(form[fd.key]) ? form[fd.key] : []}
                                        onChange={(ids) => set(fd.key, ids)}
                                        elsewhere={reporteeElsewhere()}
                                    />
                                ) : fd.suggest && cfg.presets ? (
                                    <Combo
                                        value={form[fd.key]}
                                        maxLength={fd.max || 120}
                                        placeholder={fd.placeholder}
                                        className={`${inputClass} ${fieldBorder(errors[fd.key])}`}
                                        onChange={(v) => setText(fd, v)}
                                        onPick={(p) => applyPreset(fd, p)}
                                        taken={presetNamesTaken(fd)}
                                        items={cfg.presets.map((p) => ({ key: p[fd.key].toLowerCase(), label: p[fd.key], hint: [p.code, p.level, p.department, p.city].filter(Boolean).join(" • "), preset: p }))}
                                    />
                                ) : fd.type === "select" ? (
                                    renderSelect(fd)
                                ) : fd.type === "textarea" ? (
                                    <textarea rows={3} value={form[fd.key] ?? ""} maxLength={fd.max || 500} onChange={(e) => fieldChange(fd, e.target.value)} placeholder={fd.placeholder} className={`${inputClass} ${fieldBorder(errors[fd.key])} w-full resize-none`} />
                                ) : (
                                    <input type={fd.type || "text"} min={fd.type === "number" ? 0 : undefined} value={form[fd.key] ?? ""} maxLength={fd.max || 120} onChange={(e) => fieldChange(fd, e.target.value)} placeholder={fd.placeholder} className={`${inputClass} ${fieldBorder(errors[fd.key])} w-full`} />
                                )}
                                <FieldError>{errors[fd.key]}</FieldError>
                            </div>
                        ))}
                        <div className="sm:col-span-2">
                            <Label>Status</Label>
                            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl">
                                {[["active", "Active"], ["inactive", "Inactive"]].map(([k, l]) => (
                                    <button key={k} type="button" onClick={() => set("status", k)} className={`py-2.5 sm:py-2 text-xs font-bold rounded-lg transition cursor-pointer ${form.status === k ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>{l}</button>
                                ))}
                            </div>
                        </div>
                    </div>
                </Box>
            )}

            {/* details */}
            {viewing && (
                <Box title={cfg.name(viewing)} subtitle={cfg.sub(viewing) || cfg.singular} onClose={() => setViewing(null)} footer={
                    <FooterBar>
                        {canManage && <button type="button" onClick={() => { const r = viewing; setViewing(null); openModal(r); }} className={primaryBtn}><Pencil size={14} /> Edit</button>}
                        <button type="button" onClick={() => setViewing(null)} className={ghostBtn}>Close</button>
                    </FooterBar>
                }>
                    <div className="flex flex-wrap items-center gap-2">{status(viewing)}<span className="text-[11px] text-slate-400 font-medium">Added {dateText(viewing.createdAt)}</span></div>
                    <Info rows={cfg.details(viewing)} />
                </Box>
            )}
            {bulk && cfg.presets && <BulkAdd cfg={cfg} rows={rows} onClose={() => setBulk(false)} onDone={() => load({ silent: true })} />}

            {ask && <ConfirmDialog title={ask.title} text={ask.text} label="Delete" danger onConfirm={ask.run} onClose={() => setAsk(null)} />}
        </div>
    );
}


