"use client";
import { useEffect, useState, useCallback } from "react";
import { Plus, Loader2, FileText, Download, Trash2 } from "lucide-react";
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
  const [form, setForm] = useState({ title: "", employee: "", fileUrl: "", visibility: "specific-employee" });

  const isAdmin = ["admin", "hr"].includes(user?.role);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { category };
      if (!isAdmin && employeeSpecific && user?.employee?._id) params.employee = user.employee._id;

      const [docRes, empRes] = await Promise.all([
        api.get("/documents", { params }),
        isAdmin && employeeSpecific ? api.get("/employees") : Promise.resolve({ data: [] }),
      ]);
      setDocuments(Array.isArray(docRes.data) ? docRes.data : []);
      setEmployees(Array.isArray(empRes.data) ? empRes.data : []);
    } catch (err) {
      toast.error("Documents load nahi hue.");
    } finally {
      setLoading(false);
    }
  }, [category, isAdmin, employeeSpecific, user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleUpload = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/documents", { ...form, category, visibility: employeeSpecific ? "specific-employee" : "all-employees" });
      toast.success("Document upload ho gaya.");
      setModalOpen(false);
      setForm({ title: "", employee: "", fileUrl: "", visibility: "specific-employee" });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Upload nahi hua.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Ye document delete karna hai?")) return;
    try {
      await api.delete(`/documents/${id}`);
      toast.success("Delete ho gaya.");
      fetchData();
    } catch (err) {
      toast.error("Delete nahi hua.");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{title}</h1>
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        </div>
        {isAdmin && <Button onClick={() => setModalOpen(true)}><Plus size={16} /> Upload Document</Button>}
      </div>

      {loading ? (
        <div className="py-16 text-center"><Loader2 className="animate-spin mx-auto text-indigo-600" /></div>
      ) : documents.length === 0 ? (
        <div className="bg-white rounded-2xl border p-16 text-center text-slate-400 text-sm">
          <FileText className="mx-auto mb-2 text-slate-300" size={32} />
          Koi document upload nahi hua abhi
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
          {documents.map((d) => (
            <div key={d._id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0"><FileText size={18} /></div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{d.title}</p>
                  <p className="text-xs text-slate-400">
                    {d.employee?.name ? `${d.employee.name} · ` : ""}{new Date(d.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a href={d.fileUrl} target="_blank" rel="noreferrer" className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg">
                  <Download size={15} />
                </a>
                {isAdmin && (
                  <button onClick={() => handleDelete(d._id)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg">
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={`Upload ${title}`}>
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Document Title</label>
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="mt-1 w-full px-3 py-2 border rounded-lg text-sm" placeholder="Offer Letter - Rahul Sharma" />
          </div>
          {employeeSpecific && (
            <div>
              <label className="text-sm font-medium text-slate-700">Employee</label>
              <select required value={form.employee} onChange={(e) => setForm({ ...form, employee: e.target.value })}
                className="mt-1 w-full px-3 py-2 border rounded-lg text-sm">
                <option value="">-- Select --</option>
                {employees.map((e) => <option key={e._id} value={e._id}>{e.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-slate-700">File URL</label>
            <input required value={form.fileUrl} onChange={(e) => setForm({ ...form, fileUrl: e.target.value })}
              className="mt-1 w-full px-3 py-2 border rounded-lg text-sm" placeholder="https://example.com/file.pdf" />
          </div>
          <Button type="submit" loading={submitting} className="w-full">Upload</Button>
        </form>
      </Modal>
    </div>
  );
}