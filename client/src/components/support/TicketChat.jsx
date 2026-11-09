"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Lock, RotateCcw, Send, Settings2, X } from "lucide-react";
import { toast } from "react-toastify";
import api from "@/lib/api";
import { ConfirmDialog, Sheet, inputClass } from "@/components/payroll/ui";
import { primaryBtn } from "@/components/payroll/common";
import { Chip, ReasonModal, StatusPicker, errMsg } from "@/components/recruitment/rui";
import { StarPicker } from "@/components/performance/pui";
import { DONE, PRIORITIES, PRIORITY_UI, QUICK, ROLE_LABEL, SLA, STATUSES, STATUS_UI, clock, dayKey, dayLabel, when } from "./supportConfig";

const statusOptions = STATUSES.map((value) => ({ value, ...STATUS_UI[value] }));

export default function TicketChat({ id, staff, contacts = [], onClose }) {
    const [ticket, setTicket] = useState(null);
    const [msgs, setMsgs] = useState([]);
    const [state, setState] = useState("loading");
    const [text, setText] = useState("");
    const [note, setNote] = useState(false);
    const [sending, setSending] = useState(false);
    const [manage, setManage] = useState(false);
    const [dialog, setDialog] = useState(null);
    const [ask, setAsk] = useState(null);
    const [stars, setStars] = useState(0);
    const [feedback, setFeedback] = useState("");
    const last = useRef("");
    const box = useRef(null);
    const stick = useRef(true);

    const merge = useCallback((incoming) => {
        if (!incoming?.length) return;
        setMsgs((prev) => {
            const seen = new Set(prev.map((m) => m._id));
            const add = incoming.filter((m) => !seen.has(m._id));
            return add.length ? [...prev, ...add] : prev;
        });
    }, []);

    useEffect(() => { last.current = msgs.length ? msgs[msgs.length - 1]._id : ""; }, [msgs]);

    /* a new message is fetched with "after", so only the new ones travel */
    const pull = useCallback(async (first = false) => {
        try {
            const { data } = await api.get(`/support/tickets/${id}`, { params: last.current ? { after: last.current } : {} });
            setTicket(data.ticket);
            merge(data.messages);
            if (first) setState("ready");
        } catch (err) {
            if (first) setState(err?.response?.status === 403 ? "denied" : "error");
        }
    }, [id, merge]);

    useEffect(() => {
        pull(true);
        const t = setInterval(() => { if (document.visibilityState === "visible") pull(); }, 5000);
        return () => clearInterval(t);
    }, [pull]);

    useEffect(() => {
        if (stick.current) box.current?.scrollTo({ top: box.current.scrollHeight, behavior: "smooth" });
    }, [msgs, state]);

    const onScroll = () => {
        const el = box.current;
        if (el) stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    };

    const mine = Boolean(ticket?.isMine);
    const handler = staff && !mine;
    const done = ticket && DONE.includes(ticket.status);
    const closed = ticket?.status === "Closed";

    const act = async (method, path, body, ok) => {
        try {
            const { data } = await api[method](`/support/tickets/${id}${path}`, body);
            setTicket(data.ticket);
            pull();
            if (ok) toast.success(ok);
        } catch (err) {
            toast.error(await errMsg(err, "Unable to do this."));
            throw err;
        }
    };

    const send = async (e) => {
        e?.preventDefault();
        const t = text.trim();
        if (!t || sending) return;
        setSending(true);
        try {
            const { data } = await api.post(`/support/tickets/${id}/messages`, { text: t, internal: note });
            setText("");
            stick.current = true;
            merge([data.message]);
            setTicket(data.ticket);
        } catch (err) {
            toast.error(await errMsg(err, "Unable to send the message."));
        } finally {
            setSending(false);
        }
    };

    const changeStatus = (v) => (v === "Resolved" ? setDialog("resolve") : act("put", "/status", { status: v }, `Marked as ${STATUS_UI[v].label.toLowerCase()}.`).catch(() => { }));

    const submitRating = () => act("post", "/rating", { rating: stars, feedback }, "Thank you for your feedback.").catch(() => { });

    const bubble = (m) => {
        if (m.system) {
            return <div key={m._id} className="flex justify-center"><span className="px-3 py-1 rounded-full bg-slate-100 text-[11px] font-semibold text-slate-500 text-center">{m.text} · {clock(m.createdAt)}</span></div>;
        }
        const right = m.mine;
        const tone = m.internal ? "bg-amber-50 border border-amber-200 text-amber-900" : right ? "bg-indigo-600 text-white" : m.side === "staff" ? "bg-slate-100 text-slate-800" : "bg-white border border-slate-200 text-slate-800";
        return (
            <div key={m._id} className={`flex ${right ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] sm:max-w-[75%] ${right ? "items-end" : "items-start"} flex flex-col gap-1`}>
                    {!right && <p className="px-1 text-[11px] font-bold text-slate-500">{m.sender?.name || "User"} <span className="font-semibold text-slate-400">· {ROLE_LABEL[m.sender?.role] || m.sender?.role}</span></p>}
                    <div className={`px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed whitespace-pre-line break-words ${tone} ${right ? "rounded-br-md" : "rounded-bl-md"}`}>
                        {m.internal && <p className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-amber-700 mb-1"><Lock size={10} /> Internal note, the employee cannot see this</p>}
                        {m.text}
                    </div>
                    <p className="px-1 text-[10px] font-medium text-slate-400">{clock(m.createdAt)}</p>
                </div>
            </div>
        );
    };

    const rows = [];
    let day = "";
    msgs.forEach((m) => {
        const k = dayKey(m.createdAt);
        if (k !== day) {
            day = k;
            rows.push(<div key={`d-${k}`} className="flex justify-center"><span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{dayLabel(m.createdAt)}</span></div>);
        }
        rows.push(bubble(m));
    });

    const sel = `${inputClass} border-slate-200 focus:border-indigo-500 cursor-pointer py-2.5`;

    return (
        <Sheet onClose={onClose} size="max-w-2xl">
            {/* header */}
            <div className="flex items-start justify-between gap-3 px-4 sm:px-6 py-3.5 border-b border-slate-100 bg-slate-50/70">
                <div className="min-w-0">
                    <p className="text-[11px] font-mono font-bold text-slate-400">{ticket?.ticketNumber || "Ticket"}</p>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 break-words">{ticket?.title || "Loading..."}</h3>
                    {ticket && (
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                            <Chip tone={STATUS_UI[ticket.status]?.tone} dot>{STATUS_UI[ticket.status]?.label}</Chip>
                            <Chip tone={PRIORITY_UI[ticket.priority]}>{ticket.priority}</Chip>
                            <Chip tone="slate">{ticket.category}</Chip>
                            {ticket.isOverdue && <Chip tone="rose">Overdue</Chip>}
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    {handler && <button type="button" onClick={() => setManage((v) => !v)} aria-label="Manage ticket" className={`p-2 rounded-xl transition cursor-pointer ${manage ? "bg-indigo-100 text-indigo-700" : "text-slate-400 hover:text-indigo-600 hover:bg-slate-200/60"}`}><Settings2 size={18} /></button>}
                    <button type="button" onClick={onClose} aria-label="Close" className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"><X size={18} /></button>
                </div>
            </div>

            {state === "loading" && <div className="flex-1 min-h-[50dvh] flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" size={30} /></div>}
            {(state === "error" || state === "denied") && <p className="flex-1 min-h-[40dvh] flex items-center justify-center px-6 text-center text-sm font-semibold text-slate-500">{state === "denied" ? "You cannot open this ticket." : "Unable to open this ticket. Please try again."}</p>}

            {state === "ready" && ticket && (
                <>
                    {/* HR panel */}
                    {handler && manage && (
                        <div className="px-4 sm:px-6 py-3 border-b border-slate-100 bg-white grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in duration-200">
                            <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Status</p><StatusPicker value={ticket.status} options={statusOptions} onChange={changeStatus} /></div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Assigned to</p>
                                <select value={ticket.assignedTo?._id || ""} disabled={done} onChange={(e) => act("put", "/assign", { assignedTo: e.target.value || null }, "Assignment updated.").catch(() => { })} className={sel}>
                                    <option value="">Not assigned</option>
                                    {contacts.filter((c) => c._id !== ticket.requester._id).map((c) => <option key={c._id} value={c._id}>{c.name} ({ROLE_LABEL[c.role]})</option>)}
                                </select>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Priority</p>
                                <select value={ticket.priority} onChange={(e) => act("put", "", { priority: e.target.value }, "Priority updated.").catch(() => { })} className={sel}>
                                    {PRIORITIES.map((p) => <option key={p} value={p}>{p} (reply in {SLA[p]})</option>)}
                                </select>
                            </div>
                        </div>
                    )}

                    {/* conversation */}
                    <div ref={box} onScroll={onScroll} className="flex-1 min-h-[42dvh] overflow-y-auto overscroll-contain bg-slate-50/60 px-3 sm:px-5 py-4 space-y-3">
                        <div className="rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm">
                            <p className="text-[11px] font-bold text-slate-500">{ticket.requester.name} <span className="text-slate-400 font-semibold">· {ROLE_LABEL[ticket.requester.role] || ticket.requester.role}{ticket.requester.department ? ` · ${ticket.requester.department}` : ""}</span></p>
                            <p className="mt-1.5 text-[13px] text-slate-800 leading-relaxed whitespace-pre-line break-words">{ticket.description}</p>
                            <p className="mt-2 text-[10px] font-medium text-slate-400">Raised {when(ticket.createdAt)} · reply expected within {SLA[ticket.priority]}{ticket.assignedTo ? ` · handled by ${ticket.assignedTo.name}` : " · not assigned yet"}</p>
                        </div>
                        {rows}
                    </div>

                    {/* bottom area */}
                    <div className="shrink-0 border-t border-slate-100 bg-white">
                        {done && ticket.resolutionNotes && (
                            <p className="px-4 sm:px-6 pt-3 text-xs text-emerald-800"><b>How it was solved:</b> {ticket.resolutionNotes}</p>
                        )}

                        {done && mine && !ticket.rating && (
                            <div className="mx-4 sm:mx-6 mt-3 rounded-2xl border border-slate-200 p-3 space-y-2.5">
                                <p className="text-xs font-bold text-slate-800">How was the support?</p>
                                <StarPicker value={stars} onChange={setStars} />
                                <div className="flex gap-2">
                                    <input value={feedback} maxLength={300} onChange={(e) => setFeedback(e.target.value)} placeholder="Say something (optional)" className={`${inputClass} border-slate-200 focus:border-indigo-500 py-2`} />
                                    <button type="button" disabled={!stars} onClick={submitRating} className={`${primaryBtn} disabled:opacity-40`}>Send</button>
                                </div>
                            </div>
                        )}
                        {done && mine && ticket.rating > 0 && <p className="px-4 sm:px-6 pt-3 text-xs font-semibold text-slate-500">You rated this support {ticket.rating}/5. Thank you.</p>}

                        {mine && !closed && (
                            <div className="px-4 sm:px-6 pt-3 flex flex-wrap gap-2">
                                <button type="button" onClick={() => setAsk({ title: "Close this ticket?", text: "Close it only if your problem is solved. You can reopen it for 7 days.", label: "Close ticket", run: () => act("put", "/close", undefined, "Ticket closed.").catch(() => { }) })} className="px-3 py-1.5 rounded-full border border-slate-200 text-[11px] font-bold text-slate-600 hover:bg-slate-50 cursor-pointer">Problem solved, close ticket</button>
                            </div>
                        )}

                        {closed ? (
                            <div className="px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
                                <p className="text-xs font-semibold text-slate-500">This ticket is closed.</p>
                                {ticket.canReopen && <button type="button" onClick={() => setDialog("reopen")} className={primaryBtn}><RotateCcw size={14} /> Reopen</button>}
                            </div>
                        ) : (
                            <form onSubmit={send} className="px-3 sm:px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] space-y-2">
                                {handler && (
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        {QUICK.map((q) => <button key={q} type="button" onClick={() => setText((t) => (t ? `${t} ${q}` : q))} className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-[11px] font-semibold text-slate-600 transition cursor-pointer">{q}</button>)}
                                        <label className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-700 cursor-pointer"><input type="checkbox" checked={note} onChange={(e) => setNote(e.target.checked)} className="rounded border-slate-300 text-amber-600" /><Lock size={11} /> Internal note</label>
                                    </div>
                                )}
                                <div className="flex items-end gap-2">
                                    <textarea rows={1} value={text} maxLength={2000} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder={note ? "Write a note only HR can see..." : done && mine ? "Reply to reopen this ticket..." : "Type your message..."} className={`flex-1 resize-none max-h-32 px-4 py-2.5 rounded-2xl border bg-slate-50 text-base sm:text-sm text-slate-800 outline-none focus:bg-white transition ${note ? "border-amber-300 focus:border-amber-500" : "border-slate-200 focus:border-indigo-500"}`} />
                                    <button type="submit" disabled={sending || !text.trim()} aria-label="Send" className="w-11 h-11 shrink-0 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white inline-flex items-center justify-center transition active:scale-95 disabled:opacity-40 cursor-pointer disabled:cursor-default">{sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}</button>
                                </div>
                            </form>
                        )}
                    </div>
                </>
            )}

            {dialog === "resolve" && <ReasonModal title="Mark as resolved" subtitle="Write how the problem was solved" confirm="Resolve" onClose={() => setDialog(null)} onSubmit={(t) => act("put", "/status", { status: "Resolved", resolutionNotes: t }, "Marked as resolved.")} />}
            {dialog === "reopen" && <ReasonModal title="Reopen ticket" subtitle="Tell us what is still not working" confirm="Reopen" onClose={() => setDialog(null)} onSubmit={(t) => act("put", "/reopen", { text: t }, "Ticket reopened.")} />}
            {ask && <ConfirmDialog title={ask.title} text={ask.text} label={ask.label} onConfirm={ask.run} onClose={() => setAsk(null)} />}
        </Sheet>
    );
}