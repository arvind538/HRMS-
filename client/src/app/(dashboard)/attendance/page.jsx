"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    LogIn,
    LogOut,
    RefreshCw,
    MapPin,
    X,
    Eye,
    ExternalLink,
    Loader2,
    Clock,
    CalendarDays,
    List,
    ArrowRight,
    CheckCircle2,
    Info,
} from "lucide-react";
import api from "@/lib/api";
import Table from "@/components/ui/Table";
import { toast } from "react-toastify";
import { useAuth } from "@/context/AuthContext";

/* -------------------------------------------------------------------------- */
/* CONSTANTS                                                                  */
/* -------------------------------------------------------------------------- */

const PRIVILEGED_ROLES = ["admin", "hr", "manager", "team_lead", "lead"];

// Office details. Update the name and address for your company.
const OFFICE_LOCATION = {
    name: "4paySave.",
    address: "jamdoli agra road, Jaipur, Rajasthan",
    lat: 26.890373334979436,
    lng: 75.87398927116433,
    allowedRadius: 1000, // punch is allowed within this distance (meters)
    nearRadius: 1000, // inside this distance the office address is saved (meters)
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

/* Local date (YYYY-MM-DD). toISOString() returns the UTC date, which is wrong in India before 5:30 AM */
const toYMD = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
};

const toList = (data) =>
    Array.isArray(data) ? data : data?.attendance || data?.data || data?.records || [];

const lower = (v) => String(v || "").trim().toLowerCase();

const idOf = (v) => {
    if (!v) return "";
    if (typeof v === "object") return String(v._id || v.id || "");
    return String(v);
};

const parseDate = (v) => {
    if (!v) return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
};

const formatTime = (v) => {
    const d = parseDate(v);
    return d ? d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "—";
};

const formatDateLong = (v) => {
    const d = parseDate(v);
    return d ? `${d.getDate()} ${MONTHS[d.getMonth()]}, ${d.getFullYear()}` : "—";
};

const formatDuration = (ms) => {
    if (!ms || ms <= 0) return "—";
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return `${h}h ${m}m`;
};

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

const coordsLabel = (lat, lng) => `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`;

/* Converts coordinates into a readable address. Falls back to coordinates on failure. */
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
            parts[0] ||
            (data.display_name ? data.display_name.split(",").slice(0, 2).join(",").trim() : "");
        return base ? `${base} (${coordsLabel(lat, lng)})` : coordsLabel(lat, lng);
    } catch (error) {
        console.error("Geocoding error:", error);
        return coordsLabel(lat, lng);
    }
};

/* Near the office: save the company address. Otherwise: reverse geocoding. */
const resolveLocationLabel = async (lat, lng, distance) => {
    if (distance <= OFFICE_LOCATION.nearRadius) {
        return `${OFFICE_LOCATION.name}, ${OFFICE_LOCATION.address}`;
    }
    return getReadableAddress(lat, lng);
};

const formatPlace = (value) => {
    if (!value) return "";
    if (typeof value === "string") return value.trim();
    if (typeof value === "object") {
        if (value.address) return String(value.address);
        if (value.lat != null && value.lng != null) return coordsLabel(value.lat, value.lng);
    }
    return "";
};

const getInLocation = (row) =>
    formatPlace(row?.inLocation) ||
    formatPlace(row?.inAddress) ||
    formatPlace(row?.checkInLocation) ||
    formatPlace(row?.inCoordinates) ||
    formatPlace(row?.location?.in) ||
    "";

const getOutLocation = (row) =>
    formatPlace(row?.outLocation) ||
    formatPlace(row?.outAddress) ||
    formatPlace(row?.checkOutLocation) ||
    formatPlace(row?.outCoordinates) ||
    formatPlace(row?.location?.out) ||
    "";

const getMapLink = (coords) =>
    coords?.lat != null && coords?.lng != null
        ? `https://www.google.com/maps?q=${coords.lat},${coords.lng}`
        : null;

/* Reads the logged-in user from the auth context, with a localStorage backup */
const getLoggedInUserData = (authUser) => {
    let parsed = null;
    if (typeof window !== "undefined") {
        try {
            const raw = localStorage.getItem("hrms_user") || localStorage.getItem("user");
            parsed = raw ? JSON.parse(raw) : null;
        } catch (e) {
            console.error("Storage parse error:", e);
        }
    }

    const id =
        authUser?._id ||
        authUser?.id ||
        authUser?.employee?._id ||
        parsed?.employee?._id ||
        parsed?.employee?.id ||
        (typeof parsed?.employee === "string" ? parsed.employee : null) ||
        parsed?._id ||
        null;

    const name =
        authUser?.name ||
        authUser?.username ||
        parsed?.employee?.name ||
        parsed?.name ||
        parsed?.username ||
        "Staff Member";

    const role =
        authUser?.role || authUser?.userRole || parsed?.role || parsed?.userRole || "employee";

    return {
        id: id ? String(id) : null,
        name,
        role: typeof role === "string" ? role.toLowerCase().trim() : "employee",
    };
};

