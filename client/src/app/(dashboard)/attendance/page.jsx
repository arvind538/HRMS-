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
import { useAuth } from "@/context/AuthContext";

export default function AttendancePage() {
    const { user: authUser } = useAuth();
    const [records, setRecords] = useState([]);
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);

    // Helper: LocalStorage ya AuthContext se active user ki details nikalne ke liye
    const getLoggedInUserData = () => {
        try {
            const rawUser = localStorage.getItem("hrms_user");
            const parsed = rawUser ? JSON.parse(rawUser) : null;

            const userId = authUser?._id || authUser?.id || authUser?.employee?._id || parsed?.employee?._id || parsed?.employee?.id || (typeof parsed?.employee === "string" ? parsed?.employee : null) || parsed?._id || parsed?.id || null;
            const userName = authUser?.name || authUser?.username || parsed?.employee?.name || parsed?.name || parsed?.username || "Staff Member";
            const userDept = authUser?.department || authUser?.role || parsed?.employee?.department || parsed?.department || parsed?.role || "Employee";

            return { id: userId, name: userName, department: userDept };
        } catch (e) {
            console.error("Storage parse error:", e);
            return { id: null, name: "Staff Member", department: "Employee" };
        }
    };

    const fetchAttendance = async () => {
        setLoading(true);
        try {
            const { data } = await api.get("/attendance", { params: { date } });
            const list = Array.isArray(data) ? data : (data.attendance || data.data || []);
            setRecords(list);
        } catch (err) {
            console.error(err);
            toast.error("Attendance records load nahi ho paye.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAttendance();
    }, [date]);

    const handleCheckIn = async () => {
        const userData = getLoggedInUserData();

        if (!userData.id) {
            toast.error("User session expired or ID missing. Please log in again.");
            return;
        }

        setActionLoading("checkin");
        try {
            await api.post("/attendance/check-in", {
                employee: userData.id,
                name: userData.name // Backend ke liye name pass kiya
            });
            toast.success("Checked in successfully!");
            fetchAttendance();
        } catch (err) {
            toast.error(err.response?.data?.message || "Check-in failed");
        } finally {
            setActionLoading(null);
        }
    };

    const handleCheckOut = async () => {
        const userData = getLoggedInUserData();

        if (!userData.id) {
            toast.error("User session expired or ID missing. Please log in again.");
            return;
        }

        setActionLoading("checkout");
        try {
            await api.put("/attendance/check-out", { employee: userData.id });
            toast.success("Checked out successfully!");
            fetchAttendance();
        } catch (err) {
            toast.error(err.response?.data?.message || "Check-out failed");
        } finally {
            setActionLoading(null);
        }
    };

    const totalEmployees = records.length;
    const presentCount = records.filter((r) => r.status?.toLowerCase() === "present" || r.status?.toLowerCase() === "half-day").length;
    const absentCount = records.filter((r) => r.status?.toLowerCase() === "absent").length;
    const attendanceRate = totalEmployees > 0
        ? Math.round((presentCount / totalEmployees) * 100)
        : 0;

    const loggedInUser = getLoggedInUserData();

    const columns = [
        {
            key: "employee",
            label: "Employee",
            render: (row) => {
                // Backend se aane wale employee object ya fields ko safely check karna
                const empObj = typeof row.employee === "object" && row.employee !== null ? row.employee : null;

                // Name extraction with multiple fallbacks
                const empName = empObj?.name ||
                    empObj?.fullName ||
                    empObj?.username ||
                    row.userName ||
                    row.name ||
                    (row.employee === loggedInUser.id ? loggedInUser.name : null) ||
                    "Staff Member";

                // Department extraction with multiple fallbacks
                const empDept = empObj?.department ||
                    empObj?.role ||
                    row.department ||
                    (row.employee === loggedInUser.id ? loggedInUser.department : null) ||
                    "Employee";

                return (
                    <div className="flex items-center gap-3.5 group/item">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white flex items-center justify-center font-extrabold text-xs shadow-sm shadow-indigo-100 group-hover/item:scale-105 transition-transform">
                            {empName ? empName.charAt(0).toUpperCase() : "U"}
                        </div>
                        <div>
                            <span className="font-bold text-slate-900 block text-xs leading-snug group-hover/item:text-indigo-600 transition-colors">
                                {empName}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-400 capitalize">
                                {empDept}
                            </span>
                        </div>
                    </div>
                );
            },
        },
        {
            key: "checkIn",
            label: "Check In",
            render: (row) => (
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <Clock size={13} className="text-emerald-500" />
                    <span>{row.checkIn ? new Date(row.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—"}</span>
                </div>
            ),
        },
        {
            key: "checkOut",
            label: "Check Out",
            render: (row) => (
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <Clock size={13} className="text-rose-400" />
                    <span>{row.checkOut ? new Date(row.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—"}</span>
                </div>
            ),
        },
        {
            key: "workHours",
            label: "Work Hours",
            render: (row) => (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-slate-50 border border-slate-200/80 font-bold text-slate-700 text-xs shadow-2xs">
                    <Timer size={13} className="text-slate-400" />
                    {row.workHours ? `${row.workHours} hrs` : (row.hours ? `${row.hours} hrs` : "—")}
                </span>
            ),
        },
        {
            key: "status",
            label: "Status",
            render: (row) => {
                const statusStr = (row.status || "present").toLowerCase();
                const isPresent = statusStr === "present" || statusStr === "half-day";
                return (
                    <span
                        className={`inline-flex items-center gap-1.5 text-[11px] font-extrabold px-3 py-1 rounded-full border capitalize shadow-2xs ${isPresent
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                            : "bg-rose-50 text-rose-700 border-rose-200/80"
                            }`}
                    >
                        <span className={`w-1.5 h-1.5 rounded-full ${isPresent ? "bg-emerald-500" : "bg-rose-500"}`} />
                        {row.status || "Present"}
                    </span>
                );
            },
        },
    ];

    return (
        <div className="max-w-[1400px] mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs transition-all hover:shadow-md">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Attendance Tracker</h1>
                    <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-1">Real-time attendance logs, punch times, and shift analytics</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={fetchAttendance}
                        className="p-3 border border-slate-200/80 rounded-2xl text-slate-600 hover:bg-slate-50 hover:border-slate-300 active:scale-95 transition-all duration-200 shadow-2xs cursor-pointer"
                        title="Refresh Attendance"
                    >
                        <RefreshCw size={16} className={loading ? "animate-spin text-indigo-600" : ""} />
                    </button>

                    <Button
                        onClick={handleCheckIn}
                        loading={actionLoading === "checkin"}
                        className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-2xl px-5 py-3 font-bold text-xs shadow-md shadow-emerald-100 transition-all duration-200 flex items-center gap-2 cursor-pointer"
                    >
                        <LogIn size={16} /> Punch In
                    </Button>

                    <Button
                        onClick={handleCheckOut}
                        loading={actionLoading === "checkout"}
                        className="bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-2xl px-5 py-3 font-bold text-xs shadow-md shadow-rose-100 transition-all duration-200 flex items-center gap-2 cursor-pointer"
                    >
                        <LogOut size={16} /> Punch Out
                    </Button>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs transition-all hover:shadow-md flex items-center justify-between group">
                    <div>
                        <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Total Records</p>
                        <h3 className="text-3xl font-extrabold text-slate-900 mt-1.5">{totalEmployees}</h3>
                    </div>
                    <div className="p-4 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 group-hover:scale-110 transition-transform shadow-2xs">
                        <Calendar size={22} />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs transition-all hover:shadow-md flex items-center justify-between group">
                    <div>
                        <p className="text-[11px] font-extrabold text-emerald-600 uppercase tracking-wider">Present Today</p>
                        <h3 className="text-3xl font-extrabold text-slate-900 mt-1.5">{presentCount}</h3>
                    </div>
                    <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 group-hover:scale-110 transition-transform shadow-2xs">
                        <UserCheck size={22} />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs transition-all hover:shadow-md flex items-center justify-between group">
                    <div>
                        <p className="text-[11px] font-extrabold text-rose-500 uppercase tracking-wider">Absent Today</p>
                        <h3 className="text-3xl font-extrabold text-slate-900 mt-1.5">{absentCount}</h3>
                    </div>
                    <div className="p-4 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 group-hover:scale-110 transition-transform shadow-2xs">
                        <UserX size={22} />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs transition-all hover:shadow-md flex items-center justify-between group">
                    <div>
                        <p className="text-[11px] font-extrabold text-violet-600 uppercase tracking-wider">Attendance Rate</p>
                        <h3 className="text-3xl font-extrabold text-slate-900 mt-1.5">{attendanceRate}%</h3>
                    </div>
                    <div className="p-4 rounded-2xl bg-violet-50 text-violet-600 border border-violet-100 group-hover:scale-110 transition-transform shadow-2xs">
                        <CheckCircle2 size={22} />
                    </div>
                </div>
            </div>

            {/* Date Filter */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Select Date:</label>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 focus:outline-none transition-all cursor-pointer shadow-2xs"
                    />
                </div>
                <p className="text-xs font-semibold text-slate-400">
                    Showing logs for <span className="font-bold text-slate-700">{new Date(date).toDateString()}</span>
                </p>
            </div>

            {/* Table */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
                        <RefreshCw size={24} className="animate-spin text-indigo-600" />
                        <p className="text-xs font-semibold text-slate-500">Fetching attendance logs...</p>
                    </div>
                ) : records.length === 0 ? (
                    <div className="text-center py-20 text-slate-400">
                        <Calendar size={40} className="mx-auto text-slate-300 mb-3 stroke-[1.5]" />
                        <p className="font-bold text-slate-700 text-sm">No attendance logs found for this date</p>
                        <p className="text-xs text-slate-400 mt-1 font-medium">Select a different date or punch in to record attendance.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table columns={columns} data={records} />
                    </div>
                )}
            </div>
        </div>
    );
}