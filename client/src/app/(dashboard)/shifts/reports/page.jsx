// src/app/(dashboard)/reports/shifts/page.jsx
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Loader2,
  Users,
  BarChart3,
  Clock,
  RefreshCw,
  X,
  Calendar,
  Search,
  ChevronRight,
  UserCheck,
  Moon,
  Sun,
  CalendarX,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";

/* ------------------------------ helpers ------------------------------ */

// Local-timezone safe YYYY-MM-DD (toISOString UTC me convert karta hai, India me date ek din peeche ja sakti hai)
const toInputDate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const fmtDate = (v) => {
  if (!v) return "";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString();
};

const rosterDateText = (r) => {
  if (r.date) return fmtDate(r.date) || "Scheduled";
  if (r.startDate) {
    const s = fmtDate(r.startDate);
    const e = fmtDate(r.endDate || r.startDate);
    return s && e ? `${s} - ${e}` : "Scheduled";
  }
  return "Scheduled";
};

const TONES = {
  indigo: { box: "bg-indigo-600", hover: "hover:border-indigo-300" },
  violet: { box: "bg-violet-600", hover: "hover:border-violet-300" },
};

/* ------------------------- slim stat card ------------------------- */

function StatCard({ icon: Icon, value, unit, label, tone }) {
  const t = TONES[tone];
  return (
    <div
      className={`group flex items-center gap-3 bg-white px-3.5 py-3 rounded-2xl border border-slate-200/80 shadow-sm ${t.hover} hover:shadow-md hover:-translate-y-0.5 transition-all duration-200`}
    >
      <div className={`w-10 h-10 shrink-0 rounded-xl ${t.box} text-white flex items-center justify-center shadow-sm`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xl font-extrabold leading-tight text-slate-900 font-mono">
          {value}
          {unit && <span className="ml-1 text-[11px] font-semibold text-slate-400 font-sans">{unit}</span>}
        </p>
        <p className="text-[11px] text-slate-500 font-medium truncate">{label}</p>
      </div>
    </div>
  );
}

/* --------------------- animated modal (reusable) --------------------- */

function Modal({ open, onClose, children }) {
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
        className={`absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}
      />
      <div
        className={`relative w-full sm:max-w-2xl bg-white shadow-2xl rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col overflow-hidden transition-all duration-300 ease-out ${visible
          ? "opacity-100 translate-y-0 sm:scale-100"
          : "opacity-0 translate-y-8 sm:translate-y-0 sm:scale-95"
          }`}
      >
        {children}
      </div>
    </div>
  );
}

/* ------------------------------- page -------------------------------- */

export default function ShiftReportsPage() {
  const [shifts, setShifts] = useState([]);
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal (selectedShift close ke baad bhi rakha hai taaki close animation me content na ude)
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  const [modalSearch, setModalSearch] = useState("");

  const closeModal = useCallback(() => setModalOpen(false), []);

  const openShift = (s) => {
    setSelectedShift(s);
    setModalSearch("");
    setModalOpen(true);
  };

  // Shifts + roster (next 30 days) ek saath fetch
  const fetchData = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const start = new Date();
      const end = new Date();
      end.setDate(end.getDate() + 30);

      const [shiftsRes, rosterRes] = await Promise.all([
        api.get("/shifts"),
        api.get("/shifts/roster", {
          params: { startDate: toInputDate(start), endDate: toInputDate(end) },
        }),
      ]);

      const toList = (d) =>
        Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : [];

      setShifts(toList(shiftsRes.data));
      setRoster(toList(rosterRes.data));
    } catch (err) {
      console.error("Shift reports fetch error:", err);
      toast.error("Failed to load shift performance reports.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Shift-wise assigned roster
  const byShift = useMemo(() => {
    return shifts.map((s) => {
      const sid = String(s._id || s.id || "");
      const assignedRoster = roster.filter((r) => {
        const shiftId = r.shift?._id || r.shift?.id || r.shift;
        return String(shiftId || "") === sid;
      });

      return {
        ...s,
        isNight: s.isNightShift || s.isNight,
        count: assignedRoster.length,
        assignedRoster,
      };
    });
  }, [shifts, roster]);

  const maxCount = Math.max(...byShift.map((s) => s.count), 1);

  // Modal search
  const filteredRoster = useMemo(() => {
    if (!selectedShift) return [];
    const q = modalSearch.toLowerCase().trim();
    if (!q) return selectedShift.assignedRoster;

    return selectedShift.assignedRoster.filter((r) => {
      const emp = r.employee || {};
      const name = String(emp.name || r.employeeName || "").toLowerCase();
      const email = String(emp.email || "").toLowerCase();
      const code = String(emp.employeeId || emp.code || "").toLowerCase();
      return name.includes(q) || email.includes(q) || code.includes(q);
    });
  }, [selectedShift, modalSearch]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 px-4">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
          <Loader2 className="animate-spin text-indigo-600" size={28} />
        </div>
        <p className="text-sm text-slate-500 font-medium">Generating analytics reports...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-3 sm:space-y-4 px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 bg-white px-4 py-3 sm:px-5 sm:py-4 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-base sm:text-xl font-bold tracking-tight text-slate-900">
              Shift Reports & Analytics
            </h1>
            <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
              30-Day Outlook
            </span>
          </div>
          <p className="hidden sm:block text-xs text-slate-500 mt-0.5">
            Shift-wise employee allocation. Kisi bhi shift row par click karke assigned personnel dekhein.
          </p>
        </div>

        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          title="Refresh Data"
          className="group shrink-0 inline-flex items-center justify-center gap-2 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 font-semibold p-2.5 sm:px-4 sm:py-2 rounded-xl border border-slate-200 transition-all active:scale-95 cursor-pointer text-xs disabled:opacity-60"
        >
          <RefreshCw
            size={14}
            className={`text-indigo-600 transition-transform duration-500 ${refreshing ? "animate-spin" : "group-hover:rotate-180"}`}
          />
          <span className="hidden sm:inline">Refresh Data</span>
        </button>
      </div>

      {/* Slim summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
        <StatCard icon={Users} tone="indigo" value={roster.length} unit="assigned" label="Total Assignments" />
        <StatCard icon={Clock} tone="violet" value={shifts.length} unit="templates" label="Shift Templates" />
      </div>

      {/* Shift-wise distribution */}
      <div className="bg-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-3 sm:mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
              <BarChart3 size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base tracking-tight truncate">
                Shift-wise Distribution
              </h3>
              <p className="text-[11px] text-slate-500 truncate">
                Row par click karke employee roster dekhein.
              </p>
            </div>
          </div>
          <span className="shrink-0 text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full font-mono">
            {byShift.length} Shifts
          </span>
        </div>

        {byShift.length === 0 ? (
          <div className="text-center py-10 px-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <BarChart3 className="w-9 h-9 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700">No shift distribution data available</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Shift templates banne ke baad yahan dikhenge.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {byShift.map((s) => (
              <button
                type="button"
                key={s._id || s.id || s.name}
                onClick={() => openShift(s)}
                className="group w-full text-left flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-3 py-2.5 sm:px-4 rounded-xl border border-slate-200/70 bg-slate-50/40 hover:bg-white hover:border-indigo-300 hover:shadow-md active:scale-[0.99] transition-all duration-200 cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500/40"
              >
                {/* Name + tag (+ count on mobile) */}
                <div className="flex items-center justify-between gap-2 sm:w-56 shrink-0 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${s.isNight ? "bg-violet-600" : "bg-indigo-600"}`} />
                    <span className="font-bold text-xs sm:text-sm text-slate-800 group-hover:text-indigo-600 transition-colors truncate capitalize">
                      {s.name}
                    </span>
                    {s.isNight ? (
                      <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold text-violet-700 bg-violet-100 px-1.5 py-0.5 rounded">
                        <Moon size={10} /> Night
                      </span>
                    ) : (
                      <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                        <Sun size={10} /> Day
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500 sm:hidden shrink-0 font-mono">
                    {s.count} emp
                  </span>
                </div>

                {/* Progress bar */}
                <div className="flex-1 h-2 bg-slate-200/80 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${s.isNight ? "bg-violet-600" : "bg-indigo-600"}`}
                    style={{ width: `${s.count > 0 ? Math.max((s.count / maxCount) * 100, 4) : 0}%` }}
                  />
                </div>

                {/* Count (desktop) */}
                <div className="hidden sm:flex items-center justify-end gap-2 w-32 shrink-0">
                  <span className="text-xs font-bold text-slate-700 font-mono">
                    {s.count} <span className="text-slate-400 font-normal font-sans">Emp</span>
                  </span>
                  <ChevronRight
                    size={15}
                    className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all"
                  />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Shift details popup (center on desktop, bottom sheet on mobile) */}
      <Modal open={modalOpen} onClose={closeModal}>
        {selectedShift && (
          <>
            {/* Header */}
            <div className="px-4 py-3.5 sm:px-5 sm:py-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/60">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`p-2.5 rounded-xl text-white shrink-0 ${selectedShift.isNight ? "bg-violet-600" : "bg-indigo-600"}`}
                >
                  {selectedShift.isNight ? <Moon size={18} /> : <Sun size={18} />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate capitalize">
                      {selectedShift.name}
                    </h3>
                    {selectedShift.isNight && (
                      <span className="shrink-0 text-[10px] bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-semibold">
                        Night
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-500">Shift Details & Roster Allocations</p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="shrink-0 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="px-4 sm:px-5 py-4 overflow-y-auto space-y-4">
              {/* Timing grid */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium flex items-center gap-1">
                    <Clock size={11} className="text-indigo-600" /> Start
                  </span>
                  <p className="font-bold text-slate-900 text-sm mt-0.5 font-mono">
                    {selectedShift.startTime || selectedShift.start || "N/A"}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium flex items-center gap-1">
                    <Clock size={11} className="text-rose-600" /> End
                  </span>
                  <p className="font-bold text-slate-900 text-sm mt-0.5 font-mono">
                    {selectedShift.endTime || selectedShift.end || "N/A"}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium flex items-center gap-1">
                    <Users size={11} className="text-indigo-600" /> Allocated
                  </span>
                  <p className="font-bold text-slate-900 text-sm mt-0.5 font-mono">
                    {selectedShift.count}
                  </p>
                </div>
              </div>

              {/* Search toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <UserCheck size={16} className="text-indigo-600" />
                  Assigned Personnel ({filteredRoster.length})
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
                    className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              {/* Roster list */}
              {filteredRoster.length === 0 ? (
                <div className="py-10 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  <CalendarX className="w-9 h-9 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">No employees found</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {modalSearch
                      ? "Search se koi employee match nahi hua."
                      : "Is shift me 30-day window me koi employee allocated nahi hai."}
                  </p>
                </div>
              ) : (
                <>
                  {/* Desktop/tablet: table */}
                  <div className="hidden sm:block border border-slate-200 rounded-2xl overflow-hidden">
                    <div className="overflow-y-auto max-h-72">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold sticky top-0">
                          <tr>
                            <th className="px-4 py-2.5">Employee</th>
                            <th className="px-4 py-2.5">Date</th>
                            <th className="px-4 py-2.5 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredRoster.map((r, i) => {
                            const emp = r.employee || {};
                            const code = emp.employeeId || emp.code;
                            return (
                              <tr key={r._id || r.id || i} className="hover:bg-slate-50/80 transition-colors">
                                <td className="px-4 py-2.5">
                                  <p className="font-semibold text-slate-900">
                                    {emp.name || r.employeeName || "Unknown Employee"}
                                  </p>
                                  <p className="text-[10px] text-slate-400 font-mono">
                                    {code ? `ID: ${code}` : ""}
                                    {code && emp.email ? " • " : ""}
                                    {emp.email || (!code ? "—" : "")}
                                  </p>
                                </td>
                                <td className="px-4 py-2.5 text-slate-600">
                                  <span className="inline-flex items-center gap-1.5">
                                    <Calendar size={12} className="text-indigo-500" />
                                    {rosterDateText(r)}
                                  </span>
                                </td>
                                <td className="px-4 py-2.5 text-right">
                                  <span className="inline-block px-2 py-0.5 text-[10px] font-semibold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 capitalize">
                                    {r.status || "Active"}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Mobile: cards */}
                  <div className="sm:hidden space-y-2">
                    {filteredRoster.map((r, i) => {
                      const emp = r.employee || {};
                      const code = emp.employeeId || emp.code;
                      return (
                        <div
                          key={r._id || r.id || i}
                          className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {emp.name || r.employeeName || "Unknown Employee"}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono truncate">
                              {code ? `ID: ${code}` : emp.email || "—"}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5 inline-flex items-center gap-1">
                              <Calendar size={11} className="text-indigo-500" />
                              {rosterDateText(r)}
                            </p>
                          </div>
                          <span className="shrink-0 px-2 py-0.5 text-[10px] font-semibold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 capitalize">
                            {r.status || "Active"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/60">
              <button
                type="button"
                onClick={closeModal}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer active:scale-[0.99]"
              >
                Close
              </button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}