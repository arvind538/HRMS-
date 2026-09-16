"use client";
import { useEffect, useState } from "react";
import { Loader2, Award, Star, TrendingUp, CalendarClock, Sparkles } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Table from "@/components/ui/Table";

export default function PromotionPage() {
  const [appraisals, setAppraisals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPromotions = async () => {
      try {
        const { data } = await api.get("/performance/appraisals");
        // Filter only the appraisals where a promotion was recommended
        const recommendedList = Array.isArray(data)
          ? data.filter((a) => a.promotionRecommended)
          : [];
        setAppraisals(recommendedList);
      } catch (err) {
        console.error("Error fetching promotions:", err);
        toast.error("Failed to load promotion recommendations. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchPromotions();
  }, []);

  const columns = [
    {
      key: "employee",
      label: "Employee",
      render: (r) => (
        <div className="flex items-center gap-3 py-1">
          <div className="h-9 w-9 rounded-full bg-purple-50 border border-purple-100 flex items-center justify-center text-sm font-bold text-purple-600 shadow-sm">
            {r.employee?.name?.charAt(0) || "U"}
          </div>
          <span className="font-bold text-slate-800">{r.employee?.name || "Unknown Employee"}</span>
        </div>
      )
    },
    {
      key: "designation",
      label: "Current Role",
      render: (r) => (
        <span className="text-slate-600 font-medium">
          {r.employee?.designation || "Not specified"}
        </span>
      )
    },
    {
      key: "reviewPeriod",
      label: "Review Period",
      render: (r) => (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 text-slate-600 text-xs font-medium border border-slate-100">
          <CalendarClock size={14} className="text-slate-400" />
          {r.reviewPeriod || "N/A"}
        </span>
      )
    },
    {
      key: "rating",
      label: "Final Rating",
      render: (r) => (
        <div className="flex items-center gap-1.5 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100/50 w-max">
          <Star size={14} className="fill-amber-400 text-amber-400" />
          <span className="text-sm font-bold text-amber-700">
            {r.rating || 0}<span className="text-amber-500/70 text-xs font-semibold ml-0.5">/5</span>
          </span>
        </div>
      )
    },
    {
      key: "status",
      label: "Status",
      render: () => (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-purple-50 to-indigo-50 text-purple-700 border border-purple-100/50 rounded-md text-xs font-bold shadow-sm">
          <Sparkles size={12} className="text-purple-500" />
          Recommended
        </span>
      )
    }
  ];

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="animate-spin text-purple-600" size={32} />
        <p className="text-sm text-slate-500 font-medium animate-pulse">Loading promotion recommendations...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <TrendingUp className="text-purple-600" size={28} />
            Promotion Recommendations
          </h1>
          <p className="text-sm text-slate-500 mt-1.5">
            Overview of employees who have been recommended for a promotion by their managers.
          </p>
        </div>
      </div>

      {/* Content Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {appraisals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
              <Award className="text-slate-300" size={32} />
            </div>
            <p className="text-base text-slate-700 font-semibold">No recommendations yet</p>
            <p className="text-sm text-slate-500 mt-1">
              Promotion recommendations will appear here once managers complete their assessments.
            </p>
          </div>
        ) : (
          <Table columns={columns} data={appraisals} />
        )}
      </div>
    </div>
  );
}