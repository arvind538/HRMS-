"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import {
  TrendingUp,
  Award,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  BarChart2,
  ArrowUpRight
} from "lucide-react";
import api from "@/lib/api";

export default function PerformanceReportsPage() {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Axios ke through backend se real data fetch karne ka function
  const fetchPerformanceReports = async () => {
    try {
      setLoading(true);
      setError(null);


      const response = await api.get("/performance/aggregate-report");

      // Axios response data ko directly state mein set karein
      setReportData(response.data);
    } catch (err) {
      console.error("Error fetching performance reports:", err);
      setError(err.response?.data?.message || err.message || "Something went wrong while connecting to backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPerformanceReports();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-sm text-gray-500 font-medium">Loading performance insights via Axios...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-6 bg-red-50 rounded-xl border border-red-100 text-center max-w-lg mx-auto my-10">
        <AlertCircle className="w-10 h-10 text-red-500 mb-2" />
        <h3 className="text-lg font-semibold text-red-800">Failed to load reports</h3>
        <p className="text-sm text-red-600 mt-1">{error}</p>
        <p className="text-xs text-gray-500 mt-2">Make sure your backend server is running and Axios is configured.</p>
        <button
          onClick={fetchPerformanceReports}
          className="mt-4 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Performance Reports</h1>
          <p className="text-sm text-gray-500 mt-1">
            Goal completion rates, appraisal ratings, aur team performance trends (Live Axios Data).
          </p>
        </div>
        <button
          onClick={fetchPerformanceReports}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition shadow-sm"
        >
          <RefreshCw className="w-4 h-4 text-gray-500" />
          Refresh Data
        </button>
      </div>

      {/* KPI Cards Grid with Hover Effects */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

        {/* Goal Completion Rate Card */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500 group-hover:text-indigo-600 transition-colors">
              Goal Completion Rate
            </span>
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-all">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900">{reportData?.goalCompletionRate}%</span>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              {reportData?.goalCompletionTrend}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-2">Overall goals met across active databases.</p>
        </div>

        {/* Average Appraisal Rating Card */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500 group-hover:text-amber-600 transition-colors">
              Avg Appraisal Rating
            </span>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl group-hover:bg-amber-600 group-hover:text-white transition-all">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900">{reportData?.averageAppraisalRating} <span className="text-lg text-gray-400 font-normal">/ 5.0</span></span>
          </div>
          <p className="text-xs text-gray-400 mt-2">Based on {reportData?.totalAppraisals} completed reviews.</p>
        </div>

        {/* Team Performance Score Card */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500 group-hover:text-emerald-600 transition-colors">
              Team Performance Score
            </span>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-all">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900">{reportData?.teamPerformanceScore}</span>
          </div>
          <p className="text-xs text-gray-400 mt-2">Calculated dynamically from live backend records.</p>
        </div>

      </div>

      {/* Department Breakdown Section */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Department-wise Breakdown</h2>
            <p className="text-xs text-gray-500 mt-0.5">Performance scores and goal completions per department.</p>
          </div>
          <div className="p-2 bg-gray-50 rounded-lg text-gray-500">
            <BarChart2 className="w-5 h-5" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reportData?.departmentBreakdown?.map((dept, index) => (
            <div
              key={index}
              className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:border-indigo-100 hover:shadow-md transition-all duration-200"
            >
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-gray-800 text-sm">{dept.name}</span>
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
                  Score: {dept.score}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${dept.score}%` }}
                ></div>
              </div>
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>Goals Completed: {dept.goalsCompleted}</span>
                <span className="flex items-center gap-1 text-emerald-600 font-medium">
                  Active <ArrowUpRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}