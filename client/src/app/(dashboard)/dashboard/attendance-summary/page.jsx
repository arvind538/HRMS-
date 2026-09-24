"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
    UserCheck,
    UserX,
    Clock,
    Calendar,
    RefreshCw,
    Loader2,
    ChevronDown,
    Check,
    ArrowUpRight,
} from "lucide-react";
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
} from "recharts";
import api from "@/lib/api";

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

function CustomAttendanceTooltip({ active, payload, label }) {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-2xl shadow-xl border border-slate-800 text-xs min-w-[140px] space-y-1.5">
                <p className="font-bold text-slate-300 border-b border-slate-800 pb-1.5 flex items-center justify-between">
                    <span>{label}</span>
                    <Clock size={12} className="text-slate-500 shrink-0" />
                </p>
                <div className="space-y-1 font-medium">
                    <div className="flex items-center justify-between gap-4">
                        <span className="flex items-center gap-1.5 text-indigo-400">
                            <span className="w-2 h-2 rounded-full bg-indigo-500 ring-2 ring-indigo-500/20" />
                            Present:
                        </span>
                        <span className="font-bold text-white font-mono">
                            {payload[0]?.value ?? 0}
                        </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                        <span className="flex items-center gap-1.5 text-rose-400">
                            <span className="w-2 h-2 rounded-full bg-rose-500 ring-2 ring-rose-500/20" />
                            Absent:
                        </span>
                        <span className="font-bold text-white font-mono">
                            {payload[1]?.value ?? 0}
                        </span>
                    </div>
                </div>
            </div>
        );
    }
    return null;
}

