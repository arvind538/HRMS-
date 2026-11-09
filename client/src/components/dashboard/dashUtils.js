import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import api from "@/lib/api";

/* ----------------------------- SETTINGS (change for your company) ----------------------------- */

export const OFFICE_LOCATION = {
    name: "4paySave.",
    address: "192.168.1.3",
    lat: 26.890373334979436,
    lng: 75.87398927116433,
    allowedRadius: 100,
    nearRadius: 100,
};
export const DEFAULT_WORK_HOURS = 8;
export const LEAVE_QUOTA = { sick: 12, casual: 12, earned: 15 };
export const QUOTA_TOTAL = Object.values(LEAVE_QUOTA).reduce((a, b) => a + b, 0);
export const PUNCH_ROLES = ["employee", "manager", "hr", "admin"];
/* Only Sunday is off. 0 = Sunday. Saturday is a working day. */
export const WEEK_OFF = new Set([0]);

export const ROUTES = {
    tasks: "/tasks", calendar: "/leave/holidays", leave: "/leave", applyLeave: "/leave/apply",
    attendance: "/attendance", payroll: "/payroll", myPayslips: "/self-service/payslips", profile: "/self-service/profile",
    recruitment: "/recruitment/positions", interviews: "/recruitment/interviews", offers: "/recruitment/offers",
    employees: "/employees", addEmployee: "/employees/add", announcements: "/communication/announcements",
    performance: "/performance", goals: "/performance/goals", selfAssessment: "/performance/self-assessment",
    managerAssessment: "/performance/manager-assessment", promotion: "/performance/promotion", increment: "/performance/increment",
    tickets: "/help/tickets", orgChart: "/organization/chart", company: "/organization/company", myDocuments: "/self-service/documents",
};

export const LEAVE_COLORS = ["#4f46e5", "#06b6d4", "#8b5cf6", "#f59e0b", "#ec4899", "#10b981"];
export const PRESENT_STATUSES = ["present", "late", "half-day", "half day"];
export const INACTIVE_LEAVE = ["rejected", "cancelled", "canceled"];
export const REFRESH_INTERVAL = 60 * 1000;
export const MONTH_NAMES = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const ASSIGNEE_KEYS = ["assignedTo", "assignee", "assignees", "assigned_to", "assignedEmployee", "assignedEmployees", "employee", "employeeId", "user", "members"];
export const CREATOR_KEYS = ["assignedBy", "createdBy", "assigner", "creator", "manager"];
export const TASK_TABS = [["all", "All"], ["today", "Today"], ["pending", "Pending"], ["completed", "Completed"], ["high", "High Priority"]];

export const TONES = {
    indigo: { box: "bg-indigo-50 text-indigo-600 border-indigo-100", hover: "hover:border-indigo-300", sub: "text-slate-600" },
    emerald: { box: "bg-emerald-50 text-emerald-600 border-emerald-100", hover: "hover:border-emerald-300", sub: "text-emerald-600" },
    amber: { box: "bg-amber-50 text-amber-600 border-amber-100", hover: "hover:border-amber-300", sub: "text-amber-600" },
    cyan: { box: "bg-cyan-50 text-cyan-600 border-cyan-100", hover: "hover:border-cyan-300", sub: "text-slate-600" },
    violet: { box: "bg-violet-50 text-violet-600 border-violet-100", hover: "hover:border-violet-300", sub: "text-slate-600" },
};
export const DOT = { indigo: "bg-indigo-500", amber: "bg-amber-500", violet: "bg-violet-500", rose: "bg-rose-500", emerald: "bg-emerald-500", slate: "bg-slate-400" };

