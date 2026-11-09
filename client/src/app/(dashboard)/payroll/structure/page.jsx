"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Sliders, Plus, RefreshCw, Layers, Sparkles, Coins, Edit3, Trash2,
  Star, Loader2, X, CheckCircle2, AlertCircle, AlertTriangle, MoreVertical,
  Eye, Wallet, Building2, Check, ArrowUpRight
} from "lucide-react";
import { toast } from "react-toastify";
import api from "@/lib/api";
import { ConfirmDialog, ErrorBanner, FieldError, Label, Sheet, fieldBorder, inputClass, rupee, round2 } from "@/components/payroll/ui";

const EMPTY = { name: "", basicPercent: "50", hraPercent: "20", daPercent: "0", pfPercent: "0", esiPercent: "0", isDefault: false };
const num = (v) => (v === "" || v == null ? 0 : Number(v));

const SEGMENTS = [
  ["basic", "Basic", "bg-indigo-600"],
  ["hra", "HRA", "bg-teal-500"],
  ["da", "DA", "bg-amber-500"],
  ["special", "Special", "bg-rose-500"],
];

const PRESETS = [
  { label: "Standard 50 / 20", name: "Standard", basic: 50, hra: 20, da: 0 },
  { label: "Basic + DA 50", name: "Basic and DA", basic: 40, hra: 20, da: 10 },
  { label: "All Basic", name: "All Basic", basic: 100, hra: 0, da: 0 },
];

const amountsFor = (salary, p) => {
  const basic = round2((salary * p.basic) / 100);
  const hra = round2((salary * p.hra) / 100);
  const da = round2((salary * p.da) / 100);
  const pf = p.pf ? round2((basic * p.pf) / 100) : 0;
  const esi = p.esi ? round2((salary * p.esi) / 100) : 0;
  return {
    basic,
    hra,
    da,
    special: round2(salary - basic - hra - da),
    pf,
    esi,
    net: round2(salary - pf - esi),
  };
};

const adviceFor = (p) => {
  const list = [];
  if (p.basic + p.da < 50) {
    list.push("Basic + DA is below 50% of the salary. Under the Code on Wages the allowances above 50% are added back when wages are counted for PF, gratuity and bonus.");
  }
  if (p.pf > 12) list.push("PF is normally 12% of wages. Please check this rate.");
  if (p.esi > 0.75) list.push("The employee share of ESI is 0.75% of gross. Please check this rate.");
  return list;
};

function PartsBar({ p }) {
  const total = SEGMENTS.reduce((sum, [key]) => sum + Math.max(0, p[key]), 0) || 1;
  return (
    <div className="h-2 w-full rounded-full overflow-hidden flex bg-slate-100 border border-slate-200">
      {SEGMENTS.map(([key, label, color]) =>
        p[key] > 0 ? <div key={key} style={{ width: `${(p[key] / total) * 100}%` }} className={`${color} h-full`} title={`${label}: ${p[key]}%`} /> : null
      )}
    </div>
  );
}

