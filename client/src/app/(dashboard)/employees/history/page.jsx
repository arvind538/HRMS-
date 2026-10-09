"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
    History,
    Clock,
    RefreshCw,
    Loader2,
    ShieldAlert,
    Activity,
    Eye,
    X,
    Search,
    ChevronRight,
    ChevronDown,
    Database,
    UserCheck,
    User,
    ShieldCheck,
} from "lucide-react";
import api from "@/lib/api";

/* -------------------------------------------------------------------------- */
/* CONSTANTS & HELPERS                                                        */
/* -------------------------------------------------------------------------- */

const PAGE_SIZE = 30;
const DUPLICATE_WINDOW_MS = 10 * 1000; // same action within 10 seconds = duplicate
const SENSITIVE_KEY = /password|token|secret|hash|accountnumber|nationalid|idproof|ifsc/i;

/* Hides sensitive values and heavy file data before showing the raw payload */
const sanitizePayload = (value, depth = 0) => {
    if (value === null || value === undefined) return value;
    if (typeof value === "string") {
        if (value.startsWith("data:")) return "[file data hidden]";
        return value.length > 300 ? `${value.slice(0, 300)}…` : value;
    }
    if (typeof value !== "object") return value;
    if (depth > 6) return "[nested data hidden]";
    if (Array.isArray(value)) return value.map((v) => sanitizePayload(v, depth + 1));

    const out = {};
    Object.entries(value).forEach(([key, val]) => {
        if (key === "__v") return;
        out[key] = SENSITIVE_KEY.test(key) ? "[hidden]" : sanitizePayload(val, depth + 1);
    });
    return out;
};

const toDate = (value) => {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
};

const formatDate = (d, withYear = true) =>
    d
        ? d.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            ...(withYear ? { year: "numeric" } : {}),
        })
        : "—";

const formatTime = (d, withSeconds = false) =>
    d
        ? d.toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            ...(withSeconds ? { second: "2-digit" } : {}),
        })
        : "—";

/* Converts a raw log into one clean, predictable shape */
const normalizeLog = (log) => {
    const rawAction = String(log.action || log.description || "Updated employee record").trim();

    let actionLabel = rawAction;
    let actionTarget = "";
    if (rawAction.includes(":")) {
        const [head, ...rest] = rawAction.split(":");
        actionLabel = head.trim() || rawAction;
        actionTarget = rest.join(":").trim();
    }

    const explicitTarget = [log.targetEmployee, log.target].find(
        (t) => typeof t === "string" && t.trim() && t !== "General Record"
    );
    const target = String(explicitTarget || actionTarget || "Workforce Member").trim();

    const rawName = log.user?.name || log.userName || log.createdBy?.name || "";
    const lowerName = String(rawName).trim().toLowerCase();
    const executor =
        !lowerName || lowerName === "system" || lowerName === "system operator"
            ? "Administrator"
            : String(rawName).trim();

    return {
        raw: log,
        id: String(log._id || log.id || ""),
        executor,
        executorEmail: log.user?.email || "",
        executorAvatar: log.user?.avatar || log.user?.photo || "",
        action: actionLabel,
        target,
        date: toDate(log.createdAt || log.timestamp),
        module: log.module || "Employee",
    };
};

/* Removes duplicate logs: same ID, or same executor + action + target within 10 seconds */
const dedupeLogs = (logs) => {
    const sorted = [...logs].sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));
    const seenIds = new Set();
    const lastSeen = new Map();
    const result = [];

    sorted.forEach((log) => {
        if (log.id) {
            if (seenIds.has(log.id)) return;
            seenIds.add(log.id);
        }

        const signature = `${log.executor}|${log.action}|${log.target}`.toLowerCase();
        const time = log.date?.getTime() || 0;
        const previous = lastSeen.get(signature);
        if (previous !== undefined && time && Math.abs(previous - time) < DUPLICATE_WINDOW_MS) return;

        lastSeen.set(signature, time);
        result.push(log);
    });

    return result;
};

