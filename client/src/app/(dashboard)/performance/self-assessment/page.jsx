// src/app/(dashboard)/performance/self-assessment/page.jsx
"use client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, Send, ClipboardEdit, CheckCircle2, CalendarClock, RefreshCw } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Button from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";

export default function SelfAssessmentPage() {
  const { user } = useAuth();
  const [appraisals, setAppraisals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Stores draft text for each appraisal ID
  const [drafts, setDrafts] = useState({});
  const [submittingId, setSubmittingId] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Step 1: Bina kisi query params ke saare appraisals mangwayein taaki filtering miss na ho
      const response = await api.get("/performance/appraisals");

      const rawData = response?.data;
      let list = Array.isArray(rawData)
        ? rawData
        : Array.isArray(rawData?.data)
          ? rawData.data
          : Array.isArray(rawData?.appraisals)
            ? rawData.appraisals
            : [];

      // Step 2: Debugging ke liye console me check karein
      console.log("All Appraisals Fetched:", list);
      console.log("Current Logged-in User:", user);

      // Step 3: Filter for pending self-assessment
      // Agar user Admin nahi hai, toh hum chahe toh sirf uske naam ka dikha sakte hain ya saare pending dikha sakte hain
      list = list.filter((a) => {
        const status = (a.status || "").toLowerCase().trim();
        const isPendingSelf = status === "pending-self" || status === "pendingself";

        // Agar user employee hai, toh uska naam ya ID match kar sakte hain
        // Filhal hum saare pending-self dikha rahe hain taaki data turant screen par show ho jaye
        return isPendingSelf;
      });

      setAppraisals(list);
    } catch (err) {
      console.error("Error fetching self-assessments:", err);
      toast.error("Failed to load assessments. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (id) => {
    const assessmentText = drafts[id]?.trim();

    if (!assessmentText) {
      toast.warning("Please write your self-assessment before submitting.");
      return;
    }

    setSubmittingId(id);
    try {
      await api.put(`/performance/appraisals/${id}/self-assessment`, {
        selfAssessment: assessmentText
      });
      toast.success("Self-assessment submitted successfully! 🎉");

      setDrafts(prev => {
        const newDrafts = { ...prev };
        delete newDrafts[id];
        return newDrafts;
      });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit self-assessment.");
    } finally {
      setSubmittingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3 font-sans">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
        <p className="text-sm text-slate-500 font-medium animate-pulse">Loading your self-assessments...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 font-sans">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <ClipboardEdit className="text-indigo-600" size={28} />
            Self Assessment
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Evaluate your performance, highlight achievements, and outline your growth metrics.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 text-sm font-semibold rounded-xl border border-slate-200 hover:border-indigo-200 transition-all shadow-sm cursor-pointer active:scale-95 self-start sm:self-auto"
        >
          <RefreshCw size={16} className={loading ? "animate-spin text-indigo-600" : ""} />
          <span>Refresh Tasks</span>
        </button>
      </div>

      {/* Content Section */}
      {appraisals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center bg-white rounded-3xl border border-dashed border-slate-300 shadow-sm hover:border-indigo-300 hover:bg-indigo-50/20 transition-all duration-300">
          <div className="h-16 w-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4 border border-emerald-100 shadow-sm">
            <CheckCircle2 className="text-emerald-500" size={32} />
          </div>
          <p className="text-lg text-slate-800 font-bold">You're all caught up!</p>
          <p className="text-sm text-slate-500 mt-1.5 max-w-sm">
            There are no pending self-assessments required at the moment.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {appraisals.map((a) => (
            <div
              key={a._id || a.id}
              className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-300 hover:-translate-y-1.5 transition-all duration-300 group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

              <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-100 relative z-10">
                <div>
                  <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-600 border border-amber-200 uppercase tracking-wider mb-2">
                    Action Required for: {a.employee?.name || "Employee"}
                  </span>
                  <h3 className="flex items-center gap-2 font-bold text-slate-900 text-lg group-hover:text-indigo-600 transition-colors">
                    <CalendarClock size={20} className="text-indigo-500 group-hover:scale-110 transition-transform" />
                    Review Period: {a.reviewPeriod || a.period || "Current Cycle"}
                  </h3>
                </div>
              </div>

              <div className="mb-5 relative z-10">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Your Assessment Notes & Achievements
                </label>
                <textarea
                  rows={5}
                  value={drafts[a._id || a.id] || ""}
                  onChange={(e) => setDrafts({ ...drafts, [a._id || a.id]: e.target.value })}
                  placeholder="Describe your key achievements, challenges faced, and goals for the next cycle..."
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200 resize-y shadow-inner"
                />
              </div>

              <div className="flex justify-end pt-2 relative z-10">
                <Button
                  className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-md shadow-indigo-500/20 hover:shadow-lg transition-all active:scale-95"
                  loading={submittingId === (a._id || a.id)}
                  onClick={() => handleSubmit(a._id || a.id)}
                >
                  {submittingId === (a._id || a.id) ? 'Submitting...' : (
                    <>
                      <Send size={16} /> Submit Assessment
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}