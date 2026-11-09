"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ClipboardList, Eye, ListChecks, Pencil, Plus, RotateCcw, Send, ThumbsUp, Trash2, TrendingUp, XCircle } from "lucide-react";
import { toast } from "react-toastify";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { ConfirmDialog, ErrorBanner, FieldError, Label, dateText, fieldBorder, inputClass } from "@/components/payroll/ui";
import { PageHeader, primaryBtn } from "@/components/payroll/common";
import { Box, Chip, FooterBar, FormFooter, Info, ReasonModal, errMsg, ghostBtn } from "@/components/recruitment/rui";
import { Bar, DataPanel, Person, Stats, StChip, Toolbar, roleOf, selectCls, useApi } from "@/components/performance/pui";

const TASK_ST = {
    pending: { label: "Pending", tone: "amber" },
    "in-progress": { label: "In progress", tone: "indigo" },
    submitted: { label: "In review", tone: "violet" },
    completed: { label: "Completed", tone: "emerald" },
    cancelled: { label: "Cancelled", tone: "slate" },
};
const PRIORITY_TONE = { low: "slate", medium: "sky", high: "amber", urgent: "rose" };
const PRIORITIES = ["low", "medium", "high", "urgent"];
const OPEN = ["pending", "in-progress"];

const idOf = (v) => String(v?._id || v || "");
const toYMD = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const blank = () => ({ title: "", description: "", assignedTo: "", priority: "medium", startDate: "", dueDate: "", estimatedHours: "" });
const sel = `${inputClass} border-slate-200 focus:border-indigo-500 cursor-pointer`;
const area = `${inputClass} resize-none border-slate-200 focus:border-indigo-500`;

/* ------------------------------ popups ------------------------------ */

function ProgressModal({ task, onClose, onDone }) {
    const today = toYMD(new Date());
    const todays = (task.updates || []).find((u) => u.date === today);
    const [pct, setPct] = useState(todays?.progress ?? task.progress ?? 0);
    const [note, setNote] = useState(todays?.note || "");
    const [err, setErr] = useState("");
    const [busy, setBusy] = useState(false);

    const save = async (e) => {
        e.preventDefault();
        if (busy) return;
        if (note.trim().length < 3) return setErr("Please write what you worked on today.");
        setBusy(true);
        try {
            await api.post(`/tasks/${task._id}/progress`, { progress: Number(pct), note: note.trim() });
            toast.success("Today's update saved.");
            onDone();
            onClose();
        } catch (er) {
            toast.error(await errMsg(er, "Unable to save the update."));
            setBusy(false);
        }
    };

    return (
        <Box title="Today's work update" subtitle={task.title} onClose={onClose} onSubmit={save} locked={busy} size="max-w-md" footer={<FormFooter onCancel={onClose} busy={busy} label="Save update" />}>
            <div>
                <div className="flex items-center justify-between"><Label>How much of the task is done?</Label><span className="text-sm font-extrabold text-indigo-600 font-mono">{pct}%</span></div>
                <input type="range" min="0" max="100" step="5" value={pct} onChange={(e) => setPct(e.target.value)} className="w-full accent-indigo-600 cursor-pointer" />
            </div>
            <div>
                <Label>What did you work on today? *</Label>
                <textarea rows={4} value={note} maxLength={500} autoFocus onChange={(e) => { setNote(e.target.value); setErr(""); }} className={`${inputClass} resize-none ${fieldBorder(err)}`} />
                <FieldError>{err}</FieldError>
            </div>
            {todays && <p className="text-[11px] text-slate-400">You already added an update today. Saving replaces it.</p>}
        </Box>
    );
}