const getActionBadge = (action = "") => {
    const act = String(action).toLowerCase();
    if (act.includes("created") || act.includes("add") || act.includes("register")) {
        return "bg-emerald-50 text-emerald-700 border-emerald-200/80";
    }
    if (act.includes("updated") || act.includes("edit") || act.includes("modify")) {
        return "bg-indigo-50 text-indigo-700 border-indigo-200/80";
    }
    if (act.includes("exit") || act.includes("delete") || act.includes("terminate")) {
        return "bg-amber-50 text-amber-700 border-amber-200/80";
    }
    return "bg-slate-100 text-slate-700 border-slate-200";
};

/* -------------------------------------------------------------------------- */
/* SUB-COMPONENTS                                                             */
/* -------------------------------------------------------------------------- */

function Avatar({ src, name, size = "w-9 h-9", textSize = "text-xs", iconSize = 14, useIcon = false }) {
    const [failed, setFailed] = useState(false);
    const showImage = src && !failed;

    return (
        <div
            className={`${size} rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0`}
        >
            {showImage ? (
                <img
                    src={src}
                    alt={name}
                    onError={() => setFailed(true)}
                    className="w-full h-full object-cover"
                />
            ) : useIcon ? (
                <User size={iconSize} className="text-slate-400" />
            ) : (
                <span className={`font-bold text-indigo-700 ${textSize}`}>
                    {String(name || "?").charAt(0).toUpperCase()}
                </span>
            )}
        </div>
    );
}

function ActionBadge({ action, className = "" }) {
    return (
        <span
            title={action}
            className={`inline-flex items-center max-w-full px-2.5 py-1 rounded-full text-[11px] font-bold border ${getActionBadge(
                action
            )} ${className}`}
        >
            <span className="truncate">{action}</span>
        </span>
    );
}

/* -------------------------------------------------------------------------- */
/* MAIN PAGE                                                                  */
/* -------------------------------------------------------------------------- */

