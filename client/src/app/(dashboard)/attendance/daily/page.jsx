"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Search,
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw,
  Loader2,
  AlertCircle,
  Edit3,
  ShieldCheck,
  ShieldAlert,
  X
} from 'lucide-react';
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { toast } from "react-toastify";
import { useAuth } from "@/context/AuthContext";

// Roles allowed to view/manage daily attendance. Adjust if your role names differ.
const ALLOWED_ROLES = ["admin", "hr"];

function AccessDeniedScreen({ role, router }) {
  return (
    <div className="w-full min-h-[600px] flex flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="w-20 h-20 rounded-3xl bg-rose-50 border border-rose-100 flex items-center justify-center">
        <ShieldAlert size={38} className="text-rose-500" />
      </div>
      <div className="space-y-1.5">
        <h2 className="text-xl font-black text-slate-900 tracking-tight">
          Access Denied
        </h2>
        <p className="text-sm font-medium text-slate-500 max-w-xs">
          Your role ({role || "employee"}) does not have permission to access this page.
        </p>
      </div>
      <button
        type="button"
        onClick={() => router.push("/dashboard")}
        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-bold shadow-sm shadow-indigo-200 transition-all duration-200 hover:shadow-md hover:shadow-indigo-300 active:scale-95"
      >
        Back to Dashboard
      </button>
    </div>
  );
}

