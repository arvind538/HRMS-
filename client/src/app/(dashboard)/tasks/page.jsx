"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
    Plus,
    X,
    Loader2,
    Search,
    Trash2,
    Edit3,
    CalendarDays,
    CheckCircle2,
    ChevronDown,
    ClipboardList,
    MoreVertical,
    Check,
} from "lucide-react";
import { toast } from "react-toastify";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

/* =========================================================
   CONSTANTS
========================================================= */

const FILTERS = [
    { key: "all", label: "All Tasks" },
    { key: "today", label: "Today" },
    { key: "pending", label: "Pending" },
    { key: "completed", label: "Completed" },
    { key: "high", label: "High Priority" },
    { key: "overdue", label: "Overdue" },
    { key: "mine", label: "Assigned to Me" },
];

const STATUS_OPTIONS = [
    { value: "pending", label: "Pending" },
    { value: "in-progress", label: "In Progress" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
];

const PRIORITY_STYLE = {
    low: "bg-slate-100 text-slate-600 border-slate-200",
    medium: "bg-sky-50 text-sky-700 border-sky-200",
    high: "bg-amber-50 text-amber-700 border-amber-200",
    urgent: "bg-rose-50 text-rose-700 border-rose-200",
};

const STATUS_STYLE = {
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    "in-progress": "bg-indigo-50 text-indigo-700 border-indigo-200",
    completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
    cancelled: "bg-slate-100 text-slate-500 border-slate-200",
};

const BAR_STYLE = {
    pending: "bg-amber-400",
    "in-progress": "bg-indigo-500",
    completed: "bg-emerald-500",
    cancelled: "bg-slate-300",
};

const DOT_STYLE = {
    pending: "bg-amber-400",
    "in-progress": "bg-indigo-500",
    completed: "bg-emerald-500",
    cancelled: "bg-slate-400",
};

const EMPTY_FORM = {
    title: "",
    description: "",
    assignedTo: "",
    priority: "",
    startDate: "",
    dueDate: "",
    estimatedHours: "",
};

/* =========================================================
   HELPERS
========================================================= */

const pad2 = (n) => String(n).padStart(2, "0");
const toYMD = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const idOf = (v) => String(v?._id || v || "");

const formatDate = (v) => {
    if (!v) return "—";
    const d = new Date(v);
    return Number.isNaN(d.getTime())
        ? "—"
        : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const progressOf = (t) => {
    if (typeof t.progress === "number") return Math.max(0, Math.min(100, t.progress));
    if (t.status === "completed") return 100;
    if (t.status === "in-progress") return 50;
    return 0;
};

const inputBase =
    "w-full h-11 rounded-xl bg-slate-50 border border-slate-200 px-3.5 text-base sm:text-[13px] text-slate-800 placeholder:text-slate-400 outline-none transition-all duration-200 hover:border-slate-300 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";

/* =========================================================
   SMALL COMPONENTS
========================================================= */

function Field({ label, required, error, children }) {
    return (
        <div className="min-w-0">
            <label className="block text-[12px] font-medium text-slate-600 mb-1.5">
                {label} {required && <span className="text-rose-500">*</span>}
            </label>
            {children}
            {error && <p className="mt-1 text-[11px] font-medium text-rose-600">{error}</p>}
        </div>
    );
}

function DateInput({ value, onChange, placeholder, min }) {
    return (
        <div className="relative">
            <CalendarDays
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
                type="date"
                value={value}
                min={min || undefined}
                onChange={onChange}
                placeholder={placeholder}
                className={`${inputBase} pl-10 cursor-pointer`}
            />
        </div>
    );
}

function SelectBox({ value, onChange, children, disabled }) {
    return (
        <div className="relative">
            <select
                value={value}
                onChange={onChange}
                disabled={disabled}
                className={`${inputBase} appearance-none pr-10 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${value === "" ? "text-slate-400" : ""
                    }`}
            >
                {children}
            </select>
            <ChevronDown
                size={16}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
            />
        </div>
    );
}

function ProgressBar({ task }) {
    const value = progressOf(task);
    return (
        <div className="flex items-center gap-2.5 min-w-[110px]">
            <div className="h-1.5 flex-1 rounded-full bg-slate-100 overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-500 ease-out ${BAR_STYLE[task.status] || "bg-indigo-500"}`}
                    style={{ width: `${value}%` }}
                />
            </div>
            <span className="text-[11px] font-semibold text-slate-500 w-8 text-right">{value}%</span>
        </div>
    );
}

/* ---------- floating menu (portal, never clipped by table scroll) ---------- */

function FloatingMenu({ anchorRef, open, onClose, align = "left", width = 176, children }) {
    const [mounted, setMounted] = useState(false);
    const [visible, setVisible] = useState(false);
    const [pos, setPos] = useState({ top: 0, left: 0, origin: "top" });
    const menuRef = useRef(null);

    // mount -> animate in / animate out -> unmount
    useEffect(() => {
        if (open) {
            setMounted(true);
            const id = requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
            return () => cancelAnimationFrame(id);
        }
        setVisible(false);
        const t = setTimeout(() => setMounted(false), 170);
        return () => clearTimeout(t);
    }, [open]);

    // position next to the trigger (flips above if there is no space below)
    useLayoutEffect(() => {
        if (!mounted) return;
        const update = () => {
            const a = anchorRef.current;
            if (!a) return;
            const r = a.getBoundingClientRect();
            const h = menuRef.current?.offsetHeight || 140;
            let left = align === "right" ? r.right - width : r.left;
            left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
            const below = window.innerHeight - r.bottom;
            const flip = below < h + 16 && r.top > below;
            setPos({
                top: flip ? Math.max(8, r.top - h - 6) : r.bottom + 6,
                left,
                origin: flip ? "bottom" : "top",
            });
        };
        update();
        window.addEventListener("resize", update);
        window.addEventListener("scroll", update, true);
        return () => {
            window.removeEventListener("resize", update);
            window.removeEventListener("scroll", update, true);
        };
    }, [mounted, anchorRef, align, width]);

    // outside click + Escape
    useEffect(() => {
        if (!open) return;
        const onDown = (e) => {
            if (menuRef.current?.contains(e.target)) return;
            if (anchorRef.current?.contains(e.target)) return;
            onClose();
        };
        const onKey = (e) => e.key === "Escape" && onClose();
        document.addEventListener("mousedown", onDown);
        document.addEventListener("touchstart", onDown);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onDown);
            document.removeEventListener("touchstart", onDown);
            document.removeEventListener("keydown", onKey);
        };
    }, [open, onClose, anchorRef]);

    if (!mounted || typeof document === "undefined") return null;

    return createPortal(
        <div
            ref={menuRef}
            role="menu"
            style={{
                position: "fixed",
                top: pos.top,
                left: pos.left,
                width,
                zIndex: 400,
                transformOrigin: `${align === "right" ? "right" : "left"} ${pos.origin}`,
            }}
            className={`rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10 transition-all duration-150 ease-out ${visible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 -translate-y-1"
                }`}
        >
            {children}
        </div>,
        document.body
    );
}

/* ---------- status dropdown ---------- */

