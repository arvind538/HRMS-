"use client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, Target, Calendar, ShieldAlert } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Badge from "@/components/ui/Badge";
import { useAuth } from "@/context/AuthContext";

export default function MyGoalsPage() {
  const { user } = useAuth();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Safe helper function to extract employee ID (handles multiple formats)
  const getEmployeeId = useCallback(() => {
    return user?.employee?._id || user?.employee || user?._id || user?.id;
  }, [user]);

  const fetchData = useCallback(async () => {
    const empId = getEmployeeId();
    if (!empId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.get("/performance/goals", { params: { employee: empId } });
      setGoals(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Goals fetch error:", err);
      toast.error("Failed to load goals.");
    } finally {
      setLoading(false);
    }
  }, [getEmployeeId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleProgress = async (id, progress) => {
    try {
      await api.put(`/performance/goals/${id}/progress`, { progress: Number(progress) });
      // Optimistically update the state for instant UI feedback
      setGoals((prev) =>
        prev.map((g) => (g._id === id ? { ...g, progress: Number(progress) } : g))
      );
      toast.success("Goal progress updated successfully!");
    } catch (err) {
      console.error("Progress update error:", err);
      toast.error("Failed to update progress.");
    }
  };

  const statusVariant = {
    completed: "success",
    "in-progress": "info",
    "not-started": "neutral",
    overdue: "danger"
  };

  const empId = getEmployeeId();

  if (loading) {
    return (
      <div className="py-24 text-center">
        <Loader2 className="animate-spin mx-auto text-indigo-600 h-8 w-8" />
        <p className="text-sm text-slate-400 mt-2">Loading your goals...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Goals</h1>
        <p className="text-sm text-slate-500 mt-1">Track and update your performance goals and progress seamlessly.</p>
      </div>

      {/* Session Warning Banner */}
      {!empId && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 text-amber-800">
          <ShieldAlert size={20} className="text-amber-600 shrink-0" />
          <p className="text-sm">
            <strong className="font-semibold">Session Warning:</strong> Employee details not found. Please ensure you are logged into the correct account.
          </p>
        </div>
      )}

      {goals.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center space-y-3 shadow-sm transition-all duration-200">
          <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto text-slate-300">
            <Target size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-600">No performance goals assigned yet.</p>
            <p className="text-xs text-slate-400 mt-0.5">When goals are assigned to your profile, they will appear here.</p>
          </div>
        </div>
      ) : (
        /* Goals List with Smooth Hover Effects */
        <div className="space-y-4">
          {goals.map((g) => (
            <div
              key={g._id}
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all duration-200 hover:shadow-md hover:border-indigo-200 group"
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-slate-900 text-base group-hover:text-indigo-600 transition-colors">
                  {g.title}
                </h4>
                <Badge variant={statusVariant[g.status] || "neutral"}>
                  {g.status ? g.status.replace(/-/g, " ") : "Pending"}
                </Badge>
              </div>

              <p className="text-xs text-slate-500 mb-5 leading-relaxed">
                {g.description || "No description provided for this goal."}
              </p>

              {/* Progress Slider Section */}
              <div className="space-y-2 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>Progress Percentage</span>
                  <span className="text-indigo-600 font-bold text-sm">{g.progress || 0}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={g.progress || 0}
                  onChange={(e) => handleProgress(g._id, e.target.value)}
                  className="w-full accent-indigo-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                />
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Calendar size={13} className="text-indigo-600" /> Target Date
                </span>
                <span className="font-semibold text-slate-700">
                  {g.targetDate ? new Date(g.targetDate).toLocaleDateString() : "No target date set"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}