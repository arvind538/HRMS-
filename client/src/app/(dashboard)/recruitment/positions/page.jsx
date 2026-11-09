"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Briefcase, Building2, Clock, Eye, Pencil, Plus, Sparkles, Trash2, Users } from "lucide-react";
import { toast } from "react-toastify";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { ConfirmDialog, ErrorBanner, FieldError, Label, StatCard, dateText, fieldBorder, inputClass } from "@/components/payroll/ui";
import { EmptyBox, FilterTabs, ListSkeleton, PageHeader, SearchBox, primaryBtn } from "@/components/payroll/common";
import { Box, Chip, EMP_TYPES, FooterBar, FormFooter, Info, JOB_STATUS, RowMenu, StatusPicker, errMsg, ghostBtn, idOf } from "@/components/recruitment/rui";
import { DepartmentPicker, LocationPicker, SkillsInput } from "@/components/recruitment/pickers";

const blank = () => ({
  title: "",
  department: "",
  employmentType: "full-time",
  experienceRequired: "",
  numberOfOpenings: "1",
  location: "",
  salaryRange: "",
  skills: [],
  lastDate: "",
  status: "open",
  description: "",
});

const toForm = (p) => ({
  title: p.title || "",
  department: idOf(p.department),
  employmentType: p.employmentType || "full-time",
  experienceRequired: p.experienceRequired || "",
  numberOfOpenings: String(p.numberOfOpenings || 1),
  location: p.location || "",
  salaryRange: p.salaryRange || "",
  skills: Array.isArray(p.requiredSkills) ? p.requiredSkills : [],
  lastDate: p.lastDate ? String(p.lastDate).slice(0, 10) : "",
  status: p.status || "open",
  description: p.description || "",
});

const byName = (a, b) => String(a.name || "").localeCompare(String(b.name || ""));
const typeLabel = (v) => (EMP_TYPES.find(([k]) => k === v) || [, v])[1];
const statusOptions = Object.entries(JOB_STATUS).map(([value, s]) => ({ value, ...s }));