export default function SalaryStructure() {
  const [structures, setStructures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [simSalary, setSimSalary] = useState(50000);

  const [modal, setModal] = useState(null); // create / edit modal
  const [viewItem, setViewItem] = useState(null); // row click detail modal
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [ask, setAsk] = useState(null);
  const [busyId, setBusyId] = useState("");
  const [activeMenuId, setActiveMenuId] = useState(null);

  const menuRef = useRef(null);

  // Close 3-dot dropdown menu on outside click or escape
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setActiveMenuId(null);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setActiveMenuId(null);
        setViewItem(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/payroll/structures");
      const list = Array.isArray(data) ? data : data?.structures || data?.data || [];
      setStructures(list);

      // keep viewItem updated if open
      setViewItem((prev) => (prev ? list.find((s) => s._id === prev._id) || null : null));
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to load the salary structures. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const special = round2(100 - num(form.basicPercent) - num(form.hraPercent) - num(form.daPercent));
  const formPercent = useMemo(
    () => ({ basic: num(form.basicPercent), hra: num(form.hraPercent), da: num(form.daPercent), special: Math.max(0, special), pf: num(form.pfPercent), esi: num(form.esiPercent) }),
    [form, special]
  );
  const formAdvice = useMemo(() => adviceFor(formPercent), [formPercent]);

  const openModal = (item = null) => {
    setActiveMenuId(null);
    setViewItem(null);
    setForm(
      item
        ? {
          name: item.name,
          basicPercent: String(item.basicPercent ?? 0),
          hraPercent: String(item.hraPercent ?? 0),
          daPercent: String(item.daPercent ?? 0),
          pfPercent: String(item.pfPercent ?? 0),
          esiPercent: String(item.esiPercent ?? 0),
          isDefault: Boolean(item.isDefault),
        }
        : { ...EMPTY, isDefault: structures.length === 0 }
    );
    setErrors({});
    setModal({ item });
  };

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const applyPreset = (preset) => {
    setForm((prev) => ({
      ...prev,
      name: prev.name.trim() ? prev.name : preset.name,
      basicPercent: String(preset.basic),
      hraPercent: String(preset.hra),
      daPercent: String(preset.da),
    }));
    setErrors({});
  };

  const save = async (e) => {
    e.preventDefault();
    if (saving) return;

    const next = {};
    const cleanName = form.name.trim();
    if (cleanName.length < 2) next.name = "Please enter a name (at least 2 characters).";
    else if (structures.some((s) => s._id !== modal.item?._id && String(s.name).trim().toLowerCase() === cleanName.toLowerCase())) {
      next.name = "A structure with this name already exists.";
    }
    ["basicPercent", "hraPercent", "daPercent", "pfPercent", "esiPercent"].forEach((key) => {
      const v = num(form[key]);
      if (!Number.isFinite(v) || v < 0 || v > 100) next[key] = "Enter 0 to 100.";
    });
    if (!next.basicPercent && special < 0) next.basicPercent = "Basic + HRA + DA cannot be more than 100%.";
    setErrors(next);
    if (Object.keys(next).length) return;

    const payload = {
      name: cleanName,
      basicPercent: num(form.basicPercent),
      hraPercent: num(form.hraPercent),
      daPercent: num(form.daPercent),
      specialPercent: special,
      pfPercent: num(form.pfPercent),
      esiPercent: num(form.esiPercent),
      isDefault: form.isDefault,
    };

    setSaving(true);
    try {
      if (modal.item) await api.put(`/payroll/structures/${modal.item._id}`, payload);
      else await api.post("/payroll/structures", payload);
      toast.success("Salary structure saved.");
      setModal(null);
      load({ silent: true });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to save the salary structure.");
    } finally {
      setSaving(false);
    }
  };

  const makeDefault = async (item) => {
    setActiveMenuId(null);
    setBusyId(item._id);
    try {
      await api.put(`/payroll/structures/${item._id}`, { isDefault: true });
      toast.success(`"${item.name}" is now the default structure.`);
      await load({ silent: true });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to change the default.");
    } finally {
      setBusyId("");
    }
  };

  const remove = (item) => {
    setActiveMenuId(null);
    setViewItem(null);
    setAsk({
      title: "Delete this salary structure?",
      text: `"${item.name}" will be removed. Payslips that are already generated are not changed.`,
      run: async () => {
        try {
          await api.delete(`/payroll/structures/${item._id}`);
          toast.success("Salary structure deleted.");
          await load({ silent: true });
        } catch (err) {
          toast.error(err?.response?.data?.message || "Unable to delete the salary structure.");
        }
      },
    });
  };

  const pctInput = (key, label, hint) => (
    <div>
      <Label>{label}</Label>
      <input type="number" inputMode="decimal" min="0" max="100" step="any" value={form[key]} onChange={(e) => setField(key, e.target.value)} className={`${inputClass} font-mono ${fieldBorder(errors[key])}`} />
      {hint && !errors[key] && <p className="text-[10px] text-slate-400 mt-1">{hint}</p>}
      <FieldError>{errors[key]}</FieldError>
    </div>
  );

  const previewAmounts = amountsFor(simSalary, formPercent);

  // Values computed for the currently viewed item in the popup
  const viewedPercentages = useMemo(() => {
    if (!viewItem) return null;
    return {
      basic: viewItem.basicPercent || 0,
      hra: viewItem.hraPercent || 0,
      da: viewItem.daPercent || 0,
      special: viewItem.specialPercent || 0,
      pf: viewItem.pfPercent || 0,
      esi: viewItem.esiPercent || 0,
    };
  }, [viewItem]);

  const viewedAmounts = useMemo(() => {
    if (!viewedPercentages) return null;
    return amountsFor(simSalary, viewedPercentages);
  }, [simSalary, viewedPercentages]);

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 py-4 space-y-4 antialiased pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-11 h-11 sm:w-12 sm:h-12 shrink-0 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20">
            <Sliders size={20} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Salary Structure</h1>
              {!loading && !error && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                  {structures.length} {structures.length === 1 ? "template" : "templates"}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Click any row to view complete breakdown & deduction insights.</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <button type="button" onClick={() => load({ silent: true })} disabled={loading || refreshing} className="p-3 sm:p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl transition disabled:opacity-50 cursor-pointer" aria-label="Refresh">
            <RefreshCw size={16} className={loading || refreshing ? "animate-spin text-indigo-600" : ""} />
          </button>
          <button type="button" onClick={() => openModal(null)} className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-3 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-indigo-600/20 transition active:scale-95 cursor-pointer">
            <Plus size={16} /> Create Structure
          </button>
        </div>
      </div>

      {/* Simulator */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Live Simulator
          </span>
          <h3 className="text-base font-bold text-slate-900 mt-1.5">Try a monthly salary</h3>
          <p className="text-xs text-slate-500">See how every structure splits it. Changes in a structure apply to payslips generated from now on.</p>
        </div>
        <label className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-4 py-3 rounded-2xl">
          <Coins className="w-4 h-4 text-indigo-600 shrink-0" />
          <span className="text-xs text-slate-600 font-semibold whitespace-nowrap">Monthly salary ₹</span>
          <input type="number" inputMode="numeric" min="0" step="1000" value={simSalary} onChange={(e) => setSimSalary(Math.max(0, Number(e.target.value) || 0))} className="w-28 bg-transparent text-slate-900 font-bold text-base sm:text-sm outline-none border-b border-slate-300 focus:border-indigo-600 transition-colors" />
        </label>
      </div>

      <ErrorBanner message={error} onRetry={() => load()} />

      {/* Structured Table */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
          <p className="text-xs text-slate-500 font-medium">Loading salary structures...</p>
        </div>
      ) : !error && structures.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm py-16 px-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3 border border-slate-200">
            <Layers className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-slate-800">No salary structure yet</p>
          <p className="text-xs text-slate-500 mt-1">Click &quot;Create Structure&quot; to add the first one. It becomes the default automatically.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm overflow-visible">
          <div className="overflow-x-auto overflow-y-visible">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4 sm:px-6">Structure Name</th>
                  <th className="py-3.5 px-4 min-w-[220px]">Earnings Split (%)</th>
                  <th className="py-3.5 px-4">Deductions</th>
                  <th className="py-3.5 px-4 text-right">Net Take-Home (Est.)</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right w-16">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {structures.map((st) => {
                  const p = { basic: st.basicPercent || 0, hra: st.hraPercent || 0, da: st.daPercent || 0, special: st.specialPercent || 0, pf: st.pfPercent || 0, esi: st.esiPercent || 0 };
                  const a = amountsFor(simSalary, p);
                  const busy = busyId === st._id;
                  const lowBasic = p.basic + p.da < 50;
                  const isMenuOpen = activeMenuId === st._id;

                  return (
                    <tr
                      key={st._id}
                      onClick={() => setViewItem(st)}
                      className={`group transition-all duration-200 cursor-pointer relative select-none ${st.isDefault
                        ? "bg-indigo-50/20 hover:bg-indigo-50/60"
                        : "hover:bg-slate-50/90 hover:shadow-xs"
                        }`}
                    >
                      {/* Name & Indicators */}
                      <td className="py-4 px-4 sm:px-6 align-middle">
                        <div className="flex flex-col gap-1.5">
                          <span className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors flex items-center gap-1.5">
                            {st.name}
                            <ArrowUpRight size={13} className="opacity-0 group-hover:opacity-100 text-indigo-500 transition-opacity" />
                          </span>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {st.isDefault && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                                <Star size={10} className="fill-indigo-500" /> DEFAULT
                              </span>
                            )}
                            <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                              {st.usedBy ? `${st.usedBy} active` : "0 assigned"}
                            </span>
                            {lowBasic && (
                              <span title="Basic + DA is below 50%" className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                                <AlertTriangle size={10} /> &lt;50%
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Percentage breakdown */}
                      <td className="py-4 px-4 align-middle">
                        <div className="space-y-1.5">
                          <PartsBar p={p} />
                          <div className="flex flex-wrap gap-x-2.5 gap-y-0.5 text-[11px]">
                            <span className="text-slate-600">Basic: <strong className="font-mono text-slate-900">{p.basic}%</strong></span>
                            <span className="text-slate-600">HRA: <strong className="font-mono text-slate-900">{p.hra}%</strong></span>
                            {p.da > 0 && <span className="text-slate-600">DA: <strong className="font-mono text-slate-900">{p.da}%</strong></span>}
                            <span className="text-slate-600">Special: <strong className="font-mono text-slate-900">{p.special}%</strong></span>
                          </div>
                        </div>
                      </td>

                      {/* Deductions */}
                      <td className="py-4 px-4 align-middle">
                        <div className="flex flex-col gap-0.5 text-[11px]">
                          <div>PF: <span className="font-mono font-bold text-slate-800">{p.pf}%</span></div>
                          <div>ESI: <span className="font-mono font-bold text-slate-800">{p.esi}%</span></div>
                        </div>
                      </td>

                      {/* Take home */}
                      <td className="py-4 px-4 align-middle text-right font-mono">
                        <div className="font-bold text-emerald-600 text-sm group-hover:scale-105 transition-transform origin-right">
                          {rupee(a.net)}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Gross: {rupee(simSalary)}</div>
                      </td>

                      {/* 3-Dot Action Menu */}
                      <td
                        className="py-4 px-4 sm:px-6 align-middle text-right relative"
                        onClick={(e) => e.stopPropagation()} // Stop row click from opening popup
                      >
                        <div className="relative inline-block text-left" ref={isMenuOpen ? menuRef : null}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(isMenuOpen ? null : st._id);
                            }}
                            className={`p-2 rounded-xl transition cursor-pointer border ${isMenuOpen
                              ? "bg-slate-200/80 text-slate-800 border-slate-300"
                              : "text-slate-400 hover:text-slate-700 hover:bg-slate-100 border-transparent hover:border-slate-200"
                              }`}
                            aria-label="Actions"
                          >
                            {busy ? <Loader2 size={16} className="animate-spin text-indigo-600" /> : <MoreVertical size={16} />}
                          </button>

                          {/* Dropdown Menu */}
                          {isMenuOpen && (
                            <div className="absolute right-0 top-full mt-1.5 w-48 rounded-2xl bg-white border border-slate-200/90 shadow-xl shadow-slate-900/10 z-50 py-1.5 text-left text-xs animate-in fade-in zoom-in-95 duration-100">
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuId(null);
                                  setViewItem(st);
                                }}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-slate-700 hover:bg-slate-50 transition font-medium cursor-pointer"
                              >
                                <Eye size={14} className="text-slate-400" />
                                <span>View Details</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => openModal(st)}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition font-medium cursor-pointer"
                              >
                                <Edit3 size={14} className="text-slate-400 group-hover:text-indigo-600" />
                                <span>Edit Structure</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => makeDefault(st)}
                                disabled={st.isDefault || busy}
                                className="w-full flex items-center justify-between px-3.5 py-2.5 text-slate-700 hover:bg-amber-50 hover:text-amber-700 transition font-medium cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                <span className="flex items-center gap-2.5">
                                  <Star size={14} className={st.isDefault ? "fill-amber-500 text-amber-500" : "text-slate-400"} />
                                  <span>{st.isDefault ? "Default Structure" : "Set as Default"}</span>
                                </span>
                                {st.isDefault && <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />}
                              </button>

                              <div className="my-1 border-t border-slate-100" />

                              <button
                                type="button"
                                onClick={() => remove(st)}
                                disabled={st.usedBy > 0}
                                title={st.usedBy > 0 ? `Assigned to ${st.usedBy} employee(s)` : undefined}
                                className="w-full flex items-center justify-between px-3.5 py-2.5 text-rose-600 hover:bg-rose-50 transition font-medium cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                <span className="flex items-center gap-2.5">
                                  <Trash2 size={14} />
                                  <span>Delete</span>
                                </span>
                                {st.usedBy > 0 && (
                                  <span className="text-[9px] bg-slate-100 text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded-full">
                                    In Use
                                  </span>
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DETAILS VIEW POP-UP MODAL */}
      {viewItem && viewedPercentages && viewedAmounts && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setViewItem(null)}
        >
          <div
            className="w-full max-w-lg bg-white rounded-3xl border border-slate-200/90 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 bg-slate-50/70 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">{viewItem.name}</h3>
                  {viewItem.isDefault && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                      <Star size={10} className="fill-indigo-500" /> DEFAULT
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Assigned to <strong className="text-slate-800">{viewItem.usedBy || 0} employees</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewItem(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
              {/* Visual Breakdown Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>Salary Allocation</span>
                  <span className="font-mono text-slate-500 text-[11px]">100% Total Gross</span>
                </div>
                <PartsBar p={viewedPercentages} />
              </div>

              {/* Earnings Split Section */}
              <div className="bg-slate-50/80 rounded-2xl border border-slate-200/80 p-4 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800 border-b border-slate-200 pb-2">
                  <span className="flex items-center gap-2">
                    <Building2 size={14} className="text-indigo-600" /> Earnings Component
                  </span>
                  <span>Monthly (₹{simSalary.toLocaleString("en-IN")})</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Basic Salary ({viewedPercentages.basic}%)</span>
                    <strong className="font-mono text-slate-900">{rupee(viewedAmounts.basic)}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">House Rent Allowance (HRA) ({viewedPercentages.hra}%)</span>
                    <strong className="font-mono text-slate-900">{rupee(viewedAmounts.hra)}</strong>
                  </div>
                  {viewedPercentages.da > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Dearness Allowance (DA) ({viewedPercentages.da}%)</span>
                      <strong className="font-mono text-slate-900">{rupee(viewedAmounts.da)}</strong>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Special Allowance ({viewedPercentages.special}%)</span>
                    <strong className="font-mono text-slate-900">{rupee(viewedAmounts.special)}</strong>
                  </div>
                </div>
              </div>

              {/* Deductions Section */}
              <div className="bg-rose-50/40 rounded-2xl border border-rose-100 p-4 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-rose-900 border-b border-rose-200/60 pb-2">
                  <span className="flex items-center gap-2">
                    <Wallet size={14} className="text-rose-600" /> Statutory Deductions
                  </span>
                  <span>Amount Deducted</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Provident Fund (PF) {viewedPercentages.pf > 0 ? `(${viewedPercentages.pf}% of Basic)` : "(Not Opted)"}</span>
                    <strong className="font-mono text-rose-600">
                      {viewedAmounts.pf > 0 ? `- ${rupee(viewedAmounts.pf)}` : "₹0.00"}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Employee State Insurance (ESI) {viewedPercentages.esi > 0 ? `(${viewedPercentages.esi}% of Gross)` : "(Not Opted)"}</span>
                    <strong className="font-mono text-rose-600">
                      {viewedAmounts.esi > 0 ? `- ${rupee(viewedAmounts.esi)}` : "₹0.00"}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Net Take-Home Card */}
              <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-emerald-900 block">Estimated Net Take-Home</span>
                  <span className="text-[11px] text-emerald-700">Gross minus PF & ESI contributions</span>
                </div>
                <div className="text-right font-mono">
                  <span className="text-lg font-extrabold text-emerald-700">{rupee(viewedAmounts.net)}</span>
                  <span className="text-[10px] text-emerald-600 block">per month</span>
                </div>
              </div>

              {/* Statutory Advice note if basic+da < 50 */}
              {viewedPercentages.basic + viewedPercentages.da < 50 && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 flex items-start gap-2 text-[11px] text-amber-800">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-600" />
                  <span>Basic + DA is under 50%. Under the Code on Wages, excess allowances will be counted toward gratuity & bonus.</span>
                </div>
              )}
            </div>

            {/* Footer with Quick Action buttons */}
            <div className="border-t border-slate-100 bg-white p-4 px-6 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  const target = viewItem;
                  setViewItem(null);
                  openModal(target);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                <Edit3 size={13} /> Edit Template
              </button>

              {!viewItem.isDefault && (
                <button
                  type="button"
                  onClick={() => makeDefault(viewItem)}
                  disabled={busyId === viewItem._id}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition cursor-pointer"
                >
                  <Star size={13} /> Make Default
                </button>
              )}

              <button
                type="button"
                onClick={() => setViewItem(null)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT MODAL SHEET */}
      {modal && (
        <Sheet onClose={() => setModal(null)} locked={saving} size="max-w-lg">
          <form onSubmit={save} noValidate className="flex flex-col min-h-0 flex-1">
            <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/70">
              <div className="min-w-0">
                <h3 className="text-base font-bold text-slate-900">{modal.item ? "Edit Salary Structure" : "New Salary Structure"}</h3>
                <p className="text-xs text-slate-400">Special Allowance takes whatever is left of 100%.</p>
              </div>
              <button type="button" onClick={() => !saving && setModal(null)} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer" aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6 space-y-4">
              {!modal.item && (
                <div>
                  <Label>Quick start</Label>
                  <div className="flex flex-wrap gap-2">
                    {PRESETS.map((pr) => (
                      <button key={pr.label} type="button" onClick={() => applyPreset(pr)} className="px-3 py-1.5 rounded-full border border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 text-[11px] font-bold text-slate-600 transition cursor-pointer">
                        {pr.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label>Template Name</Label>
                <input value={form.name} maxLength={60} onChange={(e) => setField("name", e.target.value)} placeholder="e.g. Standard (Grade A)" className={`${inputClass} ${fieldBorder(errors.name)}`} />
                <FieldError>{errors.name}</FieldError>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {pctInput("basicPercent", "Basic %", "of the monthly salary")}
                {pctInput("hraPercent", "HRA %", "of the monthly salary")}
                {pctInput("daPercent", "Dearness Allowance %", "optional")}
                <div>
                  <Label>Special Allowance %</Label>
                  <div className={`${inputClass} font-mono border-slate-200 ${special < 0 ? "text-rose-600" : "text-slate-700"} bg-slate-100`}>{special}</div>
                  <p className="text-[10px] text-slate-400 mt-1">calculated automatically</p>
                </div>
              </div>

              <div className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs font-bold ${special >= 0 ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800"}`}>
                <span className="flex items-center gap-2">{special >= 0 ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />} Total</span>
                <span className="font-mono">{special >= 0 ? "100% (balanced)" : `${round2(100 - special)}% (more than 100%)`}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {pctInput("pfPercent", "PF % (of Basic)", "0 = not applied")}
                {pctInput("esiPercent", "ESI % (of Gross)", "0 = not applied")}
              </div>

              {formAdvice.length > 0 && (
                <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3.5 space-y-1.5">
                  {formAdvice.map((text) => (
                    <p key={text} className="flex items-start gap-2 text-[11px] font-medium text-amber-800">
                      <AlertTriangle size={13} className="shrink-0 mt-0.5" /> {text}
                    </p>
                  ))}
                </div>
              )}
              <p className="text-[11px] text-slate-400 -mt-1">Please confirm the PF and ESI rates and limits with your CA.</p>

              <button type="button" role="switch" aria-checked={form.isDefault} onClick={() => setField("isDefault", !form.isDefault)} className="w-full flex items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200 hover:border-indigo-300 transition cursor-pointer text-left">
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-sm font-bold text-slate-800"><Star size={14} className="text-indigo-500" /> Use as the default</span>
                  <span className="block text-[11px] text-slate-400 mt-0.5">Employees without their own structure get this one.</span>
                </span>
                <span className={`relative w-11 h-6 shrink-0 rounded-full transition-colors ${form.isDefault ? "bg-indigo-600" : "bg-slate-300"}`}>
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${form.isDefault ? "translate-x-5" : ""}`} />
                </span>
              </button>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Preview for ₹{simSalary.toLocaleString("en-IN")} per month</p>
                <PartsBar p={formPercent} />
                <div className="space-y-1.5 text-xs">
                  {[["Basic", previewAmounts.basic], ["HRA", previewAmounts.hra], ...(formPercent.da > 0 ? [["DA", previewAmounts.da]] : []), ["Special", previewAmounts.special]].map(([label, amount]) => (
                    <div key={label} className="flex justify-between"><span className="text-slate-600">{label}</span><span className="font-mono font-bold text-slate-900">{rupee(amount)}</span></div>
                  ))}
                  {(previewAmounts.pf > 0 || previewAmounts.esi > 0) && (
                    <div className="pt-1.5 mt-1.5 border-t border-slate-200 space-y-1.5">
                      {previewAmounts.pf > 0 && <div className="flex justify-between"><span className="text-slate-600">PF</span><span className="font-mono font-bold text-rose-600">- {rupee(previewAmounts.pf)}</span></div>}
                      {previewAmounts.esi > 0 && <div className="flex justify-between"><span className="text-slate-600">ESI</span><span className="font-mono font-bold text-rose-600">- {rupee(previewAmounts.esi)}</span></div>}
                      <div className="flex justify-between pt-1.5 border-t border-dashed border-slate-300"><span className="font-bold text-slate-700">Take-home (estimate)</span><span className="font-mono font-extrabold text-emerald-600">{rupee(previewAmounts.net)}</span></div>
                    </div>
                  )}
                </div>
                {formPercent.esi > 0 && simSalary > 21000 && (
                  <p className="text-[10px] text-slate-400">ESI normally applies only while the monthly gross is up to ₹21,000. Check how your payroll applies this limit.</p>
                )}
              </div>
            </div>

            <div className="shrink-0 border-t border-slate-100 bg-white px-5 sm:px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
              <button type="button" onClick={() => setModal(null)} disabled={saving} className="px-5 py-3 sm:py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50">Cancel</button>
              <button type="submit" disabled={saving || special < 0} className="inline-flex items-center justify-center gap-2 px-6 py-3 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed">
                {saving && <Loader2 size={14} className="animate-spin" />}
                {saving ? "Saving..." : "Save Structure"}
              </button>
            </div>
          </form>
        </Sheet>
      )}

      {ask && <ConfirmDialog title={ask.title} text={ask.text} label="Delete" danger onConfirm={ask.run} onClose={() => setAsk(null)} />}
    </div>
  );
}





// "use client";

// import { useCallback, useEffect, useMemo, useState } from "react";
// import { Sliders, Plus, RefreshCw, Layers, Sparkles, Coins, Edit3, Trash2, Star, Loader2, X, CheckCircle2, AlertCircle, AlertTriangle } from "lucide-react";
// import { toast } from "react-toastify";
// import api from "@/lib/api";
// import { ConfirmDialog, ErrorBanner, FieldError, Label, Sheet, fieldBorder, inputClass, rupee, round2 } from "@/components/payroll/ui";

// const EMPTY = { name: "", basicPercent: "50", hraPercent: "20", daPercent: "0", pfPercent: "0", esiPercent: "0", isDefault: false };
// const num = (v) => (v === "" || v == null ? 0 : Number(v));

// const SEGMENTS = [
//   ["basic", "Basic", "bg-indigo-600"],
//   ["hra", "HRA", "bg-teal-500"],
//   ["da", "DA", "bg-amber-500"],
//   ["special", "Special", "bg-rose-500"],
// ];

// /* quick starting points (only Basic, HRA and DA are filled; PF and ESI stay as they are) */
// const PRESETS = [
//   { label: "Standard 50 / 20", name: "Standard", basic: 50, hra: 20, da: 0 },
//   { label: "Basic + DA 50", name: "Basic and DA", basic: 40, hra: 20, da: 10 },
//   { label: "All Basic", name: "All Basic", basic: 100, hra: 0, da: 0 },
// ];

// /* Amounts for one monthly salary (the same split the server makes for a payslip) */
// const amountsFor = (salary, p) => {
//   const basic = round2((salary * p.basic) / 100);
//   const hra = round2((salary * p.hra) / 100);
//   const da = round2((salary * p.da) / 100);
//   const pf = p.pf ? round2((basic * p.pf) / 100) : 0;
//   const esi = p.esi ? round2((salary * p.esi) / 100) : 0;
//   return {
//     basic,
//     hra,
//     da,
//     special: round2(salary - basic - hra - da),
//     pf,
//     esi,
//     net: round2(salary - pf - esi),
//   };
// };

// /* Soft hints. They never stop a save. Please confirm the rates and limits with your CA. */
// const adviceFor = (p) => {
//   const list = [];
//   if (p.basic + p.da < 50) {
//     list.push("Basic + DA is below 50% of the salary. Under the Code on Wages the allowances above 50% are added back when wages are counted for PF, gratuity and bonus.");
//   }
//   if (p.pf > 12) list.push("PF is normally 12% of wages. Please check this rate.");
//   if (p.esi > 0.75) list.push("The employee share of ESI is 0.75% of gross. Please check this rate.");
//   return list;
// };

// /* stacked bar of the salary parts (it also works when the parts add up to more than 100) */
// function PartsBar({ p }) {
//   const total = SEGMENTS.reduce((sum, [key]) => sum + Math.max(0, p[key]), 0) || 1;
//   return (
//     <div className="h-2.5 w-full rounded-full overflow-hidden flex bg-slate-100 border border-slate-200">
//       {SEGMENTS.map(([key, label, color]) =>
//         p[key] > 0 ? <div key={key} style={{ width: `${(p[key] / total) * 100}%` }} className={`${color} h-full`} title={`${label}: ${p[key]}%`} /> : null
//       )}
//     </div>
//   );
// }

// export default function SalaryStructure() {
//   const [structures, setStructures] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [error, setError] = useState("");
//   const [simSalary, setSimSalary] = useState(50000);

//   const [modal, setModal] = useState(null); // { item } (item is null for a new one)
//   const [form, setForm] = useState(EMPTY);
//   const [errors, setErrors] = useState({});
//   const [saving, setSaving] = useState(false);
//   const [ask, setAsk] = useState(null);
//   const [busyId, setBusyId] = useState("");

//   const load = useCallback(async ({ silent = false } = {}) => {
//     if (silent) setRefreshing(true);
//     else setLoading(true);
//     setError("");
//     try {
//       const { data } = await api.get("/payroll/structures");
//       setStructures(Array.isArray(data) ? data : data?.structures || data?.data || []);
//     } catch (err) {
//       setError(err?.response?.data?.message || "Unable to load the salary structures. Please try again.");
//     } finally {
//       setLoading(false);
//       setRefreshing(false);
//     }
//   }, []);

//   useEffect(() => {
//     load();
//   }, [load]);

//   const special = round2(100 - num(form.basicPercent) - num(form.hraPercent) - num(form.daPercent));
//   const formPercent = useMemo(
//     () => ({ basic: num(form.basicPercent), hra: num(form.hraPercent), da: num(form.daPercent), special: Math.max(0, special), pf: num(form.pfPercent), esi: num(form.esiPercent) }),
//     [form, special]
//   );
//   const formAdvice = useMemo(() => adviceFor(formPercent), [formPercent]);

//   const openModal = (item = null) => {
//     setForm(
//       item
//         ? {
//           name: item.name,
//           basicPercent: String(item.basicPercent ?? 0),
//           hraPercent: String(item.hraPercent ?? 0),
//           daPercent: String(item.daPercent ?? 0),
//           pfPercent: String(item.pfPercent ?? 0),
//           esiPercent: String(item.esiPercent ?? 0),
//           isDefault: Boolean(item.isDefault),
//         }
//         : { ...EMPTY, isDefault: structures.length === 0 }
//     );
//     setErrors({});
//     setModal({ item });
//   };

//   const setField = (key, value) => {
//     setForm((prev) => ({ ...prev, [key]: value }));
//     setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
//   };

//   const applyPreset = (preset) => {
//     setForm((prev) => ({
//       ...prev,
//       name: prev.name.trim() ? prev.name : preset.name,
//       basicPercent: String(preset.basic),
//       hraPercent: String(preset.hra),
//       daPercent: String(preset.da),
//     }));
//     setErrors({});
//   };

//   const save = async (e) => {
//     e.preventDefault();
//     if (saving) return;

//     const next = {};
//     const cleanName = form.name.trim();
//     if (cleanName.length < 2) next.name = "Please enter a name (at least 2 characters).";
//     else if (structures.some((s) => s._id !== modal.item?._id && String(s.name).trim().toLowerCase() === cleanName.toLowerCase())) {
//       next.name = "A structure with this name already exists.";
//     }
//     ["basicPercent", "hraPercent", "daPercent", "pfPercent", "esiPercent"].forEach((key) => {
//       const v = num(form[key]);
//       if (!Number.isFinite(v) || v < 0 || v > 100) next[key] = "Enter 0 to 100.";
//     });
//     if (!next.basicPercent && special < 0) next.basicPercent = "Basic + HRA + DA cannot be more than 100%.";
//     setErrors(next);
//     if (Object.keys(next).length) return;

//     const payload = {
//       name: cleanName,
//       basicPercent: num(form.basicPercent),
//       hraPercent: num(form.hraPercent),
//       daPercent: num(form.daPercent),
//       specialPercent: special,
//       pfPercent: num(form.pfPercent),
//       esiPercent: num(form.esiPercent),
//       isDefault: form.isDefault,
//     };

//     setSaving(true);
//     try {
//       if (modal.item) await api.put(`/payroll/structures/${modal.item._id}`, payload);
//       else await api.post("/payroll/structures", payload);
//       toast.success("Salary structure saved.");
//       setModal(null);
//       load({ silent: true });
//     } catch (err) {
//       toast.error(err?.response?.data?.message || "Unable to save the salary structure.");
//     } finally {
//       setSaving(false);
//     }
//   };

//   const makeDefault = async (item) => {
//     setBusyId(item._id);
//     try {
//       await api.put(`/payroll/structures/${item._id}`, { isDefault: true });
//       toast.success(`"${item.name}" is now the default structure.`);
//       await load({ silent: true });
//     } catch (err) {
//       toast.error(err?.response?.data?.message || "Unable to change the default.");
//     } finally {
//       setBusyId("");
//     }
//   };

//   const remove = (item) =>
//     setAsk({
//       title: "Delete this salary structure?",
//       text: `"${item.name}" will be removed. Payslips that are already generated are not changed.`,
//       run: async () => {
//         try {
//           await api.delete(`/payroll/structures/${item._id}`);
//           toast.success("Salary structure deleted.");
//           await load({ silent: true });
//         } catch (err) {
//           toast.error(err?.response?.data?.message || "Unable to delete the salary structure.");
//         }
//       },
//     });

//   const pctInput = (key, label, hint) => (
//     <div>
//       <Label>{label}</Label>
//       <input type="number" inputMode="decimal" min="0" max="100" step="any" value={form[key]} onChange={(e) => setField(key, e.target.value)} className={`${inputClass} font-mono ${fieldBorder(errors[key])}`} />
//       {hint && !errors[key] && <p className="text-[10px] text-slate-400 mt-1">{hint}</p>}
//       <FieldError>{errors[key]}</FieldError>
//     </div>
//   );

//   const previewAmounts = amountsFor(simSalary, formPercent);

//   return (
//     <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 py-4 space-y-4 antialiased pb-16">
//       {/* Header */}
//       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm">
//         <div className="flex items-center gap-3.5 min-w-0">
//           <div className="w-11 h-11 sm:w-12 sm:h-12 shrink-0 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20">
//             <Sliders size={20} />
//           </div>
//           <div className="min-w-0">
//             <div className="flex flex-wrap items-center gap-2">
//               <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Salary Structure</h1>
//               {!loading && !error && <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">{structures.length} {structures.length === 1 ? "template" : "templates"}</span>}
//             </div>
//             <p className="text-xs sm:text-sm text-slate-500 mt-0.5">How one monthly salary is split into Basic, HRA, DA and Special Allowance.</p>
//           </div>
//         </div>
//         <div className="flex items-center gap-2.5">
//           <button type="button" onClick={() => load({ silent: true })} disabled={loading || refreshing} className="p-3 sm:p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl transition disabled:opacity-50 cursor-pointer" aria-label="Refresh">
//             <RefreshCw size={16} className={loading || refreshing ? "animate-spin text-indigo-600" : ""} />
//           </button>
//           <button type="button" onClick={() => openModal(null)} className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-3 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-indigo-600/20 transition active:scale-95 cursor-pointer">
//             <Plus size={16} /> Create Structure
//           </button>
//         </div>
//       </div>

//       {/* Simulator */}
//       <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
//         <div className="min-w-0">
//           <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
//             <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Live Simulator
//           </span>
//           <h3 className="text-base font-bold text-slate-900 mt-1.5">Try a monthly salary</h3>
//           <p className="text-xs text-slate-500">See how every structure splits it. Changes in a structure apply to payslips generated from now on.</p>
//         </div>
//         <label className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-4 py-3 rounded-2xl">
//           <Coins className="w-4 h-4 text-indigo-600 shrink-0" />
//           <span className="text-xs text-slate-600 font-semibold whitespace-nowrap">Monthly salary ₹</span>
//           <input type="number" inputMode="numeric" min="0" step="1000" value={simSalary} onChange={(e) => setSimSalary(Math.max(0, Number(e.target.value) || 0))} className="w-28 bg-transparent text-slate-900 font-bold text-base sm:text-sm outline-none border-b border-slate-300 focus:border-indigo-600 transition-colors" />
//         </label>
//       </div>

//       <ErrorBanner message={error} onRetry={() => load()} />

//       {/* Cards */}
//       {loading ? (
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//           {[0, 1, 2].map((n) => (
//             <div key={n} className="h-72 rounded-3xl bg-white border border-slate-200/80 animate-pulse" />
//           ))}
//         </div>
//       ) : !error && structures.length === 0 ? (
//         <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm py-16 px-4 text-center">
//           <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3 border border-slate-200">
//             <Layers className="w-6 h-6" />
//           </div>
//           <p className="text-sm font-bold text-slate-800">No salary structure yet</p>
//           <p className="text-xs text-slate-500 mt-1">Click &quot;Create Structure&quot; to add the first one. It becomes the default automatically.</p>
//         </div>
//       ) : (
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//           {structures.map((st) => {
//             const p = { basic: st.basicPercent || 0, hra: st.hraPercent || 0, da: st.daPercent || 0, special: st.specialPercent || 0, pf: st.pfPercent || 0, esi: st.esiPercent || 0 };
//             const a = amountsFor(simSalary, p);
//             const busy = busyId === st._id;
//             const lowBasic = p.basic + p.da < 50;
//             return (
//               <div key={st._id} className={`min-w-0 bg-white p-4 sm:p-5 rounded-3xl border shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 flex flex-col gap-4 ${st.isDefault ? "border-indigo-300 ring-2 ring-indigo-500/10" : "border-slate-200/80 hover:border-indigo-200"}`}>
//                 <div className="min-w-0">
//                   <h3 className="font-bold text-slate-900 text-base break-words">{st.name}</h3>
//                   <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
//                     {st.isDefault && <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full"><Star size={10} className="fill-indigo-500" /> DEFAULT</span>}
//                     <span className="text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
//                       {st.usedBy ? `${st.usedBy} employee${st.usedBy === 1 ? "" : "s"}` : "Not assigned"}
//                     </span>
//                     {lowBasic && (
//                       <span title="Basic + DA is below 50% of the salary" className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
//                         <AlertTriangle size={10} /> Basic + DA below 50%
//                       </span>
//                     )}
//                   </div>
//                 </div>

//                 <PartsBar p={p} />

//                 <div className="bg-slate-50/80 rounded-2xl border border-slate-200/80 p-3.5 space-y-2 text-xs">
//                   {SEGMENTS.map(([key, label, color]) =>
//                     p[key] > 0 || key === "basic" ? (
//                       <div key={key} className="flex items-center justify-between text-slate-700">
//                         <span className="flex items-center gap-2"><span className={`w-2.5 h-2.5 rounded-full ${color}`} /> {label} ({p[key]}%)</span>
//                         <strong className="font-mono text-slate-900">{rupee(a[key])}</strong>
//                       </div>
//                     ) : null
//                   )}
//                   {(p.pf > 0 || p.esi > 0) && (
//                     <div className="pt-2 mt-1 border-t border-slate-200 space-y-2">
//                       {p.pf > 0 && <div className="flex justify-between text-slate-700"><span>PF ({p.pf}% of Basic)</span><strong className="font-mono text-rose-600">- {rupee(a.pf)}</strong></div>}
//                       {p.esi > 0 && <div className="flex justify-between text-slate-700"><span>ESI ({p.esi}% of Gross)</span><strong className="font-mono text-rose-600">- {rupee(a.esi)}</strong></div>}
//                       <div className="flex justify-between pt-2 border-t border-dashed border-slate-300 text-slate-700"><span className="font-bold">Take-home (estimate)</span><strong className="font-mono text-emerald-600">{rupee(a.net)}</strong></div>
//                     </div>
//                   )}
//                 </div>

//                 <div className="mt-auto grid grid-cols-3 gap-2">
//                   <button type="button" onClick={() => openModal(st)} className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-xs font-bold transition cursor-pointer">
//                     <Edit3 size={13} /> Edit
//                   </button>
//                   <button type="button" onClick={() => makeDefault(st)} disabled={st.isDefault || busy} className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-amber-50 hover:text-amber-700 text-slate-700 text-xs font-bold transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
//                     {busy ? <Loader2 size={13} className="animate-spin" /> : <Star size={13} />} Default
//                   </button>
//                   <button type="button" onClick={() => remove(st)} disabled={st.usedBy > 0} title={st.usedBy > 0 ? `Assigned to ${st.usedBy} employee(s). Assign them another structure first.` : "Delete"} className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-rose-50 hover:text-rose-600 text-slate-700 text-xs font-bold transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
//                     <Trash2 size={13} /> Delete
//                   </button>
//                 </div>
//               </div>
//             );
//           })}
//         </div>
//       )}

//       {/* Create or edit */}
//       {modal && (
//         <Sheet onClose={() => setModal(null)} locked={saving} size="max-w-lg">
//           <form onSubmit={save} noValidate className="flex flex-col min-h-0 flex-1">
//             <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/70">
//               <div className="min-w-0">
//                 <h3 className="text-base font-bold text-slate-900">{modal.item ? "Edit Salary Structure" : "New Salary Structure"}</h3>
//                 <p className="text-xs text-slate-400">Special Allowance takes whatever is left of 100%.</p>
//               </div>
//               <button type="button" onClick={() => !saving && setModal(null)} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer" aria-label="Close">
//                 <X size={18} />
//               </button>
//             </div>

//             <div className="flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6 space-y-4">
//               {!modal.item && (
//                 <div>
//                   <Label>Quick start</Label>
//                   <div className="flex flex-wrap gap-2">
//                     {PRESETS.map((pr) => (
//                       <button key={pr.label} type="button" onClick={() => applyPreset(pr)} className="px-3 py-1.5 rounded-full border border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 text-[11px] font-bold text-slate-600 transition cursor-pointer">
//                         {pr.label}
//                       </button>
//                     ))}
//                   </div>
//                 </div>
//               )}

//               <div>
//                 <Label>Template Name</Label>
//                 <input value={form.name} maxLength={60} onChange={(e) => setField("name", e.target.value)} placeholder="e.g. Standard (Grade A)" className={`${inputClass} ${fieldBorder(errors.name)}`} />
//                 <FieldError>{errors.name}</FieldError>
//               </div>

//               <div className="grid grid-cols-2 gap-3">
//                 {pctInput("basicPercent", "Basic %", "of the monthly salary")}
//                 {pctInput("hraPercent", "HRA %", "of the monthly salary")}
//                 {pctInput("daPercent", "Dearness Allowance %", "optional")}
//                 <div>
//                   <Label>Special Allowance %</Label>
//                   <div className={`${inputClass} font-mono border-slate-200 ${special < 0 ? "text-rose-600" : "text-slate-700"} bg-slate-100`}>{special}</div>
//                   <p className="text-[10px] text-slate-400 mt-1">calculated automatically</p>
//                 </div>
//               </div>

//               <div className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs font-bold ${special >= 0 ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800"}`}>
//                 <span className="flex items-center gap-2">{special >= 0 ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />} Total</span>
//                 <span className="font-mono">{special >= 0 ? "100% (balanced)" : `${round2(100 - special)}% (more than 100%)`}</span>
//               </div>

//               <div className="grid grid-cols-2 gap-3">
//                 {pctInput("pfPercent", "PF % (of Basic)", "0 = not applied")}
//                 {pctInput("esiPercent", "ESI % (of Gross)", "0 = not applied")}
//               </div>

//               {formAdvice.length > 0 && (
//                 <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3.5 space-y-1.5">
//                   {formAdvice.map((text) => (
//                     <p key={text} className="flex items-start gap-2 text-[11px] font-medium text-amber-800">
//                       <AlertTriangle size={13} className="shrink-0 mt-0.5" /> {text}
//                     </p>
//                   ))}
//                 </div>
//               )}
//               <p className="text-[11px] text-slate-400 -mt-1">Please confirm the PF and ESI rates and limits with your CA.</p>

//               <button type="button" role="switch" aria-checked={form.isDefault} onClick={() => setField("isDefault", !form.isDefault)} className="w-full flex items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200 hover:border-indigo-300 transition cursor-pointer text-left">
//                 <span className="min-w-0">
//                   <span className="flex items-center gap-2 text-sm font-bold text-slate-800"><Star size={14} className="text-indigo-500" /> Use as the default</span>
//                   <span className="block text-[11px] text-slate-400 mt-0.5">Employees without their own structure get this one.</span>
//                 </span>
//                 <span className={`relative w-11 h-6 shrink-0 rounded-full transition-colors ${form.isDefault ? "bg-indigo-600" : "bg-slate-300"}`}>
//                   <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${form.isDefault ? "translate-x-5" : ""}`} />
//                 </span>
//               </button>

//               <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
//                 <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Preview for ₹{simSalary.toLocaleString("en-IN")} per month</p>
//                 <PartsBar p={formPercent} />
//                 <div className="space-y-1.5 text-xs">
//                   {[["Basic", previewAmounts.basic], ["HRA", previewAmounts.hra], ...(formPercent.da > 0 ? [["DA", previewAmounts.da]] : []), ["Special", previewAmounts.special]].map(([label, amount]) => (
//                     <div key={label} className="flex justify-between"><span className="text-slate-600">{label}</span><span className="font-mono font-bold text-slate-900">{rupee(amount)}</span></div>
//                   ))}
//                   {(previewAmounts.pf > 0 || previewAmounts.esi > 0) && (
//                     <div className="pt-1.5 mt-1.5 border-t border-slate-200 space-y-1.5">
//                       {previewAmounts.pf > 0 && <div className="flex justify-between"><span className="text-slate-600">PF</span><span className="font-mono font-bold text-rose-600">- {rupee(previewAmounts.pf)}</span></div>}
//                       {previewAmounts.esi > 0 && <div className="flex justify-between"><span className="text-slate-600">ESI</span><span className="font-mono font-bold text-rose-600">- {rupee(previewAmounts.esi)}</span></div>}
//                       <div className="flex justify-between pt-1.5 border-t border-dashed border-slate-300"><span className="font-bold text-slate-700">Take-home (estimate)</span><span className="font-mono font-extrabold text-emerald-600">{rupee(previewAmounts.net)}</span></div>
//                     </div>
//                   )}
//                 </div>
//                 {formPercent.esi > 0 && simSalary > 21000 && (
//                   <p className="text-[10px] text-slate-400">ESI normally applies only while the monthly gross is up to ₹21,000. Check how your payroll applies this limit.</p>
//                 )}
//               </div>
//             </div>

//             <div className="shrink-0 border-t border-slate-100 bg-white px-5 sm:px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
//               <button type="button" onClick={() => setModal(null)} disabled={saving} className="px-5 py-3 sm:py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50">Cancel</button>
//               <button type="submit" disabled={saving || special < 0} className="inline-flex items-center justify-center gap-2 px-6 py-3 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed">
//                 {saving && <Loader2 size={14} className="animate-spin" />}
//                 {saving ? "Saving..." : "Save Structure"}
//               </button>
//             </div>
//           </form>
//         </Sheet>
//       )}

//       {ask && <ConfirmDialog title={ask.title} text={ask.text} label="Delete" danger onConfirm={ask.run} onClose={() => setAsk(null)} />}
//     </div>
//   );
// }







// "use client";

// import { useCallback, useEffect, useMemo, useState } from "react";
// import { Sliders, Plus, RefreshCw, Layers, Sparkles, Coins, Edit3, Trash2, Star, Loader2, X, CheckCircle2, AlertCircle } from "lucide-react";
// import { toast } from "react-toastify";
// import api from "@/lib/api";
// import { ConfirmDialog, ErrorBanner, FieldError, Label, Sheet, fieldBorder, inputClass, rupee, round2 } from "@/components/payroll/ui";

// const EMPTY = { name: "", basicPercent: "50", hraPercent: "20", daPercent: "0", pfPercent: "0", esiPercent: "0", isDefault: false };
// const num = (v) => (v === "" || v == null ? 0 : Number(v));

// const SEGMENTS = [
//   ["basic", "Basic", "bg-indigo-600"],
//   ["hra", "HRA", "bg-teal-500"],
//   ["da", "DA", "bg-amber-500"],
//   ["special", "Special", "bg-rose-500"],
// ];

// /* Amounts for one monthly salary */
// const amountsFor = (salary, p) => {
//   const basic = round2((salary * p.basic) / 100);
//   const hra = round2((salary * p.hra) / 100);
//   const da = round2((salary * p.da) / 100);
//   return {
//     basic,
//     hra,
//     da,
//     special: round2(salary - basic - hra - da),
//     pf: p.pf ? round2((basic * p.pf) / 100) : 0,
//     esi: p.esi ? round2((salary * p.esi) / 100) : 0,
//   };
// };

// export default function SalaryStructure() {
//   const [structures, setStructures] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [error, setError] = useState("");
//   const [simSalary, setSimSalary] = useState(50000);

//   const [modal, setModal] = useState(null); // { item } (item is null for a new one)
//   const [form, setForm] = useState(EMPTY);
//   const [errors, setErrors] = useState({});
//   const [saving, setSaving] = useState(false);
//   const [ask, setAsk] = useState(null);
//   const [busyId, setBusyId] = useState("");

//   const load = useCallback(async ({ silent = false } = {}) => {
//     if (silent) setRefreshing(true);
//     else setLoading(true);
//     setError("");
//     try {
//       const { data } = await api.get("/payroll/structures");
//       setStructures(Array.isArray(data) ? data : []);
//     } catch (err) {
//       setError(err?.response?.data?.message || "Unable to load the salary structures. Please try again.");
//     } finally {
//       setLoading(false);
//       setRefreshing(false);
//     }
//   }, []);

//   useEffect(() => {
//     load();
//   }, [load]);

//   const special = round2(100 - num(form.basicPercent) - num(form.hraPercent) - num(form.daPercent));
//   const formPercent = useMemo(
//     () => ({ basic: num(form.basicPercent), hra: num(form.hraPercent), da: num(form.daPercent), special: Math.max(0, special), pf: num(form.pfPercent), esi: num(form.esiPercent) }),
//     [form, special]
//   );

//   const openModal = (item = null) => {
//     setForm(
//       item
//         ? {
//           name: item.name,
//           basicPercent: String(item.basicPercent ?? 0),
//           hraPercent: String(item.hraPercent ?? 0),
//           daPercent: String(item.daPercent ?? 0),
//           pfPercent: String(item.pfPercent ?? 0),
//           esiPercent: String(item.esiPercent ?? 0),
//           isDefault: Boolean(item.isDefault),
//         }
//         : { ...EMPTY, isDefault: structures.length === 0 }
//     );
//     setErrors({});
//     setModal({ item });
//   };

//   const setField = (key, value) => {
//     setForm((prev) => ({ ...prev, [key]: value }));
//     setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
//   };

//   const save = async (e) => {
//     e.preventDefault();
//     if (saving) return;

//     const next = {};
//     if (form.name.trim().length < 2) next.name = "Please enter a name (at least 2 characters).";
//     ["basicPercent", "hraPercent", "daPercent", "pfPercent", "esiPercent"].forEach((key) => {
//       const v = num(form[key]);
//       if (!Number.isFinite(v) || v < 0 || v > 100) next[key] = "Enter 0 to 100.";
//     });
//     if (!next.basicPercent && special < 0) next.basicPercent = "Basic + HRA + DA cannot be more than 100%.";
//     setErrors(next);
//     if (Object.keys(next).length) return;

//     const payload = {
//       name: form.name.trim(),
//       basicPercent: num(form.basicPercent),
//       hraPercent: num(form.hraPercent),
//       daPercent: num(form.daPercent),
//       specialPercent: special,
//       pfPercent: num(form.pfPercent),
//       esiPercent: num(form.esiPercent),
//       isDefault: form.isDefault,
//     };

//     setSaving(true);
//     try {
//       if (modal.item) await api.put(`/payroll/structures/${modal.item._id}`, payload);
//       else await api.post("/payroll/structures", payload);
//       toast.success("Salary structure saved.");
//       setModal(null);
//       load({ silent: true });
//     } catch (err) {
//       toast.error(err?.response?.data?.message || "Unable to save the salary structure.");
//     } finally {
//       setSaving(false);
//     }
//   };

//   const makeDefault = async (item) => {
//     setBusyId(item._id);
//     try {
//       await api.put(`/payroll/structures/${item._id}`, { isDefault: true });
//       toast.success(`"${item.name}" is now the default structure.`);
//       await load({ silent: true });
//     } catch (err) {
//       toast.error(err?.response?.data?.message || "Unable to change the default.");
//     } finally {
//       setBusyId("");
//     }
//   };

//   const remove = (item) =>
//     setAsk({
//       title: "Delete this salary structure?",
//       text: `"${item.name}" will be removed. Payslips that are already generated are not changed.`,
//       run: async () => {
//         try {
//           await api.delete(`/payroll/structures/${item._id}`);
//           toast.success("Salary structure deleted.");
//           await load({ silent: true });
//         } catch (err) {
//           toast.error(err?.response?.data?.message || "Unable to delete the salary structure.");
//         }
//       },
//     });

//   const pctInput = (key, label, hint) => (
//     <div>
//       <Label>{label}</Label>
//       <input type="number" inputMode="decimal" min="0" max="100" step="any" value={form[key]} onChange={(e) => setField(key, e.target.value)} className={`${inputClass} font-mono ${fieldBorder(errors[key])}`} />
//       {hint && !errors[key] && <p className="text-[10px] text-slate-400 mt-1">{hint}</p>}
//       <FieldError>{errors[key]}</FieldError>
//     </div>
//   );

//   return (
//     <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 py-4 space-y-4 antialiased pb-16">
//       {/* Header */}
//       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm">
//         <div className="flex items-center gap-3.5 min-w-0">
//           <div className="w-11 h-11 sm:w-12 sm:h-12 shrink-0 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20">
//             <Sliders size={20} />
//           </div>
//           <div className="min-w-0">
//             <div className="flex flex-wrap items-center gap-2">
//               <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Salary Structure</h1>
//               {!loading && !error && <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">{structures.length} {structures.length === 1 ? "template" : "templates"}</span>}
//             </div>
//             <p className="text-xs sm:text-sm text-slate-500 mt-0.5">How one monthly salary is split into Basic, HRA, DA and Special Allowance.</p>
//           </div>
//         </div>
//         <div className="flex items-center gap-2.5">
//           <button type="button" onClick={() => load({ silent: true })} disabled={loading || refreshing} className="p-3 sm:p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl transition disabled:opacity-50 cursor-pointer" aria-label="Refresh">
//             <RefreshCw size={16} className={loading || refreshing ? "animate-spin text-indigo-600" : ""} />
//           </button>
//           <button type="button" onClick={() => openModal(null)} className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-3 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-indigo-600/20 transition active:scale-95 cursor-pointer">
//             <Plus size={16} /> Create Structure
//           </button>
//         </div>
//       </div>

//       {/* Simulator */}
//       <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
//         <div className="min-w-0">
//           <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
//             <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Live Simulator
//           </span>
//           <h3 className="text-base font-bold text-slate-900 mt-1.5">Try a monthly salary</h3>
//           <p className="text-xs text-slate-500">See how every structure splits it. Changes in a structure apply to payslips generated from now on.</p>
//         </div>
//         <label className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-4 py-3 rounded-2xl">
//           <Coins className="w-4 h-4 text-indigo-600 shrink-0" />
//           <span className="text-xs text-slate-600 font-semibold whitespace-nowrap">Monthly salary ₹</span>
//           <input type="number" inputMode="numeric" min="0" step="1000" value={simSalary} onChange={(e) => setSimSalary(Math.max(0, Number(e.target.value) || 0))} className="w-28 bg-transparent text-slate-900 font-bold text-base sm:text-sm outline-none border-b border-slate-300 focus:border-indigo-600 transition-colors" />
//         </label>
//       </div>

//       <ErrorBanner message={error} onRetry={() => load()} />

//       {/* Cards */}
//       {loading ? (
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//           {[0, 1, 2].map((n) => (
//             <div key={n} className="h-72 rounded-3xl bg-white border border-slate-200/80 animate-pulse" />
//           ))}
//         </div>
//       ) : !error && structures.length === 0 ? (
//         <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm py-16 px-4 text-center">
//           <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3 border border-slate-200">
//             <Layers className="w-6 h-6" />
//           </div>
//           <p className="text-sm font-bold text-slate-800">No salary structure yet</p>
//           <p className="text-xs text-slate-500 mt-1">Click &quot;Create Structure&quot; to add the first one. It becomes the default automatically.</p>
//         </div>
//       ) : (
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//           {structures.map((st) => {
//             const p = { basic: st.basicPercent || 0, hra: st.hraPercent || 0, da: st.daPercent || 0, special: st.specialPercent || 0, pf: st.pfPercent || 0, esi: st.esiPercent || 0 };
//             const a = amountsFor(simSalary, p);
//             const busy = busyId === st._id;
//             return (
//               <div key={st._id} className={`min-w-0 bg-white p-4 sm:p-5 rounded-3xl border shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 flex flex-col gap-4 ${st.isDefault ? "border-indigo-300 ring-2 ring-indigo-500/10" : "border-slate-200/80 hover:border-indigo-200"}`}>
//                 <div className="flex items-start justify-between gap-3">
//                   <div className="min-w-0">
//                     <h3 className="font-bold text-slate-900 text-base break-words">{st.name}</h3>
//                     <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
//                       {st.isDefault && <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full"><Star size={10} className="fill-indigo-500" /> DEFAULT</span>}
//                       <span className="text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
//                         {st.usedBy ? `${st.usedBy} employee${st.usedBy === 1 ? "" : "s"}` : "Not assigned"}
//                       </span>
//                     </div>
//                   </div>
//                 </div>

//                 <div className="h-2.5 w-full rounded-full overflow-hidden flex bg-slate-100 border border-slate-200">
//                   {SEGMENTS.map(([key, label, color]) => (p[key] > 0 ? <div key={key} style={{ width: `${p[key]}%` }} className={`${color} h-full`} title={`${label}: ${p[key]}%`} /> : null))}
//                 </div>

//                 <div className="bg-slate-50/80 rounded-2xl border border-slate-200/80 p-3.5 space-y-2 text-xs">
//                   {SEGMENTS.map(([key, label, color]) =>
//                     p[key] > 0 || key === "basic" ? (
//                       <div key={key} className="flex items-center justify-between text-slate-700">
//                         <span className="flex items-center gap-2"><span className={`w-2.5 h-2.5 rounded-full ${color}`} /> {label} ({p[key]}%)</span>
//                         <strong className="font-mono text-slate-900">{rupee(a[key])}</strong>
//                       </div>
//                     ) : null
//                   )}
//                   {(p.pf > 0 || p.esi > 0) && (
//                     <div className="pt-2 mt-1 border-t border-slate-200 space-y-2">
//                       {p.pf > 0 && <div className="flex justify-between text-slate-700"><span>PF ({p.pf}% of Basic)</span><strong className="font-mono text-rose-600">- {rupee(a.pf)}</strong></div>}
//                       {p.esi > 0 && <div className="flex justify-between text-slate-700"><span>ESI ({p.esi}% of Gross)</span><strong className="font-mono text-rose-600">- {rupee(a.esi)}</strong></div>}
//                     </div>
//                   )}
//                 </div>

//                 <div className="mt-auto grid grid-cols-3 gap-2">
//                   <button type="button" onClick={() => openModal(st)} className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-xs font-bold transition cursor-pointer">
//                     <Edit3 size={13} /> Edit
//                   </button>
//                   <button type="button" onClick={() => makeDefault(st)} disabled={st.isDefault || busy} className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-amber-50 hover:text-amber-700 text-slate-700 text-xs font-bold transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
//                     {busy ? <Loader2 size={13} className="animate-spin" /> : <Star size={13} />} Default
//                   </button>
//                   <button type="button" onClick={() => remove(st)} disabled={st.usedBy > 0} title={st.usedBy > 0 ? `Assigned to ${st.usedBy} employee(s). Assign them another structure first.` : "Delete"} className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-rose-50 hover:text-rose-600 text-slate-700 text-xs font-bold transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
//                     <Trash2 size={13} /> Delete
//                   </button>
//                 </div>
//               </div>
//             );
//           })}
//         </div>
//       )}

//       {/* Create or edit */}
//       {modal && (
//         <Sheet onClose={() => setModal(null)} locked={saving} size="max-w-lg">
//           <form onSubmit={save} noValidate className="flex flex-col min-h-0 flex-1">
//             <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/70">
//               <div className="min-w-0">
//                 <h3 className="text-base font-bold text-slate-900">{modal.item ? "Edit Salary Structure" : "New Salary Structure"}</h3>
//                 <p className="text-xs text-slate-400">Special Allowance takes whatever is left of 100%.</p>
//               </div>
//               <button type="button" onClick={() => !saving && setModal(null)} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer" aria-label="Close">
//                 <X size={18} />
//               </button>
//             </div>

//             <div className="flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6 space-y-4">
//               <div>
//                 <Label>Template Name</Label>
//                 <input value={form.name} maxLength={60} onChange={(e) => setField("name", e.target.value)} placeholder="e.g. Standard (Grade A)" className={`${inputClass} ${fieldBorder(errors.name)}`} />
//                 <FieldError>{errors.name}</FieldError>
//               </div>

//               <div className="grid grid-cols-2 gap-3">
//                 {pctInput("basicPercent", "Basic %", "of the monthly salary")}
//                 {pctInput("hraPercent", "HRA %", "of the monthly salary")}
//                 {pctInput("daPercent", "Dearness Allowance %", "optional")}
//                 <div>
//                   <Label>Special Allowance %</Label>
//                   <div className={`${inputClass} font-mono border-slate-200 ${special < 0 ? "text-rose-600" : "text-slate-700"} bg-slate-100`}>{special}</div>
//                   <p className="text-[10px] text-slate-400 mt-1">calculated automatically</p>
//                 </div>
//               </div>

//               <div className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs font-bold ${special >= 0 ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800"}`}>
//                 <span className="flex items-center gap-2">{special >= 0 ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />} Total</span>
//                 <span className="font-mono">{special >= 0 ? "100% (balanced)" : `${round2(100 - special)}% (more than 100%)`}</span>
//               </div>

//               <div className="grid grid-cols-2 gap-3">
//                 {pctInput("pfPercent", "PF % (of Basic)", "0 = not applied")}
//                 {pctInput("esiPercent", "ESI % (of Gross)", "0 = not applied")}
//               </div>
//               <p className="text-[11px] text-slate-400 -mt-2">Please confirm the PF and ESI rates and limits with your CA.</p>

//               <button type="button" role="switch" aria-checked={form.isDefault} onClick={() => setField("isDefault", !form.isDefault)} className="w-full flex items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200 hover:border-indigo-300 transition cursor-pointer text-left">
//                 <span className="min-w-0">
//                   <span className="flex items-center gap-2 text-sm font-bold text-slate-800"><Star size={14} className="text-indigo-500" /> Use as the default</span>
//                   <span className="block text-[11px] text-slate-400 mt-0.5">Employees without their own structure get this one.</span>
//                 </span>
//                 <span className={`relative w-11 h-6 shrink-0 rounded-full transition-colors ${form.isDefault ? "bg-indigo-600" : "bg-slate-300"}`}>
//                   <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${form.isDefault ? "translate-x-5" : ""}`} />
//                 </span>
//               </button>

//               <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
//                 <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Preview for ₹{simSalary.toLocaleString("en-IN")} per month</p>
//                 {(() => {
//                   const a = amountsFor(simSalary, formPercent);
//                   return (
//                     <div className="space-y-1.5 text-xs">
//                       {[["Basic", a.basic], ["HRA", a.hra], ...(formPercent.da > 0 ? [["DA", a.da]] : []), ["Special", a.special]].map(([label, amount]) => (
//                         <div key={label} className="flex justify-between"><span className="text-slate-600">{label}</span><span className="font-mono font-bold text-slate-900">{rupee(amount)}</span></div>
//                       ))}
//                     </div>
//                   );
//                 })()}
//               </div>
//             </div>

//             <div className="shrink-0 border-t border-slate-100 bg-white px-5 sm:px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
//               <button type="button" onClick={() => setModal(null)} disabled={saving} className="px-5 py-3 sm:py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50">Cancel</button>
//               <button type="submit" disabled={saving || special < 0} className="inline-flex items-center justify-center gap-2 px-6 py-3 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed">
//                 {saving && <Loader2 size={14} className="animate-spin" />}
//                 {saving ? "Saving..." : "Save Structure"}
//               </button>
//             </div>
//           </form>
//         </Sheet>
//       )}

//       {ask && <ConfirmDialog title={ask.title} text={ask.text} label="Delete" danger onConfirm={ask.run} onClose={() => setAsk(null)} />}
//     </div>
//   );
// }

