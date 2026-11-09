
"use client";

import DocumentWorkspace from "@/components/documents/DocumentWorkspace";

export default function Page() {
  return <DocumentWorkspace page="company" />;
}

// "use client";

// import { useCallback, useEffect, useMemo, useRef, useState } from "react";
// import {
//   AlertCircle,
//   Download,
//   Eye,
//   FileText,
//   FileUp,
//   Loader2,
//   Pencil,
//   Plus,
//   RefreshCw,
//   Search,
//   ShieldCheck,
//   Trash2,
//   Upload,
//   X,
// } from "lucide-react";
// import api from "@/lib/api";
// import { toast } from "react-toastify";
// import { useAuth } from "@/context/AuthContext";

// const MAX_FILE_SIZE = 5 * 1024 * 1024;
// const PAGE_SIZE = 10;

// const DOCUMENT_TYPES = [
//   {
//     group: "Registration & Tax",
//     items: [
//       "Certificate of Incorporation",
//       "Company PAN Card",
//       "TAN Certificate",
//       "GST Certificate",
//       "MSME / Udyam Certificate",
//       "Shop & Establishment Licence",
//       "MoA / AoA",
//     ],
//   },
//   {
//     group: "Statutory Compliance",
//     items: [
//       "PF Registration",
//       "ESI Registration",
//       "Professional Tax Registration",
//       "Labour Licence",
//       "Compliance Certificate",
//     ],
//   },
//   {
//     group: "Contracts & Property",
//     items: [
//       "Office Lease Agreement",
//       "Vendor Contract",
//       "Client Contract",
//       "NDA",
//       "Insurance Policy",
//     ],
//   },
//   {
//     group: "Certifications & Other",
//     items: [
//       "ISO Certificate",
//       "Company Logo",
//       "Company Letterhead",
//       "Organisation Chart",
//       "Other Document",
//     ],
//   },
// ];

// const ALL_TYPES = DOCUMENT_TYPES.flatMap((group) => group.items);

// const emptyForm = {
//   title: "",
//   docSubtype: "Certificate of Incorporation",
//   description: "",
//   fileUrl: "",
// };

// const extensionOf = (name = "") =>
//   name.split("?")[0].split(".").pop()?.toLowerCase() || "";

// const formatSize = (size = 0) => {
//   if (!size) return "";
//   return size < 1024 * 1024
//     ? `${Math.max(1, Math.round(size / 1024))} KB`
//     : `${(size / (1024 * 1024)).toFixed(2)} MB`;
// };

// const formatDate = (date) => {
//   if (!date) return "—";
//   const value = new Date(date);
//   return Number.isNaN(value.getTime())
//     ? "—"
//     : value.toLocaleDateString("en-IN", {
//       day: "2-digit",
//       month: "short",
//       year: "numeric",
//     });
// };

// const getErrorMessage = (error) =>
//   error?.response?.data?.message ||
//   error?.message ||
//   "Something went wrong. Please try again.";

// function Field({ label, children, required = false }) {
//   return (
//     <label className="block min-w-0">
//       <span className="text-xs font-bold text-slate-600">
//         {label} {required && <span className="text-rose-500">*</span>}
//       </span>
//       {children}
//     </label>
//   );
// }

// function DocumentIcon({ name = "" }) {
//   const ext = extensionOf(name);
//   const color =
//     ext === "pdf"
//       ? "bg-rose-100 text-rose-700"
//       : ["jpg", "jpeg", "png"].includes(ext)
//         ? "bg-emerald-100 text-emerald-700"
//         : ["doc", "docx"].includes(ext)
//           ? "bg-sky-100 text-sky-700"
//           : "bg-indigo-100 text-indigo-700";

//   return (
//     <div
//       className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${color}`}
//     >
//       <FileText size={21} />
//     </div>
//   );
// }

// export default function DocumentCategoryPage({
//   category = "company-documents",
//   title = "Company Documents",
//   description = "Manage company registrations, licences, contracts and certificates.",
// }) {
//   const { user } = useAuth();
//   const isAdmin = ["admin", "hr"].includes(
//     String(user?.role || "").toLowerCase()
//   );

//   // The backend normalizes company-documents to "company".
//   const apiCategory =
//     category === "company-documents" || category === "company"
//       ? "company"
//       : category === "hr-policies" || category === "policy"
//         ? "policy"
//         : category;

