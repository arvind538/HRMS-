"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Coins, Plus, RefreshCw, Search, Edit3, Trash2, Layers, Users, IndianRupee, TrendingUp, AlertCircle, Loader2, Info, X, MoreVertical } from "lucide-react";
import { toast } from "react-toastify";
import api from "@/lib/api";
import { Avatar, ConfirmDialog, ErrorBanner, FieldError, Label, Sheet, StatCard, cleanText, fieldBorder, inputClass, rupee, rupeeShort, round2 } from "@/components/payroll/ui";

const STATUSES = ["Active", "Inactive", "On Hold"];
const FILTERS = [
  ["all", "All"],
  ["custom", "Own structure"],
  ["default", "On default"],
  ["nosalary", "No salary"],
];
const MAX_SALARY = 10000000;

/* ---- small helpers (they work even if the API sends the employee fields under another name) ---- */
const idOf = (v) => (v && typeof v === "object" ? v._id : v) || "";
const nameOf = (e = {}) =>
  e.name || e.fullName || e.employeeName || [e.firstName, e.middleName, e.lastName].filter(Boolean).join(" ") || e.user?.name || "Unnamed employee";
const codeOf = (e = {}) => e.employeeId || e.empId || e.employeeCode || e.code || "";
const isDefault = (r) => !idOf(r.salaryStructure);
const noSalary = (r) => !(Number(r.grossMonthly) > 0);

/* The same split the server makes when it builds a payslip */
const splitSalary = (gross, st) => {
  const p = st || { basicPercent: 100, hraPercent: 0, daPercent: 0, specialPercent: 0 };
  const basic = round2((gross * (p.basicPercent || 0)) / 100);
  const hra = round2((gross * (p.hraPercent || 0)) / 100);
  const da = round2((gross * (p.daPercent || 0)) / 100);
  const special = round2(gross - basic - hra - da);
  const pf = st?.pfPercent ? round2((basic * st.pfPercent) / 100) : 0;
  const esi = st?.esiPercent ? round2((gross * st.esiPercent) / 100) : 0;
  return { basic, hra, da, special, pf, esi };
};

const STATUS_STYLE = {
  Active: ["bg-emerald-50 text-emerald-700 border-emerald-200", "bg-emerald-500"],
  Inactive: ["bg-slate-100 text-slate-600 border-slate-200", "bg-slate-400"],
  "On Hold": ["bg-amber-50 text-amber-700 border-amber-200", "bg-amber-500"],
};

function StatusPill({ status }) {
  const [cls, dot] = STATUS_STYLE[status] || STATUS_STYLE.Active;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap ${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} /> {status}
    </span>
  );
}

