"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Users,
    CheckCircle2,
    Calendar,
    Briefcase,
    RefreshCw,
    Download,
    ArrowUpRight,
    TrendingUp,
    Loader2,
    Clock,
    Sparkles,
    PieChart as PieChartIcon,
    Building2,
} from "lucide-react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
    PieChart,
    Pie,
    Cell,
} from "recharts";
import api from "@/lib/api";

const LEAVE_COLORS = ["#4f46e5", "#06b6d4", "#8b5cf6", "#f59e0b", "#ec4899", "#10b981"];

const getInitials = (name) => {
    if (!name) return "U";
    const parts = name.trim().split(" ").filter(Boolean);
    return parts.length > 1
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : parts[0].slice(0, 2).toUpperCase();
};

const getTodayFormatted = () => {
    return new Date().toLocaleDateString("en-US", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    });
};

const getLastNDays = (n) => {
    const dates = [];
    for (let i = n - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dates.push(d);
    }
    return dates;
};

const CustomAttendanceTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-900/95 backdrop-blur-md text-white p-3 sm:p-3.5 rounded-2xl shadow-xl border border-slate-800 text-xs min-w-[140px] sm:min-w-[150px]">
                <p className="font-bold text-slate-300 mb-2 border-b border-slate-800 pb-1.5 flex items-center justify-between">
                    <span>{label}</span>
                    <Clock size={12} className="text-slate-500 shrink-0" />
                </p>
                <div className="space-y-1.5 font-medium">
                    <div className="flex items-center justify-between gap-4">
                        <span className="flex items-center gap-1.5 text-indigo-400">
                            <span className="w-2 h-2 rounded-full bg-indigo-500 ring-2 ring-indigo-500/20" />
                            Present:
                        </span>
                        <span className="font-bold text-white font-mono">{payload[0]?.value ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                        <span className="flex items-center gap-1.5 text-rose-400">
                            <span className="w-2 h-2 rounded-full bg-rose-500 ring-2 ring-rose-500/20" />
                            Absent:
                        </span>
                        <span className="font-bold text-white font-mono">{payload[1]?.value ?? 0}</span>
                    </div>
                </div>
            </div>
        );
    }
    return null;
};