//   const [documents, setDocuments] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [loadError, setLoadError] = useState("");
//   const [search, setSearch] = useState("");
//   const [typeFilter, setTypeFilter] = useState("all");
//   const [page, setPage] = useState(1);

//   const [modalOpen, setModalOpen] = useState(false);
//   const [editingId, setEditingId] = useState(null);
//   const [form, setForm] = useState(emptyForm);
//   const [selectedFile, setSelectedFile] = useState(null);
//   const [fileError, setFileError] = useState("");
//   const [submitting, setSubmitting] = useState(false);
//   const fileInputRef = useRef(null);

//   const [viewing, setViewing] = useState(null);
//   const [viewerLoading, setViewerLoading] = useState(false);
//   const [deletingId, setDeletingId] = useState(null);
//   const [downloadingId, setDownloadingId] = useState(null);

//   const fetchDocuments = useCallback(async () => {
//     setLoading(true);
//     setLoadError("");

//     try {
//       const { data } = await api.get("/documents", {
//         params: { category: apiCategory },
//       });

//       const rows = Array.isArray(data)
//         ? data
//         : Array.isArray(data?.data)
//           ? data.data
//           : [];

//       setDocuments(rows);
//     } catch (error) {
//       setDocuments([]);
//       setLoadError(getErrorMessage(error));
//     } finally {
//       setLoading(false);
//     }
//   }, [apiCategory]);

//   useEffect(() => {
//     fetchDocuments();
//   }, [fetchDocuments]);

//   const filteredDocuments = useMemo(() => {
//     const query = search.trim().toLowerCase();

//     return documents
//       .filter((doc) => {
//         const subtype = doc.docSubtype || "";
//         const titleMatches =
//           !query ||
//           [doc.title, doc.description, subtype, doc.fileName]
//             .filter(Boolean)
//             .some((value) => String(value).toLowerCase().includes(query));

//         const typeMatches =
//           typeFilter === "all" || subtype === typeFilter;

//         return titleMatches && typeMatches;
//       })
//       .sort(
//         (a, b) =>
//           new Date(b.createdAt || 0).getTime() -
//           new Date(a.createdAt || 0).getTime()
//       );
//   }, [documents, search, typeFilter]);

//   const totalPages = Math.max(
//     1,
//     Math.ceil(filteredDocuments.length / PAGE_SIZE)
//   );

//   const currentPage = Math.min(page, totalPages);

//   const pageDocuments = filteredDocuments.slice(
//     (currentPage - 1) * PAGE_SIZE,
//     currentPage * PAGE_SIZE
//   );

//   useEffect(() => {
//     setPage(1);
//   }, [search, typeFilter]);

//   const resetForm = () => {
//     setForm(emptyForm);
//     setSelectedFile(null);
//     setFileError("");
//     setEditingId(null);

//     if (fileInputRef.current) fileInputRef.current.value = "";
//   };

//   const openCreate = () => {
//     resetForm();
//     setModalOpen(true);
//   };

//   const openEdit = (doc) => {
//     setEditingId(doc._id);
//     setSelectedFile(null);
//     setFileError("");

//     setForm({
//       title: doc.title || "",
//       docSubtype: doc.docSubtype || "Other Document",
//       description: doc.description || "",
//       fileUrl: doc.fileUrl || "",
//     });

//     setModalOpen(true);
//   };

//   const processFile = (file) => {
//     if (!file) return;

//     const ext = extensionOf(file.name);
//     const allowed = ["pdf", "doc", "docx", "jpg", "jpeg", "png"];

//     if (!allowed.includes(ext)) {
//       setFileError("PDF, DOC, DOCX, JPG aur PNG files allowed hain.");
//       return;
//     }

//     if (file.size === 0) {
//       setFileError("Empty file upload nahi kar sakte.");
//       return;
//     }

//     if (file.size > MAX_FILE_SIZE) {
//       setFileError("Maximum file size 5 MB hai.");
//       return;
//     }

//     setSelectedFile(file);
//     setFileError("");

//     setForm((previous) => ({
//       ...previous,
//       title: previous.title.trim()
//         ? previous.title
//         : file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "),
//     }));
//   };

