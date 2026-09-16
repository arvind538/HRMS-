"use client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, CalendarCheck, User, Clock, Calendar, ArrowRight } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Button from "@/components/ui/Button";

export default function ShiftAssignmentPage() {
  const [employees, setEmployees] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [form, setForm] = useState({
    employee: "",
    shift: "",
    date: new Date().toISOString().split("T")[0]
  });

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
      toast.error("Failed to load assignment data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAssign = async (e) => {
    e.preventDefault();
    setAssigning(true);
    try {
      await api.post("/shifts/assign", form);
      toast.success("Shift assigned successfully to the employee.");
      setForm((prev) => ({ ...prev, employee: "", shift: "" }));
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to assign shift.");
    } finally {
      setAssigning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] w-full">
        <Loader2 className="animate-spin text-indigo-600" size={36} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 px-4 sm:px-6 lg:px-8 py-6 transition-all duration-300">

      {/* Header Section */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Shift Assignment</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">Assign custom shift schedules to employees for specific dates.</p>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 transition-all duration-300 hover:shadow-md">
        <form onSubmit={handleAssign} className="space-y-5" autoComplete="off">

          {/* Employee Selection */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <User size={16} className="text-indigo-600" /> Select Employee
            </label>
            <select
              required
              name="workspace_employee_select"
              autoComplete="off"
              value={form.employee}
              onChange={(e) => setForm({ ...form, employee: e.target.value })}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm sm:text-base text-slate-800 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all cursor-pointer"
            >
              <option value="">-- Choose an employee --</option>
              {employees.map((emp) => {
                // Clean display formatting for test / real data
                const displayName = emp.name || "Staff Member";
                const displayEmail = emp.email ? `(${emp.email})` : "";
                return (
                  <option key={emp._id} value={emp._id}>
                    {displayName} {displayEmail}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Shift Selection */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Clock size={16} className="text-indigo-600" /> Select Shift Template
            </label>
            <select
              required
              name="workspace_shift_select"
              autoComplete="off"
              value={form.shift}
              onChange={(e) => setForm({ ...form, shift: e.target.value })}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm sm:text-base text-slate-800 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all cursor-pointer"
            >
              <option value="">-- Choose a shift template --</option>
              {shifts.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name} ({s.startTime} - {s.endTime}) {s.isNightShift ? "🌙 [Night Shift]" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Date Selection */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Calendar size={16} className="text-indigo-600" /> Assignment Date
            </label>
            <input
              type="date"
              required
              name="workspace_assignment_date"
              autoComplete="off"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm sm:text-base text-slate-800 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
            />
          </div>

          {/* Submit Action Button */}
          <div className="pt-3">
            <Button
              type="submit"
              loading={assigning}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-xl transition-all duration-300 shadow-sm hover:shadow flex items-center justify-center gap-2"
            >
              <CalendarCheck size={18} /> Assign Shift <ArrowRight size={16} />
            </Button>
          </div>

        </form>
      </div>
    </div>
  );
}