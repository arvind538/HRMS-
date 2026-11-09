"use client";
import { useEffect, useState, useCallback } from "react";
import {
  Loader2, Save, Clock, CalendarDays, CheckCircle2, Plus, X
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Button from "@/components/ui/Button";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function AttendanceSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newIp, setNewIp] = useState("");

  // State matched to your extended backend schema
  const [form, setForm] = useState({
    officeStartTime: "09:30",
    officeEndTime: "18:30",
    weekOff: ["Sunday"],
    gracePeriodMins: 15,
    workAvailabilityPercent: 80,
    ipValidationMode: "none", // 'allow', 'restrict', 'none'
    ipList: []
  });

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/settings");
      const a = data.attendance || {};

      setForm({
        officeStartTime: a.officeStartTime || "09:30",
        officeEndTime: a.officeEndTime || "18:30",
        weekOff: a.weekOff || ["Sunday"],
        gracePeriodMins: a.gracePeriodMins ?? 15,
        workAvailabilityPercent: a.workAvailabilityPercent ?? 80,
        ipValidationMode: a.ipValidationMode || "none",
        ipList: a.ipList || []
      });
    } catch (err) {
      toast.error("Failed to load attendance settings. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const toggleDay = (day) => {
    setForm((prev) => ({
      ...prev,
      weekOff: prev.weekOff.includes(day)
        ? prev.weekOff.filter((d) => d !== day)
        : [...prev.weekOff, day],
    }));
  };

  const handleAddIp = () => {
    const ip = newIp.trim();
    if (!ip) return;
    // Basic IP validation regex (IPv4)
    const ipRegex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

    if (!ipRegex.test(ip)) {
      toast.error("Please enter a valid IP Address format (e.g., 192.168.1.1).");
      return;
    }

    if (form.ipList.includes(ip)) {
      toast.info("This IP is already in the list.");
      return;
    }

    setForm({ ...form, ipList: [...form.ipList, ip] });
    setNewIp("");
  };

  const removeIp = (ipToRemove) => {
    setForm({ ...form, ipList: form.ipList.filter((ip) => ip !== ipToRemove) });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    // Structuring payload for the nested backend
    const payload = {
      attendance: {
        officeStartTime: form.officeStartTime,
        officeEndTime: form.officeEndTime,
        weekOff: form.weekOff,
        gracePeriodMins: Number(form.gracePeriodMins),
        workAvailabilityPercent: Number(form.workAvailabilityPercent),
        ipValidationMode: form.ipValidationMode,
        ipList: form.ipList
      }
    };

    try {
      await api.put("/settings", payload);
      toast.success("Attendance settings updated successfully.");
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


      <form onSubmit={handleSave} className="space-y-6">

        {/* --- SECTION 1: Shift & Weekly Off (Kept Clean) --- */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-6 border-b pb-3">General Schedule</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 mb-8">
            <div className="space-y-2.5">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Clock size={18} className="text-indigo-600" /> Start Time
              </label>
              <input
                type="time"
                value={form.officeStartTime}
                onChange={(e) => setForm({ ...form, officeStartTime: e.target.value })}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm sm:text-base text-slate-800 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-600 outline-none transition-all duration-300"
                required
              />
            </div>
            <div className="space-y-2.5">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Clock size={18} className="text-indigo-600" /> End Time
              </label>
              <input
                type="time"
                value={form.officeEndTime}
                onChange={(e) => setForm({ ...form, officeEndTime: e.target.value })}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm sm:text-base text-slate-800 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-600 outline-none transition-all duration-300"
                required
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <CalendarDays size={18} className="text-indigo-600" /> Weekly Off Days Sunday.
            </label>
            <div className="flex flex-wrap gap-3 pt-2">
              {DAYS.map((day) => {
                const isSelected = form.weekOff.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`px-5 py-2.5 rounded-xl text-sm sm:text-base font-medium transition-all duration-200 flex items-center gap-2 active:scale-95 ${isSelected ? "bg-indigo-600 text-white shadow-md shadow-indigo-200 border-transparent" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                      }`}
                  >
                    {isSelected && <CheckCircle2 size={16} className="text-white" />}
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* --- SECTION 2: Definitions (From Image 1) --- */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-6 border-b pb-3">Definitions</h2>

          <div className="space-y-8">
            {/* Tolerance Row */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8 items-start">
              <div className="md:col-span-5 space-y-1">
                <label className="text-sm font-bold text-slate-800">
                  Punch in time tolerance(Minutes) <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-slate-400">The adjustment considers the punch in time based on a work shift.</p>
              </div>
              <div className="md:col-span-7 space-y-3">
                <input
                  type="number"
                  min="0"
                  value={form.gracePeriodMins}
                  onChange={(e) => setForm({ ...form, gracePeriodMins: e.target.value })}
                  className="w-full px-4 py-2.5 border border-indigo-600 rounded-xl text-sm text-slate-800 bg-white focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm"
                  required
                />
                <div className="flex flex-wrap gap-4 sm:gap-6 mt-2">
                  <div className="flex flex-col items-center gap-1">
                    <span className="px-3 py-0.5 border border-yellow-500 text-yellow-600 rounded-full text-xs font-medium">Early</span>
                    <span className="text-[11px] text-slate-400">Before on time</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="px-3 py-0.5 border border-green-500 text-green-600 rounded-full text-xs font-medium">Regular</span>
                    <span className="text-[11px] text-slate-400">On time to tolerance Late</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="px-3 py-0.5 border border-red-400 text-red-500 rounded-full text-xs font-medium">Late</span>
                    <span className="text-[11px] text-slate-400">After tolerance</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Availability Percentage Row */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8 items-start">
              <div className="md:col-span-5 space-y-1">
                <label className="text-sm font-bold text-slate-800">
                  Work availability definition(Percentage) <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-slate-400">The attendance percentage that defines an employee Good or Bad.</p>
              </div>
              <div className="md:col-span-7 space-y-3">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={form.workAvailabilityPercent}
                  onChange={(e) => setForm({ ...form, workAvailabilityPercent: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 bg-slate-50 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm"
                  required
                />
                <div className="flex flex-wrap gap-6 mt-2 justify-center sm:justify-start">
                  <div className="flex flex-col items-center gap-1">
                    <span className="px-3 py-0.5 border border-green-500 text-green-600 rounded-full text-xs font-medium">Good</span>
                    <span className="text-[11px] text-slate-400">Equal or above of the percent</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="px-3 py-0.5 border border-red-400 text-red-500 rounded-full text-xs font-medium">Bad</span>
                    <span className="text-[11px] text-slate-400">Below the percent</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- SECTION 3: IP Restriction (From Image 2) --- */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-6 border-b pb-3">Ip Restriction</h2>

          <div className="space-y-8">
            {/* IP Validation Modes */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8 items-start">
              <div className="md:col-span-5 space-y-1">
                <label className="text-sm font-bold text-slate-800">Ip Validation</label>
                <p className="text-xs text-slate-400">Restrict or Allow network IP for Punch In</p>
              </div>
              <div className="md:col-span-7 flex flex-wrap items-center gap-5 sm:gap-8">
                {/* Radio Custom Options */}
                {[
                  { value: "allow", label: "Allow IP" },
                  { value: "restrict", label: "Restrict IP" },
                  { value: "none", label: "None" }
                ].map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2 cursor-pointer group">
                    <div className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${form.ipValidationMode === opt.value ? "bg-indigo-600 border-indigo-600" : "border-slate-300 group-hover:border-indigo-400"
                      }`}>
                      {form.ipValidationMode === opt.value && <CheckCircle2 size={14} className="text-white" />}
                    </div>
                    <span className={`text-sm ${form.ipValidationMode === opt.value ? "text-indigo-600 font-medium" : "text-slate-600"}`}>
                      {opt.label}
                    </span>
                    {/* Hidden actual radio for accessibility */}
                    <input
                      type="radio"
                      name="ipMode"
                      value={opt.value}
                      className="hidden"
                      checked={form.ipValidationMode === opt.value}
                      onChange={(e) => setForm({ ...form, ipValidationMode: e.target.value })}
                    />
                  </label>
                ))}
              </div>
            </div>

            {/* Conditionally Render IP Input if Not 'None' */}
            {form.ipValidationMode !== "none" && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8 items-start">
                <div className="md:col-span-5 pt-3">
                  <label className="text-sm font-bold text-slate-800">
                    {form.ipValidationMode === "allow" ? "Allow IP" : "Restrict IP"}
                  </label>
                </div>
                <div className="md:col-span-7">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newIp}
                      onChange={(e) => setNewIp(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddIp())}
                      placeholder="e.g. 192.168.1.1"
                      className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 bg-slate-50 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={handleAddIp}
                      className="h-11 w-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center justify-center transition-all shadow-sm active:scale-95 shrink-0"
                    >
                      <Plus size={20} />
                    </button>
                  </div>

                  {/* Render Added IPs */}
                  {form.ipList.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {form.ipList.map((ip, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg text-sm">
                          <span>{ip}</span>
                          <button type="button" onClick={() => removeIp(ip)} className="text-indigo-400 hover:text-red-500 transition-colors">
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Button Section (Global Form Submit) */}
        <div className="flex justify-end pt-2 pb-6">
          <Button
            type="submit"
            loading={saving}
            className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-semibold text-sm sm:text-base rounded-xl transition-all duration-300 shadow-sm hover:shadow-lg hover:shadow-indigo-500/25 flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={20} />
            <span>Save Settings</span>
          </Button>
        </div>

      </form>
    </div>
  );
}