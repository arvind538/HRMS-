"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock, Eye, FileCheck2, FileText, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { ConfirmDialog, ErrorBanner, FieldError, Label, StatCard, dateText, fieldBorder, inputClass } from "@/components/payroll/ui";
import { EmptyBox, FilterTabs, ListSkeleton, PageHeader, SearchBox, primaryBtn } from "@/components/payroll/common";
import { Box, Chip, FooterBar, FormFooter, Info, RowMenu, StatusPicker, errMsg, ghostBtn, idOf } from "@/components/recruitment/rui";
import OfferLetter from "@/components/recruitment/OfferLetter";
import { CandidateSelect, explainEmpty, personName, useCandidateOptions, usePeopleOptions } from "@/components/recruitment/CandidatePicker";

const OFFER = { draft: { label: "Draft", tone: "slate" }, sent: { label: "Sent", tone: "indigo" }, accepted: { label: "Accepted", tone: "emerald" }, declined: { label: "Declined", tone: "rose" }, withdrawn: { label: "Withdrawn", tone: "amber" } };
const FINAL = ["accepted", "declined", "withdrawn"];
const statusOptions = Object.entries(OFFER).map(([value, s]) => ({ value, ...s, disabled: value === "draft", hint: value === "draft" ? "Cannot go back to draft" : undefined }));

const WORK_MODE = { office: "Work from office", remote: "Work from home", hybrid: "Hybrid" };
const DEFAULT_LOCATION = "Shop No.6&7, Gulab Vihar, Agra Road, Jamdoli, Jaipur, Rajasthan - 302031";
const DEFAULT_TIMING = "10:00 AM to 5:00 PM";

