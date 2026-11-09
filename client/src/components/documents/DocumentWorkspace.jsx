"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Eye, ExternalLink, FileText, Image as ImageIcon, Loader2, MoreVertical, Pencil, Plus, Sparkles, Trash2, UploadCloud, Users, Files, CalendarDays, Info, X } from "lucide-react";
import { toast } from "react-toastify";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Avatar, ConfirmDialog, ErrorBanner, FieldError, Label, Sheet, StatCard, dateText, fieldBorder, inputClass } from "@/components/payroll/ui";
import { EmptyBox, FilterTabs, ListSkeleton, PageHeader, Pill, SearchBox, primaryBtn } from "@/components/payroll/common";
import { ALLOWED, AUDIENCE, MAX_MB, MINE, PAGES, downloadDoc, errText, fetchBlob, idOf, isUrl, kindOf, sizeText } from "./docUtils";
import LetterGenerator from "./LetterGenerator";

const KIND = {
    pdf: ["bg-rose-50 text-rose-600 border-rose-100", FileText],
    image: ["bg-emerald-50 text-emerald-600 border-emerald-100", ImageIcon],
    other: ["bg-indigo-50 text-indigo-600 border-indigo-100", FileText],
};

const blank = (types) => ({ title: "", employee: "", docType: types?.[0] || "", description: "", audience: "employee", file: null });

/* ------------------------------ three-dot menu ------------------------------ */

