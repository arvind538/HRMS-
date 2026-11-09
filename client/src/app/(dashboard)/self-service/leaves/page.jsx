"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Loader2,
  Clock,
  AlertCircle,
  X,
  ChevronRight,
  FileText,
  UserCheck,
  CalendarDays,
  CheckCircle2,
  Hourglass,
  XCircle,
  ListChecks,
  RotateCcw,
  Filter,
  MoreVertical,
  Eye,
  Edit3,
  Trash2,
  Lock,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { useAuth } from "@/context/AuthContext";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const LEAVE_TYPES = [
  { key: "casual", label: "Casual Leave", bar: "bg-indigo-500", dot: "bg-indigo-500" },
  { key: "sick", label: "Sick Leave", bar: "bg-rose-500", dot: "bg-rose-500" },
  { key: "earned", label: "Earned Leave", bar: "bg-emerald-500", dot: "bg-emerald-500" },
  { key: "unpaid", label: "Unpaid Leave", bar: "bg-slate-400", dot: "bg-slate-400" },
];

const DAY_MS = 1000 * 60 * 60 * 24;
const MENU_WIDTH = 176;

// Parse a date as a LOCAL date (avoids timezone day-shift on "YYYY-MM-DD"/ISO strings)
const toLocalDate = (value) => {
  if (!value) return null;
  if (typeof value === "string") {
    const m = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

const formatDate = (value, fallback = "—") => {
  const d = toLocalDate(value);
  return d
    ? d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : fallback;
};

// Local date -> "YYYY-MM-DD" for <input type="date">
const toInputDate = (value) => {
  const d = toLocalDate(value);
  if (!d) return "";
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
};

export default function MyLeavesPage() {
  const { user } = useAuth();
  const now = new Date();

  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Modals
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [editingLeave, setEditingLeave] = useState(null);

  // Three-dot menu state: { id, item, top, left }
  const [menu, setMenu] = useState(null);

  // Edit form
  const [editForm, setEditForm] = useState({
    leaveType: "casual",
    startDate: "",
    endDate: "",
    reason: "",
  });

  // Month / Year filter ("all" = whole year)
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [filterMonth, setFilterMonth] = useState("all");

  // Only admin / superadmin can delete
  const isAdmin = useMemo(
    () => user?.role === "admin" || user?.role === "superadmin",
    [user?.role]
  );

  const getEmployeeId = useCallback(() => {
    return user?.employee?._id || user?.employee?.id || user?.employee || user?._id || user?.id;
  }, [user]);

  const fetchData = useCallback(async () => {
    const empId = getEmployeeId();
    if (!empId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await api.get("/leave", {
        params: { employee: empId, employeeId: empId },
      });

      const rawData = res.data;
      const leaveList = Array.isArray(rawData)
        ? rawData
        : Array.isArray(rawData?.data)
          ? rawData.data
          : Array.isArray(rawData?.leaves)
            ? rawData.leaves
            : [];

      setLeaves(leaveList);
    } catch (err) {
      console.error("Fetch leave error:", err);
      toast.error("Leaves load karne mein samasya aayi.");
    } finally {
      setLoading(false);
    }
  }, [getEmployeeId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ESC closes modals + menu
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setSelectedLeave(null);
        setEditingLeave(null);
        setMenu(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close three-dot menu on outside click / scroll / resize
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [menu]);

  // Lock body scroll while a modal is open (smooth on mobile)
  useEffect(() => {
    if (!selectedLeave && !editingLeave) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [selectedLeave, editingLeave]);

  const statusVariant = {
    approved: "success",
    rejected: "danger",
    pending: "warning",
  };

  const calculateDays = (item) => {
    if (item.totalDays) return item.totalDays;
    const s = toLocalDate(item.startDate);
    const e = toLocalDate(item.endDate);
    if (s && e) {
      const days = Math.round((e - s) / DAY_MS) + 1;
      return days > 0 ? days : 1;
    }
    return 1;
  };

  const getId = (item) => item?._id || item?.id;

  // ---------- Three-dot menu ----------
  const toggleMenu = (item, id, e) => {
    e.stopPropagation();
    if (menu?.id === id) {
      setMenu(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const menuHeight = isAdmin ? 148 : 108;

    let top = rect.bottom + 6;
    if (top + menuHeight > window.innerHeight - 8) {
      top = Math.max(8, rect.top - menuHeight - 6); // flip upward if no space
    }
    const left = Math.min(
      Math.max(8, rect.right - MENU_WIDTH),
      window.innerWidth - MENU_WIDTH - 8
    );

    setMenu({ id, item, top, left });
  };

  const renderMenuButton = (item, id) => (
    <button
      type="button"
      onClick={(e) => toggleMenu(item, id, e)}
      title="Actions"
      aria-label="Actions"
      aria-haspopup="menu"
      aria-expanded={menu?.id === id}
      disabled={deletingId === id}
      className={`p-2 rounded-lg transition-all duration-150 active:scale-95 cursor-pointer disabled:opacity-50 ${menu?.id === id
        ? "bg-indigo-50 text-indigo-600"
        : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
        }`}
    >
      {deletingId === id ? (
        <Loader2 size={18} className="animate-spin text-red-600" />
      ) : (
        <MoreVertical size={18} />
      )}
    </button>
  );

  // ---------- Edit (pending only) ----------
  const handleOpenEdit = (leave, e) => {
    e?.stopPropagation?.();
    const status = (leave.status || "pending").toLowerCase();
    if (status !== "pending") {
      toast.info(`Cannot edit ${status} leave.`);
      return;
    }

    setEditingLeave(leave);
    setEditForm({
      leaveType: leave.leaveType || "casual",
      startDate: toInputDate(leave.startDate),
      endDate: toInputDate(leave.endDate),
      reason: leave.reason || "",
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    const id = getId(editingLeave);
    if (!id) {
      toast.error("Leave ID nahi mili.");
      return;
    }

    setSaving(true);
    try {
      await api.put(`/leave/${id}`, {
        leaveType: editForm.leaveType,
        startDate: editForm.startDate,
        endDate: editForm.endDate,
        reason: editForm.reason,
      });
      toast.success("Leave successfully update ho gayi!");
      setEditingLeave(null);
      fetchData();
    } catch (err) {
      console.error("Leave update error:", err);
      toast.error(err.response?.data?.message || "Leave update nahi ho saki.");
    } finally {
      setSaving(false);
    }
  };

  // ---------- Delete (admin only) ----------
  const handleDelete = async (id, status, e) => {
    e?.stopPropagation?.();

    if (!isAdmin) {
      toast.error("Sirf admin leave delete kar sakta hai.");
      return;
    }

    const label = String(status || "this").toUpperCase();
    const message =
      status === "pending"
        ? "Are you sure you want to delete this pending leave application?"
        : `Are you sure you want to delete this ${label} leave application?`;

    if (!window.confirm(message)) return;

    setDeletingId(id);
    try {
      await api.delete(`/leave/${id}`);
      toast.success("Leave record delete ho gaya.");
      setLeaves((prev) => prev.filter((l) => getId(l) !== id));
      if (selectedLeave && getId(selectedLeave) === id) setSelectedLeave(null);
    } catch (err) {
      console.error("Delete leave error:", err);
      toast.error(err.response?.data?.message || "Leave delete nahi ho saki.");
    } finally {
      setDeletingId(null);
    }
  };

  // ---------- Period / summary ----------
  const period = useMemo(() => {
    if (filterMonth === "all") {
      return {
        start: new Date(filterYear, 0, 1),
        end: new Date(filterYear, 11, 31),
        label: `${filterYear}`,
      };
    }
    return {
      start: new Date(filterYear, filterMonth, 1),
      end: new Date(filterYear, filterMonth + 1, 0),
      label: `${MONTHS[filterMonth]} ${filterYear}`,
    };
  }, [filterYear, filterMonth]);

  // Leave days that fall INSIDE the selected period
  const getPeriodDays = useCallback(
    (item) => {
      const s = toLocalDate(item.startDate);
      if (!s) return 0;
      const e = toLocalDate(item.endDate) || s;
      const from = s > period.start ? s : period.start;
      const to = e < period.end ? e : period.end;
      if (to < from) return 0;
      return Math.round((to - from) / DAY_MS) + 1;
    },
    [period]
  );

  const yearOptions = useMemo(() => {
    const set = new Set([now.getFullYear()]);
    leaves.forEach((l) => {
      const s = toLocalDate(l.startDate);
      const e = toLocalDate(l.endDate);
      if (s) set.add(s.getFullYear());
      if (e) set.add(e.getFullYear());
    });
    return Array.from(set).sort((a, b) => b - a);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaves]);

  const filteredLeaves = useMemo(() => {
    return leaves
      .filter((l) => getPeriodDays(l) > 0)
      .sort((a, b) => {
        const da = toLocalDate(a.startDate)?.getTime() || 0;
        const db = toLocalDate(b.startDate)?.getTime() || 0;
        return db - da;
      });
  }, [leaves, getPeriodDays]);

  const summary = useMemo(() => {
    const result = {
      approved: 0,
      pending: 0,
      rejected: 0,
      byType: { casual: 0, sick: 0, earned: 0, unpaid: 0 },
    };

    filteredLeaves.forEach((l) => {
      const status = (l.status || "pending").toLowerCase();
      const days = getPeriodDays(l);

      if (status === "approved") {
        result.approved += days;
        const type = (l.leaveType || "").toLowerCase();
        if (type in result.byType) result.byType[type] += days;
      } else if (status === "rejected") {
        result.rejected += days;
      } else {
        result.pending += days;
      }
    });

    return result;
  }, [filteredLeaves, getPeriodDays]);

  const isCurrentMonth =
    filterYear === now.getFullYear() && filterMonth === now.getMonth();
  const isDefaultFilter = filterYear === now.getFullYear() && filterMonth === "all";

  const summaryCards = [
    {
      label: "Leaves Taken",
      value: summary.approved,
      hint: "Approved days",
      icon: CheckCircle2,
      tone: "text-emerald-600 bg-emerald-50 border-emerald-100",
      valueTone: "text-emerald-600",
    },
    {
      label: "Pending",
      value: summary.pending,
      hint: "Awaiting approval",
      icon: Hourglass,
      tone: "text-amber-600 bg-amber-50 border-amber-100",
      valueTone: "text-amber-600",
    },
    {
      label: "Rejected",
      value: summary.rejected,
      hint: "Rejected days",
      icon: XCircle,
      tone: "text-red-600 bg-red-50 border-red-100",
      valueTone: "text-red-600",
    },
    {
      label: "Applications",
      value: filteredLeaves.length,
      hint: "In this period",
      icon: ListChecks,
      tone: "text-indigo-600 bg-indigo-50 border-indigo-100",
      valueTone: "text-indigo-600",
      noUnit: true,
    },
  ];

  const maxTypeDays = Math.max(1, ...Object.values(summary.byType));
  const empId = getEmployeeId();

  return (
    <div className="space-y-5 sm:space-y-6 max-w-7xl mx-auto pb-12 px-3 sm:px-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">My Leaves</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Apni leave history dekhein aur status track karein.
          </p>
        </div>
      </div>

      {/* Session Warning Banner */}
      {!empId && !loading && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start sm:items-center gap-3 text-amber-800">
          <AlertCircle size={20} className="text-amber-600 shrink-0" />
          <p className="text-sm">
            <strong className="font-semibold">Session Warning:</strong> Employee details nahi mil rahi hain. Kripya verify karein ki account employee profile se linked hai.
          </p>
        </div>
      )}

      {/* ===== Leave Summary (Month / Year) ===== */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-slate-800 text-base flex items-center gap-2">
              <Filter size={18} className="text-indigo-600" />
              Leave Summary
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Showing for <span className="font-semibold text-indigo-600">{period.label}</span>
            </p>
          </div>

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-center gap-2">
            <select
              value={filterMonth}
              onChange={(e) =>
                setFilterMonth(e.target.value === "all" ? "all" : Number(e.target.value))
              }
              aria-label="Select month"
              className="w-full sm:w-40 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all cursor-pointer"
            >
              <option value="all">All Months</option>
              {MONTHS.map((m, i) => (
                <option key={m} value={i}>
                  {m}
                </option>
              ))}
            </select>

            <select
              value={filterYear}
              onChange={(e) => setFilterYear(Number(e.target.value))}
              aria-label="Select year"
              className="w-full sm:w-28 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all cursor-pointer"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => {
                setFilterYear(now.getFullYear());
                setFilterMonth(now.getMonth());
              }}
              disabled={isCurrentMonth}
              className="px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              This Month
            </button>

            <button
              type="button"
              onClick={() => {
                setFilterYear(now.getFullYear());
                setFilterMonth("all");
              }}
              disabled={isDefaultFilter}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <RotateCcw size={13} /> Reset
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className="p-3.5 sm:p-4 bg-slate-50/70 border border-slate-100 rounded-xl flex items-start gap-3 transition-shadow hover:shadow-sm"
              >
                <div className={`p-2 rounded-lg border shrink-0 ${card.tone}`}>
                  <Icon size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] sm:text-xs font-medium text-slate-500 truncate">
                    {card.label}
                  </p>
                  <p className={`text-xl sm:text-2xl font-bold leading-tight mt-0.5 ${card.valueTone}`}>
                    {loading ? "–" : card.value}
                    {!card.noUnit && (
                      <span className="text-[11px] font-semibold text-slate-400 ml-1">
                        {card.value === 1 ? "day" : "days"}
                      </span>
                    )}
                  </p>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">{card.hint}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Leave type breakdown */}
        <div className="border border-slate-100 rounded-xl p-4 bg-white">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            Leave Taken by Type
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3.5">
            {LEAVE_TYPES.map((t) => {
              const days = summary.byType[t.key] || 0;
              return (
                <div key={t.key}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="flex items-center gap-2 font-medium text-slate-700">
                      <span className={`w-2 h-2 rounded-full ${t.dot}`} />
                      {t.label}
                    </span>
                    <span className="font-bold text-slate-800">
                      {days} {days === 1 ? "day" : "days"}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${t.bar} transition-all duration-500 ease-out`}
                      style={{ width: `${(days / maxTypeDays) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Leave History */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold text-slate-800 text-base flex items-center gap-2">
            <Clock size={18} className="text-indigo-600" />
            Leave History
            <span className="text-xs font-medium text-slate-400 hidden sm:inline">
              · {period.label}
            </span>
          </h3>
          <span className="text-xs font-semibold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
            Showing: {filteredLeaves.length} / {leaves.length}
          </span>
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <Loader2 className="animate-spin mx-auto text-indigo-600 h-8 w-8" />
            <p className="text-sm text-slate-400 mt-2 font-medium">Loading leaves...</p>
          </div>
        ) : filteredLeaves.length === 0 ? (
          <div className="py-14 px-4 text-center space-y-1">
            <p className="text-slate-500 text-sm font-semibold">
              {leaves.length === 0
                ? "Koi leave application abhi tak nahi hai."
                : `${period.label} mein koi leave nahi mili.`}
            </p>
            {leaves.length > 0 && (
              <p className="text-xs text-slate-400">Dusra month ya year select karke dekhein.</p>
            )}
          </div>
        ) : (
          <>
            {/* Mobile: card list */}
            <ul className="md:hidden divide-y divide-slate-100">
              {filteredLeaves.map((r, index) => {
                const itemId = getId(r) || index;
                return (
                  <li
                    key={itemId}
                    onClick={() => setSelectedLeave(r)}
                    className="p-4 flex items-start gap-2 active:bg-indigo-50/50 cursor-pointer transition-colors"
                  >
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2 font-semibold text-slate-800 capitalize">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                          {r.leaveType || "Leave"}
                        </span>
                        <Badge variant={statusVariant[(r.status || "pending").toLowerCase()] || "warning"}>
                          {r.status ? r.status.replace(/_/g, " ") : "pending"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                        <span>
                          {formatDate(r.startDate)} → {formatDate(r.endDate)}
                        </span>
                        <span className="font-semibold text-slate-700 whitespace-nowrap">
                          {calculateDays(r)} {calculateDays(r) === 1 ? "Day" : "Days"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 truncate">{r.reason || "—"}</p>
                    </div>

                    <div className="shrink-0 -mr-1" onClick={(e) => e.stopPropagation()}>
                      {renderMenuButton(r, itemId)}
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Tablet / Desktop: table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/80 border-b border-slate-200/80 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">From</th>
                    <th className="px-6 py-4">To</th>
                    <th className="px-6 py-4">Days</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredLeaves.map((r, index) => {
                    const itemId = getId(r) || index;
                    return (
                      <tr
                        key={itemId}
                        onClick={() => setSelectedLeave(r)}
                        tabIndex={0}
                        onKeyDown={(e) => e.key === "Enter" && setSelectedLeave(r)}
                        className="group cursor-pointer hover:bg-indigo-50/40 focus:bg-indigo-50/50 transition-colors duration-150 focus:outline-none"
                      >
                        <td className="px-6 py-4 font-semibold text-slate-800 group-hover:text-indigo-900 transition-colors">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-indigo-600 transition-colors"></span>
                            <span className="capitalize">{r.leaveType || "Leave"}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                          {formatDate(r.startDate)}
                        </td>
                        <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                          {formatDate(r.endDate)}
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-700 whitespace-nowrap">
                          {calculateDays(r)} {calculateDays(r) === 1 ? "Day" : "Days"}
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={statusVariant[(r.status || "pending").toLowerCase()] || "warning"}>
                            {r.status ? r.status.replace(/_/g, " ") : "pending"}
                          </Badge>
                        </td>
                        <td className="px-6 py-3 text-right whitespace-nowrap">
                          <div onClick={(e) => e.stopPropagation()}>
                            {renderMenuButton(r, itemId)}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Three-dot dropdown (fixed so it is never clipped by table overflow) */}
      {menu && (() => {
        const item = menu.item;
        const statusKey = (item.status || "pending").toLowerCase();
        const isPending = statusKey === "pending";

        return (
          <div
            role="menu"
            onClick={(e) => e.stopPropagation()}
            style={{ top: menu.top, left: menu.left, width: MENU_WIDTH }}
            className="fixed z-[60] bg-white rounded-xl border border-slate-200 shadow-xl py-1.5 animate-in fade-in zoom-in-95 duration-100"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenu(null);
                setSelectedLeave(item);
              }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors cursor-pointer"
            >
              <Eye size={16} /> View
            </button>

            <button
              type="button"
              role="menuitem"
              disabled={!isPending}
              onClick={(e) => {
                setMenu(null);
                handleOpenEdit(item, e);
              }}
              title={isPending ? "Edit leave" : `Cannot edit (${item.status})`}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm transition-colors ${isPending
                ? "text-slate-700 hover:bg-amber-50 hover:text-amber-700 cursor-pointer"
                : "text-slate-300 cursor-not-allowed"
                }`}
            >
              {isPending ? <Edit3 size={16} /> : <Lock size={16} />} Edit
            </button>

            {isAdmin && (
              <>
                <div className="my-1 border-t border-slate-100" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={(e) => {
                    setMenu(null);
                    handleDelete(menu.id, statusKey, e);
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                >
                  <Trash2 size={16} /> Delete
                </button>
              </>
            )}
          </div>
        );
      })()}

      {/* Leave Details Modal */}
      {selectedLeave && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setSelectedLeave(null)}
        >
          <div
            className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/60">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100/80 shrink-0">
                  <CalendarDays size={20} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-slate-900 leading-none capitalize truncate">
                    {selectedLeave.leaveType} Leave Application
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 truncate">
                    Application ID: {getId(selectedLeave) || "N/A"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLeave(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-sm">
              <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="text-xs font-medium text-slate-500">Current Status</span>
                <Badge variant={statusVariant[(selectedLeave.status || "pending").toLowerCase()] || "warning"}>
                  {selectedLeave.status ? selectedLeave.status.replace(/_/g, " ") : "pending"}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 bg-slate-50/70 border border-slate-100 rounded-xl">
                  <p className="text-xs text-slate-400 font-medium">From Date</p>
                  <p className="font-semibold text-slate-800 mt-1 text-xs sm:text-sm">
                    {formatDate(selectedLeave.startDate)}
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50/70 border border-slate-100 rounded-xl">
                  <p className="text-xs text-slate-400 font-medium">To Date</p>
                  <p className="font-semibold text-slate-800 mt-1 text-xs sm:text-sm">
                    {formatDate(selectedLeave.endDate)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 bg-slate-50/70 border border-slate-100 rounded-xl">
                  <p className="text-xs text-slate-400 font-medium">Total Days</p>
                  <p className="font-bold text-indigo-600 mt-1 text-base">
                    {calculateDays(selectedLeave)} Day(s)
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50/70 border border-slate-100 rounded-xl">
                  <p className="text-xs text-slate-400 font-medium">Applied On</p>
                  <p className="font-semibold text-slate-800 mt-1 text-xs">
                    {formatDate(selectedLeave.createdAt, "Recently")}
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50/70 border border-slate-100 rounded-xl">
                <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                  <FileText size={13} />
                  Reason for Leave
                </p>
                <p className="text-slate-700 mt-1 text-xs leading-relaxed whitespace-pre-line break-words">
                  {selectedLeave.reason || "No reason provided."}
                </p>
              </div>

              {(selectedLeave.approverRemarks || selectedLeave.remarks || selectedLeave.rejectionReason) && (
                <div className="p-3.5 bg-amber-50/60 border border-amber-200/60 rounded-xl">
                  <p className="text-xs text-amber-800 font-semibold flex items-center gap-1.5">
                    <UserCheck size={14} />
                    Approval / Manager Remarks
                  </p>
                  <p className="text-amber-900 mt-1 text-xs leading-relaxed break-words">
                    {selectedLeave.approverRemarks || selectedLeave.remarks || selectedLeave.rejectionReason}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
              {isAdmin ? (
                <button
                  type="button"
                  onClick={(e) =>
                    handleDelete(
                      getId(selectedLeave),
                      (selectedLeave.status || "pending").toLowerCase(),
                      e
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-xl transition-colors cursor-pointer"
                >
                  <Trash2 size={14} /> Delete
                </button>
              ) : (
                <span />
              )}

              <div className="flex items-center gap-2">
                {(selectedLeave.status || "pending").toLowerCase() === "pending" && (
                  <button
                    type="button"
                    onClick={(e) => {
                      const target = selectedLeave;
                      setSelectedLeave(null);
                      handleOpenEdit(target, e);
                    }}
                    className="px-4 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold rounded-xl hover:bg-indigo-100 transition-colors cursor-pointer"
                  >
                    Edit
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedLeave(null)}
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-100 transition-colors shadow-2xs cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Leave Modal */}
      {editingLeave && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setEditingLeave(null)}
        >
          <div
            className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Edit3 size={18} />
                </div>
                <h3 className="text-base font-bold text-slate-900">Edit Leave Application</h3>
              </div>
              <button
                onClick={() => setEditingLeave(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-4 sm:p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Leave Type</label>
                <select
                  value={editForm.leaveType}
                  onChange={(e) => setEditForm({ ...editForm, leaveType: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all cursor-pointer"
                >
                  <option value="casual">Casual Leave</option>
                  <option value="sick">Sick Leave</option>
                  <option value="earned">Earned Leave</option>
                  <option value="unpaid">Unpaid Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">From Date</label>
                  <input
                    type="date"
                    required
                    value={editForm.startDate}
                    onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">To Date</label>
                  <input
                    type="date"
                    required
                    min={editForm.startDate}
                    value={editForm.endDate}
                    onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Reason</label>
                <textarea
                  required
                  rows={3}
                  value={editForm.reason}
                  onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingLeave(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs rounded-xl hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  loading={saving}
                  className="px-5 py-2 bg-indigo-600 text-white text-xs rounded-xl hover:bg-indigo-700 font-semibold cursor-pointer"
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

