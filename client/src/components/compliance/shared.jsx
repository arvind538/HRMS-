"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Pencil, RotateCcw, Save, Trash2, X } from "lucide-react";
import { toast } from "react-toastify";
import api from "@/lib/api";
import { ConfirmDialog, FieldError, Label, Sheet, dateText, fieldBorder, inputClass, rupeeShort } from "@/components/payroll/ui";
import { Pill, primaryBtn } from "@/components/payroll/common";

export const TYPE_LABEL = { pf: "Provident Fund (PF)", esi: "ESI", tds: "TDS", "professional-tax": "Professional Tax", labour: "Labour" };
export const TONE = { pending: "amber", overdue: "rose", filed: "emerald" };

export const ymdLocal = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const lastMonth = () => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - 1);
    return { month: d.getMonth() + 1, year: d.getFullYear() };
};
const safeUrl = (u) => /^https?:\/\/\S+$/i.test(String(u || "").trim());
const apiError = (err, fallback) => err?.response?.data?.message || fallback;

/* Downloads a file from a protected API (the login token is sent, which a plain link cannot do) */
export async function downloadFile(path, params, fallbackName) {
    try {
        const res = await api.get(path, { params, responseType: "blob" });
        const name = /filename="?([^";]+)"?/.exec(res.headers?.["content-disposition"] || "")?.[1] || fallbackName;
        const url = URL.createObjectURL(res.data);
        const a = document.createElement("a");
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("File downloaded.");
    } catch (err) {
        let msg = "Unable to download the file.";
        try {
            msg = JSON.parse(await err.response.data.text()).message || msg;
        } catch {
            /* keep the default message */
        }
        toast.error(msg);
    }
}

/* ------------------------------ mark as filed ------------------------------ */

