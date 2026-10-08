"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
    Search,
    Filter,
    Loader2,
    MoreVertical,
    Eye,
    EyeOff,
    Edit3,
    Trash2,
    UserCheck,
    UserMinus,
    UserX,
    X,
    Check,
    Download,
    Users,
    User,
    Briefcase,
    FileText,
    Landmark,
    Mail,
    Phone,
    Calendar,
    Building2,
    MapPin,
    IndianRupee,
    Clock,
    CreditCard,
    Network,
    Hash,
    IdCard,
    BadgeCheck,
    ChevronLeft,
    ChevronRight,
    ExternalLink,
    RefreshCw,
    Image as ImageIcon,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";

/* ----------------------------- helpers ----------------------------- */

const isHexObjectId = (str) =>
    typeof str === "string" && /^[0-9a-fA-F]{24}$/.test(str.trim());

const getInitials = (name) => {
    if (!name) return "U";
    const parts = name.trim().split(" ").filter(Boolean);
    return parts.length > 1
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : parts[0].slice(0, 2).toUpperCase();
};

const extractList = (raw, depth = 0) => {
    if (Array.isArray(raw)) return raw;
    if (!raw || typeof raw !== "object" || depth > 3) return [];
    for (const k of ["data", "designations", "departments", "docs", "items", "results", "rows", "list"]) {
        if (raw[k] !== undefined) {
            const r = extractList(raw[k], depth + 1);
            if (r.length) return r;
        }
    }
    return [];
};

const getLabel = (obj, preferredFields = []) => {
    if (!obj) return "";
    if (typeof obj === "string") {
        const t = obj.trim();
        return isHexObjectId(t) ? "" : t;
    }
    if (typeof obj !== "object") return "";

    for (const f of preferredFields) {
        if (typeof obj[f] === "string" && obj[f].trim() && !isHexObjectId(obj[f])) return obj[f].trim();
    }

    const commonKeys = [
        "title", "name", "designationTitle", "designationName", "designation_name",
        "departmentName", "department_name", "role_name", "roleName", "role",
        "position", "label", "jobTitle",
    ];
    for (const k of commonKeys) {
        if (typeof obj[k] === "string" && obj[k].trim() && !isHexObjectId(obj[k])) return obj[k].trim();
    }

    const skipRegex = /(^_)|id$|date|at$|status|description|code|createdby|updatedby/i;
    for (const [k, v] of Object.entries(obj)) {
        if (skipRegex.test(k)) continue;
        if (typeof v === "string" && v.trim() && !isHexObjectId(v)) return v.trim();
    }
    return "";
};

const getRefId = (v) => {
    if (!v) return "";
    if (typeof v === "string") return v.trim();
    if (typeof v === "object") return String(v._id || v.id || v.$oid || "").trim();
    return "";
};

const getDesigRaw = (emp) =>
    emp?.designation ??
    emp?.designationId ??
    emp?.designation_id ??
    emp?.jobDetails?.designation ??
    emp?.jobDetails?.designationId ??
    emp?.employmentDetails?.designation ??
    emp?.workDetails?.designation ??
    emp?.position ??
    emp?.jobTitle ??
    emp?.designationName ??
    emp?.role ??
    null;

const getDeptRaw = (emp) =>
    emp?.department ??
    emp?.departmentId ??
    emp?.department_id ??
    emp?.jobDetails?.department ??
    emp?.employmentDetails?.department ??
    emp?.workDetails?.department ??
    emp?.branch ??
    null;

const DESIG_FIELDS = ["title", "name", "designationName", "designation_name", "designationTitle", "designation", "label", "position", "jobTitle"];
const DEPT_FIELDS = ["name", "title", "departmentName", "department_name", "label"];

// dd-mm-yyyy
const formatDate = (d) => {
    if (!d) return "—";
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return "—";
    const dd = String(dt.getDate()).padStart(2, "0");
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    return `${dd}-${mm}-${dt.getFullYear()}`;
};

const getSalaryValue = (emp) => {
    const raw =
        emp?.salary ??
        emp?.ctc ??
        emp?.basicSalary ??
        emp?.salaryDetails?.salary ??
        emp?.salaryDetails?.basicSalary ??
        emp?.salaryInfo?.salary ??
        emp?.jobDetails?.salary ??
        null;
    const n = Number(typeof raw === "object" && raw !== null ? raw.amount ?? raw.total : raw);
    return Number.isFinite(n) ? n : null;
};

// Yahan sirf ek line change karke poore page ki currency badal sakte ho
const CURRENCY = {
    symbol: "₹",     // "$" ya "€" bhi kar sakte ho
    locale: "en-IN", // "en-US" for $
};

