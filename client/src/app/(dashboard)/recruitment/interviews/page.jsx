"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, CalendarCheck, CalendarClock, CalendarDays, ExternalLink, Eye, MessageSquareText, Pencil, Phone, Plus, RefreshCw, Trash2, UserPlus, Video } from "lucide-react";
import { toast } from "react-toastify";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { ConfirmDialog, ErrorBanner, FieldError, Label, StatCard, fieldBorder, inputClass } from "@/components/payroll/ui";
import { EmptyBox, FilterTabs, ListSkeleton, PageHeader, SearchBox, primaryBtn } from "@/components/payroll/common";
import { Box, Chip, FooterBar, FormFooter, Info, RowMenu, StatusPicker, errMsg, ghostBtn, idOf } from "@/components/recruitment/rui";
import { RECO, Stars } from "@/components/recruitment/FeedbackChat";
import { explainEmpty, personName, useCandidateOptions, usePeopleOptions } from "@/components/recruitment/CandidatePicker";
import NewCandidateDialog from "@/components/recruitment/NewCandidateDialog";

const ROUND = { screening: { label: "Screening", tone: "sky" }, technical: { label: "Technical", tone: "violet" }, hr: { label: "HR round", tone: "amber" }, final: { label: "Final", tone: "emerald" } };
const MODE = { video: { label: "Video call", icon: Video }, "in-person": { label: "In person", icon: Building2 }, phone: { label: "Phone call", icon: Phone } };
const IV = { scheduled: { label: "Scheduled", tone: "indigo" }, completed: { label: "Completed", tone: "emerald" }, cancelled: { label: "Cancelled", tone: "rose" }, "no-show": { label: "No show", tone: "amber" } };
const statusOptions = Object.entries(IV).map(([value, s]) => ({ value, ...s, disabled: value === "completed", hint: value === "completed" ? "Completes when feedback is given" : undefined }));