function FileModal({ record, onClose, onDone }) {
    const [form, setForm] = useState({
        referenceNumber: "",
        paidAmount: record.computed?.payable !== undefined ? String(record.computed.payable) : record.totalAmount ? String(record.totalAmount) : "",
        filedDate: ymdLocal(),
        documentUrl: "",
        notes: "",
    });
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    const set = (k, v) => {
        setForm((p) => ({ ...p, [k]: v }));
        setErrors((p) => (p[k] ? { ...p, [k]: undefined } : p));
    };

    const submit = async (e) => {
        e.preventDefault();
        if (saving) return;
        const next = {};
        if (form.paidAmount !== "" && (!Number.isFinite(Number(form.paidAmount)) || Number(form.paidAmount) < 0)) next.paidAmount = "Enter a valid amount.";
        if (!form.filedDate || form.filedDate > ymdLocal()) next.filedDate = "The date cannot be empty or in the future.";
        if (form.documentUrl.trim() && !safeUrl(form.documentUrl)) next.documentUrl = "The link must start with http:// or https://";
        setErrors(next);
        if (Object.keys(next).length) return;

        setSaving(true);
        try {
            await api.put(`/compliance/${record._id}/file`, { ...form, paidAmount: form.paidAmount === "" ? undefined : Number(form.paidAmount) });
            toast.success("Marked as filed.");
            onDone();
        } catch (err) {
            toast.error(apiError(err, "Unable to mark this as filed."));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Sheet onClose={onClose} locked={saving} size="max-w-xl">
            <form onSubmit={submit} noValidate className="flex flex-col min-h-0 flex-1">
                <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/70">
                    <div className="min-w-0">
                        <h3 className="text-base font-bold text-slate-900">Mark as filed</h3>
                        <p className="text-xs text-slate-400 truncate">{record.title}</p>
                    </div>
                    <button type="button" onClick={() => !saving && onClose()} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer" aria-label="Close"><X size={18} /></button>
                </div>
                <div className="flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                            <Label>Challan /TRRN / A/C no.</Label>
                            <input value={form.referenceNumber} maxLength={60} onChange={(e) => set("referenceNumber", e.target.value)} className={`${inputClass} font-mono border-slate-200 focus:border-indigo-500`} />
                        </div>
                        <div>
                            <Label>Amount paid (₹)</Label>
                            <input type="number" inputMode="decimal" min="0" step="any" value={form.paidAmount} onChange={(e) => set("paidAmount", e.target.value)} className={`${inputClass} ${fieldBorder(errors.paidAmount)}`} />
                            <FieldError>{errors.paidAmount}</FieldError>
                        </div>
                    </div>
                    <div>
                        <Label>Filed on</Label>
                        <input type="date" max={ymdLocal()} value={form.filedDate} onChange={(e) => set("filedDate", e.target.value)} className={`${inputClass} ${fieldBorder(errors.filedDate)}`} />
                        <FieldError>{errors.filedDate}</FieldError>
                    </div>
                    <div>
                        <Label>Receipt / challan link (optional)</Label>
                        <input type="url" value={form.documentUrl} maxLength={500} onChange={(e) => set("documentUrl", e.target.value)} placeholder="https://drive.google.com/..." className={`${inputClass} ${fieldBorder(errors.documentUrl)}`} />
                        <FieldError>{errors.documentUrl}</FieldError>
                    </div>
                    <div>
                        <Label>Notes (optional)</Label>
                        <textarea rows={2} value={form.notes} maxLength={500} onChange={(e) => set("notes", e.target.value)} className={`${inputClass} resize-none border-slate-200 focus:border-indigo-500`} />
                    </div>
                    <p className="text-[11px] text-slate-400">After this the record is locked. An admin can reopen it if something was entered wrongly.</p>
                </div>
                <div className="shrink-0 border-t border-slate-100 bg-white px-5 sm:px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
                    <button type="button" onClick={onClose} disabled={saving} className="px-5 py-3 sm:py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50">Cancel</button>
                    <button type="submit" disabled={saving} className={primaryBtn}>{saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}{saving ? "Saving..." : "Mark as filed"}</button>
                </div>
            </form>
        </Sheet>
    );
}

/* ------------------------------ list of filings ------------------------------ */

const amountOf = (r) => (r.status === "filed" ? r.paidAmount ?? r.totalAmount : r.computed ? r.computed.payable : r.totalAmount);

function DaysBox({ r }) {
    if (r.status === "filed") {
        return <div className="w-16 shrink-0 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-600 py-2 flex items-center justify-center"><Check size={20} /></div>;
    }
    const late = r.daysLeft < 0;
    const urgent = !late && r.daysLeft <= 7;
    const cls = late ? "bg-rose-50 border-rose-200 text-rose-600" : urgent ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-slate-50 border-slate-200 text-slate-600";
    return (
        <div className={`w-16 shrink-0 rounded-xl border py-2 text-center ${cls}`}>
            <p className="text-lg font-extrabold leading-none">{Math.abs(r.daysLeft)}</p>
            <p className="text-[9px] uppercase font-bold mt-1 tracking-wider">{late ? "days late" : r.daysLeft === 1 ? "day left" : "days left"}</p>
        </div>
    );
}

export function RecordList({ records, isAdmin, onChanged, onEdit, onDelete, emptyText = "Nothing here." }) {
    const [filing, setFiling] = useState(null);
    const [ask, setAsk] = useState(null);

    if (!records.length) return <p className="py-10 px-4 text-center text-xs text-slate-400">{emptyText}</p>;

    const reopen = (r) =>
        setAsk({
            title: "Reopen this filing?",
            text: `${r.title}. The filing details (challan number, amount, link) are cleared and it goes back to pending.`,
            label: "Reopen",
            run: async () => {
                try {
                    await api.put(`/compliance/${r._id}/reopen`);
                    toast.success("Filing reopened.");
                    onChanged();
                } catch (err) {
                    toast.error(apiError(err, "Unable to reopen."));
                }
            },
        });

    const iconBtn = "inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 transition cursor-pointer";

    return (
        <>
            <ul className="divide-y divide-slate-100">
                {records.map((r) => {
                    const amount = amountOf(r);
                    return (
                        <li key={r._id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                                <DaysBox r={r} />
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-slate-900 break-words">{r.title || TYPE_LABEL[r.type]}</p>
                                    <p className="text-[11px] text-slate-500">
                                        {TYPE_LABEL[r.type]} • Due {dateText(r.dueDate)}
                                        {r.status === "filed" && r.filedDate ? ` • Filed ${dateText(r.filedDate)}` : ""}
                                    </p>
                                    {r.referenceNumber && <p className="text-[11px] text-slate-400 font-mono break-all">Ref: {r.referenceNumber}</p>}
                                    {r.computed && !r.computed.ready && r.status !== "filed" && (
                                        <p className="text-[11px] font-semibold text-amber-700 mt-0.5">
                                            {r.computed.payslips?.total ? `${r.computed.payslips.draft} payslip(s) still draft, amount may change` : "No payslip for this month yet"}
                                        </p>
                                    )}
                                    {r.status === "filed" && r.documentUrl && (
                                        <a href={r.documentUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold text-indigo-600 hover:underline">View receipt</a>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2.5 flex-wrap sm:justify-end">
                                {amount !== undefined && amount !== null && (r.kind === "deposit" || amount > 0) && (
                                    <span className="text-sm font-extrabold font-mono text-slate-900">{rupeeShort(amount)}</span>
                                )}
                                <Pill tone={TONE[r.status]}>{r.status}</Pill>
                                {r.status !== "filed" && (
                                    <button type="button" onClick={() => setFiling(r)} className="inline-flex items-center gap-1 px-3 h-9 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer"><Check size={13} /> File</button>
                                )}
                                {r.status === "filed" && isAdmin && (
                                    <button type="button" onClick={() => reopen(r)} className="inline-flex items-center gap-1 px-3 h-9 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition cursor-pointer"><RotateCcw size={13} /> Reopen</button>
                                )}
                                {onEdit && !r.isAuto && r.status !== "filed" && (
                                    <button type="button" onClick={() => onEdit(r)} className={`${iconBtn} hover:text-indigo-600 hover:bg-indigo-50`} aria-label="Edit"><Pencil size={15} /></button>
                                )}
                                {onDelete && isAdmin && !r.isAuto && r.status !== "filed" && (
                                    <button type="button" onClick={() => onDelete(r)} className={`${iconBtn} hover:text-rose-600 hover:bg-rose-50`} aria-label="Delete"><Trash2 size={15} /></button>
                                )}
                            </div>
                        </li>
                    );
                })}
            </ul>

            {filing && <FileModal record={filing} onClose={() => setFiling(null)} onDone={() => { setFiling(null); onChanged(); }} />}
            {ask && <ConfirmDialog title={ask.title} text={ask.text} label={ask.label} onConfirm={ask.run} onClose={() => setAsk(null)} />}
        </>
    );
}

/* ------------------------------ registration numbers ------------------------------ */

export function RegistrationCard({ fields, isAdmin }) {
    const [vals, setVals] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let alive = true;
        api
            .get("/compliance/registration")
            .then(({ data }) => alive && setVals(data || {}))
            .catch(() => { })
            .finally(() => alive && setLoading(false));
        return () => {
            alive = false;
        };
    }, []);

    const save = async (e) => {
        e.preventDefault();
        if (saving) return;
        setSaving(true);
        try {
            const body = Object.fromEntries(fields.map(([key]) => [key, vals[key] || ""]));
            const { data } = await api.put("/compliance/registration", body);
            setVals(data);
            toast.success("Registration details saved.");
        } catch (err) {
            toast.error(apiError(err, "Unable to save the details."));
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={save} className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-4 sm:p-6 space-y-4 max-w-2xl">
            <div>
                <h3 className="text-base font-bold text-slate-900">Company registration</h3>
                <p className="text-xs text-slate-400">Only admin and HR can see these. Only an admin can change them.</p>
            </div>
            {loading ? (
                <div className="h-20 rounded-xl bg-slate-100 animate-pulse" />
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {fields.map(([key, label, placeholder]) => (
                        <div key={key}>
                            <Label>{label}</Label>
                            <input value={vals[key] || ""} disabled={!isAdmin} maxLength={120} onChange={(e) => setVals((p) => ({ ...p, [key]: e.target.value }))} placeholder={placeholder} className={`${inputClass} font-mono border-slate-200 focus:border-indigo-500 disabled:opacity-70 disabled:cursor-not-allowed`} />
                        </div>
                    ))}
                </div>
            )}
            {isAdmin && (
                <div className="flex justify-end">
                    <button type="submit" disabled={saving || loading} className={primaryBtn}>{saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}{saving ? "Saving..." : "Save details"}</button>
                </div>
            )}
        </form>
    );
}