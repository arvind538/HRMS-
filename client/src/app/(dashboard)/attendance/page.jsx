"use client";
import { useEffect, useState } from "react";
import {
    LogIn,
    LogOut,
    Calendar,
    Clock,
    UserCheck,
    UserX,
    RefreshCw,
    Timer,
    CheckCircle2
} from "lucide-react";
import api from "@/lib/api";
import Table from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import { toast } from "react-toastify";

export default function AttendancePage() {
    const [records, setRecords] = useState([]);
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);

    const fetchAttendance = async () => {
        setLoading(true);
        try {
            const { data } = await api.get("/attendance", { params: { date } });
            setRecords(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAttendance();
    }, [date]);

    // Helper: LocalStorage se sahi ID nikalne ke liye
    const getCurrentEmployeeId = () => {
        try {
            const rawUser = localStorage.getItem("hrms_user");
            if (!rawUser) return null;
            const parsed = JSON.parse(rawUser);

            // Agar parsed.employee object hai toh uski ID, agar string ID hai toh wo, 
            // aur agar null hai toh login user ki apni _id
            return (
                parsed?.employee?._id ||
                parsed?.employee?.id ||
                (typeof parsed?.employee === "string" ? parsed?.employee : null) ||
                parsed?._id ||
                parsed?.id ||
                null
            );
        } catch (e) {
            console.error("Storage parse error:", e);
            return null;
        }
    };

    const handleCheckIn = async () => {
        const empId = getCurrentEmployeeId();

        if (!empId) {
            toast.error("User session expired or ID missing. Please log in again.");
            return;
        }

        setActionLoading("checkin");
        try {
            await api.post("/attendance/check-in", { employee: empId });
            toast.success("Checked in successfully!");
            fetchAttendance();
        } catch (err) {
            toast.error(err.response?.data?.message || "Check-in failed");
        } finally {
            setActionLoading(null);
        }
    };

    const handleCheckOut = async () => {
        const empId = getCurrentEmployeeId();

        if (!empId) {
            toast.error("User session expired or ID missing. Please log in again.");
            return;
        }

        setActionLoading("checkout");
        try {
            await api.put("/attendance/check-out", { employee: empId });
            toast.success("Checked out successfully!");
            fetchAttendance();
        } catch (err) {
            toast.error(err.response?.data?.message || "Check-out failed");
        } finally {
            setActionLoading(null);
        }
    };

    // Metrics
    const totalEmployees = records.length;
    const presentCount = records.filter((r) => r.status === "present").length;
    const absentCount = records.filter((r) => r.status === "absent").length;
    const onTimePercentage = totalEmployees > 0
        ? Math.round((presentCount / totalEmployees) * 100)
        : 0;

    const columns = [
        {
            key: "employee",
            label: "Employee",
            render: (row) => {
                // Check if employee is populated object or just an ID string
                const empObj = typeof row.employee === "object" ? row.employee : null;
                const empName = empObj?.name || "Staff Member";
                const empDept = empObj?.department || empObj?.role || "Employee";

                return (
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white flex items-center justify-center font-bold text-xs shadow-sm shadow-indigo-100">
                            {empName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <span className="font-semibold text-slate-800 block text-sm leading-snug">
                                {empName}
                            </span>
                            <span className="text-[11px] font-medium text-slate-400 capitalize">
                                {empDept}
                            </span>
                        </div>
                    </div>
                );
            },
        },
        // Baaki columns wese hi rahenge...
        {
            key: "checkIn",
            label: "Check In",
            render: (row) => (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                    <Clock size={13} className="text-emerald-500" />
                    <span>{row.checkIn ? new Date(row.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—"}</span>
                </div>
            ),
        },
        {
            key: "checkOut",
            label: "Check Out",
            render: (row) => (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                    <Clock size={13} className="text-rose-400" />
                    <span>{row.checkOut ? new Date(row.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—"}</span>
                </div>
            ),
        },
        {
            key: "workHours",
            label: "Work Hours",
            render: (row) => (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200/60 font-semibold text-slate-700 text-xs">
                    <Timer size={13} className="text-slate-400" />
                    {row.workHours ? `${row.workHours} hrs` : "—"}
                </span>
            ),
        },
        {
            key: "status",
            label: "Status",
            render: (row) => {
                const isPresent = row.status === "present";
                return (
                    <span
                        className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border capitalize ${isPresent
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200/70"
                            : "bg-rose-50 text-rose-700 border-rose-200/70"
                            }`}
                    >
                        <span className={`w-1.5 h-1.5 rounded-full ${isPresent ? "bg-emerald-500" : "bg-rose-500"}`} />
                        {row.status}
                    </span>
                );
            },
        },
    ];

    return (
        <div className="max-w-[1400px] mx-auto p-4 sm:p-4 lg:p-4 space-y-6">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Attendance Tracker</h1>
                    <p className="text-xs text-slate-500 mt-0.5">Real-time attendance logs, punch times, and shift analytics</p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    <button
                        onClick={fetchAttendance}
                        className="p-2.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-all duration-200 shadow-sm"
                        title="Refresh Attendance"
                    >
                        <RefreshCw size={16} className={loading ? "animate-spin text-indigo-600" : ""} />
                    </button>

                    <Button
                        onClick={handleCheckIn}
                        loading={actionLoading === "checkin"}
                        className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl px-4 py-2.5 font-medium shadow-md shadow-emerald-100 transition-all duration-200 flex items-center gap-2"
                    >
                        <LogIn size={16} /> Punch In
                    </Button>

                    <Button
                        onClick={handleCheckOut}
                        loading={actionLoading === "checkout"}
                        className="bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-xl px-4 py-2.5 font-medium shadow-md shadow-rose-100 transition-all duration-200 flex items-center gap-2"
                    >
                        <LogOut size={16} /> Punch Out
                    </Button>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Records</p>
                        <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalEmployees}</h3>
                    </div>
                    <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                        <Calendar size={20} />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Present Today</p>
                        <h3 className="text-2xl font-bold text-slate-900 mt-1">{presentCount}</h3>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                        <UserCheck size={20} />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-bold text-rose-500 uppercase tracking-wider">Absent Today</p>
                        <h3 className="text-2xl font-bold text-slate-900 mt-1">{absentCount}</h3>
                    </div>
                    <div className="p-3 rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
                        <UserX size={20} />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-bold text-violet-600 uppercase tracking-wider">Attendance Rate</p>
                        <h3 className="text-2xl font-bold text-slate-900 mt-1">{onTimePercentage}%</h3>
                    </div>
                    <div className="p-3 rounded-xl bg-violet-50 text-violet-600 border border-violet-100">
                        <CheckCircle2 size={20} />
                    </div>
                </div>
            </div>

            {/* Date Filter */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Selected Date:</label>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="pl-3 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all cursor-pointer"
                    />
                </div>
                <p className="text-xs text-slate-400 font-medium">
                    Showing logs for <span className="font-semibold text-slate-700">{new Date(date).toDateString()}</span>
                </p>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
                        <RefreshCw size={24} className="animate-spin text-indigo-600" />
                        <p className="text-xs font-semibold text-slate-500">Fetching attendance logs...</p>
                    </div>
                ) : records.length === 0 ? (
                    <div className="text-center py-20 text-slate-400">
                        <Calendar size={40} className="mx-auto text-slate-300 mb-3 stroke-[1.5]" />
                        <p className="font-semibold text-slate-700 text-sm">No attendance logs found for this date</p>
                        <p className="text-xs text-slate-400 mt-1">Select a different date or punch in to record attendance.</p>
                    </div>
                ) : (
                    <Table columns={columns} data={records} />
                )}
            </div>
        </div>
    );
}