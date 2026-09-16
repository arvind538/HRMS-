"use client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, Save, Clock, CalendarDays, CheckCircle2 } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Button from "@/components/ui/Button";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function AttendanceSettingsPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    officeStartTime: "09:30",
    officeEndTime: "18:30",
    weekOff: ["Saturday", "Sunday"]
  });

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/settings");
      setSettings(data);
      setForm({
        officeStartTime: data.officeStartTime || "09:30",
        officeEndTime: data.officeEndTime || "18:30",
        weekOff: data.weekOff || [],
      });
    } catch (err) {
      toast.error("Failed to load attendance settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const toggleDay = (day) => {
    setForm((prev) => ({
      ...prev,
      weekOff: prev.weekOff.includes(day)
        ? prev.weekOff.filter((d) => d !== day)
        : [...prev.weekOff, day],
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put("/settings", { ...settings, ...form });
      toast.success("Attendance settings saved successfully.");
      fetchSettings();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save settings. Only administrators can edit this.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] w-full">
        <Loader2 className="animate-spin text-indigo-600 w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

      {/* Header Section */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Attendance Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Configure office working hours and weekly off days for attendance calculation.
        </p>
      </div>

      {/* Form Card */}
      <form
        onSubmit={handleSave}
        className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 p-5 sm:p-8 space-y-6"
      >
        {/* Office Timings Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Start Time */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Clock size={16} className="text-indigo-600" />
              Office Start Time
            </label>
            <input
              type="time"
              value={form.officeStartTime}
              onChange={(e) => setForm({ ...form, officeStartTime: e.target.value })}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm sm:text-base text-slate-800 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all duration-200 cursor-pointer"
              required
            />
          </div>

          {/* End Time */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Clock size={16} className="text-indigo-600" />
              Office End Time
            </label>
            <input
              type="time"
              value={form.officeEndTime}
              onChange={(e) => setForm({ ...form, officeEndTime: e.target.value })}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm sm:text-base text-slate-800 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all duration-200 cursor-pointer"
              required
            />
          </div>
        </div>

        {/* Weekly Off Days Section */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <CalendarDays size={16} className="text-indigo-600" />
            Weekly Off Days
          </label>
          <p className="text-xs text-slate-400">
            Select the days when the office remains closed. Click to toggle selection.
          </p>

          <div className="flex flex-wrap gap-2.5 pt-1">
            {DAYS.map((day) => {
              const isSelected = form.weekOff.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 flex items-center gap-1.5 active:scale-95 ${isSelected
                    ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200 hover:bg-indigo-700"
                    : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                    }`}
                >
                  {isSelected && <CheckCircle2 size={14} />}
                  {day}
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Button Section */}
        <div className="pt-4 flex items-center justify-end border-t border-slate-100">
          <Button
            type="submit"
            loading={saving}
            className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-medium text-sm rounded-xl transition-all duration-200 shadow-sm hover:shadow flex items-center justify-center gap-2"
          >
            <Save size={18} />
            <span>Save Changes</span>
          </Button>
        </div>
      </form>

    </div>
  );
}