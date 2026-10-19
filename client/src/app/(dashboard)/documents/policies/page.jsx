"use client";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  Loader2, FileText, Trash2, FolderOpen, Edit3, ExternalLink, ShieldAlert, Clock, Home, CalendarDays,
  Plus, UploadCloud, X, Link2, CheckCircle2, MoreVertical, Eye, Users, Archive, Send, FileEdit,
  Search, AlertTriangle, Type, Bold, Heading1, Heading2, List, BookOpen, ArrowUpCircle, Circle,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { useAuth } from "@/context/AuthContext";

/* ------------------------------------------------------------------ */
/* Configuration                                                       */
/* ------------------------------------------------------------------ */

// Change this to match your backend: the endpoint must return { url } or { fileUrl }.
const UPLOAD_ENDPOINT = "/upload";
const MAX_FILE_MB = 10;
const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const POLICY_CATEGORY_GROUPS = [
  {
    group: "Core",
    items: ["Employee Handbook", "Code of Conduct", "Leave Policy", "Attendance and Working Hours", "WFH / Hybrid Policy"],
  },
  {
    group: "Conduct and Safety",
    items: [
      "POSH Policy", "Internal Committee Details", "Anti-Harassment Policy",
      "Grievance Redressal", "Whistleblower Policy", "Disciplinary Action Policy",
    ],
  },
  {
    group: "Operations",
    items: [
      "IT and Data Security", "Expense and Travel Policy", "Dress Code",
      "Notice Period and Exit Policy", "Performance Review Policy",
    ],
  },
];

const STATUSES = ["Draft", "Published", "Archived"];
const STATUS_STYLES = {
  Draft: "bg-slate-100 text-slate-600 border-slate-200",
  Published: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Archived: "bg-amber-50 text-amber-700 border-amber-200",
};

const QUICK_TEMPLATES = [
  { title: "Leave Policy and Guidelines", category: "Leave Policy", icon: CalendarDays, desc: "Casual, sick and earned leave with the approval procedure." },
  { title: "Attendance and Working Hours Policy", category: "Attendance and Working Hours", icon: Clock, desc: "Office timings, grace periods, check-in norms and half-day rules." },
  { title: "Work From Home Guidelines", category: "WFH / Hybrid Policy", icon: Home, desc: "Remote work expectations, availability hours and reporting tools." },
  { title: "POSH Policy", category: "POSH Policy", icon: ShieldAlert, desc: "A safe, respectful and harassment-free workplace for everyone." },
];

const todayISO = () => new Date().toISOString().slice(0, 10);

const emptyForm = () => ({
  title: "",
  policyCategory: "Employee Handbook",
  description: "",
  version: "1.0",
  effectiveDate: todayISO(),
  lastReviewedDate: todayISO(),
  status: "Published",
  applicableType: "all", // "all" | "department" | "role"
  applicableValues: [],
  fileUrl: "",
  content: "",
});

const inputCls =
  "mt-1.5 w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 bg-slate-50/50 hover:border-slate-300 font-medium text-slate-800";
