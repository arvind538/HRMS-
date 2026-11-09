"use client";
import { useEffect, useState, useCallback } from "react";
import {
  Loader2, Save, GitBranch, ShieldCheck, CheckCircle2,
  ArrowRight, User, UserCheck, UserCog
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Button from "@/components/ui/Button";

export default function WorkflowSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ multiLevelApproval: true });

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/settings");
      setForm({
        // Extracting from nested workflowSettings object
        multiLevelApproval: data.workflowSettings?.multiLevelApproval ?? true
      });
    } catch (err) {
      toast.error("Failed to load workflow settings.");
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
      // Backend ko proper nested structure bhej rahe hain
      await api.put("/settings", {
        workflowSettings: { multiLevelApproval: form.multiLevelApproval }
      });
      toast.success("Workflow settings saved successfully.");
      fetchSettings();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save settings. Administrator access is required.");
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
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Main Settings Form */}
      <form
        onSubmit={handleSave}
        className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 p-6 sm:p-8 space-y-8"
      >
        <div className="space-y-6">

          {/* Toggle Option for Multi-Level Approvals */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 p-5 sm:p-6 bg-slate-50/70 border border-slate-200/80 rounded-2xl transition-all duration-300 hover:bg-slate-50 hover:border-indigo-200">
            <div className="flex items-start sm:items-center gap-4">
              <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl shrink-0 shadow-sm">
                <GitBranch size={22} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                  Multi-Level Approval Chain
                  <ShieldCheck size={16} className="text-indigo-600" />
                </h3>
                <p className="text-sm text-slate-500">
                  Require sequential approval from the reporting manager followed by HR for employee requests (e.g., leaves, expenses).
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setForm({ multiLevelApproval: !form.multiLevelApproval })}
              className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ${form.multiLevelApproval ? "bg-indigo-600" : "bg-slate-300"
                }`}
              role="switch"
              aria-checked={form.multiLevelApproval}
            >
              <span
                className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-lg ring-0 transition duration-300 ease-in-out ${form.multiLevelApproval ? "translate-x-6" : "translate-x-0"
                  }`}
              />
            </button>
          </div>

          {/* Dynamic Visual Workflow Sequence Overview */}
          <div className="p-6 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-indigo-900">
              <CheckCircle2 size={18} className="text-indigo-600 shrink-0" />
              <span>Active Chain Sequence Preview</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 py-4">
              {/* Step 1: Employee */}
              <div className="flex flex-col items-center gap-2">
                <div className="w-14 h-14 bg-white border-2 border-indigo-200 rounded-full flex items-center justify-center shadow-sm text-indigo-600">
                  <User size={24} />
                </div>
                <span className="text-xs font-semibold text-slate-700">Employee Request</span>
              </div>

              {/* Arrow */}
              <ArrowRight size={20} className="text-indigo-300 rotate-90 sm:rotate-0" />

              {/* Step 2: Manager (Conditional) */}
              {form.multiLevelApproval && (
                <>
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-14 h-14 bg-indigo-600 border-2 border-indigo-600 rounded-full flex items-center justify-center shadow-md text-white">
                      <UserCheck size={24} />
                    </div>
                    <span className="text-xs font-semibold text-slate-700">Manager Review</span>
                  </div>
                  <ArrowRight size={20} className="text-indigo-300 rotate-90 sm:rotate-0" />
                </>
              )}

              {/* Step 3: HR / Admin */}
              <div className="flex flex-col items-center gap-2">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-sm text-white ${form.multiLevelApproval ? "bg-slate-800 border-2 border-slate-800" : "bg-indigo-600 border-2 border-indigo-600"}`}>
                  <UserCog size={24} />
                </div>
                <span className="text-xs font-semibold text-slate-700">HR Final Approval</span>
              </div>
            </div>
          </div>

        </div>

        {/* Action Button Section */}
        <div className="pt-6 mt-8 flex items-center justify-end border-t border-slate-100">
          <Button
            type="submit"
            loading={saving}
            className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-semibold text-sm sm:text-base rounded-xl transition-all duration-300 shadow-sm hover:shadow-lg hover:shadow-indigo-500/25 flex items-center justify-center gap-2"
          >
            <Save size={20} />
            <span>Save Settings</span>
          </Button>
        </div>
      </form>

    </div>
  );
}