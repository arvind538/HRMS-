"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, CheckCircle2, Eye, MessageSquareText, Star } from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { ErrorBanner, StatCard } from "@/components/payroll/ui";
import { EmptyBox, FilterTabs, ListSkeleton, PageHeader, SearchBox, primaryBtn } from "@/components/payroll/common";
import { Box, Chip, FooterBar, Info, RowMenu, errMsg, ghostBtn, idOf } from "@/components/recruitment/rui";
import FeedbackChat, { RECO, Stars } from "@/components/recruitment/FeedbackChat";

const when = (v) => (v ? new Date(v).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—");
const ROUND = { screening: "Screening", technical: "Technical", hr: "HR round", final: "Final" };
const ST = { scheduled: { label: "Awaiting feedback", tone: "amber" }, completed: { label: "Completed", tone: "emerald" }, cancelled: { label: "Cancelled", tone: "rose" }, "no-show": { label: "No show", tone: "slate" } };

export default function InterviewFeedbackPage() {
  const { user } = useAuth();
  const isStaff = ["admin", "hr"].includes(String(user?.role || "").toLowerCase());
  const myEmp = idOf(user?.employee);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("scheduled");
  const [viewing, setViewing] = useState(null);
  const [chat, setChat] = useState(null);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/recruitment/interviews");
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(await errMsg(err, "Unable to load the interviews."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const canGive = (r) => r.status === "scheduled" && (isStaff || (myEmp && idOf(r.interviewer) === myEmp));

  const counts = useMemo(() => ({ scheduled: rows.filter((r) => r.status === "scheduled").length, completed: rows.filter((r) => r.status === "completed").length, all: rows.length }), [rows]);
  const avg = useMemo(() => {
    const rated = rows.filter((r) => r.rating);
    return rated.length ? (rated.reduce((s, r) => s + r.rating, 0) / rated.length).toFixed(1) : "—";
  }, [rows]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => (tab === "all" || r.status === tab) && (!q || `${r.candidate?.name || ""} ${r.interviewer?.name || ""} ${r.candidate?.jobPosition?.title || ""}`.toLowerCase().includes(q)));
  }, [rows, tab, search]);

  const overdue = (r) => r.status === "scheduled" && new Date(r.scheduledAt) < new Date();

  const menuFor = (r) => [
    { label: r.status === "completed" ? "View feedback" : "View details", icon: Eye, run: () => setViewing(r) },
    { label: "Give feedback", icon: MessageSquareText, run: () => setChat(r), hidden: !canGive(r) },
  ];

  const result = (r) => r.status === "completed"
    ? <div className="space-y-1"><Stars value={r.rating} />{r.recommendation && <div><Chip tone={RECO[r.recommendation]?.tone}>{RECO[r.recommendation]?.label}</Chip></div>}</div>
    : <span className="text-slate-300">—</span>;
  const stat = (r) => <div className="flex flex-wrap items-center gap-1.5"><Chip tone={ST[r.status]?.tone} dot>{ST[r.status]?.label}</Chip>{overdue(r) && <Chip tone="rose">Overdue</Chip>}</div>;
  const mark = (r) => <div className="w-10 h-10 shrink-0 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center font-extrabold text-sm">{r.candidate?.name?.charAt(0)?.toUpperCase() || "C"}</div>;

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 py-4 space-y-4 antialiased pb-16">
      <PageHeader icon={MessageSquareText} title="Interview Feedback" subtitle="Give feedback on interviews you took, or read earlier feedback." onRefresh={() => load({ silent: true })} busy={loading || refreshing} />

      {!loading && !error && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <StatCard icon={CalendarClock} tone="indigo" label="Awaiting feedback" value={counts.scheduled} />
          <StatCard icon={CheckCircle2} tone="emerald" label="Completed" value={counts.completed} />
          <div className="col-span-2 lg:col-span-1"><StatCard icon={Star} tone="violet" label="Average rating" value={avg} /></div>
        </div>
      )}

      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/70 shadow-sm space-y-3">
        <SearchBox value={search} onChange={setSearch} placeholder="Search candidate, interviewer or role" />
        <FilterTabs tabs={[["scheduled", "Awaiting", counts.scheduled], ["completed", "Completed", counts.completed], ["all", "All", counts.all]]} value={tab} onChange={setTab} />
      </div>

      <ErrorBanner message={error} onRetry={() => load()} />

      <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
        {loading ? <ListSkeleton /> : visible.length === 0 ? (
          <EmptyBox icon={MessageSquareText} title={tab === "scheduled" ? "No feedback is pending" : "Nothing here yet"} text={tab === "scheduled" ? "Interviews that need your feedback appear here." : "Try another tab or keyword."} />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 sm:p-4 lg:hidden">
              {visible.map((r) => (
                <div key={r._id} onClick={() => setViewing(r)} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 space-y-3 hover:border-indigo-200 hover:shadow-sm transition cursor-pointer">
                  <div className="flex items-start gap-3">
                    {mark(r)}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-900 break-words">{r.candidate?.name || "Candidate"}</p>
                      <p className="text-[11px] text-slate-400">{ROUND[r.round]} • {when(r.scheduledAt)}</p>
                    </div>
                    <div onClick={(e) => e.stopPropagation()}><RowMenu items={menuFor(r)} /></div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">{stat(r)}{r.status === "completed" && <Stars value={r.rating} />}</div>
                  {canGive(r) && <button type="button" onClick={(e) => { e.stopPropagation(); setChat(r); }} className={`${primaryBtn} w-full`}><MessageSquareText size={14} /> Give feedback</button>}
                </div>
              ))}
            </div>

            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                  <tr>
                    <th className="px-5 py-3.5">Candidate</th>
                    <th className="px-4 py-3.5">Round</th>
                    <th className="px-4 py-3.5">Interview time</th>
                    <th className="px-4 py-3.5">Interviewer</th>
                    <th className="px-4 py-3.5">Result</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5 text-center w-20">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visible.map((r) => (
                    <tr key={r._id} onClick={() => setViewing(r)} className="hover:bg-indigo-50/40 transition-colors cursor-pointer">
                      <td className="px-5 py-3 align-middle">
                        <div className="flex items-center gap-3 min-w-0">
                          {mark(r)}
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 text-sm truncate max-w-[180px]">{r.candidate?.name || "Candidate"}</p>
                            <p className="text-[11px] text-slate-400 truncate max-w-[180px]">{r.candidate?.jobPosition?.title || "—"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-middle whitespace-nowrap">{ROUND[r.round]}</td>
                      <td className="px-4 py-3 align-middle whitespace-nowrap font-medium text-slate-700">{when(r.scheduledAt)}</td>
                      <td className="px-4 py-3 align-middle whitespace-nowrap">{r.interviewer?.name || "—"}</td>
                      <td className="px-4 py-3 align-middle">{result(r)}</td>
                      <td className="px-4 py-3 align-middle whitespace-nowrap">{stat(r)}</td>
                      <td className="px-4 py-3 align-middle text-center" onClick={(e) => e.stopPropagation()}><RowMenu items={menuFor(r)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {viewing && (
        <Box title={viewing.candidate?.name || "Interview"} subtitle={`${ROUND[viewing.round]} round • ${when(viewing.scheduledAt)}`} onClose={() => setViewing(null)} footer={
          <FooterBar>
            {canGive(viewing) && <button type="button" onClick={() => { const r = viewing; setViewing(null); setChat(r); }} className={primaryBtn}><MessageSquareText size={14} /> Give feedback</button>}
            <button type="button" onClick={() => setViewing(null)} className={ghostBtn}>Close</button>
          </FooterBar>
        }>
          <div className="flex flex-wrap items-center gap-2">{stat(viewing)}</div>
          <Info rows={[["Applied for", viewing.candidate?.jobPosition?.title], ["Interviewer", viewing.interviewer?.name], ["Interview time", when(viewing.scheduledAt)], ["Feedback given", viewing.feedbackAt ? when(viewing.feedbackAt) : ""]]} />
          {viewing.status === "completed" ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-2.5">
              <div className="flex flex-wrap items-center gap-2"><Stars value={viewing.rating} size={16} />{viewing.recommendation && <Chip tone={RECO[viewing.recommendation]?.tone}>{RECO[viewing.recommendation]?.label}</Chip>}</div>
              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line break-words">{viewing.feedback}</p>
            </div>
          ) : (
            <p className="text-xs text-slate-500 bg-slate-50/70 border border-slate-200 rounded-2xl p-3.5">{viewing.status === "scheduled" ? "Feedback has not been given yet." : "This interview was not held, so there is no feedback."}</p>
          )}
        </Box>
      )}

      {chat && <FeedbackChat interview={chat} onClose={() => setChat(null)} onDone={() => load({ silent: true })} />}
    </div>
  );
}
