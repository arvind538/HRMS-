"use client";
import { useEffect, useState, useCallback } from "react";
import { Plus, Loader2, Award, Calendar, Building, User, Pencil, Trash2 } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Table from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";

export default function CertificationsPage() {
  const [certifications, setCertifications] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [trainings, setTrainings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Delete confirmation modal states
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({ employee: "", training: "", name: "", issuedBy: "", issueDate: "", expiryDate: "" });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [certRes, empRes, trainRes] = await Promise.all([
        api.get("/training/certifications"),
        api.get("/employees"),
        api.get("/training"),
      ]);
      setCertifications(Array.isArray(certRes.data) ? certRes.data : []);
      setEmployees(Array.isArray(empRes.data) ? empRes.data : []);
      setTrainings(Array.isArray(trainRes.data) ? trainRes.data : []);
    } catch (err) {
      toast.error("Certifications load nahi hui.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Open modal for Create
  const handleOpenAdd = () => {
    setEditMode(false);
    setSelectedId(null);
    setForm({ employee: "", training: "", name: "", issuedBy: "", issueDate: "", expiryDate: "" });
    setModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (cert) => {
    setEditMode(true);
    // Ensure we capture the correct MongoDB ID (_id)
    setSelectedId(cert._id || cert.id);
    setForm({
      employee: cert.employee?._id || cert.employee || "",
      training: cert.training?._id || cert.training || "",
      name: cert.name || "",
      issuedBy: cert.issuedBy || "",
      issueDate: cert.issueDate ? cert.issueDate.split("T")[0] : "",
      expiryDate: cert.expiryDate ? cert.expiryDate.split("T")[0] : "",
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.employee || !form.name) {
      toast.error("Employee aur Certification Name zaroori hain.");
      return;
    }

    setSubmitting(true);
    try {
      if (editMode) {
        if (!selectedId) {
          toast.error("Invalid Certification ID.");
          setSubmitting(false);
          return;
        }
        // PUT Request
        await api.put(`/training/certifications/${selectedId}`, form);
        toast.success("Certification update ho gayi.");
      } else {
        // POST Request
        await api.post("/training/certifications", form);
        toast.success("Certification add ho gayi.");
      }
      setModalOpen(false);
      fetchData();
    } catch (err) {
      console.error("API Error:", err);
      toast.error(err.response?.data?.message || "Operation fail ho gaya.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete Confirmation
  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.delete(`/training/certifications/${deleteId}`);
      toast.success("Certification delete ho gayi.");
      setDeleteModalOpen(false);
      setDeleteId(null);
      fetchData();
    } catch (err) {
      toast.error("Delete nahi ho saki.");
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      key: "employee",
      label: "Employee",
      render: (r) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-semibold text-xs border border-indigo-100">
            {r.employee?.name ? r.employee.name.charAt(0).toUpperCase() : <User size={14} />}
          </div>
          <span className="font-medium text-slate-800">{r.employee?.name || "—"}</span>
        </div>
      )
    },
    {
      key: "name",
      label: "Certification",
      render: (r) => (
        <div className="flex items-center gap-2">
          <Award size={16} className="text-amber-500 shrink-0" />
          <span className="font-semibold text-slate-900">{r.name}</span>
        </div>
      )
    },
    {
      key: "issuedBy",
      label: "Issued By",
      render: (r) => (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-medium">
          <Building size={12} className="text-slate-400" />
          {r.issuedBy || "—"}
        </span>
      )
    },
    {
      key: "issueDate",
      label: "Issue Date",
      render: (r) => (
        <span className="text-slate-600 text-xs flex items-center gap-1.5">
          <Calendar size={13} className="text-slate-400" />
          {r.issueDate ? new Date(r.issueDate).toLocaleDateString() : "—"}
        </span>
      )
    },
    {
      key: "expiryDate",
      label: "Expiry",
      render: (r) => {
        if (!r.expiryDate) return <span className="text-xs text-slate-400 italic">No expiry</span>;
        const isExpired = new Date(r.expiryDate) < new Date();
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${isExpired ? "bg-rose-50 text-rose-700 border border-rose-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
            }`}>
            {new Date(r.expiryDate).toLocaleDateString()}
          </span>
        );
      }
    },
    {
      key: "actions",
      label: "Actions",
      render: (r) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleOpenEdit(r)}
            className="p-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-lg transition-all"
            title="Edit"
          >
            <Pencil size={15} />
          </button>
          <button
            type="button"
            onClick={() => { setDeleteId(r._id || r.id); setDeleteModalOpen(true); }}
            className="p-1.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-lg transition-all"
            title="Delete"
          >
            <Trash2 size={15} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
              <Award size={22} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Certifications</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">Track and manage team credentials, certifications, and compliance.</p>
        </div>
        <Button
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2.5 rounded-xl shadow-xs transition-all duration-200 active:scale-95"
        >
          <Plus size={18} /> Add Certification
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all">
        {loading ? (
          <div className="py-24 text-center space-y-3">
            <Loader2 className="animate-spin mx-auto text-indigo-600 h-8 w-8" />
            <p className="text-sm text-slate-400 font-medium">Loading certifications...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table columns={columns} data={certifications} emptyText="Koi certification record nahi hai" />
          </div>
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editMode ? "Edit Certification" : "Add New Certification"}>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">Employee</label>
            <select
              required
              value={form.employee}
              onChange={(e) => setForm({ ...form, employee: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
            >
              <option value="">-- Select Employee --</option>
              {employees.map((e) => <option key={e._id} value={e._id}>{e.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">Related Training <span className="text-slate-400 font-normal lowercase">(optional)</span></label>
            <select
              value={form.training}
              onChange={(e) => setForm({ ...form, training: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
            >
              <option value="">-- None --</option>
              {trainings.map((t) => <option key={t._id} value={t._id}>{t.title}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">Certification Name</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
              placeholder="e.g. AWS Certified Developer"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">Issued By</label>
            <input
              value={form.issuedBy}
              onChange={(e) => setForm({ ...form, issuedBy: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
              placeholder="e.g. Amazon Web Services"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">Issue Date</label>
              <input
                type="date"
                value={form.issueDate}
                onChange={(e) => setForm({ ...form, issueDate: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">Expiry Date</label>
              <input
                type="date"
                value={form.expiryDate}
                onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
              />
            </div>
          </div>

          <div className="pt-3">
            <Button
              type="submit"
              loading={submitting}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-xs transition-all duration-200 active:scale-95"
            >
              {editMode ? "Update Certification" : "Add Certification"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Delete Certification">
        <div className="space-y-4 pt-2">
          <p className="text-sm text-slate-600">
            Kya aap sachme is certification record ko delete karna chahte hain? Yeh action undo nahi kiya ja sakta.
          </p>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setDeleteModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-medium rounded-xl transition-all"
            >
              Cancel
            </button>
            <Button
              type="button"
              onClick={confirmDelete}
              loading={deleting}
              className="bg-rose-600 hover:bg-rose-700 text-white text-sm px-4 py-2 rounded-xl transition-all"
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}