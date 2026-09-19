// src/app/(dashboard)/performance/manager-assessment/page.jsx
"use client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, CheckCircle2, UserCheck, CalendarClock, MessageSquare, Star, TrendingUp, Award, ArrowRight } from "lucide-react";
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
      // Pehle pending-manager status ke sath try karein
      let response;
      try {
        response = await api.get("/performance/appraisals", {
          params: { status: "pending-manager" }
        });
      } catch (e) {
        response = await api.get("/performance/appraisals");
      }

      const resData = response?.data;
      const list = Array.isArray(resData)
        ? resData
        : Array.isArray(resData?.data)
          ? resData.data
          : Array.isArray(resData?.appraisals)
            ? resData.appraisals
            : [];

      // Agar saare fetch hue hain toh unhe filter kar lein jinka status pending-manager ya pending ho
      const filteredList = list.filter(a => {
        const st = (a.status || "").toLowerCase();
        return st === "pending-manager" || st === "pending" || st.includes("manager");
      });

      // Agar filter ke baad empty aayega toh fallback mein saare dikha denge ya original list
      setAppraisals(filteredList.length > 0 ? filteredList : list);
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
    if (!selected) return;

    const appraisalId = selected._id || selected.id;
    setSubmitting(true);
    try {
      await api.put(`/performance/appraisals/${appraisalId}/manager-assessment`, {
        ...form,
        reviewedBy: user?.employee?._id || user?._id
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

  const getEmpName = (a) => {
    if (a.employee && typeof a.employee === "object") {
      return a.employee.name || a.employee.fullName || a.employee.username || "Unknown Employee";
    }
    return a.employeeName || "Unknown Employee";
  };

  const getEmpCode = (a) => {
    if (a.employee && typeof a.employee === "object") {
      return a.employee.employeeId || a.employee.code || "";
    }
    return a.employeeId || "";
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
        <p className="text-xs text-slate-500 font-medium animate-pulse">Loading pending reviews...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans antialiased text-slate-900">

      {/* Header Section */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-all hover:shadow-md">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <UserCheck className="text-indigo-600" size={24} />
              Manager Assessment
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1 font-mono">
              {appraisals.length} Pending Reviews
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Review employee self-assessments and provide final ratings, feedback, and recommendations.
          </p>
        </div>
      </div>

      {/* List Section */}
      {appraisals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="h-14 w-14 bg-emerald-50 rounded-2xl flex items-center justify-center mb-3 border border-emerald-100 shadow-2xs">
            <CheckCircle2 className="text-emerald-500" size={28} />
          </div>
          <p className="text-base text-slate-800 font-bold">All Caught Up!</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            There are no pending employee reviews requiring your assessment at this time.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {appraisals.map((a) => {
            const empName = getEmpName(a);
            const empCode = getEmpCode(a);

            return (
              <div
                key={a._id || a.id}
                className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-indigo-300 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700 shadow-2xs group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        {empName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">{empName}</p>
                        <p className="flex items-center gap-1.5 text-xs font-medium text-slate-400 mt-0.5 font-mono">
                          {empCode && <span>{empCode} • </span>}
                          <CalendarClock size={13} className="text-slate-400" />
                          <span>{a.reviewPeriod || a.period || "—"}</span>
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 font-mono">
                      {a.status || "Pending"}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-1">
                    <p className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <MessageSquare size={13} className="text-indigo-500" /> Self-Assessment Preview
                    </p>
                    <p className="text-xs text-slate-600 line-clamp-2 italic leading-relaxed">
                      &ldquo;{a.selfAssessment || "No self-assessment provided."}&rdquo;
                    </p>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100">
                  <button
                    onClick={() => openReview(a)}
                    className="w-full py-2.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white rounded-xl text-xs font-semibold border border-indigo-100 transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-2xs"
                  >
                    <span>Review & Grade</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title="Complete Manager Assessment">
        <form onSubmit={handleSubmit} className="space-y-4 mt-2 text-xs">
          <div className="bg-indigo-50/70 border-l-4 border-indigo-600 p-3.5 rounded-r-xl space-y-1">
            <p className="font-bold text-indigo-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <UserCheck size={14} className="text-indigo-600" /> Employee&apos;s Self-Assessment
            </p>
            <p className="text-slate-700 italic leading-relaxed">
              &ldquo;{selected?.selfAssessment || "No self-assessment provided by employee."}&rdquo;
            </p>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">Overall Manager Assessment</label>
            <textarea
              required
              rows={3}
              value={form.managerAssessment}
              onChange={(e) => setForm({ ...form, managerAssessment: e.target.value })}
              placeholder="Provide your overall feedback on the employee's performance..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition resize-y"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">Strengths</label>
              <textarea
                rows={2}
                value={form.strengths}
                onChange={(e) => setForm({ ...form, strengths: e.target.value })}
                placeholder="Key areas where they excel..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition resize-y"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">Areas of Improvement</label>
              <textarea
                rows={2}
                value={form.areasOfImprovement}
                onChange={(e) => setForm({ ...form, areasOfImprovement: e.target.value })}
                placeholder="Skills or habits to work on..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition resize-y"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-slate-100 pt-3">
            <div>
              <label className="flex items-center gap-1.5 font-semibold text-slate-700 mb-1.5">
                <Star size={14} className="text-amber-500 fill-amber-400" /> Rating (1 to 5)
              </label>
              <select
                value={form.rating}
                onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition cursor-pointer font-medium"
              >
                <option value={1}>1 - Needs Significant Improvement</option>
                <option value={2}>2 - Below Expectations</option>
                <option value={3}>3 - Meets Expectations</option>
                <option value={4}>4 - Exceeds Expectations</option>
                <option value={5}>5 - Outstanding / Exceptional</option>
              </select>
            </div>
            <div>
              <label className="flex items-center gap-1.5 font-semibold text-slate-700 mb-1.5">
                <TrendingUp size={14} className="text-emerald-500" /> Increment % (Optional)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                placeholder="e.g. 15"
                value={form.incrementPercent}
                onChange={(e) => setForm({ ...form, incrementPercent: e.target.value ? Number(e.target.value) : "" })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-mono"
              />
            </div>
          </div>

          <div className="bg-purple-50/60 border border-purple-100 p-3.5 rounded-xl flex items-center gap-3">
            <input
              type="checkbox"
              id="promotion"
              checked={form.promotionRecommended}
              onChange={(e) => setForm({ ...form, promotionRecommended: e.target.checked })}
              className="h-4 w-4 rounded text-purple-600 border-slate-300 focus:ring-purple-500 cursor-pointer"
            />
            <label htmlFor="promotion" className="flex flex-col cursor-pointer">
              <span className="font-bold text-purple-900 flex items-center gap-1.5 text-xs">
                <Award size={14} className="text-purple-600" /> Recommend for Promotion
              </span>
              <span className="text-[11px] text-purple-600/80">Check this if the employee is ready for the next level.</span>
            </label>
          </div>

          <div className="flex gap-2.5 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setSelected(null)}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={submitting}
              className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs cursor-pointer active:scale-95 font-semibold"
            >
              {submitting ? 'Submitting...' : 'Complete Assessment'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}