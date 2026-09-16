"use client";
import { useEffect, useState, useCallback } from "react";
import { Plus, Loader2, Target, CalendarDays, FileText, User } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Table from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import { useAuth } from "@/context/AuthContext";

export default function GoalsPage() {
  const { user } = useAuth();
  const [goals, setGoals] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ employee: "", title: "", description: "", targetDate: "" });

  const isManager = ["admin", "hr", "manager"].includes(user?.role);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [goalsRes, empRes] = await Promise.all([
        api.get("/performance/goals"),
        isManager ? api.get("/employees") : Promise.resolve({ data: [] }),
      ]);
      setGoals(Array.isArray(goalsRes.data) ? goalsRes.data : []);
      setEmployees(Array.isArray(empRes.data) ? empRes.data : []);
    } catch (err) {
      console.error("Error loading goals:", err);
      toast.error("Goals load nahi hue. Kripya refresh karein.");
    } finally {
      setLoading(false);
    }
  }, [isManager]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/performance/goals", form);
      toast.success("Goal successfully create ho gaya! 🎉");
      setModalOpen(false);
      setForm({ employee: "", title: "", description: "", targetDate: "" });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Goal create karne me error aayi.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleProgress = async (id, progress) => {
    try {
      await api.put(`/performance/goals/${id}/progress`, { progress: Number(progress) });
      // Only update local state to avoid full reload on every slider move, for smoother UX
      setGoals(prev => prev.map(g => g._id === id ? { ...g, progress: Number(progress) } : g));
    } catch (err) {
      toast.error("Progress update nahi hua.");
      fetchData(); // Revert state if API fails
    }
  };

  const statusVariant = {
    "completed": "success",
    "in-progress": "info",
    "not-started": "neutral",
    "overdue": "danger"
  };

  const columns = [
    {
      key: "title",
      label: "Goal Title",
      render: (r) => <span className="font-semibold text-slate-800">{r.title}</span>
    },
    {
      key: "employee",
      label: "Employee",
      render: (r) => (
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
            {r.employee?.name?.charAt(0) || "U"}
          </div>
          <span className="text-slate-700">{r.employee?.name || "—"}</span>
        </div>
      )
    },
    {
      key: "targetDate",
      label: "Target Date",
      render: (r) => r.targetDate ? (
        <span className="text-slate-600 flex items-center gap-1.5 text-sm">
          <CalendarDays size={14} className="text-slate-400" />
          {new Date(r.targetDate).toLocaleDateString()}
        </span>
      ) : "—"
    },
    {
      key: "progress",
      label: "Progress",
      render: (r) => (
        <div className="flex items-center gap-3 w-40">
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={r.progress || 0}
            onChange={(e) => handleProgress(r._id, e.target.value)}
            className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 hover:accent-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
          />
          <span className="text-xs font-bold text-slate-700 min-w-[3ch] text-right">
            {r.progress || 0}%
          </span>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (r) => <Badge variant={statusVariant[r.status] || "neutral"}>{r.status}</Badge>
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-3 lg:p-4">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-2xl font-bold text-slate-900 tracking-tight">Goals & KPIs</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track employee objectives, milestones aur unki progress.
          </p>
        </div>
        {isManager && (
          <Button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 shadow-sm hover:shadow-md transition-all w-full sm:w-auto justify-center"
          >
            <Plus size={18} /> New Goal
          </Button>
        )}
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="animate-spin text-indigo-600" size={32} />
            <p className="text-sm text-slate-500 font-medium animate-pulse">Loading goals data...</p>
          </div>
        ) : (
          <Table columns={columns} data={goals} emptyText="Koi goal assign nahi kiya gaya abhi." />
        )}
      </div>

      {/* Premium Modal Form */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Create New Goal">
        <form onSubmit={handleCreate} className="space-y-5 mt-2">
          {/* Employee Field */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-1.5">
              <User size={16} className="text-slate-400" /> Employee
            </label>
            <select
              required
              value={form.employee}
              onChange={(e) => setForm({ ...form, employee: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200"
            >
              <option value="" disabled>-- Select Employee --</option>
              {employees.map((e) => (
                <option key={e._id} value={e._id}>{e.name}</option>
              ))}
            </select>
          </div>

          {/* Goal Title Field */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-1.5">
              <Target size={16} className="text-slate-400" /> Goal Title
            </label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200"
              placeholder="e.g., Complete React Certification"
            />
          </div>

          {/* Description Field */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-1.5">
              <FileText size={16} className="text-slate-400" /> Description
            </label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200 resize-none"
              placeholder="Goal ke baare mein thodi details..."
            />
          </div>

          {/* Target Date Field */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-1.5">
              <CalendarDays size={16} className="text-slate-400" /> Target Date
            </label>
            <input
              type="date"
              required
              value={form.targetDate}
              onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setModalOpen(false)}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={submitting}
              className="flex-[2] shadow-md shadow-indigo-500/20"
            >
              {submitting ? 'Creating...' : 'Create Goal'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}