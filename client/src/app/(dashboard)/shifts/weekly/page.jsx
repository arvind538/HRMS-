"use client";
import { useEffect, useState, useCallback } from "react";
import {
  Loader2, Send, Calendar, User, Clock, Plus, X, RefreshCw, CalendarX,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Button from "@/components/ui/Button";
import Table from "@/components/ui/Table";

// Local-timezone safe YYYY-MM-DD (toISOString UTC me convert karta hai, date ek din aage/peeche ho sakti hai)
const toInputDate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const getWeekDates = () => {
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return toInputDate(d);
  });
};

const formatDate = (value, opts) => {
  if (!value) return "—";
  const d = new Date(value);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-US", opts);
};

const SHORT = { month: "short", day: "numeric", year: "numeric" };

export default function WeeklySchedulePage() {
  const [employees, setEmployees] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ employee: "", shift: "" });

  // Modal: `mounted` DOM me rakhta hai, `visible` animation chalata hai
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  const [weekDates] = useState(getWeekDates);

  const fetchRoster = useCallback(async () => {
    const { data } = await api.get("/shifts/roster", {
      params: { startDate: weekDates[0], endDate: weekDates[6] },
    });
    setRoster(Array.isArray(data) ? data : []);
  }, [weekDates]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [empRes, shiftRes] = await Promise.all([
        api.get("/employees"),
        api.get("/shifts"),
      ]);
      setEmployees(Array.isArray(empRes.data) ? empRes.data : []);
      setShifts(Array.isArray(shiftRes.data) ? shiftRes.data : []);
      await fetchRoster();
    } catch (err) {
      toast.error("Failed to load schedule data.");
    } finally {
      setLoading(false);
    }
  }, [fetchRoster]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchRoster();
    } catch {
      toast.error("Failed to refresh roster.");
    } finally {
      setRefreshing(false);
    }
  };

  // ---- Modal open / close with smooth animation ----
  const openModal = () => {
    setMounted(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
  };

  const closeModal = useCallback(() => {
    if (submitting) return;
    setVisible(false);
    setTimeout(() => setMounted(false), 250);
  }, [submitting]);

  // Esc se close + background scroll lock
  useEffect(() => {
    if (!mounted) return;
    const onKey = (e) => e.key === "Escape" && closeModal();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [mounted, closeModal]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.employee || !form.shift) {
      return toast.error("Please select both an employee and a shift template.");
    }

    setSubmitting(true);
    try {
      const { data } = await api.post("/shifts/assign-weekly", {
        ...form,
        dates: weekDates,
      });
      toast.success(
        `${data.created?.length || 0} days assigned successfully, ${data.skipped?.length || 0} skipped (already assigned).`
      );
      setForm({ employee: "", shift: "" });
      await fetchRoster(); // list me turant add ho jaye
      setSubmitting(false);
      setVisible(false);
      setTimeout(() => setMounted(false), 250);
    } catch (err) {
      setSubmitting(false);
      toast.error(err.response?.data?.message || "Failed to assign weekly schedule.");
    }
  };

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
      label: "Shift",
      render: (r) => (
        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 capitalize">
          {r.shift?.name || "—"}
        </span>
      ),
    },
    {
      key: "timing",
      label: "Timing",
      render: (r) => (
        <span className="text-slate-600 font-medium">
          {r.shift?.startTime || "—"} - {r.shift?.endTime || "—"}
        </span>
      ),
    },
    {
      key: "date",
      label: "Date",
      render: (r) => (
        <span className="text-slate-500 flex items-center gap-1.5">
          <Calendar size={14} className="text-indigo-500" />
          {formatDate(r.date)}
        </span>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-indigo-600" size={36} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-5 sm:space-y-6 px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
      {/* Header + Action button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4 sm:pb-5">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Weekly Schedule
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Assign a single shift template to an employee for the entire upcoming week.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            title="Refresh"
            className="p-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl transition-all disabled:opacity-60"
          >
            <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
          </button>
          <button
            onClick={openModal}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 active:scale-95"
          >
            <Plus size={18} /> Assign Weekly Schedule
          </button>
        </div>
      </div>

      {/* Week range banner */}
      <div className="flex items-center gap-3 bg-indigo-50/60 border border-indigo-100 p-3.5 rounded-xl text-indigo-900">
        <Calendar size={20} className="text-indigo-600 shrink-0" />
        <div>
          <p className="text-xs font-semibold text-indigo-700">Active Schedule Week Range</p>
          <p className="text-sm font-medium mt-0.5">
            {formatDate(weekDates[0], SHORT)} {" — "} {formatDate(weekDates[6], SHORT)}
          </p>
        </div>
      </div>

      {/* Desktop / Tablet: Table */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-shadow duration-300 hover:shadow-md">
        <div className="overflow-x-auto">
          <Table
            columns={columns}
            data={roster}
            emptyText="No assignments yet for this week. Click 'Assign Weekly Schedule' to add."
          />
        </div>
      </div>

      {/* Mobile: Cards */}
      <div className="md:hidden space-y-3">
        {roster.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm py-12 px-6 text-center flex flex-col items-center gap-3">
            <CalendarX size={32} className="text-slate-300" />
            <p className="text-sm text-slate-500">
              No assignments yet for this week. Tap the button above to add.
            </p>
          </div>
        ) : (
          <>
            <p className="text-xs font-semibold text-slate-500 px-1">
              {roster.length} assignment{roster.length > 1 ? "s" : ""}
            </p>
            {roster.map((r, i) => (
              <div
                key={r._id || r.id || i}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4"
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

      {/* ---------- Assign Modal ---------- */}
      {mounted && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="assign-title"
        >
          {/* Backdrop */}
          <div
            onClick={closeModal}
            className={`absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"
              }`}
          />

          {/* Panel: mobile par bottom sheet, desktop par center */}
          <div
            className={`relative w-full sm:max-w-lg bg-white shadow-2xl rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto transition-all duration-300 ease-out ${visible
              ? "opacity-100 translate-y-0 sm:scale-100"
              : "opacity-0 translate-y-8 sm:translate-y-0 sm:scale-95"
              }`}
          >
            <div className="p-5 sm:p-8">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <h2 id="assign-title" className="text-lg sm:text-xl font-bold text-slate-900">
                    Assign Weekly Schedule
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    Ek shift template poore week ke liye employee ko assign karo.
                  </p>
                </div>
                <button
                  onClick={closeModal}
                  disabled={submitting}
                  className="p-2 -mr-2 -mt-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="mb-5 flex items-center gap-3 bg-indigo-50/60 border border-indigo-100 p-3.5 rounded-xl text-indigo-900">
                <Calendar size={20} className="text-indigo-600 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-indigo-700">Week Range</p>
                  <p className="text-sm font-medium mt-0.5">
                    {formatDate(weekDates[0], SHORT)} {" — "} {formatDate(weekDates[6], SHORT)}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-1.5">
                    <User size={16} className="text-indigo-600" /> Select Employee
                  </label>
                  <select
                    required
                    value={form.employee}
                    onChange={(e) => setForm({ ...form, employee: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all cursor-pointer"
                  >
                    <option value="">-- Choose an employee --</option>
                    {employees.map((e) => (
                      <option key={e._id} value={e._id}>
                        {e.name} {e.email ? `(${e.email})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-1.5">
                    <Clock size={16} className="text-indigo-600" /> Select Shift Template
                  </label>
                  <select
                    required
                    value={form.shift}
                    onChange={(e) => setForm({ ...form, shift: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all cursor-pointer"
                  >
                    <option value="">-- Choose a shift template --</option>
                    {shifts.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name} ({s.startTime} - {s.endTime}) {s.isNightShift ? "🌙 [Night]" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-1 flex flex-col-reverse sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={submitting}
                    className="sm:w-1/3 py-3 rounded-xl border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-all disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <Button
                    type="submit"
                    loading={submitting}
                    className="sm:flex-1 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-xl transition-all duration-300 hover:shadow-lg flex items-center justify-center gap-2"
                  >
                    <Send size={18} /> Assign for the Week
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}