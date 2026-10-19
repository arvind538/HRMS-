"use client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, Calendar, RefreshCw, Filter, Clock, User, CalendarX } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Table from "@/components/ui/Table";

// Local-timezone safe YYYY-MM-DD (toISOString UTC me convert karta hai, jisse date ek din aage/peeche ho sakti hai)
const toInputDate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
};

export default function ShiftRosterPage() {
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);

  const [startDate, setStartDate] = useState(() => toInputDate(new Date()));
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return toInputDate(d);
  });

  const fetchData = useCallback(async () => {
    // Invalid range: start > end
    if (startDate && endDate && startDate > endDate) {
      toast.warn("Start date end date se pehle honi chahiye.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.get("/shifts/roster", { params: { startDate, endDate } });
      setRoster(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error("Failed to load shift roster data.");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Desktop table columns
  const columns = [
    {
      key: "employee",
      label: "Employee",
      render: (r) => (
        <span className="font-semibold text-slate-800">{r.employee?.name || "—"}</span>
      ),
    },
    {
      key: "shift",
      label: "Shift Name",
      render: (r) => (
        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 capitalize">
          {r.shift?.name || "—"}
        </span>
      ),
    },
    {
      key: "timing",
      label: "Shift Timing",
      render: (r) => (
        <span className="text-slate-600 font-medium">
          {r.shift?.startTime || "—"} - {r.shift?.endTime || "—"}
        </span>
      ),
    },
    {
      key: "date",
      label: "Assigned Date",
      render: (r) => (
        <span className="text-slate-500 flex items-center gap-1.5">
          <Calendar size={14} className="text-indigo-500" />
          {formatDate(r.date)}
        </span>
      ),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-5 sm:space-y-6 px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
      {/* Header & Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-4 sm:pb-5">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Shift Roster
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            View active shift schedules and employee allocations across date ranges.
          </p>
        </div>

        {/* Filter box: mobile par stacked, tablet/desktop par ek row */}
        <div className="w-full lg:w-auto bg-white p-3 sm:p-2 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-3">
            <div className="hidden sm:flex items-center gap-1.5 pl-2 text-xs font-semibold text-slate-500">
              <Filter size={14} className="text-indigo-600" /> Range:
            </div>

            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-3 flex-1">
              <label className="flex flex-col sm:block gap-1">
                <span className="sm:hidden text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                  From
                </span>
                <input
                  type="date"
                  value={startDate}
                  max={endDate || undefined}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all bg-slate-50 hover:bg-white cursor-pointer"
                />
              </label>

              <span className="hidden sm:inline text-slate-400 font-medium">to</span>

              <label className="flex flex-col sm:block gap-1">
                <span className="sm:hidden text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                  To
                </span>
                <input
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all bg-slate-50 hover:bg-white cursor-pointer"
                />
              </label>
            </div>

            <button
              onClick={fetchData}
              disabled={loading}
              title="Refresh Roster"
              className="inline-flex items-center justify-center gap-2 p-2 sm:px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl transition-all duration-300 disabled:opacity-60 text-sm font-semibold"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              <span className="sm:hidden">Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm py-16 sm:py-20 text-center flex flex-col items-center justify-center gap-3">
          <Loader2 className="animate-spin text-indigo-600" size={36} />
          <p className="text-sm text-slate-500 font-medium">Loading shift roster data...</p>
        </div>
      ) : (
        <>
          {/* Desktop / Tablet: Table (md and up) */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-shadow duration-300 hover:shadow-md">
            <div className="overflow-x-auto">
              <Table
                columns={columns}
                data={roster}
                emptyText="No shift assignments found for the selected date range."
              />
            </div>
          </div>

          {/* Mobile: Cards (below md) */}
          <div className="md:hidden space-y-3">
            {roster.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm py-12 px-6 text-center flex flex-col items-center gap-3">
                <CalendarX size={32} className="text-slate-300" />
                <p className="text-sm text-slate-500">
                  No shift assignments found for the selected date range.
                </p>
              </div>
            ) : (
              <>
                <p className="text-xs font-semibold text-slate-500 px-1">
                  {roster.length} assignment{roster.length > 1 ? "s" : ""}
                </p>
                {roster.map((r, i) => (
                  <div
                    key={r.id || r._id || i}
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 active:scale-[0.99] transition-transform duration-200"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="shrink-0 w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                          <User size={18} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 truncate">
                            {r.employee?.name || "—"}
                          </p>
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <Calendar size={12} className="text-indigo-500" />
                            {formatDate(r.date)}
                          </p>
                        </div>
                      </div>
                      <span className="shrink-0 inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 capitalize">
                        {r.shift?.name || "—"}
                      </span>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 text-sm text-slate-600">
                      <Clock size={14} className="text-slate-400" />
                      <span className="font-medium">
                        {r.shift?.startTime || "—"} - {r.shift?.endTime || "—"}
                      </span>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}