function SubmitModal({ task, onClose, onDone }) {
    const [note, setNote] = useState("");
    const [link, setLink] = useState("");
    const [errs, setErrs] = useState({});
    const [busy, setBusy] = useState(false);

    const save = async (e) => {
        e.preventDefault();
        if (busy) return;
        const next = {};
        if (note.trim().length < 3) next.note = "Please write a short note about the work you did.";
        if (link.trim() && !/^https?:\/\/\S+$/i.test(link.trim())) next.link = "The link must start with http:// or https://";
        setErrs(next);
        if (Object.keys(next).length) return;
        setBusy(true);
        try {
            await api.put(`/tasks/${task._id}/submit`, { note: note.trim(), link: link.trim() });
            toast.success("Work submitted.");
            onDone();
            onClose();
        } catch (er) {
            toast.error(await errMsg(er, "Unable to submit the work."));
            setBusy(false);
        }
    };

    return (
        <Box title="Submit work for review" subtitle={task.title} onClose={onClose} onSubmit={save} locked={busy} size="max-w-md" footer={<FormFooter onCancel={onClose} busy={busy} label="Submit for review" />}>
            <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">Current progress: <b className="text-slate-700">{task.progress || 0}%</b>. You can submit even if only part of the work is done.</p>
            <div>
                <Label>What did you complete? *</Label>
                <textarea rows={4} value={note} maxLength={1000} autoFocus onChange={(e) => { setNote(e.target.value); setErrs((p) => ({ ...p, note: undefined })); }} className={`${inputClass} resize-none ${fieldBorder(errs.note)}`} />
                <FieldError>{errs.note}</FieldError>
            </div>
            <div>
                <Label>Link (optional)</Label>
                <input type="url" value={link} maxLength={500} onChange={(e) => { setLink(e.target.value); setErrs((p) => ({ ...p, link: undefined })); }} placeholder="https://drive.google.com/..." className={`${inputClass} ${fieldBorder(errs.link)}`} />
                <FieldError>{errs.link}</FieldError>
            </div>
        </Box>
    );
}

/* ------------------------------ page ------------------------------ */

