"use client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, Save, Scale, Calendar, FileText } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Button from "@/components/ui/Button";

export default function LabourCompliancePage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    registrationNumber: "",
    actName: "Factories Act / Shops & Establishment Act",
    dueDate: "Quarterly / Annual Filings",
    status: "active",
    remarks: ""
  });

  const fetchLabourSettings = useCallback(async () => {
    setLoading(true);
    try {
      // Backend ke existing /settings endpoint se Labour compliance data fetch kar rahe hain
      const { data } = await api.get("/settings");
      setSettings(data);
      if (data.labourSettings) {
        setForm({
          registrationNumber: data.labourSettings.registrationNumber || "",
          actName: data.labourSettings.actName || "Factories Act / Shops & Establishment Act",
          dueDate: data.labourSettings.dueDate || "Quarterly / Annual Filings",
          status: data.labourSettings.status || "active",
          remarks: data.labourSettings.remarks || ""
        });
      }
    } catch (err) {
      toast.error("Failed to load labour compliance settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLabourSettings();
  }, [fetchLabourSettings]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Existing /settings endpoint par labourSettings object merge karke bhej rahe hain
      await api.put("/settings", {
        ...settings,
        labourSettings: form
      });
      toast.success("Labour compliance records saved successfully.");
      fetchLabourSettings();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save labour compliance records. Only administrators can edit this.");
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
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-3 lg:px-4 py-3 space-y-3">

      {/* Header Section */}
      <div className="flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl shadow-inner">
            <Scale size={24} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Labour Law Compliance
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Manage labour law related compliance filings, registers, and statutory due dates.
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

          {/* Registration Number */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <FileText size={16} className="text-indigo-600" />
              Establishment / License Number
            </label>
            <input
              type="text"
              value={form.registrationNumber}
              onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm sm:text-base text-slate-800 placeholder:text-slate-400 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all duration-200"
              placeholder="e.g. LBR/2026/REG/9876"
              required
            />
          </div>

          {/* Applicable Act */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Scale size={16} className="text-indigo-600" />
              Applicable Labour Act
            </label>
            <input
              type="text"
              value={form.actName}
              onChange={(e) => setForm({ ...form, actName: e.target.value })}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm sm:text-base text-slate-800 placeholder:text-slate-400 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all duration-200"
              placeholder="e.g. Shops & Establishment Act"
              required
            />
          </div>

        </div>

        {/* Due Date */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Calendar size={16} className="text-indigo-600" />
            Filing Schedule / Due Date
          </label>
          <input
            type="text"
            value={form.dueDate}
            onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm sm:text-base text-slate-800 placeholder:text-slate-400 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all duration-200"
            placeholder="e.g. Quarterly or Annual filings"
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
            <option value="active">Active & Compliant</option>
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
            placeholder="Add notes regarding statutory registers, employee registers, or license renewals..."
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
            <span>Save Labour Records</span>
          </Button>
        </div>
      </form>

    </div>
  );
}