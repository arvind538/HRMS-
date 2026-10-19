"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Loader2,
  Pin,
  Trash2,
  Megaphone,
  Search,
  X,
  RefreshCw,
  Users,
  Building2,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import { useAuth } from "@/context/AuthContext";

/* -------------------------------------------------------------------------- */
/* CONSTANTS & HELPERS                                                        */
/* -------------------------------------------------------------------------- */

const TITLE_MAX = 120;
const CONTENT_MAX = 2000;
const LONG_TEXT = 220;

const AUDIENCES = [
  { value: "all", label: "All Employees", hint: "Everyone in the company", icon: Users },
  { value: "department", label: "Department", hint: "One department only", icon: Building2 },
  { value: "specific-role", label: "Role", hint: "One role only", icon: ShieldCheck },
];

const ROLE_OPTIONS = [
  { value: "employee", label: "Employees" },
  { value: "manager", label: "Managers" },
  { value: "hr", label: "HR" },
  { value: "admin", label: "Admins" },
];
const ROLE_LABEL = Object.fromEntries(ROLE_OPTIONS.map((r) => [r.value, r.label]));

const EMPTY_FORM = { title: "", content: "", audience: "all", department: "", targetRole: "", pinned: false };

const inputClass =
  "w-full px-4 py-3 bg-slate-50 border rounded-xl text-base sm:text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:bg-white focus:ring-4 focus:ring-indigo-500/10";

const toList = (data) => (Array.isArray(data) ? data : data?.data || data?.departments || []);

const initialsOf = (name) => {
  const parts = String(name || "A").trim().split(" ").filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2)).toUpperCase();
};

const fullDate = (v) => {
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

const postedLabel = (v) => {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  if (diff < 60 * 1000) return "Just now";
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)} min ago`;
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / 3600000)} hr ago`;
  if (diff < 48 * 60 * 60 * 1000) return "Yesterday";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

const isFresh = (v) => Date.now() - new Date(v).getTime() < 48 * 60 * 60 * 1000;

const audienceLabel = (a) => {
  if (a.audience === "department") return a.department?.name || "Department";
  if (a.audience === "specific-role") return ROLE_LABEL[a.targetRole || a.role] || "Specific role";
  return "All Employees";
};

/* -------------------------------------------------------------------------- */
/* SMALL COMPONENTS                                                           */
/* -------------------------------------------------------------------------- */

function FieldError({ children }) {
  if (!children) return null;
  return (
    <p className="flex items-start gap-1.5 mt-1.5 text-[11px] font-semibold text-rose-600">
      <AlertCircle size={13} className="shrink-0 mt-px" />
      <span>{children}</span>
    </p>
  );
}

