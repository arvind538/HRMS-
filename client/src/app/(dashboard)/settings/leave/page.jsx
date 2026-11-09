"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  Loader2, Save, X, Search, ChevronDown, CheckCircle2,
  HeartPulse, Coffee, Briefcase
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Button from "@/components/ui/Button";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const STATUS_OPTIONS = [
  "Contract Ended", "Retired", "Resigned", "On Leave",
  "Terminated", "Probation", "Part-Time", "Freelancer",
  "Intern", "Suspended"
];

// Custom Multi-Select Dropdown Component matching the UI requirement
const MultiSelectDropdown = ({ label, options, selected, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt =>
    opt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleOption = (option) => {
    if (selected.includes(option)) {
      onChange(selected.filter(item => item !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  const removeOption = (e, option) => {
    e.stopPropagation();
    onChange(selected.filter(item => item !== option));
  };

  return (
    <div className="space-y-2 relative" ref={dropdownRef}>
      <label className="text-sm font-medium text-slate-700">{label}</label>

      {/* Trigger Box */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="min-h-[46px] w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer flex flex-wrap gap-2 items-center justify-between hover:border-indigo-300 transition-colors focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-600"
      >
        <div className="flex flex-wrap gap-2 flex-1 items-center">
          {selected.length === 0 && (
            <span className="text-slate-400 text-sm px-1">{label}</span>
          )}
          {selected.map((item) => (
            <span
              key={item}
              className="flex items-center gap-1 bg-white border border-indigo-200 text-indigo-700 px-3 py-1 rounded-full text-xs font-medium shadow-sm"
            >
              {item}
              <button
                type="button"
                onClick={(e) => removeOption(e, item)}
                className="text-indigo-400 hover:text-indigo-700 focus:outline-none ml-1"
              >
                <X size={12} strokeWidth={3} />
              </button>
            </span>
          ))}
        </div>
        <ChevronDown size={18} className="text-slate-400 shrink-0" />
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 top-[calc(100%+8px)] left-0 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-3 border-b border-slate-100">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search"
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto p-1 custom-scrollbar">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <div
                  key={opt}
                  onClick={() => toggleOption(opt)}
                  className={`flex items-center justify-between px-4 py-2.5 mx-1 my-0.5 rounded-lg text-sm cursor-pointer transition-colors ${selected.includes(opt)
                    ? "bg-indigo-50/50 text-indigo-700 font-medium"
                    : "text-slate-700 hover:bg-slate-50"
                    }`}
                >
                  {opt}
                  {selected.includes(opt) && <CheckCircle2 size={16} className="text-indigo-500" />}
                </div>
              ))
            ) : (
              <div className="px-4 py-3 text-sm text-slate-500 text-center">No results found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default function LeaveSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // State maps to existing schema + new allowance fields
  const [form, setForm] = useState({
    sickLeaves: 12,
    casualLeaves: 12,
    earnedLeaves: 15,
    leaveStartMonth: "January",
    paidLeaveStatuses: [],
    unpaidLeaveStatuses: []
  });

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/settings");
      const l = data.leave || data.leavePolicy || {};

      setForm({
        sickLeaves: l.sickLeaves ?? 12,
        casualLeaves: l.casualLeaves ?? 12,
        earnedLeaves: l.earnedLeaves ?? 15,
        leaveStartMonth: l.leaveStartMonth || "January",
        paidLeaveStatuses: l.paidLeaveStatuses || [],
        unpaidLeaveStatuses: l.unpaidLeaveStatuses || []
      });
    } catch (err) {
      toast.error("Failed to load leave policy settings.");
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
      const payload = {
        leave: {
          sickLeaves: form.sickLeaves,
          casualLeaves: form.casualLeaves,
          earnedLeaves: form.earnedLeaves,
          leaveStartMonth: form.leaveStartMonth,
          paidLeaveStatuses: form.paidLeaveStatuses,
          unpaidLeaveStatuses: form.unpaidLeaveStatuses
        }
      };

      await api.put("/settings", payload);
      toast.success("Leave settings saved successfully.");
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
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-24">

      <form onSubmit={handleSave} className="space-y-8">

        {/* Section 1: Basic Quotas (Retained for completeness) */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-6 border-b border-slate-100 pb-3">Yearly Quotas</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <HeartPulse size={16} className="text-rose-500" /> Sick Leaves / Year
              </label>
              <input
                type="number"
                min="0"
                value={form.sickLeaves}
                onChange={(e) => setForm({ ...form, sickLeaves: Number(e.target.value) })}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-800 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Coffee size={16} className="text-amber-500" /> Casual Leaves / Year
              </label>
              <input
                type="number"
                min="0"
                value={form.casualLeaves}
                onChange={(e) => setForm({ ...form, casualLeaves: Number(e.target.value) })}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-800 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Briefcase size={16} className="text-indigo-600" /> Earned Leaves / Year
              </label>
              <input
                type="number"
                min="0"
                value={form.earnedLeaves}
                onChange={(e) => setForm({ ...form, earnedLeaves: Number(e.target.value) })}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-800 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all"
                required
              />
            </div>
          </div>
        </div>

        {/* Section 2: Leave Allowance (From UI Specs) */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-6 border-b border-slate-100 pb-3">Leave allowance</h2>

          <div className="space-y-6 max-w-3xl">
            {/* Start Month */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Leave will start from the month of <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={form.leaveStartMonth}
                  onChange={(e) => setForm({ ...form, leaveStartMonth: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 appearance-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all cursor-pointer"
                  required
                >
                  {MONTHS.map(month => (
                    <option key={month} value={month}>{month}</option>
                  ))}
                </select>
                <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Paid Leave Statuses */}
            <MultiSelectDropdown
              label="For paid leave"
              options={STATUS_OPTIONS}
              selected={form.paidLeaveStatuses}
              onChange={(newValues) => setForm({ ...form, paidLeaveStatuses: newValues })}
            />

            {/* Unpaid Leave Statuses */}
            <MultiSelectDropdown
              label="For unpaid leave"
              options={STATUS_OPTIONS}
              selected={form.unpaidLeaveStatuses}
              onChange={(newValues) => setForm({ ...form, unpaidLeaveStatuses: newValues })}
            />
          </div>

          {/* Local Save Button aligned to bottom right inside the card like UI image */}
          <div className="pt-4 flex items-center justify-end">
            <Button
              type="submit"
              loading={saving}
              className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-medium text-sm rounded-xl transition-all shadow-sm hover:shadow flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={18} />
              <span>Save</span>
            </Button>
          </div>
        </div>

      </form>
    </div>
  );
}