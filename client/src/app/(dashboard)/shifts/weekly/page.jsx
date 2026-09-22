"use client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, Send, Calendar, User, Clock, CheckCircle2 } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Button from "@/components/ui/Button";

// Helper function to get current week's dates
const getWeekDates = () => {
  const dates = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
};

export default function WeeklySchedulePage() {
  const [employees, setEmployees] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ employee: "", shift: "" });

  const weekDates = getWeekDates();

  // Fetch real and active backend data concurrently
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [empRes, shiftRes] = await Promise.all([
        api.get("/employees"),
        api.get("/shifts")
      ]);
      setEmployees(Array.isArray(empRes.data) ? empRes.data : []);
      setShifts(Array.isArray(shiftRes.data) ? shiftRes.data : []);
    } catch (err) {
      toast.error("Failed to load backend schedule data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle submit form to assign shifts for the entire week
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.employee || !form.shift) {
      return toast.error("Please select both an employee and a shift template.");
    }

    setSubmitting(true);
    try {
      const { data } = await api.post("/shifts/assign-weekly", { ...form, dates: weekDates });
      toast.success(
        `${data.created?.length || 0} days assigned successfully, ${data.skipped?.length || 0} skipped (already assigned).`
      );
      setForm({ employee: "", shift: "" });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to assign weekly schedule.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-indigo-600" size={36} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-3 px-4 sm:px-3 lg:px-3 py-3 transition-all duration-300">

      {/* Header Section */}
      <div className="flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Weekly Schedule</h1>
        <p className="text-sm text-slate-500 mt-1">Assign a single shift template to an employee for the entire upcoming week.</p>
      </div>

      {/* Form Container Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 transition-all duration-300 hover:shadow-md">

        {/* Week Info Banner */}
        <div className="mb-6 flex items-center gap-3 bg-indigo-50/60 border border-indigo-100 p-3.5 rounded-xl text-indigo-900">
          <Calendar size={20} className="text-indigo-600 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-indigo-700">Active Schedule Week Range</p>
            <p className="text-sm font-medium mt-0.5">
              {new Date(weekDates[0]).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              {" — "}
              {new Date(weekDates[6]).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Employee Selection */}
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

          {/* Shift Selection */}
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

          {/* Submit Action Button */}
          <div className="pt-2">
            <Button
              type="submit"
              loading={submitting}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-xl transition-all duration-300 hover:shadow-lg flex items-center justify-center gap-2"
            >
              <Send size={18} /> Assign for the Week
            </Button>
          </div>

        </form>
      </div>

    </div>
  );
}