//   const handleFileInput = (event) => {
//     processFile(event.target.files?.[0]);
//     event.target.value = "";
//   };

//   const handleSubmit = async (event) => {
//     event.preventDefault();

//     if (!isAdmin) {
//       toast.error("Only Admin and HR can manage company documents.");
//       return;
//     }

//     const titleValue = form.title.trim();

//     if (titleValue.length < 2 || titleValue.length > 150) {
//       toast.error("Title must contain 2 to 150 characters.");
//       return;
//     }

//     if (!editingId && !selectedFile && !form.fileUrl.trim()) {
//       setFileError("Please select a file to upload.");
//       return;
//     }

//     if (form.fileUrl.trim() && !selectedFile) {
//       try {
//         const url = new URL(form.fileUrl.trim());
//         if (!["http:", "https:"].includes(url.protocol)) {
//           throw new Error("Invalid protocol");
//         }
//       } catch {
//         toast.error("Please enter a valid HTTP or HTTPS URL.");
//         return;
//       }
//     }

//     setSubmitting(true);

//     try {
//       const payload = {
//         title: titleValue,
//         category: apiCategory,
//         description: form.description.trim(),
//       };

//       // Backend readInput() currently accepts title/category/description.
//       // Do not send unsupported subtype or visibility fields.
//       if (selectedFile) {
//         const body = new FormData();

//         Object.entries(payload).forEach(([key, value]) => {
//           body.append(key, value);
//         });

//         body.append("file", selectedFile);

//         if (editingId) {
//           await api.put(`/documents/${editingId}`, body);
//         } else {
//           await api.post("/documents", body);
//         }
//       } else if (form.fileUrl.trim()) {
//         payload.fileUrl = form.fileUrl.trim();

//         if (editingId) {
//           await api.put(`/documents/${editingId}`, payload);
//         } else {
//           await api.post("/documents", payload);
//         }
//       } else if (editingId) {
//         // Update metadata without replacing the existing file.
//         await api.put(`/documents/${editingId}`, payload);
//       } else {
//         setFileError("Please attach a file.");
//         return;
//       }

//       toast.success(
//         editingId
//           ? "Company document updated successfully."
//           : "Company document uploaded successfully."
//       );