const PRESET_DESIGNATIONS = {
  job: ["Software Engineer", "Frontend Developer", "Backend Developer", "Full Stack Developer", "UI/UX Designer", "HR Executive", "Accountant", "Sales Executive", "Business Development Executive", "Marketing Executive", "Customer Support Executive"],
  internship: ["Frontend Developer Intern", "Backend Developer Intern", "Full Stack Developer Intern", "UI/UX Design Intern", "Digital Marketing Intern", "HR Intern", "Content Writing Intern", "Business Development Intern"],
};

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const pad = (n) => String(n).padStart(2, "0");
const day = (v) => (v ? String(v).slice(0, 10) : "");
const localDay = (v) => {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "" : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const today = () => new Date().toISOString().slice(0, 10);

/* the name of a candidate in a list (any field name works) */
const cname = (c) => personName(c) || "Candidate";
/* a hired or rejected candidate cannot get an offer */
const open = (c) => !["hired", "rejected"].includes(String(c?.status || "").toLowerCase());

const isIntern = (o) => o?.offerType === "internship";
const payMain = (o) => (isIntern(o) ? (Number(o.stipend) > 0 ? `${inr(o.stipend)} / month` : "Unpaid") : inr(o.annualCtc));
const paySub = (o) => (isIntern(o) ? `${o.durationMonths || "—"} month internship` : `${inr(Math.round((o.annualCtc || 0) / 12))} / month`);

const blank = () => ({
  offerType: "job", candidate: "", designation: "", annualCtc: "", durationMonths: "3", stipend: "",
  offerDate: today(), interviewDate: "", joiningDate: "", validTill: "",
  workMode: "office", location: DEFAULT_LOCATION, officeTiming: DEFAULT_TIMING, department: "", reportingTo: "",
  status: "sent", notes: "",
});
const toForm = (o) => ({
  offerType: o.offerType === "internship" ? "internship" : "job",
  candidate: idOf(o.candidate), designation: o.designation || "", annualCtc: o.annualCtc ? String(o.annualCtc) : "",
  durationMonths: String(o.durationMonths || 3), stipend: o.stipend ? String(o.stipend) : "",
  offerDate: day(o.offerDate), interviewDate: day(o.interviewDate), joiningDate: day(o.joiningDate), validTill: day(o.validTill),
  workMode: o.workMode || "office", location: o.location || "", officeTiming: o.officeTiming || "", department: o.department || "", reportingTo: o.reportingTo || "",
  status: o.status, notes: o.notes || "",
});

export default function OfferLettersPage() {
  const { user } = useAuth();
  const isAdmin = String(user?.role || "").toLowerCase() === "admin";
  const isStaff = ["admin", "hr"].includes(String(user?.role || "").toLowerCase());

  const cand = useCandidateOptions();
  const staff = usePeopleOptions();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");

  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(blank());
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [customDesig, setCustomDesig] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [letter, setLetter] = useState(null);
  const [ask, setAsk] = useState(null);

  /* designations of the organization (used for the Designation dropdown) */
  const [orgDesignations, setOrgDesignations] = useState([]);
  /* the last interview date of every candidate (used to pre-fill "Interview date") */
  const [lastInterview, setLastInterview] = useState({});

  const load = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/recruitment/offers");
      setRows(Array.isArray(data) ? data : data?.offers || data?.data || []);
    } catch (err) {
      setError(await errMsg(err, "Unable to load the offers."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* these two are only conveniences (a dropdown list and a pre-filled date), so a failure is not shown */
  useEffect(() => {
    api.get("/organization/designations?status=active")
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : data?.data || data?.designations || [];
        setOrgDesignations(list.map((d) => (typeof d === "string" ? d : d?.title || d?.name || "")).filter(Boolean));
      })
      .catch(() => { });

    api.get("/recruitment/interviews")
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : data?.interviews || [];
        const latest = {};
        list
          .filter((i) => ["scheduled", "completed"].includes(i.status))
          .forEach((i) => {
            const id = idOf(i.candidate);
            const t = new Date(i.scheduledAt).getTime();
            if (id && (!latest[id] || t > latest[id].t)) latest[id] = { t, date: localDay(i.scheduledAt) };
          });
        setLastInterview(Object.fromEntries(Object.entries(latest).map(([k, v]) => [k, v.date])));
      })
      .catch(() => { });
  }, []);

  const refresh = () => {
    load({ silent: true });
    cand.reload();
    staff.reload();
  };

  /* candidates who already have a draft or a sent offer */
  const busy = useMemo(() => new Set(rows.filter((o) => ["draft", "sent"].includes(o.status)).map((o) => idOf(o.candidate))), [rows]);

  /* candidates who can still get an offer */
  const canPick = useCallback((c) => open(c) && !busy.has(c._id), [busy]);
  const pool = useMemo(() => cand.candidates.filter(canPick), [cand.candidates, canPick]);

  const emptyText = useMemo(
    () => explainEmpty(cand.candidates, [
      ["hired", (c) => c.status === "hired"],
      ["rejected", (c) => c.status === "rejected"],
      ["with an active offer", (c) => busy.has(c._id)],
    ]),
    [cand.candidates, busy]
  );

  const counts = useMemo(() => {
    const c = { all: rows.length };
    Object.keys(OFFER).forEach((k) => (c[k] = rows.filter((o) => o.status === k).length));
    return c;
  }, [rows]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((o) => (tab === "all" || o.status === tab) && (!q || `${cname(o.candidate)} ${o.candidate?.email || ""} ${o.designation || ""}`.toLowerCase().includes(q)));
  }, [rows, tab, search]);

  /* ---- designation dropdown ---- */
  const designationOptions = useMemo(() => {
    const all = new Set();
    [
      ...orgDesignations,
      ...cand.jobs.map((j) => j.title),
      ...rows.map((o) => o.designation),
      ...PRESET_DESIGNATIONS[form.offerType === "internship" ? "internship" : "job"],
    ].forEach((v) => {
      const t = String(v || "").trim();
      if (t) all.add(t);
    });
    return [...all].sort((a, b) => a.localeCompare(b));
  }, [orgDesignations, cand.jobs, rows, form.offerType]);

  const showCustom = customDesig || (Boolean(form.designation) && !designationOptions.includes(form.designation));

  /* ---- form ---- */
  const openModal = (row = null) => {
    setForm(row ? toForm(row) : blank());
    setErrors({});
    setCustomDesig(false);
    setModal({ row });
  };
  const set = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => (p[k] ? { ...p, [k]: undefined } : p));
  };
  const pickDesignation = (v) => {
    if (v === "__other__") {
      setCustomDesig(true);
      set("designation", "");
    } else {
      setCustomDesig(false);
      set("designation", v);
    }
  };
  /* the candidate object comes with the id, so a candidate who was just added also works */
  const pickCandidate = (id, picked) => {
    const c = picked || cand.candidates.find((x) => x._id === id);
    setForm((p) => ({ ...p, candidate: id, designation: p.designation || c?.jobTitle || "", interviewDate: p.interviewDate || lastInterview[id] || "" }));
    setErrors((p) => ({ ...p, candidate: undefined }));
  };

  const intern = form.offerType === "internship";

  const save = async (e) => {
    e.preventDefault();
    if (saving) return;
    const row = modal.row;
    const next = {};
    const ctc = Number(form.annualCtc);
    const months = Number(form.durationMonths);
    const stipend = form.stipend === "" ? 0 : Number(form.stipend);

    if (!row && !form.candidate) next.candidate = "Please select the candidate.";
    if (form.designation.trim().length < 2) next.designation = "Please select or enter the designation.";
    if (!intern && (!Number.isFinite(ctc) || ctc <= 0)) next.annualCtc = "Enter the annual CTC.";
    if (intern && (!Number.isInteger(months) || months < 1 || months > 24)) next.durationMonths = "Enter 1 to 24 months.";
    if (intern && (!Number.isFinite(stipend) || stipend < 0)) next.stipend = "Enter 0 or the monthly stipend.";
    if (form.joiningDate && form.offerDate && form.joiningDate < form.offerDate) next.joiningDate = "Joining date cannot be before the offer date.";
    if (form.validTill && form.offerDate && form.validTill < form.offerDate) next.validTill = "Valid till cannot be before the offer date.";
    setErrors(next);
    if (Object.keys(next).length) return;

    const body = {
      offerType: form.offerType,
      designation: form.designation.trim(),
      annualCtc: intern ? 0 : ctc,
      durationMonths: intern ? months : undefined,
      stipend: intern ? stipend : 0,
      offerDate: form.offerDate,
      interviewDate: form.interviewDate,
      joiningDate: form.joiningDate,
      validTill: form.validTill,
      workMode: form.workMode,
      location: form.workMode === "remote" ? "" : form.location.trim(),
      officeTiming: form.officeTiming.trim(),
      department: form.department.trim(),
      reportingTo: form.reportingTo.trim(),
      notes: form.notes.trim(),
    };
    if (!row) Object.assign(body, { candidate: form.candidate, status: form.status });

    setSaving(true);
    try {
      if (row) await api.put(`/recruitment/offers/${row._id}`, body);
      else await api.post("/recruitment/offers", body);
      toast.success(row ? "Offer updated." : form.status === "sent" ? "Offer created and marked as sent." : "Offer saved as draft.");
      setModal(null);
      load({ silent: true });
      cand.reload();
    } catch (err) {
      toast.error(await errMsg(err, "Unable to save the offer."));
    } finally {
      setSaving(false);
    }
  };

  const apply = async (o, status) => {
    try {
      const { data } = await api.put(`/recruitment/offers/${o._id}/status`, { status });
      setRows((prev) => prev.map((x) => (x._id === o._id ? data : x)));
      setViewing((v) => (v && v._id === o._id ? data : v));
      toast.success(status === "accepted" ? "Offer accepted. The candidate is now hired." : `Offer marked as ${OFFER[status].label.toLowerCase()}.`);
      load({ silent: true });
      cand.reload();
    } catch (err) {
      toast.error(await errMsg(err, "Unable to change the status."));
    }
  };

  const changeStatus = (o, status) => {
    if (status === "sent") return apply(o, status);
    setAsk({
      title: `Mark this offer as ${OFFER[status].label.toLowerCase()}?`,
      text: status === "accepted" ? `${cname(o.candidate)} will be marked as hired. This cannot be undone.` : "This cannot be undone.",
      label: OFFER[status].label,
      danger: status !== "accepted",
      run: () => apply(o, status),
    });
  };

  const remove = (o) =>
    setAsk({
      title: "Delete this offer?",
      text: `${cname(o.candidate)} • ${o.designation}. This cannot be undone.`,
      label: "Delete",
      danger: true,
      run: async () => {
        try {
          await api.delete(`/recruitment/offers/${o._id}`);
          toast.success("Offer deleted.");
          await load({ silent: true });
        } catch (err) {
          toast.error(await errMsg(err, "Unable to delete the offer."));
        }
      },
    });

  const editable = (o) => ["draft", "sent"].includes(o.status);
  const menuFor = (o) => [
    { label: "View details", icon: Eye, run: () => setViewing(o) },
    { label: "Offer letter", icon: FileText, run: () => setLetter(o) },
    { label: "Edit", icon: Pencil, run: () => openModal(o), hidden: !editable(o) },
    { label: "Delete", icon: Trash2, run: () => remove(o), hidden: !isAdmin || o.status === "accepted", danger: true },
  ];

  const picker = (o) => <StatusPicker value={o.status} options={statusOptions} disabled={FINAL.includes(o.status)} onChange={(v) => changeStatus(o, v)} />;
  const mark = (o) => <div className="w-10 h-10 shrink-0 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center font-extrabold text-sm">{cname(o.candidate).charAt(0).toUpperCase()}</div>;
  const typeChip = (o) => <Chip tone={isIntern(o) ? "sky" : "violet"}>{isIntern(o) ? "Internship" : "Job"}</Chip>;
  const cls = `${inputClass} border-slate-200 focus:border-indigo-500`;
  const monthly = Number(form.annualCtc) > 0 ? inr(Math.round(Number(form.annualCtc) / 12)) : "—";

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 py-4 space-y-4 antialiased pb-16">
      <PageHeader icon={FileCheck2} title="Offer Letters" subtitle="Make offers, track the reply and print the offer letter." onRefresh={refresh} busy={loading || refreshing}>
        <button type="button" onClick={() => openModal()} className={primaryBtn}><Plus size={16} /> New Offer</button>
      </PageHeader>

      {!loading && !error && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <StatCard icon={FileCheck2} tone="indigo" label="Total offers" value={counts.all} />
          <StatCard icon={Clock} tone="violet" label="Awaiting reply" value={counts.draft + counts.sent} />
          <div className="col-span-2 lg:col-span-1"><StatCard icon={CheckCircle2} tone="emerald" label="Accepted" value={counts.accepted} /></div>
        </div>
      )}

      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/70 shadow-sm space-y-3">
        <SearchBox value={search} onChange={setSearch} placeholder="Search candidate or designation" />
        <FilterTabs tabs={[["all", "All", counts.all], ...Object.entries(OFFER).map(([k, s]) => [k, s.label, counts[k]])]} value={tab} onChange={setTab} />
      </div>

      <ErrorBanner message={error} onRetry={() => load()} />

      <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
        {loading ? <ListSkeleton /> : visible.length === 0 ? (
          <EmptyBox icon={FileCheck2} title={rows.length ? "Nothing matches your search" : "No offers yet"} text={rows.length ? "Try another tab or keyword." : 'Click "New Offer" to make the first one.'} />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 sm:p-4 lg:hidden">
              {visible.map((o) => (
                <div key={o._id} onClick={() => setViewing(o)} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 space-y-3 hover:border-indigo-200 hover:shadow-sm transition cursor-pointer">
                  <div className="flex items-start gap-3">
                    {mark(o)}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-900 break-words">{cname(o.candidate)}</p>
                      <p className="text-[11px] text-slate-400">{o.designation}</p>
                    </div>
                    <div onClick={(e) => e.stopPropagation()}><RowMenu items={menuFor(o)} /></div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {picker(o)}
                    {typeChip(o)}
                    {o.expired && <Chip tone="rose">Expired</Chip>}
                    <Chip tone="violet">{payMain(o)}</Chip>
                  </div>
                  {o.joiningDate && <p className="text-[11px] text-slate-400 font-medium">Joining {dateText(o.joiningDate)}</p>}
                </div>
              ))}
            </div>

            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                  <tr>
                    <th className="px-5 py-3.5">Candidate</th>
                    <th className="px-4 py-3.5">Designation</th>
                    <th className="px-4 py-3.5">Compensation</th>
                    <th className="px-4 py-3.5">Joining</th>
                    <th className="px-4 py-3.5">Valid till</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5 text-center w-20">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visible.map((o) => (
                    <tr key={o._id} onClick={() => setViewing(o)} className="hover:bg-indigo-50/40 transition-colors cursor-pointer">
                      <td className="px-5 py-3 align-middle">
                        <div className="flex items-center gap-3 min-w-0">
                          {mark(o)}
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 text-sm truncate max-w-[190px]">{cname(o.candidate)}</p>
                            <p className="text-[11px] text-slate-400 truncate max-w-[190px]">{o.candidate?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-middle whitespace-nowrap"><p className="font-semibold text-slate-700">{o.designation}</p><div className="mt-1">{typeChip(o)}</div></td>
                      <td className="px-4 py-3 align-middle whitespace-nowrap"><p className="font-bold text-slate-800">{payMain(o)}</p><p className="text-[11px] text-slate-400">{paySub(o)}</p></td>
                      <td className="px-4 py-3 align-middle whitespace-nowrap">{o.joiningDate ? dateText(o.joiningDate) : "—"}</td>
                      <td className="px-4 py-3 align-middle whitespace-nowrap">{o.validTill ? dateText(o.validTill) : "—"}{o.expired && <span className="ml-1.5 text-[10px] font-bold text-rose-600">Expired</span>}</td>
                      <td className="px-4 py-3 align-middle whitespace-nowrap" onClick={(e) => e.stopPropagation()}>{picker(o)}</td>
                      <td className="px-4 py-3 align-middle text-center" onClick={(e) => e.stopPropagation()}><RowMenu items={menuFor(o)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* create / edit */}
      {modal && (
        <Box title={modal.row ? "Edit offer" : "New offer"} subtitle="Fill the compensation, dates and joining details" onClose={() => setModal(null)} onSubmit={save} locked={saving} size="max-w-2xl" footer={<FormFooter onCancel={() => setModal(null)} busy={saving} label={modal.row ? "Save changes" : form.status === "sent" ? "Create and send" : "Save draft"} />}>
          {/* type */}
          <div>
            <Label>Offer type</Label>
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl">
              {[["job", "Job offer"], ["internship", "Internship"]].map(([k, l]) => (
                <button key={k} type="button" onClick={() => set("offerType", k)} className={`py-2.5 sm:py-2 text-xs font-bold rounded-lg transition cursor-pointer ${form.offerType === k ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>{l}</button>
              ))}
            </div>
          </div>

          {/* candidate */}
          {modal.row ? (
            <div>
              <Label>Candidate</Label>
              <input value={cname(modal.row.candidate)} disabled className={`${cls} bg-slate-100 text-slate-500`} />
            </div>
          ) : (
            <CandidateSelect
              value={form.candidate}
              onChange={pickCandidate}
              pool={pool}
              loading={cand.loading}
              loadError={cand.error}
              onRetry={cand.reload}
              error={errors.candidate}
              canAdd={isStaff}
              jobs={cand.jobs}
              required={cand.required}
              onCreated={cand.add}
              canPick={canPick}
              emptyText={emptyText}
            />
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* designation: pick from the list or add a new one */}
            <div>
              <Label>Designation</Label>
              <select value={showCustom ? "__other__" : form.designation} onChange={(e) => pickDesignation(e.target.value)} className={`${inputClass} cursor-pointer ${fieldBorder(errors.designation)}`}>
                <option value="">Select designation</option>
                {designationOptions.map((d) => <option key={d} value={d}>{d}</option>)}
                <option value="__other__">+ Add new designation</option>
              </select>
              {showCustom && (
                <input value={form.designation ?? ""} autoFocus maxLength={120} onChange={(e) => set("designation", e.target.value)} placeholder={intern ? "e.g. Frontend Developer Intern" : "e.g. Frontend Developer"} className={`${inputClass} mt-2 ${fieldBorder(errors.designation)}`} />
              )}
              <FieldError>{errors.designation}</FieldError>
            </div>

            {/* pay: CTC for a job, duration and stipend for an internship */}
            {!intern ? (
              <div>
                <Label>Annual CTC (₹)</Label>
                <input type="number" min="0" value={form.annualCtc ?? ""} onChange={(e) => set("annualCtc", e.target.value)} placeholder="e.g. 600000" className={`${inputClass} ${fieldBorder(errors.annualCtc)}`} />
                <FieldError>{errors.annualCtc}</FieldError>
                <p className="text-[11px] text-slate-400 mt-1">Monthly: <b className="text-slate-600">{monthly}</b></p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Duration (months)</Label>
                  <input type="number" min="1" max="24" value={form.durationMonths ?? ""} onChange={(e) => set("durationMonths", e.target.value)} className={`${inputClass} ${fieldBorder(errors.durationMonths)}`} />
                  <FieldError>{errors.durationMonths}</FieldError>
                </div>
                <div>
                  <Label>Stipend / month (₹)</Label>
                  <input type="number" min="0" value={form.stipend ?? ""} onChange={(e) => set("stipend", e.target.value)} placeholder="0 = unpaid" className={`${inputClass} ${fieldBorder(errors.stipend)}`} />
                  <FieldError>{errors.stipend}</FieldError>
                </div>
                <p className="col-span-2 text-[11px] text-slate-400 -mt-1">Leave the stipend empty or 0 for a <b className="text-slate-600">completely unpaid</b> internship.</p>
              </div>
            )}

            <div>
              <Label>Offer date</Label>
              <input type="date" value={form.offerDate ?? ""} onChange={(e) => set("offerDate", e.target.value)} className={`${cls} cursor-pointer`} />
            </div>
            <div>
              <Label>Interview date (optional)</Label>
              <input type="date" value={form.interviewDate ?? ""} onChange={(e) => set("interviewDate", e.target.value)} className={`${cls} cursor-pointer`} />
            </div>
            <div>
              <Label>Joining date</Label>
              <input type="date" value={form.joiningDate ?? ""} onChange={(e) => set("joiningDate", e.target.value)} className={`${inputClass} cursor-pointer ${fieldBorder(errors.joiningDate)}`} />
              <FieldError>{errors.joiningDate}</FieldError>
            </div>
            <div>
              <Label>Offer valid till</Label>
              <input type="date" value={form.validTill ?? ""} onChange={(e) => set("validTill", e.target.value)} className={`${inputClass} cursor-pointer ${fieldBorder(errors.validTill)}`} />
              <FieldError>{errors.validTill}</FieldError>
            </div>

            <div>
              <Label>Work mode</Label>
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl">
                {Object.entries(WORK_MODE).map(([k, l]) => (
                  <button key={k} type="button" onClick={() => set("workMode", k)} className={`py-2.5 sm:py-2 text-[11px] font-bold rounded-lg transition cursor-pointer ${form.workMode === k ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>{k === "office" ? "Office" : k === "remote" ? "Home" : "Hybrid"}</button>
                ))}
              </div>
            </div>
            <div>
              <Label>Office timing</Label>
              <input value={form.officeTiming ?? ""} maxLength={60} onChange={(e) => set("officeTiming", e.target.value)} placeholder="e.g. 10:00 AM to 5:00 PM" className={cls} />
            </div>

            {form.workMode !== "remote" && (
              <div className="sm:col-span-2">
                <Label>Location</Label>
                <input value={form.location ?? ""} maxLength={250} onChange={(e) => set("location", e.target.value)} placeholder="Office address" className={cls} />
              </div>
            )}

            <div>
              <Label>Department</Label>
              <input value={form.department ?? ""} maxLength={80} onChange={(e) => set("department", e.target.value)} placeholder="e.g. Technology / Development" className={cls} />
            </div>
            <div>
              <Label>Reporting to</Label>
              <input list="offer-people" value={form.reportingTo ?? ""} maxLength={80} onChange={(e) => set("reportingTo", e.target.value)} placeholder="Name of the manager" className={cls} />
              <datalist id="offer-people">
                {staff.people.map((p) => <option key={p._id} value={p.name} />)}
              </datalist>
            </div>

            {!modal.row && (
              <div className="sm:col-span-2">
                <Label>Save as</Label>
                <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl">
                  {[["sent", "Send now"], ["draft", "Draft"]].map(([k, l]) => (
                    <button key={k} type="button" onClick={() => set("status", k)} className={`py-2.5 sm:py-2 text-xs font-bold rounded-lg transition cursor-pointer ${form.status === k ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>{l}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <textarea rows={3} value={form.notes ?? ""} maxLength={1000} onChange={(e) => set("notes", e.target.value)} className={`${cls} resize-none`} />
          </div>
        </Box>
      )}

      {/* details */}
      {viewing && (
        <Box title={cname(viewing.candidate)} subtitle={viewing.designation} onClose={() => setViewing(null)} footer={
          <FooterBar>
            <button type="button" onClick={() => { const o = viewing; setViewing(null); setLetter(o); }} className={primaryBtn}><FileText size={14} /> Offer letter</button>
            {editable(viewing) && <button type="button" onClick={() => { const o = viewing; setViewing(null); openModal(o); }} className={ghostBtn}><Pencil size={14} /> Edit</button>}
            <button type="button" onClick={() => setViewing(null)} className={ghostBtn}>Close</button>
          </FooterBar>
        }>
          <div className="flex flex-wrap items-center gap-2">
            <Chip tone={OFFER[viewing.status]?.tone} dot>{OFFER[viewing.status]?.label}</Chip>
            {typeChip(viewing)}
            {viewing.expired && <Chip tone="rose">Expired</Chip>}
          </div>
          <Info rows={[
            ["Email", viewing.candidate?.email], ["Designation", viewing.designation],
            ...(isIntern(viewing)
              ? [["Duration", `${viewing.durationMonths || "—"} months`], ["Stipend", Number(viewing.stipend) > 0 ? `${inr(viewing.stipend)} / month` : "Unpaid"]]
              : [["Annual CTC", inr(viewing.annualCtc)], ["Monthly gross", inr(Math.round((viewing.annualCtc || 0) / 12))]]),
            ["Work mode", WORK_MODE[viewing.workMode]], ["Location", viewing.location], ["Office timing", viewing.officeTiming],
            ["Department", viewing.department], ["Reporting to", viewing.reportingTo],
            ["Offer date", viewing.offerDate ? dateText(viewing.offerDate) : ""], ["Interview date", viewing.interviewDate ? dateText(viewing.interviewDate) : ""],
            ["Joining date", viewing.joiningDate ? dateText(viewing.joiningDate) : ""], ["Valid till", viewing.validTill ? dateText(viewing.validTill) : ""],
            ["Replied on", viewing.respondedOn ? dateText(viewing.respondedOn) : ""],
          ]} />
          {viewing.notes && <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/70 border border-slate-200 rounded-2xl p-3.5 whitespace-pre-line break-words">{viewing.notes}</p>}
        </Box>
      )}

      {letter && <OfferLetter offer={letter} onClose={() => setLetter(null)} />}
      {ask && <ConfirmDialog title={ask.title} text={ask.text} label={ask.label} danger={ask.danger} onConfirm={ask.run} onClose={() => setAsk(null)} />}
    </div>
  );
}
