"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Mail,
    MessageSquare,
    Send,
    Loader2,
    Plus,
    Trash2,
    Users,
    Building2,
    ShieldCheck,
    UserPlus,
    Search,
    X,
    RefreshCw,
    AlertCircle,
    CheckCircle2,
    XCircle,
    Clock,
    Lock,
    Activity,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import { useAuth } from "@/context/AuthContext";

/* -------------------------------------------------------------------------- */
/* SETTINGS                                                                   */
/* -------------------------------------------------------------------------- */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const normalizePhone = (value) => {
    const compact = String(value || "").replace(/[^\d+]/g, "");
    if (/^\+\d{8,15}$/.test(compact)) return compact;
    const d = compact.replace(/\D/g, "");
    if (/^[6-9]\d{9}$/.test(d)) return `+91${d}`;
    if (/^91[6-9]\d{9}$/.test(d)) return `+${d}`;
    if (/^0[6-9]\d{9}$/.test(d)) return `+91${d.slice(1)}`;
    return "";
};

const KINDS = {
    email: {
        title: "Email Campaigns",
        subtitle: "Send emails to your employees and keep a delivery log.",
        icon: Mail,
        api: "/emails",
        compose: "Compose Email",
        composeTitle: "Compose New Email",
        serviceLabel: "Email Service",
        hasSubject: true,
        messageMax: 5000,
        messageRows: 7,
        messageLabel: "Message",
        messagePlaceholder: "Write your email here...",
        customLabel: "Email addresses",
        customPlaceholder: "name@company.com, other@domain.com",
        parse: (item) => (EMAIL_RE.test(item) ? item.toLowerCase() : ""),
        emptyTitle: "No emails sent yet",
        emptyText: 'Click "Compose Email" to send your first message.',
        missing: "have no valid email address",
        setup: "The email service is not configured on the server. Add BREVO_API_KEY, EMAIL_FROM and EMAIL_FROM_NAME in the Render environment settings.",
    },
    sms: {
        title: "SMS Campaigns",
        subtitle: "Send short text messages to your employees and keep a delivery log.",
        icon: MessageSquare,
        api: "/sms",
        compose: "Send SMS",
        composeTitle: "Send New SMS",
        serviceLabel: "SMS Gateway",
        hasSubject: false,
        messageMax: 160,
        messageRows: 4,
        messageLabel: "Message (max 160 characters)",
        messagePlaceholder: "Type your SMS here...",
        customLabel: "Phone numbers",
        customPlaceholder: "9876543210, +919812345678",
        parse: (item) => normalizePhone(item),
        emptyTitle: "No SMS sent yet",
        emptyText: 'Click "Send SMS" to send your first message.',
        missing: "have no valid phone number",
        setup: "The SMS gateway is not configured on the server. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM in the Render environment settings.",
    },
};

const AUDIENCES = [
    { value: "custom", label: "Specific people", icon: UserPlus },
    { value: "all", label: "All employees", icon: Users },
    { value: "department", label: "Department", icon: Building2 },
    { value: "role", label: "Role", icon: ShieldCheck },
];

const ROLES = [
    { value: "employee", label: "Employees" },
    { value: "manager", label: "Managers" },
    { value: "hr", label: "HR" },
    { value: "admin", label: "Admins" },
];

const CATEGORIES = ["general", "announcement", "reminder", "policy", "urgent"];

