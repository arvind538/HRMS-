"use client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, Save, GitBranch, ShieldCheck, CheckCircle2 } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Button from "@/components/ui/Button";

export default function WorkflowSettingsPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [multiLevelApproval, setMultiLevelApproval] = useState(true);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/settings");
      setSettings(data);
      // Backend model ya settings ke andar workflow configuration check karte hain
      setMultiLevelApproval(data.workflowSettings?.multiLevelApproval ?? true);
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
      // Backend ke Workflow/Settings structure ke mutabiq data bhej rahe hain
      await api.put("/settings", {
        ...settings,
        workflowSettings: { multiLevelApproval }
      });
      toast.success("Workflow settings saved successfully.");
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
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-3 lg:px-3 py-3 space-y-3">

      {/* Header Section */}
      <div className="flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/85 shadow-xs transition-all">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Workflow Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Configure approval chains and multi-level workflow sequences (e.g., Leave → Manager → HR approval sequence).
        </p>
      </div>

      {/* Main Settings Form */}
      <form
        onSubmit={handleSave}
        className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 p-5 sm:p-8 space-y-6"
      >
        {/* Toggle Option for Multi-Level Approvals */}
        <div className="flex items-center justify-between p-4 sm:p-5 bg-slate-50/70 border border-slate-200/80 rounded-2xl transition-all duration-200 hover:bg-slate-50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl shrink-0 shadow-inner">
              <GitBranch size={20} />
            </div>
            <div className="space-y-0.5">
              <p className="text-sm sm:text-base font-semibold text-slate-800 flex items-center gap-2">
                Multi-Level Approval Chain
                <ShieldCheck size={16} className="text-indigo-600" />
              </p>
              <p className="text-xs sm:text-sm text-slate-500">
                Require sequential approval from reporting manager followed by HR for requests.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMultiLevelApproval(!multiLevelApproval)}
            className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none ${multiLevelApproval ? "bg-indigo-600" : "bg-slate-300"
              }`}
          >
            <span
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-300 ease-in-out ${multiLevelApproval ? "translate-x-7" : "translate-x-0"
                }`}
            />
          </button>
        </div>

        {/* Workflow Sequence Overview Card */}
        <div className="p-4 rounded-xl bg-indigo-50/40 border border-indigo-100 flex items-center gap-3 text-xs sm:text-sm text-indigo-900">
          <CheckCircle2 size={18} className="text-indigo-600 shrink-0" />
          <span>
            <strong>Active Chain Sequence:</strong> Employee Request ➔ Reporting Manager Review ➔ HR Final Approval.
          </span>
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