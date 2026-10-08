"use client";

import { useEffect, useState, useRef, useMemo, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    Loader2,
    ArrowLeft,
    Edit3,
    Camera,
    FileText,
    Mail,
    Phone,
    Calendar,
    Building2,
    Briefcase,
    UserCheck,
    MapPin,
    IndianRupee,
    User,
    Clock,
    Landmark,
    CreditCard,
    Network,
    Hash,
    IdCard,
    Globe2,
    BadgeCheck,
    Eye,
    EyeOff,
    RefreshCw,
    X,
    Check,
    AlertCircle,
    CheckCircle2,
    ImageIcon,
} from "lucide-react";
import api from "@/lib/api";

/* ----------------------------- helpers ----------------------------- */

const NA = "Not provided";
const isHexId = (s) => typeof s === "string" && /^[0-9a-fA-F]{24}$/.test(s.trim());

// dot-path support, pehli non-empty primitive value return karta hai
const pick = (obj, paths, fallback = "") => {
    if (!obj) return fallback;
    for (const p of paths) {
        const v = p.split(".").reduce((a, k) => (a == null ? undefined : a[k]), obj);
        if (v !== undefined && v !== null && typeof v !== "object" && String(v).trim() !== "") {
            return String(v).trim();
        }
    }
    return fallback;
};

const labelOf = (v, keys = ["title", "name", "label"]) => {
    if (!v) return "";
    if (typeof v === "string") return isHexId(v) ? "" : v.trim();
    if (typeof v === "object") {
        for (const k of keys) {
            if (typeof v[k] === "string" && v[k].trim() && !isHexId(v[k])) return v[k].trim();
        }
    }
    return "";
};

const refId = (v) => {
    if (!v) return "";
    if (typeof v === "string") return v.trim();
    if (typeof v === "object") return String(v._id || v.id || v.$oid || "").trim();
    return "";
};

const extractList = (raw, depth = 0) => {
    if (Array.isArray(raw)) return raw;
    if (!raw || typeof raw !== "object" || depth > 3) return [];
    for (const k of ["data", "designations", "departments", "employees", "items", "results", "rows", "docs"]) {
        if (raw[k] !== undefined) {
            const r = extractList(raw[k], depth + 1);
            if (r.length) return r;
        }
    }
    return [];
};

// pehla working endpoint use karo
const fetchFirst = async (paths) => {
    for (const p of paths) {
        try {
            const res = await api.get(p, { params: { limit: 1000 } });
            const list = extractList(res?.data);
            if (list.length) return list;
        } catch {
            /* next */
        }
    }
    return [];
};

// dd-mm-yyyy
const toDateObj = (d) => {
    if (!d) return null;
    if (typeof d === "string") {
        const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    }
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? null : dt;
};

const formatDate = (d) => {
    const dt = toDateObj(d);
    if (!dt) return NA;
    return `${String(dt.getDate()).padStart(2, "0")}-${String(dt.getMonth() + 1).padStart(2, "0")}-${dt.getFullYear()}`;
};

const getTenure = (d) => {
    const start = toDateObj(d);
    if (!start) return "";
    const now = new Date();
    if (start > now) return "Joining soon";
    let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
    if (now.getDate() < start.getDate()) months -= 1;
    if (months < 1) return "Less than a month";
    const y = Math.floor(months / 12);
    const m = months % 12;
    return [y ? `${y} yr${y > 1 ? "s" : ""}` : "", m ? `${m} mo` : ""].filter(Boolean).join(" ");
};

