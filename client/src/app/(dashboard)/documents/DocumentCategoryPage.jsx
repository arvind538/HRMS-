"use client";
import { useEffect, useState, useCallback } from "react";
import { Plus, Loader2, FileText, Download, Trash2, FolderOpen } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { useAuth } from "@/context/AuthContext";

export default function DocumentCategoryPage({ category, title, description, employeeSpecific = true }) {
    const { user } = useAuth();
    const [documents, setDocuments] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({ title: "", employee: "", fileUrl: "", visibility: "all-employees" });

    const isAdmin = ["admin", "hr"].includes(user?.role);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = { category };
            if (!isAdmin && employeeSpecific && user?.employee?._id) {
                params.employee = user.employee._id;
            }

            const [docRes, empRes] = await Promise.all([
                api.get("/documents", { params }),
                isAdmin && employeeSpecific ? api.get("/employees") : Promise.resolve({ data: [] }),
            ]);

            setDocuments(Array.isArray(docRes.data) ? docRes.data : []);
            setEmployees(Array.isArray(empRes.data) ? empRes.data : []);
        } catch (err) {
            toast.error("Failed to fetch documents from the server.");
        } finally {
            setLoading(false);
        }
    }, [category, isAdmin, employeeSpecific, user]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleUpload = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const payload = {
                title: form.title,
                fileUrl: form.fileUrl,
                category,
                employee: employeeSpecific && form.employee ? form.employee : null,
                visibility: employeeSpecific ? "specific-employee" : "all-employees"
            };

            await api.post("/documents", payload);
            toast.success("Document uploaded successfully.");
            setModalOpen(false);
            setForm({ title: "", employee: "", fileUrl: "", visibility: employeeSpecific ? "specific-employee" : "all-employees" });
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to upload document.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Are you sure you want to delete this document?")) return;
        try {
            await api.delete(`/documents/${id}`);
            toast.success("Document deleted successfully.");
            fetchData();
        } catch (err) {
            toast.error("Failed to delete document.");
        }
    };

    return (
        <div className="space-y-6 transition-all duration-300">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">{title}</h1>
                    <p className="text-sm text-slate-500 mt-1 max-w-2xl">{description}</p>
                </div>
                {isAdmin && (
                    <Button
                        onClick={() => setModalOpen(true)}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm transition-all duration-300 hover:shadow-indigo-200 hover:shadow-lg active:scale-95 group shrink-0"
                    >
                        <Plus size={18} className="transition-transform duration-300 group-hover:rotate-90" />
                        Upload Document
                    </Button>
                )}
            </div>

            {/* Documents Grid / List Section */}
            {loading ? (
                <div className="py-24 text-center">
                    <Loader2 className="animate-spin mx-auto text-indigo-600 h-9 w-9" />
                    <p className="text-xs text-slate-400 mt-3 font-medium animate-pulse">Loading documents...</p>
                </div>
            ) : documents.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200/80 p-16 text-center shadow-sm hover:shadow-md transition-shadow duration-300">
                    <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-transform duration-300 hover:scale-110">
                        <FolderOpen size={30} />
                    </div>
                    <p className="text-base font-bold text-slate-800">No documents found</p>
                    <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">There are no records available in this category at the moment.</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden divide-y divide-slate-100">
                    {documents.map((d) => (
                        <div
                            key={d._id}
                            className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-200 hover:bg-indigo-50/30 group"
                        >
                            <div className="flex items-center gap-4 min-w-0">
                                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl shrink-0 transition-all duration-300 group-hover:bg-indigo-600 group-hover:text-white group-hover:shadow-md">
                                    <FileText size={22} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors duration-200">{d.title}</p>
                                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                                        {d.employee?.name && (
                                            <>
                                                <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">{d.employee.name}</span>
                                                <span>·</span>
                                            </>
                                        )}
                                        <span>Uploaded on {new Date(d.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
                                <a
                                    href={d.fileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-600 hover:text-white rounded-xl transition-all duration-200 shadow-sm active:scale-95"
                                    title="Download Document"
                                >
                                    <Download size={14} /> Download
                                </a>
                                {isAdmin && (
                                    <button
                                        onClick={() => handleDelete(d._id)}
                                        className="p-2 text-rose-500 bg-rose-50 hover:bg-rose-600 hover:text-white rounded-xl transition-all duration-200 shadow-sm active:scale-95"
                                        title="Delete Document"
                                    >
                                        <Trash2 size={15} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Upload Modern Modal */}
            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={`Upload ${title}`}>
                <form onSubmit={handleUpload} className="space-y-4 pt-2">
                    <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Document Title</label>
                        <input
                            required
                            value={form.title}
                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                            className="mt-1.5 w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 bg-slate-50/50 hover:border-slate-300 font-medium text-slate-800"
                            placeholder="e.g. Employee Handbook 2026"
                        />
                    </div>

                    {employeeSpecific && (
                        <div>
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Assign Employee</label>
                            <select
                                required
                                value={form.employee}
                                onChange={(e) => setForm({ ...form, employee: e.target.value })}
                                className="mt-1.5 w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 bg-slate-50/50 hover:border-slate-300 text-slate-700 font-medium cursor-pointer"
                            >
                                <option value="">-- Select Employee --</option>
                                {employees.map((e) => (
                                    <option key={e._id} value={e._id}>{e.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">File URL (Cloud Link)</label>
                        <input
                            required
                            type="url"
                            value={form.fileUrl}
                            onChange={(e) => setForm({ ...form, fileUrl: e.target.value })}
                            className="mt-1.5 w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 bg-slate-50/50 hover:border-slate-300 font-medium text-slate-800"
                            placeholder="https://res.cloudinary.com/... or secure file link"
                        />
                    </div>

                    <div className="pt-4">
                        <Button
                            type="submit"
                            loading={submitting}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-xl font-bold shadow-md shadow-indigo-100 transition-all duration-300 hover:shadow-lg active:scale-[0.99]"
                        >
                            Upload & Publish
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}