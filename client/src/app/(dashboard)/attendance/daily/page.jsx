"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Calendar, Search, Users, CheckCircle2, Clock, XCircle, RefreshCw, Loader2, AlertCircle,
  Edit3, ShieldCheck, ShieldAlert, X, Trash2, Eye, MapPin, MoreVertical, ExternalLink, Info, CalendarOff,
} from "lucide-react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { toast } from "react-toastify";
import { useAuth } from "@/context/AuthContext";

const ALLOWED_ROLES = ["admin", "hr", "manager", "team_lead", "lead"];
const FILTERS = ["All", "Present", "Late", "Absent", "Half Day", "On Leave", "Not Marked"];
/* filter button -> status value used by the backend */
const FILTER_KEY = {
  Present: "present",
  Late: "late",
  Absent: "absent",
  "Half Day": "half-day",
  "On Leave": "on-leave",
  "Not Marked": "not-marked",
};
/* statuses that are not saved in the database yet (shown by the backend as virtual rows) */
const OPEN_STATUSES = ["absent", "not-marked"];

/* ------------------------------ helpers ------------------------------ */

const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const norm = (s) => String(s || "present").toLowerCase().trim();
const isHalf = (s) => ["half-day", "half day"].includes(norm(s));

const formatTime = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
};
const formatDay = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
};
const formatHours = (h) => {
  const n = Number(h);
  if (!n || Number.isNaN(n)) return "—";
  const m = Math.round(n * 60);
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;
};
const mapLink = (c) => (c && c.lat != null && c.lng != null ? `https://www.google.com/maps?q=${c.lat},${c.lng}` : "");

const isAuto = (item) => Boolean(item?.virtual) || item?.source === "system";

