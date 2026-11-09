"use client";

import { useEffect, useState } from "react";
import { CalendarOff, CheckCircle2, Clock, Plus, ThumbsUp, Trash2, XCircle } from "lucide-react";
import { toast } from "react-toastify";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { ConfirmDialog, ErrorBanner, FieldError, Label, dateText, fieldBorder, inputClass } from "@/components/payroll/ui";
import { PageHeader, primaryBtn } from "@/components/payroll/common";
import { Box, FormFooter, ReasonModal, errMsg } from "@/components/recruitment/rui";
import { DataPanel, Stats, StChip, listOf, roleOf, selectCls, useApi } from "@/components/performance/pui";

const OFF_ST = { pending: { label: "Waiting for admin", tone: "amber" }, approved: { label: "Approved", tone: "emerald" }, rejected: { label: "Rejected", tone: "rose" } };
const IDEAS = ["Diwali", "Holi", "Company event", "Office closed", "Heavy rain"];
const todayYmd = () => new Date().toLocaleDateString("en-CA");
const blank = (date = "") => ({ date, name: "", reason: "" });

export default function OffDaysPage() {
    const { user } = useAuth();
    const role = roleOf(user);
    const admin = role === "admin";
    const canAdd = admin || role === "hr";

    const [year, setYear] = useState(new Date().getFullYear());
    const { data, loading, refreshing, error, load } = useApi("/attendance/off-days", { year });
    const rows = listOf(data);

    const [modal, setModal] = useState(false);
    const [form, setForm] = useState(blank());
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [ask, setAsk] = useState(null);
    const [reject, setReject] = useState(null);

    /* the daily attendance page sends the chosen day here */
    useEffect(() => {
        if (!canAdd) return;
        const d = new URLSearchParams(window.location.search).get("date");
        if (d) { setForm(blank(d)); setModal(true); }
    }, [canAdd]);

    const set = (k, v) => { setForm((p) => ({ ...p, [k]: v })); setErrors((p) => (p[k] ? { ...p, [k]: undefined } : p)); };
    const refresh = () => load({ silent: true });

    const save = async (e) => {
        e.preventDefault();
        if (saving) return;
        const next = {};
        if (!form.date) next.date = "Please select the date.";
        else if (new Date(`${form.date}T00:00:00`).getDay() === 0) next.date = "Sunday is already the weekly off.";
        if (form.name.trim().length < 2) next.name = "Please enter a name, for example Diwali.";
        setErrors(next);
        if (Object.keys(next).length) return;
        setSaving(true);
        try {
            const { data: r } = await api.post("/attendance/off-days", { date: form.date, name: form.name.trim(), reason: form.reason.trim() });
            toast.success(r.message || "Saved.");
            setModal(false);
            if (window.location.search) window.history.replaceState(null, "", "/attendance/off-days");
            refresh();
        } catch (err) {
            toast.error(await errMsg(err, "Unable to save the off day."));
        } finally {
            setSaving(false);
        }
    };

    const approve = (r) => setAsk({
        title: "Approve this off day?", label: "Approve", text: `${r.name} on ${dateText(r.date)}. Everyone will see it as an off day and no one will be marked absent.`,
        run: async () => { try { await api.put(`/attendance/off-days/${r._id}/decision`, { decision: "approved" }); toast.success("Approved."); await refresh(); } catch (err) { toast.error(await errMsg(err, "Unable to approve.")); } },
    });
    const remove = (r) => setAsk({
        title: r.status === "pending" ? "Withdraw this request?" : "Remove this off day?", label: "Remove", danger: true, text: `${r.name} on ${dateText(r.date)}.`,
        run: async () => { try { await api.delete(`/attendance/off-days/${r._id}`); toast.success("Removed."); await refresh(); } catch (err) { toast.error(await errMsg(err, "Unable to remove.")); } },
    });

    const menu = (r) => [
        { label: "Approve", icon: ThumbsUp, run: () => approve(r), hidden: !(admin && r.status === "pending") },
        { label: "Reject", icon: XCircle, run: () => setReject(r), hidden: !(admin && r.status === "pending"), danger: true },
        { label: r.status === "pending" ? "Withdraw request" : "Remove", icon: Trash2, run: () => remove(r), hidden: !(admin || (r.status === "pending" && r.mine)), danger: true },
    ];
    const weekday = (d) => new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { weekday: "long" });
    const today = todayYmd();
    const years = [0, 1, 2].map((i) => new Date().getFullYear() - 1 + i);

    return (
        <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 py-4 space-y-4 antialiased pb-16">
            <PageHeader icon={CalendarOff} title="Off Days" subtitle="Sunday is always off. Any other off day starts only after the admin approves it." onRefresh={refresh} busy={loading || refreshing}>
                {canAdd && <button type="button" onClick={() => { setForm(blank()); setErrors({}); setModal(true); }} className={primaryBtn}><Plus size={16} /> {admin ? "Add off day" : "Request off day"}</button>}
            </PageHeader>

            {!loading && !error && <Stats items={[["Approved", rows.filter((r) => r.status === "approved").length, CheckCircle2, "emerald"], ["Waiting for admin", rows.filter((r) => r.status === "pending").length, Clock, "violet"], ["Coming up", rows.filter((r) => r.status === "approved" && r.date >= today).length, CalendarOff, "indigo"]]} />}

            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/70 shadow-sm flex items-center gap-2.5">
                <select value={year} onChange={(e) => setYear(Number(e.target.value))} className={selectCls}>{years.map((y) => <option key={y} value={y}>{y}</option>)}</select>
                <p className="text-xs text-slate-500">Saturday is a normal working day.</p>
            </div>
            <ErrorBanner message={error} onRetry={() => load()} />

            <DataPanel
                loading={loading} rows={rows} icon={CalendarOff}
                empty={["No off days", canAdd ? 'Click "Add off day" when the office will be closed.' : "Nothing is announced for this year."]}
                onOpen={() => { }} menu={menu}
                cols={[
                    { h: "Date", cell: (r) => <div><p className="font-semibold text-slate-900">{dateText(r.date)}</p><p className="text-[11px] text-slate-400">{weekday(r.date)}</p></div> },
                    { h: "Off day", cell: (r) => <div className="min-w-0"><p className="font-semibold text-slate-800 truncate max-w-[220px]">{r.name}</p>{r.reason && <p className="text-[11px] text-slate-400 truncate max-w-[220px]">{r.reason}</p>}</div> },
                    { h: "Asked by", cell: (r) => r.requestedBy?.name || "—" },
                    { h: "Decided by", cell: (r) => r.decidedBy?.name || "—" },
                    { h: "Status", cell: (r) => <StChip map={OFF_ST} v={r.status} /> },
                ]}
                card={(r) => (
                    <div className="space-y-2">
                        <div><p className="text-sm font-bold text-slate-900">{r.name}</p><p className="text-[11px] text-slate-400">{dateText(r.date)} • {weekday(r.date)}</p></div>
                        {r.reason && <p className="text-xs text-slate-500">{r.reason}</p>}
                        <div className="flex flex-wrap items-center gap-2"><StChip map={OFF_ST} v={r.status} />{r.decisionNote && <span className="text-[11px] text-rose-600">{r.decisionNote}</span>}</div>
                    </div>
                )}
            />

            {modal && (
                <Box title={admin ? "Add off day" : "Request off day"} subtitle={admin ? "It is approved at once and shown to everyone" : "The admin will approve it"} onClose={() => setModal(false)} onSubmit={save} locked={saving} size="max-w-md" footer={<FormFooter onCancel={() => setModal(false)} busy={saving} label={admin ? "Add off day" : "Send for approval"} />}>
                    <div>
                        <Label>Date *</Label>
                        <input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} className={`${inputClass} cursor-pointer ${fieldBorder(errors.date)}`} />
                        <FieldError>{errors.date}</FieldError>
                    </div>
                    <div>
                        <Label>Name *</Label>
                        <input value={form.name} maxLength={80} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Diwali" className={`${inputClass} ${fieldBorder(errors.name)}`} />
                        <FieldError>{errors.name}</FieldError>
                        <div className="flex flex-wrap gap-1.5 mt-2">{IDEAS.map((i) => <button key={i} type="button" onClick={() => set("name", i)} className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-[11px] font-semibold text-slate-600 transition cursor-pointer">{i}</button>)}</div>
                    </div>
                    <div><Label>Reason (optional)</Label><textarea rows={3} value={form.reason} maxLength={300} onChange={(e) => set("reason", e.target.value)} className={`${inputClass} resize-none border-slate-200 focus:border-indigo-500`} /></div>
                </Box>
            )}

            {reject && <ReasonModal title="Reject off day" subtitle={`${reject.name} • ${reject.date}`} confirm="Reject" onClose={() => setReject(null)} onSubmit={async (note) => { try { await api.put(`/attendance/off-days/${reject._id}/decision`, { decision: "rejected", note }); toast.success("Rejected."); await refresh(); } catch (err) { toast.error(await errMsg(err, "Unable to reject.")); throw err; } }} />}
            {ask && <ConfirmDialog title={ask.title} text={ask.text} label={ask.label} danger={ask.danger} onConfirm={ask.run} onClose={() => setAsk(null)} />}
        </div>
    );
}