"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  Loader2, CalendarCheck, User, Clock, Calendar, ArrowRight, Plus, X,
  RefreshCw, Trash2, Edit3, Filter, Search, ChevronDown, Check, Moon,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Button from "@/components/ui/Button";

/* ---------------- Helpers ---------------- */

// Local (IST etc.) date, not UTC — midnight ke baad galat date nahi aayegi
const toLocalISO = (d = new Date()) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split("T")[0];

const addDays = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return toLocalISO(d);
};

const dateToInput = (v) => {
  if (!v) return toLocalISO();
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  return toLocalISO(new Date(v));
};

const formatDate = (v) => {
  if (!v) return "—";
  const [y, m, d] = dateToInput(v).split("-");
  return `${d}/${m}/${y}`;
};

const to12h = (t) => {
  if (!t || !t.includes(":")) return t || "--";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};

// ⚙️ Agar aapke Employee model mein ID ka field alag naam ka hai to yahan add karein
const getEmpCode = (e) =>
  e?.employeeId ||
  e?.empId ||
  e?.employeeCode ||
  e?.employee_id ||
  e?.empCode ||
  e?.code ||
  (e?._id ? String(e._id).slice(-6).toUpperCase() : "—");

const getInitials = (name = "") =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";

const inputCls =
  "w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-800 font-medium bg-slate-50/60 outline-none transition-all duration-200 hover:border-slate-300 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100";
const labelCls = "text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5";

/* ---------------- Searchable Employee Picker (Name + ID) ---------------- */

