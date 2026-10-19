// src/app/(dashboard)/shifts/page.jsx
"use client";
import { useEffect, useState, useCallback } from "react";
import { Plus, Clock, Moon, Sun, Timer, Hash, X, Loader2, ChevronRight } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";

/* ------------------------------ helpers ------------------------------ */

const defaultForm = { name: "", startTime: "09:30", endTime: "18:30", isNightShift: false };

const inputCls =
  "mt-1.5 w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50/50 text-slate-800 font-medium outline-hidden transition-all duration-200 hover:border-slate-300 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100";
const labelCls = "text-[11px] font-bold uppercase tracking-wider text-slate-500";

// "18:30" -> "6:30 PM"
const to12h = (t) => {
  if (!t || !t.includes(":")) return t || "--";
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${suffix}`;
};

// Total shift duration (overnight shifts handled)
const getDuration = (start, end) => {
  if (!start || !end) return "--";
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let mins = eh * 60 + em - (sh * 60 + sm);
  if (mins <= 0) mins += 24 * 60;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
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
        className={`absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}
      />
      <div
        className={`relative w-full ${maxWidth} bg-white shadow-2xl rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col overflow-hidden transition-all duration-300 ease-out ${visible
          ? "opacity-100 translate-y-0 sm:scale-100"
          : "opacity-0 translate-y-8 sm:translate-y-0 sm:scale-95"
          }`}
      >
        <div className="px-4 py-3.5 sm:px-5 sm:py-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/60">
          <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate">{title}</h3>
          <button
            onClick={onClose}
            className="shrink-0 p-2 -mr-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-4 sm:p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

/* ----------------------------- skeleton ----------------------------- */

function SkeletonCard() {
  return (
    <div className="bg-white p-3.5 rounded-2xl border border-slate-200 animate-pulse flex items-center gap-3">
      <div className="w-11 h-11 rounded-xl bg-slate-100 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-1/2 bg-slate-100 rounded-md" />
        <div className="h-3 w-2/3 bg-slate-100 rounded-md" />
      </div>
      <div className="h-5 w-16 bg-slate-100 rounded-full" />
    </div>
  );
}

/* ------------------------------- page -------------------------------- */

