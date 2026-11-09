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

/* colours of the salary parts (used in every bar and legend) */
const PARTS = [
  ["basic", "Basic", "bg-indigo-500"],
  ["hra", "HRA", "bg-sky-500"],
  ["da", "DA", "bg-amber-500"],
  ["special", "Special", "bg-emerald-500"],
];

/* ---- helpers (they work even if the API sends fields under another name) ---- */
const idOf = (v) => (v && typeof v === "object" ? v._id : v) || "";
const nameOf = (e = {}) =>
  e.name ||
  e.fullName ||
  e.employeeName ||
  [e.firstName, e.middleName, e.lastName].filter(Boolean).join(" ") ||
  e.user?.name ||
  (e.email || e.loginEmail || "").split("@")[0] ||
  "Unnamed employee";
const codeOf = (e = {}) => e.employeeId || e.empId || e.employeeCode || e.code || "";
const isDefault = (r) => !idOf(r.salaryStructure);
const noSalary = (r) => !(Number(r.grossMonthly) > 0);
const asList = (d, keys) => (Array.isArray(d) ? d : keys.map((k) => d?.[k]).find(Array.isArray) || []);

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

/* stacked bar: how the monthly salary is divided */
function BreakupBar({ b, className = "h-2" }) {
  const total = PARTS.reduce((s, [k]) => s + Math.max(0, b[k]), 0) || 1;
  return (
    <div className={`flex w-full overflow-hidden rounded-full bg-slate-100 ${className}`}>
      {PARTS.map(([k, label, color]) =>
        b[k] > 0 ? <div key={k} className={color} style={{ width: `${(Math.max(0, b[k]) / total) * 100}%` }} title={`${label} ${rupee(b[k])}`} /> : null
      )}
    </div>
  );
}

