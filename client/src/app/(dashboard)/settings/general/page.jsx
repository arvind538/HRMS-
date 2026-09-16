"use client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, Save, Building2, CalendarRange, ShieldAlert } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Button from "@/components/ui/Button";

export default function GeneralSettingsPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ companyName: "", payrollCycle: "monthly" });

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/settings");
      setSettings(data);
      setForm({
        companyName: data.companyName || "",
        payrollCycle: data.payrollCycle || "monthly"
      });
    } catch (err) {
      toast.error("Settings load nahi ho payi.");
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
      await api.put("/settings", { ...settings, ...form });
      toast.success("General settings save ho gayi.");
      fetchSettings();
    } catch (err) {
      toast.error(err.response?.data?.message || "Save nahi hua — sirf Admin ye edit kar sakta hai.");
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            General Settings
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Company ke basic aur payroll-cycle settings manage karein.
          </p>
        </div>
      </div>

      {/* Form Card */}
      <form
        onSubmit={handleSave}
        className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 p-5 sm:p-8 space-y-6"
      >
        {/* Company Name Input */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Building2 size={16} className="text-indigo-600" />
            Company Name
          </label>
          <input
            type="text"
            value={form.companyName}
            onChange={(e) => setForm({ ...form, companyName: e.target.value })}
            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm sm:text-base text-slate-800 placeholder:text-slate-400 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all duration-200"
            placeholder="e.g. My Company Pvt Ltd"
            required
          />
        </div>

        {/* Payroll Cycle Selector */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <CalendarRange size={16} className="text-indigo-600" />
            Payroll Cycle
          </label>
          <select
            value={form.payrollCycle}
            onChange={(e) => setForm({ ...form, payrollCycle: e.target.value })}
            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm sm:text-base text-slate-800 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all duration-200 cursor-pointer"
          >
            <option value="monthly">Monthly (Maahvar)</option>
            <option value="bi-weekly">Bi-Weekly (Har 2 Hafte)</option>
          </select>
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