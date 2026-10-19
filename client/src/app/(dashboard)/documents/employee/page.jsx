"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Loader2, FileText, Trash2, FolderOpen, Edit3, UserCheck, Calendar, ShieldCheck, Plus, Upload,
  MoreVertical, Eye, Download, BadgeCheck, History, CheckCircle2, Circle, XCircle, Clock,
  AlertTriangle, ClipboardList, Search, Hash, X,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { useAuth } from "@/context/AuthContext";

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const DOC_TYPE_GROUPS = [
  {
    group: "Identity and Address",
    types: ["Aadhaar Card", "PAN Card", "Passport", "Visa", "Driving Licence", "Address Proof", "Photograph"],
  },
  {
    group: "Education and Experience",
    types: ["Degree Certificate", "Marksheet", "Experience Letter", "Relieving Letter"],
  },
  {
    group: "Joining Documents",
    types: [
      "Signed Offer Letter", "Appointment Letter", "Bank Details (Cancelled Cheque)",
      "UAN Number", "ESI Number", "PF Nomination (Form 2)", "Emergency Contact",
    ],
  },
  {
    group: "Other",
    types: ["Background Verification Report", "Medical Certificate", "Signed NDA", "Policy Acknowledgement"],
  },
];

const EXPIRY_TYPES = ["Passport", "Visa"];
const SENSITIVE_TYPES = ["Aadhaar Card"];

// Documents every employee must submit during onboarding
const REQUIRED_DOCS = [
  "Aadhaar Card", "PAN Card", "Address Proof", "Photograph",
  "Degree Certificate", "Experience Letter", "Relieving Letter",
  "Signed Offer Letter", "Appointment Letter", "Bank Details (Cancelled Cheque)",
  "UAN Number", "PF Nomination (Form 2)", "Emergency Contact",
  "Signed NDA", "Policy Acknowledgement",
];

const STATUS_STYLES = {
  Pending: "bg-amber-50 text-amber-700 border-amber-200",
  Verified: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Rejected: "bg-rose-50 text-rose-700 border-rose-200",
};
const STATUS_ICONS = { Pending: Clock, Verified: CheckCircle2, Rejected: XCircle };

const MIME_EXT = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

const emptyForm = (employeeSpecific) => ({
  title: "",
  employee: "",
  docType: "Aadhaar Card",
  docNumber: "",
  fileUrl: "",
  expiryDate: "",
  remarks: "",
  visibility: employeeSpecific ? "specific-employee" : "all-employees",
});

const inputCls =
  "mt-1.5 w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 bg-slate-50/50 hover:border-slate-300 font-medium text-slate-800";
const labelCls = "text-xs font-bold uppercase tracking-wider text-slate-500";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const getMime = (url = "") => {
  const dataMatch = url.match(/^data:([^;,]+)/);
  if (dataMatch) return dataMatch[1];
  const ext = url.split("?")[0].split(".").pop()?.toLowerCase();
  return (
    {
      pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    }[ext] || ""
  );
};

// Shows only the last four digits of sensitive numbers, e.g. XXXX-1234
const maskNumber = (type, number) => {
  if (!number) return "";
  if (SENSITIVE_TYPES.includes(type)) {
    const digits = String(number).replace(/\D/g, "");
    return digits.length >= 4 ? `XXXX-${digits.slice(-4)}` : "XXXX";
  }
  return number;
};

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "-";

const expiryState = (value) => {
  if (!value) return null;
  const days = Math.ceil((new Date(value).getTime() - Date.now()) / 86400000);
  if (days < 0) return "expired";
  if (days <= 30) return "soon";
  return "valid";
};

