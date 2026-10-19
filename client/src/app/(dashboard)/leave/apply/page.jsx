"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Send,
  Calendar,
  FileText,
  Tag,
  Loader2,
  Plus,
  X,
  RefreshCw,
  AlertCircle,
  Pencil,
  Trash2,
  MoreVertical,
  Eye,
  Clock,
  UserCheck,
} from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "react-toastify";

/* -------------------------------------------------------------------------- */
/* CONSTANTS                                                                  */
/* -------------------------------------------------------------------------- */

/* All backend routes in one place */
const API = {
  list: ["/leave/my-leaves", "/leave", "/leaves"],
  apply: "/leave/apply",
  item: (id) => `/leave/${id}`, // PUT = edit, DELETE = remove
};

const LEAVE_TYPES = [
  { value: "casual", label: "Casual Leave" },
  { value: "sick", label: "Sick Leave" },
  { value: "earned", label: "Earned Leave" },
  { value: "unpaid", label: "Unpaid Leave" },
  { value: "maternity", label: "Maternity Leave" },
  { value: "paternity", label: "Paternity Leave" },
];

const FILTERS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

const EMPTY_FORM = { leaveType: "", startDate: "", endDate: "", reason: "" };
const REASON_MAX = 500;
const MENU_W = 200;
const MENU_H = 160;

const inputClass =
  "w-full px-4 py-3 bg-slate-50 border rounded-xl text-base sm:text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none transition";

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

const lower = (v) => String(v || "").trim().toLowerCase();

const text = (v) => {
  if (!v) return "";
  if (typeof v === "object") return String(v.title || v.name || v.label || "");
  return String(v);
};