export default function DailyAttendance() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({ total: 0, present: 0, late: 0, absent: 0, halfDay: 0 });
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [newStatus, setNewStatus] = useState("present");
  const [actionSubmitting, setActionSubmitting] = useState(false);

  const role = user?.role?.toLowerCase() || null;
  const roleChecked = !authLoading;
  const hasAccess = role && ALLOWED_ROLES.includes(role);

  const fetchAttendance = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const { data } = await api.get("/attendance", { params: { date: selectedDate } });
      const list = Array.isArray(data) ? data : [];
      setRecords(list);

      setSummary({
        total: list.length,
        present: list.filter((r) => r?.status?.toLowerCase() === "present").length,
        late: list.filter((r) => r?.status?.toLowerCase() === "late").length,
        absent: list.filter((r) => r?.status?.toLowerCase() === "absent").length,
        halfDay: list.filter((r) => r?.status?.toLowerCase() === "half-day" || r?.status?.toLowerCase() === "half day").length,
      });
    } catch (err) {
      console.error("Fetch attendance error:", err);
      if (err.response?.status === 401) {
        setErrorMsg("Login expired hai — dobara login karo.");
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
  }, [selectedDate]);

  useEffect(() => {
    if (roleChecked && hasAccess) {
      fetchAttendance();
    } else if (roleChecked) {
      setLoading(false);
    }
  }, [roleChecked, hasAccess, fetchAttendance]);

  // Handle Status Update (Fixed endpoint route matching)
  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!selectedRecord) return;

    setActionSubmitting(true);
    try {
      const empId = typeof selectedRecord.employee === "object"
        ? (selectedRecord.employee?._id || selectedRecord.employee?.id)
        : selectedRecord.employee;

      // Agar aapke backend me route /attendance/mark hai, toh yeh chalega. 
      // Agar 404 aaye toh check karein ki backend routes me /mark defined hai ya nahi.
      await api.post("/attendance/mark", {
        employee: empId,
        status: newStatus,
        checkInTime: selectedRecord.checkIn || new Date(),
      });

      toast.success("Attendance status updated successfully!");
      setIsModalOpen(false);
      fetchAttendance();
    } catch (err) {
      console.error("Update error:", err);
      toast.error(err.response?.data?.message || "Failed to update status. Check backend route /api/attendance/mark");
    } finally {
      setActionSubmitting(false);
    }
  };

  const filteredRecords = records.filter((item) => {
    if (!item) return false;
    const emp = item.employee && typeof item.employee === "object" ? item.employee : {};
    const empName = emp.name || emp.username || "";
    const empId = emp.employeeId || "";

    const matchesSearch =
      !searchTerm ||
      empName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      empId.toLowerCase().includes(searchTerm.toLowerCase());

    const itemStatus = (item.status || "present").toLowerCase();
    const matchesStatus =
      statusFilter === "All" ||
      (statusFilter === "Half Day" && (itemStatus === "half-day" || itemStatus === "half day")) ||
      itemStatus === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    const st = (status || 'present').toLowerCase();
    switch (st) {
      case 'present':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'late':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'absent':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'half-day':
      case 'half day':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'on-leave':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return "--:--";
    return new Date(dateStr).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  // Wait until we know the role before deciding what to render
  if (!roleChecked) {
    return (
      <div className="w-full min-h-[600px] flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 size={38} className="animate-spin text-indigo-600" />
        <p className="text-xs font-bold tracking-wider text-slate-600 uppercase">
          Verifying access...
        </p>
      </div>
    );
  }

  if (!hasAccess) {
    return <AccessDeniedScreen role={role} router={router} />;
  }

  return (
    <div className="w-full space-y-5 animate-in fade-in duration-300 font-sans">

      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Daily Attendance</h1>
          <p className="text-xs text-slate-500 mt-0.5">Live real-time daily shift & attendance monitor</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer font-medium text-slate-700"
            />
          </div>

          <button
            onClick={fetchAttendance}
            className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 hover:text-indigo-600 hover:bg-slate-100 active:scale-95 transition shadow-xs"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 flex items-center justify-between shadow-xs hover:border-indigo-200 transition-all">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Staff</p>
            <p className="text-xl font-bold text-slate-800 mt-1">{summary.total}</p>
          </div>
          <div className="p-2.5 bg-slate-100 text-slate-600 rounded-xl"><Users className="w-5 h-5" /></div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 flex items-center justify-between shadow-xs hover:border-emerald-200 transition-all">
          <div>
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Present</p>
            <p className="text-xl font-bold text-slate-800 mt-1">{summary.present}</p>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl"><CheckCircle2 className="w-5 h-5" /></div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 flex items-center justify-between shadow-xs hover:border-amber-200 transition-all">
          <div>
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Half-Day / Late</p>
            <p className="text-xl font-bold text-slate-800 mt-1">{summary.halfDay + summary.late}</p>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl"><Clock className="w-5 h-5" /></div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 flex items-center justify-between shadow-xs hover:border-rose-200 transition-all">
          <div>
            <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider">Absent</p>
            <p className="text-xl font-bold text-slate-800 mt-1">{summary.absent}</p>
          </div>
          <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl"><XCircle className="w-5 h-5" /></div>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              placeholder="Search employee, ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {['All', 'Present', 'Late', 'Absent', 'Half Day'].map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${statusFilter === filter ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {errorMsg && (
          <div className="m-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="px-5 py-3.5">Employee</th>
                <th className="px-5 py-3.5">Department</th>
                <th className="px-5 py-3.5">Punch In</th>
                <th className="px-5 py-3.5">Punch Out</th>
                <th className="px-5 py-3.5">Work Hours</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
                    Connecting to backend...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400 text-xs">
                    No attendance records found for this date.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((item) => {
                  const emp = item?.employee && typeof item.employee === "object" ? item.employee : {};
                  const empName = emp.name || emp.username || "Staff Member";
                  const empId = emp.employeeId || emp._id?.slice(-6) || "—";
                  const dept = emp.department?.name || emp.department || emp.role || "General";

                  return (
                    <tr key={item._id} className="hover:bg-indigo-50/40 transition-all duration-150 group">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <img
                            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(empName)}&background=6366f1&color=fff`}
                            alt={empName}
                            className="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-xs"
                          />
                          <div>
                            <div className="text-xs sm:text-sm font-semibold text-slate-800">{empName}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{empId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-700 font-medium">{dept}</td>
                      <td className="px-5 py-3.5 text-xs font-mono text-slate-600">{formatTime(item.checkIn)}</td>
                      <td className="px-5 py-3.5 text-xs font-mono text-slate-600">{formatTime(item.checkOut)}</td>
                      <td className="px-5 py-3.5 text-xs font-mono text-slate-600">{item.workHours ? `${item.workHours}h` : "--"}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold border capitalize ${getStatusBadge(item.status)}`}>
                          {item.status || 'present'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => {
                            setSelectedRecord(item);
                            setNewStatus(item.status || "present");
                            setIsModalOpen(true);
                          }}
                          className="p-2 bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-600 rounded-xl transition shadow-xs opacity-80 group-hover:opacity-100"
                          title="Change Status"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🌟 Ultra-Stylish & Smooth Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-6 transform scale-100 animate-in zoom-in-95 duration-200 border border-slate-100">

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Update Attendance Status</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Modify shift or attendance records manually</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleUpdateStatus} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">Select New Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition cursor-pointer"
                >
                  <option value="present">🟢 Present</option>
                  <option value="absent">🔴 Absent</option>
                  <option value="half-day">🔵 Half Day</option>
                  <option value="late">🟡 Late</option>
                  <option value="on-leave">🟣 On Leave</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionSubmitting}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-100 transition active:scale-95 disabled:opacity-50 flex items-center gap-2"
                >
                  {actionSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}