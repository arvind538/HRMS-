// src/app/(dashboard)/training/programs/page.jsx
"use client";
import { useEffect, useState, useCallback } from "react";
import { Plus, Loader2, Trash2, Edit3, MonitorPlay, Type, AlignLeft, User, Tag, CalendarDays, Laptop, Users, RefreshCw } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Table from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";

export default function TrainingProgramsPage() {
  const [trainings, setTrainings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Edit state tracking
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    trainer: "",
    startDate: "",
    endDate: "",
    mode: "online",
    category: "",
    maxParticipants: "",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/training");
      const rawData = response?.data;

      // Robust multi-format array parser
      const list = Array.isArray(rawData)
        ? rawData
        : Array.isArray(rawData?.data)
          ? rawData.data
          : Array.isArray(rawData?.trainings)
            ? rawData.trainings
            : [];

      setTrainings(list);
    } catch (err) {
      console.error("Error loading training programs:", err);
      toast.error("Failed to load training programs. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm({
      title: "", description: "", trainer: "", startDate: "", endDate: "",
      mode: "online", category: "", maxParticipants: ""
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (program) => {
    setEditingId(program._id || program.id);
    setForm({
      title: program.title || "",
      description: program.description || "",
      trainer: program.trainer || "",
      startDate: program.startDate ? program.startDate.split('T')[0] : "",
      endDate: program.endDate ? program.endDate.split('T')[0] : "",
      mode: program.mode || "online",
      category: program.category || "",
      maxParticipants: program.maxParticipants || "",
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingId) {
        // Update existing program
        await api.put(`/training/${editingId}`, form);
        toast.success("Training program updated successfully! 🚀");
      } else {
        // Create new program
        await api.post("/training", form);
        toast.success("Training program created successfully! 🎉");
      }

      setModalOpen(false);
      setEditingId(null);
      setForm({
        title: "", description: "", trainer: "", startDate: "", endDate: "",
        mode: "online", category: "", maxParticipants: ""
      });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save the program.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this training program? This action cannot be undone.")) return;
    try {
      await api.delete(`/training/${id}`);
      toast.success("Program deleted successfully.");
      fetchData();
    } catch (err) {
      toast.error("Failed to delete the program.");
    }
  };

  const statusVariant = {
    upcoming: "info",
    ongoing: "warning",
    completed: "success",
    cancelled: "danger"
  };

  const columns = [
    {
      key: "title",
      label: "Program",
      render: (r) => <span className="font-bold text-slate-800 hover:text-indigo-600 transition-colors">{r.title}</span>
    },
    {
      key: "trainer",
      label: "Trainer",
      render: (r) => (
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600 shadow-sm">
            {r.trainer?.charAt(0) || "U"}
          </div>
          <span className="text-slate-700 font-medium">{r.trainer || "TBA"}</span>
        </div>
      )
    },
    {
      key: "mode",
      label: "Mode",
      render: (r) => (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-600 capitalize">
          {r.mode === 'online' ? <Laptop size={12} className="text-indigo-500" /> : <Users size={12} className="text-emerald-500" />}
          {r.mode}
        </span>
      )
    },
    {
      key: "startDate",
      label: "Start Date",
      render: (r) => (
        <span className="text-slate-600 text-sm font-medium">
          {r.startDate ? new Date(r.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : "—"}
        </span>
      )
    },
    {
      key: "enrolled",
      label: "Enrolled",
      render: (r) => (
        <span className="text-sm font-semibold text-slate-700">
          {r.enrolledEmployees?.length || 0}
          <span className="text-slate-400 font-normal">
            {r.maxParticipants ? ` / ${r.maxParticipants}` : ""}
          </span>
        </span>
      )
    },
    {
      key: "status",
      label: "Status",
      render: (r) => <Badge variant={statusVariant[r.status] || "neutral"}>{r.status || "upcoming"}</Badge>
    },
    {
      key: "actions",
      label: "Actions",
      render: (r) => (
        <div className="flex items-center gap-1">
          {/* Edit Button */}
          <button
            onClick={() => handleOpenEdit(r)}
            className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 p-2 rounded-xl transition-all group"
            title="Edit Program"
          >
            <Edit3 size={16} className="group-hover:scale-110 transition-transform" />
          </button>
          {/* Delete Button */}
          <button
            onClick={() => handleDelete(r._id || r.id)}
            className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-2 rounded-xl transition-all group"
            title="Delete Program"
          >
            <Trash2 size={16} className="group-hover:scale-110 transition-transform" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 font-sans">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <MonitorPlay className="text-indigo-600" size={28} />
            Training Programs
          </h1>
          <p className="text-sm text-slate-500 mt-1.5">
            Manage, create, edit, and track all company training sessions seamlessly.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={fetchData}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 text-sm font-semibold rounded-xl border border-slate-200 hover:border-indigo-200 transition-all shadow-sm cursor-pointer"
            title="Refresh List"
          >
            <RefreshCw size={16} className={loading ? "animate-spin text-indigo-600" : ""} />
          </button>
          <Button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 shadow-sm hover:shadow-md transition-all flex-1 sm:flex-none justify-center bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-medium"
          >
            <Plus size={18} /> New Program
          </Button>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="animate-spin text-indigo-600" size={32} />
            <p className="text-sm text-slate-500 font-medium animate-pulse">Loading training programs...</p>
          </div>
        ) : (
          <Table
            columns={columns}
            data={trainings}
            emptyText="No training programs found. Create a new one to get started."
          />
        )}
      </div>

      {/* Create / Edit Modal Form */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? "Edit Training Program" : "Create New Training Program"}>
        <form onSubmit={handleSave} className="space-y-5 mt-2">

          {/* Title */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-1.5">
              <Type size={16} className="text-slate-400" /> Program Title
            </label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200"
              placeholder="e.g., AWS Cloud Fundamentals"
            />
          </div>

          {/* Description */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-1.5">
              <AlignLeft size={16} className="text-slate-400" /> Description
            </label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200 resize-none"
              placeholder="Briefly describe what this training covers..."
            />
          </div>

          {/* Trainer & Category Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-1.5">
                <User size={16} className="text-slate-400" /> Trainer Name
              </label>
              <input
                required
                value={form.trainer}
                onChange={(e) => setForm({ ...form, trainer: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200"
                placeholder="e.g., John Doe"
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-1.5">
                <Tag size={16} className="text-slate-400" /> Category
              </label>
              <input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200"
                placeholder="e.g., Technical, Soft Skills"
              />
            </div>
          </div>

          {/* Dates Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-1.5">
                <CalendarDays size={16} className="text-slate-400" /> Start Date
              </label>
              <input
                type="date"
                required
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200"
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-1.5">
                <CalendarDays size={16} className="text-slate-400" /> End Date
              </label>
              <input
                type="date"
                required
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200"
              />
            </div>
          </div>

          {/* Mode & Participants Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-1.5">
                <Laptop size={16} className="text-slate-400" /> Mode
              </label>
              <select
                value={form.mode}
                onChange={(e) => setForm({ ...form, mode: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200 cursor-pointer"
              >
                <option value="online">Online</option>
                <option value="offline">Offline</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-1.5">
                <Users size={16} className="text-slate-400" /> Max Participants
              </label>
              <input
                type="number"
                min="1"
                value={form.maxParticipants}
                onChange={(e) => setForm({ ...form, maxParticipants: e.target.value ? Number(e.target.value) : "" })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200"
                placeholder="e.g., 20 (Leave empty for unlimited)"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex gap-3 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setModalOpen(false)}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl font-medium transition-colors"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={submitting}
              className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 py-2.5 rounded-xl font-semibold transition-all"
            >
              {submitting ? (editingId ? 'Updating...' : 'Creating...') : (editingId ? 'Update Program' : 'Create Program')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}