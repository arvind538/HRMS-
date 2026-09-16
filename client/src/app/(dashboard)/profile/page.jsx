"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import {
    User,
    Mail,
    ShieldCheck,
    Hash,
    Loader2,
    Camera,
    CheckCircle2,
    Sparkles,
    AlertCircle
} from "lucide-react";

const roleBadge = (role) => {
    const map = {
        admin: {
            label: "Super Admin",
            badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200/70 ring-indigo-500/10",
            accentDot: "bg-indigo-500"
        },
        hr: {
            label: "HR Administrator",
            badgeClass: "bg-violet-50 text-violet-700 border-violet-200/70 ring-violet-500/10",
            accentDot: "bg-violet-500"
        },
        manager: {
            label: "Team Manager",
            badgeClass: "bg-sky-50 text-sky-700 border-sky-200/70 ring-sky-500/10",
            accentDot: "bg-sky-500"
        },
        employee: {
            label: "Staff Member",
            badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200/70 ring-emerald-500/10",
            accentDot: "bg-emerald-500"
        }
    };

    return map[role] || {
        label: "Authorized User",
        badgeClass: "bg-slate-100 text-slate-700 border-slate-200 ring-slate-500/10",
        accentDot: "bg-slate-500"
    };
};

const getInitials = (name) => {
    if (!name) return "U";
    const parts = name.trim().split(" ").filter(Boolean);
    return parts.length > 1
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : parts[0].slice(0, 2).toUpperCase();
};

