"use client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, FileText, Trash2, FolderOpen, Edit3, ExternalLink, ShieldAlert, Clock, Home, Lock, CalendarDays, Plus } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { useAuth } from "@/context/AuthContext";

export default function HRPoliciesPage() {
  const { user } = useAuth();
  const category = "company-policy";
  const title = "HR Policies & Guidelines";
  const description = "Company internal rules, leave policy, attendance policy, WFH guidelines, POSH policy, and data security/NDA guidelines.";

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingDocId, setEditingDocId] = useState(null);

  // Form state enhanced for HR Policies
  const [form, setForm] = useState({
    title: "",
    fileUrl: "",
    description: "",
    visibility: "all-employees"
  });

  const isAdmin = ["admin", "hr"].includes(user?.role);

  // Pre-defined Quick Templates for HR Policies
  const quickTemplates = [
    {
      title: "Leave Policy & Guidelines",
      icon: CalendarDays,
      desc: "Detailed guidelines on casual leaves, sick leaves, earned leaves, and procedure for approval."
    },
    {
      title: "Attendance & Punctuality Policy",
      icon: Clock,
      desc: "Office timing rules, grace periods, biometric/app check-in norms, and half-day policies."
    },
    {
      title: "Work From Home (WFH) Guidelines",
      icon: Home,
      desc: "Remote work expectations, availability hours, communication standards, and reporting tools."
    },
    {
      title: "POSH Policy (Prevention of Sexual Harassment)",
      icon: ShieldAlert,
      desc: "Committed to maintaining a safe, respectful, and harassment-free workplace for everyone."
    },
    {
      title: "Data Security & NDA Guidelines",
      icon: Lock,
      desc: "Non-disclosure agreement rules, IP protection, customer data privacy, and cybersecurity SOPs."
    }
  ];

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { category };
      const docRes = await api.get("/documents", { params });
      setDocuments(Array.isArray(docRes.data) ? docRes.data : []);
    } catch (err) {
      toast.error("Failed to load HR policies from server.");
    } finally {
      setLoading(false);
    }
  }, [category]);

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
        category: category,
        description: form.description,
        visibility: "all-employees"
      };

      if (editingDocId) {
        await api.put(`/documents/${editingDocId}`, payload);
        toast.success("HR Policy updated successfully.");
      } else {
        await api.post("/documents", payload);
        toast.success("HR Policy published successfully.");
      }

      setModalOpen(false);
      setEditingDocId(null);
      setForm({ title: "", fileUrl: "", description: "", visibility: "all-employees" });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Operation failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (doc) => {
    setEditingDocId(doc._id);
    setForm({
      title: doc.title || "",
      fileUrl: doc.fileUrl || "",
      description: doc.description || "",
      visibility: "all-employees"
    });
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this policy document?")) return;
    try {
      await api.delete(`/documents/${id}`);
      toast.success("Policy deleted successfully.");
      fetchData();
    } catch (err) {
      toast.error("Failed to delete policy.");
    }
  };

  const applyTemplate = (tmpl) => {
    setForm({
      ...form,
      title: tmpl.title,
      description: tmpl.desc
    });
    setModalOpen(true);
  };

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto px-2 sm:px-3 lg:px-4 transition-all duration-300">

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl font-medium leading-relaxed">{description}</p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => {
              setEditingDocId(null);
              setForm({ title: "", fileUrl: "", description: "", visibility: "all-employees" });
              setModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-2xl font-bold shadow-md shadow-indigo-100 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-200 active:scale-95 group shrink-0 text-xs cursor-pointer"
          >
            <Plus size={16} className="transition-transform duration-300 group-hover:rotate-90" />
            <span>Upload New Policy</span>
          </Button>
        )}
      </div>

      {/* Quick Template Cards for Admin/HR */}
      {isAdmin && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Quick Policy Templates</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {quickTemplates.map((tmpl, idx) => {
              const IconComp = tmpl.icon;
              return (
                <div
                  key={idx}
                  onClick={() => applyTemplate(tmpl)}
                  className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:border-indigo-400 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-3 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shadow-2xs group-hover:shadow-md">
                      <IconComp size={20} />
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{tmpl.title}</h4>
                    <p className="text-[11px] text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">{tmpl.desc}</p>
                  </div>
                  <div className="pt-4">
                    <span className="text-[11px] font-bold text-indigo-600 inline-flex items-center gap-1 group-hover:translate-x-1.5 transition-transform">
                      Publish Template &rarr;
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Documents List Section */}
      {loading ? (
        <div className="py-24 text-center bg-white/50 backdrop-blur-xs rounded-3xl border border-slate-200/60">
          <Loader2 className="animate-spin mx-auto text-indigo-600 h-9 w-9" />
          <p className="text-xs text-slate-400 mt-3 font-semibold animate-pulse">Loading HR policies...</p>
        </div>
      ) : documents.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 sm:p-16 text-center shadow-sm hover:shadow-md transition-all duration-300">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-transform duration-300 hover:scale-110 shadow-xs">
            <FolderOpen size={30} />
          </div>
          <p className="text-base font-bold text-slate-800">No HR policies published yet</p>
          <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">Use the quick templates above or upload custom compliance policies for employees.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden divide-y divide-slate-100">
          {documents.map((d) => (
            <div
              key={d._id}
              className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-300 hover:bg-indigo-50/40 hover:shadow-xs group"
            >
              <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 min-w-0">
                <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl shrink-0 transition-all duration-300 group-hover:bg-indigo-600 group-hover:text-white group-hover:shadow-md">
                  <FileText size={22} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors duration-200">{d.title}</p>
                    <span className="text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-md border border-emerald-100 shadow-2xs">
                      All Employees Guideline
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 truncate max-w-xl font-medium">{d.description || "Official company internal policy document."}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 self-end md:self-center shrink-0 w-full sm:w-auto justify-end pt-2 md:pt-0 border-t sm:border-t-0 border-slate-100">
                {d.fileUrl && (
                  <a
                    href={d.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-600 hover:text-white rounded-xl transition-all duration-300 shadow-2xs hover:shadow-md hover:shadow-indigo-100 active:scale-95 border border-indigo-100 group/view cursor-pointer"
                    title="View Policy Document"
                  >
                    <span>View Policy</span>
                    <ExternalLink size={13} className="transition-transform duration-300 group-hover/view:translate-x-0.5 group-hover/view:-translate-y-0.5" />
                  </a>
                )}

                {isAdmin && (
                  <>
                    <button
                      onClick={() => handleEditClick(d)}
                      className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all duration-300 shadow-2xs active:scale-95 group/edit cursor-pointer"
                      title="Edit Policy"
                    >
                      <Edit3 size={14} className="transition-transform duration-300 group-hover/edit:rotate-12" />
                      <span className="hidden sm:inline">Edit</span>
                    </button>

                    <button
                      onClick={() => handleDelete(d._id)}
                      className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-600 hover:text-white rounded-xl transition-all duration-300 shadow-2xs active:scale-95 group/del border border-rose-100 cursor-pointer"
                      title="Delete Policy"
                    >
                      <Trash2 size={14} className="transition-transform duration-300 group-hover/del:scale-110" />
                      <span className="hidden sm:inline">Delete</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload / Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingDocId ? "Edit HR Policy" : "Publish HR Policy"}>
        <form onSubmit={handleUpload} className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Policy Title</label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="mt-1.5 w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 bg-slate-50/50 hover:border-slate-300 font-medium text-slate-800"
              placeholder="e.g. Leave Policy & Guidelines"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Policy Summary / Description</label>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="mt-1.5 w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 bg-slate-50/50 hover:border-slate-300 font-medium text-slate-800"
              placeholder="e.g. Guidelines on casual leaves, sick leaves, and holidays."
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">File URL (Cloud PDF Link)</label>
            <input
              required
              type="url"
              value={form.fileUrl}
              onChange={(e) => setForm({ ...form, fileUrl: e.target.value })}
              className="mt-1.5 w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 bg-slate-50/50 hover:border-slate-300 font-medium text-slate-800"
              placeholder="https://res.cloudinary.com/.../hr-policy.pdf"
            />
          </div>

          <div className="pt-4">
            <Button
              type="submit"
              loading={submitting}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-xl font-bold shadow-md shadow-indigo-100 transition-all duration-300 hover:shadow-lg active:scale-[0.99] cursor-pointer"
            >
              {editingDocId ? "Update Policy Record" : "Publish Policy for All Employees"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}