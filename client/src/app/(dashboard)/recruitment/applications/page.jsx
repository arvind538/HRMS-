"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Download, Eye, FileText, Inbox, Mail, UserCheck, XCircle } from "lucide-react";
import { toast } from "react-toastify";
import api from "@/lib/api";
import { ErrorBanner, StatCard, dateText } from "@/components/payroll/ui";
import { EmptyBox, FilterTabs, ListSkeleton, PageHeader, SearchBox, primaryBtn } from "@/components/payroll/common";
import { Chip, ReasonModal, RowMenu, STAGE, errMsg, openResume } from "@/components/recruitment/rui";
import CandidateDetail from "@/components/recruitment/CandidateDetail";

const canShortlist = (c) => ["applied", "rejected"].includes(c.status);
const canReject = (c) => ["applied", "shortlisted", "interviewed", "interview-scheduled"].includes(c.status);

export default function JobApplicationsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("ALL");
  const [tab, setTab] = useState("applied");
  const [viewing, setViewing] = useState(null);
  const [rejecting, setRejecting] = useState(null);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/recruitment/candidates");
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(await errMsg(err, "Unable to load the applications."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => ({ all: rows.length, applied: rows.filter((c) => c.status === "applied").length, shortlisted: rows.filter((c) => c.status === "shortlisted").length, rejected: rows.filter((c) => c.status === "rejected").length }), [rows]);
  const roles = useMemo(() => [...new Set(rows.map((c) => c.jobPosition?.title).filter(Boolean))], [rows]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((c) => (tab === "all" || c.status === tab) && (role === "ALL" || c.jobPosition?.title === role) && (!q || `${c.name} ${c.email} ${c.phone || ""} ${c.jobPosition?.title || ""}`.toLowerCase().includes(q)));
  }, [rows, tab, role, search]);

  const setStage = async (c, status, note = "") => {
    try {
      const { data } = await api.put(`/recruitment/candidates/${c._id}/status`, { status, note });
      setRows((prev) => prev.map((x) => (x._id === c._id ? data : x)));
      setViewing((v) => (v && v._id === c._id ? data : v));
      toast.success(status === "shortlisted" ? "Candidate shortlisted." : "Application rejected.");
    } catch (err) {
      toast.error(await errMsg(err, "Unable to update the application."));
      throw err;
    }
  };

  const menuFor = (c) => [
    { label: "View profile", icon: Eye, run: () => setViewing(c) },
    { label: "Shortlist", icon: CheckCircle2, run: () => setStage(c, "shortlisted").catch(() => { }), hidden: !canShortlist(c) },
    { label: "Reject", icon: XCircle, run: () => setRejecting(c), hidden: !canReject(c), danger: true },
    { label: "View resume", icon: FileText, run: () => openResume(c), hidden: !c.hasResume && !c.resumeUrl },
    { label: "Download resume", icon: Download, run: () => openResume(c, true), hidden: !c.hasResume },
  ];

  const stage = (c) => { const s = STAGE[c.status] || STAGE.applied; return <Chip tone={s.tone} dot>{s.label}</Chip>; };
  const mark = (c) => <div className="w-10 h-10 shrink-0 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center font-extrabold text-sm">{c.name?.charAt(0)?.toUpperCase() || "C"}</div>;
  const selectCls = "px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:border-indigo-500 cursor-pointer max-w-full";

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 py-4 space-y-4 antialiased pb-16">
      <PageHeader icon={Inbox} title="Job Applications" subtitle="Review new applications, then shortlist or reject." onRefresh={() => load({ silent: true })} busy={loading || refreshing} />

      {!loading && !error && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <StatCard icon={Inbox} tone="indigo" label="New applications" value={counts.applied} />
          <StatCard icon={UserCheck} tone="emerald" label="Shortlisted" value={counts.shortlisted} />
          <div className="col-span-2 lg:col-span-1"><StatCard icon={XCircle} tone="violet" label="Rejected" value={counts.rejected} /></div>
        </div>
      )}

      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/70 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <SearchBox value={search} onChange={setSearch} placeholder="Search name, email, phone or role" />
          {roles.length > 1 && (
            <select value={role} onChange={(e) => setRole(e.target.value)} className={selectCls}>
              <option value="ALL">All positions</option>
              {roles.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          )}
        </div>
        <FilterTabs tabs={[["all", "All", counts.all], ["applied", "New", counts.applied], ["shortlisted", "Shortlisted", counts.shortlisted], ["rejected", "Rejected", counts.rejected],]} value={tab} onChange={setTab} />
      </div>

      <ErrorBanner message={error} onRetry={() => load()} />

      <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
        {loading ? <ListSkeleton /> : visible.length === 0 ? (
          <EmptyBox icon={Inbox} title={rows.length ? "No applications here" : "No applications yet"} text={rows.length ? "Try another tab or keyword." : "Applications from the careers page and added candidates appear here."} />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 sm:p-4 lg:hidden">
              {visible.map((c) => (
                <div key={c._id} onClick={() => setViewing(c)} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 space-y-3 hover:border-indigo-200 hover:shadow-sm transition cursor-pointer">
                  <div className="flex items-start gap-3">
                    {mark(c)}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-900 break-words">{c.name}</p>
                      <p className="text-[11px] text-slate-400 break-all">{c.email}</p>
                    </div>
                    <div onClick={(e) => e.stopPropagation()}><RowMenu items={menuFor(c)} /></div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {stage(c)}
                    {c.jobPosition?.title && <Chip tone="indigo">{c.jobPosition.title}</Chip>}
                    <span className="text-[11px] text-slate-400 font-medium">{dateText(c.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                  <tr>
                    <th className="px-5 py-3.5">Candidate</th>
                    <th className="px-4 py-3.5">Applied for</th>
                    <th className="px-4 py-3.5">Experience</th>
                    <th className="px-4 py-3.5">Source</th>
                    <th className="px-4 py-3.5">Applied on</th>
                    <th className="px-4 py-3.5">Stage</th>
                    <th className="px-4 py-3.5 text-center w-20">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visible.map((c) => (
                    <tr key={c._id} onClick={() => setViewing(c)} className="hover:bg-indigo-50/40 transition-colors cursor-pointer">
                      <td className="px-5 py-3 align-middle">
                        <div className="flex items-center gap-3 min-w-0">
                          {mark(c)}
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 text-sm truncate max-w-[200px]">{c.name}</p>
                            <p className="text-[11px] text-slate-400 truncate max-w-[200px] inline-flex items-center gap-1"><Mail size={10} /> {c.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-middle whitespace-nowrap font-semibold text-slate-700">{c.jobPosition?.title || "—"}</td>
                      <td className="px-4 py-3 align-middle whitespace-nowrap">{c.experience || "—"}</td>
                      <td className="px-4 py-3 align-middle whitespace-nowrap capitalize">{(c.source || "other").replace("-", " ")}</td>
                      <td className="px-4 py-3 align-middle whitespace-nowrap">{dateText(c.createdAt)}</td>
                      <td className="px-4 py-3 align-middle whitespace-nowrap">{stage(c)}</td>
                      <td className="px-4 py-3 align-middle text-center" onClick={(e) => e.stopPropagation()}><RowMenu items={menuFor(c)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {viewing && (
        <CandidateDetail c={viewing} onClose={() => setViewing(null)}>
          {canShortlist(viewing) && <button type="button" onClick={() => setStage(viewing, "shortlisted").catch(() => { })} className={primaryBtn}><CheckCircle2 size={14} /> Shortlist</button>}
          {canReject(viewing) && <button type="button" onClick={() => { setRejecting(viewing); setViewing(null); }} className="inline-flex items-center justify-center gap-2 px-5 py-3 sm:py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition cursor-pointer"><XCircle size={14} /> Reject</button>}
        </CandidateDetail>
      )}

      {rejecting && <ReasonModal title="Reject application" subtitle={`${rejecting.name} • ${rejecting.jobPosition?.title || ""}`} confirm="Reject" onClose={() => setRejecting(null)} onSubmit={(note) => setStage(rejecting, "rejected", note)} />}
    </div>
  );
}
