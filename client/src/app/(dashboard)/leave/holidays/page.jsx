// src/app/(dashboard)/leave/holidays/page.jsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCw,
  Download,
  Trash2,
  X,
  PartyPopper,
  CalendarDays,
  Clock,
} from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "react-toastify";

/* ------------------------------ helpers ------------------------------ */

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const pad = (n) => String(n).padStart(2, "0");
const keyOf = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const dateToKey = (d) => keyOf(d.getFullYear(), d.getMonth(), d.getDate());

// Backend date string ("2026-10-20T00:00:00.000Z") ko timezone shift ke bina YYYY-MM-DD me badalta hai
const holidayKey = (h) =>
  typeof h.date === "string" && h.date.length >= 10
    ? h.date.slice(0, 10)
    : dateToKey(new Date(h.date));

const keyToDate = (key) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const longDate = (key) =>
  keyToDate(key).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

const typeStyle = (type, optional) => {
  if (optional)
    return {
      chip: "bg-amber-50 text-amber-700 border-amber-200",
      dot: "bg-amber-500",
      label: "Optional",
    };
  switch (type?.toLowerCase()) {
    case "national":
      return { chip: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", label: "National" };
    case "gazetted":
      return { chip: "bg-indigo-50 text-indigo-700 border-indigo-200", dot: "bg-indigo-500", label: "Gazetted" };
    case "regional":
      return { chip: "bg-sky-50 text-sky-700 border-sky-200", dot: "bg-sky-500", label: "Regional" };
    case "restricted":
      return { chip: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-500", label: "Restricted" };
    default:
      return { chip: "bg-slate-100 text-slate-700 border-slate-200", dot: "bg-slate-400", label: type || "Holiday" };
  }
};

/* --------------------- animated modal (reusable) --------------------- */

function Modal({ open, onClose, title, children, maxWidth = "sm:max-w-md" }) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const id = requestAnimationFrame(() =>
        requestAnimationFrame(() => setVisible(true))
      );
      return () => cancelAnimationFrame(id);
    }
    setVisible(false);
    const t = setTimeout(() => setMounted(false), 250);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!mounted) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [mounted, onClose]);

  if (!mounted) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"
          }`}
      />
      <div
        className={`relative w-full ${maxWidth} bg-white shadow-2xl rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto transition-all duration-300 ease-out ${visible
          ? "opacity-100 translate-y-0 sm:scale-100"
          : "opacity-0 translate-y-8 sm:translate-y-0 sm:scale-95"
          }`}
      >
        <div className="p-5 sm:p-7">
          <div className="flex items-center justify-between gap-4 pb-3.5 mb-4 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900">{title}</h3>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- page -------------------------------- */

const EMPTY_FORM = {
  title: "",
  date: "",
  type: "National",
  description: "",
  optional: false,
};

export default function HolidayCalendarPage() {
  const { user } = useAuth();
  const todayKey = dateToKey(new Date());
  const now = new Date();

  const [view, setView] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Day details popup (dayKey alag rakha hai taaki close animation me content na ud jaye)
  const [dayOpen, setDayOpen] = useState(false);
  const [dayKey, setDayKey] = useState(null);

  const [addOpen, setAddOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const isAdminOrHR = ["admin", "hr", "manager"].includes(
    user?.role?.toLowerCase() || ""
  );

  // Year dropdown: aas-paas ke saal + viewed year
  const yearOptions = useMemo(() => {
    const base = now.getFullYear();
    const set = new Set([view.year]);
    for (let y = base - 3; y <= base + 3; y++) set.add(y);
    return [...set].sort((a, b) => a - b);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.year]);

  /* ----------------------------- data ----------------------------- */

  const fetchHolidays = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/holiday", { params: { year: view.year } });
      const list = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response?.data?.data)
          ? response.data.data
          : [];
      setHolidays(list);
    } catch (err) {
      console.error("Fetch holiday error:", err);
      setError(err.response?.data?.message || "Failed to load holidays from the database.");
      setHolidays([]);
    } finally {
      setLoading(false);
    }
  }, [view.year]);

  useEffect(() => {
    fetchHolidays();
  }, [fetchHolidays]);

  // date -> holidays[]
  const holidayMap = useMemo(() => {
    const map = {};
    holidays.forEach((h) => {
      const k = holidayKey(h);
      (map[k] = map[k] || []).push(h);
    });
    return map;
  }, [holidays]);

  // Calendar cells (Sunday start, poori weeks)
  const cells = useMemo(() => {
    const first = new Date(view.year, view.month, 1);
    const offset = first.getDay();
    const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
    const total = Math.ceil((offset + daysInMonth) / 7) * 7;
    return Array.from({ length: total }, (_, i) => {
      const d = new Date(view.year, view.month, 1 - offset + i);
      return {
        key: dateToKey(d),
        day: d.getDate(),
        inMonth: d.getMonth() === view.month,
        isToday: dateToKey(d) === todayKey,
        isWeekend: d.getDay() === 0 || d.getDay() === 6,
      };
    });
  }, [view, todayKey]);

  // Visible month ke holidays (mobile/tablet agenda list)
  const monthHolidays = useMemo(() => {
    const prefix = `${view.year}-${pad(view.month + 1)}-`;
    return holidays
      .filter((h) => holidayKey(h).startsWith(prefix))
      .sort((a, b) => holidayKey(a).localeCompare(holidayKey(b)));
  }, [holidays, view]);

  const dayHolidays = dayKey ? holidayMap[dayKey] || [] : [];

  /* -------------------------- navigation -------------------------- */

  const goPrev = () =>
    setView((v) => (v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 }));
  const goNext = () =>
    setView((v) => (v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 }));
  const goToday = () => {
    const t = new Date();
    setView({ year: t.getFullYear(), month: t.getMonth() });
  };

  const isCurrentMonth =
    view.year === now.getFullYear() && view.month === now.getMonth();

  /* ---------------------------- actions ---------------------------- */

  const openDay = (key) => {
    // Holiday wali date sabke liye; khaali date sirf admin/HR ke liye (add karne ke liye)
    if (!(holidayMap[key] || []).length && !isAdminOrHR) return;
    setDayKey(key);
    setDayOpen(true);
  };

  const openAdd = (dateKey) => {
    setFormData({ ...EMPTY_FORM, date: dateKey || todayKey });
    setDayOpen(false);
    setAddOpen(true);
  };

  const handleCreateHoliday = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.date) {
      toast.error("Please fill in title and date.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/holiday", formData);
      toast.success("Holiday added successfully!");
      setAddOpen(false);
      // Jis mahine me add hua wahi dikhao
      const d = keyToDate(formData.date);
      setView({ year: d.getFullYear(), month: d.getMonth() });
      if (d.getFullYear() === view.year) fetchHolidays();
    } catch (err) {
      console.error("Create holiday error:", err);
      toast.error(err.response?.data?.message || "Failed to add holiday.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (h) => {
    if (!confirm(`Delete "${h.title}"?`)) return;
    try {
      await api.delete(`/holiday/${h._id}`);
      toast.success("Holiday removed successfully.");
      setHolidays((prev) => prev.filter((x) => x._id !== h._id));
    } catch (err) {
      console.error("Delete holiday error:", err);
      toast.error(err.response?.data?.message || "Failed to remove holiday.");
    }
  };

  const exportHolidaysCSV = () => {
    if (!holidays.length) return toast.info("No holidays to export.");
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const headers = ["Holiday Name", "Date", "Day", "Type", "Optional", "Description"];
    const rows = [...holidays]
      .sort((a, b) => holidayKey(a).localeCompare(holidayKey(b)))
      .map((h) => {
        const k = holidayKey(h);
        return [
          esc(h.title),
          k,
          keyToDate(k).toLocaleDateString("en-US", { weekday: "long" }),
          esc(h.type),
          h.optional ? "Yes" : "No",
          esc(h.description),
        ].join(",");
      });
    const blob = new Blob([[headers.join(","), ...rows].join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Company_Holidays_${view.year}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  /* ----------------------------- render ----------------------------- */

  const selectCls =
    "px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 cursor-pointer transition-all";
  const inputCls =
    "w-full text-sm p-3 rounded-2xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50 hover:border-slate-300 transition-all";

  return (
    <div className="max-w-full mx-auto space-y-3 px-2 sm:px-3 py-2 font-sans">
      {/* Page header */}
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-slate-700">
          Holiday Calendar
        </h1>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={fetchHolidays}
            disabled={loading}
            title="Refresh"
            className="p-2 bg-white hover:bg-slate-50 text-slate-600 rounded-lg border border-slate-200 transition-all disabled:opacity-50 cursor-pointer active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-600" : ""}`} />
          </button>
          <button
            onClick={exportHolidaysCSV}
            title="Export CSV"
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-all active:scale-95 cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">Export</span>
          </button>
          {isAdminOrHR && (
            <button
              onClick={() => openAdd()}
              className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm hover:shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden xs:inline sm:inline">Add Holiday</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm font-medium rounded-2xl px-4 py-2.5">
          <span>{error}</span>
          <button
            onClick={fetchHolidays}
            className="shrink-0 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Calendar card (full width, image jaisa) */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/70 shadow-sm p-3 sm:p-4">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-bold text-slate-900">
              {MONTHS[view.month]} {view.year}
            </h2>
            {loading && <RefreshCw className="w-3.5 h-3.5 text-indigo-500 animate-spin" />}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={view.month}
              onChange={(e) => setView((v) => ({ ...v, month: Number(e.target.value) }))}
              className={`${selectCls} flex-1 sm:flex-none`}
              aria-label="Select month"
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i}>{m}</option>
              ))}
            </select>

            <select
              value={view.year}
              onChange={(e) => setView((v) => ({ ...v, year: Number(e.target.value) }))}
              className={`${selectCls} flex-1 sm:flex-none`}
              aria-label="Select year"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <button
                onClick={goPrev}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition active:scale-95 cursor-pointer"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={goToday}
                disabled={isCurrentMonth}
                className="flex-1 sm:flex-none px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition active:scale-95 disabled:opacity-50 disabled:cursor-default cursor-pointer"
              >
                Today
              </button>
              <button
                onClick={goNext}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition active:scale-95 cursor-pointer"
                aria-label="Next month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Grid */}
        <div
          className={`border border-slate-200 rounded-lg overflow-hidden transition-opacity duration-300 ${loading ? "opacity-60" : "opacity-100"}`}
        >
          <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className="py-1.5 text-center text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500"
              >
                <span className="sm:hidden">{d[0]}</span>
                <span className="hidden sm:inline">{d}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {cells.map((c, idx) => {
              const list = holidayMap[c.key] || [];
              const lastCol = idx % 7 === 6;
              const lastRow = idx >= cells.length - 7;
              const clickable = list.length > 0 || isAdminOrHR;

              return (
                <button
                  type="button"
                  key={c.key}
                  onClick={() => openDay(c.key)}
                  className={`relative text-left min-h-[48px] sm:min-h-[60px] lg:min-h-[64px] p-1 sm:p-1.5 flex flex-col transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500
                    ${clickable ? "cursor-pointer" : "cursor-default"}
                    ${lastCol ? "" : "border-r"} ${lastRow ? "" : "border-b"} border-slate-200
                    ${c.inMonth ? (c.isWeekend ? "bg-slate-50/70" : "bg-white") : "bg-slate-50/40"}
                    ${clickable ? "hover:bg-indigo-50/60" : ""}`}
                >
                  <span
                    className={`self-end inline-flex items-center justify-center text-[11px] font-semibold w-5 h-5 sm:w-[22px] sm:h-[22px] rounded-full
                      ${c.isToday ? "bg-indigo-600 text-white" : c.inMonth ? "text-slate-800" : "text-slate-300"}`}
                  >
                    {c.day}
                  </span>

                  {/* Tablet/desktop: title chips */}
                  <div className="hidden sm:flex flex-col gap-0.5 mt-0.5 min-w-0">
                    {list.slice(0, 2).map((h) => {
                      const s = typeStyle(h.type, h.optional);
                      return (
                        <span
                          key={h._id}
                          className={`block truncate px-1.5 py-px rounded-md border text-[10px] font-semibold ${s.chip} ${c.inMonth ? "" : "opacity-60"}`}
                          title={h.title}
                        >
                          {h.title}
                        </span>
                      );
                    })}
                    {list.length > 2 && (
                      <span className="text-[10px] font-semibold text-slate-500 px-1">
                        +{list.length - 2} more
                      </span>
                    )}
                  </div>

                  {/* Mobile: dots */}
                  {list.length > 0 && (
                    <div className="sm:hidden flex items-center justify-center gap-0.5 mt-auto pb-0.5">
                      {list.slice(0, 3).map((h) => (
                        <span
                          key={h._id}
                          className={`w-1.5 h-1.5 rounded-full ${typeStyle(h.type, h.optional).dot} ${c.inMonth ? "" : "opacity-50"}`}
                        />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-3">
          {[
            ["National", "bg-emerald-500"],
            ["Gazetted", "bg-indigo-500"],
            ["Regional", "bg-sky-500"],
            ["Restricted", "bg-rose-500"],
            ["Optional", "bg-amber-500"],
          ].map(([label, dot]) => (
            <span key={label} className="inline-flex items-center gap-1.5 text-[11px] text-slate-600 font-medium">
              <span className={`w-2 h-2 rounded-full ${dot}`} />
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Month list: sirf mobile/tablet par (desktop par page ek screen me rakhne ke liye hidden) */}
      <div className="lg:hidden bg-white rounded-2xl border border-slate-200/70 shadow-sm p-3.5">
        <div className="flex items-center justify-between gap-3 mb-2">
          <h3 className="text-sm font-bold text-slate-900 truncate">
            Holidays in {MONTHS[view.month]} {view.year}
          </h3>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
            {monthHolidays.length}
          </span>
        </div>

        {monthHolidays.length === 0 ? (
          <div className="py-5 text-center">
            <PartyPopper className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
            <p className="text-sm font-semibold text-slate-700">No holidays this month</p>
            <p className="text-xs text-slate-500 mt-0.5">Try another month or year.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {monthHolidays.map((h) => {
              const k = holidayKey(h);
              const d = keyToDate(k);
              const s = typeStyle(h.type, h.optional);
              const isPast = k < todayKey;
              return (
                <button
                  key={h._id}
                  onClick={() => openDay(k)}
                  className={`w-full text-left flex items-center gap-2.5 py-2 px-1 hover:bg-slate-50 rounded-xl transition cursor-pointer ${isPast ? "opacity-60" : ""}`}
                >
                  <div className="w-10 h-11 rounded-xl border border-slate-200 overflow-hidden text-center shrink-0 bg-slate-50">
                    <div className={`text-[9px] font-bold uppercase py-px text-white ${isPast ? "bg-slate-400" : "bg-indigo-600"}`}>
                      {MONTHS[d.getMonth()].slice(0, 3)}
                    </div>
                    <div className="text-sm font-black text-slate-800 leading-6">{d.getDate()}</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-bold text-slate-900 truncate ${isPast ? "line-through" : ""}`}>
                      {h.title}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {d.toLocaleDateString("en-US", { weekday: "long" })}
                    </p>
                  </div>
                  <span className={`shrink-0 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${s.chip}`}>
                    {h.optional ? "Optional" : s.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Day details popup */}
      <Modal
        open={dayOpen}
        onClose={() => setDayOpen(false)}
        title={dayKey ? longDate(dayKey) : "Holiday Details"}
      >
        <div className="space-y-3">
          {dayHolidays.length === 0 ? (
            <div className="py-4 text-center">
              <CalendarDays className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
              <p className="text-sm text-slate-500">No holiday on this date.</p>
            </div>
          ) : (
            dayHolidays.map((h) => {
              const s = typeStyle(h.type, h.optional);
              return (
                <div key={h._id} className="p-3.5 rounded-2xl border border-slate-200">
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="text-base font-bold text-slate-900">{h.title}</h4>
                    <span className={`shrink-0 px-2.5 py-0.5 rounded-full border text-[11px] font-semibold ${s.chip}`}>
                      {h.optional ? "Optional" : s.label}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed mt-1.5">
                    {h.description || "General non-working day for all staff members across branch offices."}
                  </p>
                  {isAdminOrHR && (
                    <div className="flex justify-end mt-3">
                      <button
                        onClick={() => handleDelete(h)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition cursor-pointer active:scale-95"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}

          {isAdminOrHR && dayKey && (
            <button
              onClick={() => openAdd(dayKey)}
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-semibold transition cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" /> Add holiday on this date
            </button>
          )}
        </div>
      </Modal>

      {/* Add holiday modal */}
      <Modal open={addOpen} onClose={() => !submitting && setAddOpen(false)} title="Add New Holiday">
        <form onSubmit={handleCreateHoliday} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Holiday Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Diwali, Christmas"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Date</label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className={`${inputCls} cursor-pointer`}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Classification</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className={`${inputCls} cursor-pointer`}
              >
                <option value="National">National</option>
                <option value="Gazetted">Gazetted</option>
                <option value="Restricted">Restricted</option>
                <option value="Regional">Regional</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Description / Remarks</label>
            <textarea
              rows={2}
              placeholder="Brief note about the occasion..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className={inputCls}
            />
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.optional}
              onChange={(e) => setFormData({ ...formData, optional: e.target.checked })}
              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <span className="text-xs sm:text-sm text-slate-600 font-medium">
              Mark as Optional / Floating Holiday
            </span>
          </label>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setAddOpen(false)}
              disabled={submitting}
              className="px-5 py-2.5 text-sm font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 rounded-xl transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition shadow-sm hover:shadow-lg disabled:opacity-50 cursor-pointer active:scale-95"
            >
              {submitting ? "Saving..." : "Save Holiday"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}