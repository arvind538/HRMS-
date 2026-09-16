"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  RefreshCw,
  AlertCircle,
  CalendarDays,
  Clock,
  TrendingUp,
  HeartPulse,
  Briefcase,
  Baby,
  ShieldAlert,
  PieChart,
  Calendar
} from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function LeaveBalance() {
  const { user } = useAuth();
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Default to current year (2026)
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());

  // Generate a dynamic list of past and current fiscal/calendar years
  const availableYears = useMemo(() => {
    const years = [];
    for (let i = 0; i < 5; i++) {
      const yr = currentYear - i;
      years.push({
        value: yr.toString(),
        calendarLabel: `CY ${yr}`,
        fiscalLabel: `FY ${yr}-${(yr + 1).toString().slice(-2)}`,
      });
    }
    return years;
  }, [currentYear]);

  // Dynamic Employee ID detection fallback
  const employeeId =
    user?.employee?._id ||
    (typeof user?.employee === "string" ? user?.employee : null) ||
    user?._id ||
    user?.id;

  const fetchBalances = useCallback(async () => {
    if (!employeeId) {
      setError("Your user account is not linked to an active employee profile.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Pass selected year as query parameter to backend
      const response = await api.get(`/leave/balance/${employeeId}`, {
        params: { year: selectedYear }
      });
      const resData = response?.data;

      const balanceList = Array.isArray(resData)
        ? resData
        : Array.isArray(resData?.data)
          ? resData.data
          : Array.isArray(resData?.balance)
            ? resData.balance
            : [];

      setBalances(balanceList);
    } catch (err) {
      console.error("Fetch leave balance error:", err.response || err);
      setError(
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Unable to retrieve your leave balance breakdown."
      );
    } finally {
      setLoading(false);
    }
  }, [employeeId, selectedYear]);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  const getCategoryMeta = (type) => {
    const key = (type || "").toLowerCase();
    switch (key) {
      case "sick":
        return {
          icon: HeartPulse,
          lightBg: "bg-rose-50 text-rose-700 border-rose-100",
          barColor: "bg-rose-500",
        };
      case "casual":
        return {
          icon: CalendarDays,
          lightBg: "bg-indigo-50 text-indigo-700 border-indigo-100",
          barColor: "bg-indigo-600",
        };
      case "earned":
      case "privilege":
        return {
          icon: Briefcase,
          lightBg: "bg-emerald-50 text-emerald-700 border-emerald-100",
          barColor: "bg-emerald-500",
        };
      case "maternity":
      case "paternity":
        return {
          icon: Baby,
          lightBg: "bg-purple-50 text-purple-700 border-purple-100",
          barColor: "bg-purple-500",
        };
      default:
        return {
          icon: Clock,
          lightBg: "bg-slate-100 text-slate-700 border-slate-200",
          barColor: "bg-slate-600",
        };
    }
  };

  const totalAllotted = balances.reduce((acc, b) => acc + (b.allotted || 0), 0);
  const totalUsed = balances.reduce((acc, b) => acc + (b.used || 0), 0);
  const totalRemaining = balances.reduce((acc, b) => acc + (b.remaining || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4 lg:px-0">
      {/* Top Header Card with Dropdown Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              My Leave Balance
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
              {selectedYear} Quota
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Comprehensive overview of your allocated, consumed, and remaining leave balances.
          </p>
        </div>

        {/* Controls: Year Selector & Refresh */}
        <div className="flex items-center gap-3 self-start sm:self-auto w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial min-w-[150px]">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Calendar className="w-4 h-4" />
            </div>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              disabled={loading}
              className="w-full pl-9 pr-8 py-2.5 bg-slate-50 hover:bg-slate-100/80 text-slate-800 text-sm font-medium rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors cursor-pointer appearance-none"
            >
              {availableYears.map((yr) => (
                <option key={yr.value} value={yr.value}>
                  {yr.calendarLabel} ({yr.fiscalLabel})
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
              </svg>
            </div>
          </div>

          <button
            onClick={fetchBalances}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 active:scale-[0.98] text-slate-700 text-sm font-medium rounded-xl border border-slate-200 transition-all duration-200 disabled:opacity-60 shadow-2xs hover:shadow-xs cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 text-slate-600 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Aggregate Metric Stats */}
      {!loading && !error && balances.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Allotted</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalAllotted} Days</h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
              <PieChart className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Used</p>
              <h3 className="text-2xl font-bold text-rose-600 mt-1">{totalUsed} Days</h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Available Balance</p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-1">{totalRemaining} Days</h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Briefcase className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full py-20 text-center bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center mx-auto text-indigo-600">
              <RefreshCw className="w-6 h-6 animate-spin" />
            </div>
            <p className="text-sm font-semibold text-slate-800">
              Calculating leave records for {selectedYear}...
            </p>
          </div>
        ) : error ? (
          <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-slate-200/80 shadow-xs max-w-lg mx-auto p-6">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto text-rose-600 mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">Failed to Load Balance</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">{error}</p>
            <button
              onClick={fetchBalances}
              className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Try Again
            </button>
          </div>
        ) : balances.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-slate-200/80 shadow-xs max-w-sm mx-auto p-6">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800">No Records for {selectedYear}</h3>
            <p className="text-xs text-slate-500 mt-1">
              There are no leave entitlements logged for the selected calendar/fiscal cycle.
            </p>
          </div>
        ) : (
          balances.map((b) => {
            const meta = getCategoryMeta(b.leaveType);
            const Icon = meta.icon;
            const percentageUsed =
              b.allotted > 0 ? Math.min(100, Math.round((b.used / b.allotted) * 100)) : 0;

            return (
              <div
                key={b.leaveType}
                className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between space-y-5 group"
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 transition-transform duration-300 group-hover:scale-105 ${meta.lightBg}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="truncate">
                      <h3 className="font-bold text-slate-900 text-base capitalize truncate">
                        {b.leaveType} Leave
                      </h3>
                      <p className="text-xs text-slate-400 capitalize">
                        {b.allotted === 0 ? "Non-allotted" : `${selectedYear} Entitlement`}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold border shrink-0 ${meta.lightBg}`}>
                    {b.remaining} Left
                  </span>
                </div>

                {/* Progress Bar */}
                {b.allotted > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold text-slate-500">
                      <span>Consumed</span>
                      <span>{percentageUsed}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${meta.barColor}`}
                        style={{ width: `${percentageUsed}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Numeric Columns */}
                <div className="grid grid-cols-3 gap-2.5 text-center pt-1 border-t border-slate-100">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100/80">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Total</p>
                    <p className="text-base sm:text-lg font-bold text-slate-800 mt-0.5">
                      {b.allotted}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100/80">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Used</p>
                    <p className="text-base sm:text-lg font-bold text-rose-600 mt-0.5">
                      {b.used}
                    </p>
                  </div>
                  <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-100">
                    <p className="text-[10px] uppercase font-bold text-emerald-700">Left</p>
                    <p className="text-base sm:text-lg font-bold text-emerald-700 mt-0.5">
                      {b.remaining}
                    </p>
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