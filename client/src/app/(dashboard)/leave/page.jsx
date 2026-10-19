"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
    Clock,
    CheckCircle2,
    XCircle,
    AlertCircle,
    RefreshCw,
    Users,
    User as UserIcon,
    CalendarCheck,
    CalendarDays,
    CalendarClock,
    Loader2,
    Check,
    X,
} from "lucide-react";
import { toast } from "react-toastify";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

/* -------------------------------------------------------------------------- */
/* CONSTANTS & HELPERS                                                        */
/* -------------------------------------------------------------------------- */

/* These roles can switch to the Team view. Everyone else sees only their own leave data. */
const PRIVILEGED_ROLES = ["admin", "hr", "manager"];

/* These roles can approve or reject (the server checks this again) */
const DECIDER_ROLES = ["admin", "hr", "manager"];

const LIST_LIMIT = 5;
const REFRESH_MS = 60 * 1000;

const lower = (v) => String(v || "").trim().toLowerCase();

/* Safe text: a populated field can be an object */
const text = (v) => {
    if (!v) return "";
    if (typeof v === "object") return String(v.title || v.name || v.label || "");
    return String(v);
};

const parseDate = (v) => {
    if (!v) return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
};

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

const formatDay = (d, withYear) =>
    d.toLocaleDateString("en-IN", { day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}) });

const formatRange = (leave) => {
    const s = parseDate(leave.startDate);
    const e = parseDate(leave.endDate);
    if (!s) return "";
    const year = new Date().getFullYear();
    const withYear = s.getFullYear() !== year || Boolean(e && e.getFullYear() !== year);
    if (!e || startOfDay(s) === startOfDay(e)) return formatDay(s, withYear);
    return `${formatDay(s, withYear)} – ${formatDay(e, withYear)}`;
};

const leaveDays = (leave) => {
    const n = Number(leave.totalDays ?? leave.days ?? leave.numberOfDays);
    if (Number.isFinite(n) && n > 0) return n;
    const s = parseDate(leave.startDate);
    const e = parseDate(leave.endDate);
    if (s && e) return Math.max(1, Math.round((startOfDay(e) - startOfDay(s)) / 86400000) + 1);
    return 1;
};

const leaveType = (leave) => text(leave.leaveType || leave.type) || "Leave";

const initialOf = (name) => (String(name || "S").trim().charAt(0) || "S").toUpperCase();

/* Works with [..], { data: [..] }, { leaves: [..] } */
const extractArray = (res) => {
    const d = res?.data;
    if (Array.isArray(d)) return d;
    if (Array.isArray(d?.data)) return d.data;
    if (Array.isArray(d?.leaves)) return d.leaves;
    if (Array.isArray(d?.records)) return d.records;
    if (Array.isArray(d?.requests)) return d.requests;
    return [];
};

const getEmployeeName = (item) => {
    const target = item.employee || item.user || {};
    if (typeof target === "object" && target !== null) {
        return text(target.name || target.fullName || target.username) || text(item.employeeName || item.userName) || "Staff Member";
    }
    return text(item.employeeName || item.userName) || "Staff Member";
};

const getEmployeeRole = (item) => {
    const target = item.employee || item.user || {};
    if (typeof target === "object" && target !== null) {
        return text(target.designation || target.department || target.role || item.department) || "Staff";
    }
    return text(item.department) || "Staff";
};

/* Every id and name that identifies the logged-in person */
const getIdentity = (user) => {
    const ids = new Set();
    const add = (v) => {
        if (!v) return;
        const value = typeof v === "object" ? v._id || v.id || v.employeeId || "" : v;
        if (value) ids.add(String(value));
    };
    add(user?._id);
    add(user?.id);
    add(user?.employee);
    add(user?.employeeId);
    return { ids, name: lower(user?.name || user?.username || user?.employee?.name) };
};

