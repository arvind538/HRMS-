"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    Building2,
    Mail,
    Phone,
    Globe,
    MapPin,
    Calendar,
    FileText,
    Users,
    Pencil,
    Save,
    X,
    Loader2,
    CheckCircle2,
    AlertCircle,
    ExternalLink,
    ShieldCheck,
    Building,
    Hash,
    Share2,
    Sparkles,
    Briefcase,
    ChevronLeft,
    ChevronRight,
    Check,
} from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

/* ------------------------------ icons ------------------------------ */

const svgProps = (size, className) => ({
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className,
});

function LinkedinIcon({ size = 15, className = "" }) {
    return (
        <svg {...svgProps(size, className)}>
            <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
            <rect width="4" height="12" x="2" y="9" />
            <circle cx="4" cy="4" r="2" />
        </svg>
    );
}
function InstagramIcon({ size = 15, className = "" }) {
    return (
        <svg {...svgProps(size, className)}>
            <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
            <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
        </svg>
    );
}
function TwitterIcon({ size = 15, className = "" }) {
    return (
        <svg {...svgProps(size, className)}>
            <path d="M4 4l11.733 16h4.267l-11.733-16z" />
            <path d="M4 20l6.768-6.768m2.464-2.464L20 4" />
        </svg>
    );
}

/* ------------------------------ wizard setup ------------------------------ */

const STEPS = [
    { key: "basic", label: "Basic Info", hint: "Name, logo and a short summary", icon: Building2 },
    { key: "contact", label: "Contact", hint: "How people reach the company", icon: Phone },
    { key: "legal", label: "Statutory", hint: "Registration and tax numbers", icon: Hash },
    { key: "address", label: "Address", hint: "Registered headquarters", icon: MapPin },
    { key: "social", label: "Social", hint: "Public profile links", icon: Share2 },
    { key: "review", label: "Review", hint: "Check everything and publish", icon: CheckCircle2 },
];

const RE = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
    phone: /^\+?[\d\s\-()]{7,20}$/,
    website: /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/\S*)?$/i,
    url: /^https?:\/\/\S+$/i,
    gst: /^\d{2}[A-Z0-9]{10}[1-9A-Z]Z[0-9A-Z]$/,
    pan: /^[A-Z]{5}\d{4}[A-Z]$/,
    reg: /^[A-Z0-9\-/]{5,25}$/,
};

const safeUrl = (u) => (RE.url.test(String(u || "").trim()) ? String(u).trim() : "");

/* Keeps only letters and digits (removes spaces, dashes and hidden characters from a paste) and makes them capital */
const alnum = (v) => String(v ?? "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();

/* Returns { fieldPath: "message" } for one step. An empty optional field is always fine. */
function validateStep(key, f) {
    const e = {};
    const has = (v) => String(v ?? "").trim() !== "";
    const year = new Date().getFullYear();

    if (key === "basic") {
        const name = String(f.name || "").trim();
        if (name.length < 2) e.name = "Company name is required (at least 2 characters).";
        else if (name.length > 100) e.name = "Company name is too long.";
        if (has(f.logo) && !RE.url.test(String(f.logo).trim())) e.logo = "Logo link must start with http:// or https://";
        if (has(f.foundedYear)) {
            const y = Number(f.foundedYear);
            if (!/^\d{4}$/.test(String(f.foundedYear).trim()) || y < 1800 || y > year) e.foundedYear = `Enter a 4-digit year between 1800 and ${year}.`;
        }
    }
    if (key === "contact") {
        if (has(f.email) && !RE.email.test(String(f.email).trim())) e.email = "Enter a valid email address.";
        if (has(f.phone) && !RE.phone.test(String(f.phone).trim())) e.phone = "Enter a valid phone number.";
        if (has(f.website) && !RE.website.test(String(f.website).trim())) e.website = "Enter a valid website, like www.company.com";
    }
    if (key === "legal") {
        if (has(f.registrationNumber) && !RE.reg.test(String(f.registrationNumber).trim().toUpperCase())) e.registrationNumber = "Use 5 to 25 letters or digits.";
        if (has(f.gstNumber)) {
            const g = alnum(f.gstNumber);
            if (g.length !== 15) e.gstNumber = `GSTIN must be exactly 15 characters (you entered ${g.length}).`;
            else if (!RE.gst.test(g)) e.gstNumber = "This GSTIN format is not valid. Example: 08AAGCF5681H1ZC";
        }
        if (has(f.panNumber) && !RE.pan.test(alnum(f.panNumber))) e.panNumber = "PAN must look like ABCDE1234F.";
    }
    if (key === "address") {
        const a = f.address || {};
        const india = !has(a.country) || /^india$/i.test(String(a.country).trim());
        if (has(a.pincode)) {
            const p = String(a.pincode).trim();
            if (india ? !/^\d{6}$/.test(p) : !/^[A-Za-z0-9 -]{3,10}$/.test(p)) e["address.pincode"] = india ? "PIN code must be 6 digits." : "Enter a valid postal code.";
        }
    }
    if (key === "social") {
        const s = f.socialLinks || {};
        ["linkedin", "twitter", "instagram"].forEach((k) => {
            if (has(s[k]) && !RE.url.test(String(s[k]).trim())) e[`socialLinks.${k}`] = "Link must start with http:// or https://";
        });
    }
    return e;
}

const getPath = (obj, path) => path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);