const pad = (n) => String(n).padStart(2, "0");
const toLocalInput = (v) => {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "" : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const when = (v) => (v ? new Date(v).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—");

/* the name of a candidate in a list (any field name works) */
const cname = (c) => personName(c) || "Candidate";
/* a candidate who is already hired, rejected or offered cannot get a new interview */
const pickable = (c) => !["hired", "rejected", "offered"].includes(String(c?.status || "").toLowerCase());

const blank = () => ({ candidate: "", interviewer: "", round: "screening", scheduledAt: "", durationMins: "45", mode: "video", meetingLink: "", location: "", notes: "" });
const toForm = (iv) => ({
  candidate: idOf(iv.candidate),
  interviewer: idOf(iv.interviewer),
  round: iv.round || "screening",
  scheduledAt: toLocalInput(iv.scheduledAt),
  durationMins: String(iv.durationMins || 45),
  mode: iv.mode || "video",
  meetingLink: iv.meetingLink || "",
  location: iv.location || "",
  notes: iv.notes || "",
});

export default function InterviewSchedulePage() {
  const router = useRouter();
  const { user } = useAuth();
  const isStaff = ["admin", "hr"].includes(String(user?.role || "").toLowerCase());

  const cand = useCandidateOptions();
  const staff = usePeopleOptions();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [round, setRound] = useState("ALL");
  const [tab, setTab] = useState("all");

  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(blank());
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [ask, setAsk] = useState(null);
  const [newCandOpen, setNewCandOpen] = useState(false);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/recruitment/interviews");
      setRows(Array.isArray(data) ? data : data?.interviews || data?.data || []);
    } catch (err) {
      setError(await errMsg(err, "Unable to load the interviews."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = () => {
    load({ silent: true });
    cand.reload();
    staff.reload();
  };

  const pool = useMemo(() => cand.candidates.filter(pickable), [cand.candidates]);

  const counts = useMemo(() => {
    const c = { all: rows.length };
    Object.keys(IV).forEach((k) => (c[k] = rows.filter((r) => r.status === k).length));
    return c;
  }, [rows]);

  const stats = useMemo(() => {
    const now = new Date();
    const live = rows.filter((r) => r.status === "scheduled");
    return {
      upcoming: live.filter((r) => new Date(r.scheduledAt) >= now).length,
      today: live.filter((r) => new Date(r.scheduledAt).toDateString() === now.toDateString()).length,
      done: counts.completed,
    };
  }, [rows, counts]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (tab === "all" || r.status === tab) &&
        (round === "ALL" || r.round === round) &&
        (!q ||
          `${cname(r.candidate)} ${r.candidate?.email || ""} ${r.interviewer?.name || ""} ${r.candidate?.jobPosition?.title || ""}`
            .toLowerCase()
            .includes(q))
    );
  }, [rows, tab, round, search]);

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

  /* naya candidate save hone ke baad list reload karo aur usko select karo */
  const onCandidateAdded = async (id) => {
    try {
      await cand.reload();
    } catch {
      /* list reload fail hui to bhi id select ho jayega */
    }
    set("candidate", id);
  };

  const save = async (e) => {
    e.preventDefault();
    if (saving) return;
    const row = modal.row;
    const next = {};
    const d = new Date(form.scheduledAt);
    const mins = Number(form.durationMins);

    if (!row && !form.candidate) next.candidate = "Please select the candidate.";
    if (!form.interviewer) next.interviewer = "Please select the interviewer.";
    if (!form.scheduledAt || Number.isNaN(d.getTime())) next.scheduledAt = "Please select the date and time.";
    else if (!row && d.getTime() < Date.now() - 5 * 60000) next.scheduledAt = "The interview time cannot be in the past.";
    if (!Number.isInteger(mins) || mins < 15 || mins > 480) next.durationMins = "Enter 15 to 480 minutes.";
    if (form.meetingLink.trim() && !/^https?:\/\/\S+$/i.test(form.meetingLink.trim()))
      next.meetingLink = "The link must start with http:// or https://";
    setErrors(next);
    if (Object.keys(next).length) return;

    const body = {
      interviewer: form.interviewer,
      round: form.round,
      mode: form.mode,
      durationMins: mins,
      meetingLink: form.meetingLink.trim(),
      location: form.location.trim(),
      notes: form.notes.trim(),
      scheduledAt: d.toISOString(),
    };
    if (!row) body.candidate = form.candidate;

    setSaving(true);
    try {
      if (row) await api.put(`/recruitment/interviews/${row._id}`, body);
      else await api.post("/recruitment/interviews", body);
      toast.success(row ? "Interview updated." : "Interview scheduled.");
      setModal(null);
      load({ silent: true });
    } catch (err) {
      toast.error(await errMsg(err, "Unable to save the interview."));
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (r, status) => {
    try {
      const { data } = await api.put(`/recruitment/interviews/${r._id}`, { status });
      setRows((prev) => prev.map((x) => (x._id === r._id ? data : x)));
      setViewing((v) => (v && v._id === r._id ? data : v));
      toast.success(`Marked as ${IV[status].label.toLowerCase()}.`);
      load({ silent: true });
    } catch (err) {
      toast.error(await errMsg(err, "Unable to change the status."));
    }
  };

  const remove = (r) =>
    setAsk({
      title: "Delete this interview?",
      text: `${cname(r.candidate)} • ${when(r.scheduledAt)}. This cannot be undone.`,
      run: async () => {
        try {
          await api.delete(`/recruitment/interviews/${r._id}`);
          toast.success("Interview deleted.");
          await load({ silent: true });
        } catch (err) {
          toast.error(await errMsg(err, "Unable to delete the interview."));
        }
      },
    });

  const menuFor = (r) => [
    { label: "View details", icon: Eye, run: () => setViewing(r) },
    { label: "Edit", icon: Pencil, run: () => openModal(r), hidden: r.status === "completed" },
    { label: "Join meeting", icon: ExternalLink, run: () => window.open(r.meetingLink, "_blank", "noopener,noreferrer"), hidden: !r.meetingLink || r.status !== "scheduled" },
    { label: "Give feedback", icon: MessageSquareText, run: () => router.push("/recruitment/feedback"), hidden: r.status !== "scheduled" },
    { label: "Delete", icon: Trash2, run: () => remove(r), hidden: !isStaff, danger: true },
  ];

  const picker = (r) => (
    <StatusPicker value={r.status} options={statusOptions} disabled={r.status === "completed"} onChange={(v) => changeStatus(r, v)} />
  );
  const roundChip = (r) => <Chip tone={ROUND[r.round]?.tone}>{ROUND[r.round]?.label || r.round}</Chip>;
  const modeChip = (r) => {
    const M = MODE[r.mode] || MODE.video;
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
        <M.icon size={13} className="text-slate-400" /> {M.label}
      </span>
    );
  };
  const mark = (r) => (
    <div className="w-10 h-10 shrink-0 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center font-extrabold text-sm">
      {cname(r.candidate).charAt(0).toUpperCase()}
    </div>
  );
  const selectCls =
    "px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:border-indigo-500 cursor-pointer max-w-full";
  const cls = `${inputClass} border-slate-200 focus:border-indigo-500`;

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 py-4 space-y-4 antialiased pb-16">
      <PageHeader
        icon={CalendarDays}
        title="Interview Schedule"
        subtitle="Plan interviews, assign interviewers and track each round."
        onRefresh={refresh}
        busy={loading || refreshing}
      >
        <button type="button" onClick={() => openModal()} className={primaryBtn}>
          <Plus size={16} /> Schedule Interview
        </button>
      </PageHeader>

      {!loading && !error && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <StatCard icon={CalendarClock} tone="indigo" label="Upcoming" value={stats.upcoming} />
          <StatCard icon={CalendarDays} tone="emerald" label="Today" value={stats.today} />
          <div className="col-span-2 lg:col-span-1">
            <StatCard icon={CalendarCheck} tone="violet" label="Completed" value={stats.done} />
          </div>
        </div>
      )}

      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/70 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <SearchBox value={search} onChange={setSearch} placeholder="Search candidate, interviewer or role" />
          <select value={round} onChange={(e) => setRound(e.target.value)} className={selectCls}>
            <option value="ALL">All rounds</option>
            {Object.entries(ROUND).map(([k, r]) => (
              <option key={k} value={k}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <FilterTabs
          tabs={[["all", "All", counts.all], ...Object.entries(IV).map(([k, s]) => [k, s.label, counts[k]])]}
          value={tab}
          onChange={setTab}
        />
      </div>

      <ErrorBanner message={error} onRetry={() => load()} />

      <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
        {loading ? (
          <ListSkeleton />
        ) : visible.length === 0 ? (
          <EmptyBox
            icon={CalendarDays}
            title={rows.length ? "Nothing matches your search" : "No interviews yet"}
            text={rows.length ? "Try another tab or keyword." : 'Click "Schedule Interview" to plan the first one.'}
          />
        ) : (
          <>
            {/* mobile and tablet: cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 sm:p-4 lg:hidden">
              {visible.map((r) => (
                <div
                  key={r._id}
                  onClick={() => setViewing(r)}
                  className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 space-y-3 hover:border-indigo-200 hover:shadow-sm transition cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    {mark(r)}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-900 break-words">{cname(r.candidate)}</p>
                      <p className="text-[11px] text-slate-400">
                        {r.candidate?.jobPosition?.title || "—"} • {r.interviewer?.name || "No interviewer"}
                      </p>
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                      <RowMenu items={menuFor(r)} />
                    </div>
                  </div>
                  <p className="text-xs font-semibold text-slate-700">{when(r.scheduledAt)}</p>
                  <div className="flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {picker(r)}
                    {roundChip(r)}
                    {modeChip(r)}
                  </div>
                </div>
              ))}
            </div>

            {/* desktop: table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                  <tr>
                    <th className="px-5 py-3.5">Candidate</th>
                    <th className="px-4 py-3.5">Interviewer</th>
                    <th className="px-4 py-3.5">Round</th>
                    <th className="px-4 py-3.5">Date and time</th>
                    <th className="px-4 py-3.5">Mode</th>
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
                            <p className="font-semibold text-slate-900 text-sm truncate max-w-[180px]">{cname(r.candidate)}</p>
                            <p className="text-[11px] text-slate-400 truncate max-w-[180px]">{r.candidate?.jobPosition?.title || "—"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-middle whitespace-nowrap font-semibold text-slate-700">{r.interviewer?.name || "—"}</td>
                      <td className="px-4 py-3 align-middle whitespace-nowrap">{roundChip(r)}</td>
                      <td className="px-4 py-3 align-middle whitespace-nowrap font-medium text-slate-700">{when(r.scheduledAt)}</td>
                      <td className="px-4 py-3 align-middle whitespace-nowrap">{modeChip(r)}</td>
                      <td className="px-4 py-3 align-middle whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        {picker(r)}
                      </td>
                      <td className="px-4 py-3 align-middle text-center" onClick={(e) => e.stopPropagation()}>
                        <RowMenu items={menuFor(r)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* schedule / edit */}
      {modal && (
        <Box
          title={modal.row ? "Edit interview" : "Schedule interview"}
          subtitle="Pick the candidate, interviewer and time"
          onClose={() => setModal(null)}
          onSubmit={save}
          locked={saving}
          size="max-w-2xl"
          footer={<FormFooter onCancel={() => setModal(null)} busy={saving} label={modal.row ? "Save changes" : "Schedule"} />}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {modal.row ? (
              <div>
                <Label>Candidate</Label>
                <input value={cname(modal.row.candidate)} disabled className={`${cls} bg-slate-100 text-slate-500`} />
              </div>
            ) : (
              <div className="min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <Label>Candidate</Label>
                  {isStaff && (
                    <button
                      type="button"
                      onClick={() => setNewCandOpen(true)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 active:scale-95 transition cursor-pointer"
                    >
                      <UserPlus size={13} /> Add new candidate
                    </button>
                  )}
                </div>

                <select
                  value={form.candidate ?? ""}
                  onChange={(e) => set("candidate", e.target.value)}
                  disabled={cand.loading}
                  className={`${inputClass} cursor-pointer disabled:opacity-60 ${fieldBorder(errors.candidate)}`}
                >
                  <option value="">
                    {cand.loading ? "Loading candidates..." : pool.length ? "Select candidate" : "No candidate available"}
                  </option>
                  {pool.map((c) => (
                    <option key={c._id} value={c._id}>
                      {cname(c)}
                      {c.jobPosition?.title ? ` — ${c.jobPosition.title}` : ""}
                    </option>
                  ))}
                </select>
                <FieldError>{errors.candidate}</FieldError>

                {cand.error && (
                  <div className="flex items-center justify-between gap-3 mt-1.5 text-[11px] font-semibold text-rose-600">
                    <span>{cand.error}</span>
                    <button type="button" onClick={cand.reload} className="inline-flex items-center gap-1 underline cursor-pointer shrink-0">
                      <RefreshCw size={11} /> Retry
                    </button>
                  </div>
                )}
                {!cand.loading && !cand.error && pool.length === 0 && (
                  <p className="text-[11px] font-semibold text-amber-600 mt-1.5">
                    {explainEmpty(cand.candidates, [
                      ["hired", (c) => c.status === "hired"],
                      ["rejected", (c) => c.status === "rejected"],
                      ["already offered", (c) => c.status === "offered"],
                    ])}
                  </p>
                )}
              </div>
            )}

            <div>
              <Label>Interviewer</Label>
              <select
                value={form.interviewer ?? ""}
                onChange={(e) => set("interviewer", e.target.value)}
                disabled={staff.loading}
                className={`${inputClass} cursor-pointer disabled:opacity-60 ${fieldBorder(errors.interviewer)}`}
              >
                <option value="">{staff.loading ? "Loading interviewers..." : "Select interviewer"}</option>
                {staff.people.map((e) => (
                  <option key={e._id} value={e._id}>
                    {e.name} ({e.employeeId || "—"})
                  </option>
                ))}
              </select>
              <FieldError>{errors.interviewer}</FieldError>
              {staff.error && (
                <div className="flex items-center justify-between gap-3 mt-1.5 text-[11px] font-semibold text-rose-600">
                  <span>{staff.error}</span>
                  <button type="button" onClick={staff.reload} className="inline-flex items-center gap-1 underline cursor-pointer shrink-0">
                    <RefreshCw size={11} /> Retry
                  </button>
                </div>
              )}
              {!staff.loading && !staff.error && staff.people.length === 0 && (
                <p className="text-[11px] font-semibold text-amber-600 mt-1.5">No employee is available to take the interview.</p>
              )}
            </div>

            <div>
              <Label>Round</Label>
              <select value={form.round ?? ""} onChange={(e) => set("round", e.target.value)} className={`${cls} cursor-pointer`}>
                {Object.entries(ROUND).map(([k, r]) => (
                  <option key={k} value={k}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>Mode</Label>
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl">
                {Object.entries(MODE).map(([k, m]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => set("mode", k)}
                    className={`inline-flex items-center justify-center gap-1 py-2.5 sm:py-2 text-[11px] font-bold rounded-lg transition cursor-pointer ${form.mode === k ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                      }`}
                  >
                    <m.icon size={12} /> {k === "in-person" ? "Office" : k === "video" ? "Video" : "Phone"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>Date and time</Label>
              <input
                type="datetime-local"
                value={form.scheduledAt ?? ""}
                min={modal.row ? undefined : toLocalInput(new Date())}
                onChange={(e) => set("scheduledAt", e.target.value)}
                className={`${inputClass} cursor-pointer ${fieldBorder(errors.scheduledAt)}`}
              />
              <FieldError>{errors.scheduledAt}</FieldError>
            </div>

            <div>
              <Label>Duration (minutes)</Label>
              <input
                type="number"
                min="15"
                max="480"
                step="5"
                value={form.durationMins ?? ""}
                onChange={(e) => set("durationMins", e.target.value)}
                className={`${inputClass} ${fieldBorder(errors.durationMins)}`}
              />
              <FieldError>{errors.durationMins}</FieldError>
            </div>

            {form.mode === "video" && (
              <div className="sm:col-span-2">
                <Label>Meeting link (optional)</Label>
                <input
                  type="url"
                  value={form.meetingLink ?? ""}
                  maxLength={500}
                  onChange={(e) => set("meetingLink", e.target.value)}
                  placeholder="https://meet.google.com/..."
                  className={`${inputClass} ${fieldBorder(errors.meetingLink)}`}
                />
                <FieldError>{errors.meetingLink}</FieldError>
              </div>
            )}

            {form.mode === "in-person" && (
              <div className="sm:col-span-2">
                <Label>Location (optional)</Label>
                <input
                  value={form.location ?? ""}
                  maxLength={200}
                  onChange={(e) => set("location", e.target.value)}
                  placeholder="e.g. Conference room 2, Jaipur office"
                  className={cls}
                />
              </div>
            )}
          </div>

          <div>
            <Label>Notes (optional)</Label>
            <textarea
              rows={3}
              value={form.notes ?? ""}
              maxLength={1000}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Topics to cover, documents to carry..."
              className={`${cls} resize-none`}
            />
          </div>
        </Box>
      )}

      {/* naya candidate popup: modal ke bahar, sibling ke roop me (form ke andar form nahi banta) */}
      {newCandOpen && (
        <NewCandidateDialog jobs={cand.jobs} onClose={() => setNewCandOpen(false)} onCreated={onCandidateAdded} />
      )}

      {/* details */}
      {viewing && (
        <Box
          title={cname(viewing.candidate)}
          subtitle={`${ROUND[viewing.round]?.label || viewing.round} • ${when(viewing.scheduledAt)}`}
          onClose={() => setViewing(null)}
          footer={
            <FooterBar>
              {viewing.status === "scheduled" && (
                <button type="button" onClick={() => router.push("/recruitment/feedback")} className={primaryBtn}>
                  <MessageSquareText size={14} /> Give feedback
                </button>
              )}
              {viewing.status !== "completed" && (
                <button
                  type="button"
                  onClick={() => {
                    const r = viewing;
                    setViewing(null);
                    openModal(r);
                  }}
                  className={ghostBtn}
                >
                  <Pencil size={14} /> Edit
                </button>
              )}
              <button type="button" onClick={() => setViewing(null)} className={ghostBtn}>
                Close
              </button>
            </FooterBar>
          }
        >
          <div className="flex flex-wrap items-center gap-2">
            <Chip tone={IV[viewing.status]?.tone} dot>
              {IV[viewing.status]?.label}
            </Chip>
            {roundChip(viewing)}
          </div>
          <Info
            rows={[
              ["Candidate", cname(viewing.candidate)],
              ["Email", viewing.candidate?.email],
              ["Phone", viewing.candidate?.phone],
              ["Applied for", viewing.candidate?.jobPosition?.title],
              ["Interviewer", viewing.interviewer?.name],
              ["Date and time", when(viewing.scheduledAt)],
              ["Duration", `${viewing.durationMins || 45} minutes`],
              ["Mode", (MODE[viewing.mode] || MODE.video).label],
              ["Location", viewing.location],
              ["Scheduled by", viewing.scheduledBy?.name],
            ]}
          />
          {viewing.meetingLink && viewing.status === "scheduled" && (
            <a
              href={viewing.meetingLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition"
            >
              <span>Join meeting</span>
              <ExternalLink size={14} />
            </a>
          )}
          {viewing.notes && (
            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/70 border border-slate-200 rounded-2xl p-3.5 whitespace-pre-line break-words">
              {viewing.notes}
            </p>
          )}
          {viewing.status === "completed" && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Stars value={viewing.rating} size={15} />
                {viewing.recommendation && (
                  <Chip tone={RECO[viewing.recommendation]?.tone}>{RECO[viewing.recommendation]?.label}</Chip>
                )}
              </div>
              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line break-words">{viewing.feedback}</p>
            </div>
          )}
        </Box>
      )}

      {ask && <ConfirmDialog title={ask.title} text={ask.text} label="Delete" danger onConfirm={ask.run} onClose={() => setAsk(null)} />}
    </div>
  );
}