function RowMenu({ items }) {
    const [pos, setPos] = useState(null);
    const btn = useRef(null);
    const list = items.filter((i) => !i.hidden);
    const W = 200;

    const close = useCallback(() => setPos(null), []);

    useEffect(() => {
        if (!pos) return undefined;
        const down = (e) => { if (!e.target.closest("[data-doc-menu]") && !btn.current?.contains(e.target)) close(); };
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
        const h = list.length * 42 + 14;
        setPos({ top: r.bottom + h > window.innerHeight ? Math.max(8, r.top - h - 4) : r.bottom + 4, left: Math.max(8, Math.min(r.right - W, window.innerWidth - W - 8)) });
    };

    return (
        <>
            <button ref={btn} type="button" onClick={toggle} aria-haspopup="menu" aria-label="More options" className={`w-9 h-9 inline-flex items-center justify-center rounded-lg transition cursor-pointer ${pos ? "bg-indigo-100 text-indigo-700" : "text-slate-500 hover:bg-slate-100 hover:text-indigo-600"}`}>
                <MoreVertical size={17} />
            </button>
            {pos && (
                <div data-doc-menu role="menu" style={{ top: pos.top, left: pos.left, width: W }} onClick={(e) => e.stopPropagation()} className="fixed z-[70] bg-white border border-slate-200 rounded-xl shadow-xl py-1.5">
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

/* ------------------------------ preview ------------------------------ */

function Viewer({ doc, onClose }) {
    const [src, setSrc] = useState("");
    const [type, setType] = useState("");
    const [state, setState] = useState("loading");

    useEffect(() => {
        let alive = true;
        let url = "";
        (async () => {
            try {
                const blob = await fetchBlob(doc);
                url = URL.createObjectURL(blob);
                if (!alive) return URL.revokeObjectURL(url);
                setSrc(url);
                setType(blob.type || "");
                setState("ready");
            } catch {
                if (alive) setState("error");
            }
        })();
        return () => {
            alive = false;
            if (url) URL.revokeObjectURL(url);
        };
    }, [doc]);

    return (
        <Sheet onClose={onClose} size="max-w-4xl">
            <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-b border-slate-100 bg-slate-50/70">
                <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">{doc.title}</h3>
                    <p className="text-[11px] text-slate-400 truncate">{[doc.docType, doc.employee?.name, doc.fileName, sizeText(doc.fileSize)].filter(Boolean).join(" • ")}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button type="button" onClick={() => downloadDoc(doc)} className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition cursor-pointer"><Download size={14} /> <span className="hidden sm:inline">Download</span></button>
                    <button type="button" onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer" aria-label="Close"><X size={18} /></button>
                </div>
            </div>
            <div className="flex-1 min-h-[60dvh] sm:min-h-[70dvh] bg-slate-100 flex items-center justify-center overflow-auto">
                {state === "loading" ? (
                    <Loader2 className="animate-spin text-indigo-600" size={30} />
                ) : state === "error" ? (
                    <p className="text-sm font-semibold text-slate-500 px-6 text-center">Unable to open this file. Please try again.</p>
                ) : type === "application/pdf" ? (
                    <iframe src={src} title={doc.title} className="w-full h-[70dvh] bg-white" />
                ) : type.startsWith("image/") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={src} alt={doc.title} className="max-w-full max-h-[70dvh] object-contain bg-white shadow rounded-lg m-3" />
                ) : (
                    <div className="text-center px-6">
                        <FileText size={40} className="mx-auto text-slate-300" />
                        <p className="text-sm font-bold text-slate-700 mt-3">This file type cannot be previewed.</p>
                        <p className="text-xs text-slate-400 mt-1">Use Download to open it on your device.</p>
                    </div>
                )}
            </div>
        </Sheet>
    );
}

/* ------------------------------ workspace ------------------------------ */

export default function DocumentWorkspace({ page, mine = false }) {
    const cfg = mine ? MINE : PAGES[page];
    const Icon = cfg.icon;
    const types = cfg.types || [];
    const { user } = useAuth();
    const role = String(user?.role || "").toLowerCase();
    const canManage = ["admin", "hr"].includes(role) && !mine;
    const canDelete = role === "admin" && !mine;

    const [docs, setDocs] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [empFilter, setEmpFilter] = useState("ALL");
    const [typeFilter, setTypeFilter] = useState("ALL");
    const [tab, setTab] = useState("all");

    const [modal, setModal] = useState(null);
    const [form, setForm] = useState(blank(types));
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [drag, setDrag] = useState(false);
    const [viewing, setViewing] = useState(null);
    const [ask, setAsk] = useState(null);
    const [generator, setGenerator] = useState(false);
    const fileRef = useRef(null);

    const load = useCallback(async ({ silent = false } = {}) => {
        if (silent) setRefreshing(true);
        else setLoading(true);
        setError("");
        try {
            const { data } = mine ? await api.get("/documents/mine") : await api.get("/documents", { params: { category: cfg.category } });
            setDocs(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err?.response?.data?.message || "Unable to load the documents. Please try again.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [mine, cfg.category]);

    useEffect(() => {
        if (user) load();
    }, [user, load]);

    useEffect(() => {
        if (!canManage) return;
        api.get("/payroll/employee-options").then(({ data }) => setEmployees(Array.isArray(data) ? data : [])).catch(() => { });
    }, [canManage]);

    const tabs = useMemo(() => {
        if (!mine) return [];
        const counts = {};
        docs.forEach((d) => (counts[d.categoryLabel] = (counts[d.categoryLabel] || 0) + 1));
        return [["all", "All", docs.length], ...Object.entries(counts).map(([k, n]) => [k, k, n])];
    }, [mine, docs]);

    const usedTypes = useMemo(() => [...new Set(docs.map((d) => d.docType).filter(Boolean))], [docs]);

    const visible = useMemo(() => {
        const q = search.trim().toLowerCase();
        return docs.filter((d) => {
            if (mine && tab !== "all" && d.categoryLabel !== tab) return false;
            if (empFilter !== "ALL" && idOf(d.employee) !== empFilter) return false;
            if (typeFilter !== "ALL" && d.docType !== typeFilter) return false;
            return !q || `${d.title} ${d.docType || ""} ${d.description || ""} ${d.employee?.name || ""} ${d.employee?.employeeId || ""}`.toLowerCase().includes(q);
        });
    }, [docs, search, empFilter, typeFilter, tab, mine]);

    const stats = useMemo(() => {
        const now = new Date();
        const month = docs.filter((d) => { const c = new Date(d.createdAt); return c.getMonth() === now.getMonth() && c.getFullYear() === now.getFullYear(); }).length;
        return { total: docs.length, month, people: new Set(docs.map((d) => idOf(d.employee)).filter(Boolean)).size };
    }, [docs]);

    /* ---- form ---- */
    const openModal = (row = null) => {
        setForm(row ? { title: row.title || "", employee: idOf(row.employee), docType: row.docType || types[0] || "", description: row.description || "", audience: row.audience || "employee", file: null } : blank(types));
        setErrors({});
        setModal({ row });
    };

    const set = (k, v) => {
        setForm((p) => ({ ...p, [k]: v }));
        setErrors((p) => (p[k] ? { ...p, [k]: undefined } : p));
    };

    const pickType = (t) => setForm((p) => ({ ...p, docType: t, title: !p.title || p.title === p.docType ? t : p.title }));

    const pickFile = (file) => {
        if (!file) return;
        const ext = file.name.split(".").pop().toLowerCase();
        if (!ALLOWED.includes(ext)) return setErrors((p) => ({ ...p, file: "Allowed: PDF, JPG, PNG, DOC, DOCX, XLS or XLSX." }));
        if (file.size > MAX_MB * 1048576) return setErrors((p) => ({ ...p, file: `The file must be under ${MAX_MB} MB.` }));
        setForm((p) => ({ ...p, file, title: p.title || file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ") }));
        setErrors((p) => ({ ...p, file: undefined }));
    };

    const save = async (e) => {
        e.preventDefault();
        if (saving) return;
        const row = modal.row;
        const next = {};
        if (form.title.trim().length < 2) next.title = "Please enter a title (at least 2 characters).";
        if (cfg.personal && !form.employee) next.employee = "Please select the employee this document is for.";
        if (!row && !form.file) next.file = "Please choose a file.";
        setErrors(next);
        if (Object.keys(next).length) return;

        const body = new FormData();
        body.append("title", form.title.trim());
        body.append("category", cfg.category);
        body.append("employee", form.employee || "");
        body.append("docType", form.docType || "");
        body.append("description", form.description.trim());
        body.append("audience", form.audience || "employee");
        if (form.file) body.append("file", form.file);

        setSaving(true);
        try {
            const opts = { headers: { "Content-Type": "multipart/form-data" } };
            if (row) await api.put(`/documents/${row._id}`, body, opts);
            else await api.post("/documents", body, opts);
            toast.success(row ? "Document updated." : "Document uploaded.");
            setModal(null);
            load({ silent: true });
        } catch (err) {
            toast.error(err?.response?.data?.message || "Unable to save the document.");
        } finally {
            setSaving(false);
        }
    };

    const remove = (d) =>
        setAsk({
            title: "Delete this document?",
            text: `${d.title}${d.employee?.name ? ` (${d.employee.name})` : ""}. The file is deleted too. This cannot be undone.`,
            run: async () => {
                try {
                    await api.delete(`/documents/${d._id}`);
                    toast.success("Document deleted.");
                    await load({ silent: true });
                } catch (err) {
                    toast.error(await errText(err, "Unable to delete the document."));
                }
            },
        });

    const view = (d) => (d.hasFile ? setViewing(d) : isUrl(d.fileUrl) && window.open(d.fileUrl, "_blank", "noopener,noreferrer"));

    const menuFor = (d) => [
        { label: d.hasFile ? "View" : "Open link", icon: d.hasFile ? Eye : ExternalLink, run: () => view(d) },
        { label: "Download", icon: Download, run: () => downloadDoc(d), hidden: !d.hasFile },
        { label: "Edit", icon: Pencil, run: () => openModal(d), hidden: !canManage },
        { label: "Delete", icon: Trash2, run: () => remove(d), hidden: !canDelete, danger: true },
    ];

    const fileIcon = (d) => {
        const [tone, KindIcon] = KIND[kindOf(d)];
        return <div className={`w-10 h-10 shrink-0 rounded-xl border flex items-center justify-center ${tone}`}><KindIcon size={17} /></div>;
    };

    const aud = (d) => AUDIENCE[d.audience || "employee"] || AUDIENCE.employee;
    const selectCls = "px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:border-indigo-500 cursor-pointer max-w-full";

    return (
        <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 py-4 space-y-4 antialiased pb-16">
            <PageHeader icon={Icon} title={cfg.title} subtitle={cfg.subtitle} onRefresh={() => load({ silent: true })} busy={loading || refreshing}>
                {canManage && cfg.generator && (
                    <button type="button" onClick={() => setGenerator(true)} className="inline-flex items-center justify-center gap-2 px-4 py-3 sm:py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs sm:text-sm font-bold transition cursor-pointer"><Sparkles size={15} /> Generate Letter</button>
                )}
                {canManage && <button type="button" onClick={() => openModal()} className={primaryBtn}><Plus size={16} /> {cfg.add}</button>}
            </PageHeader>

            {cfg.note && (
                <div className="flex items-start gap-2.5 px-4 py-3 rounded-2xl bg-indigo-50/60 border border-indigo-100 text-indigo-900 text-xs"><Info size={15} className="shrink-0 mt-0.5 text-indigo-500" /><p className="font-medium">{cfg.note}</p></div>
            )}

            {canManage && !loading && !error && (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    <StatCard icon={Files} tone="indigo" label="Documents" value={stats.total} />
                    <StatCard icon={CalendarDays} tone="emerald" label="Added this month" value={stats.month} />
                    <div className="col-span-2 lg:col-span-1"><StatCard icon={Users} tone="violet" label={cfg.personal ? "Employees covered" : "For one employee"} value={stats.people} /></div>
                </div>
            )}

            <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/70 shadow-sm space-y-3">
                <div className="flex flex-wrap items-center gap-2.5">
                    <SearchBox value={search} onChange={setSearch} placeholder={mine ? "Search title, type or note" : "Search title, type or employee"} />
                    {usedTypes.length > 1 && (
                        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={selectCls}>
                            <option value="ALL">All types</option>
                            {usedTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                    )}
                    {canManage && employees.length > 0 && (
                        <select value={empFilter} onChange={(e) => setEmpFilter(e.target.value)} className={selectCls}>
                            <option value="ALL">All employees</option>
                            {employees.map((e) => <option key={e._id} value={e._id}>{e.name} ({e.employeeId || "—"})</option>)}
                        </select>
                    )}
                </div>
                {mine && tabs.length > 2 && <FilterTabs tabs={tabs} value={tab} onChange={setTab} />}
            </div>

            <ErrorBanner message={error} onRetry={() => load()} />

            <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
                {loading ? (
                    <ListSkeleton />
                ) : visible.length === 0 ? (
                    <EmptyBox icon={Icon} title={docs.length === 0 ? "No documents yet" : "Nothing matches your search"} text={docs.length === 0 ? (canManage ? `Click "${cfg.add}" to add the first one.` : mine ? "When HR adds a document for you, it appears here." : "Nothing has been published here yet.") : "Try another keyword or filter."} />
                ) : (
                    <>
                        {/* mobile and tablet: cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 sm:p-4 lg:hidden">
                            {visible.map((d) => (
                                <div key={d._id} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 space-y-3 hover:border-indigo-200 hover:shadow-sm transition">
                                    <div className="flex items-start gap-3">
                                        <button type="button" onClick={() => view(d)} className="flex items-start gap-3 min-w-0 flex-1 text-left cursor-pointer">
                                            {fileIcon(d)}
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-slate-900 break-words">{d.title}</p>
                                                {d.description && <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 break-words">{d.description}</p>}
                                            </div>
                                        </button>
                                        <RowMenu items={menuFor(d)} />
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        {d.docType && <Pill tone="indigo">{d.docType}</Pill>}
                                        {mine ? <Pill tone="slate">{d.categoryLabel}</Pill> : d.employee?.name ? <Pill tone="violet">{d.employee.name}</Pill> : <Pill tone="emerald">Everyone</Pill>}
                                        {canManage && <Pill tone={aud(d).tone}>{aud(d).label}</Pill>}
                                    </div>
                                    <p className="text-[11px] text-slate-400 font-medium">{dateText(d.createdAt)}{d.fileSize ? ` • ${sizeText(d.fileSize)}` : ""}{d.uploadedBy?.name && !mine ? ` • by ${d.uploadedBy.name}` : ""}</p>
                                </div>
                            ))}
                        </div>

                        {/* desktop: table */}
                        <div className="hidden lg:block overflow-x-auto">
                            <table className="w-full text-left text-xs text-slate-600 border-collapse">
                                <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                                    <tr>
                                        <th className="px-5 py-3.5">Document</th>
                                        <th className="px-4 py-3.5">{mine ? "Category" : "Employee"}</th>
                                        <th className="px-4 py-3.5">Type</th>
                                        {canManage && <th className="px-4 py-3.5">Visible to</th>}
                                        <th className="px-4 py-3.5">Added</th>
                                        <th className="px-4 py-3.5">Size</th>
                                        <th className="px-4 py-3.5 text-center w-20">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {visible.map((d) => (
                                        <tr key={d._id} onClick={() => view(d)} className="hover:bg-indigo-50/40 transition-colors cursor-pointer">
                                            <td className="px-5 py-3 align-middle">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    {fileIcon(d)}
                                                    <div className="min-w-0">
                                                        <p className="font-semibold text-slate-900 text-sm truncate max-w-[240px]">{d.title}</p>
                                                        {d.description && <p className="text-[11px] text-slate-400 truncate max-w-[240px]">{d.description}</p>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 align-middle">
                                                {mine ? <Pill tone="slate">{d.categoryLabel}</Pill> : d.employee?.name ? (
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <Avatar name={d.employee.name} size="w-8 h-8" />
                                                        <div className="min-w-0"><p className="font-semibold text-slate-800 truncate max-w-[140px]">{d.employee.name}</p><p className="text-[11px] text-slate-400">{d.employee.employeeId}</p></div>
                                                    </div>
                                                ) : <Pill tone="emerald">Everyone</Pill>}
                                            </td>
                                            <td className="px-4 py-3 align-middle whitespace-nowrap">{d.docType ? <Pill tone="indigo">{d.docType}</Pill> : <span className="text-slate-300">—</span>}</td>
                                            {canManage && <td className="px-4 py-3 align-middle whitespace-nowrap"><Pill tone={aud(d).tone}>{aud(d).label}</Pill></td>}
                                            <td className="px-4 py-3 align-middle whitespace-nowrap">
                                                <p className="font-medium text-slate-700">{dateText(d.createdAt)}</p>
                                                {d.uploadedBy?.name && !mine && <p className="text-[11px] text-slate-400">by {d.uploadedBy.name}</p>}
                                            </td>
                                            <td className="px-4 py-3 align-middle whitespace-nowrap text-slate-500">{sizeText(d.fileSize) || "—"}</td>
                                            <td className="px-4 py-3 align-middle text-center" onClick={(e) => e.stopPropagation()}><RowMenu items={menuFor(d)} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>

            {/* upload / edit */}
            {modal && (
                <Sheet onClose={() => setModal(null)} locked={saving} size="max-w-lg">
                    <form onSubmit={save} noValidate className="flex flex-col min-h-0 flex-1">
                        <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/70">
                            <div className="min-w-0"><h3 className="text-base font-bold text-slate-900">{modal.row ? "Edit document" : cfg.add}</h3><p className="text-xs text-slate-400">{cfg.personal ? "The employee gets a notification." : "Leave the employee empty to share it with everyone."}</p></div>
                            <button type="button" onClick={() => !saving && setModal(null)} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer" aria-label="Close"><X size={18} /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6 space-y-4">
                            <div>
                                <Label>{cfg.personal ? "Employee" : "For (optional)"}</Label>
                                <select value={form.employee ?? ""} onChange={(e) => set("employee", e.target.value)} className={`${inputClass} cursor-pointer ${fieldBorder(errors.employee)}`}>
                                    <option value="">{cfg.personal ? "Select employee" : "Everyone (company-wide)"}</option>
                                    {employees.map((e) => <option key={e._id} value={e._id}>{e.name} ({e.employeeId || "—"})</option>)}
                                </select>
                                <FieldError>{errors.employee}</FieldError>
                            </div>

                            {types.length > 0 && (
                                <div>
                                    <Label>Document type</Label>
                                    <select value={form.docType ?? ""} onChange={(e) => pickType(e.target.value)} className={`${inputClass} cursor-pointer border-slate-200 focus:border-indigo-500`}>
                                        {form.docType && !types.includes(form.docType) && <option value={form.docType}>{form.docType}</option>}
                                        {types.map((t) => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                            )}

                            <div>
                                <Label>Who can see</Label>
                                <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl">
                                    {[["employee", "Employee"], ["admin-hr", "Admin & HR only"]].map(([k, l]) => (
                                        <button key={k} type="button" onClick={() => set("audience", k)} className={`py-2.5 sm:py-2 text-xs font-bold rounded-lg transition cursor-pointer ${form.audience === k ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>{l}</button>
                                    ))}
                                </div>
                                <p className="text-[11px] text-slate-400 mt-1.5">{form.audience === "admin-hr" ? "Only Admin and HR can open this document." : "The employee, Admin and HR can open this document."}</p>
                            </div>

                            <div>
                                <Label>Title</Label>
                                <input value={form.title ?? ""} maxLength={150} onChange={(e) => set("title", e.target.value)} placeholder={cfg.example} className={`${inputClass} ${fieldBorder(errors.title)}`} />
                                <FieldError>{errors.title}</FieldError>
                            </div>

                            <div>
                                <Label>File</Label>
                                <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx" className="hidden" onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ""; }} />
                                {form.file ? (
                                    <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3.5">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0"><FileText size={18} /></div>
                                        <div className="min-w-0 flex-1"><p className="text-sm font-bold text-slate-800 truncate">{form.file.name}</p><p className="text-[11px] text-slate-500">{sizeText(form.file.size)} • ready to upload</p></div>
                                        <button type="button" onClick={() => set("file", null)} className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer" aria-label="Remove file"><X size={16} /></button>
                                    </div>
                                ) : (
                                    <div role="button" tabIndex={0} onClick={() => fileRef.current?.click()} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && fileRef.current?.click()}
                                        onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); pickFile(e.dataTransfer.files?.[0]); }}
                                        className={`flex flex-col items-center gap-1.5 text-center px-4 py-8 rounded-2xl border-2 border-dashed cursor-pointer transition ${drag ? "border-indigo-500 bg-indigo-50" : errors.file ? "border-rose-300 bg-rose-50/40" : "border-slate-300 bg-slate-50/60 hover:border-indigo-400 hover:bg-indigo-50/40"}`}>
                                        <UploadCloud size={26} className="text-indigo-600" />
                                        <p className="text-sm font-bold text-slate-800"><span className="hidden sm:inline">Drag and drop, or </span><span className="text-indigo-600">tap to browse</span></p>
                                        <p className="text-[11px] text-slate-400">PDF, JPG, PNG, DOC, DOCX, XLS, XLSX up to {MAX_MB} MB</p>
                                    </div>
                                )}
                                {modal.row?.hasFile && !form.file && <p className="text-[11px] text-emerald-700 font-semibold mt-2">Current file: {modal.row.fileName}. It stays unless you choose a new one.</p>}
                                <FieldError>{errors.file}</FieldError>
                            </div>

                            <div>
                                <Label>Note (optional)</Label>
                                <textarea rows={2} value={form.description ?? ""} maxLength={500} onChange={(e) => set("description", e.target.value)} className={`${inputClass} resize-none border-slate-200 focus:border-indigo-500`} />
                            </div>
                        </div>

                        <div className="shrink-0 border-t border-slate-100 bg-white px-5 sm:px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
                            <button type="button" onClick={() => setModal(null)} disabled={saving} className="px-5 py-3 sm:py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50">Cancel</button>
                            <button type="submit" disabled={saving} className={primaryBtn}>{saving && <Loader2 size={14} className="animate-spin" />}{saving ? "Saving..." : modal.row ? "Save changes" : "Upload"}</button>
                        </div>
                    </form>
                </Sheet>
            )}

            {viewing && <Viewer doc={viewing} onClose={() => setViewing(null)} />}
            {ask && <ConfirmDialog title={ask.title} text={ask.text} label="Delete" danger onConfirm={ask.run} onClose={() => setAsk(null)} />}
            {generator && <LetterGenerator kind={cfg.generator} category={cfg.category} employees={employees} onClose={() => setGenerator(false)} onSaved={() => load({ silent: true })} />}
        </div>
    );
}
