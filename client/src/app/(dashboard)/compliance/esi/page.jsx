"use client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, Save, ShieldAlert, Calendar, FileText } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Button from "@/components/ui/Button";

export default function ESIPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    esiNumber: "",
    monthlyDueDate: "15th of every month",
    status: "active",
    remarks: ""
  });

  const fetchESISettings = useCallback(async () => {
    setLoading(true);
    try {
      // Backend ke existing /settings endpoint se ESI compliance data fetch kar rahe hain
      const { data } = await api.get("/settings");
      setSettings(data);
      if (data.esiSettings) {
        setForm({
          esiNumber: data.esiSettings.esiNumber || "",
          monthlyDueDate: data.esiSettings.monthlyDueDate || "15th of every month",
          status: data.esiSettings.status || "active",
          remarks: data.esiSettings.remarks || ""
        });
      }
    } catch (err) {
      toast.error("Failed to load ESI compliance settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchESISettings();
  }, [fetchESISettings]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Existing /settings endpoint par esiSettings object merge karke bhej rahe hain
      await api.put("/settings", {
        ...settings,
        esiSettings: form
      });
      toast.success("ESI compliance records saved successfully.");
      fetchESISettings();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save ESI records. Only administrators can edit this.");
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
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl shadow-inner">
            <ShieldAlert size={24} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Employee State Insurance (ESI) Compliance
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Manage monthly ESI contribution filings, tracking records, and official due dates.
            </p>
          </div>
        </div>
      </div>

      {/* Main Form Card */}
      <form
        onSubmit={handleSave}
        className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 p-5 sm:p-8 space-y-6"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

          {/* ESI Employer Code */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <FileText size={16} className="text-indigo-600" />
              Employer / ESI Registration Code
            </label>
            <input
              type="text"
              value={form.esiNumber}
              onChange={(e) => setForm({ ...form, esiNumber: e.target.value })}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm sm:text-base text-slate-800 placeholder:text-slate-400 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all duration-200"
              placeholder="e.g. 56000123450001001"
              required
            />
          </div>

          {/* Monthly Due Date */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Calendar size={16} className="text-indigo-600" />
              Monthly Filing Due Date
            </label>
            <input
              type="text"
              value={form.monthlyDueDate}
              onChange={(e) => setForm({ ...form, monthlyDueDate: e.target.value })}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm sm:text-base text-slate-800 placeholder:text-slate-400 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all duration-200"
              placeholder="e.g. 15th of every month"
              required
            />
          </div>

        </div>

        {/* Status Selection */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            Compliance Status
          </label>
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm sm:text-base text-slate-800 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all duration-200 cursor-pointer"
          >
            <option value="active">Active & Up-to-Date</option>
            <option value="pending">Pending Filing</option>
            <option value="review">Under Review</option>
          </select>
        </div>

        {/* Remarks / Notes */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            Filing Remarks & Notes
          </label>
          <textarea
            rows={3}
            value={form.remarks}
            onChange={(e) => setForm({ ...form, remarks: e.target.value })}
            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm sm:text-base text-slate-800 placeholder:text-slate-400 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all duration-200 resize-none"
            placeholder="Add any specific notes regarding monthly ESI contributions or challans..."
          />
        </div>

        {/* Action Button Section */}
        <div className="pt-4 flex items-center justify-end border-t border-slate-100">
          <Button
            type="submit"
            loading={saving}
            className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-medium text-sm rounded-xl transition-all duration-200 shadow-sm hover:shadow flex items-center justify-center gap-2"
          >
            <Save size={18} />
            <span>Save ESI Records</span>
          </Button>
        </div>
      </form>

    </div>
  );
}