function StatusControl({ task, canStatus, onChange }) {
    const [open, setOpen] = useState(false);
    const btnRef = useRef(null);
    const close = useCallback(() => setOpen(false), []);
    const label = STATUS_OPTIONS.find((o) => o.value === task.status)?.label || task.status;

    if (!canStatus) {
        return (
            <span
                className={`inline-flex items-center h-8 px-2.5 rounded-lg border text-[11px] font-semibold ${STATUS_STYLE[task.status] || ""}`}
            >
                {label}
            </span>
        );
    }

    return (
        <>
            <button
                ref={btnRef}
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={open}
                className={`inline-flex items-center gap-1.5 h-8 pl-2.5 pr-2 rounded-lg border text-[11px] font-semibold outline-none cursor-pointer transition-all duration-150 hover:brightness-95 focus-visible:ring-4 focus-visible:ring-indigo-500/10 ${STATUS_STYLE[task.status] || ""}`}
            >
                {label}
                <ChevronDown
                    size={13}
                    className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                />
            </button>

            <FloatingMenu anchorRef={btnRef} open={open} onClose={close} align="left" width={176}>
                {STATUS_OPTIONS.map((o) => {
                    const active = o.value === task.status;
                    return (
                        <button
                            key={o.value}
                            type="button"
                            role="menuitem"
                            onClick={() => {
                                close();
                                if (!active) onChange(task, o.value);
                            }}
                            className={`w-full flex items-center gap-2.5 h-9 px-2.5 rounded-lg text-[12px] font-medium transition-colors duration-150 ${active
                                ? "bg-indigo-50 text-indigo-700"
                                : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                                }`}
                        >
                            <span className={`h-2 w-2 rounded-full ${DOT_STYLE[o.value]}`} />
                            <span className="flex-1 text-left">{o.label}</span>
                            {active && <Check size={14} className="text-indigo-600" />}
                        </button>
                    );
                })}
            </FloatingMenu>
        </>
    );
}

/* ---------- action three-dot menu ---------- */

function Actions({ task, canEdit, onEdit, onDelete }) {
    const [open, setOpen] = useState(false);
    const btnRef = useRef(null);
    const close = useCallback(() => setOpen(false), []);

    if (!canEdit) return <span className="block text-right text-slate-300">—</span>;

    return (
        <div className="flex items-center justify-end">
            <button
                ref={btnRef}
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-label="More actions"
                aria-haspopup="menu"
                aria-expanded={open}
                title="Actions"
                className={`h-8 w-8 flex items-center justify-center rounded-lg border transition-all duration-150 ${open
                    ? "bg-indigo-50 border-indigo-200 text-indigo-600"
                    : "border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200"
                    }`}
            >
                <MoreVertical size={16} />
            </button>

            <FloatingMenu anchorRef={btnRef} open={open} onClose={close} align="right" width={152}>
                <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                        close();
                        onEdit(task);
                    }}
                    className="w-full flex items-center gap-2.5 h-9 px-2.5 rounded-lg text-[12px] font-medium text-slate-600 transition-colors duration-150 hover:bg-indigo-50 hover:text-indigo-700"
                >
                    <Edit3 size={14} />
                    Edit
                </button>
                <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                        close();
                        onDelete(task);
                    }}
                    className="w-full flex items-center gap-2.5 h-9 px-2.5 rounded-lg text-[12px] font-medium text-rose-600 transition-colors duration-150 hover:bg-rose-50"
                >
                    <Trash2 size={14} />
                    Delete
                </button>
            </FloatingMenu>
        </div>
    );
}

/* =========================================================
   PAGE
========================================================= */