export default function JobPositionsPage() {
  const { user } = useAuth();
  const isAdmin = String(user?.role || "").toLowerCase() === "admin";

  const [rows, setRows] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");

  const [modal, setModal] = useState(null); // { row }
  const [form, setForm] = useState(blank());
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [ask, setAsk] = useState(null);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const [pos, dep] = await Promise.all([
        api.get("/recruitment/positions"),
        api.get("/departments").catch(() => ({ data: [] })),
      ]);
      setRows(Array.isArray(pos.data) ? pos.data : []);
      const list = Array.isArray(dep.data) ? dep.data : dep.data?.departments || [];
      setDepartments([...list].sort(byName));
    } catch (err) {
      setError(await errMsg(err, "Unable to load the job positions."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(
    () => ({
      all: rows.length,
      open: rows.filter((p) => p.status === "open").length,
      "on-hold": rows.filter((p) => p.status === "on-hold").length,
      closed: rows.filter((p) => p.status === "closed").length,
    }),
    [rows]
  );

  const vacancies = useMemo(
    () => rows.filter((p) => p.status === "open").reduce((s, p) => s + (Number(p.numberOfOpenings) || 0), 0),
    [rows]
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(
      (p) =>
        (tab === "all" || p.status === tab) &&
        (!q ||
          `${p.title} ${p.department?.name || ""} ${p.location || ""} ${p.experienceRequired || ""} ${(p.requiredSkills || []).join(" ")}`
            .toLowerCase()
            .includes(q))
    );
  }, [rows, search, tab]);

  /* ---- department: naya department add karo ---- */
  const createDepartment = async (name) => {
    try {
      const { data } = await api.post("/departments", { name });
      const dep = data?.department || data;
      setDepartments((prev) => [...prev, dep].sort(byName));
      toast.success(`Department "${name}" added.`);
      return dep._id;
    } catch (err) {
      toast.error(await errMsg(err, "Unable to add the department."));
      return null;
    }
  };

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

  const save = async (e) => {
    e.preventDefault();
    if (saving) return;

    const next = {};
    const n = Number(form.numberOfOpenings);
    const hired = modal.row?.hiredCount || 0;

    if (form.title.trim().length < 2) next.title = "Please enter the job title (at least 2 characters).";
    if (!form.department) next.department = "Please select a department.";
    if (!Number.isInteger(n) || n < 1 || n > 500) next.numberOfOpenings = "Enter a whole number from 1 to 500.";
    else if (hired && n < hired) next.numberOfOpenings = `Cannot be less than ${hired} (already hired).`;
    setErrors(next);
    if (Object.keys(next).length) return;

    const body = {
      title: form.title.trim(),
      department: form.department,
      employmentType: form.employmentType,
      experienceRequired: form.experienceRequired.trim(),
      numberOfOpenings: n,
      location: form.location.trim(),
      salaryRange: form.salaryRange.trim(),
      requiredSkills: form.skills,
      lastDate: form.lastDate || null,
      status: form.status,
      description: form.description.trim(),
    };

    setSaving(true);
    try {
      if (modal.row) await api.put(`/recruitment/positions/${modal.row._id}`, body);
      else await api.post("/recruitment/positions", body);
      toast.success(modal.row ? "Job position updated." : "Job position created.");
      setModal(null);
      load({ silent: true });
    } catch (err) {
      toast.error(await errMsg(err, "Unable to save the job position."));
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (p, status) => {
    try {
      const { data } = await api.put(`/recruitment/positions/${p._id}`, { status });
      setRows((prev) =>
        prev.map((x) => (x._id === p._id ? { ...x, ...data, candidateCount: x.candidateCount, hiredCount: x.hiredCount } : x))
      );
      setViewing((v) => (v && v._id === p._id ? { ...v, status } : v));
      toast.success(`Marked as ${JOB_STATUS[status].label.toLowerCase()}.`);
    } catch (err) {
      toast.error(await errMsg(err, "Unable to change the status."));
    }
  };

  const remove = (p) =>
    setAsk({
      title: "Delete this job position?",
      text: `${p.title}. This cannot be undone. A position that has candidates cannot be deleted, close it instead.`,
      run: async () => {
        try {
          await api.delete(`/recruitment/positions/${p._id}`);
          toast.success("Job position deleted.");
          await load({ silent: true });
        } catch (err) {
          toast.error(await errMsg(err, "Unable to delete the job position."));
        }
      },
    });

  const menuFor = (p) => [
    { label: "View details", icon: Eye, run: () => setViewing(p) },
    { label: "Edit", icon: Pencil, run: () => openModal(p) },
    { label: "Delete", icon: Trash2, run: () => remove(p), hidden: !isAdmin, danger: true },
  ];

  const mark = (p) => (
    <div className="w-10 h-10 shrink-0 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center font-extrabold text-sm">
      {p.title?.charAt(0)?.toUpperCase() || "J"}
    </div>
  );
  const sub = (p) => [typeLabel(p.employmentType), p.location].filter(Boolean).join(" • ");
  const picker = (p) => <StatusPicker value={p.status} options={statusOptions} onChange={(v) => changeStatus(p, v)} />;

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 py-4 space-y-4 antialiased pb-16">
      <PageHeader
        icon={Briefcase}
        title="Job Positions"
        subtitle="Vacant roles, openings and experience needed."
        onRefresh={() => load({ silent: true })}
        busy={loading || refreshing}
      >
        <button type="button" onClick={() => openModal()} className={primaryBtn}>
          <Plus size={16} /> New Position
        </button>
      </PageHeader>

      {!loading && !error && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <StatCard icon={Briefcase} tone="indigo" label="Total positions" value={counts.all} />
          <StatCard icon={Sparkles} tone="emerald" label="Open roles" value={counts.open} />
          <div className="col-span-2 lg:col-span-1">
            <StatCard icon={Users} tone="violet" label="Open vacancies" value={vacancies} />
          </div>
        </div>
      )}

      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/70 shadow-sm space-y-3">
        <SearchBox value={search} onChange={setSearch} placeholder="Search title, department, location, skill" />
        <FilterTabs
          tabs={[
            ["all", "All", counts.all],
            ["open", "Open", counts.open],
            ["on-hold", "On hold", counts["on-hold"]],
            ["closed", "Closed", counts.closed],
          ]}
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
            icon={Briefcase}
            title={rows.length ? "Nothing matches your search" : "No job positions yet"}
            text={rows.length ? "Try another keyword or filter." : 'Click "New Position" to add the first one.'}
          />
        ) : (
          <>
            {/* mobile and tablet: cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 sm:p-4 lg:hidden">
              {visible.map((p) => (
                <div
                  key={p._id}
                  onClick={() => setViewing(p)}
                  className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 space-y-3 hover:border-indigo-200 hover:shadow-sm transition cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    {mark(p)}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-900 break-words">{p.title}</p>
                      <p className="text-[11px] text-slate-400">
                        {p.department?.name || "General"}
                        {sub(p) ? ` • ${sub(p)}` : ""}
                      </p>
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                      <RowMenu items={menuFor(p)} />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {picker(p)}
                    <Chip tone="violet">
                      <Users size={11} /> {p.hiredCount || 0}/{p.numberOfOpenings}
                    </Chip>
                    <Chip tone="slate">{p.candidateCount || 0} candidates</Chip>
                  </div>
                </div>
              ))}
            </div>

            {/* desktop: table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                  <tr>
                    <th className="px-5 py-3.5">Position</th>
                    <th className="px-4 py-3.5">Department</th>
                    <th className="px-4 py-3.5">Experience</th>
                    <th className="px-4 py-3.5">Filled / Openings</th>
                    <th className="px-4 py-3.5">Candidates</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5 text-center w-20">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visible.map((p) => (
                    <tr
                      key={p._id}
                      onClick={() => setViewing(p)}
                      className="hover:bg-indigo-50/40 transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-3 align-middle">
                        <div className="flex items-center gap-3 min-w-0">
                          {mark(p)}
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 text-sm truncate max-w-[240px]">{p.title}</p>
                            <p className="text-[11px] text-slate-400 truncate max-w-[240px]">{sub(p) || "—"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-middle whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
                          <Building2 size={13} className="text-slate-400" />
                          {p.department?.name || "General"}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-middle whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock size={13} className="text-slate-400" />
                          {p.experienceRequired || "Not specified"}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-middle whitespace-nowrap">
                        <Chip tone="violet">
                          <Users size={11} /> {p.hiredCount || 0} / {p.numberOfOpenings}
                        </Chip>
                      </td>
                      <td className="px-4 py-3 align-middle whitespace-nowrap font-semibold text-slate-700">
                        {p.candidateCount || 0}
                      </td>
                      <td className="px-4 py-3 align-middle whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        {picker(p)}
                      </td>
                      <td className="px-4 py-3 align-middle text-center" onClick={(e) => e.stopPropagation()}>
                        <RowMenu items={menuFor(p)} />
                      </td>
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
        <Box
          title={modal.row ? "Edit job position" : "New job position"}
          subtitle="Fill the details of the role"
          onClose={() => setModal(null)}
          onSubmit={save}
          locked={saving}
          size="max-w-2xl"
          footer={<FormFooter onCancel={() => setModal(null)} busy={saving} label={modal.row ? "Save changes" : "Create position"} />}
        >
          <div>
            <Label>Job title</Label>
            <input
              value={form.title ?? ""}
              maxLength={120}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. Senior Frontend Engineer"
              className={`${inputClass} ${fieldBorder(errors.title)}`}
            />
            <FieldError>{errors.title}</FieldError>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Department</Label>
              <DepartmentPicker
                value={form.department}
                options={departments}
                onChange={(v) => set("department", v)}
                onCreate={createDepartment}
                error={errors.department}
              />
              <FieldError>{errors.department}</FieldError>
            </div>

            <div>
              <Label>Job type</Label>
              <select
                value={form.employmentType ?? ""}
                onChange={(e) => set("employmentType", e.target.value)}
                className={`${inputClass} cursor-pointer border-slate-200 focus:border-indigo-500`}
              >
                {EMP_TYPES.map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>Experience needed</Label>
              <input
                value={form.experienceRequired ?? ""}
                maxLength={60}
                onChange={(e) => set("experienceRequired", e.target.value)}
                placeholder="e.g. 2-4 years"
                className={`${inputClass} border-slate-200 focus:border-indigo-500`}
              />
            </div>

            <div>
              <Label>Number of openings</Label>
              <input
                type="number"
                min="1"
                max="500"
                value={form.numberOfOpenings ?? ""}
                onChange={(e) => set("numberOfOpenings", e.target.value)}
                className={`${inputClass} ${fieldBorder(errors.numberOfOpenings)}`}
              />
              <FieldError>{errors.numberOfOpenings}</FieldError>
            </div>

            <div>
              <Label>Salary range</Label>
              <input
                value={form.salaryRange ?? ""}
                maxLength={60}
                onChange={(e) => set("salaryRange", e.target.value)}
                placeholder="e.g. 4-6 LPA"
                className={`${inputClass} border-slate-200 focus:border-indigo-500`}
              />
            </div>

            <div>
              <Label>Last date to apply</Label>
              <input
                type="date"
                value={form.lastDate ?? ""}
                onChange={(e) => set("lastDate", e.target.value)}
                className={`${inputClass} cursor-pointer border-slate-200 focus:border-indigo-500`}
              />
            </div>
          </div>

          <div>
            <Label>Location</Label>
            <LocationPicker value={form.location} onChange={(v) => set("location", v)} />
          </div>

          <div>
            <Label>Status</Label>
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl">
              {statusOptions.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => set("status", o.value)}
                  className={`py-2.5 sm:py-2 text-xs font-bold rounded-lg transition cursor-pointer ${form.status === o.value ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                    }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>Required skills</Label>
            <SkillsInput value={form.skills} onChange={(v) => set("skills", v)} />
          </div>

          <div>
            <Label>Role summary</Label>
            <textarea
              rows={4}
              value={form.description ?? ""}
              maxLength={4000}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Responsibilities and expectations"
              className={`${inputClass} resize-y border-slate-200 focus:border-indigo-500`}
            />
          </div>
        </Box>
      )}

      {/* details */}
      {viewing && (
        <Box
          title={viewing.title}
          subtitle={viewing.department?.name || "General"}
          onClose={() => setViewing(null)}
          footer={
            <FooterBar>
              <button
                type="button"
                onClick={() => {
                  const p = viewing;
                  setViewing(null);
                  openModal(p);
                }}
                className={primaryBtn}
              >
                <Pencil size={14} /> Edit
              </button>
              <button type="button" onClick={() => setViewing(null)} className={ghostBtn}>
                Close
              </button>
            </FooterBar>
          }
        >
          <div className="flex flex-wrap items-center gap-2">
            <Chip tone={JOB_STATUS[viewing.status]?.tone} dot>
              {JOB_STATUS[viewing.status]?.label}
            </Chip>
            <Chip tone={viewing.isLive ? "emerald" : "slate"}>{viewing.isLive ? "Live on job posts" : "Not live"}</Chip>
          </div>
          <Info
            rows={[
              ["Job type", typeLabel(viewing.employmentType)],
              ["Experience", viewing.experienceRequired],
              ["Location", viewing.location],
              ["Salary range", viewing.salaryRange],
              ["Openings", viewing.numberOfOpenings],
              ["Hired so far", viewing.hiredCount || 0],
              ["Candidates", viewing.candidateCount || 0],
              ["Last date", viewing.lastDate ? dateText(viewing.lastDate) : ""],
              ["Posted on", viewing.postedOn ? dateText(viewing.postedOn) : ""],
            ]}
          />
          {viewing.requiredSkills?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {viewing.requiredSkills.map((s) => (
                <Chip key={s} tone="indigo">
                  {s}
                </Chip>
              ))}
            </div>
          )}
          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/70 border border-slate-200 rounded-2xl p-3.5 whitespace-pre-line break-words">
            {viewing.description || "No description added yet."}
          </p>
        </Box>
      )}

      {ask && (
        <ConfirmDialog
          title={ask.title}
          text={ask.text}
          label="Delete"
          danger
          onConfirm={ask.run}
          onClose={() => setAsk(null)}
        />
      )}
    </div>
  );
}
