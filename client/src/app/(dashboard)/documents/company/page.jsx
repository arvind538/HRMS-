// src/components/documents/DocumentCategoryPage.jsx
"use client";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Plus,
  Loader2,
  FileText,
  Image as ImageIcon,
  Trash2,
  FolderOpen,
  Pencil,
  Eye,
  Download,
  Upload,
  X,
  Search,
  ExternalLink,
  AlertTriangle,
  Files,
  Lock,
  Globe,
  Maximize2,
  Minimize2,
  CheckCircle2,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import { useAuth } from "@/context/AuthContext";

/* ============================ CONFIG ============================ */

// Category ke hisaab se document types (subtypes) aur quick-add list.
const CATEGORY_CONFIG = {
  "company-documents": {
    defaultSubtype: "Certificate of Incorporation",
    groups: [
      {
        name: "Registration & Tax",
        items: [
          "Certificate of Incorporation",
          "PAN Card",
          "TAN Certificate",
          "GST Certificate",
          "MSME / Udyam Certificate",
          "Shop & Establishment Licence",
          "MoA / AoA",
        ],
      },
      {
        name: "Statutory",
        items: ["PF Registration", "ESI Registration", "Professional Tax Registration", "Labour Licence"],
      },
      {
        name: "Contracts & Property",
        items: ["Office Lease Agreement", "Vendor Contract", "Client Contract", "NDA", "Insurance Policy"],
      },
      { name: "Certifications", items: ["ISO Certificate", "Compliance Certificate"] },
      { name: "Branding", items: ["Company Logo", "Letterhead", "Signature / Stamp", "Org Chart"] },
      { name: "Other", items: ["Other Document"] },
    ],
    quick: [
      "Certificate of Incorporation",
      "GST Certificate",
      "PAN Card",
      "Shop & Establishment Licence",
      "Office Lease Agreement",
      "Insurance Policy",
    ],
  },
  "hr-policies": {
    defaultSubtype: "Employee Handbook",
    groups: [
      {
        name: "Core Policies",
        items: [
          "Employee Handbook",
          "Code of Conduct",
          "Leave Policy",
          "Attendance Policy",
          "WFH / Hybrid Policy",
          "Holiday Calendar",
        ],
      },
      {
        name: "Conduct & Safety",
        items: [
          "POSH Policy",
          "Grievance Redressal Policy",
          "Whistleblower Policy",
          "Disciplinary Policy",
          "Safety Policy",
        ],
      },
      {
        name: "Operations",
        items: [
          "IT & Data Security Policy",
          "Expense & Travel Policy",
          "Dress Code",
          "Notice Period & Exit Policy",
          "Performance Review Policy",
        ],
      },
      { name: "Other", items: ["Other Document"] },
    ],
    quick: ["Employee Handbook", "Code of Conduct", "Leave Policy", "POSH Policy", "Holiday Calendar"],
  },
};

const FALLBACK_CONFIG = {
  defaultSubtype: "General Document",
  groups: [{ name: "General", items: ["General Document"] }],
  quick: [],
};

