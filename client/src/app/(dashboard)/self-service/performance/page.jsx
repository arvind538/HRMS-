"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Loader2,
  Star,
  Award,
  Calendar,
  ChevronRight,
  X,
  Target,
  UserCheck,
  MessageSquare,
  ThumbsUp,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Badge from "@/components/ui/Badge";
import { useAuth } from "@/context/AuthContext";

export default function MyPerformancePage() {
  const { user } = useAuth();
  const [appraisals, setAppraisals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppraisal, setSelectedAppraisal] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Safe helper function to extract employee ID from various common structures
  const employeeId = useMemo(() => {
    return (
      user?.employee?._id ||
      user?.employee?.id ||
      (typeof user?.employee === "string" ? user?.employee : null) ||
      user?._id ||
      user?.id ||
      user?.userId ||
      null
    );
  }, [user]);

  // Deep unwrapper to handle almost any standard backend API response format
  const extractList = useCallback((resData) => {
    if (!resData) return [];
    if (Array.isArray(resData)) return resData;
    if (Array.isArray(resData?.data)) return resData.data;
    if (Array.isArray(resData?.data?.docs)) return resData.data.docs;
    if (Array.isArray(resData?.data?.records)) return resData.data.records;
    if (Array.isArray(resData?.docs)) return resData.docs;
    if (Array.isArray(resData?.records)) return resData.records;
    if (Array.isArray(resData?.appraisals)) return resData.appraisals;
    if (Array.isArray(resData?.reviews)) return resData.reviews;
    if (Array.isArray(resData?.result)) return resData.result;
    if (Array.isArray(resData?.performance)) return resData.performance;
    return [];
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let records = [];

      // 1. Direct Self-Service personal endpoints (Cookie / Bearer Token identifies user)
      const personalEndpoints = [
        "/performance/my-appraisals",
        "/performance/my-reviews",
        "/performance/me",
        "/performance-appraisals/my",
      ];

      for (const endpoint of personalEndpoints) {
        try {
          const res = await api.get(endpoint);
          const parsed = extractList(res.data);
          if (parsed && parsed.length > 0) {
            records = parsed;
            break;
          }
        } catch {
          // Continue to next probe
        }
      }

      // 2. Query by Employee/User ID if not found via direct me endpoints
      if (records.length === 0 && employeeId) {
        const queryEndpoints = [
          { url: "/performance/appraisals", params: { employee: employeeId } },
          { url: "/performance/appraisals", params: { user: employeeId } },
          { url: "/performance/reviews", params: { employee: employeeId } },
          { url: "/performance", params: { employee: employeeId } },
          { url: "/performance-appraisals", params: { employee: employeeId } },
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

      // 3. Fallback for Super Admin / Admin role (load all and filter if needed)
      if (records.length === 0 && (user?.role === "admin" || user?.role === "superadmin")) {
        try {
          const res = await api.get("/performance/appraisals");
          const parsed = extractList(res.data);
          if (parsed && parsed.length > 0) {
            records = parsed;
          }
        } catch {
          // No-op
        }
      }

      setAppraisals(records);
    } catch (err) {
      console.error("Appraisals fetch error:", err);
      toast.error("Unable to sync performance records.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [employeeId, extractList, user?.role]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Modal ESC handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setSelectedAppraisal(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };

  const statusVariant = {
    completed: "success",
    approved: "success",
    published: "success",
    pending: "warning",
    in_progress: "info",
    under_review: "info",
    rejected: "danger",
  };

  const getRating = (item) => {
    const val = item?.rating ?? item?.overallRating ?? item?.score ?? item?.finalScore;
    if (val === undefined || val === null) return null;
    return typeof val === "number" ? val.toFixed(1) : val;
  };

  const getPeriod = (item) => {
    return (
      item?.reviewPeriod ||
      item?.period ||
      item?.cycle ||
      item?.title ||
      (item?.year ? `${item.year} Annual Appraisal` : "Periodic Performance Appraisal")
    );
  };

  if (loading && !isRefreshing) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center space-y-3">
        <div className="relative">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
            <Loader2 className="animate-spin text-indigo-600 h-6 w-6" />
          </div>
        </div>
        <p className="text-sm font-semibold text-slate-600">Loading your appraisals...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 px-4 sm:px-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-2xl text-white shadow-md shadow-indigo-100 shrink-0">
            <Award size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Performance</h1>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <CheckCircle2 size={12} /> Active Cycle
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Track periodic evaluation cycles, manager feedback, ratings, and career milestones.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200/70 rounded-xl text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 active:scale-95 disabled:opacity-50 cursor-pointer"
            title="Refresh records"
          >
            <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Sync</span>
          </button>
          <div className="text-xs font-semibold text-slate-600 bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-200/70">
            Appraisal Reviews: <span className="text-indigo-600 font-bold">{appraisals.length}</span>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {appraisals.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-16 text-center space-y-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <div className="w-16 h-16 bg-gradient-to-tr from-indigo-50 to-slate-50 rounded-2xl flex items-center justify-center mx-auto text-indigo-400 border border-indigo-100/50 shadow-xs">
            <Award size={30} />
          </div>
          <div className="max-w-md mx-auto">
            <p className="text-base font-bold text-slate-800">No appraisal records published yet</p>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              When management evaluates and submits your periodic performance review, it will automatically appear here.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={handleManualRefresh}
              className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-xl transition-colors cursor-pointer"
            >
              <RefreshCw size={12} className={isRefreshing ? "animate-spin" : ""} />
              Check again
            </button>
          </div>
        </div>
      ) : (
        /* Performance Feed Cards */
        <div className="space-y-3.5">
          {appraisals.map((a, idx) => {
            const ratingVal = getRating(a);
            const periodVal = getPeriod(a);
            const statusVal = a.status || a.state || "completed";
            const isSelected = selectedAppraisal?._id === a._id;

            return (
              <div
                key={a._id || a.id || idx}
                onClick={() => setSelectedAppraisal(a)}
                tabIndex={0}
                role="button"
                onKeyDown={(e) => e.key === "Enter" && setSelectedAppraisal(a)}
                className={`group relative bg-white p-5 sm:p-6 rounded-2xl border transition-all duration-200 cursor-pointer outline-hidden
                  ${isSelected
                    ? "border-indigo-600 ring-2 ring-indigo-500/15 shadow-md bg-indigo-50/10"
                    : "border-slate-200/90 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-500/5 hover:-translate-y-0.5 active:scale-[0.99]"
                  }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-50 text-indigo-600 rounded-2xl border border-slate-100 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-transparent group-hover:shadow-md group-hover:shadow-indigo-200 transition-all duration-200 shrink-0">
                      <TrendingUp size={22} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-base group-hover:text-indigo-600 transition-colors">
                        {periodVal}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                        <Calendar size={13} className="text-slate-400" />
                        Reviewed on:{" "}
                        <span className="text-slate-600 font-medium">
                          {a.reviewDate || a.createdAt || a.date
                            ? new Date(a.reviewDate || a.createdAt || a.date).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                            : "Recent Cycle"}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <Badge variant={statusVariant[statusVal?.toLowerCase()] || "neutral"}>
                      {String(statusVal).replace(/_/g, " ")}
                    </Badge>

                    {ratingVal !== null && (
                      <div className="flex items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200/80 shadow-2xs">
                        <Star size={14} className="fill-amber-400 text-amber-400" />
                        <span className="text-xs font-black text-amber-900">{ratingVal}/5.0</span>
                      </div>
                    )}

                    <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white group-hover:translate-x-0.5 transition-all shadow-2xs">
                      <ChevronRight size={16} />
                    </div>
                  </div>
                </div>

                {/* Quick Feedback Preview */}
                {(a.strengths || a.feedback || a.managerComment || a.comments) && (
                  <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-start gap-2.5 text-xs text-slate-600">
                    <MessageSquare size={14} className="text-indigo-500 shrink-0 mt-0.5" />
                    <p className="line-clamp-2 italic font-normal">
                      &ldquo;{a.strengths || a.feedback || a.managerComment || a.comments}&rdquo;
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Detailed Modal */}
      {selectedAppraisal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setSelectedAppraisal(null)}
        >
          <div
            className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white border border-slate-200/80 rounded-xl text-indigo-600 shadow-2xs">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">
                    {getPeriod(selectedAppraisal)}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Evaluation summary & feedback</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAppraisal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-sm">
              {/* Scorecard Header */}
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-indigo-50/30 border border-slate-200/70 rounded-2xl">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Score Achieved
                  </span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Star size={20} className="fill-amber-400 text-amber-400" />
                    <span className="text-2xl font-black text-slate-900">
                      {getRating(selectedAppraisal) || "N/A"}
                    </span>
                    <span className="text-xs font-semibold text-slate-400 self-end mb-1">/ 5.0</span>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={statusVariant[selectedAppraisal.status?.toLowerCase()] || "neutral"}>
                    {String(selectedAppraisal.status || "Completed").replace(/_/g, " ")}
                  </Badge>
                  <p className="text-[11px] text-slate-400 mt-1 font-medium">
                    {selectedAppraisal.reviewDate || selectedAppraisal.createdAt
                      ? new Date(selectedAppraisal.reviewDate || selectedAppraisal.createdAt).toLocaleDateString()
                      : ""}
                  </p>
                </div>
              </div>

              {/* Reviewer Meta */}
              {(selectedAppraisal.reviewer || selectedAppraisal.evaluator || selectedAppraisal.manager) && (
                <div className="p-3.5 bg-indigo-50/50 border border-indigo-100 rounded-xl flex items-center gap-2.5 text-indigo-950 text-xs">
                  <UserCheck size={16} className="text-indigo-600 shrink-0" />
                  <span>Evaluated by:</span>
                  <strong className="font-semibold text-slate-900">
                    {selectedAppraisal.reviewer?.name ||
                      selectedAppraisal.reviewer?.fullName ||
                      selectedAppraisal.reviewer ||
                      selectedAppraisal.manager?.name ||
                      "Leadership Team"}
                  </strong>
                </div>
              )}

              {/* Strengths */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700">
                  <ThumbsUp size={14} />
                  <span>Key Strengths & Wins</span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs text-slate-700 leading-relaxed">
                  {selectedAppraisal.strengths || selectedAppraisal.achievements || "No specific strengths highlighted."}
                </div>
              </div>

              {/* Areas of Improvement */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-700">
                  <AlertTriangle size={14} />
                  <span>Areas of Focus & Improvement</span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs text-slate-700 leading-relaxed">
                  {selectedAppraisal.areasOfImprovement ||
                    selectedAppraisal.improvements ||
                    "No critical gaps highlighted for this cycle."}
                </div>
              </div>

              {/* Goals */}
              {(selectedAppraisal.goals || selectedAppraisal.targets) && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-700">
                    <Target size={14} />
                    <span>Future Objectives</span>
                  </div>
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs text-slate-700 leading-relaxed">
                    {typeof selectedAppraisal.goals === "string"
                      ? selectedAppraisal.goals
                      : JSON.stringify(selectedAppraisal.goals, null, 2)}
                  </div>
                </div>
              )}

              {/* Comments */}
              {(selectedAppraisal.feedback || selectedAppraisal.remarks || selectedAppraisal.comments) && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <MessageSquare size={14} />
                    <span>Manager Comments</span>
                  </div>
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs text-slate-600 leading-relaxed">
                    {selectedAppraisal.feedback || selectedAppraisal.remarks || selectedAppraisal.comments}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedAppraisal(null)}
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