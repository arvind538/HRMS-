"use client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, Save, Bell, MailCheck } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Button from "@/components/ui/Button";

export default function NotificationSettingsPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(true);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/settings");
      setSettings(data);
      setEmailEnabled(data.emailNotificationsEnabled ?? true);
    } catch (err) {
      toast.error("Failed to load notification settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put("/settings", { ...settings, emailNotificationsEnabled: emailEnabled });
      toast.success("Notification settings saved successfully.");
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
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-3 lg:px-4 py-3 space-y-3">

      {/* Header Section */}
      <div className="flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/85 shadow-xs transition-all">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Notification Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Configure automated notification preferences and email alerts.
        </p>
      </div>

      {/* Main Settings Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 p-5 sm:p-8 space-y-6">

        {/* Toggle Option */}
        <div className="flex items-center justify-between p-4 sm:p-5 bg-slate-50/70 border border-slate-200/80 rounded-2xl transition-all duration-200 hover:bg-slate-50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl shrink-0 shadow-inner">
              <Bell size={20} />
            </div>
            <div className="space-y-0.5">
              <p className="text-sm sm:text-base font-semibold text-slate-800 flex items-center gap-2">
                Email Notifications
                <MailCheck size={16} className="text-emerald-600" />
              </p>
              <p className="text-xs sm:text-sm text-slate-500">
                Send automatic emails for leave requests, attendance updates, and payroll processing.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setEmailEnabled(!emailEnabled)}
            className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none ${emailEnabled ? "bg-indigo-600" : "bg-slate-300"
              }`}
          >
            <span
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-300 ease-in-out ${emailEnabled ? "translate-x-7" : "translate-x-0"
                }`}
            />
          </button>
        </div>

        {/* Action Button Section */}
        <div className="pt-4 flex items-center justify-end border-t border-slate-100">
          <Button
            onClick={handleSave}
            loading={saving}
            className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-medium text-sm rounded-xl transition-all duration-200 shadow-sm hover:shadow flex items-center justify-center gap-2"
          >
            <Save size={18} />
            <span>Save Changes</span>
          </Button>
        </div>

      </div>
    </div>
  );
}