"use client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, Save, Landmark, Calendar, FileText } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Button from "@/components/ui/Button";

export default function ProfessionalTaxPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    ptNumber: "",
    state: "Delhi",
    monthlyDueDate: "Last day of every month",
    status: "active",
    remarks: ""
  });

  const fetchPTSettings = useCallback(async () => {
    setLoading(true);
    try {
      // Backend ke existing /settings endpoint se Professional Tax compliance data fetch kar rahe hain
      const { data } = await api.get("/settings");
      setSettings(data);
      if (data.professionalTaxSettings) {
        setForm({
          ptNumber: data.professionalTaxSettings.ptNumber || "",
          state: data.professionalTaxSettings.state || "Delhi",
          monthlyDueDate: data.professionalTaxSettings.monthlyDueDate || "Last day of every month",
          status: data.professionalTaxSettings.status || "active",
          remarks: data.professionalTaxSettings.remarks || ""
        });
      }
    } catch (err) {
      toast.error("Failed to load Professional Tax compliance settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPTSettings();
  }, [fetchPTSettings]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Existing /settings endpoint par professionalTaxSettings object merge karke bhej rahe hain
      await api.put("/settings", {
        ...settings,
        professionalTaxSettings: form
      });
      toast.success("Professional Tax records saved successfully.");
      fetchPTSettings();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save Professional Tax records. Only administrators can edit this.");
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
            <Landmark size={24} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Professional Tax (PT) Compliance
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Manage state-wise professional tax registration filings, tracking records, and official due dates.
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

          {/* PT Registration Number */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <FileText size={16} className="text-indigo-600" />
              Professional Tax Registration Number
            </label>
            <input
              type="text"
              value={form.ptNumber}
              onChange={(e) => setForm({ ...form, ptNumber: e.target.value })}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm sm:text-base text-slate-800 placeholder:text-slate-400 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all duration-200 uppercase"
              placeholder="e.g. PTREG12345678"
              required
            />
          </div>

          {/* State Selection */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Landmark size={16} className="text-indigo-600" />
              Applicable State
            </label>
            <input
              type="text"
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm sm:text-base text-slate-800 placeholder:text-slate-400 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all duration-200"
              placeholder="e.g. Maharashtra / Karnataka"
              required
            />
          </div>

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
            placeholder="e.g. Last day of every month"
            required
          />
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
            placeholder="Add any specific notes regarding state-wise professional tax deductions or challans..."
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
            <span>Save PT Records</span>
          </Button>
        </div>
      </form>

    </div>
  );
}