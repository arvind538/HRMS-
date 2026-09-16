"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Tag,
  RefreshCw,
  AlertCircle,
  Award,
  CalendarCheck,
  Sparkles,
  PieChart,
} from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function LeaveTypes() {
  const { user } = useAuth();
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Safe data extraction helper for wrapped responses
  const extractArray = (res) => {
    if (!res) return [];
    if (Array.isArray(res.data)) return res.data;
    if (res.data && Array.isArray(res.data.data)) return res.data.data;
    if (res.data && Array.isArray(res.data.balances)) return res.data.balances;
    if (res.data && Array.isArray(res.data.leaveTypes)) return res.data.leaveTypes;
    return [];
  };

  const fetchQuotas = useCallback(async () => {
    const employeeId =
      user?.employee?._id ||
      user?.employee?.id ||
      user?.employeeId ||
      user?._id ||
      user?.id;

    if (!employeeId) {
      setError("Active employee profile link not found. Please log in again.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      let response;
      try {
        response = await api.get(`/leave/balance/${employeeId}`);
      } catch (firstErr) {
        if (firstErr.response?.status === 404) {
          response = await api.get("/leave/types");
        } else {
          throw firstErr;
        }
      }

      const list = extractArray(response);
      setBalances(list);
    } catch (err) {
      console.error("Fetch leave quota error:", err);
      if (err.response?.status === 401) {
        setError("Your session has expired. Please log in again.");
      } else {
        setError(err.response?.data?.message || "Failed to synchronize leave quotas and balances.");
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchQuotas();
  }, [fetchQuotas]);

  // Overall totals for dashboard header metrics
  const totalAllotted = balances.reduce((acc, curr) => acc + (Number(curr.allotted || curr.quota) || 0), 0);
  const totalRemaining = balances.reduce((acc, curr) => acc + (Number(curr.remaining ?? curr.allotted ?? 0)), 0);
  const totalUsed = Math.max(0, totalAllotted - totalRemaining);

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-2 sm:px-4 lg:px-0">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Leave Policy & Quotas
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              <Sparkles size={12} className="text-indigo-600" /> Annual Entitlement
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Company authorized leave allocations, consumed balance, and available balances.
          </p>
        </div>

        <button
          onClick={fetchQuotas}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 self-start sm:self-auto px-4 py-2 bg-white hover:bg-slate-50 active:scale-[0.98] border border-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 shadow-2xs hover:shadow-xs disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-600" : "text-slate-500"}`} />
          <span>{loading ? "Updating..." : "Refresh Quotas"}</span>
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl shadow-xs">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <p className="text-xs sm:text-sm font-medium">{error}</p>
          </div>
          <button
            onClick={fetchQuotas}
            className="px-3.5 py-1.5 bg-white text-rose-700 text-xs font-semibold rounded-lg border border-rose-200 hover:bg-rose-100/60 transition-colors shadow-2xs self-end sm:self-auto"
          >
            Retry
          </button>
        </div>
      )}

      {/* Aggregate Overview Strip (Visible when data loaded) */}
      {!loading && !error && balances.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shrink-0 shadow-2xs">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Entitled</p>
              <p className="text-xl font-extrabold text-slate-900">{totalAllotted} Days</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-emerald-600 shrink-0 shadow-2xs">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Remaining Balance</p>
              <p className="text-xl font-extrabold text-emerald-700">{totalRemaining} Days</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-amber-600 shrink-0 shadow-2xs">
              <PieChart className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Leaves Utilized</p>
              <p className="text-xl font-extrabold text-slate-900">{totalUsed} Days</p>
            </div>
          </div>
        </div>
      )}

      {/* Quota Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4 animate-pulse"
            >
              <div className="flex justify-between items-center">
                <div className="w-10 h-10 rounded-xl bg-slate-100" />
                <div className="w-20 h-5 rounded-full bg-slate-100" />
              </div>
              <div className="h-5 w-28 bg-slate-100 rounded" />
              <div className="space-y-2 pt-2">
                <div className="h-3 w-full bg-slate-100 rounded" />
                <div className="h-3 w-3/4 bg-slate-100 rounded" />
              </div>
            </div>
          ))
        ) : balances.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-3 px-4">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
              <Tag className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">No Quota Records Found</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Leave types have not been configured or allocated for your employee profile yet.
              </p>
            </div>
          </div>
        ) : (
          balances.map((item, idx) => {
            const leaveName = item.leaveType || item.name || "General";
            const allotted = Number(item.allotted ?? item.quota ?? item.days ?? 0);
            const remaining = Number(item.remaining ?? allotted);
            const used = Math.max(0, allotted - remaining);
            const usedPercent = allotted > 0 ? Math.min(100, Math.round((used / allotted) * 100)) : 0;

            return (
              <div
                key={item.id || item._id || item.leaveType || idx}
                className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between space-y-5 group"
              >
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 transition-transform duration-300 group-hover:scale-105">
                      <Tag className="w-5 h-5" />
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200/80">
                      Yearly Plan
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 mt-4 capitalize truncate">
                    {leaveName} Leave
                  </h3>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">
                    Standard annual allocated entitlement
                  </p>
                </div>

                {/* Progress Visual */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-500">Utilization</span>
                    <span className="text-slate-900">{usedPercent}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${usedPercent >= 90
                        ? "bg-rose-500"
                        : usedPercent >= 60
                          ? "bg-amber-500"
                          : "bg-indigo-600"
                        }`}
                      style={{ width: `${usedPercent}%` }}
                    />
                  </div>
                </div>

                {/* Metrics Breakdown Footnote */}
                <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-3 text-center">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Allotted</p>
                    <p className="text-sm font-extrabold text-slate-800 mt-0.5">{allotted} Days</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-indigo-50/60 border border-indigo-100/60">
                    <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">Remaining</p>
                    <p className="text-sm font-extrabold text-indigo-700 mt-0.5">{remaining} Days</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}