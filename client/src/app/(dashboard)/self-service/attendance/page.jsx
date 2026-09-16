"use client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, Calendar, Clock, ShieldAlert, FileText } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Table from "@/components/ui/Table";
import Badge from "@/components/ui/Badge";
import { useAuth } from "@/context/AuthContext";

export default function MyAttendancePage() {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  // Safe helper function to extract employee ID cleanly across different session models
  const getEmployeeId = useCallback(() => {
    return user?.employee?._id || user?.employee || user?._id || user?.id;
  }, [user]);

  const fetchData = useCallback(async () => {
    const empId = getEmployeeId();
    if (!empId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.get("/attendance", {
        params: { employee: empId, month, year }
      });
      setRecords(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Attendance fetch error:", err);
      toast.error("Failed to load attendance records.");
    } finally {
      setLoading(false);
    }
  }, [getEmployeeId, month, year]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const statusVariant = {
    present: "success",
    absent: "danger",
    "half-day": "info",
    "on-leave": "warning"
  };

  const columns = [
    {
      key: "date",
      label: "Date",
      render: (r) => (
        <span className="font-semibold text-slate-800">
          {r.date ? new Date(r.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : "—"}
        </span>
      )
    },
    {
      key: "checkIn",
      label: "Check In",
      render: (r) => r.checkIn ? (
        <span className="inline-flex items-center gap-1.5 text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
          <Clock size={13} className="text-emerald-600" />
          {new Date(r.checkIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      ) : "—"
    },
    {
      key: "checkOut",
      label: "Check Out",
      render: (r) => r.checkOut ? (
        <span className="inline-flex items-center gap-1.5 text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
          <Clock size={13} className="text-rose-600" />
          {new Date(r.checkOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      ) : "—"
    },
    {
      key: "workHours",
      label: "Work Hours",
      render: (r) => r.workHours ? (
        <span className="font-bold text-slate-700">{r.workHours} hrs</span>
      ) : "—"
    },
    {
      key: "status",
      label: "Status",
      render: (r) => (
        <Badge variant={statusVariant[r.status] || "neutral"}>
          {r.status ? r.status.replace(/-/g, " ") : "Pending"}
        </Badge>
      )
    },
  ];

  const empId = getEmployeeId();

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Attendance</h1>
          <p className="text-sm text-slate-500 mt-1">View and monitor your monthly attendance logs, check-in times, and working hours.</p>
        </div>

        {/* Month & Year Selectors */}
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 shadow-sm focus:outline-none focus:border-indigo-500 transition-all cursor-pointer"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(0, i).toLocaleString("default", { month: "long" })}
                </option>
              ))}
            </select>
          </div>

          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="w-24 px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 shadow-sm focus:outline-none focus:border-indigo-500 transition-all text-center"
          />
        </div>
      </div>

      {/* Session Warning Banner */}
      {!empId && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 text-amber-800">
          <ShieldAlert size={20} className="text-amber-600 shrink-0" />
          <p className="text-sm">
            <strong className="font-semibold">Session Warning:</strong> Employee identification details are missing. Please verify your login credentials.
          </p>
        </div>
      )}

      {/* Attendance Table Wrapper with Hover Polish */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md">
        {loading ? (
          <div className="py-24 text-center">
            <Loader2 className="animate-spin mx-auto text-indigo-600 h-8 w-8" />
            <p className="text-sm text-slate-400 mt-2">Loading attendance records...</p>
          </div>
        ) : (
          <Table
            columns={columns}
            data={records}
            emptyText="No attendance records found for this month."
          />
        )}
      </div>
    </div>
  );
}