//       setModalOpen(false);
//       resetForm();
//       await fetchDocuments();
//     } catch (error) {
//       console.error("Company document save error:", error);
//       toast.error(getErrorMessage(error));
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   const getDocumentBlob = async (doc) => {
//     // Uploaded files are served by a protected endpoint; use the API client
//     // so the configured authentication token/cookies are sent.
//     if (doc.hasFile || doc.downloadUrl || doc.file) {
//       const { data } = await api.get(`/documents/${doc._id}/file`, {
//         responseType: "blob",
//       });
//       return data;
//     }

//     if (doc.fileUrl && /^https?:\/\//i.test(doc.fileUrl)) {
//       const response = await fetch(doc.fileUrl);
//       if (!response.ok) throw new Error("Unable to open the document link.");
//       return response.blob();
//     }

//     throw new Error("No file is attached to this document.");
//   };

//   const downloadDocument = async (doc) => {
//     setDownloadingId(doc._id);

//     try {
//       if (doc.fileUrl && /^https?:\/\//i.test(doc.fileUrl) && !doc.hasFile) {
//         window.open(doc.fileUrl, "_blank", "noopener,noreferrer");
//         return;
//       }

//       const blob = await getDocumentBlob(doc);
//       const objectUrl = URL.createObjectURL(blob);
//       const link = document.createElement("a");

//       link.href = objectUrl;
//       link.download =
//         doc.fileName ||
//         `${(doc.title || "company-document").replace(/[^\w.-]+/g, "_")}.${extensionOf(doc.fileType || "pdf")}`;

//       document.body.appendChild(link);
//       link.click();
//       link.remove();

//       setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
//     } catch (error) {
//       toast.error(getErrorMessage(error));
//     } finally {
//       setDownloadingId(null);
//     }
//   };

//   const openDocument = async (doc) => {
//     setViewerLoading(true);

//     try {
//       if (doc.fileUrl && /^https?:\/\//i.test(doc.fileUrl) && !doc.hasFile) {
//         window.open(doc.fileUrl, "_blank", "noopener,noreferrer");
//         return;
//       }

//       const blob = await getDocumentBlob(doc);
//       const objectUrl = URL.createObjectURL(blob);

//       setViewing({
//         title: doc.title,
//         fileName: doc.fileName || doc.title,
//         url: objectUrl,
//         type: blob.type,
//       });
//     } catch (error) {
//       toast.error(getErrorMessage(error));
//     } finally {
//       setViewerLoading(false);
//     }
//   };

//   const closeViewer = () => {
//     if (viewing?.url) URL.revokeObjectURL(viewing.url);
//     setViewing(null);
//   };

//   useEffect(() => {
//     return () => {
//       if (viewing?.url) URL.revokeObjectURL(viewing.url);
//     };
//   }, [viewing]);

//   const deleteDocument = async (doc) => {
//     const confirmed = window.confirm(
//       `Delete "${doc.title}"? This action cannot be undone.`
//     );

//     if (!confirmed) return;

//     setDeletingId(doc._id);

//     try {
//       await api.delete(`/documents/${doc._id}`);

//       setDocuments((previous) =>
//         previous.filter((item) => item._id !== doc._id)
//       );

//       toast.success("Company document deleted.");
//     } catch (error) {
//       toast.error(getErrorMessage(error));
//     } finally {
//       setDeletingId(null);
//     }
//   };

//   const inputClass =
//     "mt-1.5 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition duration-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100";

//   return (
//     <main className="mx-auto w-full max-w-7xl space-y-5 px-3 py-4 sm:px-5 sm:py-6 lg:px-7">
//       {/* Page header */}
//       <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
//         <div className="flex min-w-0 items-start gap-3">
//           <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
//             <ShieldCheck size={25} />
//           </div>

//           <div className="min-w-0">
//             <h1 className="break-words text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
//               {title}
//             </h1>
//             <p className="mt-1 text-sm leading-6 text-slate-500">
//               {description}
//             </p>
//             <p className="mt-2 text-xs font-medium text-slate-500">
//               {documents.length} document{documents.length === 1 ? "" : "s"}
//               {" · "}Maximum file size 5 MB
//             </p>
//           </div>
//         </div>

//         <div className="flex w-full shrink-0 gap-2 sm:w-auto">
//           <button
//             type="button"
//             onClick={fetchDocuments}
//             disabled={loading}
//             title="Refresh documents"
//             className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100 disabled:opacity-50"
//           >
//             <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
//             <span className="hidden sm:inline">Refresh</span>
//           </button>

//           {isAdmin && (
//             <button
//               type="button"
//               onClick={openCreate}
//               className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200 sm:flex-none"
//             >
//               <Plus size={18} />
//               Upload Document
//             </button>
//           )}
//         </div>
//       </section>

//       {/* Search and filters */}
//       <section className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(220px,280px)]">
//         <div className="relative">
//           <Search
//             size={18}
//             className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
//           />
//           <input
//             value={search}
//             onChange={(event) => setSearch(event.target.value)}
//             placeholder="Search by document title or description..."
//             className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
//             aria-label="Search company documents"
//           />
//         </div>

//         <select
//           value={typeFilter}
//           onChange={(event) => setTypeFilter(event.target.value)}
//           className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none transition hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
//           aria-label="Filter document type"
//         >
//           <option value="all">All document types</option>
//           {ALL_TYPES.map((type) => (
//             <option value={type} key={type}>
//               {type}
//             </option>
//           ))}
//         </select>
//       </section>

//       {/* Error state */}
//       {loadError && (
//         <div className="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 sm:flex-row sm:items-center sm:justify-between">
//           <div className="flex items-start gap-2">
//             <AlertCircle size={18} className="mt-0.5 shrink-0" />
//             <span>{loadError}</span>
//           </div>
//           <button
//             type="button"
//             onClick={fetchDocuments}
//             className="self-start rounded-lg bg-white px-3 py-2 font-semibold text-rose-700 ring-1 ring-rose-200 transition hover:bg-rose-100 sm:self-auto"
//           >
//             Try again
//           </button>
//         </div>
//       )}

//       {/* Document list */}
//       <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
//         <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-6">
//           <div>
//             <h2 className="font-bold text-slate-900">Document Library</h2>
//             <p className="mt-1 text-xs text-slate-500">
//               Search, preview and manage official files.
//             </p>
//           </div>
//           <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
//             {filteredDocuments.length} results
//           </span>
//         </div>

//         {loading ? (
//           <div className="flex min-h-52 items-center justify-center gap-3 text-sm text-slate-500">
//             <Loader2 className="animate-spin text-indigo-600" size={22} />
//             Loading documents...
//           </div>
//         ) : pageDocuments.length === 0 ? (
//           <div className="flex min-h-64 flex-col items-center justify-center px-5 py-12 text-center">
//             <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
//               <FileText size={27} />
//             </div>
//             <h3 className="font-bold text-slate-800">No documents found</h3>
//             <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
//               {search || typeFilter !== "all"
//                 ? "Try changing your search or filter."
//                 : "Uploaded company documents will appear here."}
//             </p>
//             {isAdmin && !search && typeFilter === "all" && (
//               <button
//                 type="button"
//                 onClick={openCreate}
//                 className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
//               >
//                 <Upload size={16} />
//                 Upload first document
//               </button>
//             )}
//           </div>
//         ) : (
//           <>
//             {/* Mobile cards */}
//             <div className="divide-y divide-slate-100 md:hidden">
//               {pageDocuments.map((doc) => (
//                 <article
//                   key={doc._id}
//                   className="p-4 transition-colors duration-200 hover:bg-slate-50/80"
//                 >
//                   <div className="flex min-w-0 items-start gap-3">
//                     <DocumentIcon name={doc.fileName || doc.fileType || ""} />

//                     <div className="min-w-0 flex-1">
//                       <h3 className="break-words text-sm font-bold text-slate-900">
//                         {doc.title}
//                       </h3>
//                       <p className="mt-1 break-words text-xs text-slate-500">
//                         {doc.description || doc.categoryLabel || "Company document"}
//                       </p>
//                       <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
//                         <span>{formatDate(doc.createdAt)}</span>
//                         {doc.fileSize > 0 && (
//                           <>
//                             <span>·</span>
//                             <span>{formatSize(doc.fileSize)}</span>
//                           </>
//                         )}
//                       </div>
//                     </div>
//                   </div>

//                   <div className="mt-3 flex flex-wrap gap-2">
//                     <button
//                       type="button"
//                       onClick={() => openDocument(doc)}
//                       disabled={viewerLoading}
//                       className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-50"
//                     >
//                       <Eye size={15} /> View
//                     </button>

//                     <button
//                       type="button"
//                       onClick={() => downloadDocument(doc)}
//                       disabled={downloadingId === doc._id}
//                       className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-50"
//                     >
//                       {downloadingId === doc._id ? (
//                         <Loader2 size={15} className="animate-spin" />
//                       ) : (
//                         <Download size={15} />
//                       )}
//                       Download
//                     </button>

//                     {isAdmin && (
//                       <>
//                         <button
//                           type="button"
//                           onClick={() => openEdit(doc)}
//                           className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
//                         >
//                           <Pencil size={15} /> Edit
//                         </button>

//                         <button
//                           type="button"
//                           onClick={() => deleteDocument(doc)}
//                           disabled={deletingId === doc._id}
//                           className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
//                         >
//                           {deletingId === doc._id ? (
//                             <Loader2 size={15} className="animate-spin" />
//                           ) : (
//                             <Trash2 size={15} />
//                           )}
//                           Delete
//                         </button>
//                       </>
//                     )}
//                   </div>
//                 </article>
//               ))}
//             </div>

//             {/* Desktop table */}
//             <div className="hidden overflow-x-auto md:block">
//               <table className="w-full min-w-[760px] text-left">
//                 <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
//                   <tr>
//                     <th className="px-6 py-3.5 font-bold">Document</th>
//                     <th className="px-4 py-3.5 font-bold">Category</th>
//                     <th className="px-4 py-3.5 font-bold">Uploaded</th>
//                     <th className="px-4 py-3.5 font-bold">Size</th>
//                     <th className="px-6 py-3.5 text-right font-bold">Actions</th>
//                   </tr>
//                 </thead>
//                 <tbody className="divide-y divide-slate-100">
//                   {pageDocuments.map((doc) => (
//                     <tr
//                       key={doc._id}
//                       className="group transition-colors duration-200 hover:bg-indigo-50/40"
//                     >
//                       <td className="px-6 py-4">
//                         <div className="flex min-w-0 items-center gap-3">
//                           <DocumentIcon name={doc.fileName || doc.fileType || ""} />
//                           <div className="min-w-0">
//                             <p className="break-words text-sm font-bold text-slate-800 transition group-hover:text-indigo-700">
//                               {doc.title}
//                             </p>
//                             <p className="mt-1 max-w-sm truncate text-xs text-slate-500">
//                               {doc.description || "No description"}
//                             </p>
//                           </div>
//                         </div>
//                       </td>
//                       <td className="px-4 py-4 text-sm text-slate-600">
//                         {doc.categoryLabel || "Company Document"}
//                       </td>
//                       <td className="px-4 py-4 text-sm text-slate-600">
//                         {formatDate(doc.createdAt)}
//                       </td>
//                       <td className="px-4 py-4 text-sm text-slate-600">
//                         {formatSize(doc.fileSize) || "—"}
//                       </td>
//                       <td className="px-6 py-4">
//                         <div className="flex items-center justify-end gap-1.5">
//                           <button
//                             type="button"
//                             title="View document"
//                             onClick={() => openDocument(doc)}
//                             className="rounded-lg p-2 text-slate-500 transition hover:bg-indigo-100 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
//                           >
//                             <Eye size={17} />
//                           </button>
//                           <button
//                             type="button"
//                             title="Download document"
//                             onClick={() => downloadDocument(doc)}
//                             disabled={downloadingId === doc._id}
//                             className="rounded-lg p-2 text-slate-500 transition hover:bg-indigo-100 hover:text-indigo-700 disabled:opacity-50"
//                           >
//                             {downloadingId === doc._id ? (
//                               <Loader2 size={17} className="animate-spin" />
//                             ) : (
//                               <Download size={17} />
//                             )}
//                           </button>
//                           {isAdmin && (
//                             <>
//                               <button
//                                 type="button"
//                                 title="Edit document"
//                                 onClick={() => openEdit(doc)}
//                                 className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
//                               >
//                                 <Pencil size={17} />
//                               </button>
//                               <button
//                                 type="button"
//                                 title="Delete document"
//                                 onClick={() => deleteDocument(doc)}
//                                 disabled={deletingId === doc._id}
//                                 className="rounded-lg p-2 text-rose-500 transition hover:bg-rose-100 hover:text-rose-700 disabled:opacity-50"
//                               >
//                                 {deletingId === doc._id ? (
//                                   <Loader2 size={17} className="animate-spin" />
//                                 ) : (
//                                   <Trash2 size={17} />
//                                 )}
//                               </button>
//                             </>
//                           )}
//                         </div>
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>

//             {/* Pagination */}
//             <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
//               <p className="text-xs text-slate-500">
//                 Showing {(currentPage - 1) * PAGE_SIZE + 1}–
//                 {Math.min(currentPage * PAGE_SIZE, filteredDocuments.length)} of{" "}
//                 {filteredDocuments.length}
//               </p>
//               <div className="flex items-center gap-2">
//                 <button
//                   type="button"
//                   onClick={() => setPage((value) => Math.max(1, value - 1))}
//                   disabled={currentPage === 1}
//                   className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
//                 >
//                   Previous
//                 </button>
//                 <span className="min-w-16 text-center text-xs font-semibold text-slate-600">
//                   {currentPage} / {totalPages}
//                 </span>
//                 <button
//                   type="button"
//                   onClick={() =>
//                     setPage((value) => Math.min(totalPages, value + 1))
//                   }
//                   disabled={currentPage === totalPages}
//                   className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
//                 >
//                   Next
//                 </button>
//               </div>
//             </div>
//           </>
//         )}
//       </section>

//       {/* Create/Edit modal */}
//       {modalOpen && (
//         <div
//           className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
//           onMouseDown={(event) => {
//             if (event.target === event.currentTarget && !submitting) {
//               setModalOpen(false);
//             }
//           }}
//         >
//           <section
//             role="dialog"
//             aria-modal="true"
//             aria-labelledby="document-modal-title"
//             className="flex max-h-[94dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl animate-in fade-in slide-in-from-bottom-3 duration-200 sm:max-h-[90vh] sm:rounded-3xl"
//           >
//             <header className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-4 sm:px-6">
//               <div className="min-w-0">
//                 <h2
//                   id="document-modal-title"
//                   className="text-base font-bold text-slate-900 sm:text-lg"
//                 >
//                   {editingId ? "Edit Company Document" : "Upload Company Document"}
//                 </h2>
//                 <p className="mt-1 text-xs text-slate-500">
//                   PDF, DOC, DOCX, JPG or PNG · Maximum 5 MB
//                 </p>
//               </div>
//               <button
//                 type="button"
//                 onClick={() => !submitting && setModalOpen(false)}
//                 disabled={submitting}
//                 aria-label="Close upload form"
//                 className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800 disabled:opacity-40"
//               >
//                 <X size={19} />
//               </button>
//             </header>

//             <form
//               onSubmit={handleSubmit}
//               className="min-h-0 space-y-5 overflow-y-auto p-4 sm:p-6"
//             >
//               <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
//                 <Field label="Document type" required>
//                   <select
//                     value={form.docSubtype}
//                     onChange={(event) =>
//                       setForm((previous) => ({
//                         ...previous,
//                         docSubtype: event.target.value,
//                         title:
//                           previous.title === previous.docSubtype
//                             ? event.target.value
//                             : previous.title,
//                       }))
//                     }
//                     className={inputClass}
//                   >
//                     {DOCUMENT_TYPES.map((group) => (
//                       <optgroup label={group.group} key={group.group}>
//                         {group.items.map((type) => (
//                           <option key={type} value={type}>
//                             {type}
//                           </option>
//                         ))}
//                       </optgroup>
//                     ))}
//                   </select>
//                 </Field>

//                 <Field label="Document title" required>
//                   <input
//                     value={form.title}
//                     onChange={(event) =>
//                       setForm((previous) => ({
//                         ...previous,
//                         title: event.target.value,
//                       }))
//                     }
//                     maxLength={150}
//                     required
//                     minLength={2}
//                     placeholder="e.g. Company GST Certificate"
//                     className={inputClass}
//                   />
//                 </Field>
//               </div>

//               <Field label="Description">
//                 <textarea
//                   value={form.description}
//                   onChange={(event) =>
//                     setForm((previous) => ({
//                       ...previous,
//                       description: event.target.value,
//                     }))
//                   }
//                   maxLength={500}
//                   rows={3}
//                   placeholder="Add a short description or reference details..."
//                   className={`${inputClass} resize-y`}
//                 />
//                 <span className="mt-1 block text-right text-[11px] text-slate-400">
//                   {form.description.length}/500
//                 </span>
//               </Field>

//               <Field label="Document file" required={!editingId}>
//                 <div
//                   onDragOver={(event) => {
//                     event.preventDefault();
//                     event.dataTransfer.dropEffect = "copy";
//                   }}
//                   onDrop={(event) => {
//                     event.preventDefault();
//                     processFile(event.dataTransfer.files?.[0]);
//                   }}
//                   className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/70 p-5 transition duration-200 hover:border-indigo-400 hover:bg-indigo-50/40 focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-100 sm:p-7"
//                 >
//                   <input
//                     ref={fileInputRef}
//                     type="file"
//                     accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
//                     onChange={handleFileInput}
//                     className="sr-only"
//                     id="company-document-file"
//                   />

//                   <div className="flex flex-col items-center text-center">
//                     <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
//                       <FileUp size={24} />
//                     </div>

//                     <p className="text-sm font-bold text-slate-800">
//                       Drag and drop your document
//                     </p>
//                     <p className="mt-1 text-xs text-slate-500">
//                       or choose a file from your device
//                     </p>

//                     <label
//                       htmlFor="company-document-file"
//                       className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
//                     >
//                       <Upload size={16} />
//                       Browse Files
//                     </label>
//                   </div>
//                 </div>

//                 {selectedFile && (
//                   <div className="mt-3 flex items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50/70 p-3">
//                     <DocumentIcon name={selectedFile.name} />
//                     <div className="min-w-0 flex-1">
//                       <p className="break-all text-sm font-semibold text-slate-800">
//                         {selectedFile.name}
//                       </p>
//                       <p className="mt-1 text-xs text-slate-500">
//                         {formatSize(selectedFile.size)} · Ready to upload
//                       </p>
//                     </div>
//                     <button
//                       type="button"
//                       onClick={() => {
//                         setSelectedFile(null);
//                         setFileError("");
//                       }}
//                       className="rounded-lg p-2 text-slate-500 transition hover:bg-white hover:text-rose-600"
//                       aria-label="Remove selected file"
//                     >
//                       <X size={17} />
//                     </button>
//                   </div>
//                 )}

//                 {editingId && !selectedFile && (
//                   <p className="mt-2 text-xs leading-5 text-slate-500">
//                     Leave this empty to keep the existing file. Selecting a new
//                     file replaces it.
//                   </p>
//                 )}

//                 {fileError && (
//                   <p className="mt-2 flex items-start gap-2 text-xs font-medium text-rose-600">
//                     <AlertCircle size={15} className="mt-0.5 shrink-0" />
//                     {fileError}
//                   </p>
//                 )}
//               </Field>

//               <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
//                 <button
//                   type="button"
//                   disabled={submitting}
//                   onClick={() => setModalOpen(false)}
//                   className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
//                 >
//                   Cancel
//                 </button>
//                 <button
//                   type="submit"
//                   disabled={submitting}
//                   className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200 disabled:cursor-not-allowed disabled:opacity-60"
//                 >
//                   {submitting ? (
//                     <>
//                       <Loader2 size={17} className="animate-spin" />
//                       Saving...
//                     </>
//                   ) : (
//                     <>
//                       <Upload size={17} />
//                       {editingId ? "Save Changes" : "Upload Document"}
//                     </>
//                   )}
//                 </button>
//               </div>
//             </form>
//           </section>
//         </div>
//       )}

//       {/* Document viewer */}
//       {viewing && (
//         <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 p-2 backdrop-blur-sm sm:p-5">
//           <section className="flex h-[94dvh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:h-[90vh]">
//             <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
//               <div className="min-w-0">
//                 <h2 className="truncate text-sm font-bold text-slate-900 sm:text-base">
//                   {viewing.title}
//                 </h2>
//                 <p className="truncate text-xs text-slate-500">
//                   {viewing.fileName}
//                 </p>
//               </div>
//               <button
//                 type="button"
//                 onClick={closeViewer}
//                 className="shrink-0 rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
//                 aria-label="Close preview"
//               >
//                 <X size={20} />
//               </button>
//             </header>

//             <div className="min-h-0 flex-1 bg-slate-100">
//               {viewing.type.includes("image") ? (
//                 <div className="flex h-full items-center justify-center overflow-auto p-3 sm:p-6">
//                   <img
//                     src={viewing.url}
//                     alt={viewing.title}
//                     className="max-h-full max-w-full rounded-lg object-contain shadow-sm"
//                   />
//                 </div>
//               ) : viewing.type.includes("pdf") ||
//                 viewing.fileName.toLowerCase().endsWith(".pdf") ? (
//                 <iframe
//                   src={viewing.url}
//                   title={viewing.title}
//                   className="h-full w-full border-0"
//                 />
//               ) : (
//                 <div className="flex h-full flex-col items-center justify-center p-6 text-center">
//                   <FileText size={42} className="text-slate-400" />
//                   <h3 className="mt-4 font-bold text-slate-800">
//                     Preview is not available for this file type
//                   </h3>
//                   <p className="mt-2 text-sm text-slate-500">
//                     Download the document to open it on your device.
//                   </p>
//                   <button
//                     type="button"
//                     onClick={() =>
//                       downloadDocument({
//                         _id: viewing._id,
//                         title: viewing.title,
//                         fileName: viewing.fileName,
//                         hasFile: true,
//                       })
//                     }
//                     className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
//                   >
//                     <Download size={16} />
//                     Download file
//                   </button>
//                 </div>
//               )}
//             </div>
//           </section>
//         </div>
//       )}

//       {viewerLoading && (
//         <div className="fixed bottom-5 right-5 z-[70] flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-xl">
//           <Loader2 size={17} className="animate-spin" />
//           Opening document...
//         </div>
//       )}
//     </main>
//   );
// }
