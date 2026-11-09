"use client";
import { useEffect, useState, useCallback } from "react";
import {
  Loader2, Save, Building2, Image as ImageIcon, Sparkles,
  MapPin, Globe, Mail, Phone, FileText
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Button from "@/components/ui/Button";

export default function CompanySettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Mapped to match the newly updated nested backend schema
  const [form, setForm] = useState({
    companyName: "",
    companyLogo: "",
    companyAddress: "",
    website: "",
    email: "",
    phone: "",
    panNumber: "",
    gstNumber: "",
    cinNumber: ""
  });

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/settings");
      const c = data.company || {};
      setForm({
        companyName: c.name || "",
        companyLogo: c.logo || "",
        companyAddress: c.address || "",
        website: c.website || "",
        email: c.email || "",
        phone: c.phone || "",
        panNumber: c.panNumber || "",
        gstNumber: c.gstNumber || "",
        cinNumber: c.cinNumber || ""
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

  const getInitialsLogo = (name) => {
    if (!name) return "";
    const cleanName = name.trim();
    return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName)}&backgroundColor=4f46e5&textColor=ffffff`;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const finalLogo = form.companyLogo.trim() || getInitialsLogo(form.companyName);

      // Structuring payload for the nested backend
      const payload = {
        company: {
          name: form.companyName,
          logo: finalLogo,
          address: form.companyAddress,
          website: form.website,
          email: form.email,
          phone: form.phone,
          panNumber: form.panNumber,
          gstNumber: form.gstNumber,
          cinNumber: form.cinNumber
        }
      };

      await api.put("/settings", payload);
      toast.success("Company settings saved successfully.");
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

  const currentLogoSrc = (!imgError && form.companyLogo) ? form.companyLogo : getInitialsLogo(form.companyName);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-3 lg:px-4 py-6 space-y-3">
      {/* Main Settings Form */}
      <form
        onSubmit={handleSave}
        className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 p-6 sm:p-8 space-y-8"
      >
        {/* Logo Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="w-24 h-24 sm:w-20 sm:h-20 rounded-2xl bg-indigo-50 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-inner relative group">
            {currentLogoSrc ? (
              <img
                src={currentLogoSrc}
                alt="Company Logo Preview"
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <Building2 size={32} className="text-indigo-400" />
            )}
          </div>

          <div className="flex-1 w-full space-y-2.5">
            <label className="flex items-center justify-between text-sm font-semibold text-slate-700">
              <span className="flex items-center gap-2">
                <ImageIcon size={18} className="text-indigo-600" />
                Company Logo URL <span className="text-xs font-normal text-slate-400">(Optional)</span>
              </span>
              <span className="text-xs text-indigo-600 font-medium flex items-center gap-1">
                <Sparkles size={14} /> Auto-generates if empty
              </span>
            </label>
            <input
              type="url"
              value={form.companyLogo}
              onChange={(e) => {
                setImgError(false);
                setForm({ ...form, companyLogo: e.target.value });
              }}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm sm:text-base text-slate-800 placeholder:text-slate-400 bg-slate-50/50 hover:bg-slate-50 hover:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 outline-none transition-all duration-300"
              placeholder="Leave blank to auto-generate or paste image URL"
            />
            <p className="text-xs text-slate-500">
              You can provide a valid image URL or leave this field empty to automatically generate a logo based on the company name.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">

          {/* Company Name */}
          <div className="space-y-2.5 md:col-span-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Building2 size={18} className="text-indigo-600" />
              Company Name
            </label>
            <input
              type="text"
              value={form.companyName}
              onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm sm:text-base text-slate-800 placeholder:text-slate-400 bg-slate-50/50 hover:bg-slate-50 hover:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 outline-none transition-all duration-300"
              placeholder="e.g. Acme Corporation Pvt Ltd"
              required
            />
          </div>

          {/* Official Email */}
          <div className="space-y-2.5">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Mail size={18} className="text-indigo-600" />
              Official Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm sm:text-base text-slate-800 placeholder:text-slate-400 bg-slate-50/50 hover:bg-slate-50 hover:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 outline-none transition-all duration-300"
              placeholder="contact@company.com"
            />
          </div>

          {/* Phone Number */}
          <div className="space-y-2.5">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Phone size={18} className="text-indigo-600" />
              Phone Number
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm sm:text-base text-slate-800 placeholder:text-slate-400 bg-slate-50/50 hover:bg-slate-50 hover:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 outline-none transition-all duration-300"
              placeholder="+91 98765 43210"
            />
          </div>

          {/* Website */}
          <div className="space-y-2.5 md:col-span-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Globe size={18} className="text-indigo-600" />
              Website URL
            </label>
            <input
              type="url"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm sm:text-base text-slate-800 placeholder:text-slate-400 bg-slate-50/50 hover:bg-slate-50 hover:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 outline-none transition-all duration-300"
              placeholder="https://www.company.com"
            />
          </div>

          {/* Company Address */}
          <div className="space-y-2.5 md:col-span-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <MapPin size={18} className="text-indigo-600" />
              Registered Address
            </label>
            <textarea
              value={form.companyAddress}
              onChange={(e) => setForm({ ...form, companyAddress: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm sm:text-base text-slate-800 placeholder:text-slate-400 bg-slate-50/50 hover:bg-slate-50 hover:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 outline-none transition-all duration-300 resize-none"
              placeholder="Enter complete registered office address"
            />
          </div>

          {/* Tax & Legal Compliance Info */}
          <div className="space-y-2.5">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <FileText size={18} className="text-indigo-600" />
              PAN Number
            </label>
            <input
              type="text"
              value={form.panNumber}
              onChange={(e) => setForm({ ...form, panNumber: e.target.value.toUpperCase() })}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm sm:text-base text-slate-800 placeholder:text-slate-400 bg-slate-50/50 hover:bg-slate-50 hover:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 outline-none transition-all duration-300 uppercase"
              placeholder="ABCDE1234F"
              maxLength={10}
            />
          </div>

          <div className="space-y-2.5">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <FileText size={18} className="text-indigo-600" />
              GSTIN
            </label>
            <input
              type="text"
              value={form.gstNumber}
              onChange={(e) => setForm({ ...form, gstNumber: e.target.value.toUpperCase() })}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm sm:text-base text-slate-800 placeholder:text-slate-400 bg-slate-50/50 hover:bg-slate-50 hover:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 outline-none transition-all duration-300 uppercase"
              placeholder="22AAAAA0000A1Z5"
              maxLength={15}
            />
          </div>

          <div className="space-y-2.5 md:col-span-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <FileText size={18} className="text-indigo-600" />
              CIN (Corporate Identification Number)
            </label>
            <input
              type="text"
              value={form.cinNumber}
              onChange={(e) => setForm({ ...form, cinNumber: e.target.value.toUpperCase() })}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm sm:text-base text-slate-800 placeholder:text-slate-400 bg-slate-50/50 hover:bg-slate-50 hover:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 outline-none transition-all duration-300 uppercase"
              placeholder="U12345MH2023PTC123456"
              maxLength={21}
            />
          </div>

        </div>

        {/* Action Button Section */}
        <div className="pt-6 mt-6 flex items-center justify-end border-t border-slate-100">
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
