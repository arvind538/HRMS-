"use client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, Save, Calendar, HeartPulse, Coffee, Briefcase } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Button from "@/components/ui/Button";

export default function LeaveSettingsPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ sickLeaves: 12, casualLeaves: 12, earnedLeaves: 15 });

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/settings");
      setSettings(data);
      setForm({
        sickLeaves: data.leavePolicy?.sickLeaves ?? 12,
        casualLeaves: data.leavePolicy?.casualLeaves ?? 12,
        earnedLeaves: data.leavePolicy?.earnedLeaves ?? 15,
      });
    } catch (err) {
      toast.error("Failed to load leave policy settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Backend par leave policy ko nested object ke roop me bhej rahe hain
      await api.put("/settings", { ...settings, leavePolicy: form });
      toast.success("Leave policy saved successfully.");
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
          Leave Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Configure yearly quota limits for different leave types.
        </p>
      </div>

      {/* Main Form Card */}
      <form
        onSubmit={handleSave}
        className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 p-5 sm:p-8 space-y-6"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">

          {/* Sick Leaves */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <HeartPulse size={16} className="text-rose-500" />
              Sick Leaves / Year
            </label>
            <input
              type="number"
              min="0"
              value={form.sickLeaves}
              onChange={(e) => setForm({ ...form, sickLeaves: Number(e.target.value) })}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm sm:text-base text-slate-800 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all duration-200"
              required
            />
          </div>

          {/* Casual Leaves */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Coffee size={16} className="text-amber-500" />
              Casual Leaves / Year
            </label>
            <input
              type="number"
              min="0"
              value={form.casualLeaves}
              onChange={(e) => setForm({ ...form, casualLeaves: Number(e.target.value) })}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm sm:text-base text-slate-800 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all duration-200"
              required
            />
          </div>

          {/* Earned Leaves */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Briefcase size={16} className="text-indigo-600" />
              Earned Leaves / Year
            </label>
            <input
              type="number"
              min="0"
              value={form.earnedLeaves}
              onChange={(e) => setForm({ ...form, earnedLeaves: Number(e.target.value) })}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm sm:text-base text-slate-800 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all duration-200"
              required
            />
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