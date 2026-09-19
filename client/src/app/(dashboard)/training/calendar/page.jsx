// src/app/(dashboard)/training/calendar/page.jsx
"use client";
import { useEffect, useState } from "react";
import { Loader2, Calendar, RefreshCw } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Badge from "@/components/ui/Badge";

export default function TrainingCalendarPage() {
  const [trainings, setTrainings] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCalendar = async () => {
    setLoading(true);
    try {
      const response = await api.get("/training");
      const rawData = response?.data;

      // Safe extraction supporting different backend response wrappers
      const list = Array.isArray(rawData)
        ? rawData
        : Array.isArray(rawData?.data)
          ? rawData.data
          : Array.isArray(rawData?.trainings)
            ? rawData.trainings
            : [];

      // Sort by start date safely (earliest to latest)
      const sorted = list.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
      setTrainings(sorted);
    } catch (err) {
      console.error("Error loading calendar:", err);
      toast.error("Failed to load training calendar. Please refresh.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendar();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3 font-sans">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
        <p className="text-sm text-slate-500 font-medium animate-pulse">Loading training calendar...</p>
      </div>
    );
  }

  const statusVariant = {
    upcoming: "info",
    ongoing: "warning",
    completed: "success",
    cancelled: "danger"
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto p-4 sm:p-3 lg:p-4 font-sans">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
        <div>
          <h1 className="text-2xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Training Calendar
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Chronological timeline overview of all scheduled company trainings.
          </p>
        </div>
        <button
          onClick={fetchCalendar}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 text-sm font-semibold rounded-xl border border-slate-200 hover:border-indigo-200 transition-all shadow-sm cursor-pointer active:scale-95"
          title="Refresh Calendar"
        >
          <RefreshCw size={16} className={loading ? "animate-spin text-indigo-600" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Content List / Empty State */}
      {trainings.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-16 text-center shadow-sm hover:border-indigo-300 hover:bg-indigo-50/20 transition-all duration-300">
          <div className="h-16 w-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100 shadow-sm">
            <Calendar className="text-slate-400" size={32} />
          </div>
          <p className="text-lg text-slate-800 font-bold">No training schedule found</p>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            There are no training sessions scheduled in the calendar yet.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
          {trainings.map((t) => {
            const startDate = t.startDate ? new Date(t.startDate) : null;
            const monthStr = startDate ? startDate.toLocaleDateString("en-US", { month: "short" }) : "TBA";
            const dayNum = startDate ? startDate.getDate() : "—";

            return (
              <div
                key={t._id || t.id}
                className="flex items-center gap-4 p-5 sm:p-6 transition-all duration-200 hover:bg-indigo-50/40 hover:shadow-sm group relative"
              >
                {/* Date Badge Box with Hover Animation */}
                <div className="w-16 py-2 bg-slate-50 group-hover:bg-indigo-600 text-slate-700 group-hover:text-white rounded-2xl text-center shrink-0 border border-slate-200 group-hover:border-indigo-600 transition-all duration-300 shadow-xs">
                  <p className="text-[11px] uppercase font-bold tracking-wider">
                    {monthStr}
                  </p>
                  <p className="text-xl font-black mt-0.5">
                    {dayNum}
                  </p>
                </div>

                {/* Training Details */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 text-base group-hover:text-indigo-600 transition-colors truncate">
                    {t.title}
                  </p>
                  <p className="text-xs font-medium text-slate-500 mt-1 flex items-center gap-2">
                    <span className="text-slate-700 font-semibold">{t.trainer || "Instructor TBA"}</span>
                    <span>•</span>
                    <span className="capitalize">{t.mode || "Online"}</span>
                  </p>
                </div>

                {/* Status Badge */}
                <div className="shrink-0">
                  <Badge variant={statusVariant[t.status] || "neutral"}>
                    {t.status || "upcoming"}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}