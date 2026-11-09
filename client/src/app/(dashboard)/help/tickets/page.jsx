"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, Clock, Headphones, Inbox, MessageSquare, Plus, Trash2, UserCheck, UserX, XCircle } from "lucide-react";
import { toast } from "react-toastify";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { ConfirmDialog, ErrorBanner, FieldError, Label, dateText, fieldBorder, inputClass } from "@/components/payroll/ui";
import { PageHeader, primaryBtn } from "@/components/payroll/common";
import { Box, Chip, FormFooter, errMsg } from "@/components/recruitment/rui";
import { DataPanel, Person, Stats, StChip, Toolbar, roleOf, selectCls, useApi } from "@/components/performance/pui";
import TicketChat from "@/components/support/TicketChat";
import { CATEGORIES, DONE, PRIORITIES, PRIORITY_UI, SLA, STATUS_UI, ago } from "@/components/support/supportConfig";

const blank = () => ({ title: "", category: "Technical Issue", priority: "Medium", description: "" });
const isDone = (t) => DONE.includes(t.status);

function Tickets() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const role = roleOf(user);
  const staff = ["admin", "hr"].includes(role);
  const uid = String(user?._id || user?.id || "");

  const [scope, setScope] = useState(staff ? "all" : "mine");
  useEffect(() => { setScope(staff ? "all" : "mine"); }, [staff]);

  const { data, loading, refreshing, error, load } = useApi("/support/tickets", { scope });
  const { data: sum, load: loadSum } = useApi("/support/summary", { scope });
  const { data: con } = useApi("/support/contacts");
  const rows = data?.tickets || [];
  const contacts = con?.contacts || [];
  const s = sum || {};

  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [pri, setPri] = useState("ALL");
  const [cat, setCat] = useState("ALL");
  const [who, setWho] = useState("ALL");
  const [openId, setOpenId] = useState(params.get("ticket") || "");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(blank());
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [ask, setAsk] = useState(null);

  const refresh = () => { load({ silent: true }); loadSum({ silent: true }); };

  /* the list stays fresh by itself */
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === "visible" && !openId) refresh(); }, 30000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId, scope]);

  const closeChat = () => {
    setOpenId("");
    if (params.get("ticket")) router.replace("/help/tickets");
    refresh();
  };

  const counts = useMemo(() => ({
    all: rows.length,
    active: rows.filter((t) => !isDone(t)).length,
    waiting: rows.filter((t) => t.status === "Waiting for Employee").length,
    done: rows.filter(isDone).length,
    unread: rows.filter((t) => t.unread > 0).length,
  }), [rows]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((t) => {
      if (tab === "active" && isDone(t)) return false;
      if (tab === "waiting" && t.status !== "Waiting for Employee") return false;
      if (tab === "done" && !isDone(t)) return false;
      if (tab === "unread" && !(t.unread > 0)) return false;
      if (pri !== "ALL" && t.priority !== pri) return false;
      if (cat !== "ALL" && t.category !== cat) return false;
      if (who === "me" && t.assignedTo?._id !== uid) return false;
      if (who === "none" && t.assignedTo) return false;
      return !q || `${t.title} ${t.ticketNumber} ${t.requester?.name || ""}`.toLowerCase().includes(q);
    });
  }, [rows, tab, pri, cat, who, search, uid]);

  const set = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => (p[k] ? { ...p, [k]: undefined } : p));
  };

  const create = async (e) => {
    e.preventDefault();
    if (saving) return;
    const next = {};
    if (form.title.trim().length < 5) next.title = "Title must be at least 5 characters.";
    if (form.description.trim().length < 10) next.description = "Please describe the problem in at least 10 characters.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      const { data: res } = await api.post("/support/tickets", { ...form, title: form.title.trim(), description: form.description.trim() });
      toast.success(`Ticket ${res.ticket.ticketNumber} created.`);
      setModal(false);
      setForm(blank());
      refresh();
      setOpenId(res.ticket._id);
    } catch (err) {
      toast.error(await errMsg(err, "Unable to create the ticket."));
    } finally {
      setSaving(false);
    }
  };

  const assignMe = async (t) => {
    try {
      await api.put(`/support/tickets/${t._id}/assign`, { assignedTo: uid });
      toast.success("Assigned to you.");
      refresh();
    } catch (err) {
      toast.error(await errMsg(err, "Unable to assign."));
    }
  };

  const closeIt = (t) => setAsk({
    title: "Close this ticket?", text: `${t.ticketNumber}. Close it only if your problem is solved.`, label: "Close ticket",
    run: async () => { try { await api.put(`/support/tickets/${t._id}/close`); toast.success("Ticket closed."); refresh(); } catch (err) { toast.error(await errMsg(err, "Unable to close.")); } },
  });
  const remove = (t) => setAsk({
    title: "Delete this ticket?", text: `${t.ticketNumber} and its whole chat will be deleted. This cannot be undone.`, label: "Delete", danger: true,
    run: async () => { try { await api.delete(`/support/tickets/${t._id}`); toast.success("Ticket deleted."); refresh(); } catch (err) { toast.error(await errMsg(err, "Unable to delete.")); } },
  });

  const menu = (t) => [
    { label: "Open chat", icon: MessageSquare, run: () => setOpenId(t._id) },
    { label: "Assign to me", icon: UserCheck, run: () => assignMe(t), hidden: !staff || t.isMine || isDone(t) || t.assignedTo?._id === uid },
    { label: "Close ticket", icon: XCircle, run: () => closeIt(t), hidden: !t.isMine || t.status === "Closed" },
    { label: "Delete", icon: Trash2, run: () => remove(t), hidden: role !== "admin", danger: true },
  ];

  const title = (t) => (
    <div className="min-w-0">
      <p className="flex items-center gap-2 font-semibold text-slate-900 text-sm truncate max-w-[280px]">{t.unread > 0 && <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" title="New reply" />}{t.title}</p>
      <p className="text-[11px] text-slate-400 truncate max-w-[280px]"><span className="font-mono">{t.ticketNumber}</span> · {t.lastMessagePreview || t.description}</p>
    </div>
  );
  const sla = (t) => (t.isOverdue ? <Chip tone="rose">Overdue</Chip> : null);

  const stats = staff
    ? [["Active", s.active || 0, Inbox, "indigo"], ["Not assigned", s.unassigned || 0, UserX, "violet"], ["Overdue", s.overdue || 0, AlertTriangle, "violet"], ["Resolved", s.resolved || 0, CheckCircle2, "emerald"]]
    : [["Active tickets", s.active || 0, Inbox, "indigo"], ["Waiting for you", s.waiting || 0, Clock, "violet"], ["Resolved", s.resolved || 0, CheckCircle2, "emerald"]];

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-3 py-4 space-y-3 antialiased pb-16">
      <PageHeader icon={Headphones} title="Help & Support" subtitle={staff ? "Answer tickets from employees and managers." : "Raise a problem and chat with HR until it is solved."} onRefresh={refresh} busy={loading || refreshing}>
        <button type="button" onClick={() => { setForm(blank()); setErrors({}); setModal(true); }} className={primaryBtn}><Plus size={16} /> New Ticket</button>
      </PageHeader>

      {!loading && !error && <Stats items={stats} />}

      <Toolbar search={search} onSearch={setSearch} placeholder="Search title, ticket number or name"
        tabs={[["all", "All", counts.all], ["active", "Active", counts.active], ["unread", "New replies", counts.unread], ["waiting", "Waiting for employee", counts.waiting], ["done", "Resolved / closed", counts.done]]} tab={tab} onTab={setTab}>
        {staff && (
          <select value={scope} onChange={(e) => setScope(e.target.value)} className={selectCls}>
            <option value="all">All tickets</option>
            <option value="mine">Raised by me</option>
          </select>
        )}
        {staff && scope === "all" && (
          <select value={who} onChange={(e) => setWho(e.target.value)} className={selectCls}>
            <option value="ALL">Anyone</option><option value="me">Assigned to me</option><option value="none">Not assigned</option>
          </select>
        )}
        <select value={pri} onChange={(e) => setPri(e.target.value)} className={selectCls}>
          <option value="ALL">All priorities</option>{PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={cat} onChange={(e) => setCat(e.target.value)} className={selectCls}>
          <option value="ALL">All categories</option>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </Toolbar>

      <ErrorBanner message={error} onRetry={() => load()} />

      <DataPanel
        loading={loading} rows={visible} icon={Headphones}
        empty={[rows.length ? "Nothing matches your search" : "No tickets yet", rows.length ? "Try another tab or filter." : "Face a problem? Click New Ticket and HR will reply here."]}
        onOpen={(t) => setOpenId(t._id)} menu={menu}
        cols={[
          { h: "Ticket", cell: title },
          ...(staff && scope === "all" ? [{ h: "Raised by", cell: (t) => <Person p={t.requester} /> }] : []),
          { h: "Category", cell: (t) => t.category },
          { h: "Priority", cell: (t) => <Chip tone={PRIORITY_UI[t.priority]}>{t.priority}</Chip> },
          { h: "Handled by", cell: (t) => t.assignedTo?.name || <span className="text-slate-300">Not assigned</span> },
          { h: "Last activity", cell: (t) => <div><p className="font-medium text-slate-700">{ago(t.lastMessageAt)}</p>{sla(t)}</div> },
          { h: "Status", cell: (t) => <StChip map={STATUS_UI} v={t.status} /> },
        ]}
        card={(t) => (
          <div className="space-y-2.5">
            <div>
              <p className="flex items-center gap-2 text-sm font-bold text-slate-900 break-words">{t.unread > 0 && <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />}{t.title}</p>
              <p className="text-[11px] text-slate-400 break-words"><span className="font-mono">{t.ticketNumber}</span>{staff && !t.isMine ? ` · ${t.requester?.name}` : ""} · {ago(t.lastMessageAt)}</p>
            </div>
            {t.lastMessagePreview && <p className="text-xs text-slate-500 line-clamp-2">{t.lastMessagePreview}</p>}
            <div className="flex flex-wrap items-center gap-2"><StChip map={STATUS_UI} v={t.status} /><Chip tone={PRIORITY_UI[t.priority]}>{t.priority}</Chip>{sla(t)}{t.messageCount > 0 && <Chip tone="slate"><MessageSquare size={11} /> {t.messageCount}</Chip>}</div>
          </div>
        )}
      />

      {modal && (
        <Box title="New support ticket" subtitle="Tell us the problem, HR will reply in the chat" onClose={() => setModal(false)} onSubmit={create} locked={saving} size="max-w-xl" footer={<FormFooter onCancel={() => setModal(false)} busy={saving} label="Submit ticket" />}>
          <div>
            <Label>Title</Label>
            <input value={form.title} maxLength={120} autoFocus onChange={(e) => set("title", e.target.value)} placeholder="e.g. My attendance is missing for 10 October" className={`${inputClass} ${fieldBorder(errors.title)}`} />
            <FieldError>{errors.title}</FieldError>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><Label>Category</Label><select value={form.category} onChange={(e) => set("category", e.target.value)} className={`${inputClass} border-slate-200 focus:border-indigo-500 cursor-pointer`}>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
            <div>
              <Label>Priority</Label>
              <select value={form.priority} onChange={(e) => set("priority", e.target.value)} className={`${inputClass} border-slate-200 focus:border-indigo-500 cursor-pointer`}>{PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}</select>
              <p className="text-[11px] text-slate-400 mt-1">We aim to reply within {SLA[form.priority]}.</p>
            </div>
          </div>
          <div>
            <Label>Describe the problem</Label>
            <textarea rows={5} value={form.description} maxLength={3000} onChange={(e) => set("description", e.target.value)} placeholder="What happened? Which page? What did you already try?" className={`${inputClass} resize-y ${fieldBorder(errors.description)}`} />
            <div className="flex justify-between"><FieldError>{errors.description}</FieldError><span className="ml-auto text-[10px] text-slate-400">{form.description.length}/3000</span></div>
          </div>
          <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">Do not write your password, OTP or full bank details here.</p>
        </Box>
      )}

      {openId && <TicketChat id={openId} staff={staff} contacts={contacts} onClose={closeChat} />}
      {ask && <ConfirmDialog title={ask.title} text={ask.text} label={ask.label} danger={ask.danger} onConfirm={ask.run} onClose={() => setAsk(null)} />}
    </div>
  );
}

export default function SupportTicketsPage() {
  return <Suspense fallback={null}><Tickets /></Suspense>;
}