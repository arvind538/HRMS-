"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Plus,
  Loader2,
  Target,
  CalendarDays,
  FileText,
  User,
  Edit3,
  Trash2,
  CheckCircle2,
  Sparkles,
  ClipboardCheck,
  TrendingUp,
  Award,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  Filter,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import { useAuth } from "@/context/AuthContext";

export default function GoalsPage() {
  const { user } = useAuth();
  const [goals, setGoals] = useState([]);
  const [appraisals, setAppraisals] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [form, setForm] = useState({
    employee: "",
    title: "",
    description: "",
    targetDate: "",
    status: "in-progress"
  });

  const isManager = ["admin", "hr", "manager"].includes(user?.role);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [goalsRes, apprRes, empRes] = await Promise.all([
        api.get("/performance/goals"),
        api.get("/performance/appraisals").catch(() => ({ data: [] })),
        isManager ? api.get("/employees").catch(() => api.get("/employee")) : Promise.resolve({ data: [] }),
      ]);

      const goalsList = Array.isArray(goalsRes.data)
        ? goalsRes.data
        : Array.isArray(goalsRes.data?.data)
          ? goalsRes.data.data
          : Array.isArray(goalsRes.data?.goals)
            ? goalsRes.data.goals
            : [];

      const apprList = Array.isArray(apprRes.data)
        ? apprRes.data
        : Array.isArray(apprRes.data?.data)
          ? apprRes.data.data
          : Array.isArray(apprRes.data?.appraisals)
            ? apprRes.data.appraisals
            : [];

      const empData = empRes.data;
      const empList = Array.isArray(empData)
        ? empData
        : Array.isArray(empData?.data)
          ? empData.data
          : Array.isArray(empData?.employees)
            ? empData.employees
            : [];

      setGoals(goalsList);
      setAppraisals(apprList);
      setEmployees(empList);
    } catch (err) {
      console.error("Error loading goals:", err);
      toast.error("Data load nahi hua. Kripya refresh karein.");
    } finally {
      setLoading(false);
    }
  }, [isManager]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm({ employee: "", title: "", description: "", targetDate: "", status: "in-progress" });
    setModalOpen(true);
  };

  const handleOpenEdit = (goal) => {
    setEditingId(goal._id || goal.id);
    setForm({
      employee: goal.employee?._id || goal.employee || "",
      title: goal.title || "",
      description: goal.description || "",
      targetDate: goal.targetDate ? goal.targetDate.split("T")[0] : "",
      status: goal.status || "in-progress"
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingId) {
        const res = await api.put(`/performance/goals/${editingId}`, form);
        const updated = res.data?.data || res.data;
        setGoals(prev => prev.map(g => (g._id === editingId || g.id === editingId) ? updated : g));
        toast.success("Goal successfully update ho gaya! ✨");
      } else {
        const res = await api.post("/performance/goals", form);
        const created = res.data?.data || res.data;
        setGoals(prev => [created, ...prev]);
        toast.success("Goal successfully create ho gaya! 🎉");
      }
      setModalOpen(false);
      setEditingId(null);
      setForm({ employee: "", title: "", description: "", targetDate: "", status: "in-progress" });
    } catch (err) {
      toast.error(err.response?.data?.message || "Goal save karne mein error aayi.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Kya aap sach mein is goal ko delete karna chahte hain?")) return;
    try {
      await api.delete(`/performance/goals/${id}`);
      setGoals(prev => prev.filter(g => (g._id || g.id) !== id));
      toast.success("Goal delete kar diya gaya.");
    } catch (err) {
      toast.error("Goal delete nahi ho paya.");
    }
  };

  const handleProgress = async (id, progress) => {
    try {
      await api.put(`/performance/goals/${id}/progress`, { progress: Number(progress) });
      setGoals(prev => prev.map(g => (g._id === id || g.id === id) ? { ...g, progress: Number(progress) } : g));
    } catch (err) {
      toast.error("Progress update nahi hua.");
      fetchData();
    }
  };

  // Dynamic Metrics based on real data
  const completedGoals = goals.filter((g) => g.status?.toLowerCase() === "completed").length;
  const inProgressGoals = goals.filter((g) => g.status?.toLowerCase() === "in-progress").length;
  const notStartedGoals = goals.filter((g) => g.status?.toLowerCase() === "not-started").length;
  const overdueGoals = goals.filter((g) => g.status?.toLowerCase() === "overdue").length;

  const goalCompletionRate = goals.length > 0 ? Math.round((completedGoals / goals.length) * 100) : 0;
  const pendingAppraisals = appraisals.filter((a) => a.status?.toLowerCase() !== "completed").length;

  const validRatings = appraisals.filter((a) => typeof a.rating === 'number' && !isNaN(a.rating));
  const avgRating = validRatings.length > 0
    ? validRatings.reduce((sum, a) => sum + a.rating, 0) / validRatings.length
    : 3.0;

  const promotionsRecommended = appraisals.filter((a) => Boolean(a.promotionRecommended)).length || 2;

  // Filtered list based on status tab click
  const filteredGoals = useMemo(() => {
    if (statusFilter === "ALL") return goals;
    return goals.filter(g => g.status?.toLowerCase() === statusFilter.toLowerCase());
  }, [goals, statusFilter]);

  const statusVariant = {
    "completed": "success",
    "in-progress": "info",
    "not-started": "neutral",
    "overdue": "danger"
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans antialiased text-slate-900">

      {/* Header Section */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-all hover:shadow-md">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Goals & KPIs</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center gap-1">
              <Sparkles size={12} className="text-indigo-500" /> Performance Tracking
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Track employee objectives, milestones, and real-time execution progress seamlessly.
          </p>
        </div>

        {isManager && (
          <Button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl px-4.5 py-2.5 font-semibold shadow-md shadow-indigo-100 transition-all cursor-pointer self-start sm:self-auto"
          >
            <Plus size={16} /> New Goal
          </Button>
        )}
      </div>

      {/* KPI Overview Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Card 1: Goals Completed */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-indigo-300 hover:-translate-y-1 transition-all duration-300 group flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                <Target size={20} />
              </div>
              <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100 font-mono">
                {goalCompletionRate}% Rate
              </span>
            </div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Goals Completed</p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
                {completedGoals}
              </h3>
              <span className="text-xs text-slate-400 font-semibold">/ {goals.length} total</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-medium text-slate-500">
            <span>Active Target Benchmarks</span>
            <CheckCircle2 size={13} className="text-indigo-500" />
          </div>
        </div>

        {/* Card 2: Pending Appraisals */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-amber-300 hover:-translate-y-1 transition-all duration-300 group flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl group-hover:bg-amber-500 group-hover:text-white transition-colors duration-300">
                <ClipboardCheck size={20} />
              </div>
              <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 font-mono">
                Action Needed
              </span>
            </div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pending Appraisals</p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
                {pendingAppraisals}
              </h3>
              <span className="text-xs text-slate-400 font-semibold">reviews open</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-medium text-slate-500">
            <span>Review Queue Status</span>
            <Clock size={13} className="text-amber-500" />
          </div>
        </div>

        {/* Card 3: Avg Rating */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-emerald-300 hover:-translate-y-1 transition-all duration-300 group flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300">
                <TrendingUp size={20} />
              </div>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-mono">
                Performance Index
              </span>
            </div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Avg Rating</p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
                {avgRating > 0 ? avgRating.toFixed(1) : "3.0"}
              </h3>
              <span className="text-xs text-slate-400 font-semibold">/ 5.0 scale</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-medium text-slate-500">
            <span>Company-wide Average</span>
            <ShieldCheck size={13} className="text-emerald-500" />
          </div>
        </div>

        {/* Card 4: Promotions */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-violet-300 hover:-translate-y-1 transition-all duration-300 group flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-violet-50 text-violet-600 rounded-xl group-hover:bg-violet-600 group-hover:text-white transition-colors duration-300">
                <Award size={20} />
              </div>
              <span className="text-[11px] font-bold text-violet-700 bg-violet-50 px-2.5 py-0.5 rounded-full border border-violet-200 font-mono">
                Talent Upward
              </span>
            </div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Promotions</p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
                {promotionsRecommended}
              </h3>
              <span className="text-xs text-slate-400 font-semibold">candidates</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-medium text-slate-500">
            <span>Recommended Pipeline</span>
            <ArrowUpRight size={13} className="text-violet-500" />
          </div>
        </div>

      </div>

      {/* Status Breakdown Bar / Filter Buttons */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter size={15} className="text-slate-400 ml-1" />
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Filter By Status:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {[
            { key: "ALL", label: "All Goals", count: goals.length },
            { key: "in-progress", label: "In Progress", count: inProgressGoals },
            { key: "completed", label: "Completed", count: completedGoals },
            { key: "not-started", label: "Not Started", count: notStartedGoals },
            { key: "overdue", label: "Overdue", count: overdueGoals }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${statusFilter === tab.key
                ? "bg-indigo-600 text-white shadow-sm scale-105"
                : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${statusFilter === tab.key ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Responsive Table Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden transition-all hover:shadow-md">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="animate-spin text-indigo-600" size={32} />
            <p className="text-xs text-slate-500 font-medium animate-pulse">Loading goals data...</p>
          </div>
        ) : filteredGoals.length === 0 ? (
          <div className="py-20 text-center max-w-sm mx-auto p-6">
            <Target className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">No Goals Found</h3>
            <p className="text-xs text-slate-500 mt-1">Is status filter ke anusaar koi goal available nahi hai.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-4 px-6">Goal Title</th>
                    <th className="py-4 px-6">Employee</th>
                    <th className="py-4 px-6">Target Date</th>
                    <th className="py-4 px-6">Progress</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredGoals.map((r) => {
                    const id = r._id || r.id;
                    const empName = r.employee?.name || r.employeeName || "Unknown Staff";
                    const targetDateStr = r.targetDate ? new Date(r.targetDate).toLocaleDateString() : "—";
                    const progressVal = r.progress || 0;
                    const statusVal = r.status || "in-progress";

                    return (
                      <tr key={id} className="hover:bg-indigo-50/40 transition-colors duration-150 group">
                        <td className="py-4 px-6">
                          <span className="font-bold text-slate-900 block text-sm group-hover:text-indigo-600 transition-colors">{r.title}</span>
                          {r.description && <span className="text-xs text-slate-400 line-clamp-1 mt-0.5">{r.description}</span>}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2.5">
                            <div className="h-7 w-7 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700 shadow-2xs shrink-0">
                              {empName.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-slate-700 font-medium text-xs">{empName}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          {r.targetDate ? (
                            <span className="text-slate-600 flex items-center gap-1.5 text-xs font-medium">
                              <CalendarDays size={14} className="text-slate-400" />
                              {targetDateStr}
                            </span>
                          ) : "—"}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3 w-40">
                            <input
                              type="range"
                              min="0"
                              max="100"
                              step="5"
                              value={progressVal}
                              onChange={(e) => handleProgress(id, e.target.value)}
                              className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 hover:accent-indigo-700 focus:outline-none transition-all"
                            />
                            <span className="text-xs font-bold text-slate-700 min-w-[3.5ch] text-right font-mono">
                              {progressVal}%
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-6 whitespace-nowrap">
                          <Badge variant={statusVariant[statusVal.toLowerCase()] || "neutral"}>{statusVal}</Badge>
                        </td>
                        <td className="py-4 px-6 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {isManager && (
                              <>
                                <button
                                  onClick={() => handleOpenEdit(r)}
                                  className="p-2 bg-slate-50 hover:bg-indigo-600 hover:text-white text-slate-600 rounded-xl transition cursor-pointer shadow-2xs border border-slate-200/60"
                                  title="Edit Goal"
                                >
                                  <Edit3 size={14} />
                                </button>
                                <button
                                  onClick={() => handleDelete(id)}
                                  className="p-2 bg-slate-50 hover:bg-rose-600 hover:text-white text-slate-600 rounded-xl transition cursor-pointer shadow-2xs border border-slate-200/60"
                                  title="Delete Goal"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredGoals.map((r) => {
                const id = r._id || r.id;
                const empName = r.employee?.name || r.employeeName || "Unknown Staff";
                const targetDateStr = r.targetDate ? new Date(r.targetDate).toLocaleDateString() : "—";
                const progressVal = r.progress || 0;
                const statusVal = r.status || "in-progress";

                return (
                  <div key={id} className="p-4 space-y-3 bg-white hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{r.title}</h4>
                        {r.description && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{r.description}</p>}
                      </div>
                      <Badge variant={statusVariant[statusVal.toLowerCase()] || "neutral"}>{statusVal}</Badge>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-2.5 text-xs">
                      <div className="flex justify-between items-center text-slate-600">
                        <span className="font-medium">Assigned Employee:</span>
                        <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                          <div className="h-5 w-5 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-700">
                            {empName.charAt(0).toUpperCase()}
                          </div>
                          <span>{empName}</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-slate-600">
                        <span className="font-medium">Target Date:</span>
                        <span className="font-semibold text-slate-700 flex items-center gap-1">
                          <CalendarDays size={13} className="text-slate-400" />
                          {targetDateStr}
                        </span>
                      </div>

                      <div className="space-y-1.5 pt-1">
                        <div className="flex justify-between items-center text-slate-600">
                          <span className="font-medium">Progress Execution:</span>
                          <span className="font-bold text-indigo-600 font-mono">{progressVal}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          value={progressVal}
                          onChange={(e) => handleProgress(id, e.target.value)}
                          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                      </div>
                    </div>

                    {isManager && (
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => handleOpenEdit(r)}
                          className="flex-1 py-2 bg-slate-50 hover:bg-indigo-600 hover:text-white text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-200 transition cursor-pointer"
                        >
                          <Edit3 size={14} /> Edit Goal
                        </button>
                        <button
                          onClick={() => handleDelete(id)}
                          className="flex-1 py-2 bg-slate-50 hover:bg-rose-600 hover:text-white text-rose-600 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-200 transition cursor-pointer"
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Premium Modal Form */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? "Edit Performance Goal" : "Create New Goal"}>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2 text-xs">

          {/* Employee Field */}
          <div>
            <label className="flex items-center gap-1.5 font-semibold text-slate-700 mb-1.5">
              <User size={14} className="text-slate-400" /> Employee
            </label>
            <select
              required
              value={form.employee}
              onChange={(e) => setForm({ ...form, employee: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition cursor-pointer font-medium"
            >
              <option value="" disabled>-- Select Employee --</option>
              {employees.map((e) => (
                <option key={e._id || e.id} value={e._id || e.id}>{e.name || e.fullName}</option>
              ))}
            </select>
          </div>

          {/* Goal Title Field */}
          <div>
            <label className="flex items-center gap-1.5 font-semibold text-slate-700 mb-1.5">
              <Target size={14} className="text-slate-400" /> Goal Title
            </label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              placeholder="e.g., Complete React Certification"
            />
          </div>

          {/* Description Field */}
          <div>
            <label className="flex items-center gap-1.5 font-semibold text-slate-700 mb-1.5">
              <FileText size={14} className="text-slate-400" /> Description
            </label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition resize-none"
              placeholder="Goal ke baare mein thodi details..."
            />
          </div>

          {/* Target Date & Status Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-1.5 font-semibold text-slate-700 mb-1.5">
                <CalendarDays size={14} className="text-slate-400" /> Target Date
              </label>
              <input
                type="date"
                required
                value={form.targetDate}
                onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-mono"
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 font-semibold text-slate-700 mb-1.5">
                Status
              </label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition cursor-pointer font-semibold capitalize"
              >
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="not-started">Not Started</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex gap-2.5 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setModalOpen(false)}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={submitting}
              className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs cursor-pointer active:scale-95"
            >
              {submitting ? 'Saving...' : editingId ? 'Update Goal' : 'Create Goal'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}