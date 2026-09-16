// src/app/(dashboard)/performance/ratings/page.jsx
"use client";
import { useEffect, useState } from "react";
import { Loader2, Star, Trophy, CalendarClock, RefreshCw } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Table from "@/components/ui/Table";

export default function PerformanceRatingPage() {
  const [appraisals, setAppraisals] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRatings = async () => {
    setLoading(true);
    try {
      // Status filter hata diya hai taaki saare appraisals fetch ho sakein
      const response = await api.get("/performance/appraisals");

      const data = response?.data;
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data?.appraisals)
            ? data.appraisals
            : [];

      // Sort by rating safely (highest to lowest)
      const sortedData = list.sort((a, b) => (b.rating || b.score || 0) - (a.rating || a.score || 0));

      setAppraisals(sortedData);
    } catch (err) {
      console.error("Error fetching ratings:", err);
      toast.error("Failed to load performance ratings. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRatings();
  }, []);

  const columns = [
    {
      key: "employee",
      label: "Employee",
      render: (r) => (
        <div className="flex items-center gap-3 py-1">
          <div className="h-9 w-9 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600 shadow-sm">
            {r.employee?.name?.charAt(0) || r.employeeName?.charAt(0) || "U"}
          </div>
          <span className="font-bold text-slate-800">{r.employee?.name || r.employeeName || "Unknown Employee"}</span>
        </div>
      )
    },
    {
      key: "designation",
      label: "Role / Designation",
      render: (r) => (
        <span className="text-slate-600 font-medium">
          {r.employee?.designation || r.designation || "Not specified"}
        </span>
      )
    },
    {
      key: "reviewPeriod",
      label: "Review Period",
      render: (r) => (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 text-slate-600 text-xs font-medium border border-slate-100">
          <CalendarClock size={14} className="text-slate-400" />
          {r.reviewPeriod || r.period || "N/A"}
        </span>
      )
    },
    {
      key: "rating",
      label: "Final Rating",
      render: (r) => {
        const ratingVal = Number(r.rating || r.score || 0);
        return (
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  size={16}
                  className={`${s <= ratingVal
                    ? "fill-amber-400 text-amber-400 drop-shadow-sm"
                    : "fill-slate-100 text-slate-250 text-slate-200"
                    } transition-all`}
                />
              ))}
            </div>
            <div className="flex items-center justify-center bg-amber-50 px-2 py-0.5 rounded text-sm font-bold text-amber-700 border border-amber-100/50">
              {ratingVal.toFixed(1)}<span className="text-amber-500/70 text-xs font-semibold ml-0.5">/5</span>
            </div>
          </div>
        );
      },
    },
  ];

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
        <p className="text-sm text-slate-500 font-medium animate-pulse">Loading employee ratings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 font-sans">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Trophy className="text-amber-500" size={28} />
            Performance Ratings
          </h1>
          <p className="text-sm text-slate-500 mt-1.5">
            Overview of all employee performance ratings and evaluation rankings.
          </p>
        </div>
        <button
          onClick={fetchRatings}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 text-sm font-semibold rounded-xl border border-slate-200 hover:border-indigo-200 transition-all shadow-sm cursor-pointer"
        >
          <RefreshCw size={16} />
          <span>Refresh Ratings</span>
        </button>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <Table
          columns={columns}
          data={appraisals}
          emptyText="No performance ratings found. Complete an appraisal cycle to see rankings here."
        />
      </div>
    </div>
  );
}