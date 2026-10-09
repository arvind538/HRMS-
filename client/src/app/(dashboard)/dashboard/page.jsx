"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
    Users,
    CheckCircle2,
    Calendar,
    CalendarCheck,
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
    AlertCircle,
    UserCheck,
    User,
    Plus,
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
import { getUser } from "@/lib/auth";

/* -------------------------------------------------------------------------- */
/* CONSTANTS & HELPERS                                                        */
/* -------------------------------------------------------------------------- */

const LEAVE_COLORS = ["#4f46e5", "#06b6d4", "#8b5cf6", "#f59e0b", "#ec4899", "#10b981"];
const PRESENT_STATUSES = ["present", "late", "half-day", "half day"];
const INACTIVE_LEAVE = ["rejected", "cancelled", "canceled"];
const REFRESH_INTERVAL = 60 * 1000;

const TONES = {
    indigo: { box: "bg-indigo-50 text-indigo-600 border-indigo-100", hover: "hover:border-indigo-300", sub: "text-slate-600" },
    emerald: { box: "bg-emerald-50 text-emerald-600 border-emerald-100", hover: "hover:border-emerald-300", sub: "text-emerald-600" },
    amber: { box: "bg-amber-50 text-amber-600 border-amber-100", hover: "hover:border-amber-300", sub: "text-amber-600" },
    cyan: { box: "bg-cyan-50 text-cyan-600 border-cyan-100", hover: "hover:border-cyan-300", sub: "text-slate-600" },
    violet: { box: "bg-violet-50 text-violet-600 border-violet-100", hover: "hover:border-violet-300", sub: "text-slate-600" },
};

const normalizeRole = (role) => {
    const r = String(role || "").toLowerCase().trim();
    if (r === "admin" || r === "super admin" || r === "superadmin") return "admin";
    if (r === "hr" || r === "hr manager") return "hr";
    if (r === "manager" || r === "team lead") return "manager";
    return "employee";
};

const ROLE_TEXT = {
    admin: { title: "Executive HR Dashboard", badge: "Admin" },
    hr: { title: "HR Dashboard", badge: "HR" },
    manager: { title: "Team Management Dashboard", badge: "Manager" },
    employee: { title: "My Dashboard", badge: "Employee" },
};

const toList = (res) => {
    const d = res?.data;
    if (Array.isArray(d)) return d;
    if (!d || typeof d !== "object") return [];
    for (const key of ["data", "employees", "leaves", "attendance", "records", "departments", "designations", "positions"]) {
        if (Array.isArray(d[key])) return d[key];
    }
    return [];
};

const isMongoId = (str) => /^[0-9a-fA-F]{24}$/.test(String(str || ""));
const lower = (v) => String(v || "").trim().toLowerCase();
const titleCase = (s) => String(s || "").replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const idOf = (v) => {
    if (!v) return "";
    if (typeof v === "object") return String(v._id || v.id || "");
    return String(v);
};

const recEmpId = (rec) => idOf(rec?.employee ?? rec?.employeeId ?? rec?.user);

const getName = (emp) =>
    emp?.name || `${emp?.firstName || ""} ${emp?.lastName || ""}`.trim() || "Employee";

const getInitials = (name) => {
    if (!name) return "EM";
    const parts = name.trim().split(" ").filter(Boolean);
    return parts.length > 1
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : parts[0].slice(0, 2).toUpperCase();
};

/* Local date (YYYY-MM-DD). toISOString() gives the UTC date, which is wrong in India before 5:30 AM */
const toYMD = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
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

const getTodayFormatted = () =>
    new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

const formatDate = (value) => {
    const d = new Date(value);
    return Number.isNaN(d.getTime())
        ? "—"
        : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

const getTenure = (value) => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    const now = new Date();
    let months = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
    if (now.getDate() < d.getDate()) months -= 1;
    if (months < 0) return "Joining soon";
    const years = Math.floor(months / 12);
    const rest = months % 12;
    return [years && `${years} yr`, rest && `${rest} mo`].filter(Boolean).join(" ") || "Less than a month";
};

const buildMap = (list) => {
    const map = {};
    list.forEach((item) => {
        const id = item?._id || item?.id;
        const label = item?.name || item?.title || item?.label;
        if (id && label) map[String(id)] = label;
    });
    return map;
};

const labelOf = (value, map = {}) => {
    if (!value) return "";
    if (typeof value === "object") return value.name || value.title || value.label || "";
    const s = String(value);
    if (map[s]) return map[s];
    return isMongoId(s) ? "" : s;
};

const groupCount = (items, getLabel) => {
    const counts = {};
    items.forEach((item) => {
        const label = getLabel(item);
        counts[label] = (counts[label] || 0) + 1;
    });
    const max = Math.max(...Object.values(counts), 1);
    return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ name, count, max }));
};

const leaveRange = (l) => {
    const start = new Date(l.startDate || l.fromDate || l.createdAt);
    const end = new Date(l.endDate || l.toDate || l.startDate || l.fromDate || l.createdAt);
    return { start, end };
};

const leaveCoversDay = (l, ymd) => {
    const { start, end } = leaveRange(l);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;
    return toYMD(start) <= ymd && ymd <= toYMD(end);
};

const leaveStatusClass = (status) => {
    const s = lower(status);
    if (s === "approved") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (s === "rejected") return "bg-rose-50 text-rose-700 border-rose-200";
    if (s === "pending") return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-slate-100 text-slate-600 border-slate-200";
};

const dayTileClass = (label) => {
    const s = lower(label);
    if (s === "present") return "bg-emerald-50 border-emerald-200 text-emerald-700";
    if (s === "late" || s.includes("half")) return "bg-amber-50 border-amber-200 text-amber-700";
    if (s === "absent") return "bg-rose-50 border-rose-200 text-rose-700";
    if (s === "leave" || s === "on leave") return "bg-violet-50 border-violet-200 text-violet-700";
    return "bg-slate-50 border-slate-200 text-slate-500";
};

/* -------------------------------------------------------------------------- */
/* SMALL COMPONENTS                                                           */
/* -------------------------------------------------------------------------- */

const CustomAttendanceTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-xl shadow-2xl border border-slate-800 text-xs min-w-[140px]">
            <p className="font-semibold text-slate-300 mb-2 border-b border-slate-800/80 pb-1.5 flex items-center justify-between">
                <span>{label}</span>
                <Clock size={12} className="text-slate-400 shrink-0" />
            </p>
            <div className="space-y-1.5 font-medium">
                <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-1.5 text-indigo-300">
                        <span className="w-2 h-2 rounded-full bg-indigo-500" /> Present:
                    </span>
                    <span className="font-bold font-mono">{payload[0]?.value ?? 0}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-1.5 text-rose-300">
                        <span className="w-2 h-2 rounded-full bg-rose-500" /> Absent:
                    </span>
                    <span className="font-bold font-mono">{payload[1]?.value ?? 0}</span>
                </div>
            </div>
        </div>
    );
};