const formatSalary = (raw) => {
    if (raw === undefined || raw === null || raw === "") return "";
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return "";
    return `₹ ${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const titleCase = (s) =>
    s ? s.replace(/[_-]+/g, " ").replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()) : "";

const getInitials = (name) => {
    if (!name) return "U";
    const p = name.trim().split(" ").filter(Boolean);
    return p.length > 1 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : p[0].slice(0, 2).toUpperCase();
};

const maskAccount = (n) => (n && n.length > 4 ? `${"•".repeat(Math.max(n.length - 4, 4))}${n.slice(-4)}` : n);

// employeeStatus (Active, Probation, Notice Period, On Leave, Permanent, Freelancer, Inactive, Exit)
const getStatusInfo = (emp) => {
    const raw = pick(emp, ["employeeStatus", "status"], emp?.isExited ? "Exit" : "Active");
    const s = raw.toLowerCase();
    if (emp?.isExited === true || s === "exit" || s === "exited")
        return { label: "Exited", badge: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-500" };
    if (s === "inactive" || emp?.isActive === false)
        return { label: "Inactive", badge: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400" };
    if (["probation", "notice period", "on leave"].includes(s))
        return { label: titleCase(raw), badge: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" };
    if (s === "freelancer")
        return { label: "Freelancer", badge: "bg-sky-50 text-sky-700 border-sky-200", dot: "bg-sky-500" };
    return { label: titleCase(raw) || "Active", badge: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" };
};

const TINTS = {
    indigo: "bg-indigo-50 text-indigo-600",
    sky: "bg-sky-50 text-sky-600",
    emerald: "bg-emerald-50 text-emerald-600",
    rose: "bg-rose-50 text-rose-600",
    amber: "bg-amber-50 text-amber-600",
    violet: "bg-violet-50 text-violet-600",
};

/* ------------------------- small UI components ------------------------- */

function InfoItem({ icon: Icon, label, value, tint = "indigo", mono = false, wide = false, action }) {
    const empty = !value;
    return (
        <div className={`flex items-center gap-3 p-3.5 rounded-2xl border border-slate-200/80 bg-white ${wide ? "sm:col-span-2 xl:col-span-3" : ""}`}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${TINTS[tint]}`}>
                <Icon size={16} />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold text-slate-500">{label}</p>
                <p
                    className={`text-xs mt-0.5 ${wide ? "break-words" : "truncate"} ${mono ? "font-mono" : ""} ${empty ? "text-slate-400 font-medium" : "text-slate-800 font-semibold"}`}
                    title={empty || wide ? "" : value}
                >
                    {value || NA}
                </p>
            </div>
            {action}
        </div>
    );
}

