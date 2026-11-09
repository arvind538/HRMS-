"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Loader2, Save, Building2, CalendarRange, Globe, Clock,
  CalendarDays, Coins, RotateCcw, ChevronDown, Info,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Button from "@/components/ui/Button";

const DEFAULTS = {
  companyName: "",
  payrollCycle: "monthly",
  timezone: "Asia/Kolkata",
  dateFormat: "DD/MM/YYYY",
  timeFormat: "12h",
  currency: "INR",
};

const PAYROLL_OPTIONS = [
  { value: "monthly", label: "Monthly" },
  { value: "bi-weekly", label: "Bi-Weekly" },
];

const TIMEZONE_OPTIONS = [
  { value: "Asia/Kolkata", label: "India Standard Time (IST)" },
  { value: "UTC", label: "Coordinated Universal Time (UTC)" },
];

const TIME_OPTIONS = [
  { value: "12h", label: "12-hour (09:30 PM)" },
  { value: "24h", label: "24-hour (21:30)" },
];

const DATE_OPTIONS = [
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD" },
];

const CURRENCY_OPTIONS = [
  { value: "INR", label: "Indian Rupee (₹)" },
  { value: "USD", label: "US Dollar ($)" },
];

const INPUT =
  "w-full h-11 px-4 border border-slate-200 rounded-xl text-sm sm:text-[15px] text-slate-800 bg-slate-50/60 placeholder:text-slate-400 hover:bg-white hover:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 outline-none transition-all duration-200";

/* Sample preview: fixed date 08 Nov 2026, 9:30 PM */
const previewDate = (fmt) => {
  if (fmt === "MM/DD/YYYY") return "11/08/2026";
  if (fmt === "YYYY-MM-DD") return "2026-11-08";
  return "08/11/2026";
};
const previewTime = (fmt) => (fmt === "24h" ? "21:30" : "09:30 PM");

function Section({ title, description, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="mb-5">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function Field({ icon: Icon, label, htmlFor, children }) {
  return (
    <div className="space-y-2 min-w-0">
      <label htmlFor={htmlFor} className="flex items-center gap-2.5 text-sm font-semibold text-slate-700">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
          <Icon size={16} strokeWidth={2} />
        </span>
        {label}
      </label>
      {children}
    </div>
  );
}

function SelectField({ id, value, onChange, options }) {
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={onChange}
        className={`${INPUT} cursor-pointer appearance-none pr-10`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={16}
        className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"
      />
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      <div className="h-8 w-56 rounded-lg bg-slate-200 animate-pulse" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-44 rounded-2xl bg-slate-100 animate-pulse" />
      ))}
      <div className="flex justify-center pt-4">
        <Loader2 className="animate-spin text-indigo-600 w-6 h-6" />
      </div>
    </div>
  );
}

export default function GeneralSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(DEFAULTS);
  const [saved, setSaved] = useState(DEFAULTS); // last saved values, used for "unsaved changes"

  const dirty = useMemo(
    () => Object.keys(DEFAULTS).some((k) => form[k] !== saved[k]),
    [form, saved]
  );

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/settings");
      const next = {
        companyName: data.company?.name || "",
        payrollCycle: data.payroll?.cycle || DEFAULTS.payrollCycle,
        timezone: data.general?.timezone || DEFAULTS.timezone,
        dateFormat: data.general?.dateFormat || DEFAULTS.dateFormat,
        timeFormat: data.general?.timeFormat || DEFAULTS.timeFormat,
        currency: data.general?.currency || DEFAULTS.currency,
      };
      setForm(next);
      setSaved(next);
    } catch (err) {
      toast.error("Failed to load settings. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  /* Browser tab band karne se pehle warning, agar changes save nahi hue */
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleReset = () => setForm(saved);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      company: { name: form.companyName.trim() },
      payroll: { cycle: form.payrollCycle },
      general: {
        timezone: form.timezone,
        dateFormat: form.dateFormat,
        timeFormat: form.timeFormat,
        currency: form.currency,
      },
    };

    try {
      await api.put("/settings", payload);
      toast.success("General settings updated successfully.");
      const next = { ...form, companyName: form.companyName.trim() };
      setForm(next);
      setSaved(next);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save. Admin access required.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Page header */}
      <header className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">General Settings</h1>
          <p className="mt-1 text-sm text-slate-500">
            Company details, payroll cycle, and display formats used across the HRMS.
          </p>
        </div>
        {dirty && (
          <span className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-medium text-amber-700">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            Unsaved changes
          </span>
        )}
      </header>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Company */}
        <Section title="Company" description="Shown on documents, payslips and ID cards.">
          <Field icon={Building2} label="Company Name" htmlFor="companyName">
            <input
              id="companyName"
              type="text"
              value={form.companyName}
              onChange={set("companyName")}
              className={INPUT}
              placeholder="e.g. Acme Corporation Pvt Ltd"
              required
            />
          </Field>
        </Section>

        {/* Payroll & Regional */}
        <Section title="Payroll & Regional" description="How salaries are processed and which timezone and currency are used.">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Field icon={CalendarRange} label="Payroll Cycle" htmlFor="payrollCycle">
              <SelectField id="payrollCycle" value={form.payrollCycle} onChange={set("payrollCycle")} options={PAYROLL_OPTIONS} />
            </Field>

            <Field icon={Globe} label="System Timezone" htmlFor="timezone">
              <SelectField id="timezone" value={form.timezone} onChange={set("timezone")} options={TIMEZONE_OPTIONS} />
            </Field>

            <Field icon={Coins} label="Default Currency" htmlFor="currency">
              <SelectField id="currency" value={form.currency} onChange={set("currency")} options={CURRENCY_OPTIONS} />
            </Field>
          </div>
        </Section>

        {/* Display formats */}
        <Section title="Display Formats" description="Controls how dates and times appear across the app.">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Field icon={CalendarDays} label="Date Format" htmlFor="dateFormat">
              <SelectField id="dateFormat" value={form.dateFormat} onChange={set("dateFormat")} options={DATE_OPTIONS} />
            </Field>

            <Field icon={Clock} label="Time Format" htmlFor="timeFormat">
              <SelectField id="timeFormat" value={form.timeFormat} onChange={set("timeFormat")} options={TIME_OPTIONS} />
            </Field>
          </div>

          {/* Live preview */}
          <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl bg-slate-50 border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <Info size={14} /> Preview
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-slate-800">
              <span>Date: <strong className="font-semibold">{previewDate(form.dateFormat)}</strong></span>
              <span>Time: <strong className="font-semibold">{previewTime(form.timeFormat)}</strong></span>
            </div>
          </div>
        </Section>

        {/* Sticky action bar */}
        <div className="sticky bottom-0 -mx-4 sm:mx-0 mt-2 border-t sm:border sm:rounded-2xl border-slate-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/80 px-4 sm:px-6 py-4 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-xs text-slate-500 text-center sm:text-left">
            {dirty ? "You have unsaved changes." : "All changes are saved."}
          </p>

          <div className="flex flex-col-reverse sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleReset}
              disabled={!dirty || saving}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              <RotateCcw size={16} />
              Reset
            </button>

            <Button
              type="submit"
              loading={saving}
              disabled={!dirty || saving}
              className="h-11 w-full sm:w-auto px-7 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm sm:text-[15px] font-semibold shadow-sm hover:shadow-lg hover:shadow-indigo-500/25 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              <Save size={18} />
              <span>Save Settings</span>
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}