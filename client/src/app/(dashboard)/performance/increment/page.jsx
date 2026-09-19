"use client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, TrendingUp, CalendarClock, ArrowUpRight, Banknote, RefreshCw } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Table from "@/components/ui/Table";

export default function IncrementPage() {
  const [appraisals, setAppraisals] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchIncrements = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/performance/appraisals");

      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data?.appraisals)
            ? data.appraisals
            : [];

      // Filter records with increments > 0 and sort highest to lowest
      const incrementList = list
        .filter((a) => Number(a.incrementPercent) > 0)
        .sort((a, b) => (Number(b.incrementPercent) || 0) - (Number(a.incrementPercent) || 0));

      setAppraisals(incrementList);
    } catch (err) {
      console.error("Error fetching increments:", err);
      toast.error("Failed to load increment recommendations. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIncrements();
  }, [fetchIncrements]);

  const getEmpName = (r) => {
    if (r.employee && typeof r.employee === "object") {
      return r.employee.name || r.employee.fullName || "Unknown Employee";
    }
    return r.employeeName || "Unknown Employee";
  };

  const getEmpDesignation = (r) => {
    if (r.employee && typeof r.employee === "object") {
      return r.employee.designation || r.employee.department || "Team Member";
    }
    return r.designation || "Team Member";
  };

  const columns = [
    {
      key: "employee",
      label: "Employee",
      render: (r) => {
        const empName = getEmpName(r);
        return (
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-600 shadow-2xs shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              {empName.charAt(0).toUpperCase()}
            </div>
            <span className="font-bold text-slate-900 text-sm">{empName}</span>
          </div>
        );
      }
    },
    {
      key: "designation",
      label: "Role / Designation",
      render: (r) => (
        <span className="text-slate-600 font-medium text-xs">
          {getEmpDesignation(r)}
        </span>
      )
    },
    {
      key: "reviewPeriod",
      label: "Review Period",
      render: (r) => (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 text-slate-600 text-xs font-medium border border-slate-200/80 font-mono">
          <CalendarClock size={14} className="text-slate-400 shrink-0" />
          {r.reviewPeriod || r.period || "—"}
        </span>
      )
    },
    {
      key: "incrementPercent",
      label: "Recommended Increment",
      render: (r) => (
        <span className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold shadow-2xs font-mono">
          <ArrowUpRight size={14} className="text-emerald-500" />
          +{r.incrementPercent}%
        </span>
      )
    },
  ];

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="animate-spin text-emerald-600" size={32} />
        <p className="text-xs text-slate-500 font-medium animate-pulse">Loading increment data...</p>
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
              <Banknote className="text-emerald-600" size={24} />
              Increment Recommendations
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
              {appraisals.length} Qualified
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Recommended salary increments based on recent performance appraisals and manager reviews.
          </p>
        </div>

        <button
          onClick={fetchIncrements}
          className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition cursor-pointer shadow-2xs self-start sm:self-auto"
          title="Refresh Data"
        >
          <RefreshCw size={16} className={loading ? "animate-spin text-emerald-600" : ""} />
        </button>
      </div>

      {/* Content Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden transition-all hover:shadow-md">
        {appraisals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center max-w-sm mx-auto p-6">
            <div className="h-14 w-14 bg-slate-50 rounded-2xl flex items-center justify-center mb-3 border border-slate-100 shadow-2xs">
              <TrendingUp className="text-slate-300" size={28} />
            </div>
            <p className="text-sm text-slate-800 font-bold">No increment recommendations yet</p>
            <p className="text-xs text-slate-500 mt-1">
              Salary increment data will appear here once managers submit their final assessments with an increment percentage.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-4 px-6">Employee</th>
                    <th className="py-4 px-6">Role / Designation</th>
                    <th className="py-4 px-6">Review Period</th>
                    <th className="py-4 px-6 text-right">Recommended Increment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {appraisals.map((r) => {
                    const id = r._id || r.id;
                    const empName = getEmpName(r);

                    return (
                      <tr key={id} className="hover:bg-emerald-50/30 transition-colors duration-150 group">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-600 shadow-2xs shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                              {empName.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-bold text-slate-900 text-sm group-hover:text-emerald-700 transition-colors">{empName}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-slate-600 text-xs font-medium">
                          {getEmpDesignation(r)}
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-50 text-slate-600 text-xs font-medium border border-slate-200/80 font-mono">
                            <CalendarClock size={14} className="text-slate-400 shrink-0" />
                            {r.reviewPeriod || r.period || "—"}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold shadow-2xs font-mono">
                            <ArrowUpRight size={14} className="text-emerald-500" />
                            +{r.incrementPercent}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-slate-100">
              {appraisals.map((r) => {
                const id = r._id || r.id;
                const empName = getEmpName(r);

                return (
                  <div key={id} className="p-4 space-y-3 bg-white hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-600 shrink-0">
                          {empName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{empName}</h4>
                          <span className="text-[11px] text-slate-400 font-medium">{getEmpDesignation(r)}</span>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold font-mono">
                        <ArrowUpRight size={13} className="text-emerald-500" />
                        +{r.incrementPercent}%
                      </span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between items-center text-xs">
                      <span className="font-medium text-slate-600">Review Period:</span>
                      <span className="font-semibold text-slate-800 font-mono flex items-center gap-1">
                        <CalendarClock size={13} className="text-slate-400" />
                        {r.reviewPeriod || r.period || "—"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}