const toYMD = (v) => {
  if (!v) return "";
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const fromYMD = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const formatDate = (v) => {
  const s = toYMD(v);
  return s ? fromYMD(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";
};

const formatDateTime = (v) => {
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

const daysBetween = (a, b) => {
  const s = toYMD(a);
  const e = toYMD(b);
  if (!s || !e) return 0;
  const n = Math.round((fromYMD(e) - fromYMD(s)) / 86400000) + 1;
  return n > 0 ? n : 0;
};

const leaveDays = (leave) => {
  const n = Number(leave.totalDays);
  return Number.isFinite(n) && n > 0 ? n : daysBetween(leave.startDate, leave.endDate);
};

const formatDays = (n) => (n > 0 ? `${n} ${n === 1 ? "Day" : "Days"}` : "—");

const findType = (raw) => {
  const r = lower(text(raw));
  if (!r) return undefined;
  return LEAVE_TYPES.find((t) => t.value === r || lower(t.label) === r || lower(t.label).startsWith(r));
};

const typeLabel = (raw) => {
  const found = findType(raw);
  if (found) return found.label;
  const t = text(raw);
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : "Leave";
};

const statusOf = (leave) => lower(leave.status || leave.leaveStatus || leave.approvalStatus || "pending");
const idOf = (leave) => String(leave._id || leave.id || "");
const remarkOf = (l) => text(l.remarks || l.rejectionReason || l.reviewNote || l.comment);

const extractList = (payload, depth = 0) => {
  if (!payload || depth > 3) return [];
  if (Array.isArray(payload)) return payload;
  if (typeof payload !== "object") return [];

  const preferred = ["leaves", "leaveRequests", "leaveApplications", "applications", "requests", "records", "data", "items", "results", "docs"];
  for (const key of preferred) {
    if (payload[key] !== undefined) {
      const found = extractList(payload[key], depth + 1);
      if (found.length) return found;
    }
  }
  for (const value of Object.values(payload)) {
    if (Array.isArray(value) && value.length && typeof value[0] === "object") return value;
  }
  return [];
};

const pickCreated = (data) => {
  const inner = data?.data && typeof data.data === "object" && !Array.isArray(data.data) ? data.data : null;
  const c = data?.leave || inner?.leave || inner || data;
  return c && typeof c === "object" && !Array.isArray(c) && (c.startDate || c.leaveType) ? c : null;
};

const getIdentity = (user) => {
  const ids = new Set();
  const add = (v) => {
    if (!v) return;
    const value = typeof v === "object" ? v._id || v.id || v.employeeId || "" : v;
    if (value) ids.add(String(value));
  };
  add(user?._id);
  add(user?.id);
  add(user?.employee);
  add(user?.employee?.employeeId);
  add(user?.employeeId);
  add(user?.empId);
  return { ids, name: lower(user?.name || user?.username || user?.employee?.name) };
};

const isMine = (leave, identity) => {
  const target = leave.employee ?? leave.user ?? null;
  const candidates = target && typeof target === "object" ? [target._id, target.id, target.employeeId, target.empId] : [target];
  candidates.push(leave.employeeId, leave.userId, leave.employee_id);
  if (candidates.some((c) => c && identity.ids.has(String(c)))) return true;

  const name = lower(
    typeof target === "object" && target ? target.name || target.fullName || target.username : leave.employeeName || leave.userName
  );
  return Boolean(identity.name && name && name === identity.name);
};

const findOverlap = (form, leaves, ignoreId) =>
  leaves.find((l) => {
    if (ignoreId && idOf(l) === String(ignoreId)) return false;
    const st = statusOf(l);
    if (st !== "pending" && st !== "approved") return false;
    const s = toYMD(l.startDate);
    const e = toYMD(l.endDate);
    return Boolean(s && e && form.startDate <= e && form.endDate >= s);
  });

const validate = (f) => {
  const e = {};
  if (!f.leaveType) e.leaveType = "Please select a leave type.";
  if (!f.startDate) e.startDate = "Start date is required.";
  if (!f.endDate) e.endDate = "End date is required.";
  else if (f.startDate && f.endDate < f.startDate) e.endDate = "End date cannot be before the start date.";
  const reason = f.reason.trim();
  if (reason.length < 5) e.reason = "Please enter a clear reason (at least 5 characters).";
  else if (reason.length > REASON_MAX) e.reason = `Reason must not exceed ${REASON_MAX} characters.`;
  return e;
};

/* -------------------------------------------------------------------------- */
/* SMALL COMPONENTS                                                           */
/* -------------------------------------------------------------------------- */

function StatusBadge({ status }) {
  const st = lower(status || "pending");
  const map = {
    approved: ["bg-emerald-50 text-emerald-700 border-emerald-200", "bg-emerald-500", "Approved"],
    rejected: ["bg-rose-50 text-rose-700 border-rose-200", "bg-rose-500", "Rejected"],
    cancelled: ["bg-slate-100 text-slate-600 border-slate-200", "bg-slate-400", "Cancelled"],
    pending: ["bg-amber-50 text-amber-700 border-amber-200", "bg-amber-500", "Pending"],
  };
  const [tone, dot, label] = map[st] || map.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap ${tone}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} /> {label}
    </span>
  );
}

function FieldError({ children }) {
  if (!children) return null;
  return (
    <p className="flex items-start gap-1.5 mt-1.5 text-[11px] font-semibold text-rose-600">
      <AlertCircle size={13} className="shrink-0 mt-px" />
      <span>{children}</span>
    </p>
  );
}

function FieldLabel({ icon: Icon, children }) {
  return (
    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
      <Icon className="w-3.5 h-3.5 text-indigo-500" /> {children}
    </label>
  );
}

/* Three-dot menu: View Details, Edit, Delete. Edit and Delete work only for a pending request. */
function RowMenu({ item, onView, onEdit, onDelete }) {
  const [pos, setPos] = useState(null);
  const triggerRef = useRef(null);
  const locked = statusOf(item) !== "pending" || Boolean(item._local);
  const lockNote = item._local ? "Refresh the page to manage this request." : "Only pending requests can be edited or deleted.";

  const close = useCallback(() => setPos(null), []);

  useEffect(() => {
    if (!pos) return undefined;
    const onDown = (e) => {
      if (!e.target.closest("[data-leave-menu]") && !triggerRef.current?.contains(e.target)) close();
    };
    const onKey = (e) => e.key === "Escape" && close();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [pos, close]);

  const toggle = (e) => {
    e.stopPropagation();
    if (pos) return close();
    const r = triggerRef.current.getBoundingClientRect();
    const top = r.bottom + MENU_H > window.innerHeight ? Math.max(8, r.top - MENU_H - 4) : r.bottom + 4;
    const left = Math.max(8, Math.min(r.right - MENU_W, window.innerWidth - MENU_W - 8));
    setPos({ top, left });
  };

  const run = (fn) => (e) => {
    e.stopPropagation();
    close();
    fn(item);
  };

  const row = "w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold text-left transition cursor-pointer";

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={Boolean(pos)}
        aria-label="More options"
        className={`w-9 h-9 inline-flex items-center justify-center rounded-lg transition cursor-pointer ${pos ? "bg-indigo-100 text-indigo-700" : "text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
          }`}
      >
        <MoreVertical size={16} />
      </button>

      {pos && (
        <div
          data-leave-menu
          role="menu"
          style={{ top: pos.top, left: pos.left, width: MENU_W }}
          onClick={(e) => e.stopPropagation()}
          className="fixed z-[70] bg-white border border-slate-200 rounded-xl shadow-xl py-1.5"
        >
          <button type="button" role="menuitem" onClick={run(onView)} className={`${row} text-slate-700 hover:bg-indigo-50 hover:text-indigo-600`}>
            <Eye size={14} className="text-slate-400" /> View Details
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={run(onEdit)}
            disabled={locked}
            className={`${row} text-slate-700 enabled:hover:bg-indigo-50 enabled:hover:text-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            <Pencil size={14} className="text-slate-400" /> Edit
          </button>
          <div className="my-1 border-t border-slate-100" />
          <button
            type="button"
            role="menuitem"
            onClick={run(onDelete)}
            disabled={locked}
            className={`${row} text-rose-600 enabled:hover:bg-rose-50 disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            <Trash2 size={14} /> Delete
          </button>
          {locked && <p className="px-3.5 pt-1 pb-1.5 text-[10px] leading-snug text-slate-400">{lockNote}</p>}
        </div>
      )}
    </>
  );
}

function DetailRow({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
      <div className="w-8 h-8 shrink-0 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
        <Icon size={14} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold text-slate-400">{label}</p>
        <div className="text-sm font-semibold text-slate-800 mt-0.5 break-words">{children}</div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* PAGE                                                                       */
/* -------------------------------------------------------------------------- */

export default function LeaveManagementPage() {
  const { user, loading: authLoading } = useAuth();

  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [unlinked, setUnlinked] = useState(0);
  const sessionLeaves = useRef(new Map());
  const [filter, setFilter] = useState("all");

  const [modal, setModal] = useState(null); // null | { mode: "create" } | { mode: "edit", id }
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const [viewTarget, setViewTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const employeeId = useMemo(
    () =>
      user?.employee?._id ||
      user?.employee?.id ||
      (typeof user?.employee === "string" ? user.employee : null) ||
      user?._id ||
      user?.id ||
      null,
    [user]
  );
  const identity = useMemo(() => getIdentity(user), [user]);

  const fetchLeaves = useCallback(
    async ({ silent = false } = {}) => {
      if (!user) return;
      if (silent) setRefreshing(true);
      else setLoading(true);
      setLoadError(null);

      let records = null;
      let skipped = 0;
      let lastError = null;

      const attempts = [];
      API.list.forEach((path, i) => {
        if (employeeId) attempts.push({ path, personal: i === 0, params: { employee: employeeId } });
        if (i > 0 || !employeeId) attempts.push({ path, personal: i === 0, params: undefined });
      });

      for (const attempt of attempts) {
        try {
          const res = await api.get(attempt.path, attempt.params ? { params: attempt.params } : {});
          const raw = extractList(res.data);
          const mine = attempt.personal ? raw : raw.filter((l) => isMine(l, identity));
          if (records === null) records = [];
          if (mine.length) {
            records = mine;
            skipped = 0;
            break;
          }
          if (raw.length) skipped = raw.length;
        } catch (err) {
          lastError = err;
          if (err?.response?.status === 401) break;
        }
      }

      if (records === null) {
        console.error("Fetch leaves error:", lastError);
        setLoadError(
          lastError?.response?.status === 401
            ? "Your session has expired. Please log in again."
            : lastError?.response?.data?.message || "Failed to load leave applications."
        );
      } else {
        const serverIds = new Set(records.map(idOf));
        sessionLeaves.current.forEach((_, id) => {
          if (serverIds.has(id)) sessionLeaves.current.delete(id);
        });
        setLeaves([...records, ...sessionLeaves.current.values()]);
        setUnlinked(records.length === 0 && skipped > 0 ? skipped : 0);
      }

      setLoading(false);
      setRefreshing(false);
    },
    [user, employeeId, identity]
  );

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      setLoadError("Your session has expired. Please log in again.");
      return;
    }
    fetchLeaves();
  }, [authLoading, user, fetchLeaves]);

  /* Escape closes the open dialog, and the page does not scroll behind it */
  useEffect(() => {
    if (!modal && !deleteTarget && !viewTarget) return undefined;
    const onKey = (e) => {
      if (e.key !== "Escape" || submitting || deleting) return;
      setModal(null);
      setDeleteTarget(null);
      setViewTarget(null);
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [modal, deleteTarget, viewTarget, submitting, deleting]);

  const counts = useMemo(() => {
    const c = { all: leaves.length, pending: 0, approved: 0, rejected: 0 };
    leaves.forEach((l) => {
      const s = statusOf(l);
      if (c[s] !== undefined) c[s] += 1;
    });
    return c;
  }, [leaves]);

  const visible = useMemo(() => {
    const sorted = [...leaves].sort((a, b) => toYMD(b.startDate).localeCompare(toYMD(a.startDate)));
    return filter === "all" ? sorted : sorted.filter((l) => statusOf(l) === filter);
  }, [leaves, filter]);

  /* ---- dialogs ---- */

  const isEdit = modal?.mode === "edit";
  const duration = daysBetween(form.startDate, form.endDate);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormErrors({});
    setModal({ mode: "create" });
  };

  const openEdit = (item) => {
    const raw = item.leaveType || item.type;
    setViewTarget(null);
    setForm({
      leaveType: findType(raw)?.value || lower(text(raw)),
      startDate: toYMD(item.startDate),
      endDate: toYMD(item.endDate),
      reason: text(item.reason),
    });
    setFormErrors({});
    setModal({ mode: "edit", id: idOf(item) });
  };

  const askDelete = (item) => {
    setViewTarget(null);
    setDeleteTarget(item);
  };

  const closeModal = () => {
    if (submitting) return;
    setModal(null);
  };

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFormErrors((prev) => (prev[key] || prev.range ? { ...prev, [key]: undefined, range: undefined } : prev));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!employeeId) {
      toast.error("Your account is not linked to an employee record.");
      return;
    }

    const errs = validate(form);
    if (!Object.keys(errs).length) {
      const clash = findOverlap(form, leaves, isEdit ? modal.id : null);
      if (clash) {
        errs.range = `You already have a ${statusOf(clash)} leave from ${formatDate(clash.startDate)} to ${formatDate(clash.endDate)}.`;
      }
    }
    setFormErrors(errs);
    if (Object.keys(errs).length) return;

    const payload = {
      leaveType: form.leaveType,
      startDate: form.startDate,
      endDate: form.endDate,
      reason: form.reason.trim(),
    };

    setSubmitting(true);
    try {
      if (isEdit) {
        await api.put(API.item(modal.id), payload);
        const id = modal.id;
        setLeaves((prev) => prev.map((l) => (idOf(l) === id ? { ...l, ...payload } : l)));
        const kept = sessionLeaves.current.get(id);
        if (kept) sessionLeaves.current.set(id, { ...kept, ...payload });
        toast.success("Leave request updated successfully!");
      } else {
        const res = await api.post(API.apply, { employee: employeeId, ...payload });
        let created = pickCreated(res?.data);
        if (!created || !idOf(created)) {
          created = {
            ...payload,
            ...(created || {}),
            employee: employeeId,
            status: (created && created.status) || "pending",
            _local: true,
            _id: `local-${Date.now()}`,
          };
        }
        sessionLeaves.current.set(idOf(created), created);
        setLeaves((prev) => [created, ...prev.filter((l) => idOf(l) !== idOf(created))]);
        setFilter("all");
        toast.success("Leave application submitted successfully!");
      }
      setModal(null);
      setForm(EMPTY_FORM);
      await fetchLeaves({ silent: true });
    } catch (err) {
      toast.error(
        err?.response?.data?.message || (isEdit ? "Failed to update leave request." : "Failed to submit leave application.")
      );
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget || deleting) return;
    const id = idOf(deleteTarget);
    setDeleting(true);
    try {
      await api.delete(API.item(id));
      sessionLeaves.current.delete(id);
      setLeaves((prev) => prev.filter((l) => idOf(l) !== id));
      toast.success("Leave request deleted.");
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete leave request.");
    } finally {
      setDeleting(false);
    }
  };

  const viewItem = viewTarget;
  const viewPending = viewItem ? statusOf(viewItem) === "pending" && !viewItem._local : false;

  return (
    <div className="w-full min-w-0 space-y-4 sm:space-y-6 max-w-[1500px] mx-auto pb-16 px-3 sm:px-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-slate-900">Leave Management</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Apply for leaves, track application statuses, and manage your requests.
          </p>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={() => fetchLeaves({ silent: true })}
            disabled={loading || refreshing}
            className="p-3 sm:p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl transition cursor-pointer disabled:opacity-50"
            title="Refresh"
            aria-label="Refresh"
          >
            <RefreshCw size={16} className={loading || refreshing ? "animate-spin text-indigo-600" : ""} />
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-3 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-indigo-600/20 transition active:scale-95 cursor-pointer"
          >
            <Plus size={16} /> Apply Leave
          </button>
        </div>
      </div>

      {!authLoading && user && !employeeId && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-xs sm:text-sm font-medium">
            Your account is not linked to an employee record, so leave requests cannot be submitted. Please contact HR.
          </p>
        </div>
      )}

      {!loading && !loadError && unlinked > 0 && leaves.length === 0 && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-xs sm:text-sm font-medium">
            The server returned {unlinked} leave record(s), but none are linked to your account. Please contact your administrator.
          </p>
        </div>
      )}

      {loadError && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl">
          <div className="flex items-center gap-3 min-w-0">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <p className="text-xs sm:text-sm font-medium">{loadError}</p>
          </div>
          {user && (
            <button
              type="button"
              onClick={() => fetchLeaves()}
              className="px-3.5 py-1.5 bg-white text-rose-700 text-xs font-semibold rounded-lg border border-rose-200 hover:bg-rose-100/50 transition self-end sm:self-auto cursor-pointer"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* Records */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        {!loading && leaves.length > 0 && (
          <div className="flex gap-2 overflow-x-auto px-3 sm:px-6 py-3 border-b border-slate-100">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border transition cursor-pointer ${filter === f.key
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
                  }`}
              >
                {f.label}
                <span className={`px-1.5 rounded-full text-[10px] ${filter === f.key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                  {counts[f.key]}
                </span>
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center">
            <Loader2 className="animate-spin text-indigo-600 h-7 w-7 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-400">Loading leave records...</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="py-16 px-4 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto text-indigo-500">
              <FileText size={24} />
            </div>
            <p className="text-sm font-bold text-slate-800">
              {leaves.length === 0 ? "No leave applications found" : `No ${filter} leave requests`}
            </p>
            <p className="text-xs text-slate-400">
              {leaves.length === 0
                ? 'Click "Apply Leave" above to submit your request.'
                : "Try another status filter to see the rest of your requests."}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile and tablet: cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 sm:p-4 lg:hidden">
              {visible.map((item, idx) => {
                const remark = remarkOf(item);
                return (
                  <div
                    key={idOf(item) || idx}
                    onClick={() => setViewTarget(item)}
                    className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 space-y-3 cursor-pointer hover:border-indigo-300 transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                          <FileText size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate">{typeLabel(item.leaveType || item.type)}</p>
                          <p className="text-[11px] font-medium text-slate-500">
                            {formatDate(item.startDate)} → {formatDate(item.endDate)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <StatusBadge status={statusOf(item)} />
                        <RowMenu item={item} onView={setViewTarget} onEdit={openEdit} onDelete={askDelete} />
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <span className="shrink-0 px-2.5 py-1 bg-slate-100 text-slate-700 font-bold rounded-lg text-[11px] font-mono">
                        {formatDays(leaveDays(item))}
                      </span>
                      <p className="text-xs text-slate-600 break-words line-clamp-2">{text(item.reason) || "—"}</p>
                    </div>

                    {remark && (
                      <p className="text-[11px] text-slate-500 bg-slate-50 rounded-lg px-3 py-2 break-words">
                        <b className="text-slate-600">Note:</b> {remark}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Desktop: table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-700 uppercase">
                  <tr>
                    <th className="px-6 py-4">Leave Type</th>
                    <th className="px-6 py-4">Timeline</th>
                    <th className="px-6 py-4">Duration</th>
                    <th className="px-6 py-4">Reason</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visible.map((item, idx) => {
                    const remark = remarkOf(item);
                    return (
                      <tr
                        key={idOf(item) || idx}
                        onClick={() => setViewTarget(item)}
                        className="hover:bg-indigo-50/30 transition-colors cursor-pointer"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                              <FileText size={16} />
                            </div>
                            <span className="font-bold text-slate-900 whitespace-nowrap">{typeLabel(item.leaveType || item.type)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-700 whitespace-nowrap">
                          {formatDate(item.startDate)} → {formatDate(item.endDate)}
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-bold rounded-lg text-[11px] font-mono whitespace-nowrap">
                            {formatDays(leaveDays(item))}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-600 max-w-[240px]">
                          <p className="truncate" title={text(item.reason)}>{text(item.reason) || "—"}</p>
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={statusOf(item)} />
                          {remark && (
                            <p className="mt-1.5 text-[11px] text-slate-400 truncate max-w-[180px]" title={remark}>
                              {remark}
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <RowMenu item={item} onView={setViewTarget} onEdit={openEdit} onDelete={askDelete} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Details */}
      {viewItem && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-slate-900/50 backdrop-blur-sm"
          onClick={() => setViewTarget(null)}
        >
          <div
            className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92dvh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/70">
              <div className="min-w-0">
                <h3 className="text-base font-bold text-slate-900 truncate">{typeLabel(viewItem.leaveType || viewItem.type)}</h3>
                <p className="text-xs text-slate-400">Leave request details</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <StatusBadge status={statusOf(viewItem)} />
                <button
                  type="button"
                  onClick={() => setViewTarget(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="px-5 sm:px-6 py-2 overflow-y-auto overscroll-contain">
              <DetailRow icon={Calendar} label="Leave Period">
                {formatDate(viewItem.startDate)} → {formatDate(viewItem.endDate)}
              </DetailRow>
              <DetailRow icon={Clock} label="Duration">{formatDays(leaveDays(viewItem))}</DetailRow>
              <DetailRow icon={FileText} label="Reason">
                <span className="whitespace-pre-wrap">{text(viewItem.reason) || "—"}</span>
              </DetailRow>
              {viewItem.createdAt && (
                <DetailRow icon={Send} label="Applied On">{formatDateTime(viewItem.createdAt)}</DetailRow>
              )}
              {(viewItem.approvedBy?.name || viewItem.approvedOn) && (
                <DetailRow icon={UserCheck} label={statusOf(viewItem) === "rejected" ? "Rejected By" : "Reviewed By"}>
                  {text(viewItem.approvedBy?.name) || "—"}
                  {viewItem.approvedOn ? ` · ${formatDateTime(viewItem.approvedOn)}` : ""}
                </DetailRow>
              )}
              {remarkOf(viewItem) && (
                <DetailRow icon={AlertCircle} label="Remark">{remarkOf(viewItem)}</DetailRow>
              )}
            </div>

            <div className="shrink-0 border-t border-slate-100 bg-white px-5 sm:px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setViewTarget(null)}
                className="px-5 py-3 sm:py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Close
              </button>
              {viewPending && (
                <>
                  <button
                    type="button"
                    onClick={() => openEdit(viewItem)}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 sm:py-2.5 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    <Pencil size={14} /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => askDelete(viewItem)}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 sm:py-2.5 border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Apply / Edit modal */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-slate-900/50 backdrop-blur-sm"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92dvh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 sm:py-5 border-b border-slate-100 bg-slate-50/70">
              <div className="min-w-0">
                <h3 className="text-base font-bold text-slate-900">{isEdit ? "Edit Leave Request" : "Apply for Leave"}</h3>
                <p className="text-xs text-slate-400">
                  {isEdit ? "Update the details of your pending request" : "Fill in the dates and reason for leave submission"}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="p-1.5 shrink-0 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} noValidate className="flex flex-col min-h-0 flex-1">
              <div className="p-5 sm:p-6 overflow-y-auto overscroll-contain space-y-4">
                <div>
                  <FieldLabel icon={Tag}>Leave Category</FieldLabel>
                  <select
                    value={form.leaveType}
                    onChange={(e) => setField("leaveType", e.target.value)}
                    className={`${inputClass} cursor-pointer ${formErrors.leaveType ? "border-rose-400" : "border-slate-200 focus:border-indigo-500"}`}
                  >
                    <option value="" disabled>Select Leave Type</option>
                    {LEAVE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                    {form.leaveType && !LEAVE_TYPES.some((t) => t.value === form.leaveType) && (
                      <option value={form.leaveType}>{typeLabel(form.leaveType)}</option>
                    )}
                  </select>
                  <FieldError>{formErrors.leaveType}</FieldError>
                </div>

                <div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="min-w-0">
                      <FieldLabel icon={Calendar}>Start Date</FieldLabel>
                      <input
                        type="date"
                        value={form.startDate}
                        onChange={(e) => setField("startDate", e.target.value)}
                        className={`${inputClass} ${formErrors.startDate || formErrors.range ? "border-rose-400" : "border-slate-200 focus:border-indigo-500"}`}
                      />
                      <FieldError>{formErrors.startDate}</FieldError>
                    </div>
                    <div className="min-w-0">
                      <FieldLabel icon={Calendar}>End Date</FieldLabel>
                      <input
                        type="date"
                        min={form.startDate || undefined}
                        value={form.endDate}
                        onChange={(e) => setField("endDate", e.target.value)}
                        className={`${inputClass} ${formErrors.endDate || formErrors.range ? "border-rose-400" : "border-slate-200 focus:border-indigo-500"}`}
                      />
                      <FieldError>{formErrors.endDate}</FieldError>
                    </div>
                  </div>
                  <FieldError>{formErrors.range}</FieldError>
                </div>

                {duration > 0 && (
                  <div className="flex items-center justify-between px-4 py-2.5 bg-indigo-50/60 border border-indigo-100 rounded-xl text-xs text-indigo-700">
                    <span className="font-medium">Total Duration:</span>
                    <span className="font-bold text-indigo-900 font-mono">{formatDays(duration)}</span>
                  </div>
                )}

                <div>
                  <FieldLabel icon={FileText}>Reason for Leave</FieldLabel>
                  <textarea
                    rows={3}
                    maxLength={REASON_MAX}
                    placeholder="Enter clear reason for leave..."
                    value={form.reason}
                    onChange={(e) => setField("reason", e.target.value)}
                    className={`${inputClass} resize-none ${formErrors.reason ? "border-rose-400" : "border-slate-200 focus:border-indigo-500"}`}
                  />
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0"><FieldError>{formErrors.reason}</FieldError></div>
                    <span className="text-[11px] font-medium text-slate-400 mt-1.5 shrink-0">
                      {form.reason.length}/{REASON_MAX}
                    </span>
                  </div>
                </div>
              </div>

              <div className="shrink-0 border-t border-slate-100 bg-white px-5 sm:px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 sm:gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  className="px-5 py-3 sm:py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-3 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 transition inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  {submitting ? "Saving..." : isEdit ? "Save Changes" : "Submit Application"}
                </button>
              </div>
            </form>
          </div>
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
                <h3 className="text-base font-bold text-slate-900">Delete leave request?</h3>
                <p className="text-xs text-slate-500 mt-1">This action cannot be undone.</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-xs space-y-1">
              <p className="font-bold text-slate-900">{typeLabel(deleteTarget.leaveType || deleteTarget.type)}</p>
              <p className="text-slate-600">
                {formatDate(deleteTarget.startDate)} → {formatDate(deleteTarget.endDate)} • {formatDays(leaveDays(deleteTarget))}
              </p>
            </div>

            <div className="mt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 sm:gap-3">
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
                className="px-6 py-3 sm:py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md shadow-rose-600/20 transition inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                {deleting ? "Deleting..." : "Delete Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}