const STATUS = {
    sending: { label: "Sending", cls: "bg-indigo-50 text-indigo-700 border-indigo-200", icon: Loader2, spin: true },
    sent: { label: "Sent", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
    partial: { label: "Partially sent", cls: "bg-amber-50 text-amber-700 border-amber-200", icon: AlertCircle },
    failed: { label: "Failed", cls: "bg-rose-50 text-rose-700 border-rose-200", icon: XCircle },
};

const FILTERS = [
    ["all", "All"],
    ["sent", "Sent"],
    ["partial", "Partial"],
    ["failed", "Failed"],
];

const EMPTY_FORM = { audience: "custom", custom: "", department: "", role: "", subject: "", message: "", category: "general" };

const inputClass =
    "w-full px-4 py-3 bg-slate-50 border rounded-xl text-base sm:text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:bg-white focus:ring-4 focus:ring-indigo-500/10";

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

const toList = (data) => (Array.isArray(data) ? data : data?.data || data?.departments || []);

const fullDate = (v) => {
    const d = new Date(v);
    return Number.isNaN(d.getTime())
        ? ""
        : d.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

const shortTime = (v) => {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return "";
    const diff = Date.now() - d.getTime();
    if (diff < 60 * 1000) return "Just now";
    if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)} min ago`;
    if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / 3600000)} hr ago`;
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

const parseCustom = (text, parse) => {
    const items = String(text || "").split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean);
    const valid = new Set();
    const invalid = [];
    items.forEach((item) => {
        const address = parse(item);
        if (address) valid.add(address);
        else invalid.push(item);
    });
    return { valid: [...valid], invalid };
};

/* -------------------------------------------------------------------------- */
/* SMALL COMPONENTS                                                           */
/* -------------------------------------------------------------------------- */

