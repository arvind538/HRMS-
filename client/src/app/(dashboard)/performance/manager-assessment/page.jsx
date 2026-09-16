"use client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, CheckCircle2, UserCheck, CalendarClock, MessageSquare, Star, TrendingUp, Award } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { useAuth } from "@/context/AuthContext";

export default function ManagerAssessmentPage() {
  const { user } = useAuth();
  const [appraisals, setAppraisals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    managerAssessment: "",
    rating: 3,
    strengths: "",
    areasOfImprovement: "",
    promotionRecommended: false,
    incrementPercent: ""
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/performance/appraisals", {
        params: { status: "pending-manager" }
      });
      setAppraisals(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error loading pending reviews:", err);
      toast.error("Failed to load pending assessments. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openReview = (appraisal) => {
    setSelected(appraisal);
    setForm({
      managerAssessment: "",
      rating: 3,
      strengths: "",
      areasOfImprovement: "",
      promotionRecommended: false,
      incrementPercent: ""
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.put(`/performance/appraisals/${selected._id}/manager-assessment`, {
        ...form,
        reviewedBy: user?.employee?._id
      });
      toast.success("Manager assessment completed successfully! 🎉");
      setSelected(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit the assessment.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
        <p className="text-sm text-slate-500 font-medium animate-pulse">Loading pending reviews...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <UserCheck className="text-indigo-600" size={28} />
            Manager Assessment
          </h1>
          <p className="text-sm text-slate-500 mt-1.5">
            Review employee self-assessments and provide final ratings, feedback, and recommendations.
          </p>
        </div>
      </div>

      {/* List Section */}
      {appraisals.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center bg-white rounded-2xl border border-dashed border-slate-200 shadow-sm">
          <div className="h-16 w-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4 border border-emerald-100">
            <CheckCircle2 className="text-emerald-500" size={32} />
          </div>
          <p className="text-lg text-slate-800 font-bold">All Caught Up!</p>
          <p className="text-sm text-slate-500 mt-1">
            There are no pending employee reviews requiring your assessment at this time.
          </p>
        </div>
      ) : (
        /* Assessment Cards */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {appraisals.map((a) => (
            <div
              key={a._id}
              className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-100 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between h-full"
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600 shadow-sm">
                      {a.employee?.name?.charAt(0) || "U"}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-base">{a.employee?.name || "Unknown Employee"}</p>
                      <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mt-0.5">
                        <CalendarClock size={14} className="text-slate-400" />
                        {a.reviewPeriod}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 mb-4">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">
                    <MessageSquare size={14} /> Self-Assessment Preview
                  </p>
                  <p className="text-sm text-slate-500 line-clamp-2 italic">
                    "{a.selfAssessment || "No self-assessment provided."}"
                  </p>
                </div>
              </div>
              <Button
                onClick={() => openReview(a)}
                className="w-full bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300 shadow-sm transition-colors"
              >
                Review & Grade
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Premium Modal Form */}
      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title="Complete Manager Assessment">
        <form onSubmit={handleSubmit} className="space-y-6 mt-2">

          {/* Read-Only Self Assessment Block */}
          <div className="bg-indigo-50/50 border-l-4 border-indigo-500 p-4 rounded-r-xl">
            <p className="text-xs font-bold text-indigo-700 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
              <UserCheck size={14} /> Employee's Self-Assessment
            </p>
            <p className="text-sm text-slate-700 italic leading-relaxed">
              "{selected?.selfAssessment || "No self-assessment provided by employee."}"
            </p>
          </div>

          {/* Overall Assessment */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Overall Manager Assessment</label>
            <textarea
              required
              rows={3}
              value={form.managerAssessment}
              onChange={(e) => setForm({ ...form, managerAssessment: e.target.value })}
              placeholder="Provide your overall feedback on the employee's performance..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-y"
            />
          </div>

          {/* Grid for Strengths & Improvements */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Strengths</label>
              <textarea
                rows={2}
                value={form.strengths}
                onChange={(e) => setForm({ ...form, strengths: e.target.value })}
                placeholder="Key areas where they excel..."
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-y"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Areas of Improvement</label>
              <textarea
                rows={2}
                value={form.areasOfImprovement}
                onChange={(e) => setForm({ ...form, areasOfImprovement: e.target.value })}
                placeholder="Skills or habits to work on..."
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-y"
              />
            </div>
          </div>

          {/* Grid for Rating & Increment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-5">
            <div>
              <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-1.5">
                <Star size={16} className="text-amber-500" /> Rating (1 to 5)
              </label>
              <select
                value={form.rating}
                onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              >
                <option value={1}>1 - Needs Significant Improvement</option>
                <option value={2}>2 - Below Expectations</option>
                <option value={3}>3 - Meets Expectations</option>
                <option value={4}>4 - Exceeds Expectations</option>
                <option value={5}>5 - Outstanding / Exceptional</option>
              </select>
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-1.5">
                <TrendingUp size={16} className="text-emerald-500" /> Increment % (Optional)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                placeholder="e.g. 15"
                value={form.incrementPercent}
                onChange={(e) => setForm({ ...form, incrementPercent: e.target.value ? Number(e.target.value) : "" })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>

          {/* Promotion Checkbox */}
          <div className="bg-purple-50/50 border border-purple-100 p-4 rounded-xl flex items-center gap-3">
            <input
              type="checkbox"
              id="promotion"
              checked={form.promotionRecommended}
              onChange={(e) => setForm({ ...form, promotionRecommended: e.target.checked })}
              className="h-5 w-5 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
            />
            <label htmlFor="promotion" className="flex flex-col cursor-pointer">
              <span className="text-sm font-bold text-purple-900 flex items-center gap-1.5">
                <Award size={16} className="text-purple-600" /> Recommend for Promotion
              </span>
              <span className="text-xs text-purple-600/80">Check this if the employee is ready for the next level.</span>
            </label>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setSelected(null)}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={submitting}
              className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20"
            >
              {submitting ? 'Submitting...' : 'Complete Assessment'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}