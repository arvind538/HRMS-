"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
    AlertCircle, ArrowUpRight, Briefcase, Building2, Calendar, CalendarCheck, CheckCircle2, Clock, Download, FileText, Headphones,
    Hourglass, ListChecks, Loader2, PieChart as PieChartIcon, Plus, RefreshCw, Sparkles, Star, Target, TrendingUp, Users, Wallet,
    Megaphone, UserPlus,
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "react-toastify";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
    DEFAULT_WORK_HOURS, INACTIVE_LEAVE, LEAVE_COLORS, LEAVE_QUOTA, PRESENT_STATUSES, PUNCH_ROLES, QUOTA_TOTAL, REFRESH_INTERVAL, ROLE_TEXT, ROUTES, WEEK_OFF,
    attendanceStats, buildMap, byNewest, cnt, dateKey, dowOf, filterTasks, formatDate, formatMoney, formatTime, getName, getInitials, getTenure,
    getTodayFormatted, groupCount, idOf, istYMD, isTaskCancelled, isTaskDone, isTaskSubmitted, labelOf, leaveCoversDay, leaveRange, leaveStatusClass,
    lower, matchRecord, monthLabel, norm, normalizePayslip, normalizeRole, refName, taskMatches, titleCase, toList, toYMD, useMyAttendance, ymdAdd,
} from "@/components/dashboard/dashUtils";
import {
    AttentionPanel, CustomAttendanceTooltip, EmployeeHero, EmployeeTaskRow, EmptyState, FooterLink, HolidayList, HolidayMini, ListModal,
    MiniStats, MyAttendanceSection, NoData, Panel, PayslipPanel, PeriodToggle, PunchBar, QuickActions, StatCard, TaskActionModal, TaskTabs,
    TeamTaskRow, TodayBoard, WidgetCard,
} from "@/components/dashboard/dashParts";
import { useDayOff } from "../../../hooks/useDayOff";

const viewAllBtn = "inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-bold bg-indigo-50 hover:bg-indigo-100 active:scale-95 px-3 py-1.5 rounded-xl border border-indigo-100 transition self-start cursor-pointer";

/* Backend ka host. Avatar ka path "/uploads/..." hota hai, isliye iske saath jodna zaroori hai */
const FILE_BASE = (process.env.NEXT_PUBLIC_FILE_URL || "https://hrms-15-4xfs.onrender.com").replace(/\/$/, "");

const avatarUrl = (a) => {
    if (!a) return "";
    if (/^(https?:|data:|blob:)/.test(a)) return a;
    return `${FILE_BASE}${a.startsWith("/") ? "" : "/"}${a}`;
};

