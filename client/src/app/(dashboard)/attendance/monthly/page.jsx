"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  Loader2,
  UserCircle2,
} from 'lucide-react';
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

// Roles that can see everyone's attendance sheet. Anyone else only sees their own row.
const PRIVILEGED_ROLES = ["admin", "hr"];

export default function MonthlyAttendance() {
  const { user, loading: authLoading } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [searchTerm, setSearchTerm] = useState('');
  const [groupedData, setGroupedData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const role = user?.role?.toLowerCase() || null;
  const roleChecked = !authLoading;
  const isPrivileged = role && PRIVILEGED_ROLES.includes(role);
  // The logged-in person's own employee id (adjust if your AuthContext stores it elsewhere)
  const myEmployeeId = user?.employee || user?._id || user?.id || null;

  const fetchMonthlyData = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      // Fetching monthly records from backend
      const { data } = await api.get("/attendance", {
        params: { month: selectedMonth, year: selectedYear },
      });

      const records = Array.isArray(data) ? data : [];
      const employeeMap = {};

      records.forEach((rec) => {
        // Safe extraction of employee object or ID
        const empObj = rec.employee && typeof rec.employee === "object" ? rec.employee : null;
        const empId = empObj?._id || empObj?.id || (typeof rec.employee === "string" ? rec.employee : null);

        if (!empId) return;

        if (!employeeMap[empId]) {
          employeeMap[empId] = {
            employee: empObj || { _id: empId, name: "Staff Member", employeeId: empId.slice(-6) },
            days: {},
            totalPresent: 0,
            totalLate: 0,
            totalAbsent: 0,
          };
        }

        // Extract day safely from record date
        const recDate = new Date(rec.date || rec.createdAt);
        const day = recDate.getDate();

        const status = (rec.status || "present").toLowerCase();
        employeeMap[empId].days[day] = status;

        if (status === "present" || status === "half-day" || status === "half day") {
          employeeMap[empId].totalPresent += 1;
        }
        if (rec.isLate || status === "late") {
          employeeMap[empId].totalLate += 1;
        }
        if (status === "absent") {
          employeeMap[empId].totalAbsent += 1;
        }
      });

      setGroupedData(Object.values(employeeMap));
    } catch (err) {
      console.error("Fetch monthly attendance error:", err);
      if (err.response?.status === 401) {
        setErrorMsg("Session expire ho gaya hai — dobara login karo.");
      } else if (err.response?.status === 403) {
        setErrorMsg("Aapke role ko ye data dekhne ki permission nahi hai.");
      } else if (!err.response) {
        setErrorMsg("Backend server tak pahunch nahi paaye — check karo backend chal raha hai ya nahi.");
      } else {
        setErrorMsg(err.response?.data?.message || "Kuch galat ho gaya, dobara try karo.");
      }
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    if (roleChecked) {
      fetchMonthlyData();
    }
  }, [roleChecked, fetchMonthlyData]);

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

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const getDayStatusBadge = (status, isWeekend) => {
    if (!status) {
      return isWeekend
        ? <span className="inline-block w-5 h-5 leading-5 text-[10px] font-bold text-slate-400 bg-slate-100 rounded-md">WO</span>
        : <span className="text-[10px] text-slate-300">—</span>;
    }
    const st = status.toLowerCase();
    switch (st) {
      case 'present':
        return <span className="inline-block w-5 h-5 leading-5 text-[10px] font-bold text-emerald-700 bg-emerald-100 rounded-md shadow-2xs" title="Present">P</span>;
      case 'late':
        return <span className="inline-block w-5 h-5 leading-5 text-[10px] font-bold text-amber-700 bg-amber-100 rounded-md shadow-2xs" title="Late">L</span>;
      case 'absent':
        return <span className="inline-block w-5 h-5 leading-5 text-[10px] font-bold text-rose-700 bg-rose-100 rounded-md shadow-2xs" title="Absent">A</span>;
      case 'half-day':
      case 'half day':
        return <span className="inline-block w-5 h-5 leading-5 text-[10px] font-bold text-indigo-700 bg-indigo-100 rounded-md shadow-2xs" title="Half Day">HD</span>;
      case 'on-leave':
        return <span className="inline-block w-5 h-5 leading-5 text-[10px] font-bold text-sky-700 bg-sky-100 rounded-md shadow-2xs" title="On Leave">H</span>;
      default:
        return <span className="text-[10px] text-slate-300">—</span>;
    }
  };

  // Search filter (admin/hr only — a regular user only ever has their own single row)
  const searchedList = groupedData.filter((item) => {
    const q = searchTerm.toLowerCase();
    const name = (item.employee?.name || '').toLowerCase();
    const empCode = (item.employee?.employeeId || '').toLowerCase();
    return name.includes(q) || empCode.includes(q);
  });

  // Admin/HR see everyone (subject to search); anyone else only ever sees their own row
  const visibleList = useMemo(() => {
    if (isPrivileged) return searchedList;
    return groupedData.filter((item) => {
      const empId = item.employee?._id || item.employee?.id;
      return empId && myEmployeeId && String(empId) === String(myEmployeeId);
    });
  }, [isPrivileged, searchedList, groupedData, myEmployeeId]);

  const pageTitle = isPrivileged ? "Monthly Attendance Sheet" : "My Attendance";
  const pageSubtitle = isPrivileged
    ? "Comprehensive monthly presence sheet, late marks, and leaves."
    : "Your presence, late marks, and leaves for the month.";

  return (
    <div className="w-full space-y-5 animate-in fade-in duration-300 pb-12 font-sans">

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">{pageTitle}</h1>
          <p className="text-xs text-slate-500 mt-0.5">{pageSubtitle}</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 shadow-2xs">
            <button onClick={handlePrevMonth} className="p-1.5 hover:bg-white hover:text-indigo-600 rounded-lg text-slate-600 transition" title="Previous Month">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs sm:text-sm font-bold text-slate-800 min-w-[130px] text-center">
              {monthNames[selectedMonth - 1]} {selectedYear}
            </span>
            <button onClick={handleNextMonth} className="p-1.5 hover:bg-white hover:text-indigo-600 rounded-lg text-slate-600 transition" title="Next Month">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={fetchMonthlyData}
            className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 hover:text-indigo-600 hover:bg-slate-100 active:scale-95 transition shadow-2xs"
            title="Refresh Sheet"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Legend & Search (search only relevant for admin/hr browsing everyone) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {isPrivileged ? (
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              placeholder="Search employee by name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-500 transition"
            />
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <UserCircle2 className="w-4 h-4 text-indigo-500" />
            Showing your own attendance record
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="text-[11px] font-semibold text-slate-400">Legend:</span>
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
            <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full"></span> Half Day (HD)
          </span>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2 shadow-2xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Monthly Sheet Table with smooth hover */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-700 uppercase">
              <tr>
                <th className="px-4 py-3.5 sticky left-0 bg-slate-50 z-20 border-r border-slate-200 min-w-[180px]">
                  Employee
                </th>
                {daysArray.map((day) => {
                  const dateObj = new Date(selectedYear, selectedMonth - 1, day);
                  const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
                  return (
                    <th
                      key={day}
                      className={`px-1.5 py-2 text-center min-w-[32px] border-r border-slate-100 ${isWeekend ? 'bg-slate-100/70 text-slate-400' : ''}`}
                    >
                      <div>{day}</div>
                      <div className="text-[9px] font-normal text-slate-400">
                        {dateObj.toLocaleDateString('en-US', { weekday: 'narrow' })}
                      </div>
                    </th>
                  );
                })}
                <th className="px-3 py-3.5 text-center bg-emerald-50 text-emerald-800 border-l border-slate-200 min-w-[45px]">P</th>
                <th className="px-3 py-3.5 text-center bg-amber-50 text-amber-800 min-w-[45px]">L</th>
                <th className="px-3 py-3.5 text-center bg-rose-50 text-rose-800 min-w-[45px]">A</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {(!roleChecked || loading) ? (
                <tr>
                  <td colSpan={daysInMonth + 4} className="py-16 text-center text-slate-400">
                    <Loader2 className="w-7 h-7 animate-spin mx-auto text-indigo-600 mb-2" />
                    {!roleChecked ? "Verifying access..." : "Fetching monthly records from backend..."}
                  </td>
                </tr>
              ) : visibleList.length === 0 ? (
                <tr>
                  <td colSpan={daysInMonth + 4} className="py-14 text-center text-slate-400 text-xs">
                    {isPrivileged
                      ? `No monthly records found for ${monthNames[selectedMonth - 1]} ${selectedYear}.`
                      : `No attendance records found for you in ${monthNames[selectedMonth - 1]} ${selectedYear}.`}
                  </td>
                </tr>
              ) : (
                visibleList.map((item) => {
                  const empName = item.employee?.name || item.employee?.username || "Staff Member";
                  const empId = item.employee?.employeeId || "—";

                  return (
                    <tr key={item.employee._id} className="hover:bg-indigo-50/40 transition-all duration-150 group">
                      <td className="px-4 py-3 sticky left-0 bg-white group-hover:bg-indigo-50/40 z-10 border-r border-slate-200 transition-colors">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                            {empName.charAt(0).toUpperCase()}
                          </div>
                          <div className="overflow-hidden">
                            <div className="font-semibold text-slate-900 truncate max-w-[130px]" title={empName}>{empName}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{empId}</div>
                          </div>
                        </div>
                      </td>

                      {daysArray.map((day) => {
                        const dateObj = new Date(selectedYear, selectedMonth - 1, day);
                        const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
                        const dayStatus = item.days[day];

                        return (
                          <td key={day} className={`px-1 py-2 text-center border-r border-slate-100 ${isWeekend ? 'bg-slate-50/50' : ''}`}>
                            {getDayStatusBadge(dayStatus, isWeekend)}
                          </td>
                        );
                      })}

                      <td className="px-2 py-2 text-center font-bold text-emerald-700 bg-emerald-50/30 border-l border-slate-200">
                        {item.totalPresent}
                      </td>
                      <td className="px-2 py-2 text-center font-bold text-amber-700 bg-amber-50/30">
                        {item.totalLate}
                      </td>
                      <td className="px-2 py-2 text-center font-bold text-rose-700 bg-rose-50/30">
                        {item.totalAbsent}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}