/* ------------------------------ page ------------------------------ */

export default function CompanyPage() {
    const [company, setCompany] = useState(null);
    const [form, setForm] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [error, setError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");
    const [step, setStep] = useState(0);
    const [maxStep, setMaxStep] = useState(0);
    const [errors, setErrors] = useState({});
    const wizardRef = useRef(null);

    /* Admin edits. HR sees everything. Manager and employee see only the basic profile. */
    const { user } = useAuth();
    const role = String(user?.role || "").toLowerCase();
    const isAdmin = role === "admin";
    const canSeeStatutory = role === "admin" || role === "hr";

    const fetchCompany = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const res = await api.get("/company");
            const payload = res.data?.data || res.data;
            setCompany(payload);
            setForm(payload);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to load corporate profile from server.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCompany();
    }, [fetchCompany]);

    const handleChange = (path, value) => {
        setForm((prev) => {
            const updated = structuredClone(prev || {});
            const keys = path.split(".");
            let cur = updated;
            for (let i = 0; i < keys.length - 1; i++) {
                if (!cur[keys[i]] || typeof cur[keys[i]] !== "object") cur[keys[i]] = {};
                cur = cur[keys[i]];
            }
            cur[keys[keys.length - 1]] = value;
            return updated;
        });
        setErrors((prev) => (prev[path] ? { ...prev, [path]: undefined } : prev));
    };

    const scrollToWizard = () => {
        requestAnimationFrame(() => wizardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    };

    const startEdit = () => {
        if (!isAdmin) return;
        setForm(structuredClone(company || {}));
        setErrors({});
        setStep(0);
        setMaxStep(0);
        setError("");
        setEditMode(true);
        scrollToWizard();
    };

    const handleCancel = () => {
        if (saving) return;
        setForm(company);
        setEditMode(false);
        setErrors({});
        setError("");
    };

    const goTo = (target) => {
        if (target === step) return;
        // going forward is allowed only to a step that was already reached
        if (target > step) {
            const e = validateStep(STEPS[step].key, form);
            if (Object.keys(e).length) {
                setErrors(e);
                return;
            }
        }
        setErrors({});
        setStep(target);
        setMaxStep((m) => Math.max(m, target));
        scrollToWizard();
    };

    const handleNext = () => {
        const e = validateStep(STEPS[step].key, form);
        if (Object.keys(e).length) {
            setErrors(e);
            return;
        }
        setErrors({});
        const nextStep = Math.min(step + 1, STEPS.length - 1);
        setStep(nextStep);
        setMaxStep((m) => Math.max(m, nextStep));
        scrollToWizard();
    };

    const handleBack = () => {
        setErrors({});
        setStep((s) => Math.max(0, s - 1));
        scrollToWizard();
    };

    const handleSave = async () => {
        if (!isAdmin) return;
        // check every step again before publishing
        for (let i = 0; i < STEPS.length - 1; i++) {
            const e = validateStep(STEPS[i].key, form);
            if (Object.keys(e).length) {
                setErrors(e);
                setStep(i);
                scrollToWizard();
                return;
            }
        }

        setSaving(true);
        setError("");
        setSuccessMsg("");
        try {
            const clean = (v) => (typeof v === "string" ? v.trim() : v);
            const payload = {
                ...form,
                name: clean(form.name),
                gstNumber: alnum(form.gstNumber),
                panNumber: alnum(form.panNumber),
                registrationNumber: String(form.registrationNumber || "").trim().toUpperCase(),
            };
            const res = await api.put("/company", payload);
            const updated = res.data?.data || payload;
            setCompany(updated);
            setForm(updated);
            setEditMode(false);
            setSuccessMsg("Corporate profile published successfully.");
            window.scrollTo({ top: 0, behavior: "smooth" });
            setTimeout(() => setSuccessMsg(""), 3500);
        } catch (err) {
            const msg = err.response?.data?.message || "Failed to save corporate profile changes.";
            // a message from the server about one field is shown on that field's step
            if (/gst/i.test(msg)) {
                setErrors({ gstNumber: msg });
                setStep(2);
                scrollToWizard();
            } else if (/\bpan\b/i.test(msg)) {
                setErrors({ panNumber: msg });
                setStep(2);
                scrollToWizard();
            }
            setError(msg);
        } finally {
            setSaving(false);
        }
    };

    const onSubmit = (e) => {
        e.preventDefault();
        if (step < STEPS.length - 1) handleNext();
        else handleSave();
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] gap-3 text-slate-400 font-sans">
                <Loader2 className="animate-spin text-indigo-600" size={36} />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Loading Corporate Credentials...</span>
            </div>
        );
    }

    const view = company || {};
    const logoSrc = safeUrl(view.logo);

    return (
        <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 font-sans antialiased text-slate-900 pb-16">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-7 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-indigo-200">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Corporate Identity</h1>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/75">
                            <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
                            Verified Entity
                        </span>
                    </div>
                    <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1 max-w-xl">
                        {editMode ? "Fill the details step by step. Your changes are saved only when you publish on the last step." : (isAdmin ? "Manage your brand details, registered tax numbers and official contact channels." : "You can view the company profile. Only an admin can make changes.")}
                    </p>
                </div>

                {!editMode && isAdmin && (
                    <button
                        type="button"
                        onClick={startEdit}
                        className="w-full sm:w-auto shrink-0 inline-flex items-center justify-center gap-2 px-6 py-3 text-xs sm:text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-600/25 active:scale-95 rounded-xl sm:rounded-2xl transition-all duration-200 shadow-md shadow-indigo-600/20 cursor-pointer"
                    >
                        <Pencil size={15} />
                        <span>Edit Profile</span>
                    </button>
                )}
            </div>

            {/* Messages */}
            {successMsg && (
                <div className="flex items-center gap-2.5 p-3.5 sm:p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs sm:text-sm font-semibold animate-in fade-in duration-200">
                    <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                    <span>{successMsg}</span>
                </div>
            )}
            {error && (
                <div className="flex items-start gap-2.5 p-3.5 sm:p-4 bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl text-xs sm:text-sm font-semibold animate-in fade-in duration-200">
                    <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
                    <span className="min-w-0 break-words">{error}</span>
                    {!company && (
                        <button type="button" onClick={fetchCompany} className="ml-auto shrink-0 px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer">
                            Retry
                        </button>
                    )}
                </div>
            )}

            {/* ============================== WIZARD ============================== */}
            {editMode && isAdmin ? (
                <div ref={wizardRef} className="scroll-mt-4 bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl shadow-sm overflow-hidden">
                    {/* Stepper */}
                    <div className="px-4 sm:px-8 pt-5 sm:pt-7 pb-4 sm:pb-5 border-b border-slate-100 bg-slate-50/60">
                        <ol className="flex items-center">
                            {STEPS.map((s, i) => {
                                const done = i < step || (i <= maxStep && i !== step && i < step);
                                const active = i === step;
                                const reachable = i <= maxStep;
                                const Icon = s.icon;
                                return (
                                    <React.Fragment key={s.key}>
                                        <li className="flex flex-col items-center gap-1.5 shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => reachable && goTo(i)}
                                                disabled={!reachable}
                                                aria-current={active ? "step" : undefined}
                                                aria-label={s.label}
                                                className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${active
                                                    ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/30 scale-110"
                                                    : done
                                                        ? "bg-emerald-500 border-emerald-500 text-white hover:scale-105 cursor-pointer"
                                                        : reachable
                                                            ? "bg-white border-indigo-300 text-indigo-600 hover:scale-105 cursor-pointer"
                                                            : "bg-white border-slate-200 text-slate-300 cursor-not-allowed"
                                                    }`}
                                            >
                                                {done ? <Check size={16} strokeWidth={3} /> : <Icon size={16} />}
                                            </button>
                                            <span className={`hidden md:block text-[11px] font-bold tracking-wide ${active ? "text-indigo-700" : done ? "text-emerald-700" : "text-slate-400"}`}>{s.label}</span>
                                        </li>
                                        {i < STEPS.length - 1 && (
                                            <div className="flex-1 h-1 mx-1.5 sm:mx-2 rounded-full bg-slate-200 overflow-hidden self-start mt-4 sm:mt-5">
                                                <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: i < step ? "100%" : "0%" }} />
                                            </div>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </ol>
                        <div className="mt-4 flex items-end justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-widest text-indigo-600">
                                    Step {step + 1} of {STEPS.length}
                                </p>
                                <h2 className="text-base sm:text-xl font-bold text-slate-900 truncate">{STEPS[step].label}</h2>
                                <p className="text-xs text-slate-500 truncate">{STEPS[step].hint}</p>
                            </div>
                            <button type="button" onClick={handleCancel} disabled={saving} className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer disabled:opacity-50">
                                <X size={14} /> Discard
                            </button>
                        </div>
                    </div>

                    {/* Step body */}
                    <form onSubmit={onSubmit} noValidate>
                        <div key={step} className="px-4 sm:px-8 py-5 sm:py-7 animate-in fade-in slide-in-from-right-4 duration-300">
                            {step === 0 && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="sm:col-span-2">
                                        <Field icon={<Building2 size={15} />} label="Company Name" required value={form?.name} onChange={(v) => handleChange("name", v)} error={errors.name} placeholder="e.g. Acme Technologies Pvt Ltd" autoFocus />
                                    </div>
                                    <Field icon={<Briefcase size={15} />} label="Industry / Sector" value={form?.industry} onChange={(v) => handleChange("industry", v)} placeholder="e.g. IT Services" />
                                    <Field icon={<Calendar size={15} />} label="Incorporated Year" value={form?.foundedYear} onChange={(v) => handleChange("foundedYear", v)} error={errors.foundedYear} placeholder="e.g. 2018" inputMode="numeric" maxLength={4} />
                                    <div className="sm:col-span-2">
                                        <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                                            <div className="w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-2xl bg-slate-50 border border-slate-200 p-2 flex items-center justify-center overflow-hidden shrink-0">
                                                {safeUrl(form?.logo) ? <img src={safeUrl(form.logo)} alt="Logo preview" className="h-full w-full object-contain" /> : <Building2 size={26} className="text-slate-300" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <Field label="Logo Link" value={form?.logo} onChange={(v) => handleChange("logo", v)} error={errors.logo} placeholder="https://example.com/logo.png" type="url" hint="Paste a direct link to the logo image. A preview shows on the left." />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="block">
                                            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">About the company</span>
                                            <textarea
                                                rows={4}
                                                maxLength={600}
                                                value={form?.description || ""}
                                                onChange={(e) => handleChange("description", e.target.value)}
                                                placeholder="A short summary, mission or background of the company"
                                                className="mt-1.5 w-full text-base sm:text-sm font-medium text-slate-800 leading-relaxed border border-slate-200 rounded-xl p-3.5 bg-slate-50/70 hover:border-slate-300 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-600 transition-all resize-none"
                                            />
                                            <span className="block text-right text-[10px] text-slate-400 mt-1">{(form?.description || "").length}/600</span>
                                        </label>
                                    </div>
                                </div>
                            )}

                            {step === 1 && (
                                <div className="grid grid-cols-1 sm:grid-cols-1 gap-4">
                                    <Field icon={<Mail size={15} />} label="Work Email" value={form?.email} onChange={(v) => handleChange("email", v)} error={errors.email} placeholder="hr@company.com" type="email" autoFocus />
                                    <Field icon={<Phone size={15} />} label="Phone" value={form?.phone} onChange={(v) => handleChange("phone", v)} error={errors.phone} placeholder="+91 98765 43210" type="tel" />
                                    <div className="sm:col-span-2">
                                        <Field icon={<Globe size={15} />} label="Website" value={form?.website} onChange={(v) => handleChange("website", v)} error={errors.website} placeholder="www.company.com" />
                                    </div>
                                </div>
                            )}

                            {step === 2 && (
                                <div className="grid grid-cols-1 sm:grid-cols-1 gap-4">
                                    <div className="sm:col-span-2">
                                        <Field icon={<FileText size={15} />} label="Registration / CIN" value={form?.registrationNumber} onChange={(v) => handleChange("registrationNumber", v.toUpperCase())} error={errors.registrationNumber} placeholder="U72900RJ2018PTC012345" mono autoFocus />
                                    </div>
                                    <Field icon={<FileText size={15} />} label="GSTIN" value={form?.gstNumber} onChange={(v) => handleChange("gstNumber", alnum(v).slice(0, 15))} error={errors.gstNumber} placeholder="08AAGCF5681H1ZC" mono hint={`${alnum(form?.gstNumber).length}/15 characters`} />
                                    <Field icon={<FileText size={15} />} label="PAN" value={form?.panNumber} onChange={(v) => handleChange("panNumber", alnum(v).slice(0, 10))} error={errors.panNumber} placeholder="AABCA1234F" mono hint={`${alnum(form?.panNumber).length}/10 characters`} />
                                    <p className="sm:col-span-2 text-[11px] text-slate-500 bg-indigo-50/60 border border-indigo-100 rounded-xl px-3.5 py-2.5">These numbers are optional, but payslips, TDS and PF filing need them. Letters are saved in capitals.</p>
                                </div>
                            )}

                            {step === 3 && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="sm:col-span-2">
                                        <Field icon={<MapPin size={15} />} label="Street Address" value={form?.address?.line1} onChange={(v) => handleChange("address.line1", v)} placeholder="Plot no., street, area" autoFocus />
                                    </div>
                                    <Field label="City" value={form?.address?.city} onChange={(v) => handleChange("address.city", v)} placeholder="Jaipur" />
                                    <Field label="State / Province" value={form?.address?.state} onChange={(v) => handleChange("address.state", v)} placeholder="Rajasthan" />
                                    <Field label="Country" value={form?.address?.country} onChange={(v) => handleChange("address.country", v)} placeholder="India" />
                                    <Field label="PIN / Postal Code" value={form?.address?.pincode} onChange={(v) => handleChange("address.pincode", v)} error={errors["address.pincode"]} placeholder="302001" mono inputMode="numeric" maxLength={10} />
                                </div>
                            )}

                            {step === 4 && (
                                <div className="grid grid-cols-1 gap-4">
                                    <Field icon={<LinkedinIcon size={15} />} label="LinkedIn" value={form?.socialLinks?.linkedin} onChange={(v) => handleChange("socialLinks.linkedin", v)} error={errors["socialLinks.linkedin"]} placeholder="https://linkedin.com/company/..." type="url" autoFocus />
                                    <Field icon={<TwitterIcon size={15} />} label="Twitter / X" value={form?.socialLinks?.twitter} onChange={(v) => handleChange("socialLinks.twitter", v)} error={errors["socialLinks.twitter"]} placeholder="https://x.com/..." type="url" />
                                    <Field icon={<InstagramIcon size={15} />} label="Instagram" value={form?.socialLinks?.instagram} onChange={(v) => handleChange("socialLinks.instagram", v)} error={errors["socialLinks.instagram"]} placeholder="https://instagram.com/..." type="url" />
                                </div>
                            )}

                            {step === 5 && <ReviewStep form={form} onEdit={goTo} />}
                        </div>

                        {/* Footer buttons */}
                        <div className="flex items-center justify-between gap-3 px-4 sm:px-8 py-4 border-t border-slate-100 bg-slate-50/60 pb-[max(1rem,env(safe-area-inset-bottom))]">
                            <button
                                type="button"
                                onClick={handleBack}
                                disabled={step === 0 || saving}
                                className="inline-flex items-center justify-center gap-1.5 px-5 py-3 text-xs sm:text-sm font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 hover:border-slate-300 rounded-xl transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            >
                                <ChevronLeft size={16} /> Back
                            </button>

                            {step < STEPS.length - 1 ? (
                                <button type="submit" className="inline-flex items-center justify-center gap-1.5 px-7 py-3 text-xs sm:text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-600/25 rounded-xl transition active:scale-95 shadow-md shadow-indigo-600/20 cursor-pointer">
                                    Next <ChevronRight size={16} />
                                </button>
                            ) : (
                                <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 px-7 py-3 text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-600/25 rounded-xl transition active:scale-95 shadow-md shadow-emerald-600/20 disabled:opacity-60 cursor-pointer">
                                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                    {saving ? "Publishing..." : "Publish Profile"}
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            ) : (
                /* ============================== VIEW ============================== */
                <>
                    {/* Hero */}
                    <div className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-indigo-200 flex flex-col md:flex-row md:items-center justify-between gap-5 sm:gap-6">
                        <div className="flex items-center gap-4 sm:gap-5 min-w-0">
                            <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-200/80 p-2.5 sm:p-3 flex items-center justify-center overflow-hidden shrink-0 group">
                                {logoSrc ? <img src={logoSrc} alt="Company Logo" className="h-full w-full object-contain group-hover:scale-105 transition-transform duration-300" /> : <Building2 size={32} className="text-slate-400" />}
                            </div>
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                    <h2 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight break-words">{view.name || "Untitled Enterprise"}</h2>
                                    {view.status && <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-extrabold uppercase tracking-widest bg-indigo-50 text-indigo-700 border border-indigo-200/70">{view.status}</span>}
                                </div>
                                <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1 flex items-center gap-1.5">
                                    <Briefcase size={14} className="text-indigo-500 shrink-0" />
                                    <span className="truncate">{view.industry || "Sector not specified"}</span>
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3.5 sm:gap-4 px-4 sm:px-6 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl bg-slate-50/80 border border-slate-200/80 w-full md:w-auto transition-all duration-300 hover:border-indigo-200 hover:bg-white shrink-0">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
                                <Users size={20} />
                            </div>
                            <div>
                                <div className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono tracking-tight leading-none">{view.totalEmployees ? Number(view.totalEmployees).toLocaleString("en-IN") : 0}</div>
                                <div className="text-[10px] sm:text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mt-1">Active Employees</div>
                            </div>
                        </div>
                    </div>

                    <div className={`grid grid-cols-1 gap-4 sm:gap-6 ${canSeeStatutory ? "lg:grid-cols-2" : ""}`}>
                        <Section icon={<Building size={16} />} tone="indigo" title="Contact & Business">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                <ReadField icon={<Mail size={15} />} label="Work Email" value={view.email} href={view.email ? `mailto:${view.email}` : ""} />
                                <ReadField icon={<Phone size={15} />} label="Phone" value={view.phone} href={view.phone ? `tel:${view.phone}` : ""} />
                                <ReadField icon={<Globe size={15} />} label="Website" value={view.website} href={view.website ? (/^https?:\/\//i.test(view.website) ? view.website : `https://${view.website}`) : ""} external />
                                <ReadField icon={<Building2 size={15} />} label="Sector" value={view.industry} />
                                <ReadField icon={<Calendar size={15} />} label="Incorporated Year" value={view.foundedYear} />
                            </div>
                        </Section>

                        <Section hidden={!canSeeStatutory} icon={<Hash size={16} />} tone="violet" title="Statutory & Tax">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                <ReadField icon={<FileText size={15} />} label="Registration / CIN" value={view.registrationNumber} mono />
                                <ReadField icon={<FileText size={15} />} label="GSTIN" value={view.gstNumber} mono />
                                <ReadField icon={<FileText size={15} />} label="PAN" value={view.panNumber} mono />
                            </div>
                        </Section>
                    </div>

                    <Section icon={<MapPin size={16} />} tone="blue" title="Registered Headquarters">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                            <div className="sm:col-span-2">
                                <ReadField label="Street Address" value={view.address?.line1} wrap />
                            </div>
                            <ReadField label="City" value={view.address?.city} />
                            <ReadField label="State / Province" value={view.address?.state} />
                            <ReadField label="Country" value={view.address?.country} />
                            <ReadField label="PIN / Postal Code" value={view.address?.pincode} mono />
                        </div>
                    </Section>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                        <div className="lg:col-span-2">
                            <Section icon={<Sparkles size={16} />} tone="emerald" title="About the Company">
                                <p className="text-xs sm:text-sm font-medium text-slate-600 leading-relaxed whitespace-pre-wrap break-words">{view.description || "No company summary has been added yet."}</p>
                            </Section>
                        </div>
                        <Section icon={<Share2 size={16} />} tone="sky" title="Public Networks">
                            <div className="space-y-3.5">
                                <ReadField icon={<LinkedinIcon size={15} />} label="LinkedIn" value={view.socialLinks?.linkedin} href={safeUrl(view.socialLinks?.linkedin)} external />
                                <ReadField icon={<TwitterIcon size={15} />} label="Twitter / X" value={view.socialLinks?.twitter} href={safeUrl(view.socialLinks?.twitter)} external />
                                <ReadField icon={<InstagramIcon size={15} />} label="Instagram" value={view.socialLinks?.instagram} href={safeUrl(view.socialLinks?.instagram)} external />
                            </div>
                        </Section>
                    </div>
                </>
            )}
        </div>
    );
}

/* ------------------------------ pieces ------------------------------ */

const TONES = {
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100/80",
    violet: "bg-violet-50 text-violet-600 border-violet-100/80",
    blue: "bg-blue-50 text-blue-600 border-blue-100/80",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100/80",
    sky: "bg-sky-50 text-sky-600 border-sky-100/80",
};

function Section({ icon, tone = "indigo", title, children, hidden = false }) {
    if (hidden) return null;
    return (
        <div className="h-full bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-indigo-200 space-y-4 sm:space-y-5">
            <div className="flex items-center gap-3 pb-3 sm:pb-4 border-b border-slate-100">
                <span className={`p-2 sm:p-2.5 rounded-xl sm:rounded-2xl border shrink-0 ${TONES[tone]}`}>{icon}</span>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">{title}</h3>
            </div>
            {children}
        </div>
    );
}

/* One read-only value */
function ReadField({ icon, label, value, href = "", external = false, mono = false, wrap = false }) {
    return (
        <div className="flex flex-col gap-1.5 p-3.5 sm:p-4 rounded-2xl bg-slate-50/70 border border-slate-200/60 hover:bg-white hover:border-indigo-200 hover:shadow-sm transition-all duration-200 group min-w-0">
            <span className="text-[10px] sm:text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 sm:gap-2 min-w-0">
                {icon && <span className="text-indigo-600 shrink-0 group-hover:scale-110 transition-transform">{icon}</span>}
                <span className="truncate">{label}</span>
            </span>
            <div className={`text-xs sm:text-sm font-semibold text-slate-900 min-w-0 ${wrap ? "break-words" : "truncate"}`}>
                {value ? (
                    href ? (
                        <a href={href} target={external ? "_blank" : "_self"} rel="noreferrer noopener" className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-bold transition-colors group/link max-w-full">
                            <span className="truncate">{value}</span>
                            {external && <ExternalLink size={13} className="shrink-0 text-indigo-400 group-hover/link:translate-x-0.5 transition-transform" />}
                        </a>
                    ) : mono ? (
                        <span className="font-mono font-bold text-slate-800 text-xs bg-white px-2.5 py-1 rounded-xl border border-slate-200/80 inline-block tracking-wide max-w-full truncate">{value}</span>
                    ) : (
                        <span className="font-bold text-slate-800">{value}</span>
                    )
                ) : (
                    <span className="text-slate-400 font-normal text-xs italic">Not added</span>
                )}
            </div>
        </div>
    );
}

/* One form input */
function Field({ icon, label, value, onChange, error, placeholder = "", required = false, mono = false, hint = "", type = "text", ...rest }) {
    return (
        <label className="block min-w-0">
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                {icon && <span className="text-indigo-600">{icon}</span>}
                {label}
                {required && <span className="text-rose-500">*</span>}
            </span>
            <input
                type={type}
                value={value ?? ""}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                aria-invalid={Boolean(error)}
                className={`mt-1.5 w-full px-3.5 py-3 text-base sm:text-sm font-semibold text-slate-900 bg-slate-50/70 border rounded-xl outline-none transition-all placeholder:text-slate-300 placeholder:font-normal hover:border-slate-300 focus:bg-white focus:ring-4 ${mono ? "font-mono tracking-wide" : ""} ${error ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/10" : "border-slate-200 focus:border-indigo-600 focus:ring-indigo-600/10"
                    }`}
                {...rest}
            />
            {error ? (
                <span className="flex items-start gap-1 text-[11px] font-semibold text-rose-600 mt-1.5">
                    <AlertCircle size={12} className="shrink-0 mt-0.5" /> {error}
                </span>
            ) : (
                hint && <span className="block text-[11px] text-slate-400 mt-1.5">{hint}</span>
            )}
        </label>
    );
}

/* Last step: everything in one place, each block can be opened again */
function ReviewStep({ form, onEdit }) {
    const a = form?.address || {};
    const s = form?.socialLinks || {};
    const address = [a.line1, a.city, a.state, a.country, a.pincode].filter(Boolean).join(", ");

    const blocks = [
        { title: "Basic Info", step: 0, rows: [["Company name", form?.name], ["Industry", form?.industry], ["Incorporated year", form?.foundedYear], ["Logo link", form?.logo], ["About", form?.description]] },
        { title: "Contact", step: 1, rows: [["Email", form?.email], ["Phone", form?.phone], ["Website", form?.website]] },
        { title: "Statutory", step: 2, rows: [["Registration / CIN", form?.registrationNumber], ["GSTIN", form?.gstNumber], ["PAN", form?.panNumber]] },
        { title: "Address", step: 3, rows: [["Headquarters", address]] },
        { title: "Social", step: 4, rows: [["LinkedIn", s.linkedin], ["Twitter / X", s.twitter], ["Instagram", s.instagram]] },
    ];

    return (
        <div className="space-y-3.5">
            {blocks.map((b) => (
                <div key={b.title} className="rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-indigo-200 hover:shadow-sm transition-all duration-200">
                    <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-slate-100">
                        <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700">{b.title}</h4>
                        <button type="button" onClick={() => onEdit(b.step)} className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer">
                            <Pencil size={12} /> Edit
                        </button>
                    </div>
                    <dl className="px-4 py-3 space-y-2">
                        {b.rows.map(([k, v]) => (
                            <div key={k} className="flex flex-col sm:flex-row sm:items-start gap-0.5 sm:gap-4 text-xs">
                                <dt className="sm:w-40 shrink-0 font-semibold text-slate-400">{k}</dt>
                                <dd className={`min-w-0 break-words font-semibold ${v ? "text-slate-800" : "text-slate-300 italic font-normal"}`}>{v || "Not added"}</dd>
                            </div>
                        ))}
                    </dl>
                </div>
            ))}
            <p className="text-[11px] text-slate-500 flex items-start gap-1.5">
                <ShieldCheck size={13} className="text-emerald-600 shrink-0 mt-0.5" />
                Nothing is saved until you click <b>Publish Profile</b>.
            </p>
        </div>
    );
}