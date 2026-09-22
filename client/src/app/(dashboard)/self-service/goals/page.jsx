"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Loader2,
  Target,
  Calendar,
  ShieldAlert,
  TrendingUp,
  RefreshCw,
  Clock,
  Sparkles,
  Sliders,
  X,
  CheckCircle2,
  AlertCircle,
  FileText,
  Flag,
  UserCheck,
  ChevronRight
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Badge from "@/components/ui/Badge";
import { useAuth } from "@/context/AuthContext";

export default function MyGoalsPage() {
  const { user } = useAuth();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [selectedGoal, setSelectedGoal] = useState(null);

  // Safe resolver for Employee or User ID
  const employeeId = useMemo(() => {
    return (
      user?.employee?._id ||
      user?.employee?.id ||
      (typeof user?.employee === "string" ? user?.employee : null) ||
      user?._id ||
      user?.id ||
      null
    );
  }, [user]);

  // Deep unwrapper for multiple backend response standards
  const extractList = useCallback((resData) => {
    if (!resData) return [];
    if (Array.isArray(resData)) return resData;
    if (Array.isArray(resData?.data)) return resData.data;
    if (Array.isArray(resData?.data?.docs)) return resData.data.docs;
    if (Array.isArray(resData?.data?.records)) return resData.data.records;
    if (Array.isArray(resData?.goals)) return resData.goals;
    if (Array.isArray(resData?.records)) return resData.records;
    if (Array.isArray(resData?.docs)) return resData.docs;
    if (Array.isArray(resData?.result)) return resData.result;
    return [];
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let records = [];

      // 1. Direct personal goal endpoints
      const directEndpoints = [
        "/performance/my-goals",
        "/performance/goals/me",
        "/performance/me/goals",
      ];

      for (const endpoint of directEndpoints) {
        try {
          const res = await api.get(endpoint);
          const parsed = extractList(res.data);
          if (parsed && parsed.length > 0) {
            records = parsed;
            break;
          }
        } catch {
          // Continue
        }
      }

      // 2. Query with Employee / User ID
      if (records.length === 0 && employeeId) {
        const queryEndpoints = [
          { url: "/performance/goals", params: { employee: employeeId } },
          { url: "/performance/goals", params: { employeeId: employeeId } },
          { url: "/performance/goals", params: { user: employeeId } },
        ];

        for (const item of queryEndpoints) {
          try {
            const res = await api.get(item.url, { params: item.params });
            const parsed = extractList(res.data);
            if (parsed && parsed.length > 0) {
              records = parsed;
              break;
            }
          } catch {
            // Continue
          }
        }
      }

      // 3. Fallback for Admin role
      if (records.length === 0 && (user?.role === "admin" || user?.role === "superadmin")) {
        try {
          const res = await api.get("/performance/goals");
          const parsed = extractList(res.data);
          if (parsed && parsed.length > 0) {
            records = parsed;
          }
        } catch {
          // No-op
        }
      }

      setGoals(records);
    } catch (err) {
      console.error("Goals fetch error:", err);
      toast.error("Failed to load performance goals.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [employeeId, extractList, user?.role]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Modal ESC key listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setSelectedGoal(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Update progress locally & keep modal synced
  const handleLocalProgressChange = (id, newProgress) => {
    const val = Number(newProgress);
    let updatedStatus = val >= 100 ? "completed" : val > 0 ? "in-progress" : "not-started";

    setGoals((prev) =>
      prev.map((g) => {
        const currentId = g._id || g.id;
        if (currentId === id) {
          return { ...g, progress: val, status: updatedStatus };
        }
        return g;
      })
    );

    setSelectedGoal((prev) => {
      if (prev && (prev._id === id || prev.id === id)) {
        return { ...prev, progress: val, status: updatedStatus };
      }
      return prev;
    });
  };

  // Sync to backend on pointer release
  const handleProgressCommit = async (id, finalProgress) => {
    setUpdatingId(id);
    try {
      try {
        await api.put(`/performance/goals/${id}/progress`, { progress: Number(finalProgress) });
      } catch {
        await api.put(`/performance/goals/${id}`, { progress: Number(finalProgress) });
      }
      toast.success("Progress saved successfully!");
    } catch (err) {
      console.error("Progress update error:", err);
      toast.error("Failed to sync progress with server.");
      fetchData();
    } finally {
      setUpdatingId(null);
    }
  };

  const statusVariant = {
    completed: "success",
    "in-progress": "info",
    in_progress: "info",
    "not-started": "neutral",
    not_started: "neutral",
    pending: "warning",
    overdue: "danger",
  };

  const priorityColor = {
    high: "bg-red-50 text-red-700 border-red-200",
    medium: "bg-amber-50 text-amber-700 border-amber-200",
    low: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };

  if (loading && !isRefreshing) {
    return (
      <div className="py-24 text-center">
        <Loader2 className="animate-spin mx-auto text-indigo-600 h-8 w-8" />
        <p className="text-sm text-slate-400 mt-2 font-medium">Loading your performance goals...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-14 px-4 sm:px-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-2xl text-white shadow-md shadow-indigo-100 shrink-0">
            <Target size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Goals</h1>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                <Sparkles size={12} /> Target Tracking
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Click any goal to view full evaluation details, timeline, and key deliverables.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => {
              setIsRefreshing(true);
              fetchData();
            }}
            disabled={isRefreshing}
            className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200/70 rounded-xl text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 active:scale-95 disabled:opacity-50 cursor-pointer"
            title="Refresh goals"
          >
            <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Sync</span>
          </button>
          <div className="text-xs font-semibold text-slate-600 bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-200/70">
            Total Goals: <span className="text-indigo-600 font-bold">{goals.length}</span>
          </div>
        </div>
      </div>

      {/* Session Warning Banner */}
      {!employeeId && goals.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 text-amber-800">
          <ShieldAlert size={20} className="text-amber-600 shrink-0" />
          <p className="text-sm">
            <strong className="font-semibold">Session Warning:</strong> Employee profile link not found for this account.
          </p>
        </div>
      )}

      {goals.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-2xl border border-slate-200/80 p-16 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 bg-gradient-to-tr from-indigo-50 to-slate-50 rounded-2xl flex items-center justify-center mx-auto text-indigo-400 border border-indigo-100/50 shadow-xs">
            <Target size={30} />
          </div>
          <div className="max-w-md mx-auto">
            <p className="text-base font-bold text-slate-800">No performance goals assigned yet</p>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              When managers or leadership assign performance goals to your cycle, they will be manageable here.
            </p>
          </div>
          <button
            onClick={() => {
              setIsRefreshing(true);
              fetchData();
            }}
            className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-xl transition-colors cursor-pointer"
          >
            <RefreshCw size={12} className={isRefreshing ? "animate-spin" : ""} />
            Sync Goals
          </button>
        </div>
      ) : (
        /* Goals Grid List */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map((g, idx) => {
            const goalId = g._id || g.id || idx;
            const progress = Number(g.progress || 0);
            const statusKey = (g.status || "not-started").toLowerCase();
            const isSelected = (selectedGoal?._id || selectedGoal?.id) === goalId;

            return (
              <div
                key={goalId}
                onClick={() => setSelectedGoal(g)}
                tabIndex={0}
                role="button"
                onKeyDown={(e) => e.key === "Enter" && setSelectedGoal(g)}
                className={`group relative bg-white p-6 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between outline-hidden
                  ${isSelected
                    ? "border-indigo-600 ring-2 ring-indigo-500/15 shadow-md bg-indigo-50/10"
                    : "border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-lg hover:shadow-indigo-500/5 hover:border-indigo-300 hover:-translate-y-1 active:scale-[0.99]"
                  }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-200">
                        <TrendingUp size={16} />
                      </div>
                      <h4 className="font-bold text-slate-900 text-base group-hover:text-indigo-600 transition-colors line-clamp-1">
                        {g.title || g.name || "Untitled Goal"}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant={statusVariant[statusKey] || "neutral"}>
                        {String(g.status || "pending").replace(/[-_]/g, " ")}
                      </Badge>
                      <ChevronRight size={16} className="text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 mb-6 line-clamp-3 leading-relaxed">
                    {g.description || "No specific guidelines or description provided for this target."}
                  </p>
                </div>

                <div className="space-y-4 pt-2">
                  {/* Interactive Progress Slider (Stop propagation so click won't re-trigger modal) */}
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="space-y-2 bg-slate-50/70 p-4 rounded-xl border border-slate-100 group-hover:border-indigo-100 group-hover:bg-indigo-50/20 transition-all duration-200"
                  >
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <Sliders size={13} className="text-indigo-600" />
                        Completion
                      </span>
                      <div className="flex items-center gap-1.5">
                        {updatingId === goalId && (
                          <Loader2 size={12} className="animate-spin text-indigo-600" />
                        )}
                        <span className="text-indigo-600 font-bold text-sm">{progress}%</span>
                      </div>
                    </div>

                    <div className="relative flex items-center">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={progress}
                        onChange={(e) => handleLocalProgressChange(goalId, e.target.value)}
                        onMouseUp={(e) => handleProgressCommit(goalId, e.currentTarget.value)}
                        onTouchEnd={(e) => handleProgressCommit(goalId, e.currentTarget.value)}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* Meta Footer */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Clock size={13} className="text-slate-400" /> Due Date
                    </span>
                    <span className="font-semibold text-slate-700 flex items-center gap-1">
                      <Calendar size={13} className="text-indigo-500" />
                      {g.targetDate || g.dueDate || g.endDate
                        ? new Date(g.targetDate || g.dueDate || g.endDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                        : "No deadline"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Center Details Modal */}
      {selectedGoal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setSelectedGoal(null)}
        >
          <div
            className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between bg-gradient-to-b from-slate-50/80 to-white">
              <div className="flex items-start gap-3.5 pr-4">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100 shadow-2xs shrink-0">
                  <Target size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge variant={statusVariant[(selectedGoal.status || "not-started").toLowerCase()] || "neutral"}>
                      {String(selectedGoal.status || "Pending").replace(/[-_]/g, " ")}
                    </Badge>
                    {selectedGoal.priority && (
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${priorityColor[selectedGoal.priority.toLowerCase()] || "bg-slate-100 text-slate-700"
                          }`}
                      >
                        <Flag size={10} className="inline mr-1" />
                        {selectedGoal.priority} Priority
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 leading-tight">
                    {selectedGoal.title || selectedGoal.name || "Goal Overview"}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedGoal(null)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-sm">
              {/* Progress Bar Banner */}
              <div className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp size={14} className="text-indigo-600" /> Current Achievement
                  </span>
                  <span className="text-lg font-black text-indigo-600">{selectedGoal.progress || 0}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(0, selectedGoal.progress || 0))}%` }}
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
                  <FileText size={14} className="text-indigo-500" />
                  <span>Objective & Target Summary</span>
                </div>
                <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-100 text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {selectedGoal.description || "No full description provided for this milestone."}
                </div>
              </div>

              {/* Timeline Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 bg-slate-50/70 border border-slate-100 rounded-xl">
                  <span className="text-[11px] font-semibold text-slate-400 block mb-1 flex items-center gap-1">
                    <Calendar size={13} className="text-slate-400" /> Start Date
                  </span>
                  <span className="text-xs sm:text-sm font-semibold text-slate-800">
                    {selectedGoal.startDate || selectedGoal.createdAt
                      ? new Date(selectedGoal.startDate || selectedGoal.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                      : "Not designated"}
                  </span>
                </div>

                <div className="p-3.5 bg-indigo-50/40 border border-indigo-100 rounded-xl">
                  <span className="text-[11px] font-semibold text-indigo-500 block mb-1 flex items-center gap-1">
                    <Clock size={13} className="text-indigo-600" /> Target / Due Date
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-indigo-950">
                    {selectedGoal.targetDate || selectedGoal.dueDate || selectedGoal.endDate
                      ? new Date(selectedGoal.targetDate || selectedGoal.dueDate || selectedGoal.endDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                      : "Open-ended"}
                  </span>
                </div>
              </div>

              {/* Reviewer / Evaluator (if available) */}
              {(selectedGoal.reviewer || selectedGoal.manager || selectedGoal.assignedBy) && (
                <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-2.5 text-xs text-slate-700">
                  <UserCheck size={16} className="text-indigo-600 shrink-0" />
                  <span>Assigned / Monitored by:</span>
                  <strong className="font-semibold text-slate-900">
                    {selectedGoal.reviewer?.name ||
                      selectedGoal.manager?.name ||
                      selectedGoal.assignedBy?.name ||
                      selectedGoal.assignedBy ||
                      "Department Lead"}
                  </strong>
                </div>
              )}

              {/* Key Deliverables / Milestones (if schema has milestones or metrics) */}
              {Array.isArray(selectedGoal.milestones) && selectedGoal.milestones.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-600" /> Key Milestones
                  </span>
                  <div className="space-y-1.5">
                    {selectedGoal.milestones.map((m, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                        <span className="text-slate-700">{typeof m === "string" ? m : m.title || m.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedGoal(null)}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-100 active:scale-95 transition-all shadow-2xs cursor-pointer"
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