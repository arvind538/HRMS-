"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, Eye, EyeOff, Globe, Megaphone, Pencil, Send, Users } from "lucide-react";
import { toast } from "react-toastify";
import api from "@/lib/api";
import { ErrorBanner, FieldError, Label, StatCard, dateText, inputClass } from "@/components/payroll/ui";
import { EmptyBox, FilterTabs, ListSkeleton, PageHeader, SearchBox, primaryBtn } from "@/components/payroll/common";
import { Box, Chip, EMP_TYPES, FooterBar, FormFooter, Info, JOB_STATUS, RowMenu, errMsg, ghostBtn } from "@/components/recruitment/rui";

const STATE = {
  live: { label: "Live", tone: "emerald" },
  unpublished: { label: "Not published", tone: "slate" },
  paused: { label: "Paused", tone: "amber" },
  expired: { label: "Expired", tone: "rose" },
};

const stateOf = (p) => {
  if (!p.isPublished) return "unpublished";
  if (p.status !== "open") return "paused";
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  if (p.lastDate && new Date(p.lastDate) < t) return "expired";
  return "live";
};

const typeLabel = (v) => (EMP_TYPES.find(([k]) => k === v) || [, v])[1];

export default function JobPostsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [viewing, setViewing] = useState(null);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/recruitment/positions");
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(await errMsg(err, "Unable to load the job posts."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => {
    const c = { all: rows.length, live: 0, unpublished: 0, paused: 0, expired: 0 };
    rows.forEach((p) => c[stateOf(p)]++);
    return c;
  }, [rows]);
  const applicants = useMemo(() => rows.reduce((s, p) => s + (p.candidateCount || 0), 0), [rows]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((p) => (tab === "all" || stateOf(p) === tab) && (!q || `${p.title} ${p.department?.name || ""} ${p.location || ""}`.toLowerCase().includes(q)));
  }, [rows, search, tab]);

  const patch = async (p, body, okText) => {
    try {
      const { data } = await api.put(`/recruitment/positions/${p._id}`, body);
      setRows((prev) => prev.map((x) => (x._id === p._id ? { ...x, ...data, candidateCount: x.candidateCount, hiredCount: x.hiredCount } : x)));
      setViewing((v) => (v && v._id === p._id ? { ...v, ...data } : v));
      toast.success(okText);
      return true;
    } catch (err) {
      toast.error(await errMsg(err, "Unable to update the job post."));
      return false;
    }
  };

  const toggle = async (p) => {
    const publish = !p.isPublished;
    const ok = await patch(p, { isPublished: publish }, publish ? "Job post published." : "Job post unpublished.");
    if (ok && publish && p.status !== "open") toast.info(`The position is ${JOB_STATUS[p.status].label.toLowerCase()}. Set it to Open in Job Positions to make it live.`);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/careers`);
      toast.success("Careers page link copied.");
    } catch {
      toast.error("Unable to copy the link.");
    }
  };

  const openEdit = (p) => {
    setForm({ isPublished: p.isPublished ? "yes" : "no", lastDate: p.lastDate ? String(p.lastDate).slice(0, 10) : "", employmentType: p.employmentType || "full-time", location: p.location || "", salaryRange: p.salaryRange || "", skills: (p.requiredSkills || []).join(", "), description: p.description || "" });
    setModal({ row: p });
  };
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const save = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    const ok = await patch(modal.row, { isPublished: form.isPublished === "yes", lastDate: form.lastDate, employmentType: form.employmentType, location: form.location.trim(), salaryRange: form.salaryRange.trim(), requiredSkills: form.skills, description: form.description.trim() }, "Job post saved.");
    setSaving(false);
    if (ok) setModal(null);
  };

  const menuFor = (p) => [
    { label: "View post", icon: Eye, run: () => setViewing(p) },
    { label: "Edit post", icon: Pencil, run: () => openEdit(p) },
    { label: p.isPublished ? "Unpublish" : "Publish", icon: p.isPublished ? EyeOff : Send, run: () => toggle(p) },
    { label: "Copy careers link", icon: Copy, run: copyLink, hidden: stateOf(p) !== "live" },
  ];

  const mark = (p) => <div className="w-10 h-10 shrink-0 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center font-extrabold text-sm">{p.title?.charAt(0)?.toUpperCase() || "J"}</div>;
  const chip = (p) => { const s = STATE[stateOf(p)]; return <Chip tone={s.tone} dot>{s.label}</Chip>; };

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 py-4 space-y-4 antialiased pb-16">
      <PageHeader icon={Megaphone} title="Job Posts" subtitle="Publish a position so candidates can see it and apply." onRefresh={() => load({ silent: true })} busy={loading || refreshing}>
        <button type="button" onClick={copyLink} className="inline-flex items-center justify-center gap-2 px-4 py-3 sm:py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-bold transition cursor-pointer"><Copy size={15} /> Careers link</button>
      </PageHeader>

      {!loading && !error && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <StatCard icon={Globe} tone="emerald" label="Live posts" value={counts.live} />
          <StatCard icon={EyeOff} tone="indigo" label="Not published" value={counts.unpublished} />
          <div className="col-span-2 lg:col-span-1"><StatCard icon={Users} tone="violet" label="Total applicants" value={applicants} /></div>
        </div>
      )}

      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/70 shadow-sm space-y-3">
        <SearchBox value={search} onChange={setSearch} placeholder="Search title, department, location" />
        <FilterTabs tabs={[["all", "All", counts.all], ["live", "Live", counts.live], ["unpublished", "Not published", counts.unpublished], ["paused", "Paused", counts.paused], ["expired", "Expired", counts.expired]]} value={tab} onChange={setTab} />
      </div>

      <ErrorBanner message={error} onRetry={() => load()} />

      <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
        {loading ? <ListSkeleton /> : visible.length === 0 ? (
          <EmptyBox icon={Megaphone} title={rows.length ? "Nothing matches your search" : "No job posts yet"} text={rows.length ? "Try another keyword or filter." : "Create a position in Job Positions, then publish it here."} />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 sm:p-4 lg:hidden">
              {visible.map((p) => (
                <div key={p._id} onClick={() => setViewing(p)} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 space-y-3 hover:border-indigo-200 hover:shadow-sm transition cursor-pointer">
                  <div className="flex items-start gap-3">
                    {mark(p)}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-900 break-words">{p.title}</p>
                      <p className="text-[11px] text-slate-400">{p.department?.name || "General"}{p.location ? ` • ${p.location}` : ""}</p>
                    </div>
                    <div onClick={(e) => e.stopPropagation()}><RowMenu items={menuFor(p)} /></div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {chip(p)}
                    <Chip tone="slate">{p.candidateCount || 0} applicants</Chip>
                    {p.lastDate && <span className="text-[11px] text-slate-400 font-medium">Till {dateText(p.lastDate)}</span>}
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                  <tr>
                    <th className="px-5 py-3.5">Job post</th>
                    <th className="px-4 py-3.5">Department</th>
                    <th className="px-4 py-3.5">Type</th>
                    <th className="px-4 py-3.5">Posted</th>
                    <th className="px-4 py-3.5">Last date</th>
                    <th className="px-4 py-3.5">Applicants</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5 text-center w-20">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visible.map((p) => (
                    <tr key={p._id} onClick={() => setViewing(p)} className="hover:bg-indigo-50/40 transition-colors cursor-pointer">
                      <td className="px-5 py-3 align-middle">
                        <div className="flex items-center gap-3 min-w-0">
                          {mark(p)}
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 text-sm truncate max-w-[240px]">{p.title}</p>
                            <p className="text-[11px] text-slate-400 truncate max-w-[240px]">{p.location || "—"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-middle whitespace-nowrap font-semibold text-slate-700">{p.department?.name || "General"}</td>
                      <td className="px-4 py-3 align-middle whitespace-nowrap">{typeLabel(p.employmentType)}</td>
                      <td className="px-4 py-3 align-middle whitespace-nowrap">{p.postedOn ? dateText(p.postedOn) : "—"}</td>
                      <td className="px-4 py-3 align-middle whitespace-nowrap">{p.lastDate ? dateText(p.lastDate) : "—"}</td>
                      <td className="px-4 py-3 align-middle whitespace-nowrap font-semibold text-slate-700">{p.candidateCount || 0}</td>
                      <td className="px-4 py-3 align-middle whitespace-nowrap">{chip(p)}</td>
                      <td className="px-4 py-3 align-middle text-center" onClick={(e) => e.stopPropagation()}><RowMenu items={menuFor(p)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {viewing && (
        <Box title={viewing.title} subtitle={viewing.department?.name || "General"} onClose={() => setViewing(null)} footer={
          <FooterBar>
            <button type="button" onClick={() => toggle(viewing)} className={primaryBtn}>{viewing.isPublished ? <EyeOff size={14} /> : <Send size={14} />} {viewing.isPublished ? "Unpublish" : "Publish"}</button>
            <button type="button" onClick={() => { const p = viewing; setViewing(null); openEdit(p); }} className={ghostBtn}><Pencil size={14} /> Edit post</button>
          </FooterBar>
        }>
          <div className="flex flex-wrap items-center gap-2">{chip(viewing)}<Chip tone={JOB_STATUS[viewing.status]?.tone}>{JOB_STATUS[viewing.status]?.label}</Chip></div>
          <Info rows={[["Job type", typeLabel(viewing.employmentType)], ["Experience", viewing.experienceRequired], ["Location", viewing.location], ["Salary range", viewing.salaryRange], ["Openings", viewing.numberOfOpenings], ["Applicants", viewing.candidateCount || 0], ["Posted on", viewing.postedOn ? dateText(viewing.postedOn) : ""], ["Last date", viewing.lastDate ? dateText(viewing.lastDate) : ""]]} />
          {viewing.requiredSkills?.length > 0 && <div className="flex flex-wrap gap-1.5">{viewing.requiredSkills.map((s) => <Chip key={s} tone="indigo">{s}</Chip>)}</div>}
          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/70 border border-slate-200 rounded-2xl p-3.5 whitespace-pre-line break-words">{viewing.description || "No description added yet."}</p>
        </Box>
      )}

      {modal && (
        <Box title="Edit job post" subtitle={modal.row.title} onClose={() => setModal(null)} onSubmit={save} locked={saving} size="max-w-2xl" footer={<FormFooter onCancel={() => setModal(null)} busy={saving} label="Save post" />}>
          <div>
            <Label>Visibility</Label>
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl">
              {[["yes", "Published"], ["no", "Not published"]].map(([k, l]) => (
                <button key={k} type="button" onClick={() => set("isPublished", k)} className={`py-2.5 sm:py-2 text-xs font-bold rounded-lg transition cursor-pointer ${form.isPublished === k ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>{l}</button>
              ))}
            </div>
            <FieldError>{form.isPublished === "yes" && modal.row.status !== "open" ? `The position is ${JOB_STATUS[modal.row.status].label.toLowerCase()}, so it will not be live until it is set to Open.` : ""}</FieldError>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Last date to apply</Label>
              <input type="date" value={form.lastDate ?? ""} onChange={(e) => set("lastDate", e.target.value)} className={`${inputClass} cursor-pointer border-slate-200 focus:border-indigo-500`} />
            </div>
            <div>
              <Label>Job type</Label>
              <select value={form.employmentType ?? ""} onChange={(e) => set("employmentType", e.target.value)} className={`${inputClass} cursor-pointer border-slate-200 focus:border-indigo-500`}>
                {EMP_TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </div>
            <div>
              <Label>Location</Label>
              <input value={form.location ?? ""} maxLength={120} onChange={(e) => set("location", e.target.value)} className={`${inputClass} border-slate-200 focus:border-indigo-500`} />
            </div>
            <div>
              <Label>Salary range</Label>
              <input value={form.salaryRange ?? ""} maxLength={60} onChange={(e) => set("salaryRange", e.target.value)} className={`${inputClass} border-slate-200 focus:border-indigo-500`} />
            </div>
          </div>
          <div>
            <Label>Skills (comma separated)</Label>
            <input value={form.skills ?? ""} onChange={(e) => set("skills", e.target.value)} className={`${inputClass} border-slate-200 focus:border-indigo-500`} />
          </div>
          <div>
            <Label>Job description shown to candidates</Label>
            <textarea rows={5} value={form.description ?? ""} maxLength={4000} onChange={(e) => set("description", e.target.value)} className={`${inputClass} resize-y border-slate-200 focus:border-indigo-500`} />
          </div>
        </Box>
      )}
    </div>
  );
}
