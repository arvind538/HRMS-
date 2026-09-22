"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Loader2,
  Users,
  BarChart3,
  Clock,
  RefreshCw,
  ArrowUpRight,
  X,
  Calendar,
  Search,
  ChevronRight,
  UserCheck,
  Moon,
  Sun
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";

export default function ShiftReportsPage() {
  const [shifts, setShifts] = useState([]);
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedShift, setSelectedShift] = useState(null);
  const [modalSearch, setModalSearch] = useState("");

  // Fetch real shift and roster information concurrently from backend
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const nextMonth = new Date();
      nextMonth.setDate(nextMonth.getDate() + 30);
      const endDate = nextMonth.toISOString().split("T")[0];

      const [shiftsRes, rosterRes] = await Promise.all([
        api.get("/shifts"),
        api.get("/shifts/roster", { params: { startDate: today, endDate } }),
      ]);

      const shiftsData = Array.isArray(shiftsRes.data)
        ? shiftsRes.data
        : Array.isArray(shiftsRes.data?.data)
          ? shiftsRes.data.data
          : [];

      const rosterData = Array.isArray(rosterRes.data)
        ? rosterRes.data
        : Array.isArray(rosterRes.data?.data)
          ? rosterRes.data.data
          : [];

      setShifts(shiftsData);
      setRoster(rosterData);
    } catch (err) {
      console.error("Shift reports fetch error:", err);
      toast.error("Failed to load shift performance reports.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Modal ESC key listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setSelectedShift(null);
        setModalSearch("");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Calculate shift-wise distribution counts and assigned roster records
  const byShift = useMemo(() => {
    return shifts.map((s) => {
      const assignedRoster = roster.filter((r) => {
        const shiftId = r.shift?._id || r.shift?.id || r.shift;
        return shiftId === (s._id || s.id);
      });

      return {
        ...s,
        name: s.name,
        isNight: s.isNightShift || s.isNight,
        count: assignedRoster.length,
        assignedRoster,
      };
    });
  }, [shifts, roster]);

  const maxCount = Math.max(...byShift.map((s) => s.count), 1);

  // Filter employees inside the detail modal
  const filteredRoster = useMemo(() => {
    if (!selectedShift) return [];
    const query = modalSearch.toLowerCase().trim();
    if (!query) return selectedShift.assignedRoster;

    return selectedShift.assignedRoster.filter((r) => {
      const empName = (r.employee?.name || r.employeeName || "").toLowerCase();
      const empEmail = (r.employee?.email || "").toLowerCase();
      const empCode = (r.employee?.employeeId || r.employee?.code || "").toLowerCase();
      return empName.includes(query) || empEmail.includes(query) || empCode.includes(query);
    });
  }, [selectedShift, modalSearch]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 px-4">
        <Loader2 className="animate-spin text-indigo-600" size={38} />
        <p className="text-sm text-slate-500 font-medium">Generating analytics reports...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 sm:space-y-5 px-3 sm:px-4 lg:px-6 py-4 sm:py-6 transition-all duration-300">
      {/* Header & Sync Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Shift Reports & Analytics
            </h1>
            <span className="bg-indigo-100 text-indigo-700 text-[11px] sm:text-xs font-semibold px-2.5 py-0.5 rounded-full">
              30-Day Outlook
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Analyze shift-wise employee allocation metrics. Click any shift row to inspect assigned personnel.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 font-medium px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm transition-all duration-300 hover:shadow group w-full sm:w-auto cursor-pointer active:scale-95"
        >
          <RefreshCw
            size={16}
            className="text-indigo-600 transition-transform duration-500 group-hover:rotate-180"
          />{" "}
          Refresh Data
        </button>
      </div>

      {/* Analytics Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
        {/* Total Assignments Card */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs transition-all duration-300 hover:shadow-md hover:border-indigo-100 flex items-center justify-between group">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl transition-transform duration-300 group-hover:scale-110 shrink-0">
              <Users size={22} className="sm:w-6 sm:h-6" />
            </div>
            <div>
              <p className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
                Total Assignments
              </p>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5 sm:mt-1">
                {roster.length}
              </h3>
            </div>
          </div>
          <span className="text-[11px] sm:text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg flex items-center gap-1 shrink-0">
            Active <ArrowUpRight size={14} />
          </span>
        </div>

        {/* Active Shift Templates Card */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs transition-all duration-300 hover:shadow-md hover:border-violet-100 flex items-center justify-between group">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-violet-50 text-violet-600 rounded-2xl transition-transform duration-300 group-hover:scale-110 shrink-0">
              <Clock size={22} className="sm:w-6 sm:h-6" />
            </div>
            <div>
              <p className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
                Shift Templates
              </p>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5 sm:mt-1">
                {shifts.length}
              </h3>
            </div>
          </div>
          <span className="text-[11px] sm:text-xs font-semibold text-violet-600 bg-violet-50 px-2.5 py-1 rounded-lg flex items-center gap-1 shrink-0">
            Configured <ArrowUpRight size={14} />
          </span>
        </div>
      </div>

      {/* Shift Distribution Visual Bars Container (Clickable Rows) */}
      <div className="bg-white p-4 sm:p-6 lg:p-8 rounded-2xl border border-slate-200 shadow-xs transition-all duration-300 hover:shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5 sm:mb-6">
          <div className="flex items-center gap-2">
            <BarChart3 size={18} className="text-indigo-600 shrink-0" />
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
              Shift-wise Distribution Trends
            </h3>
          </div>
          <span className="text-[11px] sm:text-xs text-slate-400 font-medium">
            Click any row to view employee roster details
          </span>
        </div>

        {byShift.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs sm:text-sm">
            No shift distribution data available for evaluation.
          </div>
        ) : (
          <div className="space-y-3">
            {byShift.map((s) => (
              <div
                key={s._id || s.name}
                onClick={() => setSelectedShift(s)}
                tabIndex={0}
                role="button"
                onKeyDown={(e) => e.key === "Enter" && setSelectedShift(s)}
                className="group flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-4 text-xs sm:text-sm bg-slate-50/70 hover:bg-indigo-50/40 p-3.5 sm:p-4 rounded-xl border border-slate-200/80 hover:border-indigo-300 hover:shadow-xs transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              >
                {/* Shift Name & Tag */}
                <div className="w-full sm:w-48 font-semibold text-slate-800 truncate flex items-center justify-between sm:justify-start gap-2 shrink-0">
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${s.isNight ? "bg-violet-600" : "bg-indigo-600"
                        }`}
                    />
                    <span className="truncate group-hover:text-indigo-900 transition-colors">
                      {s.name}
                    </span>
                  </div>
                  {s.isNight ? (
                    <span className="text-[10px] text-violet-700 bg-violet-100 px-1.5 py-0.5 rounded font-medium shrink-0 flex items-center gap-1">
                      <Moon size={10} /> Night
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded font-medium shrink-0 flex items-center gap-1 sm:hidden">
                      <Sun size={10} /> Day
                    </span>
                  )}
                </div>

                {/* Progress Bar Track */}
                <div className="flex-1 h-3 sm:h-3.5 bg-slate-200/70 rounded-full overflow-hidden p-0.5 shadow-inner w-full">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${s.isNight
                      ? "bg-gradient-to-r from-violet-500 to-violet-600"
                      : "bg-gradient-to-r from-indigo-500 to-indigo-600"
                      }`}
                    style={{ width: `${(s.count / maxCount) * 100}%` }}
                  />
                </div>

                {/* Count Badge & Arrow */}
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                  <div className="text-xs font-bold text-slate-900 bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-2xs">
                    <span className="sm:hidden text-slate-400 font-normal">Assigned: </span>
                    {s.count} <span className="text-slate-400 font-normal">Emp</span>
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-2xs">
                    <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Details View Modal on Shift Row Click */}
      {selectedShift && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs transition-opacity"
          onClick={() => {
            setSelectedShift(null);
            setModalSearch("");
          }}
        >
          <div
            className="bg-white w-full max-w-2xl rounded-3xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2.5 rounded-xl border shadow-2xs ${selectedShift.isNight
                    ? "bg-violet-50 text-violet-600 border-violet-100"
                    : "bg-indigo-50 text-indigo-600 border-indigo-100"
                    }`}
                >
                  {selectedShift.isNight ? <Moon size={20} /> : <Sun size={20} />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-none">
                      {selectedShift.name}
                    </h3>
                    {selectedShift.isNight && (
                      <span className="text-2xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-semibold">
                        Night Shift
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Shift Details & Roster Allocations
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedShift(null);
                  setModalSearch("");
                }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-sm">
              {/* Shift Timing Information Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3.5 bg-slate-50/80 border border-slate-100 rounded-xl">
                  <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                    <Clock size={12} className="text-indigo-600" /> Start Time
                  </span>
                  <p className="font-semibold text-slate-800 mt-1">
                    {selectedShift.startTime || selectedShift.start || "N/A"}
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50/80 border border-slate-100 rounded-xl">
                  <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                    <Clock size={12} className="text-rose-600" /> End Time
                  </span>
                  <p className="font-semibold text-slate-800 mt-1">
                    {selectedShift.endTime || selectedShift.end || "N/A"}
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50/80 border border-slate-100 rounded-xl col-span-2 sm:col-span-1">
                  <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                    <Users size={12} className="text-indigo-600" /> Allocated
                  </span>
                  <p className="font-semibold text-slate-800 mt-1">
                    {selectedShift.count} Employees
                  </p>
                </div>
              </div>

              {/* Employees Search Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <UserCheck size={16} className="text-indigo-600" />
                  Assigned Personnel List ({filteredRoster.length})
                </h4>

                <div className="relative w-full sm:w-64">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                  <input
                    type="text"
                    placeholder="Search by name, email, code..."
                    value={modalSearch}
                    onChange={(e) => setModalSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>
              </div>

              {/* Assigned Employees List Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                {filteredRoster.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs font-medium bg-slate-50/50">
                    No employees allocated to this shift in the 30-day window.
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-72">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold sticky top-0">
                        <tr>
                          <th className="px-4 py-3">Employee</th>
                          <th className="px-4 py-3">Date Range</th>
                          <th className="px-4 py-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredRoster.map((r, i) => {
                          const emp = r.employee || {};
                          return (
                            <tr key={r._id || i} className="hover:bg-slate-50/80 transition-colors">
                              <td className="px-4 py-3 font-medium text-slate-800">
                                <div>
                                  <p className="font-semibold text-slate-900">
                                    {emp.name || r.employeeName || "Unknown Employee"}
                                  </p>
                                  <p className="text-2xs text-slate-400">
                                    {emp.email || emp.code || emp.employeeId || "—"}
                                  </p>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-slate-600">
                                <span className="flex items-center gap-1">
                                  <Calendar size={12} className="text-slate-400" />
                                  {r.date
                                    ? new Date(r.date).toLocaleDateString()
                                    : r.startDate
                                      ? `${new Date(r.startDate).toLocaleDateString()} - ${new Date(
                                        r.endDate || r.startDate
                                      ).toLocaleDateString()}`
                                      : "Scheduled"}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className="inline-block px-2 py-0.5 text-2xs font-semibold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  {r.status || "Active"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setSelectedShift(null);
                  setModalSearch("");
                }}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-100 transition-colors shadow-2xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}