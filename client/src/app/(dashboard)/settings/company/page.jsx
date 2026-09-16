"use client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, Save, Building2, Image as ImageIcon, Sparkles } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Button from "@/components/ui/Button";

export default function CompanySettingsPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ companyName: "", companyLogo: "" });
  const [imgError, setImgError] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/settings");
      setSettings(data);
      setForm({
        companyName: data.companyName || "",
        companyLogo: data.companyLogo || ""
      });
      setImgError(false);
    } catch (err) {
      toast.error("Failed to load company settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Automatic Logo Generator (Agar user ne logo URL nahi diya, toh name ke basis par generate karega)
  const getInitialsLogo = (name) => {
    if (!name) return "";
    const cleanName = name.trim();
    return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName)}&backgroundColor=4f46e5&textColor=ffffff`;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Agar logo field khali hai, toh automatic generated initials logo save ho jayega
      const finalLogo = form.companyLogo.trim() || getInitialsLogo(form.companyName);

      const payload = { ...settings, ...form, companyLogo: finalLogo };

      await api.put("/settings", payload);
      toast.success("Company settings saved successfully.");
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

  // Determine which image to show in preview
  const currentLogoSrc = (!imgError && form.companyLogo) ? form.companyLogo : getInitialsLogo(form.companyName);

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

      {/* Header Section */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Company Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Manage your organization name and branding logo.
        </p>
      </div>

      {/* Main Settings Form */}
      <form
        onSubmit={handleSave}
        className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 p-5 sm:p-8 space-y-6"
      >
        {/* Logo Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-indigo-50 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-inner relative group">
            {currentLogoSrc ? (
              <img
                src={currentLogoSrc}
                alt="Company Logo Preview"
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <Building2 size={28} className="text-indigo-400" />
            )}
          </div>

          <div className="flex-1 w-full space-y-2">
            <label className="flex items-center justify-between text-sm font-semibold text-slate-700">
              <span className="flex items-center gap-2">
                <ImageIcon size={16} className="text-indigo-600" />
                Company Logo URL <span className="text-xs font-normal text-slate-400">(Optional)</span>
              </span>
              <span className="text-xs text-indigo-600 font-medium flex items-center gap-1">
                <Sparkles size={12} /> Auto-generates from name if empty
              </span>
            </label>
            <input
              type="text"
              value={form.companyLogo}
              onChange={(e) => {
                setImgError(false);
                setForm({ ...form, companyLogo: e.target.value });
              }}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm sm:text-base text-slate-800 placeholder:text-slate-400 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all duration-200"
              placeholder="Leave blank to auto-generate or paste image URL"
            />
            <p className="text-xs text-slate-400">
              Aap URL daal sakte hain, ya khali chhod sakte hain—naam ke mutabiq logo khud-ba-khud ban jayega.
            </p>
          </div>
        </div>

        {/* Company Name Section */}
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
            placeholder="e.g. 4Paysave Hi Tech Solution Pvt Ltd"
            required
          />
        </div>

        {/* Action Button */}
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