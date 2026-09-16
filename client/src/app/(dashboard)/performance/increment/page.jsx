"use client";
import { useEffect, useState } from "react";
import { Loader2, TrendingUp, CalendarClock, ArrowUpRight, Banknote } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Table from "@/components/ui/Table";

export default function IncrementPage() {
  const [appraisals, setAppraisals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchIncrements = async () => {
      try {
        const { data } = await api.get("/performance/appraisals");

        // Filter records with increments > 0 and sort highest to lowest
        const incrementList = Array.isArray(data)
          ? data
            .filter((a) => a.incrementPercent > 0)
            .sort((a, b) => b.incrementPercent - a.incrementPercent)
          : [];

        setAppraisals(incrementList);
      } catch (err) {
        console.error("Error fetching increments:", err);
        toast.error("Failed to load increment recommendations. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchIncrements();
  }, []);

  const columns = [
    {
      key: "employee",
      label: "Employee",
      render: (r) => (
        <div className="flex items-center gap-3 py-1">
          <div className="h-9 w-9 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-sm font-bold text-emerald-600 shadow-sm">
            {r.employee?.name?.charAt(0) || "U"}
          </div>
          <span className="font-bold text-slate-800">{r.employee?.name || "Unknown Employee"}</span>
        </div>
      )
    },
    {
      key: "designation",
      label: "Role / Designation",
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
      key: "incrementPercent",
      label: "Recommended Increment",
      render: (r) => (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 border border-emerald-200 rounded-md text-sm font-bold shadow-sm">
          <ArrowUpRight size={16} className="text-emerald-500" />
          {r.incrementPercent}%
        </span>
      )
    },
  ];

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="animate-spin text-emerald-600" size={32} />
        <p className="text-sm text-slate-500 font-medium animate-pulse">Loading increment data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Banknote className="text-emerald-600" size={28} />
            Increment Recommendations
          </h1>
          <p className="text-sm text-slate-500 mt-1.5">
            Recommended salary increments based on recent performance appraisals.
          </p>
        </div>
      </div>

      {/* Content Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {appraisals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
              <TrendingUp className="text-slate-300" size={32} />
            </div>
            <p className="text-base text-slate-700 font-semibold">No increment recommendations yet</p>
            <p className="text-sm text-slate-500 mt-1">
              Salary increment data will appear here once managers submit their final assessments.
            </p>
          </div>
        ) : (
          <Table columns={columns} data={appraisals} />
        )}
      </div>
    </div>
  );
}