export default function ShiftsPage() {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(defaultForm);

  const [createOpen, setCreateOpen] = useState(false);

  // Details modal (selectedShift close ke baad bhi rakha hai taaki close animation me content na ude)
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/shifts");
      const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
      setShifts(list);
    } catch {
      toast.error("Failed to load shift templates.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCreate = () => {
    setForm(defaultForm);
    setCreateOpen(true);
  };

  const closeCreate = useCallback(() => {
    if (submitting) return;
    setCreateOpen(false);
  }, [submitting]);

  const closeDetails = useCallback(() => setDetailsOpen(false), []);

  const handleCreate = async (e) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) {
      toast.error("Please enter a shift name.");
      return;
    }
    if (form.startTime === form.endTime) {
      toast.error("Start and end time cannot be the same.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/shifts", { ...form, name });
      toast.success("Shift template created successfully.");
      setCreateOpen(false);
      setForm(defaultForm);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create shift template.");
    } finally {
      setSubmitting(false);
    }
  };

  const openDetails = (shift) => {
    setSelectedShift(shift);
    setDetailsOpen(true);
  };

  return (
    <div className="space-y-3 sm:space-y-4 max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 bg-white px-4 py-3 sm:px-5 sm:py-4 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-base sm:text-xl font-bold tracking-tight text-slate-900">
              Shifts Management
            </h1>
            {!loading && (
              <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                {shifts.length} Templates
              </span>
            )}
          </div>
          <p className="hidden sm:block text-xs text-slate-500 mt-0.5 font-medium">
            Shift templates banayein jo employees ko assign ho sakte hain.
          </p>
        </div>

        <button
          onClick={openCreate}
          className="group shrink-0 inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 sm:px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm shadow-sm hover:shadow-lg transition-all duration-300 active:scale-95 cursor-pointer"
        >
          <Plus size={16} className="transition-transform duration-300 group-hover:rotate-90" />
          <span>New Shift</span>
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
          {[0, 1, 2].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : shifts.length === 0 ? (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-dashed border-slate-300 p-8 sm:p-12 text-center shadow-sm">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Clock size={26} />
          </div>
          <h3 className="text-sm sm:text-base font-bold text-slate-800">No shift templates found</h3>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xs mx-auto">
            Apna pehla shift template banakar shuru karein.
          </p>
          <button
            onClick={openCreate}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-600 hover:text-white transition-all duration-300 active:scale-95 cursor-pointer"
          >
            <Plus size={16} /> Create Shift
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
          {shifts.map((s, i) => (
            <button
              type="button"
              key={s._id || s.id || i}
              onClick={() => openDetails(s)}
              className="group text-left flex items-center gap-3 bg-white px-3.5 py-3 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-indigo-300 active:scale-[0.98] transition-all duration-200 cursor-pointer focus:outline-hidden focus-visible:ring-4 focus-visible:ring-indigo-100"
            >
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-white shadow-sm transition-transform duration-300 group-hover:scale-105 ${s.isNightShift ? "bg-violet-600" : "bg-indigo-600"
                  }`}
              >
                {s.isNightShift ? <Moon size={20} /> : <Sun size={20} />}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 min-w-0">
                  <h4 className="font-bold text-slate-900 text-sm sm:text-[15px] truncate group-hover:text-indigo-600 transition-colors capitalize">
                    {s.name}
                  </h4>
                  <span
                    className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap ${s.isNightShift ? "bg-violet-100 text-violet-700" : "bg-amber-100 text-amber-700"
                      }`}
                  >
                    {s.isNightShift ? "Night" : "Day"}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center flex-wrap gap-x-2.5 gap-y-0.5 text-[11px] sm:text-xs text-slate-500 font-medium">
                  <span className="inline-flex items-center gap-1">
                    <Clock size={12} className="text-slate-400" />
                    {to12h(s.startTime)} – {to12h(s.endTime)}
                  </span>
                  <span className="inline-flex items-center gap-1 text-slate-400">
                    <Timer size={12} />
                    {getDuration(s.startTime, s.endTime)}
                  </span>
                </div>
              </div>

              <ChevronRight
                size={16}
                className="shrink-0 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all"
              />
            </button>
          ))}
        </div>
      )}

      {/* Create modal */}
      <Modal open={createOpen} onClose={closeCreate} title="Create New Shift">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label htmlFor="shiftName" className={labelCls}>Shift Name</label>
            <input
              id="shiftName"
              required
              autoFocus
              maxLength={50}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputCls}
              placeholder="e.g. Morning Shift"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="startTime" className={labelCls}>Start Time</label>
              <input
                id="startTime"
                type="time"
                required
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="endTime" className={labelCls}>End Time</label>
              <input
                id="endTime"
                type="time"
                required
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>

          {/* Live duration preview */}
          <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-indigo-50/60 border border-indigo-100 text-xs sm:text-sm">
            <span className="font-semibold text-slate-600">
              {to12h(form.startTime)} – {to12h(form.endTime)}
            </span>
            <span className="inline-flex items-center gap-1.5 font-bold text-indigo-600">
              <Timer size={14} /> {getDuration(form.startTime, form.endTime)}
            </span>
          </div>

          {/* Night shift toggle */}
          <label
            htmlFor="nightShiftCheck"
            className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50/40 transition-all duration-200 cursor-pointer select-none"
          >
            <span className="flex items-center gap-3 min-w-0">
              <span className="w-9 h-9 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
                <Moon size={18} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-slate-800">Mark as Night Shift</span>
                <span className="block text-[11px] text-slate-400 font-medium">Raat bhar chalne wale shifts ke liye.</span>
              </span>
            </span>
            <span className="relative shrink-0">
              <input
                type="checkbox"
                id="nightShiftCheck"
                checked={form.isNightShift}
                onChange={(e) => setForm({ ...form, isNightShift: e.target.checked })}
                className="peer sr-only"
              />
              <span className="block w-11 h-6 rounded-full bg-slate-200 transition-colors duration-300 peer-checked:bg-violet-600 peer-focus-visible:ring-4 peer-focus-visible:ring-violet-100" />
              <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-300 peer-checked:translate-x-5" />
            </span>
          </label>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={closeCreate}
              disabled={submitting}
              className="px-5 py-2.5 text-sm font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 rounded-xl transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 active:scale-95 disabled:opacity-60 cursor-pointer"
            >
              {submitting && <Loader2 size={15} className="animate-spin" />}
              {submitting ? "Creating..." : "Create Shift"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Details modal */}
      <Modal open={detailsOpen} onClose={closeDetails} title="Shift Details">
        {selectedShift && (
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-white ${selectedShift.isNightShift ? "bg-violet-600" : "bg-indigo-600"
                  }`}
              >
                {selectedShift.isNightShift ? <Moon size={20} /> : <Sun size={20} />}
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 break-words capitalize">
                  {selectedShift.name}
                </h3>
                {selectedShift._id && (
                  <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1 min-w-0 font-mono">
                    <Hash size={11} className="shrink-0" />
                    <span className="truncate">{selectedShift._id}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              <div className="p-3 rounded-xl border border-slate-200 bg-white">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Start Time</span>
                <span className="text-base font-bold text-slate-800 mt-0.5 block">{to12h(selectedShift.startTime)}</span>
                <span className="text-[11px] text-slate-400 font-mono">{selectedShift.startTime}</span>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 bg-white">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">End Time</span>
                <span className="text-base font-bold text-slate-800 mt-0.5 block">{to12h(selectedShift.endTime)}</span>
                <span className="text-[11px] text-slate-400 font-mono">{selectedShift.endTime}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-slate-700">Total Duration</span>
              <span className="inline-flex items-center gap-1.5 text-sm font-bold text-indigo-600">
                <Timer size={15} /> {getDuration(selectedShift.startTime, selectedShift.endTime)}
              </span>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-slate-700">Shift Category</span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${selectedShift.isNightShift ? "bg-violet-100 text-violet-700" : "bg-indigo-100 text-indigo-700"
                  }`}
              >
                {selectedShift.isNightShift ? "Night Shift" : "Day Shift"}
              </span>
            </div>

            <button
              type="button"
              onClick={closeDetails}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer active:scale-[0.99]"
            >
              Close
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}