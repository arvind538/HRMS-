// src/app/(dashboard)/training/reports/page.jsx
"use client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, GraduationCap, Award, BarChart3, RefreshCw } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";

export default function TrainingReportsPage() {
  const [trainings, setTrainings] = useState([]);
  const [certifications, setCertifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, cRes] = await Promise.all([
        api.get("/training"),
        api.get("/training/certifications")
      ]);

      const tData = tRes?.data;
      const cData = cRes?.data;

      // Safe multi-format array extraction for trainings
      const trainingList = Array.isArray(tData)
        ? tData
        : Array.isArray(tData?.data)
          ? tData.data
          : Array.isArray(tData?.trainings)
            ? tData.trainings
            : [];

      // Safe multi-format array extraction for certifications
      const certList = Array.isArray(cData)
        ? cData
        : Array.isArray(cData?.data)
          ? cData.data
          : Array.isArray(cData?.certifications)
            ? cData.certifications
            : [];

      setTrainings(trainingList);
      setCertifications(certList);
    } catch (err) {
      console.error("Error loading training reports:", err);
      toast.error("Failed to load training reports. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3 font-sans">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
        <p className="text-sm text-slate-500 font-medium animate-pulse">Loading training analytics & reports...</p>
      </div>
    );
  }

  // Analytics Calculations
  const byMode = trainings.reduce((acc, t) => {
    const modeKey = t.mode || "online";
    acc[modeKey] = (acc[modeKey] || 0) + 1;
    return acc;
  }, {});
  const maxMode = Math.max(...Object.values(byMode), 1);

  const byStatus = trainings.reduce((acc, t) => {
    const statusKey = t.status || "upcoming";
    acc[statusKey] = (acc[statusKey] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-3 lg:p-4 font-sans">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
        <div>
          <h1 className="text-2xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <BarChart3 className="text-indigo-600" size={28} />
            Training Reports & Analytics
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Comprehensive overview of training statistics, mode distribution, and certifications.
          </p>
        </div>
        <button
          onClick={fetchReports}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 text-sm font-semibold rounded-xl border border-slate-200 hover:border-indigo-200 transition-all shadow-sm cursor-pointer active:scale-95"
          title="Refresh Reports"
        >
          <RefreshCw size={16} className={loading ? "animate-spin text-indigo-600" : ""} />
          <span>Refresh Reports</span>
        </button>
      </div>

      {/* Top Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-300 hover:-translate-y-1.5 transition-all duration-300 flex items-center gap-4 group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300 shadow-sm z-10">
            <GraduationCap size={24} />
          </div>
          <div className="z-10">
            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Total Trainings</p>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">{trainings.length}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-emerald-300 hover:-translate-y-1.5 transition-all duration-300 flex items-center gap-4 group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300 shadow-sm z-10">
            <Award size={24} />
          </div>
          <div className="z-10">
            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Certifications Issued</p>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">{certifications.length}</h3>
          </div>
        </div>
      </div>

      {/* Mode Distribution Section */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
        <h3 className="font-bold text-slate-900 mb-5 text-base flex items-center gap-2">
          Mode Distribution
        </h3>
        {Object.keys(byMode).length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-8">No distribution data available</p>
        ) : (
          <div className="space-y-4">
            {Object.entries(byMode).map(([mode, count]) => (
              <div key={mode} className="flex items-center gap-4 text-sm group">
                <span className="w-24 text-slate-700 font-semibold capitalize">{mode}</span>
                <div className="flex-1 h-3.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/60 shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-500 group-hover:from-indigo-600 group-hover:to-indigo-700"
                    style={{ width: `${(count / maxMode) * 100}%` }}
                  />
                </div>
                <span className="w-10 text-right font-bold text-slate-900 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Status Breakdown Section */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
        <h3 className="font-bold text-slate-900 mb-5 text-base flex items-center gap-2">
          Status Breakdown
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {["upcoming", "ongoing", "completed", "cancelled"].map((status) => (
            <div
              key={status}
              className="p-5 bg-slate-50 hover:bg-indigo-50/50 rounded-2xl text-center border border-slate-200/70 hover:border-indigo-200 transition-all duration-300 group"
            >
              <p className="text-xs text-slate-500 uppercase font-bold tracking-wider capitalize group-hover:text-indigo-600 transition-colors">{status}</p>
              <p className="text-2xl font-black text-slate-900 mt-2">{byStatus[status] || 0}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}