export default function TasksPage() {
    const { user } = useAuth();
    const role = roleOf(user);
    const me = String(user?._id || user?.id || "");
    const canAssign = ["admin", "hr", "manager"].includes(role); // only these roles create / edit / review tasks
    const privileged = ["admin", "hr"].includes(role);

    const { data, loading, refreshing, error, load } = useApi("/tasks");
    const rows = useMemo(() => data?.tasks || data?.data || (Array.isArray(data) ? data : []), [data]);

    /* who can be given a task: a manager sees only the team, admin and HR everyone */
    const [people, setPeople] = useState([]);
    useEffect(() => {
        if (!canAssign) return;
        const url = role === "manager" ? "/employees/team" : "/employees";
        api.get(url).then((res) => {
            const list = role === "manager" ? res.data?.members || [] : Array.isArray(res.data) ? res.data : res.data?.employees || [];
            setPeople(list.filter((e) => !/^(inactive|exited|exit)$/i.test(e.employeeStatus || "")));
        }).catch(() => { });
    }, [canAssign, role]);

    const [search, setSearch] = useState("");
    const [tab, setTab] = useState("all");
    const [pri, setPri] = useState("ALL");
    const [modal, setModal] = useState(null);
    const [form, setForm] = useState(blank());
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [viewing, setViewing] = useState(null);
    const [progress, setProgress] = useState(null);
    const [submit, setSubmit] = useState(null);
    const [rework, setRework] = useState(null);
    const [ask, setAsk] = useState(null);

    const today = toYMD(new Date());
    const isOverdue = (t) => t.dueDate && toYMD(new Date(t.dueDate)) < today && !["completed", "cancelled"].includes(t.status);

    const perms = (t) => {
        const assignee = idOf(t.assignedTo) === me;
        const assigner = idOf(t.assignedBy) === me;
        const open = OPEN.includes(t.status);
        const manage = canAssign && (privileged || assigner); // an employee never manages tasks
        return {
            assignee, assigner,
            canEdit: manage,
            work: assignee && open,
            review: manage && t.status === "submitted",
            cancel: manage && (open || t.status === "submitted"),
            reopen: manage && t.status === "cancelled",
        };
    };

    const matchers = useMemo(() => ({
        all: () => true,
        today: (t) => t.dueDate && toYMD(new Date(t.dueDate)) === today,
        open: (t) => OPEN.includes(t.status),
        review: (t) => t.status === "submitted",
        completed: (t) => t.status === "completed",
        overdue: (t) => t.dueDate && toYMD(new Date(t.dueDate)) < today && !["completed", "cancelled"].includes(t.status),
        mine: (t) => idOf(t.assignedTo) === me,
    }), [today, me]);

    const tabs = [["all", "All"], ["today", "Due today"], ["open", "Open"], ["review", "In review"], ["completed", "Completed"], ["overdue", "Overdue"], ...(canAssign ? [["mine", "Assigned to me"]] : [])]
        .map(([k, l]) => [k, l, rows.filter(matchers[k]).length]);

    const visible = useMemo(() => {
        const q = search.trim().toLowerCase();
        return rows.filter((t) => matchers[tab](t) && (pri === "ALL" || t.priority === pri) && (!q || `${t.title} ${t.assignedTo?.name || ""} ${t.assignedBy?.name || ""}`.toLowerCase().includes(q)));
    }, [rows, tab, pri, search, matchers]);

    const refresh = () => load({ silent: true });
    const set = (k, v) => { setForm((p) => ({ ...p, [k]: v })); setErrors((p) => (p[k] ? { ...p, [k]: undefined } : p)); };

    const openModal = (t = null) => {
        if (!canAssign) return;
        setForm(t ? { title: t.title || "", description: t.description || "", assignedTo: idOf(t.assignedTo), priority: t.priority || "medium", startDate: t.startDate ? toYMD(new Date(t.startDate)) : "", dueDate: t.dueDate ? toYMD(new Date(t.dueDate)) : "", estimatedHours: t.estimatedHours ?? "" } : blank());
        setErrors({});
        setModal({ task: t });
    };

    const save = async (e) => {
        e.preventDefault();
        if (saving || !canAssign) return;
        const next = {};
        const creating = !modal.task;
        if (form.title.trim().length < 2) next.title = "Title is required (at least 2 characters).";
        if (creating && !form.assignedTo) next.assignedTo = "Please select an employee.";
        if (form.startDate && form.dueDate && form.dueDate < form.startDate) next.dueDate = "The due date cannot be before the start date.";
        if (creating && form.dueDate && form.dueDate < today) next.dueDate = "The due date cannot be in the past.";
        if (form.estimatedHours !== "" && (!Number.isFinite(Number(form.estimatedHours)) || Number(form.estimatedHours) < 0)) next.estimatedHours = "Enter a valid number of hours.";
        setErrors(next);
        if (Object.keys(next).length) return;

        const body = { title: form.title.trim(), description: form.description.trim(), priority: form.priority, startDate: form.startDate || null, dueDate: form.dueDate || null, estimatedHours: form.estimatedHours === "" ? null : Number(form.estimatedHours) };
        setSaving(true);
        try {
            if (creating) {
                body.assignedTo = form.assignedTo;
                await api.post("/tasks", body);
            } else await api.put(`/tasks/${modal.task._id}`, body);
            toast.success(creating ? "Task created." : "Task updated.");
            setModal(null);
            refresh();
        } catch (err) {
            toast.error(await errMsg(err, "Unable to save the task."));
        } finally {
            setSaving(false);
        }
    };

    const call = async (fn, okText) => {
        try {
            await fn();
            toast.success(okText);
            setViewing(null);
            await refresh();
        } catch (err) {
            toast.error(await errMsg(err, "Unable to do this."));
            throw err;
        }
    };

    const approve = (t) => setAsk({ title: "Approve this task?", text: `${t.title}. It will be marked completed.`, label: "Approve", run: () => call(() => api.put(`/tasks/${t._id}/review`, { action: "approve" }), "Task approved.").catch(() => { }) });
    const cancel = (t) => setAsk({ title: "Cancel this task?", text: `${t.title}. The employee will not be able to work on it.`, label: "Cancel task", danger: true, run: () => call(() => api.put(`/tasks/${t._id}`, { status: "cancelled" }), "Task cancelled.").catch(() => { }) });
    const reopen = (t) => call(() => api.put(`/tasks/${t._id}`, { status: "pending" }), "Task reopened.").catch(() => { });
    const remove = (t) => setAsk({ title: "Delete this task?", text: `${t.title}. This cannot be undone.`, label: "Delete", danger: true, run: () => call(() => api.delete(`/tasks/${t._id}`), "Task deleted.").catch(() => { }) });

    const menu = (t) => {
        const p = perms(t);
        return [
            { label: "View details", icon: Eye, run: () => setViewing(t) },
            { label: "Update today's progress", icon: TrendingUp, run: () => setProgress(t), hidden: !p.work },
            { label: "Submit work", icon: Send, run: () => setSubmit(t), hidden: !p.work },
            { label: "Approve", icon: ThumbsUp, run: () => approve(t), hidden: !p.review },
            { label: "Send back for rework", icon: RotateCcw, run: () => setRework(t), hidden: !p.review },
            { label: "Edit", icon: Pencil, run: () => openModal(t), hidden: !p.canEdit },
            { label: "Cancel task", icon: XCircle, run: () => cancel(t), hidden: !p.cancel },
            { label: "Reopen", icon: RotateCcw, run: () => reopen(t), hidden: !p.reopen },
            { label: "Delete", icon: Trash2, run: () => remove(t), hidden: !p.canEdit, danger: true },
        ];
    };

    const who = (t) => (idOf(t.assignedTo) === me ? { ...t.assignedTo, name: `${t.assignedTo?.name || "You"} (you)` } : t.assignedTo);
    const due = (t) => (
        <div><p className={`font-medium ${isOverdue(t) ? "text-rose-600" : "text-slate-700"}`}>{t.dueDate ? dateText(t.dueDate) : "—"}</p>{isOverdue(t) && <p className="text-[11px] font-bold text-rose-600">Overdue</p>}</div>
    );
    const prog = (t) => <div className="w-32 space-y-1"><Bar value={t.progress || 0} tone={t.status === "completed" ? "bg-emerald-500" : isOverdue(t) ? "bg-rose-500" : "bg-indigo-500"} /><p className="text-[11px] font-semibold text-slate-500">{t.progress || 0}%</p></div>;

    const waiting = rows.filter((t) => t.status === "submitted" && perms(t).review).length;
    const stats = [
        ["Open tasks", rows.filter(matchers.open).length, ListChecks, "indigo"],
        [waiting ? "Waiting for your review" : "In review", waiting || rows.filter(matchers.review).length, ClipboardList, "violet"],
        ["Completed", rows.filter(matchers.completed).length, CheckCircle2, "emerald"],
        ["Overdue", rows.filter(matchers.overdue).length, AlertTriangle, "rose"],
    ];

    const personCol = canAssign
        ? { h: "Assigned to", cell: (t) => <Person p={who(t)} sub={t.assignedTo?.employeeId || ""} /> }
        : { h: "Assigned by", cell: (t) => <Person p={t.assignedBy} sub={t.assignedBy?.role || ""} /> };

    return (
        <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 py-4 space-y-4 antialiased pb-16">
            <PageHeader icon={ListChecks} title="Tasks" subtitle={canAssign ? "Give tasks to your team and review their work." : "Tasks given to you. Add a daily update, then submit the work for review."} onRefresh={refresh} busy={loading || refreshing}>
                {canAssign && <button type="button" onClick={() => openModal()} className={primaryBtn}><Plus size={16} /> Add Task</button>}
            </PageHeader>

            {!loading && !error && <Stats items={stats} />}

            <Toolbar search={search} onSearch={setSearch} placeholder={canAssign ? "Search title or employee" : "Search task title"} tabs={tabs} tab={tab} onTab={setTab}>
                <select value={pri} onChange={(e) => setPri(e.target.value)} className={selectCls}>
                    <option value="ALL">All priorities</option>
                    {PRIORITIES.map((p) => <option key={p} value={p}>{p[0].toUpperCase() + p.slice(1)}</option>)}
                </select>
            </Toolbar>

            <ErrorBanner message={error} onRetry={() => load()} />

            <DataPanel
                loading={loading} rows={visible} icon={ClipboardList}
                empty={[
                    rows.length ? "No tasks match" : "No tasks yet",
                    rows.length ? "Try another tab or keyword." : canAssign ? 'Click "Add Task" to create the first one.' : "Your manager or HR will assign tasks to you here.",
                ]}
                onOpen={setViewing} menu={menu}
                cols={[
                    { h: "Task", cell: (t) => <div className="min-w-0"><p className="font-semibold text-slate-900 text-sm truncate max-w-[260px]">{t.title}</p>{t.description && <p className="text-[11px] text-slate-400 truncate max-w-[260px]">{t.description}</p>}</div> },
                    personCol,
                    { h: "Priority", cell: (t) => <Chip tone={PRIORITY_TONE[t.priority] || "sky"}>{t.priority || "medium"}</Chip> },
                    { h: "Due date", cell: due },
                    { h: "Progress", cell: prog },
                    { h: "Status", cell: (t) => <StChip map={TASK_ST} v={t.status} /> },
                ]}
                card={(t) => (
                    <div className="space-y-2.5">
                        <div><p className="text-sm font-bold text-slate-900 break-words">{t.title}</p>{t.description && <p className="text-xs text-slate-500 line-clamp-2 break-words">{t.description}</p>}</div>
                        <p className="text-[11px] text-slate-500">
                            {canAssign
                                ? <>To <b className="text-slate-700">{idOf(t.assignedTo) === me ? "You" : t.assignedTo?.name || "—"}</b></>
                                : <>From <b className="text-slate-700">{t.assignedBy?.name || "—"}</b></>} • due {t.dueDate ? dateText(t.dueDate) : "—"}
                        </p>
                        <Bar value={t.progress || 0} tone={t.status === "completed" ? "bg-emerald-500" : isOverdue(t) ? "bg-rose-500" : "bg-indigo-500"} />
                        <div className="flex flex-wrap items-center gap-2"><StChip map={TASK_ST} v={t.status} /><Chip tone={PRIORITY_TONE[t.priority] || "sky"}>{t.priority}</Chip><Chip tone="violet">{t.progress || 0}%</Chip>{isOverdue(t) && <Chip tone="rose">Overdue</Chip>}{t.review?.comment && OPEN.includes(t.status) && <Chip tone="rose">Rework</Chip>}</div>
                    </div>
                )}
            />

            {/* create / edit (admin, HR, manager only) */}
            {canAssign && modal && (
                <Box title={modal.task ? "Edit task" : "Create task"} subtitle={modal.task ? "Change the details" : "Choose who does it and by when"} onClose={() => setModal(null)} onSubmit={save} locked={saving} size="max-w-2xl" footer={<FormFooter onCancel={() => setModal(null)} busy={saving} label={modal.task ? "Save changes" : "Create task"} />}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                            <Label>Title *</Label>
                            <input value={form.title} maxLength={150} autoFocus onChange={(e) => set("title", e.target.value)} placeholder="e.g. Prepare the monthly sales report" className={`${inputClass} ${fieldBorder(errors.title)}`} />
                            <FieldError>{errors.title}</FieldError>
                        </div>
                        <div className="sm:col-span-2"><Label>Description</Label><textarea rows={3} value={form.description} maxLength={2000} onChange={(e) => set("description", e.target.value)} className={area} /></div>

                        <div>
                            <Label>Assigned to {modal.task ? "" : "*"}</Label>
                            <select value={form.assignedTo} disabled={Boolean(modal.task)} onChange={(e) => set("assignedTo", e.target.value)} className={`${inputClass} cursor-pointer disabled:bg-slate-100 ${fieldBorder(errors.assignedTo)}`}>
                                <option value="">{role === "manager" ? "Select a team member" : "Select employee"}</option>
                                {modal.task && !people.some((p) => String(p._id) === form.assignedTo) && <option value={form.assignedTo}>{modal.task.assignedTo?.name || "Current employee"}</option>}
                                {people.map((p) => <option key={p._id} value={p._id} disabled={p.hasLogin === false}>{p.name}{p.employeeId ? ` (${p.employeeId})` : ""}{p.hasLogin === false ? " - no login" : ""}</option>)}
                            </select>
                            <FieldError>{errors.assignedTo}</FieldError>
                            {role === "manager" && people.length === 0 && <p className="text-[11px] text-amber-700 mt-1">No team members yet. Ask HR to set you as their Reporting Manager.</p>}
                        </div>
                        <div><Label>Priority *</Label><select value={form.priority} onChange={(e) => set("priority", e.target.value)} className={sel}>{PRIORITIES.map((p) => <option key={p} value={p}>{p[0].toUpperCase() + p.slice(1)}</option>)}</select></div>
                        <div><Label>Start date</Label><input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} className={sel} /></div>
                        <div>
                            <Label>Due date</Label>
                            <input type="date" value={form.dueDate} min={form.startDate || undefined} onChange={(e) => set("dueDate", e.target.value)} className={`${inputClass} cursor-pointer ${fieldBorder(errors.dueDate)}`} />
                            <FieldError>{errors.dueDate}</FieldError>
                        </div>
                        <div>
                            <Label>Estimated hours</Label>
                            <input type="number" min="0" step="0.5" inputMode="decimal" value={form.estimatedHours} onChange={(e) => set("estimatedHours", e.target.value)} placeholder="e.g. 6" className={`${inputClass} ${fieldBorder(errors.estimatedHours)}`} />
                            <FieldError>{errors.estimatedHours}</FieldError>
                        </div>
                    </div>
                </Box>
            )}

            {/* details */}
            {viewing && (() => {
                const t = rows.find((x) => x._id === viewing._id) || viewing;
                const p = perms(t);
                return (
                    <Box title={t.title} subtitle={t.assignedTo?.name ? `For ${t.assignedTo.name}` : "Task"} onClose={() => setViewing(null)} footer={
                        <FooterBar>
                            {p.work && <button type="button" onClick={() => { setViewing(null); setProgress(t); }} className={primaryBtn}><TrendingUp size={14} /> Update progress</button>}
                            {p.work && <button type="button" onClick={() => { setViewing(null); setSubmit(t); }} className={ghostBtn}><Send size={14} /> Submit work</button>}
                            {p.review && <button type="button" onClick={() => { setViewing(null); approve(t); }} className={primaryBtn}><ThumbsUp size={14} /> Approve</button>}
                            {p.review && <button type="button" onClick={() => { setViewing(null); setRework(t); }} className={ghostBtn}><RotateCcw size={14} /> Rework</button>}
                            <button type="button" onClick={() => setViewing(null)} className={ghostBtn}>Close</button>
                        </FooterBar>
                    }>
                        <div className="flex flex-wrap items-center gap-2"><StChip map={TASK_ST} v={t.status} /><Chip tone={PRIORITY_TONE[t.priority] || "sky"}>{t.priority} priority</Chip>{isOverdue(t) && <Chip tone="rose">Overdue</Chip>}</div>
                        <div className="space-y-1.5"><div className="flex justify-between text-xs font-bold text-slate-700"><span>Progress</span><span className="font-mono">{t.progress || 0}%</span></div><Bar value={t.progress || 0} tone={t.status === "completed" ? "bg-emerald-500" : "bg-indigo-500"} /></div>
                        <Info rows={[["Assigned to", t.assignedTo?.name], ["Assigned by", t.assignedBy?.name], ["Start date", t.startDate ? dateText(t.startDate) : ""], ["Due date", t.dueDate ? dateText(t.dueDate) : ""], ["Estimated hours", t.estimatedHours ?? ""], ["Completed on", t.completedAt ? dateText(t.completedAt) : ""]]} />
                        {t.description && <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/70 border border-slate-200 rounded-2xl p-3.5 whitespace-pre-line break-words">{t.description}</p>}
                        {t.review?.comment && <p className="text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-2xl p-3.5 break-words"><b>{t.status === "completed" ? "Review note" : "Rework requested"}:</b> {t.review.comment}</p>}
                        {t.submission?.note && (
                            <div className="text-xs text-violet-800 bg-violet-50 border border-violet-100 rounded-2xl p-3.5 break-words">
                                <b>Submitted work:</b> {t.submission.note}
                                {t.submission.link && <> <a href={t.submission.link} target="_blank" rel="noreferrer" className="underline font-semibold">Open link</a></>}
                            </div>
                        )}
                        {t.updates?.length > 0 && (
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Daily updates</p>
                                <ul className="space-y-2">{[...t.updates].reverse().slice(0, 8).map((u) => <li key={u.date} className="flex items-start gap-3 text-xs"><Chip tone="indigo">{u.progress}%</Chip><div className="min-w-0"><p className="text-slate-700 font-medium break-words">{u.note}</p><p className="text-[11px] text-slate-400">{u.date}</p></div></li>)}</ul>
                            </div>
                        )}
                    </Box>
                );
            })()}

            {progress && <ProgressModal task={progress} onClose={() => setProgress(null)} onDone={refresh} />}
            {submit && <SubmitModal task={submit} onClose={() => setSubmit(null)} onDone={refresh} />}
            {rework && <ReasonModal title="Send back for rework" subtitle={rework.title} confirm="Send back" onClose={() => setRework(null)} onSubmit={(c) => call(() => api.put(`/tasks/${rework._id}/review`, { action: "rework", comment: c }), "Sent back for rework.")} />}
            {ask && <ConfirmDialog title={ask.title} text={ask.text} label={ask.label} danger={ask.danger} onConfirm={ask.run} onClose={() => setAsk(null)} />}
        </div>
    );
}

