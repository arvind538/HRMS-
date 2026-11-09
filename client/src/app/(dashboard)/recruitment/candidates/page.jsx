"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Eye, FileText, Mail, Pencil, Phone, Plus, Trash2, UploadCloud, Users, X } from "lucide-react";
import { toast } from "react-toastify";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { ConfirmDialog, ErrorBanner, FieldError, Label, StatCard, fieldBorder, inputClass } from "@/components/payroll/ui";
import { EmptyBox, FilterTabs, ListSkeleton, PageHeader, SearchBox, primaryBtn } from "@/components/payroll/common";
import { Box, Chip, FormFooter, ReasonModal, RowMenu, SOURCES, STAGE, StatusPicker, errMsg, idOf, openResume } from "@/components/recruitment/rui";
import CandidateDetail from "@/components/recruitment/CandidateDetail";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HINT = { "interview-scheduled": "Set from Interview Schedule", offered: "Set from Offers", hired: "Set from Offers" };
const stageOptions = Object.entries(STAGE).map(([value, s]) => ({ value, ...s, disabled: Boolean(HINT[value]), hint: HINT[value] }));

const blank = () => ({ name: "", email: "", phone: "", jobPosition: "", experience: "", currentCompany: "", expectedCtc: "", noticePeriod: "", source: "job-portal", notes: "", file: null });
const toForm = (c) => ({ name: c.name || "", email: c.email || "", phone: c.phone || "", jobPosition: idOf(c.jobPosition), experience: c.experience || "", currentCompany: c.currentCompany || "", expectedCtc: c.expectedCtc || "", noticePeriod: c.noticePeriod || "", source: c.source || "other", notes: c.notes || "", file: null });
const size = (b) => (b < 1048576 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1048576).toFixed(1)} MB`);

export default function CandidatesPage() {
  const { user } = useAuth();
  const isAdmin = String(user?.role || "").toLowerCase() === "admin";

  const [rows, setRows] = useState([]);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [posFilter, setPosFilter] = useState("ALL");
  const [tab, setTab] = useState("all");

  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(blank());
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [ask, setAsk] = useState(null);
  const fileRef = useRef(null);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const [c, p] = await Promise.all([api.get("/recruitment/candidates"), api.get("/recruitment/positions")]);
      setRows(Array.isArray(c.data) ? c.data : []);
      setPositions(Array.isArray(p.data) ? p.data : []);
    } catch (err) {
      setError(await errMsg(err, "Unable to load the candidates."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => {
    const c = { all: rows.length };
    Object.keys(STAGE).forEach((k) => (c[k] = rows.filter((x) => x.status === k).length));
    return c;
  }, [rows]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((c) => (tab === "all" || c.status === tab) && (posFilter === "ALL" || idOf(c.jobPosition) === posFilter) && (!q || `${c.name} ${c.email} ${c.phone || ""} ${c.jobPosition?.title || ""}`.toLowerCase().includes(q)));
  }, [rows, tab, posFilter, search]);

  /* ---- form ---- */
  const openModal = (row = null) => {
    setForm(row ? toForm(row) : blank());
    setErrors({});
    setModal({ row });
  };
  const set = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => (p[k] ? { ...p, [k]: undefined } : p));
  };

  const pickFile = (file) => {
    if (!file) return;
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["pdf", "doc", "docx"].includes(ext)) return setErrors((p) => ({ ...p, file: "The resume must be a PDF, DOC or DOCX file." }));
    if (file.size > 5 * 1048576) return setErrors((p) => ({ ...p, file: "The file must be under 5 MB." }));
    set("file", file);
  };

  const save = async (e) => {
    e.preventDefault();
    if (saving) return;
    const next = {};
    if (form.name.trim().length < 2) next.name = "Please enter the full name.";
    if (!EMAIL.test(form.email.trim())) next.email = "Please enter a valid email address.";
    if (form.phone.trim() && !/^[+\d][\d\s-]{6,18}$/.test(form.phone.trim())) next.phone = "Please enter a valid phone number.";
    if (!form.jobPosition) next.jobPosition = "Please select the position.";
    setErrors(next);
    if (Object.keys(next).length) return;

    const body = new FormData();
    ["name", "email", "phone", "jobPosition", "experience", "currentCompany", "expectedCtc", "noticePeriod", "source", "notes"].forEach((k) => body.append(k, String(form[k] ?? "").trim()));
    if (form.file) body.append("file", form.file);

    setSaving(true);
    try {
      const opts = { headers: { "Content-Type": "multipart/form-data" } };
      if (modal.row) await api.put(`/recruitment/candidates/${modal.row._id}`, body, opts);
      else await api.post("/recruitment/candidates", body, opts);
      toast.success(modal.row ? "Candidate updated." : "Candidate added.");
      setModal(null);
      load({ silent: true });
    } catch (err) {
      toast.error(await errMsg(err, "Unable to save the candidate."));
    } finally {
      setSaving(false);
    }
  };

  /* ---- stage ---- */
  const setStage = async (c, status, note = "") => {
    try {
      const { data } = await api.put(`/recruitment/candidates/${c._id}/status`, { status, note });
      setRows((prev) => prev.map((x) => (x._id === c._id ? data : x)));
      setViewing((v) => (v && v._id === c._id ? data : v));
      toast.success(`Moved to ${STAGE[status].label.toLowerCase()}.`);
    } catch (err) {
      toast.error(await errMsg(err, "Unable to change the stage."));
      throw err;
    }
  };
  const onStage = (c, status) => (status === "rejected" ? setRejecting(c) : setStage(c, status).catch(() => { }));

  const remove = (c) =>
    setAsk({
      title: "Delete this candidate?",
      text: `${c.name}. Their interviews, offers and resume are deleted too. This cannot be undone.`,
      run: async () => {
        try {
          await api.delete(`/recruitment/candidates/${c._id}`);
          toast.success("Candidate deleted.");
          await load({ silent: true });
        } catch (err) {
          toast.error(await errMsg(err, "Unable to delete the candidate."));
        }
      },
    });

  const menuFor = (c) => [
    { label: "View profile", icon: Eye, run: () => setViewing(c) },
    { label: "Edit", icon: Pencil, run: () => openModal(c) },
    { label: "View resume", icon: FileText, run: () => openResume(c), hidden: !c.hasResume && !c.resumeUrl },
    { label: "Download resume", icon: Download, run: () => openResume(c, true), hidden: !c.hasResume },
    { label: "Delete", icon: Trash2, run: () => remove(c), hidden: !isAdmin || c.status === "hired", danger: true },
  ];

  const picker = (c) => <StatusPicker value={c.status} options={stageOptions} disabled={["offered", "hired"].includes(c.status)} onChange={(v) => onStage(c, v)} />;
  const mark = (c) => <div className="w-10 h-10 shrink-0 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center font-extrabold text-sm">{c.name?.charAt(0)?.toUpperCase() || "C"}</div>;
  const selectCls = "px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:border-indigo-500 cursor-pointer max-w-full";
  const cls = `${inputClass} border-slate-200 focus:border-indigo-500`;

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 py-4 space-y-4 antialiased pb-16">
      <PageHeader icon={Users} title="Candidates" subtitle="Everyone who applied, with their stage and resume." onRefresh={() => load({ silent: true })} busy={loading || refreshing}>
        <button type="button" onClick={() => openModal()} className={primaryBtn}><Plus size={16} /> Add Candidate</button>
      </PageHeader>

      {!loading && !error && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <StatCard icon={Users} tone="indigo" label="All candidates" value={counts.all} />
          <StatCard icon={Eye} tone="emerald" label="In interview stages" value={counts["interview-scheduled"] + counts.interviewed} />
          <div className="col-span-2 lg:col-span-1"><StatCard icon={FileText} tone="violet" label="Hired" value={counts.hired} /></div>
        </div>
      )}

      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/70 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <SearchBox value={search} onChange={setSearch} placeholder="Search name, email, phone or role" />
          {positions.length > 1 && (
            <select value={posFilter} onChange={(e) => setPosFilter(e.target.value)} className={selectCls}>
              <option value="ALL">All positions</option>
              {positions.map((p) => <option key={p._id} value={p._id}>{p.title}</option>)}
            </select>
          )}
        </div>
        <FilterTabs tabs={[["all", "All", counts.all], ...Object.entries(STAGE).map(([k, s]) => [k, s.label, counts[k]])]} value={tab} onChange={setTab} />
      </div>

      <ErrorBanner message={error} onRetry={() => load()} />

      <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
        {loading ? <ListSkeleton /> : visible.length === 0 ? (
          <EmptyBox icon={Users} title={rows.length ? "Nothing matches your search" : "No candidates yet"} text={rows.length ? "Try another stage or keyword." : 'Click "Add Candidate" to add the first one.'} />
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
                  <div className="flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {picker(c)}
                    {c.jobPosition?.title && <Chip tone="indigo">{c.jobPosition.title}</Chip>}
                    {c.phone && <span className="text-[11px] text-slate-400 font-medium">{c.phone}</span>}
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
                    <th className="px-4 py-3.5">Contact</th>
                    <th className="px-4 py-3.5">Experience</th>
                    <th className="px-4 py-3.5">Source</th>
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
                            <p className="font-semibold text-slate-900 text-sm truncate max-w-[180px]">{c.name}</p>
                            <p className="text-[11px] text-slate-400">ID {String(c._id).slice(-6).toUpperCase()}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-middle whitespace-nowrap font-semibold text-slate-700">{c.jobPosition?.title || "—"}</td>
                      <td className="px-4 py-3 align-middle">
                        <p className="inline-flex items-center gap-1 text-[11px] truncate max-w-[200px]"><Mail size={11} className="text-slate-400 shrink-0" /> {c.email}</p>
                        {c.phone && <p className="inline-flex items-center gap-1 text-[11px] text-slate-400 block"><Phone size={11} /> {c.phone}</p>}
                      </td>
                      <td className="px-4 py-3 align-middle whitespace-nowrap">{c.experience || "—"}</td>
                      <td className="px-4 py-3 align-middle whitespace-nowrap capitalize">{(c.source || "other").replace("-", " ")}</td>
                      <td className="px-4 py-3 align-middle whitespace-nowrap" onClick={(e) => e.stopPropagation()}>{picker(c)}</td>
                      <td className="px-4 py-3 align-middle text-center" onClick={(e) => e.stopPropagation()}><RowMenu items={menuFor(c)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* add / edit */}
      {modal && (
        <Box title={modal.row ? "Edit candidate" : "Add candidate"} subtitle="Fill the details and attach the resume" onClose={() => setModal(null)} onSubmit={save} locked={saving} size="max-w-2xl" footer={<FormFooter onCancel={() => setModal(null)} busy={saving} label={modal.row ? "Save changes" : "Add candidate"} />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label>Full name</Label>
              <input value={form.name ?? ""} maxLength={80} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Rahul Sharma" className={`${inputClass} ${fieldBorder(errors.name)}`} />
              <FieldError>{errors.name}</FieldError>
            </div>
            <div>
              <Label>Email</Label>
              <input type="email" value={form.email ?? ""} maxLength={120} onChange={(e) => set("email", e.target.value)} placeholder="candidate@email.com" className={`${inputClass} ${fieldBorder(errors.email)}`} />
              <FieldError>{errors.email}</FieldError>
            </div>
            <div>
              <Label>Phone</Label>
              <input value={form.phone ?? ""} maxLength={20} onChange={(e) => set("phone", e.target.value)} placeholder="+91 98765 43210" className={`${inputClass} ${fieldBorder(errors.phone)}`} />
              <FieldError>{errors.phone}</FieldError>
            </div>
            <div>
              <Label>Applying for</Label>
              <select value={form.jobPosition ?? ""} onChange={(e) => set("jobPosition", e.target.value)} className={`${inputClass} cursor-pointer ${fieldBorder(errors.jobPosition)}`}>
                <option value="">Select position</option>
                {positions.map((p) => <option key={p._id} value={p._id}>{p.title}{p.status !== "open" ? ` (${p.status})` : ""}</option>)}
              </select>
              <FieldError>{errors.jobPosition}</FieldError>
            </div>
            <div>
              <Label>Source</Label>
              <select value={form.source ?? ""} onChange={(e) => set("source", e.target.value)} className={`${cls} cursor-pointer`}>
                {SOURCES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </div>
            <div>
              <Label>Experience</Label>
              <input value={form.experience ?? ""} maxLength={60} onChange={(e) => set("experience", e.target.value)} placeholder="e.g. 3 years" className={cls} />
            </div>
            <div>
              <Label>Current company</Label>
              <input value={form.currentCompany ?? ""} maxLength={80} onChange={(e) => set("currentCompany", e.target.value)} className={cls} />
            </div>
            <div>
              <Label>Expected CTC</Label>
              <input value={form.expectedCtc ?? ""} maxLength={40} onChange={(e) => set("expectedCtc", e.target.value)} placeholder="e.g. 6 LPA" className={cls} />
            </div>
            <div>
              <Label>Notice period</Label>
              <input value={form.noticePeriod ?? ""} maxLength={40} onChange={(e) => set("noticePeriod", e.target.value)} placeholder="e.g. 30 days" className={cls} />
            </div>
          </div>

          <div>
            <Label>Resume (PDF, DOC or DOCX, up to 5 MB)</Label>
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ""; }} />
            {form.file ? (
              <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0"><FileText size={18} /></div>
                <div className="min-w-0 flex-1"><p className="text-sm font-bold text-slate-800 truncate">{form.file.name}</p><p className="text-[11px] text-slate-500">{size(form.file.size)} • ready to upload</p></div>
                <button type="button" onClick={() => set("file", null)} className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer" aria-label="Remove file"><X size={16} /></button>
              </div>
            ) : (
              <div role="button" tabIndex={0} onClick={() => fileRef.current?.click()} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && fileRef.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); pickFile(e.dataTransfer.files?.[0]); }}
                className={`flex flex-col items-center gap-1.5 text-center px-4 py-7 rounded-2xl border-2 border-dashed cursor-pointer transition ${errors.file ? "border-rose-300 bg-rose-50/40" : "border-slate-300 bg-slate-50/60 hover:border-indigo-400 hover:bg-indigo-50/40"}`}>
                <UploadCloud size={24} className="text-indigo-600" />
                <p className="text-sm font-bold text-slate-800"><span className="hidden sm:inline">Drag and drop, or </span><span className="text-indigo-600">tap to browse</span></p>
              </div>
            )}
            {modal.row?.hasResume && !form.file && <p className="text-[11px] text-emerald-700 font-semibold mt-2">Current resume: {modal.row.resumeName}. It stays unless you choose a new one.</p>}
            <FieldError>{errors.file}</FieldError>
          </div>

          <div>
            <Label>Notes</Label>
            <textarea rows={3} value={form.notes ?? ""} maxLength={1000} onChange={(e) => set("notes", e.target.value)} placeholder="e.g. Strong in React, available immediately" className={`${cls} resize-none`} />
          </div>
        </Box>
      )}

      {viewing && (
        <CandidateDetail c={viewing} onClose={() => setViewing(null)}>
          <button type="button" onClick={() => { const c = viewing; setViewing(null); openModal(c); }} className={primaryBtn}><Pencil size={14} /> Edit</button>
        </CandidateDetail>
      )}

      {rejecting && <ReasonModal title="Reject candidate" subtitle={rejecting.name} confirm="Reject" onClose={() => setRejecting(null)} onSubmit={(note) => setStage(rejecting, "rejected", note)} />}
      {ask && <ConfirmDialog title={ask.title} text={ask.text} label="Delete" danger onConfirm={ask.run} onClose={() => setAsk(null)} />}
    </div>
  );
}