const idOf = (v) => (v && typeof v === "object" ? v._id : v);

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function DocumentCategoryPage({
  category = "employee-documents",
  title = "Employee Documents",
  description = "Each employee's personal file: identity, education, joining documents and verification status.",
  employeeSpecific = true,
}) {
  const { user } = useAuth();
  const isAdmin = ["admin", "hr"].includes(user?.role);
  const myEmployeeId = user?.employee?._id;

  const [documents, setDocuments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [employeeFilter, setEmployeeFilter] = useState("all");

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDocId, setEditingDocId] = useState(null);
  const [fileChanged, setFileChanged] = useState(false);
  const [form, setForm] = useState(emptyForm(employeeSpecific));

  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [viewer, setViewer] = useState({ url: "", mime: "", loading: false });

  const [verifyDoc, setVerifyDoc] = useState(null);
  const [verifyForm, setVerifyForm] = useState({ status: "Verified", remarks: "" });

  const [auditDoc, setAuditDoc] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // Three-dot menu
  const [menu, setMenu] = useState(null); // { doc, top, left }

  /* ------------------------------ Data ------------------------------ */

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { category };
      if (!isAdmin && employeeSpecific && myEmployeeId) params.employee = myEmployeeId;

      const [docRes, empRes] = await Promise.all([
        api.get("/documents", { params }),
        isAdmin && employeeSpecific ? api.get("/employees") : Promise.resolve({ data: [] }),
      ]);

      setDocuments(Array.isArray(docRes.data) ? docRes.data : []);
      setEmployees(Array.isArray(empRes.data) ? empRes.data : []);
    } catch (err) {
      toast.error("Failed to load documents from the server.");
    } finally {
      setLoading(false);
    }
  }, [category, isAdmin, employeeSpecific, myEmployeeId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Records every view and download in the audit log (never blocks the user)
  const logAction = (docId, action) => {
    api.post(`/documents/${docId}/audit`, { action }).catch(() => { });
  };

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
    const width = 220;
    const itemCount = 2 + (isAdmin ? 4 : 0);
    const height = itemCount * 42 + 16;
    const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8));
    const openUp = rect.bottom + height > window.innerHeight - 8;
    const top = openUp ? Math.max(8, rect.top - height - 4) : rect.bottom + 4;
    setMenu({ doc, top, left });
  };

  /* ---------------------------- Viewer ------------------------------- */

  useEffect(() => {
    if (!viewModalOpen || !selectedDoc?.fileUrl) return;
    let objectUrl = "";
    let cancelled = false;
    const src = selectedDoc.fileUrl;

    const load = async () => {
      setViewer({ url: "", mime: getMime(src), loading: true });
      try {
        if (src.startsWith("data:")) {
          // Blob URLs open reliably in iframes, even for large PDFs
          const blob = await (await fetch(src)).blob();
          objectUrl = URL.createObjectURL(blob);
          if (!cancelled) setViewer({ url: objectUrl, mime: blob.type || getMime(src), loading: false });
        } else if (!cancelled) {
          setViewer({ url: src, mime: getMime(src), loading: false });
        }
      } catch {
        if (!cancelled) setViewer({ url: "", mime: "", loading: false });
      }
    };
    load();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [viewModalOpen, selectedDoc]);

  const handleView = (doc) => {
    closeMenu();
    if (!doc.fileUrl) return toast.info("No file is attached to this record.");
    setSelectedDoc(doc);
    setViewModalOpen(true);
    logAction(doc._id, "view");
  };

  const handleDownload = (doc) => {
    closeMenu();
    if (!doc.fileUrl) return toast.info("No file is attached to this record.");
    const ext = MIME_EXT[getMime(doc.fileUrl)] || "file";
    const safeName = (doc.title || "document").replace(/[^\w\-]+/g, "_");
    const link = document.createElement("a");
    link.href = doc.fileUrl;
    link.download = `${safeName}.${ext}`;
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    link.remove();
    logAction(doc._id, "download");
    toast.success("Download started.");
  };

  /* ---------------------------- Form logic --------------------------- */

  const openUploadModal = (prefill = {}) => {
    setEditingDocId(null);
    setFileChanged(false);
    setForm({ ...emptyForm(employeeSpecific), ...prefill });
    setModalOpen(true);
  };

  const handleEditClick = (doc) => {
    closeMenu();
    setEditingDocId(doc._id);
    setFileChanged(false);
    setForm({
      title: doc.title || "",
      employee: idOf(doc.employee) || "",
      docType: doc.docType || "Aadhaar Card",
      docNumber: doc.docNumber || "",
      fileUrl: doc.fileUrl || "",
      expiryDate: doc.expiryDate ? String(doc.expiryDate).slice(0, 10) : "",
      remarks: doc.remarks || "",
      visibility: doc.visibility || (employeeSpecific ? "specific-employee" : "all-employees"),
    });
    setModalOpen(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10 MB.");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setForm((prev) => ({ ...prev, fileUrl: reader.result }));
      setFileChanged(true);
      toast.success("File attached successfully.");
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!editingDocId && !form.fileUrl) return toast.error("Please attach a file before saving.");

    setSubmitting(true);
    try {
      const payload = {
        title: form.title,
        category,
        docType: form.docType,
        docNumber: form.docNumber,
        expiryDate: EXPIRY_TYPES.includes(form.docType) && form.expiryDate ? form.expiryDate : null,
        remarks: form.remarks,
        employee: employeeSpecific && form.employee ? form.employee : null,
        visibility: employeeSpecific ? "specific-employee" : "all-employees",
      };
      // Only send the file when it is new or has been replaced
      if (!editingDocId || fileChanged) payload.fileUrl = form.fileUrl;

      if (editingDocId) {
        await api.put(`/documents/${editingDocId}`, payload);
        toast.success("Document updated successfully.");
      } else {
        await api.post("/documents", payload);
        toast.success("Document uploaded successfully.");
      }

      setModalOpen(false);
      setEditingDocId(null);
      setForm(emptyForm(employeeSpecific));
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Operation failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (doc) => {
    closeMenu();
    if (!confirm("Are you sure you want to delete this document record?")) return;
    try {
      await api.delete(`/documents/${doc._id}`);
      toast.success("Document deleted successfully.");
      fetchData();
    } catch (err) {
      toast.error("Failed to delete the document.");
    }
  };

  /* --------------------------- Verification -------------------------- */

  const openVerify = (doc) => {
    closeMenu();
    setVerifyDoc(doc);
    setVerifyForm({
      status: doc.verificationStatus === "Rejected" ? "Rejected" : "Verified",
      remarks: doc.remarks || "",
    });
  };

  const submitVerify = async (e) => {
    e.preventDefault();
    if (verifyForm.status === "Rejected" && !verifyForm.remarks.trim()) {
      return toast.error("Please add a remark explaining the rejection.");
    }
    setSubmitting(true);
    try {
      await api.patch(`/documents/${verifyDoc._id}/verify`, verifyForm);
      toast.success(`Document marked as ${verifyForm.status.toLowerCase()}.`);
      setVerifyDoc(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update the verification status.");
    } finally {
      setSubmitting(false);
    }
  };

  /* ----------------------------- Audit log --------------------------- */

  const openAudit = async (doc) => {
    closeMenu();
    setAuditDoc(doc);
    setAuditLogs([]);
    setAuditLoading(true);
    try {
      const res = await api.get(`/documents/${doc._id}/audit`);
      setAuditLogs(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error("Failed to load the audit log.");
    } finally {
      setAuditLoading(false);
    }
  };

  /* ------------------------ Filtering & checklist -------------------- */

  const filteredDocs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return documents.filter((d) => {
      if (statusFilter !== "all" && (d.verificationStatus || "Pending") !== statusFilter) return false;
      if (employeeFilter !== "all" && idOf(d.employee) !== employeeFilter) return false;
      if (!q) return true;
      return [d.title, d.docType, d.employee?.name].some((v) => v?.toLowerCase().includes(q));
    });
  }, [documents, search, statusFilter, employeeFilter]);

  const checklistEmployeeId = isAdmin ? (employeeFilter !== "all" ? employeeFilter : null) : myEmployeeId;

  const checklist = useMemo(() => {
    if (!employeeSpecific || !checklistEmployeeId) return null;
    const mine = documents.filter((d) => idOf(d.employee) === checklistEmployeeId);
    const rank = { Verified: 3, Pending: 2, Rejected: 1 };
    return REQUIRED_DOCS.map((type) => {
      const matches = mine.filter((d) => d.docType === type);
      if (!matches.length) return { type, status: "Missing" };
      const best = matches.reduce((a, b) =>
        (rank[b.verificationStatus || "Pending"] || 0) > (rank[a.verificationStatus || "Pending"] || 0) ? b : a
      );
      return { type, status: best.verificationStatus || "Pending", doc: best };
    });
  }, [documents, checklistEmployeeId, employeeSpecific]);

  const checklistStats = useMemo(() => {
    if (!checklist) return null;
    const verified = checklist.filter((c) => c.status === "Verified").length;
    const missing = checklist.filter((c) => c.status === "Missing").length;
    return { verified, missing, total: checklist.length, percent: Math.round((verified / checklist.length) * 100) };
  }, [checklist]);

  const selectedEmployeeName = employees.find((e) => e._id === checklistEmployeeId)?.name;

  /* ------------------------------ Render ----------------------------- */

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl font-medium leading-relaxed">{description}</p>
          {!isAdmin && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
              <ShieldCheck size={12} /> You can see only your own documents.
            </p>
          )}
        </div>
        {isAdmin && (
          <Button
            onClick={() => openUploadModal()}
            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-2xl font-bold shadow-md shadow-indigo-100 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-200 active:scale-95 group shrink-0 text-xs cursor-pointer w-full md:w-auto"
          >
            <Plus size={16} className="transition-transform duration-300 group-hover:rotate-90" />
            <span>Upload Document</span>
          </Button>
        )}
      </div>

      {/* Onboarding checklist */}
      {employeeSpecific && (
        <section className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                <ClipboardList size={18} />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-bold text-slate-900">Onboarding checklist</h2>
                <p className="text-xs text-slate-500 font-medium truncate">
                  {checklist
                    ? `${selectedEmployeeName ? selectedEmployeeName + ": " : ""}${checklistStats.verified} of ${checklistStats.total} verified, ${checklistStats.missing} missing`
                    : "Select an employee in the filter below to see their checklist."}
                </p>
              </div>
            </div>
            {checklist && (
              <div className="flex items-center gap-3 sm:w-56">
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${checklistStats.percent}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-slate-700 w-9 text-right">{checklistStats.percent}%</span>
              </div>
            )}
          </div>

          {checklist && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {checklist.map((item) => {
                const isMissing = item.status === "Missing";
                const Icon = isMissing ? Circle : STATUS_ICONS[item.status];
                const tone = isMissing ? "text-slate-400 bg-slate-50 border-slate-200" : STATUS_STYLES[item.status];
                const clickable = isAdmin && isMissing;
                return (
                  <div
                    key={item.type}
                    role={clickable ? "button" : undefined}
                    tabIndex={clickable ? 0 : undefined}
                    onClick={() =>
                      clickable && openUploadModal({ title: item.type, docType: item.type, employee: checklistEmployeeId })
                    }
                    onKeyDown={(e) =>
                      clickable && e.key === "Enter" &&
                      openUploadModal({ title: item.type, docType: item.type, employee: checklistEmployeeId })
                    }
                    className={`flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-colors ${tone} ${clickable ? "cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/60" : ""
                      }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <Icon size={14} className="shrink-0" />
                      <span className="truncate text-slate-800">{item.type}</span>
                    </span>
                    <span className="shrink-0">{isMissing ? (clickable ? "Add" : "Missing") : item.status}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, type or employee"
            className="w-full pl-10 pr-4 py-3 border border-slate-200 bg-white rounded-xl text-sm font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all"
          />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:flex">
          {isAdmin && employeeSpecific && (
            <select
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              className="px-4 py-3 border border-slate-200 bg-white rounded-xl text-sm font-medium text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 cursor-pointer"
            >
              <option value="all">All employees</option>
              {employees.map((e) => (
                <option key={e._id} value={e._id}>{e.name}</option>
              ))}
            </select>
          )}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 border border-slate-200 bg-white rounded-xl text-sm font-medium text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 cursor-pointer"
          >
            <option value="all">All statuses</option>
            <option value="Pending">Pending</option>
            <option value="Verified">Verified</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Document list */}
      {loading ? (
        <div className="py-24 text-center bg-white/50 backdrop-blur-xs rounded-3xl border border-slate-200/60">
          <Loader2 className="animate-spin mx-auto text-indigo-600 h-9 w-9" />
          <p className="text-xs text-slate-400 mt-3 font-semibold animate-pulse">Loading documents...</p>
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 sm:p-16 text-center shadow-sm">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xs">
            <FolderOpen size={30} />
          </div>
          <p className="text-base font-bold text-slate-800">No documents found</p>
          <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
            {documents.length ? "Try changing your search or filters." : "No documents have been added to this section yet."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm divide-y divide-slate-100">
          {filteredDocs.map((d) => {
            const status = d.verificationStatus || "Pending";
            const StatusIcon = STATUS_ICONS[status] || Clock;
            const exp = expiryState(d.expiryDate);
            const masked = maskNumber(d.docType, d.docNumber);
            return (
              <div
                key={d._id}
                className="p-4 sm:p-5 flex items-start sm:items-center justify-between gap-3 transition-colors duration-200 hover:bg-indigo-50/40 first:rounded-t-3xl last:rounded-b-3xl"
              >
                <button
                  type="button"
                  onClick={() => handleView(d)}
                  className="flex items-start sm:items-center gap-3.5 sm:gap-4 min-w-0 flex-1 text-left cursor-pointer"
                >
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl shrink-0">
                    <FileText size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-slate-900 truncate max-w-full">{d.title}</p>
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md border ${STATUS_STYLES[status]}`}
                      >
                        <StatusIcon size={11} /> {status}
                      </span>
                    </div>

                    <div className="text-xs text-slate-400 mt-1.5 flex items-center gap-x-3 gap-y-1.5 flex-wrap">
                      {d.docType && (
                        <span className="font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">{d.docType}</span>
                      )}
                      {masked && (
                        <span className="inline-flex items-center gap-1 font-mono font-semibold text-slate-600">
                          <Hash size={11} /> {masked}
                        </span>
                      )}
                      {d.employee?.name && (
                        <span className="inline-flex items-center gap-1 font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100/60">
                          <UserCheck size={12} /> {d.employee.name}
                          {d.employee.employeeId ? ` (${d.employee.employeeId})` : ""}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 text-slate-500 font-medium">
                        <Calendar size={12} /> Added {formatDate(d.createdAt)}
                      </span>
                      {exp && (
                        <span
                          className={`inline-flex items-center gap-1 font-semibold ${exp === "expired" ? "text-rose-600" : exp === "soon" ? "text-amber-600" : "text-slate-500"
                            }`}
                        >
                          {exp !== "valid" && <AlertTriangle size={12} />}
                          {exp === "expired" ? "Expired" : "Expires"} {formatDate(d.expiryDate)}
                        </span>
                      )}
                    </div>

                    {(d.verifiedBy?.name || d.verifiedOn) && status !== "Pending" && (
                      <p className="text-[11px] text-slate-400 mt-1.5 font-medium">
                        {status === "Verified" ? "Verified" : "Rejected"}
                        {d.verifiedBy?.name ? ` by ${d.verifiedBy.name}` : ""}
                        {d.verifiedOn ? ` on ${formatDate(d.verifiedOn)}` : ""}
                      </p>
                    )}
                    {d.remarks && (
                      <p className="text-[11px] text-slate-500 mt-1 italic line-clamp-2">Remarks: {d.remarks}</p>
                    )}
                  </div>
                </button>

                {/* Three-dot menu trigger */}
                <button
                  type="button"
                  onClick={(e) => openMenu(e, d)}
                  aria-label="Document actions"
                  aria-haspopup="menu"
                  aria-expanded={menu?.doc._id === d._id}
                  className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-95 ${menu?.doc._id === d._id
                    ? "bg-indigo-600 text-white"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                    }`}
                >
                  <MoreVertical size={18} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Three-dot dropdown (fixed so it is never clipped on any screen size) */}
      {menu && (
        <>
          <div className="fixed inset-0 z-40" onClick={closeMenu} />
          <div
            role="menu"
            style={{ top: menu.top, left: menu.left, width: 220 }}
            className="fixed z-50 bg-white border border-slate-200 rounded-2xl shadow-xl p-1.5 animate-in fade-in zoom-in duration-150"
          >
            <MenuItem icon={Eye} label="View" onClick={() => handleView(menu.doc)} />
            <MenuItem icon={Download} label="Download" onClick={() => handleDownload(menu.doc)} />
            {isAdmin && (
              <>
                <div className="my-1 border-t border-slate-100" />
                {/* <MenuItem icon={BadgeCheck} label="Verify or reject" onClick={() => openVerify(menu.doc)} /> */}
                <MenuItem icon={Edit3} label="Edit" onClick={() => handleEditClick(menu.doc)} />
                {/* <MenuItem icon={History} label="Audit log" onClick={() => openAudit(menu.doc)} /> */}
                <MenuItem icon={Trash2} label="Delete" danger onClick={() => handleDelete(menu.doc)} />
              </>
            )}
          </div>
        </>
      )}

      {/* Upload / Edit modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingDocId ? "Edit Employee Document" : "Upload Employee Document"}
      >
        <form onSubmit={handleUpload} className="space-y-4 pt-2 max-h-[75vh] overflow-y-auto px-0.5">
          <div>
            <label className={labelCls}>Document Title</label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className={inputCls}
              placeholder="e.g. PAN Card - Rahul Sharma"
            />
          </div>

          {employeeSpecific && (
            <div>
              <label className={labelCls}>Employee</label>
              <select
                required
                value={form.employee}
                onChange={(e) => setForm({ ...form, employee: e.target.value })}
                className={`${inputCls} cursor-pointer`}
              >
                <option value="">-- Select Employee --</option>
                {employees.map((e) => (
                  <option key={e._id} value={e._id}>
                    {e.name}{e.employeeId ? ` (${e.employeeId})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Document Type</label>
              <select
                required
                value={form.docType}
                onChange={(e) => setForm({ ...form, docType: e.target.value })}
                className={`${inputCls} cursor-pointer`}
              >
                {DOC_TYPE_GROUPS.map((g) => (
                  <optgroup key={g.group} label={g.group}>
                    {g.types.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Document Number</label>
              <input
                value={form.docNumber}
                onChange={(e) => setForm({ ...form, docNumber: e.target.value })}
                className={inputCls}
                placeholder="e.g. ABCDE1234F"
                autoComplete="off"
              />
            </div>
          </div>

          {EXPIRY_TYPES.includes(form.docType) && (
            <div>
              <label className={labelCls}>Expiry Date</label>
              <input
                type="date"
                required
                value={form.expiryDate}
                onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                className={inputCls}
              />
            </div>
          )}

          <div>
            <label className={labelCls}>Document File (PDF, DOC or Image)</label>
            <div className="mt-1.5 border-2 border-dashed border-slate-200 hover:border-indigo-500 rounded-2xl p-4 text-center bg-slate-50/50 transition-colors relative cursor-pointer">
              <input
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <div className="flex flex-col items-center justify-center space-y-1">
                <Upload className="h-6 w-6 text-indigo-600 mb-1" />
                <p className="text-xs font-bold text-slate-700">
                  {form.fileUrl
                    ? fileChanged || !editingDocId
                      ? "File attached and ready to save"
                      : "Current file kept. Click to replace it."
                    : "Click to browse or drag and drop a file here"}
                </p>
                <p className="text-[10px] text-slate-400 font-medium">PDF, DOC or images up to 10 MB</p>
              </div>
            </div>
          </div>

          <div>
            <label className={labelCls}>Remarks (optional)</label>
            <textarea
              rows={2}
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              className={`${inputCls} resize-none`}
              placeholder="Any note about this document"
            />
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              loading={submitting}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-xl font-bold shadow-md shadow-indigo-100 transition-all duration-300 hover:shadow-lg active:scale-[0.99] cursor-pointer"
            >
              {editingDocId ? "Update Document Record" : "Upload and Save Record"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Verify modal */}
      <Modal isOpen={!!verifyDoc} onClose={() => setVerifyDoc(null)} title="Verify Document">
        <form onSubmit={submitVerify} className="space-y-4 pt-2">
          <p className="text-sm font-semibold text-slate-700">
            {verifyDoc?.title}
            {verifyDoc?.employee?.name && <span className="text-slate-400 font-medium"> - {verifyDoc.employee.name}</span>}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {["Verified", "Rejected", "Pending"].map((s) => {
              const Icon = STATUS_ICONS[s];
              const active = verifyForm.status === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setVerifyForm({ ...verifyForm, status: s })}
                  className={`flex flex-col items-center gap-1 py-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${active ? `${STATUS_STYLES[s]} ring-2 ring-offset-1 ring-indigo-200` : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                    }`}
                >
                  <Icon size={16} /> {s}
                </button>
              );
            })}
          </div>
          <div>
            <label className={labelCls}>
              Remarks{verifyForm.status === "Rejected" ? " (required)" : " (optional)"}
            </label>
            <textarea
              rows={3}
              value={verifyForm.remarks}
              onChange={(e) => setVerifyForm({ ...verifyForm, remarks: e.target.value })}
              className={`${inputCls} resize-none`}
              placeholder="e.g. Image is blurry, please upload a clearer copy"
            />
          </div>
          <Button
            type="submit"
            loading={submitting}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-xl font-bold cursor-pointer"
          >
            Save verification
          </Button>
        </form>
      </Modal>

      {/* Audit log modal */}
      <Modal isOpen={!!auditDoc} onClose={() => setAuditDoc(null)} title="Access Audit Log">
        <div className="pt-2">
          <p className="text-sm font-semibold text-slate-700 mb-3 truncate">{auditDoc?.title}</p>
          {auditLoading ? (
            <div className="py-10 text-center">
              <Loader2 className="animate-spin mx-auto text-indigo-600 h-6 w-6" />
            </div>
          ) : auditLogs.length === 0 ? (
            <p className="py-8 text-center text-xs font-semibold text-slate-400">No activity has been recorded yet.</p>
          ) : (
            <ul className="max-h-[55vh] overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-2xl">
              {auditLogs.map((log, i) => (
                <li key={log._id || i} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${log.action === "download" ? "bg-emerald-50 text-emerald-600" : "bg-indigo-50 text-indigo-600"
                        }`}
                    >
                      {log.action === "download" ? <Download size={14} /> : <Eye size={14} />}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">
                        {log.user?.name || "Unknown user"}
                        <span className="font-medium text-slate-500">
                          {" "}{log.action === "download" ? "downloaded" : "viewed"} this file
                        </span>
                      </p>
                      {log.user?.role && <p className="text-[11px] text-slate-400 capitalize">{log.user.role}</p>}
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium text-right shrink-0">
                    {new Date(log.createdAt).toLocaleString("en-IN", {
                      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>

      {/* Document viewer */}
      {viewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-white w-full max-w-6xl h-full sm:h-[92vh] sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50">
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                  {selectedDoc?.title || "Document Viewer"}
                </h3>
                <p className="text-xs font-semibold text-indigo-600 mt-0.5 truncate">
                  {[selectedDoc?.employee?.name, selectedDoc?.docType].filter(Boolean).join(" - ")}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleDownload(selectedDoc)}
                  className="px-3 sm:px-4 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-600 hover:text-white rounded-xl transition-all flex items-center gap-1.5 border border-indigo-200/60 cursor-pointer"
                >
                  <Download size={14} />
                  <span className="hidden sm:inline">Download</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewModalOpen(false)}
                  aria-label="Close viewer"
                  className="w-9 h-9 bg-slate-200/70 hover:bg-rose-100 hover:text-rose-600 text-slate-700 rounded-full flex items-center justify-center transition-all cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 bg-slate-100 p-2 sm:p-4 overflow-hidden flex items-center justify-center">
              {viewer.loading ? (
                <Loader2 className="animate-spin text-indigo-600 h-8 w-8" />
              ) : !viewer.url ? (
                <p className="text-xs font-semibold text-slate-400">No preview available.</p>
              ) : viewer.mime.startsWith("image/") ? (
                <img
                  src={viewer.url}
                  alt={selectedDoc?.title}
                  className="max-w-full max-h-full object-contain rounded-xl shadow-md bg-white"
                />
              ) : viewer.mime === "application/pdf" ? (
                <iframe
                  src={viewer.url}
                  className="w-full h-full rounded-2xl border border-slate-200 bg-white shadow-sm"
                  title={selectedDoc?.title}
                />
              ) : (
                <div className="text-center px-6">
                  <FileText size={40} className="mx-auto text-slate-300" />
                  <p className="text-sm font-bold text-slate-700 mt-3">This file type cannot be previewed.</p>
                  <p className="text-xs text-slate-400 mt-1">Use the Download button to open it on your device.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Small presentational helper                                         */
/* ------------------------------------------------------------------ */

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