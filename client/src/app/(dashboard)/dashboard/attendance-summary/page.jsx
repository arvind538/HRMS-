"use client";
import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { UserCheck, UserX, Clock, Calendar, RefreshCw, Loader2, ChevronDown, Check, ArrowUpRight } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import api from "@/lib/api";

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

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

    // Bahar click karne par dropdown close karne ke liye
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
                api.get("/employees")
            ]);
            setRecords(Array.isArray(attRes?.data) ? attRes.data : []);
            setEmployees(Array.isArray(empRes?.data) ? empRes.data : []);
        } catch (err) {
            console.error("Attendance fetch error:", err);
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

    const totalWorkingHours = records.reduce((acc, curr) => acc + (Number(curr.workHours) || 0), 0);
    const averageHoursPerDay = presentRecords.length > 0 ? (totalWorkingHours / presentRecords.length).toFixed(1) : 0;

    const chartData = useMemo(() => {
        const map = {};
        records.forEach((r) => {
            const dateKey = r.date ? new Date(r.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—";
            if (!map[dateKey]) map[dateKey] = { date: dateKey, present: 0, absent: 0 };
            if (r.status === "present") map[dateKey].present += 1;
            if (r.status === "absent") map[dateKey].absent += 1;
        });
        return Object.values(map);
    }, [records]);

    if (loading) {
        return (
            <div className="w-full py-28 flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 size={36} className="animate-spin text-indigo-600" />
                <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Loading attendance analytics...</p>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-3 lg:px-4 py-4 space-y-3 antialiased transition-all duration-300">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-300">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-900">Monthly Attendance Summary</h1>
                    <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">Aggregated logs, shift records, and presence ratio</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Stylish Smooth Month Dropdown */}
                    <div className="relative inline-block text-left" ref={dropdownRef}>
                        <button
                            type="button"
                            onClick={() => setIsDropdownOpen((prev) => !prev)}
                            className="flex items-center justify-between gap-3 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-2xl text-xs font-bold text-slate-700 shadow-xs transition-all active:scale-95 focus:outline-none"
                        >
                            <span>{MONTHS[month - 1]}</span>
                            <ChevronDown
                                size={15}
                                className={`text-slate-400 transition-transform duration-200 ease-in-out ${isDropdownOpen ? "rotate-180 text-indigo-600" : ""}`}
                            />
                        </button>

                        <div
                            className={`absolute right-0 sm:left-0 mt-2 w-48 bg-white/95 backdrop-blur-md border border-slate-100 rounded-2xl shadow-xl shadow-slate-200/50 ring-1 ring-black/5 z-50 p-1.5 max-h-60 overflow-y-auto transform transition-all duration-200 origin-top ${isDropdownOpen
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
                                        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-colors font-semibold ${isSelected
                                            ? "bg-indigo-50 text-indigo-600"
                                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                            }`}
                                    >
                                        <span>{name}</span>
                                        {isSelected && <Check size={14} className="text-indigo-600 stroke-[2.5]" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <input
                        type="number"
                        value={year}
                        onChange={(e) => setYear(Number(e.target.value))}
                        className="px-3.5 py-2.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs font-bold text-slate-700 w-24 text-center focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    />

                    <button
                        type="button"
                        onClick={() => fetchAttendanceSummary(true)}
                        disabled={refreshing}
                        className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-2xl text-slate-700 hover:text-indigo-600 transition-all active:scale-95 focus:outline-none shadow-xs"
                        title="Sync Data"
                    >
                        <RefreshCw size={16} className={refreshing ? "animate-spin text-indigo-600" : ""} />
                    </button>
                </div>
            </div>

            {/* KPI Cards (Corrected root paths for redirection) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div
                    onClick={() => router.push("/attendance")}
                    className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all duration-300 cursor-pointer group"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3.5 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 group-hover:scale-110 transition-transform duration-300">
                            <Calendar size={20} />
                        </div>
                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider group-hover:text-indigo-600 transition-colors">Total Logs</span>
                    </div>
                    <h3 className="text-3xl font-black text-slate-900 font-mono">{records.length}</h3>
                    <p className="text-xs font-semibold text-slate-500 mt-1 flex items-center gap-1">
                        {totalEmployees} total staff count <ArrowUpRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-indigo-600" />
                    </p>
                </div>

                <div
                    onClick={() => router.push("/attendance?status=present")}
                    className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all duration-300 cursor-pointer group"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3.5 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 group-hover:scale-110 transition-transform duration-300">
                            <UserCheck size={20} />
                        </div>
                        <span className="text-[11px] font-black text-emerald-600 uppercase tracking-wider">Total Present</span>
                    </div>
                    <h3 className="text-3xl font-black text-slate-900 font-mono">{presentRecords.length}</h3>
                    <p className="text-xs font-semibold text-emerald-600 mt-1 flex items-center gap-1">
                        Verified check-ins <ArrowUpRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </p>
                </div>

                <div
                    onClick={() => router.push("/attendance?status=absent")}
                    className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-rose-300 transition-all duration-300 cursor-pointer group"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3.5 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 group-hover:scale-110 transition-transform duration-300">
                            <UserX size={20} />
                        </div>
                        <span className="text-[11px] font-black text-rose-500 uppercase tracking-wider">Total Absent</span>
                    </div>
                    <h3 className="text-3xl font-black text-slate-900 font-mono">{absentRecords.length}</h3>
                    <p className="text-xs font-semibold text-rose-500 mt-1 flex items-center gap-1">
                        Unrecorded punches <ArrowUpRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </p>
                </div>

                <div
                    onClick={() => router.push("/attendance")}
                    className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-violet-300 transition-all duration-300 cursor-pointer group"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3.5 rounded-2xl bg-violet-50 text-violet-600 border border-violet-100 group-hover:scale-110 transition-transform duration-300">
                            <Clock size={20} />
                        </div>
                        <span className="text-[11px] font-black text-violet-600 uppercase tracking-wider">Avg Daily Hours</span>
                    </div>
                    <h3 className="text-3xl font-black text-slate-900 font-mono">{averageHoursPerDay} hrs</h3>
                    <p className="text-xs font-semibold text-slate-500 mt-1 flex items-center gap-1">
                        Total {totalWorkingHours} work hours <ArrowUpRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-violet-600" />
                    </p>
                </div>
            </div>

            {/* Chart Section */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-300 space-y-6">
                <div>
                    <h2 className="text-lg font-black text-slate-900 tracking-tight">Monthly Trend Overview</h2>
                    <p className="text-xs font-medium text-slate-500 mt-0.5">Present vs Absent day-by-day distribution</p>
                </div>

                {chartData.length === 0 ? (
                    <div className="py-24 text-center">
                        <p className="text-sm font-bold text-slate-700">No attendance records found</p>
                        <p className="text-xs text-slate-400 mt-1">Attendance logs for the selected month and year will appear here once logged.</p>
                    </div>
                ) : (
                    <div className="h-72 w-full pt-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="attSummaryGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#4F46E5" stopOpacity={0.0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94A3B8", fontWeight: 600 }} tickLine={false} axisLine={false} />
                                <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} tickLine={false} axisLine={false} />
                                <Tooltip />
                                <Area type="monotone" dataKey="present" stroke="#4F46E5" strokeWidth={3} fill="url(#attSummaryGrad)" activeDot={{ r: 7, fill: "#4F46E5", stroke: "#fff", strokeWidth: 2 }} />
                                <Area type="monotone" dataKey="absent" stroke="#F43F5E" strokeWidth={3} fillOpacity={0} activeDot={{ r: 7, fill: "#F43F5E", stroke: "#fff", strokeWidth: 2 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

        </div>
    );
}