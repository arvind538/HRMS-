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
    ArrowRight,
    TrendingUp,
    Loader2,
    Clock,
    Sparkles,
    PieChart as PieChartIcon,
    Building2,
    AlertCircle,
    User,
    Plus,
    LogIn,
    LogOut,
    ListChecks,
    Wallet,
    Hourglass,
    Target,
    Zap,
    Moon,
    X,
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
import { toast } from "react-toastify";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

/* -------------------------------------------------------------------------- */
/* SETTINGS (change these to match your company)                              */
/* -------------------------------------------------------------------------- */

// Must be the same as the office location on the Attendance page
const OFFICE_LOCATION = {
    name: "4paySave.",
    address: "jamdoli, Jaipur",
    lat: 26.890373334979436,
    lng: 75.87398927116433,
    allowedRadius: 1000, // punch is allowed within this distance (meters)
    nearRadius: 1000, // inside this distance the office address is saved (meters)
};

const DEFAULT_WORK_HOURS = 8; // used only when no shift is assigned
const ANNUAL_LEAVE_QUOTA = 15; // paid leave days per year
const PUNCH_ROLES = ["employee", "manager", "hr", "admin"]; // roles that mark their own attendance

// Tasks and the holiday calendar open as popups inside the dashboard, so they need no page route.
// const ROUTES = {
//     leave: "/leave/apply",
//     attendance: "/attendance",
//     payroll: "/payroll",
//     profile: "/profile",
//     recruitment: "/recruitment",
//     employees: "/employees",
// };

const ROUTES = {
    tasks: "/tasks",
    calendar: "/leave/holidays",
    leave: "/leave", // Leave Dashboard
    applyLeave: "/leave/apply",
    attendance: "/attendance",
    payroll: "/payroll",
    myPayslips: "/self-service/payslips",
    profile: "/self-service/profile",
    recruitment: "/recruitment/positions",
    employees: "/employees",
};


/* -------------------------------------------------------------------------- */
/* CONSTANTS & HELPERS                                                        */
/* -------------------------------------------------------------------------- */

const LEAVE_COLORS = ["#4f46e5", "#06b6d4", "#8b5cf6", "#f59e0b", "#ec4899", "#10b981"];
const PRESENT_STATUSES = ["present", "late", "half-day", "half day"];
const INACTIVE_LEAVE = ["rejected", "cancelled", "canceled"];
const REFRESH_INTERVAL = 60 * 1000;
const MONTH_NAMES = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

/* Task fields: different backends use different names, so many are checked */
const ASSIGNEE_KEYS = ["assignedTo", "assignee", "assignees", "assigned_to", "assignedEmployee", "assignedEmployees", "employee", "employeeId", "user", "members"];
const CREATOR_KEYS = ["assignedBy", "createdBy", "assigner", "creator", "manager"];

const TASK_TABS = [
    ["all", "All"],
    ["today", "Today"],
    ["pending", "Pending"],
    ["completed", "Completed"],
    ["high", "High Priority"],
];

const ENERGY_OPTIONS = [
    { value: "Focused", icon: Target },
    { value: "Busy", icon: Zap },
    { value: "Available", icon: CheckCircle2 },
    { value: "Away", icon: Moon },
];

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
    admin: { title: "Executive HR Dashboard", badge: "Admin", label: "Super Admin" },
    hr: { title: "HR Dashboard", badge: "HR", label: "HR Manager" },
    manager: { title: "Team Management Dashboard", badge: "Manager", label: "Manager" },
    employee: { title: "My Dashboard", badge: "Employee", label: "Employee" },
};

const toList = (res) => {
    const d = res?.data;
    if (Array.isArray(d)) return d;
    if (!d || typeof d !== "object") return [];
    for (const key of [
        "data", "employees", "leaves", "attendance", "records", "departments",
        "designations", "positions", "payrolls", "payroll", "tasks", "holidays",
    ]) {
        if (Array.isArray(d[key])) return d[key];
    }
    return [];
};

const isMongoId = (str) => /^[0-9a-fA-F]{24}$/.test(String(str || ""));
const lower = (v) => String(v || "").trim().toLowerCase();
const titleCase = (s) => String(s || "").replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const pad2 = (n) => String(n).padStart(2, "0");
const norm = (arr) => new Set(arr.map(lower).filter(Boolean));

const idOf = (v) => {
    if (!v) return "";
    if (typeof v === "object") return String(v._id || v.id || "");
    return String(v);
};

/* first value that is a real number */
const num = (...vals) => {
    for (const v of vals) {
        if (v !== undefined && v !== null && v !== "" && !Number.isNaN(Number(v))) return Number(v);
    }
    return 0;
};

/* month can be 10 or "10" or "October" */
const monthNum = (m) => {
    const n = Number(m);
    if (n >= 1 && n <= 12) return n;
    if (!m) return 0;
    const i = MONTH_NAMES.findIndex((x) => x.startsWith(lower(m).slice(0, 3)));
    return i + 1;
};

const getName = (emp) =>
    emp?.name || `${emp?.firstName || ""} ${emp?.lastName || ""}`.trim() || "Employee";

const refName = (ref) => {
    if (!ref || typeof ref !== "object") return "";
    return ref.name || `${ref.firstName || ""} ${ref.lastName || ""}`.trim() || ref.employee?.name || ref.user?.name || "";
};

const getInitials = (name) => {
    if (!name) return "EM";
    const parts = name.trim().split(" ").filter(Boolean);
    return parts.length > 1
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : parts[0].slice(0, 2).toUpperCase();
};

/* Local date (YYYY-MM-DD). toISOString() gives the UTC date, which is wrong in India before 5:30 AM */
const toYMD = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

/* Plain "YYYY-MM-DD" strings (holidays) are used as they are, other values go through local time */
const dateKey = (v) => {
    if (!v) return "";
    if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? "" : toYMD(d);
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

/* for plain "YYYY-MM-DD" keys (daily updates, holidays): read as a local date, so the day never shifts */
const formatYMD = (key) => {
    const d = new Date(`${key}T00:00:00`);
    return Number.isNaN(d.getTime())
        ? "—"
        : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

const formatTime = (value) => {
    const d = new Date(value);
    return Number.isNaN(d.getTime())
        ? "—"
        : d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
};

const formatDuration = (ms) => {
    const total = Math.max(0, Math.floor(ms / 60000));
    return `${pad2(Math.floor(total / 60))}h ${pad2(total % 60)}m`;
};

const formatMoney = (n) => `₹ ${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const monthLabel = (month, year) =>
    new Date(year, (month || 1) - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });

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

/* ----- Tasks ----- */
const isTaskDone = (t) => /complete|done|closed/.test(lower(t?.status));
const isTaskSubmitted = (t) => lower(t?.status) === "submitted";
const isTaskCancelled = (t) => /cancel/.test(lower(t?.status));
const isTaskHigh = (t) => /high|urgent|critical/.test(lower(t?.priority));
const taskDue = (t) => t?.dueDate || t?.deadline || t?.endDate || t?.date || null;
const taskProgress = (t) => Math.max(0, Math.min(100, Number(t?.progress) || 0));
const byNewest = (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0);

const filterTasks = (tasks, tab, todayYMD) =>
    tasks.filter((t) => {
        if (tab === "completed") return isTaskDone(t);
        if (tab === "pending") return !isTaskDone(t) && !isTaskCancelled(t);
        if (tab === "high") return isTaskHigh(t) && !isTaskDone(t) && !isTaskCancelled(t);
        if (tab === "today") return dateKey(taskDue(t)) === todayYMD;
        return true;
    });

/* every person reference found in the given fields (ids, populated objects, names) */
const collectRefs = (task, keys) => {
    const refs = [];
    keys.forEach((k) => {
        const v = task?.[k];
        if (v === undefined || v === null || v === "") return;
        (Array.isArray(v) ? v : [v]).forEach((x) => {
            if (x !== undefined && x !== null && x !== "") refs.push(x);
        });
    });
    return refs;
};

/* does a reference point to somebody inside the scope ({ ids, emails, names }) */
const refMatches = (ref, scope) => {
    if (ref === undefined || ref === null || !scope) return false;
    const id = idOf(ref);
    if (id && scope.ids.has(id)) return true;
    if (typeof ref === "object") {
        for (const k of ["employee", "user"]) {
            const nested = idOf(ref[k]);
            if (nested && scope.ids.has(nested)) return true;
        }
        if (ref.email && scope.emails.has(lower(ref.email))) return true;
        if (ref.name && scope.names.has(lower(ref.name))) return true;
        return false;
    }
    return scope.names.has(lower(ref));
};

/* If a task has no assignee field at all, the server already decided that it is for this user */
const taskMatches = (task, scope) => {
    if (!scope) return true;
    const refs = collectRefs(task, ASSIGNEE_KEYS);
    if (refs.length === 0) return true;
    return refs.some((r) => refMatches(r, scope));
};

const assigneeText = (t) => {
    const first = collectRefs(t, ASSIGNEE_KEYS).find((r) => typeof r === "object");
    return refName(first);
};
const assignerText = (t) => {
    const first = collectRefs(t, CREATOR_KEYS).find((r) => typeof r === "object");
    return refName(first);
};

/* ----- Payroll ----- */
const normalizePayslip = (p) =>
    p && {
        ...p,
        net: num(p.netSalary, p.netPay, p.netAmount, p.net),
        gross: num(p.grossSalary, p.grossPay, p.gross),
        deductions: num(p.totalDeductions, p.deductions),
        present: p.daysPresent ?? p.presentDays ?? "—",
        onLeave: p.daysOnLeave ?? p.leaveDays ?? "—",
        monthNo: monthNum(p.month),
        yearNo: Number(p.year) || 0,
    };

/* -------------------------------------------------------------------------- */
/* LOCATION (same rules as the Attendance page)                               */
/* -------------------------------------------------------------------------- */

const coordsLabel = (lat, lng) => `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`;

const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const getReadableAddress = async (lat, lng) => {
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 6000);
        const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=en`,
            { signal: controller.signal }
        );
        clearTimeout(timer);
        if (!res.ok) throw new Error(`Geocoding failed: ${res.status}`);
        const data = await res.json();
        const a = data.address || {};
        const parts = [
            ...new Set(
                [
                    a.house_number,
                    a.road,
                    a.neighbourhood || a.suburb || a.residential,
                    a.city_district,
                    a.city || a.town || a.village,
                ].filter(Boolean)
            ),
        ];
        if (parts.length >= 2) return parts.join(", ");
        const base =
            parts[0] || (data.display_name ? data.display_name.split(",").slice(0, 2).join(",").trim() : "");
        return base ? `${base} (${coordsLabel(lat, lng)})` : coordsLabel(lat, lng);
    } catch {
        return coordsLabel(lat, lng);
    }
};

const resolveLocationLabel = async (lat, lng, distance) =>
    distance <= OFFICE_LOCATION.nearRadius
        ? `${OFFICE_LOCATION.name}, ${OFFICE_LOCATION.address}`
        : getReadableAddress(lat, lng);

const getCurrentPosition = () =>
    new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 15000,
        });
    });

/* -------------------------------------------------------------------------- */
/* MY ATTENDANCE (one punch in and one punch out per day)                     */
/* -------------------------------------------------------------------------- */

function useMyAttendance({ userId, userName, onChanged }) {
    const [today, setToday] = useState({ loaded: false, hasIn: false, hasOut: false, firstIn: null, lastOut: null });
    const [busy, setBusy] = useState(false);
    const lock = useRef(false);

    const refresh = useCallback(async () => {
        if (!userId) {
            setToday((p) => ({ ...p, loaded: true }));
            return null;
        }
        try {
            const { data } = await api.get("/attendance", {
                params: { date: toYMD(new Date()), employeeId: userId },
            });
            const mine = toList({ data }).filter((r) => {
                const e = r?.employee ?? r?.user;
                if (idOf(e) === userId) return true;
                return Boolean(userName) && e && typeof e === "object" && lower(e.name) === lower(userName);
            });
            const toDates = (key) =>
                mine
                    .map((r) => r[key])
                    .filter(Boolean)
                    .map((v) => new Date(v))
                    .filter((d) => !Number.isNaN(d.getTime()))
                    .sort((a, b) => a - b);
            const ins = toDates("checkIn");
            const outs = toDates("checkOut");
            const status = {
                loaded: true,
                hasIn: ins.length > 0,
                hasOut: outs.length > 0,
                firstIn: ins[0] || null,
                lastOut: outs[outs.length - 1] || null,
            };
            setToday(status);
            return status;
        } catch (err) {
            console.error("Attendance status error:", err);
            setToday((p) => ({ ...p, loaded: true }));
            return null;
        }
    }, [userId, userName]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const punch = useCallback(
        async (type) => {
            if (lock.current) return;
            if (!userId) {
                toast.error("Your session has expired. Please log in again.");
                return;
            }
            if (typeof navigator === "undefined" || !navigator.geolocation) {
                toast.error("Location is not supported by your browser.");
                return;
            }

            const isIn = type === "checkin";
            lock.current = true;
            setBusy(true);

            try {
                // 1. Check today's status on the server again, before doing anything
                const status = await refresh();
                if (!status) {
                    toast.error("Unable to verify today's attendance. Please try again.");
                    return;
                }
                if (isIn && status.hasIn) {
                    toast.info("You have already punched in today. Only one punch in is allowed per day.");
                    return;
                }
                if (!isIn && !status.hasIn) {
                    toast.error("Please punch in first before punching out.");
                    return;
                }
                if (!isIn && status.hasOut) {
                    toast.info("You have already punched out today. Only one punch out is allowed per day.");
                    return;
                }

                // 2. Location and geofence
                let position;
                try {
                    position = await getCurrentPosition();
                } catch (geoError) {
                    toast.error(
                        geoError?.code === 1
                            ? "Location access was denied. Please enable GPS and allow location access."
                            : "Unable to get your location. Please check your GPS and try again."
                    );
                    return;
                }

                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                const distance = calculateDistance(lat, lng, OFFICE_LOCATION.lat, OFFICE_LOCATION.lng);

                if (distance > OFFICE_LOCATION.allowedRadius) {
                    toast.error(
                        `${isIn ? "Punch in" : "Punch out"} failed. You are outside the office area (${Math.round(distance)} m away).`
                    );
                    return;
                }

                const address = await resolveLocationLabel(lat, lng, distance);
                const coords = { lat, lng };

                // 3. Save
                if (isIn) {
                    await api.post("/attendance/check-in", {
                        employee: userId,
                        name: userName,
                        date: toYMD(new Date()),
                        location: coords,
                        inLocation: address,
                        inCoordinates: coords,
                    });
                    toast.success("Punched in successfully!");
                } else {
                    await api.put("/attendance/check-out", {
                        employee: userId,
                        date: toYMD(new Date()),
                        location: coords,
                        outLocation: address,
                        outCoordinates: coords,
                    });
                    toast.success("Punched out successfully!");
                }

                await refresh();
                onChanged?.();
            } catch (err) {
                toast.error(err?.response?.data?.message || (isIn ? "Punch in failed." : "Punch out failed."));
                refresh();
            } finally {
                lock.current = false;
                setBusy(false);
            }
        },
        [userId, userName, refresh, onChanged]
    );

    return { today, busy, punch, refresh };
}

const getPunchAction = (att, busy) => {
    if (!att.loaded) return { label: "Checking...", type: null, disabled: true };
    if (!att.hasIn) return { label: "Punch In", type: "checkin", disabled: busy };
    if (!att.hasOut) return { label: "Punch Out", type: "checkout", disabled: busy };
    return { label: "Day Completed", type: null, disabled: true };
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

/* White card with a header and a footer link, used on the employee dashboard */
function WidgetCard({ title, right, footer, children }) {
    return (
        <div className="min-w-0 h-full bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 sm:px-5 py-3.5 border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-900 shrink-0">{title}</h2>
                {right && <div className="min-w-0 max-w-full">{right}</div>}
            </div>
            <div className="flex-1 min-h-[96px]">{children}</div>
            {footer && <div className="border-t border-slate-100 px-4 py-3 text-center">{footer}</div>}
        </div>
    );
}

function FooterLink({ label, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
        >
            {label} <ArrowRight size={12} />
        </button>
    );
}

function NoData({ text = "No data found" }) {
    return <p className="py-8 text-center text-xs text-slate-400 font-medium">{text}</p>;
}

/* Tabs for the task lists (scroll sideways on a phone) */
function TaskTabs({ tab, setTab }) {
    return (
        <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 sm:flex-wrap sm:justify-end">
            {TASK_TABS.map(([key, label]) => (
                <button
                    key={key}
                    type="button"
                    onClick={() => setTab(key)}
                    className={`shrink-0 whitespace-nowrap px-3 py-1 rounded-full text-[11px] font-semibold border transition ${tab === key
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                        }`}
                >
                    {label}
                </button>
            ))}
        </div>
    );
}

/* Popup used for "All Tasks" and the holiday calendar, so no separate page (and no page permission) is needed */
function ListModal({ title, subtitle, tabs, onClose, children }) {
    const closeRef = useRef(onClose);
    closeRef.current = onClose;

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === "Escape") closeRef.current();
        };
        const previous = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        document.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = previous;
            document.removeEventListener("keydown", onKey);
        };
    }, []);

    return (
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 p-0 sm:p-4"
            onClick={onClose}
        >
            <div
                className="w-full sm:max-w-2xl bg-white rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-3 px-4 sm:px-5 py-4 border-b border-slate-100">
                    <div className="min-w-0">
                        <h3 className="text-base font-bold text-slate-900">{title}</h3>
                        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="shrink-0 w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500 flex items-center justify-center"
                    >
                        <X size={16} />
                    </button>
                </div>
                {tabs && <div className="px-4 sm:px-5 pt-3">{tabs}</div>}
                <div className="flex-1 overflow-y-auto min-h-[120px]">{children}</div>
            </div>
        </div>
    );
}

