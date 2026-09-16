"use client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, Calendar, FileText, RefreshCw, Filter } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Table from "@/components/ui/Table";

export default function ShiftRosterPage() {
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);

  // Calculate initial date range safely
  const today = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(today.getDate() + 7);

  const [startDate, setStartDate] = useState(today.toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(nextWeek.toISOString().split("T")[0]);

  // Fetch roster data from backend smoothly based on selected dates
  const fetchData = useCallback(async () => {
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

  // Table columns configuration with badge styles & modern look
  const columns = [
    {
      key: "employee",
      label: "Employee",
      render: (r) => (
        <span className="font-semibold text-slate-800">
          {r.employee?.name || "—"}
        </span>
      )
    },
    {
      key: "shift",
      label: "Shift Name",
      render: (r) => (
        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700">
          {r.shift?.name || "—"}
        </span>
      )
    },
    {
      key: "timing",
      label: "Shift Timing",
      render: (r) => (
        <span className="text-slate-600 font-medium">
          {r.shift?.startTime || "—"} - {r.shift?.endTime || "—"}
        </span>
      )
    },
    {
      key: "date",
      label: "Assigned Date",
      render: (r) => (
        <span className="text-slate-500 flex items-center gap-1.5">
          <Calendar size={14} className="text-indigo-500" />
          {new Date(r.date).toLocaleDateString()}
        </span>
      )
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-4 sm:px-6 lg:px-8 py-6 transition-all duration-300">

      {/* Header & Filter Controls Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Shift Roster</h1>
          <p className="text-sm text-slate-500 mt-1">View active shift schedules and employee allocations across date ranges.</p>
        </div>

        {/* Date Filter Inputs Container */}
        <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-1.5 pl-2 text-xs font-semibold text-slate-500">
            <Filter size={14} className="text-indigo-600" /> Range:
          </div>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all bg-slate-50 hover:bg-white cursor-pointer"
          />
          <span className="text-slate-400 font-medium">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all bg-slate-50 hover:bg-white cursor-pointer"
          />
          <button
            onClick={fetchData}
            title="Refresh Roster"
            className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl transition-all duration-300 hover:rotate-180"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Table Container with Smooth Styling */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
        {loading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
            <Loader2 className="animate-spin text-indigo-600" size={36} />
            <p className="text-sm text-slate-500 font-medium">Loading shift roster data...</p>
          </div>
        ) : (
          <Table
            columns={columns}
            data={roster}
            emptyText="No shift assignments found for the selected date range."
          />
        )}
      </div>

    </div>
  );
}