function Label({ children }) {
  return <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">{children}</label>;
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-6 flex gap-4 animate-pulse">
      <div className="w-11 h-11 rounded-xl bg-slate-100 shrink-0" />
      <div className="flex-1 space-y-3">
        <div className="h-4 w-2/5 rounded bg-slate-100" />
        <div className="h-3 w-full rounded bg-slate-100" />
        <div className="h-3 w-4/5 rounded bg-slate-100" />
        <div className="h-3 w-1/3 rounded bg-slate-100" />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* PAGE                                                                       */
/* -------------------------------------------------------------------------- */

export default function AnnouncementsPage() {
  const { user } = useAuth();
  const canPost = ["admin", "hr"].includes(String(user?.role || "").toLowerCase());

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all"); // all | pinned
  const [expanded, setExpanded] = useState(() => new Set());

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [departments, setDepartments] = useState([]);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/communication/announcements");
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Announcements fetch error:", err);
      setError(err?.response?.data?.message || "Unable to load announcements. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* Departments are needed only for the "Department" audience */
  useEffect(() => {
    if (!modalOpen || departments.length) return;
    Promise.allSettled([api.get("/departments"), api.get("/organization/departments")]).then(([a, b]) => {
      const list = [...(a.status === "fulfilled" ? toList(a.value.data) : []), ...(b.status === "fulfilled" ? toList(b.value.data) : [])];
      const seen = new Set();
      setDepartments(
        list
          .map((d) => ({ value: String(d._id || d.id || ""), label: d.name || d.title || "" }))
          .filter((d) => d.value && d.label && !seen.has(d.value) && seen.add(d.value))
      );
    });
  }, [modalOpen, departments.length]);

  /* Escape closes the open dialog, and the page does not scroll behind it */
  useEffect(() => {
    if (!modalOpen && !deleteTarget) return undefined;
    const onKey = (e) => {
      if (e.key !== "Escape" || submitting || deleting) return;
      setModalOpen(false);
      setDeleteTarget(null);
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [modalOpen, deleteTarget, submitting, deleting]);

  const pinnedCount = useMemo(() => items.filter((a) => a.pinned).length, [items]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((a) => {
      if (tab === "pinned" && !a.pinned) return false;
      if (!q) return true;
      return `${a.title || ""} ${a.content || ""} ${a.postedBy?.name || ""}`.toLowerCase().includes(q);
    });
  }, [items, tab, search]);

  const toggleExpanded = (id) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setModalOpen(true);
  };

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (submitting) return;

    const next = {};
    if (form.title.trim().length < 3) next.title = "Please enter a title (at least 3 characters).";
    if (form.content.trim().length < 5) next.content = "Please write the announcement (at least 5 characters).";
    if (form.audience === "department" && !form.department) next.department = "Please select a department.";
    if (form.audience === "specific-role" && !form.targetRole) next.targetRole = "Please select a role.";
    setErrors(next);
    if (Object.keys(next).length) return;

    const payload = {
      title: form.title.trim(),
      content: form.content.trim(),
      audience: form.audience,
      pinned: form.pinned,
    };
    if (form.audience === "department") payload.department = form.department;
    if (form.audience === "specific-role") payload.targetRole = form.targetRole;

    setSubmitting(true);
    try {
      await api.post("/communication/announcements", payload);
      toast.success("Announcement posted successfully.");
      setModalOpen(false);
      setForm(EMPTY_FORM);
      fetchData({ silent: true });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to post the announcement.");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      await api.delete(`/communication/announcements/${deleteTarget._id}`);
      setItems((prev) => prev.filter((a) => a._id !== deleteTarget._id));
      toast.success("Announcement deleted successfully.");
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete the announcement.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-3 sm:px-4 py-4 space-y-4 sm:space-y-5 antialiased pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-11 h-11 sm:w-12 sm:h-12 shrink-0 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20">
            <Megaphone size={20} />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Announcements</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Company-wide news and important updates.</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => fetchData({ silent: true })}
            disabled={loading || refreshing}
            className="p-3 sm:p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl transition disabled:opacity-50 cursor-pointer"
            title="Refresh"
            aria-label="Refresh"
          >
            <RefreshCw size={16} className={loading || refreshing ? "animate-spin text-indigo-600" : ""} />
          </button>
          {canPost && (
            <button
              type="button"
              onClick={openCreate}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-3 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-indigo-600/20 transition active:scale-95 cursor-pointer"
            >
              <Plus size={16} /> New Announcement
            </button>
          )}
        </div>
      </div>

      {/* Search and tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search announcements..."
            className="w-full pl-10 pr-9 py-3 sm:py-2.5 bg-white border border-slate-200 rounded-xl text-base sm:text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex gap-2">
          {[
            ["all", "All", items.length],
            ["pinned", "Pinned", pinnedCount],
          ].map(([key, label, count]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${tab === key
                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-700"
                }`}
            >
              {key === "pinned" && <Pin size={12} />}
              {label}
              <span className={`px-1.5 rounded-full text-[10px] ${tab === key ? "bg-white/20" : "bg-slate-100 text-slate-500"}`}>{count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl">
          <div className="flex items-center gap-3 min-w-0">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <p className="text-xs sm:text-sm font-medium">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => fetchData()}
            className="self-end sm:self-auto px-3.5 py-1.5 bg-white text-rose-700 text-xs font-semibold rounded-lg border border-rose-200 hover:bg-rose-100/50 transition cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3 sm:space-y-4">
          {[0, 1, 2].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 py-16 px-4 text-center shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-400 flex items-center justify-center mx-auto mb-3">
            <Megaphone size={24} />
          </div>
          <p className="text-sm font-bold text-slate-700">
            {items.length === 0 ? "No announcements yet" : "No announcements match your search"}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {items.length === 0
              ? canPost
                ? 'Click "New Announcement" to post the first update.'
                : "There are no updates posted right now."
              : "Try a different keyword or filter."}
          </p>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {visible.map((a) => {
            const long = String(a.content || "").length > LONG_TEXT || String(a.content || "").split("\n").length > 3;
            const open = expanded.has(a._id);
            return (
              <article
                key={a._id}
                className={`group relative overflow-hidden rounded-2xl border p-4 sm:p-6 shadow-sm transition-all duration-200 hover:shadow-md ${a.pinned
                  ? "border-indigo-200 bg-gradient-to-br from-indigo-50/70 to-white hover:border-indigo-300"
                  : "bg-white border-slate-200/80 hover:border-indigo-200"
                  }`}
              >
                {a.pinned && <span className="absolute left-0 top-5 bottom-5 w-1 rounded-r-full bg-indigo-500" aria-hidden="true" />}

                <div className="flex items-start gap-3 sm:gap-4">
                  <div
                    className={`w-10 h-10 sm:w-11 sm:h-11 shrink-0 rounded-xl flex items-center justify-center transition-colors ${a.pinned ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600"
                      }`}
                  >
                    {a.pinned ? <Pin size={17} /> : <Megaphone size={17} />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 break-words">{a.title}</h3>
                      {a.pinned && (
                        <span className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide">
                          <Pin size={10} /> Pinned
                        </span>
                      )}
                      {isFresh(a.createdAt) && (
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide">
                          New
                        </span>
                      )}
                    </div>

                    <p className={`mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-wrap break-words ${long && !open ? "line-clamp-3" : ""}`}>
                      {a.content}
                    </p>
                    {long && (
                      <button
                        type="button"
                        onClick={() => toggleExpanded(a._id)}
                        className="mt-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                      >
                        {open ? "Show less" : "Read more"}
                      </button>
                    )}

                    <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] text-slate-400">
                      <span className="inline-flex items-center gap-2 min-w-0">
                        <span className="w-6 h-6 shrink-0 rounded-full bg-indigo-600 text-white text-[9px] font-bold flex items-center justify-center">
                          {initialsOf(a.postedBy?.name)}
                        </span>
                        <strong className="text-slate-700 font-semibold truncate">{a.postedBy?.name || "Admin"}</strong>
                      </span>
                      <span className="text-slate-300">•</span>
                      <span title={fullDate(a.createdAt)}>{postedLabel(a.createdAt)}</span>
                      <span className="text-slate-300">•</span>
                      <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-[10px] font-semibold">{audienceLabel(a)}</span>
                    </div>
                  </div>

                  {canPost && (
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(a)}
                      className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      title="Delete announcement"
                      aria-label="Delete announcement"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* New announcement (bottom sheet on mobile) */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-slate-900/50 backdrop-blur-sm"
          onClick={() => !submitting && setModalOpen(false)}
        >
          <form
            onSubmit={handleCreate}
            noValidate
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92dvh] overflow-hidden"
          >
            <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/70">
              <div className="min-w-0">
                <h2 className="text-base font-bold text-slate-900">New Announcement</h2>
                <p className="text-xs text-slate-400">It is shown to the selected audience right away.</p>
              </div>
              <button
                type="button"
                onClick={() => !submitting && setModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6 space-y-4">
              <div>
                <Label>Title</Label>
                <input
                  value={form.title}
                  maxLength={TITLE_MAX}
                  onChange={(e) => setField("title", e.target.value)}
                  placeholder="e.g. Office closed on Diwali"
                  className={`${inputClass} ${errors.title ? "border-rose-400" : "border-slate-200 focus:border-indigo-500"}`}
                />
                <FieldError>{errors.title}</FieldError>
              </div>

              <div>
                <Label>Details</Label>
                <textarea
                  rows={5}
                  value={form.content}
                  maxLength={CONTENT_MAX}
                  onChange={(e) => setField("content", e.target.value)}
                  placeholder="Write the complete announcement here..."
                  className={`${inputClass} resize-none ${errors.content ? "border-rose-400" : "border-slate-200 focus:border-indigo-500"}`}
                />
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <FieldError>{errors.content}</FieldError>
                  </div>
                  <span className="text-[11px] font-medium text-slate-400 mt-1.5 shrink-0">
                    {form.content.length}/{CONTENT_MAX}
                  </span>
                </div>
              </div>

              <div>
                <Label>Who should see it?</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {AUDIENCES.map(({ value, label, hint, icon: Icon }) => {
                    const active = form.audience === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setField("audience", value)}
                        className={`flex sm:flex-col items-center sm:items-start gap-3 sm:gap-2 p-3 rounded-xl border text-left transition cursor-pointer ${active
                          ? "border-indigo-500 bg-indigo-50 ring-4 ring-indigo-500/10"
                          : "border-slate-200 bg-white hover:border-indigo-300"
                          }`}
                      >
                        <span className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center ${active ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                          <Icon size={15} />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-xs font-bold text-slate-800">{label}</span>
                          <span className="block text-[10px] text-slate-400">{hint}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                {form.audience === "department" && (
                  <div className="mt-3">
                    <select
                      value={form.department}
                      onChange={(e) => setField("department", e.target.value)}
                      className={`${inputClass} cursor-pointer ${errors.department ? "border-rose-400" : "border-slate-200 focus:border-indigo-500"}`}
                    >
                      <option value="">Select department</option>
                      {departments.map((d) => (
                        <option key={d.value} value={d.value}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                    <FieldError>{errors.department}</FieldError>
                  </div>
                )}

                {form.audience === "specific-role" && (
                  <div className="mt-3">
                    <select
                      value={form.targetRole}
                      onChange={(e) => setField("targetRole", e.target.value)}
                      className={`${inputClass} cursor-pointer ${errors.targetRole ? "border-rose-400" : "border-slate-200 focus:border-indigo-500"}`}
                    >
                      <option value="">Select role</option>
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                    <FieldError>{errors.targetRole}</FieldError>
                  </div>
                )}
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={form.pinned}
                onClick={() => setField("pinned", !form.pinned)}
                className="w-full flex items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200 hover:border-indigo-300 transition cursor-pointer text-left"
              >
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-sm font-bold text-slate-800">
                    <Pin size={14} className="text-indigo-500" /> Pin to the top
                  </span>
                  <span className="block text-[11px] text-slate-400 mt-0.5">Pinned announcements always stay above the others.</span>
                </span>
                <span className={`relative w-11 h-6 shrink-0 rounded-full transition-colors ${form.pinned ? "bg-indigo-600" : "bg-slate-300"}`}>
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${form.pinned ? "translate-x-5" : ""}`} />
                </span>
              </button>
            </div>

            <div className="shrink-0 border-t border-slate-100 bg-white px-5 sm:px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                disabled={submitting}
                className="px-5 py-3 sm:py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 transition cursor-pointer disabled:opacity-60"
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <Megaphone size={14} />}
                {submitting ? "Posting..." : "Post Announcement"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-slate-900/50 backdrop-blur-sm"
          onClick={() => !deleting && setDeleteTarget(null)}
        >
          <div
            className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 p-5 sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 shrink-0 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center">
                <Trash2 size={18} />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-slate-900">Delete this announcement?</h3>
                <p className="text-xs text-slate-500 mt-1">It will be removed for everyone. This cannot be undone.</p>
              </div>
            </div>

            <p className="mt-4 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-xs font-bold text-slate-800 break-words">
              {deleteTarget.title}
            </p>

            <div className="mt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-5 py-3 sm:py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 sm:py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md shadow-rose-600/20 transition cursor-pointer disabled:opacity-60"
              >
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}