/* Holiday list: upcoming first, then past holidays */
function HolidayList({ holidays, todayYMD }) {
    if (holidays.length === 0) return <NoData text="No holidays found for this year" />;

    const upcoming = holidays.filter((h) => h.key >= todayYMD);
    const past = holidays.filter((h) => h.key < todayYMD).reverse();

    const renderRow = (h, faded) => {
        const d = new Date(`${h.key}T00:00:00`);
        const isToday = h.key === todayYMD;
        return (
            <li
                key={h._id || `${h.key}-${h.title}`}
                className={`flex items-start gap-3 px-4 sm:px-5 py-3 ${faded ? "opacity-60" : ""} ${isToday ? "bg-amber-50/60" : ""}`}
            >
                <div className="w-12 shrink-0 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100 text-center py-1.5">
                    <p className="text-base font-extrabold leading-none">{d.getDate()}</p>
                    <p className="text-[10px] font-bold uppercase mt-0.5">
                        {d.toLocaleDateString("en-IN", { month: "short" })}
                    </p>
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 break-words">{h.title}</p>
                    <p className="text-[11px] text-slate-500">
                        {d.toLocaleDateString("en-IN", { weekday: "long" })}
                        {h.description ? ` · ${h.description}` : ""}
                    </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                    {isToday && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            Today
                        </span>
                    )}
                    {h.type && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-50 text-slate-600 border border-slate-200">
                            {h.type}
                        </span>
                    )}
                    {h.optional && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-violet-50 text-violet-700 border border-violet-200">
                            Optional
                        </span>
                    )}
                </div>
            </li>
        );
    };

    return (
        <div>
            {upcoming.length > 0 && (
                <>
                    <p className="px-4 sm:px-5 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Upcoming</p>
                    <ul className="divide-y divide-slate-100">{upcoming.map((h) => renderRow(h, false))}</ul>
                </>
            )}
            {past.length > 0 && (
                <>
                    <p className="px-4 sm:px-5 pt-4 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Past</p>
                    <ul className="divide-y divide-slate-100">{past.map((h) => renderRow(h, true))}</ul>
                </>
            )}
        </div>
    );
}

/* One task of the employee: progress, today's update, submit */
function EmployeeTaskRow({ t, todayYMD, onProgress, onSubmit }) {
    const by = assignerText(t);
    const done = isTaskDone(t);
    const submitted = isTaskSubmitted(t);
    const cancelled = isTaskCancelled(t);
    const open = !done && !submitted && !cancelled;
    const rework = open && t.review?.comment;
    const todayUpdate = Array.isArray(t.updates) ? t.updates.find((u) => u.date === todayYMD) : null;

    return (
        <li className="px-4 sm:px-5 py-3 space-y-2">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 break-words">{t.title || t.name || "Untitled task"}</p>
                    <p className="text-[11px] text-slate-400 truncate">
                        {taskDue(t) ? `Due ${formatDate(taskDue(t))}` : "No due date"}
                        {by ? ` · by ${by}` : ""}
                    </p>
                </div>
                <span
                    className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold border capitalize ${done
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : submitted
                            ? "bg-violet-50 text-violet-700 border-violet-200"
                            : cancelled
                                ? "bg-slate-100 text-slate-500 border-slate-200"
                                : isTaskHigh(t)
                                    ? "bg-rose-50 text-rose-700 border-rose-200"
                                    : "bg-slate-50 text-slate-600 border-slate-200"
                        }`}
                >
                    {done ? "Done" : submitted ? "In Review" : cancelled ? "Cancelled" : t.priority || "Pending"}
                </span>
            </div>

            <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all ${done ? "bg-emerald-500" : "bg-indigo-500"}`}
                        style={{ width: `${taskProgress(t)}%` }}
                    />
                </div>
                <span className="text-[10px] font-semibold text-slate-500 font-mono w-9 text-right">{taskProgress(t)}%</span>
            </div>

            {rework && (
                <p className="text-[11px] text-rose-700 bg-rose-50 border border-rose-100 rounded-lg px-2.5 py-1.5 break-words">
                    Rework requested: {t.review.comment}
                </p>
            )}

            {open && todayUpdate && (
                <p className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-1.5 break-words">
                    Today: {todayUpdate.progress}% · {todayUpdate.note}
                </p>
            )}

            {open && (
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => onProgress(t)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-200 text-indigo-700 hover:bg-indigo-50 text-[11px] font-bold"
                    >
                        <TrendingUp size={12} /> {todayUpdate ? "Edit Today's Update" : "Add Today's Update"}
                    </button>
                    <button
                        type="button"
                        onClick={() => onSubmit(t)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold"
                    >
                        <CheckCircle2 size={12} /> {rework ? "Resubmit Work" : "Submit Work"}
                    </button>
                </div>
            )}
        </li>
    );
}

/* One task in the manager / admin view: progress, latest update, approve or rework */
function TeamTaskRow({ t, onReview }) {
    const to = assigneeText(t);
    const submitted = isTaskSubmitted(t);
    const last = Array.isArray(t.updates) && t.updates.length > 0 ? t.updates[t.updates.length - 1] : null;

    return (
        <li className="py-2.5 space-y-2">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 break-words">{t.title || t.name || "Untitled task"}</p>
                    <p className="text-[11px] text-slate-400 truncate">
                        {to ? `To ${to} · ` : ""}
                        {taskDue(t) ? `Due ${formatDate(taskDue(t))}` : "No due date"}
                    </p>
                </div>
                <span
                    className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold border capitalize ${isTaskDone(t)
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : submitted
                            ? "bg-violet-50 text-violet-700 border-violet-200"
                            : isTaskHigh(t)
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : "bg-slate-50 text-slate-600 border-slate-200"
                        }`}
                >
                    {isTaskDone(t) ? "Done" : t.status || t.priority || "Pending"}
                </span>
            </div>

            <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                        className={`h-full rounded-full ${isTaskDone(t) ? "bg-emerald-500" : "bg-indigo-500"}`}
                        style={{ width: `${taskProgress(t)}%` }}
                    />
                </div>
                <span className="text-[10px] font-semibold text-slate-500 font-mono w-9 text-right">{taskProgress(t)}%</span>
            </div>

            {last && !submitted && (
                <p className="text-[11px] text-slate-500 break-words">
                    Latest update ({formatYMD(last.date)}): {last.note}
                </p>
            )}

            {submitted && (
                <div className="rounded-lg bg-violet-50 border border-violet-100 px-2.5 py-2 space-y-2">
                    <p className="text-[11px] text-violet-800 break-words">
                        {t.submission?.note}
                        {t.submission?.link && (
                            <>
                                {" "}
                                <a href={t.submission.link} target="_blank" rel="noreferrer" className="underline font-semibold">
                                    Open link
                                </a>
                            </>
                        )}
                    </p>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => onReview(t, "approve")}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold"
                        >
                            Approve
                        </button>
                        <button
                            type="button"
                            onClick={() => onReview(t, "rework")}
                            className="px-3 py-1.5 rounded-lg bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 text-[11px] font-bold"
                        >
                            Rework
                        </button>
                    </div>
                </div>
            )}
        </li>
    );
}

/* Daily update / submit popup */
function TaskActionModal({ state, progress, setProgress, note, setNote, link, setLink, busy, onClose, onSave }) {
    if (!state) return null;
    const isProgress = state.mode === "progress";
    return (
        <div
            className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-slate-900/60 p-0 sm:p-4"
            onClick={onClose}
        >
            <div
                className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl p-5 space-y-4 max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div>
                    <h3 className="text-base font-bold text-slate-900">
                        {isProgress ? "Today's Work Update" : "Submit Work for Review"}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5 break-words">{state.task.title || state.task.name}</p>
                </div>

                {isProgress ? (
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-slate-600">How much of the task is done?</label>
                            <span className="text-sm font-extrabold text-indigo-600 font-mono">{progress}%</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={progress}
                            onChange={(e) => setProgress(Number(e.target.value))}
                            className="w-full accent-indigo-600"
                        />
                    </div>
                ) : (
                    <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                        Current progress: <span className="font-bold text-slate-700">{taskProgress(state.task)}%</span>. You can
                        submit even if the task is only partly done.
                    </p>
                )}

                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600">
                        {isProgress ? "What did you work on today? *" : "What did you complete? *"}
                    </label>
                    <textarea
                        rows={4}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Short summary of the work..."
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    />
                </div>

                {!isProgress && (
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-600">Link (optional)</label>
                        <input
                            type="url"
                            value={link}
                            onChange={(e) => setLink(e.target.value)}
                            placeholder="https://drive.google.com/..."
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                        />
                    </div>
                )}

                <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onSave}
                        disabled={busy}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold disabled:opacity-60"
                    >
                        {busy && <Loader2 size={13} className="animate-spin" />}
                        {isProgress ? "Save Update" : "Submit for Review"}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* Round progress with the work time in the middle */
function WorkRing({ ms, goalMs }) {
    const size = 128;
    const r = 56;
    const c = 2 * Math.PI * r;
    const progress = Math.min(1, goalMs > 0 ? ms / goalMs : 0);
    const angle = progress * 2 * Math.PI - Math.PI / 2;
    const dotX = size / 2 + r * Math.cos(angle);
    const dotY = size / 2 + r * Math.sin(angle);

    return (
        <div className="relative w-32 h-32 sm:w-36 sm:h-36 shrink-0">
            <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="8" />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={c}
                    strokeDashoffset={c * (1 - progress)}
                    className="transition-all duration-700"
                />
            </svg>
            {/* the dot sits on the end of the progress line (the svg is rotated, so it is drawn on top, unrotated) */}
            <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 w-full h-full pointer-events-none">
                <circle cx={dotX} cy={dotY} r="5" fill="#ffffff" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-3">
                <span className="text-[9px] sm:text-[10px] font-semibold text-white/80 leading-tight">Today&apos;s Work Duration</span>
                <span className="text-lg sm:text-xl font-extrabold font-mono text-white leading-tight mt-0.5">{formatDuration(ms)}</span>
                <span className="text-[9px] sm:text-[10px] font-medium text-white/70 mt-0.5">of {formatDuration(goalMs)}</span>
            </div>
        </div>
    );
}

/* Top banner of the employee dashboard */
function EmployeeHero({ name, roleLabel, avatar, att, now, busy, onPunch, energy, setEnergy, shiftName, shiftTime, goalMs, onViewAttendance }) {
    const action = getPunchAction(att, busy);
    const workMs = !att.hasIn
        ? 0
        : Math.max(0, (att.hasOut ? att.lastOut.getTime() : now) - att.firstIn.getTime());

    const punchStyle =
        action.type === "checkout"
            ? "bg-rose-500 hover:bg-rose-600 text-white"
            : action.type === "checkin"
                ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                : "bg-white/15 text-white/80 cursor-not-allowed";

    return (
        <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-900 text-white p-4 sm:p-6 shadow-sm">
            <div className="pointer-events-none absolute -right-16 -top-20 w-72 h-72 rounded-full bg-white/5" aria-hidden="true" />
            <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 lg:gap-4 items-center">
                {/* Profile and energy level */}
                <div className="md:col-span-2 lg:col-span-5 min-w-0 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                            {avatar ? (
                                <img src={avatar} alt="" className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border-2 border-white/40" />
                            ) : (
                                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-emerald-600 border-2 border-white/40 flex items-center justify-center">
                                    <User size={22} />
                                </div>
                            )}
                            <span className="absolute -right-0.5 -bottom-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-indigo-700" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-base sm:text-lg font-bold truncate">{name}</p>
                            <p className="text-xs text-white/80">{roleLabel}</p>
                            <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-white/15 text-[10px] font-semibold">Online</span>
                        </div>
                    </div>

                    <div>
                        <p className="text-xs font-medium text-white/80 mb-2">How is your energy level today?</p>
                        <div className="flex flex-wrap gap-2">
                            {ENERGY_OPTIONS.map(({ value, icon: Icon }) => (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() => setEnergy(value)}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition ${energy === value
                                        ? "bg-white text-indigo-700 border-white"
                                        : "bg-white/10 text-white border-white/25 hover:bg-white/20"
                                        }`}
                                >
                                    <Icon size={12} />
                                    {value}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Work duration */}
                <div className="md:col-span-1 lg:col-span-3 flex justify-center">
                    <WorkRing ms={workMs} goalMs={goalMs} />
                </div>

                {/* Shift, check in time and buttons */}
                <div className="md:col-span-1 lg:col-span-4 min-w-0 space-y-4 flex flex-col lg:items-end">
                    <div className="flex flex-wrap items-start gap-x-8 gap-y-3 lg:justify-end">
                        <div className="min-w-0">
                            <p className="flex items-center gap-1.5 text-[10px] text-white/70 font-medium">
                                <Calendar size={11} /> Work Shift
                            </p>
                            <p className="text-sm font-bold mt-0.5 break-words">{shiftName || "Not Assigned"}</p>
                            {shiftTime && <p className="text-[11px] text-white/80 mt-0.5">{shiftTime}</p>}
                        </div>
                        <div>
                            <p className="flex items-center gap-1.5 text-[10px] text-white/70 font-medium">
                                <LogIn size={11} /> {att.hasOut ? "Checked out at" : "Checked in at"}
                            </p>
                            <p className="text-sm font-bold mt-0.5">
                                {att.hasOut ? formatTime(att.lastOut) : att.hasIn ? formatTime(att.firstIn) : "Not yet"}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row md:flex-col xl:flex-row gap-2.5 w-full lg:w-auto">
                        <button
                            type="button"
                            onClick={() => action.type && onPunch(action.type)}
                            disabled={action.disabled}
                            className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-bold shadow-lg shadow-black/10 transition active:scale-95 disabled:opacity-80 ${punchStyle}`}
                        >
                            {busy || !att.loaded ? (
                                <Loader2 size={15} className="animate-spin" />
                            ) : action.type === "checkout" ? (
                                <LogOut size={15} />
                            ) : (
                                <LogIn size={15} />
                            )}
                            {action.label}
                        </button>
                        <button
                            type="button"
                            onClick={onViewAttendance}
                            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/25 text-xs font-bold transition"
                        >
                            <Calendar size={15} /> View Attendance
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}

/* Slim attendance bar for admin, HR and managers */
function PunchBar({ att, busy, onPunch, onView }) {
    const action = getPunchAction(att, busy);
    const text = !att.loaded
        ? "Checking today's attendance..."
        : att.hasIn && att.hasOut
            ? `Completed for today. In: ${formatTime(att.firstIn)} · Out: ${formatTime(att.lastOut)}`
            : att.hasIn
                ? `You punched in at ${formatTime(att.firstIn)}. Punch out at the end of your day.`
                : "You have not punched in yet today.";

    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4">
            <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
                    <Clock size={16} />
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900">My Attendance</p>
                    <p className="text-xs text-slate-500">{text}</p>
                </div>
            </div>
            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={() => action.type && onPunch(action.type)}
                    disabled={action.disabled}
                    className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed ${action.type === "checkout" ? "bg-rose-600 hover:bg-rose-700" : "bg-indigo-600 hover:bg-indigo-700"
                        }`}
                >
                    {busy ? <Loader2 size={14} className="animate-spin" /> : action.type === "checkout" ? <LogOut size={14} /> : <LogIn size={14} />}
                    {action.label}
                </button>
                <button
                    type="button"
                    onClick={onView}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                    View
                </button>
            </div>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* MAIN PAGE                                                                  */
/* -------------------------------------------------------------------------- */

