"use client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, Star, Award, Calendar, ShieldAlert } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Badge from "@/components/ui/Badge";
import { useAuth } from "@/context/AuthContext";

export default function MyPerformancePage() {
  const { user } = useAuth();
  const [appraisals, setAppraisals] = useState([]);
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
      const { data } = await api.get("/performance/appraisals", { params: { employee: empId } });
      setAppraisals(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Appraisals fetch error:", err);
      toast.error("Failed to load performance appraisals.");
    } finally {
      setLoading(false);
    }
  }, [getEmployeeId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const statusVariant = {
    completed: "success",
    pending: "warning",
    in_progress: "info",
    rejected: "danger"
  };

  const empId = getEmployeeId();

  if (loading) {
    return (
      <div className="py-24 text-center">
        <Loader2 className="animate-spin mx-auto text-indigo-600 h-8 w-8" />
        <p className="text-sm text-slate-400 mt-2">Loading performance records...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Performance</h1>
        <p className="text-sm text-slate-500 mt-1">View your appraisal history, feedback, and performance ratings.</p>
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

      {appraisals.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center space-y-3 shadow-sm transition-all duration-200">
          <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto text-slate-300">
            <Award size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-600">No performance appraisal records found yet.</p>
            <p className="text-xs text-slate-400 mt-0.5">When HR or your manager publishes your appraisal, it will appear here.</p>
          </div>
        </div>
      ) : (
        /* Appraisals List with Smooth Hover Effects */
        <div className="space-y-4">
          {appraisals.map((a) => (
            <div
              key={a._id}
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all duration-200 hover:shadow-md hover:border-indigo-200 group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-100 transition-all duration-200">
                    <Calendar size={18} />
                  </div>
                  <h4 className="font-bold text-slate-900 text-base group-hover:text-indigo-600 transition-colors">
                    {a.reviewPeriod || "Performance Review"}
                  </h4>
                </div>

                <div className="flex items-center gap-3">
                  <Badge variant={statusVariant[a.status] || "neutral"}>
                    {a.status ? a.status.replace(/_/g, " ") : "Pending"}
                  </Badge>

                  {a.rating && (
                    <div className="flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                      <Star size={14} className="fill-amber-400 text-amber-400" />
                      <span className="text-xs font-bold text-amber-800">{a.rating}/5</span>
                    </div>
                  )}
                </div>
              </div>

              {a.status === "completed" ? (
                <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="bg-slate-50/60 p-3.5 rounded-xl border border-slate-100">
                    <p className="font-semibold text-slate-800 mb-1">Key Strengths:</p>
                    <p className="text-slate-600 leading-relaxed">{a.strengths || "No specific feedback provided."}</p>
                  </div>
                  <div className="bg-slate-50/60 p-3.5 rounded-xl border border-slate-100">
                    <p className="font-semibold text-slate-800 mb-1">Areas of Improvement:</p>
                    <p className="text-slate-600 leading-relaxed">{a.areasOfImprovement || "No specific areas listed."}</p>
                  </div>
                </div>
              ) : (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-xs text-amber-600 font-medium flex items-center gap-1.5">
                    <span>Review Status:</span> <span className="capitalize">{a.status ? a.status.replace(/_/g, " ") : "Under Review"}</span>
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}