export default function TasksPage() {
    const { user } = useAuth();
    const role = String(user?.role || "").toLowerCase();
    const me = String(user?._id || "");
    const canAssign = ["admin", "hr", "manager"].includes(role);
    const isPrivileged = ["admin", "hr"].includes(role);

    const [tasks, setTasks] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [filter, setFilter] = useState("all");
    const [search, setSearch] = useState("");
    const [modal, setModal] = useState(null); // { mode: "create" } | { mode: "edit", task }
    const [shown, setShown] = useState(false); // drives the open / close animation
    const [form, setForm] = useState(EMPTY_FORM);
    const [errors, setErrors] = useState({});
    const closeTimer = useRef(null);

    /* ---------- data ---------- */

    const loadTasks = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get("/tasks");
            const list =
                res?.data?.tasks || res?.data?.data || (Array.isArray(res?.data) ? res.data : []);
            setTasks(list);
        } catch (err) {
            toast.error(err?.response?.data?.message || "Unable to load tasks.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadTasks();
    }, [loadTasks]);

    useEffect(() => {
        if (!canAssign) return;
        api
            .get("/employees")
            .then((res) =>
                setEmployees(Array.isArray(res.data) ? res.data : res.data?.employees || [])
            )
            .catch(() => { });
    }, [canAssign]);

    /* ---------- modal open / close (smooth) ---------- */

    const openModal = (next, nextForm) => {
        clearTimeout(closeTimer.current);
        setForm(nextForm);
        setErrors({});
        setModal(next);
        requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
    };

    const closeModal = useCallback(() => {
        setShown(false);
        clearTimeout(closeTimer.current);
        closeTimer.current = setTimeout(() => setModal(null), 220);
    }, []);

    useEffect(() => () => clearTimeout(closeTimer.current), []);

    useEffect(() => {
        if (!modal) return;
        const onKey = (e) => e.key === "Escape" && closeModal();
        const previous = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = previous;
            window.removeEventListener("keydown", onKey);
        };
    }, [modal, closeModal]);

    const openCreate = () => openModal({ mode: "create" }, EMPTY_FORM);

    const openEdit = (task) =>
        openModal(
            { mode: "edit", task },
            {
                title: task.title || "",
                description: task.description || "",
                assignedTo: idOf(task.assignedTo),
                priority: task.priority || "medium",
                startDate: task.startDate ? toYMD(new Date(task.startDate)) : "",
                dueDate: task.dueDate ? toYMD(new Date(task.dueDate)) : "",
                estimatedHours:
                    task.estimatedHours === null || task.estimatedHours === undefined
                        ? ""
                        : String(task.estimatedHours),
            }
        );

    /* ---------- filters ---------- */

    const todayYMD = toYMD(new Date());

    const isOverdue = (t) =>
        t.dueDate &&
        toYMD(new Date(t.dueDate)) < todayYMD &&
        !["completed", "cancelled"].includes(t.status);

    const matchers = useMemo(
        () => ({
            all: () => true,
            today: (t) => t.dueDate && toYMD(new Date(t.dueDate)) === todayYMD,
            pending: (t) => t.status === "pending",
            completed: (t) => t.status === "completed",
            high: (t) => ["high", "urgent"].includes(t.priority),
            overdue: (t) => isOverdue(t),
            mine: (t) => idOf(t.assignedTo) === me,
        }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [todayYMD, me]
    );

    const counts = useMemo(() => {
        const out = {};
        FILTERS.forEach((f) => {
            out[f.key] = tasks.filter(matchers[f.key]).length;
        });
        return out;
    }, [tasks, matchers]);

    const visible = useMemo(() => {
        const q = search.trim().toLowerCase();
        return tasks.filter((t) => {
            if (!matchers[filter](t)) return false;
            if (q && !String(t.title || "").toLowerCase().includes(q)) return false;
            return true;
        });
    }, [tasks, filter, search, matchers]);

    /* ---------- actions ---------- */

    const validate = () => {
        const next = {};
        if (form.title.trim().length < 2) next.title = "Title is required (min 2 characters).";
        if (modal.mode === "create" && canAssign && !form.assignedTo)
            next.assignedTo = "Please select an employee.";
        if (!form.priority) next.priority = "Please select a priority.";
        if (form.startDate && form.dueDate && form.dueDate < form.startDate)
            next.dueDate = "Due date cannot be before the start date.";
        if (
            form.estimatedHours !== "" &&
            (Number.isNaN(Number(form.estimatedHours)) || Number(form.estimatedHours) < 0)
        )
            next.estimatedHours = "Enter a valid number of hours.";
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const submit = async (e) => {
        e.preventDefault();
        if (saving || !validate()) return;

        setSaving(true);
        try {
            const payload = {
                title: form.title.trim(),
                description: form.description.trim(),
                priority: form.priority,
                startDate: form.startDate || null,
                dueDate: form.dueDate || null,
                estimatedHours: form.estimatedHours === "" ? null : Number(form.estimatedHours),
            };

            if (modal.mode === "create") {
                if (canAssign) payload.assignedTo = form.assignedTo;
                await api.post("/tasks", payload);
                toast.success("Task created successfully.");
            } else {
                await api.put(`/tasks/${modal.task._id}`, payload);
                toast.success("Task updated successfully.");
            }
            closeModal();
            loadTasks();
        } catch (err) {
            toast.error(err?.response?.data?.message || "Unable to save the task.");
        } finally {
            setSaving(false);
        }
    };

    const changeStatus = async (task, status) => {
        const previous = tasks;
        setTasks((list) => list.map((t) => (t._id === task._id ? { ...t, status } : t)));
        try {
            await api.put(`/tasks/${task._id}`, { status });
        } catch (err) {
            setTasks(previous);
            toast.error(err?.response?.data?.message || "Unable to update the status.");
        }
    };

    const remove = async (task) => {
        if (!window.confirm("Delete this task?")) return;
        try {
            await api.delete(`/tasks/${task._id}`);
            setTasks((list) => list.filter((t) => t._id !== task._id));
            toast.success("Task deleted.");
        } catch (err) {
            toast.error(err?.response?.data?.message || "Unable to delete the task.");
        }
    };

    /* ---------- per-task permissions ---------- */

    const perms = (task) => {
        const isAssignee = idOf(task.assignedTo) === me;
        const isAssigner = idOf(task.assignedBy) === me;
        return {
            isAssignee,
            canEdit: isPrivileged || isAssigner,
            canStatus: isPrivileged || isAssignee || isAssigner,
        };
    };

    const assigneeText = (task, isAssignee) => (isAssignee ? "You" : task.assignedTo?.name || "—");

    /* =========================================================
       RENDER
    ========================================================= */

    return (
        <div className="w-full max-w-[1400px] mx-auto px-3 sm:px-5 py-4 space-y-4 antialiased overflow-x-hidden">
            {/* FILTER CHIPS */}
            <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {FILTERS.map((f) => {
                    const active = filter === f.key;
                    return (
                        <button
                            key={f.key}
                            type="button"
                            onClick={() => setFilter(f.key)}
                            className={`shrink-0 inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full border text-[11px] font-medium transition-all duration-200 ${active
                                ? "bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-500/30"
                                : "bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/50"
                                }`}
                        >
                            {f.label}
                            {!loading && counts[f.key] > 0 && f.key !== "all" && (
                                <span
                                    className={`min-w-[18px] px-1 rounded-full text-[10px] leading-[18px] text-center ${active ? "bg-white/25" : "bg-slate-100 text-slate-500"
                                        }`}
                                >
                                    {counts[f.key]}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* MAIN CARD */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-4 sm:p-6 min-h-[360px]">
                {/* Card header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h1 className="text-lg font-semibold text-slate-700">Tasks</h1>

                    <div className="flex items-center gap-2.5">
                        <div className="relative flex-1 sm:w-64 sm:flex-none">
                            <Search
                                size={15}
                                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                            />
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Title"
                                className="w-full h-10 pl-10 pr-3 rounded-xl bg-slate-50 border border-slate-200 text-base sm:text-[13px] text-slate-700 placeholder:text-slate-400 outline-none transition-all duration-200 focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={openCreate}
                            className="shrink-0 inline-flex items-center gap-1.5 h-10 px-5 rounded-xl bg-indigo-600 text-white text-[13px] font-medium shadow-sm shadow-indigo-500/30 transition-all duration-200 hover:bg-indigo-700 hover:shadow-md hover:-translate-y-px active:translate-y-0"
                        >
                            <Plus size={15} strokeWidth={2.4} />
                            Add Task
                        </button>
                    </div>
                </div>

                {/* DESKTOP TABLE (lg and up) */}
                <div className="hidden lg:block mt-5 overflow-x-auto">
                    <table className="w-full border-separate border-spacing-0 min-w-[900px]">
                        <thead>
                            <tr className="text-left text-[12px] font-medium text-slate-500">
                                {["Title", "Assigned To", "Priority", "Status", "Due Date", "Progress", "Action"].map(
                                    (h, i, arr) => (
                                        <th
                                            key={h}
                                            className={`bg-slate-50 py-3 px-4 font-medium ${i === 0 ? "rounded-l-xl pl-5" : ""
                                                } ${i === arr.length - 1 ? "rounded-r-xl text-right pr-5" : ""}`}
                                        >
                                            {h}
                                        </th>
                                    )
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="py-20 text-center">
                                        <Loader2 size={26} className="mx-auto animate-spin text-indigo-600" />
                                        <p className="mt-2 text-xs text-slate-400">Loading tasks...</p>
                                    </td>
                                </tr>
                            ) : visible.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-20 text-center">
                                        <ClipboardList size={30} className="mx-auto text-slate-300" />
                                        <p className="mt-2 text-sm font-medium text-slate-600">No tasks found</p>
                                        <p className="text-xs text-slate-400">
                                            Click "Add Task" or change the filter.
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                visible.map((task) => {
                                    const { isAssignee, canEdit, canStatus } = perms(task);
                                    const overdue = isOverdue(task);
                                    return (
                                        <tr
                                            key={task._id}
                                            className="group transition-colors duration-150 hover:bg-indigo-50/40"
                                        >
                                            <td className="py-3.5 px-4 pl-5 border-b border-slate-100 max-w-[260px]">
                                                <p className="text-[13px] font-semibold text-slate-800 truncate">
                                                    {task.title}
                                                </p>
                                                {task.description && (
                                                    <p className="text-[11px] text-slate-400 truncate">
                                                        {task.description}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="py-3.5 px-4 border-b border-slate-100 text-[13px] text-slate-600">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className="h-7 w-7 shrink-0 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center">
                                                        {(assigneeText(task, isAssignee)[0] || "?").toUpperCase()}
                                                    </span>
                                                    <span className="truncate">{assigneeText(task, isAssignee)}</span>
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4 border-b border-slate-100">
                                                <span
                                                    className={`inline-flex px-2.5 py-1 rounded-md border text-[11px] font-semibold capitalize ${PRIORITY_STYLE[task.priority] || PRIORITY_STYLE.medium
                                                        }`}
                                                >
                                                    {task.priority || "medium"}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4 border-b border-slate-100">
                                                <StatusControl
                                                    task={task}
                                                    canStatus={canStatus}
                                                    onChange={changeStatus}
                                                />
                                            </td>
                                            <td
                                                className={`py-3.5 px-4 border-b border-slate-100 text-[13px] whitespace-nowrap ${overdue ? "text-rose-600 font-semibold" : "text-slate-600"
                                                    }`}
                                            >
                                                {formatDate(task.dueDate)}
                                                {overdue && (
                                                    <span className="block text-[10px] font-semibold">Overdue</span>
                                                )}
                                            </td>
                                            <td className="py-3.5 px-4 border-b border-slate-100">
                                                <ProgressBar task={task} />
                                            </td>
                                            <td className="py-3.5 px-4 pr-5 border-b border-slate-100">
                                                <Actions
                                                    task={task}
                                                    canEdit={canEdit}
                                                    onEdit={openEdit}
                                                    onDelete={remove}
                                                />
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* TABLET + MOBILE CARDS (below lg): 1 column on mobile, 2 columns on tablet */}
                <div className="lg:hidden mt-4">
                    {loading ? (
                        <div className="py-16 text-center">
                            <Loader2 size={26} className="mx-auto animate-spin text-indigo-600" />
                            <p className="mt-2 text-xs text-slate-400">Loading tasks...</p>
                        </div>
                    ) : visible.length === 0 ? (
                        <div className="py-16 text-center">
                            <ClipboardList size={30} className="mx-auto text-slate-300" />
                            <p className="mt-2 text-sm font-medium text-slate-600">No tasks found</p>
                            <p className="text-xs text-slate-400">Click "Add Task" or change the filter.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {visible.map((task) => {
                                const { isAssignee, canEdit, canStatus } = perms(task);
                                const overdue = isOverdue(task);
                                return (
                                    <div
                                        key={task._id}
                                        className="rounded-2xl border border-slate-200 p-4 space-y-3 transition-shadow hover:shadow-md"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <h3 className="text-sm font-semibold text-slate-800 break-words min-w-0">
                                                {task.title}
                                            </h3>
                                            <span
                                                className={`shrink-0 px-2 py-0.5 rounded-md border text-[10px] font-semibold capitalize ${PRIORITY_STYLE[task.priority] || PRIORITY_STYLE.medium
                                                    }`}
                                            >
                                                {task.priority || "medium"}
                                            </span>
                                        </div>

                                        {task.description && (
                                            <p className="text-xs text-slate-500 line-clamp-2 break-words">
                                                {task.description}
                                            </p>
                                        )}

                                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
                                            <span>
                                                Assigned: <b className="text-slate-700">{assigneeText(task, isAssignee)}</b>
                                            </span>
                                            <span className={overdue ? "text-rose-600 font-semibold" : ""}>
                                                Due: {formatDate(task.dueDate)}
                                            </span>
                                        </div>

                                        <ProgressBar task={task} />

                                        <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                                            <StatusControl
                                                task={task}
                                                canStatus={canStatus}
                                                onChange={changeStatus}
                                            />
                                            <Actions
                                                task={task}
                                                canEdit={canEdit}
                                                onEdit={openEdit}
                                                onDelete={remove}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* CREATE / EDIT MODAL */}
            {modal && (
                <div
                    onClick={closeModal}
                    className={`fixed inset-0 z-[300] flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-[3px] p-0 sm:p-6 transition-opacity duration-200 ${shown ? "opacity-100" : "opacity-0"
                        }`}
                >
                    <form
                        onSubmit={submit}
                        noValidate
                        onClick={(e) => e.stopPropagation()}
                        className={`w-full max-w-[640px] bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[92dvh] flex flex-col overflow-hidden transition-all duration-300 ease-out ${shown
                            ? "opacity-100 translate-y-0 sm:scale-100"
                            : "opacity-0 translate-y-8 sm:translate-y-3 sm:scale-95"
                            }`}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4">
                            <h2 className="text-[15px] font-semibold text-slate-800">
                                {modal.mode === "create" ? "Create Task" : "Edit Task"}
                            </h2>
                            <button
                                type="button"
                                onClick={closeModal}
                                aria-label="Close"
                                className="h-7 w-7 flex items-center justify-center rounded-full border border-slate-300 text-slate-400 transition-all duration-150 hover:text-rose-500 hover:border-rose-300 hover:rotate-90"
                            >
                                <X size={14} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto overscroll-contain px-5 sm:px-6 pb-2 space-y-4">
                            <Field label="Title" required error={errors.title}>
                                <input
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value.slice(0, 150) })}
                                    placeholder="Title"
                                    className={inputBase}
                                    autoFocus
                                />
                            </Field>

                            <Field label="Description">
                                <textarea
                                    rows={3}
                                    value={form.description}
                                    onChange={(e) =>
                                        setForm({ ...form, description: e.target.value.slice(0, 2000) })
                                    }
                                    placeholder="Description"
                                    className={`${inputBase} h-auto py-3 resize-none`}
                                />
                            </Field>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {canAssign && (
                                    <Field
                                        label="Assigned To"
                                        required={modal.mode === "create"}
                                        error={errors.assignedTo}
                                    >
                                        <SelectBox
                                            value={form.assignedTo}
                                            disabled={modal.mode === "edit"}
                                            onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
                                        >
                                            <option value="">Select Assigned To</option>
                                            {employees.map((emp) => (
                                                <option key={emp._id} value={emp._id}>
                                                    {emp.name} ({emp.employeeId || "—"})
                                                </option>
                                            ))}
                                        </SelectBox>
                                    </Field>
                                )}

                                <Field label="Priority" required error={errors.priority}>
                                    <SelectBox
                                        value={form.priority}
                                        onChange={(e) => setForm({ ...form, priority: e.target.value })}
                                    >
                                        <option value="">Priority</option>
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                        <option value="urgent">Urgent</option>
                                    </SelectBox>
                                </Field>

                                <Field label="Start Date">
                                    <DateInput
                                        value={form.startDate}
                                        placeholder="Start Date"
                                        onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                                    />
                                </Field>

                                <Field label="Due Date" error={errors.dueDate}>
                                    <DateInput
                                        value={form.dueDate}
                                        min={form.startDate}
                                        placeholder="Due Date"
                                        onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                                    />
                                </Field>

                                <Field label="Estimated Hours" error={errors.estimatedHours}>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.5"
                                        inputMode="decimal"
                                        value={form.estimatedHours}
                                        onChange={(e) => setForm({ ...form, estimatedHours: e.target.value })}
                                        placeholder="Estimated Hours"
                                        className={inputBase}
                                    />
                                </Field>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end gap-2.5 px-5 sm:px-6 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
                            <button
                                type="button"
                                onClick={closeModal}
                                className="h-10 px-6 rounded-xl border border-indigo-600 text-indigo-600 text-[13px] font-medium transition-all duration-200 hover:bg-indigo-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="inline-flex items-center justify-center gap-2 h-10 px-6 rounded-xl bg-indigo-600 text-white text-[13px] font-medium shadow-sm shadow-indigo-500/30 transition-all duration-200 hover:bg-indigo-700 hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {saving ? (
                                    <Loader2 size={15} className="animate-spin" />
                                ) : (
                                    <CheckCircle2 size={15} />
                                )}
                                {saving ? "Saving..." : "Save"}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
















// "use client";

// import { useCallback, useEffect, useMemo, useRef, useState } from "react";
// import {
//     Plus,
//     X,
//     Loader2,
//     Search,
//     Trash2,
//     Edit3,
//     CalendarDays,
//     CheckCircle2,
//     ChevronDown,
//     ClipboardList,
// } from "lucide-react";
// import { toast } from "react-toastify";
// import api from "@/lib/api";
// import { useAuth } from "@/context/AuthContext";

// /* =========================================================
//    CONSTANTS
// ========================================================= */

// const FILTERS = [
//     { key: "all", label: "All Tasks" },
//     { key: "today", label: "Today" },
//     { key: "pending", label: "Pending" },
//     { key: "completed", label: "Completed" },
//     { key: "high", label: "High Priority" },
//     { key: "overdue", label: "Overdue" },
//     { key: "mine", label: "Assigned to Me" },
// ];

// const STATUS_OPTIONS = [
//     { value: "pending", label: "Pending" },
//     { value: "in-progress", label: "In Progress" },
//     { value: "completed", label: "Completed" },
//     { value: "cancelled", label: "Cancelled" },
// ];

// const PRIORITY_STYLE = {
//     low: "bg-slate-100 text-slate-600 border-slate-200",
//     medium: "bg-sky-50 text-sky-700 border-sky-200",
//     high: "bg-amber-50 text-amber-700 border-amber-200",
//     urgent: "bg-rose-50 text-rose-700 border-rose-200",
// };

// const STATUS_STYLE = {
//     pending: "bg-amber-50 text-amber-700 border-amber-200",
//     "in-progress": "bg-indigo-50 text-indigo-700 border-indigo-200",
//     completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
//     cancelled: "bg-slate-100 text-slate-500 border-slate-200",
// };

// const BAR_STYLE = {
//     pending: "bg-amber-400",
//     "in-progress": "bg-indigo-500",
//     completed: "bg-emerald-500",
//     cancelled: "bg-slate-300",
// };

// const EMPTY_FORM = {
//     title: "",
//     description: "",
//     assignedTo: "",
//     priority: "",
//     startDate: "",
//     dueDate: "",
//     estimatedHours: "",
// };

// /* =========================================================
//    HELPERS
// ========================================================= */

// const pad2 = (n) => String(n).padStart(2, "0");
// const toYMD = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
// const idOf = (v) => String(v?._id || v || "");

// const formatDate = (v) => {
//     if (!v) return "—";
//     const d = new Date(v);
//     return Number.isNaN(d.getTime())
//         ? "—"
//         : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
// };

// const progressOf = (t) => {
//     if (typeof t.progress === "number") return Math.max(0, Math.min(100, t.progress));
//     if (t.status === "completed") return 100;
//     if (t.status === "in-progress") return 50;
//     return 0;
// };

// const inputBase =
//     "w-full h-11 rounded-xl bg-slate-50 border border-slate-200 px-3.5 text-base sm:text-[13px] text-slate-800 placeholder:text-slate-400 outline-none transition-all duration-200 hover:border-slate-300 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";

// /* =========================================================
//    SMALL COMPONENTS
// ========================================================= */

// function Field({ label, required, error, children }) {
//     return (
//         <div className="min-w-0">
//             <label className="block text-[12px] font-medium text-slate-600 mb-1.5">
//                 {label} {required && <span className="text-rose-500">*</span>}
//             </label>
//             {children}
//             {error && <p className="mt-1 text-[11px] font-medium text-rose-600">{error}</p>}
//         </div>
//     );
// }

// function DateInput({ value, onChange, placeholder, min }) {
//     return (
//         <div className="relative">
//             <CalendarDays
//                 size={15}
//                 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
//             />
//             <input
//                 type="date"
//                 value={value}
//                 min={min || undefined}
//                 onChange={onChange}
//                 placeholder={placeholder}
//                 className={`${inputBase} pl-10 cursor-pointer`}
//             />
//         </div>
//     );
// }

// function SelectBox({ value, onChange, children, disabled }) {
//     return (
//         <div className="relative">
//             <select
//                 value={value}
//                 onChange={onChange}
//                 disabled={disabled}
//                 className={`${inputBase} appearance-none pr-10 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${value === "" ? "text-slate-400" : ""
//                     }`}
//             >
//                 {children}
//             </select>
//             <ChevronDown
//                 size={16}
//                 className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
//             />
//         </div>
//     );
// }

// function ProgressBar({ task }) {
//     const value = progressOf(task);
//     return (
//         <div className="flex items-center gap-2.5 min-w-[110px]">
//             <div className="h-1.5 flex-1 rounded-full bg-slate-100 overflow-hidden">
//                 <div
//                     className={`h-full rounded-full transition-all duration-500 ease-out ${BAR_STYLE[task.status] || "bg-indigo-500"}`}
//                     style={{ width: `${value}%` }}
//                 />
//             </div>
//             <span className="text-[11px] font-semibold text-slate-500 w-8 text-right">{value}%</span>
//         </div>
//     );
// }

// /* =========================================================
//    PAGE
// ========================================================= */

// export default function TasksPage() {
//     const { user } = useAuth();
//     const role = String(user?.role || "").toLowerCase();
//     const me = String(user?._id || "");
//     const canAssign = ["admin", "hr", "manager"].includes(role);
//     const isPrivileged = ["admin", "hr"].includes(role);

//     const [tasks, setTasks] = useState([]);
//     const [employees, setEmployees] = useState([]);
//     const [loading, setLoading] = useState(true);
//     const [saving, setSaving] = useState(false);
//     const [filter, setFilter] = useState("all");
//     const [search, setSearch] = useState("");
//     const [modal, setModal] = useState(null); // { mode: "create" } | { mode: "edit", task }
//     const [shown, setShown] = useState(false); // drives the open / close animation
//     const [form, setForm] = useState(EMPTY_FORM);
//     const [errors, setErrors] = useState({});
//     const closeTimer = useRef(null);

//     /* ---------- data ---------- */

//     const loadTasks = useCallback(async () => {
//         setLoading(true);
//         try {
//             const res = await api.get("/tasks");
//             const list =
//                 res?.data?.tasks || res?.data?.data || (Array.isArray(res?.data) ? res.data : []);
//             setTasks(list);
//         } catch (err) {
//             toast.error(err?.response?.data?.message || "Unable to load tasks.");
//         } finally {
//             setLoading(false);
//         }
//     }, []);

//     useEffect(() => {
//         loadTasks();
//     }, [loadTasks]);

//     useEffect(() => {
//         if (!canAssign) return;
//         api
//             .get("/employees")
//             .then((res) =>
//                 setEmployees(Array.isArray(res.data) ? res.data : res.data?.employees || [])
//             )
//             .catch(() => { });
//     }, [canAssign]);

//     /* ---------- modal open / close (smooth) ---------- */

//     const openModal = (next, nextForm) => {
//         clearTimeout(closeTimer.current);
//         setForm(nextForm);
//         setErrors({});
//         setModal(next);
//         requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
//     };

//     const closeModal = useCallback(() => {
//         setShown(false);
//         clearTimeout(closeTimer.current);
//         closeTimer.current = setTimeout(() => setModal(null), 220);
//     }, []);

//     useEffect(() => () => clearTimeout(closeTimer.current), []);

//     useEffect(() => {
//         if (!modal) return;
//         const onKey = (e) => e.key === "Escape" && closeModal();
//         const previous = document.body.style.overflow;
//         document.body.style.overflow = "hidden";
//         window.addEventListener("keydown", onKey);
//         return () => {
//             document.body.style.overflow = previous;
//             window.removeEventListener("keydown", onKey);
//         };
//     }, [modal, closeModal]);

//     const openCreate = () => openModal({ mode: "create" }, EMPTY_FORM);

//     const openEdit = (task) =>
//         openModal(
//             { mode: "edit", task },
//             {
//                 title: task.title || "",
//                 description: task.description || "",
//                 assignedTo: idOf(task.assignedTo),
//                 priority: task.priority || "medium",
//                 startDate: task.startDate ? toYMD(new Date(task.startDate)) : "",
//                 dueDate: task.dueDate ? toYMD(new Date(task.dueDate)) : "",
//                 estimatedHours:
//                     task.estimatedHours === null || task.estimatedHours === undefined
//                         ? ""
//                         : String(task.estimatedHours),
//             }
//         );

//     /* ---------- filters ---------- */

//     const todayYMD = toYMD(new Date());

//     const isOverdue = (t) =>
//         t.dueDate &&
//         toYMD(new Date(t.dueDate)) < todayYMD &&
//         !["completed", "cancelled"].includes(t.status);

//     const matchers = useMemo(
//         () => ({
//             all: () => true,
//             today: (t) => t.dueDate && toYMD(new Date(t.dueDate)) === todayYMD,
//             pending: (t) => t.status === "pending",
//             completed: (t) => t.status === "completed",
//             high: (t) => ["high", "urgent"].includes(t.priority),
//             overdue: (t) => isOverdue(t),
//             mine: (t) => idOf(t.assignedTo) === me,
//         }),
//         // eslint-disable-next-line react-hooks/exhaustive-deps
//         [todayYMD, me]
//     );

//     const counts = useMemo(() => {
//         const out = {};
//         FILTERS.forEach((f) => {
//             out[f.key] = tasks.filter(matchers[f.key]).length;
//         });
//         return out;
//     }, [tasks, matchers]);

//     const visible = useMemo(() => {
//         const q = search.trim().toLowerCase();
//         return tasks.filter((t) => {
//             if (!matchers[filter](t)) return false;
//             if (q && !String(t.title || "").toLowerCase().includes(q)) return false;
//             return true;
//         });
//     }, [tasks, filter, search, matchers]);

//     /* ---------- actions ---------- */

//     const validate = () => {
//         const next = {};
//         if (form.title.trim().length < 2) next.title = "Title is required (min 2 characters).";
//         if (modal.mode === "create" && canAssign && !form.assignedTo)
//             next.assignedTo = "Please select an employee.";
//         if (!form.priority) next.priority = "Please select a priority.";
//         if (form.startDate && form.dueDate && form.dueDate < form.startDate)
//             next.dueDate = "Due date cannot be before the start date.";
//         if (
//             form.estimatedHours !== "" &&
//             (Number.isNaN(Number(form.estimatedHours)) || Number(form.estimatedHours) < 0)
//         )
//             next.estimatedHours = "Enter a valid number of hours.";
//         setErrors(next);
//         return Object.keys(next).length === 0;
//     };

//     const submit = async (e) => {
//         e.preventDefault();
//         if (saving || !validate()) return;

//         setSaving(true);
//         try {
//             const payload = {
//                 title: form.title.trim(),
//                 description: form.description.trim(),
//                 priority: form.priority,
//                 startDate: form.startDate || null,
//                 dueDate: form.dueDate || null,
//                 estimatedHours: form.estimatedHours === "" ? null : Number(form.estimatedHours),
//             };

//             if (modal.mode === "create") {
//                 if (canAssign) payload.assignedTo = form.assignedTo;
//                 await api.post("/tasks", payload);
//                 toast.success("Task created successfully.");
//             } else {
//                 await api.put(`/tasks/${modal.task._id}`, payload);
//                 toast.success("Task updated successfully.");
//             }
//             closeModal();
//             loadTasks();
//         } catch (err) {
//             toast.error(err?.response?.data?.message || "Unable to save the task.");
//         } finally {
//             setSaving(false);
//         }
//     };

//     const changeStatus = async (task, status) => {
//         const previous = tasks;
//         setTasks((list) => list.map((t) => (t._id === task._id ? { ...t, status } : t)));
//         try {
//             await api.put(`/tasks/${task._id}`, { status });
//         } catch (err) {
//             setTasks(previous);
//             toast.error(err?.response?.data?.message || "Unable to update the status.");
//         }
//     };

//     const remove = async (task) => {
//         if (!window.confirm("Delete this task?")) return;
//         try {
//             await api.delete(`/tasks/${task._id}`);
//             setTasks((list) => list.filter((t) => t._id !== task._id));
//             toast.success("Task deleted.");
//         } catch (err) {
//             toast.error(err?.response?.data?.message || "Unable to delete the task.");
//         }
//     };

//     /* ---------- per-task permissions ---------- */

//     const perms = (task) => {
//         const isAssignee = idOf(task.assignedTo) === me;
//         const isAssigner = idOf(task.assignedBy) === me;
//         return {
//             isAssignee,
//             canEdit: isPrivileged || isAssigner,
//             canStatus: isPrivileged || isAssignee || isAssigner,
//         };
//     };

//     const StatusControl = ({ task, canStatus }) =>
//         canStatus ? (
//             <select
//                 value={task.status}
//                 onChange={(e) => changeStatus(task, e.target.value)}
//                 className={`h-8 px-2.5 rounded-lg border text-[11px] font-semibold outline-none cursor-pointer transition-colors hover:brightness-95 ${STATUS_STYLE[task.status] || ""}`}
//             >
//                 {STATUS_OPTIONS.map((o) => (
//                     <option key={o.value} value={o.value}>
//                         {o.label}
//                     </option>
//                 ))}
//             </select>
//         ) : (
//             <span
//                 className={`inline-flex items-center h-8 px-2.5 rounded-lg border text-[11px] font-semibold ${STATUS_STYLE[task.status] || ""}`}
//             >
//                 {STATUS_OPTIONS.find((o) => o.value === task.status)?.label || task.status}
//             </span>
//         );

//     const Actions = ({ task, canEdit }) =>
//         canEdit ? (
//             <div className="flex items-center justify-end gap-1.5">
//                 <button
//                     type="button"
//                     onClick={() => openEdit(task)}
//                     aria-label="Edit task"
//                     title="Edit"
//                     className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-all duration-150 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200"
//                 >
//                     <Edit3 size={14} />
//                 </button>
//                 <button
//                     type="button"
//                     onClick={() => remove(task)}
//                     aria-label="Delete task"
//                     title="Delete"
//                     className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-all duration-150 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200"
//                 >
//                     <Trash2 size={14} />
//                 </button>
//             </div>
//         ) : (
//             <span className="block text-right text-slate-300">—</span>
//         );

//     const assigneeText = (task, isAssignee) => (isAssignee ? "You" : task.assignedTo?.name || "—");

//     /* =========================================================
//        RENDER
//     ========================================================= */

//     return (
//         <div className="w-full max-w-[1400px] mx-auto px-3 sm:px-5 py-4 space-y-4 antialiased overflow-x-hidden">
//             {/* FILTER CHIPS */}
//             <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
//                 {FILTERS.map((f) => {
//                     const active = filter === f.key;
//                     return (
//                         <button
//                             key={f.key}
//                             type="button"
//                             onClick={() => setFilter(f.key)}
//                             className={`shrink-0 inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full border text-[11px] font-medium transition-all duration-200 ${active
//                                 ? "bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-500/30"
//                                 : "bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/50"
//                                 }`}
//                         >
//                             {f.label}
//                             {!loading && counts[f.key] > 0 && f.key !== "all" && (
//                                 <span
//                                     className={`min-w-[18px] px-1 rounded-full text-[10px] leading-[18px] text-center ${active ? "bg-white/25" : "bg-slate-100 text-slate-500"
//                                         }`}
//                                 >
//                                     {counts[f.key]}
//                                 </span>
//                             )}
//                         </button>
//                     );
//                 })}
//             </div>

//             {/* MAIN CARD */}
//             <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-4 sm:p-6 min-h-[360px]">
//                 {/* Card header */}
//                 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
//                     <h1 className="text-lg font-semibold text-slate-700">Tasks</h1>

//                     <div className="flex items-center gap-2.5">
//                         <div className="relative flex-1 sm:w-64 sm:flex-none">
//                             <Search
//                                 size={15}
//                                 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
//                             />
//                             <input
//                                 value={search}
//                                 onChange={(e) => setSearch(e.target.value)}
//                                 placeholder="Title"
//                                 className="w-full h-10 pl-10 pr-3 rounded-xl bg-slate-50 border border-slate-200 text-base sm:text-[13px] text-slate-700 placeholder:text-slate-400 outline-none transition-all duration-200 focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10"
//                             />
//                         </div>
//                         <button
//                             type="button"
//                             onClick={openCreate}
//                             className="shrink-0 inline-flex items-center gap-1.5 h-10 px-5 rounded-xl bg-indigo-600 text-white text-[13px] font-medium shadow-sm shadow-indigo-500/30 transition-all duration-200 hover:bg-indigo-700 hover:shadow-md hover:-translate-y-px active:translate-y-0"
//                         >
//                             <Plus size={15} strokeWidth={2.4} />
//                             Add Task
//                         </button>
//                     </div>
//                 </div>

//                 {/* DESKTOP TABLE */}
//                 <div className="hidden md:block mt-5 overflow-x-auto">
//                     <table className="w-full border-separate border-spacing-0 min-w-[900px]">
//                         <thead>
//                             <tr className="text-left text-[12px] font-medium text-slate-500">
//                                 {["Title", "Assigned To", "Priority", "Status", "Due Date", "Progress", "Action"].map(
//                                     (h, i, arr) => (
//                                         <th
//                                             key={h}
//                                             className={`bg-slate-50 py-3 px-4 font-medium ${i === 0 ? "rounded-l-xl pl-5" : ""
//                                                 } ${i === arr.length - 1 ? "rounded-r-xl text-right pr-5" : ""}`}
//                                         >
//                                             {h}
//                                         </th>
//                                     )
//                                 )}
//                             </tr>
//                         </thead>
//                         <tbody>
//                             {loading ? (
//                                 <tr>
//                                     <td colSpan={7} className="py-20 text-center">
//                                         <Loader2 size={26} className="mx-auto animate-spin text-indigo-600" />
//                                         <p className="mt-2 text-xs text-slate-400">Loading tasks...</p>
//                                     </td>
//                                 </tr>
//                             ) : visible.length === 0 ? (
//                                 <tr>
//                                     <td colSpan={7} className="py-20 text-center">
//                                         <ClipboardList size={30} className="mx-auto text-slate-300" />
//                                         <p className="mt-2 text-sm font-medium text-slate-600">No tasks found</p>
//                                         <p className="text-xs text-slate-400">
//                                             Click "Add Task" or change the filter.
//                                         </p>
//                                     </td>
//                                 </tr>
//                             ) : (
//                                 visible.map((task) => {
//                                     const { isAssignee, canEdit, canStatus } = perms(task);
//                                     const overdue = isOverdue(task);
//                                     return (
//                                         <tr
//                                             key={task._id}
//                                             className="group transition-colors duration-150 hover:bg-indigo-50/40"
//                                         >
//                                             <td className="py-3.5 px-4 pl-5 border-b border-slate-100 max-w-[260px]">
//                                                 <p className="text-[13px] font-semibold text-slate-800 truncate">
//                                                     {task.title}
//                                                 </p>
//                                                 {task.description && (
//                                                     <p className="text-[11px] text-slate-400 truncate">
//                                                         {task.description}
//                                                     </p>
//                                                 )}
//                                             </td>
//                                             <td className="py-3.5 px-4 border-b border-slate-100 text-[13px] text-slate-600">
//                                                 <div className="flex items-center gap-2 min-w-0">
//                                                     <span className="h-7 w-7 shrink-0 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center">
//                                                         {(assigneeText(task, isAssignee)[0] || "?").toUpperCase()}
//                                                     </span>
//                                                     <span className="truncate">{assigneeText(task, isAssignee)}</span>
//                                                 </div>
//                                             </td>
//                                             <td className="py-3.5 px-4 border-b border-slate-100">
//                                                 <span
//                                                     className={`inline-flex px-2.5 py-1 rounded-md border text-[11px] font-semibold capitalize ${PRIORITY_STYLE[task.priority] || PRIORITY_STYLE.medium
//                                                         }`}
//                                                 >
//                                                     {task.priority || "medium"}
//                                                 </span>
//                                             </td>
//                                             <td className="py-3.5 px-4 border-b border-slate-100">
//                                                 <StatusControl task={task} canStatus={canStatus} />
//                                             </td>
//                                             <td
//                                                 className={`py-3.5 px-4 border-b border-slate-100 text-[13px] whitespace-nowrap ${overdue ? "text-rose-600 font-semibold" : "text-slate-600"
//                                                     }`}
//                                             >
//                                                 {formatDate(task.dueDate)}
//                                                 {overdue && (
//                                                     <span className="block text-[10px] font-semibold">Overdue</span>
//                                                 )}
//                                             </td>
//                                             <td className="py-3.5 px-4 border-b border-slate-100">
//                                                 <ProgressBar task={task} />
//                                             </td>
//                                             <td className="py-3.5 px-4 pr-5 border-b border-slate-100">
//                                                 <Actions task={task} canEdit={canEdit} />
//                                             </td>
//                                         </tr>
//                                     );
//                                 })
//                             )}
//                         </tbody>
//                     </table>
//                 </div>

//                 {/* MOBILE CARDS */}
//                 <div className="md:hidden mt-4 space-y-3">
//                     {loading ? (
//                         <div className="py-16 text-center">
//                             <Loader2 size={26} className="mx-auto animate-spin text-indigo-600" />
//                             <p className="mt-2 text-xs text-slate-400">Loading tasks...</p>
//                         </div>
//                     ) : visible.length === 0 ? (
//                         <div className="py-16 text-center">
//                             <ClipboardList size={30} className="mx-auto text-slate-300" />
//                             <p className="mt-2 text-sm font-medium text-slate-600">No tasks found</p>
//                             <p className="text-xs text-slate-400">Click "Add Task" or change the filter.</p>
//                         </div>
//                     ) : (
//                         visible.map((task) => {
//                             const { isAssignee, canEdit, canStatus } = perms(task);
//                             const overdue = isOverdue(task);
//                             return (
//                                 <div
//                                     key={task._id}
//                                     className="rounded-2xl border border-slate-200 p-4 space-y-3 transition-shadow hover:shadow-md"
//                                 >
//                                     <div className="flex items-start justify-between gap-2">
//                                         <h3 className="text-sm font-semibold text-slate-800 break-words min-w-0">
//                                             {task.title}
//                                         </h3>
//                                         <span
//                                             className={`shrink-0 px-2 py-0.5 rounded-md border text-[10px] font-semibold capitalize ${PRIORITY_STYLE[task.priority] || PRIORITY_STYLE.medium
//                                                 }`}
//                                         >
//                                             {task.priority || "medium"}
//                                         </span>
//                                     </div>

//                                     {task.description && (
//                                         <p className="text-xs text-slate-500 line-clamp-2 break-words">
//                                             {task.description}
//                                         </p>
//                                     )}

//                                     <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
//                                         <span>
//                                             Assigned: <b className="text-slate-700">{assigneeText(task, isAssignee)}</b>
//                                         </span>
//                                         <span className={overdue ? "text-rose-600 font-semibold" : ""}>
//                                             Due: {formatDate(task.dueDate)}
//                                         </span>
//                                     </div>

//                                     <ProgressBar task={task} />

//                                     <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
//                                         <StatusControl task={task} canStatus={canStatus} />
//                                         <Actions task={task} canEdit={canEdit} />
//                                     </div>
//                                 </div>
//                             );
//                         })
//                     )}
//                 </div>
//             </div>

//             {/* CREATE / EDIT MODAL */}
//             {modal && (
//                 <div
//                     onClick={closeModal}
//                     className={`fixed inset-0 z-[300] flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-[3px] p-0 sm:p-6 transition-opacity duration-200 ${shown ? "opacity-100" : "opacity-0"
//                         }`}
//                 >
//                     <form
//                         onSubmit={submit}
//                         noValidate
//                         onClick={(e) => e.stopPropagation()}
//                         className={`w-full max-w-[640px] bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[92dvh] flex flex-col overflow-hidden transition-all duration-300 ease-out ${shown
//                             ? "opacity-100 translate-y-0 sm:scale-100"
//                             : "opacity-0 translate-y-8 sm:translate-y-3 sm:scale-95"
//                             }`}
//                     >
//                         {/* Header */}
//                         <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4">
//                             <h2 className="text-[15px] font-semibold text-slate-800">
//                                 {modal.mode === "create" ? "Create Task" : "Edit Task"}
//                             </h2>
//                             <button
//                                 type="button"
//                                 onClick={closeModal}
//                                 aria-label="Close"
//                                 className="h-7 w-7 flex items-center justify-center rounded-full border border-slate-300 text-slate-400 transition-all duration-150 hover:text-rose-500 hover:border-rose-300 hover:rotate-90"
//                             >
//                                 <X size={14} />
//                             </button>
//                         </div>

//                         {/* Body */}
//                         <div className="flex-1 overflow-y-auto overscroll-contain px-5 sm:px-6 pb-2 space-y-4">
//                             <Field label="Title" required error={errors.title}>
//                                 <input
//                                     value={form.title}
//                                     onChange={(e) => setForm({ ...form, title: e.target.value.slice(0, 150) })}
//                                     placeholder="Title"
//                                     className={inputBase}
//                                     autoFocus
//                                 />
//                             </Field>

//                             <Field label="Description">
//                                 <textarea
//                                     rows={3}
//                                     value={form.description}
//                                     onChange={(e) =>
//                                         setForm({ ...form, description: e.target.value.slice(0, 2000) })
//                                     }
//                                     placeholder="Description"
//                                     className={`${inputBase} h-auto py-3 resize-none`}
//                                 />
//                             </Field>

//                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//                                 {canAssign && (
//                                     <Field
//                                         label="Assigned To"
//                                         required={modal.mode === "create"}
//                                         error={errors.assignedTo}
//                                     >
//                                         <SelectBox
//                                             value={form.assignedTo}
//                                             disabled={modal.mode === "edit"}
//                                             onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
//                                         >
//                                             <option value="">Select Assigned To</option>
//                                             {employees.map((emp) => (
//                                                 <option key={emp._id} value={emp._id}>
//                                                     {emp.name} ({emp.employeeId || "—"})
//                                                 </option>
//                                             ))}
//                                         </SelectBox>
//                                     </Field>
//                                 )}

//                                 <Field label="Priority" required error={errors.priority}>
//                                     <SelectBox
//                                         value={form.priority}
//                                         onChange={(e) => setForm({ ...form, priority: e.target.value })}
//                                     >
//                                         <option value="">Priority</option>
//                                         <option value="low">Low</option>
//                                         <option value="medium">Medium</option>
//                                         <option value="high">High</option>
//                                         <option value="urgent">Urgent</option>
//                                     </SelectBox>
//                                 </Field>

//                                 <Field label="Start Date">
//                                     <DateInput
//                                         value={form.startDate}
//                                         placeholder="Start Date"
//                                         onChange={(e) => setForm({ ...form, startDate: e.target.value })}
//                                     />
//                                 </Field>

//                                 <Field label="Due Date" error={errors.dueDate}>
//                                     <DateInput
//                                         value={form.dueDate}
//                                         min={form.startDate}
//                                         placeholder="Due Date"
//                                         onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
//                                     />
//                                 </Field>

//                                 <Field label="Estimated Hours" error={errors.estimatedHours}>
//                                     <input
//                                         type="number"
//                                         min="0"
//                                         step="0.5"
//                                         inputMode="decimal"
//                                         value={form.estimatedHours}
//                                         onChange={(e) => setForm({ ...form, estimatedHours: e.target.value })}
//                                         placeholder="Estimated Hours"
//                                         className={inputBase}
//                                     />
//                                 </Field>
//                             </div>
//                         </div>

//                         {/* Footer */}
//                         <div className="flex justify-end gap-2.5 px-5 sm:px-6 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
//                             <button
//                                 type="button"
//                                 onClick={closeModal}
//                                 className="h-10 px-6 rounded-xl border border-indigo-600 text-indigo-600 text-[13px] font-medium transition-all duration-200 hover:bg-indigo-50"
//                             >
//                                 Cancel
//                             </button>
//                             <button
//                                 type="submit"
//                                 disabled={saving}
//                                 className="inline-flex items-center justify-center gap-2 h-10 px-6 rounded-xl bg-indigo-600 text-white text-[13px] font-medium shadow-sm shadow-indigo-500/30 transition-all duration-200 hover:bg-indigo-700 hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
//                             >
//                                 {saving ? (
//                                     <Loader2 size={15} className="animate-spin" />
//                                 ) : (
//                                     <CheckCircle2 size={15} />
//                                 )}
//                                 {saving ? "Saving..." : "Save"}
//                             </button>
//                         </div>
//                     </form>
//                 </div>
//             )}
//         </div>
//     );
// }