export default function DashboardPage() {
    const router = useRouter();
    const { user: authUser } = useAuth();
    const authRef = useRef(authUser);
    authRef.current = authUser;

    const role = normalizeRole(authUser?.role);
    const userId = authUser?._id ? String(authUser._id) : "";
    const userName = authUser?.name || "";
    const canPunch = PUNCH_ROLES.includes(role);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");
    const [dash, setDash] = useState(null);
    const [taskTab, setTaskTab] = useState("all");
    const [energy, setEnergy] = useState("Available");
    const [now, setNow] = useState(() => Date.now());
    const inFlight = useRef(false);
    const refetchRef = useRef(() => { });

    /* popups: all tasks, holiday calendar, daily update / submit */
    const [tasksOpen, setTasksOpen] = useState(false);
    const [holidaysOpen, setHolidaysOpen] = useState(false);
    const [modalTab, setModalTab] = useState("all");
    const [taskModal, setTaskModal] = useState(null); // { task, mode: "progress" | "submit" }
    const [modalProgress, setModalProgress] = useState(0);
    const [modalNote, setModalNote] = useState("");
    const [modalLink, setModalLink] = useState("");
    const [modalBusy, setModalBusy] = useState(false);

    const att = useMyAttendance({
        userId,
        userName,
        onChanged: () => refetchRef.current(),
    });

    /* Energy level is remembered in this browser only */
    useEffect(() => {
        if (!userId) return;
        try {
            const saved = localStorage.getItem(`hrms_energy_${userId}`);
            if (saved) setEnergy(saved);
        } catch { }
    }, [userId]);

    const changeEnergy = (value) => {
        setEnergy(value);
        try {
            localStorage.setItem(`hrms_energy_${userId}`, value);
        } catch { }
    };

    /* Live work duration */
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 30 * 1000);
        return () => clearInterval(timer);
    }, []);

    const openTasks = () => {
        setModalTab("all");
        setTasksOpen(true);
    };

    const openTaskModal = (task, mode) => {
        const today = toYMD(new Date());
        const todays = Array.isArray(task.updates) ? task.updates.find((u) => u.date === today) : null;
        setTaskModal({ task, mode });
        setModalProgress(taskProgress(task));
        setModalNote(mode === "progress" ? todays?.note || "" : "");
        setModalLink("");
    };

    const saveTaskModal = async () => {
        if (!taskModal) return;
        if (modalNote.trim().length < 3) {
            toast.error("Please write a short note.");
            return;
        }
        const { task, mode } = taskModal;
        const id = task._id || task.id;
        setModalBusy(true);
        try {
            if (mode === "progress") {
                await api.post(`/tasks/${id}/progress`, { progress: modalProgress, note: modalNote.trim() });
                toast.success("Today's update saved.");
            } else {
                await api.put(`/tasks/${id}/submit`, { note: modalNote.trim(), link: modalLink.trim() });
                toast.success("Task submitted for review.");
            }
            setTaskModal(null);
            refetchRef.current();
        } catch (err) {
            toast.error(err?.response?.data?.message || "Could not save. Please try again.");
        } finally {
            setModalBusy(false);
        }
    };

    const reviewTask = async (task, action) => {
        let comment = "";
        if (action === "rework") {
            comment = window.prompt("What should the employee fix?") || "";
            if (comment.trim().length < 3) return;
        }
        try {
            await api.put(`/tasks/${task._id || task.id}/review`, { action, comment });
            toast.success(action === "approve" ? "Task approved." : "Sent back for rework.");
            refetchRef.current();
        } catch (err) {
            toast.error(err?.response?.data?.message || "Review failed.");
        }
    };

    const fetchData = useCallback(async (manual = false, silent = false) => {
        const me = authRef.current;
        if (!me || inFlight.current) return;
        inFlight.current = true;
        if (manual) setRefreshing(true);

        try {
            const myRole = normalizeRole(me.role);
            const isAdminView = myRole === "admin" || myRole === "hr";
            const isManagerView = myRole === "manager";
            const isEmployeeView = myRole === "employee";
            const myUserId = String(me._id || "");

            /* 1. Profile (employee details). Admin may not have one. */
            let profile = { ...me };
            let myEmployeeId = "";
            try {
                const r = await api.get("/employees/me");
                const p = r?.data;
                if (p && p.hasEmployeeProfile !== false && p._id) {
                    profile = { ...me, ...p, role: me.role };
                    myEmployeeId = String(p._id);
                }
            } catch { }

            /* 2. Fetch only what this role needs */
            const days = isEmployeeView ? [] : getLastNDays(7);
            const safe = (p) => p.catch(() => ({ data: [] }));
            const empty = Promise.resolve({ data: [] });

            const [empRes, leaveRes, deptRes, orgDeptRes, desigRes, posRes, payRes, taskRes, holRes, shiftRes, ...attRes] =
                await Promise.all([
                    isEmployeeView ? empty : safe(api.get("/employees")),
                    safe(api.get("/leave")),
                    safe(api.get("/departments")),
                    safe(api.get("/organization/departments?status=active")),
                    safe(api.get("/organization/designations?status=active")),
                    isAdminView ? safe(api.get("/recruitment/positions")) : empty,
                    isAdminView || isEmployeeView
                        ? safe(api.get("/payroll", myEmployeeId ? { params: { employee: myEmployeeId, employeeId: myEmployeeId } } : undefined))
                        : empty,
                    safe(api.get("/tasks")),
                    isEmployeeView ? safe(api.get("/holiday")) : empty,
                    safe(api.get("/shifts/today")),
                    ...days.map((d) => safe(api.get(`/attendance?date=${toYMD(d)}`))),
                ]);

            const deptMap = { ...buildMap(toList(deptRes)), ...buildMap(toList(orgDeptRes)) };
            const desigMap = buildMap(toList(desigRes));
            const allEmployees = toList(empRes);

            /* 3. Decide whose data is visible.
               Attendance and leave records point to the login account (User), payroll points to the employee profile,
               so a record is matched by id, by the email of the populated employee, or by name (tasks). */
            const myScope = {
                ids: new Set([myUserId, myEmployeeId].filter(Boolean)),
                emails: norm([me.email, profile.email, profile.loginEmail]),
                names: norm([me.name, profile.name, `${profile.firstName || ""} ${profile.lastName || ""}`]),
            };

            let scope = null; // null = everyone
            let scopedEmployees = allEmployees;

            if (isEmployeeView) {
                scope = myScope;
                scopedEmployees = [profile];
            } else if (isManagerView) {
                const myName = lower(getName(profile));
                const myDept = lower(idOf(profile.department));
                const team = allEmployees.filter((e) => {
                    if (myEmployeeId && idOf(e) === myEmployeeId) return false;
                    const reportsToMe = e.reportingManager && lower(e.reportingManager) === myName;
                    const sameDept = myDept && lower(idOf(e.department)) === myDept;
                    return reportsToMe || sameDept;
                });
                scopedEmployees = team;
                scope = {
                    ids: new Set(team.map((e) => idOf(e)).filter(Boolean)),
                    emails: norm(team.flatMap((e) => [e.email, e.loginEmail])),
                    names: norm(team.map((e) => e.name || `${e.firstName || ""} ${e.lastName || ""}`)),
                };
                // a team member can be matched through the linked login account too
                team.forEach((e) => {
                    const u = idOf(e.user);
                    if (u) scope.ids.add(u);
                });
            }

            const inScope = (rec) => {
                if (!scope) return true;
                const e = rec?.employee ?? rec?.user ?? rec?.employeeId;
                const id = idOf(e);
                if (id && scope.ids.has(id)) return true;
                return Boolean(e && typeof e === "object" && scope.emails.has(lower(e.email)));
            };

            const todayYMD = toYMD(new Date());
            const thisYear = new Date().getFullYear();
            const thisMonth = new Date().getMonth() + 1;

            /* 4. Attendance trend (admin, HR, manager) */
            const perDay = days.map((d, i) => ({ date: d, records: toList(attRes[i]).filter(inScope) }));
            const trend = perDay.map(({ date, records }) => {
                const present = records.filter((r) => PRESENT_STATUSES.includes(lower(r.status))).length;
                const absent = records.filter((r) => lower(r.status) === "absent").length;
                const day = date.toLocaleDateString("en-US", { weekday: "short" });
                const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                return { date: dateStr, day, label: `${day}, ${dateStr}`, present, absent };
            });

            const activeEmployees = scopedEmployees.filter(
                (e) => !["inactive", "exited", "exit"].includes(lower(e.status || e.employeeStatus))
            );
            const presentToday = trend[trend.length - 1]?.present || 0;
            const attendancePct =
                activeEmployees.length > 0 ? ((presentToday / activeEmployees.length) * 100).toFixed(1) : "0.0";

            /* 5. Leaves */
            const leaves = toList(leaveRes).filter(inScope);
            const pending = leaves.filter((l) => lower(l.status) === "pending");
            const approved = leaves.filter((l) => lower(l.status) === "approved");
            const approvedToday = approved.filter((l) => leaveCoversDay(l, todayYMD));
            const thisYearLeave = (l) => {
                const { start } = leaveRange(l);
                return Number.isNaN(start.getTime()) || start.getFullYear() === thisYear;
            };

            const byType = {};
            leaves
                .filter((l) => !INACTIVE_LEAVE.includes(lower(l.status)) && thisYearLeave(l))
                .forEach((l) => {
                    const key = `${titleCase(l.leaveType || "Other")} Leave`;
                    byType[key] = (byType[key] || 0) + (Number(l.totalDays) || 1);
                });
            const leaveDistribution = Object.entries(byType).map(([name, value], i) => ({
                name,
                value,
                color: LEAVE_COLORS[i % LEAVE_COLORS.length],
            }));

            const leaveUsed = approved
                .filter((l) => lower(l.leaveType) !== "unpaid" && thisYearLeave(l))
                .reduce((sum, l) => sum + (Number(l.totalDays) || 1), 0);

            const recentLeaves = [...leaves]
                .sort((a, b) => new Date(b.createdAt || b.startDate || 0) - new Date(a.createdAt || a.startDate || 0))
                .slice(0, 6);

            /* 6. Role specific blocks */
            const groupData = isAdminView
                ? groupCount(scopedEmployees, (e) => labelOf(e.department, deptMap) || "General Division")
                : isManagerView
                    ? groupCount(scopedEmployees, (e) => labelOf(e.designation, desigMap) || "Not specified")
                    : [];

            /* Payroll */
            const payrolls = toList(payRes).map(normalizePayslip);
            let payslip = null;
            let payrollSummary = null;

            if (isEmployeeView) {
                payslip =
                    payrolls
                        .filter((p) => inScope(p) && lower(p.status) !== "draft")
                        .sort((a, b) => b.yearNo * 12 + b.monthNo - (a.yearNo * 12 + a.monthNo))[0] || null;
            }
            if (isAdminView) {
                // this month, or the latest month that has payroll, so the card is never empty by mistake
                const keyOf = (p) => p.yearNo * 12 + p.monthNo;
                const currentKey = thisYear * 12 + thisMonth;
                const latestKey = payrolls.reduce((max, p) => Math.max(max, keyOf(p)), 0);
                const targetKey = payrolls.some((p) => keyOf(p) === currentKey) ? currentKey : latestKey;
                const month = payrolls.filter((p) => keyOf(p) === targetKey && targetKey > 0);
                const targetMonth = targetKey % 12 === 0 ? 12 : targetKey % 12;
                const targetYear = targetKey % 12 === 0 ? targetKey / 12 - 1 : Math.floor(targetKey / 12);
                payrollSummary = {
                    label: targetKey > 0 ? monthLabel(targetMonth, targetYear) : monthLabel(thisMonth, thisYear),
                    count: month.length,
                    paid: month.filter((p) => lower(p.status) === "paid").length,
                    processed: month.filter((p) => ["processed", "generated", "approved"].includes(lower(p.status))).length,
                    draft: month.filter((p) => lower(p.status) === "draft").length,
                    totalNet: month.reduce((sum, p) => sum + p.net, 0),
                };
            }

            /* Tasks */
            const rawTasks = toList(taskRes);
            let tasks = [];
            let teamTasks = null;

            if (isEmployeeView) {
                tasks = rawTasks.filter((t) => taskMatches(t, myScope)).sort(byNewest);
                if (rawTasks.length > 0 && tasks.length === 0) {
                    console.warn(
                        "[Dashboard] /tasks returned records but none matched this user. Sample task:",
                        rawTasks[0],
                        "my ids:",
                        [...myScope.ids]
                    );
                }
            } else {
                // manager: tasks given to the team or created by me. admin and HR: all tasks
                const mine = isManagerView
                    ? rawTasks.filter(
                        (t) =>
                            collectRefs(t, ASSIGNEE_KEYS).some((r) => refMatches(r, scope)) ||
                            collectRefs(t, CREATOR_KEYS).some((r) => refMatches(r, myScope))
                    )
                    : rawTasks;
                const sorted = [...mine].sort(byNewest);
                const done = sorted.filter(isTaskDone).length;
                teamTasks = {
                    total: sorted.length,
                    done,
                    open: sorted.filter((t) => !isTaskDone(t) && !isTaskCancelled(t)).length,
                    list: sorted.slice(0, 6),
                    all: sorted,
                };
            }

            /* Holidays (employee dashboard): the full list for the calendar popup, and today's holidays */
            const holidays = toList(holRes)
                .map((h) => ({
                    _id: h._id || h.id,
                    title: h.title || h.name || h.holiday || "Holiday",
                    key: dateKey(h.date || h.startDate || h.holidayDate),
                    type: h.type,
                    optional: Boolean(h.optional),
                    description: h.description,
                }))
                .filter((h) => h.key)
                .sort((a, b) => a.key.localeCompare(b.key));
            const holidaysToday = holidays.filter((h) => h.key === todayYMD).map((h) => h.title);

            /* Today's shift, holiday and weekly off from the backend */
            const todayInfo = shiftRes?.data && !Array.isArray(shiftRes.data) && shiftRes.data.status ? shiftRes.data : null;

            setDash({
                role: myRole,
                me: profile,
                profileInfo: {
                    employeeId: profile.employeeId,
                    designation: labelOf(profile.designation, desigMap),
                    department: labelOf(profile.department, deptMap),
                    employmentType: profile.employmentType,
                    manager: profile.reportingManager,
                    joined: profile.dateOfJoining,
                },
                hasProfile: Boolean(myEmployeeId),
                totalCount: scopedEmployees.length,
                activeCount: activeEmployees.length,
                presentToday,
                attendancePct,
                onLeaveToday: approvedToday.length,
                openPositions: toList(posRes).filter((p) => lower(p.status) === "open").length,
                pending,
                trend,
                leaveDistribution,
                groupData,
                recentLeaves,
                leaveUsed,
                payslip,
                payrollSummary,
                tasks,
                teamTasks,
                holidays,
                holidaysToday,
                today: todayInfo,
                leaveToday: approvedToday.length > 0,
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

    refetchRef.current = () => fetchData(false, true);

    /* Load on mount, refresh every minute and whenever the tab becomes visible again */
    useEffect(() => {
        if (!userId) return;
        fetchData();
        const onVisible = () => {
            if (document.visibilityState === "visible") {
                fetchData(false, true);
                att.refresh();
            }
        };
        const interval = setInterval(() => fetchData(false, true), REFRESH_INTERVAL);
        document.addEventListener("visibilitychange", onVisible);
        return () => {
            clearInterval(interval);
            document.removeEventListener("visibilitychange", onVisible);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, fetchData]);

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

    const isAdminView = dash.role === "admin" || dash.role === "hr";
    const isManagerView = dash.role === "manager";
    const isEmployeeView = dash.role === "employee";
    const firstName = getName(dash.me).split(" ")[0];
    const totalLeaveDays = dash.leaveDistribution.reduce((sum, i) => sum + i.value, 0);
    const todayYMD = toYMD(new Date());

    /* ====================================================================== */
    /* EMPLOYEE DASHBOARD                                                     */
    /* ====================================================================== */

    if (isEmployeeView) {
        const tasks = dash.tasks;
        const doneCount = tasks.filter(isTaskDone).length;
        const pendingCount = tasks.filter((t) => !isTaskDone(t) && !isTaskCancelled(t)).length;

        const visibleTasks = filterTasks(tasks, taskTab, todayYMD);
        const modalTasks = filterTasks(tasks, modalTab, todayYMD);

        const leaveLeft = Math.max(0, ANNUAL_LEAVE_QUOTA - dash.leaveUsed);
        const leavePct = Math.min(100, (dash.leaveUsed / ANNUAL_LEAVE_QUOTA) * 100);

        /* Shift, holiday and weekly off (from /shifts/today) */
        const info = dash.today;
        const shift = info?.shift || null;
        const dayStatus = info?.status || "";
        const goalMs = (info?.goalMinutes || DEFAULT_WORK_HOURS * 60) * 60000;
        const holiday = info?.holiday || null;
        const holidayTitles = holiday ? [holiday.title || holiday.name || "Holiday"] : dash.holidaysToday;
        const isHolidayToday = holidayTitles.length > 0 && !(holiday?.optional);
        const heroShiftName = shift ? shift.name : dayStatus === "weekly_off" ? "Weekly Off" : isHolidayToday ? "Holiday" : "";
        const shiftValue = shift ? `${shift.name} · ${shift.timeLabel}` : dayStatus === "weekly_off" ? "Weekly Off" : "";

        /* Late by (display only, the real late status is saved by the attendance API) */
        let lateBy = 0;
        if (att.today.hasIn && shift && !shift.isNightShift) {
            const [sh, sm] = String(shift.startTime).split(":").map(Number);
            const inMin = att.today.firstIn.getHours() * 60 + att.today.firstIn.getMinutes();
            lateBy = Math.max(0, inMin - (sh * 60 + sm));
        }

        const attendanceValue = !att.today.loaded
            ? "..."
            : att.today.hasIn
                ? "Present"
                : dash.leaveToday
                    ? "On Leave"
                    : isHolidayToday
                        ? "Holiday"
                        : dayStatus === "weekly_off"
                            ? "Weekly Off"
                            : "Not Marked";
        const attendanceSub = att.today.hasIn
            ? (att.today.hasOut
                ? `In ${formatTime(att.today.firstIn)} · Out ${formatTime(att.today.lastOut)}`
                : `Checked in at ${formatTime(att.today.firstIn)}`) + (lateBy > 0 ? ` · Late ${lateBy}m` : "")
            : attendanceValue === "Holiday" || attendanceValue === "Weekly Off"
                ? "No punch required today"
                : "Punch in to mark attendance";

        const schedule = [];
        holidayTitles.forEach((h) =>
            schedule.push({
                title: h,
                sub: holiday?.optional ? "Optional holiday" : "Holiday today",
                tone: "bg-amber-50 text-amber-700",
            })
        );
        if (dayStatus === "weekly_off" && !isHolidayToday) {
            schedule.push({ title: "Weekly off", sub: "Enjoy your day off", tone: "bg-slate-100 text-slate-700" });
        }
        if (shift && dayStatus === "working") {
            schedule.push({
                title: `${shift.name} Shift`,
                sub: `${shift.timeLabel} · ${shift.durationLabel}`,
                tone: "bg-blue-50 text-blue-700",
            });
        }
        if (dash.leaveToday) schedule.push({ title: "On approved leave", sub: "Leave today", tone: "bg-violet-50 text-violet-700" });
        if (att.today.hasIn) schedule.push({ title: "Punched in", sub: formatTime(att.today.firstIn), tone: "bg-emerald-50 text-emerald-700" });
        if (att.today.hasOut) schedule.push({ title: "Punched out", sub: formatTime(att.today.lastOut), tone: "bg-rose-50 text-rose-700" });

        const workplace = [
            ["Designation", dash.profileInfo.designation],
            ["Department", dash.profileInfo.department],
            ["Reporting Manager", dash.profileInfo.manager],
            ["Employee ID", dash.profileInfo.employeeId],
            ["Remaining Leave Days", `${leaveLeft} / ${ANNUAL_LEAVE_QUOTA}`],
            ["Shift", shiftValue],
            ["Joining Date", dash.profileInfo.joined ? formatDate(dash.profileInfo.joined) : ""],
            ["Today's Attendance Status", attendanceValue === "..." ? "" : attendanceValue + (lateBy > 0 ? ` (Late ${lateBy}m)` : "")],
            ["Time with Company", dash.profileInfo.joined ? getTenure(dash.profileInfo.joined) : ""],
        ];

        return (
            <div className="w-full max-w-8xl mx-auto px-3 sm:px-4 py-4 space-y-4 antialiased overflow-x-hidden">
                <EmployeeHero
                    name={getName(dash.me)}
                    roleLabel={ROLE_TEXT.employee.label}
                    avatar={dash.me.avatar}
                    att={att.today}
                    now={now}
                    busy={att.busy}
                    onPunch={att.punch}
                    energy={energy}
                    setEnergy={changeEnergy}
                    shiftName={heroShiftName}
                    shiftTime={shift?.timeLabel}
                    goalMs={goalMs}
                    onViewAttendance={() => router.push(ROUTES.attendance)}
                />

                {error && (
                    <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-amber-800">
                        <AlertCircle size={15} className="shrink-0 mt-0.5" />
                        <p className="text-xs font-semibold">{error}</p>
                    </div>
                )}

                {!dash.hasProfile && (
                    <div className="flex items-start gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2.5 text-indigo-800">
                        <AlertCircle size={15} className="shrink-0 mt-0.5" />
                        <p className="text-xs font-semibold">
                            Your employee profile is not linked yet, so some details are empty. Please contact HR.
                        </p>
                    </div>
                )}

                {/* Four cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 flex flex-col">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                                <ListChecks size={18} />
                            </div>
                            <div>
                                <p className="text-xl font-extrabold text-slate-900 leading-tight">{tasks.length}</p>
                                <p className="text-[11px] text-slate-500">Total Tasks</p>
                            </div>
                        </div>
                        <div className="mt-auto pt-4">
                            <div className="border-t border-dashed border-slate-200 pt-3 flex items-center justify-between text-[11px]">
                                <span className="text-emerald-600 font-medium">{doneCount} Completed</span>
                                <span className="text-slate-500 font-medium">{pendingCount} Pending</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 flex flex-col">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                                <CalendarCheck size={18} />
                            </div>
                            <div className="min-w-0">
                                <p
                                    className={`text-xl font-extrabold leading-tight truncate ${att.today.hasIn ? "text-emerald-600" : "text-slate-800"
                                        }`}
                                >
                                    {attendanceValue}
                                </p>
                                <p className="text-[11px] text-slate-500">Attendance</p>
                            </div>
                        </div>
                        <div className="mt-auto pt-4">
                            <div className="border-t border-dashed border-slate-200 pt-3 text-[11px] text-slate-500 font-medium truncate">
                                {attendanceSub}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 flex flex-col">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                                <Clock size={18} />
                            </div>
                            <div>
                                <p className="text-xl font-extrabold text-slate-900 leading-tight">
                                    {leaveLeft} / {ANNUAL_LEAVE_QUOTA}
                                </p>
                                <p className="text-[11px] text-slate-500">Leave Days Remaining</p>
                            </div>
                        </div>
                        <div className="mt-auto pt-4 space-y-2">
                            <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                                <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${leavePct}%` }} />
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                                <span>{dash.leaveUsed} Days Used</span>
                                <span>{leaveLeft} Days Left</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 flex flex-col">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                                <Hourglass size={18} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xl font-extrabold text-slate-900 leading-tight">Work Shift</p>
                                <p className="text-[11px] text-slate-500 truncate">{shiftValue || heroShiftName || "Not Assigned"}</p>
                            </div>
                        </div>
                        <div className="mt-auto pt-4">
                            <div className="border-t border-dashed border-slate-200 pt-3 text-[11px] text-slate-500 font-medium">
                                {shift ? `${shift.durationLabel} Duration` : "No shift duration"}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tasks, schedule and workplace */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
                    <div className="md:col-span-2 lg:col-span-6 min-w-0">
                        <WidgetCard
                            title="My Tasks"
                            right={<TaskTabs tab={taskTab} setTab={setTaskTab} />}
                            footer={<FooterLink label="View All Tasks" onClick={openTasks} />}
                        >
                            {visibleTasks.length === 0 ? (
                                <NoData text={tasks.length === 0 ? "No tasks assigned to you yet" : "No tasks in this tab"} />
                            ) : (
                                <ul className="divide-y divide-slate-100">
                                    {visibleTasks.slice(0, 6).map((t, i) => (
                                        <EmployeeTaskRow
                                            key={t._id || t.id || i}
                                            t={t}
                                            todayYMD={todayYMD}
                                            onProgress={(x) => openTaskModal(x, "progress")}
                                            onSubmit={(x) => openTaskModal(x, "submit")}
                                        />
                                    ))}
                                </ul>
                            )}
                        </WidgetCard>
                    </div>

                    <div className="lg:col-span-3 min-w-0">
                        <WidgetCard
                            title="Today's Schedule"
                            footer={<FooterLink label="View Full Calendar" onClick={() => setHolidaysOpen(true)} />}
                        >
                            {schedule.length === 0 ? (
                                <NoData text="No schedule for today" />
                            ) : (
                                <ul className="p-3 space-y-2">
                                    {schedule.map((s, i) => (
                                        <li key={i} className={`rounded-xl px-3 py-2.5 ${s.tone}`}>
                                            <p className="text-xs font-bold">{s.title}</p>
                                            <p className="text-[11px] opacity-80">{s.sub}</p>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </WidgetCard>
                    </div>

                    <div className="lg:col-span-3">
                        <WidgetCard title="My Workplace">
                            <ul>
                                {workplace.map(([label, value]) => (
                                    <li
                                        key={label}
                                        className="flex items-start justify-between gap-3 px-1.5 py-2.5 border-b border-slate-100 last:border-0 text-xs"
                                    >
                                        <span className="text-slate-400 shrink-0">{label}</span>
                                        <span className="font-bold text-slate-800 text-right break-words min-w-0">{value || "Not Assigned"}</span>
                                    </li>
                                ))}
                            </ul>
                        </WidgetCard>
                    </div>
                </div>

                {/* Leave and payroll */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <Panel
                        icon={CalendarCheck}
                        title="My Leave Requests"
                        subtitle={`${dash.pending.length} pending · ${dash.recentLeaves.length} recent requests`}
                        right={
                            <button
                                type="button"
                                onClick={() => router.push(ROUTES.leave)}
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
                                        onClick={() => router.push(ROUTES.leave)}
                                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
                                    >
                                        <Plus size={13} /> Apply for Leave
                                    </button>
                                }
                            />
                        ) : (
                            <div className="space-y-2.5">
                                {dash.recentLeaves.map((req) => (
                                    <div
                                        key={req._id || req.id}
                                        onClick={() => router.push(ROUTES.leave)}
                                        className="min-w-0 flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50/70 hover:bg-indigo-50/40 border border-slate-200/70 cursor-pointer transition"
                                    >
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-slate-900 truncate">{titleCase(req.leaveType || "Leave")} Leave</p>
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

                    <Panel
                        icon={Wallet}
                        title="Latest Payslip"
                        subtitle="Your most recent processed salary"
                        right={
                            <button
                                type="button"
                                onClick={() => router.push(ROUTES.payroll)}
                                className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-bold bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100 self-start"
                            >
                                <span>View All</span>
                                <ArrowUpRight size={12} />
                            </button>
                        }
                    >
                        {!dash.payslip ? (
                            <EmptyState icon={Wallet} tone="text-indigo-300" text="No payslip has been generated for you yet." />
                        ) : (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-xs text-slate-400">
                                            {dash.payslip.monthNo ? monthLabel(dash.payslip.monthNo, dash.payslip.yearNo) : "Latest payslip"}
                                        </p>
                                        <p className="text-2xl font-extrabold text-slate-900 font-mono truncate">{formatMoney(dash.payslip.net)}</p>
                                        <p className="text-[11px] text-slate-500">Net salary</p>
                                    </div>
                                    <span
                                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full border capitalize shrink-0 ${lower(dash.payslip.status) === "paid"
                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                            : "bg-amber-50 text-amber-700 border-amber-200"
                                            }`}
                                    >
                                        {dash.payslip.status || "processed"}
                                    </span>
                                </div>
                                <div className="rounded-xl bg-slate-50/70 border border-slate-200/70 px-3">
                                    <InfoRow label="Gross salary" value={formatMoney(dash.payslip.gross)} />
                                    <InfoRow label="Deductions" value={formatMoney(dash.payslip.deductions)} />
                                    <InfoRow label="Days present" value={dash.payslip.present} />
                                    <InfoRow label="Days on leave" value={dash.payslip.onLeave} />
                                </div>
                            </div>
                        )}
                    </Panel>
                </div>

                {/* Popups */}
                {tasksOpen && (
                    <ListModal
                        title="All Tasks"
                        subtitle={`${tasks.length} total · ${doneCount} completed · ${pendingCount} pending`}
                        tabs={<TaskTabs tab={modalTab} setTab={setModalTab} />}
                        onClose={() => setTasksOpen(false)}
                    >
                        {modalTasks.length === 0 ? (
                            <NoData text={tasks.length === 0 ? "No tasks assigned to you yet" : "No tasks in this tab"} />
                        ) : (
                            <ul className="divide-y divide-slate-100">
                                {modalTasks.map((t, i) => (
                                    <EmployeeTaskRow
                                        key={t._id || t.id || i}
                                        t={t}
                                        todayYMD={todayYMD}
                                        onProgress={(x) => openTaskModal(x, "progress")}
                                        onSubmit={(x) => openTaskModal(x, "submit")}
                                    />
                                ))}
                            </ul>
                        )}
                    </ListModal>
                )}

                {holidaysOpen && (
                    <ListModal
                        title="Holiday Calendar"
                        subtitle={`${new Date().getFullYear()} · ${dash.holidays.length} holidays`}
                        onClose={() => setHolidaysOpen(false)}
                    >
                        <HolidayList holidays={dash.holidays} todayYMD={todayYMD} />
                    </ListModal>
                )}

                <TaskActionModal
                    state={taskModal}
                    progress={modalProgress}
                    setProgress={setModalProgress}
                    note={modalNote}
                    setNote={setModalNote}
                    link={modalLink}
                    setLink={setModalLink}
                    busy={modalBusy}
                    onClose={() => setTaskModal(null)}
                    onSave={saveTaskModal}
                />
            </div>
        );
    }

    /* ====================================================================== */
    /* ADMIN, HR AND MANAGER DASHBOARD                                        */
    /* ====================================================================== */

    const cards = isAdminView
        ? [
            { label: "Workforce", value: dash.totalCount.toLocaleString(), sub: `${dash.activeCount} active employees`, icon: Users, tone: "indigo", href: ROUTES.employees },
            { label: "Turnout", value: dash.presentToday.toLocaleString(), sub: `${dash.attendancePct}% attendance today`, icon: CheckCircle2, tone: "emerald", href: ROUTES.attendance },
            { label: "Requests", value: dash.pending.length, sub: "Awaiting review", icon: Calendar, tone: "amber", href: ROUTES.leave },
            { label: "Hiring", value: dash.openPositions, sub: "Open positions", icon: Briefcase, tone: "cyan", href: ROUTES.recruitment },
        ]
        : [
            { label: "My Team", value: dash.totalCount, sub: `${dash.activeCount} active members`, icon: Users, tone: "indigo", href: null },
            { label: "Team Present", value: dash.presentToday, sub: `${dash.attendancePct}% attendance today`, icon: CheckCircle2, tone: "emerald", href: ROUTES.attendance },
            { label: "Team Requests", value: dash.pending.length, sub: "Awaiting your review", icon: Calendar, tone: "amber", href: ROUTES.leave },
            { label: "On Leave Today", value: dash.onLeaveToday, sub: "Approved leaves", icon: CalendarCheck, tone: "violet", href: ROUTES.leave },
        ];

    const leavePanelTitle = isAdminView ? "Leave Category Distribution" : "Team Leave Distribution";
    const tt = dash.teamTasks;
    const teamModalTasks = tt ? filterTasks(tt.all, modalTab, todayYMD) : [];

    return (
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 py-4 space-y-4 antialiased overflow-x-hidden">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{ROLE_TEXT[dash.role].title}</h1>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                            <Sparkles size={11} className="text-indigo-600 shrink-0" />
                            {ROLE_TEXT[dash.role].badge} View
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
                        onClick={() => {
                            fetchData(true);
                            att.refresh();
                        }}
                        disabled={refreshing}
                        className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2.5 sm:py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold transition disabled:opacity-60"
                        title="Sync latest records"
                    >
                        <RefreshCw size={12} className={refreshing ? "animate-spin text-indigo-600" : ""} />
                        <span>{refreshing ? "Syncing..." : "Sync"}</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleExportAttendance}
                        className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 sm:py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition shadow-sm"
                    >
                        <Download size={12} />
                        <span>Export CSV</span>
                    </button>
                </div>
            </div>

            {error && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-amber-800">
                    <AlertCircle size={15} className="shrink-0 mt-0.5" />
                    <p className="text-xs font-semibold">{error}</p>
                </div>
            )}

            {/* My own attendance (admin, HR and managers are also employees of the company) */}
            {canPunch && (
                <PunchBar att={att.today} busy={att.busy} onPunch={att.punch} onView={() => router.push(ROUTES.attendance)} />
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

            {/* Attendance trend */}
            <Panel
                icon={TrendingUp}
                title={isManagerView ? "Team Attendance Trend" : "7-Day Attendance Overview"}
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

            {/* Leave distribution + department / team */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Panel
                    icon={PieChartIcon}
                    title={leavePanelTitle}
                    right={<span className="text-xs font-semibold text-slate-500">{totalLeaveDays} days total</span>}
                >
                    {dash.leaveDistribution.length === 0 ? (
                        <EmptyState text="No leave records found for this year." />
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

                <Panel
                    icon={Building2}
                    title={isManagerView ? "Team Composition" : "Department Headcount"}
                    right={
                        <span className="text-xs font-semibold text-slate-500">
                            {dash.totalCount} {isManagerView ? "team members" : "total staff"}
                        </span>
                    }
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
            </div>

            {/* Pending leave requests + payroll */}
            <div className={`grid grid-cols-1 gap-4 ${isAdminView ? "lg:grid-cols-3" : ""}`}>
                <div className={isAdminView ? "lg:col-span-2 min-w-0" : "min-w-0"}>
                    <Panel
                        title={isManagerView ? "Team Leave Requests" : "Pending Leave Requests"}
                        subtitle={`${dash.pending.length} applications awaiting review`}
                        right={
                            <button
                                type="button"
                                onClick={() => router.push(ROUTES.leave)}
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
                            <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 ${isAdminView ? "" : "lg:grid-cols-3"}`}>
                                {dash.pending.slice(0, 6).map((req) => {
                                    const employeeName = req.employee?.name || getName(req.employee) || "Unknown Employee";
                                    const departmentName = labelOf(req.employee?.department) || req.department || "General Team";
                                    return (
                                        <div
                                            key={req._id || req.id}
                                            onClick={() => router.push(ROUTES.leave)}
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
                </div>

                {isAdminView && dash.payrollSummary && (
                    <Panel
                        icon={Wallet}
                        title="Payroll"
                        subtitle={dash.payrollSummary.label}
                        right={
                            <button
                                type="button"
                                onClick={() => router.push(ROUTES.payroll)}
                                className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-bold bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100 self-start"
                            >
                                <span>Open</span>
                                <ArrowUpRight size={12} />
                            </button>
                        }
                    >
                        {dash.payrollSummary.count === 0 ? (
                            <EmptyState icon={Wallet} tone="text-indigo-300" text="No payroll has been generated yet." />
                        ) : (
                            <div className="space-y-3">
                                <div>
                                    <p className="text-2xl font-extrabold text-slate-900 font-mono truncate">{formatMoney(dash.payrollSummary.totalNet)}</p>
                                    <p className="text-[11px] text-slate-500">Total net salary · {dash.payrollSummary.count} payslips</p>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    {[
                                        ["Paid", dash.payrollSummary.paid, "bg-emerald-50 text-emerald-700"],
                                        ["Processed", dash.payrollSummary.processed, "bg-indigo-50 text-indigo-700"],
                                        ["Draft", dash.payrollSummary.draft, "bg-amber-50 text-amber-700"],
                                    ].map(([label, value, cls]) => (
                                        <div key={label} className={`rounded-xl py-2 ${cls}`}>
                                            <p className="text-base font-extrabold font-mono">{value}</p>
                                            <p className="text-[10px] font-bold uppercase">{label}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </Panel>
                )}
            </div>

            {/* Tasks assigned by the manager / all tasks for admin and HR */}
            {tt && (
                <Panel
                    icon={ListChecks}
                    title={isManagerView ? "Team Tasks" : "Task Overview"}
                    subtitle={`${tt.total} total · ${tt.open} open · ${tt.done} completed`}
                    right={
                        <button
                            type="button"
                            onClick={openTasks}
                            className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-bold bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100 self-start"
                        >
                            <span>View All</span>
                            <ArrowUpRight size={12} />
                        </button>
                    }
                >
                    {tt.list.length === 0 ? (
                        <EmptyState icon={ListChecks} tone="text-indigo-300" text="No tasks have been assigned yet." />
                    ) : (
                        <ul className="divide-y divide-slate-100">
                            {tt.list.map((t, i) => (
                                <TeamTaskRow key={t._id || t.id || i} t={t} onReview={reviewTask} />
                            ))}
                        </ul>
                    )}
                </Panel>
            )}

            {/* Popup: all tasks */}
            {tasksOpen && tt && (
                <ListModal
                    title={isManagerView ? "Team Tasks" : "All Tasks"}
                    subtitle={`${tt.total} total · ${tt.open} open · ${tt.done} completed`}
                    tabs={<TaskTabs tab={modalTab} setTab={setModalTab} />}
                    onClose={() => setTasksOpen(false)}
                >
                    {teamModalTasks.length === 0 ? (
                        <NoData text={tt.total === 0 ? "No tasks have been assigned yet" : "No tasks in this tab"} />
                    ) : (
                        <ul className="divide-y divide-slate-100 px-4 sm:px-5">
                            {teamModalTasks.map((t, i) => (
                                <TeamTaskRow key={t._id || t.id || i} t={t} onReview={reviewTask} />
                            ))}
                        </ul>
                    )}
                </ListModal>
            )}
        </div>
    );
}














// "use client";

// import { useEffect, useState, useCallback, useRef } from "react";
// import { useRouter } from "next/navigation";
// import {
//     Users,
//     CheckCircle2,
//     Calendar,
//     CalendarCheck,
//     Briefcase,
//     RefreshCw,
//     Download,
//     ArrowUpRight,
//     ArrowRight,
//     TrendingUp,
//     Loader2,
//     Clock,
//     Sparkles,
//     PieChart as PieChartIcon,
//     Building2,
//     AlertCircle,
//     UserCheck,
//     User,
//     Plus,
//     LogIn,
//     LogOut,
//     ListChecks,
//     Wallet,
//     Hourglass,
//     Target,
//     Zap,
//     Moon,
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
// import { toast } from "react-toastify";
// import api from "@/lib/api";
// import { useAuth } from "@/context/AuthContext";

// /* -------------------------------------------------------------------------- */
// /* SETTINGS (change these to match your company)                              */
// /* -------------------------------------------------------------------------- */

// // Must be the same as the office location on the Attendance page
// const OFFICE_LOCATION = {
//     name: "4paySave.",
//     address: "jamdoli, Jaipur",
//     lat: 26.890373334979436,
//     lng: 75.87398927116433,
//     allowedRadius: 100, // punch is allowed within this distance (meters)
//     nearRadius: 100, // inside this distance the office address is saved (meters)
// };

// const WORK_HOURS = 8; // length of one working day
// const ANNUAL_LEAVE_QUOTA = 15; // paid leave days per year
// const PUNCH_ROLES = ["employee", "manager", "hr", "admin"]; // roles that mark their own attendance

// const ROUTES = {
//     tasks: "/tasks",
//     calendar: "/holidays",
//     leave: "/leave/apply",
//     attendance: "/attendance",
//     payroll: "/payroll",
//     profile: "/profile",
//     recruitment: "/recruitment",
//     employees: "/employees",
// };

// /* -------------------------------------------------------------------------- */
// /* CONSTANTS & HELPERS                                                        */
// /* -------------------------------------------------------------------------- */

// const LEAVE_COLORS = ["#4f46e5", "#06b6d4", "#8b5cf6", "#f59e0b", "#ec4899", "#10b981"];
// const PRESENT_STATUSES = ["present", "late", "half-day", "half day"];
// const INACTIVE_LEAVE = ["rejected", "cancelled", "canceled"];
// const REFRESH_INTERVAL = 60 * 1000;

// const ENERGY_OPTIONS = [
//     { value: "Focused", icon: Target },
//     { value: "Busy", icon: Zap },
//     { value: "Available", icon: CheckCircle2 },
//     { value: "Away", icon: Moon },
// ];

// const TONES = {
//     indigo: { box: "bg-indigo-50 text-indigo-600 border-indigo-100", hover: "hover:border-indigo-300", sub: "text-slate-600" },
//     emerald: { box: "bg-emerald-50 text-emerald-600 border-emerald-100", hover: "hover:border-emerald-300", sub: "text-emerald-600" },
//     amber: { box: "bg-amber-50 text-amber-600 border-amber-100", hover: "hover:border-amber-300", sub: "text-amber-600" },
//     cyan: { box: "bg-cyan-50 text-cyan-600 border-cyan-100", hover: "hover:border-cyan-300", sub: "text-slate-600" },
//     violet: { box: "bg-violet-50 text-violet-600 border-violet-100", hover: "hover:border-violet-300", sub: "text-slate-600" },
// };

// const normalizeRole = (role) => {
//     const r = String(role || "").toLowerCase().trim();
//     if (r === "admin" || r === "super admin" || r === "superadmin") return "admin";
//     if (r === "hr" || r === "hr manager") return "hr";
//     if (r === "manager" || r === "team lead") return "manager";
//     return "employee";
// };

// const ROLE_TEXT = {
//     admin: { title: "Executive HR Dashboard", badge: "Admin", label: "Super Admin" },
//     hr: { title: "HR Dashboard", badge: "HR", label: "HR Manager" },
//     manager: { title: "Team Management Dashboard", badge: "Manager", label: "Manager" },
//     employee: { title: "My Dashboard", badge: "Employee", label: "Employee" },
// };

// const toList = (res) => {
//     const d = res?.data;
//     if (Array.isArray(d)) return d;
//     if (!d || typeof d !== "object") return [];
//     for (const key of [
//         "data", "employees", "leaves", "attendance", "records", "departments",
//         "designations", "positions", "payrolls", "payroll", "tasks", "holidays",
//     ]) {
//         if (Array.isArray(d[key])) return d[key];
//     }
//     return [];
// };

// const isMongoId = (str) => /^[0-9a-fA-F]{24}$/.test(String(str || ""));
// const lower = (v) => String(v || "").trim().toLowerCase();
// const titleCase = (s) => String(s || "").replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
// const pad2 = (n) => String(n).padStart(2, "0");

// const idOf = (v) => {
//     if (!v) return "";
//     if (typeof v === "object") return String(v._id || v.id || "");
//     return String(v);
// };

// const getName = (emp) =>
//     emp?.name || `${emp?.firstName || ""} ${emp?.lastName || ""}`.trim() || "Employee";

// const getInitials = (name) => {
//     if (!name) return "EM";
//     const parts = name.trim().split(" ").filter(Boolean);
//     return parts.length > 1
//         ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
//         : parts[0].slice(0, 2).toUpperCase();
// };

// /* Local date (YYYY-MM-DD). toISOString() gives the UTC date, which is wrong in India before 5:30 AM */
// const toYMD = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

// const getLastNDays = (n) => {
//     const dates = [];
//     for (let i = n - 1; i >= 0; i--) {
//         const d = new Date();
//         d.setDate(d.getDate() - i);
//         dates.push(d);
//     }
//     return dates;
// };

// const getTodayFormatted = () =>
//     new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

// const formatDate = (value) => {
//     const d = new Date(value);
//     return Number.isNaN(d.getTime())
//         ? "—"
//         : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
// };

// const formatTime = (value) => {
//     const d = new Date(value);
//     return Number.isNaN(d.getTime())
//         ? "—"
//         : d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
// };

// const formatDuration = (ms) => {
//     const total = Math.max(0, Math.floor(ms / 60000));
//     return `${pad2(Math.floor(total / 60))}h ${pad2(total % 60)}m`;
// };

// const formatMoney = (n) => `₹ ${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

// const monthLabel = (month, year) =>
//     new Date(year, (month || 1) - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });

// const getTenure = (value) => {
//     const d = new Date(value);
//     if (Number.isNaN(d.getTime())) return "";
//     const now = new Date();
//     let months = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
//     if (now.getDate() < d.getDate()) months -= 1;
//     if (months < 0) return "Joining soon";
//     const years = Math.floor(months / 12);
//     const rest = months % 12;
//     return [years && `${years} yr`, rest && `${rest} mo`].filter(Boolean).join(" ") || "Less than a month";
// };

// const buildMap = (list) => {
//     const map = {};
//     list.forEach((item) => {
//         const id = item?._id || item?.id;
//         const label = item?.name || item?.title || item?.label;
//         if (id && label) map[String(id)] = label;
//     });
//     return map;
// };

// const labelOf = (value, map = {}) => {
//     if (!value) return "";
//     if (typeof value === "object") return value.name || value.title || value.label || "";
//     const s = String(value);
//     if (map[s]) return map[s];
//     return isMongoId(s) ? "" : s;
// };

// const groupCount = (items, getLabel) => {
//     const counts = {};
//     items.forEach((item) => {
//         const label = getLabel(item);
//         counts[label] = (counts[label] || 0) + 1;
//     });
//     const max = Math.max(...Object.values(counts), 1);
//     return Object.entries(counts)
//         .sort((a, b) => b[1] - a[1])
//         .map(([name, count]) => ({ name, count, max }));
// };

// const leaveRange = (l) => {
//     const start = new Date(l.startDate || l.fromDate || l.createdAt);
//     const end = new Date(l.endDate || l.toDate || l.startDate || l.fromDate || l.createdAt);
//     return { start, end };
// };

// const leaveCoversDay = (l, ymd) => {
//     const { start, end } = leaveRange(l);
//     if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;
//     return toYMD(start) <= ymd && ymd <= toYMD(end);
// };

// const leaveStatusClass = (status) => {
//     const s = lower(status);
//     if (s === "approved") return "bg-emerald-50 text-emerald-700 border-emerald-200";
//     if (s === "rejected") return "bg-rose-50 text-rose-700 border-rose-200";
//     if (s === "pending") return "bg-amber-50 text-amber-700 border-amber-200";
//     return "bg-slate-100 text-slate-600 border-slate-200";
// };

// /* Tasks */
// const isTaskDone = (t) => /complete|done|closed/.test(lower(t?.status));
// const isTaskHigh = (t) => /high|urgent|critical/.test(lower(t?.priority));
// const taskDue = (t) => t?.dueDate || t?.deadline || t?.endDate || t?.date || null;

// /* -------------------------------------------------------------------------- */
// /* LOCATION (same rules as the Attendance page)                               */
// /* -------------------------------------------------------------------------- */

// const coordsLabel = (lat, lng) => `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`;

// const calculateDistance = (lat1, lon1, lat2, lon2) => {
//     const R = 6371e3;
//     const φ1 = (lat1 * Math.PI) / 180;
//     const φ2 = (lat2 * Math.PI) / 180;
//     const Δφ = ((lat2 - lat1) * Math.PI) / 180;
//     const Δλ = ((lon2 - lon1) * Math.PI) / 180;
//     const a =
//         Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
//         Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
//     return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
// };

// const getReadableAddress = async (lat, lng) => {
//     try {
//         const controller = new AbortController();
//         const timer = setTimeout(() => controller.abort(), 6000);
//         const res = await fetch(
//             `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=en`,
//             { signal: controller.signal }
//         );
//         clearTimeout(timer);
//         if (!res.ok) throw new Error(`Geocoding failed: ${res.status}`);
//         const data = await res.json();
//         const a = data.address || {};
//         const parts = [
//             ...new Set(
//                 [
//                     a.house_number,
//                     a.road,
//                     a.neighbourhood || a.suburb || a.residential,
//                     a.city_district,
//                     a.city || a.town || a.village,
//                 ].filter(Boolean)
//             ),
//         ];
//         if (parts.length >= 2) return parts.join(", ");
//         const base =
//             parts[0] || (data.display_name ? data.display_name.split(",").slice(0, 2).join(",").trim() : "");
//         return base ? `${base} (${coordsLabel(lat, lng)})` : coordsLabel(lat, lng);
//     } catch {
//         return coordsLabel(lat, lng);
//     }
// };

// const resolveLocationLabel = async (lat, lng, distance) =>
//     distance <= OFFICE_LOCATION.nearRadius
//         ? `${OFFICE_LOCATION.name}, ${OFFICE_LOCATION.address}`
//         : getReadableAddress(lat, lng);

// const getCurrentPosition = () =>
//     new Promise((resolve, reject) => {
//         navigator.geolocation.getCurrentPosition(resolve, reject, {
//             enableHighAccuracy: true,
//             timeout: 15000,
//         });
//     });

// /* -------------------------------------------------------------------------- */
// /* MY ATTENDANCE (one punch in and one punch out per day)                     */
// /* -------------------------------------------------------------------------- */

// function useMyAttendance({ userId, userName, onChanged }) {
//     const [today, setToday] = useState({ loaded: false, hasIn: false, hasOut: false, firstIn: null, lastOut: null });
//     const [busy, setBusy] = useState(false);
//     const lock = useRef(false);

//     const refresh = useCallback(async () => {
//         if (!userId) {
//             setToday((p) => ({ ...p, loaded: true }));
//             return null;
//         }
//         try {
//             const { data } = await api.get("/attendance", {
//                 params: { date: toYMD(new Date()), employeeId: userId },
//             });
//             const mine = toList({ data }).filter((r) => {
//                 const e = r?.employee ?? r?.user;
//                 if (idOf(e) === userId) return true;
//                 return Boolean(userName) && e && typeof e === "object" && lower(e.name) === lower(userName);
//             });
//             const toDates = (key) =>
//                 mine
//                     .map((r) => r[key])
//                     .filter(Boolean)
//                     .map((v) => new Date(v))
//                     .filter((d) => !Number.isNaN(d.getTime()))
//                     .sort((a, b) => a - b);
//             const ins = toDates("checkIn");
//             const outs = toDates("checkOut");
//             const status = {
//                 loaded: true,
//                 hasIn: ins.length > 0,
//                 hasOut: outs.length > 0,
//                 firstIn: ins[0] || null,
//                 lastOut: outs[outs.length - 1] || null,
//             };
//             setToday(status);
//             return status;
//         } catch (err) {
//             console.error("Attendance status error:", err);
//             setToday((p) => ({ ...p, loaded: true }));
//             return null;
//         }
//     }, [userId, userName]);

//     useEffect(() => {
//         refresh();
//     }, [refresh]);

//     const punch = useCallback(
//         async (type) => {
//             if (lock.current) return;
//             if (!userId) {
//                 toast.error("Your session has expired. Please log in again.");
//                 return;
//             }
//             if (typeof navigator === "undefined" || !navigator.geolocation) {
//                 toast.error("Location is not supported by your browser.");
//                 return;
//             }

//             const isIn = type === "checkin";
//             lock.current = true;
//             setBusy(true);

//             try {
//                 // 1. Check today's status on the server again, before doing anything
//                 const status = await refresh();
//                 if (!status) {
//                     toast.error("Unable to verify today's attendance. Please try again.");
//                     return;
//                 }
//                 if (isIn && status.hasIn) {
//                     toast.info("You have already punched in today. Only one punch in is allowed per day.");
//                     return;
//                 }
//                 if (!isIn && !status.hasIn) {
//                     toast.error("Please punch in first before punching out.");
//                     return;
//                 }
//                 if (!isIn && status.hasOut) {
//                     toast.info("You have already punched out today. Only one punch out is allowed per day.");
//                     return;
//                 }

//                 // 2. Location and geofence
//                 let position;
//                 try {
//                     position = await getCurrentPosition();
//                 } catch (geoError) {
//                     toast.error(
//                         geoError?.code === 1
//                             ? "Location access was denied. Please enable GPS and allow location access."
//                             : "Unable to get your location. Please check your GPS and try again."
//                     );
//                     return;
//                 }

//                 const lat = position.coords.latitude;
//                 const lng = position.coords.longitude;
//                 const distance = calculateDistance(lat, lng, OFFICE_LOCATION.lat, OFFICE_LOCATION.lng);

//                 if (distance > OFFICE_LOCATION.allowedRadius) {
//                     toast.error(
//                         `${isIn ? "Punch in" : "Punch out"} failed. You are outside the office area (${Math.round(distance)} m away).`
//                     );
//                     return;
//                 }

//                 const address = await resolveLocationLabel(lat, lng, distance);
//                 const coords = { lat, lng };

//                 // 3. Save
//                 if (isIn) {
//                     await api.post("/attendance/check-in", {
//                         employee: userId,
//                         name: userName,
//                         date: toYMD(new Date()),
//                         location: coords,
//                         inLocation: address,
//                         inCoordinates: coords,
//                     });
//                     toast.success("Punched in successfully!");
//                 } else {
//                     await api.put("/attendance/check-out", {
//                         employee: userId,
//                         date: toYMD(new Date()),
//                         location: coords,
//                         outLocation: address,
//                         outCoordinates: coords,
//                     });
//                     toast.success("Punched out successfully!");
//                 }

//                 await refresh();
//                 onChanged?.();
//             } catch (err) {
//                 toast.error(err?.response?.data?.message || (isIn ? "Punch in failed." : "Punch out failed."));
//                 refresh();
//             } finally {
//                 lock.current = false;
//                 setBusy(false);
//             }
//         },
//         [userId, userName, refresh, onChanged]
//     );

//     return { today, busy, punch, refresh };
// }

// const getPunchAction = (att, busy) => {
//     if (!att.loaded) return { label: "Checking...", type: null, disabled: true };
//     if (!att.hasIn) return { label: "Punch In", type: "checkin", disabled: busy };
//     if (!att.hasOut) return { label: "Punch Out", type: "checkout", disabled: busy };
//     return { label: "Day Completed", type: null, disabled: true };
// };

// /* -------------------------------------------------------------------------- */
// /* SMALL COMPONENTS                                                           */
// /* -------------------------------------------------------------------------- */

// const CustomAttendanceTooltip = ({ active, payload, label }) => {
//     if (!active || !payload?.length) return null;
//     return (
//         <div className="bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-xl shadow-2xl border border-slate-800 text-xs min-w-[140px]">
//             <p className="font-semibold text-slate-300 mb-2 border-b border-slate-800/80 pb-1.5 flex items-center justify-between">
//                 <span>{label}</span>
//                 <Clock size={12} className="text-slate-400 shrink-0" />
//             </p>
//             <div className="space-y-1.5 font-medium">
//                 <div className="flex items-center justify-between gap-3">
//                     <span className="flex items-center gap-1.5 text-indigo-300">
//                         <span className="w-2 h-2 rounded-full bg-indigo-500" /> Present:
//                     </span>
//                     <span className="font-bold font-mono">{payload[0]?.value ?? 0}</span>
//                 </div>
//                 <div className="flex items-center justify-between gap-3">
//                     <span className="flex items-center gap-1.5 text-rose-300">
//                         <span className="w-2 h-2 rounded-full bg-rose-500" /> Absent:
//                     </span>
//                     <span className="font-bold font-mono">{payload[1]?.value ?? 0}</span>
//                 </div>
//             </div>
//         </div>
//     );
// };

// function Panel({ icon: Icon, title, subtitle, right, children }) {
//     return (
//         <div className="min-w-0 bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm space-y-3">
//             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
//                 <div className="min-w-0">
//                     <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
//                         {Icon && <Icon size={15} className="text-indigo-600 shrink-0" />}
//                         <span className="truncate">{title}</span>
//                     </h2>
//                     {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
//                 </div>
//                 {right}
//             </div>
//             {children}
//         </div>
//     );
// }

// function EmptyState({ icon: Icon = AlertCircle, text, tone = "text-slate-300", action }) {
//     return (
//         <div className="py-10 text-center text-xs text-slate-400 space-y-2">
//             <Icon size={26} className={`mx-auto ${tone}`} />
//             <p className="font-medium text-slate-500">{text}</p>
//             {action}
//         </div>
//     );
// }

// function StatCard({ label, value, sub, icon: Icon, tone, onClick }) {
//     const t = TONES[tone] || TONES.indigo;
//     return (
//         <div
//             onClick={onClick}
//             className={`min-w-0 bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-sm transition-all duration-200 flex flex-col justify-between ${onClick ? `cursor-pointer ${t.hover} hover:shadow-md` : ""
//                 }`}
//         >
//             <div className="flex items-center justify-between gap-2">
//                 <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">{label}</span>
//                 <div className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center border ${t.box}`}>
//                     <Icon size={14} />
//                 </div>
//             </div>
//             <div className="mt-2 min-w-0">
//                 <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 font-mono truncate">{value}</h3>
//                 <p className={`text-[11px] font-medium truncate ${t.sub}`}>{sub}</p>
//             </div>
//         </div>
//     );
// }

// function InfoRow({ label, value }) {
//     return (
//         <div className="flex items-center justify-between gap-4 py-2.5 border-b border-slate-100 last:border-0 text-xs">
//             <span className="text-slate-400 shrink-0">{label}</span>
//             <span className="font-semibold text-slate-800 text-right truncate">{value || "—"}</span>
//         </div>
//     );
// }

// /* White card with a header and a footer link, used on the employee dashboard */
// function WidgetCard({ title, right, footer, children }) {
//     return (
//         <div className="min-w-0 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col">
//             <div className="flex items-center justify-between gap-2 px-4 sm:px-5 py-3.5 border-b border-slate-100">
//                 <h2 className="text-sm font-bold text-slate-900">{title}</h2>
//                 {right}
//             </div>
//             <div className="flex-1 min-h-[96px]">{children}</div>
//             {footer && <div className="border-t border-slate-100 px-4 py-3 text-center">{footer}</div>}
//         </div>
//     );
// }

// function FooterLink({ label, onClick }) {
//     return (
//         <button
//             type="button"
//             onClick={onClick}
//             className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
//         >
//             {label} <ArrowRight size={12} />
//         </button>
//     );
// }

// function NoData({ text = "No data found" }) {
//     return <p className="py-8 text-center text-xs text-slate-400 font-medium">{text}</p>;
// }

// /* Round progress with the work time in the middle */
// function WorkRing({ ms, goalMs }) {
//     const size = 128;
//     const r = 56;
//     const c = 2 * Math.PI * r;
//     const progress = Math.min(1, goalMs > 0 ? ms / goalMs : 0);
//     const angle = progress * 2 * Math.PI - Math.PI / 2;
//     const dotX = size / 2 + r * Math.cos(angle);
//     const dotY = size / 2 + r * Math.sin(angle);

//     return (
//         <div className="relative w-32 h-32 sm:w-36 sm:h-36 shrink-0">
//             <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
//                 <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="8" />
//                 <circle
//                     cx={size / 2}
//                     cy={size / 2}
//                     r={r}
//                     fill="none"
//                     stroke="#ffffff"
//                     strokeWidth="8"
//                     strokeLinecap="round"
//                     strokeDasharray={c}
//                     strokeDashoffset={c * (1 - progress)}
//                     className="transition-all duration-700"
//                 />
//             </svg>
//             {/* the dot sits on the end of the progress line (the svg is rotated, so it is drawn on top, unrotated) */}
//             <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 w-full h-full pointer-events-none">
//                 <circle cx={dotX} cy={dotY} r="5" fill="#ffffff" />
//             </svg>
//             <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-3">
//                 <span className="text-[9px] sm:text-[10px] font-semibold text-white/80 leading-tight">Today&apos;s Work Duration</span>
//                 <span className="text-lg sm:text-xl font-extrabold font-mono text-white leading-tight mt-0.5">{formatDuration(ms)}</span>
//                 <span className="text-[9px] sm:text-[10px] font-medium text-white/70 mt-0.5">
//                     of {pad2(Math.round(goalMs / 3600000))}h 00m
//                 </span>
//             </div>
//         </div>
//     );
// }

// /* Top banner of the employee dashboard */
// function EmployeeHero({ name, roleLabel, avatar, att, now, busy, onPunch, energy, setEnergy, shiftName, onViewAttendance }) {
//     const action = getPunchAction(att, busy);
//     const goalMs = WORK_HOURS * 3600000;
//     const workMs = !att.hasIn
//         ? 0
//         : Math.max(0, (att.hasOut ? att.lastOut.getTime() : now) - att.firstIn.getTime());

//     const punchStyle =
//         action.type === "checkout"
//             ? "bg-rose-500 hover:bg-rose-600 text-white"
//             : action.type === "checkin"
//                 ? "bg-emerald-500 hover:bg-emerald-600 text-white"
//                 : "bg-white/15 text-white/80 cursor-not-allowed";

//     return (
//         <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-900 text-white p-4 sm:p-6 shadow-sm">
//             <div className="pointer-events-none absolute -right-16 -top-20 w-72 h-72 rounded-full bg-white/5" aria-hidden="true" />
//             <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-4 items-center">
//                 {/* Profile and energy level */}
//                 <div className="lg:col-span-5 min-w-0 space-y-4">
//                     <div className="flex items-center gap-3">
//                         <div className="relative shrink-0">
//                             {avatar ? (
//                                 <img src={avatar} alt="" className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border-2 border-white/40" />
//                             ) : (
//                                 <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-emerald-600 border-2 border-white/40 flex items-center justify-center">
//                                     <User size={22} />
//                                 </div>
//                             )}
//                             <span className="absolute -right-0.5 -bottom-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-indigo-700" />
//                         </div>
//                         <div className="min-w-0">
//                             <p className="text-base sm:text-lg font-bold truncate">{name}</p>
//                             <p className="text-xs text-white/80">{roleLabel}</p>
//                             <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-white/15 text-[10px] font-semibold">Online</span>
//                         </div>
//                     </div>

//                     <div>
//                         <p className="text-xs font-medium text-white/80 mb-2">How is your energy level today?</p>
//                         <div className="flex flex-wrap gap-2">
//                             {ENERGY_OPTIONS.map(({ value, icon: Icon }) => (
//                                 <button
//                                     key={value}
//                                     type="button"
//                                     onClick={() => setEnergy(value)}
//                                     className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition ${energy === value
//                                         ? "bg-white text-indigo-700 border-white"
//                                         : "bg-white/10 text-white border-white/25 hover:bg-white/20"
//                                         }`}
//                                 >
//                                     <Icon size={12} />
//                                     {value}
//                                 </button>
//                             ))}
//                         </div>
//                     </div>
//                 </div>

//                 {/* Work duration */}
//                 <div className="lg:col-span-3 flex justify-center">
//                     <WorkRing ms={workMs} goalMs={goalMs} />
//                 </div>

//                 {/* Shift, check in time and buttons */}
//                 <div className="lg:col-span-4 min-w-0 space-y-4 lg:flex lg:flex-col lg:items-end">
//                     <div className="flex items-center gap-6 sm:gap-8">
//                         <div>
//                             <p className="flex items-center gap-1.5 text-[10px] text-white/70 font-medium">
//                                 <Calendar size={11} /> Work Shift
//                             </p>
//                             <p className="text-sm font-bold mt-0.5 truncate max-w-[130px]">{shiftName || "Not Assigned"}</p>
//                         </div>
//                         <div>
//                             <p className="flex items-center gap-1.5 text-[10px] text-white/70 font-medium">
//                                 <LogIn size={11} /> {att.hasOut ? "Checked out at" : "Checked in at"}
//                             </p>
//                             <p className="text-sm font-bold mt-0.5">
//                                 {att.hasOut ? formatTime(att.lastOut) : att.hasIn ? formatTime(att.firstIn) : "Not yet"}
//                             </p>
//                         </div>
//                     </div>

//                     <div className="flex flex-col sm:flex-row lg:flex-row gap-2.5 w-full lg:w-auto">
//                         <button
//                             type="button"
//                             onClick={() => action.type && onPunch(action.type)}
//                             disabled={action.disabled}
//                             className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-bold shadow-lg shadow-black/10 transition active:scale-95 disabled:opacity-80 ${punchStyle}`}
//                         >
//                             {busy || !att.loaded ? (
//                                 <Loader2 size={15} className="animate-spin" />
//                             ) : action.type === "checkout" ? (
//                                 <LogOut size={15} />
//                             ) : (
//                                 <LogIn size={15} />
//                             )}
//                             {action.label}
//                         </button>
//                         <button
//                             type="button"
//                             onClick={onViewAttendance}
//                             className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/25 text-xs font-bold transition"
//                         >
//                             <Calendar size={15} /> View Attendance
//                         </button>
//                     </div>
//                 </div>
//             </div>
//         </section>
//     );
// }

// /* Slim attendance bar for admin, HR and managers */
// function PunchBar({ att, busy, onPunch, onView }) {
//     const action = getPunchAction(att, busy);
//     const text = !att.loaded
//         ? "Checking today's attendance..."
//         : att.hasIn && att.hasOut
//             ? `Completed for today. In: ${formatTime(att.firstIn)} · Out: ${formatTime(att.lastOut)}`
//             : att.hasIn
//                 ? `You punched in at ${formatTime(att.firstIn)}. Punch out at the end of your day.`
//                 : "You have not punched in yet today.";

//     return (
//         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4">
//             <div className="flex items-center gap-3 min-w-0">
//                 <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
//                     <Clock size={16} />
//                 </div>
//                 <div className="min-w-0">
//                     <p className="text-sm font-bold text-slate-900">My Attendance</p>
//                     <p className="text-xs text-slate-500">{text}</p>
//                 </div>
//             </div>
//             <div className="flex gap-2">
//                 <button
//                     type="button"
//                     onClick={() => action.type && onPunch(action.type)}
//                     disabled={action.disabled}
//                     className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed ${action.type === "checkout" ? "bg-rose-600 hover:bg-rose-700" : "bg-indigo-600 hover:bg-indigo-700"
//                         }`}
//                 >
//                     {busy ? <Loader2 size={14} className="animate-spin" /> : action.type === "checkout" ? <LogOut size={14} /> : <LogIn size={14} />}
//                     {action.label}
//                 </button>
//                 <button
//                     type="button"
//                     onClick={onView}
//                     className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
//                 >
//                     View
//                 </button>
//             </div>
//         </div>
//     );
// }

// /* -------------------------------------------------------------------------- */
// /* MAIN PAGE                                                                  */
// /* -------------------------------------------------------------------------- */

// export default function DashboardPage() {
//     const router = useRouter();
//     const { user: authUser } = useAuth();
//     const authRef = useRef(authUser);
//     authRef.current = authUser;

//     const role = normalizeRole(authUser?.role);
//     const userId = authUser?._id ? String(authUser._id) : "";
//     const userName = authUser?.name || "";
//     const canPunch = PUNCH_ROLES.includes(role);

//     const [loading, setLoading] = useState(true);
//     const [refreshing, setRefreshing] = useState(false);
//     const [error, setError] = useState("");
//     const [dash, setDash] = useState(null);
//     const [taskTab, setTaskTab] = useState("today");
//     const [energy, setEnergy] = useState("Available");
//     const [now, setNow] = useState(() => Date.now());
//     const inFlight = useRef(false);
//     const refetchRef = useRef(() => { });

//     const att = useMyAttendance({
//         userId,
//         userName,
//         onChanged: () => refetchRef.current(),
//     });

//     /* Energy level is remembered in this browser only */
//     useEffect(() => {
//         if (!userId) return;
//         try {
//             const saved = localStorage.getItem(`hrms_energy_${userId}`);
//             if (saved) setEnergy(saved);
//         } catch { }
//     }, [userId]);

//     const changeEnergy = (value) => {
//         setEnergy(value);
//         try {
//             localStorage.setItem(`hrms_energy_${userId}`, value);
//         } catch { }
//     };

//     /* Live work duration */
//     useEffect(() => {
//         const timer = setInterval(() => setNow(Date.now()), 30 * 1000);
//         return () => clearInterval(timer);
//     }, []);

//     const fetchData = useCallback(async (manual = false, silent = false) => {
//         const me = authRef.current;
//         if (!me || inFlight.current) return;
//         inFlight.current = true;
//         if (manual) setRefreshing(true);

//         try {
//             const myRole = normalizeRole(me.role);
//             const isAdminView = myRole === "admin" || myRole === "hr";
//             const isManagerView = myRole === "manager";
//             const isEmployeeView = myRole === "employee";
//             const myUserId = String(me._id || "");

//             /* 1. Profile (employee details). Admin may not have one. */
//             let profile = { ...me };
//             let myEmployeeId = "";
//             try {
//                 const r = await api.get("/employees/me");
//                 const p = r?.data;
//                 if (p && p.hasEmployeeProfile !== false && p._id) {
//                     profile = { ...me, ...p, role: me.role };
//                     myEmployeeId = String(p._id);
//                 }
//             } catch { }

//             /* 2. Fetch only what this role needs */
//             const days = isEmployeeView ? [] : getLastNDays(7);
//             const safe = (p) => p.catch(() => ({ data: [] }));
//             const empty = Promise.resolve({ data: [] });

//             const [empRes, leaveRes, deptRes, orgDeptRes, desigRes, posRes, payRes, taskRes, holRes, ...attRes] =
//                 await Promise.all([
//                     isEmployeeView ? empty : safe(api.get("/employees")),
//                     safe(api.get("/leave")),
//                     safe(api.get("/departments")),
//                     safe(api.get("/organization/departments?status=active")),
//                     safe(api.get("/organization/designations?status=active")),
//                     isAdminView ? safe(api.get("/recruitment/positions")) : empty,
//                     isAdminView || isEmployeeView ? safe(api.get("/payroll")) : empty,
//                     isEmployeeView ? safe(api.get("/tasks")) : empty,
//                     isEmployeeView ? safe(api.get("/holiday")) : empty,
//                     ...days.map((d) => safe(api.get(`/attendance?date=${toYMD(d)}`))),
//                 ]);

//             const deptMap = { ...buildMap(toList(deptRes)), ...buildMap(toList(orgDeptRes)) };
//             const desigMap = buildMap(toList(desigRes));
//             const allEmployees = toList(empRes);

//             /* 3. Decide whose data is visible.
//                Attendance and leave records point to the login account (User), payroll points to the employee profile,
//                so a record is matched by id or by the email of the populated employee. */
//             let scope = null; // null = everyone
//             let scopedEmployees = allEmployees;

//             if (isEmployeeView) {
//                 scope = {
//                     ids: new Set([myUserId, myEmployeeId].filter(Boolean)),
//                     emails: new Set([me.email, profile.email, profile.loginEmail].map(lower).filter(Boolean)),
//                 };
//                 scopedEmployees = [profile];
//             } else if (isManagerView) {
//                 const myName = lower(getName(profile));
//                 const myDept = lower(idOf(profile.department));
//                 const team = allEmployees.filter((e) => {
//                     if (myEmployeeId && idOf(e) === myEmployeeId) return false;
//                     const reportsToMe = e.reportingManager && lower(e.reportingManager) === myName;
//                     const sameDept = myDept && lower(idOf(e.department)) === myDept;
//                     return reportsToMe || sameDept;
//                 });
//                 scopedEmployees = team;
//                 scope = {
//                     ids: new Set(team.map((e) => idOf(e)).filter(Boolean)),
//                     emails: new Set(team.flatMap((e) => [e.email, e.loginEmail]).map(lower).filter(Boolean)),
//                 };
//             }

//             const inScope = (rec) => {
//                 if (!scope) return true;
//                 const e = rec?.employee ?? rec?.user ?? rec?.employeeId;
//                 const id = idOf(e);
//                 if (id && scope.ids.has(id)) return true;
//                 return Boolean(e && typeof e === "object" && scope.emails.has(lower(e.email)));
//             };

//             const todayYMD = toYMD(new Date());
//             const thisYear = new Date().getFullYear();
//             const thisMonth = new Date().getMonth() + 1;

//             /* 4. Attendance trend (admin, HR, manager) */
//             const perDay = days.map((d, i) => ({ date: d, records: toList(attRes[i]).filter(inScope) }));
//             const trend = perDay.map(({ date, records }) => {
//                 const present = records.filter((r) => PRESENT_STATUSES.includes(lower(r.status))).length;
//                 const absent = records.filter((r) => lower(r.status) === "absent").length;
//                 const day = date.toLocaleDateString("en-US", { weekday: "short" });
//                 const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
//                 return { date: dateStr, day, label: `${day}, ${dateStr}`, present, absent };
//             });

//             const activeEmployees = scopedEmployees.filter(
//                 (e) => !["inactive", "exited", "exit"].includes(lower(e.status || e.employeeStatus))
//             );
//             const presentToday = trend[trend.length - 1]?.present || 0;
//             const attendancePct =
//                 activeEmployees.length > 0 ? ((presentToday / activeEmployees.length) * 100).toFixed(1) : "0.0";

//             /* 5. Leaves */
//             const leaves = toList(leaveRes).filter(inScope);
//             const pending = leaves.filter((l) => lower(l.status) === "pending");
//             const approved = leaves.filter((l) => lower(l.status) === "approved");
//             const approvedToday = approved.filter((l) => leaveCoversDay(l, todayYMD));
//             const thisYearLeave = (l) => {
//                 const { start } = leaveRange(l);
//                 return Number.isNaN(start.getTime()) || start.getFullYear() === thisYear;
//             };

//             const byType = {};
//             leaves
//                 .filter((l) => !INACTIVE_LEAVE.includes(lower(l.status)) && thisYearLeave(l))
//                 .forEach((l) => {
//                     const key = `${titleCase(l.leaveType || "Other")} Leave`;
//                     byType[key] = (byType[key] || 0) + (Number(l.totalDays) || 1);
//                 });
//             const leaveDistribution = Object.entries(byType).map(([name, value], i) => ({
//                 name,
//                 value,
//                 color: LEAVE_COLORS[i % LEAVE_COLORS.length],
//             }));

//             const leaveUsed = approved
//                 .filter((l) => lower(l.leaveType) !== "unpaid" && thisYearLeave(l))
//                 .reduce((sum, l) => sum + (Number(l.totalDays) || 1), 0);

//             const recentLeaves = [...leaves]
//                 .sort((a, b) => new Date(b.createdAt || b.startDate || 0) - new Date(a.createdAt || a.startDate || 0))
//                 .slice(0, 6);

//             /* 6. Role specific blocks */
//             const groupData = isAdminView
//                 ? groupCount(scopedEmployees, (e) => labelOf(e.department, deptMap) || "General Division")
//                 : isManagerView
//                     ? groupCount(scopedEmployees, (e) => labelOf(e.designation, desigMap) || "Not specified")
//                     : [];

//             /* Payroll */
//             const payrolls = toList(payRes);
//             let payslip = null;
//             let payrollSummary = null;

//             if (isEmployeeView && myEmployeeId) {
//                 payslip =
//                     payrolls
//                         .filter((p) => idOf(p.employee) === myEmployeeId && lower(p.status) !== "draft")
//                         .sort((a, b) => b.year * 12 + b.month - (a.year * 12 + a.month))[0] || null;
//             }
//             if (isAdminView) {
//                 const month = payrolls.filter((p) => Number(p.month) === thisMonth && Number(p.year) === thisYear);
//                 payrollSummary = {
//                     label: monthLabel(thisMonth, thisYear),
//                     count: month.length,
//                     paid: month.filter((p) => lower(p.status) === "paid").length,
//                     processed: month.filter((p) => lower(p.status) === "processed").length,
//                     draft: month.filter((p) => lower(p.status) === "draft").length,
//                     totalNet: month.reduce((sum, p) => sum + (Number(p.netSalary) || 0), 0),
//                 };
//             }

//             /* Tasks (only the tasks of this employee) */
//             const tasks = toList(taskRes).filter((t) => {
//                 const a = t.assignedTo ?? t.assignee ?? t.employee;
//                 if (!a) return true;
//                 const list = Array.isArray(a) ? a : [a];
//                 return list.some((x) => inScope({ employee: x }));
//             });

//             /* Today's schedule */
//             const holidaysToday = toList(holRes)
//                 .filter((h) => {
//                     const d = new Date(h.date || h.startDate || h.holidayDate);
//                     return !Number.isNaN(d.getTime()) && toYMD(d) === todayYMD;
//                 })
//                 .map((h) => h.name || h.title || h.holiday || "Holiday");

//             setDash({
//                 role: myRole,
//                 me: profile,
//                 profileInfo: {
//                     employeeId: profile.employeeId,
//                     designation: labelOf(profile.designation, desigMap),
//                     department: labelOf(profile.department, deptMap),
//                     employmentType: profile.employmentType,
//                     manager: profile.reportingManager,
//                     joined: profile.dateOfJoining,
//                     shift: labelOf(profile.shift),
//                 },
//                 hasProfile: Boolean(myEmployeeId),
//                 totalCount: scopedEmployees.length,
//                 activeCount: activeEmployees.length,
//                 presentToday,
//                 attendancePct,
//                 onLeaveToday: approvedToday.length,
//                 openPositions: toList(posRes).filter((p) => lower(p.status) === "open").length,
//                 pending,
//                 trend,
//                 leaveDistribution,
//                 groupData,
//                 recentLeaves,
//                 leaveUsed,
//                 payslip,
//                 payrollSummary,
//                 tasks,
//                 holidaysToday,
//                 leaveToday: approvedToday.length > 0,
//             });
//             setError("");
//         } catch (err) {
//             console.error("Dashboard sync error:", err);
//             if (!silent) setError("Unable to load dashboard data. Please try again.");
//         } finally {
//             inFlight.current = false;
//             setLoading(false);
//             setRefreshing(false);
//         }
//     }, []);

//     refetchRef.current = () => fetchData(false, true);

//     /* Load on mount, refresh every minute and whenever the tab becomes visible again */
//     useEffect(() => {
//         if (!userId) return;
//         fetchData();
//         const onVisible = () => {
//             if (document.visibilityState === "visible") {
//                 fetchData(false, true);
//                 att.refresh();
//             }
//         };
//         const interval = setInterval(() => fetchData(false, true), REFRESH_INTERVAL);
//         document.addEventListener("visibilitychange", onVisible);
//         return () => {
//             clearInterval(interval);
//             document.removeEventListener("visibilitychange", onVisible);
//         };
//         // eslint-disable-next-line react-hooks/exhaustive-deps
//     }, [userId, fetchData]);

//     const handleExportAttendance = () => {
//         if (!dash) return;
//         const headers = "Date,Day,Present,Absent\n";
//         const rows = dash.trend.map((r) => `"${r.date}","${r.day}",${r.present},${r.absent}`).join("\n");
//         const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
//         const url = window.URL.createObjectURL(blob);
//         const a = document.createElement("a");
//         a.href = url;
//         a.download = `attendance-report-${toYMD(new Date())}.csv`;
//         a.click();
//         window.URL.revokeObjectURL(url);
//     };

//     /* ---------------------------------------------------------------------- */
//     /* LOADING / ERROR                                                        */
//     /* ---------------------------------------------------------------------- */

//     if (loading) {
//         return (
//             <div className="w-full min-h-[50vh] flex flex-col items-center justify-center gap-3 px-4">
//                 <Loader2 size={32} className="animate-spin text-indigo-600" />
//                 <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Loading your dashboard...</p>
//             </div>
//         );
//     }

//     if (!dash) {
//         return (
//             <div className="w-full min-h-[50vh] flex flex-col items-center justify-center gap-3 px-4 text-center">
//                 <AlertCircle size={30} className="text-rose-500" />
//                 <p className="text-sm font-semibold text-slate-700">{error || "Something went wrong."}</p>
//                 <button
//                     type="button"
//                     onClick={() => {
//                         setLoading(true);
//                         fetchData();
//                     }}
//                     className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
//                 >
//                     Try Again
//                 </button>
//             </div>
//         );
//     }

//     const isAdminView = dash.role === "admin" || dash.role === "hr";
//     const isManagerView = dash.role === "manager";
//     const isEmployeeView = dash.role === "employee";
//     const firstName = getName(dash.me).split(" ")[0];
//     const totalLeaveDays = dash.leaveDistribution.reduce((sum, i) => sum + i.value, 0);

//     /* ====================================================================== */
//     /* EMPLOYEE DASHBOARD                                                     */
//     /* ====================================================================== */

//     if (isEmployeeView) {
//         const todayYMD = toYMD(new Date());
//         const tasks = dash.tasks;
//         const doneCount = tasks.filter(isTaskDone).length;
//         const pendingCount = tasks.length - doneCount;

//         const visibleTasks = tasks.filter((t) => {
//             if (taskTab === "completed") return isTaskDone(t);
//             if (taskTab === "pending") return !isTaskDone(t);
//             if (taskTab === "high") return isTaskHigh(t) && !isTaskDone(t);
//             const due = taskDue(t);
//             return due && toYMD(new Date(due)) === todayYMD;
//         });

//         const leaveLeft = Math.max(0, ANNUAL_LEAVE_QUOTA - dash.leaveUsed);
//         const leavePct = Math.min(100, (dash.leaveUsed / ANNUAL_LEAVE_QUOTA) * 100);

//         const attendanceValue = !att.today.loaded
//             ? "..."
//             : att.today.hasIn
//                 ? "Present"
//                 : dash.leaveToday
//                     ? "On Leave"
//                     : "Not Marked";
//         const attendanceSub = att.today.hasIn
//             ? att.today.hasOut
//                 ? `In ${formatTime(att.today.firstIn)} · Out ${formatTime(att.today.lastOut)}`
//                 : `Checked in at ${formatTime(att.today.firstIn)}`
//             : "Punch in to mark attendance";

//         const schedule = [];
//         dash.holidaysToday.forEach((h) => schedule.push({ title: h, sub: "Holiday today", tone: "bg-amber-50 text-amber-700" }));
//         if (dash.leaveToday) schedule.push({ title: "On approved leave", sub: "Leave today", tone: "bg-violet-50 text-violet-700" });
//         if (att.today.hasIn) schedule.push({ title: "Punched in", sub: formatTime(att.today.firstIn), tone: "bg-emerald-50 text-emerald-700" });
//         if (att.today.hasOut) schedule.push({ title: "Punched out", sub: formatTime(att.today.lastOut), tone: "bg-rose-50 text-rose-700" });

//         // const quickActions = [
//         //     { label: "Apply Leave", icon: Plus, to: ROUTES.leave },
//         //     { label: "My Attendance", icon: Calendar, to: ROUTES.attendance },
//         //     { label: "My Payslips", icon: Wallet, to: ROUTES.payroll },
//         //     { label: "My Profile", icon: User, to: ROUTES.profile },
//         // ];

//         const workplace = [
//             ["Designation", dash.profileInfo.designation],
//             ["Department", dash.profileInfo.department],
//             ["Reporting Manager", dash.profileInfo.manager],
//             ["Employee ID", dash.profileInfo.employeeId],
//             ["Remaining Leave Days", dash.profileInfo.remainingleave],
//             ["Shift", dash.profileInfo.shiftname],
//             ["Joining Date", dash.profileInfo.joined ? formatDate(dash.profileInfo.joined) : ""],
//             ["Today's Attandance Status", dash.profileInfo.attandance],
//             ["Time with Company", dash.profileInfo.joined ? getTenure(dash.profileInfo.joined) : ""],
//         ];

//         return (
//             <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 py-4 space-y-4 antialiased overflow-x-hidden">
//                 <EmployeeHero
//                     name={getName(dash.me)}
//                     roleLabel={ROLE_TEXT.employee.label}
//                     avatar={dash.me.avatar}
//                     att={att.today}
//                     now={now}
//                     busy={att.busy}
//                     onPunch={att.punch}
//                     energy={energy}
//                     setEnergy={changeEnergy}
//                     shiftName={dash.profileInfo.shift}
//                     onViewAttendance={() => router.push(ROUTES.attendance)}
//                 />

//                 {error && (
//                     <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-amber-800">
//                         <AlertCircle size={15} className="shrink-0 mt-0.5" />
//                         <p className="text-xs font-semibold">{error}</p>
//                     </div>
//                 )}

//                 {!dash.hasProfile && (
//                     <div className="flex items-start gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2.5 text-indigo-800">
//                         <AlertCircle size={15} className="shrink-0 mt-0.5" />
//                         <p className="text-xs font-semibold">
//                             Your employee profile is not linked yet, so some details are empty. Please contact HR.
//                         </p>
//                     </div>
//                 )}

//                 {/* Four cards */}
//                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
//                     <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 flex flex-col">
//                         <div className="flex items-center gap-3">
//                             <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
//                                 <ListChecks size={18} />
//                             </div>
//                             <div>
//                                 <p className="text-xl font-extrabold text-slate-900 leading-tight">{tasks.length}</p>
//                                 <p className="text-[11px] text-slate-500">Total Tasks</p>
//                             </div>
//                         </div>
//                         <div className="mt-auto pt-4">
//                             <div className="border-t border-dashed border-slate-200 pt-3 flex items-center justify-between text-[11px]">
//                                 <span className="text-emerald-600 font-medium">{doneCount} Completed</span>
//                                 <span className="text-slate-500 font-medium">{pendingCount} Pending</span>
//                             </div>
//                         </div>
//                     </div>

//                     <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 flex flex-col">
//                         <div className="flex items-center gap-3">
//                             <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
//                                 <CalendarCheck size={18} />
//                             </div>
//                             <div className="min-w-0">
//                                 <p
//                                     className={`text-xl font-extrabold leading-tight truncate ${att.today.hasIn ? "text-emerald-600" : "text-slate-800"
//                                         }`}
//                                 >
//                                     {attendanceValue}
//                                 </p>
//                                 <p className="text-[11px] text-slate-500">Attendance</p>
//                             </div>
//                         </div>
//                         <div className="mt-auto pt-4">
//                             <div className="border-t border-dashed border-slate-200 pt-3 text-[11px] text-slate-500 font-medium truncate">
//                                 {attendanceSub}
//                             </div>
//                         </div>
//                     </div>

//                     <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 flex flex-col">
//                         <div className="flex items-center gap-3">
//                             <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
//                                 <Clock size={18} />
//                             </div>
//                             <div>
//                                 <p className="text-xl font-extrabold text-slate-900 leading-tight">
//                                     {leaveLeft} / {ANNUAL_LEAVE_QUOTA}
//                                 </p>
//                                 <p className="text-[11px] text-slate-500">Leave Days Remaining</p>
//                             </div>
//                         </div>
//                         <div className="mt-auto pt-4 space-y-2">
//                             <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
//                                 <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${leavePct}%` }} />
//                             </div>
//                             <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
//                                 <span>{dash.leaveUsed} Days Used</span>
//                                 <span>{leaveLeft} Days Left</span>
//                             </div>
//                         </div>
//                     </div>

//                     <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 flex flex-col">
//                         <div className="flex items-center gap-3">
//                             <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
//                                 <Hourglass size={18} />
//                             </div>
//                             <div className="min-w-0">
//                                 <p className="text-xl font-extrabold text-slate-900 leading-tight">Work Shift</p>
//                                 <p className="text-[11px] text-slate-500 truncate">{dash.profileInfo.shift || "Not Assigned"}</p>
//                             </div>
//                         </div>
//                         <div className="mt-auto pt-4">
//                             <div className="border-t border-dashed border-slate-200 pt-3 text-[11px] text-slate-500 font-medium">
//                                 {pad2(WORK_HOURS)}h 00m Duration
//                             </div>
//                         </div>
//                     </div>
//                 </div>

//                 {/* Tasks, schedule, quick actions and workplace */}
//                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
//                     <div className="md:col-span-4 lg:col-span-6">
//                         <WidgetCard
//                             title="My Tasks"
//                             right={
//                                 <div className="flex flex-wrap gap-1.5 justify-end">
//                                     {[
//                                         ["today", "Today"],
//                                         ["pending", "Pending"],
//                                         ["completed", "Completed"],
//                                         ["high", "High Priority"],
//                                     ].map(([key, label]) => (
//                                         <button
//                                             key={key}
//                                             type="button"
//                                             onClick={() => setTaskTab(key)}
//                                             className={`px-3 py-1 rounded-full text-[11px] font-semibold border transition ${taskTab === key
//                                                 ? "bg-indigo-600 text-white border-indigo-600"
//                                                 : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
//                                                 }`}
//                                         >
//                                             {label}
//                                         </button>
//                                     ))}
//                                 </div>
//                             }
//                             footer={<FooterLink label="View All Tasks" onClick={() => router.push(ROUTES.tasks)} />}
//                         >
//                             {visibleTasks.length === 0 ? (
//                                 <NoData />
//                             ) : (
//                                 <ul className="divide-y divide-slate-100">
//                                     {visibleTasks.slice(0, 6).map((t, i) => (
//                                         <li key={t._id || t.id || i} className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3">
//                                             <div className="min-w-0">
//                                                 <p className="text-xs font-semibold text-slate-800 truncate">{t.title || t.name || "Untitled task"}</p>
//                                                 <p className="text-[11px] text-slate-400">
//                                                     {taskDue(t) ? `Due ${formatDate(taskDue(t))}` : "No due date"}
//                                                 </p>
//                                             </div>
//                                             <span
//                                                 className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold border capitalize ${isTaskDone(t)
//                                                     ? "bg-emerald-50 text-emerald-700 border-emerald-200"
//                                                     : isTaskHigh(t)
//                                                         ? "bg-rose-50 text-rose-700 border-rose-200"
//                                                         : "bg-slate-50 text-slate-600 border-slate-200"
//                                                     }`}
//                                             >
//                                                 {isTaskDone(t) ? "Done" : t.priority || "Pending"}
//                                             </span>
//                                         </li>
//                                     ))}
//                                 </ul>
//                             )}
//                         </WidgetCard>
//                     </div>

//                     <div className="lg:col-span-3">
//                         <WidgetCard
//                             title="Today's Schedule"
//                             footer={<FooterLink label="View Full Calendar" onClick={() => router.push(ROUTES.calendar)} />}
//                         >
//                             {schedule.length === 0 ? (
//                                 <NoData text="No schedule for today" />
//                             ) : (
//                                 <ul className="p-3 space-y-2">
//                                     {schedule.map((s, i) => (
//                                         <li key={i} className={`rounded-xl px-3 py-2.5 ${s.tone}`}>
//                                             <p className="text-xs font-bold">{s.title}</p>
//                                             <p className="text-[11px] opacity-80">{s.sub}</p>
//                                         </li>
//                                     ))}
//                                 </ul>
//                             )}
//                         </WidgetCard>
//                     </div>

//                     <div className="lg:col-span-3 space-y-4 min-w-0">
//                         {/* <WidgetCard title="Quick Actions">
//                             <div className="grid grid-cols-2 gap-2 p-3">
//                                 {quickActions.map(({ label, icon: Icon, to }) => (
//                                     <button
//                                         key={label}
//                                         type="button"
//                                         onClick={() => router.push(to)}
//                                         className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-indigo-50 hover:border-indigo-200 py-3 px-2 text-[11px] font-semibold text-slate-600 hover:text-indigo-700 transition"
//                                     >
//                                         <Icon size={16} />
//                                         <span className="text-center leading-tight">{label}</span>
//                                     </button>
//                                 ))}
//                             </div>
//                         </WidgetCard> */}

//                         <WidgetCard title="My Workplace">
//                             <ul>
//                                 {workplace.map(([label, value]) => (
//                                     <li
//                                         key={label}
//                                         className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-slate-100 last:border-0 text-xs"
//                                     >
//                                         <span className="text-slate-400 shrink-0">{label}</span>
//                                         <span className="font-bold text-slate-800 text-right truncate">{value || "Not Assigned"}</span>
//                                     </li>
//                                 ))}
//                             </ul>
//                         </WidgetCard>
//                     </div>
//                 </div>

//                 {/* Leave and payroll */}
//                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
//                     <Panel
//                         icon={CalendarCheck}
//                         title="My Leave Requests"
//                         subtitle={`${dash.pending.length} pending · ${dash.recentLeaves.length} recent requests`}
//                         right={
//                             <button
//                                 type="button"
//                                 onClick={() => router.push(ROUTES.leave.apply)}
//                                 className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-bold bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100 self-start"
//                             >
//                                 <span>View All</span>
//                                 <ArrowUpRight size={12} />
//                             </button>
//                         }
//                     >
//                         {dash.recentLeaves.length === 0 ? (
//                             <EmptyState
//                                 icon={CalendarCheck}
//                                 tone="text-indigo-300"
//                                 text="You have not applied for any leave yet."
//                                 action={
//                                     <button
//                                         type="button"
//                                         onClick={() => router.push(ROUTES.leave)}
//                                         className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
//                                     >
//                                         <Plus size={13} /> Apply for Leave
//                                     </button>
//                                 }
//                             />
//                         ) : (
//                             <div className="space-y-2.5">
//                                 {dash.recentLeaves.map((req) => (
//                                     <div
//                                         key={req._id || req.id}
//                                         onClick={() => router.push(ROUTES.leave)}
//                                         className="min-w-0 flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50/70 hover:bg-indigo-50/40 border border-slate-200/70 cursor-pointer transition"
//                                     >
//                                         <div className="min-w-0">
//                                             <p className="text-xs font-bold text-slate-900 truncate">{titleCase(req.leaveType || "Leave")} Leave</p>
//                                             <p className="text-[11px] text-slate-500 truncate">
//                                                 {formatDate(req.startDate || req.fromDate)} · {req.totalDays || 1}d
//                                             </p>
//                                         </div>
//                                         <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border capitalize shrink-0 ${leaveStatusClass(req.status)}`}>
//                                             {req.status || "pending"}
//                                         </span>
//                                     </div>
//                                 ))}
//                             </div>
//                         )}
//                     </Panel>

//                     <Panel
//                         icon={Wallet}
//                         title="Latest Payslip"
//                         subtitle="Your most recent processed salary"
//                     // right={
//                     //     <button
//                     //         type="button"
//                     //         onClick={() => router.push(ROUTES.payroll)}
//                     //         className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-bold bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100 self-start"
//                     //     >
//                     //         <span>View All</span>
//                     //         <ArrowUpRight size={12} />
//                     //     </button>
//                     // }
//                     >
//                         {!dash.payslip ? (
//                             <EmptyState icon={Wallet} tone="text-indigo-300" text="No payslip has been generated for you yet." />
//                         ) : (
//                             <div className="space-y-3">
//                                 <div className="flex items-center justify-between gap-3">
//                                     <div>
//                                         <p className="text-xs text-slate-400">{monthLabel(dash.payslip.month, dash.payslip.year)}</p>
//                                         <p className="text-2xl font-extrabold text-slate-900 font-mono">{formatMoney(dash.payslip.netSalary)}</p>
//                                         <p className="text-[11px] text-slate-500">Net salary</p>
//                                     </div>
//                                     <span
//                                         className={`text-[10px] font-bold px-2.5 py-1 rounded-full border capitalize ${lower(dash.payslip.status) === "paid"
//                                             ? "bg-emerald-50 text-emerald-700 border-emerald-200"
//                                             : "bg-amber-50 text-amber-700 border-amber-200"
//                                             }`}
//                                     >
//                                         {dash.payslip.status}
//                                     </span>
//                                 </div>
//                                 <div className="rounded-xl bg-slate-50/70 border border-slate-200/70 px-3">
//                                     <InfoRow label="Gross salary" value={formatMoney(dash.payslip.grossSalary)} />
//                                     <InfoRow label="Deductions" value={formatMoney(dash.payslip.totalDeductions)} />
//                                     <InfoRow label="Days present" value={dash.payslip.daysPresent ?? "—"} />
//                                     <InfoRow label="Days on leave" value={dash.payslip.daysOnLeave ?? "—"} />
//                                 </div>
//                             </div>
//                         )}
//                     </Panel>
//                 </div>
//             </div>
//         );
//     }

//     /* ====================================================================== */
//     /* ADMIN, HR AND MANAGER DASHBOARD                                        */
//     /* ====================================================================== */

//     const cards = isAdminView
//         ? [
//             { label: "Workforce", value: dash.totalCount.toLocaleString(), sub: `${dash.activeCount} active employees`, icon: Users, tone: "indigo", href: ROUTES.employees },
//             { label: "Turnout", value: dash.presentToday.toLocaleString(), sub: `${dash.attendancePct}% attendance today`, icon: CheckCircle2, tone: "emerald", href: ROUTES.attendance },
//             { label: "Requests", value: dash.pending.length, sub: "Awaiting review", icon: Calendar, tone: "amber", href: ROUTES.leave },
//             { label: "Hiring", value: dash.openPositions, sub: "Open positions", icon: Briefcase, tone: "cyan", href: ROUTES.recruitment },
//         ]
//         : [
//             { label: "My Team", value: dash.totalCount, sub: `${dash.activeCount} active members`, icon: Users, tone: "indigo", href: null },
//             { label: "Team Present", value: dash.presentToday, sub: `${dash.attendancePct}% attendance today`, icon: CheckCircle2, tone: "emerald", href: ROUTES.attendance },
//             { label: "Team Requests", value: dash.pending.length, sub: "Awaiting your review", icon: Calendar, tone: "amber", href: ROUTES.leave },
//             { label: "On Leave Today", value: dash.onLeaveToday, sub: "Approved leaves", icon: CalendarCheck, tone: "violet", href: ROUTES.leave },
//         ];

//     const leavePanelTitle = isAdminView ? "Leave Category Distribution" : "Team Leave Distribution";

//     return (
//         <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 py-4 space-y-4 antialiased overflow-x-hidden">
//             {/* Header */}
//             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm">
//                 <div className="space-y-1 min-w-0">
//                     <div className="flex flex-wrap items-center gap-2">
//                         <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{ROLE_TEXT[dash.role].title}</h1>
//                         <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
//                             <Sparkles size={11} className="text-indigo-600 shrink-0" />
//                             {ROLE_TEXT[dash.role].badge} View
//                         </span>
//                     </div>
//                     <p className="text-xs font-medium text-slate-500 flex items-center gap-1.5 flex-wrap">
//                         <Calendar size={13} className="text-slate-400 shrink-0" />
//                         <span>{getTodayFormatted()}</span>
//                         <span className="text-slate-300">•</span>
//                         <span>Welcome back, {firstName}</span>
//                     </p>
//                 </div>

//                 <div className="flex items-center gap-2 w-full sm:w-auto">
//                     <button
//                         type="button"
//                         onClick={() => {
//                             fetchData(true);
//                             att.refresh();
//                         }}
//                         disabled={refreshing}
//                         className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2.5 sm:py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold transition disabled:opacity-60"
//                         title="Sync latest records"
//                     >
//                         <RefreshCw size={12} className={refreshing ? "animate-spin text-indigo-600" : ""} />
//                         <span>{refreshing ? "Syncing..." : "Sync"}</span>
//                     </button>
//                     <button
//                         type="button"
//                         onClick={handleExportAttendance}
//                         className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 sm:py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition shadow-sm"
//                     >
//                         <Download size={12} />
//                         <span>Export CSV</span>
//                     </button>
//                 </div>
//             </div>

//             {error && (
//                 <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-amber-800">
//                     <AlertCircle size={15} className="shrink-0 mt-0.5" />
//                     <p className="text-xs font-semibold">{error}</p>
//                 </div>
//             )}

//             {/* My own attendance (admin, HR and managers are also employees of the company) */}
//             {canPunch && (
//                 <PunchBar att={att.today} busy={att.busy} onPunch={att.punch} onView={() => router.push(ROUTES.attendance)} />
//             )}

//             {/* Stat cards */}
//             <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
//                 {cards.map((c) => (
//                     <StatCard
//                         key={c.label}
//                         label={c.label}
//                         value={c.value}
//                         sub={c.sub}
//                         icon={c.icon}
//                         tone={c.tone}
//                         onClick={c.href ? () => router.push(c.href) : undefined}
//                     />
//                 ))}
//             </div>

//             {/* Attendance trend */}
//             <Panel
//                 icon={TrendingUp}
//                 title={isManagerView ? "Team Attendance Trend" : "7-Day Attendance Overview"}
//                 subtitle={isManagerView ? "Present vs. absent members of your team over the past week" : "Present vs. absent staff over the past week"}
//                 right={
//                     <div className="flex items-center gap-2 text-xs font-semibold">
//                         <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
//                             <span className="w-2 h-2 rounded-full bg-indigo-500" /> Present
//                         </span>
//                         <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
//                             <span className="w-2 h-2 rounded-full bg-rose-500" /> Absent
//                         </span>
//                     </div>
//                 }
//             >
//                 <div className="h-52 sm:h-64 w-full pt-1">
//                     <ResponsiveContainer width="100%" height="100%">
//                         <AreaChart data={dash.trend} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
//                             <defs>
//                                 <linearGradient id="presentGradient" x1="0" y1="0" x2="0" y2="1">
//                                     <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
//                                     <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
//                                 </linearGradient>
//                                 <linearGradient id="absentGradient" x1="0" y1="0" x2="0" y2="1">
//                                     <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2} />
//                                     <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
//                                 </linearGradient>
//                             </defs>
//                             <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
//                             <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#64748b", fontWeight: 600 }} dy={8} />
//                             <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 500 }} />
//                             <Tooltip content={<CustomAttendanceTooltip />} />
//                             <Area type="monotone" dataKey="present" stroke="#6366f1" strokeWidth={2} fill="url(#presentGradient)" />
//                             <Area type="monotone" dataKey="absent" stroke="#f43f5e" strokeWidth={2} fill="url(#absentGradient)" />
//                         </AreaChart>
//                     </ResponsiveContainer>
//                 </div>
//             </Panel>

//             {/* Leave distribution + department / team */}
//             <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
//                 <Panel
//                     icon={PieChartIcon}
//                     title={leavePanelTitle}
//                     right={<span className="text-xs font-semibold text-slate-500">{totalLeaveDays} days total</span>}
//                 >
//                     {dash.leaveDistribution.length === 0 ? (
//                         <EmptyState text="No leave records found for this year." />
//                     ) : (
//                         <div className="space-y-4">
//                             <div className="flex items-center justify-center py-1">
//                                 <div className="h-36 w-36 relative flex items-center justify-center">
//                                     <ResponsiveContainer width="100%" height="100%">
//                                         <PieChart>
//                                             <Pie data={dash.leaveDistribution} innerRadius={40} outerRadius={60} paddingAngle={4} dataKey="value">
//                                                 {dash.leaveDistribution.map((entry, index) => (
//                                                     <Cell key={`cell-${index}`} fill={entry.color} />
//                                                 ))}
//                                             </Pie>
//                                         </PieChart>
//                                     </ResponsiveContainer>
//                                     <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
//                                         <span className="text-lg font-extrabold text-slate-900 font-mono">{totalLeaveDays}</span>
//                                         <span className="text-[10px] font-bold text-slate-400 uppercase">Days</span>
//                                     </div>
//                                 </div>
//                             </div>
//                             <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
//                                 {dash.leaveDistribution.map((item) => (
//                                     <div key={item.name} className="flex items-center justify-between gap-3 text-xs p-2 rounded-xl bg-slate-50/50">
//                                         <div className="flex items-center gap-2 min-w-0">
//                                             <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
//                                             <span className="text-slate-700 font-semibold truncate">{item.name}</span>
//                                         </div>
//                                         <span className="font-bold text-slate-900 font-mono shrink-0">{item.value} days</span>
//                                     </div>
//                                 ))}
//                             </div>
//                         </div>
//                     )}
//                 </Panel>

//                 <Panel
//                     icon={Building2}
//                     title={isManagerView ? "Team Composition" : "Department Headcount"}
//                     right={
//                         <span className="text-xs font-semibold text-slate-500">
//                             {dash.totalCount} {isManagerView ? "team members" : "total staff"}
//                         </span>
//                     }
//                 >
//                     {dash.groupData.length === 0 ? (
//                         <EmptyState text={isManagerView ? "No team members found yet." : "No department data registered."} />
//                     ) : (
//                         <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
//                             {dash.groupData.map((item) => {
//                                 const pct = Math.round((item.count / Math.max(dash.totalCount, 1)) * 100);
//                                 return (
//                                     <div key={item.name} className="p-2.5 rounded-xl bg-slate-50/60 border border-slate-200/60">
//                                         <div className="flex items-center justify-between gap-3 text-xs mb-1.5">
//                                             <span className="text-slate-800 font-semibold truncate">{item.name}</span>
//                                             <span className="font-bold text-slate-900 font-mono shrink-0">{item.count} ({pct}%)</span>
//                                         </div>
//                                         <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
//                                             <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${(item.count / (item.max || 1)) * 100}%` }} />
//                                         </div>
//                                     </div>
//                                 );
//                             })}
//                         </div>
//                     )}
//                 </Panel>
//             </div>

//             {/* Pending leave requests + payroll */}
//             <div className={`grid grid-cols-1 gap-4 ${isAdminView ? "lg:grid-cols-3" : ""}`}>
//                 <div className={isAdminView ? "lg:col-span-2 min-w-0" : "min-w-0"}>
//                     <Panel
//                         title={isManagerView ? "Team Leave Requests" : "Pending Leave Requests"}
//                         subtitle={`${dash.pending.length} applications awaiting review`}
//                         right={
//                             <button
//                                 type="button"
//                                 onClick={() => router.push(ROUTES.leave)}
//                                 className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-bold bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100 self-start"
//                             >
//                                 <span>View All</span>
//                                 <ArrowUpRight size={12} />
//                             </button>
//                         }
//                     >
//                         {dash.pending.length === 0 ? (
//                             <EmptyState icon={CheckCircle2} tone="text-emerald-400" text="All leave requests are up to date" />
//                         ) : (
//                             <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 ${isAdminView ? "" : "lg:grid-cols-3"}`}>
//                                 {dash.pending.slice(0, 6).map((req) => {
//                                     const employeeName = req.employee?.name || getName(req.employee) || "Unknown Employee";
//                                     const departmentName = labelOf(req.employee?.department) || req.department || "General Team";
//                                     return (
//                                         <div
//                                             key={req._id || req.id}
//                                             onClick={() => router.push(ROUTES.leave)}
//                                             className="min-w-0 flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50/70 hover:bg-indigo-50/40 border border-slate-200/70 cursor-pointer transition"
//                                         >
//                                             <div className="flex items-center gap-2.5 min-w-0">
//                                                 <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
//                                                     {getInitials(employeeName)}
//                                                 </div>
//                                                 <div className="min-w-0">
//                                                     <p className="text-xs font-bold text-slate-900 truncate">{employeeName}</p>
//                                                     <p className="text-[11px] text-slate-500 truncate capitalize">{departmentName} · {req.leaveType}</p>
//                                                 </div>
//                                             </div>
//                                             <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200 font-mono shrink-0">
//                                                 {req.totalDays || 1}d
//                                             </span>
//                                         </div>
//                                     );
//                                 })}
//                             </div>
//                         )}
//                     </Panel>
//                 </div>

//                 {isAdminView && dash.payrollSummary && (
//                     <Panel
//                         icon={Wallet}
//                         title="Payroll This Month"
//                         subtitle={dash.payrollSummary.label}
//                         right={
//                             <button
//                                 type="button"
//                                 onClick={() => router.push(ROUTES.payroll)}
//                                 className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-bold bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100 self-start"
//                             >
//                                 <span>Open</span>
//                                 <ArrowUpRight size={12} />
//                             </button>
//                         }
//                     >
//                         {dash.payrollSummary.count === 0 ? (
//                             <EmptyState icon={Wallet} tone="text-indigo-300" text="No payroll generated for this month." />
//                         ) : (
//                             <div className="space-y-3">
//                                 <div>
//                                     <p className="text-2xl font-extrabold text-slate-900 font-mono">{formatMoney(dash.payrollSummary.totalNet)}</p>
//                                     <p className="text-[11px] text-slate-500">Total net salary · {dash.payrollSummary.count} payslips</p>
//                                 </div>
//                                 <div className="grid grid-cols-3 gap-2 text-center">
//                                     {[
//                                         ["Paid", dash.payrollSummary.paid, "bg-emerald-50 text-emerald-700"],
//                                         ["Processed", dash.payrollSummary.processed, "bg-indigo-50 text-indigo-700"],
//                                         ["Draft", dash.payrollSummary.draft, "bg-amber-50 text-amber-700"],
//                                     ].map(([label, value, cls]) => (
//                                         <div key={label} className={`rounded-xl py-2 ${cls}`}>
//                                             <p className="text-base font-extrabold font-mono">{value}</p>
//                                             <p className="text-[10px] font-bold uppercase">{label}</p>
//                                         </div>
//                                     ))}
//                                 </div>
//                             </div>
//                         )}
//                     </Panel>
//                 )}
//             </div>
//         </div>
//     );
// }