function StatusBadge({ status }) {
    const s = STATUS[status] || STATUS.sent;
    const Icon = s.icon;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap ${s.cls}`}>
            <Icon size={12} className={s.spin ? "animate-spin" : ""} /> {s.label}
        </span>
    );
}

function FieldLabel({ children }) {
    return <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">{children}</label>;
}

function FieldError({ children }) {
    if (!children) return null;
    return (
        <p className="flex items-start gap-1.5 mt-1.5 text-[11px] font-semibold text-rose-600">
            <AlertCircle size={13} className="shrink-0 mt-px" />
            <span>{children}</span>
        </p>
    );
}

function StatCard({ icon: Icon, label, value, tone, sub }) {
    return (
        <div className="min-w-0 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 flex items-center gap-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-indigo-200">
            <div className={`w-11 h-11 shrink-0 rounded-xl flex items-center justify-center ${tone}`}>
                <Icon size={20} />
            </div>
            <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">{label}</p>
                <p className="text-xl font-extrabold text-slate-900 leading-tight truncate">{value}</p>
                {sub && <p className="text-[11px] text-slate-400 truncate">{sub}</p>}
            </div>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* MAIN                                                                       */
/* -------------------------------------------------------------------------- */

export default function CampaignManager({ kind = "email" }) {
    const cfg = KINDS[kind] || KINDS.email;
    const Icon = cfg.icon;
    const { user } = useAuth();
    const allowed = ["admin", "hr"].includes(String(user?.role || "").toLowerCase());

    const [items, setItems] = useState([]);
    const [status, setStatus] = useState({ configured: true, loaded: false });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");

    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("all");

    const [composeOpen, setComposeOpen] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [errors, setErrors] = useState({});
    const [departments, setDepartments] = useState([]);
    const [audienceInfo, setAudienceInfo] = useState(null);
    const [confirming, setConfirming] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const countTicket = useRef(0);

    const [viewItem, setViewItem] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);

    /* ---- loading ---- */
    const load = useCallback(
        async ({ silent = false, background = false } = {}) => {
            if (!background) {
                if (silent) setRefreshing(true);
                else setLoading(true);
            }
            try {
                const { data } = await api.get(cfg.api);
                setItems(Array.isArray(data) ? data : []);
                setError("");
            } catch (err) {
                if (!background) setError(err?.response?.data?.message || "Unable to load the history. Please try again.");
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [cfg.api]
    );

    useEffect(() => {
        if (!allowed) return;
        load();
        api
            .get(`${cfg.api}/status`)
            .then(({ data }) => setStatus({ ...data, loaded: true }))
            .catch(() => setStatus({ configured: false, loaded: true }));
    }, [allowed, load, cfg.api]);

    /* while something is being sent, the list refreshes by itself */
    const hasSending = items.some((i) => i.status === "sending");
    useEffect(() => {
        if (!hasSending) return undefined;
        const timer = setInterval(() => load({ background: true }), 3000);
        return () => clearInterval(timer);
    }, [hasSending, load]);

    /* departments are needed only for the "Department" audience */
    useEffect(() => {
        if (!composeOpen || departments.length) return;
        Promise.allSettled([api.get("/departments"), api.get("/organization/departments")]).then(([a, b]) => {
            const list = [...(a.status === "fulfilled" ? toList(a.value.data) : []), ...(b.status === "fulfilled" ? toList(b.value.data) : [])];
            const seen = new Set();
            setDepartments(
                list
                    .map((d) => ({ value: String(d._id || d.id || ""), label: d.name || d.title || "" }))
                    .filter((d) => d.value && d.label && !seen.has(d.value) && seen.add(d.value))
            );
        });
    }, [composeOpen, departments.length]);

    /* how many people will receive it */
    const departmentName = departments.find((d) => d.value === form.department)?.label || "";
    useEffect(() => {
        if (!composeOpen || form.audience === "custom") {
            setAudienceInfo(null);
            return undefined;
        }
        if ((form.audience === "department" && !form.department) || (form.audience === "role" && !form.role)) {
            setAudienceInfo(null);
            return undefined;
        }

        const ticket = ++countTicket.current;
        setAudienceInfo((prev) => ({ ...(prev || {}), loading: true }));
        const timer = setTimeout(async () => {
            try {
                const { data } = await api.post(`${cfg.api}/audience`, {
                    audience: form.audience,
                    department: form.department,
                    departmentName,
                    role: form.role,
                });
                if (ticket === countTicket.current) setAudienceInfo({ count: data.count, skipped: data.skipped, loading: false });
            } catch (err) {
                if (ticket === countTicket.current) {
                    setAudienceInfo({ count: 0, skipped: 0, loading: false, error: err?.response?.data?.message || "Unable to count the recipients." });
                }
            }
        }, 250);
        return () => clearTimeout(timer);
    }, [composeOpen, form.audience, form.department, form.role, departmentName, cfg.api]);

    /* Escape closes a dialog, and the page does not scroll behind it */
    useEffect(() => {
        if (!composeOpen && !viewItem && !deleteTarget) return undefined;
        const onKey = (e) => {
            if (e.key !== "Escape" || submitting || deleting) return;
            setComposeOpen(false);
            setViewItem(null);
            setDeleteTarget(null);
        };
        const previous = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = previous;
            window.removeEventListener("keydown", onKey);
        };
    }, [composeOpen, viewItem, deleteTarget, submitting, deleting]);

    /* ---- numbers ---- */
    const custom = useMemo(() => parseCustom(form.custom, cfg.parse), [form.custom, cfg.parse]);
    const recipientCount = form.audience === "custom" ? custom.valid.length : audienceInfo?.count ?? 0;

    const stats = useMemo(
        () => ({
            total: items.length,
            sent: items.reduce((sum, i) => sum + (i.sentCount || 0), 0),
            failed: items.reduce((sum, i) => sum + (i.failedCount || 0), 0),
        }),
        [items]
    );

    const visible = useMemo(() => {
        const q = search.trim().toLowerCase();
        return items.filter((i) => {
            if (filter !== "all" && i.status !== filter) return false;
            if (!q) return true;
            return `${i.subject || ""} ${i.message || ""} ${i.audienceLabel || ""}`.toLowerCase().includes(q);
        });
    }, [items, filter, search]);

    /* ---- compose ---- */
    const openCompose = () => {
        setForm(EMPTY_FORM);
        setErrors({});
        setConfirming(false);
        setAudienceInfo(null);
        setComposeOpen(true);
    };

    const setField = (key, value) => {
        setForm((prev) => ({ ...prev, [key]: value }));
        setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
        setConfirming(false);
    };

    const validate = () => {
        const next = {};
        if (form.audience === "custom") {
            if (!custom.valid.length && !custom.invalid.length) next.custom = `Please enter at least one ${cfg.customLabel.toLowerCase()}.`;
            else if (custom.invalid.length) next.custom = `Not valid: ${custom.invalid.slice(0, 3).join(", ")}${custom.invalid.length > 3 ? "..." : ""}`;
            else if (custom.valid.length > 50) next.custom = "You can enter at most 50 recipients. Use a group instead.";
        }
        if (form.audience === "department" && !form.department) next.department = "Please select a department.";
        if (form.audience === "role" && !form.role) next.role = "Please select a role.";
        if (cfg.hasSubject && form.subject.trim().length < 3) next.subject = "Please enter a subject (at least 3 characters).";
        if (form.message.trim().length < 5) next.message = "Please write the message (at least 5 characters).";
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const requestSend = (e) => {
        e.preventDefault();
        if (submitting || !status.configured) return;
        if (!validate()) return;
        if (recipientCount < 1) {
            setErrors({ audience: "No recipient was found for this choice." });
            return;
        }
        if (recipientCount > 1 && !confirming) {
            setConfirming(true);
            return;
        }
        doSend();
    };

    const doSend = async () => {
        setSubmitting(true);
        try {
            await api.post(cfg.api, {
                audience: form.audience,
                custom: form.custom,
                department: form.department,
                departmentName,
                role: form.role,
                subject: form.subject.trim(),
                message: form.message.trim(),
                category: form.category,
            });
            toast.success(`${kind === "email" ? "Email" : "SMS"} is being sent to ${recipientCount} ${recipientCount === 1 ? "person" : "people"}.`);
            setComposeOpen(false);
            setConfirming(false);
            load({ silent: true });
        } catch (err) {
            setConfirming(false);
            toast.error(err?.response?.data?.message || "Failed to send. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const confirmDelete = async () => {
        if (!deleteTarget || deleting) return;
        setDeleting(true);
        try {
            await api.delete(`${cfg.api}/${deleteTarget._id}`);
            setItems((prev) => prev.filter((i) => i._id !== deleteTarget._id));
            toast.success("Log deleted successfully.");
            setDeleteTarget(null);
            setViewItem(null);
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to delete the log.");
        } finally {
            setDeleting(false);
        }
    };

    /* ---- no access ---- */
    if (!allowed) {
        return (
            <div className="w-full max-w-md mx-auto py-24 px-4 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
                    <Lock size={22} />
                </div>
                <p className="text-sm font-bold text-slate-700">Restricted page</p>
                <p className="text-xs text-slate-500">{cfg.title} can be used only by admin and HR.</p>
            </div>
        );
    }

    const serviceOk = status.loaded && status.configured;
    const titleOf = (i) => (cfg.hasSubject ? i.subject : i.message);

    return (
        <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 py-4 space-y-4 sm:space-y-5 antialiased pb-16">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm">
                <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 shrink-0 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20">
                        <Icon size={20} />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">{cfg.title}</h1>
                        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">{cfg.subtitle}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2.5">
                    <button
                        type="button"
                        onClick={() => load({ silent: true })}
                        disabled={loading || refreshing}
                        className="p-3 sm:p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl transition disabled:opacity-50 cursor-pointer"
                        aria-label="Refresh"
                        title="Refresh"
                    >
                        <RefreshCw size={16} className={loading || refreshing ? "animate-spin text-indigo-600" : ""} />
                    </button>
                    <button
                        type="button"
                        onClick={openCompose}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-3 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-indigo-600/20 transition active:scale-95 cursor-pointer"
                    >
                        <Plus size={16} /> {cfg.compose}
                    </button>
                </div>
            </div>

            {/* Service not set up */}
            {status.loaded && !status.configured && (
                <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-xs sm:text-sm">
                        <p className="font-bold">{cfg.serviceLabel} is not set up</p>
                        <p className="mt-0.5 font-medium">{cfg.setup}</p>
                    </div>
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard icon={Icon} label="Campaigns" value={stats.total} tone="bg-indigo-50 text-indigo-600" />
                <StatCard icon={CheckCircle2} label="Sent" value={stats.sent} tone="bg-emerald-50 text-emerald-600" sub="Total messages" />
                <StatCard icon={XCircle} label="Failed" value={stats.failed} tone="bg-rose-50 text-rose-600" sub="Total messages" />
                <StatCard
                    icon={Activity}
                    label={cfg.serviceLabel}
                    value={!status.loaded ? "Checking..." : serviceOk ? "Ready" : "Not set up"}
                    tone={serviceOk ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}
                    sub={serviceOk ? status.from || status.provider : undefined}
                />
            </div>

            {/* Search and filters */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="relative flex-1">
                    <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search history..."
                        className="w-full pl-10 pr-9 py-3 sm:py-2.5 bg-white border border-slate-200 rounded-xl text-base sm:text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                    />
                    {search && (
                        <button type="button" onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 cursor-pointer" aria-label="Clear search">
                            <X size={14} />
                        </button>
                    )}
                </div>
                <div className="flex gap-2 overflow-x-auto">
                    {FILTERS.map(([key, label]) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setFilter(key)}
                            className={`shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${filter === key
                                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                                : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-700"
                                }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {error && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl">
                    <div className="flex items-center gap-3 min-w-0">
                        <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                        <p className="text-xs sm:text-sm font-medium">{error}</p>
                    </div>
                    <button type="button" onClick={() => load()} className="self-end sm:self-auto px-3.5 py-1.5 bg-white text-rose-700 text-xs font-semibold rounded-lg border border-rose-200 hover:bg-rose-100/50 transition cursor-pointer">
                        Retry
                    </button>
                </div>
            )}

            {/* History */}
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="px-4 sm:px-6 py-3.5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-700">Sent history</p>
                    <p className="text-[11px] text-slate-400 hidden sm:block">Click a row to see the details</p>
                </div>

                {loading ? (
                    <div className="divide-y divide-slate-100">
                        {[0, 1, 2, 3].map((i) => (
                            <div key={i} className="p-4 sm:p-5 flex gap-3.5 animate-pulse">
                                <div className="w-10 h-10 rounded-xl bg-slate-100 shrink-0" />
                                <div className="flex-1 space-y-2.5">
                                    <div className="h-3.5 w-1/3 rounded bg-slate-100" />
                                    <div className="h-3 w-2/3 rounded bg-slate-100" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : visible.length === 0 ? (
                    <div className="py-16 px-4 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-400 flex items-center justify-center mx-auto mb-3">
                            <Icon size={24} />
                        </div>
                        <p className="text-sm font-bold text-slate-700">{items.length === 0 ? cfg.emptyTitle : "Nothing matches your search"}</p>
                        <p className="text-xs text-slate-400 mt-1">{items.length === 0 ? cfg.emptyText : "Try another keyword or filter."}</p>
                    </div>
                ) : (
                    <ul className="divide-y divide-slate-100">
                        {visible.map((i) => (
                            <li key={i._id}>
                                <div
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => setViewItem(i)}
                                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setViewItem(i))}
                                    className="group flex items-start sm:items-center gap-3 sm:gap-4 p-4 sm:px-6 sm:py-4 cursor-pointer transition-colors hover:bg-indigo-50/40 focus:outline-none focus-visible:bg-indigo-50/60"
                                >
                                    <div className="w-10 h-10 shrink-0 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center transition-colors group-hover:bg-indigo-100 group-hover:text-indigo-600">
                                        <Icon size={17} />
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-bold text-slate-900 truncate group-hover:text-indigo-700 transition-colors">{titleOf(i)}</p>
                                        <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-slate-500">
                                            <span className="inline-flex items-center gap-1">
                                                <Users size={11} /> {i.audienceLabel} · {i.recipientCount}
                                            </span>
                                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold capitalize">{i.category}</span>
                                            <span className="inline-flex items-center gap-1 text-slate-400" title={fullDate(i.createdAt)}>
                                                <Clock size={11} /> {shortTime(i.createdAt)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 shrink-0">
                                        <StatusBadge status={i.status} />
                                        {i.status !== "sending" && (
                                            <span className="text-[11px] font-semibold text-slate-400 hidden md:inline">
                                                {i.sentCount}/{i.recipientCount} sent
                                            </span>
                                        )}
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setDeleteTarget(i);
                                            }}
                                            disabled={i.status === "sending"}
                                            className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                            aria-label="Delete log"
                                            title="Delete log"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Compose (bottom sheet on mobile) */}
            {composeOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-slate-900/50 backdrop-blur-sm" onClick={() => !submitting && setComposeOpen(false)}>
                    <form
                        onSubmit={requestSend}
                        noValidate
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92dvh] overflow-hidden"
                    >
                        <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/70">
                            <div className="min-w-0">
                                <h2 className="text-base font-bold text-slate-900">{cfg.composeTitle}</h2>
                                <p className="text-xs text-slate-400">Choose who gets it, write the message and send.</p>
                            </div>
                            <button type="button" onClick={() => !submitting && setComposeOpen(false)} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer" aria-label="Close">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6 space-y-4">
                            {/* Audience */}
                            <div>
                                <FieldLabel>Send to</FieldLabel>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                    {AUDIENCES.map(({ value, label, icon: AIcon }) => {
                                        const active = form.audience === value;
                                        return (
                                            <button
                                                key={value}
                                                type="button"
                                                onClick={() => setField("audience", value)}
                                                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition cursor-pointer ${active ? "border-indigo-500 bg-indigo-50 ring-4 ring-indigo-500/10" : "border-slate-200 bg-white hover:border-indigo-300"
                                                    }`}
                                            >
                                                <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${active ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                                                    <AIcon size={15} />
                                                </span>
                                                <span className="text-[11px] font-bold text-slate-800 leading-tight">{label}</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {form.audience === "custom" && (
                                    <div className="mt-3">
                                        <textarea
                                            rows={2}
                                            value={form.custom}
                                            onChange={(e) => setField("custom", e.target.value)}
                                            placeholder={cfg.customPlaceholder}
                                            className={`${inputClass} resize-none ${errors.custom ? "border-rose-400" : "border-slate-200 focus:border-indigo-500"}`}
                                        />
                                        <FieldError>{errors.custom}</FieldError>
                                    </div>
                                )}

                                {form.audience === "department" && (
                                    <div className="mt-3">
                                        <select value={form.department} onChange={(e) => setField("department", e.target.value)} className={`${inputClass} cursor-pointer ${errors.department ? "border-rose-400" : "border-slate-200 focus:border-indigo-500"}`}>
                                            <option value="">Select department</option>
                                            {departments.map((d) => (
                                                <option key={d.value} value={d.value}>{d.label}</option>
                                            ))}
                                        </select>
                                        <FieldError>{errors.department}</FieldError>
                                    </div>
                                )}

                                {form.audience === "role" && (
                                    <div className="mt-3">
                                        <select value={form.role} onChange={(e) => setField("role", e.target.value)} className={`${inputClass} cursor-pointer ${errors.role ? "border-rose-400" : "border-slate-200 focus:border-indigo-500"}`}>
                                            <option value="">Select role</option>
                                            {ROLES.map((r) => (
                                                <option key={r.value} value={r.value}>{r.label}</option>
                                            ))}
                                        </select>
                                        <FieldError>{errors.role}</FieldError>
                                    </div>
                                )}

                                {/* recipient count */}
                                <div className="mt-3 flex items-start gap-2 px-3.5 py-2.5 rounded-xl bg-indigo-50/60 border border-indigo-100 text-xs text-indigo-800">
                                    <Users size={14} className="shrink-0 mt-0.5" />
                                    <p className="font-semibold">
                                        {form.audience === "custom" ? (
                                            custom.valid.length ? `${custom.valid.length} ${custom.valid.length === 1 ? "recipient" : "recipients"} entered` : `Enter ${cfg.customLabel.toLowerCase()} above`
                                        ) : audienceInfo?.loading ? (
                                            "Counting recipients..."
                                        ) : audienceInfo?.error ? (
                                            <span className="text-rose-600">{audienceInfo.error}</span>
                                        ) : audienceInfo ? (
                                            <>
                                                Will be sent to {audienceInfo.count} {audienceInfo.count === 1 ? "person" : "people"}
                                                {audienceInfo.skipped > 0 && <span className="block font-medium text-amber-700">{audienceInfo.skipped} {cfg.missing} and will be skipped.</span>}
                                            </>
                                        ) : (
                                            "Select who should receive it"
                                        )}
                                    </p>
                                </div>
                                <FieldError>{errors.audience}</FieldError>
                            </div>

                            {cfg.hasSubject && (
                                <div>
                                    <FieldLabel>Subject</FieldLabel>
                                    <input value={form.subject} maxLength={200} onChange={(e) => setField("subject", e.target.value)} placeholder="e.g. Office closed on Diwali" className={`${inputClass} ${errors.subject ? "border-rose-400" : "border-slate-200 focus:border-indigo-500"}`} />
                                    <FieldError>{errors.subject}</FieldError>
                                </div>
                            )}

                            <div>
                                <FieldLabel>{cfg.messageLabel}</FieldLabel>
                                <textarea
                                    rows={cfg.messageRows}
                                    value={form.message}
                                    maxLength={cfg.messageMax}
                                    onChange={(e) => setField("message", e.target.value)}
                                    placeholder={cfg.messagePlaceholder}
                                    className={`${inputClass} resize-none ${errors.message ? "border-rose-400" : "border-slate-200 focus:border-indigo-500"}`}
                                />
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0"><FieldError>{errors.message}</FieldError></div>
                                    <span className="text-[11px] font-medium text-slate-400 mt-1.5 shrink-0">{form.message.length}/{cfg.messageMax}</span>
                                </div>
                            </div>

                            <div>
                                <FieldLabel>Category</FieldLabel>
                                <div className="flex flex-wrap gap-2">
                                    {CATEGORIES.map((c) => (
                                        <button
                                            key={c}
                                            type="button"
                                            onClick={() => setField("category", c)}
                                            className={`px-3.5 py-1.5 rounded-full text-xs font-bold border capitalize transition cursor-pointer ${form.category === c ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"}`}
                                        >
                                            {c}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="shrink-0 border-t border-slate-100 bg-white px-5 sm:px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                            {!status.configured ? (
                                <p className="text-xs font-semibold text-amber-700 flex items-start gap-2">
                                    <AlertCircle size={14} className="shrink-0 mt-0.5" /> {cfg.serviceLabel} is not set up, so sending is turned off.
                                </p>
                            ) : confirming ? (
                                <div className="space-y-3">
                                    <p className="text-sm font-bold text-slate-800">
                                        Send to {recipientCount} people? <span className="font-medium text-slate-500">This cannot be undone.</span>
                                    </p>
                                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
                                        <button type="button" onClick={() => setConfirming(false)} disabled={submitting} className="px-5 py-3 sm:py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50">
                                            Go back
                                        </button>
                                        <button type="submit" disabled={submitting} className="inline-flex items-center justify-center gap-2 px-6 py-3 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 transition cursor-pointer disabled:opacity-60">
                                            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                            {submitting ? "Sending..." : "Yes, send now"}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
                                    <button type="button" onClick={() => setComposeOpen(false)} className="px-5 py-3 sm:py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer">
                                        Cancel
                                    </button>
                                    <button type="submit" className="inline-flex items-center justify-center gap-2 px-6 py-3 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 transition cursor-pointer">
                                        <Send size={14} /> {recipientCount > 0 ? `${cfg.compose.split(" ")[0] === "Compose" ? "Send Email" : "Send SMS"} (${recipientCount})` : cfg.compose.split(" ")[0] === "Compose" ? "Send Email" : "Send SMS"}
                                    </button>
                                </div>
                            )}
                        </div>
                    </form>
                </div>
            )}

            {/* Details */}
            {viewItem && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-slate-900/50 backdrop-blur-sm" onClick={() => setViewItem(null)}>
                    <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92dvh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/70">
                            <div className="min-w-0">
                                <h3 className="text-base font-bold text-slate-900">Delivery details</h3>
                                <p className="text-xs text-slate-400">{fullDate(viewItem.createdAt)}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <StatusBadge status={viewItem.status} />
                                <button type="button" onClick={() => setViewItem(null)} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer" aria-label="Close">
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6 space-y-4">
                            <div className="grid grid-cols-3 gap-2.5 text-center">
                                {[
                                    ["Recipients", viewItem.recipientCount, "bg-slate-50 text-slate-800"],
                                    ["Sent", viewItem.sentCount, "bg-emerald-50 text-emerald-700"],
                                    ["Failed", viewItem.failedCount, "bg-rose-50 text-rose-700"],
                                ].map(([label, value, cls]) => (
                                    <div key={label} className={`rounded-xl py-3 ${cls}`}>
                                        <p className="text-lg font-extrabold font-mono">{value}</p>
                                        <p className="text-[10px] font-bold uppercase">{label}</p>
                                    </div>
                                ))}
                            </div>

                            {viewItem.errorSummary && (
                                <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                                    <AlertCircle size={15} className="shrink-0 mt-0.5" />
                                    <p className="font-medium break-words">{viewItem.errorSummary}</p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 border border-slate-200/70 p-4 text-xs">
                                <div className="min-w-0">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sent to</p>
                                    <p className="font-bold text-slate-800 mt-0.5 break-words">{viewItem.audienceLabel}</p>
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sent by</p>
                                    <p className="font-bold text-slate-800 mt-0.5 break-words">{viewItem.sentBy?.name || "—"}</p>
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Category</p>
                                    <p className="font-bold text-slate-800 mt-0.5 capitalize">{viewItem.category}</p>
                                </div>
                            </div>

                            {cfg.hasSubject && (
                                <div>
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Subject</p>
                                    <p className="text-sm font-bold text-slate-900 bg-white border border-slate-200 px-4 py-3 rounded-xl break-words">{viewItem.subject}</p>
                                </div>
                            )}

                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Message</p>
                                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-sm text-slate-700 whitespace-pre-wrap break-words max-h-52 overflow-y-auto">{viewItem.message}</div>
                            </div>

                            {viewItem.recipientsPreview?.length > 0 && (
                                <div>
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Recipients</p>
                                    <ul className="rounded-xl border border-slate-200 divide-y divide-slate-100 max-h-44 overflow-y-auto">
                                        {viewItem.recipientsPreview.map((r, idx) => (
                                            <li key={`${r.address}-${idx}`} className="flex items-center justify-between gap-3 px-3.5 py-2 text-xs">
                                                <span className="font-semibold text-slate-700 truncate">{r.name || "—"}</span>
                                                <span className="font-mono text-slate-500 truncate">{r.address}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    {viewItem.recipientCount > viewItem.recipientsPreview.length && (
                                        <p className="mt-1.5 text-[11px] text-slate-400">and {viewItem.recipientCount - viewItem.recipientsPreview.length} more</p>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="shrink-0 border-t border-slate-100 bg-white px-5 sm:px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
                            <button type="button" onClick={() => setViewItem(null)} className="px-5 py-3 sm:py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer">
                                Close
                            </button>
                            <button
                                type="button"
                                onClick={() => setDeleteTarget(viewItem)}
                                disabled={viewItem.status === "sending"}
                                className="inline-flex items-center justify-center gap-2 px-5 py-3 sm:py-2.5 border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <Trash2 size={14} /> Delete log
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete confirmation */}
            {deleteTarget && (
                <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-slate-900/50 backdrop-blur-sm" onClick={() => !deleting && setDeleteTarget(null)}>
                    <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 p-5 sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))]" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-start gap-3.5">
                            <div className="w-11 h-11 shrink-0 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center">
                                <Trash2 size={18} />
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-base font-bold text-slate-900">Delete this log?</h3>
                                <p className="text-xs text-slate-500 mt-1">Only the history entry is removed. The message that was already sent stays with the recipients.</p>
                            </div>
                        </div>
                        <p className="mt-4 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-xs font-bold text-slate-800 break-words">{titleOf(deleteTarget)}</p>
                        <div className="mt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
                            <button type="button" onClick={() => setDeleteTarget(null)} disabled={deleting} className="px-5 py-3 sm:py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50">
                                Cancel
                            </button>
                            <button type="button" onClick={confirmDelete} disabled={deleting} className="inline-flex items-center justify-center gap-2 px-6 py-3 sm:py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md shadow-rose-600/20 transition cursor-pointer disabled:opacity-60">
                                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                {deleting ? "Deleting..." : "Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}