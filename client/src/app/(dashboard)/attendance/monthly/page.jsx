"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  Loader2,
  ShieldAlert,
} from 'lucide-react';
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const PRIVILEGED_ROLES = ["admin", "hr", "manager", "team_lead", "lead"];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

const lower = (v) => String(v || "").trim().toLowerCase();

/* A readable employee code only (EMP-001). A raw database id is never shown as the ID. */
const readableCode = (v) => {
  const s = String(v ?? "").trim();
  return s && !OBJECT_ID_REGEX.test(s) ? s : "";
};

const nameOf = (emp) =>
  emp?.name ||
  emp?.fullName ||
  `${emp?.firstName || ""} ${emp?.lastName || ""}`.trim() ||
  emp?.username ||
  "";

/* The attendance records often carry only a database id, so the name and the readable ID
   are looked up from the employee list (by database id first, then by name). */
const buildDirectory = (list) => {
  const byId = new Map();
  const byName = new Map();
  list.forEach((emp) => {
    const name = nameOf(emp);
    const code = readableCode(emp.employeeId || emp.empId || emp.code || emp.staffId);
    [emp._id, emp.id].filter(Boolean).forEach((k) => byId.set(String(k), { name, code }));
    if (name && code) byName.set(lower(name), code);
  });
  return { byId, byName };
};

const resolveInfo = (emp, directory, user) => {
  const id = String(emp?._id || emp?.id || "");
  const isMe = Boolean(id) && id === String(user?._id || "");
  const fromDirectory = directory.byId.get(id);

  const name =
    nameOf(emp) ||
    fromDirectory?.name ||
    (isMe ? user?.name : "") ||
    "Staff Member";

  const code =
    readableCode(emp?.employeeId) ||
    readableCode(emp?.empId) ||
    readableCode(emp?.code) ||
    readableCode(emp?.staffId) ||
    fromDirectory?.code ||
    directory.byName.get(lower(name)) ||
    (isMe ? readableCode(user?.employeeId || user?.empId || user?.employee?.employeeId) : "") ||
    "";

  return { id, name, code };
};

const getInitials = (name) =>
  String(name || "U")
    .trim()
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("") || "U";

/* -------------------------------------------------------------------------- */
/* COMPONENTS                                                                 */
/* -------------------------------------------------------------------------- */

function AccessDeniedScreen({ role, router }) {
  return (
    <div className="w-full min-h-[500px] flex flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center">
        <ShieldAlert className="w-8 h-8 text-rose-500" />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">Access Restricted</h2>
        <p className="text-xs sm:text-sm font-medium text-slate-500 max-w-xs">
          Your role ({role || "employee"}) has restricted view access.
        </p>
      </div>

      <button
        type="button"
        onClick={() => router.push("/dashboard")}
        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs sm:text-sm font-bold shadow-xs transition-all duration-200 cursor-pointer"
      >
        Back to Dashboard
      </button>
    </div>
  );
}

function StatusBadge({ status, isWeekend }) {
  if (!status) {
    return isWeekend
      ? <span className="inline-block w-6 h-6 leading-6 text-[10px] font-bold text-slate-400 bg-slate-100 rounded-md text-center">WO</span>
      : <span className="inline-block w-6 h-6 leading-6 text-[10px] text-slate-300 text-center">—</span>;
  }
  const st = status.toLowerCase();
  switch (st) {
    case 'present':
      return <span className="inline-block w-6 h-6 leading-6 text-[10px] font-bold text-emerald-700 bg-emerald-100 rounded-md text-center" title="Present">P</span>;
    case 'late':
      return <span className="inline-block w-6 h-6 leading-6 text-[10px] font-bold text-amber-700 bg-amber-100 rounded-md text-center" title="Late">L</span>;
    case 'absent':
      return <span className="inline-block w-6 h-6 leading-6 text-[10px] font-bold text-rose-700 bg-rose-100 rounded-md text-center" title="Absent">A</span>;
    case 'half-day':
    case 'half day':
      return <span className="inline-block w-6 h-6 leading-6 text-[10px] font-bold text-indigo-700 bg-indigo-100 rounded-md text-center" title="Half Day">HD</span>;
    case 'leave':
    case 'on-leave':
      return <span className="inline-block w-6 h-6 leading-6 text-[10px] font-bold text-sky-700 bg-sky-100 rounded-md text-center" title="On Leave">LV</span>;
    default:
      return <span className="inline-block w-6 h-6 leading-6 text-[10px] text-slate-300 text-center">—</span>;
  }
};

/* -------------------------------------------------------------------------- */
/* PAGE                                                                       */
/* -------------------------------------------------------------------------- */