function Panel({ icon: Icon, title, subtitle, right, children }) {
    return (
        <div className="min-w-0 bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="min-w-0">
                    <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        {Icon && <Icon size={15} className="text-indigo-600 shrink-0" />}
                        <span className="truncate">{title}</span>
                    </h2>
                    {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
                </div>
                {right}
            </div>
            {children}
        </div>
    );
}

function EmptyState({ icon: Icon = AlertCircle, text, tone = "text-slate-300", action }) {
    return (
        <div className="py-10 text-center text-xs text-slate-400 space-y-2">
            <Icon size={26} className={`mx-auto ${tone}`} />
            <p className="font-medium text-slate-500">{text}</p>
            {action}
        </div>
    );
}

function StatCard({ label, value, sub, icon: Icon, tone, onClick }) {
    const t = TONES[tone] || TONES.indigo;
    return (
        <div
            onClick={onClick}
            className={`min-w-0 bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-sm transition-all duration-200 flex flex-col justify-between ${onClick ? `cursor-pointer ${t.hover} hover:shadow-md` : ""
                }`}
        >
            <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">{label}</span>
                <div className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center border ${t.box}`}>
                    <Icon size={14} />
                </div>
            </div>
            <div className="mt-2 min-w-0">
                <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 font-mono truncate">{value}</h3>
                <p className={`text-[11px] font-medium truncate ${t.sub}`}>{sub}</p>
            </div>
        </div>
    );
}

function InfoRow({ label, value }) {
    return (
        <div className="flex items-center justify-between gap-4 py-2.5 border-b border-slate-100 last:border-0 text-xs">
            <span className="text-slate-400 shrink-0">{label}</span>
            <span className="font-semibold text-slate-800 text-right truncate">{value || "—"}</span>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* MAIN PAGE                                                                  */
/* -------------------------------------------------------------------------- */

export default function DashboardPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");
    const [dash, setDash] = useState(null);
    const inFlight = useRef(false);

    const fetchData = useCallback(async (manual = false, silent = false) => {
        if (inFlight.current) return;
        inFlight.current = true;
        if (manual) setRefreshing(true);

        try {
            /* 1. Who is logged in? */
            let profile = null;
            for (const url of ["/employees/me", "/auth/me"]) {
                try {
                    const r = await api.get(url);
                    const p = r?.data?.employee || r?.data?.user || r?.data;
                    if (p && (p.role || p.email)) {
                        profile = p;
                        break;
                    }
                } catch { }
            }
            if (!profile) profile = getUser();
            if (!profile) {
                if (!silent) setError("Unable to load your session. Please refresh or login again.");
                return;
            }

            const role = normalizeRole(profile.role);
            const isAdminView = role === "admin" || role === "hr";
            const isManagerView = role === "manager";
            const isEmployeeView = role === "employee";
            const myId = idOf(profile);

            /* 2. Fetch only what this role needs */
            const days = getLastNDays(7);
            const safe = (p) => p.catch(() => ({ data: [] }));
            const empty = Promise.resolve({ data: [] });

            const [empRes, leaveRes, deptRes, orgDeptRes, desigRes, posRes, ...attRes] = await Promise.all([
                isEmployeeView ? empty : safe(api.get("/employees")),
                safe(api.get("/leave")),
                safe(api.get("/departments")),
                safe(api.get("/organization/departments?status=active")),
                safe(api.get("/organization/designations?status=active")),
                isAdminView ? safe(api.get("/recruitment/positions")) : empty,
                ...days.map((d) => safe(api.get(`/attendance?date=${toYMD(d)}`))),
            ]);

            const deptMap = { ...buildMap(toList(deptRes)), ...buildMap(toList(orgDeptRes)) };
            const desigMap = buildMap(toList(desigRes));
            const allEmployees = toList(empRes);
            allEmployees.forEach((e) => {
                if (e?.department && typeof e.department === "object" && e.department._id && e.department.name) {
                    deptMap[String(e.department._id)] = e.department.name;
                }
            });
            if (profile.department && typeof profile.department === "object" && profile.department._id) {
                deptMap[String(profile.department._id)] = profile.department.name;
            }

            /* 3. Decide whose data is visible */
            let scopeIds = null; // null = everyone
            let scopedEmployees = allEmployees;

            if (isEmployeeView) {
                scopeIds = new Set([myId]);
                scopedEmployees = [profile];
            } else if (isManagerView) {
                const myName = lower(getName(profile));
                const myDept = lower(idOf(profile.department));
                const team = allEmployees.filter((e) => {
                    if (idOf(e) === myId) return false;
                    const reportsToMe = e.reportingManager && lower(e.reportingManager) === myName;
                    const sameDept = myDept && lower(idOf(e.department)) === myDept;
                    return reportsToMe || sameDept;
                });
                scopedEmployees = team;
                scopeIds = new Set(team.map((e) => idOf(e)));
            }

            const inScope = (rec) => !scopeIds || scopeIds.has(recEmpId(rec));
            const todayYMD = toYMD(new Date());
            const thisYear = new Date().getFullYear();

            /* 4. Attendance */
            const perDay = days.map((d, i) => ({
                date: d,
                records: toList(attRes[i]).filter(inScope),
            }));

            const trend = perDay.map(({ date, records }) => {
                const present = records.filter((r) => PRESENT_STATUSES.includes(lower(r.status))).length;
                const absent = records.filter((r) => lower(r.status) === "absent").length;
                const day = date.toLocaleDateString("en-US", { weekday: "short" });
                const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                return { date: dateStr, day, label: `${day}, ${dateStr}`, present, absent };
            });

            const activeEmployees = scopedEmployees.filter((e) => lower(e.status || e.employeeStatus) !== "inactive");
            const presentToday = trend[trend.length - 1]?.present || 0;
            const attendancePct = activeEmployees.length > 0 ? ((presentToday / activeEmployees.length) * 100).toFixed(1) : "0.0";

            /* 5. Leaves */
            const leaves = toList(leaveRes).filter(inScope);
            const pending = leaves.filter((l) => lower(l.status) === "pending");
            const approved = leaves.filter((l) => lower(l.status) === "approved");
            const onLeaveToday = approved.filter((l) => leaveCoversDay(l, todayYMD)).length;

            const byType = {};
            leaves
                .filter((l) => {
                    if (INACTIVE_LEAVE.includes(lower(l.status))) return false;
                    const { start } = leaveRange(l);
                    return Number.isNaN(start.getTime()) || start.getFullYear() === thisYear;
                })
                .forEach((l) => {
                    const key = `${titleCase(l.leaveType || "Other")} Leave`;
                    byType[key] = (byType[key] || 0) + (Number(l.totalDays) || 1);
                });
            const leaveDistribution = Object.entries(byType).map(([name, value], i) => ({
                name,
                value,
                color: LEAVE_COLORS[i % LEAVE_COLORS.length],
            }));

            /* 6. Role specific blocks */
            const groupData = isAdminView
                ? groupCount(scopedEmployees, (e) => labelOf(e.department, deptMap) || "General Division")
                : isManagerView
                    ? groupCount(scopedEmployees, (e) => labelOf(e.designation, desigMap) || "Not specified")
                    : [];

            const strip = perDay.map(({ date, records }) => {
                const ymd = toYMD(date);
                const rec = records[0];
                let label;
                if (rec) label = titleCase(rec.status);
                else if (approved.some((l) => leaveCoversDay(l, ymd))) label = "Leave";
                else if (date.getDay() === 0) label = "Off";
                else label = ymd === todayYMD ? "Not marked" : "No record";
                return {
                    day: date.toLocaleDateString("en-US", { weekday: "short" }),
                    num: date.getDate(),
                    label,
                };
            });

            const myLeavesSorted = [...leaves].sort(
                (a, b) => new Date(b.createdAt || b.startDate || 0) - new Date(a.createdAt || a.startDate || 0)
            );

            setDash({
                role,
                me: profile,
                profileInfo: {
                    employeeId: profile.employeeId,
                    designation: labelOf(profile.designation, desigMap),
                    department: labelOf(profile.department, deptMap),
                    employmentType: profile.employmentType,
                    manager: profile.reportingManager,
                    joined: profile.dateOfJoining,
                },
                totalCount: scopedEmployees.length,
                activeCount: activeEmployees.length,
                presentToday,
                attendancePct,
                onLeaveToday,
                openPositions: toList(posRes).filter((p) => lower(p.status) === "open").length,
                pending,
                trend,
                strip,
                leaveDistribution,
                groupData,
                recentLeaves: myLeavesSorted.slice(0, 6),
                presentLast7: trend.reduce((sum, t) => sum + t.present, 0),
                absentLast7: strip.filter((s) => lower(s.label) === "absent").length,
                leaveUsed: approved
                    .filter((l) => {
                        const { start } = leaveRange(l);
                        return Number.isNaN(start.getTime()) || start.getFullYear() === thisYear;
                    })
                    .reduce((sum, l) => sum + (Number(l.totalDays) || 1), 0),
                todayStatus: strip[strip.length - 1]?.label || "Not marked",
            });
            setError("");
        } catch (err) {
            console.error("Dashboard sync error:", err);
            if (!silent) setError("Unable to load dashboard data. Please try again.");
        } finally {
            inFlight.current = false;
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    /* Load on mount, refresh every minute and whenever the tab becomes visible again */
    useEffect(() => {
        fetchData();
        const onVisible = () => {
            if (document.visibilityState === "visible") fetchData(false, true);
        };
        const interval = setInterval(() => fetchData(false, true), REFRESH_INTERVAL);
        document.addEventListener("visibilitychange", onVisible);
        return () => {
            clearInterval(interval);
            document.removeEventListener("visibilitychange", onVisible);
        };
    }, [fetchData]);

    const handleExportAttendance = () => {
        if (!dash) return;
        const headers = "Date,Day,Present,Absent\n";
        const rows = dash.trend.map((r) => `"${r.date}","${r.day}",${r.present},${r.absent}`).join("\n");
        const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `attendance-report-${toYMD(new Date())}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    /* ---------------------------------------------------------------------- */
    /* LOADING / ERROR                                                        */
    /* ---------------------------------------------------------------------- */

    if (loading) {
        return (
            <div className="w-full min-h-[50vh] flex flex-col items-center justify-center gap-3 px-4">
                <Loader2 size={32} className="animate-spin text-indigo-600" />
                <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Loading your dashboard...</p>
            </div>
        );
    }

    if (!dash) {
        return (
            <div className="w-full min-h-[50vh] flex flex-col items-center justify-center gap-3 px-4 text-center">
                <AlertCircle size={30} className="text-rose-500" />
                <p className="text-sm font-semibold text-slate-700">{error || "Something went wrong."}</p>
                <button
                    type="button"
                    onClick={() => {
                        setLoading(true);
                        fetchData();
                    }}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
                >
                    Try Again
                </button>
            </div>
        );
    }

    /* ---------------------------------------------------------------------- */
    /* ROLE BASED VIEW CONFIG                                                 */
    /* ---------------------------------------------------------------------- */

    const { role } = dash;
    const isAdminView = role === "admin" || role === "hr";
    const isManagerView = role === "manager";
    const isEmployeeView = role === "employee";
    const firstName = getName(dash.me).split(" ")[0];
    const totalLeaveDays = dash.leaveDistribution.reduce((sum, i) => sum + i.value, 0);

    const cards = isAdminView
        ? [
            { label: "Workforce", value: dash.totalCount.toLocaleString(), sub: `${dash.activeCount} active employees`, icon: Users, tone: "indigo", href: "/employees" },
            { label: "Turnout", value: dash.presentToday.toLocaleString(), sub: `${dash.attendancePct}% attendance today`, icon: CheckCircle2, tone: "emerald", href: "/attendance" },
            { label: "Requests", value: dash.pending.length, sub: "Awaiting review", icon: Calendar, tone: "amber", href: "/leave" },
            { label: "Hiring", value: dash.openPositions, sub: "Open positions", icon: Briefcase, tone: "cyan", href: "/recruitment" },
        ]
        : isManagerView
            ? [
                { label: "My Team", value: dash.totalCount, sub: `${dash.activeCount} active members`, icon: Users, tone: "indigo", href: null },
                { label: "Team Present", value: dash.presentToday, sub: `${dash.attendancePct}% attendance today`, icon: CheckCircle2, tone: "emerald", href: "/attendance" },
                { label: "Team Requests", value: dash.pending.length, sub: "Awaiting your review", icon: Calendar, tone: "amber", href: "/leave" },
                { label: "On Leave Today", value: dash.onLeaveToday, sub: "Approved leaves", icon: CalendarCheck, tone: "violet", href: "/leave" },
            ]
            : [
                { label: "Today", value: dash.todayStatus, sub: getTodayFormatted(), icon: UserCheck, tone: dash.todayStatus === "Present" ? "emerald" : "indigo", href: "/attendance" },
                { label: "Present Days", value: dash.presentLast7, sub: "Last 7 days", icon: CheckCircle2, tone: "emerald", href: "/attendance" },
                { label: "Leave Used", value: dash.leaveUsed, sub: "Days this year", icon: CalendarCheck, tone: "violet", href: "/leave" },
                { label: "My Requests", value: dash.pending.length, sub: "Awaiting approval", icon: Clock, tone: "amber", href: "/leave" },
            ];

    const leavePanelTitle = isAdminView ? "Leave Category Distribution" : isManagerView ? "Team Leave Distribution" : "My Leave Usage";
    const leaveEmptyText = isEmployeeView
        ? "You have not taken any leave this year."
        : "No leave records found for this year.";

    /* ---------------------------------------------------------------------- */
    /* PAGE                                                                   */
    /* ---------------------------------------------------------------------- */

    return (
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 py-4 space-y-4 antialiased overflow-x-hidden">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                            {ROLE_TEXT[role].title}
                        </h1>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                            <Sparkles size={11} className="text-indigo-600 shrink-0" />
                            {ROLE_TEXT[role].badge} View
                        </span>
                    </div>
                    <p className="text-xs font-medium text-slate-500 flex items-center gap-1.5 flex-wrap">
                        <Calendar size={13} className="text-slate-400 shrink-0" />
                        <span>{getTodayFormatted()}</span>
                        <span className="text-slate-300">•</span>
                        <span>Welcome back, {firstName}</span>
                    </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                        type="button"
                        onClick={() => fetchData(true)}
                        disabled={refreshing}
                        className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2.5 sm:py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold transition disabled:opacity-60"
                        title="Sync latest records"
                    >
                        <RefreshCw size={12} className={refreshing ? "animate-spin text-indigo-600" : ""} />
                        <span>{refreshing ? "Syncing..." : "Sync"}</span>
                    </button>

                    {!isEmployeeView && (
                        <button
                            type="button"
                            onClick={handleExportAttendance}
                            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 sm:py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition shadow-sm"
                        >
                            <Download size={12} />
                            <span>Export CSV</span>
                        </button>
                    )}

                    {isEmployeeView && (
                        <button
                            type="button"
                            onClick={() => router.push("/leave")}
                            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 sm:py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition shadow-sm"
                        >
                            <Plus size={13} />
                            <span>Apply Leave</span>
                        </button>
                    )}
                </div>
            </div>

            {error && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-amber-800">
                    <AlertCircle size={15} className="shrink-0 mt-0.5" />
                    <p className="text-xs font-semibold">{error}</p>
                </div>
            )}

            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {cards.map((c) => (
                    <StatCard
                        key={c.label}
                        label={c.label}
                        value={c.value}
                        sub={c.sub}
                        icon={c.icon}
                        tone={c.tone}
                        onClick={c.href ? () => router.push(c.href) : undefined}
                    />
                ))}
            </div>

            {/* Attendance: chart for admin/HR/manager, 7-day strip for employee */}
            {!isEmployeeView ? (
                <Panel
                    icon={TrendingUp}
                    title={isManagerView ? "Team Attendance Trend" : "7-Day Attendance Trend"}
                    subtitle={isManagerView ? "Present vs. absent members of your team over the past week" : "Present vs. absent staff over the past week"}
                    right={
                        <div className="flex items-center gap-2 text-xs font-semibold">
                            <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                                <span className="w-2 h-2 rounded-full bg-indigo-500" /> Present
                            </span>
                            <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                                <span className="w-2 h-2 rounded-full bg-rose-500" /> Absent
                            </span>
                        </div>
                    }
                >
                    <div className="h-52 sm:h-64 w-full pt-1">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={dash.trend} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="presentGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="absentGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#64748b", fontWeight: 600 }} dy={8} />
                                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 500 }} />
                                <Tooltip content={<CustomAttendanceTooltip />} />
                                <Area type="monotone" dataKey="present" stroke="#6366f1" strokeWidth={2} fill="url(#presentGradient)" />
                                <Area type="monotone" dataKey="absent" stroke="#f43f5e" strokeWidth={2} fill="url(#absentGradient)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Panel>
            ) : (
                <Panel
                    icon={CalendarCheck}
                    title="My Last 7 Days"
                    subtitle="Your daily attendance status"
                    right={
                        <div className="flex items-center gap-2 text-xs font-semibold">
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Present: {dash.presentLast7}
                            </span>
                            <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
                                Absent: {dash.absentLast7}
                            </span>
                        </div>
                    }
                >
                    <div className="grid grid-cols-7 gap-1.5 sm:gap-3">
                        {dash.strip.map((s, i) => (
                            <div
                                key={`${s.day}-${s.num}-${i}`}
                                className={`min-w-0 rounded-xl border p-1.5 sm:p-3 text-center ${dayTileClass(s.label)}`}
                            >
                                <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wide opacity-70">{s.day}</p>
                                <p className="text-base sm:text-xl font-extrabold font-mono leading-tight">{s.num}</p>
                                <p className="text-[9px] sm:text-[11px] font-bold mt-0.5 truncate">{s.label}</p>
                            </div>
                        ))}
                    </div>
                </Panel>
            )}

            {/* Leave distribution + third panel */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Panel
                    icon={PieChartIcon}
                    title={leavePanelTitle}
                    right={<span className="text-xs font-semibold text-slate-500">{totalLeaveDays} days total</span>}
                >
                    {dash.leaveDistribution.length === 0 ? (
                        <EmptyState text={leaveEmptyText} />
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-center py-1">
                                <div className="h-36 w-36 relative flex items-center justify-center">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={dash.leaveDistribution} innerRadius={40} outerRadius={60} paddingAngle={4} dataKey="value">
                                                {dash.leaveDistribution.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                        <span className="text-lg font-extrabold text-slate-900 font-mono">{totalLeaveDays}</span>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Days</span>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                {dash.leaveDistribution.map((item) => (
                                    <div key={item.name} className="flex items-center justify-between gap-3 text-xs p-2 rounded-xl bg-slate-50/50">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                                            <span className="text-slate-700 font-semibold truncate">{item.name}</span>
                                        </div>
                                        <span className="font-bold text-slate-900 font-mono shrink-0">{item.value} days</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </Panel>

                {isEmployeeView ? (
                    <Panel icon={User} title="My Work Profile" subtitle="Your employment details">
                        <div className="flex items-center gap-3 pb-3 border-b border-slate-100 min-w-0">
                            {dash.me.avatar ? (
                                <img src={dash.me.avatar} alt="" className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0" />
                            ) : (
                                <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
                                    {getInitials(getName(dash.me))}
                                </div>
                            )}
                            <div className="min-w-0">
                                <p className="text-sm font-bold text-slate-900 truncate">{getName(dash.me)}</p>
                                <p className="text-xs text-slate-500 truncate">{dash.me.email}</p>
                            </div>
                        </div>
                        <div>
                            <InfoRow label="Employee ID" value={dash.profileInfo.employeeId} />
                            <InfoRow label="Designation" value={dash.profileInfo.designation} />
                            <InfoRow label="Department" value={dash.profileInfo.department} />
                            <InfoRow label="Employment Type" value={dash.profileInfo.employmentType} />
                            <InfoRow label="Reporting Manager" value={dash.profileInfo.manager} />
                            <InfoRow label="Joining Date" value={dash.profileInfo.joined ? formatDate(dash.profileInfo.joined) : ""} />
                            <InfoRow label="Time with Company" value={dash.profileInfo.joined ? getTenure(dash.profileInfo.joined) : ""} />
                        </div>
                    </Panel>
                ) : (
                    <Panel
                        icon={Building2}
                        title={isManagerView ? "Team Composition" : "Department Headcount"}
                        right={<span className="text-xs font-semibold text-slate-500">{dash.totalCount} {isManagerView ? "team members" : "total staff"}</span>}
                    >
                        {dash.groupData.length === 0 ? (
                            <EmptyState text={isManagerView ? "No team members found yet." : "No department data registered."} />
                        ) : (
                            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                                {dash.groupData.map((item) => {
                                    const pct = Math.round((item.count / Math.max(dash.totalCount, 1)) * 100);
                                    return (
                                        <div key={item.name} className="p-2.5 rounded-xl bg-slate-50/60 border border-slate-200/60">
                                            <div className="flex items-center justify-between gap-3 text-xs mb-1.5">
                                                <span className="text-slate-800 font-semibold truncate">{item.name}</span>
                                                <span className="font-bold text-slate-900 font-mono shrink-0">{item.count} ({pct}%)</span>
                                            </div>
                                            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                                <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${(item.count / (item.max || 1)) * 100}%` }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </Panel>
                )}
            </div>

            {/* Leave requests */}
            {isEmployeeView ? (
                <Panel
                    title="My Leave Requests"
                    subtitle={`${dash.pending.length} pending · ${dash.recentLeaves.length} recent requests`}
                    right={
                        <button
                            type="button"
                            onClick={() => router.push("/leave")}
                            className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-bold bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100 self-start"
                        >
                            <span>View All</span>
                            <ArrowUpRight size={12} />
                        </button>
                    }
                >
                    {dash.recentLeaves.length === 0 ? (
                        <EmptyState
                            icon={CalendarCheck}
                            tone="text-indigo-300"
                            text="You have not applied for any leave yet."
                            action={
                                <button
                                    type="button"
                                    onClick={() => router.push("/leave")}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
                                >
                                    <Plus size={13} /> Apply for Leave
                                </button>
                            }
                        />
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {dash.recentLeaves.map((req) => (
                                <div
                                    key={req._id || req.id}
                                    onClick={() => router.push("/leave")}
                                    className="min-w-0 flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50/70 hover:bg-indigo-50/40 border border-slate-200/70 cursor-pointer transition"
                                >
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-slate-900 truncate capitalize">{titleCase(req.leaveType || "Leave")} Leave</p>
                                        <p className="text-[11px] text-slate-500 truncate">
                                            {formatDate(req.startDate || req.fromDate)} · {req.totalDays || 1}d
                                        </p>
                                    </div>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border capitalize shrink-0 ${leaveStatusClass(req.status)}`}>
                                        {req.status || "pending"}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </Panel>
            ) : (
                <Panel
                    title={isManagerView ? "Team Leave Requests" : "Pending Leave Requests"}
                    subtitle={`${dash.pending.length} applications awaiting review`}
                    right={
                        <button
                            type="button"
                            onClick={() => router.push("/leave")}
                            className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-bold bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100 self-start"
                        >
                            <span>View All</span>
                            <ArrowUpRight size={12} />
                        </button>
                    }
                >
                    {dash.pending.length === 0 ? (
                        <EmptyState icon={CheckCircle2} tone="text-emerald-400" text="All leave requests are up to date" />
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {dash.pending.slice(0, 6).map((req) => {
                                const employeeName = req.employee?.name || getName(req.employee) || "Unknown Employee";
                                const departmentName = labelOf(req.employee?.department) || req.department || "General Team";
                                return (
                                    <div
                                        key={req._id || req.id}
                                        onClick={() => router.push("/leave")}
                                        className="min-w-0 flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50/70 hover:bg-indigo-50/40 border border-slate-200/70 cursor-pointer transition"
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                                                {getInitials(employeeName)}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-slate-900 truncate">{employeeName}</p>
                                                <p className="text-[11px] text-slate-500 truncate capitalize">{departmentName} · {req.leaveType}</p>
                                            </div>
                                        </div>
                                        <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200 font-mono shrink-0">
                                            {req.totalDays || 1}d
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </Panel>
            )}
        </div>
    );
}


// "use client";

// import { useEffect, useState, useMemo, useCallback } from "react";
// import { useRouter } from "next/navigation";
// import {
//     Users,
//     CheckCircle2,
//     Calendar,
//     Briefcase,
//     RefreshCw,
//     Download,
//     ArrowUpRight,
//     TrendingUp,
//     Loader2,
//     Clock,
//     Sparkles,
//     PieChart as PieChartIcon,
//     Building2,
//     AlertCircle,
// } from "lucide-react";
// import {
//     AreaChart,
//     Area,
//     XAxis,
//     YAxis,
//     Tooltip,
//     ResponsiveContainer,
//     CartesianGrid,
//     PieChart,
//     Pie,
//     Cell,
// } from "recharts";
// import api from "@/lib/api";

// const LEAVE_COLORS = ["#4f46e5", "#06b6d4", "#8b5cf6", "#f59e0b", "#ec4899", "#10b981"];

// const getInitials = (name) => {
//     if (!name) return "EM";
//     const parts = name.trim().split(" ").filter(Boolean);
//     return parts.length > 1
//         ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
//         : parts[0].slice(0, 2).toUpperCase();
// };

// const getTodayFormatted = () => {
//     return new Date().toLocaleDateString("en-US", {
//         weekday: "short",
//         day: "numeric",
//         month: "short",
//         year: "numeric",
//     });
// };

// const getLastNDays = (n) => {
//     const dates = [];
//     for (let i = n - 1; i >= 0; i--) {
//         const d = new Date();
//         d.setDate(d.getDate() - i);
//         dates.push(d);
//     }
//     return dates;
// };

// // Check if string is a raw 24-character hex Mongo ObjectId
// const isMongoId = (str) => /^[0-9a-fA-F]{24}$/.test(str);

// const CustomAttendanceTooltip = ({ active, payload, label }) => {
//     if (active && payload && payload.length) {
//         return (
//             <div className="bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-xl sm:rounded-2xl shadow-2xl border border-slate-800 text-xs min-w-[140px] sm:min-w-[150px] transition-all">
//                 <p className="font-semibold text-slate-300 mb-2 border-b border-slate-800/80 pb-1.5 flex items-center justify-between">
//                     <span>{label}</span>
//                     <Clock size={12} className="text-slate-400 shrink-0" />
//                 </p>
//                 <div className="space-y-1.5 font-medium">
//                     <div className="flex items-center justify-between gap-3">
//                         <span className="flex items-center gap-1.5 text-indigo-300">
//                             <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-xs" />
//                             Present:
//                         </span>
//                         <span className="font-bold text-white font-mono">{payload[0]?.value ?? 0}</span>
//                     </div>
//                     <div className="flex items-center justify-between gap-3">
//                         <span className="flex items-center gap-1.5 text-rose-300">
//                             <span className="w-2 h-2 rounded-full bg-rose-500 shadow-xs" />
//                             Absent:
//                         </span>
//                         <span className="font-bold text-white font-mono">{payload[1]?.value ?? 0}</span>
//                     </div>
//                 </div>
//             </div>
//         );
//     }
//     return null;
// };

// export default function DashboardPage() {
//     const router = useRouter();
//     const [loading, setLoading] = useState(true);
//     const [refreshing, setRefreshing] = useState(false);

//     const [employees, setEmployees] = useState([]);
//     const [pendingLeaves, setPendingLeaves] = useState([]);
//     const [attendanceTrend, setAttendanceTrend] = useState([]);
//     const [leaveDistribution, setLeaveDistribution] = useState([]);
//     const [departmentData, setDepartmentData] = useState([]);
//     const [openPositionsCount, setOpenPositionsCount] = useState(0);
//     const [todayAttendanceCount, setTodayAttendanceCount] = useState(0);

//     const fetchData = useCallback(async (isManual = false) => {
//         if (isManual) setRefreshing(true);
//         else setLoading(true);

//         try {
//             const today = new Date().toISOString().split("T")[0];
//             const last7Days = getLastNDays(7);

//             const [
//                 empRes,
//                 leaveRes,
//                 leaveReportRes,
//                 empReportRes,
//                 positionsRes,
//                 todayAttendanceRes,
//                 deptListRes,
//                 ...attendanceByDay
//             ] = await Promise.all([
//                 api.get("/employees").catch(() => ({ data: [] })),
//                 api.get("/leave?status=pending").catch(() => ({ data: [] })),
//                 api.get("/reports/leave").catch(() => ({ data: {} })),
//                 api.get("/reports/employee").catch(() => ({ data: {} })),
//                 api.get("/recruitment/positions").catch(() => ({ data: [] })),
//                 api.get(`/attendance?date=${today}`).catch(() => ({ data: [] })),
//                 api.get("/departments").catch(() => ({ data: [] })),
//                 ...last7Days.map((d) =>
//                     api.get(`/attendance?date=${d.toISOString().split("T")[0]}`).catch(() => ({ data: [] }))
//                 ),
//             ]);

//             const empList = Array.isArray(empRes?.data) ? empRes.data : [];
//             setEmployees(empList);
//             setPendingLeaves(Array.isArray(leaveRes?.data) ? leaveRes.data : []);

//             const todayRecords = Array.isArray(todayAttendanceRes?.data) ? todayAttendanceRes.data : [];
//             setTodayAttendanceCount(todayRecords.filter((r) => r.status === "present").length);

//             const positions = Array.isArray(positionsRes?.data) ? positionsRes.data : [];
//             setOpenPositionsCount(positions.filter((p) => p.status === "open").length);

//             const byType = leaveReportRes?.data?.byType || {};
//             const leaveChartData = Object.entries(byType).map(([type, count], i) => ({
//                 name: type.charAt(0).toUpperCase() + type.slice(1) + " Leave",
//                 value: count,
//                 color: LEAVE_COLORS[i % LEAVE_COLORS.length],
//             }));
//             setLeaveDistribution(leaveChartData);

//             // Department ID se readable name mapping
//             const deptMap = {};
//             const allDepartments = Array.isArray(deptListRes?.data)
//                 ? deptListRes.data
//                 : Array.isArray(deptListRes?.data?.departments)
//                     ? deptListRes.data.departments
//                     : [];

//             allDepartments.forEach((dept) => {
//                 if (dept?._id && dept?.name) {
//                     deptMap[dept._id.toString()] = dept.name;
//                 }
//             });

//             // Employee array ke populated objects se department name match karna
//             empList.forEach((emp) => {
//                 if (emp?.department && typeof emp.department === "object" && emp.department._id && emp.department.name) {
//                     deptMap[emp.department._id.toString()] = emp.department.name;
//                 }
//             });

//             const byDept = empReportRes?.data?.byDepartment || {};
//             let deptChartData = [];

//             if (Object.keys(byDept).length > 0) {
//                 const maxCount = Math.max(...Object.values(byDept), 1);
//                 deptChartData = Object.entries(byDept)
//                     .sort((a, b) => b[1] - a[1])
//                     .map(([idOrName, count], idx) => {
//                         let finalName = idOrName;

//                         if (deptMap[idOrName]) {
//                             finalName = deptMap[idOrName];
//                         } else if (isMongoId(idOrName)) {
//                             finalName = `Department ${idx + 1}`;
//                         }

//                         return {
//                             name: finalName,
//                             count,
//                             max: maxCount,
//                         };
//                     });
//             } else if (empList.length > 0) {
//                 const counts = {};
//                 empList.forEach((emp) => {
//                     let dName = "General Division";
//                     if (emp?.department) {
//                         if (typeof emp.department === "object" && emp.department.name) {
//                             dName = emp.department.name;
//                         } else if (deptMap[emp.department]) {
//                             dName = deptMap[emp.department];
//                         } else if (!isMongoId(emp.department)) {
//                             dName = emp.department;
//                         }
//                     }
//                     counts[dName] = (counts[dName] || 0) + 1;
//                 });

//                 const maxCount = Math.max(...Object.values(counts), 1);
//                 deptChartData = Object.entries(counts)
//                     .sort((a, b) => b[1] - a[1])
//                     .map(([name, count]) => ({
//                         name,
//                         count,
//                         max: maxCount,
//                     }));
//             }

//             setDepartmentData(deptChartData);

//             const totalEmp = empList.length;
//             const trend = last7Days.map((d, i) => {
//                 const records = Array.isArray(attendanceByDay[i]?.data) ? attendanceByDay[i].data : [];
//                 const present = records.filter((r) => r.status === "present").length;
//                 const absent =
//                     records.filter((r) => r.status === "absent").length || Math.max(0, totalEmp - present);
//                 const dayStr = d.toLocaleDateString("en-US", { weekday: "short" });
//                 const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

//                 return {
//                     date: dateStr,
//                     day: dayStr,
//                     label: `${dayStr}, ${dateStr}`,
//                     present: present,
//                     absent: absent,
//                 };
//             });
//             setAttendanceTrend(trend);
//         } catch (err) {
//             console.error("Dashboard sync error:", err);
//         } finally {
//             setLoading(false);
//             setRefreshing(false);
//         }
//     }, []);

//     useEffect(() => {
//         fetchData();
//         const interval = setInterval(() => fetchData(true), 5 * 60 * 1000);
//         return () => clearInterval(interval);
//     }, [fetchData]);

//     const handleExportAttendance = () => {
//         const headers = "Date,Day,Present,Absent\n";
//         const rows = attendanceTrend
//             .map((row) => `"${row.date}","${row.day}",${row.present},${row.absent}`)
//             .join("\n");
//         const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
//         const url = window.URL.createObjectURL(blob);
//         const a = document.createElement("a");
//         a.href = url;
//         a.download = `attendance-report-${new Date().toISOString().split("T")[0]}.csv`;
//         a.click();
//         window.URL.revokeObjectURL(url);
//     };

//     const totalEmployeesCount = employees.length;
//     const activeEmployeesCount = employees.filter((e) => e.status === "active").length;
//     const attendancePercentage =
//         activeEmployeesCount > 0
//             ? ((todayAttendanceCount / activeEmployeesCount) * 100).toFixed(1)
//             : "0.0";
//     const totalLeaveCount = useMemo(
//         () => leaveDistribution.reduce((acc, curr) => acc + curr.value, 0),
//         [leaveDistribution]
//     );
//     const maxDeptCount = useMemo(
//         () => Math.max(...departmentData.map((d) => d.max || d.count), 1),
//         [departmentData]
//     );

//     if (loading) {
//         return (
//             <div className="w-full min-h-[50vh] sm:min-h-[60vh] flex flex-col items-center justify-center gap-3 text-slate-400 px-4">
//                 <Loader2 size={36} className="animate-spin text-indigo-600" />
//                 <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
//                     Loading dashboard analytics...
//                 </p>
//             </div>
//         );
//     }

//     return (
//         <div className="w-full max-w-7xl mx-auto px-3 sm:px-3 lg:px-4 py-3 sm:py-3 lg:py-4 space-y-3 sm:space-y-3 antialiased">
//             {/* Header Banner */}
//             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 lg:p-7 rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs">
//                 <div className="space-y-1">
//                     <div className="flex flex-wrap items-center gap-2 sm:gap-3">
//                         <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
//                             Executive Dashboard
//                         </h1>
//                         <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
//                             <Sparkles size={12} className="text-indigo-600 shrink-0" /> Live Data
//                         </span>
//                     </div>
//                     <p className="text-xs sm:text-sm font-medium text-slate-500 flex items-center gap-1.5">
//                         <Calendar size={13} className="text-slate-400 shrink-0" />
//                         {getTodayFormatted()}
//                     </p>
//                 </div>

//                 <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
//                     <button
//                         type="button"
//                         onClick={() => fetchData(true)}
//                         disabled={refreshing}
//                         className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold transition-all duration-200 active:scale-95 disabled:opacity-60 cursor-pointer shadow-2xs hover:shadow-xs"
//                         title="Sync latest records"
//                     >
//                         <RefreshCw size={13} className={refreshing ? "animate-spin text-indigo-600" : ""} />
//                         <span>{refreshing ? "Syncing..." : "Sync"}</span>
//                     </button>

//                     <button
//                         type="button"
//                         onClick={handleExportAttendance}
//                         className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold transition-all duration-200 active:scale-95 shadow-sm shadow-indigo-600/20 hover:shadow-md cursor-pointer"
//                     >
//                         <Download size={13} />
//                         <span>Export CSV</span>
//                     </button>
//                 </div>
//             </div>

//             {/* 4 Stat Cards */}
//             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 lg:gap-5">
//                 {/* Total Employees */}
//                 <div
//                     onClick={() => router.push("/employees")}
//                     className="group bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 lg:p-6 border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-indigo-300 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer flex flex-col justify-between"
//                 >
//                     <div className="flex items-center justify-between">
//                         <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 group-hover:scale-105 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
//                             <Users size={19} />
//                         </div>
//                         <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-indigo-600 transition-colors">
//                             Workforce
//                         </span>
//                     </div>
//                     <div className="mt-4">
//                         <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-mono">
//                             {totalEmployeesCount.toLocaleString()}
//                         </h3>
//                         <p className="text-xs font-semibold text-slate-700 mt-1">Total Employees</p>
//                         <p className="text-[11px] font-medium text-emerald-600 mt-1.5 flex items-center gap-1.5">
//                             <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
//                             {activeEmployeesCount} active on roster
//                         </p>
//                     </div>
//                 </div>

//                 {/* Turnout */}
//                 <div
//                     onClick={() => router.push("/attendance")}
//                     className="group bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 lg:p-6 border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-emerald-300 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer flex flex-col justify-between"
//                 >
//                     <div className="flex items-center justify-between">
//                         <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 group-hover:scale-105 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
//                             <CheckCircle2 size={19} />
//                         </div>
//                         <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-emerald-600 transition-colors">
//                             Turnout
//                         </span>
//                     </div>
//                     <div className="mt-4">
//                         <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-mono">
//                             {todayAttendanceCount.toLocaleString()}
//                         </h3>
//                         <p className="text-xs font-semibold text-slate-700 mt-1">Present Today</p>
//                         <p className="text-[11px] font-medium text-emerald-600 mt-1.5 flex items-center gap-1.5">
//                             <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
//                             {attendancePercentage}% attendance rate
//                         </p>
//                     </div>
//                 </div>

//                 {/* Requests */}
//                 <div
//                     onClick={() => router.push("/leave")}
//                     className="group bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 lg:p-6 border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-amber-300 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer flex flex-col justify-between"
//                 >
//                     <div className="flex items-center justify-between">
//                         <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 group-hover:scale-105 group-hover:bg-amber-600 group-hover:text-white transition-all duration-300">
//                             <Calendar size={19} />
//                         </div>
//                         <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-amber-600 transition-colors">
//                             Requests
//                         </span>
//                     </div>
//                     <div className="mt-4">
//                         <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-mono">
//                             {pendingLeaves.length}
//                         </h3>
//                         <p className="text-xs font-semibold text-slate-700 mt-1">Pending Leave Requests</p>
//                         <p className="text-[11px] font-medium text-amber-600 mt-1.5 flex items-center gap-1.5">
//                             <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
//                             Awaiting manager approval
//                         </p>
//                     </div>
//                 </div>

//                 {/* Hiring */}
//                 <div
//                     onClick={() => router.push("/recruitment")}
//                     className="group bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 lg:p-6 border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-cyan-300 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer flex flex-col justify-between"
//                 >
//                     <div className="flex items-center justify-between">
//                         <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center border border-cyan-100 group-hover:scale-105 group-hover:bg-cyan-600 group-hover:text-white transition-all duration-300">
//                             <Briefcase size={19} />
//                         </div>
//                         <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-cyan-600 transition-colors">
//                             Hiring
//                         </span>
//                     </div>
//                     <div className="mt-4">
//                         <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-mono">
//                             {openPositionsCount}
//                         </h3>
//                         <p className="text-xs font-semibold text-slate-700 mt-1">Open Positions</p>
//                         <p className="text-[11px] font-medium text-slate-500 mt-1.5 flex items-center gap-1.5">
//                             <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
//                             Active recruitment pipelines
//                         </p>
//                     </div>
//                 </div>
//             </div>

//             {/* Attendance Trend Chart */}
//             <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-7 border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300 space-y-4">
//                 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
//                     <div>
//                         <div className="flex items-center gap-2">
//                             <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
//                                 7-Day Attendance Trend
//                             </h2>
//                             <span className="p-1 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 shrink-0">
//                                 <TrendingUp size={14} />
//                             </span>
//                         </div>
//                         <p className="text-xs font-medium text-slate-500 mt-0.5">
//                             Comparative overview of present vs. absent employees over the past week
//                         </p>
//                     </div>

//                     <div className="flex items-center gap-2.5 sm:gap-3 text-xs font-semibold text-slate-600">
//                         <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/60">
//                             <span className="w-2 h-2 rounded-full bg-indigo-500" />
//                             <span>Present</span>
//                         </div>
//                         <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/60">
//                             <span className="w-2 h-2 rounded-full bg-rose-500" />
//                             <span>Absent</span>
//                         </div>
//                     </div>
//                 </div>

//                 <div className="h-56 sm:h-64 lg:h-72 w-full pt-2">
//                     <ResponsiveContainer width="100%" height="100%">
//                         <AreaChart data={attendanceTrend} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
//                             <defs>
//                                 <linearGradient id="presentGradient" x1="0" y1="0" x2="0" y2="1">
//                                     <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
//                                     <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
//                                 </linearGradient>
//                                 <linearGradient id="absentGradient" x1="0" y1="0" x2="0" y2="1">
//                                     <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2} />
//                                     <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
//                                 </linearGradient>
//                             </defs>
//                             <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
//                             <XAxis
//                                 dataKey="date"
//                                 tickLine={false}
//                                 axisLine={false}
//                                 tick={{ fontSize: 11, fill: "#64748b", fontWeight: 600 }}
//                                 dy={8}
//                             />
//                             <YAxis
//                                 tickLine={false}
//                                 axisLine={false}
//                                 tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 500 }}
//                             />
//                             <Tooltip content={<CustomAttendanceTooltip />} />
//                             <Area
//                                 type="monotone"
//                                 dataKey="present"
//                                 stroke="#6366f1"
//                                 strokeWidth={2.5}
//                                 fillOpacity={1}
//                                 fill="url(#presentGradient)"
//                                 activeDot={{ r: 5, stroke: "#6366f1", strokeWidth: 2, fill: "#ffffff" }}
//                             />
//                             <Area
//                                 type="monotone"
//                                 dataKey="absent"
//                                 stroke="#f43f5e"
//                                 strokeWidth={2.5}
//                                 fillOpacity={1}
//                                 fill="url(#absentGradient)"
//                                 activeDot={{ r: 5, stroke: "#f43f5e", strokeWidth: 2, fill: "#ffffff" }}
//                             />
//                         </AreaChart>
//                     </ResponsiveContainer>
//                 </div>
//             </div>

//             {/* Split Grid: Leave Breakdown & Department Headcount */}
//             <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
//                 {/* Leave Breakdown */}
//                 <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-7 border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between space-y-4">
//                     <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
//                         <div>
//                             <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
//                                 <PieChartIcon size={16} className="text-indigo-600" />
//                                 Leave Category Distribution
//                             </h2>
//                             <p className="text-xs font-medium text-slate-500 mt-0.5">
//                                 Cumulative overview • {totalLeaveCount} days requested
//                             </p>
//                         </div>
//                     </div>

//                     {leaveDistribution.length === 0 ? (
//                         <div className="py-12 sm:py-16 text-center text-xs font-medium text-slate-400 flex flex-col items-center gap-2">
//                             <AlertCircle size={28} className="text-slate-300" />
//                             <span>No leave records logged for this period.</span>
//                         </div>
//                     ) : (
//                         <div className="space-y-4">
//                             <div className="py-2 flex items-center justify-center">
//                                 <div className="h-40 w-40 sm:h-44 sm:w-44 relative flex items-center justify-center">
//                                     <ResponsiveContainer width="100%" height="100%">
//                                         <PieChart>
//                                             <Pie
//                                                 data={leaveDistribution}
//                                                 innerRadius={46}
//                                                 outerRadius={68}
//                                                 paddingAngle={4}
//                                                 dataKey="value"
//                                             >
//                                                 {leaveDistribution.map((entry, index) => (
//                                                     <Cell key={`cell-${index}`} fill={entry.color} />
//                                                 ))}
//                                             </Pie>
//                                         </PieChart>
//                                     </ResponsiveContainer>
//                                     <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
//                                         <span className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono">
//                                             {totalLeaveCount}
//                                         </span>
//                                         <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
//                                             Days
//                                         </span>
//                                     </div>
//                                 </div>
//                             </div>

//                             <div className="space-y-2 pt-2 border-t border-slate-100 max-h-56 overflow-y-auto pr-1">
//                                 {leaveDistribution.map((item) => (
//                                     <div
//                                         key={item.name}
//                                         className="flex items-center justify-between text-xs p-2 rounded-xl hover:bg-slate-50/80 transition-colors"
//                                     >
//                                         <div className="flex items-center gap-2 min-w-0 pr-2">
//                                             <span
//                                                 className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
//                                                 style={{ backgroundColor: item.color }}
//                                             />
//                                             <span className="text-slate-700 font-semibold truncate">
//                                                 {item.name}
//                                             </span>
//                                         </div>
//                                         <div className="flex items-center gap-3 shrink-0">
//                                             <div className="w-16 sm:w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
//                                                 <div
//                                                     className="h-full rounded-full transition-all duration-500"
//                                                     style={{
//                                                         width: `${(item.value / Math.max(totalLeaveCount, 1)) * 100}%`,
//                                                         backgroundColor: item.color,
//                                                     }}
//                                                 />
//                                             </div>
//                                             <span className="font-bold text-slate-900 w-8 text-right font-mono">
//                                                 {item.value}
//                                             </span>
//                                         </div>
//                                     </div>
//                                 ))}
//                             </div>
//                         </div>
//                     )}
//                 </div>

//                 {/* Department Headcount */}
//                 <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-7 border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between space-y-4 group/card">
//                     <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
//                         <div>
//                             <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2 group-hover/card:text-indigo-600 transition-colors">
//                                 <Building2
//                                     size={16}
//                                     className="text-indigo-600 group-hover/card:scale-110 transition-transform"
//                                 />
//                                 Department Headcount
//                             </h2>
//                             <p className="text-xs font-medium text-slate-500 mt-0.5">
//                                 Staff distribution across {departmentData.length} active departments
//                             </p>
//                         </div>
//                         <span className="text-[11px] font-semibold text-slate-600 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200/60 font-mono shadow-2xs shrink-0">
//                             {totalEmployeesCount} Total
//                         </span>
//                     </div>

//                     {departmentData.length === 0 ? (
//                         <div className="py-12 sm:py-16 text-center text-xs font-medium text-slate-400 flex flex-col items-center gap-2">
//                             <AlertCircle size={28} className="text-slate-300" />
//                             <span>No department assignments registered.</span>
//                         </div>
//                     ) : (
//                         <div className="space-y-2.5 pt-1 max-h-72 overflow-y-auto pr-1">
//                             {departmentData.map((dept) => {
//                                 const percentage = Math.round(
//                                     (dept.count / Math.max(totalEmployeesCount, 1)) * 100
//                                 );

//                                 return (
//                                     <div
//                                         key={dept.name}
//                                         onClick={() => router.push("/employees")}
//                                         className="p-3 rounded-2xl bg-slate-50/70 hover:bg-indigo-50/60 border border-slate-200/60 hover:border-indigo-200 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group/item shadow-2xs hover:shadow-xs"
//                                     >
//                                         <div className="flex items-center justify-between text-xs mb-2">
//                                             <span className="text-slate-800 font-semibold group-hover/item:text-indigo-600 transition-colors flex items-center gap-1.5 truncate pr-2">
//                                                 <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 group-hover/item:scale-125 transition-transform shrink-0" />
//                                                 <span className="truncate">{dept.name}</span>
//                                             </span>
//                                             <div className="flex items-center gap-2 shrink-0">
//                                                 <span className="text-[10px] font-medium text-slate-400 font-mono hidden sm:inline-block">
//                                                     {percentage}%
//                                                 </span>
//                                                 <span className="text-slate-900 font-bold font-mono bg-white px-2 py-0.5 rounded-lg border border-slate-200 text-[11px] group-hover/item:bg-indigo-600 group-hover:text-white transition-colors">
//                                                     {dept.count} {dept.count === 1 ? "Member" : "Members"}
//                                                 </span>
//                                             </div>
//                                         </div>
//                                         <div className="w-full h-2 bg-slate-200/80 rounded-full overflow-hidden">
//                                             <div
//                                                 className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-500"
//                                                 style={{ width: `${(dept.count / maxDeptCount) * 100}%` }}
//                                             />
//                                         </div>
//                                     </div>
//                                 );
//                             })}
//                         </div>
//                     )}
//                 </div>
//             </div>

//             {/* Pending Leave Requests Section */}
//             <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-7 border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300 space-y-4">
//                 <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
//                     <div>
//                         <h2 className="text-base font-bold text-slate-900 tracking-tight">
//                             Pending Leave Requests
//                         </h2>
//                         <p className="text-xs font-medium text-slate-500 mt-0.5">
//                             {pendingLeaves.length} {pendingLeaves.length === 1 ? "application" : "applications"} awaiting managerial review
//                         </p>
//                     </div>
//                     <button
//                         type="button"
//                         onClick={() => router.push("/leave")}
//                         className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-bold transition-all bg-indigo-50 hover:bg-indigo-100 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl border border-indigo-100 active:scale-95 cursor-pointer shrink-0"
//                     >
//                         <span>View All</span>
//                         <ArrowUpRight size={13} />
//                     </button>
//                 </div>

//                 {pendingLeaves.length === 0 ? (
//                     <div className="text-center py-10 sm:py-14 text-slate-400 space-y-2">
//                         <CheckCircle2 size={36} className="mx-auto text-emerald-400 stroke-[1.5]" />
//                         <p className="text-xs font-bold text-slate-700">All leave requests are up to date</p>
//                         <p className="text-[11px] text-slate-400">
//                             There are currently no pending requests requiring approval.
//                         </p>
//                     </div>
//                 ) : (
//                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
//                         {pendingLeaves.slice(0, 6).map((req) => {
//                             const employeeName = req.employee?.name || "Unknown Employee";
//                             const departmentName =
//                                 req.employee?.department?.name || req.department || "General Team";

//                             return (
//                                 <div
//                                     key={req._id}
//                                     onClick={() => router.push("/leave")}
//                                     className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/70 hover:bg-indigo-50/50 border border-slate-200/70 hover:border-indigo-300 hover:-translate-y-0.5 transition-all duration-200 group cursor-pointer shadow-2xs hover:shadow-xs"
//                                 >
//                                     <div className="flex items-center gap-3 min-w-0 pr-2">
//                                         <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs border border-indigo-200 group-hover:scale-105 transition-transform duration-200">
//                                             {getInitials(employeeName)}
//                                         </div>
//                                         <div className="min-w-0">
//                                             <p className="text-xs font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
//                                                 {employeeName}
//                                             </p>
//                                             <p className="text-[11px] font-medium text-slate-500 truncate mt-0.5">
//                                                 {departmentName} ·{" "}
//                                                 <span className="capitalize font-semibold text-slate-700">
//                                                     {req.leaveType}
//                                                 </span>
//                                             </p>
//                                         </div>
//                                     </div>

//                                     <div className="text-right shrink-0">
//                                         <span className="inline-block text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-200/70 font-mono group-hover:bg-indigo-600 group-hover:text-white transition-colors">
//                                             {req.totalDays || 1} {req.totalDays > 1 ? "Days" : "Day"}
//                                         </span>
//                                         <p className="text-[10px] font-medium text-slate-400 mt-1">
//                                             {new Date(req.startDate).toLocaleDateString("en-US", {
//                                                 month: "short",
//                                                 day: "numeric",
//                                             })}
//                                         </p>
//                                     </div>
//                                 </div>
//                             );
//                         })}
//                     </div>
//                 )}
//             </div>
//         </div>
//     );
// }