"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import {
    FileText,
    Download,
    Eye,
    RefreshCw,
    Search,
    MoreVertical,
    Calendar,
    User,
    ShieldCheck,
    Copy,
    Check,
    X,
    ExternalLink,
    FolderOpen,
    Plus,
    Loader2,
    Building2,
    IndianRupee,
    LayoutGrid,
    List,
} from "lucide-react";
import api from "@/lib/api";

const getInitials = (name) => {
    if (!name) return "U";
    const parts = name.trim().split(" ").filter(Boolean);
    return parts.length > 1
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : parts[0].slice(0, 2).toUpperCase();
};

export default function EmployeeDocumentsPage() {
    const [documents, setDocuments] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [viewMode, setViewMode] = useState("grid"); // grid or table
    const [activeMenuId, setActiveMenuId] = useState(null);
    const [previewDoc, setPreviewDoc] = useState(null);
    const [copiedId, setCopiedId] = useState(null);
    const [downloadingId, setDownloadingId] = useState(null);

    // Modal state for Upload / Generate Document
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState("");

    // Form fields tailored for Hi-Tech Solution
    const [formData, setFormData] = useState({
        title: "Offer Letter - Hi-Tech Solution",
        employeeId: "",
        category: "contract",
        fileUrl: "",
        fileSize: "1.2 MB",
        salary: "50000",
        designation: "Software Engineer",
    });

    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setActiveMenuId(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fetchData = async (isManual = false) => {
        if (isManual) setRefreshing(true);
        else setLoading(true);

        try {
            const [docRes, empRes] = await Promise.all([
                api.get("/documents").catch(() => ({ data: [] })),
                api.get("/employees").catch(() => ({ data: [] })),
            ]);

            const rawDocs = docRes?.data;
            const docList = Array.isArray(rawDocs) ? rawDocs : (rawDocs?.data || rawDocs?.documents || []);

            const rawEmps = empRes?.data;
            const empList = Array.isArray(rawEmps) ? rawEmps : (rawEmps?.data || rawEmps?.employees || []);

            setDocuments(docList);
            setEmployees(empList);
        } catch (err) {
            console.error("Failed to fetch records:", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filteredDocuments = useMemo(() => {
        return documents.filter((doc) => {
            const title = (doc.title || doc.name || "").toLowerCase();
            const empName = (doc.employee?.name || doc.employeeName || "all staff").toLowerCase();
            const type = (doc.category || doc.type || "general").toLowerCase();

            const matchesSearch =
                title.includes(searchQuery.toLowerCase()) ||
                empName.includes(searchQuery.toLowerCase());
            const matchesCategory =
                categoryFilter === "all" || type === categoryFilter.toLowerCase();

            return matchesSearch && matchesCategory;
        });
    }, [documents, searchQuery, categoryFilter]);

    const handleCopyLink = (id, url) => {
        if (!url) return;
        navigator.clipboard.writeText(url);
        setCopiedId(id);
        setTimeout(() => {
            setCopiedId(null);
            setActiveMenuId(null);
        }, 1500);
    };

    const handleDirectDownload = async (doc) => {
        let fileUrl = doc.fileUrl;

        if (!fileUrl || fileUrl.includes("example.com")) {
            const dummyContent = `OFFER LETTER\n\nCompany: Hi-Tech Solution\nTitle: ${doc.title}\nDesignation: ${doc.metadata?.designation || "Software Engineer"}\nSalary: ₹${doc.metadata?.salary || "50,000"}\n\nCongratulations! Your employment has been approved.`;
            const blob = new Blob([dummyContent], { type: "application/pdf" });
            const blobUrl = window.URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.href = blobUrl;
            link.download = `${(doc.title || "Offer_Letter").replace(/\s+/g, "_")}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
            setActiveMenuId(null);
            return;
        }

        try {
            setDownloadingId(doc._id || doc.id);
            const response = await fetch(fileUrl);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = blobUrl;
            link.download = `${(doc.title || "Hi-Tech-Document").replace(/\s+/g, "_")}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (err) {
            window.open(fileUrl, "_blank");
        } finally {
            setDownloadingId(null);
            setActiveMenuId(null);
        }
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setFormError("");
        setSubmitting(true);

        try {
            const payload = {
                title: formData.title,
                employee: formData.employeeId || null,
                category: formData.category,
                type: formData.category,
                fileUrl: formData.fileUrl || "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
                fileSize: formData.fileSize,
                metadata: {
                    company: "Hi-Tech Solution",
                    salary: formData.salary,
                    designation: formData.designation,
                },
            };

            await api.post("/documents", payload);
            setIsUploadModalOpen(false);
            fetchData(true);
            setFormData({
                title: "Offer Letter - Hi-Tech Solution",
                employeeId: "",
                category: "contract",
                fileUrl: "",
                fileSize: "1.2 MB",
                salary: "50000",
                designation: "Software Engineer",
            });
        } catch (err) {
            setFormError(err.response?.data?.message || "Failed to generate or save document record.");
        } finally {
            setSubmitting(false);
        }
    };

    const getDocTypeBadge = (type = "") => {
        const t = type.toLowerCase();
        if (t.includes("contract") || t.includes("agreement") || t.includes("offer"))
            return "bg-amber-50 text-amber-700 border-amber-200/80";
        if (t.includes("id") || t.includes("identity") || t.includes("kyc"))
            return "bg-emerald-50 text-emerald-700 border-emerald-200/80";
        if (t.includes("resume") || t.includes("cv") || t.includes("payslip"))
            return "bg-violet-50 text-violet-700 border-violet-200/80";
        return "bg-indigo-50 text-indigo-700 border-indigo-200/80";
    };

    return (
        <div className="max-w-[1400px] mx-auto space-y-6 pb-12 font-sans antialiased text-slate-900 px-4 sm:px-6 lg:px-8 pt-6">
            {/* Header Section - Fixed Responsive Layout */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm transition-all duration-300 hover:shadow-md space-y-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    {/* Left Title & Subtitle */}
                    <div className="flex items-start gap-4">
                        <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100 shadow-2xs shrink-0">
                            <FileText size={26} />
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
                                Hi-Tech Solution - Employee Documents
                            </h1>
                            <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-1">
                                Manage official offer letters, payslips, compliance records, and verified identification files.
                            </p>
                        </div>
                    </div>

                    {/* Right Actions & Buttons */}
                    <div className="flex flex-nowrap items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setIsUploadModalOpen(true)}
                            className="inline-flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-xs rounded-2xl shadow-md shadow-indigo-600/20 transition-all duration-200 active:scale-95 hover:shadow-lg cursor-pointer whitespace-nowrap"
                        >
                            <Plus size={16} /> Generate Offer Letter
                        </button>

                        <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/80">
                            <button
                                onClick={() => setViewMode("grid")}
                                className={`p-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${viewMode === "grid" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-500 hover:text-slate-800"
                                    }`}
                                title="Grid View"
                            >
                                <LayoutGrid size={16} />
                            </button>
                            <button
                                onClick={() => setViewMode("table")}
                                className={`p-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${viewMode === "table" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-500 hover:text-slate-800"
                                    }`}
                                title="Table View"
                            >
                                <List size={16} />
                            </button>
                        </div>

                        <button
                            onClick={() => fetchData(true)}
                            disabled={refreshing || loading}
                            className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 active:scale-95 transition-all disabled:opacity-50 shadow-2xs cursor-pointer"
                            title="Refresh documents"
                        >
                            <RefreshCw size={16} className={refreshing ? "animate-spin text-indigo-600" : ""} />
                        </button>
                    </div>
                </div>

                {/* Search and Filters Bar */}
                <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="relative flex-1">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search document title or staff name..."
                            className="w-full pl-11 pr-4 py-3 bg-slate-50/70 hover:bg-slate-50 border border-slate-200/80 rounded-2xl text-xs sm:text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 outline-none transition-all shadow-2xs"
                        />
                    </div>

                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="px-4 py-3 bg-slate-50/70 hover:bg-slate-50 border border-slate-200/80 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 cursor-pointer shadow-2xs transition-all sm:w-60"
                    >
                        <option value="all">All Categories</option>
                        <option value="contract">Offer Letters / Contracts</option>
                        <option value="payslip">Pay Slips</option>
                        <option value="kyc">ID & Compliance</option>
                        <option value="resume">Resume / CV</option>
                    </select>
                </div>
            </div>

            {/* Document Content View */}
            {loading ? (
                <div className="py-24 flex flex-col items-center justify-center space-y-3">
                    <Loader2 className="animate-spin text-indigo-600" size={34} />
                    <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500 animate-pulse">
                        Loading Documents Vault...
                    </p>
                </div>
            ) : filteredDocuments.length === 0 ? (
                <div className="bg-white p-16 text-center rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center mx-auto mb-3 border border-indigo-100 shadow-2xs">
                        <FolderOpen size={26} />
                    </div>
                    <h3 className="text-base font-bold text-slate-900">No documents found</h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto font-medium">
                        No records match your search criteria. Try generating a new document or clearing your active filters.
                    </p>
                </div>
            ) : viewMode === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredDocuments.map((doc) => {
                        const docId = doc._id || doc.id;
                        const isMenuOpen = activeMenuId === docId;
                        const docType = doc.category || doc.type || "General Doc";
                        const assignedName = doc.employee?.name || doc.employeeName || "All Staff Access";

                        return (
                            <div
                                key={docId}
                                className="group relative bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-indigo-300 transition-all duration-300 flex flex-col justify-between"
                            >
                                <div>
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-start gap-3.5">
                                            <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:scale-110 transition-transform shrink-0 border border-indigo-100 shadow-2xs">
                                                <FileText size={22} />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                                                    {doc.title || doc.name || "Untitled Document"}
                                                </h3>
                                                <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1 font-medium">
                                                    <User size={13} className="text-slate-400" />
                                                    <span className="capitalize">{assignedName}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="relative">
                                            <button
                                                type="button"
                                                onClick={() => setActiveMenuId(isMenuOpen ? null : docId)}
                                                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                                            >
                                                <MoreVertical size={16} />
                                            </button>

                                            {isMenuOpen && (
                                                <div
                                                    ref={menuRef}
                                                    className="absolute right-0 mt-1 w-44 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200 py-1.5 z-30 transform origin-top-right transition-all"
                                                >
                                                    <button
                                                        onClick={() => {
                                                            setPreviewDoc(doc);
                                                            setActiveMenuId(null);
                                                        }}
                                                        className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 cursor-pointer transition-colors"
                                                    >
                                                        <Eye size={14} className="text-indigo-600" />
                                                        <span>Quick Preview</span>
                                                    </button>

                                                    {doc.fileUrl && (
                                                        <>
                                                            <button
                                                                onClick={() => handleDirectDownload(doc)}
                                                                className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 text-left cursor-pointer transition-colors"
                                                            >
                                                                <Download size={14} className="text-emerald-600" />
                                                                <span>{downloadingId === docId ? "Downloading..." : "Direct Download"}</span>
                                                            </button>

                                                            <button
                                                                onClick={() => handleCopyLink(docId, doc.fileUrl)}
                                                                className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 text-left cursor-pointer transition-colors"
                                                            >
                                                                {copiedId === docId ? (
                                                                    <>
                                                                        <Check size={14} className="text-emerald-600" />
                                                                        <span className="text-emerald-600">Copied!</span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Copy size={14} className="text-slate-400" />
                                                                        <span>Copy Link</span>
                                                                    </>
                                                                )}
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-4 flex items-center gap-2.5">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border shadow-2xs ${getDocTypeBadge(docType)}`}>
                                            <ShieldCheck size={13} />
                                            <span className="capitalize">{docType}</span>
                                        </span>
                                        {doc.fileSize && (
                                            <span className="text-xs text-slate-400 font-semibold">{doc.fileSize}</span>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-1.5 text-slate-400 font-medium">
                                        <Calendar size={13} />
                                        <span>
                                            {doc.createdAt
                                                ? new Date(doc.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                                                : "—"}
                                        </span>
                                    </div>

                                    {doc.fileUrl ? (
                                        <button
                                            type="button"
                                            onClick={() => setPreviewDoc(doc)}
                                            className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                        >
                                            <span>View</span>
                                            <ExternalLink size={13} />
                                        </button>
                                    ) : (
                                        <span className="text-slate-300 font-semibold">No URL</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[750px]">
                        <thead>
                            <tr className="bg-slate-50/70 border-b border-slate-200 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                                <th className="py-4 px-6">Document Title</th>
                                <th className="py-4 px-6">Assigned Staff</th>
                                <th className="py-4 px-6">Category</th>
                                <th className="py-4 px-6">Date Added</th>
                                <th className="py-4 px-6 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                            {filteredDocuments.map((doc) => {
                                const docId = doc._id || doc.id;
                                const docType = doc.category || doc.type || "General";
                                const assignedName = doc.employee?.name || doc.employeeName || "All Staff Access";

                                return (
                                    <tr key={docId} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="py-4 px-6 font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                            {doc.title || doc.name || "Untitled"}
                                        </td>
                                        <td className="py-4 px-6 text-slate-600 capitalize">
                                            {assignedName}
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border shadow-2xs ${getDocTypeBadge(docType)}`}>
                                                <span className="capitalize">{docType}</span>
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-slate-400 font-medium">
                                            {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : "—"}
                                        </td>
                                        <td className="py-4 px-6 text-right space-x-2">
                                            <button
                                                onClick={() => setPreviewDoc(doc)}
                                                className="px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-xl font-bold transition-all cursor-pointer shadow-2xs"
                                            >
                                                Preview
                                            </button>
                                            <button
                                                onClick={() => handleDirectDownload(doc)}
                                                className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-xl font-bold transition-all cursor-pointer shadow-2xs"
                                            >
                                                Download
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal: Generate Offer Letter / Document */}
            {isUploadModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                            <div>
                                <h3 className="text-base font-extrabold text-slate-900">Generate Official Document</h3>
                                <p className="text-xs text-slate-500 font-medium mt-0.5">Hi-Tech Solution HR Vault</p>
                            </div>
                            <button onClick={() => setIsUploadModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        {formError && (
                            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 font-semibold">
                                {formError}
                            </div>
                        )}

                        <form onSubmit={handleFormSubmit} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">Document Title</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-slate-50/70 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">Assign Staff Member</label>
                                    <select
                                        value={formData.employeeId}
                                        onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-50/70 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 cursor-pointer focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    >
                                        <option value="">All Staff / General Vault</option>
                                        {employees.map((emp) => {
                                            const empId = emp._id || emp.id;
                                            const empName = emp.name || `${emp.firstName || ""} ${emp.lastName || ""}` || "Staff Member";
                                            return (
                                                <option key={empId} value={empId}>
                                                    {empName}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">Category</label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-50/70 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 cursor-pointer focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    >
                                        <option value="contract">Offer Letter / Contract</option>
                                        <option value="payslip">Pay Slip</option>
                                        <option value="kyc">ID & Compliance (KYC)</option>
                                        <option value="resume">Resume / CV</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">Designation Title</label>
                                    <input
                                        type="text"
                                        value={formData.designation}
                                        onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-50/70 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">Compensation (₹)</label>
                                    <input
                                        type="number"
                                        value={formData.salary}
                                        onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-50/70 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 font-mono focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsUploadModalOpen(false)}
                                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl cursor-pointer transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs rounded-2xl shadow-md shadow-indigo-200 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                                >
                                    {submitting && <Loader2 size={14} className="animate-spin" />}
                                    <span>Save Document Record</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Preview Modal */}
            {previewDoc && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3.5">
                                <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100 shadow-2xs">
                                    <FileText size={24} />
                                </div>
                                <div>
                                    <h3 className="text-base font-extrabold text-slate-900">{previewDoc.title || previewDoc.name}</h3>
                                    <p className="text-xs text-slate-400 font-semibold">Hi-Tech Solution - Verified Record</p>
                                </div>
                            </div>
                            <button onClick={() => setPreviewDoc(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="bg-slate-50/80 rounded-2xl p-4 space-y-3 text-xs text-slate-600 border border-slate-200/60">
                            <div className="flex justify-between py-1 border-b border-slate-200/60">
                                <span className="text-slate-400 font-medium">Assigned Staff</span>
                                <span className="font-bold text-slate-800 capitalize">
                                    {previewDoc.employee?.name || previewDoc.employeeName || "All Staff Access"}
                                </span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-200/60">
                                <span className="text-slate-400 font-medium">Company Entity</span>
                                <span className="font-bold text-indigo-600 flex items-center gap-1">
                                    <Building2 size={13} /> Hi-Tech Solution
                                </span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-200/60">
                                <span className="text-slate-400 font-medium">Category</span>
                                <span className="font-bold capitalize text-slate-800">{previewDoc.category || previewDoc.type || "General"}</span>
                            </div>
                            {previewDoc.metadata?.salary && (
                                <div className="flex justify-between py-1 border-b border-slate-200/60">
                                    <span className="text-slate-400 font-medium">Compensation Stated</span>
                                    <span className="font-bold font-mono text-slate-800 flex items-center gap-0.5">
                                        <IndianRupee size={13} /> {Number(previewDoc.metadata.salary).toLocaleString()}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                            {previewDoc.fileUrl && (
                                <button
                                    onClick={() => handleDirectDownload(previewDoc)}
                                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-1.5 shadow-md shadow-emerald-200 transition-all cursor-pointer"
                                >
                                    <Download size={14} /> Direct Download File
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setPreviewDoc(null)}
                                className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl cursor-pointer transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}