function Legend({ b }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1">
      {PARTS.map(([k, label, color]) =>
        b[k] > 0 ? (
          <span key={k} className="inline-flex items-center gap-1 text-[11px] text-slate-500">
            <span className={`w-2 h-2 rounded-full ${color}`} />
            {label} <b className="text-slate-700 font-semibold">{rupeeShort(b[k])}</b>
          </span>
        ) : null
      )}
    </div>
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
  const [salaryRows, setSalaryRows] = useState([]);
  const [employees, setEmployees] = useState([]);
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
    const [salaryRes, structRes, empRes] = await Promise.allSettled([
      api.get("/payroll/employee-salaries"),
      api.get("/payroll/structures"),
      api.get("/employees"),
    ]);

    if (salaryRes.status === "fulfilled") setSalaryRows(asList(salaryRes.value.data, ["salaries", "employeeSalaries", "data", "rows"]));
    else setError(salaryRes.reason?.response?.data?.message || "Unable to load the salary list. Please try again.");

    if (structRes.status === "fulfilled") setStructures(asList(structRes.value.data, ["structures", "data"]));
    if (empRes.status === "fulfilled") setEmployees(asList(empRes.value.data, ["employees", "data"]));

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /* One row per active employee: the saved salary record if there is one, otherwise an empty row.
     This is why the employee list and the names always show, even if the salary API sends little. */
  const rows = useMemo(() => {
    const saved = new Map(salaryRows.map((r) => [String(idOf(r.employee)), r]));
    const out = new Map();

    employees
      .filter((e) => !/^(inactive|exited|exit|terminated)$/i.test(e.employeeStatus || ""))
      .forEach((emp) => {
        const id = String(idOf(emp));
        const rec = saved.get(id);
        const recEmp = rec && typeof rec.employee === "object" ? rec.employee : {};
        out.set(
          id,
          rec
            ? { ...rec, employee: { ...recEmp, ...emp } }
            : { employee: emp, grossMonthly: Number(emp.grossMonthly ?? emp.salary ?? emp.monthlySalary ?? 0) || 0, status: "Active", salaryStructure: null }
        );
      });

    salaryRows.forEach((r) => {
      const id = String(idOf(r.employee));
      if (id && !out.has(id)) out.set(id, typeof r.employee === "object" ? r : { ...r, employee: { _id: r.employee } });
    });

    return [...out.values()];
  }, [salaryRows, employees]);

  const defaultStructure = structures.find((s) => s.isDefault) || null;

  /* The structure a row really uses, and its monthly breakup */
  const structureOf = (r) => structures.find((s) => String(s._id) === String(idOf(r.salaryStructure) || idOf(r.effectiveStructure))) || defaultStructure || null;
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

  /* employees per structure (for the structure cards) */
  const usage = useMemo(() => {
    const m = {};
    rows.forEach((r) => {
      const s = structures.find((x) => String(x._id) === String(idOf(r.salaryStructure) || idOf(r.effectiveStructure))) || defaultStructure;
      if (s) m[s._id] = (m[s._id] || 0) + 1;
    });
    return m;
  }, [rows, structures, defaultStructure]);

  /* ---- modal ---- */
  const fillFrom = (r) => ({
    employeeId: String(idOf(r?.employee)),
    structureId: String(idOf(r?.salaryStructure)),
    salary: r && Number(r.grossMonthly) > 0 ? String(r.grossMonthly) : "",
    status: r?.status || "Active",
  });

  const openModal = (row = null) => {
    setForm(fillFrom(row));
    setErrors({});
    setModal({ row });
  };

  const pickEmployee = (id) => {
    const r = rows.find((x) => String(idOf(x.employee)) === id);
    setForm(r ? fillFrom(r) : { employeeId: "", structureId: "", salary: "", status: "Active" });
    setErrors({});
  };

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const chosen = structures.find((s) => String(s._id) === form.structureId) || defaultStructure;
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

  /* ---- cells ---- */
  const percentText = (st) =>
    st
      ? [`Basic ${st.basicPercent || 0}%`, st.hraPercent ? `HRA ${st.hraPercent}%` : "", st.daPercent ? `DA ${st.daPercent}%` : ""].filter(Boolean).join(" · ")
      : "All Basic";

  const structureCell = (r) => {
    const st = structureOf(r);
    return (
      <div className="min-w-0">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 max-w-full">
          <Layers className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="truncate">{st?.name || "Basic only"}</span>
          {isDefault(r) && st && <span className="text-[10px] font-bold text-indigo-600">DEFAULT</span>}
        </span>
        <p className="text-[10px] text-slate-400 mt-1 truncate">{percentText(st)}</p>
      </div>
    );
  };

  const actions = (r) => {
    const items = [{ label: (r._id || !noSalary(r)) ? "Edit salary" : "Assign salary", icon: Edit3, onClick: () => openModal(r) }];
    if (r._id) items.push({ label: "Remove assignment", icon: Trash2, danger: true, onClick: () => removeAssignment(r) });
    return <ActionMenu items={items} />;
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

      {/* Salary structures */}
      {!loading && structures.length > 0 && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Salary structures</p>
            <span className="text-[11px] text-slate-400">{structures.length} total</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {structures.map((s) => {
              const pct = splitSalary(100, s); // on 100 the amounts are the percentages
              return (
                <div key={s._id} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3.5 hover:border-indigo-200 hover:bg-white transition">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-8 h-8 shrink-0 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><Layers className="w-4 h-4" /></span>
                      <p className="text-sm font-bold text-slate-900 truncate">{s.name}</p>
                    </div>
                    {s.isDefault && <span className="shrink-0 text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">DEFAULT</span>}
                  </div>
                  <div className="mt-3"><BreakupBar b={pct} /></div>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                    {PARTS.map(([k, label, color]) =>
                      pct[k] > 0 ? (
                        <span key={k} className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                          <span className={`w-2 h-2 rounded-full ${color}`} />{label} <b className="text-slate-700 font-semibold">{round2(pct[k])}%</b>
                        </span>
                      ) : null
                    )}
                  </div>
                  <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{[s.pfPercent ? `PF ${s.pfPercent}%` : "", s.esiPercent ? `ESI ${s.esiPercent}%` : ""].filter(Boolean).join(" · ") || "No PF / ESI"}</span>
                    <span className="font-semibold text-slate-600">{usage[s._id] || 0} employee{(usage[s._id] || 0) === 1 ? "" : "s"}</span>
                  </div>
                </div>
              );
            })}
          </div>
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
                const b = breakupOf(r);
                return (
                  <div key={idOf(e)} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
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

                    <div className="flex flex-wrap items-start gap-2">
                      {structureCell(r)}
                      <StatusPill status={r.status} />
                    </div>

                    {noSalary(r) ? (
                      <p className="rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold px-3 py-2">Monthly salary is not set.</p>
                    ) : (
                      <div className="space-y-2.5">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded-xl bg-slate-50 p-2.5"><p className="text-[10px] font-bold uppercase text-slate-400">Monthly</p><p className="font-bold text-slate-900">{rupeeShort(r.grossMonthly)}</p></div>
                          <div className="rounded-xl bg-slate-50 p-2.5"><p className="text-[10px] font-bold uppercase text-slate-400">Annual</p><p className="font-bold text-indigo-600">{rupeeShort(Number(r.annualCTC) || r.grossMonthly * 12)}</p></div>
                        </div>
                        <BreakupBar b={b} />
                        <Legend b={b} />
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
                    const b = breakupOf(r);
                    return (
                      <tr key={idOf(e)} className="hover:bg-indigo-50/40 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <Avatar name={nameOf(e)} />
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900 text-sm truncate max-w-[200px]">{nameOf(e)}</p>
                              <p className="text-[11px] text-slate-400 truncate max-w-[200px]">{[codeOf(e), cleanText(e.department)].filter(Boolean).join(" • ") || "—"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 max-w-[190px]">{structureCell(r)}</td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {noSalary(r) ? <span className="text-amber-600 font-bold">Not set</span> : <span className="font-bold text-slate-900 text-sm">{rupee(r.grossMonthly)}</span>}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap font-bold text-indigo-600">{noSalary(r) ? "—" : rupeeShort(Number(r.annualCTC) || r.grossMonthly * 12)}</td>
                        <td className="px-4 py-3.5 w-[260px]">
                          {noSalary(r) ? "—" : (
                            <div className="space-y-1.5">
                              <BreakupBar b={b} />
                              <Legend b={b} />
                            </div>
                          )}
                        </td>
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
                      <p className="text-[11px] text-slate-500">{[codeOf(modal.row.employee), cleanText(modal.row.employee?.department)].filter(Boolean).join(" • ") || "—"}</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <select value={form.employeeId} onChange={(e) => pickEmployee(e.target.value)} className={`${inputClass} cursor-pointer ${fieldBorder(errors.employeeId)}`}>
                      <option value="">{rows.length ? "Select employee" : "No employee found"}</option>
                      {[...rows]
                        .sort((a, b) => nameOf(a.employee).localeCompare(nameOf(b.employee)))
                        .map((r) => (
                          <option key={idOf(r.employee)} value={String(idOf(r.employee))}>
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

              {/* what the chosen structure is made of */}
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-3.5">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <p className="text-xs font-bold text-slate-900">{chosen ? chosen.name : "No structure (all Basic)"}</p>
                  {chosen?.isDefault && <span className="text-[10px] font-bold text-indigo-600">DEFAULT</span>}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {chosen
                    ? [`Basic ${chosen.basicPercent || 0}%`, chosen.hraPercent ? `HRA ${chosen.hraPercent}%` : "", chosen.daPercent ? `DA ${chosen.daPercent}%` : "", "rest is Special", chosen.pfPercent ? `PF ${chosen.pfPercent}% of Basic` : "", chosen.esiPercent ? `ESI ${chosen.esiPercent}%` : ""].filter(Boolean).join(" · ")
                    : "The full salary is paid as Basic. No allowances or deductions."}
                </p>
              </div>

              {grossNow > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Monthly breakup</p>
                  <BreakupBar b={preview} className="h-2.5" />
                  <div className="space-y-1.5 text-xs">
                    {PARTS.filter(([k]) => k !== "da" || preview.da > 0).map(([k, label, color]) => (
                      <div key={k} className="flex justify-between">
                        <span className="text-slate-600 inline-flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${color}`} />{{ basic: "Basic", hra: "House Rent Allowance", da: "Dearness Allowance", special: "Special Allowance" }[k]}</span>
                        <span className="font-mono font-bold text-slate-900">{rupee(preview[k])}</span>
                      </div>
                    ))}
                    {(preview.pf > 0 || preview.esi > 0) && (
                      <div className="pt-1.5 mt-1.5 border-t border-slate-200 space-y-1.5">
                        {preview.pf > 0 && <div className="flex justify-between"><span className="text-slate-600">PF (estimate)</span><span className="font-mono font-bold text-rose-600">- {rupee(preview.pf)}</span></div>}
                        {preview.esi > 0 && <div className="flex justify-between"><span className="text-slate-600">ESI (estimate)</span><span className="font-mono font-bold text-rose-600">- {rupee(preview.esi)}</span></div>}
                        <div className="flex justify-between pt-1.5 border-t border-dashed border-slate-300">
                          <span className="font-bold text-slate-700">Take-home (estimate)</span>
                          <span className="font-mono font-extrabold text-emerald-600">{rupee(round2(grossNow - preview.pf - preview.esi))}</span>
                        </div>
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