const labelCls = "text-xs font-bold uppercase tracking-wider text-slate-500";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const formatSize = (bytes) =>
  bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024 * 1024)).toFixed(2)} MB`;

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "-";

const dateInput = (value) => (value ? String(value).slice(0, 10) : "");

const nextMajorVersion = (v) => {
  const m = String(v || "").match(/^(\d+)/);
  return m ? `${Number(m[1]) + 1}.0` : "2.0";
};

const applicableLabel = (a) => {
  if (!a || a.type === "all" || !a.type) return "Everyone";
  const values = (a.values || []).join(", ");
  return a.type === "department" ? `Departments: ${values}` : `Roles: ${values}`;
};

const needsMyAcceptance = (d) => d.status === "Published" && d.appliesToMe !== false && !d.acknowledged;

const toPayload = (d) => ({
  title: d.title,
  policyCategory: d.policyCategory,
  description: d.description || "",
  version: d.version || "1.0",
  effectiveDate: dateInput(d.effectiveDate) || null,
  lastReviewedDate: dateInput(d.lastReviewedDate) || null,
  status: d.status,
  applicableTo: d.applicableTo || { type: "all", values: [] },
  fileUrl: d.fileUrl || "",
  content: d.content || "",
  category: "company-policy",
  visibility: "all-employees",
});

const isPdf = (url = "") => /\.pdf(\?|#|$)/i.test(url);

/* ------------------------------------------------------------------ */
/* Small components                                                    */
/* ------------------------------------------------------------------ */

// Safe lightweight renderer: "# Heading", "## Subheading", "- bullet", "**bold**". No raw HTML is ever injected.
function RichText({ text }) {
  const inline = (line) =>
    line.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
        <strong key={i} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>
      ) : (
        <span key={i}>{part}</span>
      )
    );

  const blocks = [];
  let list = [];
  const flushList = () => {
    if (list.length) {
      blocks.push(
        <ul key={`ul-${blocks.length}`} className="list-disc pl-5 space-y-1 text-sm text-slate-700 leading-relaxed">
          {list.map((li, i) => <li key={i}>{inline(li)}</li>)}
        </ul>
      );
      list = [];
    }
  };

  String(text || "").split("\n").forEach((raw, idx) => {
    const line = raw.trimEnd();
    if (line.startsWith("- ")) return list.push(line.slice(2));
    flushList();
    if (line.startsWith("## ")) blocks.push(<h4 key={idx} className="text-sm font-bold text-slate-900 pt-2">{inline(line.slice(3))}</h4>);
    else if (line.startsWith("# ")) blocks.push(<h3 key={idx} className="text-base font-bold text-slate-900 pt-3">{inline(line.slice(2))}</h3>);
    else if (line.trim() === "") blocks.push(<div key={idx} className="h-1" />);
    else blocks.push(<p key={idx} className="text-sm text-slate-700 leading-relaxed">{inline(line)}</p>);
  });
  flushList();

  return <div className="space-y-2">{blocks}</div>;
}

function TagInput({ values, onChange, placeholder }) {
  const [input, setInput] = useState("");
  const add = () => {
    const v = input.trim().replace(/,$/, "");
    if (v && !values.some((x) => x.toLowerCase() === v.toLowerCase())) onChange([...values, v]);
    setInput("");
  };
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-100 transition-all">
      {values.map((v) => (
        <span key={v} className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-1 rounded-lg">
          {v}
          <button type="button" onClick={() => onChange(values.filter((x) => x !== v))} aria-label={`Remove ${v}`} className="hover:text-rose-600 cursor-pointer">
            <X size={12} />
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); }
          if (e.key === "Backspace" && !input && values.length) onChange(values.slice(0, -1));
        }}
        onBlur={add}
        placeholder={values.length ? "" : placeholder}
        className="flex-1 min-w-[140px] bg-transparent outline-none text-sm font-medium text-slate-800 py-0.5"
      />
    </div>
  );
}

function MenuItem({ icon: Icon, label, onClick, danger = false }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer text-left ${danger ? "text-rose-600 hover:bg-rose-50" : "text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"
        }`}
    >
      <Icon size={16} className="shrink-0" />
      <span>{label}</span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function HRPoliciesPage() {
  const { user } = useAuth();
  const isAdmin = ["admin", "hr"].includes(user?.role);
  const category = "company-policy";
  const title = "HR Policies and Guidelines";
  const description =
    "Company rules that every employee must read and accept. HR can track who has accepted each policy.";

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [onlyPending, setOnlyPending] = useState(false);

  // Create / edit modal
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingDocId, setEditingDocId] = useState(null);
  const [originalVersion, setOriginalVersion] = useState("");
  const [form, setForm] = useState(emptyForm());
  const [sourceMode, setSourceMode] = useState("file"); // "file" | "link" | "text"
  const [selectedFile, setSelectedFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  // Reader modal
  const [viewingId, setViewingId] = useState(null);
  const [agreed, setAgreed] = useState(false);
  const [accepting, setAccepting] = useState(false);

  // Acceptance tracking modal
  const [trackDoc, setTrackDoc] = useState(null);
  const [trackData, setTrackData] = useState({ acknowledged: [], pending: [] });
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackTab, setTrackTab] = useState("pending");

  // Three-dot menu
  const [menu, setMenu] = useState(null);

  const viewingDoc = documents.find((d) => d._id === viewingId) || null;

  /* ------------------------------ Data ------------------------------ */

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/documents", { params: { category } });
      setDocuments(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error("Failed to load HR policies from the server.");
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const visibleDocs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return documents.filter((d) => {
      if (!isAdmin && d.status !== "Published") return false;
      if (isAdmin && statusFilter !== "all" && d.status !== statusFilter) return false;
      if (categoryFilter !== "all" && d.policyCategory !== categoryFilter) return false;
      if (onlyPending && !needsMyAcceptance(d)) return false;
      if (!q) return true;
      return [d.title, d.policyCategory, d.description].some((v) => v?.toLowerCase().includes(q));
    });
  }, [documents, search, statusFilter, categoryFilter, onlyPending, isAdmin]);

  const pendingCount = useMemo(() => documents.filter(needsMyAcceptance).length, [documents]);

  /* --------------------------- Menu control -------------------------- */

  const closeMenu = useCallback(() => setMenu(null), []);

  useEffect(() => {
    if (!menu) return;
    const onKey = (e) => e.key === "Escape" && closeMenu();
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", closeMenu);
    window.addEventListener("scroll", closeMenu, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
    };
  }, [menu, closeMenu]);

  const openMenu = (e, doc) => {
    e.stopPropagation();
    if (menu?.doc._id === doc._id) return closeMenu();
    const rect = e.currentTarget.getBoundingClientRect();
    const width = 230;
    const height = 6 * 42 + 24;
    const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8));
    const openUp = rect.bottom + height > window.innerHeight - 8;
    const top = openUp ? Math.max(8, rect.top - height - 4) : rect.bottom + 4;
    setMenu({ doc, top, left });
  };

  /* ------------------------- Create / edit logic --------------------- */

  const resetModal = () => {
    setForm(emptyForm());
    setSelectedFile(null);
    setProgress(0);
    setSourceMode("file");
    setEditingDocId(null);
    setOriginalVersion("");
    setDragActive(false);
    setShowPreview(false);
  };

  const closeModal = () => {
    if (submitting) return;
    setModalOpen(false);
    resetModal();
  };

  const openNew = (prefill = {}) => {
    resetModal();
    setForm({ ...emptyForm(), ...prefill });
    setModalOpen(true);
  };

  const handleEditClick = (doc) => {
    closeMenu();
    resetModal();
    setEditingDocId(doc._id);
    setOriginalVersion(doc.version || "1.0");
    setForm({
      title: doc.title || "",
      policyCategory: doc.policyCategory || "Employee Handbook",
      description: doc.description || "",
      version: doc.version || "1.0",
      effectiveDate: dateInput(doc.effectiveDate),
      lastReviewedDate: dateInput(doc.lastReviewedDate),
      status: doc.status || "Published",
      applicableType: doc.applicableTo?.type || "all",
      applicableValues: doc.applicableTo?.values || [],
      fileUrl: doc.fileUrl || "",
      content: doc.content || "",
    });
    setSourceMode(doc.content && !doc.fileUrl ? "text" : "file");
    setModalOpen(true);
  };

  const validateAndSetFile = (file) => {
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) return toast.error("Only PDF, DOC or DOCX files are allowed.");
    if (file.size > MAX_FILE_MB * 1024 * 1024) return toast.error(`File is too large. The maximum size is ${MAX_FILE_MB} MB.`);
    setSelectedFile(file);
    setForm((f) => (f.title ? f : { ...f, title: file.name.replace(/\.[^/.]+$/, "").replace(/[_-]+/g, " ") }));
  };

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    validateAndSetFile(e.dataTransfer.files?.[0]);
  };

  const onDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const uploadSelectedFile = async () => {
    const fd = new FormData();
    fd.append("file", selectedFile);
    const res = await api.post(UPLOAD_ENDPOINT, fd, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (ev) => ev.total && setProgress(Math.round((ev.loaded * 100) / ev.total)),
    });
    const url = res.data?.url || res.data?.fileUrl || res.data?.secure_url;
    if (!url) throw new Error("The upload succeeded but no file URL was returned.");
    return url;
  };

  // Inserts simple formatting markers into the text editor
  const applyFormat = (kind) => {
    const el = textareaRef.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e, value } = el;
    let next = value;
    let caret = e;

    if (kind === "bold") {
      const selected = value.slice(s, e) || "bold text";
      next = `${value.slice(0, s)}**${selected}**${value.slice(e)}`;
      caret = s + selected.length + 4;
    } else {
      const prefix = { h1: "# ", h2: "## ", list: "- " }[kind];
      const lineStart = value.lastIndexOf("\n", s - 1) + 1;
      next = `${value.slice(0, lineStart)}${prefix}${value.slice(lineStart)}`;
      caret = e + prefix.length;
    }
    setForm((f) => ({ ...f, content: next }));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(caret, caret);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (sourceMode === "file" && !selectedFile && !form.fileUrl) return toast.error("Please select a file to upload.");
    if (sourceMode === "link" && !form.fileUrl.trim()) return toast.error("Please paste a link to the policy document.");
    if (sourceMode === "text" && !form.content.trim()) return toast.error("Please write the policy text.");
    if (form.applicableType !== "all" && form.applicableValues.length === 0) {
      return toast.error(`Add at least one ${form.applicableType} this policy applies to.`);
    }

    setSubmitting(true);
    try {
      let fileUrl = form.fileUrl;
      if (sourceMode === "file" && selectedFile) fileUrl = await uploadSelectedFile();

      const payload = {
        title: form.title,
        policyCategory: form.policyCategory,
        description: form.description,
        version: form.version.trim() || "1.0",
        effectiveDate: form.effectiveDate || null,
        lastReviewedDate: form.lastReviewedDate || null,
        status: form.status,
        applicableTo: {
          type: form.applicableType,
          values: form.applicableType === "all" ? [] : form.applicableValues,
        },
        fileUrl: sourceMode === "text" ? "" : fileUrl,
        content: sourceMode === "text" ? form.content : "",
        category,
        visibility: "all-employees",
      };

      if (editingDocId) {
        await api.put(`/documents/${editingDocId}`, payload);
        toast.success(
          payload.version !== originalVersion
            ? "Policy updated. Employees will be asked to accept the new version."
            : "Policy updated successfully."
        );
      } else {
        await api.post("/documents", payload);
        toast.success(form.status === "Published" ? "Policy published successfully." : "Policy saved successfully.");
      }

      setModalOpen(false);
      resetModal();
      fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || "Operation failed. Please try again.");
    } finally {
      setSubmitting(false);
      setProgress(0);
    }
  };

  const changeStatus = async (doc, status) => {
    closeMenu();
    try {
      await api.put(`/documents/${doc._id}`, { ...toPayload(doc), status });
      toast.success(status === "Published" ? "Policy published." : status === "Archived" ? "Policy archived." : "Policy moved to drafts.");
      fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update the policy status.");
    }
  };

  const handleDelete = async (doc) => {
    closeMenu();
    if (!confirm("Are you sure you want to delete this policy? Acceptance records will also be lost.")) return;
    try {
      await api.delete(`/documents/${doc._id}`);
      toast.success("Policy deleted successfully.");
      fetchData();
    } catch {
      toast.error("Failed to delete the policy.");
    }
  };

  /* ------------------------ Reading and accepting -------------------- */

  const openReader = (doc) => {
    closeMenu();
    setViewingId(doc._id);
    setAgreed(false);
  };

  const acceptPolicy = async () => {
    if (!viewingDoc || !agreed) return;
    setAccepting(true);
    try {
      await api.post(`/documents/${viewingDoc._id}/acknowledge`, { version: viewingDoc.version });
      setDocuments((prev) =>
        prev.map((d) =>
          d._id === viewingDoc._id
            ? { ...d, acknowledged: true, acknowledgedVersion: d.version, acknowledgedAt: new Date().toISOString() }
            : d
        )
      );
      setAgreed(false);
      toast.success("Thank you. Your acceptance has been recorded.");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not record your acceptance. Please try again.");
    } finally {
      setAccepting(false);
    }
  };

  /* --------------------------- Tracking modal ------------------------ */

  const openTracking = async (doc) => {
    closeMenu();
    setTrackDoc(doc);
    setTrackData({ acknowledged: [], pending: [] });
    setTrackTab("pending");
    setTrackLoading(true);
    try {
      const res = await api.get(`/documents/${doc._id}/acknowledgements`);
      setTrackData({
        acknowledged: Array.isArray(res.data?.acknowledged) ? res.data.acknowledged : [],
        pending: Array.isArray(res.data?.pending) ? res.data.pending : [],
      });
    } catch {
      toast.error("Failed to load acceptance details.");
    } finally {
      setTrackLoading(false);
    }
  };

  const trackTotal = trackData.acknowledged.length + trackData.pending.length;
  const trackPercent = trackTotal ? Math.round((trackData.acknowledged.length / trackTotal) * 100) : 0;

  /* ------------------------------ Render ----------------------------- */

  const versionChanged = editingDocId && form.version.trim() !== originalVersion;
  const submitLabel = editingDocId
    ? "Update policy"
    : form.status === "Published" ? "Publish policy" : form.status === "Draft" ? "Save as draft" : "Save policy";

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 sm:p-8 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl font-medium leading-relaxed">{description}</p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => openNew()}
            className="flex w-full md:w-auto items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-2xl font-bold shadow-md shadow-indigo-100 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-200 active:scale-95 group shrink-0 text-xs cursor-pointer"
          >
            <Plus size={16} className="transition-transform duration-300 group-hover:rotate-90" />
            <span>New Policy</span>
          </Button>
        )}
      </div>

      {/* Pending acceptance banner */}
      {pendingCount > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 sm:px-5 py-4">
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
            <p className="text-sm font-semibold text-amber-900">
              {pendingCount === 1
                ? "1 policy is waiting for your acceptance."
                : `${pendingCount} policies are waiting for your acceptance.`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOnlyPending((v) => !v)}
            className="text-xs font-bold text-amber-800 bg-white border border-amber-200 hover:bg-amber-100 px-4 py-2 rounded-xl transition-colors cursor-pointer self-start sm:self-auto"
          >
            {onlyPending ? "Show all policies" : "Show only these"}
          </button>
        </div>
      )}

      {/* Quick templates */}
      {isAdmin && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Start from a template</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {QUICK_TEMPLATES.map((tmpl) => {
              const IconComp = tmpl.icon;
              return (
                <button
                  type="button"
                  key={tmpl.title}
                  onClick={() => openNew({ title: tmpl.title, policyCategory: tmpl.category, description: tmpl.desc })}
                  className="text-left bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:border-indigo-400 hover:shadow-lg hover:-translate-y-1 active:scale-[0.98] transition-all duration-300 cursor-pointer group flex sm:flex-col sm:justify-between gap-4 sm:gap-0 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100"
                >
                  <div className="flex sm:block items-start gap-3 min-w-0">
                    <div className="w-11 h-11 shrink-0 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center sm:mb-3 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                      <IconComp size={20} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{tmpl.title}</h4>
                      <p className="text-[11px] text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">{tmpl.desc}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search policies"
            className="w-full pl-10 pr-4 py-3 border border-slate-200 bg-white rounded-xl text-sm font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all"
          />
        </div>
        <div className={`grid gap-3 ${isAdmin ? "grid-cols-2" : "grid-cols-1"} lg:flex`}>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-3 border border-slate-200 bg-white rounded-xl text-sm font-medium text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 cursor-pointer"
          >
            <option value="all">All categories</option>
            {POLICY_CATEGORY_GROUPS.map((g) => (
              <optgroup key={g.group} label={g.group}>
                {g.items.map((i) => <option key={i} value={i}>{i}</option>)}
              </optgroup>
            ))}
          </select>
          {isAdmin && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 border border-slate-200 bg-white rounded-xl text-sm font-medium text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 cursor-pointer"
            >
              <option value="all">All statuses</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Policy list */}
      {loading ? (
        <div className="py-20 sm:py-24 text-center bg-white/60 rounded-3xl border border-slate-200/60">
          <Loader2 className="animate-spin mx-auto text-indigo-600 h-9 w-9" />
          <p className="text-xs text-slate-400 mt-3 font-semibold animate-pulse">Loading HR policies...</p>
        </div>
      ) : visibleDocs.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-10 sm:p-16 text-center shadow-sm">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FolderOpen size={30} />
          </div>
          <p className="text-base font-bold text-slate-800">No policies found</p>
          <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
            {documents.length
              ? "Try changing your search or filters."
              : isAdmin
                ? "Start from a template above or create a new policy."
                : "Policies will appear here once HR publishes them."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm divide-y divide-slate-100">
          {visibleDocs.map((d) => {
            const pending = needsMyAcceptance(d);
            const updatedSinceAccepted = pending && d.acknowledgedVersion && d.acknowledgedVersion !== d.version;
            const stats = d.ackStats;
            return (
              <div
                key={d._id}
                className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 transition-colors duration-200 hover:bg-indigo-50/40 first:rounded-t-2xl sm:first:rounded-t-3xl last:rounded-b-2xl sm:last:rounded-b-3xl"
              >
                <div className="flex items-start gap-3 sm:gap-4 min-w-0 flex-1">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl shrink-0">
                    <FileText size={22} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-slate-900 break-words">{d.title}</p>
                      <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">v{d.version || "1.0"}</span>
                      {isAdmin && (
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${STATUS_STYLES[d.status] || STATUS_STYLES.Draft}`}>
                          {d.status || "Draft"}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 font-medium">
                      {d.description || "Official company policy document."}
                    </p>

                    <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-x-3 gap-y-1 flex-wrap font-medium">
                      {d.policyCategory && (
                        <span className="font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">{d.policyCategory}</span>
                      )}
                      <span>Effective {formatDate(d.effectiveDate)}</span>
                      <span>Reviewed {formatDate(d.lastReviewedDate)}</span>
                      <span className="inline-flex items-center gap-1"><Users size={11} /> {applicableLabel(d.applicableTo)}</span>
                    </div>

                    <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                      {d.status === "Published" && d.appliesToMe !== false && (
                        pending ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                            <Circle size={10} />
                            {updatedSinceAccepted ? `Updated to v${d.version}. Please accept again.` : "Needs your acceptance"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                            <CheckCircle2 size={11} />
                            Accepted{d.acknowledgedAt ? ` on ${formatDate(d.acknowledgedAt)}` : ""}
                          </span>
                        )
                      )}
                      {isAdmin && stats && d.status === "Published" && (
                        <span className="text-[11px] font-bold text-slate-600">
                          {stats.accepted} of {stats.total} accepted
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                  <button
                    type="button"
                    onClick={() => openReader(d)}
                    className={`flex flex-1 md:flex-none items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-xl transition-all duration-300 active:scale-95 cursor-pointer border ${pending
                      ? "bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-100"
                      : "text-indigo-600 bg-indigo-50 border-indigo-100 hover:bg-indigo-600 hover:text-white"
                      }`}
                  >
                    <BookOpen size={14} />
                    <span>{pending ? "Read and accept" : "Read policy"}</span>
                  </button>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={(e) => openMenu(e, d)}
                      aria-label="Policy actions"
                      aria-haspopup="menu"
                      aria-expanded={menu?.doc._id === d._id}
                      className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-95 ${menu?.doc._id === d._id ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                        }`}
                    >
                      <MoreVertical size={18} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Three-dot dropdown */}
      {menu && (
        <>
          <div className="fixed inset-0 z-40" onClick={closeMenu} />
          <div
            role="menu"
            style={{ top: menu.top, left: menu.left, width: 230 }}
            className="fixed z-50 bg-white border border-slate-200 rounded-2xl shadow-xl p-1.5 animate-in fade-in zoom-in duration-150"
          >
            <MenuItem icon={Eye} label="Read policy" onClick={() => openReader(menu.doc)} />
            <MenuItem icon={Users} label="Acceptance tracking" onClick={() => openTracking(menu.doc)} />
            <div className="my-1 border-t border-slate-100" />
            <MenuItem icon={Edit3} label="Edit" onClick={() => handleEditClick(menu.doc)} />
            {menu.doc.status !== "Published" && <MenuItem icon={Send} label="Publish" onClick={() => changeStatus(menu.doc, "Published")} />}
            {menu.doc.status === "Published" && <MenuItem icon={FileEdit} label="Move to draft" onClick={() => changeStatus(menu.doc, "Draft")} />}
            {menu.doc.status !== "Archived" && <MenuItem icon={Archive} label="Archive" onClick={() => changeStatus(menu.doc, "Archived")} />}
            <MenuItem icon={Trash2} label="Delete" danger onClick={() => handleDelete(menu.doc)} />
          </div>
        </>
      )}

      {/* Create / edit modal */}
      <Modal isOpen={modalOpen} onClose={closeModal} title={editingDocId ? "Edit HR Policy" : "New HR Policy"}>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2 max-h-[75vh] overflow-y-auto px-0.5">
          <div>
            <label className={labelCls}>Policy Title</label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className={inputCls}
              placeholder="e.g. Leave Policy and Guidelines"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Category</label>
              <select
                value={form.policyCategory}
                onChange={(e) => setForm({ ...form, policyCategory: e.target.value })}
                className={`${inputCls} cursor-pointer`}
              >
                {POLICY_CATEGORY_GROUPS.map((g) => (
                  <optgroup key={g.group} label={g.group}>
                    {g.items.map((i) => <option key={i} value={i}>{i}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className={`${inputCls} cursor-pointer`}
              >
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {["POSH Policy", "Internal Committee Details"].includes(form.policyCategory) && (
            <p className="text-xs font-medium text-indigo-800 bg-indigo-50 border border-indigo-100 rounded-xl px-3.5 py-3 leading-relaxed">
              In India, workplaces with 10 or more employees must have an Internal Committee. Include the committee members' names and contact details in this policy.
            </p>
          )}

          <div>
            <label className={labelCls}>Summary</label>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className={inputCls}
              placeholder="e.g. Rules for casual, sick and earned leave."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Version</label>
              <div className="relative">
                <input
                  required
                  value={form.version}
                  onChange={(e) => setForm({ ...form, version: e.target.value })}
                  className={`${inputCls} ${editingDocId ? "pr-11" : ""}`}
                  placeholder="1.0"
                />
                {editingDocId && (
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, version: nextMajorVersion(form.version) })}
                    title="Increase version"
                    aria-label="Increase version"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 mt-[3px] text-indigo-600 hover:text-indigo-800 cursor-pointer"
                  >
                    <ArrowUpCircle size={20} />
                  </button>
                )}
              </div>
            </div>
            <div>
              <label className={labelCls}>Effective Date</label>
              <input
                required
                type="date"
                value={form.effectiveDate}
                onChange={(e) => setForm({ ...form, effectiveDate: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Last Reviewed</label>
              <input
                type="date"
                value={form.lastReviewedDate}
                onChange={(e) => setForm({ ...form, lastReviewedDate: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>

          {editingDocId && (
            <p
              className={`text-xs font-medium rounded-xl px-3.5 py-3 leading-relaxed border ${versionChanged ? "text-amber-800 bg-amber-50 border-amber-200" : "text-slate-600 bg-slate-50 border-slate-200"
                }`}
            >
              {versionChanged
                ? `Version changes from v${originalVersion} to v${form.version}. Everyone who accepted the old version will be asked to accept this one.`
                : "If you make a significant change, increase the version so employees accept the policy again."}
            </p>
          )}

          {/* Applicable to */}
          <div>
            <label className={labelCls}>Applicable To</label>
            <div className="mt-1.5 grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl">
              {[
                { key: "all", label: "Everyone" },
                { key: "department", label: "Departments" },
                { key: "role", label: "Roles" },
              ].map(({ key, label }) => (
                <button
                  type="button"
                  key={key}
                  onClick={() => setForm({ ...form, applicableType: key, applicableValues: key === form.applicableType ? form.applicableValues : [] })}
                  className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${form.applicableType === key ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                    }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {form.applicableType !== "all" && (
              <>
                <TagInput
                  values={form.applicableValues}
                  onChange={(v) => setForm({ ...form, applicableValues: v })}
                  placeholder={form.applicableType === "department" ? "Type a department and press Enter" : "Type a role and press Enter"}
                />
                <p className="text-[11px] text-slate-400 mt-1.5 font-medium">
                  Names must match the {form.applicableType} names used in your employee records.
                </p>
              </>
            )}
          </div>

          {/* Policy content */}
          <div>
            <label className={labelCls}>Policy Content</label>
            <div className="mt-1.5 grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl">
              {[
                { key: "file", label: "Upload File", icon: UploadCloud },
                { key: "link", label: "Paste Link", icon: Link2 },
                { key: "text", label: "Write Text", icon: Type },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  type="button"
                  key={key}
                  disabled={submitting}
                  onClick={() => setSourceMode(key)}
                  className={`flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer ${sourceMode === key ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                    }`}
                >
                  <Icon size={14} />
                  <span className="hidden xs:inline sm:inline">{label}</span>
                </button>
              ))}
            </div>

            {sourceMode === "file" && (
              <div className="mt-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  onChange={(e) => {
                    validateAndSetFile(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />

                {!selectedFile ? (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => fileInputRef.current?.click()}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && fileInputRef.current?.click()}
                    onDragEnter={onDrag}
                    onDragOver={onDrag}
                    onDragLeave={onDrag}
                    onDrop={onDrop}
                    className={`flex flex-col items-center justify-center text-center gap-2 px-4 py-8 sm:py-10 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100 ${dragActive
                      ? "border-indigo-500 bg-indigo-50 scale-[1.01]"
                      : "border-slate-300 bg-slate-50/60 hover:border-indigo-400 hover:bg-indigo-50/50"
                      }`}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <UploadCloud size={24} />
                    </div>
                    <p className="text-sm font-bold text-slate-800">
                      <span className="hidden sm:inline">Drag and drop your file here, or </span>
                      <span className="text-indigo-600">tap to browse</span>
                    </p>
                    <p className="text-[11px] text-slate-400 font-medium">PDF, DOC or DOCX, up to {MAX_FILE_MB} MB</p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3 sm:p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
                        <FileText size={20} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-800 truncate">{selectedFile.name}</p>
                        <p className="text-[11px] text-slate-400 font-medium">{formatSize(selectedFile.size)}</p>
                      </div>
                      {!submitting && (
                        <button
                          type="button"
                          onClick={() => { setSelectedFile(null); setProgress(0); }}
                          className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Remove file"
                        >
                          <X size={16} />
                        </button>
                      )}
                      {submitting && progress === 100 && <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />}
                    </div>
                    {submitting && (
                      <div className="mt-3">
                        <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-600 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                        </div>
                        <p className="text-[11px] text-slate-400 font-semibold mt-1.5">Uploading... {progress}%</p>
                      </div>
                    )}
                  </div>
                )}

                {editingDocId && form.fileUrl && !selectedFile && (
                  <p className="text-[11px] text-slate-400 mt-2 font-medium">
                    The current document will be kept unless you select a new file.
                  </p>
                )}
              </div>
            )}

            {sourceMode === "link" && (
              <input
                type="url"
                value={form.fileUrl}
                onChange={(e) => setForm({ ...form, fileUrl: e.target.value })}
                className={inputCls}
                placeholder="https://example.com/hr-policy.pdf"
              />
            )}

            {sourceMode === "text" && (
              <div className="mt-3">
                <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                  <div className="flex items-center gap-1">
                    {[
                      { k: "h1", icon: Heading1, label: "Heading" },
                      { k: "h2", icon: Heading2, label: "Subheading" },
                      { k: "bold", icon: Bold, label: "Bold" },
                      { k: "list", icon: List, label: "Bullet list" },
                    ].map(({ k, icon: Icon, label }) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => applyFormat(k)}
                        disabled={showPreview}
                        title={label}
                        aria-label={label}
                        className="w-9 h-9 rounded-lg border border-slate-200 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 disabled:opacity-40 flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <Icon size={15} />
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPreview((v) => !v)}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                  >
                    {showPreview ? "Back to editing" : "Preview"}
                  </button>
                </div>
                {showPreview ? (
                  <div className="min-h-[220px] max-h-[320px] overflow-y-auto border border-slate-200 rounded-xl bg-white p-4">
                    {form.content.trim() ? <RichText text={form.content} /> : <p className="text-sm text-slate-400">Nothing to preview yet.</p>}
                  </div>
                ) : (
                  <textarea
                    ref={textareaRef}
                    rows={10}
                    value={form.content}
                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                    className={`${inputCls} mt-0 resize-y min-h-[220px] leading-relaxed`}
                    placeholder={"# Purpose\nExplain why this policy exists.\n\n## Rules\n- First rule\n- Second rule"}
                  />
                )}
              </div>
            )}
          </div>

          <div className="pt-2 sticky bottom-0 bg-white pb-1">
            <Button
              type="submit"
              loading={submitting}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-xl font-bold shadow-md shadow-indigo-100 transition-all duration-300 hover:shadow-lg active:scale-[0.99] cursor-pointer"
            >
              {submitLabel}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Acceptance tracking modal */}
      <Modal isOpen={!!trackDoc} onClose={() => setTrackDoc(null)} title="Acceptance Tracking">
        <div className="pt-2">
          <p className="text-sm font-bold text-slate-800 truncate">{trackDoc?.title}</p>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Version {trackDoc?.version || "1.0"}</p>

          {trackLoading ? (
            <div className="py-12 text-center">
              <Loader2 className="animate-spin mx-auto text-indigo-600 h-6 w-6" />
            </div>
          ) : (
            <>
              <div className="mt-4 flex items-center gap-3">
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${trackPercent}%` }} />
                </div>
                <span className="text-xs font-bold text-slate-700 whitespace-nowrap">
                  {trackData.acknowledged.length} of {trackTotal} accepted
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl">
                {[
                  { key: "pending", label: `Not accepted (${trackData.pending.length})` },
                  { key: "acknowledged", label: `Accepted (${trackData.acknowledged.length})` },
                ].map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTrackTab(t.key)}
                    className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${trackTab === t.key ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                      }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {trackData[trackTab].length === 0 ? (
                <p className="py-10 text-center text-xs font-semibold text-slate-400">
                  {trackTab === "pending" ? "Everyone has accepted this policy." : "No one has accepted this policy yet."}
                </p>
              ) : (
                <ul className="mt-3 max-h-[50vh] overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-2xl">
                  {trackData[trackTab].map((row, i) => {
                    const emp = row.employee || row;
                    return (
                      <li key={emp._id || i} className="flex items-center justify-between gap-3 px-4 py-3">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate">{emp.name || "Unknown employee"}</p>
                          <p className="text-[11px] text-slate-400 font-medium truncate">
                            {[emp.employeeId, emp.department?.name || emp.department, emp.designation].filter(Boolean).join(" - ")}
                          </p>
                        </div>
                        {trackTab === "acknowledged" ? (
                          <span className="text-[11px] text-emerald-700 font-semibold text-right shrink-0">
                            {row.version ? `v${row.version} - ` : ""}{formatDate(row.acknowledgedAt)}
                          </span>
                        ) : (
                          <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 font-bold px-2 py-0.5 rounded-md shrink-0">
                            Pending
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}
        </div>
      </Modal>

      {/* Reader */}
      {viewingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-white w-full max-w-5xl h-full sm:h-[92vh] sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50">
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">{viewingDoc.title}</h3>
                <p className="text-xs font-semibold text-indigo-600 mt-0.5 truncate">
                  {[viewingDoc.policyCategory, `Version ${viewingDoc.version || "1.0"}`, `Effective ${formatDate(viewingDoc.effectiveDate)}`].filter(Boolean).join(" - ")}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {viewingDoc.fileUrl && (
                  <a
                    href={viewingDoc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 sm:px-4 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-600 hover:text-white rounded-xl transition-all flex items-center gap-1.5 border border-indigo-200/60"
                  >
                    <ExternalLink size={14} />
                    <span className="hidden sm:inline">Open in new tab</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => { setViewingId(null); setAgreed(false); }}
                  aria-label="Close"
                  className="w-9 h-9 bg-slate-200/70 hover:bg-rose-100 hover:text-rose-600 text-slate-700 rounded-full flex items-center justify-center transition-all cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-100 overflow-hidden flex">
              {viewingDoc.content && !viewingDoc.fileUrl ? (
                <div className="flex-1 overflow-y-auto p-3 sm:p-6">
                  <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-slate-200 p-5 sm:p-8">
                    <RichText text={viewingDoc.content} />
                  </div>
                </div>
              ) : viewingDoc.fileUrl && isPdf(viewingDoc.fileUrl) ? (
                <iframe src={viewingDoc.fileUrl} title={viewingDoc.title} className="w-full h-full bg-white" />
              ) : viewingDoc.fileUrl ? (
                <div className="flex-1 flex items-center justify-center text-center px-6">
                  <div>
                    <FileText size={40} className="mx-auto text-slate-300" />
                    <p className="text-sm font-bold text-slate-700 mt-3">This file type cannot be previewed here.</p>
                    <a
                      href={viewingDoc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 mt-4 px-4 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl"
                    >
                      Open the document <ExternalLink size={13} />
                    </a>
                  </div>
                </div>
              ) : (
                <p className="m-auto text-xs font-semibold text-slate-400">No content is available for this policy.</p>
              )}
            </div>

            {/* Acceptance bar */}
            {needsMyAcceptance(viewingDoc) && (
              <div className="border-t border-slate-200 bg-white px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-0.5 h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-200 cursor-pointer"
                  />
                  <span className="text-sm font-semibold text-slate-700 leading-snug">
                    I have read and agree to this policy (version {viewingDoc.version || "1.0"}).
                  </span>
                </label>
                <Button
                  type="button"
                  onClick={acceptPolicy}
                  loading={accepting}
                  disabled={!agreed}
                  className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-bold text-sm shrink-0 cursor-pointer"
                >
                  Accept policy
                </Button>
              </div>
            )}
            {viewingDoc.status === "Published" && viewingDoc.acknowledged && (
              <div className="border-t border-emerald-100 bg-emerald-50 px-4 sm:px-6 py-3 flex items-center gap-2 text-sm font-semibold text-emerald-700">
                <CheckCircle2 size={16} className="shrink-0" />
                You accepted this policy{viewingDoc.acknowledgedAt ? ` on ${formatDate(viewingDoc.acknowledgedAt)}` : ""}.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}