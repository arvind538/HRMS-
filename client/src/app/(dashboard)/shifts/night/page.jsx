"use client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, Moon, Calendar, User, Clock, RefreshCw } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Table from "@/components/ui/Table";

export default function NightShiftPage() {
  const [nightShifts, setNightShifts] = useState([]);
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch night shifts and corresponding roster data safely from backend
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const shiftsRes = await api.get("/shifts");
      const allShifts = Array.isArray(shiftsRes.data) ? shiftsRes.data : [];
      const night = allShifts.filter((s) => s.isNightShift);
      setNightShifts(night);

      if (night.length > 0) {
        const today = new Date().toISOString().split("T")[0];
        const nextMonth = new Date();
        nextMonth.setDate(nextMonth.getDate() + 30);

        const { data } = await api.get("/shifts/roster", {
          params: {
            startDate: today,
            endDate: nextMonth.toISOString().split("T")[0]
          }
        });

        const list = Array.isArray(data) ? data : [];
        setRoster(list.filter((r) => night.some((n) => n._id === r.shift?._id)));
      } else {
        setRoster([]);
      }
    } catch (err) {
      toast.error("Failed to load night shift roster data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Modern styled table column definitions with icons and badges
  const columns = [
    {
      key: "employee",
      label: "Employee Name",
      render: (r) => (
        <span className="font-semibold text-slate-800 flex items-center gap-2">
          <User size={15} className="text-violet-600" />
          {r.employee?.name || "—"}
        </span>
      )
    },
    {
      key: "shift",
      label: "Night Shift Template",
      render: (r) => (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-100">
          <Moon size={13} />
          {r.shift?.name || "—"} ({r.shift?.startTime} - {r.shift?.endTime})
        </span>
      )
    },
    {
      key: "date",
      label: "Assigned Date",
      render: (r) => (
        <span className="text-slate-500 font-medium flex items-center gap-1.5">
          <Calendar size={14} className="text-violet-500" />
          {new Date(r.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </span>
      )
    },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="animate-spin text-violet-600" size={38} />
        <p className="text-sm text-slate-500 font-medium">Loading night shift schedules...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-4 sm:px-6 lg:px-8 py-6 transition-all duration-300">

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Night Shifts Roster</h1>
            <span className="bg-violet-100 text-violet-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">Next 30 Days</span>
          </div>
          <p className="text-sm text-slate-500 mt-1">Monitor upcoming employee night shift assignments and schedules.</p>
        </div>
        <button
          onClick={fetchData}
          className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 font-medium px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm transition-all duration-300 hover:shadow group self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw size={16} className="text-violet-600 transition-transform duration-500 group-hover:rotate-180" /> Refresh Roster
        </button>
      </div>

      {/* Main Content Layout */}
      {nightShifts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-16 text-center shadow-sm">
          <div className="w-14 h-14 bg-violet-50 text-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-bounce">
            <Moon size={28} />
          </div>
          <h3 className="text-base font-semibold text-slate-800">No Night Shifts Configured</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            No night shift templates are currently defined. Please create a night shift template from the <strong className="text-slate-700">Shifts</strong> management page first.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
          <Table
            columns={columns}
            data={roster}
            emptyText="No employees are currently assigned to any night shifts for the next 30 days."
          />
        </div>
      )}

    </div>
  );
}