function EmployeePicker({ employees, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef(null);

  const selected = employees.find((e) => e._id === value);

  useEffect(() => {
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, []);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter(
      (e) => (e.name || "").toLowerCase().includes(q) || String(getEmpCode(e)).toLowerCase().includes(q)
    );
  }, [employees, query]);

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`${inputCls} flex items-center justify-between gap-3 text-left cursor-pointer ${open ? "!border-indigo-500 !ring-4 !ring-indigo-100 !bg-white" : ""}`}
      >
        {selected ? (
          <span className="flex items-center gap-2.5 min-w-0">
            <span className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 text-[11px] font-bold flex items-center justify-center shrink-0">
              {getInitials(selected.name)}
            </span>
            <span className="truncate">
              {selected.name || "Staff Member"}{" "}
              <span className="text-indigo-600 font-bold">({getEmpCode(selected)})</span>
            </span>
          </span>
        ) : (
          <span className="text-slate-400">Choose an employee</span>
        )}
        <ChevronDown size={16} className={`text-slate-400 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-40 mt-2 w-full bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden sa-pop">
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or ID"
                className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl bg-slate-50 border border-transparent outline-none focus:bg-white focus:border-indigo-400"
              />
            </div>
          </div>
          <ul className="max-h-56 overflow-y-auto py-1 overscroll-contain">
            {list.length === 0 ? (
              <li className="px-4 py-6 text-center text-xs text-slate-400 font-medium">No employee found</li>
            ) : (
              list.map((emp) => {
                const active = emp._id === value;
                return (
                  <li key={emp._id}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(emp._id);
                        setOpen(false);
                        setQuery("");
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors cursor-pointer ${active ? "bg-indigo-50" : "hover:bg-slate-50"
                        }`}
                    >
                      <span className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">
                        {getInitials(emp.name)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-slate-800 truncate">{emp.name || "Staff Member"}</span>
                        <span className="block text-[11px] font-bold text-indigo-600">ID: {getEmpCode(emp)}</span>
                      </span>
                      {active && <Check size={16} className="text-indigo-600 shrink-0" />}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ---------------- Page ---------------- */

export default function ShiftAssignmentPage() {
  const [employees, setEmployees] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  const [startDate, setStartDate] = useState(toLocalISO());
  const [endDate, setEndDate] = useState(addDays(7));

  const emptyForm = () => ({ employee: "", shift: "", date: toLocalISO() });
  const [form, setForm] = useState(emptyForm());

  const extractList = useCallback((resData) => {
    if (!resData) return [];
    if (Array.isArray(resData)) return resData;
    if (Array.isArray(resData?.data)) return resData.data;
    if (Array.isArray(resData?.data?.records)) return resData.data.records;
    if (Array.isArray(resData?.records)) return resData.records;
    if (Array.isArray(resData?.assignments)) return resData.assignments;
    return [];
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [empRes, shiftRes, assignRes] = await Promise.all([
        api.get("/employees").catch(() => ({ data: [] })),
        api.get("/shifts").catch(() => ({ data: [] })),
        api
          .get("/shifts/roster", { params: { startDate, endDate } })
          .catch(() => api.get("/shifts/assignments").catch(() => ({ data: [] }))),
      ]);
      setEmployees(extractList(empRes.data));
      setShifts(extractList(shiftRes.data));
      setAssignments(extractList(assignRes.data));
    } catch {
      toast.error("Failed to load shift assignment & roster data.");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, extractList]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Modal: Esc se band + background scroll lock
  useEffect(() => {
    if (!isModalOpen) return;
    const onKey = (e) => e.key === "Escape" && !submitting && setIsModalOpen(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [isModalOpen, submitting]);

  const empMap = useMemo(() => Object.fromEntries(employees.map((e) => [e._id || e.id, e])), [employees]);
  const shiftMap = useMemo(() => Object.fromEntries(shifts.map((s) => [s._id || s.id, s])), [shifts]);

  // Assignment ke employee/shift ko full object mein resolve karo (name + ID dikhane ke liye)
  const resolve = (ref, map) => {
    const base = ref && typeof ref === "object" ? ref : null;
    const id = base ? base._id || base.id : ref;
    return { ...(map[id] || {}), ...(base || {}) };
  };

  const rows = useMemo(
    () =>
      assignments
        .map((item, idx) => ({
          key: item._id || item.id || idx,
          raw: item,
          emp: resolve(item.employee, empMap),
          shift: resolve(item.shift, shiftMap),
          date: item.date,
        }))
        .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [assignments, empMap, shiftMap]
  );

  const filteredRows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        (r.emp.name || "").toLowerCase().includes(q) ||
        String(getEmpCode(r.emp)).toLowerCase().includes(q) ||
        (r.shift.name || "").toLowerCase().includes(q)
    );
  }, [rows, searchTerm]);

  const handleStartChange = (v) => {
    setStartDate(v);
    if (v && endDate && v > endDate) setEndDate(v);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setIsModalOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row.key);
    setForm({
      employee: row.emp._id || row.emp.id || "",
      shift: row.shift._id || row.shift.id || "",
      date: dateToInput(row.date),
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (!submitting) setIsModalOpen(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.employee) return toast.error("Please select an employee.");
    if (!form.shift) return toast.error("Please select a shift template.");

    setSubmitting(true);
    try {
      if (editingId) {
        await api.put(`/shifts/assignments/${editingId}`, form);
        toast.success("Shift assignment updated successfully.");
      } else {
        await api.post("/shifts/assign", form);
        toast.success("Shift assigned successfully to the employee.");
      }
      setIsModalOpen(false);
      setEditingId(null);
      setForm(emptyForm());
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save shift assignment.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to remove this shift assignment?")) return;
    setDeletingId(id);
    try {
      await api.delete(`/shifts/assignments/${id}`);
      toast.success("Shift assignment removed successfully.");
      setAssignments((prev) => prev.filter((item) => (item._id || item.id) !== id));
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete assignment.");
    } finally {
      setDeletingId(null);
    }
  };

  /* ---- small render helpers ---- */
  const EmployeeCell = ({ emp }) => (
    <div className="flex items-center gap-3 min-w-0">
      <span className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">
        {getInitials(emp.name)}
      </span>
      <div className="min-w-0">
        <p className="font-bold text-slate-900 truncate">{emp.name || "Staff Member"}</p>
        <p className="text-[11px] font-bold text-indigo-600">ID: {getEmpCode(emp)}</p>
      </div>
    </div>
  );

  const ShiftBadge = ({ shift }) => (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold border ${shift.isNightShift
        ? "bg-violet-50 text-violet-700 border-violet-100"
        : "bg-indigo-50 text-indigo-700 border-indigo-100"
        }`}
    >
      {shift.isNightShift && <Moon size={12} />}
      {shift.name || "Standard Shift"}
    </span>
  );

  const timing = (s) => (s.startTime && s.endTime ? `${to12h(s.startTime)} – ${to12h(s.endTime)}` : "—");

  const ActionButtons = ({ row, full = false }) => (
    <div className={`flex items-center gap-2 ${full ? "w-full" : "justify-end"}`}>
      <button
        type="button"
        onClick={() => openEdit(row)}
        className={`${full ? "flex-1" : ""} inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-indigo-600 hover:text-white rounded-xl transition-all duration-200 active:scale-95 cursor-pointer group/e`}
      >
        <Edit3 size={14} className="transition-transform duration-200 group-hover/e:rotate-12" /> Edit
      </button>
      <button
        type="button"
        onClick={() => handleDelete(row.key)}
        disabled={deletingId === row.key}
        className={`${full ? "flex-1" : ""} inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-600 hover:text-white border border-rose-100 rounded-xl transition-all duration-200 active:scale-95 disabled:opacity-60 cursor-pointer`}
      >
        {deletingId === row.key ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Remove
      </button>
    </div>
  );

  return (
    <div className="max-w-[1500px] mx-auto space-y-4 sm:space-y-5 px-3 sm:px-6 py-4 pb-10 font-sans antialiased text-slate-900">
      <style>{`
        @keyframes sa-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes sa-up { from { opacity: 0; transform: translateY(24px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes sa-pop { from { opacity: 0; transform: translateY(-6px) scale(.98) } to { opacity: 1; transform: translateY(0) scale(1) } }
        .sa-fade { animation: sa-fade .18s ease-out }
        .sa-up { animation: sa-up .25s cubic-bezier(.16,1,.3,1) }
        .sa-pop { animation: sa-pop .14s ease-out }
      `}</style>

      {/* Header */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight">Shift Roster & Assignments</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Manage shift schedules, date range rosters, and employee allocations seamlessly.
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-2xl transition-all active:scale-95 cursor-pointer shrink-0"
              title="Refresh Roster"
            >
              <RefreshCw size={16} className={loading ? "animate-spin text-indigo-600" : ""} />
            </button>
            <button
              type="button"
              onClick={openCreate}
              className="flex-1 lg:flex-none inline-flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-2xl shadow-md shadow-indigo-600/20 hover:shadow-lg transition-all duration-300 active:scale-95 cursor-pointer group"
            >
              <Plus size={16} className="transition-transform duration-300 group-hover:rotate-90" /> Assign Shift
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by employee name, ID or shift"
              className="w-full pl-10 pr-9 py-2.5 text-sm font-medium rounded-xl border border-slate-200 bg-slate-50/60 outline-none transition-all hover:border-slate-300 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
            <Filter size={14} className="text-indigo-600 ml-1.5 shrink-0 hidden sm:block" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => handleStartChange(e.target.value)}
              className="flex-1 min-w-0 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium bg-white outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            />
            <span className="text-slate-400 text-xs font-medium shrink-0">to</span>
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="flex-1 min-w-0 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium bg-white outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading && assignments.length === 0 ? (
          <div className="divide-y divide-slate-100">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="p-4 sm:p-5 flex items-center gap-4 animate-pulse">
                <div className="w-10 h-10 rounded-xl bg-slate-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-1/3 bg-slate-100 rounded" />
                  <div className="h-3 w-1/5 bg-slate-100 rounded" />
                </div>
                <div className="h-6 w-20 bg-slate-100 rounded-xl hidden sm:block" />
              </div>
            ))}
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="py-16 sm:py-20 px-4 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto text-indigo-500">
              <CalendarCheck size={24} />
            </div>
            <p className="text-sm font-bold text-slate-800">No shift assignments found</p>
            <p className="text-xs text-slate-400">
              {searchTerm ? "Try a different search." : <>Click &quot;Assign Shift&quot; above or adjust your date filter range.</>}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop / tablet table */}
            <div className={`hidden md:block overflow-x-auto transition-opacity duration-200 ${loading ? "opacity-60" : ""}`}>
              <table className="w-full text-left text-sm text-slate-600 border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Employee</th>
                    <th className="px-6 py-4">Shift</th>
                    <th className="px-6 py-4">Timing</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRows.map((row) => (
                    <tr key={row.key} className="hover:bg-indigo-50/40 transition-colors duration-200">
                      <td className="px-6 py-3.5"><EmployeeCell emp={row.emp} /></td>
                      <td className="px-6 py-3.5 whitespace-nowrap"><ShiftBadge shift={row.shift} /></td>
                      <td className="px-6 py-3.5 font-medium text-slate-700 whitespace-nowrap">{timing(row.shift)}</td>
                      <td className="px-6 py-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                          <Calendar size={13} className="text-indigo-500 shrink-0" />
                          {formatDate(row.date)}
                        </span>
                      </td>
                      <td className="px-6 py-3.5"><ActionButtons row={row} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className={`md:hidden divide-y divide-slate-100 transition-opacity duration-200 ${loading ? "opacity-60" : ""}`}>
              {filteredRows.map((row) => (
                <div key={row.key} className="p-4 space-y-3 active:bg-indigo-50/40 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <EmployeeCell emp={row.emp} />
                    <ShiftBadge shift={row.shift} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-100">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Timing</p>
                      <p className="mt-0.5 font-semibold text-slate-700">{timing(row.shift)}</p>
                    </div>
                    <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-100">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Date</p>
                      <p className="mt-0.5 font-semibold text-slate-700">{formatDate(row.date)}</p>
                    </div>
                  </div>
                  <ActionButtons row={row} full />
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Create / Edit Modal (mobile par bottom sheet) */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6 bg-slate-900/50 backdrop-blur-sm sa-fade"
          onClick={closeModal}
        >
          <div
            className="w-full sm:max-w-xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] sa-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 sm:py-5 border-b border-slate-100 bg-slate-50/70 rounded-t-3xl">
              <div className="min-w-0">
                <h3 className="text-base font-bold text-slate-900">
                  {editingId ? "Edit Shift Assignment" : "Assign Shift Schedule"}
                </h3>
                <p className="text-xs text-slate-400">Select employee, shift template and date</p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex flex-col min-h-0">
              <div className="p-5 sm:p-6 overflow-y-auto space-y-4 min-h-[22rem]">
                <div className="space-y-1.5">
                  <label className={labelCls}><User size={14} className="text-indigo-600" /> Select Employee</label>
                  <EmployeePicker
                    employees={employees}
                    value={form.employee}
                    onChange={(id) => setForm({ ...form, employee: id })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className={labelCls}><Clock size={14} className="text-indigo-600" /> Select Shift Template</label>
                  <div className="relative">
                    <select
                      required
                      value={form.shift}
                      onChange={(e) => setForm({ ...form, shift: e.target.value })}
                      className={`${inputCls} appearance-none pr-10 cursor-pointer`}
                    >
                      <option value="">Choose a shift template</option>
                      {shifts.map((s) => (
                        <option key={s._id} value={s._id}>
                          {s.name} ({to12h(s.startTime)} – {to12h(s.endTime)}){s.isNightShift ? " 🌙 Night" : ""}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className={labelCls}><Calendar size={14} className="text-indigo-600" /> Assignment Date</label>
                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className={`${inputCls} cursor-pointer`}
                  />
                </div>
              </div>

              <div className="px-5 sm:px-6 py-4 border-t border-slate-100 bg-white flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 sm:gap-3 rounded-b-3xl">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  className="px-5 py-3 sm:py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition-all active:scale-95 cursor-pointer"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  loading={submitting}
                  className="px-6 py-3 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-md shadow-indigo-600/20 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CalendarCheck size={16} /> {editingId ? "Update Assignment" : "Assign Shift"} <ArrowRight size={14} />
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}