/* Present, Late, Absent... shown as the "Behavior" of the day */
const behaviorOf = (item) => {
  const s = norm(item.status);
  if (s === "absent") return { label: isAuto(item) ? "Absent (auto)" : "Absent", cls: "bg-rose-50 text-rose-700 border-rose-200" };
  if (s === "not-marked") return { label: "Not marked", cls: "bg-amber-50 text-amber-700 border-amber-200" };
  if (s === "week-off") return { label: "Week off", cls: "bg-slate-100 text-slate-600 border-slate-200" };
  if (s === "holiday") return { label: "Holiday", cls: "bg-violet-50 text-violet-700 border-violet-200" };
  if (s === "on-leave" || s === "on leave") return { label: "On leave", cls: "bg-blue-50 text-blue-700 border-blue-200" };
  if (isHalf(s)) return { label: "Half day", cls: "bg-indigo-50 text-indigo-700 border-indigo-200" };
  if (s === "late" || item.isLate) return { label: "Late", cls: "bg-rose-50 text-rose-700 border-rose-200" };
  return { label: "On time", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" };
};
const statusBadge = (status) => {
  const st = norm(status);
  if (st === "present") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (st === "late" || st === "not-marked") return "bg-amber-50 text-amber-700 border-amber-200";
  if (st === "absent") return "bg-rose-50 text-rose-700 border-rose-200";
  if (isHalf(st)) return "bg-indigo-50 text-indigo-700 border-indigo-200";
  if (st === "on-leave") return "bg-blue-50 text-blue-700 border-blue-200";
  if (st === "holiday") return "bg-violet-50 text-violet-700 border-violet-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
};
const statusText = (status) => norm(status).replace(/-/g, " ");

const empOf = (item) => {
  const emp = item?.employee && typeof item.employee === "object" ? item.employee : {};
  return {
    id: emp._id || emp.id || (typeof item?.employee === "string" ? item.employee : ""),
    name: emp.name || emp.username || "Staff Member",
    code: emp.employeeId || (emp._id ? String(emp._id).slice(-6) : "—"),
    dept: (typeof emp.department === "object" ? emp.department?.name : emp.department) || emp.role || "General",
  };
};
const avatar = (name) => `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff`;

/* ------------------------------ three-dot menu ------------------------------ */

function RowMenu({ items }) {
  const [pos, setPos] = useState(null);
  const btn = useRef(null);
  const menu = useRef(null);
  const list = items.filter((i) => !i.hidden);

  const close = useCallback(() => setPos(null), []);

  const toggle = (e) => {
    e.stopPropagation();
    if (pos) return close();
    const r = btn.current.getBoundingClientRect();
    const W = 188;
    const H = list.length * 40 + 12;
    const left = Math.max(8, Math.min(r.right - W, window.innerWidth - W - 8));
    const top = r.bottom + 6 + H > window.innerHeight ? Math.max(8, r.top - H - 6) : r.bottom + 6;
    setPos({ top, left, W });
  };

  useEffect(() => {
    if (!pos) return;
    const away = (e) => { if (!menu.current?.contains(e.target) && !btn.current?.contains(e.target)) close(); };
    const key = (e) => e.key === "Escape" && close();
    document.addEventListener("mousedown", away);
    document.addEventListener("touchstart", away, { passive: true });
    document.addEventListener("keydown", key);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("touchstart", away);
      document.removeEventListener("keydown", key);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [pos, close]);

  return (
    <>
      <button
        ref={btn}
        type="button"
        onClick={toggle}
        aria-label="Actions"
        aria-haspopup="menu"
        aria-expanded={Boolean(pos)}
        className={`p-2 rounded-xl transition cursor-pointer active:scale-95 ${pos ? "bg-indigo-100 text-indigo-700" : "text-slate-400 hover:text-indigo-600 hover:bg-slate-100"}`}
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      {pos && (
        <div
          ref={menu}
          role="menu"
          style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.W }}
          className="z-[60] bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 animate-in fade-in zoom-in-95 duration-150"
        >
          {list.map((i) => {
            const Icon = i.icon;
            return (
              <button
                key={i.label}
                type="button"
                role="menuitem"
                onClick={(e) => { e.stopPropagation(); close(); i.run(); }}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left text-xs font-semibold transition cursor-pointer ${i.danger ? "text-rose-600 hover:bg-rose-50" : "text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"}`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" /> {i.label}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}

/* ------------------------------ popup shell ------------------------------ */

function Popup({ onClose, locked, size = "max-w-md", children }) {
  useEffect(() => {
    const key = (e) => e.key === "Escape" && !locked && onClose();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", key);
    return () => { document.body.style.overflow = prev; document.removeEventListener("keydown", key); };
  }, [onClose, locked]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => !locked && onClose()}>
      <div className={`bg-white rounded-3xl shadow-2xl w-full ${size} max-h-[90dvh] overflow-y-auto border border-slate-100 animate-in zoom-in-95 duration-200`} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function AccessDeniedScreen({ role, router }) {
  return (
    <div className="w-full min-h-[600px] flex flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="w-20 h-20 rounded-3xl bg-rose-50 border border-rose-100 flex items-center justify-center"><ShieldAlert size={38} className="text-rose-500" /></div>
      <div className="space-y-1.5">
        <h2 className="text-xl font-black text-slate-900 tracking-tight">Access Denied</h2>
        <p className="text-sm font-medium text-slate-500 max-w-xs">Your role ({role || "employee"}) does not have permission to access the attendance command center.</p>
      </div>
      <button type="button" onClick={() => router.push("/dashboard")} className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-sm transition active:scale-95 cursor-pointer">Back to Dashboard</button>
    </div>
  );
}

const Row = ({ label, children }) => (
  <div className="flex items-start justify-between gap-4 py-2.5 border-b border-slate-100 last:border-0 text-xs">
    <span className="text-slate-400 shrink-0">{label}</span>
    <span className="font-semibold text-slate-800 text-right break-words min-w-0">{children || "—"}</span>
  </div>
);

/* ------------------------------ page ------------------------------ */

export default function DailyAttendance() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [selectedDate, setSelectedDate] = useState(todayLocal());
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [records, setRecords] = useState([]);
  const [dayInfo, setDayInfo] = useState(null);
  const [summary, setSummary] = useState({ total: 0, present: 0, late: 0, absent: 0, halfDay: 0, onLeave: 0, notMarked: 0 });
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [newStatus, setNewStatus] = useState("present");
  const [actionSubmitting, setActionSubmitting] = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [holidayBusy, setHolidayBusy] = useState(false);

  const [viewing, setViewing] = useState(null);

  const currentRole = useMemo(() => {
    if (!user) return null;
    const raw = user.role || user.userRole || user.type;
    if (typeof raw === "string") return raw.toLowerCase().trim();
    if (typeof raw === "object" && raw !== null) return (raw.name || raw.title || "").toLowerCase().trim();
    if (Array.isArray(user.roles) && user.roles.length > 0) return String(user.roles[0]).toLowerCase().trim();
    return null;
  }, [user]);

  const roleChecked = !authLoading;
  const hasAccess = Boolean(currentRole && ALLOWED_ROLES.includes(currentRole));
  const canDelete = currentRole === "admin" || currentRole === "hr";

  const fetchAttendance = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const [attRes, infoRes] = await Promise.allSettled([
        api.get("/attendance", { params: { date: selectedDate } }),
        api.get("/attendance/day-info", { params: { date: selectedDate } }),
      ]);
      if (attRes.status === "rejected") throw attRes.reason;

      const data = attRes.value.data;
      const list = Array.isArray(data) ? data : data?.data || data?.records || [];
      setRecords(list);
      setDayInfo(infoRes.status === "fulfilled" ? infoRes.value.data : null);

      const count = (fn) => list.filter(fn).length;
      setSummary({
        total: list.length,
        present: count((r) => norm(r?.status) === "present"),
        late: count((r) => norm(r?.status) === "late"),
        absent: count((r) => norm(r?.status) === "absent"),
        halfDay: count((r) => isHalf(r?.status)),
        onLeave: count((r) => norm(r?.status) === "on-leave"),
        notMarked: count((r) => norm(r?.status) === "not-marked"),
      });
    } catch (err) {
      console.error("Fetch attendance error:", err);
      if (err.response?.status === 401) setErrorMsg("Session expired. Please log in again.");
      else if (err.response?.status === 403) setErrorMsg("Your manager/staff profile is not authorized on the backend API.");
      else if (!err.response) setErrorMsg("Unable to reach backend server. Please check your network or server status.");
      else setErrorMsg(err.response?.data?.message || "Failed to fetch attendance data.");
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    if (roleChecked && hasAccess) fetchAttendance();
    else if (roleChecked) setLoading(false);
  }, [roleChecked, hasAccess, fetchAttendance]);

  /* Employees without a saved record (auto absent / not marked) that can be saved as Absent */
  const pendingCount = useMemo(
    () => records.filter((r) => r?.virtual && OPEN_STATUSES.includes(norm(r.status))).length,
    [records]
  );
  const canBulk = pendingCount > 0 && dayInfo && !dayInfo.isFuture && !dayInfo.isOff;

  const openEdit = (item) => {
    const st = norm(item.status);
    setSelectedRecord(item);
    setNewStatus(["not-marked", "week-off", "holiday"].includes(st) ? "present" : item.status || "present");
    setIsModalOpen(true);
  };
  const openDelete = (item) => {
    setRecordToDelete(item);
    setIsDeleteModalOpen(true);
  };

  /* One call used by the status popup and by the quick actions in the menu */
  const saveStatus = async (item, status) => {
    await api.post("/attendance/mark", {
      employee: empOf(item).id,
      status,
      date: selectedDate,
      // the old check-in time is kept only when the record really has one
      ...(item.checkIn ? { checkInTime: item.checkIn } : {}),
    });
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!selectedRecord || actionSubmitting) return;
    setActionSubmitting(true);
    try {
      await saveStatus(selectedRecord, newStatus);
      toast.success("Attendance status updated successfully!");
      setIsModalOpen(false);
      fetchAttendance();
    } catch (err) {
      console.error("Update error:", err);
      toast.error(err.response?.data?.message || "Failed to update status.");
    } finally {
      setActionSubmitting(false);
    }
  };

  const quickMark = async (item, status) => {
    try {
      await saveStatus(item, status);
      toast.success(`${empOf(item).name} marked ${statusText(status)}.`);
      fetchAttendance();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update status.");
    }
  };

  const handleBulkAbsent = async () => {
    if (bulkSubmitting) return;
    setBulkSubmitting(true);
    try {
      const { data } = await api.post("/attendance/mark-absent-bulk", { date: selectedDate });
      toast.success(data?.message || "Absent records saved.");
      setBulkOpen(false);
      fetchAttendance();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save absent records.");
    } finally {
      setBulkSubmitting(false);
    }
  };

  // const toggleHoliday = async () => {
  //   if (holidayBusy || !dayInfo) return;
  //   try {
  //     setHolidayBusy(true);
  //     if (dayInfo.type === "holiday") {
  //       if (!window.confirm(`Remove the holiday on ${selectedDate}?`)) return;
  //       await api.delete(`/attendance/holidays/${selectedDate}`);
  //       toast.success("Holiday removed.");
  //     } else {
  //       const name = window.prompt("Holiday name", "Holiday");
  //       if (name === null) return;
  //       await api.post("/attendance/holidays", { date: selectedDate, name: name.trim() || "Holiday" });
  //       toast.success("Marked as holiday.");
  //     }
  //     fetchAttendance();
  //   } catch (err) {
  //     toast.error(err.response?.data?.message || "Failed to update the holiday.");
  //   } finally {
  //     setHolidayBusy(false);
  //   }
  // };

  const toggleHoliday = () => router.push(`/attendance/off-days?date=${selectedDate}`);

  const handleDeleteRecord = async () => {
    if (!recordToDelete || deleteSubmitting) return;
    setDeleteSubmitting(true);
    try {
      await api.delete(`/attendance/${recordToDelete._id}`);
      toast.success("Attendance record deleted successfully!");
      setIsDeleteModalOpen(false);
      setRecordToDelete(null);
      fetchAttendance();
    } catch (err) {
      console.error("Delete error:", err);
      toast.error(err.response?.data?.message || "Failed to delete record.");
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const filteredRecords = records.filter((item) => {
    if (!item) return false;
    const e = empOf(item);
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch = !q || e.name.toLowerCase().includes(q) || String(e.code).toLowerCase().includes(q) || String(e.dept).toLowerCase().includes(q);
    const matchesStatus = statusFilter === "All" || norm(item.status) === FILTER_KEY[statusFilter];
    return matchesSearch && matchesStatus;
  });

  const menuFor = (item) => [
    { label: "View details", icon: Eye, run: () => setViewing(item) },
    { label: "Mark present", icon: CheckCircle2, run: () => quickMark(item, "present"), hidden: !item.virtual },
    { label: "Mark absent", icon: XCircle, run: () => quickMark(item, "absent"), hidden: !item.virtual },
    { label: "Change status", icon: Edit3, run: () => openEdit(item) },
    { label: "Delete record", icon: Trash2, run: () => openDelete(item), hidden: !canDelete || item.virtual, danger: true },
  ];

  if (!roleChecked) {
    return (
      <div className="w-full min-h-[600px] flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 size={38} className="animate-spin text-indigo-600" />
        <p className="text-xs font-bold tracking-wider text-slate-600 uppercase">Verifying access permissions...</p>
      </div>
    );
  }
  if (!hasAccess) return <AccessDeniedScreen role={currentRole} router={router} />;

  const kpis = [
    ["Total Staff", summary.total, "text-slate-400", "bg-slate-100 text-slate-600", Users, "hover:border-indigo-200"],
    ["Present", summary.present, "text-emerald-600", "bg-emerald-50 text-emerald-600", CheckCircle2, "hover:border-emerald-200"],
    ["Half-Day / Late", summary.halfDay + summary.late, "text-amber-600", "bg-amber-50 text-amber-600", Clock, "hover:border-amber-200"],
    ["Absent", summary.absent, "text-rose-600", "bg-rose-50 text-rose-600", XCircle, "hover:border-rose-200"],
    ["Not Marked", summary.notMarked, "text-slate-500", "bg-slate-100 text-slate-600", AlertCircle, "hover:border-slate-300"],
  ];

  const LocationCell = ({ text, tone }) => (
    <span className="inline-flex items-center gap-1.5 max-w-[190px]" title={text || ""}>
      <MapPin className={`w-3.5 h-3.5 shrink-0 ${tone}`} />
      <span className="truncate">{text || "—"}</span>
    </span>
  );

  /* Message above the list: what the admin is looking at */
  const banner = (() => {
    if (!dayInfo) return null;
    if (dayInfo.isFuture) return { tone: "slate", Icon: CalendarOff, text: "This is a future date. Attendance opens on the day." };
    if (dayInfo.isOff) {
      return {
        tone: "violet",
        Icon: CalendarOff,
        text: `${dayInfo.name || "Off day"}: attendance is not required. Employees who still punch in are counted as present.`,
      };
    }
    if (dayInfo.isToday && !dayInfo.cutoffPassed) {
      return {
        tone: "amber",
        Icon: Info,
        text: `Employees who have not punched in yet show as Not marked. They become Absent automatically after ${dayInfo.cutoffLabel}.`,
      };
    }
    if (pendingCount > 0) {
      return {
        tone: "rose",
        Icon: Info,
        text: `${pendingCount} employee(s) have no attendance record for this day. They are shown as Absent (auto).`,
      };
    }
    return null;
  })();
  const bannerCls = {
    slate: "bg-slate-50 border-slate-200 text-slate-600",
    violet: "bg-violet-50 border-violet-200 text-violet-700",
    amber: "bg-amber-50 border-amber-200 text-amber-800",
    rose: "bg-rose-50 border-rose-200 text-rose-700",
  };

  return (
    <div className="w-full space-y-5 animate-in fade-in duration-300 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Daily Attendance</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase tracking-wider">{currentRole} view</span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Live real-time daily shift & attendance monitor</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 sm:flex-none">
            <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input type="date" max={todayLocal()} value={selectedDate} onChange={(e) => e.target.value && setSelectedDate(e.target.value)} className="w-full pl-9 pr-3 py-2 text-base sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition cursor-pointer font-medium text-slate-700" />
          </div>
          {canDelete && dayInfo && !dayInfo.isFuture && (dayInfo.type === "holiday" || !dayInfo.isOff) && (
            <button onClick={toggleHoliday} disabled={holidayBusy} className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:text-violet-700 hover:bg-violet-50 active:scale-95 transition cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5">
              <CalendarOff className="w-3.5 h-3.5" /> <CalendarOff className="w-3.5 h-3.5" /> Company off day
            </button>
          )}
          <button onClick={fetchAttendance} disabled={loading} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 hover:text-indigo-600 hover:bg-slate-100 active:scale-95 transition shadow-xs cursor-pointer disabled:opacity-50" title="Refresh Data">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-600" : ""}`} />
          </button>
        </div>
      </div>

      {/* Day message + bulk action */}
      {(banner || canBulk) && (
        <div className={`flex flex-col sm:flex-row sm:items-center gap-3 p-3.5 rounded-xl border text-xs ${bannerCls[banner?.tone || "rose"]}`}>
          {banner && <banner.Icon className="w-4 h-4 shrink-0 hidden sm:block" />}
          <p className="flex-1 font-medium">{banner?.text}</p>
          {canBulk && (
            <button onClick={() => setBulkOpen(true)} className="shrink-0 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold shadow-sm transition active:scale-95 cursor-pointer">
              Save {pendingCount} as Absent
            </button>
          )}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        {kpis.map(([label, value, labelCls, iconCls, Icon, hover]) => (
          <div key={label} className={`bg-white p-4 rounded-xl border border-slate-200/80 flex items-center justify-between shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ${hover}`}>
            <div className="min-w-0">
              <p className={`text-[11px] font-semibold uppercase tracking-wider truncate ${labelCls}`}>{label}</p>
              <p className="text-xl font-bold text-slate-800 mt-1">{value}</p>
            </div>
            <div className={`p-2.5 rounded-xl shrink-0 ${iconCls}`}><Icon className="w-5 h-5" /></div>
          </div>
        ))}
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input type="text" placeholder="Search employee, ID, department..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2.5 text-base sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-500 transition" />
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {FILTERS.map((f) => (
              <button key={f} onClick={() => setStatusFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap cursor-pointer active:scale-95 ${statusFilter === f ? "bg-indigo-600 text-white shadow-sm" : "bg-slate-50 text-slate-600 hover:bg-slate-100"}`}>{f}</button>
            ))}
          </div>
        </div>

        {errorMsg && (
          <div className="m-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" /><span className="flex-1">{errorMsg}</span>
            <button onClick={fetchAttendance} className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold cursor-pointer">Retry</button>
          </div>
        )}

        {/* Mobile cards */}
        <div className="block md:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs"><Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />Loading records...</div>
          ) : filteredRecords.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">No attendance records found for this filter.</div>
          ) : (
            filteredRecords.map((item) => {
              const e = empOf(item);
              const b = behaviorOf(item);
              return (
                <div key={item._id} onClick={() => setViewing(item)} className="p-4 space-y-3 hover:bg-slate-50/70 transition-colors cursor-pointer">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <img src={avatar(e.name)} alt={e.name} className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0" />
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-slate-900 truncate">{e.name}</h4>
                        <span className="text-[11px] text-slate-400 font-mono truncate block">{e.code} • {e.dept}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0" onClick={(ev) => ev.stopPropagation()}>
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${b.cls}`}>{b.label}</span>
                      <RowMenu items={menuFor(item)} />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl text-center text-xs">
                    <div><span className="text-[10px] text-slate-400 block font-semibold">IN</span><span className="font-mono text-slate-700">{formatTime(item.checkIn)}</span></div>
                    <div><span className="text-[10px] text-slate-400 block font-semibold">OUT</span><span className="font-mono text-slate-700">{formatTime(item.checkOut)}</span></div>
                    <div><span className="text-[10px] text-slate-400 block font-semibold">HOURS</span><span className="font-mono text-slate-700">{formatHours(item.workHours)}</span></div>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 min-w-0">
                    <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" /><span className="truncate">{item.inLocation || "No location saved"}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[1150px] text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="px-5 py-3.5">Profile</th>
                <th className="px-4 py-3.5">Date</th>
                <th className="px-4 py-3.5">Punch Records</th>
                <th className="px-4 py-3.5">Punch In</th>
                <th className="px-4 py-3.5">In Location</th>
                <th className="px-4 py-3.5">Out Location</th>
                <th className="px-4 py-3.5">Punch Out</th>
                <th className="px-4 py-3.5">Behavior</th>
                <th className="px-4 py-3.5">Total Hours</th>
                <th className="px-4 py-3.5 text-center w-20">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="10" className="py-12 text-center text-slate-400 text-xs"><Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />Connecting to backend...</td></tr>
              ) : filteredRecords.length === 0 ? (
                <tr><td colSpan="10" className="py-12 text-center text-slate-400 text-xs">No attendance records found for this filter.</td></tr>
              ) : (
                filteredRecords.map((item) => {
                  const e = empOf(item);
                  const b = behaviorOf(item);
                  return (
                    <tr key={item._id} onClick={() => setViewing(item)} className="hover:bg-indigo-50/40 transition-colors duration-150 cursor-pointer">
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <img src={avatar(e.name)} alt={e.name} className="w-9 h-9 rounded-full object-cover border border-slate-200 shadow-xs" />
                          <div>
                            <div className="text-sm font-semibold text-slate-800">{e.name}</div>
                            <div className="text-[11px] text-slate-400 font-mono">ID: {e.code}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs font-semibold text-slate-700 whitespace-nowrap">{formatDay(item.date || selectedDate)}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap" onClick={(ev) => ev.stopPropagation()}>
                        <button onClick={() => setViewing(item)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-bold transition active:scale-95 cursor-pointer"><Eye className="w-3.5 h-3.5" /> View Details</button>
                      </td>
                      <td className="px-4 py-3.5 text-xs font-bold text-slate-800 whitespace-nowrap">{formatTime(item.checkIn)}</td>
                      <td className="px-4 py-3.5 text-xs text-slate-600 whitespace-nowrap"><LocationCell text={item.inLocation} tone="text-indigo-500" /></td>
                      <td className="px-4 py-3.5 text-xs text-slate-600 whitespace-nowrap"><LocationCell text={item.outLocation} tone="text-rose-400" /></td>
                      <td className="px-4 py-3.5 text-xs font-bold text-slate-800 whitespace-nowrap">{formatTime(item.checkOut)}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap"><span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${b.cls}`}>{b.label}</span></td>
                      <td className="px-4 py-3.5 text-xs font-bold font-mono text-slate-700 whitespace-nowrap">{formatHours(item.workHours)}</td>
                      <td className="px-4 py-3.5 text-center" onClick={(ev) => ev.stopPropagation()}><RowMenu items={menuFor(item)} /></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View details */}
      {viewing && (() => {
        const e = empOf(viewing);
        const b = behaviorOf(viewing);
        const inMap = mapLink(viewing.inCoordinates || viewing.location);
        const outMap = mapLink(viewing.outCoordinates);
        return (
          <Popup onClose={() => setViewing(null)}>
            <div className="flex items-start justify-between gap-3 p-5 border-b border-slate-100">
              <div className="flex items-center gap-3 min-w-0">
                <img src={avatar(e.name)} alt="" className="w-11 h-11 rounded-full border border-slate-200 shrink-0" />
                <div className="min-w-0"><h3 className="text-base font-bold text-slate-900 truncate">{e.name}</h3><p className="text-[11px] text-slate-400 font-mono truncate">ID: {e.code} • {e.dept}</p></div>
              </div>
              <button onClick={() => setViewing(null)} aria-label="Close" className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border capitalize ${statusBadge(viewing.status)}`}>{statusText(viewing.status)}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${b.cls}`}>{b.label}</span>
              </div>
              <div className="rounded-2xl border border-slate-200 px-4">
                <Row label="Date">{formatDay(viewing.date || selectedDate)}</Row>
                <Row label="Punch in">{formatTime(viewing.checkIn)}</Row>
                <Row label="Punch out">{formatTime(viewing.checkOut)}</Row>
                <Row label="Total hours">{formatHours(viewing.workHours)}</Row>
                <Row label="Recorded by">{viewing.virtual ? "Not saved yet" : viewing.source === "system" ? "System (auto)" : viewing.source === "admin" ? "Admin / HR" : "Employee"}</Row>
              </div>
              <div className="rounded-2xl border border-slate-200 px-4">
                <Row label="In location">
                  {viewing.inLocation}
                  {inMap && <a href={inMap} target="_blank" rel="noreferrer" className="flex items-center justify-end gap-1 text-indigo-600 hover:text-indigo-800 mt-1">Open map <ExternalLink className="w-3 h-3" /></a>}
                </Row>
                <Row label="Out location">
                  {viewing.outLocation}
                  {outMap && <a href={outMap} target="_blank" rel="noreferrer" className="flex items-center justify-end gap-1 text-indigo-600 hover:text-indigo-800 mt-1">Open map <ExternalLink className="w-3 h-3" /></a>}
                </Row>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 p-4 bg-slate-50 border-t border-slate-100 rounded-b-3xl">
              <button onClick={() => { const r = viewing; setViewing(null); openEdit(r); }} className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition active:scale-95 inline-flex items-center gap-1.5 cursor-pointer"><Edit3 className="w-3.5 h-3.5" /> Change status</button>
              <button onClick={() => setViewing(null)} className="px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-white transition cursor-pointer">Close</button>
            </div>
          </Popup>
        );
      })()}

      {/* Edit status */}
      {isModalOpen && (
        <Popup onClose={() => setIsModalOpen(false)} locked={actionSubmitting}>
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl"><ShieldCheck className="w-5 h-5" /></div>
                <div><h3 className="text-base font-bold text-slate-900">Update Attendance Status</h3><p className="text-xs text-slate-400 mt-0.5">{selectedRecord ? empOf(selectedRecord).name : "Modify attendance record"}</p></div>
              </div>
              <button onClick={() => setIsModalOpen(false)} disabled={actionSubmitting} aria-label="Close" className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleUpdateStatus} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">Select New Status</label>
                <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-base sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition cursor-pointer">
                  <option value="present">🟢 Present</option>
                  <option value="absent">🔴 Absent</option>
                  <option value="half-day">🔵 Half Day</option>
                  <option value="late">🟡 Late</option>
                  <option value="on-leave">🟣 On Leave</option>
                </select>
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} disabled={actionSubmitting} className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition active:scale-95 cursor-pointer">Cancel</button>
                <button type="submit" disabled={actionSubmitting} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-100 transition active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer">
                  {actionSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}Save Changes
                </button>
              </div>
            </form>
          </div>
        </Popup>
      )}

      {/* Save as Absent (bulk) */}
      {bulkOpen && (
        <Popup onClose={() => setBulkOpen(false)} locked={bulkSubmitting} size="max-w-sm">
          <div className="p-6 space-y-5 text-center">
            <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto"><XCircle className="w-6 h-6" /></div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Save {pendingCount} employee(s) as Absent?</h3>
              <p className="text-xs text-slate-500 mt-1">
                These employees have no punch-in on {formatDay(selectedDate)}. Absent records will be saved for them. You can still change any status later.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button type="button" disabled={bulkSubmitting} onClick={() => setBulkOpen(false)} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition cursor-pointer">Cancel</button>
              <button type="button" disabled={bulkSubmitting} onClick={handleBulkAbsent} className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-rose-100 transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer">
                {bulkSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}Yes, Save
              </button>
            </div>
          </div>
        </Popup>
      )}

      {/* Delete */}
      {isDeleteModalOpen && canDelete && (
        <Popup onClose={() => { setIsDeleteModalOpen(false); setRecordToDelete(null); }} locked={deleteSubmitting} size="max-w-sm">
          <div className="p-6 space-y-5 text-center">
            <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto"><Trash2 className="w-6 h-6" /></div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Delete Attendance Record?</h3>
              <p className="text-xs text-slate-500 mt-1">{recordToDelete ? `${empOf(recordToDelete).name}. ` : ""}This action cannot be undone. The attendance log will be permanently deleted.</p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button type="button" disabled={deleteSubmitting} onClick={() => { setIsDeleteModalOpen(false); setRecordToDelete(null); }} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition cursor-pointer">Cancel</button>
              <button type="button" disabled={deleteSubmitting} onClick={handleDeleteRecord} className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-rose-100 transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer">
                {deleteSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}Yes, Delete
              </button>
            </div>
          </div>
        </Popup>
      )}
    </div>
  );
}
