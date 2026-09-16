"use client";

import React, { useEffect, useState } from "react";
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
} from "lucide-react";
import api from "@/lib/api";

function LinkedinIcon({ size = 15, className = "" }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
            <rect width="4" height="12" x="2" y="9" />
            <circle cx="4" cy="4" r="2" />
        </svg>
    );
}

function InstagramIcon({ size = 15, className = "" }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
            <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
        </svg>
    );
}

function TwitterIcon({ size = 15, className = "" }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M4 4l11.733 16h4.267l-11.733-16z" />
            <path d="M4 20l6.768-6.768m2.464-2.464L20 4" />
        </svg>
    );
}

export default function CompanyPage() {
    const [company, setCompany] = useState(null);
    const [form, setForm] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [error, setError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    useEffect(() => {
        fetchCompany();
    }, []);

    const fetchCompany = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await api.get("/company");
            const json = res.data;
            const payload = json.data || json;
            setCompany(payload);
            setForm(payload);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to load corporate profile from server.");
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (path, value) => {
        setForm((prev) => {
            const updated = structuredClone(prev || {});
            const keys = path.split(".");
            let current = updated;

            for (let i = 0; i < keys.length - 1; i++) {
                const key = keys[i];
                if (!current[key] || typeof current[key] !== "object") {
                    current[key] = {};
                }
                current = current[key];
            }

            current[keys[keys.length - 1]] = value;
            return updated;
        });
    };

    const handleSave = async () => {
        setSaving(true);
        setError("");
        setSuccessMsg("");
        try {
            const res = await api.put("/company", form);
            const json = res.data;
            const updatedData = json.data || form;

            setCompany(updatedData);
            setForm(updatedData);
            setEditMode(false);
            setSuccessMsg("Corporate profile records published successfully to database.");
            setTimeout(() => setSuccessMsg(""), 3500);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to save corporate profile changes.");
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setForm(company);
        setEditMode(false);
        setError("");
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-slate-400 font-sans">
                <Loader2 className="animate-spin text-indigo-600" size={36} />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 animate-pulse">Loading corporate credentials...</span>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-2 sm:px-2 lg:px-2 py-4 space-y-4 font-sans antialiased text-slate-900">

            {/* Top Action Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm transition-all duration-300 hover:shadow-md">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                            Corporate Identity
                        </h1>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/75 shadow-2xs">
                            <ShieldCheck size={14} className="text-emerald-600" /> Verified Entity
                        </span>
                    </div>
                    <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-1 max-w-xl">
                        Manage your enterprise brand credentials, registered fiscal identifiers, and official communication channels.
                    </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    {!editMode ? (
                        <button
                            type="button"
                            onClick={() => setEditMode(true)}
                            className="inline-flex items-center gap-2 px-6 py-3 text-xs sm:text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-2xl transition-all duration-200 shadow-md shadow-indigo-600/20 hover:shadow-lg cursor-pointer"
                        >
                            <Pencil size={15} /> Edit Configuration
                        </button>
                    ) : (
                        <div className="flex items-center gap-2.5 w-full sm:w-auto">
                            <button
                                type="button"
                                onClick={handleCancel}
                                disabled={saving}
                                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4.5 py-3 text-xs sm:text-sm font-bold border border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100 active:scale-95 rounded-2xl disabled:opacity-50 transition-all cursor-pointer shadow-2xs"
                            >
                                <X size={16} /> Discard
                            </button>
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={saving}
                                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-3 text-xs sm:text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-2xl disabled:opacity-50 transition-all duration-200 shadow-md shadow-indigo-600/20 cursor-pointer"
                            >
                                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                {saving ? "Saving Changes..." : "Publish Profile"}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Notification Toasts */}
            {successMsg && (
                <div className="flex items-center gap-3 p-4 bg-emerald-50/90 border border-emerald-200 text-emerald-900 rounded-2xl text-xs sm:text-sm font-semibold shadow-2xs animate-in fade-in duration-200">
                    <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                    <span>{successMsg}</span>
                </div>
            )}
            {error && (
                <div className="flex items-center gap-3 p-4 bg-rose-50/90 border border-rose-200 text-rose-900 rounded-2xl text-xs sm:text-sm font-semibold shadow-2xs animate-in fade-in duration-200">
                    <AlertCircle size={18} className="text-rose-600 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Brand Identity Hero Card */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm transition-all duration-300 hover:shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
                <div className="flex items-start sm:items-center gap-5">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-slate-50 border border-slate-200/80 p-3 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs group">
                        {form?.logo ? (
                            <img src={form.logo} alt="Company Logo" className="h-full w-full object-contain group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                            <Building2 size={36} className="text-slate-400" />
                        )}
                    </div>

                    <div className="space-y-2 flex-1">
                        {editMode ? (
                            <div className="space-y-3 max-w-md">
                                <input
                                    type="text"
                                    className="w-full text-base sm:text-lg font-extrabold text-slate-900 px-4 py-2.5 bg-slate-50/70 border border-slate-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-600 transition-all shadow-2xs"
                                    value={form?.name || ""}
                                    onChange={(e) => handleChange("name", e.target.value)}
                                    placeholder="Enter Enterprise Name"
                                />
                                <input
                                    type="url"
                                    className="w-full text-xs font-semibold text-slate-700 px-3.5 py-2 bg-slate-50/70 border border-slate-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-600 transition-all shadow-2xs"
                                    value={form?.logo || ""}
                                    onChange={(e) => handleChange("logo", e.target.value)}
                                    placeholder="Logo Image URL (https://...)"
                                />
                            </div>
                        ) : (
                            <div>
                                <div className="flex flex-wrap items-center gap-3">
                                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                                        {company?.name || "Untitled Enterprise"}
                                    </h2>
                                    {company?.status && (
                                        <span className="px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-widest bg-indigo-50 text-indigo-700 border border-indigo-200/70 shadow-2xs">
                                            {company.status}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-1.5 flex items-center gap-2">
                                    <Briefcase size={14} className="text-indigo-500" />
                                    <span>{company?.industry || "Sector Not Specified"}</span>
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Stat Pill */}
                <div className="flex items-center gap-4 px-6 py-5 rounded-2xl bg-slate-50/80 border border-slate-200/80 shadow-2xs w-fit transition-all duration-300 hover:border-indigo-200 hover:bg-white">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0 shadow-2xs">
                        <Users size={22} />
                    </div>
                    <div>
                        <div className="text-2xl font-extrabold text-slate-900 font-mono tracking-tight leading-none">
                            {company?.totalEmployees ? Number(company.totalEmployees).toLocaleString() : 0}
                        </div>
                        <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mt-1">
                            Active Roster Count
                        </div>
                    </div>
                </div>
            </div>

            {/* Form Fields Organized in Professional Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Section 1: Operational Channels */}
                <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm transition-all duration-300 hover:shadow-md space-y-5">
                    <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                        <span className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100/80 shadow-2xs">
                            <Building size={18} />
                        </span>
                        <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                            Operational Channels
                        </h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <InfoField icon={<Mail size={15} />} label="Work Email" editMode={editMode} value={form?.email} onChange={(v) => handleChange("email", v)} placeholder="e.g., hr@enterprise.com" isLink={Boolean(form?.email)} linkHref={`mailto:${form?.email}`} />
                        <InfoField icon={<Phone size={15} />} label="Direct Contact" editMode={editMode} value={form?.phone} onChange={(v) => handleChange("phone", v)} placeholder="e.g., +1 555-0199" isLink={Boolean(form?.phone)} linkHref={`tel:${form?.phone}`} />
                        <InfoField icon={<Globe size={15} />} label="Web Domain" editMode={editMode} value={form?.website} onChange={(v) => handleChange("website", v)} placeholder="e.g., www.domain.com" isLink={Boolean(form?.website)} linkHref={form?.website?.startsWith("http") ? form?.website : `https://${form?.website}`} targetBlank />
                        <InfoField icon={<Building2 size={15} />} label="Sector" editMode={editMode} value={form?.industry} onChange={(v) => handleChange("industry", v)} placeholder="e.g., IT Services" />
                        <InfoField icon={<Calendar size={15} />} label="Incorporated Year" editMode={editMode} value={form?.foundedYear} onChange={(v) => handleChange("foundedYear", v)} placeholder="e.g., 2018" />
                    </div>
                </div>

                {/* Section 2: Statutory & Tax Records */}
                <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm transition-all duration-300 hover:shadow-md space-y-5">
                    <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                        <span className="p-2.5 rounded-2xl bg-violet-50 text-violet-600 border border-violet-100/80 shadow-2xs">
                            <Hash size={18} />
                        </span>
                        <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                            Statutory & Tax Records
                        </h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <InfoField icon={<FileText size={15} />} label="Registration / CIN" editMode={editMode} value={form?.registrationNumber} onChange={(v) => handleChange("registrationNumber", v)} placeholder="e.g., U72900KA..." isMono />
                        <InfoField icon={<FileText size={15} />} label="GSTIN Number" editMode={editMode} value={form?.gstNumber} onChange={(v) => handleChange("gstNumber", v)} placeholder="e.g., 29AABCA..." isMono />
                        <InfoField icon={<FileText size={15} />} label="PAN Identifier" editMode={editMode} value={form?.panNumber} onChange={(v) => handleChange("panNumber", v)} placeholder="e.g., AABCA..." isMono />
                    </div>
                </div>

            </div>

            {/* Section 3: Registered Headquarters */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm transition-all duration-300 hover:shadow-md space-y-5">
                <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                    <span className="p-2.5 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100/80 shadow-2xs">
                        <MapPin size={18} />
                    </span>
                    <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                        Registered Headquarters
                    </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                        <InfoField label="Premises & Street Address" editMode={editMode} value={form?.address?.line1} onChange={(v) => handleChange("address.line1", v)} placeholder="e.g., Tech Park Road, Sector 5" />
                    </div>
                    <InfoField label="City" editMode={editMode} value={form?.address?.city} onChange={(v) => handleChange("address.city", v)} placeholder="e.g., Bengaluru" />
                    <InfoField label="State / Province" editMode={editMode} value={form?.address?.state} onChange={(v) => handleChange("address.state", v)} placeholder="e.g., Karnataka" />
                    <InfoField label="Country" editMode={editMode} value={form?.address?.country} onChange={(v) => handleChange("address.country", v)} placeholder="e.g., India" />
                    <InfoField label="Postal Index Code" editMode={editMode} value={form?.address?.pincode} onChange={(v) => handleChange("address.pincode", v)} placeholder="e.g., 560100" isMono />
                </div>
            </div>

            {/* Grid Bottom: Executive Overview & Public Networks */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Section 4: Executive Overview */}
                <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm transition-all duration-300 hover:shadow-md space-y-4">
                    <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                        <span className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100/80 shadow-2xs">
                            <Sparkles size={18} />
                        </span>
                        <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                            Executive Overview
                        </h3>
                    </div>
                    {editMode ? (
                        <textarea
                            className="w-full text-xs sm:text-sm font-semibold text-slate-800 leading-relaxed border border-slate-200 rounded-2xl p-4 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-600 transition-all shadow-2xs"
                            rows={4}
                            value={form?.description || ""}
                            onChange={(e) => handleChange("description", e.target.value)}
                            placeholder="Provide a concise organizational summary, core mission, or background..."
                        />
                    ) : (
                        <p className="text-xs sm:text-sm font-semibold text-slate-600 leading-relaxed py-1">
                            {company?.description || "No corporate overview statement provided for this entity."}
                        </p>
                    )}
                </div>

                {/* Section 5: Public Networks */}
                <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm transition-all duration-300 hover:shadow-md space-y-4">
                    <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                        <span className="p-2.5 rounded-2xl bg-sky-50 text-sky-600 border border-sky-100/80 shadow-2xs">
                            <Share2 size={18} />
                        </span>
                        <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                            Public Networks
                        </h3>
                    </div>
                    <div className="space-y-4">
                        <InfoField
                            icon={<LinkedinIcon size={15} />}
                            label="LinkedIn"
                            editMode={editMode}
                            value={form?.socialLinks?.linkedin}
                            onChange={(v) => handleChange("socialLinks.linkedin", v)}
                            placeholder="e.g., https://linkedin.com/company/name"
                            isLink={Boolean(form?.socialLinks?.linkedin)}
                            linkHref={form?.socialLinks?.linkedin}
                            targetBlank
                        />
                        <InfoField
                            icon={<TwitterIcon size={15} />}
                            label="Twitter / X"
                            editMode={editMode}
                            value={form?.socialLinks?.twitter}
                            onChange={(v) => handleChange("socialLinks.twitter", v)}
                            placeholder="e.g., https://twitter.com/handle"
                            isLink={Boolean(form?.socialLinks?.twitter)}
                            linkHref={form?.socialLinks?.twitter}
                            targetBlank
                        />
                        <InfoField
                            icon={<InstagramIcon size={15} />}
                            label="Instagram"
                            editMode={editMode}
                            value={form?.socialLinks?.instagram}
                            onChange={(v) => handleChange("socialLinks.instagram", v)}
                            placeholder="e.g., https://instagram.com/handle"
                            isLink={Boolean(form?.socialLinks?.instagram)}
                            linkHref={form?.socialLinks?.instagram}
                            targetBlank
                        />
                    </div>
                </div>

            </div>

        </div>
    );
}

function InfoField({
    icon,
    label,
    value,
    editMode,
    onChange,
    placeholder = "",
    isLink = false,
    linkHref = "#",
    targetBlank = false,
    isMono = false,
}) {
    return (
        <div className="flex flex-col gap-1.5 p-4 rounded-2xl bg-slate-50/70 border border-slate-200/60 hover:bg-slate-50/100 hover:border-slate-300/80 transition-all duration-200 group">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-2">
                    {icon && <span className="text-indigo-600 shrink-0 group-hover:scale-110 transition-transform">{icon}</span>}
                    {label}
                </span>
                <span className="text-[10px] text-slate-300 font-medium lowercase tracking-normal">optional</span>
            </span>

            {editMode ? (
                <input
                    type="text"
                    className="text-xs sm:text-sm font-semibold text-slate-900 px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-600 transition-all shadow-2xs placeholder:text-slate-300 placeholder:font-normal"
                    value={value ?? ""}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                />
            ) : (
                <div className="text-xs sm:text-sm text-slate-900 font-semibold truncate py-0.5">
                    {value ? (
                        isLink ? (
                            <a
                                href={linkHref}
                                target={targetBlank ? "_blank" : "_self"}
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 font-bold transition-colors group/link"
                            >
                                <span className="truncate">{value}</span>
                                {targetBlank && <ExternalLink size={13} className="shrink-0 text-indigo-400 group-hover/link:translate-x-0.5 transition-transform" />}
                            </a>
                        ) : (
                            <span className={isMono ? "font-mono font-bold text-slate-800 text-xs bg-white px-3 py-1.5 rounded-xl border border-slate-200/80 inline-block shadow-2xs tracking-wide" : "font-bold text-slate-800"}>
                                {value}
                            </span>
                        )
                    ) : (
                        <span className="text-slate-400 font-normal text-xs italic">— Not specified —</span>
                    )}
                </div>
            )}
        </div>
    );
}