export default function EmployeeHistoryPage() {
    const [historyLogs, setHistoryLogs] = useState([]);
    const [employeesMap, setEmployeesMap] = useState({});
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);

    const [searchQuery, setSearchQuery] = useState("");
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
    const [selectedLog, setSelectedLog] = useState(null);

    /* Loads employee avatars (never blocks the page if it fails) */
    const fetchEmployeeAvatars = async () => {
        try {
            const res = await api.get("/employees");
            const empList = Array.isArray(res?.data)
                ? res.data
                : res?.data?.employees || res?.data?.data || [];

            const map = {};
            empList.forEach((emp) => {
                const avatar = emp.avatar || emp.photo || null;
                if (!avatar) return;

                const id = String(emp._id || emp.id || "");
                const nameKey = (emp.name || `${emp.firstName || ""} ${emp.lastName || ""}`)
                    .trim()
                    .toLowerCase();
                const codeKey = String(emp.employeeId || "").trim().toLowerCase();

                if (id) map[id] = avatar;
                if (nameKey) map[nameKey] = avatar;
                if (codeKey) map[codeKey] = avatar;
            });

            try {
                const localAvatars = JSON.parse(localStorage.getItem("4ps_emp_avatars") || "{}");
                Object.entries(localAvatars).forEach(([k, v]) => {
                    if (v) map[String(k).toLowerCase()] = v;
                });
            } catch { }

            setEmployeesMap(map);
        } catch (e) {
            console.warn("Avatar mapping fetch skipped:", e);
        }
    };

    const fetchHistory = useCallback(async (isManual = false) => {
        if (isManual) setRefreshing(true);
        else setLoading(true);

        setError(null);
        try {
            // Both requests run in parallel for a faster load
            const [, res] = await Promise.all([
                fetchEmployeeAvatars(),
                api.get("/users/activity-logs", { params: { module: "Employee" } }),
            ]);

            const dataList = Array.isArray(res?.data)
                ? res.data
                : res?.data?.logs || res?.data?.data || [];

            setHistoryLogs(Array.isArray(dataList) ? dataList : []);
        } catch (err) {
            console.error("History fetch error:", err);
            if (err.response?.status === 403) {
                setError("Access restricted. Only administrators can view employee audit records.");
            } else {
                setError(
                    err.response?.data?.message ||
                    "Unable to load the audit history. Please try again."
                );
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    /* Lock page scroll and support the Escape key while the modal is open */
    useEffect(() => {
        if (!selectedLog) return;
        const onKey = (e) => e.key === "Escape" && setSelectedLog(null);
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener("keydown", onKey);
        };
    }, [selectedLog]);

    const findAvatar = useCallback(
        (value) => {
            if (!value) return "";
            return employeesMap[String(value).trim().toLowerCase()] || employeesMap[String(value)] || "";
        },
        [employeesMap]
    );

    /* Normalize -> remove duplicates -> attach avatars */
    const logs = useMemo(() => {
        const unique = dedupeLogs(historyLogs.map(normalizeLog));
        return unique.map((log, index) => ({
            ...log,
            key: log.id || `${log.executor}-${log.action}-${log.target}-${index}`,
            executorAvatar: log.executorAvatar || findAvatar(log.executor),
            targetAvatar: findAvatar(log.target),
        }));
    }, [historyLogs, findAvatar]);

    const filteredLogs = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return logs;
        return logs.filter(
            (log) =>
                log.executor.toLowerCase().includes(q) ||
                log.action.toLowerCase().includes(q) ||
                log.target.toLowerCase().includes(q)
        );
    }, [logs, searchQuery]);

    const visibleLogs = filteredLogs.slice(0, visibleCount);
    const hasMore = filteredLogs.length > visibleCount;

    /* ---------------------------------------------------------------------- */
    /* LOADING STATE                                                          */
    /* ---------------------------------------------------------------------- */

    if (loading) {
        return (
            <div className="w-full min-h-[500px] flex flex-col items-center justify-center gap-3">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                    <Loader2 size={26} className="animate-spin text-indigo-600" />
                </div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Loading audit history...
                </p>
            </div>
        );
    }

    /* ---------------------------------------------------------------------- */
    /* PAGE                                                                   */
    /* ---------------------------------------------------------------------- */

    return (
        <div className="w-full max-w-full space-y-4 sm:space-y-5 pb-6 font-sans antialiased text-slate-900 overflow-x-hidden">
            {/* Header card */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shrink-0">
                        <History size={22} />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-slate-900">
                                Employee History & Audits
                            </h1>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                <ShieldCheck size={12} />
                                <span>Live Logs</span>
                            </span>
                        </div>
                        <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5">
                            A complete record of administrative actions and employee updates.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2.5 w-full lg:w-auto">
                    <div className="relative flex-1 lg:w-80">
                        <Search
                            size={15}
                            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                        />
                        <input
                            type="text"
                            placeholder="Search by executor, action or employee..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setVisibleCount(PAGE_SIZE);
                            }}
                            className="w-full pl-9 pr-9 py-2.5 bg-slate-50 hover:bg-white border border-slate-200 rounded-xl text-base sm:text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 outline-none transition"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchQuery("");
                                    setVisibleCount(PAGE_SIZE);
                                }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600"
                                aria-label="Clear search"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={() => fetchHistory(true)}
                        disabled={refreshing}
                        className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-700 hover:text-indigo-600 transition disabled:opacity-50 active:scale-95 shrink-0"
                        title="Refresh logs"
                        aria-label="Refresh logs"
                    >
                        <RefreshCw size={16} className={refreshing ? "animate-spin text-indigo-600" : ""} />
                    </button>
                </div>
            </div>

            {/* Error alert */}
            {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm p-4 rounded-2xl flex items-start gap-3">
                    <ShieldAlert size={18} className="shrink-0 text-rose-600 mt-0.5" />
                    <span className="font-semibold">{error}</span>
                </div>
            )}

            {/* Logs list */}
            {!error && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    {/* Count bar */}
                    <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-slate-100 bg-slate-50/60">
                        <p className="text-xs font-semibold text-slate-500">
                            Showing{" "}
                            <span className="text-slate-900 font-bold">{visibleLogs.length}</span> of{" "}
                            <span className="text-slate-900 font-bold">{filteredLogs.length}</span> records
                        </p>
                        {refreshing && (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-indigo-600">
                                <Loader2 size={12} className="animate-spin" /> Updating
                            </span>
                        )}
                    </div>

                    {filteredLogs.length === 0 ? (
                        <div className="p-12 sm:p-16 text-center text-slate-400 space-y-2.5">
                            <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
                                <Activity size={22} />
                            </div>
                            <p className="text-sm font-bold text-slate-800">No activity logs found</p>
                            <p className="text-xs text-slate-400 max-w-sm mx-auto font-medium">
                                {searchQuery
                                    ? "No records match your search. Try a different keyword."
                                    : "There are no employee activity records yet."}
                            </p>
                        </div>
                    ) : (
                        /* One scroll area: vertical only, never horizontal */
                        <div className="max-h-[calc(100dvh-22rem)] lg:max-h-[calc(100dvh-17rem)] min-h-[320px] overflow-y-auto overflow-x-hidden overscroll-contain">
                            {/* Mobile + tablet: cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 sm:p-4 lg:hidden">
                                {visibleLogs.map((log) => (
                                    <div
                                        key={log.key}
                                        onClick={() => setSelectedLog(log)}
                                        className="min-w-0 bg-white hover:bg-indigo-50/40 p-4 rounded-xl border border-slate-200 hover:border-indigo-200 transition space-y-3 cursor-pointer"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <Avatar
                                                    src={log.executorAvatar}
                                                    name={log.executor}
                                                    size="w-8 h-8"
                                                />
                                                <div className="min-w-0">
                                                    <span className="text-xs font-bold text-slate-900 truncate block">
                                                        {log.executor}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400">Executor</span>
                                                </div>
                                            </div>
                                            <ActionBadge action={log.action} className="shrink min-w-0" />
                                        </div>

                                        <div className="flex items-center justify-between gap-3 text-xs pt-3 border-t border-slate-100">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <Avatar
                                                    src={log.targetAvatar}
                                                    name={log.target}
                                                    size="w-6 h-6"
                                                    iconSize={12}
                                                    useIcon
                                                />
                                                <span className="font-semibold text-slate-800 truncate">
                                                    {log.target}
                                                </span>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="text-[11px] font-mono text-slate-600">
                                                    {formatDate(log.date, false)}
                                                </p>
                                                <p className="text-[10px] font-mono text-slate-400">
                                                    {formatTime(log.date)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Desktop: fixed-layout table (fits the width, no bottom scrollbar) */}
                            <table className="hidden lg:table w-full table-fixed border-collapse text-left">
                                <colgroup>
                                    <col className="w-[19%]" />
                                    <col className="w-[25%]" />
                                    <col className="w-[20%]" />
                                    <col className="w-[26%]" />
                                    <col className="w-[10%]" />
                                </colgroup>
                                <thead className="sticky top-0 z-10">
                                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                        <th className="py-3.5 px-5">Timestamp</th>
                                        <th className="py-3.5 px-5">Executor</th>
                                        <th className="py-3.5 px-5">Action</th>
                                        <th className="py-3.5 px-5">Employee</th>
                                        <th className="py-3.5 px-5 text-right">Details</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                                    {visibleLogs.map((log) => (
                                        <tr
                                            key={log.key}
                                            onClick={() => setSelectedLog(log)}
                                            className="group hover:bg-slate-50/80 transition-colors cursor-pointer"
                                        >
                                            <td className="py-3.5 px-5">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <Clock
                                                        size={14}
                                                        className="text-slate-400 group-hover:text-indigo-600 transition-colors shrink-0"
                                                    />
                                                    <div className="font-mono min-w-0">
                                                        <p className="text-[12px] text-slate-700 font-semibold truncate">
                                                            {formatDate(log.date)}
                                                        </p>
                                                        <p className="text-[11px] text-slate-400">
                                                            {formatTime(log.date)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="py-3.5 px-5">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <Avatar src={log.executorAvatar} name={log.executor} />
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                                                            {log.executor}
                                                        </p>
                                                        <p className="text-[10px] text-slate-400 uppercase font-mono">
                                                            Admin / Staff
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="py-3.5 px-5">
                                                <ActionBadge action={log.action} />
                                            </td>

                                            <td className="py-3.5 px-5">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <Avatar
                                                        src={log.targetAvatar}
                                                        name={log.target}
                                                        size="w-8 h-8"
                                                        iconSize={13}
                                                        useIcon
                                                    />
                                                    <span
                                                        title={log.target}
                                                        className="min-w-0 truncate px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200/80 text-slate-800 font-semibold text-xs"
                                                    >
                                                        {log.target}
                                                    </span>
                                                </div>
                                            </td>

                                            <td className="py-3.5 px-5 text-right">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedLog(log);
                                                    }}
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 group-hover:border-indigo-300 group-hover:text-indigo-600 text-xs font-semibold hover:bg-indigo-50 transition"
                                                >
                                                    <Eye size={13} />
                                                    <span>View</span>
                                                    <ChevronRight size={12} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Load more */}
                            {hasMore && (
                                <div className="p-4 flex justify-center border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition active:scale-95"
                                    >
                                        <ChevronDown size={14} />
                                        Load more ({filteredLogs.length - visibleCount} remaining)
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Detail modal (bottom sheet on mobile, centered on larger screens) */}
            {selectedLog && (
                <div
                    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-slate-900/50 backdrop-blur-sm"
                    onClick={() => setSelectedLog(null)}
                >
                    <div
                        className="w-full max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90dvh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal header */}
                        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                                    <Database size={18} />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm sm:text-base font-bold text-slate-900">
                                            Audit Record
                                        </h3>
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                                            VERIFIED
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 font-mono truncate">
                                        ID: {selectedLog.id || "—"}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedLog(null)}
                                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition shrink-0"
                                aria-label="Close"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Modal body */}
                        <div className="p-4 sm:p-6 overflow-y-auto overflow-x-hidden overscroll-contain space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 min-w-0">
                                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                                        Executor
                                    </span>
                                    <div className="flex items-center gap-2.5 mt-2.5 min-w-0">
                                        <Avatar src={selectedLog.executorAvatar} name={selectedLog.executor} />
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-slate-900 truncate">
                                                {selectedLog.executor}
                                            </p>
                                            <p className="text-[10px] font-mono text-slate-500 truncate">
                                                {selectedLog.executorEmail || "admin@system.local"}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 min-w-0">
                                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                                        Recorded At
                                    </span>
                                    <div className="flex items-center gap-2 text-slate-900 font-mono font-bold text-xs mt-3 flex-wrap">
                                        <Clock size={14} className="text-indigo-600 shrink-0" />
                                        <span>{formatTime(selectedLog.date, true)}</span>
                                        <span className="text-slate-300">•</span>
                                        <span className="text-slate-600 font-normal">
                                            {formatDate(selectedLog.date)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 rounded-2xl bg-indigo-50/40 border border-indigo-100 space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600">
                                        Audit Event
                                    </span>
                                    <span className="px-2 py-0.5 rounded-md bg-white border border-indigo-200 text-[10px] font-mono font-bold text-indigo-700">
                                        Module: {selectedLog.module}
                                    </span>
                                </div>
                                <p className="text-sm font-bold text-slate-900 break-words">{selectedLog.action}</p>
                                <div className="pt-2 border-t border-indigo-100/60 flex items-center gap-2.5 min-w-0">
                                    <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                                        {selectedLog.targetAvatar ? (
                                            <img
                                                src={selectedLog.targetAvatar}
                                                alt={selectedLog.target}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <UserCheck size={13} className="text-indigo-600" />
                                        )}
                                    </div>
                                    <span className="text-xs text-slate-600 font-medium shrink-0">Employee:</span>
                                    <span className="text-xs font-bold text-slate-900 truncate">
                                        {selectedLog.target}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                                    Raw Payload (sensitive data hidden)
                                </span>
                                <div className="p-3.5 rounded-2xl bg-slate-950 text-emerald-400 font-mono text-[11px] leading-relaxed max-h-56 overflow-y-auto overflow-x-hidden border border-slate-800">
                                    <pre className="whitespace-pre-wrap break-all">
                                        {JSON.stringify(sanitizePayload(selectedLog.raw), null, 2)}
                                    </pre>
                                </div>
                            </div>
                        </div>

                        {/* Modal footer */}
                        <div className="px-4 sm:px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end">
                            <button
                                type="button"
                                onClick={() => setSelectedLog(null)}
                                className="w-full sm:w-auto px-6 py-3 sm:py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition active:scale-95"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}