const formatSalary = (n) =>
    n === null
        ? "—"
        : `${CURRENCY.symbol} ${n.toLocaleString(CURRENCY.locale, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;

const getEmploymentType = (emp) => {
    const raw =
        emp?.employmentType ??
        emp?.jobDetails?.employmentType ??
        emp?.employmentStatus ??
        emp?.employmentDetails?.employmentType ??
        "Permanent";
    const s = typeof raw === "string" ? raw.trim() : "Permanent";
    if (!s) return "Permanent";
    return s
        .replace(/[_-]+/g, " ")
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(s.toLowerCase().includes("part") ? "-" : " ");
};

const getTypeTheme = (type) => {
    const t = type.toLowerCase();
    if (t.includes("contract")) return "bg-amber-50 text-amber-700 border-amber-300";
    if (t.includes("intern")) return "bg-sky-50 text-sky-700 border-sky-300";
    if (t.includes("probation")) return "bg-violet-50 text-violet-700 border-violet-300";
    return "bg-emerald-50 text-emerald-600 border-emerald-400"; // Permanent / Part-Time
};

const getNormalizedStatus = (emp) => {
    const empStatus = String(emp.employeeStatus || "").toLowerCase();
    const status = String(emp.status || "").toLowerCase();
    if (empStatus === "exit" || empStatus === "exited" || status === "exit" || status === "exited" || emp.isExited === true) return "exit";
    if (empStatus === "inactive" || status === "inactive" || emp.isActive === false) return "inactive";
    return "active";
};

const STATUS_OPTIONS = [
    { value: "all", label: "All" },
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
    { value: "exit", label: "Exited" },
];

const MENU_WIDTH = 208;
const MENU_HEIGHT = 250;

/* ------------------- quick view popup (helpers + UI) ------------------- */

const QV_NA = "Not provided";

// dot-path support: pehli non-empty primitive value
const qvPick = (obj, paths) => {
    if (!obj) return "";
    for (const p of paths) {
        const v = p.split(".").reduce((a, k) => (a == null ? undefined : a[k]), obj);
        if (v !== undefined && v !== null && typeof v !== "object" && String(v).trim() !== "") {
            return String(v).trim();
        }
    }
    return "";
};

const qvTitleCase = (s) =>
    s ? s.replace(/[_-]+/g, " ").replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()) : "";

const qvMask = (n) => (n && n.length > 4 ? `${"•".repeat(Math.max(n.length - 4, 4))}${n.slice(-4)}` : n);

const QV_TINTS = {
    indigo: "bg-indigo-50 text-indigo-600",
    sky: "bg-sky-50 text-sky-600",
    emerald: "bg-emerald-50 text-emerald-600",
    rose: "bg-rose-50 text-rose-600",
    amber: "bg-amber-50 text-amber-600",
    violet: "bg-violet-50 text-violet-600",
};

const QV_STEPS = [
    { id: 1, title: "Personal", icon: User },
    { id: 2, title: "Job", icon: Briefcase },
    { id: 3, title: "Documents", icon: FileText },
    { id: 4, title: "Banking", icon: Landmark },
];

function QvItem({ icon: Icon, label, value, tint = "indigo", mono = false, wide = false, action }) {
    const empty = !value;
    return (
        <div className={`flex items-center gap-3 p-3 rounded-2xl border border-slate-200/80 bg-white ${wide ? "sm:col-span-2" : ""}`}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${QV_TINTS[tint]}`}>
                <Icon size={16} />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold text-slate-500">{label}</p>
                <p
                    className={`text-xs mt-0.5 ${wide ? "break-words" : "truncate"} ${mono ? "font-mono" : ""} ${empty ? "text-slate-400 font-medium" : "text-slate-800 font-semibold"}`}
                    title={empty || wide ? "" : value}
                >
                    {value || QV_NA}
                </p>
            </div>
            {action}
        </div>
    );
}

function QvImage({ label, src, fileName, onOpen }) {
    return (
        <div className="min-w-0">
            <p className="text-[11px] font-semibold text-slate-500 mb-1.5">{label}</p>
            {src ? (
                <button
                    type="button"
                    onClick={() => onOpen({ src, label })}
                    className="group block w-full text-left cursor-pointer"
                    title="Click to enlarge"
                >
                    <div className="h-24 sm:h-36 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                        <img
                            src={src}
                            alt={label}
                            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
                        />
                    </div>
                    {fileName && <p className="text-[10px] text-slate-400 mt-1 truncate">{fileName}</p>}
                </button>
            ) : (
                <div className="h-24 sm:h-36 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 flex flex-col items-center justify-center gap-1 text-slate-400">
                    <ImageIcon size={16} />
                    <span className="text-[11px] font-medium">{QV_NA}</span>
                </div>
            )}
        </div>
    );
}

function QvSkeleton({ count = 4 }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="h-[62px] rounded-2xl bg-slate-100 animate-pulse" />
            ))}
        </div>
    );
}

