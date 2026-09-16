"use client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, Save, Wallet, CheckCircle2 } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Button from "@/components/ui/Button";

export default function PayrollSettingsPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ payrollCycle: "monthly" });

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/settings");
      setSettings(data);
      setForm({ payrollCycle: data.payrollCycle || "monthly" });
    } catch (err) {
      toast.error("Failed to load payroll settings.");
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
      toast.success("Payroll settings saved successfully.");
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
          Payroll Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Configure salary disbursement cycle for the organization.
        </p>
      </div>

      {/* Main Settings Form */}
      <form
        onSubmit={handleSave}
        className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 p-5 sm:p-8 space-y-6"
      >
        {/* Payroll Cycle Section */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Wallet size={16} className="text-indigo-600" />
            Payroll Cycle
          </label>
          <p className="text-xs text-slate-400">
            Select how frequently salary calculations and disbursements occur.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {["monthly", "bi-weekly"].map((cycle) => {
              const isSelected = form.payrollCycle === cycle;
              return (
                <button
                  key={cycle}
                  type="button"
                  onClick={() => setForm({ payrollCycle: cycle })}
                  className={`p-4 rounded-xl border text-sm font-semibold capitalize transition-all duration-200 flex items-center justify-between active:scale-[0.98] ${isSelected
                    ? "border-indigo-600 bg-indigo-50/60 text-indigo-700 shadow-sm shadow-indigo-100"
                    : "border-slate-200 text-slate-600 bg-slate-50/50 hover:bg-slate-100/80 hover:border-slate-300"
                    }`}
                >
                  <span className="flex items-center gap-2.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${isSelected ? "bg-indigo-600" : "bg-slate-300"}`} />
                    {cycle} Cycle
                  </span>
                  {isSelected && <CheckCircle2 size={18} className="text-indigo-600" />}
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