export default function MonthlyAttendance() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [searchTerm, setSearchTerm] = useState('');
  const [groupedData, setGroupedData] = useState([]);
  const [directory, setDirectory] = useState({ byId: new Map(), byName: new Map() });
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const firstWeekday = new Date(selectedYear, selectedMonth - 1, 1).getDay();

  const currentRole = useMemo(() => {
    if (!user) return null;
    const rawRole = user.role || user.userRole || user.type;
    if (typeof rawRole === "string") return rawRole.toLowerCase().trim();
    if (typeof rawRole === "object" && rawRole !== null) {
      return (rawRole.name || rawRole.title || "").toLowerCase().trim();
    }
    if (Array.isArray(user.roles) && user.roles.length > 0) {
      return String(user.roles[0]).toLowerCase().trim();
    }
    return null;
  }, [user]);

  const roleChecked = !authLoading;
  const isPrivileged = Boolean(currentRole && PRIVILEGED_ROLES.includes(currentRole));

  /* Employee list: gives every row its real name and readable ID (EMP-001) */
  useEffect(() => {
    if (!roleChecked || !user) return;
    let alive = true;
    api
      .get("/employees")
      .then(({ data }) => {
        if (!alive) return;
        const list = Array.isArray(data) ? data : (data?.employees || data?.data || []);
        setDirectory(buildDirectory(list));
      })
      .catch(() => { });
    return () => {
      alive = false;
    };
  }, [roleChecked, user]);

  const fetchMonthlyData = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const params = { month: selectedMonth, year: selectedYear };

      if (!isPrivileged && user?._id) {
        params.employeeId = user._id;
      }

      const { data } = await api.get("/attendance", { params });

      const records = Array.isArray(data) ? data : (data?.data || data?.records || []);
      const employeeMap = {};

      records.forEach((rec) => {
        const empObj = rec.employee && typeof rec.employee === "object" ? rec.employee : null;
        const empId = empObj?._id || empObj?.id || (typeof rec.employee === "string" ? rec.employee : null) || user?._id;
        if (!empId) return;
        const key = String(empId);

        if (!employeeMap[key]) {
          employeeMap[key] = {
            id: key,
            /* kept raw here. The name and ID are resolved at render time from the employee list. */
            employee: empObj
              ? { ...empObj, _id: empObj._id || empObj.id || key }
              : { _id: key, name: rec.name, employeeId: rec.employeeId || rec.empId || rec.employeeCode },
            days: {},
            totalPresent: 0,
            totalLate: 0,
            totalAbsent: 0,
            totalLeave: 0,
          };
        }

        const recDate = new Date(rec.date || rec.createdAt);
        const day = recDate.getDate();
        const status = (rec.status || "present").toLowerCase();
        employeeMap[key].days[day] = status;

        if (status === "present" || status === "half-day" || status === "half day") {
          employeeMap[key].totalPresent += 1;
        } else if (status === "late") {
          employeeMap[key].totalLate += 1;
        } else if (status === "absent") {
          employeeMap[key].totalAbsent += 1;
        } else if (status === "leave" || status === "on-leave") {
          employeeMap[key].totalLeave += 1;
        }
      });

      setGroupedData(Object.values(employeeMap));
    } catch (err) {
      console.error("Fetch monthly attendance error:", err);
      if (err.response?.status === 401) {
        setErrorMsg("Session expired. Please log in again.");
      } else if (err.response?.status === 403) {
        setErrorMsg("You are not authorized to view this data.");
      } else {
        setErrorMsg(err.response?.data?.message || "Failed to fetch attendance data.");
      }
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear, isPrivileged, user]);

  useEffect(() => {
    if (roleChecked && user) {
      fetchMonthlyData();
    }
  }, [roleChecked, user, fetchMonthlyData]);

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((prev) => prev - 1);
    } else {
      setSelectedMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((prev) => prev + 1);
    } else {
      setSelectedMonth((prev) => prev + 1);
    }
  };

  /* Every row with its resolved name and ID */
  const rows = useMemo(
    () => groupedData.map((item) => ({ ...item, info: resolveInfo(item.employee, directory, user) })),
    [groupedData, directory, user]
  );

  const visibleList = useMemo(() => {
    if (!isPrivileged) {
      return rows.filter(
        (item) =>
          item.id === String(user?._id || "") ||
          (item.info.name && user?.name && lower(item.info.name) === lower(user.name))
      );
    }

    const q = lower(searchTerm);
    return rows.filter(
      (item) => lower(item.info.name).includes(q) || lower(item.info.code).includes(q)
    );
  }, [rows, searchTerm, isPrivileged, user]);

  const summaryTotals = useMemo(() => {
    let present = 0, late = 0, absent = 0, leave = 0;
    visibleList.forEach((item) => {
      present += item.totalPresent;
      late += item.totalLate;
      absent += item.totalAbsent;
      leave += (item.totalLeave || 0);
    });
    return { present, late, absent, leave, employees: visibleList.length };
  }, [visibleList]);

  if (!roleChecked) {
    return (
      <div className="w-full min-h-[500px] flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 size={36} className="animate-spin text-indigo-600" />
        <p className="text-xs font-bold tracking-wider text-slate-600 uppercase">
          Verifying permissions...
        </p>
      </div>
    );
  }

  const loadingBox = (
    <div className="py-16 text-center text-xs text-slate-400">
      <Loader2 className="w-7 h-7 animate-spin mx-auto text-indigo-600 mb-2" />
      Fetching real attendance records from backend...
    </div>
  );

  const emptyText = `No attendance records found for ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}.`;

  return (
    <div className="w-full min-w-0 space-y-4 sm:space-y-5 animate-in fade-in duration-300 pb-12 font-sans">
      {/* Header bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Daily Attendance Record</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase tracking-wider">
              {currentRole || "employee"}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Comprehensive monthly presence sheet, punch records, and logs.</p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 w-full lg:w-auto">
          <div className="flex flex-1 lg:flex-none items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-1 shadow-2xs">
            <button onClick={handlePrevMonth} className="p-2 sm:p-1.5 hover:bg-white hover:text-indigo-600 rounded-lg text-slate-600 transition cursor-pointer" title="Previous Month" aria-label="Previous month">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 sm:px-3 text-xs sm:text-sm font-bold text-slate-800 text-center flex-1 lg:flex-none lg:min-w-[150px]">
              {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
            </span>
            <button onClick={handleNextMonth} className="p-2 sm:p-1.5 hover:bg-white hover:text-indigo-600 rounded-lg text-slate-600 transition cursor-pointer" title="Next Month" aria-label="Next month">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={fetchMonthlyData}
            disabled={loading}
            className="p-2.5 shrink-0 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 hover:text-indigo-600 hover:bg-slate-100 active:scale-95 transition shadow-2xs cursor-pointer disabled:opacity-50"
            title="Refresh Sheet"
            aria-label="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter and Legend Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 sm:gap-4">
        {isPrivileged ? (
          <div className="relative w-full lg:flex-1 lg:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Filter employee name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-base sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-500 transition"
            />
          </div>
        ) : (
          <div className="text-xs font-semibold text-slate-600">
            Showing personal attendance record for: <span className="text-indigo-600 font-bold">{user?.name}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
          <span className="inline-flex items-center gap-1.5 text-slate-600 font-medium">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></span> Present (P)
          </span>
          <span className="inline-flex items-center gap-1.5 text-slate-600 font-medium">
            <span className="w-2.5 h-2.5 bg-amber-500 rounded-full"></span> Late (L)
          </span>
          <span className="inline-flex items-center gap-1.5 text-slate-600 font-medium">
            <span className="w-2.5 h-2.5 bg-rose-500 rounded-full"></span> Absent (A)
          </span>
          <span className="inline-flex items-center gap-1.5 text-slate-600 font-medium">
            <span className="w-2.5 h-2.5 bg-sky-500 rounded-full"></span> Leave (LV)
          </span>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2 shadow-2xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Records */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Mobile and tablet: one card per employee with a mini calendar */}
        <div className="lg:hidden">
          {loading ? (
            loadingBox
          ) : visibleList.length === 0 ? (
            <div className="py-14 px-4 text-center text-slate-400 text-xs">{emptyText}</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 sm:p-4">
              {visibleList.map((item, index) => (
                <div key={item.id || index} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 shrink-0 rounded-full bg-indigo-50 border-2 border-indigo-200 text-indigo-700 flex items-center justify-center text-xs font-bold">
                        {getInitials(item.info.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate" title={item.info.name}>{item.info.name}</p>
                        <p className="text-[11px] font-semibold text-slate-500 truncate">ID: {item.info.code || "—"}</p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total</p>
                      <p className="text-lg font-bold text-indigo-700 leading-none mt-0.5">{item.totalPresent}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center">
                    {[
                      ["Present", item.totalPresent, "bg-emerald-50 text-emerald-700"],
                      ["Late", item.totalLate, "bg-amber-50 text-amber-700"],
                      ["Absent", item.totalAbsent, "bg-rose-50 text-rose-700"],
                      ["Leave", item.totalLeave, "bg-sky-50 text-sky-700"],
                    ].map(([label, value, tone]) => (
                      <div key={label} className={`rounded-xl py-2 px-1 min-w-0 ${tone}`}>
                        <p className="text-[9px] sm:text-[10px] font-bold uppercase truncate">{label}</p>
                        <p className="text-sm font-bold">{value}</p>
                      </div>
                    ))}
                  </div>

                  <div>
                    <div className="grid grid-cols-7 gap-1 mb-1">
                      {WEEKDAY_LABELS.map((w, i) => (
                        <span key={i} className="text-center text-[10px] font-bold text-slate-400">{w}</span>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {Array.from({ length: firstWeekday }).map((_, i) => (
                        <div key={`blank-${i}`} />
                      ))}
                      {daysArray.map((day) => {
                        const dayOfWeek = new Date(selectedYear, selectedMonth - 1, day).getDay();
                        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                        return (
                          <div
                            key={day}
                            className={`flex flex-col items-center gap-0.5 rounded-lg py-1 ${isWeekend ? "bg-slate-50" : ""}`}
                          >
                            <span className="text-[9px] font-semibold text-slate-400 leading-none">{day}</span>
                            <StatusBadge status={item.days[day]} isWeekend={isWeekend} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Desktop: full month table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-700 uppercase">
              <tr>
                <th className="px-4 py-3.5 sticky left-0 bg-slate-50 z-20 border-r border-slate-200 min-w-[210px]">
                  NAME OF ATTENDEE
                </th>
                {daysArray.map((day) => {
                  const dateObj = new Date(selectedYear, selectedMonth - 1, day);
                  const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
                  return (
                    <th
                      key={day}
                      className={`px-1 py-2 text-center min-w-[30px] border-r border-slate-100 ${isWeekend ? 'bg-slate-100/70 text-slate-400' : ''}`}
                    >
                      <div>{day}</div>
                    </th>
                  );
                })}
                <th className="px-3 py-3.5 text-center bg-indigo-50/50 text-indigo-800 border-l border-slate-200 min-w-[50px]">TOTAL</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={daysInMonth + 2}>{loadingBox}</td>
                </tr>
              ) : visibleList.length === 0 ? (
                <tr>
                  <td colSpan={daysInMonth + 2} className="py-14 text-center text-slate-400 text-xs">
                    {emptyText}
                  </td>
                </tr>
              ) : (
                visibleList.map((item, index) => (
                  <tr key={item.id || index} className="hover:bg-indigo-50/40 transition-all duration-150 group">
                    <td className="px-4 py-3 sticky left-0 bg-white group-hover:bg-indigo-50/40 z-10 border-r border-slate-200 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs text-slate-400 font-medium shrink-0">{index + 1}.</span>
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 truncate max-w-[160px]" title={item.info.name}>
                            {item.info.name}
                          </div>
                          <div className="text-[10px] font-semibold text-slate-500 mt-0.5 truncate max-w-[160px]">
                            ID: {item.info.code || "—"}
                          </div>
                        </div>
                      </div>
                    </td>

                    {daysArray.map((day) => {
                      const dateObj = new Date(selectedYear, selectedMonth - 1, day);
                      const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
                      return (
                        <td key={day} className={`px-0.5 py-2 text-center border-r border-slate-100 ${isWeekend ? 'bg-slate-50/50' : ''}`}>
                          <StatusBadge status={item.days[day]} isWeekend={isWeekend} />
                        </td>
                      );
                    })}

                    <td className="px-2 py-2 text-center font-bold text-indigo-700 bg-indigo-50/30 border-l border-slate-200">
                      {item.totalPresent}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Summary Badges Bar */}
        <div className="p-3 sm:p-4 bg-white border-t border-slate-200/80 flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl text-[11px] sm:text-xs font-bold border border-emerald-100 shadow-2xs">
            {summaryTotals.present} PRESENT
          </span>
          <span className="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-xl text-[11px] sm:text-xs font-bold border border-amber-100 shadow-2xs">
            {summaryTotals.late} LATE
          </span>
          <span className="px-3 py-1.5 bg-rose-50 text-rose-700 rounded-xl text-[11px] sm:text-xs font-bold border border-rose-100 shadow-2xs">
            {summaryTotals.absent} ABSENT
          </span>
          <span className="px-3 py-1.5 bg-sky-50 text-sky-700 rounded-xl text-[11px] sm:text-xs font-bold border border-sky-100 shadow-2xs">
            {summaryTotals.leave} LEAVE
          </span>
          <span className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-xl text-[11px] sm:text-xs font-bold border border-indigo-100 shadow-2xs ml-auto">
            {summaryTotals.employees} EMPLOYEES
          </span>
        </div>
      </div>
    </div>
  );
}