export default function ProfilePage() {
    const { user } = useAuth();

    const [form, setForm] = useState({
        name: "",
        email: ""
    });

    const [avatarPreview, setAvatarPreview] = useState(null);
    const [avatarFile, setAvatarFile] = useState(null);
    const [saving, setSaving] = useState(false);
    const [statusMessage, setStatusMessage] = useState({ type: "", text: "" });

    const fileInputRef = useRef(null);
    const badge = roleBadge(user?.role);
    const initials = getInitials(form.name || user?.name);

    // Sync user credentials to form state
    useEffect(() => {
        if (user) {
            setForm({
                name: user.name || "",
                email: user.email || ""
            });

            const localKey = `profile_avatar_${user._id}`;
            const savedAvatar = localStorage.getItem(localKey);

            if (savedAvatar) {
                setAvatarPreview(savedAvatar);
            } else if (user.avatar) {
                setAvatarPreview(user.avatar);
            }
        }
    }, [user]);

    const handleImageChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            setStatusMessage({ type: "error", text: "Please select an image file (PNG, JPG, WebP)." });
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setStatusMessage({ type: "error", text: "Image size must not exceed 5 MB." });
            return;
        }

        setAvatarFile(file);

        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result;
            setAvatarPreview(result);
            if (user?._id) {
                localStorage.setItem(`profile_avatar_${user._id}`, result);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setStatusMessage({ type: "", text: "" });

        try {
            const formData = new FormData();
            formData.append("name", form.name);
            formData.append("email", form.email);

            if (avatarFile) {
                formData.append("avatar", avatarFile);
            }

            if (api && api.put) {
                await api.put("/auth/me", formData);
            }

            setStatusMessage({
                type: "success",
                text: "Your profile information has been saved successfully."
            });

            setTimeout(() => {
                setStatusMessage({ type: "", text: "" });
            }, 4000);
        } catch (err) {
            setStatusMessage({
                type: "error",
                text: err.response?.data?.message || "Failed to update profile details. Please try again."
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-2 lg:px-2 py-4 space-y-4">
            {/* Top Title Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-5">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                            My Profile
                        </h1>
                        <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            <Sparkles size={12} /> Account Hub
                        </span>
                    </div>
                    <p className="text-sm font-medium text-slate-500 mt-1">
                        Review your credential parameters, manage photo assets, and modify personal identity records.
                    </p>
                </div>
            </div>

            {/* Main Profile Summary Card */}
            <div className="relative overflow-hidden bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8 transition-all hover:shadow-md">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                    {/* Avatar Section */}
                    <div className="relative group shrink-0">
                        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-600 text-white font-black text-3xl flex items-center justify-center shadow-lg shadow-indigo-500/10 border-2 border-white ring-2 ring-slate-100 transition-transform group-hover:scale-[1.02]">
                            {avatarPreview ? (
                                <img
                                    src={avatarPreview}
                                    alt={form.name || "User Profile"}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <span className="tracking-wide select-none">{initials}</span>
                            )}
                        </div>

                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleImageChange}
                            accept="image/*"
                            className="hidden"
                        />

                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute -bottom-1.5 -right-1.5 p-2 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white shadow-md transition-all duration-200 hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600"
                            title="Update profile avatar"
                        >
                            <Camera size={16} />
                        </button>
                    </div>

                    {/* User Meta Data */}
                    <div className="text-center sm:text-left flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 truncate">
                                {form.name || "Personnel User"}
                            </h2>
                            <span
                                className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold border ring-1 self-center sm:self-auto ${badge.badgeClass}`}
                            >
                                <span className={`w-1.5 h-1.5 rounded-full ${badge.accentDot}`} />
                                {badge.label}
                            </span>
                        </div>

                        <p className="text-sm font-semibold text-slate-500 mt-1 truncate">
                            {form.email || "No email assigned"}
                        </p>

                        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs font-medium text-slate-500">
                            <span className="flex items-center gap-1.5">
                                <ShieldCheck size={14} className="text-emerald-500" />
                                Email Verified
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                Active Session
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Editable Form Card */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8 space-y-6">
                <div className="border-b border-slate-100 pb-4">
                    <h3 className="text-lg font-bold text-slate-900">
                        Account Information
                    </h3>
                    <p className="text-xs font-medium text-slate-500 mt-0.5">
                        Modify your primary identification fields. Immutable technical parameters cannot be directly modified.
                    </p>
                </div>

                {/* Feedback Alert Toast */}
                {statusMessage.text && (
                    <div
                        className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-semibold transition-all ${statusMessage.type === "success"
                            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                            : "bg-rose-50 border-rose-200 text-rose-800"
                            }`}
                    >
                        {statusMessage.type === "success" ? (
                            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                        ) : (
                            <AlertCircle size={18} className="text-rose-600 shrink-0" />
                        )}
                        <span>{statusMessage.text}</span>
                    </div>
                )}

                <form onSubmit={handleSave} className="space-y-6">
                    {/* Editable Fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                <User size={14} className="text-indigo-600" />
                                Full Legal Name
                            </label>
                            <input
                                type="text"
                                required
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                placeholder="e.g. Alexander Vance"
                                className="w-full px-4 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 outline-none transition-all"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                <Mail size={14} className="text-indigo-600" />
                                Corporate Email Address
                            </label>
                            <input
                                type="email"
                                required
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                placeholder="name@company.com"
                                className="w-full px-4 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 outline-none transition-all"
                            />
                        </div>
                    </div>

                    {/* Read-Only System Parameters */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                <ShieldCheck size={14} className="text-slate-400" />
                                Authorized Tier
                            </label>
                            <input
                                value={badge.label}
                                disabled
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold bg-slate-100/80 text-slate-600 cursor-not-allowed select-none"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                <Hash size={14} className="text-slate-400" />
                                System UUID
                            </label>
                            <input
                                value={user?._id || "Unavailable"}
                                disabled
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-mono font-bold bg-slate-100/80 text-slate-600 cursor-not-allowed select-none truncate"
                            />
                        </div>
                    </div>

                    {/* Submit Action Bar */}
                    <div className="flex items-center justify-end pt-5 border-t border-slate-100">
                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold px-7 py-3 rounded-xl text-sm shadow-md shadow-indigo-600/20 hover:shadow-indigo-600/30 disabled:opacity-50 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-indigo-600/20"
                        >
                            {saving ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    <span>Saving Updates...</span>
                                </>
                            ) : (
                                <span>Save Profile Changes</span>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}



// "use client";
// import { useState, useRef } from "react";
// import { useAuth } from "@/context/AuthContext";
// import { User, Mail, ShieldCheck, Hash, Loader2, Camera, CheckCircle2 } from "lucide-react";

// const roleBadge = (role) => {
//     const map = {
//         admin: { label: "Super Admin", className: "bg-indigo-50 text-indigo-700 border-indigo-200/60 ring-1 ring-indigo-500/10 active" },
//         hr: { label: "HR Manager", className: "bg-violet-50 text-violet-700 border-violet-200/60 ring-1 ring-violet-500/10" },
//         manager: { label: "Manager", className: "bg-blue-50 text-blue-700 border-blue-200/60 ring-1 ring-blue-500/10" },
//         employee: { label: "Employee", className: "bg-slate-100 text-slate-700 border-slate-200/80" },
//     };
//     return map[role] || map.employee;
// };

// const getInitials = (name) => {
//     if (!name) return "U";
//     const parts = name.trim().split(" ");
//     return parts.length > 1
//         ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
//         : parts[0].slice(0, 2).toUpperCase();
// };

// export default function ProfilePage() {
//     const { user } = useAuth();
//     const [form, setForm] = useState({ name: user?.name || "", email: user?.email || "" });
//     const [avatarPreview, setAvatarPreview] = useState(user?.avatar || null);
//     const [avatarFile, setAvatarFile] = useState(null);
//     const [saving, setSaving] = useState(false);
//     const [saved, setSaved] = useState(false);

//     const fileInputRef = useRef(null);
//     const badge = roleBadge(user?.role);
//     const initials = getInitials(user?.name);

//     const handleImageChange = (e) => {
//         const file = e.target.files?.[0];
//         if (file) {
//             setAvatarFile(file);
//             setAvatarPreview(URL.createObjectURL(file));
//         }
//     };

//     const handleSave = async (e) => {
//         e.preventDefault();
//         setSaving(true);
//         setSaved(false);

//         // Jab backend ready ho:
//         // const formData = new FormData();
//         // formData.append("name", form.name);
//         // formData.append("email", form.email);
//         // if (avatarFile) formData.append("avatar", avatarFile);
//         // await api.put("/auth/me", formData);

//         setTimeout(() => {
//             setSaving(false);
//             setSaved(true);
//             setTimeout(() => setSaved(false), 3000);
//         }, 700);
//     };

//     return (
//         <div className="max-w-3xl mx-auto px-4 py-6 sm:py-1 space-y-4">
//             <div>
//                 <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">My Profile</h1>
//                 <p className="text-sm text-slate-500 mt-1">Manage your public profile and account credentials.</p>
//             </div>

//             {/* Profile Header Card */}
//             <div className="relative overflow-hidden bg-white rounded-4xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] p-6 sm:p-8">
//                 <div className="flex flex-col sm:flex-row items-center gap-6">
//                     <div className="relative group shrink-0">
//                         <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 text-white font-bold text-3xl flex items-center justify-center shadow-lg shadow-indigo-100">
//                             {avatarPreview ? (
//                                 <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
//                             ) : (
//                                 <span>{initials}</span>
//                             )}
//                         </div>

//                         {/* Hidden File Input */}
//                         <input
//                             type="file"
//                             ref={fileInputRef}
//                             onChange={handleImageChange}
//                             accept="image/*"
//                             className="hidden"
//                         />

//                         {/* Upload Button */}
//                         <button
//                             type="button"
//                             onClick={() => fileInputRef.current?.click()}
//                             className="absolute -bottom-2 -right-2 p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
//                             title="Upload new photo"
//                         >
//                             <Camera size={16} />
//                         </button>
//                     </div>

//                     <div className="text-center sm:text-left flex-1 min-w-0">
//                         <h2 className="text-xl font-bold text-slate-900 truncate">{user?.name || "Guest User"}</h2>
//                         <p className="text-sm text-slate-500 font-medium truncate mt-0.5">{user?.email || "—"}</p>
//                         <div className="mt-3 flex flex-wrap justify-center sm:justify-start gap-2">
//                             <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${badge.className}`}>
//                                 <ShieldCheck size={13} />
//                                 {badge.label}
//                             </span>
//                         </div>
//                     </div>
//                 </div>
//             </div>

//             {/* Editable Form Card */}
//             <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] p-6 sm:p-8">
//                 <div className="border-b border-slate-100 pb-4 mb-6">
//                     <h3 className="text-base font-semibold text-slate-900">Personal Information</h3>
//                     <p className="text-xs text-slate-500 mt-0.5">Update your personal details below.</p>
//                 </div>

//                 {saved && (
//                     <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-4 py-3 rounded-2xl mb-6 transition-all">
//                         <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
//                         <span className="font-medium">Profile updated successfully!</span>
//                     </div>
//                 )}

//                 <form onSubmit={handleSave} className="space-y-6">
//                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
//                         <div className="space-y-1.5">
//                             <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
//                                 <User size={13} className="text-indigo-500" /> Full Name
//                             </label>
//                             <input
//                                 type="text"
//                                 value={form.name}
//                                 onChange={(e) => setForm({ ...form, name: e.target.value })}
//                                 placeholder="Enter your full name"
//                                 className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all duration-200"
//                             />
//                         </div>

//                         <div className="space-y-1.5">
//                             <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
//                                 <Mail size={13} className="text-indigo-500" /> Email Address
//                             </label>
//                             <input
//                                 type="email"
//                                 value={form.email}
//                                 onChange={(e) => setForm({ ...form, email: e.target.value })}
//                                 placeholder="name@example.com"
//                                 className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all duration-200"
//                             />
//                         </div>
//                     </div>

//                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
//                         <div className="space-y-1.5">
//                             <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
//                                 <ShieldCheck size={13} className="text-slate-400" /> System Role
//                             </label>
//                             <input
//                                 value={badge.label}
//                                 disabled
//                                 className="w-full px-4 py-3 border border-slate-200/60 rounded-xl text-sm bg-slate-100/70 text-slate-500 cursor-not-allowed select-none"
//                             />
//                         </div>

//                         <div className="space-y-1.5">
//                             <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
//                                 <Hash size={13} className="text-slate-400" /> User Identifier
//                             </label>
//                             <input
//                                 value={user?._id || "—"}
//                                 disabled
//                                 className="w-full px-4 py-3 border border-slate-200/60 rounded-xl text-sm bg-slate-100/70 text-slate-500 cursor-not-allowed select-none truncate font-mono text-xs"
//                             />
//                         </div>
//                     </div>

//                     <div className="flex items-center justify-end pt-4 border-t border-slate-100">
//                         <button
//                             type="submit"
//                             disabled={saving}
//                             className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold px-6 py-3 rounded-xl text-sm shadow-md shadow-indigo-100 hover:shadow-indigo-200 disabled:opacity-50 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-indigo-500/20"
//                         >
//                             {saving ? <Loader2 size={16} className="animate-spin" /> : null}
//                             <span>{saving ? "Saving changes..." : "Save Changes"}</span>
//                         </button>
//                     </div>
//                 </form>
//             </div>
//         </div>
//     );
// }