/* Does this attendance record belong to the given user? */
const isMine = (record, user) => {
    const empObj = typeof record.employee === "object" && record.employee !== null ? record.employee : null;
    const empId = idOf(empObj || record.employee);
    const empName = empObj?.name || record.name;
    return (
        (empId && empId === user.id) ||
        (empName && lower(empName) === lower(user.name))
    );
};

/* Converts one attendance row into a list of punches (supports a punches array or a single in/out) */
const getPunchList = (row) => {
    if (!row) return [];
    const nested = Array.isArray(row.punches)
        ? row.punches
        : Array.isArray(row.punchRecords)
            ? row.punchRecords
            : null;

    const build = (p) => ({
        in: p.checkIn || p.in || p.punchIn || null,
        out: p.checkOut || p.out || p.punchOut || null,
        inLocation: getInLocation(p),
        outLocation: getOutLocation(p),
        inCoords: p.inCoordinates || p.location?.in || null,
        outCoords: p.outCoordinates || p.location?.out || null,
    });

    if (nested && nested.length) return nested.map(build);
    if (row.checkIn || row.checkOut) return [build(row)];
    return [];
};

/* Summary for a list of rows: punches, first in, last out, total worked time */
const summarize = (rows) => {
    const punches = rows
        .flatMap(getPunchList)
        .sort((a, b) => (parseDate(a.in)?.getTime() || 0) - (parseDate(b.in)?.getTime() || 0));

    const firstIn = punches.find((p) => p.in)?.in || null;
    const lastOut = punches.filter((p) => p.out).slice(-1)[0]?.out || null;

    const totalMs = punches.reduce((sum, p) => {
        const a = parseDate(p.in);
        const b = parseDate(p.out);
        return a && b && b > a ? sum + (b - a) : sum;
    }, 0);

    return { punches, firstIn, lastOut, totalMs };
};

const getEmployeeInfo = (row, fallbackName) => {
    const empObj = typeof row.employee === "object" && row.employee !== null ? row.employee : null;
    const name =
        empObj?.name ||
        empObj?.fullName ||
        `${empObj?.firstName || ""} ${empObj?.lastName || ""}`.trim() ||
        row.name ||
        fallbackName;
    return { name, code: empObj?.employeeId || "—" };
};

const isLateRow = (row, firstIn) => {
    const d = parseDate(firstIn);
    return row.behavior === "Late" || Boolean(d && d.getHours() > 10);
};

const getCurrentPosition = () =>
    new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 15000,
        });
    });

/* -------------------------------------------------------------------------- */
/* SMALL COMPONENTS                                                           */
/* -------------------------------------------------------------------------- */

function Avatar({ name, size = "w-9 h-9", text = "text-xs" }) {
    const initials = String(name || "U")
        .trim()
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0].toUpperCase())
        .join("");
    return (
        <div
            className={`${size} shrink-0 rounded-full bg-indigo-50 border-2 border-indigo-200 text-indigo-700 flex items-center justify-center font-bold ${text}`}
        >
            {initials || "U"}
        </div>
    );
}

function BehaviorBadge({ late }) {
    return (
        <span
            className={`inline-flex px-3 py-1 rounded-full text-[11px] font-bold border ${late
                ? "bg-rose-50 text-rose-600 border-rose-200"
                : "bg-emerald-50 text-emerald-600 border-emerald-200"
                }`}
        >
            {late ? "Late" : "Regular"}
        </span>
    );
}