export default function DashboardPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [employees, setEmployees] = useState([]);
    const [pendingLeaves, setPendingLeaves] = useState([]);
    const [attendanceTrend, setAttendanceTrend] = useState([]);
    const [leaveDistribution, setLeaveDistribution] = useState([]);
    const [departmentData, setDepartmentData] = useState([]);
    const [openPositionsCount, setOpenPositionsCount] = useState(0);
    const [todayAttendanceCount, setTodayAttendanceCount] = useState(0);

    const fetchData = useCallback(async (isManual = false) => {
        if (isManual) setRefreshing(true);
        else setLoading(true);

        try {
            const today = new Date().toISOString().split("T")[0];
            const last7Days = getLastNDays(7);

            const [
                empRes,
                leaveRes,
                leaveReportRes,
                empReportRes,
                positionsRes,
                todayAttendanceRes,
                ...attendanceByDay
            ] = await Promise.all([
                api.get("/employees"),
                api.get("/leave?status=pending"),
                api.get("/reports/leave"),
                api.get("/reports/employee"),
                api.get("/recruitment/positions"),
                api.get(`/attendance?date=${today}`),
                ...last7Days.map((d) => api.get(`/attendance?date=${d.toISOString().split("T")[0]}`)),
            ]);

            const empList = Array.isArray(empRes?.data) ? empRes.data : [];
            setEmployees(empList);
            setPendingLeaves(Array.isArray(leaveRes?.data) ? leaveRes.data : []);

            const todayRecords = Array.isArray(todayAttendanceRes?.data) ? todayAttendanceRes.data : [];
            setTodayAttendanceCount(todayRecords.filter((r) => r.status === "present").length);

            const positions = Array.isArray(positionsRes?.data) ? positionsRes.data : [];
            setOpenPositionsCount(positions.filter((p) => p.status === "open").length);

            const byType = leaveReportRes?.data?.byType || {};
            const leaveChartData = Object.entries(byType).map(([type, count], i) => ({
                name: type.charAt(0).toUpperCase() + type.slice(1) + " Leave",
                value: count,
                color: LEAVE_COLORS[i % LEAVE_COLORS.length],
            }));
            setLeaveDistribution(leaveChartData);

            const byDept = empReportRes?.data?.byDepartment || {};
            const maxCount = Math.max(...Object.values(byDept), 1);
            const deptChartData = Object.entries(byDept)
                .sort((a, b) => b[1] - a[1])
                .map(([name, count]) => ({ name, count, max: maxCount }));
            setDepartmentData(deptChartData);

            const totalEmp = empList.length;
            const trend = last7Days.map((d, i) => {
                const records = Array.isArray(attendanceByDay[i]?.data) ? attendanceByDay[i].data : [];
                const present = records.filter((r) => r.status === "present").length;
                const absent =
                    records.filter((r) => r.status === "absent").length || Math.max(0, totalEmp - present);
                const dayStr = d.toLocaleDateString("en-US", { weekday: "short" });
                const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

                return {
                    date: dateStr,
                    day: dayStr,
                    label: `${dayStr}, ${dateStr}`,
                    present: present,
                    absent: absent,
                };
            });
            setAttendanceTrend(trend);
        } catch (err) {
            console.error("Dashboard fetch error:", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(() => fetchData(true), 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [fetchData]);

    const handleExportAttendance = () => {
        const headers = "Date,Day,Present,Absent\n";
        const rows = attendanceTrend
            .map((row) => `${row.date},${row.day},${row.present},${row.absent}`)
            .join("\n");
        const blob = new Blob([headers + rows], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `attendance-trend-${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const totalEmployeesCount = employees.length;
    const activeEmployeesCount = employees.filter((e) => e.status === "active").length;
    const attendancePercentage =
        activeEmployeesCount > 0
            ? ((todayAttendanceCount / activeEmployeesCount) * 100).toFixed(1)
            : "0.0";
    const totalLeaveCount = useMemo(
        () => leaveDistribution.reduce((acc, curr) => acc + curr.value, 0),
        [leaveDistribution]
    );
    const maxDeptCount = useMemo(
        () => Math.max(...departmentData.map((d) => d.max), 1),
        [departmentData]
    );

    if (loading) {
        return (
            <div className="w-full min-h-[500px] flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 size={36} className="animate-spin text-indigo-600" />
                <p className="text-xs font-bold tracking-wider text-slate-600 uppercase">
                    Loading Workspace Analytics...
                </p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 antialiased">
            {/* Header Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-7 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs">
                <div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                            Executive Overview
                        </h1>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/70">
                            <Sparkles size={12} /> Live Sync
                        </span>
                    </div>
                    <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1 flex items-center gap-1.5">
                        <Calendar size={14} className="text-slate-400 shrink-0" />
                        {getTodayFormatted()}
                    </p>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                    <button
                        type="button"
                        onClick={() => fetchData(true)}
                        disabled={refreshing}
                        className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition-all shadow-xs active:scale-95 disabled:opacity-60 cursor-pointer"
                        title="Refresh dashboard metrics"
                    >
                        <RefreshCw size={14} className={refreshing ? "animate-spin text-indigo-600" : ""} />
                        <span>Sync</span>
                    </button>

                    <button
                        type="button"
                        onClick={handleExportAttendance}
                        className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold shadow-sm shadow-indigo-600/20 transition-all active:scale-95 hover:shadow-md cursor-pointer"
                    >
                        <Download size={14} />
                        <span>Export CSV</span>
                    </button>
                </div>
            </div>

            {/* 4 Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 sm:gap-4">
                {/* Card 1: Total Employees */}
                <div
                    className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs hover:shadow-lg hover:border-indigo-200 transition-all group cursor-pointer"
                    onClick={() => router.push("/employees")}
                >
                    <div className="flex items-center justify-between">
                        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100/80 shadow-xs group-hover:scale-105 transition-transform">
                            <Users size={20} className="sm:w-[22px] sm:h-[22px]" />
                        </div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            Workforce
                        </span>
                    </div>
                    <div className="mt-4">
                        <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-mono">
                            {totalEmployeesCount.toLocaleString()}
                        </h3>
                        <p className="text-xs font-bold text-slate-600 mt-1">Total Employees</p>
                        <p className="text-[11px] font-semibold text-emerald-600 mt-1 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                            {activeEmployeesCount} active on roster
                        </p>
                    </div>
                </div>

                {/* Card 2: Attendance */}
                <div
                    className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs hover:shadow-lg hover:border-emerald-200 transition-all group cursor-pointer"
                    onClick={() => router.push("/attendance")}
                >
                    <div className="flex items-center justify-between">
                        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100/80 shadow-xs group-hover:scale-105 transition-transform">
                            <CheckCircle2 size={20} className="sm:w-[22px] sm:h-[22px]" />
                        </div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            Attendance
                        </span>
                    </div>
                    <div className="mt-4">
                        <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-mono">
                            {todayAttendanceCount.toLocaleString()}
                        </h3>
                        <p className="text-xs font-bold text-slate-600 mt-1">Present Today</p>
                        <p className="text-[11px] font-bold text-emerald-600 mt-1">
                            {attendancePercentage}% attendance rate
                        </p>
                    </div>
                </div>

                {/* Card 3: Pending Leaves */}
                <div
                    className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs hover:shadow-lg hover:border-amber-200 transition-all group cursor-pointer"
                    onClick={() => router.push("/leave")}
                >
                    <div className="flex items-center justify-between">
                        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100/80 shadow-xs group-hover:scale-105 transition-transform">
                            <Calendar size={20} className="sm:w-[22px] sm:h-[22px]" />
                        </div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            Leave Requests
                        </span>
                    </div>
                    <div className="mt-4">
                        <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-mono">
                            {pendingLeaves.length}
                        </h3>
                        <p className="text-xs font-bold text-slate-600 mt-1">Pending Approval</p>
                        <p className="text-[11px] font-semibold text-amber-600 mt-1">
                            Awaiting manager review
                        </p>
                    </div>
                </div>

                {/* Card 4: Open Positions */}
                <div
                    className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs hover:shadow-lg hover:border-cyan-200 transition-all group cursor-pointer"
                    onClick={() => router.push("/recruitment")}
                >
                    <div className="flex items-center justify-between">
                        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center border border-cyan-100/80 shadow-xs group-hover:scale-105 transition-transform">
                            <Briefcase size={20} className="sm:w-[22px] sm:h-[22px]" />
                        </div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            Recruitment
                        </span>
                    </div>
                    <div className="mt-4">
                        <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-mono">
                            {openPositionsCount}
                        </h3>
                        <p className="text-xs font-bold text-slate-600 mt-1">Open Positions</p>
                        <p className="text-[11px] font-semibold text-slate-400 mt-1">
                            Active job postings
                        </p>
                    </div>
                </div>
            </div>

            {/* Attendance Trend Chart */}
            <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-slate-200/80 shadow-xs hover:shadow-md transition-all space-y-4 sm:space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 sm:pb-5">
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                                7-Day Attendance Trend
                            </h2>
                            <span className="p-1 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                                <TrendingUp size={14} />
                            </span>
                        </div>
                        <p className="text-xs font-medium text-slate-500 mt-0.5">
                            Daily turnout comparison across active working shifts
                        </p>
                    </div>

                    <div className="flex items-center gap-3 sm:gap-4 text-xs font-bold text-slate-600 self-start sm:self-auto">
                        <div className="flex items-center gap-2 bg-slate-50 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200/60">
                            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 ring-2 ring-indigo-500/20" />
                            <span>Present</span>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-50 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200/60">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-rose-500/20" />
                            <span>Absent</span>
                        </div>
                    </div>
                </div>

                <div className="h-64 sm:h-72 w-full select-none pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={attendanceTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="presentGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                                </linearGradient>
                                <linearGradient id="absentGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#64748b", fontWeight: 600 }} dy={10} />
                            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 500 }} />
                            <Tooltip content={<CustomAttendanceTooltip />} />
                            <Area type="monotone" dataKey="present" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#presentGradient)" activeDot={{ r: 5, stroke: "#6366f1", strokeWidth: 2, fill: "#ffffff" }} />
                            <Area type="monotone" dataKey="absent" stroke="#f43f5e" strokeWidth={2.5} fillOpacity={1} fill="url(#absentGradient)" activeDot={{ r: 5, stroke: "#f43f5e", strokeWidth: 2, fill: "#ffffff" }} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Grid: Leave Distribution & Department Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Leave Distribution */}
                <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-7 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                        <div>
                            <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                                <PieChartIcon size={17} className="text-indigo-600" />
                                Leave Breakdown
                            </h2>
                            <p className="text-xs font-medium text-slate-500 mt-0.5">
                                Annual overview • {totalLeaveCount} total days requested
                            </p>
                        </div>
                    </div>

                    {leaveDistribution.length === 0 ? (
                        <div className="py-12 sm:py-16 text-center text-xs font-medium text-slate-400">
                            No leave records found for the selected period.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="py-2 flex items-center justify-center">
                                <div className="h-40 w-40 sm:h-44 sm:w-44 relative flex items-center justify-center">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={leaveDistribution}
                                                innerRadius={48}
                                                outerRadius={70}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {leaveDistribution.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                        <span className="text-lg sm:text-xl font-extrabold text-slate-900 font-mono">
                                            {totalLeaveCount}
                                        </span>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                            Days
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2 pt-2 border-t border-slate-100">
                                {leaveDistribution.map((item) => (
                                    <div key={item.name} className="flex items-center justify-between text-xs p-1.5 rounded-xl hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-2 min-w-0 pr-2">
                                            <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: item.color }} />
                                            <span className="text-slate-700 font-bold truncate">{item.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
                                            <div className="w-16 sm:w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all duration-500"
                                                    style={{
                                                        width: `${(item.value / Math.max(totalLeaveCount, 1)) * 100}%`,
                                                        backgroundColor: item.color,
                                                    }}
                                                />
                                            </div>
                                            <span className="font-extrabold text-slate-900 w-8 text-right font-mono">
                                                {item.value}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Department Headcount */}
                <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-7 border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-indigo-200 transition-all duration-300 flex flex-col justify-between space-y-5 group/card">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                        <div>
                            <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2 group-hover/card:text-indigo-600 transition-colors">
                                <Building2 size={17} className="text-indigo-600 group-hover/card:scale-110 transition-transform" />
                                Department Headcount
                            </h2>
                            <p className="text-xs font-medium text-slate-500 mt-0.5">
                                Staff distribution across {departmentData.length} departments
                            </p>
                        </div>
                        <span className="text-[11px] font-bold text-slate-600 bg-slate-50 px-2.5 sm:px-3 py-1 rounded-xl border border-slate-200/60 font-mono shadow-2xs shrink-0">
                            {totalEmployeesCount} Total Staff
                        </span>
                    </div>

                    {departmentData.length === 0 ? (
                        <div className="py-12 sm:py-16 text-center text-xs font-medium text-slate-400">
                            No department assignments found. Please assign departments to employees.
                        </div>
                    ) : (
                        <div className="space-y-3 sm:space-y-3.5 pt-1">
                            {departmentData.map((dept) => {
                                const percentage = Math.round((dept.count / Math.max(totalEmployeesCount, 1)) * 100);

                                return (
                                    <div
                                        key={dept.name}
                                        onClick={() => router.push("/employees")}
                                        className="p-3 rounded-2xl bg-slate-50/60 hover:bg-indigo-50/50 border border-slate-200/60 hover:border-indigo-300 transition-all duration-300 cursor-pointer group/item shadow-2xs hover:shadow-md"
                                    >
                                        <div className="flex items-center justify-between text-xs mb-2">
                                            <span className="text-slate-800 font-bold group-hover/item:text-indigo-600 transition-colors flex items-center gap-1.5 truncate pr-2">
                                                <span className="w-2 h-2 rounded-full bg-indigo-500 ring-2 ring-indigo-500/20 group-hover/item:scale-125 transition-transform shrink-0" />
                                                <span className="truncate">{dept.name}</span>
                                            </span>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className="text-[10px] font-semibold text-slate-400 font-mono hidden sm:inline-block">
                                                    {percentage}% of total
                                                </span>
                                                <span className="text-slate-900 font-extrabold font-mono bg-white px-2 py-0.5 rounded-lg border border-slate-200 text-[11px] shadow-2xs group-hover/item:bg-indigo-600 group-hover:text-white transition-colors">
                                                    {dept.count} {dept.count === 1 ? "Employee" : "Employees"}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="w-full h-2.5 sm:h-3 bg-slate-200/70 rounded-lg overflow-hidden p-0.5 border border-slate-200/40">
                                            <div
                                                className="h-full bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 rounded-md transition-all duration-700 ease-out shadow-xs group-hover/item:brightness-110"
                                                style={{ width: `${(dept.count / maxDeptCount) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Pending Leave Requests Section */}
            <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-7 border border-slate-200/80 shadow-xs hover:shadow-md transition-all space-y-4 sm:space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                        <h2 className="text-base font-bold text-slate-900 tracking-tight">
                            Pending Leave Requests
                        </h2>
                        <p className="text-xs font-medium text-slate-500 mt-0.5">
                            {pendingLeaves.length} requests awaiting managerial approval
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => router.push("/leave")}
                        className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-bold transition-colors bg-indigo-50 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl border border-indigo-100 hover:bg-indigo-100 cursor-pointer shrink-0"
                    >
                        <span>Review All</span>
                        <ArrowUpRight size={14} />
                    </button>
                </div>

                {pendingLeaves.length === 0 ? (
                    <div className="text-center py-10 sm:py-12 text-slate-400 space-y-2">
                        <Calendar size={36} className="mx-auto text-slate-300 stroke-[1.5]" />
                        <p className="text-xs font-bold text-slate-600">All leave requests have been resolved</p>
                        <p className="text-[11px] text-slate-400">
                            There are currently no requests pending review.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-3.5">
                        {pendingLeaves.slice(0, 6).map((req) => {
                            const employeeName = req.employee?.name || "Unknown Employee";
                            const departmentName = req.employee?.department?.name || req.department || "General Division";

                            return (
                                <div
                                    key={req._id}
                                    onClick={() => router.push("/leave")}
                                    className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-slate-50/70 hover:bg-indigo-50/40 border border-slate-200/70 hover:border-indigo-300/80 transition-all group cursor-pointer shadow-2xs hover:shadow-md"
                                >
                                    <div className="flex items-center gap-3 min-w-0 pr-2">
                                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-xs border border-indigo-200 group-hover:scale-105 transition-transform">
                                            {getInitials(employeeName)}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                                                {employeeName}
                                            </p>
                                            <p className="text-[11px] font-medium text-slate-500 truncate mt-0.5">
                                                {departmentName} ·{" "}
                                                <span className="capitalize font-semibold text-slate-700">
                                                    {req.leaveType}
                                                </span>{" "}
                                                Leave
                                            </p>
                                        </div>
                                    </div>

                                    <div className="text-right shrink-0">
                                        <span className="inline-block text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-200/60 font-mono group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                            {req.totalDays || 1} {req.totalDays > 1 ? "Days" : "Day"}
                                        </span>
                                        <p className="text-[10px] font-semibold text-slate-400 mt-1">
                                            {new Date(req.startDate).toLocaleDateString("en-US", {
                                                month: "short",
                                                day: "numeric",
                                            })}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}