export const DAY_STYLE = {
    present: { label: "Present", short: "P", cell: "bg-emerald-500 text-white", chip: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
    late: { label: "Late", short: "Late", cell: "bg-amber-500 text-white", chip: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
    half: { label: "Half day", short: "Half", cell: "bg-orange-400 text-white", chip: "bg-orange-50 text-orange-700 border-orange-200", dot: "bg-orange-400" },
    absent: { label: "Absent", short: "A", cell: "bg-rose-500 text-white", chip: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-500" },
    leave: { label: "Leave", short: "L", cell: "bg-violet-500 text-white", chip: "bg-violet-50 text-violet-700 border-violet-200", dot: "bg-violet-500" },
    holiday: { label: "Holiday", short: "H", cell: "bg-sky-100 text-sky-700", chip: "bg-sky-50 text-sky-700 border-sky-200", dot: "bg-sky-300" },
    weekoff: { label: "Sunday off", short: "Off", cell: "bg-slate-100 text-slate-500", chip: "bg-slate-50 text-slate-500 border-slate-200", dot: "bg-slate-300" },
    pending: { label: "Today", short: "Today", cell: "bg-white text-indigo-700 ring-2 ring-indigo-400", chip: "bg-white text-indigo-700 border-indigo-300", dot: "bg-indigo-400" },
    future: { label: "", short: "", cell: "bg-white text-slate-300 border border-slate-100", chip: "bg-white text-slate-300 border-slate-100", dot: "bg-slate-100" },
};
export const LEGEND = ["present", "late", "half", "absent", "leave", "holiday", "weekoff"];

export const ROLE_TEXT = {
    admin: { title: "Executive HR Dashboard", badge: "Admin", label: "Super Admin" },
    hr: { title: "HR Dashboard", badge: "HR", label: "HR Manager" },
    manager: { title: "Team Management Dashboard", badge: "Manager", label: "Manager" },
    employee: { title: "My Dashboard", badge: "Employee", label: "Employee" },
};

/* ----------------------------- helpers ----------------------------- */

export const normalizeRole = (role) => {
    const r = String(role || "").toLowerCase().trim();
    if (r === "admin" || r === "super admin" || r === "superadmin") return "admin";
    if (r === "hr" || r === "hr manager") return "hr";
    if (r === "manager" || r === "team lead") return "manager";
    return "employee";
};

export const toList = (res) => {
    const d = res?.data;
    if (Array.isArray(d)) return d;
    if (!d || typeof d !== "object") return [];
    for (const key of ["data", "employees", "leaves", "attendance", "records", "departments", "designations", "positions", "payrolls", "payroll", "tasks", "holidays", "tickets"]) {
        if (Array.isArray(d[key])) return d[key];
    }
    return [];
};

export const isMongoId = (s) => /^[0-9a-fA-F]{24}$/.test(String(s || ""));
export const lower = (v) => String(v || "").trim().toLowerCase();
export const titleCase = (s) => String(s || "").replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
export const pad2 = (n) => String(n).padStart(2, "0");
export const norm = (arr) => new Set(arr.map(lower).filter(Boolean));
export const cnt = (v) => (Array.isArray(v) ? v.length : Number(v) || 0);
export const idOf = (v) => (!v ? "" : typeof v === "object" ? String(v._id || v.id || "") : String(v));
export const num = (...vals) => {
    for (const v of vals) if (v !== undefined && v !== null && v !== "" && !Number.isNaN(Number(v))) return Number(v);
    return 0;
};
export const monthNum = (m) => {
    const n = Number(m);
    if (n >= 1 && n <= 12) return n;
    if (!m) return 0;
    return MONTH_NAMES.findIndex((x) => x.startsWith(lower(m).slice(0, 3))) + 1;
};
export const getName = (e) => e?.name || `${e?.firstName || ""} ${e?.lastName || ""}`.trim() || "Employee";
export const refName = (r) => (!r || typeof r !== "object" ? "" : r.name || `${r.firstName || ""} ${r.lastName || ""}`.trim() || r.employee?.name || r.user?.name || "");
export const getInitials = (name) => {
    if (!name) return "EM";
    const p = name.trim().split(" ").filter(Boolean);
    return p.length > 1 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : p[0].slice(0, 2).toUpperCase();
};

export const toYMD = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
export const istYMD = (v) => {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
};
export const ymdAdd = (ymd, n) => {
    const d = new Date(`${ymd}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
};
export const dowOf = (ymd) => new Date(`${ymd}T00:00:00Z`).getUTCDay();
export const dateKey = (v) => {
    if (!v) return "";
    if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? "" : toYMD(d);
};

export const getTodayFormatted = () => new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
export const formatDate = (v) => {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};
export const formatYMD = (key) => {
    const d = new Date(`${key}T00:00:00`);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};
export const formatTime = (v) => {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
};
export const formatDuration = (ms) => {
    const t = Math.max(0, Math.floor(ms / 60000));
    return `${pad2(Math.floor(t / 60))}h ${pad2(t % 60)}m`;
};
export const formatHours = (h) => {
    const m = Math.round((Number(h) || 0) * 60);
    return `${Math.floor(m / 60)}h ${pad2(m % 60)}m`;
};
export const formatMoney = (n) => `₹ ${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
export const monthLabel = (m, y) => new Date(y, (m || 1) - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
export const getTenure = (v) => {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return "";
    const now = new Date();
    let months = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
    if (now.getDate() < d.getDate()) months -= 1;
    if (months < 0) return "Joining soon";
    const y = Math.floor(months / 12);
    const r = months % 12;
    return [y && `${y} yr`, r && `${r} mo`].filter(Boolean).join(" ") || "Less than a month";
};

export const buildMap = (list) => {
    const map = {};
    list.forEach((i) => {
        const id = i?._id || i?.id;
        const label = i?.name || i?.title || i?.label;
        if (id && label) map[String(id)] = label;
    });
    return map;
};
export const labelOf = (value, map = {}) => {
    if (!value) return "";
    if (typeof value === "object") return value.name || value.title || value.label || "";
    const s = String(value);
    if (map[s]) return map[s];
    return isMongoId(s) ? "" : s;
};
export const groupCount = (items, getLabel) => {
    const c = {};
    items.forEach((i) => { const l = getLabel(i); c[l] = (c[l] || 0) + 1; });
    const max = Math.max(...Object.values(c), 1);
    return Object.entries(c).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count, max }));
};

export const leaveRange = (l) => ({
    start: new Date(l.startDate || l.fromDate || l.createdAt),
    end: new Date(l.endDate || l.toDate || l.startDate || l.fromDate || l.createdAt),
});
export const leaveCoversDay = (l, ymd) => {
    const { start, end } = leaveRange(l);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;
    return toYMD(start) <= ymd && ymd <= toYMD(end);
};
export const leaveStatusClass = (s) => {
    const v = lower(s);
    if (v === "approved") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (v === "rejected") return "bg-rose-50 text-rose-700 border-rose-200";
    if (v === "pending") return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-slate-100 text-slate-600 border-slate-200";
};

/* ----------------------------- tasks ----------------------------- */

export const isTaskDone = (t) => /complete|done|closed/.test(lower(t?.status));
export const isTaskSubmitted = (t) => lower(t?.status) === "submitted";
export const isTaskCancelled = (t) => /cancel/.test(lower(t?.status));
export const isTaskHigh = (t) => /high|urgent|critical/.test(lower(t?.priority));
export const taskDue = (t) => t?.dueDate || t?.deadline || t?.endDate || t?.date || null;
export const taskProgress = (t) => Math.max(0, Math.min(100, Number(t?.progress) || 0));
export const byNewest = (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0);

export const filterTasks = (tasks, tab, todayYMD) =>
    tasks.filter((t) => {
        if (tab === "completed") return isTaskDone(t);
        if (tab === "pending") return !isTaskDone(t) && !isTaskCancelled(t);
        if (tab === "high") return isTaskHigh(t) && !isTaskDone(t) && !isTaskCancelled(t);
        if (tab === "today") return dateKey(taskDue(t)) === todayYMD;
        return true;
    });

const collectRefs = (task, keys) => {
    const refs = [];
    keys.forEach((k) => {
        const v = task?.[k];
        if (v === undefined || v === null || v === "") return;
        (Array.isArray(v) ? v : [v]).forEach((x) => { if (x !== undefined && x !== null && x !== "") refs.push(x); });
    });
    return refs;
};
const refMatches = (ref, scope) => {
    if (ref === undefined || ref === null || !scope) return false;
    const id = idOf(ref);
    if (id && scope.ids.has(id)) return true;
    if (typeof ref === "object") {
        for (const k of ["employee", "user"]) {
            const n = idOf(ref[k]);
            if (n && scope.ids.has(n)) return true;
        }
        if (ref.email && scope.emails.has(lower(ref.email))) return true;
        if (ref.name && scope.names.has(lower(ref.name))) return true;
        return false;
    }
    return scope.names.has(lower(ref));
};
export const taskMatches = (task, scope) => {
    if (!scope) return true;
    const refs = collectRefs(task, ASSIGNEE_KEYS);
    return refs.length === 0 || refs.some((r) => refMatches(r, scope));
};
export const assigneeText = (t) => refName(collectRefs(t, ASSIGNEE_KEYS).find((r) => typeof r === "object"));
export const assignerText = (t) => refName(collectRefs(t, CREATOR_KEYS).find((r) => typeof r === "object"));

export const matchRecord = (scope) => (rec) => {
    const e = rec?.employee ?? rec?.user ?? rec?.employeeId;
    const id = idOf(e);
    if (id && scope.ids.has(id)) return true;
    return Boolean(e && typeof e === "object" && scope.emails.has(lower(e.email)));
};

export const normalizePayslip = (p) => {
    if (!p) return null;
    const a = p.attendance || {};
    return {
        ...p, id: p._id,
        net: num(p.netSalary, p.netPay, p.netAmount, p.net),
        gross: num(p.grossSalary, p.grossPay, p.gross),
        deductions: num(p.totalDeductions),
        reimbursement: num(p.reimbursement),
        bonus: num(p.earnings?.bonus, p.bonus),
        working: a.workingDays,
        present: a.present ?? p.daysPresent ?? p.presentDays,
        leave: a.leave ?? p.daysOnLeave ?? p.leaveDays,
        unpaid: a.unpaid ?? p.unpaidDays,
        monthNo: monthNum(p.month),
        yearNo: Number(p.year) || 0,
    };
};

export const attendanceStats = (days) => {
    const s = { present: 0, late: 0, half: 0, absent: 0, leave: 0, hours: 0, rate: 0, workDays: 0 };
    days.forEach((d) => {
        if (s[d.status] !== undefined && ["present", "late", "half", "absent", "leave"].includes(d.status)) s[d.status] += 1;
        s.hours += d.hours || 0;
    });
    const counted = s.present + s.late + s.half + s.absent;
    s.workDays = counted;
    s.rate = counted ? Math.round(((s.present + s.late + s.half * 0.5) / counted) * 100) : 0;
    return s;
};

/* ----------------------------- location and punch ----------------------------- */

const coordsLabel = (lat, lng) => `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`;
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const p1 = (lat1 * Math.PI) / 180;
    const p2 = (lat2 * Math.PI) / 180;
    const dp = ((lat2 - lat1) * Math.PI) / 180;
    const dl = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};
const getReadableAddress = async (lat, lng) => {
    try {
        const c = new AbortController();
        const t = setTimeout(() => c.abort(), 6000);
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=en`, { signal: c.signal });
        clearTimeout(t);
        if (!res.ok) throw new Error("geocode");
        const data = await res.json();
        const a = data.address || {};
        const parts = [...new Set([a.house_number, a.road, a.neighbourhood || a.suburb || a.residential, a.city_district, a.city || a.town || a.village].filter(Boolean))];
        if (parts.length >= 2) return parts.join(", ");
        const base = parts[0] || (data.display_name ? data.display_name.split(",").slice(0, 2).join(",").trim() : "");
        return base ? `${base} (${coordsLabel(lat, lng)})` : coordsLabel(lat, lng);
    } catch {
        return coordsLabel(lat, lng);
    }
};
const resolveLocationLabel = async (lat, lng, distance) => (distance <= OFFICE_LOCATION.nearRadius ? `${OFFICE_LOCATION.name}, ${OFFICE_LOCATION.address}` : getReadableAddress(lat, lng));
const getCurrentPosition = () => new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000 }));

/* One punch in and one punch out per day */
export function useMyAttendance({ userId, userName, onChanged }) {
    const [today, setToday] = useState({ loaded: false, hasIn: false, hasOut: false, firstIn: null, lastOut: null });
    const [busy, setBusy] = useState(false);
    const lock = useRef(false);

    const refresh = useCallback(async () => {
        if (!userId) { setToday((p) => ({ ...p, loaded: true })); return null; }
        try {
            const { data } = await api.get("/attendance", { params: { date: toYMD(new Date()), employeeId: userId } });
            const mine = toList({ data }).filter((r) => {
                const e = r?.employee ?? r?.user;
                if (idOf(e) === userId) return true;
                return Boolean(userName) && e && typeof e === "object" && lower(e.name) === lower(userName);
            });
            const dates = (key) => mine.map((r) => r[key]).filter(Boolean).map((v) => new Date(v)).filter((d) => !Number.isNaN(d.getTime())).sort((a, b) => a - b);
            const ins = dates("checkIn");
            const outs = dates("checkOut");
            const status = { loaded: true, hasIn: ins.length > 0, hasOut: outs.length > 0, firstIn: ins[0] || null, lastOut: outs[outs.length - 1] || null };
            setToday(status);
            return status;
        } catch {
            setToday((p) => ({ ...p, loaded: true }));
            return null;
        }
    }, [userId, userName]);

    useEffect(() => { refresh(); }, [refresh]);

    const punch = useCallback(async (type) => {
        if (lock.current) return;
        if (!userId) return toast.error("Your session has expired. Please log in again.");
        if (typeof navigator === "undefined" || !navigator.geolocation) return toast.error("Location is not supported by your browser.");

        const isIn = type === "checkin";
        lock.current = true;
        setBusy(true);
        try {
            const status = await refresh();
            if (!status) return toast.error("Unable to verify today's attendance. Please try again.");
            if (isIn && status.hasIn) return toast.info("You have already punched in today.");
            if (!isIn && !status.hasIn) return toast.error("Please punch in first before punching out.");
            if (!isIn && status.hasOut) return toast.info("You have already punched out today.");

            let position;
            try {
                position = await getCurrentPosition();
            } catch (geo) {
                return toast.error(geo?.code === 1 ? "Location access was denied. Please allow location access." : "Unable to get your location. Please check your GPS.");
            }
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const distance = calculateDistance(lat, lng, OFFICE_LOCATION.lat, OFFICE_LOCATION.lng);
            if (distance > OFFICE_LOCATION.allowedRadius) return toast.error(`${isIn ? "Punch in" : "Punch out"} failed. You are outside the office area (${Math.round(distance)} m away).`);

            const address = await resolveLocationLabel(lat, lng, distance);
            const coords = { lat, lng };
            if (isIn) {
                await api.post("/attendance/check-in", { employee: userId, name: userName, date: toYMD(new Date()), location: coords, inLocation: address, inCoordinates: coords });
                toast.success("Punched in successfully!");
            } else {
                await api.put("/attendance/check-out", { employee: userId, date: toYMD(new Date()), location: coords, outLocation: address, outCoordinates: coords });
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
    }, [userId, userName, refresh, onChanged]);

    return { today, busy, punch, refresh };
}

export const getPunchAction = (att, busy) => {
    if (!att.loaded) return { label: "Checking...", type: null, disabled: true };
    if (!att.hasIn) return { label: "Punch In", type: "checkin", disabled: busy };
    if (!att.hasOut) return { label: "Punch Out", type: "checkout", disabled: busy };
    return { label: "Day Completed", type: null, disabled: true };
};