function PlaceLine({ icon: Icon, tone, text }) {
    return (
        <div className="flex items-center gap-1.5 text-xs text-slate-600 min-w-0">
            <Icon size={12} className={`${tone} shrink-0`} />
            <span className="truncate" title={text || undefined}>
                {text || "—"}
            </span>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* MAIN PAGE                                                                  */
/* -------------------------------------------------------------------------- */

export default function AttendancePage() {
    const { user: authUser } = useAuth();
    const loggedInUser = useMemo(() => getLoggedInUserData(authUser), [authUser]);
    const isPrivileged = PRIVILEGED_ROLES.includes(loggedInUser.role);

    const todayKey = toYMD(new Date());
    const [records, setRecords] = useState([]);
    const [date, setDate] = useState(todayKey);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [today, setToday] = useState({ loaded: false, hasIn: false, hasOut: false, firstIn: null, lastOut: null });
    const [selectedRecord, setSelectedRecord] = useState(null);
    const punchLock = useRef(false);

    /* Today's status of the logged-in user (always fresh, independent of the selected date) */
    const fetchTodayStatus = useCallback(async () => {
        if (!loggedInUser.id) return null;
        try {
            const { data } = await api.get("/attendance", {
                params: { date: toYMD(new Date()), employeeId: loggedInUser.id },
            });
            const mine = toList(data).filter((r) => isMine(r, loggedInUser));
            const s = summarize(mine);
            const status = {
                loaded: true,
                hasIn: s.punches.some((p) => p.in),
                hasOut: s.punches.some((p) => p.out),
                firstIn: s.firstIn,
                lastOut: s.lastOut,
            };
            setToday(status);
            return status;
        } catch (err) {
            console.error(err);
            setToday((prev) => ({ ...prev, loaded: true }));
            return null;
        }
    }, [loggedInUser]);

    const fetchAttendance = useCallback(async () => {
        setLoading(true);
        try {
            const params = { date };
            if (!isPrivileged && loggedInUser.id) params.employeeId = loggedInUser.id;

            const { data } = await api.get("/attendance", { params });
            let list = toList(data);
            if (!isPrivileged && loggedInUser.id) {
                list = list.filter((r) => isMine(r, loggedInUser));
            }
            setRecords(list);
        } catch (err) {
            console.error(err);
            toast.error("Unable to load attendance records. Please try again.");
        } finally {
            setLoading(false);
        }
    }, [date, isPrivileged, loggedInUser]);

    useEffect(() => {
        if (loggedInUser.id) fetchAttendance();
    }, [fetchAttendance, loggedInUser.id]);

    useEffect(() => {
        if (loggedInUser.id) fetchTodayStatus();
    }, [fetchTodayStatus, loggedInUser.id]);

    /* Lock page scroll and close the modal with the Escape key */
    useEffect(() => {
        if (!selectedRecord) return;
        const onKey = (e) => e.key === "Escape" && setSelectedRecord(null);
        const previous = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = previous;
            window.removeEventListener("keydown", onKey);
        };
    }, [selectedRecord]);

    /* ---------------------------------------------------------------------- */
    /* PUNCH (one punch in and one punch out per day)                         */
    /* ---------------------------------------------------------------------- */

    const punch = async (type) => {
        if (punchLock.current) return;
        if (!loggedInUser.id) {
            toast.error("Your session has expired. Please log in again.");
            return;
        }
        if (!navigator.geolocation) {
            toast.error("Location is not supported by your browser.");
            return;
        }

        const isIn = type === "checkin";
        punchLock.current = true;
        setActionLoading(type);

        try {
            /* 1. Re-check today's status from the server before doing anything */
            const status = await fetchTodayStatus();
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

            /* 2. Location and geofence check */
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

            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;
            const distance = calculateDistance(userLat, userLng, OFFICE_LOCATION.lat, OFFICE_LOCATION.lng);

            if (distance > OFFICE_LOCATION.allowedRadius) {
                toast.error(
                    `${isIn ? "Punch in" : "Punch out"} failed. You are outside the office area (${Math.round(distance)} m away).`
                );
                return;
            }

            const address = await resolveLocationLabel(userLat, userLng, distance);
            const coords = { lat: userLat, lng: userLng };

            /* 3. Save */
            if (isIn) {
                await api.post("/attendance/check-in", {
                    employee: loggedInUser.id,
                    name: loggedInUser.name,
                    date: toYMD(new Date()),
                    location: coords,
                    inLocation: address,
                    inCoordinates: coords,
                });
                toast.success("Punched in successfully!");
            } else {
                await api.put("/attendance/check-out", {
                    employee: loggedInUser.id,
                    date: toYMD(new Date()),
                    location: coords,
                    outLocation: address,
                    outCoordinates: coords,
                });
                toast.success("Punched out successfully!");
            }

            await Promise.all([fetchAttendance(), fetchTodayStatus()]);
        } catch (err) {
            toast.error(
                err?.response?.data?.message || (isIn ? "Punch in failed." : "Punch out failed.")
            );
            fetchTodayStatus();
        } finally {
            punchLock.current = false;
            setActionLoading(null);
        }
    };

    const busy = Boolean(actionLoading);
    const canPunchIn = today.loaded && !today.hasIn && !busy;
    const canPunchOut = today.loaded && today.hasIn && !today.hasOut && !busy;

    const banner = !today.loaded
        ? { tone: "bg-slate-50 border-slate-200 text-slate-600", icon: Loader2, spin: true, text: "Checking today's attendance..." }
        : today.hasIn && today.hasOut
            ? { tone: "bg-emerald-50 border-emerald-200 text-emerald-700", icon: CheckCircle2, text: `Attendance completed for today. In: ${formatTime(today.firstIn)} · Out: ${formatTime(today.lastOut)}.` }
            : today.hasIn
                ? { tone: "bg-indigo-50 border-indigo-200 text-indigo-700", icon: Info, text: `You punched in at ${formatTime(today.firstIn)}. Please punch out at the end of your day.` }
                : { tone: "bg-amber-50 border-amber-200 text-amber-700", icon: Info, text: "You have not punched in yet today. You can punch in and punch out once per day." };

    /* ---------------------------------------------------------------------- */
    /* TABLE COLUMNS (desktop)                                                */
    /* ---------------------------------------------------------------------- */

    const columns = [
        {
            key: "employee",
            label: "Profile",
            render: (row) => {
                const emp = getEmployeeInfo(row, loggedInUser.name);
                return (
                    <div className="flex items-center gap-3 min-w-[150px]">
                        <Avatar name={emp.name} />
                        <div className="min-w-0">
                            <span className="font-bold text-slate-900 block text-xs truncate">{emp.name}</span>
                            <span className="text-[11px] font-semibold text-slate-400">ID: {emp.code}</span>
                        </div>
                    </div>
                );
            },
        },
        {
            key: "date",
            label: "Date",
            render: (row) => (
                <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">
                    {formatDateLong(row.date)}
                </span>
            ),
        },
        {
            key: "punchRecords",
            label: "Punch records",
            render: (row) => (
                <button
                    type="button"
                    onClick={() => setSelectedRecord(row)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-bold hover:bg-indigo-100 transition whitespace-nowrap"
                >
                    <Eye size={12} /> View Details
                </button>
            ),
        },
        {
            key: "checkIn",
            label: "Punch In",
            render: (row) => (
                <span className="text-xs font-bold text-slate-700 whitespace-nowrap">
                    {formatTime(summarize([row]).firstIn)}
                </span>
            ),
        },
        {
            key: "inLocation",
            label: "In Location",
            render: (row) => (
                <div className="max-w-[200px]">
                    <PlaceLine icon={MapPin} tone="text-indigo-500" text={summarize([row]).punches[0]?.inLocation} />
                </div>
            ),
        },
        {
            key: "outLocation",
            label: "Out Location",
            render: (row) => {
                const last = summarize([row]).punches.slice(-1)[0];
                return (
                    <div className="max-w-[200px]">
                        <PlaceLine icon={MapPin} tone="text-rose-400" text={last?.outLocation} />
                    </div>
                );
            },
        },
        {
            key: "checkOut",
            label: "Punch Out",
            render: (row) => (
                <span className="text-xs font-bold text-slate-700 whitespace-nowrap">
                    {formatTime(summarize([row]).lastOut)}
                </span>
            ),
        },
        {
            key: "behavior",
            label: "Behavior",
            render: (row) => <BehaviorBadge late={isLateRow(row, summarize([row]).firstIn)} />,
        },
        {
            key: "workHours",
            label: "Total Hours",
            render: (row) => {
                const s = summarize([row]);
                return (
                    <span className="text-xs font-bold text-slate-800 whitespace-nowrap">
                        {s.totalMs > 0 ? formatDuration(s.totalMs) : row.workHours ? `${row.workHours} hrs` : "—"}
                    </span>
                );
            },
        },
    ];

    /* ---------------------------------------------------------------------- */
    /* MODAL DATA                                                             */
    /* ---------------------------------------------------------------------- */

    const modal = useMemo(() => {
        if (!selectedRecord) return null;
        const emp = getEmployeeInfo(selectedRecord, loggedInUser.name);
        const s = summarize([selectedRecord]);
        return { emp, ...s };
    }, [selectedRecord, loggedInUser.name]);

    /* ---------------------------------------------------------------------- */
    /* PAGE                                                                   */
    /* ---------------------------------------------------------------------- */

    return (
        <div className="w-full min-w-0 max-w-[1500px] mx-auto space-y-4 sm:space-y-6 pb-10">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm">
                <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Attendance List</h1>
                    <p className="text-xs sm:text-sm text-slate-500">
                        Real-time attendance logs and geofenced punch tracking
                    </p>
                </div>

                <div className="grid grid-cols-[auto_1fr_1fr] sm:flex gap-2 sm:gap-3">
                    <button
                        type="button"
                        onClick={() => {
                            fetchAttendance();
                            fetchTodayStatus();
                        }}
                        className="p-3 border border-slate-200 rounded-2xl text-slate-600 hover:bg-slate-50 flex items-center justify-center"
                        aria-label="Refresh"
                    >
                        <RefreshCw size={16} className={loading ? "animate-spin text-indigo-600" : ""} />
                    </button>

                    <button
                        type="button"
                        onClick={() => punch("checkin")}
                        disabled={!canPunchIn}
                        className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl px-4 sm:px-5 py-3 text-xs font-bold transition disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
                    >
                        {actionLoading === "checkin" ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
                        Punch In
                    </button>

                    <button
                        type="button"
                        onClick={() => punch("checkout")}
                        disabled={!canPunchOut}
                        className="inline-flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl px-4 sm:px-5 py-3 text-xs font-bold transition disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
                    >
                        {actionLoading === "checkout" ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
                        Punch Out
                    </button>
                </div>
            </div>

            {/* Today's status */}
            <div className={`flex items-start gap-2.5 rounded-2xl border px-4 py-3 ${banner.tone}`}>
                <banner.icon size={16} className={`shrink-0 mt-0.5 ${banner.spin ? "animate-spin" : ""}`} />
                <p className="text-xs sm:text-sm font-semibold">{banner.text}</p>
            </div>

            {/* Date selector */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <label htmlFor="attendance-date" className="text-xs font-extrabold text-slate-500 uppercase shrink-0">
                        Select Date:
                    </label>
                    <input
                        id="attendance-date"
                        type="date"
                        value={date}
                        onChange={(e) => e.target.value && setDate(e.target.value)}
                        className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-base sm:text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                    />
                </div>
                <p className="text-xs font-semibold text-slate-400">
                    Showing logs for{" "}
                    <span className="font-bold text-slate-700">{formatDateLong(`${date}T00:00:00`)}</span>
                </p>
            </div>

            {/* Records */}
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm">
                {loading ? (
                    <div className="py-20 text-center">
                        <RefreshCw size={24} className="animate-spin text-indigo-600 mx-auto" />
                    </div>
                ) : records.length === 0 ? (
                    <div className="text-center py-16 sm:py-20 px-4 text-slate-400 font-bold text-sm">
                        No attendance logs found for this date.
                    </div>
                ) : (
                    <>
                        {/* Mobile and tablet: cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 sm:p-4 lg:hidden">
                            {records.map((row, i) => {
                                const emp = getEmployeeInfo(row, loggedInUser.name);
                                const s = summarize([row]);
                                const lastPunch = s.punches.slice(-1)[0];
                                return (
                                    <div
                                        key={row._id || row.id || i}
                                        className="min-w-0 rounded-2xl border border-slate-200 p-4 space-y-3"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <Avatar name={emp.name} />
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-slate-900 truncate">{emp.name}</p>
                                                    <p className="text-[11px] font-semibold text-slate-400">
                                                        {formatDateLong(row.date)}
                                                    </p>
                                                </div>
                                            </div>
                                            <BehaviorBadge late={isLateRow(row, s.firstIn)} />
                                        </div>

                                        <div className="grid grid-cols-3 gap-2 text-center">
                                            {[
                                                ["In", formatTime(s.firstIn)],
                                                ["Out", formatTime(s.lastOut)],
                                                ["Total", s.totalMs > 0 ? formatDuration(s.totalMs) : row.workHours ? `${row.workHours} hrs` : "—"],
                                            ].map(([label, value]) => (
                                                <div key={label} className="rounded-xl bg-slate-50 py-2 px-1 min-w-0">
                                                    <p className="text-[10px] font-bold uppercase text-slate-400">{label}</p>
                                                    <p className="text-xs font-bold text-slate-800 truncate">{value}</p>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="space-y-1.5">
                                            <PlaceLine icon={MapPin} tone="text-indigo-500" text={s.punches[0]?.inLocation} />
                                            <PlaceLine icon={MapPin} tone="text-rose-400" text={lastPunch?.outLocation} />
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => setSelectedRecord(row)}
                                            className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-bold hover:bg-indigo-100 transition"
                                        >
                                            <Eye size={13} /> View Details
                                        </button>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Desktop: table */}
                        <div className="hidden lg:block overflow-x-auto">
                            <Table columns={columns} data={records} />
                        </div>
                    </>
                )}
            </div>

            {/* Punch details modal (bottom sheet on mobile, centered on larger screens) */}
            {modal && (
                <div
                    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm p-0 sm:p-6"
                    onClick={() => setSelectedRecord(null)}
                >
                    <div
                        className="w-full max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92dvh] overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Title */}
                        <div className="flex items-center justify-between gap-3 px-5 sm:px-7 py-4 sm:py-5 border-b border-slate-100">
                            <h3 className="text-base sm:text-lg font-semibold text-slate-700 truncate">
                                {modal.emp.name} — {formatDateLong(selectedRecord.date)}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setSelectedRecord(null)}
                                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition shrink-0"
                                aria-label="Close"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-4 sm:p-7 overflow-y-auto overscroll-contain space-y-4 sm:space-y-5">
                            {/* Employee row */}
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <Avatar name={modal.emp.name} size="w-11 h-11 sm:w-12 sm:h-12" text="text-sm" />
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-slate-900 truncate">{modal.emp.name}</p>
                                        <p className="text-xs text-slate-500 flex items-center gap-1.5">
                                            <CalendarDays size={12} className="shrink-0" />
                                            {formatDateLong(selectedRecord.date)}
                                        </p>
                                    </div>
                                </div>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold shrink-0">
                                    <List size={13} />
                                    {modal.punches.length} {modal.punches.length === 1 ? "record" : "records"}
                                </span>
                            </div>

                            {/* Summary */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 rounded-2xl bg-slate-50 border border-slate-200/70 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/70">
                                {[
                                    { label: "First In", value: formatTime(modal.firstIn), icon: LogIn, box: "bg-emerald-50 text-emerald-600" },
                                    { label: "Last Out", value: formatTime(modal.lastOut), icon: LogOut, box: "bg-rose-50 text-rose-500" },
                                    { label: "Total Worked", value: formatDuration(modal.totalMs), icon: Clock, box: "bg-sky-50 text-sky-600" },
                                ].map((item) => (
                                    <div key={item.label} className="flex items-center gap-3 p-4">
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${item.box}`}>
                                            <item.icon size={16} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                {item.label}
                                            </p>
                                            <p className="text-base font-bold text-slate-900">{item.value}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Punch list */}
                            {modal.punches.length === 0 ? (
                                <div className="py-10 text-center text-sm font-semibold text-slate-400">
                                    No punch records for this day.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {modal.punches.map((p, index) => {
                                        const inMap = getMapLink(p.inCoords);
                                        const outMap = getMapLink(p.outCoords);
                                        return (
                                            <div key={index} className="rounded-2xl border border-slate-200 overflow-hidden">
                                                <div className="flex items-center gap-3 sm:gap-4 p-4 flex-wrap">
                                                    <span className="w-7 h-7 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold flex items-center justify-center shrink-0">
                                                        {index + 1}
                                                    </span>

                                                    <div className="min-w-0">
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold">
                                                            <LogIn size={10} /> Punch In
                                                        </span>
                                                        <p className="text-base font-bold text-slate-900 mt-1.5">{formatTime(p.in)}</p>
                                                    </div>

                                                    <ArrowRight size={16} className="text-slate-300 shrink-0" />

                                                    <div className="min-w-0">
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-500 text-[10px] font-bold">
                                                            <LogOut size={10} /> Punch Out
                                                        </span>
                                                        <p className="text-base font-bold text-slate-900 mt-1.5">{formatTime(p.out)}</p>
                                                    </div>
                                                </div>

                                                <div className="bg-slate-50 border-t border-slate-100 px-4 py-3 space-y-2">
                                                    <div className="flex items-start gap-2 text-xs text-slate-600">
                                                        <MapPin size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                                                        <p className="min-w-0 break-words">
                                                            <b className="text-slate-700">In:</b> {p.inLocation || "—"}
                                                            {inMap && (
                                                                <a
                                                                    href={inMap}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="ml-2 inline-flex items-center gap-1 font-bold text-indigo-600 hover:underline"
                                                                >
                                                                    <ExternalLink size={11} /> Map
                                                                </a>
                                                            )}
                                                        </p>
                                                    </div>
                                                    {(p.out || p.outLocation) && (
                                                        <div className="flex items-start gap-2 text-xs text-slate-600">
                                                            <MapPin size={13} className="text-rose-400 shrink-0 mt-0.5" />
                                                            <p className="min-w-0 break-words">
                                                                <b className="text-slate-700">Out:</b> {p.outLocation || "—"}
                                                                {outMap && (
                                                                    <a
                                                                        href={outMap}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="ml-2 inline-flex items-center gap-1 font-bold text-indigo-600 hover:underline"
                                                                    >
                                                                        <ExternalLink size={11} /> Map
                                                                    </a>
                                                                )}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}




// "use client";
// import { useEffect, useState } from "react";
// import {
//     LogIn,
//     LogOut,
//     Calendar,
//     Clock,
//     UserCheck,
//     UserX,
//     RefreshCw,
//     Timer,
//     CheckCircle2
// } from "lucide-react";
// import api from "@/lib/api";
// import Table from "@/components/ui/Table";
// import Button from "@/components/ui/Button";
// import { toast } from "react-toastify";
// import { useAuth } from "@/context/AuthContext";

// const PRIVILEGED_ROLES = ["admin", "hr", "manager", "team_lead", "lead"];

// export default function AttendancePage() {
//     const { user: authUser } = useAuth();
//     const [records, setRecords] = useState([]);
//     const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
//     const [loading, setLoading] = useState(true);
//     const [actionLoading, setActionLoading] = useState(null);

//     // Helper: LocalStorage ya AuthContext se active user ki details nikalne ke liye
//     const getLoggedInUserData = () => {
//         try {
//             const rawUser = localStorage.getItem("hrms_user");
//             const parsed = rawUser ? JSON.parse(rawUser) : null;

//             const userId = authUser?._id || authUser?.id || authUser?.employee?._id || parsed?.employee?._id || parsed?.employee?.id || (typeof parsed?.employee === "string" ? parsed?.employee : null) || parsed?._id || parsed?.id || null;
//             const userName = authUser?.name || authUser?.username || parsed?.employee?.name || parsed?.name || parsed?.username || "Staff Member";
//             const userDept = authUser?.department || authUser?.role || parsed?.employee?.department || parsed?.department || parsed?.role || "Employee";
//             const userRole = authUser?.role || authUser?.userRole || parsed?.role || parsed?.userRole || "employee";

//             return {
//                 id: userId,
//                 name: userName,
//                 department: userDept,
//                 role: typeof userRole === 'string' ? userRole.toLowerCase().trim() : 'employee'
//             };
//         } catch (e) {
//             console.error("Storage parse error:", e);
//             return { id: null, name: "Staff Member", department: "Employee", role: "employee" };
//         }
//     };

//     const loggedInUser = getLoggedInUserData();
//     const isPrivileged = PRIVILEGED_ROLES.includes(loggedInUser.role);

//     const fetchAttendance = async () => {
//         setLoading(true);
//         try {
//             const params = { date };
//             if (!isPrivileged && loggedInUser.id) {
//                 params.employeeId = loggedInUser.id;
//             }

//             const { data } = await api.get("/attendance", { params });
//             let list = Array.isArray(data) ? data : (data.attendance || data.data || []);

//             // Strict Filter: Agar employee hai toh sirf uska hi record table me dikhega
//             if (!isPrivileged && loggedInUser.id) {
//                 list = list.filter((r) => {
//                     const empObj = typeof r.employee === "object" && r.employee !== null ? r.employee : null;
//                     const empId = empObj?._id || empObj?.id || (typeof r.employee === "string" ? r.employee : null);
//                     const empName = empObj?.name || r.name;
//                     return empId === loggedInUser.id || (empName && empName.toLowerCase() === loggedInUser.name.toLowerCase());
//                 });
//             }

//             setRecords(list);
//         } catch (err) {
//             console.error(err);
//             toast.error("Attendance records load nahi ho paye.");
//         } finally {
//             setLoading(false);
//         }
//     };

//     useEffect(() => {
//         if (loggedInUser.id) {
//             fetchAttendance();
//         }
//     }, [date, loggedInUser.id]);

//     const handleCheckIn = async () => {
//         if (!loggedInUser.id) {
//             toast.error("User session expired or ID missing. Please log in again.");
//             return;
//         }

//         setActionLoading("checkin");
//         try {
//             await api.post("/attendance/check-in", {
//                 employee: loggedInUser.id,
//                 name: loggedInUser.name
//             });
//             toast.success("Checked in successfully!");
//             fetchAttendance();
//         } catch (err) {
//             toast.error(err.response?.data?.message || "Check-in failed");
//         } finally {
//             setActionLoading(null);
//         }
//     };

//     const handleCheckOut = async () => {
//         if (!loggedInUser.id) {
//             toast.error("User session expired or ID missing. Please log in again.");
//             return;
//         }

//         setActionLoading("checkout");
//         try {
//             await api.put("/attendance/check-out", { employee: loggedInUser.id });
//             toast.success("Checked out successfully!");
//             fetchAttendance();
//         } catch (err) {
//             toast.error(err.response?.data?.message || "Check-out failed");
//         } finally {
//             setActionLoading(null);
//         }
//     };

//     const totalEmployees = records.length;
//     const presentCount = records.filter((r) => r.status?.toLowerCase() === "present" || r.status?.toLowerCase() === "half-day").length;
//     const absentCount = records.filter((r) => r.status?.toLowerCase() === "absent").length;
//     const attendanceRate = totalEmployees > 0
//         ? Math.round((presentCount / totalEmployees) * 100)
//         : 0;

//     const columns = [
//         {
//             key: "employee",
//             label: "Employee",
//             render: (row) => {
//                 const empObj = typeof row.employee === "object" && row.employee !== null ? row.employee : null;
//                 const empName = empObj?.name || empObj?.fullName || empObj?.username || row.userName || row.name || loggedInUser.name;
//                 const empDept = empObj?.department || empObj?.role || row.department || loggedInUser.department;

//                 return (
//                     <div className="flex items-center gap-3.5 group/item">
//                         <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white flex items-center justify-center font-extrabold text-xs shadow-sm shadow-indigo-100 group-hover/item:scale-105 transition-transform">
//                             {empName ? empName.charAt(0).toUpperCase() : "U"}
//                         </div>
//                         <div>
//                             <span className="font-bold text-slate-900 block text-xs leading-snug group-hover/item:text-indigo-600 transition-colors">
//                                 {empName}
//                             </span>
//                             <span className="text-[11px] font-semibold text-slate-400 capitalize">
//                                 {empDept}
//                             </span>
//                         </div>
//                     </div>
//                 );
//             },
//         },
//         {
//             key: "checkIn",
//             label: "Check In",
//             render: (row) => (
//                 <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
//                     <Clock size={13} className="text-emerald-500" />
//                     <span>{row.checkIn ? new Date(row.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—"}</span>
//                 </div>
//             ),
//         },
//         {
//             key: "checkOut",
//             label: "Check Out",
//             render: (row) => (
//                 <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
//                     <Clock size={13} className="text-rose-400" />
//                     <span>{row.checkOut ? new Date(row.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—"}</span>
//                 </div>
//             ),
//         },
//         {
//             key: "workHours",
//             label: "Work Hours",
//             render: (row) => (
//                 <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-slate-50 border border-slate-200/80 font-bold text-slate-700 text-xs shadow-2xs">
//                     <Timer size={13} className="text-slate-400" />
//                     {row.workHours ? `${row.workHours} hrs` : (row.hours ? `${row.hours} hrs` : "—")}
//                 </span>
//             ),
//         },
//         {
//             key: "status",
//             label: "Status",
//             render: (row) => {
//                 const statusStr = (row.status || "present").toLowerCase();
//                 const isPresent = statusStr === "present" || statusStr === "half-day";
//                 return (
//                     <span
//                         className={`inline-flex items-center gap-1.5 text-[11px] font-extrabold px-3 py-1 rounded-full border capitalize shadow-2xs ${isPresent
//                             ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
//                             : "bg-rose-50 text-rose-700 border-rose-200/80"
//                             }`}
//                     >
//                         <span className={`w-1.5 h-1.5 rounded-full ${isPresent ? "bg-emerald-500" : "bg-rose-500"}`} />
//                         {row.status || "Present"}
//                     </span>
//                 );
//             },
//         },
//     ];

//     return (
//         <div className="max-w-[1400px] mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
//             {/* Header */}
//             <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs transition-all hover:shadow-md">
//                 <div>
//                     <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Attendance Tracker</h1>
//                     <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-1">Real-time attendance logs, punch times, and shift analytics</p>
//                 </div>

//                 <div className="flex flex-wrap items-center gap-3">
//                     <button
//                         onClick={fetchAttendance}
//                         className="p-3 border border-slate-200/80 rounded-2xl text-slate-600 hover:bg-slate-50 hover:border-slate-300 active:scale-95 transition-all duration-200 shadow-2xs cursor-pointer"
//                         title="Refresh Attendance"
//                     >
//                         <RefreshCw size={16} className={loading ? "animate-spin text-indigo-600" : ""} />
//                     </button>

//                     <Button
//                         onClick={handleCheckIn}
//                         loading={actionLoading === "checkin"}
//                         className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-2xl px-5 py-3 font-bold text-xs shadow-md shadow-emerald-100 transition-all duration-200 flex items-center gap-2 cursor-pointer"
//                     >
//                         <LogIn size={16} /> Punch In
//                     </Button>

//                     <Button
//                         onClick={handleCheckOut}
//                         loading={actionLoading === "checkout"}
//                         className="bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-2xl px-5 py-3 font-bold text-xs shadow-md shadow-rose-100 transition-all duration-200 flex items-center gap-2 cursor-pointer"
//                     >
//                         <LogOut size={16} /> Punch Out
//                     </Button>
//                 </div>
//             </div>

//             {/* Metrics */}
//             <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
//                 <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs transition-all hover:shadow-md flex items-center justify-between group">
//                     <div>
//                         <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Total Records</p>
//                         <h3 className="text-3xl font-extrabold text-slate-900 mt-1.5">{totalEmployees}</h3>
//                     </div>
//                     <div className="p-4 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 group-hover:scale-110 transition-transform shadow-2xs">
//                         <Calendar size={22} />
//                     </div>
//                 </div>

//                 <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs transition-all hover:shadow-md flex items-center justify-between group">
//                     <div>
//                         <p className="text-[11px] font-extrabold text-emerald-600 uppercase tracking-wider">Present Today</p>
//                         <h3 className="text-3xl font-extrabold text-slate-900 mt-1.5">{presentCount}</h3>
//                     </div>
//                     <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 group-hover:scale-110 transition-transform shadow-2xs">
//                         <UserCheck size={22} />
//                     </div>
//                 </div>

//                 <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs transition-all hover:shadow-md flex items-center justify-between group">
//                     <div>
//                         <p className="text-[11px] font-extrabold text-rose-500 uppercase tracking-wider">Absent Today</p>
//                         <h3 className="text-3xl font-extrabold text-slate-900 mt-1.5">{absentCount}</h3>
//                     </div>
//                     <div className="p-4 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 group-hover:scale-110 transition-transform shadow-2xs">
//                         <UserX size={22} />
//                     </div>
//                 </div>

//                 <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs transition-all hover:shadow-md flex items-center justify-between group">
//                     <div>
//                         <p className="text-[11px] font-extrabold text-violet-600 uppercase tracking-wider">Attendance Rate</p>
//                         <h3 className="text-3xl font-extrabold text-slate-900 mt-1.5">{attendanceRate}%</h3>
//                     </div>
//                     <div className="p-4 rounded-2xl bg-violet-50 text-violet-600 border border-violet-100 group-hover:scale-110 transition-transform shadow-2xs">
//                         <CheckCircle2 size={22} />
//                     </div>
//                 </div>
//             </div>

//             {/* Date Filter */}
//             <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
//                 <div className="flex items-center gap-3">
//                     <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Select Date:</label>
//                     <input
//                         type="date"
//                         value={date}
//                         onChange={(e) => setDate(e.target.value)}
//                         className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 focus:outline-none transition-all cursor-pointer shadow-2xs"
//                     />
//                 </div>
//                 <p className="text-xs font-semibold text-slate-400">
//                     Showing logs for <span className="font-bold text-slate-700">{new Date(date).toDateString()}</span>
//                 </p>
//             </div>

//             {/* Table */}
//             <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
//                 {loading ? (
//                     <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
//                         <RefreshCw size={24} className="animate-spin text-indigo-600" />
//                         <p className="text-xs font-semibold text-slate-500">Fetching attendance logs...</p>
//                     </div>
//                 ) : records.length === 0 ? (
//                     <div className="text-center py-20 text-slate-400">
//                         <Calendar size={40} className="mx-auto text-slate-300 mb-3 stroke-[1.5]" />
//                         <p className="font-bold text-slate-700 text-sm">No attendance logs found for this date</p>
//                         <p className="text-xs text-slate-400 mt-1 font-medium">Select a different date or punch in to record attendance.</p>
//                     </div>
//                 ) : (
//                     <div className="overflow-x-auto">
//                         <Table columns={columns} data={records} />
//                     </div>
//                 )}
//             </div>
//         </div>
//     );
// }