export default function AttendanceSummaryPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [records, setRecords] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const dropdownRef = useRef(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fetchAttendanceSummary = async (isManual = false) => {
        if (isManual) setRefreshing(true);
        else setLoading(true);

        try {
            const [attRes, empRes] = await Promise.all([
                api.get("/attendance", { params: { month, year } }),
                api.get("/employees"),
            ]);
            setRecords(Array.isArray(attRes?.data) ? attRes.data : []);
            setEmployees(Array.isArray(empRes?.data) ? empRes.data : []);
        } catch (err) {
            console.error("Failed to load attendance summary:", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchAttendanceSummary();
    }, [month, year]);

    const totalEmployees = employees.length;
    const presentRecords = records.filter((r) => r.status === "present");
    const absentRecords = records.filter((r) => r.status === "absent");

    const totalWorkingHours = records.reduce(
        (acc, curr) => acc + (Number(curr.workHours) || 0),
        0
    );
    const averageHoursPerDay =
        presentRecords.length > 0
            ? (totalWorkingHours / presentRecords.length).toFixed(1)
            : "0.0";

    const chartData = useMemo(() => {
        const map = {};
        records.forEach((r) => {
            const dateKey = r.date
                ? new Date(r.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                })
                : "N/A";
            if (!map[dateKey]) {
                map[dateKey] = { date: dateKey, present: 0, absent: 0 };
            }
            if (r.status === "present") map[dateKey].present += 1;
            if (r.status === "absent") map[dateKey].absent += 1;
        });
        return Object.values(map);
    }, [records]);

    if (loading) {
        return (
            <div className="w-full min-h-[500px] flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 size={36} className="animate-spin text-indigo-600" />
                <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Loading Attendance Analytics...
                </p>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 antialiased font-sans text-slate-900">
            {/* Top Filter & Action Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-7 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                        Monthly Attendance Summary
                    </h1>
                    <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
                        Aggregated shift logs, check-in records, and workforce presence ratios.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    {/* Custom Month Dropdown */}
                    <div className="relative inline-block text-left" ref={dropdownRef}>
                        <button
                            type="button"
                            onClick={() => setIsDropdownOpen((prev) => !prev)}
                            className="flex items-center justify-between gap-2.5 px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-xl sm:rounded-2xl text-xs font-bold text-slate-700 shadow-2xs transition-all active:scale-95 focus:outline-none cursor-pointer"
                        >
                            <span>{MONTHS[month - 1]}</span>
                            <ChevronDown
                                size={15}
                                className={`text-slate-400 transition-transform duration-200 ease-in-out ${isDropdownOpen ? "rotate-180 text-indigo-600" : ""
                                    }`}
                            />
                        </button>

                        <div
                            className={`absolute right-0 sm:left-0 mt-2 w-44 sm:w-48 bg-white/95 backdrop-blur-md border border-slate-100 rounded-2xl shadow-xl shadow-slate-200/50 ring-1 ring-black/5 z-50 p-1.5 max-h-60 overflow-y-auto transform transition-all duration-200 origin-top ${isDropdownOpen
                                ? "opacity-100 scale-100 pointer-events-auto translate-y-0"
                                : "opacity-0 scale-95 pointer-events-none -translate-y-2"
                                }`}
                        >
                            {MONTHS.map((name, i) => {
                                const val = i + 1;
                                const isSelected = month === val;
                                return (
                                    <button
                                        key={val}
                                        type="button"
                                        onClick={() => {
                                            setMonth(val);
                                            setIsDropdownOpen(false);
                                        }}
                                        className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs transition-colors font-semibold cursor-pointer ${isSelected
                                            ? "bg-indigo-50 text-indigo-600"
                                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                            }`}
                                    >
                                        <span>{name}</span>
                                        {isSelected && (
                                            <Check size={14} className="text-indigo-600 stroke-[2.5]" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Year Input */}
                    <input
                        type="number"
                        value={year}
                        onChange={(e) => setYear(Number(e.target.value))}
                        className="px-3 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl sm:rounded-2xl text-xs font-bold text-slate-700 w-20 sm:w-24 text-center focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    />

                    {/* Refresh Action */}
                    <button
                        type="button"
                        onClick={() => fetchAttendanceSummary(true)}
                        disabled={refreshing}
                        className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-xl sm:rounded-2xl text-slate-700 hover:text-indigo-600 transition-all active:scale-95 focus:outline-none shadow-2xs disabled:opacity-60 cursor-pointer"
                        title="Sync Data"
                    >
                        <RefreshCw
                            size={15}
                            className={refreshing ? "animate-spin text-indigo-600" : ""}
                        />
                    </button>
                </div>
            </div>

            {/* 4 Stat KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
                {/* Total Logs */}
                <div
                    onClick={() => router.push("/attendance")}
                    className="bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-indigo-300 hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex flex-col justify-between"
                >
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100/80 shadow-2xs group-hover:scale-105 transition-transform">
                                <Calendar size={20} className="sm:w-[22px] sm:h-[22px]" />
                            </div>
                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider group-hover:text-indigo-600 transition-colors">
                                Total Logs
                            </span>
                        </div>
                        <h3 className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
                            {records.length.toLocaleString()}
                        </h3>
                    </div>
                    <p className="text-xs font-semibold text-slate-500 mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span>{totalEmployees} enrolled personnel</span>
                        <ArrowUpRight
                            size={14}
                            className="text-indigo-600 group-hover:translate-x-0.5 transition-transform"
                        />
                    </p>
                </div>

                {/* Present Count */}
                <div
                    onClick={() => router.push("/attendance?status=present")}
                    className="bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-emerald-300 hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex flex-col justify-between"
                >
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100/80 shadow-2xs group-hover:scale-105 transition-transform">
                                <UserCheck size={20} className="sm:w-[22px] sm:h-[22px]" />
                            </div>
                            <span className="text-[11px] font-black text-emerald-600 uppercase tracking-wider">
                                Total Present
                            </span>
                        </div>
                        <h3 className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
                            {presentRecords.length.toLocaleString()}
                        </h3>
                    </div>
                    <p className="text-xs font-semibold text-emerald-600 mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span>Verified check-ins</span>
                        <ArrowUpRight
                            size={14}
                            className="text-emerald-600 group-hover:translate-x-0.5 transition-transform"
                        />
                    </p>
                </div>

                {/* Absent Count */}
                <div
                    onClick={() => router.push("/attendance?status=absent")}
                    className="bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-rose-300 hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex flex-col justify-between"
                >
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100/80 shadow-2xs group-hover:scale-105 transition-transform">
                                <UserX size={20} className="sm:w-[22px] sm:h-[22px]" />
                            </div>
                            <span className="text-[11px] font-black text-rose-500 uppercase tracking-wider">
                                Total Absent
                            </span>
                        </div>
                        <h3 className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
                            {absentRecords.length.toLocaleString()}
                        </h3>
                    </div>
                    <p className="text-xs font-semibold text-rose-500 mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span>Unrecorded shifts</span>
                        <ArrowUpRight
                            size={14}
                            className="text-rose-500 group-hover:translate-x-0.5 transition-transform"
                        />
                    </p>
                </div>

                {/* Average Daily Hours */}
                <div
                    onClick={() => router.push("/attendance")}
                    className="bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-violet-300 hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex flex-col justify-between"
                >
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center border border-violet-100/80 shadow-2xs group-hover:scale-105 transition-transform">
                                <Clock size={20} className="sm:w-[22px] sm:h-[22px]" />
                            </div>
                            <span className="text-[11px] font-black text-violet-600 uppercase tracking-wider">
                                Average Daily Hours
                            </span>
                        </div>
                        <h3 className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
                            {averageHoursPerDay} hrs
                        </h3>
                    </div>
                    <p className="text-xs font-semibold text-slate-500 mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span>{totalWorkingHours.toLocaleString()} total logged hours</span>
                        <ArrowUpRight
                            size={14}
                            className="text-violet-600 group-hover:translate-x-0.5 transition-transform"
                        />
                    </p>
                </div>
            </div>

            {/* Monthly Attendance Trend Chart */}
            <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300 space-y-4 sm:space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 sm:pb-5">
                    <div>
                        <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                            Monthly Attendance Trend
                        </h2>
                        <p className="text-xs font-medium text-slate-500 mt-0.5">
                            Day-by-day attendance distribution for {MONTHS[month - 1]} {year}
                        </p>
                    </div>

                    <div className="flex items-center gap-3 text-xs font-bold text-slate-600 self-start sm:self-auto">
                        <div className="flex items-center gap-2 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200/60">
                            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 ring-2 ring-indigo-500/20" />
                            <span>Present</span>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200/60">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-rose-500/20" />
                            <span>Absent</span>
                        </div>
                    </div>
                </div>

                {chartData.length === 0 ? (
                    <div className="py-20 text-center">
                        <Calendar size={36} className="mx-auto text-slate-300 stroke-[1.5] mb-2" />
                        <p className="text-sm font-bold text-slate-700">
                            No attendance records found
                        </p>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                            No punch logs have been registered for {MONTHS[month - 1]} {year}. Try selecting another month or year.
                        </p>
                    </div>
                ) : (
                    <div className="h-64 sm:h-72 w-full select-none pt-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                                data={chartData}
                                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                            >
                                <defs>
                                    <linearGradient id="attSummaryGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.25} />
                                        <stop offset="95%" stopColor="#4F46E5" stopOpacity={0.0} />
                                    </linearGradient>
                                    <linearGradient id="attAbsentGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#F43F5E" stopOpacity={0.0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    vertical={false}
                                    stroke="#F1F5F9"
                                />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fontSize: 11, fill: "#64748B", fontWeight: 600 }}
                                    tickLine={false}
                                    axisLine={false}
                                    dy={8}
                                />
                                <YAxis
                                    allowDecimals={false}
                                    tick={{ fontSize: 11, fill: "#94A3B8", fontWeight: 500 }}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip content={<CustomAttendanceTooltip />} />
                                <Area
                                    type="monotone"
                                    dataKey="present"
                                    stroke="#4F46E5"
                                    strokeWidth={2.5}
                                    fill="url(#attSummaryGrad)"
                                    activeDot={{
                                        r: 5,
                                        fill: "#ffffff",
                                        stroke: "#4F46E5",
                                        strokeWidth: 2,
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="absent"
                                    stroke="#F43F5E"
                                    strokeWidth={2.5}
                                    fill="url(#attAbsentGrad)"
                                    activeDot={{
                                        r: 5,
                                        fill: "#ffffff",
                                        stroke: "#F43F5E",
                                        strokeWidth: 2,
                                    }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>
        </div>
    );
}