/* the list of "things waiting" for this person */
function buildAttention(d) {
    const out = [];
    const add = (n, text, href, tone = "indigo") => { if (n > 0) out.push({ n, text, href, tone }); };
    const p = d.perf?.pending || {};
    const s = d.support || {};
    const staff = d.role === "admin" || d.role === "hr";

    if (d.role !== "employee") add(d.pending.length, "leave requests to review", ROUTES.leave, "amber");
    if (d.teamTasks) add(d.teamTasks.all.filter(isTaskSubmitted).length, "tasks submitted for your review", ROUTES.tasks, "violet");
    if (d.role === "employee") add(d.tasks.filter((t) => !isTaskDone(t) && !isTaskCancelled(t) && !isTaskSubmitted(t) && t.review?.comment).length, "tasks sent back for rework", ROUTES.tasks, "rose");
    add(p.mySelfAssessments, "self assessment to write", ROUTES.selfAssessment, "indigo");
    add(p.toReview, "appraisals to review", ROUTES.managerAssessment, "violet");
    add(p.promotions, "promotions to decide", ROUTES.promotion, "violet");
    add(p.increments, "increments to decide", ROUTES.increment, "violet");
    add(d.perf?.goals?.overdue, "goals are overdue", ROUTES.goals, "rose");
    if (staff) {
        add(s.unassigned, "support tickets not assigned", ROUTES.tickets, "rose");
        add(s.overdue, "support tickets overdue", ROUTES.tickets, "rose");
        add(s.unread, "tickets with new replies", ROUTES.tickets, "amber");
        add(cnt(d.recruit?.upcomingInterviews), "interviews coming up", ROUTES.interviews, "indigo");
        add(cnt(d.recruit?.pendingOffers), "offers waiting for an answer", ROUTES.offers, "amber");
        add(d.payrollSummary?.draft, "payslips still in draft", ROUTES.payroll, "slate");
    } else {
        add(s.unread, "replies waiting on your tickets", ROUTES.tickets, "amber");
        add(s.waiting, "tickets waiting for your reply", ROUTES.tickets, "rose");
    }
    return out;
}

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
    const [chartView, setChartView] = useState("week");
    const [attView, setAttView] = useState("week");
    const [dlId, setDlId] = useState("");
    const inFlight = useRef(false);
    const refetchRef = useRef(() => { });

    const [tasksOpen, setTasksOpen] = useState(false);
    const [holidaysOpen, setHolidaysOpen] = useState(false);
    const [modalTab, setModalTab] = useState("all");
    const [taskModal, setTaskModal] = useState(null); // { task, mode: progress | submit | rework }
    const [modalProgress, setModalProgress] = useState(0);
    const [modalNote, setModalNote] = useState("");
    const [modalLink, setModalLink] = useState("");
    const [modalBusy, setModalBusy] = useState(false);

    const att = useMyAttendance({ userId, userName, onChanged: () => refetchRef.current() });
    const go = (href) => href && router.push(href);

    /* ----- Off din (Sunday / admin ne band kiya din) ----- */
    const dayOff = useDayOff();
    // Sunday ka check frontend me bhi hai, taaki day-info load na ho to bhi kaam kare.
    // Asli rok backend ke checkIn me hai.
    const sundayToday = new Date().getDay() === 0;
    const offToday = dayOff.isOff || sundayToday;
    const offMessage = dayOff.isOff && dayOff.message
        ? dayOff.message
        : "Aaj Sunday (weekly off) hai. Punch nahi ho sakta.";

    const punchGuarded = (type) => {
        if (offToday) {
            toast.error(offMessage);
            return;
        }
        return att.punch(type);
    };

    useEffect(() => {
        if (!userId) return;
        try { const saved = localStorage.getItem(`hrms_energy_${userId}`); if (saved) setEnergy(saved); } catch { }
    }, [userId]);
    const changeEnergy = (v) => { setEnergy(v); try { localStorage.setItem(`hrms_energy_${userId}`, v); } catch { } };

    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 30 * 1000);
        return () => clearInterval(t);
    }, []);

    const openTasks = () => { setModalTab("all"); setTasksOpen(true); };

    const taskProgress0 = (t) => Math.max(0, Math.min(100, Number(t?.progress) || 0));

    const openTaskModal = (task, mode) => {
        const today = toYMD(new Date());
        const todays = Array.isArray(task.updates) ? task.updates.find((u) => u.date === today) : null;
        setTaskModal({ task, mode });
        setModalProgress(taskProgress0(task));
        setModalNote(mode === "progress" ? todays?.note || "" : "");
        setModalLink("");
    };

    const saveTaskModal = async () => {
        if (!taskModal) return;
        if (modalNote.trim().length < 3) return toast.error("Please write a short note.");
        const { task, mode } = taskModal;
        const id = task._id || task.id;
        setModalBusy(true);
        try {
            if (mode === "progress") { await api.post(`/tasks/${id}/progress`, { progress: modalProgress, note: modalNote.trim() }); toast.success("Today's update saved."); }
            else if (mode === "submit") { await api.put(`/tasks/${id}/submit`, { note: modalNote.trim(), link: modalLink.trim() }); toast.success("Task submitted for review."); }
            else { await api.put(`/tasks/${id}/review`, { action: "rework", comment: modalNote.trim() }); toast.success("Sent back for rework."); }
            setTaskModal(null);
            refetchRef.current();
        } catch (err) {
            toast.error(err?.response?.data?.message || "Could not save. Please try again.");
        } finally {
            setModalBusy(false);
        }
    };

    const reviewTask = async (task, action) => {
        if (action === "rework") return openTaskModal(task, "rework");
        try {
            await api.put(`/tasks/${task._id || task.id}/review`, { action, comment: "" });
            toast.success("Task approved.");
            refetchRef.current();
        } catch (err) {
            toast.error(err?.response?.data?.message || "Review failed.");
        }
    };

    const downloadPayslip = async (id) => {
        if (!id || dlId) return;
        setDlId(id);
        try {
            const { data } = await api.get(`/payroll/payslip/${id}`);
            const { downloadPayslipPdf } = await import("@/lib/payslipPdf");
            await downloadPayslipPdf(data);
        } catch (err) {
            toast.error(err?.response?.data?.message || "Unable to create the PDF.");
        } finally {
            setDlId("");
        }
    };

    /* ------------------------------ load everything ------------------------------ */

    const fetchData = useCallback(async (manual = false, silent = false) => {
        const me = authRef.current;
        if (!me || inFlight.current) return;
        inFlight.current = true;
        if (manual) setRefreshing(true);
        try {
            const myRole = normalizeRole(me.role);
            const adminView = myRole === "admin" || myRole === "hr";
            const managerView = myRole === "manager";
            const employeeView = myRole === "employee";
            const myUserId = String(me._id || "");

            let profile = { ...me };
            let myEmployeeId = "";
            try {
                const p = (await api.get("/employees/me"))?.data;
                if (p && p.hasEmployeeProfile !== false && p._id) {
                    // avatar: login user ka avatar pehle, Employee ka khali/purana avatar usse overwrite na kare
                    profile = { ...me, ...p, role: me.role, avatar: me.avatar || p.avatar || "" };
                    myEmployeeId = String(p._id);
                }
            } catch { }

            const todayYMD = istYMD(new Date());
            const [ty, tm] = todayYMD.split("-").map(Number);
            const prev = tm === 1 ? { m: 12, y: ty - 1 } : { m: tm - 1, y: ty };

            const safe = (p) => p.catch(() => ({ data: null }));
            const none = Promise.resolve({ data: null });
            const wantsPayslip = !adminView || Boolean(myEmployeeId);

            const [empRes, leaveRes, deptRes, desigRes, taskRes, holRes, shiftRes, attCur, attPrev, slipRes, perfRes, supRes, ovRes, recRes, sumRes] = await Promise.all([
                managerView ? safe(api.get("/employees/team")) : none,
                safe(api.get("/leave")),
                safe(api.get("/organization/departments")),
                safe(api.get("/organization/designations")),
                safe(api.get("/tasks")),
                safe(api.get("/holiday")),
                safe(api.get("/shifts/today")),
                safe(api.get("/attendance", { params: { month: tm, year: ty } })),
                safe(api.get("/attendance", { params: { month: prev.m, year: prev.y } })),
                wantsPayslip ? safe(api.get("/payroll/payslips", myEmployeeId ? { params: { employee: myEmployeeId } } : undefined)) : none,
                safe(api.get("/performance/summary")),
                safe(api.get("/support/summary")),
                adminView ? safe(api.get("/organization/overview")) : none,
                adminView || managerView ? safe(api.get("/recruitment/summary")) : none,
                adminView ? safe(api.get("/payroll/summary", { params: { month: tm, year: ty } })) : none,
            ]);

            const deptMap = buildMap(toList(deptRes));
            const desigMap = buildMap(toList(desigRes));
            const overview = ovRes?.data?.data || null;

            const members = managerView ? empRes?.data?.members || [] : [];
            const myScope = {
                ids: new Set([myUserId, myEmployeeId].filter(Boolean)),
                emails: norm([me.email, profile.email, profile.loginEmail]),
                names: norm([me.name, profile.name, `${profile.firstName || ""} ${profile.lastName || ""}`]),
            };
            const teamScope = managerView
                ? { ids: new Set([myUserId, myEmployeeId, ...members.map((m) => String(m._id)), ...members.map((m) => m.userId && String(m.userId))].filter(Boolean)), emails: norm(members.map((m) => m.email)), names: new Set() }
                : null;
            const isMine = matchRecord(myScope);
            const inScope = employeeView ? isMine : managerView ? matchRecord(teamScope) : () => true;

            const teamEmployees = members;
            const activeTeam = teamEmployees.filter((e) => !["inactive", "exited", "exit"].includes(lower(e.employeeStatus)));

            const totalCount = adminView ? overview?.company?.totalEmployees || 0 : teamEmployees.length;
            const activeCount = adminView ? totalCount : activeTeam.length;

            const holidays = toList(holRes)
                .map((h) => ({ _id: h._id || h.id, title: h.title || h.name || h.holiday || "Holiday", key: dateKey(h.date || h.startDate || h.holidayDate), type: h.type, optional: Boolean(h.optional), description: h.description }))
                .filter((h) => h.key)
                .sort((a, b) => a.key.localeCompare(b.key));
            const holidaySet = new Set(holidays.filter((h) => !h.optional).map((h) => h.key));
            const holidaysToday = holidays.filter((h) => h.key === todayYMD).map((h) => h.title);

            /* attendance */
            const allAtt = [...toList(attPrev), ...toList(attCur)];
            const byDay = new Map();
            allAtt.filter(inScope).forEach((r) => {
                const k = istYMD(r.date);
                if (!k) return;
                if (!byDay.has(k)) byDay.set(k, []);
                byDay.get(k).push(r);
            });

            const buildTrend = (keys) => keys.map((k) => {
                const recs = byDay.get(k) || [];
                const d = new Date(`${k}T00:00:00`);
                const day = d.toLocaleDateString("en-US", { weekday: "short" });
                const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                return {
                    key: k, date: dateStr, day, label: `${day}, ${dateStr}`,
                    present: recs.filter((r) => PRESENT_STATUSES.includes(lower(r.status))).length,
                    absent: recs.filter((r) => lower(r.status) === "absent").length,
                    late: recs.filter((r) => lower(r.status) === "late" || r.isLate).length,
                };
            });
            const monthStart = `${todayYMD.slice(0, 7)}-01`;
            const trendWeek = buildTrend(Array.from({ length: 7 }, (_, i) => ymdAdd(todayYMD, i - 6)));
            const trendMonth = buildTrend(Array.from({ length: Number(todayYMD.slice(8)) }, (_, i) => ymdAdd(monthStart, i)));
            const presentToday = trendWeek[trendWeek.length - 1]?.present || 0;
            const attendancePct = activeCount > 0 ? ((presentToday / activeCount) * 100).toFixed(1) : "0.0";

            /* leaves */
            const allLeaves = toList(leaveRes);
            const leaves = allLeaves.filter(inScope);
            const pending = leaves.filter((l) => lower(l.status) === "pending");
            const approved = leaves.filter((l) => lower(l.status) === "approved");
            const approvedToday = approved.filter((l) => leaveCoversDay(l, todayYMD));
            const thisYearLeave = (l) => { const { start } = leaveRange(l); return Number.isNaN(start.getTime()) || start.getFullYear() === ty; };
            const byType = {};
            leaves.filter((l) => !INACTIVE_LEAVE.includes(lower(l.status)) && thisYearLeave(l)).forEach((l) => {
                const key = `${titleCase(l.leaveType || "Other")} Leave`;
                byType[key] = (byType[key] || 0) + (Number(l.totalDays) || 1);
            });
            const leaveDistribution = Object.entries(byType).map(([name, value], i) => ({ name, value, color: LEAVE_COLORS[i % LEAVE_COLORS.length] }));
            const leaveUsed = approved.filter((l) => LEAVE_QUOTA[lower(l.leaveType)] !== undefined && thisYearLeave(l)).reduce((s, l) => s + (Number(l.totalDays) || 1), 0);
            const recentLeaves = [...leaves].sort((a, b) => new Date(b.createdAt || b.startDate || 0) - new Date(a.createdAt || a.startDate || 0)).slice(0, 6);

            /* my own attendance. Only Sunday is a weekly off. */
            const myRecords = allAtt.filter(isMine);
            const myApproved = allLeaves.filter(isMine).filter((l) => lower(l.status) === "approved");
            const recByDay = new Map();
            myRecords.forEach((r) => { const k = istYMD(r.date); if (k && !recByDay.has(k)) recByDay.set(k, r); });

            const statusOf = (k) => {
                if (k > todayYMD) return "future";
                const r = recByDay.get(k);
                const s = lower(r?.status);
                if (r?.checkIn || PRESENT_STATUSES.includes(s)) {
                    if (s === "half-day" || s === "half day") return "half";
                    return s === "late" || r?.isLate ? "late" : "present";
                }
                if (s === "on-leave" || s === "on leave" || myApproved.some((l) => leaveCoversDay(l, k))) return "leave";
                if (holidaySet.has(k)) return "holiday";
                if (WEEK_OFF.has(dowOf(k))) return "weekoff";
                if (k === todayYMD) return "pending";
                return "absent";
            };
            const makeDay = (k) => {
                const r = recByDay.get(k);
                const inD = r?.checkIn ? new Date(r.checkIn) : null;
                const outD = r?.checkOut ? new Date(r.checkOut) : null;
                return { ymd: k, day: Number(k.slice(8)), dow: dowOf(k), status: statusOf(k), in: inD, out: outD, hours: inD && outD ? Math.max(0, (outD - inD) / 3600000) : 0 };
            };
            const weekDays = Array.from({ length: 7 }, (_, i) => makeDay(ymdAdd(todayYMD, i - 6)));
            const monthDays = Array.from({ length: new Date(Date.UTC(ty, tm, 0)).getUTCDate() }, (_, i) => makeDay(ymdAdd(monthStart, i)));
            const recent = [...recByDay.entries()].filter(([, r]) => r.checkIn).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 5).map(([k]) => {
                const d = makeDay(k);
                return { ymd: k, in: d.in, out: d.out, hours: d.hours, late: d.status === "late" };
            });
            const myAtt = {
                week: { days: weekDays, stats: attendanceStats(weekDays) },
                month: { days: monthDays, stats: attendanceStats(monthDays), offset: dowOf(monthStart), label: monthLabel(tm, ty) },
                recent,
            };

            /* today's board (admin, HR, manager) */
            let todayBoard = null;
            if (!employeeView) {
                const recs = byDay.get(todayYMD) || [];
                const present = recs.filter((r) => PRESENT_STATUSES.includes(lower(r.status))).length;
                const late = recs.filter((r) => lower(r.status) === "late" || r.isLate).length;
                todayBoard = {
                    present, late, onTime: Math.max(0, present - late), onLeave: approvedToday.length,
                    notMarked: Math.max(0, activeCount - present - approvedToday.length),
                    list: recs.filter((r) => r.checkIn).sort((a, b) => new Date(b.checkIn) - new Date(a.checkIn)).slice(0, 8)
                        .map((r, i) => ({ id: r._id || i, name: refName(r.employee) || "Employee", in: r.checkIn, out: r.checkOut, late: lower(r.status) === "late" || Boolean(r.isLate) })),
                };
            }

            /* department headcount (admin: the live count from Organization) or team composition (manager) */
            let groupData = [];
            if (adminView) {
                const rows = (overview?.departments || []).map((d) => ({ name: d.name, count: d.employeeCount || 0 })).sort((a, b) => b.count - a.count);
                const max = Math.max(...rows.map((r) => r.count), 1);
                groupData = rows.map((r) => ({ ...r, max }));
            } else if (managerView) {
                groupData = groupCount(teamEmployees, (e) => labelOf(e.designation, desigMap) || "Not specified");
            }

            const payslip = toList(slipRes).map(normalizePayslip).filter((p) => p && lower(p.status) !== "draft").sort((a, b) => b.yearNo * 12 + b.monthNo - (a.yearNo * 12 + a.monthNo))[0] || null;

            let payrollSummary = null;
            if (adminView) {
                let s = sumRes?.data;
                let m = tm, y = ty;
                if (!(s && s.totalEmployees > 0)) {
                    const pr = await safe(api.get("/payroll/summary", { params: { month: prev.m, year: prev.y } }));
                    if (pr?.data?.totalEmployees > 0) { s = pr.data; m = prev.m; y = prev.y; }
                }
                payrollSummary = { label: monthLabel(m, y), count: s?.totalEmployees || 0, paid: s?.paidCount || 0, processed: s?.processedCount || 0, draft: s?.draftCount || 0, totalNet: s?.totalNet || 0 };
            }

            /* tasks */
            const rawTasks = toList(taskRes);
            let tasks = [];
            let teamTasks = null;
            if (employeeView) tasks = rawTasks.filter((t) => taskMatches(t, myScope)).sort(byNewest);
            else {
                const sorted = [...rawTasks].sort(byNewest);
                teamTasks = { total: sorted.length, done: sorted.filter(isTaskDone).length, open: sorted.filter((t) => !isTaskDone(t) && !isTaskCancelled(t)).length, list: sorted.slice(0, 6), all: sorted };
            }

            const info = shiftRes?.data && !Array.isArray(shiftRes.data) && shiftRes.data.status ? shiftRes.data : null;

            setDash({
                role: myRole, me: profile,
                profileInfo: { employeeId: profile.employeeId, designation: labelOf(profile.designation, desigMap), department: labelOf(profile.department, deptMap), manager: profile.reportingManager, joined: profile.dateOfJoining },
                hasProfile: Boolean(myEmployeeId),
                totalCount, activeCount, presentToday, attendancePct, onLeaveToday: approvedToday.length,
                openPositions: cnt(recRes?.data?.openPositions),
                recruit: recRes?.data || null,
                perf: perfRes?.data || null,
                support: supRes?.data || null,
                overview,
                pending, trendWeek, trendMonth, todayBoard, myAtt, leaveDistribution, groupData, recentLeaves, leaveUsed,
                payslip, payrollSummary, tasks, teamTasks, holidays, holidaysToday, today: info, leaveToday: approvedToday.length > 0,
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

    useEffect(() => {
        if (!userId) return;
        fetchData();
        const onVisible = () => { if (document.visibilityState === "visible") { fetchData(false, true); att.refresh(); } };
        const interval = setInterval(() => fetchData(false, true), REFRESH_INTERVAL);
        document.addEventListener("visibilitychange", onVisible);
        return () => { clearInterval(interval); document.removeEventListener("visibilitychange", onVisible); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, fetchData]);

    const handleExportAttendance = () => {
        if (!dash) return;
        const data = chartView === "week" ? dash.trendWeek : dash.trendMonth;
        const csv = "Date,Day,Present,Absent,Late\n" + data.map((r) => `"${r.key}","${r.day}",${r.present},${r.absent},${r.late}`).join("\n");
        const url = window.URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = `attendance-${chartView === "week" ? "weekly" : "monthly"}-${toYMD(new Date())}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    /* ------------------------------ loading and error ------------------------------ */

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
                <button type="button" onClick={() => { setLoading(true); fetchData(); }} className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition text-white text-xs font-bold cursor-pointer">Try Again</button>
            </div>
        );
    }

    const adminView = dash.role === "admin" || dash.role === "hr";
    const managerView = dash.role === "manager";
    const employeeView = dash.role === "employee";
    const firstName = getName(dash.me).split(" ")[0];
    const todayYMD = toYMD(new Date());
    const attention = buildAttention(dash);
    const perf = dash.perf;
    const sup = dash.support || {};

    /* hamesha sabse fresh avatar: profile page se update hote hi authUser me turant badalta hai */
    const myAvatar = avatarUrl(authUser?.avatar || dash.me?.avatar || dash.me?.employee?.avatar);

    const perfTiles = perf ? [["Goals done", `${perf.goals?.completed || 0}/${perf.goals?.total || 0}`, "text-emerald-600"], ["Overdue goals", perf.goals?.overdue || 0, "text-rose-600"], ["Avg rating", perf.appraisals?.averageRating ? `${perf.appraisals.averageRating}★` : "—", "text-amber-600"], ["Open appraisals", (perf.appraisals?.pendingSelf || 0) + (perf.appraisals?.pendingManager || 0), "text-indigo-600"]] : [];
    const supTiles = adminView
        ? [["Active", sup.active || 0, "text-indigo-600"], ["Not assigned", sup.unassigned || 0, "text-rose-600"], ["Overdue", sup.overdue || 0, "text-amber-600"], ["Avg rating", sup.avgRating ? `${sup.avgRating}★` : "—", "text-emerald-600"]]
        : [["Active", sup.active || 0, "text-indigo-600"], ["Waiting for you", sup.waiting || 0, "text-amber-600"], ["Resolved", sup.resolved || 0, "text-emerald-600"], ["New replies", sup.unread || 0, "text-rose-600"]];

    const quick = employeeView
        ? [{ label: "Apply leave", icon: CalendarCheck, href: ROUTES.applyLeave }, { label: "My payslips", icon: Wallet, href: ROUTES.myPayslips }, { label: "My tasks", icon: ListChecks, href: ROUTES.tasks }, { label: "My goals", icon: Target, href: ROUTES.goals }, { label: "Documents", icon: FileText, href: ROUTES.myDocuments }, { label: "Raise ticket", icon: Headphones, href: ROUTES.tickets }]
        : managerView
            ? [{ label: "Approve leave", icon: CalendarCheck, href: ROUTES.leave }, { label: "Team tasks", icon: ListChecks, href: ROUTES.tasks }, { label: "Team attendance", icon: Clock, href: ROUTES.attendance }, { label: "Goals", icon: Target, href: ROUTES.goals }, { label: "Review team", icon: Star, href: ROUTES.managerAssessment }, { label: "Raise ticket", icon: Headphones, href: ROUTES.tickets }]
            : [{ label: "Add employee", icon: UserPlus, href: ROUTES.addEmployee }, { label: "Run payroll", icon: Wallet, href: ROUTES.payroll }, { label: "Leave requests", icon: CalendarCheck, href: ROUTES.leave }, { label: "Post job", icon: Briefcase, href: ROUTES.recruitment }, { label: "Announcement", icon: Megaphone, href: ROUTES.announcements }, { label: "Support tickets", icon: Headphones, href: ROUTES.tickets }];

    /* ============================ EMPLOYEE ============================ */

    if (employeeView) {
        const tasks = dash.tasks;
        const doneCount = tasks.filter(isTaskDone).length;
        const pendingCount = tasks.filter((t) => !isTaskDone(t) && !isTaskCancelled(t)).length;
        const visibleTasks = filterTasks(tasks, taskTab, todayYMD);
        const modalTasks = filterTasks(tasks, modalTab, todayYMD);
        const leaveLeft = Math.max(0, QUOTA_TOTAL - dash.leaveUsed);
        const leavePct = Math.min(100, (dash.leaveUsed / QUOTA_TOTAL) * 100);

        /* only Sunday is the weekly off, whatever the server says */
        const info = dash.today;
        const shift = info?.shift || null;
        const dayStatus = sundayToday ? "weekly_off" : info?.status === "weekly_off" ? "working" : info?.status || "";
        const goalMs = (info?.goalMinutes || DEFAULT_WORK_HOURS * 60) * 60000;
        const holiday = info?.holiday || null;
        const holidayTitles = holiday ? [holiday.title || holiday.name || "Holiday"] : dash.holidaysToday;
        const isHolidayToday = holidayTitles.length > 0 && !holiday?.optional;
        const heroShiftName = shift ? shift.name : dayStatus === "weekly_off" ? "Weekly Off (Sunday)" : isHolidayToday ? "Holiday" : "";
        const shiftValue = shift ? `${shift.name} · ${shift.timeLabel}` : dayStatus === "weekly_off" ? "Weekly Off (Sunday)" : "";

        let lateBy = 0;
        if (att.today.hasIn && shift && !shift.isNightShift) {
            const [sh, sm] = String(shift.startTime).split(":").map(Number);
            lateBy = Math.max(0, att.today.firstIn.getHours() * 60 + att.today.firstIn.getMinutes() - (sh * 60 + sm));
        }
        const attendanceValue = !att.today.loaded ? "..." : att.today.hasIn ? "Present" : dash.leaveToday ? "On Leave" : isHolidayToday ? "Holiday" : dayStatus === "weekly_off" ? "Weekly Off" : "Not Marked";
        const attendanceSub = att.today.hasIn
            ? (att.today.hasOut ? `In ${formatTime(att.today.firstIn)} · Out ${formatTime(att.today.lastOut)}` : `Checked in at ${formatTime(att.today.firstIn)}`) + (lateBy > 0 ? ` · Late ${lateBy}m` : "")
            : attendanceValue === "Holiday" || attendanceValue === "Weekly Off" ? "No punch required today" : "Punch in to mark attendance";

        const schedule = [];
        holidayTitles.forEach((h) => schedule.push({ title: h, sub: holiday?.optional ? "Optional holiday" : "Holiday today", tone: "bg-amber-50 text-amber-700" }));
        if (dayStatus === "weekly_off" && !isHolidayToday) schedule.push({ title: "Weekly off", sub: "Sunday. Enjoy your day off", tone: "bg-slate-100 text-slate-700" });
        if (shift && dayStatus === "working") schedule.push({ title: `${shift.name} Shift`, sub: `${shift.timeLabel} · ${shift.durationLabel}`, tone: "bg-blue-50 text-blue-700" });
        if (dash.leaveToday) schedule.push({ title: "On approved leave", sub: "Leave today", tone: "bg-violet-50 text-violet-700" });
        if (att.today.hasIn) schedule.push({ title: "Punched in", sub: formatTime(att.today.firstIn), tone: "bg-emerald-50 text-emerald-700" });
        if (att.today.hasOut) schedule.push({ title: "Punched out", sub: formatTime(att.today.lastOut), tone: "bg-rose-50 text-rose-700" });

        const workplace = [
            ["Designation", dash.profileInfo.designation], ["Department", dash.profileInfo.department], ["Reporting Manager", dash.profileInfo.manager], ["Employee ID", dash.profileInfo.employeeId],
            ["Remaining Leave Days", `${leaveLeft} / ${QUOTA_TOTAL}`], ["Shift", shiftValue], ["Joining Date", dash.profileInfo.joined ? formatDate(dash.profileInfo.joined) : ""],
            ["Today's Attendance", attendanceValue === "..." ? "" : attendanceValue + (lateBy > 0 ? ` (Late ${lateBy}m)` : "")], ["Time with Company", dash.profileInfo.joined ? getTenure(dash.profileInfo.joined) : ""],
        ];

        const cardCls = "bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 flex flex-col hover:shadow-md hover:-translate-y-0.5 transition-all duration-200";

        return (
            <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-4 py-4 space-y-4 antialiased overflow-x-hidden">
                <EmployeeHero name={getName(dash.me)} roleLabel={ROLE_TEXT.employee.label} avatar={myAvatar} att={att.today} now={now} busy={att.busy} onPunch={punchGuarded} energy={energy} setEnergy={changeEnergy} shiftName={heroShiftName} shiftTime={shift?.timeLabel} goalMs={goalMs} onViewAttendance={() => go(ROUTES.attendance)} />

                {offToday && (
                    <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-amber-800">
                        <AlertCircle size={15} className="shrink-0 mt-0.5" />
                        <p className="text-xs font-semibold">{offMessage}</p>
                    </div>
                )}

                {error && <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-amber-800"><AlertCircle size={15} className="shrink-0 mt-0.5" /><p className="text-xs font-semibold">{error}</p></div>}
                {!dash.hasProfile && <div className="flex items-start gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2.5 text-indigo-800"><AlertCircle size={15} className="shrink-0 mt-0.5" /><p className="text-xs font-semibold">Your employee profile is not linked yet, so some details are empty. Please contact HR.</p></div>}

                <QuickActions items={quick} onGo={go} />

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <div className={cardCls}>
                        <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0"><ListChecks size={18} /></div><div><p className="text-xl font-extrabold text-slate-900 leading-tight">{tasks.length}</p><p className="text-[11px] text-slate-500">Total Tasks</p></div></div>
                        <div className="mt-auto pt-4"><div className="border-t border-dashed border-slate-200 pt-3 flex items-center justify-between text-[11px]"><span className="text-emerald-600 font-medium">{doneCount} Completed</span><span className="text-slate-500 font-medium">{pendingCount} Pending</span></div></div>
                    </div>
                    <div className={cardCls}>
                        <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0"><CalendarCheck size={18} /></div><div className="min-w-0"><p className={`text-xl font-extrabold leading-tight truncate ${att.today.hasIn ? "text-emerald-600" : "text-slate-800"}`}>{attendanceValue}</p><p className="text-[11px] text-slate-500">Attendance</p></div></div>
                        <div className="mt-auto pt-4"><div className="border-t border-dashed border-slate-200 pt-3 text-[11px] text-slate-500 font-medium truncate">{attendanceSub}</div></div>
                    </div>
                    <div className={cardCls}>
                        <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0"><Clock size={18} /></div><div><p className="text-xl font-extrabold text-slate-900 leading-tight">{leaveLeft} / {QUOTA_TOTAL}</p><p className="text-[11px] text-slate-500">Leave Days Remaining</p></div></div>
                        <div className="mt-auto pt-4 space-y-2"><div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full bg-amber-400 transition-all duration-700" style={{ width: `${leavePct}%` }} /></div><div className="flex items-center justify-between text-[11px] text-slate-500 font-medium"><span>{dash.leaveUsed} Days Used</span><span>{leaveLeft} Days Left</span></div></div>
                    </div>
                    <div className={cardCls}>
                        <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0"><Hourglass size={18} /></div><div className="min-w-0"><p className="text-xl font-extrabold text-slate-900 leading-tight">Work Shift</p><p className="text-[11px] text-slate-500 truncate">{shiftValue || heroShiftName || "Not Assigned"}</p></div></div>
                        <div className="mt-auto pt-4"><div className="border-t border-dashed border-slate-200 pt-3 text-[11px] text-slate-500 font-medium">{shift ? `${shift.durationLabel} Duration` : "No shift duration"}</div></div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    <div className="lg:col-span-5 min-w-0"><AttentionPanel items={attention} onGo={go} /></div>
                    <div className="lg:col-span-4 min-w-0"><MiniStats icon={Target} title="My Performance" subtitle="Goals and appraisals" tiles={perfTiles} empty={perf ? "" : "Performance data is not available."} onOpen={() => go(ROUTES.performance)} /></div>
                    <div className="lg:col-span-3 min-w-0"><MiniStats icon={Headphones} title="My Support Tickets" subtitle="Chat with HR" tiles={supTiles} onOpen={() => go(ROUTES.tickets)} /></div>
                </div>

                <MyAttendanceSection data={dash.myAtt} view={attView} setView={setAttView} onOpen={() => go(ROUTES.attendance)} />

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
                    <div className="md:col-span-2 lg:col-span-6 min-w-0">
                        <WidgetCard title="My Tasks" right={<TaskTabs tab={taskTab} setTab={setTaskTab} />} footer={<FooterLink label="View All Tasks" onClick={openTasks} />}>
                            {visibleTasks.length === 0 ? <NoData text={tasks.length === 0 ? "No tasks assigned to you yet" : "No tasks in this tab"} /> : (
                                <ul className="divide-y divide-slate-100">{visibleTasks.slice(0, 6).map((t, i) => <EmployeeTaskRow key={t._id || t.id || i} t={t} todayYMD={todayYMD} onProgress={(x) => openTaskModal(x, "progress")} onSubmit={(x) => openTaskModal(x, "submit")} />)}</ul>
                            )}
                        </WidgetCard>
                    </div>
                    <div className="lg:col-span-3 min-w-0">
                        <WidgetCard title="Today's Schedule" footer={<FooterLink label="View Holiday Calendar" onClick={() => setHolidaysOpen(true)} />}>
                            {schedule.length === 0 ? <NoData text="No schedule for today" /> : <ul className="p-3 space-y-2">{schedule.map((s, i) => <li key={i} className={`rounded-xl px-3 py-2.5 ${s.tone}`}><p className="text-xs font-bold">{s.title}</p><p className="text-[11px] opacity-80">{s.sub}</p></li>)}</ul>}
                        </WidgetCard>
                    </div>
                    <div className="lg:col-span-3 min-w-0">
                        <WidgetCard title="My Workplace">
                            <ul>{workplace.map(([l, v]) => <li key={l} className="flex items-start justify-between gap-3 px-3 py-2.5 border-b border-slate-100 last:border-0 text-xs hover:bg-slate-50/70 transition-colors"><span className="text-slate-400 shrink-0">{l}</span><span className="font-bold text-slate-800 text-right break-words min-w-0">{v || "Not Assigned"}</span></li>)}</ul>
                        </WidgetCard>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <Panel icon={CalendarCheck} title="My Leave Requests" subtitle={`${dash.pending.length} pending · ${dash.recentLeaves.length} recent requests`} right={<button type="button" onClick={() => go(ROUTES.applyLeave)} className={viewAllBtn}><span>View All</span><ArrowUpRight size={12} /></button>}>
                        {dash.recentLeaves.length === 0 ? (
                            <EmptyState icon={CalendarCheck} tone="text-indigo-300" text="You have not applied for any leave yet." action={<button type="button" onClick={() => go(ROUTES.applyLeave)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition text-white text-xs font-bold cursor-pointer"><Plus size={13} /> Apply for Leave</button>} />
                        ) : (
                            <div className="space-y-2.5">
                                {dash.recentLeaves.map((req) => (
                                    <div key={req._id || req.id} onClick={() => go(ROUTES.applyLeave)} className="min-w-0 flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50/70 hover:bg-indigo-50/40 hover:border-indigo-200 border border-slate-200/70 cursor-pointer transition active:scale-[0.99]">
                                        <div className="min-w-0"><p className="text-xs font-bold text-slate-900 truncate">{titleCase(req.leaveType || "Leave")} Leave</p><p className="text-[11px] text-slate-500 truncate">{formatDate(req.startDate || req.fromDate)} · {req.totalDays || 1}d</p></div>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border capitalize shrink-0 ${leaveStatusClass(req.status)}`}>{req.status || "pending"}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Panel>
                    <PayslipPanel payslip={dash.payslip} onOpen={() => go(ROUTES.myPayslips)} onDownload={downloadPayslip} downloading={dlId === dash.payslip?.id} />
                </div>

                {tasksOpen && (
                    <ListModal title="All Tasks" subtitle={`${tasks.length} total · ${doneCount} completed · ${pendingCount} pending`} tabs={<TaskTabs tab={modalTab} setTab={setModalTab} />} onClose={() => setTasksOpen(false)}>
                        {modalTasks.length === 0 ? <NoData text={tasks.length === 0 ? "No tasks assigned to you yet" : "No tasks in this tab"} /> : <ul className="divide-y divide-slate-100">{modalTasks.map((t, i) => <EmployeeTaskRow key={t._id || t.id || i} t={t} todayYMD={todayYMD} onProgress={(x) => openTaskModal(x, "progress")} onSubmit={(x) => openTaskModal(x, "submit")} />)}</ul>}
                    </ListModal>
                )}
                {holidaysOpen && <ListModal title="Holiday Calendar" subtitle={`${new Date().getFullYear()} · ${dash.holidays.length} holidays · Sunday is the weekly off`} onClose={() => setHolidaysOpen(false)}><HolidayList holidays={dash.holidays} todayYMD={todayYMD} /></ListModal>}
                <TaskActionModal state={taskModal} progress={modalProgress} setProgress={setModalProgress} note={modalNote} setNote={setModalNote} link={modalLink} setLink={setModalLink} busy={modalBusy} onClose={() => setTaskModal(null)} onSave={saveTaskModal} />
            </div>
        );
    }

    /* ============================ ADMIN, HR, MANAGER ============================ */

    const cards = adminView
        ? [
            { label: "Workforce", value: dash.totalCount.toLocaleString(), sub: `${dash.activeCount} active employees`, icon: Users, tone: "indigo", href: ROUTES.employees },
            { label: "Turnout", value: dash.presentToday.toLocaleString(), sub: `${dash.attendancePct}% attendance today`, icon: CheckCircle2, tone: "emerald", href: ROUTES.attendance },
            { label: "Requests", value: dash.pending.length, sub: "Leave awaiting review", icon: Calendar, tone: "amber", href: ROUTES.leave },
            { label: "Hiring", value: dash.openPositions, sub: "Open positions", icon: Briefcase, tone: "cyan", href: ROUTES.recruitment },
        ]
        : [
            { label: "My Team", value: dash.totalCount, sub: `${dash.activeCount} active members`, icon: Users, tone: "indigo", href: null },
            { label: "Team Present", value: dash.presentToday, sub: `${dash.attendancePct}% attendance today`, icon: CheckCircle2, tone: "emerald", href: ROUTES.attendance },
            { label: "Team Requests", value: dash.pending.length, sub: "Awaiting your review", icon: Calendar, tone: "amber", href: ROUTES.leave },
            { label: "On Leave Today", value: dash.onLeaveToday, sub: "Approved leaves", icon: CalendarCheck, tone: "violet", href: ROUTES.leave },
        ];

    const trend = chartView === "week" ? dash.trendWeek : dash.trendMonth;
    const totalLeaveDays = dash.leaveDistribution.reduce((s, i) => s + i.value, 0);
    const tt = dash.teamTasks;
    const teamModalTasks = tt ? filterTasks(tt.all, modalTab, todayYMD) : [];
    const rec = dash.recruit || {};
    const hiringTiles = [["Open positions", cnt(rec.openPositions), "text-indigo-600"], ["Interviews", cnt(rec.upcomingInterviews), "text-violet-600"], ["Pending offers", cnt(rec.pendingOffers), "text-amber-600"], ["Candidates", cnt(rec.totalCandidates ?? rec.candidates), "text-emerald-600"]];

    return (
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 py-4 space-y-4 antialiased overflow-x-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 min-w-0">
                    {/* Admin/HR/Manager ke liye bhi profile avatar */}
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl overflow-hidden shrink-0 bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-bold flex items-center justify-center text-base ring-2 ring-slate-100">
                        {myAvatar ? <img key={myAvatar} src={myAvatar} alt={getName(dash.me)} className="w-full h-full object-cover" /> : getInitials(getName(dash.me))}
                    </div>
                    <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{ROLE_TEXT[dash.role].title}</h1>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60"><Sparkles size={11} className="text-indigo-600 shrink-0" />{ROLE_TEXT[dash.role].badge} View</span>
                        </div>
                        <p className="text-xs font-medium text-slate-500 flex items-center gap-1.5 flex-wrap"><Calendar size={13} className="text-slate-400 shrink-0" /><span>{getTodayFormatted()}</span><span className="text-slate-300">•</span><span>Welcome back, {firstName}</span></p>
                    </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button type="button" onClick={() => { fetchData(true); att.refresh(); }} disabled={refreshing} className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2.5 sm:py-2 rounded-xl bg-slate-50 hover:bg-slate-100 active:scale-95 text-slate-700 border border-slate-200 text-xs font-semibold transition disabled:opacity-60 cursor-pointer"><RefreshCw size={12} className={refreshing ? "animate-spin text-indigo-600" : ""} /><span>{refreshing ? "Syncing..." : "Sync"}</span></button>
                    <button type="button" onClick={handleExportAttendance} className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 sm:py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-semibold transition shadow-sm cursor-pointer"><Download size={12} /><span>Export CSV</span></button>
                </div>
            </div>

            {error && <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-amber-800"><AlertCircle size={15} className="shrink-0 mt-0.5" /><p className="text-xs font-semibold">{error}</p></div>}

            {offToday && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-amber-800">
                    <AlertCircle size={15} className="shrink-0 mt-0.5" />
                    <p className="text-xs font-semibold">{offMessage} Attendance aaj mark nahi hogi.</p>
                </div>
            )}

            {canPunch && <PunchBar att={att.today} busy={att.busy} onPunch={punchGuarded} onView={() => go(ROUTES.attendance)} />}

            <QuickActions items={quick} onGo={go} />

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {cards.map((c) => <StatCard key={c.label} label={c.label} value={c.value} sub={c.sub} icon={c.icon} tone={c.tone} onClick={c.href ? () => go(c.href) : undefined} />)}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-5 min-w-0"><AttentionPanel items={attention} onGo={go} /></div>
                <div className="lg:col-span-7 min-w-0"><TodayBoard board={dash.todayBoard} scopeLabel={managerView ? "Your team, live" : "Whole company, live"} onOpen={() => go(ROUTES.attendance)} /></div>
            </div>

            <Panel
                icon={TrendingUp} title={managerView ? "Team Attendance Trend" : "Attendance Overview"}
                subtitle={chartView === "week" ? `Present vs. absent ${managerView ? "members" : "staff"}, last 7 days` : `Present vs. absent ${managerView ? "members" : "staff"}, ${new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })}`}
                right={<div className="flex flex-wrap items-center gap-2"><div className="flex items-center gap-2 text-xs font-semibold"><span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200"><span className="w-2 h-2 rounded-full bg-indigo-500" /> Present</span><span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200"><span className="w-2 h-2 rounded-full bg-rose-500" /> Absent</span></div><PeriodToggle value={chartView} onChange={setChartView} /></div>}
            >
                <div className="h-52 sm:h-64 w-full pt-1">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trend} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                            <defs>
                                <linearGradient id="presentGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} /><stop offset="95%" stopColor="#6366f1" stopOpacity={0} /></linearGradient>
                                <linearGradient id="absentGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2} /><stop offset="95%" stopColor="#f43f5e" stopOpacity={0} /></linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="date" tickLine={false} axisLine={false} interval={chartView === "week" ? 0 : "preserveStartEnd"} minTickGap={chartView === "week" ? 0 : 18} tick={{ fontSize: 11, fill: "#64748b", fontWeight: 600 }} dy={8} />
                            <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 500 }} />
                            <Tooltip content={<CustomAttendanceTooltip />} />
                            <Area type="monotone" dataKey="present" stroke="#6366f1" strokeWidth={2} fill="url(#presentGradient)" />
                            <Area type="monotone" dataKey="absent" stroke="#f43f5e" strokeWidth={2} fill="url(#absentGradient)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </Panel>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Panel icon={PieChartIcon} title={adminView ? "Leave Category Distribution" : "Team Leave Distribution"} right={<span className="text-xs font-semibold text-slate-500">{totalLeaveDays} days total</span>}>
                    {dash.leaveDistribution.length === 0 ? <EmptyState text="No leave records found for this year." /> : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-center py-1">
                                <div className="h-36 w-36 relative flex items-center justify-center">
                                    <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={dash.leaveDistribution} innerRadius={40} outerRadius={60} paddingAngle={4} dataKey="value">{dash.leaveDistribution.map((e, i) => <Cell key={i} fill={e.color} />)}</Pie></PieChart></ResponsiveContainer>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"><span className="text-lg font-extrabold text-slate-900 font-mono">{totalLeaveDays}</span><span className="text-[10px] font-bold text-slate-400 uppercase">Days</span></div>
                                </div>
                            </div>
                            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                {dash.leaveDistribution.map((item) => <div key={item.name} className="flex items-center justify-between gap-3 text-xs p-2 rounded-xl bg-slate-50/50 hover:bg-slate-100/70 transition-colors"><div className="flex items-center gap-2 min-w-0"><span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} /><span className="text-slate-700 font-semibold truncate">{item.name}</span></div><span className="font-bold text-slate-900 font-mono shrink-0">{item.value} days</span></div>)}
                            </div>
                        </div>
                    )}
                </Panel>

                <Panel icon={Building2} title={managerView ? "Team Composition" : "Department Headcount"} right={<button type="button" onClick={() => go(managerView ? ROUTES.employees : ROUTES.orgChart)} className={viewAllBtn}><span>{managerView ? "Team" : "Org chart"}</span><ArrowUpRight size={12} /></button>}>
                    {dash.groupData.length === 0 ? <EmptyState text={managerView ? "No team members found yet." : "No department data registered."} /> : (
                        <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                            {dash.groupData.map((item) => {
                                const pct = Math.round((item.count / Math.max(dash.totalCount, 1)) * 100);
                                return (
                                    <div key={item.name} className="p-2.5 rounded-xl bg-slate-50/60 border border-slate-200/60 hover:bg-white hover:border-indigo-200 transition">
                                        <div className="flex items-center justify-between gap-3 text-xs mb-1.5"><span className="text-slate-800 font-semibold truncate">{item.name}</span><span className="font-bold text-slate-900 font-mono shrink-0">{item.count} ({pct}%)</span></div>
                                        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden"><div className="h-full bg-indigo-600 rounded-full transition-all duration-700" style={{ width: `${(item.count / (item.max || 1)) * 100}%` }} /></div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </Panel>
            </div>

            <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${adminView ? "xl:grid-cols-4" : "xl:grid-cols-3"}`}>
                <MiniStats icon={Target} title="Performance" subtitle={managerView ? "Your team" : "Whole company"} tiles={perfTiles} empty={perf ? "" : "Not available"} onOpen={() => go(ROUTES.performance)} />
                <MiniStats icon={Headphones} title="Helpdesk" subtitle={adminView ? "All support tickets" : "Your tickets"} tiles={supTiles} onOpen={() => go(ROUTES.tickets)} />
                {adminView && <MiniStats icon={Briefcase} title="Hiring" subtitle="Recruitment pipeline" tiles={hiringTiles} empty={dash.recruit ? "" : "Not available"} onOpen={() => go(ROUTES.recruitment)} />}
                <HolidayMini holidays={dash.holidays} todayYMD={todayYMD} onOpen={() => setHolidaysOpen(true)} />
            </div>

            <MyAttendanceSection data={dash.myAtt} view={attView} setView={setAttView} onOpen={() => go(ROUTES.attendance)} />

            <div className={`grid grid-cols-1 gap-4 ${adminView ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}>
                <div className={adminView ? "lg:col-span-2 min-w-0" : "min-w-0"}>
                    <Panel title={managerView ? "Team Leave Requests" : "Pending Leave Requests"} subtitle={`${dash.pending.length} applications awaiting review`} right={<button type="button" onClick={() => go(ROUTES.leave)} className={viewAllBtn}><span>View All</span><ArrowUpRight size={12} /></button>}>
                        {dash.pending.length === 0 ? <EmptyState icon={CheckCircle2} tone="text-emerald-400" text="All leave requests are up to date" /> : (
                            <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 ${adminView ? "" : "lg:grid-cols-1 xl:grid-cols-2"}`}>
                                {dash.pending.slice(0, 6).map((req) => {
                                    const empName = req.employee?.name || getName(req.employee) || "Unknown Employee";
                                    const empAvatar = avatarUrl(req.employee?.avatar);
                                    return (
                                        <div key={req._id || req.id} onClick={() => go(ROUTES.leave)} className="min-w-0 flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50/70 hover:bg-indigo-50/40 hover:border-indigo-200 border border-slate-200/70 cursor-pointer transition active:scale-[0.99]">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden">
                                                    {empAvatar ? <img src={empAvatar} alt={empName} className="w-full h-full object-cover" /> : getInitials(empName)}
                                                </div>
                                                <div className="min-w-0"><p className="text-xs font-bold text-slate-900 truncate">{empName}</p><p className="text-[11px] text-slate-500 truncate capitalize">{labelOf(req.employee?.department) || req.department || "General Team"} · {req.leaveType}</p></div>
                                            </div>
                                            <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200 font-mono shrink-0">{req.totalDays || 1}d</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </Panel>
                </div>

                {adminView && dash.payrollSummary && (
                    <Panel icon={Wallet} title="Payroll" subtitle={dash.payrollSummary.label} right={<button type="button" onClick={() => go(ROUTES.payroll)} className={viewAllBtn}><span>Open</span><ArrowUpRight size={12} /></button>}>
                        {dash.payrollSummary.count === 0 ? <EmptyState icon={Wallet} tone="text-indigo-300" text="No payroll has been generated yet." /> : (
                            <div className="space-y-3">
                                <div><p className="text-2xl font-extrabold text-slate-900 font-mono truncate">{formatMoney(dash.payrollSummary.totalNet)}</p><p className="text-[11px] text-slate-500">Total net salary · {dash.payrollSummary.count} payslips</p></div>
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    {[["Paid", dash.payrollSummary.paid, "bg-emerald-50 text-emerald-700"], ["Processed", dash.payrollSummary.processed, "bg-indigo-50 text-indigo-700"], ["Draft", dash.payrollSummary.draft, "bg-amber-50 text-amber-700"]].map(([l, v, c]) => <div key={l} className={`rounded-xl py-2 hover:scale-[1.03] transition ${c}`}><p className="text-base font-extrabold font-mono">{v}</p><p className="text-[10px] font-bold uppercase">{l}</p></div>)}
                                </div>
                            </div>
                        )}
                    </Panel>
                )}

                {(managerView || dash.payslip) && <PayslipPanel title="My Latest Payslip" payslip={dash.payslip} onOpen={() => go(ROUTES.myPayslips)} onDownload={downloadPayslip} downloading={dlId === dash.payslip?.id} />}
            </div>

            {tt && (
                <Panel icon={ListChecks} title={managerView ? "Team Tasks" : "Task Overview"} subtitle={`${tt.total} total · ${tt.open} open · ${tt.done} completed`} right={<button type="button" onClick={openTasks} className={viewAllBtn}><span>View All</span><ArrowUpRight size={12} /></button>}>
                    {tt.list.length === 0 ? <EmptyState icon={ListChecks} tone="text-indigo-300" text="No tasks have been assigned yet." /> : <ul className="divide-y divide-slate-100">{tt.list.map((t, i) => <TeamTaskRow key={t._id || t.id || i} t={t} onReview={reviewTask} />)}</ul>}
                </Panel>
            )}

            {tasksOpen && tt && (
                <ListModal title={managerView ? "Team Tasks" : "All Tasks"} subtitle={`${tt.total} total · ${tt.open} open · ${tt.done} completed`} tabs={<TaskTabs tab={modalTab} setTab={setModalTab} />} onClose={() => setTasksOpen(false)}>
                    {teamModalTasks.length === 0 ? <NoData text={tt.total === 0 ? "No tasks have been assigned yet" : "No tasks in this tab"} /> : <ul className="divide-y divide-slate-100 px-4 sm:px-5">{teamModalTasks.map((t, i) => <TeamTaskRow key={t._id || t.id || i} t={t} onReview={reviewTask} />)}</ul>}
                </ListModal>
            )}
            {holidaysOpen && <ListModal title="Holiday Calendar" subtitle={`${new Date().getFullYear()} · ${dash.holidays.length} holidays · Sunday is the weekly off`} onClose={() => setHolidaysOpen(false)}><HolidayList holidays={dash.holidays} todayYMD={todayYMD} /></ListModal>}
            <TaskActionModal state={taskModal} progress={modalProgress} setProgress={setModalProgress} note={modalNote} setNote={setModalNote} link={modalLink} setLink={setModalLink} busy={modalBusy} onClose={() => setTaskModal(null)} onSave={saveTaskModal} />
        </div>
    );
}