const VISIBILITY = {
  "all-employees": { label: "All Employees", icon: Globe, cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  "admin-hr": { label: "Admin & HR only", icon: Lock, cls: "bg-slate-100 text-slate-700 border-slate-200" },
};

const TONES = {
  indigo: { box: "bg-indigo-600", hover: "hover:border-indigo-300", ring: "ring-indigo-200 border-indigo-300" },
  emerald: { box: "bg-emerald-600", hover: "hover:border-emerald-300", ring: "ring-emerald-200 border-emerald-300" },
  slate: { box: "bg-slate-700", hover: "hover:border-slate-400", ring: "ring-slate-200 border-slate-400" },
};

const MAX_FILE_MB = 10;
const ALLOWED_EXT = ["pdf", "doc", "docx", "jpg", "jpeg", "png"];
const PAGE_SIZE = 10;

/* ============================ HELPERS =========================== */

// Sirf-date fields (issueDate) ke liye: timezone shift se bachne ke liye string se parse
const keyToDate = (key) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const parseKey = (v) => (v ? String(v).slice(0, 10) : "");
const fmtDay = (v) => {
  const k = parseKey(v);
  if (!k) return "—";
  return keyToDate(k).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

// Timestamp fields (createdAt) ke liye: local timezone me
const fmtStamp = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

const uploaderName = (d) =>
  d.uploadedBy?.name || d.createdBy?.name || d.uploadedByName || d.createdByName || "";

const slug = (s) =>
  String(s || "document")
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 80) || "document";

const fmtSize = (bytes) => {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// File type: data URL mime ya URL/file name extension se
const getFileMeta = (url = "") => {
  let mime = "";
  let ext = "";
  if (url.startsWith("data:")) {
    mime = (/^data:([^;,]+)/.exec(url) || [])[1] || "";
  } else {
    ext = (url.split("?")[0].split(".").pop() || "").toLowerCase();
  }
  if (mime === "application/pdf" || ext === "pdf") return { kind: "pdf", ext: "pdf", label: "PDF" };
  if (mime.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) {
    const e = mime ? mime.split("/")[1].replace("jpeg", "jpg") : ext.replace("jpeg", "jpg");
    return { kind: "image", ext: e || "png", label: (e || "IMG").toUpperCase() };
  }
  if (mime === "application/msword" || ext === "doc") return { kind: "word", ext: "doc", label: "DOC" };
  if (mime.includes("wordprocessingml") || ext === "docx") return { kind: "word", ext: "docx", label: "DOCX" };
  return { kind: "other", ext: ext || "file", label: "FILE" };
};

const KIND_STYLE = {
  pdf: "bg-rose-600",
  image: "bg-emerald-600",
  word: "bg-sky-600",
  other: "bg-slate-600",
};

const base64ToBytes = (b64) => {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
};

const dataUrlToBlob = (dataUrl) => {
  const [head, b64] = dataUrl.split(",");
  const mime = (/^data:([^;,]+)/.exec(head) || [])[1] || "application/octet-stream";
  return new Blob([base64ToBytes(b64)], { type: mime });
};

const getBlob = async (fileUrl) => {
  if (fileUrl.startsWith("data:")) return dataUrlToBlob(fileUrl);
  const res = await fetch(fileUrl);
  if (!res.ok) throw new Error("Fetch failed");
  return res.blob();
};

const saveBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
};

// Image ko A4 page par center karke PDF banata hai (koi library nahi chahiye)
const imageBlobToA4Pdf = async (blob) => {
  const objUrl = URL.createObjectURL(blob);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new window.Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = objUrl;
    });
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0);
    const jpeg = base64ToBytes(canvas.toDataURL("image/jpeg", 0.92).split(",")[1]);

    // A4 = 595.28 x 841.89 pt, 28pt margin
    const PW = 595.28;
    const PH = 841.89;
    const M = 28;
    const scale = Math.min((PW - 2 * M) / w, (PH - 2 * M) / h);
    const dw = w * scale;
    const dh = h * scale;
    const x = (PW - dw) / 2;
    const y = (PH - dh) / 2;

    const enc = new TextEncoder();
    const chunks = [];
    const offsets = [];
    let pos = 0;
    const push = (b) => {
      const u = typeof b === "string" ? enc.encode(b) : b;
      chunks.push(u);
      pos += u.length;
    };
    const obj = (n, body) => {
      offsets[n] = pos;
      push(`${n} 0 obj\n`);
      push(body);
      push("\nendobj\n");
    };

    push("%PDF-1.4\n");
    obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
    obj(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
    obj(
      3,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>`
    );
    const content = `q ${dw.toFixed(2)} 0 0 ${dh.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm /Im0 Do Q`;
    obj(4, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`);

    offsets[5] = pos;
    push("5 0 obj\n");
    push(
      `<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`
    );
    push(jpeg);
    push("\nendstream\nendobj\n");

    const xrefPos = pos;
    let xref = "xref\n0 6\n0000000000 65535 f \n";
    for (let i = 1; i <= 5; i++) xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
    push(xref);
    push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`);

    return new Blob(chunks, { type: "application/pdf" });
  } finally {
    URL.revokeObjectURL(objUrl);
  }
};

/* ------------------------- slim stat card ------------------------- */

function StatCard({ icon: Icon, value, label, tone, active, onClick }) {
  const t = TONES[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group w-full text-left flex items-center gap-3 bg-white px-3.5 py-3 rounded-2xl border shadow-sm ${t.hover} hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 cursor-pointer focus:outline-hidden focus-visible:ring-4 focus-visible:ring-indigo-100 ${active ? `ring-4 ${t.ring}` : "border-slate-200/80"}`}
    >
      <div className={`w-10 h-10 shrink-0 rounded-xl ${t.box} text-white flex items-center justify-center shadow-sm`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xl font-extrabold leading-tight text-slate-900 font-mono">{value}</p>
        <p className="text-[11px] text-slate-500 font-medium truncate">{label}</p>
      </div>
    </button>
  );
}

/* --------------------- animated modal (reusable) --------------------- */

function Modal({
  open,
  onClose,
  title,
  subtitle,
  actions,
  children,
  maxWidth = "sm:max-w-lg",
  tall = false,
  bodyClass = "p-4 sm:p-5 overflow-y-auto",
}) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const id = requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
      return () => cancelAnimationFrame(id);
    }
    setVisible(false);
    const t = setTimeout(() => setMounted(false), 250);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!mounted) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [mounted, onClose]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}
      />
      <div
        className={`relative w-full ${maxWidth} bg-white shadow-2xl rounded-t-3xl sm:rounded-3xl ${tall ? "h-[94vh] sm:h-[92vh]" : "max-h-[92vh]"} flex flex-col overflow-hidden transition-all duration-300 ease-out ${visible
          ? "opacity-100 translate-y-0 sm:scale-100"
          : "opacity-0 translate-y-8 sm:translate-y-0 sm:scale-95"
          }`}
      >
        <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/70">
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate">{title}</h3>
            {subtitle && <p className="text-[11px] sm:text-xs text-slate-500 truncate">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {actions}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        <div className={`flex-1 min-h-0 ${bodyClass}`}>{children}</div>
      </div>
    </div>
  );
}

/* ------------- three-dot row menu (portal, smooth, auto-flip) ------------- */

