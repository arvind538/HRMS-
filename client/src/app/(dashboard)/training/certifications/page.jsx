"use client";
import { useEffect, useState, useCallback } from "react";
import { Plus, Loader2, Award } from "lucide-react";
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
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/training/certifications", form);
      toast.success("Certification add ho gayi.");
      setModalOpen(false);
      setForm({ employee: "", training: "", name: "", issuedBy: "", issueDate: "", expiryDate: "" });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Add nahi hui.");
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { key: "employee", label: "Employee", render: (r) => r.employee?.name || "—" },
    { key: "name", label: "Certification" },
    { key: "issuedBy", label: "Issued By" },
    { key: "issueDate", label: "Issue Date", render: (r) => r.issueDate ? new Date(r.issueDate).toLocaleDateString() : "—" },
    { key: "expiryDate", label: "Expiry", render: (r) => r.expiryDate ? new Date(r.expiryDate).toLocaleDateString() : "No expiry" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Certifications</h1>
          <p className="text-xs text-slate-500 mt-0.5">Employees ki earned certifications track karo</p>
        </div>
        <Button onClick={() => setModalOpen(true)}><Plus size={16} /> Add Certification</Button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200">
        {loading ? (
          <div className="py-16 text-center"><Loader2 className="animate-spin mx-auto text-indigo-600" /></div>
        ) : (
          <Table columns={columns} data={certifications} emptyText="Koi certification record nahi hai" />
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Certification">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Employee</label>
            <select required value={form.employee} onChange={(e) => setForm({ ...form, employee: e.target.value })}
              className="mt-1 w-full px-3 py-2 border rounded-lg text-sm">
              <option value="">-- Select --</option>
              {employees.map((e) => <option key={e._id} value={e._id}>{e.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Related Training (optional)</label>
            <select value={form.training} onChange={(e) => setForm({ ...form, training: e.target.value })}
              className="mt-1 w-full px-3 py-2 border rounded-lg text-sm">
              <option value="">-- None --</option>
              {trainings.map((t) => <option key={t._id} value={t._id}>{t.title}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Certification Name</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1 w-full px-3 py-2 border rounded-lg text-sm" placeholder="AWS Certified Developer" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Issued By</label>
            <input value={form.issuedBy} onChange={(e) => setForm({ ...form, issuedBy: e.target.value })}
              className="mt-1 w-full px-3 py-2 border rounded-lg text-sm" placeholder="Amazon Web Services" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700">Issue Date</label>
              <input type="date" value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })}
                className="mt-1 w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Expiry Date</label>
              <input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                className="mt-1 w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
          </div>
          <Button type="submit" loading={submitting} className="w-full">Add Certification</Button>
        </form>
      </Modal>
    </div>
  );
}