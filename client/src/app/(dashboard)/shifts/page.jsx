"use client";
import { useEffect, useState, useCallback } from "react";
import { Plus, Loader2, Clock, Moon, X, Info } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";

export default function ShiftsPage() {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", startTime: "09:30", endTime: "18:30", isNightShift: false });

  // New state for viewing shift details
  const [selectedShift, setSelectedShift] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  // Fetch shifts data from backend smoothly
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/shifts");
      setShifts(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error("Failed to load shift templates.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle shift creation with feedback
  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/shifts", form);
      toast.success("Shift template created successfully.");
      setModalOpen(false);
      setForm({ name: "", startTime: "09:30", endTime: "18:30", isNightShift: false });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create shift template.");
    } finally {
      setSubmitting(false);
    }
  };

  // Open details modal when a card is clicked
  const handleCardClick = (shift) => {
    setSelectedShift(shift);
    setDetailsModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-indigo-600" size={36} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 transition-all duration-300">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Shifts Management</h1>
          <p className="text-sm text-slate-500 mt-1">Manage shift templates that can be assigned to employees.</p>
        </div>
        <Button
          onClick={() => setModalOpen(true)}
          className="transition-all duration-300 transform hover:scale-105 hover:shadow-lg bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 font-medium"
        >
          <Plus size={18} /> New Shift
        </Button>
      </div>

      {/* Shifts Grid / Empty State */}
      {shifts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-16 text-center shadow-sm">
          <Clock className="mx-auto mb-3 text-slate-400 animate-pulse" size={40} />
          <h3 className="text-base font-semibold text-slate-700">No shift templates found</h3>
          <p className="text-sm text-slate-400 mt-1">Get started by creating your first shift template.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {shifts.map((s) => (
            <div
              key={s._id}
              onClick={() => handleCardClick(s)}
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-indigo-200 group cursor-pointer"
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110 ${s.isNightShift ? "bg-violet-50 text-violet-600" : "bg-indigo-50 text-indigo-600"}`}>
                {s.isNightShift ? <Moon size={22} /> : <Clock size={22} />}
              </div>
              <h4 className="font-bold text-slate-900 text-lg group-hover:text-indigo-600 transition-colors">{s.name}</h4>
              <p className="text-sm text-slate-600 font-medium mt-1.5 flex items-center gap-2">
                <span>{s.startTime}</span> - <span>{s.endTime}</span>
              </p>
              {s.isNightShift && (
                <span className="mt-3 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-100 text-violet-700">
                  Night Shift
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Create New Shift">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-slate-700">Shift Name</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1.5 w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              placeholder="e.g. Morning Shift"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-slate-700">Start Time</label>
              <input
                type="time"
                required
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                className="mt-1.5 w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700">End Time</label>
              <input
                type="time"
                required
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                className="mt-1.5 w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="nightShiftCheck"
              checked={form.isNightShift}
              onChange={(e) => setForm({ ...form, isNightShift: e.target.checked })}
              className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
            />
            <label htmlFor="nightShiftCheck" className="text-sm font-medium text-slate-700 cursor-pointer">
              Mark as Night Shift
            </label>
          </div>
          <div className="pt-2">
            <Button
              type="submit"
              loading={submitting}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-xl transition-all duration-300 hover:shadow-lg"
            >
              Create Shift
            </Button>
          </div>
        </form>
      </Modal>

      {/* Shift Details Modal */}
      <Modal isOpen={detailsModalOpen} onClose={() => setDetailsModalOpen(false)} title="Shift Details">
        {selectedShift && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${selectedShift.isNightShift ? "bg-violet-100 text-violet-700" : "bg-indigo-100 text-indigo-700"}`}>
                {selectedShift.isNightShift ? <Moon size={24} /> : <Clock size={24} />}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">{selectedShift.name}</h3>
                <p className="text-xs text-slate-500 font-medium">Shift Template ID: {selectedShift._id}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                <span className="text-xs font-semibold text-slate-400 block">Start Time</span>
                <span className="text-base font-bold text-slate-800 mt-1 block">{selectedShift.startTime}</span>
              </div>
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                <span className="text-xs font-semibold text-slate-400 block">End Time</span>
                <span className="text-base font-bold text-slate-800 mt-1 block">{selectedShift.endTime}</span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-white flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">Shift Category</span>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${selectedShift.isNightShift ? "bg-violet-100 text-violet-700" : "bg-indigo-100 text-indigo-700"}`}>
                {selectedShift.isNightShift ? "Night Shift" : "Day Shift"}
              </span>
            </div>

            <div className="pt-2">
              <Button
                onClick={() => setDetailsModalOpen(false)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-2.5 rounded-xl transition-all"
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}