function EmployeeQuickView({ row, resolveDept, resolveDesig, onClose, onEdit, onOpenFull }) {
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState(1);
    const [dir, setDir] = useState(1);
    const [detail, setDetail] = useState(null);
    const [failed, setFailed] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);
    const [lightbox, setLightbox] = useState(null);
    const [showAcc, setShowAcc] = useState(false);
    const [managerName, setManagerName] = useState("");

    /* open animation + body scroll lock */
    useEffect(() => {
        const raf = requestAnimationFrame(() => setOpen(true));
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            cancelAnimationFrame(raf);
            document.body.style.overflow = prev;
        };
    }, []);

    const handleClose = useCallback(() => {
        setOpen(false);
        setTimeout(onClose, 200);
    }, [onClose]);

    /* full employee (list API me documents/bank nahi aate) */
    useEffect(() => {
        let alive = true;
        setDetail(null);
        setFailed(false);
        api.get(`/employees/${row._id}`)
            .then((res) => {
                if (!alive) return;
                const emp = res?.data?.employee || res?.data?.data || res?.data;
                if (!emp || typeof emp !== "object") throw new Error("Empty");
                setDetail(emp);
            })
            .catch((err) => {
                console.error("Quick view fetch error:", err);
                if (alive) setFailed(true);
            });
        return () => {
            alive = false;
        };
    }, [row._id, reloadKey]);

    const emp = useMemo(() => ({ ...row, ...(detail || {}) }), [row, detail]);
    const loadingDetail = !detail && !failed;

    /* reporting manager (name string ya ObjectId dono) */
    useEffect(() => {
        setManagerName("");
        const mgr = emp.reportingManager ?? emp.manager;
        if (!mgr) return;
        if (typeof mgr === "object") {
            const n = getLabel(mgr, ["name", "fullName"]) || `${mgr.firstName || ""} ${mgr.lastName || ""}`.trim();
            if (n) return setManagerName(n);
        }
        const mid = getRefId(mgr);
        if (!isHexObjectId(mid)) {
            if (mid) setManagerName(mid);
            return;
        }
        let alive = true;
        api.get(`/employees/${mid}`)
            .then((r) => {
                const m = r?.data?.employee || r?.data?.data || r?.data;
                if (alive && m?.name) setManagerName(m.name);
            })
            .catch(() => { });
        return () => {
            alive = false;
        };
    }, [emp.reportingManager, emp.manager]);

    /* steps */
    const goStep = useCallback(
        (n) => {
            if (n < 1 || n > QV_STEPS.length || n === step) return;
            setDir(n > step ? 1 : -1);
            setStep(n);
        },
        [step]
    );

    /* keyboard: Esc, ← → */
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === "Escape") {
                if (lightbox) setLightbox(null);
                else handleClose();
            } else if (!lightbox && e.key === "ArrowRight") goStep(step + 1);
            else if (!lightbox && e.key === "ArrowLeft") goStep(step - 1);
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [lightbox, step, goStep, handleClose]);

    /* ----------------------------- data ----------------------------- */
    const fullName = emp.name || `${emp.firstName || ""} ${emp.lastName || ""}`.trim();
    const dept = emp.department ? resolveDept(emp) : "";
    const desig = emp.designation ? resolveDesig(emp) : "";
    const normStatus = getNormalizedStatus(emp);
    const statusLabel =
        normStatus === "exit" ? "Exited" : normStatus === "inactive" ? "Inactive" : qvTitleCase(emp.employeeStatus) || "Active";
    const statusTheme = {
        active: "bg-emerald-50 text-emerald-700 border-emerald-200",
        inactive: "bg-amber-50 text-amber-700 border-amber-200",
        exit: "bg-rose-50 text-rose-700 border-rose-200",
    }[normStatus];
    const statusDot = { active: "bg-emerald-500", inactive: "bg-amber-500", exit: "bg-rose-500" }[normStatus];

    const phoneRaw = qvPick(emp, ["phone", "mobile"]);
    const phone = phoneRaw ? (phoneRaw.startsWith("+") ? phoneRaw : `+91 ${phoneRaw}`) : "";
    const address = [emp.address, emp.city, emp.state, emp.pincode].filter(Boolean).join(", ");
    const salaryNum = getSalaryValue(emp);
    const salaryText = salaryNum ? formatSalary(salaryNum) : "";
    const joining = emp.dateOfJoining ? formatDate(emp.dateOfJoining) : "";
    const avatar =
        emp.avatar || emp.profilePhotoData || emp.documents?.passportPhotoData || emp.photo || "";

    const idTypeRaw = qvPick(emp, ["nationalIdType", "documents.nationalIdType"]);
    const idType =
        idTypeRaw === "Other Official ID" ? qvPick(emp, ["nationalIdOther", "documents.nationalIdOther"]) || idTypeRaw : idTypeRaw;
    const idNumber = qvPick(emp, ["nationalId", "idProofNumber"]);
    const front = qvPick(emp, ["documents.nationalIdFrontFileData", "nationalIdFrontFileData"]);
    const back = qvPick(emp, ["documents.nationalIdBackFileData", "nationalIdBackFileData"]);
    const photo = qvPick(emp, ["documents.passportPhotoData", "passportPhotoData", "profilePhotoData"]) || avatar;

    const bank = {
        accountName: qvPick(emp, ["bankDetails.accountName", "accountName"]),
        bankName: qvPick(emp, ["bankDetails.bankName", "bankName"]),
        branchName: qvPick(emp, ["bankDetails.branchName", "branchName"]),
        accountNumber: qvPick(emp, ["bankDetails.accountNumber", "accountNumber"]),
        ifscCode: qvPick(emp, ["bankDetails.ifscCode", "ifscCode"]),
    };

    /* ----------------------------- step content ----------------------------- */
    const detailGate = (count) =>
        failed ? (
            <div className="py-10 text-center space-y-3">
                <p className="text-sm font-semibold text-slate-700">Details load nahi ho payi.</p>
                <button
                    type="button"
                    onClick={() => setReloadKey((k) => k + 1)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                    <RefreshCw size={13} /> Retry
                </button>
            </div>
        ) : (
            <QvSkeleton count={count} />
        );

    const renderStep = () => {
        if (step === 1) {
            return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <QvItem icon={User} label="Full Name" value={fullName} tint="indigo" />
                    <QvItem icon={Mail} label="Email Address" value={emp.email} tint="sky" />
                    <QvItem icon={Phone} label="Phone Number" value={phone} tint="emerald" mono />
                    <QvItem icon={User} label="Gender" value={qvTitleCase(emp.gender)} tint="violet" />
                    <QvItem icon={Hash} label="Employee ID" value={emp.employeeId} tint="amber" mono />
                    <QvItem icon={MapPin} label="Address" value={address} tint="rose" wide />
                </div>
            );
        }

        if (step === 2) {
            return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <QvItem icon={Briefcase} label="Designation" value={desig} tint="sky" />
                    <QvItem icon={Building2} label="Department" value={dept} tint="indigo" />
                    <QvItem icon={Clock} label="Employment Type" value={qvPick(emp, ["employmentType"])} tint="emerald" />
                    <QvItem icon={BadgeCheck} label="Employee Status" value={statusLabel} tint="amber" />
                    <QvItem icon={UserCheck} label="Reporting Manager" value={managerName} tint="violet" />
                    <QvItem icon={Calendar} label="Joining Date" value={joining} tint="rose" />
                    <QvItem icon={IndianRupee} label="Monthly Salary" value={salaryText} tint="emerald" mono wide />
                </div>
            );
        }

        if (step === 3) {
            if (loadingDetail || failed) return detailGate(3);
            const has = !!idNumber;
            return (
                <div className="space-y-3">
                    <div className="relative flex items-center gap-3 p-3 rounded-2xl border border-slate-200/80 bg-white">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${QV_TINTS.indigo}`}>
                            <IdCard size={16} />
                        </div>
                        <div className="min-w-0 pr-7">
                            <p className="text-[11px] font-semibold text-slate-500">{idType || "National ID"}</p>
                            <p className={`text-xs mt-0.5 truncate ${has ? "font-mono uppercase text-slate-800 font-semibold" : "text-slate-400 font-medium"}`}>
                                {idNumber || QV_NA}
                            </p>
                        </div>
                        <span
                            className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full flex items-center justify-center text-white ${has ? "bg-emerald-500" : "bg-red-500"}`}
                        >
                            {has ? <Check size={10} strokeWidth={3} /> : <X size={10} strokeWidth={3} />}
                        </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                        <QvImage label="ID Front" src={front} fileName={qvPick(emp, ["documents.nationalIdFrontFileName"])} onOpen={setLightbox} />
                        <QvImage label="ID Back" src={back} fileName={qvPick(emp, ["documents.nationalIdBackFileName"])} onOpen={setLightbox} />
                        <QvImage label="Passport Photo" src={photo} fileName={qvPick(emp, ["documents.passportPhotoFileName"])} onOpen={setLightbox} />
                    </div>
                </div>
            );
        }

        if (loadingDetail || failed) return detailGate(5);
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <QvItem icon={User} label="Account Name" value={bank.accountName} tint="violet" />
                <QvItem icon={Landmark} label="Bank Name" value={bank.bankName} tint="sky" />
                <QvItem icon={Network} label="Branch Name" value={bank.branchName} tint="emerald" />
                <QvItem
                    icon={CreditCard}
                    label="Account Number"
                    value={bank.accountNumber ? (showAcc ? bank.accountNumber : qvMask(bank.accountNumber)) : ""}
                    tint="indigo"
                    mono
                    action={
                        bank.accountNumber && (
                            <button
                                type="button"
                                onClick={() => setShowAcc((s) => !s)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer"
                                title={showAcc ? "Hide" : "Show"}
                            >
                                {showAcc ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                        )
                    }
                />
                <QvItem icon={Hash} label="IFSC Code" value={bank.ifscCode} tint="amber" mono wide />
            </div>
        );
    };

    const isLast = step === QV_STEPS.length;

    /* ----------------------------- render ----------------------------- */
    return (
        <>
            <style>{`
                @keyframes qvSlide {
                    from { opacity: 0; transform: translateX(var(--qv-x, 16px)); }
                    to   { opacity: 1; transform: translateX(0); }
                }
            `}</style>

            <div
                className={`fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-[2px] transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0"}`}
                onMouseDown={(e) => e.target === e.currentTarget && handleClose()}
            >
                <div
                    role="dialog"
                    aria-modal="true"
                    className={`w-full sm:max-w-3xl max-h-[94vh] sm:max-h-[92vh] flex flex-col bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl transition-all duration-200 ease-out ${open ? "opacity-100 translate-y-0 sm:scale-100" : "opacity-0 translate-y-6 sm:translate-y-0 sm:scale-95"}`}
                >
                    {/* header */}
                    <div className="flex items-center gap-3 sm:gap-4 px-4 sm:px-6 pt-4 sm:pt-5 pb-4 border-b border-slate-100 shrink-0">
                        {avatar ? (
                            <img
                                src={avatar}
                                alt={fullName}
                                onClick={() => setLightbox({ src: avatar, label: fullName })}
                                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border-2 border-indigo-50 cursor-pointer shrink-0"
                            />
                        ) : (
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-indigo-600 text-white text-sm font-bold flex items-center justify-center shrink-0">
                                {getInitials(fullName)}
                            </div>
                        )}

                        <div className="min-w-0 flex-1">
                            <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate">{fullName || QV_NA}</h2>
                            <p className="text-xs text-slate-500 font-medium truncate">
                                {desig || QV_NA}
                                {dept ? ` · ${dept}` : ""}
                            </p>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                {emp.employeeId && (
                                    <span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                                        {emp.employeeId}
                                    </span>
                                )}
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusTheme}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
                                    {statusLabel}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                            <button
                                type="button"
                                onClick={() => onEdit(row._id)}
                                className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                                title="Edit"
                            >
                                <Edit3 size={15} />
                            </button>
                            <button
                                type="button"
                                onClick={handleClose}
                                className="w-9 h-9 rounded-full border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 flex items-center justify-center transition cursor-pointer"
                                aria-label="Close"
                            >
                                <X size={15} />
                            </button>
                        </div>
                    </div>

                    {/* stepper */}
                    <div className="px-4 sm:px-6 py-3 border-b border-slate-100 shrink-0">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                            {QV_STEPS.map((s, i) => {
                                const Icon = s.icon;
                                const active = step === s.id;
                                const done = step > s.id;
                                return (
                                    <div key={s.id} className="flex items-center gap-1.5 sm:gap-2 flex-1 last:flex-none">
                                        <button
                                            type="button"
                                            onClick={() => goStep(s.id)}
                                            className={`flex items-center gap-2 px-2.5 sm:px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${active
                                                ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
                                                : done
                                                    ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                                    : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                                                }`}
                                        >
                                            {done ? <Check size={14} /> : <Icon size={14} />}
                                            <span className={active ? "" : "hidden sm:inline"}>{s.title}</span>
                                        </button>
                                        {i < QV_STEPS.length - 1 && (
                                            <div className="flex-1 h-0.5 rounded-full bg-slate-100 overflow-hidden">
                                                <div
                                                    className="h-full bg-emerald-400 transition-all duration-300"
                                                    style={{ width: done ? "100%" : "0%" }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* body */}
                    <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        <div className="sm:min-h-[310px]">
                            <div key={step} style={{ animation: "qvSlide 260ms ease both", "--qv-x": `${dir * 16}px` }}>
                                {renderStep()}
                            </div>
                        </div>
                    </div>

                    {/* footer */}
                    <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-t border-slate-100 shrink-0">
                        <button
                            type="button"
                            onClick={() => onOpenFull(row._id)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition cursor-pointer"
                        >
                            <ExternalLink size={13} />
                            <span className="hidden sm:inline">Open full profile</span>
                            <span className="sm:hidden">Full profile</span>
                        </button>

                        <span className="hidden sm:block text-[11px] font-semibold text-slate-400">
                            Step {step} of {QV_STEPS.length}
                        </span>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => goStep(step - 1)}
                                disabled={step === 1}
                                className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                            >
                                <ChevronLeft size={14} /> Back
                            </button>
                            {isLast ? (
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    className="inline-flex items-center gap-1 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold shadow-sm transition cursor-pointer"
                                >
                                    <Check size={14} /> Done
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => goStep(step + 1)}
                                    className="inline-flex items-center gap-1 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold shadow-sm transition cursor-pointer"
                                >
                                    Next <ChevronRight size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* image preview (panel ke bahar, taaki transform me fixed na fase) */}
            {lightbox && (
                <div
                    className="fixed inset-0 z-[90] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4"
                    onMouseDown={(e) => e.target === e.currentTarget && setLightbox(null)}
                >
                    <div className="relative max-w-3xl w-full">
                        <button
                            type="button"
                            onClick={() => setLightbox(null)}
                            className="absolute -top-3 -right-3 w-9 h-9 rounded-full bg-white text-slate-700 shadow-lg flex items-center justify-center cursor-pointer hover:bg-slate-100"
                            aria-label="Close preview"
                        >
                            <X size={16} />
                        </button>
                        <img src={lightbox.src} alt={lightbox.label} className="w-full max-h-[85vh] object-contain rounded-2xl bg-white" />
                        <p className="text-center text-xs font-semibold text-white/90 mt-3">{lightbox.label}</p>
                    </div>
                </div>
            )}
        </>
    );
}

/* ------------------------------ page ------------------------------ */

export default function EmployeesPage() {
    const router = useRouter();

    const [employees, setEmployees] = useState([]);
    const [departmentsList, setDepartmentsList] = useState([]);
    const [designationsList, setDesignationsList] = useState([]);
    const [lookupsLoaded, setLookupsLoaded] = useState(false);
    const [extraDesignations, setExtraDesignations] = useState({});
    const [desigResolving, setDesigResolving] = useState(false);

    const [search, setSearch] = useState("");
    const [departmentFilter, setDepartmentFilter] = useState("all");
    const [typeFilter, setTypeFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [loading, setLoading] = useState(true);

    const [filterOpen, setFilterOpen] = useState(false);
    const [menu, setMenu] = useState(null); // { id, top, left }
    const [deletingId, setDeletingId] = useState(null);
    const [viewRow, setViewRow] = useState(null); // quick view popup

    const filterRef = useRef(null);
    const attemptedDesigIds = useRef(new Set());

    /* ---- lookups ---- */
    useEffect(() => {
        (async () => {
            try {
                const [deptRes, desigRes] = await Promise.allSettled([
                    api.get("/departments", { params: { limit: 1000 } }),
                    api.get("/designations", { params: { limit: 1000 } }),
                ]);
                if (deptRes.status === "fulfilled") setDepartmentsList(extractList(deptRes.value?.data));
                if (desigRes.status === "fulfilled") setDesignationsList(extractList(desigRes.value?.data));
            } catch (err) {
                console.error("Lookup fetch error:", err);
            } finally {
                setLookupsLoaded(true);
            }
        })();
    }, []);

    /* ---- employees ---- */
    const fetchEmployees = useCallback(async (searchTerm = "") => {
        setLoading(true);
        try {
            const { data } = await api.get("/employees", { params: { search: searchTerm } });
            const list = Array.isArray(data) ? data : data?.employees || data?.data || [];
            setEmployees(list);
        } catch (err) {
            console.error("Failed to load employee list:", err);
            toast.error("Failed to load employees.");
        } finally {
            setLoading(false);
        }
    }, []);

    // single debounced effect (initial load instant, typing 350ms)
    useEffect(() => {
        const t = setTimeout(() => fetchEmployees(search), search ? 350 : 0);
        return () => clearTimeout(t);
    }, [search, fetchEmployees]);

    /* ---- maps ---- */
    const departmentMap = useMemo(() => {
        const map = new Map();
        departmentsList.forEach((d) => {
            const id = String(d?._id || d?.id || "").trim();
            const label = getLabel(d, DEPT_FIELDS);
            if (id && label) {
                map.set(id, label);
                map.set(id.toLowerCase(), label);
            }
        });
        return map;
    }, [departmentsList]);

    const designationMap = useMemo(() => {
        const map = new Map();
        designationsList.forEach((d) => {
            const id = String(d?._id || d?.id || "").trim();
            const label = getLabel(d, DESIG_FIELDS);
            if (id && label) {
                map.set(id, label);
                map.set(id.toLowerCase(), label);
            }
        });
        Object.entries(extraDesignations).forEach(([id, label]) => {
            if (id && label) {
                map.set(id, label);
                map.set(id.toLowerCase(), label);
            }
        });
        return map;
    }, [designationsList, extraDesignations]);

    /* ---- fallback fetch for unresolved designation ids ---- */
    useEffect(() => {
        if (!lookupsLoaded || loading) return;

        const missing = [];
        employees.forEach((emp) => {
            const raw = getDesigRaw(emp);
            if (raw && typeof raw === "object" && getLabel(raw, DESIG_FIELDS)) return;
            const id = getRefId(raw);
            if (
                isHexObjectId(id) &&
                !designationMap.has(id) &&
                !designationMap.has(id.toLowerCase()) &&
                !attemptedDesigIds.current.has(id)
            ) {
                attemptedDesigIds.current.add(id);
                missing.push(id);
            }
        });
        if (missing.length === 0) return;

        setDesigResolving(true);
        Promise.allSettled(missing.map((id) => api.get(`/designations/${id}`)))
            .then((results) => {
                const found = {};
                results.forEach((r, i) => {
                    if (r.status === "fulfilled") {
                        const raw = r.value?.data;
                        const obj = raw?.data?.designation || raw?.designation || raw?.data || raw;
                        const label = getLabel(obj, DESIG_FIELDS);
                        if (label) found[missing[i]] = label;
                    }
                });
                if (Object.keys(found).length > 0) setExtraDesignations((prev) => ({ ...prev, ...found }));
            })
            .finally(() => setDesigResolving(false));
    }, [employees, designationMap, lookupsLoaded, loading]);

    /* ---- outside click / scroll close ---- */
    useEffect(() => {
        const onDown = (e) => {
            if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false);
            if (!e.target.closest("[data-row-menu]") && !e.target.closest("[data-menu-trigger]")) setMenu(null);
        };
        const closeMenu = () => setMenu(null);
        document.addEventListener("mousedown", onDown);
        window.addEventListener("scroll", closeMenu, true);
        window.addEventListener("resize", closeMenu);
        return () => {
            document.removeEventListener("mousedown", onDown);
            window.removeEventListener("scroll", closeMenu, true);
            window.removeEventListener("resize", closeMenu);
        };
    }, []);

    /* ---- resolvers ---- */
    const resolveDepartmentName = useCallback(
        (emp) => {
            if (!emp) return "General";
            const raw = getDeptRaw(emp);

            if (raw && typeof raw === "object") {
                const label = getLabel(raw, DEPT_FIELDS);
                if (label) return label;
                const id = getRefId(raw);
                return departmentMap.get(id) || departmentMap.get(id.toLowerCase()) || "General";
            }
            if (typeof raw === "string" && raw.trim()) {
                const val = raw.trim();
                if (isHexObjectId(val)) return departmentMap.get(val) || departmentMap.get(val.toLowerCase()) || "General";
                return val;
            }
            return "General";
        },
        [departmentMap]
    );

    const resolveDesignationName = useCallback(
        (emp) => {
            if (!emp) return "Not assigned";
            const raw = getDesigRaw(emp);

            if (raw && typeof raw === "object") {
                const label = getLabel(raw, DESIG_FIELDS);
                if (label) return label;
                const id = getRefId(raw);
                if (designationMap.has(id)) return designationMap.get(id);
                if (designationMap.has(id.toLowerCase())) return designationMap.get(id.toLowerCase());
            }

            if (typeof raw === "string" && raw.trim()) {
                const val = raw.trim();
                if (isHexObjectId(val)) {
                    if (designationMap.has(val)) return designationMap.get(val);
                    if (designationMap.has(val.toLowerCase())) return designationMap.get(val.toLowerCase());
                    if (desigResolving || !lookupsLoaded) return "Loading...";
                } else {
                    return val;
                }
            }

            const backups = [emp.position, emp.jobTitle, emp.role, emp.jobDetails?.position, emp.jobDetails?.role];
            for (const b of backups) {
                if (typeof b === "string" && b.trim() && !isHexObjectId(b.trim())) return b.trim();
            }
            return "Team Member";
        },
        [designationMap, desigResolving, lookupsLoaded]
    );

    /* ---- filter data ---- */
    const departments = useMemo(() => {
        const set = new Set();
        employees.forEach((emp) => {
            const d = resolveDepartmentName(emp);
            if (d && d !== "General") set.add(d);
        });
        departmentMap.forEach((name) => set.add(name));
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [employees, departmentMap, resolveDepartmentName]);

    const employmentTypes = useMemo(() => {
        const set = new Set();
        employees.forEach((e) => set.add(getEmploymentType(e)));
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [employees]);

    const filteredEmployees = useMemo(
        () =>
            employees.filter((emp) => {
                const matchesDept =
                    departmentFilter === "all" ||
                    resolveDepartmentName(emp).toLowerCase() === departmentFilter.toLowerCase();
                const matchesType =
                    typeFilter === "all" || getEmploymentType(emp).toLowerCase() === typeFilter.toLowerCase();
                const matchesStatus = statusFilter === "all" || getNormalizedStatus(emp) === statusFilter;
                return matchesDept && matchesType && matchesStatus;
            }),
        [employees, departmentFilter, typeFilter, statusFilter, resolveDepartmentName]
    );

    const activeFilterCount =
        (departmentFilter !== "all" ? 1 : 0) + (typeFilter !== "all" ? 1 : 0) + (statusFilter !== "all" ? 1 : 0);

    const resetFilters = () => {
        setDepartmentFilter("all");
        setTypeFilter("all");
        setStatusFilter("all");
    };

    /* ---- actions ---- */
    const openMenu = (e, row) => {
        e.stopPropagation();
        if (menu?.id === row._id) {
            setMenu(null);
            return;
        }
        const r = e.currentTarget.getBoundingClientRect();
        const top = r.bottom + MENU_HEIGHT > window.innerHeight ? Math.max(8, r.top - MENU_HEIGHT - 4) : r.bottom + 4;
        const left = Math.max(8, Math.min(r.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8));
        setMenu({ id: row._id, top, left });
    };

    const openView = (row) => {
        setMenu(null);
        setViewRow(row);
    };
    const goProfile = (id) => router.push(`/employees/profile?id=${id}`);
    const goEdit = (id) => router.push(`/employees/add?id=${id}`);

    const handleStatusChange = async (employeeId, newStatus) => {
        setMenu(null);

        const isExit = newStatus === "exit";
        const exitDateValue = isExit ? new Date().toISOString() : null;
        const formattedStatus = isExit ? "Exit" : newStatus.charAt(0).toUpperCase() + newStatus.slice(1);

        setEmployees((prev) =>
            prev.map((emp) =>
                emp._id === employeeId
                    ? {
                        ...emp,
                        status: formattedStatus,
                        employeeStatus: formattedStatus,
                        isActive: !isExit && formattedStatus !== "Inactive",
                        isExited: isExit,
                        exitDate: exitDateValue || emp.exitDate,
                    }
                    : emp
            )
        );

        const payload = {
            status: formattedStatus,
            employeeStatus: formattedStatus,
            isActive: !isExit && formattedStatus !== "Inactive",
            isExited: isExit,
            exitDate: exitDateValue,
            exitReason: isExit ? "Administrative separation update" : undefined,
        };

        try {
            if (isExit) {
                try {
                    await api.put(`/employees/${employeeId}/exit`, payload);
                } catch {
                    await api.put(`/employees/${employeeId}`, payload);
                }
            } else {
                await api.put(`/employees/${employeeId}`, payload);
            }
            toast.success(`Employee marked as ${isExit ? "Exited" : formattedStatus}`);
        } catch (err) {
            console.error("Status update error:", err);
            toast.error("Failed to update status on server.");
            fetchEmployees(search);
        }
    };

    const handleDeleteEmployee = async (employeeId) => {
        setMenu(null);
        if (!window.confirm("Are you sure you want to permanently delete this employee record?")) return;

        setDeletingId(employeeId);
        try {
            await api.delete(`/employees/${employeeId}`);
            setEmployees((prev) => prev.filter((emp) => emp._id !== employeeId));
            toast.success("Employee record deleted permanently.");
        } catch (err) {
            console.error("Failed to delete employee:", err);
            toast.error("Failed to delete employee record.");
        } finally {
            setDeletingId(null);
        }
    };

    const handleExportCSV = () => {
        const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
        const headers = "Employee ID,Name,Email,Phone,Department,Designation,Employment Type,Joining Date,Salary,Status\n";
        const rows = filteredEmployees
            .map((e) =>
                [
                    e.employeeId, e.name, e.email, e.phone,
                    resolveDepartmentName(e), resolveDesignationName(e), getEmploymentType(e),
                    formatDate(e.dateOfJoining), getSalaryValue(e) ?? "", getNormalizedStatus(e),
                ].map(esc).join(",")
            )
            .join("\n");

        const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `employee-roster-${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    /* ---- small UI pieces ---- */
    const Avatar = ({ row, size = "w-10 h-10" }) =>
        row.avatar || row.photo ? (
            <img
                src={row.avatar || row.photo}
                alt={row.name}
                className={`${size} rounded-full object-cover shrink-0 border border-slate-200`}
            />
        ) : (
            <div className={`${size} rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0`}>
                {getInitials(row.name)}
            </div>
        );

    const TypePill = ({ type }) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getTypeTheme(type)}`}>
            {type}
        </span>
    );

    const StatusDot = ({ status }) => {
        if (status === "active") return null;
        const map = {
            inactive: "bg-amber-50 text-amber-700 border-amber-200",
            exit: "bg-rose-50 text-rose-700 border-rose-200",
        };
        return (
            <span className={`ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${map[status]}`}>
                {status === "exit" ? "Exited" : "Inactive"}
            </span>
        );
    };

    const menuEmployee = menu ? employees.find((e) => e._id === menu.id) : null;
    const menuStatus = menuEmployee ? getNormalizedStatus(menuEmployee) : null;

    /* ------------------------------ render ------------------------------ */
    return (
        <div className="min-h-screen bg-slate-50/60 p-1 sm:p-2 font-sans antialiased text-slate-800">
            <div className="max-w-[1200px] mx-auto bg-white rounded-3xl border border-slate-200/70 shadow-sm p-4 sm:p-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
                    <h1 className="text-lg font-semibold text-slate-700">Employee</h1>

                    <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                        {/* Search */}
                        <div className="relative flex-1 min-w-[180px] md:w-64 md:flex-none">
                            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Enter Employee Name"
                                className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 outline-none transition focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => setSearch("")}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                                    aria-label="Clear search"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        {/* Filter */}
                        <div className="relative" ref={filterRef}>
                            <button
                                type="button"
                                onClick={() => setFilterOpen((p) => !p)}
                                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition cursor-pointer ${filterOpen || activeFilterCount
                                    ? "border-indigo-500 text-indigo-700 bg-indigo-50/50"
                                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                                    }`}
                            >
                                <Filter size={14} />
                                Filter
                                {activeFilterCount > 0 && (
                                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">
                                        {activeFilterCount}
                                    </span>
                                )}
                            </button>

                            {filterOpen && (
                                <div className="absolute right-0 mt-2 w-72 z-40 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 space-y-3.5">
                                    <div>
                                        <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Department</label>
                                        <select
                                            value={departmentFilter}
                                            onChange={(e) => setDepartmentFilter(e.target.value)}
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500 cursor-pointer"
                                        >
                                            <option value="all">All Departments</option>
                                            {departments.map((d) => (
                                                <option key={d} value={d}>{d}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Employment Status</label>
                                        <select
                                            value={typeFilter}
                                            onChange={(e) => setTypeFilter(e.target.value)}
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500 cursor-pointer"
                                        >
                                            <option value="all">All Types</option>
                                            {employmentTypes.map((t) => (
                                                <option key={t} value={t}>{t}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Account Status</label>
                                        <div className="flex flex-wrap gap-1.5">
                                            {STATUS_OPTIONS.map((o) => (
                                                <button
                                                    key={o.value}
                                                    type="button"
                                                    onClick={() => setStatusFilter(o.value)}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${statusFilter === o.value
                                                        ? "bg-indigo-600 text-white border-indigo-600"
                                                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                                        }`}
                                                >
                                                    {o.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-1">
                                        <button
                                            type="button"
                                            onClick={resetFilters}
                                            className="text-xs font-semibold text-slate-500 hover:text-slate-700 cursor-pointer"
                                        >
                                            Reset
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFilterOpen(false)}
                                            className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer"
                                        >
                                            Apply
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={handleExportCSV}
                            title="Export CSV"
                            className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-indigo-600 transition cursor-pointer"
                        >
                            <Download size={16} />
                        </button>

                        <button
                            type="button"
                            onClick={() => router.push("/employees/add")}
                            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-sm font-semibold shadow-sm transition cursor-pointer"
                        >
                            Add Employee
                        </button>
                    </div>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="py-24 flex flex-col items-center justify-center gap-3">
                        <Loader2 className="animate-spin text-indigo-600" size={30} />
                        <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Loading employees...</p>
                    </div>
                ) : filteredEmployees.length === 0 ? (
                    <div className="py-20 text-center space-y-2">
                        <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto border border-slate-200">
                            <Users size={22} />
                        </div>
                        <p className="text-sm font-semibold text-slate-700">No employees found</p>
                        <p className="text-xs text-slate-400">Search ya filters change karke dekho.</p>
                        {activeFilterCount > 0 && (
                            <button
                                type="button"
                                onClick={resetFilters}
                                className="mt-1 text-xs font-semibold text-indigo-600 hover:underline cursor-pointer"
                            >
                                Reset filters
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        {/* Desktop table */}
                        <div className="hidden md:block max-h-[calc(100vh-230px)] overflow-auto rounded-2xl">
                            <table className="w-full min-w-[820px] text-left border-separate border-spacing-0">
                                <thead>
                                    <tr className="text-xs text-slate-500">
                                        {["Profile", "Department", "Designation", "Employment Status", "Joining Date", "Salary", "Action"].map((h, i, arr) => (
                                            <th
                                                key={h}
                                                className={`sticky top-0 z-10 bg-slate-50 py-3.5 px-4 font-medium ${i === 0 ? "rounded-l-xl pl-5" : ""} ${i === arr.length - 1 ? "rounded-r-xl text-center pr-5" : ""}`}
                                            >
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredEmployees.map((row) => {
                                        const status = getNormalizedStatus(row);
                                        const isDeleting = deletingId === row._id;
                                        const type = getEmploymentType(row);

                                        return (
                                            <tr
                                                key={row._id}
                                                onClick={() => openView(row)}
                                                className={`group cursor-pointer transition-colors hover:bg-indigo-50/60 ${isDeleting ? "opacity-50 pointer-events-none" : ""}`}
                                            >
                                                <td className="py-3.5 px-4 pl-5 border-b border-slate-100">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar row={row} />
                                                        <div className="min-w-0">
                                                            <p className="text-[13px] font-medium text-slate-800 truncate max-w-[170px] group-hover:text-indigo-700 transition-colors">
                                                                {row.name}
                                                                <StatusDot status={status} />
                                                            </p>
                                                            <p className="text-[11px] text-slate-500 mt-0.5">ID: {row.employeeId || "—"}</p>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="py-3.5 px-4 border-b border-slate-100 text-[13px] text-indigo-900/80">
                                                    <span className="block truncate max-w-[170px]">{resolveDepartmentName(row)}</span>
                                                </td>

                                                <td className="py-3.5 px-4 border-b border-slate-100 text-[13px] text-slate-700">
                                                    <span className="block truncate max-w-[150px]">{resolveDesignationName(row)}</span>
                                                </td>

                                                <td className="py-3.5 px-4 border-b border-slate-100">
                                                    <TypePill type={type} />
                                                </td>

                                                <td className="py-3.5 px-4 border-b border-slate-100 text-[13px] text-slate-700 whitespace-nowrap">
                                                    {formatDate(row.dateOfJoining)}
                                                </td>

                                                <td className="py-3.5 px-4 border-b border-slate-100 text-[13px] text-slate-700 whitespace-nowrap">
                                                    {formatSalary(getSalaryValue(row))}
                                                </td>

                                                <td className="py-3.5 px-4 pr-5 border-b border-slate-100 text-center">
                                                    <button
                                                        type="button"
                                                        data-menu-trigger
                                                        onClick={(e) => openMenu(e, row)}
                                                        disabled={isDeleting}
                                                        className={`p-1.5 rounded-lg transition cursor-pointer ${menu?.id === row._id
                                                            ? "bg-indigo-100 text-indigo-700"
                                                            : "text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
                                                            }`}
                                                        title="More options"
                                                    >
                                                        {isDeleting ? <Loader2 size={16} className="animate-spin text-rose-600" /> : <MoreVertical size={16} />}
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile / tablet cards */}
                        <div className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {filteredEmployees.map((row) => {
                                const status = getNormalizedStatus(row);
                                const isDeleting = deletingId === row._id;
                                return (
                                    <div
                                        key={row._id}
                                        onClick={() => openView(row)}
                                        className={`rounded-2xl border border-slate-200 p-4 space-y-3 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition ${isDeleting ? "opacity-50 pointer-events-none" : ""}`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <Avatar row={row} />
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-slate-800 truncate">
                                                        {row.name}
                                                        <StatusDot status={status} />
                                                    </p>
                                                    <p className="text-[11px] text-slate-500">ID: {row.employeeId || "—"}</p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                data-menu-trigger
                                                onClick={(e) => openMenu(e, row)}
                                                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer shrink-0"
                                            >
                                                <MoreVertical size={16} />
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div>
                                                <p className="text-slate-400">Department</p>
                                                <p className="font-medium text-slate-700 truncate">{resolveDepartmentName(row)}</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-400">Designation</p>
                                                <p className="font-medium text-slate-700 truncate">{resolveDesignationName(row)}</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-400">Joining Date</p>
                                                <p className="font-medium text-slate-700">{formatDate(row.dateOfJoining)}</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-400">Salary</p>
                                                <p className="font-medium text-slate-700">{formatSalary(getSalaryValue(row))}</p>
                                            </div>
                                        </div>

                                        <TypePill type={getEmploymentType(row)} />
                                    </div>
                                );
                            })}
                        </div>

                        <p className="mt-3 text-[11px] text-slate-400 text-right">
                            Showing {filteredEmployees.length} of {employees.length} employees
                        </p>
                    </>
                )}
            </div>

            {/* Floating action menu (fixed => table overflow me clip nahi hoga) */}
            {menu && menuEmployee && (
                <div
                    data-row-menu
                    style={{ top: menu.top, left: menu.left, width: MENU_WIDTH }}
                    className="fixed z-[60] bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 text-left"
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        type="button"
                        onClick={() => openView(menuEmployee)}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition cursor-pointer"
                    >
                        <Eye size={14} className="text-slate-400" /> View Profile
                    </button>
                    <button
                        type="button"
                        onClick={() => goEdit(menuEmployee._id)}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition cursor-pointer"
                    >
                        <Edit3 size={14} className="text-slate-400" /> Edit Details
                    </button>

                    <div className="my-1 border-t border-slate-100" />

                    {menuStatus !== "active" && (
                        <button
                            type="button"
                            onClick={() => handleStatusChange(menuEmployee._id, "active")}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-600 transition cursor-pointer"
                        >
                            <UserCheck size={14} className="text-emerald-500" /> Mark Active
                        </button>
                    )}
                    {menuStatus !== "inactive" && (
                        <button
                            type="button"
                            onClick={() => handleStatusChange(menuEmployee._id, "inactive")}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-amber-50 hover:text-amber-600 transition cursor-pointer"
                        >
                            <UserMinus size={14} className="text-amber-500" /> Mark Inactive
                        </button>
                    )}
                    {menuStatus !== "exit" && (
                        <button
                            type="button"
                            onClick={() => handleStatusChange(menuEmployee._id, "exit")}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
                        >
                            <UserX size={14} className="text-rose-500" /> Mark Exited
                        </button>
                    )}

                    <div className="my-1 border-t border-slate-100" />

                    <button
                        type="button"
                        onClick={() => handleDeleteEmployee(menuEmployee._id)}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                    >
                        <Trash2 size={14} /> Delete Record
                    </button>
                </div>
            )}

            {/* Quick view popup */}
            {viewRow && (
                <EmployeeQuickView
                    key={viewRow._id}
                    row={viewRow}
                    resolveDept={resolveDepartmentName}
                    resolveDesig={resolveDesignationName}
                    onClose={() => setViewRow(null)}
                    onEdit={(id) => {
                        setViewRow(null);
                        goEdit(id);
                    }}
                    onOpenFull={(id) => {
                        setViewRow(null);
                        goProfile(id);
                    }}
                />
            )}
        </div>
    );
}