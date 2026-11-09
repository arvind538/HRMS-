"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Download, Eye, FileText, Layers, Mail, UserCheck, Users, XCircle } from "lucide-react";
import { toast } from "react-toastify";
import api from "@/lib/api";
import { ErrorBanner, StatCard } from "@/components/payroll/ui";
import { ListSkeleton, PageHeader, SearchBox, primaryBtn } from "@/components/payroll/common";
import { Chip, DOT, ReasonModal, RowMenu, STAGE, TONE, errMsg, openResume } from "@/components/recruitment/rui";
import CandidateDetail from "@/components/recruitment/CandidateDetail";

export default function RecruitmentPipelinePage() {
  const [board, setBoard] = useState({});
  const [positions, setPositions] = useState([]);
  const [pos, setPos] = useState("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [viewing, setViewing] = useState(null);
  const [rejecting, setRejecting] = useState(null);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/recruitment/pipeline", { params: pos !== "ALL" ? { jobPosition: pos } : {} });
      setBoard(data || {});
    } catch (err) {
      setError(await errMsg(err, "Unable to load the pipeline."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [pos]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.get("/recruitment/positions").then(({ data }) => setPositions(Array.isArray(data) ? data : [])).catch(() => { }); }, []);

  const total = useMemo(() => Object.entries(board).filter(([k]) => k !== "rejected").reduce((s, [, v]) => s + v.length, 0), [board]);

  const setStage = async (c, status, note = "") => {
    try {
      await api.put(`/recruitment/candidates/${c._id}/status`, { status, note });
      toast.success(status === "rejected" ? "Candidate rejected." : "Candidate shortlisted.");
      setViewing(null);
      load({ silent: true });
    } catch (err) {
      toast.error(await errMsg(err, "Unable to change the stage."));
      throw err;
    }
  };

  const canShortlist = (c) => ["applied", "rejected"].includes(c.status);
  const canReject = (c) => ["applied", "shortlisted", "interview-scheduled", "interviewed"].includes(c.status);

  const menuFor = (c) => [
    { label: "View profile", icon: Eye, run: () => setViewing(c) },
    { label: c.status === "rejected" ? "Reopen and shortlist" : "Shortlist", icon: CheckCircle2, run: () => setStage(c, "shortlisted").catch(() => { }), hidden: !canShortlist(c) },
    { label: "Reject", icon: XCircle, run: () => setRejecting(c), hidden: !canReject(c), danger: true },
    { label: "View resume", icon: FileText, run: () => openResume(c), hidden: !c.hasResume && !c.resumeUrl },
    { label: "Download resume", icon: Download, run: () => openResume(c, true), hidden: !c.hasResume },
  ];

  const q = search.trim().toLowerCase();
  const selectCls = "px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:border-indigo-500 cursor-pointer max-w-full";

  return (
    <div className="w-full max-w-[1500px] mx-auto px-3 sm:px-4 py-4 space-y-4 antialiased pb-16">
      <PageHeader icon={Layers} title="Recruitment Pipeline" subtitle="Every candidate, stage by stage." onRefresh={() => load({ silent: true })} busy={loading || refreshing} />

      {!loading && !error && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <StatCard icon={Users} tone="indigo" label="Active candidates" value={total} />
          <StatCard icon={UserCheck} tone="emerald" label="Hired" value={board.hired?.length || 0} />
          <div className="col-span-2 lg:col-span-1"><StatCard icon={XCircle} tone="violet" label="Rejected" value={board.rejected?.length || 0} /></div>
        </div>
      )}

      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/70 shadow-sm">
        <div className="flex flex-wrap items-center gap-2.5">
          <SearchBox value={search} onChange={setSearch} placeholder="Search candidate, email or role" />
          <select value={pos} onChange={(e) => setPos(e.target.value)} className={selectCls}>
            <option value="ALL">All positions</option>
            {positions.map((p) => <option key={p._id} value={p._id}>{p.title}</option>)}
          </select>
        </div>
      </div>

      <ErrorBanner message={error} onRetry={() => load()} />

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden"><ListSkeleton /></div>
      ) : (
        <div className="overflow-x-auto pb-4 -mx-3 px-3 sm:mx-0 sm:px-0 snap-x snap-mandatory sm:snap-none">
          <div className="flex gap-3.5 items-start w-max">
            {Object.entries(STAGE).map(([key, s]) => {
              const items = (board[key] || []).filter((c) => !q || `${c.name} ${c.email} ${c.jobPosition?.title || ""}`.toLowerCase().includes(q));
              return (
                <section key={key} className="snap-start w-[82vw] max-w-[310px] sm:w-72 shrink-0 bg-slate-50/80 border border-slate-200/90 rounded-2xl p-2.5">
                  <div className={`px-3.5 py-2.5 rounded-xl border flex items-center justify-between mb-3 ${TONE[s.tone]}`}>
                    <span className="inline-flex items-center gap-2 text-xs font-extrabold"><span className={`w-2 h-2 rounded-full ${DOT[s.tone]}`} />{s.label}</span>
                    <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-lg bg-white/70">{items.length}</span>
                  </div>

                  <div className="space-y-2.5 max-h-[62vh] overflow-y-auto overscroll-contain pr-0.5">
                    {items.length === 0 ? (
                      <div className="h-32 flex flex-col items-center justify-center border border-dashed border-slate-300/80 rounded-xl bg-white/60 text-center px-3">
                        <UserCheck size={20} className="text-slate-300 mb-1" />
                        <p className="text-[11px] text-slate-400 font-bold">No candidates</p>
                      </div>
                    ) : items.map((c) => (
                      <div key={c._id} onClick={() => setViewing(c)} className="bg-white p-3.5 rounded-xl border border-slate-200/80 hover:border-indigo-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
                        <div className="flex items-start gap-2.5">
                          <div className="w-9 h-9 shrink-0 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center font-extrabold text-xs">{c.name?.charAt(0)?.toUpperCase() || "C"}</div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-extrabold text-slate-900 truncate">{c.name}</p>
                            <p className="text-[11px] font-semibold text-slate-500 truncate">{c.jobPosition?.title || "Not assigned"}</p>
                          </div>
                          <div onClick={(e) => e.stopPropagation()}><RowMenu items={menuFor(c)} /></div>
                        </div>
                        {c.email && <p className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px] font-medium text-slate-400 truncate"><Mail size={11} className="shrink-0" /><span className="truncate">{c.email}</span></p>}
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      )}

      {viewing && (
        <CandidateDetail c={viewing} onClose={() => setViewing(null)}>
          {canShortlist(viewing) && <button type="button" onClick={() => setStage(viewing, "shortlisted").catch(() => { })} className={primaryBtn}><CheckCircle2 size={14} /> {viewing.status === "rejected" ? "Reopen and shortlist" : "Shortlist"}</button>}
          {canReject(viewing) && <button type="button" onClick={() => { setRejecting(viewing); setViewing(null); }} className="inline-flex items-center justify-center gap-2 px-5 py-3 sm:py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition cursor-pointer"><XCircle size={14} /> Reject</button>}
        </CandidateDetail>
      )}

      {rejecting && <ReasonModal title="Reject candidate" subtitle={rejecting.name} confirm="Reject" onClose={() => setRejecting(null)} onSubmit={(note) => setStage(rejecting, "rejected", note)} />}
    </div>
  );
}