/* Is this leave of the logged-in person? (a person cannot approve their own leave) */
const isMine = (leave, identity) => {
    const target = leave.employee ?? leave.user ?? null;
    const candidates = target && typeof target === "object" ? [target._id, target.id, target.employeeId] : [target];
    candidates.push(leave.employeeId, leave.userId);
    if (candidates.some((c) => c && identity.ids.has(String(c)))) return true;
    const name = lower(getEmployeeName(leave));
    return Boolean(identity.name && name && name !== "staff member" && name === identity.name);
};

/* -------------------------------------------------------------------------- */
/* MAIN PAGE                                                                  */
/* -------------------------------------------------------------------------- */

export default function LeaveDashboard() {
    const { user, loading: authLoading } = useAuth();

    const [view, setView] = useState("team"); // "team" | "me" (only admin, HR and managers can switch)
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [updatedAt, setUpdatedAt] = useState(null);
    const [showAllPending, setShowAllPending] = useState(false);

    const [busyId, setBusyId] = useState("");
    const [rejectTarget, setRejectTarget] = useState(null);
    const [rejectReason, setRejectReason] = useState("");

    const ticket = useRef(0);

    const currentRole = useMemo(() => {
        if (!user) return null;
        const rawRole = user.role || user.userRole || user.type;
        if (typeof rawRole === "string") return rawRole.toLowerCase().trim();
        if (typeof rawRole === "object" && rawRole !== null) return (rawRole.name || rawRole.title || "").toLowerCase().trim();
        return null;
    }, [user]);

    const isPrivileged = Boolean(currentRole && PRIVILEGED_ROLES.includes(currentRole));
    const canDecide = Boolean(currentRole && DECIDER_ROLES.includes(currentRole));
    const scope = isPrivileged && view === "team" ? "team" : "me";
    const isTeam = scope === "team";
    const identity = useMemo(() => getIdentity(user), [user]);

    /*
     * The server already limits the data by role:
     *   /leave           admin and HR get everyone, a manager gets the team
     *   /leave/my-leaves only the leaves of the logged-in person
     */
    const fetchLeaves = useCallback(
        async ({ silent = false, background = false } = {}) => {
            if (!user) return;
            const mine = ++ticket.current;
            if (!background) {
                if (silent) setRefreshing(true);
                else setLoading(true);
            }
            try {
                const res = await api.get(scope === "team" ? "/leave" : "/leave/my-leaves");
                if (mine !== ticket.current) return; // a newer request has already been made
                setLeaves(extractArray(res));
                setUpdatedAt(new Date());
                setError(null);
            } catch (err) {
                if (mine !== ticket.current) return;
                console.error("Leave dashboard fetch error:", err);
                const status = err?.response?.status;
                if (!background) {
                    setError(
                        status === 401
                            ? "Your session has expired. Please log in again."
                            : status === 403
                                ? "You do not have the required permissions to view leave metrics."
                                : status === 404
                                    ? "The leave service was not found on the server. Please make sure the backend is updated and restarted."
                                    : err?.response?.data?.message || "Failed to synchronize data from the server."
                    );
                }
            } finally {
                if (mine === ticket.current) {
                    setLoading(false);
                    setRefreshing(false);
                }
            }
        },
        [user, scope]
    );

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            setLoading(false);
            setError("Your session has expired. Please log in again.");
            return;
        }
        setLeaves([]);
        fetchLeaves();
    }, [authLoading, user, scope, fetchLeaves]);

    /* Fresh data every minute and when the tab is opened again */
    useEffect(() => {
        if (!user) return undefined;
        const refresh = () => document.visibilityState === "visible" && fetchLeaves({ background: true });
        const timer = setInterval(refresh, REFRESH_MS);
        document.addEventListener("visibilitychange", refresh);
        return () => {
            clearInterval(timer);
            document.removeEventListener("visibilitychange", refresh);
        };
    }, [user, fetchLeaves]);

    /* Escape closes the reject dialog, and the page does not scroll behind it */
    useEffect(() => {
        if (!rejectTarget) return undefined;
        const onKey = (e) => e.key === "Escape" && !busyId && setRejectTarget(null);
        const previous = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = previous;
            window.removeEventListener("keydown", onKey);
        };
    }, [rejectTarget, busyId]);

    const stats = useMemo(() => {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const today = startOfDay(now);

        const byStatus = (s) => leaves.filter((l) => lower(l.status) === s);
        const approved = byStatus("approved");
        const pending = byStatus("pending");
        const rejected = byStatus("rejected");

        const startOf = (l) => {
            const d = parseDate(l.startDate);
            return d ? startOfDay(d) : 0;
        };
        const endOf = (l) => {
            const d = parseDate(l.endDate);
            return d ? startOfDay(d) : 0;
        };
        const createdOf = (l) => parseDate(l.createdAt || l.appliedOn || l.appliedAt)?.getTime() || 0;

        const onLeaveToday = approved.filter((l) => l.startDate && l.endDate && startOf(l) <= today && today <= endOf(l));

        const upcoming = approved.filter((l) => l.endDate && endOf(l) >= today).sort((a, b) => startOf(a) - startOf(b));

        const approvedThisMonth = approved.filter((l) => {
            const d = parseDate(l.approvedOn || l.updatedAt || l.startDate);
            return d && d.getMonth() === month && d.getFullYear() === year;
        }).length;

        const rejectedThisYear = rejected.filter((l) => {
            const d = parseDate(l.updatedAt || l.startDate);
            return !d || d.getFullYear() === year;
        }).length;

        const daysTaken = approved
            .filter((l) => {
                const s = parseDate(l.startDate);
                return s && s.getFullYear() === year && startOf(l) <= today;
            })
            .reduce((sum, l) => sum + leaveDays(l), 0);

        return {
            onLeaveTodayCount: onLeaveToday.length,
            todayList: onLeaveToday.slice(0, LIST_LIMIT),
            upcomingCount: upcoming.length,
            upcomingList: upcoming.slice(0, LIST_LIMIT),
            pendingCount: pending.length,
            pendingAll: [...pending].sort((a, b) => createdOf(b) - createdOf(a)),
            approvedThisMonth,
            rejectedThisYear,
            daysTaken,
            today,
        };
    }, [leaves]);

    const pendingList = isTeam && showAllPending ? stats.pendingAll : stats.pendingAll.slice(0, LIST_LIMIT);

    /* ---- approve and reject ---- */
    const approve = async (leave) => {
        const id = String(leave._id || leave.id || "");
        if (!id || busyId) return;
        setBusyId(id);
        try {
            await api.put(`/leave/${id}/approve`);
            toast.success(`Leave of ${getEmployeeName(leave)} approved.`);
            await fetchLeaves({ background: true });
        } catch (err) {
            toast.error(err?.response?.data?.message || "Unable to approve this leave.");
        } finally {
            setBusyId("");
        }
    };

    const openReject = (leave) => {
        setRejectReason("");
        setRejectTarget(leave);
    };

    const confirmReject = async () => {
        if (!rejectTarget || busyId) return;
        const id = String(rejectTarget._id || rejectTarget.id || "");
        setBusyId(id);
        try {
            await api.put(`/leave/${id}/reject`, { rejectionReason: rejectReason.trim() });
            toast.success(`Leave of ${getEmployeeName(rejectTarget)} rejected.`);
            setRejectTarget(null);
            await fetchLeaves({ background: true });
        } catch (err) {
            toast.error(err?.response?.data?.message || "Unable to reject this leave.");
        } finally {
            setBusyId("");
        }
    };

    if (authLoading) {
        return (
            <div className="w-full min-h-[400px] flex flex-col items-center justify-center gap-3">
                <Loader2 size={32} className="animate-spin text-indigo-600" />
                <p className="text-xs font-bold tracking-wider text-slate-600 uppercase">Verifying permissions...</p>
            </div>
        );
    }

    return (
        <div className="w-full min-w-0 space-y-4 sm:space-y-6 max-w-7xl mx-auto px-3 sm:px-4 lg:px-0 pb-10 font-sans">
            {/* Header bar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                        <h1 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight">
                            {isTeam ? "Leave & Attendance Intelligence" : "My Leave Overview"}
                        </h1>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase tracking-wider">
                            {currentRole || "employee"}
                        </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1">
                        {isTeam
                            ? "Real-time tracking of staff availability, pending approvals, and monthly utilization."
                            : "Your leave requests, approvals and upcoming time off in one place."}
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 w-full lg:w-auto">
                    {isPrivileged && (
                        <div role="tablist" aria-label="Leave data view" className="inline-flex w-full sm:w-auto rounded-xl bg-slate-100 border border-slate-200 p-1">
                            {[
                                ["team", "Team", Users],
                                ["me", "My Leaves", UserIcon],
                            ].map(([key, label, Icon]) => (
                                <button
                                    key={key}
                                    type="button"
                                    role="tab"
                                    aria-selected={view === key}
                                    onClick={() => setView(key)}
                                    className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${view === key ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
                                        }`}
                                >
                                    <Icon className="w-3.5 h-3.5" /> {label}
                                </button>
                            ))}
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={() => fetchLeaves({ silent: true })}
                        disabled={loading || refreshing}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 active:scale-95 border border-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 disabled:opacity-50 cursor-pointer"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading || refreshing ? "animate-spin text-indigo-600" : "text-slate-500"}`} />
                        <span>{loading || refreshing ? "Syncing..." : "Refresh"}</span>
                    </button>
                </div>
            </div>

            {updatedAt && !error && (
                <p className="text-[11px] font-medium text-slate-400 px-1 -mt-2 sm:-mt-3">
                    Last updated {updatedAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                </p>
            )}

            {/* Error state */}
            {error && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl">
                    <div className="flex items-center gap-3 min-w-0">
                        <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                        <p className="text-xs sm:text-sm font-medium">{error}</p>
                    </div>
                    {user && (
                        <button
                            type="button"
                            onClick={() => fetchLeaves()}
                            className="px-3.5 py-1.5 bg-white text-rose-700 text-xs font-semibold rounded-lg border border-rose-200 hover:bg-rose-100/50 transition-colors self-end sm:self-auto cursor-pointer"
                        >
                            Retry
                        </button>
                    )}
                </div>
            )}

            {/* Metric cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
                {isTeam ? (
                    <MetricCard label="On Leave Today" value={stats.onLeaveTodayCount} icon={<Users className="w-5 h-5 text-blue-600" />} badgeBg="bg-blue-50" subtext="Active out-of-office staff" loading={loading} />
                ) : (
                    <MetricCard label="Days Taken" value={stats.daysTaken} icon={<CalendarDays className="w-5 h-5 text-blue-600" />} badgeBg="bg-blue-50" subtext="Approved leave this year" loading={loading} />
                )}
                <MetricCard
                    label={isTeam ? "Pending Approvals" : "Pending Requests"}
                    value={stats.pendingCount}
                    icon={<Clock className="w-5 h-5 text-amber-600" />}
                    badgeBg="bg-amber-50"
                    subtext={isTeam ? "Requires HR/Manager review" : "Waiting for approval"}
                    highlight={isTeam && stats.pendingCount > 0}
                    loading={loading}
                />
                <MetricCard label="Approved This Month" value={stats.approvedThisMonth} icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />} badgeBg="bg-emerald-50" subtext="Processed calendar month" loading={loading} />
                <MetricCard label="Rejected Requests" value={stats.rejectedThisYear} icon={<XCircle className="w-5 h-5 text-rose-600" />} badgeBg="bg-rose-50" subtext="Total declined (Yearly)" loading={loading} />
            </div>

            {/* Lists */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
                {isTeam ? (
                    <Panel
                        icon={<CalendarCheck className="w-4 h-4 text-blue-600" />}
                        title="Out of Office Today"
                        badge={`${stats.onLeaveTodayCount} ${stats.onLeaveTodayCount === 1 ? "Member" : "Members"}`}
                        badgeClass="text-slate-600 bg-slate-100"
                        hover="hover:border-indigo-200"
                        loading={loading}
                        empty={{ icon: CheckCircle2, tone: "text-emerald-500", text: "Full team operational. No employees are on leave today." }}
                        isEmpty={stats.todayList.length === 0}
                        more={stats.onLeaveTodayCount - stats.todayList.length}
                    >
                        {stats.todayList.map((l, i) => {
                            const name = getEmployeeName(l);
                            return (
                                <Row key={l._id || l.id || i} tone="indigo">
                                    <Avatar letter={initialOf(name)} />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs sm:text-sm font-semibold text-slate-900 truncate">{name}</p>
                                        <p className="text-[11px] text-slate-500 truncate">
                                            {getEmployeeRole(l)} • {formatRange(l)}
                                        </p>
                                    </div>
                                    <Pill tone="blue">{leaveType(l)}</Pill>
                                </Row>
                            );
                        })}
                    </Panel>
                ) : (
                    <Panel
                        icon={<CalendarClock className="w-4 h-4 text-blue-600" />}
                        title="Upcoming Leaves"
                        badge={`${stats.upcomingCount} Approved`}
                        badgeClass="text-slate-600 bg-slate-100"
                        hover="hover:border-indigo-200"
                        loading={loading}
                        empty={{ icon: CalendarDays, tone: "text-slate-400", text: "No approved upcoming leaves." }}
                        isEmpty={stats.upcomingList.length === 0}
                        more={stats.upcomingCount - stats.upcomingList.length}
                    >
                        {stats.upcomingList.map((l, i) => {
                            const s = parseDate(l.startDate);
                            const onNow = Boolean(s && startOfDay(s) <= stats.today);
                            return (
                                <Row key={l._id || l.id || i} tone="indigo">
                                    <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                                        <CalendarDays className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs sm:text-sm font-semibold text-slate-900 truncate capitalize">{leaveType(l)}</p>
                                        <p className="text-[11px] text-slate-500 truncate">
                                            {formatRange(l)} • {leaveDays(l)} day(s)
                                        </p>
                                    </div>
                                    <Pill tone={onNow ? "emerald" : "blue"}>{onNow ? "On leave now" : "Upcoming"}</Pill>
                                </Row>
                            );
                        })}
                    </Panel>
                )}

                <Panel
                    icon={<Clock className="w-4 h-4 text-amber-600" />}
                    title={isTeam ? "Pending Approvals Queue" : "My Pending Requests"}
                    badge={`${stats.pendingCount} pending`}
                    badgeClass="text-amber-700 bg-amber-50 border border-amber-200"
                    hover="hover:border-amber-200"
                    loading={loading}
                    empty={{
                        icon: CheckCircle2,
                        tone: "text-emerald-500",
                        text: isTeam ? "All caught up. There are no pending leave requests to review." : "You have no pending leave requests.",
                    }}
                    isEmpty={pendingList.length === 0}
                    more={isTeam ? 0 : stats.pendingCount - pendingList.length}
                    footer={
                        isTeam && stats.pendingCount > LIST_LIMIT ? (
                            <button
                                type="button"
                                onClick={() => setShowAllPending((s) => !s)}
                                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                            >
                                {showAllPending ? "Show less" : `Show all ${stats.pendingCount} requests`}
                            </button>
                        ) : null
                    }
                >
                    {pendingList.map((l, i) => {
                        const id = String(l._id || l.id || "");
                        const name = getEmployeeName(l);
                        const reason = text(l.reason);
                        const mine = isMine(l, identity);
                        const showActions = isTeam && canDecide && (!mine || currentRole === "admin");
                        const busy = busyId === id;

                        return (
                            <div key={id || i} className="py-3 sm:py-3.5 px-2 sm:px-3 rounded-xl transition-colors duration-200 hover:bg-amber-50/40">
                                <div className="flex items-center gap-3">
                                    {isTeam && <Avatar letter={initialOf(name)} />}
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs sm:text-sm font-semibold text-slate-900 truncate capitalize">{isTeam ? name : leaveType(l)}</p>
                                        <p className="text-[11px] text-slate-500 truncate capitalize">
                                            {isTeam ? `${leaveType(l)} • ` : ""}
                                            {formatRange(l)} • {leaveDays(l)} day(s)
                                        </p>
                                    </div>
                                    {!showActions && (
                                        <Pill tone="amber">
                                            {isTeam ? (
                                                mine ? "Your request" : (
                                                    <>
                                                        <span className="hidden sm:inline">Action Required</span>
                                                        <span className="sm:hidden">Review</span>
                                                    </>
                                                )
                                            ) : (
                                                <>
                                                    <span className="hidden sm:inline">Awaiting Approval</span>
                                                    <span className="sm:hidden">Pending</span>
                                                </>
                                            )}
                                        </Pill>
                                    )}
                                </div>

                                {isTeam && reason && (
                                    <p className="mt-2 text-[11px] text-slate-500 bg-slate-50 rounded-lg px-3 py-1.5 line-clamp-2 break-words">
                                        <b className="text-slate-600">Reason:</b> {reason}
                                    </p>
                                )}

                                {showActions && (
                                    <div className="mt-2.5 grid grid-cols-2 gap-2 sm:flex sm:justify-end">
                                        <button
                                            type="button"
                                            onClick={() => openReject(l)}
                                            disabled={Boolean(busyId)}
                                            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <X size={13} /> Reject
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => approve(l)}
                                            disabled={Boolean(busyId)}
                                            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                                            Approve
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </Panel>
            </div>

            {/* Reject dialog (bottom sheet on mobile) */}
            {rejectTarget && (
                <div
                    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-slate-900/50 backdrop-blur-sm"
                    onClick={() => !busyId && setRejectTarget(null)}
                >
                    <div
                        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 p-5 sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start gap-3.5">
                            <div className="w-11 h-11 shrink-0 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center">
                                <XCircle size={20} />
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-base font-bold text-slate-900">Reject this leave?</h3>
                                <p className="text-xs text-slate-500 mt-1">The employee will be notified with your reason.</p>
                            </div>
                        </div>

                        <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-xs space-y-0.5">
                            <p className="font-bold text-slate-900">{getEmployeeName(rejectTarget)}</p>
                            <p className="text-slate-600 capitalize">
                                {leaveType(rejectTarget)} • {formatRange(rejectTarget)} • {leaveDays(rejectTarget)} day(s)
                            </p>
                        </div>

                        <label className="block mt-4 text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Reason (optional)</label>
                        <textarea
                            rows={3}
                            maxLength={300}
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="e.g. Project deadline, please apply for another date"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-sm text-slate-800 placeholder:text-slate-400 outline-none resize-none transition focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                        />
                        <p className="text-right text-[11px] text-slate-400 mt-1">{rejectReason.length}/300</p>

                        <div className="mt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
                            <button
                                type="button"
                                onClick={() => setRejectTarget(null)}
                                disabled={Boolean(busyId)}
                                className="px-5 py-3 sm:py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmReject}
                                disabled={Boolean(busyId)}
                                className="inline-flex items-center justify-center gap-2 px-6 py-3 sm:py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md shadow-rose-600/20 transition cursor-pointer disabled:opacity-60"
                            >
                                {busyId ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                                {busyId ? "Rejecting..." : "Reject Leave"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* SMALL COMPONENTS                                                           */
/* -------------------------------------------------------------------------- */

function Avatar({ letter }) {
    return (
        <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700 shrink-0">
            {letter}
        </div>
    );
}

const PILL_TONES = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
};

function Pill({ tone = "blue", children }) {
    return (
        <span className={`shrink-0 whitespace-nowrap px-2.5 py-1 rounded-md text-[10px] sm:text-[11px] font-semibold border capitalize ${PILL_TONES[tone]}`}>
            {children}
        </span>
    );
}

function Row({ tone = "indigo", children }) {
    return (
        <div
            className={`py-3 sm:py-3.5 px-2 sm:px-3 flex items-center gap-3 rounded-xl transition-colors duration-200 ${tone === "amber" ? "hover:bg-amber-50/40" : "hover:bg-indigo-50/40"
                }`}
        >
            {children}
        </div>
    );
}

function Panel({ icon, title, badge, badgeClass, hover, loading, isEmpty, empty, more = 0, footer = null, children }) {
    const EmptyIcon = empty.icon;
    return (
        <div className={`min-w-0 bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-sm transition-all duration-300 hover:shadow-lg ${hover}`}>
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="shrink-0">{icon}</span>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider truncate">{title}</h3>
                </div>
                <span className={`shrink-0 text-xs font-semibold px-2.5 py-0.5 rounded-full ${badgeClass}`}>{badge}</span>
            </div>

            <div className="mt-3 sm:mt-4 divide-y divide-slate-100">
                {loading ? (
                    <div className="space-y-3 py-2">
                        {[0, 1, 2].map((n) => (
                            <div key={n} className="flex items-center gap-3 px-2">
                                <div className="w-9 h-9 rounded-full bg-slate-100 animate-pulse" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-3 w-1/2 bg-slate-100 animate-pulse rounded" />
                                    <div className="h-2.5 w-1/3 bg-slate-100 animate-pulse rounded" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : isEmpty ? (
                    <div className="py-10 flex flex-col items-center gap-2 text-center px-4">
                        <EmptyIcon className={`w-7 h-7 ${empty.tone}`} />
                        <p className="text-xs text-slate-500 font-medium max-w-xs">{empty.text}</p>
                    </div>
                ) : (
                    children
                )}
            </div>

            {!loading && more > 0 && <p className="mt-3 text-center text-[11px] font-semibold text-slate-400">+{more} more</p>}
            {!loading && footer && <div className="mt-3 pt-3 border-t border-slate-100 text-center">{footer}</div>}
        </div>
    );
}

function MetricCard({ label, value, icon, badgeBg, subtext, highlight = false, loading = false }) {
    return (
        <div
            className={`min-w-0 bg-white border rounded-2xl p-4 sm:p-5 shadow-sm transition-all duration-300 hover:shadow-lg sm:hover:-translate-y-1 group ${highlight ? "border-amber-300 ring-2 ring-amber-500/10" : "border-slate-200/90 hover:border-indigo-300"
                }`}
        >
            <div className="flex items-start justify-between gap-2">
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider group-hover:text-indigo-600 transition-colors leading-snug">
                    {label}
                </span>
                <div className={`p-2 sm:p-2.5 rounded-xl shrink-0 ${badgeBg} transition-transform duration-300 group-hover:scale-110`}>{icon}</div>
            </div>

            <div className="mt-2 sm:mt-3">
                {loading ? (
                    <div className="h-8 w-16 bg-slate-100 animate-pulse rounded-lg mt-1" />
                ) : (
                    <div className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">{Number(value).toLocaleString()}</div>
                )}
                <p className="text-[10px] sm:text-[11px] font-medium text-slate-500 mt-1 leading-snug">{subtext}</p>
            </div>
        </div>
    );
}