function RowMenu({ items, label = "Actions" }) {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, up: false });
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  const list = items.filter((i) => !i.hidden);

  const close = useCallback(() => {
    setVisible(false);
    setTimeout(() => setOpen(false), 150);
  }, []);

  const toggle = (e) => {
    e.stopPropagation();
    if (open) return close();
    const r = btnRef.current.getBoundingClientRect();
    const w = 208;
    const h = list.length * 42 + 14;
    const up = r.bottom + h + 8 > window.innerHeight && r.top > h + 8;
    setPos({
      top: up ? r.top - h - 6 : r.bottom + 6,
      left: Math.max(8, Math.min(r.right - w, window.innerWidth - w - 8)),
      up,
    });
    setOpen(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (menuRef.current?.contains(e.target) || btnRef.current?.contains(e.target)) return;
      close();
    };
    const onKey = (e) => e.key === "Escape" && close();
    const onMove = () => close();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [open, close]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        title={label}
        className={`p-2 rounded-xl border transition-all duration-200 cursor-pointer active:scale-95 focus:outline-hidden focus-visible:ring-4 focus-visible:ring-indigo-100 ${open
          ? "bg-indigo-50 text-indigo-600 border-indigo-200"
          : "text-slate-500 border-transparent hover:bg-slate-100 hover:text-slate-800"
          }`}
      >
        <MoreVertical size={18} />
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ position: "fixed", top: pos.top, left: pos.left, width: 208 }}
            className={`z-[60] bg-white rounded-2xl border border-slate-200 shadow-xl p-1.5 transition-all duration-150 ease-out ${pos.up ? "origin-bottom-right" : "origin-top-right"} ${visible ? "opacity-100 scale-100 translate-y-0" : `opacity-0 scale-95 ${pos.up ? "translate-y-1" : "-translate-y-1"}`}`}
          >
            {list.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={item.label}>
                  {item.danger && idx > 0 && <div className="my-1 border-t border-slate-100" />}
                  <button
                    type="button"
                    role="menuitem"
                    disabled={item.disabled}
                    onClick={(e) => {
                      e.stopPropagation();
                      close();
                      item.onClick();
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50 ${item.danger
                      ? "text-rose-600 hover:bg-rose-50"
                      : "text-slate-700 hover:bg-slate-100"
                      }`}
                  >
                    <Icon size={16} className={item.danger ? "text-rose-500" : "text-slate-400"} />
                    <span className="truncate">{item.label}</span>
                  </button>
                </div>
              );
            })}
          </div>,
          document.body
        )}
    </>
  );
}

/* ------------------------------- page -------------------------------- */

export default function DocumentCategoryPage({
  category = "company-documents",
  title = "Company Documents",
  description = "Official company registrations, licences, contracts aur certificates ek jagah.",
}) {
  const { user } = useAuth();
  const cfg = CATEGORY_CONFIG[category] || FALLBACK_CONFIG;
  const isAdmin = ["admin", "hr"].includes((user?.role || "").toLowerCase());

  const emptyForm = useMemo(
    () => ({
      title: "",
      docSubtype: cfg.defaultSubtype,
      issueDate: "",
      description: "",
      visibility: "all-employees",
      fileUrl: "",
      fileName: "",
      fileSize: 0,
      fileIsNew: false,
      hasExistingFile: false,
    }),
    [cfg]
  );

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Filters + pagination
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");
  const [visFilter, setVisFilter] = useState("all");
  const [page, setPage] = useState(1);

  // Upload / edit
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDocId, setEditingDocId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({ title: "", file: "" });
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Delete confirm (deleteTarget close ke baad bhi rakha hai taaki animation me content na ude)
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Viewer (selectedDoc close ke baad bhi rakha hai taaki close animation me content na ude)
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [viewSrc, setViewSrc] = useState("");
  const [viewLoading, setViewLoading] = useState(false);
  const [viewMode, setViewMode] = useState("fit"); // fit | width
  const [downloadingId, setDownloadingId] = useState(null);

  const closeModal = useCallback(() => {
    if (submitting) return;
    setModalOpen(false);
  }, [submitting]);
  const closeView = useCallback(() => setViewOpen(false), []);
  const closeDelete = useCallback(() => {
    if (deleting) return;
    setDeleteOpen(false);
  }, [deleting]);

  /* ----------------------------- data ----------------------------- */

  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const { data } = await api.get("/documents", { params: { category } });
      const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
      setDocuments(list);
    } catch (err) {
      setLoadError(err.response?.data?.message || "Failed to load documents from server.");
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // List response me fileUrl na ho to poora document alag se laate hain
  const loadFull = useCallback(async (doc) => {
    if (doc.fileUrl) return doc;
    try {
      const { data } = await api.get(`/documents/${doc._id}`);
      const full = data?.data || data;
      return full?.fileUrl ? { ...doc, ...full } : doc;
    } catch {
      return doc;
    }
  }, []);

  // subtype -> group
  const subtypeToGroup = useMemo(() => {
    const map = {};
    cfg.groups.forEach((g) => g.items.forEach((i) => (map[i] = g.name)));
    return map;
  }, [cfg]);

  const fallbackGroup = cfg.groups.find((g) => g.name === "Other") ? "Other" : cfg.groups[cfg.groups.length - 1].name;
  const groupOf = useCallback((doc) => subtypeToGroup[doc.docSubtype] || fallbackGroup, [subtypeToGroup, fallbackGroup]);

  // Non-admin ko admin-hr wale docs na dikhein (backend par bhi enforce karein)
  const accessibleDocs = useMemo(
    () => (isAdmin ? documents : documents.filter((d) => d.visibility !== "admin-hr")),
    [documents, isAdmin]
  );

  const stats = useMemo(() => {
    const adminOnly = accessibleDocs.filter((d) => d.visibility === "admin-hr").length;
    return {
      total: accessibleDocs.length,
      adminOnly,
      everyone: accessibleDocs.length - adminOnly,
    };
  }, [accessibleDocs]);

  const groupCounts = useMemo(() => {
    const counts = {};
    accessibleDocs.forEach((d) => {
      const g = groupOf(d);
      counts[g] = (counts[g] || 0) + 1;
    });
    return counts;
  }, [accessibleDocs, groupOf]);

  const filteredDocs = useMemo(() => {
    const q = search.toLowerCase().trim();
    return accessibleDocs
      .filter((d) => {
        if (groupFilter !== "all" && groupOf(d) !== groupFilter) return false;
        if (visFilter === "admin-hr" && d.visibility !== "admin-hr") return false;
        if (visFilter === "all-employees" && d.visibility === "admin-hr") return false;
        if (!q) return true;
        return (
          String(d.title || "").toLowerCase().includes(q) ||
          String(d.docSubtype || "").toLowerCase().includes(q) ||
          String(d.description || "").toLowerCase().includes(q) ||
          uploaderName(d).toLowerCase().includes(q)
        );
      })
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [accessibleDocs, search, groupFilter, visFilter, groupOf]);

  const totalPages = Math.max(1, Math.ceil(filteredDocs.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedDocs = filteredDocs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search, groupFilter, visFilter]);

  /* ---------------------------- viewer ---------------------------- */

  // PDF/image preview ke liye data URL ko blob URL banate hain (browser data: iframe block kar sakta hai)
  useEffect(() => {
    if (!viewOpen || !selectedDoc?.fileUrl) return;
    let url = "";
    try {
      url = selectedDoc.fileUrl.startsWith("data:")
        ? URL.createObjectURL(dataUrlToBlob(selectedDoc.fileUrl))
        : selectedDoc.fileUrl;
      setViewSrc(url);
    } catch {
      setViewSrc("");
    }
    return () => {
      if (url.startsWith("blob:")) setTimeout(() => URL.revokeObjectURL(url), 500);
    };
  }, [viewOpen, selectedDoc]);

  const openView = async (doc) => {
    setSelectedDoc(doc);
    setViewSrc("");
    setViewMode(typeof window !== "undefined" && window.innerWidth < 640 ? "width" : "fit");
    setViewOpen(true);

    if (!doc.fileUrl) {
      setViewLoading(true);
      const full = await loadFull(doc);
      setSelectedDoc((prev) => (prev && prev._id === full._id ? full : prev));
      setViewLoading(false);
    }
  };

  /* --------------------------- download --------------------------- */

  // mode: "primary" (PDF -> original, image -> A4 PDF, baaki original) | "original"
  const handleDownload = async (docInput, mode = "primary") => {
    setDownloadingId(docInput._id);
    try {
      const doc = await loadFull(docInput);
      if (!doc?.fileUrl) {
        toast.error("No file attached to this document.");
        return;
      }
      const meta = getFileMeta(doc.fileUrl);
      const blob = await getBlob(doc.fileUrl);
      const base = slug(doc.title);

      if (meta.kind === "image" && mode === "primary") {
        saveBlob(await imageBlobToA4Pdf(blob), `${base}.pdf`);
      } else {
        saveBlob(blob, `${base}.${meta.ext}`);
      }
      toast.success("Download started.");
    } catch (err) {
      console.error("Download error:", err);
      toast.error("Download failed. Please try again.");
    } finally {
      setDownloadingId(null);
    }
  };

  const openInTab = (doc) => {
    const meta = getFileMeta(doc.fileUrl || "");
    if (meta.kind === "word" || !viewSrc) return handleDownload(doc, "original");
    window.open(viewSrc, "_blank", "noopener,noreferrer");
  };

  /* ----------------------------- form ----------------------------- */

  const openCreate = (subtype) => {
    setEditingDocId(null);
    setErrors({ title: "", file: "" });
    setForm({
      ...emptyForm,
      docSubtype: subtype || emptyForm.docSubtype,
      title: subtype || "",
    });
    setModalOpen(true);
  };

  const openEdit = (doc) => {
    setEditingDocId(doc._id);
    setErrors({ title: "", file: "" });
    setForm({
      title: doc.title || "",
      docSubtype: doc.docSubtype || cfg.defaultSubtype,
      issueDate: parseKey(doc.issueDate),
      description: doc.description || "",
      visibility: doc.visibility || "all-employees",
      fileUrl: "",
      fileName: "",
      fileSize: 0,
      fileIsNew: false,
      hasExistingFile: true,
    });
    setModalOpen(true);
  };

  const processFile = (file) => {
    if (!file) return;
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
      setErrors((p) => ({ ...p, file: "Sirf PDF, DOC, DOCX, JPG ya PNG file allowed hai." }));
      return;
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setErrors((p) => ({ ...p, file: `File size ${MAX_FILE_MB}MB se kam honi chahiye.` }));
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setForm((prev) => ({
        ...prev,
        fileUrl: reader.result,
        fileName: file.name,
        fileSize: file.size,
        fileIsNew: true,
        // Title khaali ho to file ke naam se bhar do
        title: prev.title.trim()
          ? prev.title
          : file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim(),
      }));
      setErrors((p) => ({ ...p, file: "", title: "" }));
    };
    reader.onerror = () => setErrors((p) => ({ ...p, file: "File read nahi ho payi. Dobara try karein." }));
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e) => {
    processFile(e.target.files?.[0]);
    e.target.value = "";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    processFile(e.dataTransfer.files?.[0]);
  };

  const removeNewFile = () => {
    setForm((p) => ({ ...p, fileUrl: "", fileName: "", fileSize: 0, fileIsNew: false }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const docTitle = form.title.trim();
    const nextErrors = { title: "", file: "" };
    if (!docTitle) nextErrors.title = "Document title zaroori hai.";
    if (!editingDocId && !form.fileUrl) nextErrors.file = "Please document file attach karein.";
    if (nextErrors.title || nextErrors.file) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: docTitle,
        category,
        description: form.description.trim(),
        docSubtype: form.docSubtype,
        issueDate: form.issueDate || null,
        visibility: form.visibility,
      };
      // Edit me file tabhi bhejte hain jab nayi chuni ho
      if (form.fileUrl) payload.fileUrl = form.fileUrl;

      if (editingDocId) {
        await api.put(`/documents/${editingDocId}`, payload);
        toast.success("Document updated successfully.");
      } else {
        await api.post("/documents", payload);
        toast.success("Document published successfully.");
      }

      setModalOpen(false);
      setEditingDocId(null);
      setForm(emptyForm);
      setPage(1);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Operation failed.");
    } finally {
      setSubmitting(false);
    }
  };

  /* ----------------------------- delete ----------------------------- */

  const askDelete = (doc) => {
    setDeleteTarget(doc);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/documents/${deleteTarget._id}`);
      toast.success("Document deleted successfully.");
      setDocuments((prev) => prev.filter((x) => x._id !== deleteTarget._id));
      if (selectedDoc?._id === deleteTarget._id) setViewOpen(false);
      setDeleteOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete document.");
    } finally {
      setDeleting(false);
    }
  };

  // Select options: current subtype list me na ho to add kar do
  const knownSubtypes = useMemo(() => cfg.groups.flatMap((g) => g.items), [cfg]);

  const inputCls =
    "mt-1.5 w-full px-3.5 py-2.5 border rounded-xl text-sm bg-slate-50/50 text-slate-800 font-medium outline-hidden transition-all duration-200 hover:border-slate-300 focus:bg-white focus:ring-4";
  const okCls = "border-slate-200 focus:border-indigo-500 focus:ring-indigo-100";
  const errCls = "border-rose-300 focus:border-rose-500 focus:ring-rose-100";
  const labelCls = "text-[11px] font-bold uppercase tracking-wider text-slate-500";

  const selMeta = selectedDoc ? getFileMeta(selectedDoc.fileUrl || "") : null;
  const selVis = selectedDoc ? VISIBILITY[selectedDoc.visibility] || VISIBILITY["all-employees"] : null;

  // Row menu items (table aur mobile card dono me same)
  const menuItems = (d) => {
    const meta = getFileMeta(d.fileUrl || d.fileName || "");
    return [
      { label: "View Document", icon: Eye, onClick: () => openView(d) },
      {
        label: meta.kind === "image" ? "Download as PDF" : "Download",
        icon: Download,
        onClick: () => handleDownload(d),
        disabled: downloadingId === d._id,
      },
      { label: "Edit Details", icon: Pencil, onClick: () => openEdit(d), hidden: !isAdmin },
      { label: "Delete", icon: Trash2, onClick: () => askDelete(d), hidden: !isAdmin, danger: true },
    ];
  };

  /* ----------------------------- render ----------------------------- */

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4 space-y-3 sm:space-y-4 antialiased">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 bg-white px-4 py-3 sm:px-5 sm:py-4 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-base sm:text-xl font-bold text-slate-900 tracking-tight">{title}</h1>
            {!loading && !loadError && (
              <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                {stats.total} Docs
              </span>
            )}
          </div>
          <p className="hidden sm:block text-xs text-slate-500 mt-0.5 font-medium max-w-2xl">{description}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={fetchData}
            disabled={loading}
            title="Refresh"
            className="p-2.5 bg-white hover:bg-slate-50 text-slate-600 rounded-xl border border-slate-200 transition-all disabled:opacity-50 cursor-pointer active:scale-95"
          >
            <RefreshCw size={16} className={loading ? "animate-spin text-indigo-600" : ""} />
          </button>
          {isAdmin && (
            <button
              onClick={() => openCreate()}
              className="group inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 sm:px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm shadow-sm hover:shadow-lg transition-all duration-300 active:scale-95 cursor-pointer"
            >
              <Plus size={16} className="transition-transform duration-300 group-hover:rotate-90" />
              <span>Upload</span>
              <span className="hidden sm:inline -ml-1">Document</span>
            </button>
          )}
        </div>
      </div>

      {loadError && (
        <div className="flex items-center justify-between gap-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm font-medium rounded-2xl px-4 py-2.5">
          <span className="flex items-center gap-2 min-w-0">
            <AlertTriangle size={16} className="shrink-0" />
            <span className="truncate">{loadError}</span>
          </span>
          <button
            onClick={fetchData}
            className="shrink-0 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Slim stat cards (admin ke liye, click karke filter) */}
      {isAdmin && !loading && accessibleDocs.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
          <StatCard
            icon={Files}
            tone="indigo"
            value={stats.total}
            label="Total Documents"
            active={visFilter === "all"}
            onClick={() => setVisFilter("all")}
          />
          <StatCard
            icon={Globe}
            tone="emerald"
            value={stats.everyone}
            label="Visible to All Employees"
            active={visFilter === "all-employees"}
            onClick={() => setVisFilter((f) => (f === "all-employees" ? "all" : "all-employees"))}
          />
          <StatCard
            icon={Lock}
            tone="slate"
            value={stats.adminOnly}
            label="Admin & HR only"
            active={visFilter === "admin-hr"}
            onClick={() => setVisFilter((f) => (f === "admin-hr" ? "all" : "admin-hr"))}
          />
        </div>
      )}

      {/* Quick add (admin) */}
      {isAdmin && cfg.quick.length > 0 && (
        <div className="bg-white px-3.5 py-3 rounded-2xl border border-slate-200/80 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Quick add</p>
          <div className="flex gap-2 overflow-x-auto pb-1 -mb-1">
            {cfg.quick.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => openCreate(q)}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 active:scale-95 transition-all duration-200 cursor-pointer whitespace-nowrap"
              >
                <Plus size={12} /> {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search + group filter */}
      {!loading && accessibleDocs.length > 0 && (
        <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200/80 shadow-sm space-y-2.5">
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, type, uploaded by..."
              className="w-full pl-9 pr-9 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-medium"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1 -mb-1">
            {[
              { name: "all", label: "All", count: accessibleDocs.length },
              ...cfg.groups
                .filter((g) => (groupCounts[g.name] || 0) > 0)
                .map((g) => ({ name: g.name, label: g.name, count: groupCounts[g.name] })),
            ].map((g) => (
              <button
                key={g.name}
                type="button"
                onClick={() => setGroupFilter(g.name)}
                className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${groupFilter === g.name
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/70"
                  }`}
              >
                {g.label}
                <span className={`font-mono text-[10px] ${groupFilter === g.name ? "text-indigo-100" : "text-slate-400"}`}>
                  {g.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Documents */}
      {loading ? (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm divide-y divide-slate-100 overflow-hidden">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="px-5 py-4 animate-pulse flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 bg-slate-100 rounded-md" />
                <div className="h-3 w-1/2 bg-slate-100 rounded-md" />
              </div>
              <div className="h-8 w-8 rounded-lg bg-slate-100" />
            </div>
          ))}
        </div>
      ) : accessibleDocs.length === 0 ? (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-dashed border-slate-300 p-8 sm:p-12 text-center shadow-sm">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-indigo-100">
            <FolderOpen size={26} />
          </div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900">No documents published</h3>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-sm mx-auto">
            {isAdmin
              ? "Registration certificates, licences, contracts ya policies upload karke shuru karein."
              : "Abhi tak koi document publish nahi hua hai."}
          </p>
          {isAdmin && (
            <button
              onClick={() => openCreate()}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-600 hover:text-white transition-all duration-300 active:scale-95 cursor-pointer"
            >
              <Plus size={16} /> Upload Document
            </button>
          )}
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center shadow-sm">
          <Search className="w-9 h-9 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700">No documents match your filters</p>
          <button
            onClick={() => {
              setSearch("");
              setGroupFilter("all");
              setVisFilter("all");
            }}
            className="mt-2 text-xs font-semibold text-indigo-600 hover:underline cursor-pointer"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          {/* Desktop / tablet: table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                <tr>
                  <th className="px-5 py-3">Document</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Uploaded</th>
                  <th className="px-4 py-3">Visible to</th>
                  <th className="px-4 py-3 w-16 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagedDocs.map((d) => {
                  const meta = getFileMeta(d.fileUrl || d.fileName || "");
                  const vis = VISIBILITY[d.visibility] || VISIBILITY["all-employees"];
                  const VisIcon = vis.icon;
                  const KindIcon = meta.kind === "image" ? ImageIcon : FileText;
                  const who = uploaderName(d);
                  const busy = downloadingId === d._id;

                  return (
                    <tr key={d._id} className="group hover:bg-slate-50/80 transition-colors duration-200">
                      <td className="px-5 py-3 max-w-[320px]">
                        <button
                          type="button"
                          onClick={() => openView(d)}
                          className="flex items-center gap-3 min-w-0 text-left cursor-pointer focus:outline-hidden"
                        >
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white shadow-sm transition-transform duration-300 group-hover:scale-105 ${KIND_STYLE[meta.kind]}`}
                          >
                            {busy ? <Loader2 size={18} className="animate-spin" /> : <KindIcon size={18} />}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                              {d.title}
                            </p>
                            <p className="text-xs text-slate-400 truncate">
                              {d.description || (meta.kind !== "other" ? meta.label : "Document")}
                            </p>
                          </div>
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block text-[11px] font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 whitespace-nowrap">
                          {d.docSubtype || "Document"}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="text-slate-700 font-semibold text-[13px]">{fmtStamp(d.createdAt || d.issueDate)}</p>
                        {who && <p className="text-[11px] text-slate-400 truncate max-w-[140px]">by {who}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-bold whitespace-nowrap ${vis.cls}`}
                        >
                          <VisIcon size={11} /> {vis.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <RowMenu items={menuItems(d)} label={`Actions for ${d.title}`} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile: cards */}
          <div className="md:hidden divide-y divide-slate-100">
            {pagedDocs.map((d) => {
              const meta = getFileMeta(d.fileUrl || d.fileName || "");
              const vis = VISIBILITY[d.visibility] || VISIBILITY["all-employees"];
              const VisIcon = vis.icon;
              const KindIcon = meta.kind === "image" ? ImageIcon : FileText;
              const who = uploaderName(d);

              return (
                <div key={d._id} className="px-3.5 py-3 flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => openView(d)}
                    className="flex items-start gap-3 min-w-0 flex-1 text-left cursor-pointer focus:outline-hidden"
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white shadow-sm ${KIND_STYLE[meta.kind]}`}
                    >
                      <KindIcon size={18} />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <p className="text-sm font-bold text-slate-900 truncate">{d.title}</p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {d.docSubtype || "Document"}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${vis.cls}`}
                        >
                          <VisIcon size={10} /> {vis.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-medium truncate">
                        {fmtStamp(d.createdAt || d.issueDate)}
                        {who ? ` • by ${who}` : ""}
                      </p>
                    </div>
                  </button>
                  <RowMenu items={menuItems(d)} label={`Actions for ${d.title}`} />
                </div>
              );
            })}
          </div>

          {/* Footer: count + pagination */}
          <div className="px-4 sm:px-5 py-3 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3">
            <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
              Showing{" "}
              <span className="font-bold text-slate-700 font-mono">
                {(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, filteredDocs.length)}
              </span>{" "}
              of <span className="font-bold text-slate-700 font-mono">{filteredDocs.length}</span>
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-default transition cursor-pointer active:scale-95"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs font-bold text-slate-700 font-mono px-1">
                  {currentPage}/{totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-default transition cursor-pointer active:scale-95"
                  aria-label="Next page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------- Upload / Edit modal ------------------- */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingDocId ? "Edit Document" : "Upload Document"}
        subtitle={title}
        maxWidth="sm:max-w-xl"
      >
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* File upload (drag & drop) */}
          <div>
            <label className={labelCls}>
              Document File {!editingDocId && <span className="text-rose-500">*</span>}
            </label>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`mt-1.5 relative border-2 border-dashed rounded-2xl p-4 text-center transition-all duration-200 ${dragOver
                ? "border-indigo-500 bg-indigo-50 scale-[1.01]"
                : errors.file
                  ? "border-rose-300 bg-rose-50/40"
                  : form.fileIsNew
                    ? "border-emerald-300 bg-emerald-50/40"
                    : "border-slate-200 hover:border-indigo-400 bg-slate-50/50"
                }`}
            >
              {!form.fileIsNew && (
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  aria-label="Choose file"
                />
              )}

              {form.fileIsNew ? (
                <div className="flex items-center gap-3 text-left">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white ${KIND_STYLE[getFileMeta(form.fileUrl).kind]}`}
                  >
                    <CheckCircle2 size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-bold text-slate-800 truncate">{form.fileName}</p>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {fmtSize(form.fileSize)} • Ready to upload
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={removeNewFile}
                    className="shrink-0 p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                    aria-label="Remove file"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-1 pointer-events-none py-1">
                  <Upload className={`h-6 w-6 ${dragOver ? "text-indigo-700" : "text-indigo-600"}`} />
                  <p className="text-xs sm:text-sm font-bold text-slate-700">
                    {dragOver ? "Drop file here" : editingDocId && form.hasExistingFile ? "Replace current file (optional)" : "Click to browse or drag & drop"}
                  </p>
                  <p className="text-[11px] text-slate-400 font-medium">
                    PDF, DOC, DOCX, JPG, PNG • max {MAX_FILE_MB}MB
                  </p>
                </div>
              )}
            </div>

            {editingDocId && form.hasExistingFile && !form.fileIsNew && (
              <p className="mt-1.5 text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 size={12} /> Current file attached. Nayi file chunne par wo replace ho jayegi.
              </p>
            )}
            {errors.file && <p className="mt-1.5 text-[11px] text-rose-600 font-semibold">{errors.file}</p>}
          </div>

          <div>
            <label htmlFor="docTitle" className={labelCls}>
              Document Title <span className="text-rose-500">*</span>
            </label>
            <input
              id="docTitle"
              value={form.title}
              onChange={(e) => {
                setForm({ ...form, title: e.target.value });
                if (errors.title) setErrors((p) => ({ ...p, title: "" }));
              }}
              className={`${inputCls} ${errors.title ? errCls : okCls}`}
              placeholder="e.g. GST Registration Certificate"
              maxLength={120}
              autoFocus={!!editingDocId}
            />
            {errors.title && <p className="mt-1.5 text-[11px] text-rose-600 font-semibold">{errors.title}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="docType" className={labelCls}>Document Type</label>
              <select
                id="docType"
                value={form.docSubtype}
                onChange={(e) => setForm({ ...form, docSubtype: e.target.value })}
                className={`${inputCls} ${okCls} cursor-pointer`}
              >
                {cfg.groups.map((g) => (
                  <optgroup key={g.name} label={g.name}>
                    {g.items.map((i) => (
                      <option key={i} value={i}>{i}</option>
                    ))}
                  </optgroup>
                ))}
                {form.docSubtype && !knownSubtypes.includes(form.docSubtype) && (
                  <option value={form.docSubtype}>{form.docSubtype}</option>
                )}
              </select>
            </div>

            <div>
              <label htmlFor="issueDate" className={labelCls}>Issue Date (optional)</label>
              <input
                id="issueDate"
                type="date"
                value={form.issueDate}
                onChange={(e) => setForm({ ...form, issueDate: e.target.value })}
                className={`${inputCls} ${okCls} cursor-pointer`}
              />
            </div>
          </div>

          <div>
            <label htmlFor="docNote" className={labelCls}>Note (optional)</label>
            <input
              id="docNote"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className={`${inputCls} ${okCls}`}
              placeholder="e.g. Latest signed copy"
              maxLength={200}
            />
          </div>

          {/* Visibility */}
          <div>
            <label className={labelCls}>Who can view</label>
            <div className="mt-1.5 grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 gap-2">
              {Object.entries(VISIBILITY).map(([key, v]) => {
                const Icon = v.icon;
                const active = form.visibility === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setForm({ ...form, visibility: key })}
                    aria-pressed={active}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${active
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700 ring-4 ring-indigo-100"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      }`}
                  >
                    <Icon size={14} /> <span className="truncate">{v.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={closeModal}
              disabled={submitting}
              className="px-5 py-2.5 text-sm font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 rounded-xl transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 active:scale-95 disabled:opacity-60 cursor-pointer"
            >
              {submitting && <Loader2 size={15} className="animate-spin" />}
              {submitting ? "Saving..." : editingDocId ? "Update Document" : "Publish Document"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ----------------------- Delete confirm ----------------------- */}
      <Modal open={deleteOpen} onClose={closeDelete} title="Delete document?" maxWidth="sm:max-w-sm">
        {deleteTarget && (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 break-words">{deleteTarget.title}</p>
                <p className="text-xs text-slate-500 mt-1">
                  Ye document hamesha ke liye delete ho jayega. Ye action undo nahi hoga.
                </p>
              </div>
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
              <button
                type="button"
                onClick={closeDelete}
                disabled={deleting}
                className="px-5 py-2.5 text-sm font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-sm transition active:scale-95 disabled:opacity-60 cursor-pointer"
              >
                {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ----------------------- A4 viewer modal ----------------------- */}
      <Modal
        open={viewOpen}
        onClose={closeView}
        title={selectedDoc?.title || "Document Viewer"}
        subtitle={selectedDoc ? selectedDoc.docSubtype || "Document" : ""}
        maxWidth="sm:max-w-5xl"
        tall
        bodyClass="flex flex-col overflow-hidden"
        actions={
          selectedDoc && (
            <>
              <button
                type="button"
                onClick={() => handleDownload(selectedDoc)}
                disabled={downloadingId === selectedDoc._id}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all active:scale-95 cursor-pointer disabled:opacity-60"
                title={selMeta?.kind === "image" ? "Download as A4 PDF" : "Download"}
              >
                {downloadingId === selectedDoc._id ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                <span className="hidden sm:inline">{selMeta?.kind === "image" ? "Download PDF" : "Download"}</span>
              </button>
              <button
                type="button"
                onClick={() => openInTab(selectedDoc)}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-600 hover:text-white rounded-xl transition-all active:scale-95 border border-indigo-100 cursor-pointer"
              >
                <ExternalLink size={14} /> Open in tab
              </button>
            </>
          )
        }
      >
        {selectedDoc && (
          <>
            {/* Meta strip */}
            <div className="px-4 sm:px-5 py-2 border-b border-slate-100 bg-white flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] font-medium text-slate-500">
                <span>Uploaded {fmtStamp(selectedDoc.createdAt || selectedDoc.issueDate)}</span>
                {uploaderName(selectedDoc) && <span>by {uploaderName(selectedDoc)}</span>}
                {selectedDoc.issueDate && <span>• Issued {fmtDay(selectedDoc.issueDate)}</span>}
                {selVis && (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${selVis.cls}`}>
                    <selVis.icon size={10} /> {selVis.label}
                  </span>
                )}
              </div>

              {(selMeta?.kind === "pdf" || selMeta?.kind === "image") && (
                <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setViewMode("fit")}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer ${viewMode === "fit" ? "bg-indigo-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
                  >
                    <Minimize2 size={12} /> Fit page
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("width")}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer ${viewMode === "width" ? "bg-indigo-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
                  >
                    <Maximize2 size={12} /> Full width
                  </button>
                </div>
              )}
            </div>

            {/* A4 stage */}
            <div className="flex-1 min-h-0 overflow-auto bg-slate-200/80 p-3 sm:p-5">
              {viewLoading ? (
                <div className="h-full min-h-[240px] flex flex-col items-center justify-center gap-2 text-slate-500">
                  <Loader2 className="animate-spin text-indigo-600" size={30} />
                  <p className="text-xs font-semibold">Loading document...</p>
                </div>
              ) : selMeta?.kind === "pdf" && viewSrc ? (
                <div
                  className="mx-auto bg-white shadow-xl rounded-sm overflow-hidden"
                  style={{
                    aspectRatio: "210 / 297",
                    width: viewMode === "fit" ? "min(100%, calc((92vh - 210px) * 0.7071))" : "100%",
                    maxWidth: viewMode === "width" ? "900px" : undefined,
                  }}
                >
                  <iframe
                    src={`${viewSrc}#view=FitH&navpanes=0`}
                    title={selectedDoc.title}
                    className="w-full h-full border-0 bg-white"
                  />
                </div>
              ) : selMeta?.kind === "image" && viewSrc ? (
                <div
                  className="mx-auto bg-white shadow-xl rounded-sm overflow-hidden flex items-center justify-center p-4 sm:p-6"
                  style={{
                    aspectRatio: "210 / 297",
                    width: viewMode === "fit" ? "min(100%, calc((92vh - 210px) * 0.7071))" : "100%",
                    maxWidth: viewMode === "width" ? "900px" : undefined,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={viewSrc} alt={selectedDoc.title} className="max-w-full max-h-full object-contain" />
                </div>
              ) : (
                <div className="h-full min-h-[240px] flex items-center justify-center">
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center max-w-sm">
                    <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <FileText size={26} />
                    </div>
                    <p className="text-sm font-bold text-slate-800">
                      {selectedDoc.fileUrl ? "Preview is not available for this file type" : "No file attached"}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {selectedDoc.fileUrl
                        ? "Word files browser me preview nahi hote. Download karke open karein."
                        : "Is document ke saath koi file upload nahi hui hai."}
                    </p>
                    {selectedDoc.fileUrl && (
                      <button
                        type="button"
                        onClick={() => handleDownload(selectedDoc, "original")}
                        className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition-all cursor-pointer"
                      >
                        <Download size={15} /> Download File
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Mobile action bar */}
            <div className="sm:hidden px-4 py-3 border-t border-slate-100 bg-slate-50/70 flex gap-2">
              <button
                type="button"
                onClick={() => openInTab(selectedDoc)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-xl active:scale-95 transition cursor-pointer"
              >
                <ExternalLink size={14} /> Open in tab
              </button>
              {selMeta?.kind === "image" && (
                <button
                  type="button"
                  onClick={() => handleDownload(selectedDoc, "original")}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl active:scale-95 transition cursor-pointer"
                >
                  <ImageIcon size={14} /> Image
                </button>
              )}
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}