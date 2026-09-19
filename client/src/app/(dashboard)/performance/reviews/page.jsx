// src/app/(dashboard)/performance/reviews/page.jsx
"use client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, Star, TrendingUp, Target, Sparkles, CalendarClock, FileX, RefreshCw } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";

export default function PerformanceReviewsPage() {
  const [appraisals, setAppraisals] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/performance/appraisals");

      let list = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.data)
          ? response.data.data
          : Array.isArray(response.data?.appraisals)
            ? response.data.appraisals
            : [];

      setAppraisals(list);
    } catch (error) {
      console.error("Error loading reviews:", error);
      toast.error("Failed to load performance reviews. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3 font-sans">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
        <p className="text-sm text-slate-500 font-medium animate-pulse">Loading performance reviews...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-3 lg:p-4 font-sans">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-sm transition-all hover:shadow-md">
        <div>
          <h1 className="text-2xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Performance Reviews
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Summary of all performance appraisals and detailed feedback.
          </p>
        </div>
        <button
          onClick={fetchReviews}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 text-sm font-semibold rounded-xl border border-slate-200 hover:border-indigo-200 transition-all shadow-sm cursor-pointer active:scale-95 w-full sm:w-auto"
        >
          <RefreshCw size={16} className={loading ? "animate-spin text-indigo-600" : ""} />
          <span>Refresh List</span>
        </button>
      </div>

      {/* Empty State */}
      {appraisals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center bg-white rounded-3xl border border-dashed border-slate-300 shadow-sm hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors duration-300">
          <div className="h-16 w-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 border border-slate-100 shadow-sm">
            <FileX className="text-slate-400" size={32} />
          </div>
          <p className="text-lg text-slate-700 font-semibold">No reviews found</p>
          <p className="text-sm text-slate-500 mt-1.5 max-w-sm">Once appraisal cycles are created, details will appear here.</p>
        </div>
      ) : (
        /* Reviews List with Hover Effects */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {appraisals.map((a) => (
            <div
              key={a._id || a.id}
              className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-300 hover:-translate-y-1.5 transition-all duration-300 flex flex-col h-full group relative overflow-hidden"
            >
              {/* Subtle hover gradient background */}
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

              {/* Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6 relative z-10">
                <div className="flex items-center gap-4">
                  {/* Avatar with hover animation */}
                  <div className="h-12 w-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-lg font-bold text-indigo-600 shadow-sm group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 flex-shrink-0">
                    {a.employee?.name?.charAt(0) || a.name?.charAt(0) || "U"}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-lg group-hover:text-indigo-600 transition-colors duration-300">
                      {a.employee?.name || a.name || "Unknown Employee"}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mt-1">
                      <CalendarClock size={14} className="text-slate-400 group-hover:text-indigo-400 transition-colors" />
                      Review Period: {a.reviewPeriod || a.period || "N/A"}
                    </div>
                  </div>
                </div>

                {/* Star Rating & Status Badge */}
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center bg-slate-50 px-3 py-1.5 rounded-2xl border border-slate-200/80 shadow-sm group-hover:border-amber-200 group-hover:bg-amber-50/30 transition-colors">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          size={14}
                          className={`${s <= (a.rating || a.score || 0)
                            ? "fill-amber-400 text-amber-400"
                            : "fill-slate-200 text-slate-200"
                            } transition-colors`}
                        />
                      ))}
                    </div>
                    <span className="ml-2 text-xs font-bold text-slate-800">
                      {Number(a.rating || a.score || 0).toFixed(1)}/5
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                    {a.status || "pending"}
                  </span>
                </div>
              </div>

              {/* Feedback Sections */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm flex-grow relative z-10">
                {/* Strengths */}
                <div className="bg-emerald-50/50 border border-emerald-100/80 p-4 rounded-2xl flex flex-col transition-all duration-300 hover:bg-emerald-50 hover:shadow-sm hover:border-emerald-200">
                  <p className="flex items-center gap-1.5 font-bold text-emerald-700 mb-2 text-xs uppercase tracking-wider">
                    <TrendingUp size={14} /> Strengths
                  </p>
                  <p className="text-slate-700 leading-relaxed text-sm">
                    {a.strengths || "No strengths documented yet."}
                  </p>
                </div>

                {/* Areas of Improvement */}
                <div className="bg-amber-50/50 border border-amber-100/80 p-4 rounded-2xl flex flex-col transition-all duration-300 hover:bg-amber-50 hover:shadow-sm hover:border-amber-200">
                  <p className="flex items-center gap-1.5 font-bold text-amber-700 mb-2 text-xs uppercase tracking-wider">
                    <Target size={14} /> Improvements
                  </p>
                  <p className="text-slate-700 leading-relaxed text-sm">
                    {a.areasOfImprovement || a.improvements || "No improvements documented yet."}
                  </p>
                </div>
              </div>

              {/* Promotion Recommended Badge */}
              {a.promotionRecommended && (
                <div className="mt-5 pt-4 border-t border-slate-100 relative z-10">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 border border-indigo-100 rounded-xl text-sm font-semibold shadow-sm hover:shadow-md transition-shadow">
                    <Sparkles size={16} className="text-indigo-500 animate-pulse" />
                    Highly Recommended for Promotion
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}