/* Three-dot menu. It is drawn on document.body, so the table's overflow can never cut it. */
function ActionMenu({ items }) {
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const close = useCallback(() => setPos(null), []);

  const toggle = () => {
    if (pos) return close();
    const rect = btnRef.current.getBoundingClientRect();
    const width = 200;
    const height = items.length * 44 + 16;
    const left = Math.min(Math.max(8, rect.right - width), window.innerWidth - width - 8);
    const below = rect.bottom + 6;
    const top = below + height > window.innerHeight - 8 ? Math.max(8, rect.top - height - 6) : below;
    setPos({ top, left, width });
  };

  useEffect(() => {
    if (!pos) return undefined;
    const onDown = (e) => {
      if (menuRef.current?.contains(e.target) || btnRef.current?.contains(e.target)) return;
      close();
    };
    const onKey = (e) => e.key === "Escape" && close();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [pos, close]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={Boolean(pos)}
        aria-label="Actions"
        className={`inline-flex items-center justify-center w-10 h-10 sm:w-9 sm:h-9 rounded-xl border transition cursor-pointer ${pos ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600"}`}
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {pos &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width }}
            className="z-[100] rounded-2xl bg-white border border-slate-200 shadow-xl shadow-slate-900/10 p-1.5"
          >
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                onClick={() => {
                  close();
                  item.onClick();
                }}
                className={`w-full flex items-center gap-2.5 px-3 h-11 sm:h-10 rounded-xl text-sm sm:text-xs font-bold text-left transition cursor-pointer ${item.danger ? "text-rose-600 hover:bg-rose-50" : "text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"}`}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {item.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}

export default function EmployeeSalary() {
  const [rows, setRows] = useState([]);
  const [structures, setStructures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const [modal, setModal] = useState(null); // { row } (row is null when a new one is added)
  const [form, setForm] = useState({ employeeId: "", structureId: "", salary: "", status: "Active" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [ask, setAsk] = useState(null);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError("");
    const [salaryRes, structRes] = await Promise.allSettled([api.get("/payroll/employee-salaries"), api.get("/payroll/structures")]);

    if (salaryRes.status === "fulfilled") setRows(Array.isArray(salaryRes.value.data) ? salaryRes.value.data : []);
    else setError(salaryRes.reason?.response?.data?.message || "Unable to load the salary list. Please try again.");

    if (structRes.status === "fulfilled") setStructures(Array.isArray(structRes.value.data) ? structRes.value.data : []);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const defaultStructure = structures.find((s) => s.isDefault) || null;

  /* The structure a row really uses, and its monthly breakup, worked out here from the structures list */
  const structureOf = (r) => structures.find((s) => s._id === (idOf(r.salaryStructure) || idOf(r.effectiveStructure))) || defaultStructure || null;
  const breakupOf = (r) => splitSalary(Number(r.grossMonthly) || 0, structureOf(r));

  const counts = useMemo(
    () => ({
      all: rows.length,
      custom: rows.filter((r) => !isDefault(r)).length,
      default: rows.filter((r) => isDefault(r)).length,
      nosalary: rows.filter(noSalary).length,
    }),
    [rows]
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === "custom" && isDefault(r)) return false;
      if (filter === "default" && !isDefault(r)) return false;
      if (filter === "nosalary" && !noSalary(r)) return false;
      if (!q) return true;
      const e = r.employee || {};
      return `${nameOf(e)} ${codeOf(e)} ${cleanText(e.department)}`.toLowerCase().includes(q);
    });
  }, [rows, filter, search]);

  const stats = useMemo(() => {
    const active = rows.filter((r) => r.status === "Active" && !noSalary(r));
    const monthly = active.reduce((sum, r) => sum + (Number(r.grossMonthly) || 0), 0);
    return { monthly, annual: monthly * 12, avg: active.length ? monthly / active.length : 0, missing: counts.nosalary };
  }, [rows, counts.nosalary]);

  /* ---- modal ---- */
  const fillFrom = (r) => ({
    employeeId: r?.employee?._id || "",
    structureId: idOf(r?.salaryStructure),
    salary: r && Number(r.grossMonthly) > 0 ? String(r.grossMonthly) : "",
    status: r?.status || "Active",
  });

  const openModal = (row = null) => {
    setForm(fillFrom(row));
    setErrors({});
    setModal({ row });
  };

  const pickEmployee = (id) => {
    const r = rows.find((x) => x.employee?._id === id);
    setForm(r ? fillFrom(r) : { employeeId: "", structureId: "", salary: "", status: "Active" });
    setErrors({});
  };

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const chosen = structures.find((s) => s._id === form.structureId) || defaultStructure;
  const grossNow = Number(form.salary) || 0;
  const preview = splitSalary(grossNow, chosen);

  const save = async (e) => {
    e.preventDefault();
    if (saving) return;

    const next = {};
    if (!form.employeeId) next.employeeId = "Please select an employee.";
    const salary = Number(form.salary);
    if (!Number.isFinite(salary) || salary <= 0) next.salary = "Enter the monthly salary (more than 0).";
    else if (salary > MAX_SALARY) next.salary = "This salary looks too high. Please check it.";
    setErrors(next);
    if (Object.keys(next).length) return;

    const payload = { salaryStructure: form.structureId || "", grossMonthly: salary, status: form.status };

    setSaving(true);
    try {
      if (modal.row?._id) await api.put(`/payroll/employee-salaries/${modal.row._id}`, payload);
      else await api.post("/payroll/employee-salaries", { ...payload, employeeId: form.employeeId });
      toast.success("Salary saved successfully.");
      setModal(null);
      load({ silent: true });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to save the salary.");
    } finally {
      setSaving(false);
    }
  };

  const removeAssignment = (row) =>
    setAsk({
      title: "Remove this salary assignment?",
      text: `${nameOf(row.employee)} will go back to the default structure. The monthly salary stays on the employee profile.`,
      label: "Remove",
      danger: true,
      run: async () => {
        try {
          await api.delete(`/payroll/employee-salaries/${row._id}`);
          toast.success("Assignment removed.");
          await load({ silent: true });
        } catch (err) {
          toast.error(err?.response?.data?.message || "Unable to remove the assignment.");
        }
      },
    });

  /* ---- rows ---- */
  const structureCell = (r) => {
    const st = structureOf(r);
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 max-w-full">
        <Layers className="w-3.5 h-3.5 text-slate-500 shrink-0" />
        <span className="truncate">{st?.name || "Basic only"}</span>
        {isDefault(r) && st && <span className="text-[10px] font-bold text-indigo-600">DEFAULT</span>}
      </span>
    );
  };

  const actions = (r) => {
    const items = [{ label: r._id || !noSalary(r) ? "Edit salary" : "Assign salary", icon: Edit3, onClick: () => openModal(r) }];
    if (r._id) items.push({ label: "Remove assignment", icon: Trash2, danger: true, onClick: () => removeAssignment(r) });
    return <ActionMenu items={items} />;
  };

  const breakupText = (r) => {
    const b = breakupOf(r);
    return `Basic ${rupeeShort(b.basic)} · HRA ${rupeeShort(b.hra)}${b.da > 0 ? ` · DA ${rupeeShort(b.da)}` : ""} · Special ${rupeeShort(b.special)}`;
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 py-4 space-y-4 antialiased pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-11 h-11 sm:w-12 sm:h-12 shrink-0 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20">
            <Coins size={20} />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Employee Salary</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Who gets how much, and with which salary structure.</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <button type="button" onClick={() => load({ silent: true })} disabled={loading || refreshing} className="p-3 sm:p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl transition disabled:opacity-50 cursor-pointer" aria-label="Refresh">
            <RefreshCw size={16} className={loading || refreshing ? "animate-spin text-indigo-600" : ""} />
          </button>
          <button type="button" onClick={() => openModal(null)} className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-3 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-indigo-600/20 transition active:scale-95 cursor-pointer">
            <Plus size={16} /> Assign Salary
          </button>
        </div>
      </div>

      {!loading && !error && structures.length === 0 && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl">
          <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs sm:text-sm font-medium">No salary structure exists yet, so every salary is shown as Basic only. Create one in <b>Salary Structure</b> first.</p>
        </div>
      )}
      {!loading && !error && structures.length > 0 && !defaultStructure && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl">
          <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs sm:text-sm font-medium">No default structure is set. Employees without their own structure get Basic only. Mark one structure as default in <b>Salary Structure</b>.</p>
        </div>
      )}

      <ErrorBanner message={error} onRetry={() => load()} />

      {/* Stats */}
      {!loading && !error && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard icon={IndianRupee} tone="indigo" label="Monthly Payroll" value={rupeeShort(stats.monthly)} sub="Active employees" />
          <StatCard icon={TrendingUp} tone="emerald" label="Annual Payroll" value={rupeeShort(stats.annual)} />
          <StatCard icon={Users} tone="violet" label="Average Salary" value={rupeeShort(stats.avg)} sub="Per month" />
          <StatCard icon={AlertCircle} tone={stats.missing ? "rose" : "emerald"} label="Salary Not Set" value={stats.missing} sub={stats.missing ? "Payslip is skipped for them" : "All set"} />
        </div>
      )}

      {/* Search and filters */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/70 shadow-sm space-y-3">
        <div className="relative sm:max-w-sm">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, ID or department" className="w-full pl-9 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs outline-none transition focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" />
          {search && (
            <button type="button" onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 cursor-pointer" aria-label="Clear search">
              <X size={14} />
            </button>
          )}
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {FILTERS.map(([key, label]) => (
            <button key={key} type="button" onClick={() => setFilter(key)} className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border transition cursor-pointer ${filter === key ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"}`}>
              {label}
              <span className={`px-1.5 rounded-full text-[10px] ${filter === key ? "bg-white/20" : "bg-slate-100 text-slate-500"}`}>{counts[key]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
        {loading ? (
          <div className="divide-y divide-slate-100">
            {[0, 1, 2, 3].map((n) => (
              <div key={n} className="p-4 sm:p-5 flex gap-3.5 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-slate-100 shrink-0" />
                <div className="flex-1 space-y-2.5">
                  <div className="h-3.5 w-1/3 rounded bg-slate-100" />
                  <div className="h-3 w-1/2 rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-700">{rows.length === 0 ? "No active employee found" : "Nothing matches your search"}</p>
            <p className="text-xs text-slate-400 mt-1">{rows.length === 0 ? "Add employees first, then assign their salary here." : "Try another keyword or filter."}</p>
          </div>
        ) : (
          <>
            {/* Mobile and tablet */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 sm:p-4 lg:hidden">
              {visible.map((r) => {
                const e = r.employee || {};
                return (
                  <div key={e._id} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar name={nameOf(e)} size="w-10 h-10" />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate">{nameOf(e)}</p>
                          <p className="text-[11px] text-slate-500 truncate">{[codeOf(e), cleanText(e.department)].filter(Boolean).join(" • ") || "—"}</p>
                        </div>
                      </div>
                      <div className="shrink-0">{actions(r)}</div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {structureCell(r)}
                      <StatusPill status={r.status} />
                    </div>

                    {noSalary(r) ? (
                      <p className="rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold px-3 py-2">Monthly salary is not set.</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-xl bg-slate-50 p-2.5"><p className="text-[10px] font-bold uppercase text-slate-400">Monthly</p><p className="font-bold text-slate-900">{rupeeShort(r.grossMonthly)}</p></div>
                        <div className="rounded-xl bg-slate-50 p-2.5"><p className="text-[10px] font-bold uppercase text-slate-400">Annual</p><p className="font-bold text-indigo-600">{rupeeShort(Number(r.annualCTC) || r.grossMonthly * 12)}</p></div>
                        <p className="col-span-2 text-[11px] text-slate-500">{breakupText(r)}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Desktop */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase">
                  <tr>
                    <th className="px-5 py-3.5">Employee</th>
                    <th className="px-4 py-3.5">Structure</th>
                    <th className="px-4 py-3.5">Monthly Salary</th>
                    <th className="px-4 py-3.5">Annual</th>
                    <th className="px-4 py-3.5">Breakup (per month)</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visible.map((r) => {
                    const e = r.employee || {};
                    return (
                      <tr key={e._id} className="hover:bg-indigo-50/40 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <Avatar name={nameOf(e)} />
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900 text-sm truncate max-w-[200px]">{nameOf(e)}</p>
                              <p className="text-[11px] text-slate-400 truncate max-w-[200px]">{[codeOf(e), cleanText(e.department)].filter(Boolean).join(" • ") || "—"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 max-w-[180px]">{structureCell(r)}</td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {noSalary(r) ? <span className="text-amber-600 font-bold">Not set</span> : <span className="font-bold text-slate-900 text-sm">{rupee(r.grossMonthly)}</span>}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap font-bold text-indigo-600">{noSalary(r) ? "—" : rupeeShort(Number(r.annualCTC) || r.grossMonthly * 12)}</td>
                        <td className="px-4 py-3.5 text-[11px] text-slate-500 whitespace-nowrap">{noSalary(r) ? "—" : breakupText(r)}</td>
                        <td className="px-4 py-3.5"><StatusPill status={r.status} /></td>
                        <td className="px-4 py-3.5"><div className="flex justify-end">{actions(r)}</div></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Assign or edit */}
      {modal && (
        <Sheet onClose={() => setModal(null)} locked={saving} size="max-w-lg">
          <form onSubmit={save} noValidate className="flex flex-col min-h-0 flex-1">
            <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/70">
              <div className="min-w-0">
                <h3 className="text-base font-bold text-slate-900">{modal.row ? "Edit Salary" : "Assign Salary"}</h3>
                <p className="text-xs text-slate-400">The salary is saved on the employee profile too.</p>
              </div>
              <button type="button" onClick={() => !saving && setModal(null)} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer" aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6 space-y-4">
              <div>
                <Label>Employee</Label>
                {modal.row ? (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 border border-slate-200">
                    <Avatar name={nameOf(modal.row.employee)} />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{nameOf(modal.row.employee)}</p>
                      <p className="text-[11px] text-slate-500">{codeOf(modal.row.employee) || "—"}</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <select value={form.employeeId} onChange={(e) => pickEmployee(e.target.value)} className={`${inputClass} cursor-pointer ${fieldBorder(errors.employeeId)}`}>
                      <option value="">Select employee</option>
                      {[...rows]
                        .sort((a, b) => nameOf(a.employee).localeCompare(nameOf(b.employee)))
                        .map((r) => (
                          <option key={r.employee?._id} value={r.employee?._id}>
                            {nameOf(r.employee)} ({codeOf(r.employee) || "—"}){noSalary(r) ? " – salary not set" : ""}
                          </option>
                        ))}
                    </select>
                    <FieldError>{errors.employeeId}</FieldError>
                  </>
                )}
              </div>

              <div>
                <Label>Monthly Salary (₹)</Label>
                <input type="number" inputMode="decimal" min="1" step="any" value={form.salary} onChange={(e) => setField("salary", e.target.value)} placeholder="e.g. 30000" className={`${inputClass} ${fieldBorder(errors.salary)}`} />
                <FieldError>{errors.salary}</FieldError>
                {grossNow > 0 && <p className="text-[11px] font-semibold text-emerald-600 mt-1.5">≈ {rupee(grossNow * 12)} per year</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Salary Structure</Label>
                  <select value={form.structureId} onChange={(e) => setField("structureId", e.target.value)} className={`${inputClass} cursor-pointer border-slate-200 focus:border-indigo-500`}>
                    <option value="">{defaultStructure ? `Default (${defaultStructure.name})` : "None (all Basic)"}</option>
                    {structures.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name} (Basic {s.basicPercent}%)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Status</Label>
                  <select value={form.status} onChange={(e) => setField("status", e.target.value)} className={`${inputClass} cursor-pointer border-slate-200 focus:border-indigo-500`}>
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
              {form.status !== "Active" && <p className="text-[11px] font-semibold text-amber-700">A payslip is not generated while the salary is {form.status}.</p>}

              {grossNow > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Monthly breakup</p>
                  <div className="space-y-1.5 text-xs">
                    {[
                      ["Basic", preview.basic],
                      ["House Rent Allowance", preview.hra],
                      ...(preview.da > 0 ? [["Dearness Allowance", preview.da]] : []),
                      ["Special Allowance", preview.special],
                    ].map(([label, amount]) => (
                      <div key={label} className="flex justify-between"><span className="text-slate-600">{label}</span><span className="font-mono font-bold text-slate-900">{rupee(amount)}</span></div>
                    ))}
                    {(preview.pf > 0 || preview.esi > 0) && (
                      <div className="pt-1.5 mt-1.5 border-t border-slate-200 space-y-1.5">
                        {preview.pf > 0 && <div className="flex justify-between"><span className="text-slate-600">PF (estimate)</span><span className="font-mono font-bold text-rose-600">- {rupee(preview.pf)}</span></div>}
                        {preview.esi > 0 && <div className="flex justify-between"><span className="text-slate-600">ESI (estimate)</span><span className="font-mono font-bold text-rose-600">- {rupee(preview.esi)}</span></div>}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-slate-100 bg-white px-5 sm:px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
              <button type="button" onClick={() => setModal(null)} disabled={saving} className="px-5 py-3 sm:py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50">Cancel</button>
              <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 px-6 py-3 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 transition cursor-pointer disabled:opacity-60">
                {saving && <Loader2 size={14} className="animate-spin" />}
                {saving ? "Saving..." : "Save Salary"}
              </button>
            </div>
          </form>
        </Sheet>
      )}

      {ask && <ConfirmDialog title={ask.title} text={ask.text} label={ask.label} danger={ask.danger} onConfirm={ask.run} onClose={() => setAsk(null)} />}
    </div>
  );
}


// "use client";

// import React, { useState, useEffect, useCallback, useMemo } from "react";
// import {
//   Search,
//   RefreshCw,
//   AlertCircle,
//   IndianRupee,
//   Edit3,
//   Trash2,
//   Layers,
//   Users,
//   Coins,
//   TrendingUp,
//   X,
//   Plus,
//   ChevronDown
// } from "lucide-react";
// import api from "@/lib/api";
// import { toast } from "react-toastify";

// export default function EmployeeSalary() {
//   const [salaries, setSalaries] = useState([]);
//   const [employees, setEmployees] = useState([]);
//   const [structures, setStructures] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [dropdownLoading, setDropdownLoading] = useState(false);
//   const [error, setError] = useState(null);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [deletingId, setDeletingId] = useState(null);

//   // Modal State for Mapping/Editing Salary
//   const [showModal, setShowModal] = useState(false);
//   const [submitting, setSubmitting] = useState(false);
//   const [editingId, setEditingId] = useState(null);
//   const [form, setForm] = useState({
//     employeeId: "",
//     salaryStructureId: "",
//     annualCTC: "",
//     status: "Active",
//   });

//   // Fetch all salary mapping records
//   const fetchSalaries = useCallback(async () => {
//     setLoading(true);
//     setError(null);
//     try {
//       const response = await api.get("/payroll/employee-salaries");
//       const resData = response?.data;

//       const list = Array.isArray(resData)
//         ? resData
//         : Array.isArray(resData?.data)
//           ? resData.data
//           : Array.isArray(resData?.salaries)
//             ? resData.salaries
//             : [];

//       setSalaries(list);
//     } catch (err) {
//       console.error("Fetch employee salaries error:", err);
//       setError(
//         err.response?.data?.message ||
//         err.response?.data?.error ||
//         "Failed to load salary mappings from the server."
//       );
//       setSalaries([]);
//     } finally {
//       setLoading(false);
//     }
//   }, []);

//   // Fetch employees and templates with shape normalization and fallback routes
//   const fetchDropdownData = useCallback(async () => {
//     setDropdownLoading(true);
//     try {
//       // 1. Fetch Employees (try /employee first, fallback to /employees)
//       let empList = [];
//       try {
//         const empRes = await api.get("/employee");
//         const empData = empRes?.data;
//         empList = Array.isArray(empData)
//           ? empData
//           : Array.isArray(empData?.data)
//             ? empData.data
//             : Array.isArray(empData?.employees)
//               ? empData.employees
//               : [];
//       } catch (err) {
//         if (err.response?.status === 404) {
//           try {
//             const fallbackEmpRes = await api.get("/employees");
//             const fallbackData = fallbackEmpRes?.data;
//             empList = Array.isArray(fallbackData)
//               ? fallbackData
//               : Array.isArray(fallbackData?.data)
//                 ? fallbackData.data
//                 : Array.isArray(fallbackData?.employees)
//                   ? fallbackData.employees
//                   : [];
//           } catch (e) {
//             console.error("Failed to load employees via /employees fallback:", e);
//           }
//         } else {
//           console.error("Employee fetch error:", err);
//         }
//       }
//       setEmployees(empList);

//       // 2. Fetch Salary Structures
//       try {
//         const structRes = await api.get("/payroll/salary-structures");
//         const structData = structRes?.data;
//         const structList = Array.isArray(structData)
//           ? structData
//           : Array.isArray(structData?.data)
//             ? structData.data
//             : Array.isArray(structData?.structures)
//               ? structData.structures
//               : [];

//         setStructures(structList);
//       } catch (err) {
//         console.warn("Salary structures fetch warning:", err);
//       }
//     } finally {
//       setDropdownLoading(false);
//     }
//   }, []);

//   useEffect(() => {
//     fetchSalaries();
//     fetchDropdownData();
//   }, [fetchSalaries, fetchDropdownData]);

//   // Open modal for new assignment or edit
//   const openModal = (item = null) => {
//     if (item) {
//       setEditingId(item._id || item.id);
//       setForm({
//         employeeId: item.employee?._id || item.employee || "",
//         salaryStructureId: item.salaryStructure?._id || item.salaryStructure || "",
//         annualCTC: item.annualCTC?.toString() || "",
//         status: item.status || "Active",
//       });
//     } else {
//       setEditingId(null);
//       setForm({
//         employeeId: employees[0]?._id || employees[0]?.id || "",
//         salaryStructureId: structures[0]?._id || structures[0]?.id || "",
//         annualCTC: "",
//         status: "Active",
//       });
//     }
//     setShowModal(true);
//   };

//   // Submit Salary Assignment (Create or Update)
//   const handleSave = async (e) => {
//     e.preventDefault();
//     if (!form.employeeId) {
//       toast.error("Please select an employee.");
//       return;
//     }
//     if (!form.annualCTC || Number(form.annualCTC) <= 0) {
//       toast.error("Please enter a valid Annual CTC amount.");
//       return;
//     }

//     setSubmitting(true);
//     try {
//       const payload = {
//         employeeId: form.employeeId,
//         salaryStructureId: form.salaryStructureId || null,
//         annualCTC: Number(form.annualCTC),
//         status: form.status,
//       };

//       if (editingId) {
//         await api.put(`/payroll/employee-salaries/${editingId}`, payload);
//         toast.success("Salary assignment updated successfully!");
//       } else {
//         await api.post("/payroll/employee-salaries", payload);
//         toast.success("Salary assignment saved successfully!");
//       }

//       setShowModal(false);
//       setEditingId(null);
//       fetchSalaries();
//     } catch (err) {
//       console.error("Save salary mapping error:", err);
//       toast.error(
//         err.response?.data?.message ||
//         err.response?.data?.error ||
//         "Failed to save salary mapping."
//       );
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   // Delete Salary Mapping Handler
//   const handleDelete = async (id) => {
//     if (!window.confirm("Are you sure you want to delete this salary mapping record?")) return;

//     setDeletingId(id);
//     try {
//       await api.delete(`/payroll/employee-salaries/${id}`);
//       setSalaries((prev) => prev.filter((item) => (item._id || item.id) !== id));
//       toast.success("Salary mapping deleted successfully.");
//     } catch (err) {
//       console.error("Delete salary mapping error:", err);
//       toast.error(
//         err.response?.data?.message ||
//         "Failed to delete salary mapping record."
//       );
//     } finally {
//       setDeletingId(null);
//     }
//   };

//   // Filter list by employee name, id, or department
//   const filtered = useMemo(() => {
//     const q = searchTerm.toLowerCase().trim();
//     if (!q) return salaries;
//     return salaries.filter((s) => {
//       const name = s.employee?.name || s.employee?.fullName || s.userName || "";
//       const code = s.employee?.employeeId || s.employee?.code || s.userId || "";
//       const dept = s.employee?.department || "";
//       return (
//         name.toLowerCase().includes(q) ||
//         code.toLowerCase().includes(q) ||
//         dept.toLowerCase().includes(q)
//       );
//     });
//   }, [salaries, searchTerm]);

//   // Payroll Metrics
//   const totalPayrollCTC = useMemo(() => {
//     return filtered.reduce((sum, item) => sum + (Number(item.annualCTC) || 0), 0);
//   }, [filtered]);

//   const avgMonthlyGross = useMemo(() => {
//     if (!filtered.length) return 0;
//     const totalGross = filtered.reduce((sum, item) => sum + (Number(item.grossMonthly) || 0), 0);
//     return Math.round(totalGross / filtered.length);
//   }, [filtered]);

//   return (
//     <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-3 lg:px-4 py-3">
//       {/* Top Banner Header */}
//       <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs transition hover:shadow-md">
//         <div className="flex items-center gap-3">
//           <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
//             <Coins className="w-5 h-5" />
//           </div>
//           <div>
//             <div className="flex items-center gap-2.5">
//               <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
//                 Employee Salary Mapping
//               </h1>
//               {!loading && !error && (
//                 <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
//                   {salaries.length} Employees Mapped
//                 </span>
//               )}
//             </div>
//             <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
//               Manage annual CTC allocation, monthly gross pay, and salary structure assignments
//             </p>
//           </div>
//         </div>

//         <div className="flex items-center gap-2.5 self-start sm:self-auto">
//           <button
//             onClick={() => {
//               fetchSalaries();
//               fetchDropdownData();
//             }}
//             disabled={loading}
//             className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition disabled:opacity-50"
//             title="Refresh records"
//           >
//             <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
//           </button>
//           <button
//             onClick={() => openModal()}
//             className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold rounded-xl shadow-xs transition"
//           >
//             <Plus className="w-4 h-4" />
//             <span>Assign Salary</span>
//           </button>
//         </div>
//       </div>

//       {/* Aggregate KPI Badges */}
//       {!loading && !error && salaries.length > 0 && (
//         <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
//           <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between transition hover:shadow-md">
//             <div>
//               <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
//                 Total Annual Payroll Outflow
//               </p>
//               <h3 className="text-xl font-bold text-slate-900 mt-1">
//                 ₹{totalPayrollCTC.toLocaleString("en-IN")}
//               </h3>
//             </div>
//             <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
//               <IndianRupee className="w-5 h-5" />
//             </div>
//           </div>

//           <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between transition hover:shadow-md">
//             <div>
//               <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
//                 Average Monthly Gross Pay
//               </p>
//               <h3 className="text-xl font-bold text-emerald-600 mt-1">
//                 ₹{avgMonthlyGross.toLocaleString("en-IN")}
//               </h3>
//             </div>
//             <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
//               <TrendingUp className="w-5 h-5" />
//             </div>
//           </div>

//           <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between transition hover:shadow-md">
//             <div>
//               <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
//                 Active Contracts
//               </p>
//               <h3 className="text-xl font-bold text-slate-900 mt-1">
//                 {salaries.filter((s) => s.status === "Active").length} / {salaries.length}
//               </h3>
//             </div>
//             <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
//               <Users className="w-5 h-5" />
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Filter and Search Bar */}
//       <div className="flex items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs transition hover:shadow-md">
//         <div className="relative w-full sm:w-80">
//           <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
//           <input
//             type="text"
//             placeholder="Search employee by name, ID or department..."
//             value={searchTerm}
//             onChange={(e) => setSearchTerm(e.target.value)}
//             className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
//           />
//         </div>
//         <p className="text-xs text-slate-500 font-medium hidden sm:block">
//           Showing <span className="font-bold text-slate-800">{filtered.length}</span> mappings
//         </p>
//       </div>

//       {/* Main Results Table */}
//       <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden transition hover:shadow-md">
//         {loading ? (
//           <div className="py-20 text-center space-y-3">
//             <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
//             <p className="text-sm font-semibold text-slate-800">Loading salary mappings...</p>
//           </div>
//         ) : error ? (
//           <div className="py-16 text-center max-w-md mx-auto p-6">
//             <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
//             <h3 className="text-sm font-bold text-slate-900">Failed to Load Mappings</h3>
//             <p className="text-xs text-slate-500 mt-1 mb-4">{error}</p>
//             <button
//               onClick={fetchSalaries}
//               className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition"
//             >
//               Try Again
//             </button>
//           </div>
//         ) : filtered.length === 0 ? (
//           <div className="py-20 text-center max-w-sm mx-auto p-6">
//             <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
//             <h3 className="text-sm font-bold text-slate-800">No Salary Records Found</h3>
//             <p className="text-xs text-slate-500 mt-1">
//               Click 'Assign Salary' above to map an employee to a structure and CTC.
//             </p>
//           </div>
//         ) : (
//           <>
//             {/* Desktop Table */}
//             <div className="hidden md:block overflow-x-auto">
//               <table className="w-full text-left border-collapse">
//                 <thead>
//                   <tr className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
//                     <th className="py-3.5 px-6">Employee</th>
//                     <th className="py-3.5 px-6">Assigned Template</th>
//                     <th className="py-3.5 px-6">Monthly Gross</th>
//                     <th className="py-3.5 px-6">Annual CTC</th>
//                     <th className="py-3.5 px-6">Status</th>
//                     <th className="py-3.5 px-6 text-right">Actions</th>
//                   </tr>
//                 </thead>
//                 <tbody className="divide-y divide-slate-100 text-sm">
//                   {filtered.map((item) => {
//                     const id = item._id || item.id;
//                     const isDeleting = deletingId === id;
//                     const empName = item.employee?.name || item.employee?.fullName || item.userName || "Unknown Employee";
//                     const empCode = item.employee?.employeeId || item.employee?.code || item.userId || "—";
//                     const dept = item.employee?.department || "";
//                     const structureName = item.salaryStructure?.name || item.structureName || "Default Plan";

//                     return (
//                       <tr key={id} className="hover:bg-slate-50/80 transition-colors">
//                         <td className="py-4 px-6">
//                           <div className="flex items-center gap-3">
//                             <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center uppercase shrink-0">
//                               {empName.charAt(0)}
//                             </div>
//                             <div>
//                               <div className="font-semibold text-slate-900 leading-tight">
//                                 {empName}
//                               </div>
//                               <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
//                                 <span>{empCode}</span>
//                                 {dept && <span>• {dept}</span>}
//                               </div>
//                             </div>
//                           </div>
//                         </td>

//                         <td className="py-4 px-6">
//                           <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
//                             <Layers className="w-3.5 h-3.5 text-slate-500" />
//                             <span>{structureName}</span>
//                           </span>
//                         </td>

//                         <td className="py-4 px-6">
//                           <div className="font-semibold text-slate-800">
//                             ₹{(item.grossMonthly || 0).toLocaleString("en-IN")}
//                           </div>
//                           <span className="text-[11px] text-slate-400">per month</span>
//                         </td>

//                         <td className="py-4 px-6">
//                           <div className="font-bold text-indigo-600">
//                             ₹{(item.annualCTC || 0).toLocaleString("en-IN")}
//                           </div>
//                           <span className="text-[11px] text-slate-400">per annum</span>
//                         </td>

//                         <td className="py-4 px-6 whitespace-nowrap">
//                           <span
//                             className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${item.status === "Active"
//                               ? "bg-emerald-50 text-emerald-700 border-emerald-200"
//                               : "bg-amber-50 text-amber-700 border-amber-200"
//                               }`}
//                           >
//                             <span
//                               className={`w-1.5 h-1.5 rounded-full ${item.status === "Active" ? "bg-emerald-500" : "bg-amber-500"
//                                 }`}
//                             />
//                             <span>{item.status || "Active"}</span>
//                           </span>
//                         </td>

//                         <td className="py-4 px-6 text-right whitespace-nowrap">
//                           <div className="flex items-center justify-end gap-1.5">
//                             <button
//                               onClick={() => openModal(item)}
//                               className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 transition"
//                               title="Edit salary assignment"
//                             >
//                               <Edit3 className="w-3.5 h-3.5 text-slate-500" />
//                               <span>Edit</span>
//                             </button>
//                             <button
//                               disabled={isDeleting}
//                               onClick={() => handleDelete(id)}
//                               className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-lg text-xs font-semibold border border-slate-200 hover:border-rose-200 transition disabled:opacity-40"
//                               title="Delete salary record"
//                             >
//                               <Trash2 className="w-3.5 h-3.5" />
//                               <span>Delete</span>
//                             </button>
//                           </div>
//                         </td>
//                       </tr>
//                     );
//                   })}
//                 </tbody>
//               </table>
//             </div>

//             {/* Mobile Cards */}
//             <div className="md:hidden divide-y divide-slate-100">
//               {filtered.map((item) => {
//                 const id = item._id || item.id;
//                 const isDeleting = deletingId === id;
//                 const empName = item.employee?.name || item.employee?.fullName || item.userName || "Unknown";
//                 const empCode = item.employee?.employeeId || item.employee?.code || item.userId || "";
//                 const structureName = item.salaryStructure?.name || item.structureName || "Default";

//                 return (
//                   <div key={id} className="p-4 space-y-3 bg-white hover:bg-slate-50/50 transition">
//                     <div className="flex items-start justify-between gap-2">
//                       <div>
//                         <h4 className="font-semibold text-slate-900 text-sm">{empName}</h4>
//                         {empCode && <p className="text-[11px] text-slate-400">{empCode}</p>}
//                       </div>
//                       <div className="flex items-center gap-1">
//                         <button
//                           onClick={() => openModal(item)}
//                           className="p-1.5 text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
//                           title="Edit"
//                         >
//                           <Edit3 className="w-3.5 h-3.5" />
//                         </button>
//                         <button
//                           disabled={isDeleting}
//                           onClick={() => handleDelete(id)}
//                           className="p-1.5 text-slate-600 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 rounded-lg border border-slate-200 hover:border-rose-200 transition disabled:opacity-40"
//                           title="Delete"
//                         >
//                           <Trash2 className="w-3.5 h-3.5" />
//                         </button>
//                       </div>
//                     </div>

//                     <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5 text-xs">
//                       <div className="flex justify-between items-center text-slate-600">
//                         <span>Structure:</span>
//                         <span className="font-semibold text-slate-800">{structureName}</span>
//                       </div>
//                       <div className="flex justify-between items-center text-slate-600">
//                         <span>Monthly Gross:</span>
//                         <span className="font-semibold text-slate-800">
//                           ₹{(item.grossMonthly || 0).toLocaleString("en-IN")}
//                         </span>
//                       </div>
//                       <div className="flex justify-between items-center text-slate-600">
//                         <span>Annual CTC:</span>
//                         <span className="font-bold text-indigo-600">
//                           ₹{(item.annualCTC || 0).toLocaleString("en-IN")}
//                         </span>
//                       </div>
//                     </div>
//                   </div>
//                 );
//               })}
//             </div>
//           </>
//         )}
//       </div>

//       {/* Salary Mapping & Assignment Modal */}
//       {showModal && (
//         <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
//           <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
//             <div className="flex justify-between items-center border-b border-slate-100 pb-3">
//               <div className="flex items-center gap-2">
//                 <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
//                   <Coins className="w-4 h-4" />
//                 </div>
//                 <h3 className="font-bold text-slate-900 text-base">
//                   {editingId ? "Update Salary Assignment" : "Assign Salary"}
//                 </h3>
//               </div>
//               <button
//                 onClick={() => setShowModal(false)}
//                 className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition"
//               >
//                 <X className="w-5 h-5" />
//               </button>
//             </div>

//             <form onSubmit={handleSave} className="space-y-3.5 text-xs">
//               {/* Select Employee Dropdown */}
//               <div>
//                 <label className="font-semibold text-slate-700 block mb-1">
//                   Select Employee ({employees.length} Available)
//                 </label>
//                 <div className="relative">
//                   <select
//                     required
//                     value={form.employeeId}
//                     onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
//                     className="w-full p-2.5 pr-8 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer appearance-none transition"
//                   >
//                     <option value="">
//                       {dropdownLoading
//                         ? "-- Loading Employees... --"
//                         : employees.length === 0
//                           ? "-- No Employees Found --"
//                           : "-- Choose Employee --"}
//                     </option>
//                     {employees.map((emp) => {
//                       const empId = emp._id || emp.id;
//                       const empName = emp.name || emp.fullName || emp.user?.name || emp.userName || "Unnamed Employee";
//                       const empCode = emp.employeeId || emp.code || emp.email || "";

//                       return (
//                         <option key={empId} value={empId}>
//                           {empName} {empCode ? `(${empCode})` : ""}
//                         </option>
//                       );
//                     })}
//                   </select>
//                   <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
//                     <ChevronDown className="w-4 h-4" />
//                   </div>
//                 </div>
//               </div>

//               {/* Salary Structure Template Dropdown */}
//               <div>
//                 <label className="font-semibold text-slate-700 block mb-1">
//                   Salary Structure Template
//                 </label>
//                 <div className="relative">
//                   <select
//                     value={form.salaryStructureId}
//                     onChange={(e) => setForm({ ...form, salaryStructureId: e.target.value })}
//                     className="w-full p-2.5 pr-8 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer appearance-none transition"
//                   >
//                     <option value="">-- Standard / Default Structure --</option>
//                     {structures.map((st) => {
//                       const stId = st._id || st.id;
//                       return (
//                         <option key={stId} value={stId}>
//                           {st.name} (Basic: {st.basicPercent}%)
//                         </option>
//                       );
//                     })}
//                   </select>
//                   <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
//                     <ChevronDown className="w-4 h-4" />
//                   </div>
//                 </div>
//               </div>

//               {/* Annual CTC Input */}
//               <div>
//                 <label className="font-semibold text-slate-700 block mb-1">
//                   Annual Cost to Company (CTC in ₹)
//                 </label>
//                 <input
//                   type="number"
//                   min="10000"
//                   step="1000"
//                   required
//                   placeholder="e.g. 600000"
//                   value={form.annualCTC}
//                   onChange={(e) => setForm({ ...form, annualCTC: e.target.value })}
//                   className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
//                 />
//                 {Number(form.annualCTC) > 0 && (
//                   <p className="text-[11px] text-emerald-600 font-semibold mt-1">
//                     ≈ Monthly Gross: ₹{Math.round(Number(form.annualCTC) / 12).toLocaleString("en-IN")}
//                   </p>
//                 )}
//               </div>

//               {/* Status Select */}
//               <div>
//                 <label className="font-semibold text-slate-700 block mb-1">Status</label>
//                 <div className="relative">
//                   <select
//                     value={form.status}
//                     onChange={(e) => setForm({ ...form, status: e.target.value })}
//                     className="w-full p-2.5 pr-8 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer appearance-none transition"
//                   >
//                     <option value="Active">Active</option>
//                     <option value="Inactive">Inactive</option>
//                     <option value="On Hold">On Hold</option>
//                   </select>
//                   <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
//                     <ChevronDown className="w-4 h-4" />
//                   </div>
//                 </div>
//               </div>

//               {/* Action Buttons */}
//               <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
//                 <button
//                   type="button"
//                   onClick={() => setShowModal(false)}
//                   className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
//                 >
//                   Cancel
//                 </button>
//                 <button
//                   type="submit"
//                   disabled={submitting}
//                   className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold rounded-xl shadow-xs transition disabled:opacity-50"
//                 >
//                   {submitting ? "Saving..." : editingId ? "Update Mapping" : "Save Mapping"}
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }