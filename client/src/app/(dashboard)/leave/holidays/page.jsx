// src/app/(dashboard)/leave/holidays/page.jsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Calendar as CalendarIcon,
  Search,
  Plus,
  RefreshCw,
  PartyPopper,
  Clock,
  Sparkles,
  Download,
  Trash2,
  X,
  CheckCircle2,
} from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "react-toastify";

export default function HolidayCalendarPage() {
  const { user } = useAuth();
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Controls
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;

  const [selectedYear, setSelectedYear] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");

  // Add Holiday Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    date: "",
    type: "National",
    description: "",
    optional: false,
  });

  const isAdminOrHR = ["admin", "hr", "manager"].includes(
    user?.role?.toLowerCase() || ""
  );

  // Fetch from backend
  const fetchHolidays = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = selectedYear !== "all" ? { year: selectedYear } : {};
      const response = await api.get("/holiday", { params });

      const list = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response?.data?.data)
          ? response.data.data
          : [];
      setHolidays(list);
    } catch (err) {
      console.error("Fetch holiday error:", err);
      setError(
        err.response?.data?.message ||
        "Failed to synchronize holidays from the database."
      );
      setHolidays([]);
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    fetchHolidays();
  }, [fetchHolidays]);

  // Create new holiday
  const handleCreateHoliday = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.date) {
      toast.error("Please fill in title and date.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/holiday", formData);
      toast.success("Holiday added successfully!");
      setIsModalOpen(false);
      setFormData({
        title: "",
        date: "",
        type: "National",
        description: "",
        optional: false,
      });
      fetchHolidays();
    } catch (err) {
      console.error("Create holiday error:", err);
      toast.error(err.response?.data?.message || "Failed to add holiday.");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete holiday
  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this holiday?")) return;
    try {
      await api.delete(`/holiday/${id}`);
      toast.success("Holiday removed successfully.");
      setHolidays((prev) => prev.filter((h) => h._id !== id));
    } catch (err) {
      console.error("Delete holiday error:", err);
      toast.error(err.response?.data?.message || "Failed to remove holiday.");
    }
  };

  // Filtered and Sorted holidays
  const filteredHolidays = useMemo(() => {
    return holidays
      .filter((h) => {
        const hYear = new Date(h.date).getFullYear().toString();
        const matchesYear = selectedYear === "all" || hYear === selectedYear.toString();

        const matchesSearch =
          h.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          h.description?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesType =
          selectedType === "all" ||
          h.type?.toLowerCase() === selectedType.toLowerCase() ||
          (selectedType === "optional" && h.optional);

        return matchesYear && matchesSearch && matchesType;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [holidays, searchQuery, selectedType, selectedYear]);

  // Next Upcoming Holiday Detection
  const nextHoliday = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return holidays
      .filter((h) => new Date(h.date) >= today)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
  }, [holidays]);

  // Calculate days remaining
  const daysUntilNext = useMemo(() => {
    if (!nextHoliday) return null;
    const diff =
      new Date(nextHoliday.date).getTime() - new Date().setHours(0, 0, 0, 0);
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }, [nextHoliday]);

  // CSV Export
  const exportHolidaysCSV = () => {
    if (!filteredHolidays.length) return;
    const headers = ["Holiday Name", "Date", "Day", "Type", "Description"];
    const rows = filteredHolidays.map((h) => {
      const d = new Date(h.date);
      const day = d.toLocaleDateString("en-US", { weekday: "long" });
      return [
        `"${h.title}"`,
        h.date,
        day,
        `"${h.type}"`,
        `"${h.description || ""}"`,
      ];
    });
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `Company_Holidays_${selectedYear}.csv`;
    link.click();
  };

  const getBadgeStyle = (type, optional) => {
    if (optional)
      return "bg-amber-50 text-amber-700 border-amber-200";
    switch (type?.toLowerCase()) {
      case "national":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "gazetted":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4 lg:px-0 font-sans">
      {/* Top Banner & Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs transition-transform hover:scale-105">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Holiday Calendar
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Official database list of national, regional, and restricted company holidays.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Year Selector */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-semibold rounded-2xl border border-slate-200 focus:outline-hidden cursor-pointer transition-all shadow-xs hover:border-slate-300"
          >
            <option value="all">📅 All Years (Current & Upcoming)</option>
            <option value={currentYear.toString()}>{currentYear} Calendar</option>
            <option value={nextYear.toString()}>{nextYear} Calendar (Upcoming)</option>
          </select>

          {/* Export Button */}
          <button
            onClick={exportHolidaysCSV}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 text-xs font-semibold rounded-2xl transition-all shadow-xs active:scale-95 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export</span>
          </button>

          {/* Add Holiday Button */}
          {isAdminOrHR && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold rounded-2xl shadow-md shadow-indigo-100 transition-all transform hover:-translate-y-0.5 active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Holiday</span>
            </button>
          )}

          {/* Refresh Button */}
          <button
            onClick={fetchHolidays}
            disabled={loading}
            className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl border border-slate-200 transition-all disabled:opacity-50 cursor-pointer shadow-xs active:scale-95 hover:border-slate-300"
            title="Refresh Holidays"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-600" : ""}`} />
          </button>
        </div>
      </div>

      {/* Spotlight Card: Next Upcoming Holiday (Clean White Theme) */}
      {nextHoliday && (
        <div className="relative overflow-hidden bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-sm hover:shadow-md transition-all duration-300">
          <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-indigo-50/70 rounded-full blur-3xl pointer-events-none" />

          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                <span>Next Upcoming Holiday</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                {nextHoliday.title}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 max-w-xl">
                {nextHoliday.description || "Public observance across all branch offices."}
              </p>
            </div>

            <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 p-4 rounded-2xl self-start md:self-auto shadow-xs">
              <div className="text-center px-2">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Date
                </p>
                <p className="text-base sm:text-lg font-bold text-slate-800 mt-0.5">
                  {new Date(nextHoliday.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric"
                  })}
                </p>
              </div>
              <div className="w-px h-10 bg-slate-200" />
              <div className="text-center px-2">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Countdown
                </p>
                <p className="text-base sm:text-lg font-bold text-emerald-600 mt-0.5">
                  {daysUntilNext === 0
                    ? "Today!"
                    : `${daysUntilNext} day${daysUntilNext > 1 ? "s" : ""} left`}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search holiday name or occasion..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all hover:border-slate-300"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {["all", "National", "Gazetted", "Restricted", "optional"].map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedType(tab)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition-all cursor-pointer ${selectedType === tab
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/60"
                }`}
            >
              {tab === "all" ? "All Types" : tab}
            </button>
          ))}
        </div>
      </div>

      {/* Holidays Grid Display */}
      {loading ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-800">
            Loading holidays from database...
          </p>
        </div>
      ) : error ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-rose-200 shadow-xs max-w-md mx-auto space-y-3">
          <p className="text-xs text-rose-600 font-semibold">{error}</p>
          <button
            onClick={fetchHolidays}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer hover:bg-indigo-700 transition"
          >
            Retry
          </button>
        </div>
      ) : filteredHolidays.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-slate-200/80 shadow-xs max-w-md mx-auto">
          <PartyPopper className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900">No Holidays Found</h3>
          <p className="text-xs text-slate-500 mt-1">
            No holidays are currently logged for the selected filter criteria.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredHolidays.map((h) => {
            const hDate = new Date(h.date);
            const isPast =
              new Date().setHours(0, 0, 0, 0) > hDate.setHours(0, 0, 0, 0);

            const dayName = new Intl.DateTimeFormat("en-US", {
              weekday: "long",
            }).format(hDate);
            const monthName = new Intl.DateTimeFormat("en-US", {
              month: "short",
            }).format(hDate);
            const dateNumber = hDate.getDate();
            const yearNumber = hDate.getFullYear();

            return (
              <div
                key={h._id}
                className={`rounded-3xl border p-5 sm:p-6 transition-all duration-300 flex flex-col justify-between space-y-4 group ${isPast
                  ? "bg-slate-50/80 border-slate-200/60 opacity-60 hover:opacity-90"
                  : "bg-white border-slate-200/90 shadow-xs hover:shadow-xl hover:-translate-y-1 hover:border-indigo-200"
                  }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3.5 min-w-0">
                    {/* Calendar Tear-off Sheet Icon */}
                    <div className={`w-12 h-14 rounded-2xl border flex flex-col overflow-hidden text-center shrink-0 shadow-xs transition-transform group-hover:scale-105 ${isPast ? "bg-slate-200/50 border-slate-300" : "bg-slate-50 border-slate-200"
                      }`}>
                      <span className={`text-[9px] font-bold uppercase tracking-wider py-0.5 ${isPast ? "bg-slate-400 text-white" : "bg-indigo-600 text-white"
                        }`}>
                        {monthName}
                      </span>
                      <span className={`text-base font-black flex-1 flex items-center justify-center ${isPast ? "text-slate-500" : "text-slate-800"
                        }`}>
                        {dateNumber}
                      </span>
                    </div>

                    <div className="truncate">
                      <h3 className={`text-sm font-bold leading-snug truncate transition-colors ${isPast ? "text-slate-600 line-through" : "text-slate-900 group-hover:text-indigo-600"
                        }`}>
                        {h.title}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1 font-medium">
                        <Clock className="w-3 h-3" />
                        {dayName}, {yearNumber}
                      </p>
                    </div>
                  </div>

                  {isAdminOrHR && (
                    <button
                      onClick={() => handleDelete(h._id)}
                      className="text-slate-300 hover:text-rose-500 p-1.5 rounded-xl hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Delete Holiday"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                  {h.description || "General non-working day for all staff members across branch offices."}
                </p>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${getBadgeStyle(
                      h.type,
                      h.optional
                    )}`}
                  >
                    {h.optional ? "Restricted / Optional" : h.type || "Gazetted"}
                  </span>

                  {isPast ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-medium bg-slate-200/60 px-2.5 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3" /> Concluded
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-semibold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                      <Sparkles className="w-3 h-3" /> Upcoming
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Holiday Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <h3 className="text-base font-bold text-slate-900">Add New Holiday</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateHoliday} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Holiday Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Diwali, Christmas"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="w-full text-xs p-3 rounded-2xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50 hover:border-slate-300 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                    className="w-full text-xs p-3 rounded-2xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50 cursor-pointer hover:border-slate-300 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Classification
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value })
                    }
                    className="w-full text-xs p-3 rounded-2xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50 cursor-pointer hover:border-slate-300 transition-all"
                  >
                    <option value="National">National</option>
                    <option value="Gazetted">Gazetted</option>
                    <option value="Restricted">Restricted</option>
                    <option value="Regional">Regional</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Description / Remarks
                </label>
                <textarea
                  rows={2}
                  placeholder="Brief note about the occasion..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full text-xs p-3 rounded-2xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50 hover:border-slate-300 transition-all"
                />
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={formData.optional}
                  onChange={(e) =>
                    setFormData({ ...formData, optional: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="text-xs text-slate-600 font-medium">
                  Mark as Optional / Floating Holiday
                </span>
              </label>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-2xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-2xl transition shadow-md shadow-indigo-100 disabled:opacity-50 cursor-pointer transform hover:-translate-y-0.5 active:scale-95"
                >
                  {submitting ? "Saving..." : "Save Holiday"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}