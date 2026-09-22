"use client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, FileText, Trash2, FolderOpen, Edit3, ExternalLink, UserCheck, Calendar } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { useAuth } from "@/context/AuthContext";

export default function AppointmentLettersPage() {
  const { user } = useAuth();
  const category = "appointment-letter";
  const title = "Appointment Letters";
  const description = "When a candidate joins the company or clears their probation period, the formal Appointment Letter / Employment Agreement is uploaded here..";
  const employeeSpecific = true;

  const [documents, setDocuments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingDocId, setEditingDocId] = useState(null);

  // Form State
  const [form, setForm] = useState({
    title: "",
    employee: "",
    fileUrl: "",
    visibility: "specific-employee"
  });

  const isAdmin = ["admin", "hr"].includes(user?.role);

  // Smooth data fetching from backend
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
      toast.error("Failed to load appointment letters from server.");
    } finally {
      setLoading(false);
    }
  }, [category, isAdmin, employeeSpecific, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Upload or Update Submission
  const handleUpload = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        title: form.title,
        fileUrl: form.fileUrl,
        category: category,
        employee: form.employee || null,
        visibility: "specific-employee"
      };

      if (editingDocId) {
        await api.put(`/documents/${editingDocId}`, payload);
        toast.success("Appointment letter updated successfully.");
      } else {
        await api.post("/documents", payload);
        toast.success("Appointment letter uploaded successfully.");
      }

      setModalOpen(false);
      setEditingDocId(null);
      setForm({ title: "", employee: "", fileUrl: "", visibility: "specific-employee" });
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
      employee: doc.employee?._id || doc.employee || "",
      fileUrl: doc.fileUrl || "",
      visibility: doc.visibility || "specific-employee"
    });
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this appointment letter record?")) return;
    try {
      await api.delete(`/documents/${id}`);
      toast.success("Appointment letter deleted successfully.");
      fetchData();
    } catch (err) {
      toast.error("Failed to delete appointment letter.");
    }
  };

  return (
    <div className="space-y-6 transition-all duration-300">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">{title}</h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">{description}</p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => {
              setEditingDocId(null);
              setForm({ title: "", employee: "", fileUrl: "", visibility: "specific-employee" });
              setModalOpen(true);
            }}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-2xl font-bold shadow-sm transition-all duration-300 hover:shadow-indigo-200 hover:shadow-lg active:scale-95 group shrink-0 text-xs"
          >
            <span className="transition-transform duration-300 group-hover:rotate-90 font-black text-base">+</span>
            Upload Appointment Letter
          </Button>
        )}
      </div>

      {/* Documents List Section */}
      {loading ? (
        <div className="py-24 text-center">
          <Loader2 className="animate-spin mx-auto text-indigo-600 h-9 w-9" />
          <p className="text-xs text-slate-400 mt-3 font-semibold animate-pulse">Syncing appointment letters...</p>
        </div>
      ) : documents.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-16 text-center shadow-sm hover:shadow-md transition-all duration-300">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-transform duration-300 hover:scale-110 shadow-xs">
            <FolderOpen size={30} />
          </div>
          <p className="text-base font-bold text-slate-800">No appointment letters found</p>
          <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">No employment agreements or appointment letters available right now.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden divide-y divide-slate-100">
          {documents.map((d) => (
            <div
              key={d._id}
              className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-300 hover:bg-indigo-50/40 hover:shadow-sm group"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl shrink-0 transition-all duration-300 group-hover:bg-indigo-600 group-hover:text-white group-hover:shadow-md">
                  <FileText size={22} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors duration-200">{d.title}</p>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                    {d.employee?.name && (
                      <span className="inline-flex items-center gap-1 font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-100/60">
                        <UserCheck size={12} /> {d.employee.name}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 text-slate-500">
                      <Calendar size={12} /> {new Date(d.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </p>
                </div>
              </div>

              {/* Smooth Hover & Interactive Action Buttons */}
              <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
                {d.fileUrl && (
                  <a
                    href={d.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-600 hover:text-white rounded-xl transition-all duration-300 shadow-2xs hover:shadow-md hover:shadow-indigo-100 active:scale-95 border border-indigo-100 group/view"
                    title="View Agreement"
                  >
                    <span>View Document</span>
                    <ExternalLink size={13} className="transition-transform duration-300 group-hover/view:translate-x-0.5 group-hover/view:-translate-y-0.5" />
                  </a>
                )}

                {isAdmin && (
                  <>
                    <button
                      onClick={() => handleEditClick(d)}
                      className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all duration-300 shadow-2xs active:scale-95 group/edit"
                      title="Edit Record"
                    >
                      <Edit3 size={14} className="transition-transform duration-300 group-hover/edit:rotate-12" /> Edit
                    </button>

                    <button
                      onClick={() => handleDelete(d._id)}
                      className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-600 hover:text-white rounded-xl transition-all duration-300 shadow-2xs active:scale-95 group/del border border-rose-100"
                      title="Delete Record"
                    >
                      <Trash2 size={14} className="transition-transform duration-300 group-hover/del:scale-110" /> Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload / Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingDocId ? "Edit Appointment Letter" : "Upload Appointment Letter"}>
        <form onSubmit={handleUpload} className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Document Title</label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="mt-1.5 w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 bg-slate-50/50 hover:border-slate-300 font-medium text-slate-800"
              placeholder="e.g. Appointment Letter - Rahul Sharma"
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
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">File URL (Cloud Link - PDF)</label>
            <input
              required
              type="url"
              value={form.fileUrl}
              onChange={(e) => setForm({ ...form, fileUrl: e.target.value })}
              className="mt-1.5 w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 bg-slate-50/50 hover:border-slate-300 font-medium text-slate-800"
              placeholder="https://example.com/appointment-letter.pdf"
            />
          </div>

          <div className="pt-4">
            <Button
              type="submit"
              loading={submitting}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-xl font-bold shadow-md shadow-indigo-100 transition-all duration-300 hover:shadow-lg active:scale-[0.99]"
            >
              {editingDocId ? "Update Record" : "Upload & Save Agreement"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}