function Section({ title, subtitle, children }) {
    return (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 sm:p-6">
            <div className="mb-4">
                <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-600">{title}</h3>
                {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">{children}</div>
        </div>
    );
}

function DocImage({ label, src, fileName, onOpen }) {
    return (
        <div className="min-w-0">
            <p className="text-[10px] font-semibold text-slate-400 mb-1.5">{label}</p>
            {src ? (
                <button
                    type="button"
                    onClick={() => onOpen({ src, label })}
                    className="group block w-full text-left cursor-pointer"
                    title="Click to enlarge"
                >
                    <div className="h-24 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                        <img src={src} alt={label} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200" />
                    </div>
                    {fileName && <p className="text-[10px] text-slate-400 mt-1 truncate">{fileName}</p>}
                </button>
            ) : (
                <div className="h-24 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 flex flex-col items-center justify-center gap-1 text-slate-400">
                    <ImageIcon size={16} />
                    <span className="text-[11px] font-medium">{NA}</span>
                </div>
            )}
        </div>
    );
}

function DocCard({ icon: Icon, tint, title, children }) {
    return (
        <div className="p-4 rounded-2xl border border-slate-200/80 bg-white space-y-3">
            <div className="flex items-center gap-2.5">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${TINTS[tint]}`}>
                    <Icon size={14} />
                </div>
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-600">{title}</p>
            </div>
            {children}
        </div>
    );
}

function Lightbox({ item, onClose }) {
    useEffect(() => {
        const onKey = (e) => e.key === "Escape" && onClose();
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-[90] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4"
            onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="relative max-w-3xl w-full">
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute -top-3 -right-3 w-9 h-9 rounded-full bg-white text-slate-700 shadow-lg flex items-center justify-center cursor-pointer hover:bg-slate-100"
                    aria-label="Close preview"
                >
                    <X size={16} />
                </button>
                <img src={item.src} alt={item.label} className="w-full max-h-[85vh] object-contain rounded-2xl bg-white" />
                <p className="text-center text-xs font-semibold text-white/90 mt-3">{item.label}</p>
            </div>
        </div>
    );
}

/* ------------------------------ documents modal ------------------------------ */

function DocumentsModal({ docs, bank, onClose, onOpenImage }) {
    const [showAcc, setShowAcc] = useState(false);

    useEffect(() => {
        const onKey = (e) => e.key === "Escape" && onClose();
        document.addEventListener("keydown", onKey);
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = "";
        };
    }, [onClose]);

    const has = !!docs.idNumber;

    return (
        <div
            className="fixed inset-0 z-[70] bg-slate-900/50 backdrop-blur-[2px] flex items-center justify-center p-3 sm:p-6"
            onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="w-full max-w-[720px] max-h-[92vh] overflow-y-auto bg-white rounded-3xl shadow-2xl p-5 sm:p-7">
                {/* header */}
                <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <FileText size={20} />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-800">View Documents</h2>
                            <p className="text-xs text-slate-500">View all uploaded documents and billing information</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 rounded-full border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 flex items-center justify-center cursor-pointer"
                        aria-label="Close"
                    >
                        <X size={14} />
                    </button>
                </div>

                {/* identification */}
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-600 mt-5 mb-3">Identification</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="relative flex items-center gap-3 p-3.5 rounded-2xl border border-slate-200/80 bg-white">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${TINTS.indigo}`}>
                            <IdCard size={16} />
                        </div>
                        <div className="min-w-0 pr-6">
                            <p className="text-[11px] font-bold text-slate-700">{docs.idType || "National ID"}</p>
                            <p className={`text-xs mt-0.5 truncate ${has ? "font-mono uppercase text-slate-800 font-semibold" : "text-slate-400"}`}>
                                {docs.idNumber || NA}
                            </p>
                        </div>
                        <span className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full flex items-center justify-center text-white ${has ? "bg-emerald-500" : "bg-red-500"}`}>
                            {has ? <Check size={10} strokeWidth={3} /> : <X size={10} strokeWidth={3} />}
                        </span>
                    </div>
                </div>

                <div className="mt-3">
                    <DocCard icon={IdCard} tint="indigo" title={`${docs.idType || "National ID"} Card`}>
                        <div className="grid grid-cols-2 gap-3">
                            <DocImage label="Front Side" src={docs.front} fileName={docs.frontName} onOpen={onOpenImage} />
                            <DocImage label="Back Side" src={docs.back} fileName={docs.backName} onOpen={onOpenImage} />
                        </div>
                    </DocCard>
                </div>

                <div className="mt-3">
                    <DocCard icon={ImageIcon} tint="sky" title="Passport Size Photo">
                        <div className="max-w-[160px]">
                            <DocImage label="" src={docs.photo} fileName={docs.photoName} onOpen={onOpenImage} />
                        </div>
                    </DocCard>
                </div>

                {/* billing */}
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-600 mt-5 mb-3">Billing Info</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <InfoItem icon={User} label="Account Name" value={bank.accountName} tint="violet" />
                    <InfoItem icon={Landmark} label="Bank Name" value={bank.bankName} tint="sky" />
                    <InfoItem icon={Network} label="Branch Name" value={bank.branchName} tint="emerald" />
                    <InfoItem
                        icon={CreditCard}
                        label="Account Number"
                        value={bank.accountNumber ? (showAcc ? bank.accountNumber : maskAccount(bank.accountNumber)) : ""}
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
                    <InfoItem icon={Hash} label="IFSC Code" value={bank.ifscCode} tint="amber" mono />
                </div>

                <div className="flex justify-end mt-6">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-sm font-semibold transition cursor-pointer"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

/* -------------------------------- page -------------------------------- */

function EmployeeProfileContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const id = searchParams.get("id");

    const [employee, setEmployee] = useState(null);
    const [departments, setDepartments] = useState([]);
    const [designations, setDesignations] = useState([]);
    const [managerName, setManagerName] = useState("");

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [saving, setSaving] = useState(false);
    const [docsOpen, setDocsOpen] = useState(false);
    const [lightbox, setLightbox] = useState(null);

    const fileRef = useRef(null);

    /* lookups (add-employee form wale endpoints pehle) */
    useEffect(() => {
        (async () => {
            const [dep, des] = await Promise.all([
                fetchFirst(["/organization/departments", "/departments"]),
                fetchFirst(["/organization/designations", "/designations"]),
            ]);
            setDepartments(dep);
            setDesignations(des);
        })();
    }, []);

    /* employee */
    const fetchEmployee = useCallback(async () => {
        if (!id) {
            setLoading(false);
            setError("Employee id URL me missing hai.");
            return;
        }
        setLoading(true);
        setError("");
        try {
            const res = await api.get(`/employees/${id}`);
            const emp = res?.data?.employee || res?.data?.data || res?.data;
            if (!emp || typeof emp !== "object") throw new Error("Empty response");
            setEmployee(emp);
        } catch (err) {
            console.error("Employee fetch error:", err);
            setError("Employee data load nahi ho paaya.");
            setEmployee(null);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchEmployee();
    }, [fetchEmployee]);

    /* reporting manager (form me plain name save hota hai, ID/object ho to bhi handle) */
    useEffect(() => {
        setManagerName("");
        if (!employee) return;
        const mgr = employee.reportingManager ?? employee.manager;
        if (!mgr) return;

        if (typeof mgr === "object") {
            const n = labelOf(mgr, ["name", "fullName"]) || `${mgr.firstName || ""} ${mgr.lastName || ""}`.trim();
            if (n) return setManagerName(n);
        }
        const mid = refId(mgr);
        if (!isHexId(mid)) {
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
    }, [employee]);

    /* resolvers */
    const lookupName = useCallback((raw, list, keys) => {
        const direct = labelOf(raw, keys);
        if (direct) return direct;
        const rid = refId(raw);
        if (!rid) return "";
        const hit = list.find((x) => String(x._id || x.id) === rid);
        return hit ? labelOf(hit, keys) : "";
    }, []);

    const department = useMemo(
        () =>
            lookupName(employee?.department ?? employee?.departmentId, departments, ["name", "title", "departmentName"]) ||
            pick(employee, ["departmentOther"]),
        [employee, departments, lookupName]
    );

    const designation = useMemo(
        () =>
            lookupName(employee?.designation ?? employee?.designationId, designations, ["title", "name", "designationName"]) ||
            pick(employee, ["designationOther", "position", "jobTitle"]),
        [employee, designations, lookupName]
    );

    /* photo upload */
    const handleImageUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file || !employee) return;
        if (!file.type.startsWith("image/")) return setError("Valid image select karo (PNG, JPG, WEBP).");
        if (file.size > 3 * 1024 * 1024) return setError("Image 3MB se choti honi chahiye.");

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64 = reader.result;
            const prev = employee.avatar;
            setEmployee((p) => ({ ...p, avatar: base64 }));
            setSaving(true);
            setError("");
            try {
                await api.put(`/employees/${id}`, { avatar: base64 });
                setSuccess("Profile photo update ho gayi.");
                setTimeout(() => setSuccess(""), 3000);
            } catch (err) {
                console.error(err);
                setEmployee((p) => ({ ...p, avatar: prev }));
                setError("Photo save nahi ho payi.");
            } finally {
                setSaving(false);
                e.target.value = "";
            }
        };
        reader.readAsDataURL(file);
    };

    /* ------------------------------ states ------------------------------ */
    if (loading) {
        return (
            <div className="w-full min-h-[500px] flex flex-col items-center justify-center gap-3">
                <Loader2 size={34} className="animate-spin text-indigo-600" />
                <p className="text-xs font-bold tracking-wider uppercase text-slate-500">Loading profile...</p>
            </div>
        );
    }

    if (!employee) {
        return (
            <div className="max-w-xl mx-auto mt-16 bg-white p-10 text-center rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
                <AlertCircle className="mx-auto text-rose-500" size={30} />
                <p className="text-sm font-bold text-slate-800">{error || "Employee not found"}</p>
                <div className="flex justify-center gap-2">
                    <button
                        type="button"
                        onClick={fetchEmployee}
                        className="px-5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer"
                    >
                        Retry
                    </button>
                    <button
                        type="button"
                        onClick={() => router.push("/employees")}
                        className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer"
                    >
                        Back to Employees
                    </button>
                </div>
            </div>
        );
    }

    /* ------------------------------ data (add form ke fields) ------------------------------ */
    const fullName = employee.name || `${employee.firstName || ""} ${employee.lastName || ""}`.trim();
    const statusInfo = getStatusInfo(employee);
    const employmentType = pick(employee, ["employmentType"]);
    const joiningRaw = employee.dateOfJoining || employee.joiningDate;
    const salary = formatSalary(employee.salary);

    const phoneRaw = pick(employee, ["phone", "mobile"]);
    const phone = phoneRaw ? (phoneRaw.startsWith("+") ? phoneRaw : `+91 ${phoneRaw}`) : "";

    const street = pick(employee, ["address"]);
    const city = pick(employee, ["city"]);
    const state = pick(employee, ["state"]);
    const pincode = pick(employee, ["pincode"]);
    const fullAddress = [street, city, state, pincode].filter(Boolean).join(", ");

    const avatar =
        employee.avatar ||
        employee.profilePhotoData ||
        employee.documents?.passportPhotoData ||
        employee.photo ||
        "";

    const idTypeRaw = pick(employee, ["nationalIdType", "documents.nationalIdType"]);
    const idType = idTypeRaw === "Other Official ID" ? pick(employee, ["nationalIdOther", "documents.nationalIdOther"], idTypeRaw) : idTypeRaw;

    const docs = {
        idType,
        idNumber: pick(employee, ["nationalId", "idProofNumber"]),
        front: pick(employee, ["documents.nationalIdFrontFileData", "nationalIdFrontFileData"]),
        frontName: pick(employee, ["documents.nationalIdFrontFileName", "nationalIdFrontFileName"]),
        back: pick(employee, ["documents.nationalIdBackFileData", "nationalIdBackFileData"]),
        backName: pick(employee, ["documents.nationalIdBackFileName", "nationalIdBackFileName"]),
        photo: pick(employee, ["documents.passportPhotoData", "passportPhotoData", "profilePhotoData", "avatar"]),
        photoName: pick(employee, ["documents.passportPhotoFileName", "passportPhotoFileName", "profilePhotoFileName"]),
    };

    const bank = {
        accountName: pick(employee, ["bankDetails.accountName", "accountName"]),
        bankName: pick(employee, ["bankDetails.bankName", "bankName"]),
        branchName: pick(employee, ["bankDetails.branchName", "branchName"]),
        accountNumber: pick(employee, ["bankDetails.accountNumber", "accountNumber"]),
        ifscCode: pick(employee, ["bankDetails.ifscCode", "ifscCode"]),
    };

    // profile completeness
    const checks = [
        fullName, employee.email, phoneRaw, employee.gender, fullAddress,
        designation, department, employmentType, joiningRaw, salary, managerName,
        docs.idNumber, docs.front, docs.back, avatar,
        bank.bankName, bank.accountNumber, bank.ifscCode,
    ];
    const completion = Math.round((checks.filter(Boolean).length / checks.length) * 100);
    const tenure = getTenure(joiningRaw);

    return (
        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-5 font-sans antialiased text-slate-900">
            {/* top bar */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => router.push("/employees")}
                        className="p-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 transition active:scale-95 cursor-pointer"
                        title="Back"
                    >
                        <ArrowLeft size={17} />
                    </button>
                    <h1 className="text-lg sm:text-xl font-semibold text-slate-800">Employee Profile</h1>
                </div>

                <div className="flex items-center gap-2.5">
                    <button
                        type="button"
                        onClick={fetchEmployee}
                        className="p-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-500 hover:text-indigo-600 border border-slate-200 transition active:scale-95 cursor-pointer"
                        title="Refresh"
                    >
                        <RefreshCw size={15} />
                    </button>
                    <button
                        type="button"
                        onClick={() => setDocsOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-sm font-medium transition cursor-pointer"
                    >
                        <FileText size={15} className="text-indigo-600" /> View Documents
                    </button>
                    <button
                        type="button"
                        onClick={() => router.push(`/employees/add?id=${id}`)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-sm font-semibold shadow-sm transition cursor-pointer"
                    >
                        <Edit3 size={15} /> Edit
                    </button>
                </div>
            </div>

            {success && (
                <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-4 py-3 rounded-2xl">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    <span className="font-semibold">{success}</span>
                </div>
            )}
            {error && (
                <div className="flex items-center gap-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-sm px-4 py-3 rounded-2xl">
                    <AlertCircle size={16} className="text-rose-600 shrink-0" />
                    <span className="font-semibold">{error}</span>
                </div>
            )}

            {/* header card */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 sm:p-6">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                    <div className="relative shrink-0">
                        {avatar ? (
                            <img
                                src={avatar}
                                alt={fullName}
                                onClick={() => setLightbox({ src: avatar, label: fullName })}
                                className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-4 border-indigo-50 cursor-pointer"
                            />
                        ) : (
                            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-indigo-600 text-white text-3xl font-bold flex items-center justify-center border-4 border-indigo-50">
                                {getInitials(fullName)}
                            </div>
                        )}
                        <button
                            type="button"
                            onClick={() => fileRef.current?.click()}
                            disabled={saving}
                            className="absolute bottom-0 right-0 p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full border-2 border-white shadow transition active:scale-95 disabled:opacity-60 cursor-pointer"
                            title="Change photo"
                        >
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                        </button>
                        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </div>

                    <div className="text-center sm:text-left min-w-0 flex-1">
                        <h2 className="text-xl font-bold text-slate-900 truncate">{fullName || NA}</h2>
                        <p className="text-sm font-medium text-slate-500 mt-0.5">
                            {designation || NA}
                            {department ? ` · ${department}` : ""}
                        </p>

                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">
                            {employee.employeeId && (
                                <span className="font-mono text-[11px] font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full border border-slate-200">
                                    ID: {employee.employeeId}
                                </span>
                            )}
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusInfo.badge}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                                {statusInfo.label}
                            </span>
                            {employmentType && (
                                <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold border bg-indigo-50 text-indigo-700 border-indigo-200">
                                    {employmentType}
                                </span>
                            )}
                            {tenure && (
                                <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold border bg-slate-50 text-slate-600 border-slate-200">
                                    Tenure: {tenure}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* completeness */}
                    <div className="w-full sm:w-52 shrink-0 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5">
                        <div className="flex items-center justify-between">
                            <p className="text-[11px] font-semibold text-slate-500">Profile Completion</p>
                            <p className={`text-xs font-extrabold ${completion === 100 ? "text-emerald-600" : "text-indigo-600"}`}>{completion}%</p>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-200 mt-2 overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${completion === 100 ? "bg-emerald-500" : "bg-indigo-600"}`}
                                style={{ width: `${completion}%` }}
                            />
                        </div>
                        {completion < 100 && (
                            <button
                                type="button"
                                onClick={() => router.push(`/employees/add?id=${id}`)}
                                className="mt-2 text-[11px] font-semibold text-indigo-600 hover:underline cursor-pointer"
                            >
                                Complete profile
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* personal */}
            <Section title="Personal Information" subtitle="Basic identity and contact details">
                <InfoItem icon={User} label="Full Name" value={fullName} tint="indigo" />
                <InfoItem icon={Mail} label="Email Address" value={pick(employee, ["email"])} tint="sky" />
                <InfoItem icon={Phone} label="Phone Number" value={phone} tint="emerald" mono />
                <InfoItem icon={User} label="Gender" value={titleCase(pick(employee, ["gender"]))} tint="violet" />
                {/* <InfoItem icon={Globe2} label="Time Zone" value={pick(employee, ["timeZone"])} tint="amber" /> */}
                <InfoItem icon={Hash} label="Employee ID" value={pick(employee, ["employeeId"])} tint="rose" mono />
                <InfoItem icon={MapPin} label="Address" value={fullAddress} tint="rose" wide />
            </Section>

            {/* job */}
            <Section title="Job Details" subtitle="Role, department and compensation">
                <InfoItem icon={Briefcase} label="Designation" value={designation} tint="sky" />
                <InfoItem icon={Building2} label="Department" value={department} tint="indigo" />
                <InfoItem icon={Clock} label="Employment Type" value={employmentType} tint="emerald" />
                <InfoItem icon={BadgeCheck} label="Employee Status" value={statusInfo.label} tint="amber" />
                <InfoItem icon={UserCheck} label="Reporting Manager" value={managerName} tint="violet" />
                <InfoItem icon={Calendar} label="Joining Date" value={joiningRaw ? formatDate(joiningRaw) : ""} tint="rose" />
                <InfoItem icon={IndianRupee} label="Monthly Salary" value={salary} tint="emerald" mono />
            </Section>

            {/* banking */}
            <Section title="Banking Information" subtitle="Salary receiving account (full details View Documents me)">
                <InfoItem icon={User} label="Account Name" value={bank.accountName} tint="violet" />
                <InfoItem icon={Landmark} label="Bank Name" value={bank.bankName} tint="sky" />
                <InfoItem icon={Network} label="Branch" value={bank.branchName} tint="emerald" />
                <InfoItem icon={CreditCard} label="Account Number" value={maskAccount(bank.accountNumber)} tint="indigo" mono />
                <InfoItem icon={Hash} label="IFSC Code" value={bank.ifscCode} tint="amber" mono />
            </Section>

            {docsOpen && (
                <DocumentsModal docs={docs} bank={bank} onClose={() => setDocsOpen(false)} onOpenImage={setLightbox} />
            )}
            {lightbox && <Lightbox item={lightbox} onClose={() => setLightbox(null)} />}
        </div>
    );
}

export default function EmployeeProfilePage() {
    return (
        <Suspense
            fallback={
                <div className="w-full min-h-[500px] flex flex-col items-center justify-center gap-3">
                    <Loader2 size={34} className="animate-spin text-indigo-600" />
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Loading profile...</p>
                </div>
            }
        >
            <EmployeeProfileContent />
        </Suspense>
    );
}