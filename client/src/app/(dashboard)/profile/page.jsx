"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import {
    User,
    Image as ImageIcon,
    Lock,
    Eye,
    EyeOff,
    Download,
    Loader2,
    CheckCircle2,
    AlertCircle,
    ShieldCheck,
} from "lucide-react";

const FILE_BASE = (process.env.NEXT_PUBLIC_FILE_URL || "https://hrms-15-4xfs.onrender.com").replace(/\/$/, "");

/* Cloudinary ka full https URL ya purana "/uploads/..." path, dono sahi chalenge */
const resolveAvatar = (a) => {
    if (!a) return null;
    if (/^(https?:|data:|blob:)/.test(a)) return a;
    return `${FILE_BASE}${a.startsWith("/") ? "" : "/"}${a}`;
};

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,32}$/;
const PASSWORD_MESSAGE =
    "Password must be 8-32 characters with an uppercase letter, a lowercase letter and a number.";

const inputCls =
    "w-full px-4 py-2.5 bg-slate-100/70 border border-slate-200 rounded-xl text-base sm:text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 outline-none transition-all disabled:opacity-70 disabled:cursor-not-allowed disabled:bg-slate-100";

const errCls = "border-rose-300 focus:border-rose-500 focus:ring-rose-500/10";

const primaryBtn =
    "inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold px-6 py-2.5 rounded-xl text-sm shadow-lg shadow-indigo-600/25 disabled:opacity-60 disabled:cursor-not-allowed transition-all w-full sm:w-auto";

/* Time zone list: India sabse upar */
const INDIA_TZ = "Asia/Kolkata";
const FALLBACK_ZONES = [INDIA_TZ, "UTC", "America/New_York", "Europe/London", "Asia/Dubai"];
const buildTimeZones = () => {
    let all;
    try {
        all = Intl.supportedValuesOf("timeZone");
    } catch {
        all = FALLBACK_ZONES;
    }
    return [INDIA_TZ, ...all.filter((tz) => tz !== INDIA_TZ)];
};
const tzLabel = (tz) => (tz === INDIA_TZ ? "India Standard Time (Asia/Kolkata)" : tz);

const splitName = (full = "") => {
    const parts = full.trim().split(/\s+/).filter(Boolean);
    return { first: parts[0] || "", last: parts.slice(1).join(" ") };
};

const digitsOnly = (v) => String(v ?? "").replace(/\D/g, "");

function Field({ label, required, hint, error, children }) {
    return (
        <div className="space-y-1.5 min-w-0">
            <label className="block text-sm text-slate-600">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            {children}
            {error ? (
                <p className="text-xs font-medium text-rose-600">{error}</p>
            ) : (
                hint && <p className="text-xs text-slate-400">{hint}</p>
            )}
        </div>
    );
}

function Alert({ msg }) {
    if (!msg.text) return null;
    const ok = msg.type === "success";
    return (
        <div
            className={`flex items-start gap-2.5 px-4 py-3 rounded-xl border text-sm font-medium ${ok
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
                }`}
        >
            {ok ? (
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
            ) : (
                <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
            )}
            <span>{msg.text}</span>
        </div>
    );
}

function PasswordInput({ value, onChange, placeholder, autoComplete }) {
    const [show, setShow] = useState(false);
    return (
        <div className="relative">
            <input
                type={show ? "text" : "password"}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                autoComplete={autoComplete}
                required
                className={`${inputCls} pr-11`}
            />
            <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label={show ? "Hide password" : "Show password"}
            >
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
        </div>
    );
}

const EMPTY = {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    gender: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    timezone: INDIA_TZ,
};

export default function ProfilePage() {
    const { user, updateUser } = useAuth();
    const [tab, setTab] = useState("personal");

    // ---------- Personal ----------
    const [form, setForm] = useState(EMPTY);
    const [errors, setErrors] = useState({});
    const [employee, setEmployee] = useState(null); // real employee profile, null agar login ka profile nahi hai
    const [profileLoading, setProfileLoading] = useState(true);
    const [personalMsg, setPersonalMsg] = useState({ type: "", text: "" });
    const [savingPersonal, setSavingPersonal] = useState(false);

    // ---------- Avatar ----------
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [avatarMsg, setAvatarMsg] = useState({ type: "", text: "" });
    const [savingAvatar, setSavingAvatar] = useState(false);
    const [avatarBroken, setAvatarBroken] = useState(false);
    const fileRef = useRef(null);

    // ---------- Password ----------
    const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
    const [pwMsg, setPwMsg] = useState({ type: "", text: "" });
    const [savingPw, setSavingPw] = useState(false);

    const timeZones = useMemo(buildTimeZones, []);

    /* Sirf admin personal info badal sakta hai. Baaki sab users read-only dekhte hain. */
    const isAdmin = String(user?.role || "").toLowerCase() === "admin";
    const hasProfile = Boolean(employee);

    /* Load the real profile (phone, gender, address...) from the employee record */
    useEffect(() => {
        if (!user) return;
        let alive = true;
        setProfileLoading(true);
        api
            .get("/employees/me")
            .then(({ data }) => {
                if (!alive) return;
                const real = data && data.hasEmployeeProfile !== false && data._id && data.employeeId ? data : null;
                setEmployee(real);
                const src = real || user;
                const { first, last } = splitName(src.name || user.name);
                setForm({
                    firstName: first,
                    lastName: last,
                    email: src.email || user.email || "",
                    phone: digitsOnly(src.phone || user.phone).slice(-10),
                    gender: String(src.gender || user.gender || "").toLowerCase(),
                    address: src.address || user.address || "",
                    city: src.city || user.city || "",
                    state: src.state || "",
                    pincode: src.pincode || "",
                    timezone: src.timeZone || src.timezone || user.timezone || INDIA_TZ,
                });
            })
            .catch(() => {
                if (!alive) return;
                const { first, last } = splitName(user.name);
                setForm({
                    ...EMPTY,
                    firstName: first,
                    lastName: last,
                    email: user.email || "",
                    phone: digitsOnly(user.phone).slice(-10),
                    gender: user.gender || "",
                    address: user.address || "",
                    timezone: user.timezone || INDIA_TZ,
                });
            })
            .finally(() => alive && setProfileLoading(false));
        return () => {
            alive = false;
        };
    }, [user?._id]); // eslint-disable-line react-hooks/exhaustive-deps

    // preview ka blob URL memory me na atke
    useEffect(() => {
        return () => {
            if (avatarPreview) URL.revokeObjectURL(avatarPreview);
        };
    }, [avatarPreview]);

    const savedAvatar = resolveAvatar(user?.avatar);
    const avatarSrc = avatarPreview || savedAvatar;
    useEffect(() => { setAvatarBroken(false); }, [avatarSrc]);

    const initials = (user?.name || "U")
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0])
        .join("")
        .toUpperCase();

    const flash = (setter, type, text) => {
        setter({ type, text });
        if (type === "success") setTimeout(() => setter({ type: "", text: "" }), 4000);
    };

    const set = (k, v) => {
        setForm((p) => ({ ...p, [k]: v }));
        setErrors((p) => (p[k] ? { ...p, [k]: undefined } : p));
    };

    const validate = () => {
        const e = {};
        if (!form.firstName.trim()) e.firstName = "First name is required.";
        if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) e.email = "Enter a valid email address.";
        if (form.phone && !/^[6-9]\d{9}$/.test(form.phone)) e.phone = "Enter a valid 10-digit mobile number starting with 6, 7, 8 or 9.";
        if (hasProfile && !form.phone) e.phone = "Phone number is required.";
        const a = form.address.trim();
        if (hasProfile && (a.length < 5 || a.length > 200)) e.address = "Address must be 5 to 200 characters.";
        if (form.pincode && !/^[1-9]\d{5}$/.test(form.pincode)) e.pincode = "Pincode must be exactly 6 digits.";
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    // ---------- Handlers ----------
    const savePersonal = async (e) => {
        e.preventDefault();
        if (!isAdmin || savingPersonal) return;
        setPersonalMsg({ type: "", text: "" });
        if (!validate()) return;

        setSavingPersonal(true);
        try {
            let message = "Profile updated successfully";

            if (hasProfile) {
                // contact details employee record me jaate hain. Khali optional fields nahi bheje jate.
                const body = { phone: form.phone, address: form.address.trim() };
                if (form.city.trim()) body.city = form.city.trim();
                if (form.state.trim()) body.state = form.state.trim();
                if (form.pincode) body.pincode = form.pincode;
                if (form.timezone) body.timeZone = form.timezone;
                const res = await api.put("/employees/me", body);
                if (res?.data?.employee) setEmployee((prev) => ({ ...prev, ...res.data.employee }));
                message = res?.data?.message || message;
                updateUser({ phone: form.phone, address: form.address.trim() });
            }

            // name, email, gender login account par hain
            const res = await api.put("/auth/me", {
                name: `${form.firstName} ${form.lastName}`.trim(),
                email: form.email,
                countryCode: "+91",
                phone: form.phone,
                gender: form.gender,
                address: form.address,
                timezone: form.timezone,
            });
            if (res?.data?.user) updateUser(res.data.user);
            message = res?.data?.message || message;

            flash(setPersonalMsg, "success", message);
        } catch (err) {
            flash(setPersonalMsg, "error", err.response?.data?.message || "Update failed");
        } finally {
            setSavingPersonal(false);
        }
    };

    const pickAvatar = (e) => {
        const file = e.target.files?.[0];
        e.target.value = ""; // same file dobara chunne par bhi onChange chale
        if (!file) return;
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
            return flash(setAvatarMsg, "error", "Please select a JPG, PNG or WebP image");
        }
        if (file.size > 2 * 1024 * 1024) {
            return flash(setAvatarMsg, "error", "Image must be smaller than 2MB");
        }
        setAvatarMsg({ type: "", text: "" });
        setAvatarFile(file);
        setAvatarPreview(URL.createObjectURL(file));
    };

    const saveAvatar = async () => {
        if (!avatarFile) return flash(setAvatarMsg, "error", "Please select an image first");
        setSavingAvatar(true);
        setAvatarMsg({ type: "", text: "" });
        try {
            const fd = new FormData();
            fd.append("avatar", avatarFile);
            const res = await api.put("/auth/me/avatar", fd);
            if (!res?.data) return;
            updateUser({ avatar: res.data.user.avatar }); // header, dashboard, sab jagah turant
            setAvatarFile(null);
            setAvatarPreview(null);
            flash(setAvatarMsg, "success", res.data.message || "Avatar updated successfully");
        } catch (err) {
            console.error("saveAvatar error:", err);
            flash(setAvatarMsg, "error", err.response?.data?.message || err.message || "Upload failed");
        }
    };

    const savePassword = async (e) => {
        e.preventDefault();
        setPwMsg({ type: "", text: "" });

        if (!PASSWORD_REGEX.test(pw.next)) return flash(setPwMsg, "error", PASSWORD_MESSAGE);
        if (pw.next !== pw.confirm)
            return flash(setPwMsg, "error", "New password and confirm password do not match");

        setSavingPw(true);
        try {
            const res = await api.put("/auth/change-password", {
                currentPassword: pw.current,
                newPassword: pw.next,
                confirmPassword: pw.confirm,
            });
            if (!res?.data) return;
            setPw({ current: "", next: "", confirm: "" });
            flash(setPwMsg, "success", res.data.message || "Password changed successfully");
        } catch (err) {
            flash(setPwMsg, "error", err.response?.data?.message || "Password change failed");
        } finally {
            setSavingPw(false);
        }
    };

    const tabs = [
        { id: "personal", label: "Personal Info", icon: User },
        { id: "avatar", label: "Avatar Change", icon: ImageIcon },
        { id: "password", label: "Password Change", icon: Lock },
    ];

    /* Non-admin ke liye sab fields read-only */
    const ro = !isAdmin;
    const roCls = (extra = "") => `${inputCls} ${extra}`;

    return (
        <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 py-4 space-y-4">
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-700">Profile</h1>

            {/* Tabs (mobile par horizontal scroll) */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-2 sm:p-3">
                <div className="flex gap-1 overflow-x-auto no-scrollbar">
                    {tabs.map(({ id, label, icon: Icon }) => {
                        const active = tab === id;
                        return (
                            <button
                                key={id}
                                type="button"
                                onClick={() => setTab(id)}
                                className={`flex items-center gap-2 whitespace-nowrap px-3 sm:px-4 py-2 rounded-xl text-sm transition-all ${active
                                    ? "bg-indigo-50 text-indigo-700 font-medium"
                                    : "text-slate-500 hover:bg-slate-50"
                                    }`}
                            >
                                <Icon size={16} />
                                {label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ========== PERSONAL INFO ========== */}
            {tab === "personal" && (
                <form
                    onSubmit={savePersonal}
                    noValidate
                    className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6 space-y-5"
                >
                    <Alert msg={personalMsg} />

                    {ro && (
                        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-800">
                            <ShieldCheck size={15} className="shrink-0 mt-0.5" />
                            <span>Aapki personal details admin dwara manage hoti hain. Koi change ho to admin se contact karein.</span>
                        </div>
                    )}

                    {hasProfile && (
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-indigo-50/60 border border-indigo-100 px-4 py-2.5 text-xs text-indigo-900">
                            <span className="inline-flex items-center gap-1.5 font-semibold"><ShieldCheck size={14} /> Employee ID: <b className="font-mono">{employee.employeeId}</b></span>
                        </div>
                    )}

                    {profileLoading ? (
                        <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400">
                            <Loader2 size={26} className="animate-spin text-indigo-600" />
                            <p className="text-xs font-semibold">Loading your profile...</p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                                <Field label="First Name" required error={errors.firstName}>
                                    <input
                                        value={form.firstName}
                                        disabled={ro}
                                        onChange={(e) => set("firstName", e.target.value)}
                                        className={roCls(errors.firstName ? errCls : "")}
                                    />
                                </Field>

                                <Field label="Last Name">
                                    <input
                                        value={form.lastName}
                                        disabled={ro}
                                        onChange={(e) => set("lastName", e.target.value)}
                                        className={roCls()}
                                    />
                                </Field>

                                <Field label="Email Address" required error={errors.email}>
                                    <input
                                        type="email"
                                        value={form.email}
                                        disabled={ro}
                                        onChange={(e) => set("email", e.target.value)}
                                        className={roCls(errors.email ? errCls : "")}
                                    />
                                </Field>

                                <Field label="Phone Number" required={hasProfile} error={errors.phone}>
                                    <div className="flex">
                                        <span className="inline-flex items-center px-3 bg-slate-100 border border-r-0 border-slate-200 rounded-l-xl text-sm font-semibold text-slate-600">+91</span>
                                        <input
                                            type="tel"
                                            inputMode="numeric"
                                            value={form.phone}
                                            disabled={ro}
                                            onChange={(e) => set("phone", digitsOnly(e.target.value).slice(0, 10))}
                                            maxLength={10}
                                            placeholder="10-digit mobile number"
                                            className={`${roCls("rounded-l-none")} ${errors.phone ? errCls : ""}`}
                                        />
                                    </div>
                                </Field>

                                <Field label="Gender" hint={!form.gender ? "Not set yet." : ""}>
                                    <div className="flex flex-wrap gap-3">
                                        {["male", "female", "other"].map((g) => {
                                            const on = form.gender === g;
                                            // "other" sirf tab dikhe jab wahi saved value ho
                                            if (g === "other" && !on) return null;
                                            return (
                                                <label
                                                    key={g}
                                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm capitalize transition-all ${on
                                                        ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                                                        : "border-slate-200 bg-slate-100/70 text-slate-500"
                                                        } ${ro ? "cursor-not-allowed opacity-80" : "cursor-pointer"}`}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="gender"
                                                        value={g}
                                                        checked={on}
                                                        disabled={ro}
                                                        onChange={() => set("gender", g)}
                                                        className="accent-indigo-600"
                                                    />
                                                    {g}
                                                </label>
                                            );
                                        })}
                                    </div>
                                </Field>

                                <Field label="Address" required={hasProfile} error={errors.address}>
                                    <textarea
                                        rows={3}
                                        value={form.address}
                                        maxLength={200}
                                        disabled={ro}
                                        onChange={(e) => set("address", e.target.value)}
                                        placeholder="House no., street, area"
                                        className={`${roCls("resize-none")} ${errors.address ? errCls : ""}`}
                                    />
                                </Field>

                                {hasProfile && (
                                    <>
                                        <Field label="City">
                                            <input value={form.city} disabled={ro} onChange={(e) => set("city", e.target.value)} maxLength={60} placeholder="City" className={roCls()} />
                                        </Field>
                                        <Field label="State">
                                            <input value={form.state} disabled={ro} onChange={(e) => set("state", e.target.value)} maxLength={60} placeholder="State" className={roCls()} />
                                        </Field>
                                        <Field label="Pincode" error={errors.pincode}>
                                            <input
                                                inputMode="numeric"
                                                value={form.pincode}
                                                disabled={ro}
                                                onChange={(e) => set("pincode", digitsOnly(e.target.value).slice(0, 6))}
                                                maxLength={6}
                                                placeholder="6-digit pincode"
                                                className={roCls(errors.pincode ? errCls : "")}
                                            />
                                        </Field>
                                    </>
                                )}

                                <Field label="Time Zone">
                                    <select
                                        value={form.timezone}
                                        disabled={ro}
                                        onChange={(e) => set("timezone", e.target.value)}
                                        className={roCls()}
                                    >
                                        {timeZones.map((tz) => (
                                            <option key={tz} value={tz}>
                                                {tzLabel(tz)}
                                            </option>
                                        ))}
                                    </select>
                                </Field>
                            </div>

                            {isAdmin && (
                                <button type="submit" disabled={savingPersonal} className={primaryBtn}>
                                    {savingPersonal ? (
                                        <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                        <Download size={16} />
                                    )}
                                    Update
                                </button>
                            )}
                        </>
                    )}
                </form>
            )}

            {/* ========== AVATAR ========== */}
            {tab === "avatar" && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6 space-y-5">
                    <Alert msg={avatarMsg} />
                    <p className="text-sm text-slate-600">Change Picture</p>

                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
                        <button
                            type="button"
                            onClick={() => fileRef.current?.click()}
                            className="w-24 h-24 rounded-xl overflow-hidden bg-gradient-to-tr from-indigo-600 to-violet-600 text-white text-3xl font-bold flex items-center justify-center ring-2 ring-slate-100 hover:opacity-90 transition shrink-0"
                            title="Click to choose an image"
                        >
                            {avatarSrc && !avatarBroken ? (
                                <img
                                    key={avatarSrc}
                                    src={avatarSrc}
                                    alt="Avatar"
                                    onError={() => setAvatarBroken(true)}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                initials
                            )}
                        </button>

                        <input
                            ref={fileRef}
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            onChange={pickAvatar}
                            className="hidden"
                        />

                        <div className="text-sm text-slate-500 text-center sm:text-left space-y-1">
                            <p>Recommended size: 100 X 100 PX</p>
                            <p>File size: 2MB (JPG, PNG, WebP)</p>
                            <button
                                type="button"
                                onClick={() => fileRef.current?.click()}
                                className="text-indigo-600 font-medium hover:underline"
                            >
                                Choose image
                            </button>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={saveAvatar}
                        disabled={savingAvatar || !avatarFile}
                        className={primaryBtn}
                    >
                        {savingAvatar ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <Download size={16} />
                        )}
                        Update
                    </button>
                </div>
            )}

            {/* ========== PASSWORD ========== */}
            {tab === "password" && (
                <form
                    onSubmit={savePassword}
                    className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6 space-y-5"
                >
                    <Alert msg={pwMsg} />

                    <Field label="Current Password" required>
                        <PasswordInput
                            value={pw.current}
                            onChange={(e) => setPw({ ...pw, current: e.target.value })}
                            placeholder="Current Password"
                            autoComplete="current-password"
                        />
                    </Field>

                    <Field label="New Password" required>
                        <PasswordInput
                            value={pw.next}
                            onChange={(e) => setPw({ ...pw, next: e.target.value })}
                            placeholder="New Password"
                            autoComplete="new-password"
                        />
                        <p className="text-xs text-slate-400">
                            8-32 characters with an uppercase letter, a lowercase letter and a number.
                        </p>
                    </Field>

                    <Field label="Confirm Password" required>
                        <PasswordInput
                            value={pw.confirm}
                            onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
                            placeholder="Password Confirmation"
                            autoComplete="new-password"
                        />
                    </Field>

                    <button type="submit" disabled={savingPw} className={primaryBtn}>
                        {savingPw ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                        Update
                    </button>
                </form>
            )}
        </div>
    );
}












// "use client";

// import { useState, useRef, useEffect, useMemo } from "react";
// import { useAuth } from "@/context/AuthContext";
// import api from "@/lib/api";
// import {
//     User,
//     Image as ImageIcon,
//     Lock,
//     Eye,
//     EyeOff,
//     Download,
//     Loader2,
//     CheckCircle2,
//     AlertCircle,
//     ShieldCheck,
// } from "lucide-react";

// const FILE_BASE = (process.env.NEXT_PUBLIC_FILE_URL || "https://hrms-15-4xfs.onrender.com").replace(/\/$/, "");

// /* Cloudinary ka full https URL ya purana "/uploads/..." path, dono sahi chalenge */
// const resolveAvatar = (a) => {
//     if (!a) return null;
//     if (/^(https?:|data:|blob:)/.test(a)) return a;
//     return `${FILE_BASE}${a.startsWith("/") ? "" : "/"}${a}`;
// };

// const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,32}$/;
// const PASSWORD_MESSAGE =
//     "Password must be 8-32 characters with an uppercase letter, a lowercase letter and a number.";

// const inputCls =
//     "w-full px-4 py-2.5 bg-slate-100/70 border border-slate-200 rounded-xl text-base sm:text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 outline-none transition-all disabled:opacity-70 disabled:cursor-not-allowed disabled:bg-slate-100";

// const errCls = "border-rose-300 focus:border-rose-500 focus:ring-rose-500/10";

// const primaryBtn =
//     "inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold px-6 py-2.5 rounded-xl text-sm shadow-lg shadow-indigo-600/25 disabled:opacity-60 disabled:cursor-not-allowed transition-all w-full sm:w-auto";

// const splitName = (full = "") => {
//     const parts = full.trim().split(/\s+/).filter(Boolean);
//     return { first: parts[0] || "", last: parts.slice(1).join(" ") };
// };

// const digitsOnly = (v) => String(v ?? "").replace(/\D/g, "");

// function Field({ label, required, hint, error, children }) {
//     return (
//         <div className="space-y-1.5 min-w-0">
//             <label className="block text-sm text-slate-600">
//                 {label} {required && <span className="text-red-500">*</span>}
//             </label>
//             {children}
//             {error ? (
//                 <p className="text-xs font-medium text-rose-600">{error}</p>
//             ) : (
//                 hint && <p className="text-xs text-slate-400">{hint}</p>
//             )}
//         </div>
//     );
// }

// function Alert({ msg }) {
//     if (!msg.text) return null;
//     const ok = msg.type === "success";
//     return (
//         <div
//             className={`flex items-start gap-2.5 px-4 py-3 rounded-xl border text-sm font-medium ${ok
//                 ? "bg-emerald-50 border-emerald-200 text-emerald-800"
//                 : "bg-rose-50 border-rose-200 text-rose-800"
//                 }`}
//         >
//             {ok ? (
//                 <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
//             ) : (
//                 <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
//             )}
//             <span>{msg.text}</span>
//         </div>
//     );
// }

// function PasswordInput({ value, onChange, placeholder, autoComplete }) {
//     const [show, setShow] = useState(false);
//     return (
//         <div className="relative">
//             <input
//                 type={show ? "text" : "password"}
//                 value={value}
//                 onChange={onChange}
//                 placeholder={placeholder}
//                 autoComplete={autoComplete}
//                 required
//                 className={`${inputCls} pr-11`}
//             />
//             <button
//                 type="button"
//                 onClick={() => setShow((s) => !s)}
//                 className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
//                 aria-label={show ? "Hide password" : "Show password"}
//             >
//                 {show ? <EyeOff size={18} /> : <Eye size={18} />}
//             </button>
//         </div>
//     );
// }

// const EMPTY = {
//     firstName: "",
//     lastName: "",
//     email: "",
//     phone: "",
//     gender: "",
//     address: "",
//     city: "",
//     state: "",
//     pincode: "",
//     timezone: "",
// };

// export default function ProfilePage() {
//     const { user, updateUser } = useAuth();
//     const [tab, setTab] = useState("personal");

//     // ---------- Personal ----------
//     const [form, setForm] = useState(EMPTY);
//     const [errors, setErrors] = useState({});
//     const [employee, setEmployee] = useState(null); // the real employee profile, null if the login has none
//     const [profileLoading, setProfileLoading] = useState(true);
//     const [personalMsg, setPersonalMsg] = useState({ type: "", text: "" });
//     const [savingPersonal, setSavingPersonal] = useState(false);

//     // ---------- Avatar ----------
//     const [avatarFile, setAvatarFile] = useState(null);
//     const [avatarPreview, setAvatarPreview] = useState(null);
//     const [avatarMsg, setAvatarMsg] = useState({ type: "", text: "" });
//     const [savingAvatar, setSavingAvatar] = useState(false);
//     const [avatarBroken, setAvatarBroken] = useState(false);
//     const fileRef = useRef(null);

//     // ---------- Password ----------
//     const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
//     const [pwMsg, setPwMsg] = useState({ type: "", text: "" });
//     const [savingPw, setSavingPw] = useState(false);

//     const timeZones = useMemo(() => {
//         try {
//             return Intl.supportedValuesOf("timeZone");
//         } catch {
//             // return ["Asia/Kolkata", "UTC", "America/New_York", "Europe/London", "Asia/Dubai"];
//             const timeZones = useMemo(() => {
//                 const INDIA_FIRST = ["Asia/Kolkata"];
//                 let all = [];
//                 try {
//                     all = Intl.supportedValuesOf("timeZone");
//                 } catch {
//                     all = ["Asia/Kolkata", "UTC", "America/New_York", "Europe/London", "Asia/Dubai"];
//                 }
//                 return [...INDIA_FIRST, ...all.filter((tz) => !INDIA_FIRST.includes(tz))];
//             }, []);
//         }
//     }, []);

//     const isAdmin = String(user?.role || "").toLowerCase() === "admin";
//     const hasProfile = Boolean(employee);
//     // Only contact details are editable by everyone. Name, email and gender are changed by HR or admin.
//     const canEditContact = true;
//     const canEditIdentity = isAdmin;

//     /* Load the real profile (phone, gender, address...) from the employee record */
//     useEffect(() => {
//         if (!user) return;
//         let alive = true;
//         setProfileLoading(true);
//         api
//             .get("/employees/me")
//             .then(({ data }) => {
//                 if (!alive) return;
//                 const real = data && data.hasEmployeeProfile !== false && data._id && data.employeeId ? data : null;
//                 setEmployee(real);
//                 const src = real || user;
//                 const { first, last } = splitName(src.name || user.name);
//                 setForm({
//                     firstName: first,
//                     lastName: last,
//                     email: src.email || user.email || "",
//                     phone: digitsOnly(src.phone || user.phone).slice(-10),
//                     gender: String(src.gender || user.gender || "").toLowerCase(),
//                     address: src.address || user.address || "",
//                     city: src.city || user.city || "",
//                     state: src.state || "",
//                     pincode: src.pincode || "",
//                     timezone: src.timeZone || src.timezone || user.timezone || "",
//                 });
//             })
//             .catch(() => {
//                 if (!alive) return;
//                 const { first, last } = splitName(user.name);
//                 setForm({ ...EMPTY, firstName: first, lastName: last, email: user.email || "", phone: digitsOnly(user.phone).slice(-10), gender: user.gender || "", address: user.address || "", timezone: user.timezone || "" });
//             })
//             .finally(() => alive && setProfileLoading(false));
//         return () => {
//             alive = false;
//         };
//     }, [user?._id]); // eslint-disable-line react-hooks/exhaustive-deps

//     // preview ka blob URL memory me na atke
//     useEffect(() => {
//         return () => {
//             if (avatarPreview) URL.revokeObjectURL(avatarPreview);
//         };
//     }, [avatarPreview]);

//     const savedAvatar = resolveAvatar(user?.avatar);
//     const avatarSrc = avatarPreview || savedAvatar;
//     useEffect(() => { setAvatarBroken(false); }, [avatarSrc]);

//     const initials = (user?.name || "U")
//         .split(" ")
//         .filter(Boolean)
//         .slice(0, 2)
//         .map((p) => p[0])
//         .join("")
//         .toUpperCase();

//     const flash = (setter, type, text) => {
//         setter({ type, text });
//         if (type === "success") setTimeout(() => setter({ type: "", text: "" }), 4000);
//     };

//     const set = (k, v) => {
//         setForm((p) => ({ ...p, [k]: v }));
//         setErrors((p) => (p[k] ? { ...p, [k]: undefined } : p));
//     };

//     const validate = () => {
//         const e = {};
//         if (canEditIdentity && !form.firstName.trim()) e.firstName = "First name is required.";
//         if (canEditIdentity && !/^\S+@\S+\.\S+$/.test(form.email.trim())) e.email = "Enter a valid email address.";
//         if (form.phone && !/^[6-9]\d{9}$/.test(form.phone)) e.phone = "Enter a valid 10-digit mobile number starting with 6, 7, 8 or 9.";
//         if (hasProfile && !form.phone) e.phone = "Phone number is required.";
//         const a = form.address.trim();
//         if (hasProfile && (a.length < 5 || a.length > 200)) e.address = "Address must be 5 to 200 characters.";
//         if (form.pincode && !/^[1-9]\d{5}$/.test(form.pincode)) e.pincode = "Pincode must be exactly 6 digits.";
//         setErrors(e);
//         return Object.keys(e).length === 0;
//     };

//     // ---------- Handlers ----------
//     const savePersonal = async (e) => {
//         e.preventDefault();
//         if (savingPersonal) return;
//         setPersonalMsg({ type: "", text: "" });
//         if (!validate()) return;

//         setSavingPersonal(true);
//         try {
//             let message = "Profile updated successfully";

//             if (hasProfile) {
//                 // contact details go to the employee record. Empty optional fields are not sent.
//                 const body = { phone: form.phone, address: form.address.trim() };
//                 if (form.city.trim()) body.city = form.city.trim();
//                 if (form.state.trim()) body.state = form.state.trim();
//                 if (form.pincode) body.pincode = form.pincode;
//                 if (form.timezone) body.timeZone = form.timezone;
//                 const res = await api.put("/employees/me", body);
//                 if (res?.data?.employee) setEmployee((prev) => ({ ...prev, ...res.data.employee }));
//                 message = res?.data?.message || message;
//                 updateUser({ phone: form.phone, address: form.address.trim() });
//             }

//             // name and email live on the login account and only the admin can change them
//             if (canEditIdentity || !hasProfile) {
//                 const res = await api.put("/auth/me", {
//                     name: `${form.firstName} ${form.lastName}`.trim(),
//                     email: form.email,
//                     countryCode: "+91",
//                     phone: form.phone,
//                     gender: form.gender,
//                     address: form.address,
//                     timezone: form.timezone,
//                 });
//                 if (res?.data?.user) updateUser(res.data.user);
//                 message = res?.data?.message || message;
//             }

//             flash(setPersonalMsg, "success", message);
//         } catch (err) {
//             flash(setPersonalMsg, "error", err.response?.data?.message || "Update failed");
//         } finally {
//             setSavingPersonal(false);
//         }
//     };

//     const pickAvatar = (e) => {
//         const file = e.target.files?.[0];
//         e.target.value = ""; // same file dobara chunne par bhi onChange chale
//         if (!file) return;
//         if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
//             return flash(setAvatarMsg, "error", "Please select a JPG, PNG or WebP image");
//         }
//         if (file.size > 2 * 1024 * 1024) {
//             return flash(setAvatarMsg, "error", "Image must be smaller than 2MB");
//         }
//         setAvatarMsg({ type: "", text: "" });
//         setAvatarFile(file);
//         setAvatarPreview(URL.createObjectURL(file));
//     };

//     const saveAvatar = async () => {
//         if (!avatarFile) return flash(setAvatarMsg, "error", "Please select an image first");
//         setSavingAvatar(true);
//         setAvatarMsg({ type: "", text: "" });
//         try {
//             const fd = new FormData();
//             fd.append("avatar", avatarFile);
//             const res = await api.put("/auth/me/avatar", fd);
//             if (!res?.data) return;
//             updateUser({ avatar: res.data.user.avatar }); // header, dashboard, sab jagah turant
//             setAvatarFile(null);
//             setAvatarPreview(null);
//             flash(setAvatarMsg, "success", res.data.message || "Avatar updated successfully");
//         } catch (err) {
//             console.error("saveAvatar error:", err);
//             flash(setAvatarMsg, "error", err.response?.data?.message || err.message || "Upload failed");
//         }
//         // } finally {
//         //     setSavingAvatar(false);
//         // }
//     };

//     const savePassword = async (e) => {
//         e.preventDefault();
//         setPwMsg({ type: "", text: "" });

//         if (!PASSWORD_REGEX.test(pw.next)) return flash(setPwMsg, "error", PASSWORD_MESSAGE);
//         if (pw.next !== pw.confirm)
//             return flash(setPwMsg, "error", "New password and confirm password do not match");

//         setSavingPw(true);
//         try {
//             const res = await api.put("/auth/change-password", {
//                 currentPassword: pw.current,
//                 newPassword: pw.next,
//                 confirmPassword: pw.confirm,
//             });
//             if (!res?.data) return;
//             setPw({ current: "", next: "", confirm: "" });
//             flash(setPwMsg, "success", res.data.message || "Password changed successfully");
//         } catch (err) {
//             flash(setPwMsg, "error", err.response?.data?.message || "Password change failed");
//         } finally {
//             setSavingPw(false);
//         }
//     };

//     const tabs = [
//         { id: "personal", label: "Personal Info", icon: User },
//         { id: "avatar", label: "Avatar Change", icon: ImageIcon },
//         { id: "password", label: "Password Change", icon: Lock },
//     ];

//     const locked = (extra = "") => `${inputCls} ${extra}`;

//     return (
//         <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 py-4 space-y-4">
//             <h1 className="text-xl sm:text-2xl font-semibold text-slate-700">Profile</h1>

//             {/* Tabs (mobile par horizontal scroll) */}
//             <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-2 sm:p-3">
//                 <div className="flex gap-1 overflow-x-auto no-scrollbar">
//                     {tabs.map(({ id, label, icon: Icon }) => {
//                         const active = tab === id;
//                         return (
//                             <button
//                                 key={id}
//                                 type="button"
//                                 onClick={() => setTab(id)}
//                                 className={`flex items-center gap-2 whitespace-nowrap px-3 sm:px-4 py-2 rounded-xl text-sm transition-all ${active
//                                     ? "bg-indigo-50 text-indigo-700 font-medium"
//                                     : "text-slate-500 hover:bg-slate-50"
//                                     }`}
//                             >
//                                 <Icon size={16} />
//                                 {label}
//                             </button>
//                         );
//                     })}
//                 </div>
//             </div>

//             {/* ========== PERSONAL INFO ========== */}
//             {tab === "personal" && (
//                 <form
//                     onSubmit={savePersonal}
//                     noValidate
//                     className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6 space-y-5"
//                 >
//                     <Alert msg={personalMsg} />

//                     {hasProfile && (
//                         <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-indigo-50/60 border border-indigo-100 px-4 py-2.5 text-xs text-indigo-900">
//                             <span className="inline-flex items-center gap-1.5 font-semibold"><ShieldCheck size={14} /> Employee ID: <b className="font-mono">{employee.employeeId}</b></span>
//                             {!canEditIdentity && <span className="text-indigo-700/80">Name, email and gender can be changed by HR or admin.</span>}
//                         </div>
//                     )}

//                     {profileLoading ? (
//                         <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400">
//                             <Loader2 size={26} className="animate-spin text-indigo-600" />
//                             <p className="text-xs font-semibold">Loading your profile...</p>
//                         </div>
//                     ) : (
//                         <>
//                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
//                                 <Field label="First Name" required error={errors.firstName}>
//                                     <input
//                                         value={form.firstName}
//                                         disabled={!canEditIdentity && hasProfile}
//                                         onChange={(e) => set("firstName", e.target.value)}
//                                         className={locked(errors.firstName ? errCls : "")}
//                                     />
//                                 </Field>

//                                 <Field label="Last Name">
//                                     <input
//                                         value={form.lastName}
//                                         disabled={!canEditIdentity && hasProfile}
//                                         onChange={(e) => set("lastName", e.target.value)}
//                                         className={inputCls}
//                                     />
//                                 </Field>

//                                 <Field label="Email Address" required error={errors.email} hint={!canEditIdentity ? "Only admin can change the email." : ""}>
//                                     <input
//                                         type="email"
//                                         value={form.email}
//                                         disabled={!canEditIdentity}
//                                         onChange={(e) => set("email", e.target.value)}
//                                         className={locked(errors.email ? errCls : "")}
//                                     />
//                                 </Field>

//                                 <Field label="Phone Number" required={hasProfile} error={errors.phone}>
//                                     <div className="flex">
//                                         <span className="inline-flex items-center px-3 bg-slate-100 border border-r-0 border-slate-200 rounded-l-xl text-sm font-semibold text-slate-600">+91</span>
//                                         <input
//                                             type="tel"
//                                             inputMode="numeric"
//                                             value={form.phone}
//                                             disabled={!canEditContact}
//                                             onChange={(e) => set("phone", digitsOnly(e.target.value).slice(0, 10))}
//                                             maxLength={10}
//                                             placeholder="10-digit mobile number"
//                                             className={`${inputCls} rounded-l-none ${errors.phone ? errCls : ""}`}
//                                         />
//                                     </div>
//                                 </Field>

//                                 <Field label="Gender" hint={form.gender ? "" : "Not set yet. Ask HR to add it."}>
//                                     <div className="flex flex-wrap gap-3">
//                                         {["male", "female", "other"].map((g) => {
//                                             const on = form.gender === g;
//                                             // "other" is shown only when it is the saved value
//                                             if (g === "other" && !on) return null;
//                                             return (
//                                                 <label
//                                                     key={g}
//                                                     className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm capitalize transition-all ${on
//                                                         ? "border-indigo-600 bg-indigo-50 text-indigo-700"
//                                                         : "border-slate-200 bg-slate-100/70 text-slate-500"
//                                                         } ${canEditIdentity || !hasProfile ? "cursor-pointer" : "cursor-not-allowed opacity-80"}`}
//                                                 >
//                                                     <input
//                                                         type="radio"
//                                                         name="gender"
//                                                         value={g}
//                                                         checked={on}
//                                                         disabled={hasProfile && !canEditIdentity}
//                                                         onChange={() => set("gender", g)}
//                                                         className="accent-indigo-600"
//                                                     />
//                                                     {g}
//                                                 </label>
//                                             );
//                                         })}
//                                     </div>
//                                 </Field>

//                                 <Field label="Address" required={hasProfile} error={errors.address}>
//                                     <textarea
//                                         rows={3}
//                                         value={form.address}
//                                         maxLength={200}
//                                         disabled={!canEditContact}
//                                         onChange={(e) => set("address", e.target.value)}
//                                         placeholder="House no., street, area"
//                                         className={`${inputCls} resize-none ${errors.address ? errCls : ""}`}
//                                     />
//                                 </Field>

//                                 {hasProfile && (
//                                     <>
//                                         <Field label="City">
//                                             <input value={form.city} onChange={(e) => set("city", e.target.value)} maxLength={60} placeholder="City" className={inputCls} />
//                                         </Field>
//                                         <Field label="State">
//                                             <input value={form.state} onChange={(e) => set("state", e.target.value)} maxLength={60} placeholder="State" className={inputCls} />
//                                         </Field>
//                                         <Field label="Pincode" error={errors.pincode}>
//                                             <input
//                                                 inputMode="numeric"
//                                                 value={form.pincode}
//                                                 onChange={(e) => set("pincode", digitsOnly(e.target.value).slice(0, 6))}
//                                                 maxLength={6}
//                                                 placeholder="6-digit pincode"
//                                                 className={`${inputCls} ${errors.pincode ? errCls : ""}`}
//                                             />
//                                         </Field>
//                                     </>
//                                 )}

//                                 <Field label="Time Zone">
//                                     <select
//                                         value={form.timezone}
//                                         onChange={(e) => set("timezone", e.target.value)}
//                                         className={inputCls}
//                                     >
//                                         <option value="">Choose a time zone</option>
//                                         {timeZones.map((tz) => (
//                                             <option key={tz} value={tz}>
//                                                 {tz}
//                                             </option>
//                                         ))}
//                                     </select>
//                                 </Field>
//                             </div>

//                             <button type="submit" disabled={savingPersonal} className={primaryBtn}>
//                                 {savingPersonal ? (
//                                     <Loader2 size={16} className="animate-spin" />
//                                 ) : (
//                                     <Download size={16} />
//                                 )}
//                                 Update
//                             </button>
//                         </>
//                     )}
//                 </form>
//             )}

//             {/* ========== AVATAR ========== */}
//             {tab === "avatar" && (
//                 <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6 space-y-5">
//                     <Alert msg={avatarMsg} />
//                     <p className="text-sm text-slate-600">Change Picture</p>

//                     <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
//                         <button
//                             type="button"
//                             onClick={() => fileRef.current?.click()}
//                             className="w-24 h-24 rounded-xl overflow-hidden bg-gradient-to-tr from-indigo-600 to-violet-600 text-white text-3xl font-bold flex items-center justify-center ring-2 ring-slate-100 hover:opacity-90 transition shrink-0"
//                             title="Click to choose an image"
//                         >
//                             {avatarSrc && !avatarBroken ? (
//                                 <img
//                                     key={avatarSrc}
//                                     src={avatarSrc}
//                                     alt="Avatar"
//                                     onError={() => setAvatarBroken(true)}
//                                     className="w-full h-full object-cover"
//                                 />
//                             ) : (
//                                 initials
//                             )}
//                         </button>

//                         <input
//                             ref={fileRef}
//                             type="file"
//                             accept="image/png,image/jpeg,image/webp"
//                             onChange={pickAvatar}
//                             className="hidden"
//                         />

//                         <div className="text-sm text-slate-500 text-center sm:text-left space-y-1">
//                             <p>Recommended size: 100 X 100 PX</p>
//                             <p>File size: 2MB (JPG, PNG, WebP)</p>
//                             <button
//                                 type="button"
//                                 onClick={() => fileRef.current?.click()}
//                                 className="text-indigo-600 font-medium hover:underline"
//                             >
//                                 Choose image
//                             </button>
//                         </div>
//                     </div>

//                     <button
//                         type="button"
//                         onClick={saveAvatar}
//                         disabled={savingAvatar || !avatarFile}
//                         className={primaryBtn}
//                     >
//                         {savingAvatar ? (
//                             <Loader2 size={16} className="animate-spin" />
//                         ) : (
//                             <Download size={16} />
//                         )}
//                         Update
//                     </button>
//                 </div>
//             )}

//             {/* ========== PASSWORD ========== */}
//             {tab === "password" && (
//                 <form
//                     onSubmit={savePassword}
//                     className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6 space-y-5"
//                 >
//                     <Alert msg={pwMsg} />

//                     <Field label="Current Password" required>
//                         <PasswordInput
//                             value={pw.current}
//                             onChange={(e) => setPw({ ...pw, current: e.target.value })}
//                             placeholder="Current Password"
//                             autoComplete="current-password"
//                         />
//                     </Field>

//                     <Field label="New Password" required>
//                         <PasswordInput
//                             value={pw.next}
//                             onChange={(e) => setPw({ ...pw, next: e.target.value })}
//                             placeholder="New Password"
//                             autoComplete="new-password"
//                         />
//                         <p className="text-xs text-slate-400">
//                             8-32 characters with an uppercase letter, a lowercase letter and a number.
//                         </p>
//                     </Field>

//                     <Field label="Confirm Password" required>
//                         <PasswordInput
//                             value={pw.confirm}
//                             onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
//                             placeholder="Password Confirmation"
//                             autoComplete="new-password"
//                         />
//                     </Field>

//                     <button type="submit" disabled={savingPw} className={primaryBtn}>
//                         {savingPw ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
//                         Update
//                     </button>
//                 </form>
//             )}
//         </div>
//     );
// }















// "use client";

// import { useState, useRef, useEffect, useMemo } from "react";
// import { useAuth } from "@/context/AuthContext";
// import api from "@/lib/api";
// import {
//     User,
//     Image as ImageIcon,
//     Lock,
//     Eye,
//     EyeOff,
//     Download,
//     Loader2,
//     CheckCircle2,
//     AlertCircle,
// } from "lucide-react";

// const FILE_BASE = (process.env.NEXT_PUBLIC_FILE_URL || "https://hrms-15-4xfs.onrender.com").replace(/\/$/, "");

// /* Cloudinary ka full https URL ya purana "/uploads/..." path, dono sahi chalenge */
// const resolveAvatar = (a) => {
//     if (!a) return null;
//     if (/^(https?:|data:|blob:)/.test(a)) return a;
//     return `${FILE_BASE}${a.startsWith("/") ? "" : "/"}${a}`;
// };

// const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,32}$/;
// const PASSWORD_MESSAGE =
//     "Password must be 8-32 characters with an uppercase letter, a lowercase letter and a number.";

// const inputCls =
//     "w-full px-4 py-2.5 bg-slate-100/70 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed";

// const primaryBtn =
//     "inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold px-6 py-2.5 rounded-xl text-sm shadow-lg shadow-indigo-600/25 disabled:opacity-60 disabled:cursor-not-allowed transition-all w-full sm:w-auto";

// const COUNTRY_CODES = ["+91", "+1", "+44", "+880", "+971", "+61", "+65"];

// const splitName = (full = "") => {
//     const parts = full.trim().split(/\s+/).filter(Boolean);
//     return { first: parts[0] || "", last: parts.slice(1).join(" ") };
// };

// function Field({ label, required, children }) {
//     return (
//         <div className="space-y-1.5">
//             <label className="block text-sm text-slate-600">
//                 {label} {required && <span className="text-red-500">*</span>}
//             </label>
//             {children}
//         </div>
//     );
// }

// function Alert({ msg }) {
//     if (!msg.text) return null;
//     const ok = msg.type === "success";
//     return (
//         <div
//             className={`flex items-start gap-2.5 px-4 py-3 rounded-xl border text-sm font-medium ${ok
//                 ? "bg-emerald-50 border-emerald-200 text-emerald-800"
//                 : "bg-rose-50 border-rose-200 text-rose-800"
//                 }`}
//         >
//             {ok ? (
//                 <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
//             ) : (
//                 <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
//             )}
//             <span>{msg.text}</span>
//         </div>
//     );
// }

// function PasswordInput({ value, onChange, placeholder, autoComplete }) {
//     const [show, setShow] = useState(false);
//     return (
//         <div className="relative">
//             <input
//                 type={show ? "text" : "password"}
//                 value={value}
//                 onChange={onChange}
//                 placeholder={placeholder}
//                 autoComplete={autoComplete}
//                 required
//                 className={`${inputCls} pr-11`}
//             />
//             <button
//                 type="button"
//                 onClick={() => setShow((s) => !s)}
//                 className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
//                 aria-label={show ? "Hide password" : "Show password"}
//             >
//                 {show ? <EyeOff size={18} /> : <Eye size={18} />}
//             </button>
//         </div>
//     );
// }

// export default function ProfilePage() {
//     const { user, updateUser } = useAuth();
//     const [tab, setTab] = useState("personal");

//     // ---------- Personal ----------
//     const [form, setForm] = useState({
//         firstName: "",
//         lastName: "",
//         email: "",
//         countryCode: "+91",
//         phone: "",
//         gender: "",
//         address: "",
//         timezone: "",
//     });
//     const [personalMsg, setPersonalMsg] = useState({ type: "", text: "" });
//     const [savingPersonal, setSavingPersonal] = useState(false);

//     // ---------- Avatar ----------
//     const [avatarFile, setAvatarFile] = useState(null);
//     const [avatarPreview, setAvatarPreview] = useState(null);
//     const [avatarMsg, setAvatarMsg] = useState({ type: "", text: "" });
//     const [savingAvatar, setSavingAvatar] = useState(false);
//     const [avatarBroken, setAvatarBroken] = useState(false);
//     const fileRef = useRef(null);

//     // ---------- Password ----------
//     const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
//     const [pwMsg, setPwMsg] = useState({ type: "", text: "" });
//     const [savingPw, setSavingPw] = useState(false);

//     const timeZones = useMemo(() => {
//         try {
//             return Intl.supportedValuesOf("timeZone");
//         } catch {
//             return ["Asia/Kolkata", "UTC", "America/New_York", "Europe/London", "Asia/Dubai"];
//         }
//     }, []);

//     useEffect(() => {
//         if (!user) return;
//         const { first, last } = splitName(user.name);
//         setForm({
//             firstName: first,
//             lastName: last,
//             email: user.email || "",
//             countryCode: user.countryCode || "+91",
//             phone: user.phone || "",
//             gender: user.gender || "",
//             address: user.address || "",
//             timezone: user.timezone || "",
//         });
//     }, [user]);

//     // preview ka blob URL memory me na atke
//     useEffect(() => {
//         return () => {
//             if (avatarPreview) URL.revokeObjectURL(avatarPreview);
//         };
//     }, [avatarPreview]);

//     const savedAvatar = resolveAvatar(user?.avatar);
//     const avatarSrc = avatarPreview || savedAvatar;
//     useEffect(() => { setAvatarBroken(false); }, [avatarSrc]);

//     const initials = (user?.name || "U")
//         .split(" ")
//         .filter(Boolean)
//         .slice(0, 2)
//         .map((p) => p[0])
//         .join("")
//         .toUpperCase();

//     const emailEditable = user?.role === "admin";

//     const flash = (setter, type, text) => {
//         setter({ type, text });
//         if (type === "success") setTimeout(() => setter({ type: "", text: "" }), 4000);
//     };

//     // ---------- Handlers ----------
//     const savePersonal = async (e) => {
//         e.preventDefault();
//         setSavingPersonal(true);
//         setPersonalMsg({ type: "", text: "" });
//         try {
//             const res = await api.put("/auth/me", {
//                 name: `${form.firstName} ${form.lastName}`.trim(),
//                 email: form.email,
//                 countryCode: form.countryCode,
//                 phone: form.phone,
//                 gender: form.gender,
//                 address: form.address,
//                 timezone: form.timezone,
//             });
//             if (!res?.data) return; // 401/403: interceptor ne pehle hi toast dikha diya
//             updateUser(res.data.user);
//             flash(setPersonalMsg, "success", res.data.message || "Profile updated successfully");
//         } catch (err) {
//             flash(setPersonalMsg, "error", err.response?.data?.message || "Update failed");
//         } finally {
//             setSavingPersonal(false);
//         }
//     };

//     const pickAvatar = (e) => {
//         const file = e.target.files?.[0];
//         e.target.value = ""; // same file dobara chunne par bhi onChange chale
//         if (!file) return;
//         if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
//             return flash(setAvatarMsg, "error", "Please select a JPG, PNG or WebP image");
//         }
//         if (file.size > 2 * 1024 * 1024) {
//             return flash(setAvatarMsg, "error", "Image must be smaller than 2MB");
//         }
//         setAvatarMsg({ type: "", text: "" });
//         setAvatarFile(file);
//         setAvatarPreview(URL.createObjectURL(file));
//     };

//     const saveAvatar = async () => {
//         if (!avatarFile) return flash(setAvatarMsg, "error", "Please select an image first");
//         setSavingAvatar(true);
//         setAvatarMsg({ type: "", text: "" });
//         try {
//             const fd = new FormData();
//             fd.append("avatar", avatarFile);
//             const res = await api.put("/auth/me/avatar", fd);
//             if (!res?.data) return;
//             updateUser({ avatar: res.data.user.avatar }); // header, dashboard, sab jagah turant
//             setAvatarFile(null);
//             setAvatarPreview(null);
//             flash(setAvatarMsg, "success", res.data.message || "Avatar updated successfully");
//         } catch (err) {
//             console.error("saveAvatar error:", err);
//             flash(setAvatarMsg, "error", err.response?.data?.message || err.message || "Upload failed");
//         }
//         // } finally {
//         //     setSavingAvatar(false);
//         // }
//     };

//     const savePassword = async (e) => {
//         e.preventDefault();
//         setPwMsg({ type: "", text: "" });

//         if (!PASSWORD_REGEX.test(pw.next)) return flash(setPwMsg, "error", PASSWORD_MESSAGE);
//         if (pw.next !== pw.confirm)
//             return flash(setPwMsg, "error", "New password and confirm password do not match");

//         setSavingPw(true);
//         try {
//             const res = await api.put("/auth/change-password", {
//                 currentPassword: pw.current,
//                 newPassword: pw.next,
//                 confirmPassword: pw.confirm,
//             });
//             if (!res?.data) return;
//             setPw({ current: "", next: "", confirm: "" });
//             flash(setPwMsg, "success", res.data.message || "Password changed successfully");
//         } catch (err) {
//             flash(setPwMsg, "error", err.response?.data?.message || "Password change failed");
//         } finally {
//             setSavingPw(false);
//         }
//     };

//     const tabs = [
//         { id: "personal", label: "Personal Info", icon: User },
//         { id: "avatar", label: "Avatar Change", icon: ImageIcon },
//         { id: "password", label: "Password Change", icon: Lock },
//     ];

//     return (
//         <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 py-4 space-y-4">
//             <h1 className="text-xl sm:text-2xl font-semibold text-slate-700">Profile</h1>

//             {/* Tabs (mobile par horizontal scroll) */}
//             <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-2 sm:p-3">
//                 <div className="flex gap-1 overflow-x-auto no-scrollbar">
//                     {tabs.map(({ id, label, icon: Icon }) => {
//                         const active = tab === id;
//                         return (
//                             <button
//                                 key={id}
//                                 type="button"
//                                 onClick={() => setTab(id)}
//                                 className={`flex items-center gap-2 whitespace-nowrap px-3 sm:px-4 py-2 rounded-xl text-sm transition-all ${active
//                                     ? "bg-indigo-50 text-indigo-700 font-medium"
//                                     : "text-slate-500 hover:bg-slate-50"
//                                     }`}
//                             >
//                                 <Icon size={16} />
//                                 {label}
//                             </button>
//                         );
//                     })}
//                 </div>
//             </div>

//             {/* ========== PERSONAL INFO ========== */}
//             {tab === "personal" && (
//                 <form
//                     onSubmit={savePersonal}
//                     className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6 space-y-5"
//                 >
//                     <Alert msg={personalMsg} />

//                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
//                         <Field label="First Name" required>
//                             <input
//                                 required
//                                 value={form.firstName}
//                                 onChange={(e) => setForm({ ...form, firstName: e.target.value })}
//                                 className={inputCls}
//                             />
//                         </Field>

//                         <Field label="Last Name">
//                             <input
//                                 value={form.lastName}
//                                 onChange={(e) => setForm({ ...form, lastName: e.target.value })}
//                                 className={inputCls}
//                             />
//                         </Field>

//                         <Field label="Email Address" required>
//                             <input
//                                 type="email"
//                                 required
//                                 value={form.email}
//                                 disabled={!emailEditable}
//                                 onChange={(e) => setForm({ ...form, email: e.target.value })}
//                                 className={inputCls}
//                             />
//                             {!emailEditable && (
//                                 <p className="text-xs text-slate-400">Only admin can change the email.</p>
//                             )}
//                         </Field>

//                         <Field label="Phone Number">
//                             <div className="flex">
//                                 <select
//                                     value={form.countryCode}
//                                     onChange={(e) => setForm({ ...form, countryCode: e.target.value })}
//                                     className="px-2 sm:px-3 bg-slate-100/70 border border-r-0 border-slate-200 rounded-l-xl text-sm text-slate-700 outline-none focus:border-indigo-600"
//                                 >
//                                     {COUNTRY_CODES.map((c) => (
//                                         <option key={c} value={c}>
//                                             {c}
//                                         </option>
//                                     ))}
//                                 </select>
//                                 <input
//                                     type="tel"
//                                     inputMode="numeric"
//                                     value={form.phone}
//                                     onChange={(e) =>
//                                         setForm({ ...form, phone: e.target.value.replace(/[^\d]/g, "") })
//                                     }
//                                     maxLength={15}
//                                     placeholder="Phone number"
//                                     className={`${inputCls} rounded-l-none`}
//                                 />
//                             </div>
//                         </Field>

//                         <Field label="Gender">
//                             <div className="flex flex-wrap gap-3">
//                                 {["male", "female"].map((g) => (
//                                     <label
//                                         key={g}
//                                         className={`flex items-center gap-2 px-4 py-2 rounded-xl border cursor-pointer text-sm capitalize transition-all ${form.gender === g
//                                             ? "border-indigo-600 bg-indigo-50 text-indigo-700"
//                                             : "border-slate-200 bg-slate-100/70 text-slate-600"
//                                             }`}
//                                     >
//                                         <input
//                                             type="radio"
//                                             name="gender"
//                                             value={g}
//                                             checked={form.gender === g}
//                                             onChange={() => setForm({ ...form, gender: g })}
//                                             className="accent-indigo-600"
//                                         />
//                                         {g}
//                                     </label>
//                                 ))}
//                             </div>
//                         </Field>

//                         <Field label="Address">
//                             <textarea
//                                 rows={3}
//                                 value={form.address}
//                                 onChange={(e) => setForm({ ...form, address: e.target.value })}
//                                 placeholder="Address"
//                                 className={`${inputCls} resize-none`}
//                             />
//                         </Field>

//                         <Field label="Time Zone">
//                             <select
//                                 value={form.timezone}
//                                 onChange={(e) => setForm({ ...form, timezone: e.target.value })}
//                                 className={inputCls}
//                             >
//                                 <option value="">Choose a time zone</option>
//                                 {timeZones.map((tz) => (
//                                     <option key={tz} value={tz}>
//                                         {tz}
//                                     </option>
//                                 ))}
//                             </select>
//                         </Field>
//                     </div>

//                     <button type="submit" disabled={savingPersonal} className={primaryBtn}>
//                         {savingPersonal ? (
//                             <Loader2 size={16} className="animate-spin" />
//                         ) : (
//                             <Download size={16} />
//                         )}
//                         Update
//                     </button>
//                 </form>
//             )}

//             {/* ========== AVATAR ========== */}
//             {tab === "avatar" && (
//                 <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6 space-y-5">
//                     <Alert msg={avatarMsg} />
//                     <p className="text-sm text-slate-600">Change Picture</p>

//                     <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
//                         <button
//                             type="button"
//                             onClick={() => fileRef.current?.click()}
//                             className="w-24 h-24 rounded-xl overflow-hidden bg-gradient-to-tr from-indigo-600 to-violet-600 text-white text-3xl font-bold flex items-center justify-center ring-2 ring-slate-100 hover:opacity-90 transition shrink-0"
//                             title="Click to choose an image"
//                         >
//                             {avatarSrc && !avatarBroken ? (
//                                 <img
//                                     key={avatarSrc}
//                                     src={avatarSrc}
//                                     alt="Avatar"
//                                     onError={() => setAvatarBroken(true)}
//                                     className="w-full h-full object-cover"
//                                 />
//                             ) : (
//                                 initials
//                             )}
//                         </button>

//                         <input
//                             ref={fileRef}
//                             type="file"
//                             accept="image/png,image/jpeg,image/webp"
//                             onChange={pickAvatar}
//                             className="hidden"
//                         />

//                         <div className="text-sm text-slate-500 text-center sm:text-left space-y-1">
//                             <p>Recommended size: 100 X 100 PX</p>
//                             <p>File size: 2MB (JPG, PNG, WebP)</p>
//                             <button
//                                 type="button"
//                                 onClick={() => fileRef.current?.click()}
//                                 className="text-indigo-600 font-medium hover:underline"
//                             >
//                                 Choose image
//                             </button>
//                         </div>
//                     </div>

//                     <button
//                         type="button"
//                         onClick={saveAvatar}
//                         disabled={savingAvatar || !avatarFile}
//                         className={primaryBtn}
//                     >
//                         {savingAvatar ? (
//                             <Loader2 size={16} className="animate-spin" />
//                         ) : (
//                             <Download size={16} />
//                         )}
//                         Update
//                     </button>
//                 </div>
//             )}

//             {/* ========== PASSWORD ========== */}
//             {tab === "password" && (
//                 <form
//                     onSubmit={savePassword}
//                     className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6 space-y-5"
//                 >
//                     <Alert msg={pwMsg} />

//                     <Field label="Current Password" required>
//                         <PasswordInput
//                             value={pw.current}
//                             onChange={(e) => setPw({ ...pw, current: e.target.value })}
//                             placeholder="Current Password"
//                             autoComplete="current-password"
//                         />
//                     </Field>

//                     <Field label="New Password" required>
//                         <PasswordInput
//                             value={pw.next}
//                             onChange={(e) => setPw({ ...pw, next: e.target.value })}
//                             placeholder="New Password"
//                             autoComplete="new-password"
//                         />
//                         <p className="text-xs text-slate-400">
//                             8-32 characters with an uppercase letter, a lowercase letter and a number.
//                         </p>
//                     </Field>

//                     <Field label="Confirm Password" required>
//                         <PasswordInput
//                             value={pw.confirm}
//                             onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
//                             placeholder="Password Confirmation"
//                             autoComplete="new-password"
//                         />
//                     </Field>

//                     <button type="submit" disabled={savingPw} className={primaryBtn}>
//                         {savingPw ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
//                         Update
//                     </button>
//                 </form>
//             )}
//         </div>
//     );
// }







// "use client";

// import { useState, useRef, useEffect, useMemo } from "react";
// import { useAuth } from "@/context/AuthContext";
// import api from "@/lib/api";
// import {
//     User,
//     Image as ImageIcon,
//     Lock,
//     Eye,
//     EyeOff,
//     Download,
//     Loader2,
//     CheckCircle2,
//     AlertCircle,
// } from "lucide-react";

// const FILE_BASE = process.env.NEXT_PUBLIC_FILE_URL || "http://localhost:5000";

// const inputCls =
//     "w-full px-4 py-2.5 bg-slate-100/70 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed";

// const primaryBtn =
//     "inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold px-6 py-2.5 rounded-xl text-sm shadow-lg shadow-indigo-600/25 disabled:opacity-60 disabled:cursor-not-allowed transition-all w-full sm:w-auto";

// const COUNTRY_CODES = ["+91", "+1", "+44", "+880", "+971", "+61", "+65"];

// const splitName = (full = "") => {
//     const parts = full.trim().split(/\s+/).filter(Boolean);
//     return { first: parts[0] || "", last: parts.slice(1).join(" ") };
// };

// function Field({ label, required, children }) {
//     return (
//         <div className="space-y-1.5">
//             <label className="block text-sm text-slate-600">
//                 {label} {required && <span className="text-red-500">*</span>}
//             </label>
//             {children}
//         </div>
//     );
// }

// function Alert({ msg }) {
//     if (!msg.text) return null;
//     const ok = msg.type === "success";
//     return (
//         <div
//             className={`flex items-start gap-2.5 px-4 py-3 rounded-xl border text-sm font-medium ${ok
//                 ? "bg-emerald-50 border-emerald-200 text-emerald-800"
//                 : "bg-rose-50 border-rose-200 text-rose-800"
//                 }`}
//         >
//             {ok ? (
//                 <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
//             ) : (
//                 <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
//             )}
//             <span>{msg.text}</span>
//         </div>
//     );
// }

// function PasswordInput({ value, onChange, placeholder, autoComplete }) {
//     const [show, setShow] = useState(false);
//     return (
//         <div className="relative">
//             <input
//                 type={show ? "text" : "password"}
//                 value={value}
//                 onChange={onChange}
//                 placeholder={placeholder}
//                 autoComplete={autoComplete}
//                 required
//                 className={`${inputCls} pr-11`}
//             />
//             <button
//                 type="button"
//                 onClick={() => setShow((s) => !s)}
//                 className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
//                 aria-label={show ? "Hide password" : "Show password"}
//             >
//                 {show ? <EyeOff size={18} /> : <Eye size={18} />}
//             </button>
//         </div>
//     );
// }

// export default function ProfilePage() {
//     const { user, setUser } = useAuth();
//     const [tab, setTab] = useState("personal");

//     // ---------- Personal ----------
//     const [form, setForm] = useState({
//         firstName: "",
//         lastName: "",
//         email: "",
//         countryCode: "+91",
//         phone: "",
//         gender: "",
//         address: "",
//         timezone: "",
//     });
//     const [personalMsg, setPersonalMsg] = useState({ type: "", text: "" });
//     const [savingPersonal, setSavingPersonal] = useState(false);

//     // ---------- Avatar ----------
//     const [avatarFile, setAvatarFile] = useState(null);
//     const [avatarPreview, setAvatarPreview] = useState(null);
//     const [avatarMsg, setAvatarMsg] = useState({ type: "", text: "" });
//     const [savingAvatar, setSavingAvatar] = useState(false);
//     const fileRef = useRef(null);

//     // ---------- Password ----------
//     const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
//     const [pwMsg, setPwMsg] = useState({ type: "", text: "" });
//     const [savingPw, setSavingPw] = useState(false);

//     const timeZones = useMemo(() => {
//         try {
//             return Intl.supportedValuesOf("timeZone");
//         } catch {
//             return ["Asia/Kolkata", "UTC", "America/New_York", "Europe/London", "Asia/Dubai"];
//         }
//     }, []);

//     useEffect(() => {
//         if (!user) return;
//         const { first, last } = splitName(user.name);
//         setForm({
//             firstName: first,
//             lastName: last,
//             email: user.email || "",
//             countryCode: user.countryCode || "+91",
//             phone: user.phone || "",
//             gender: user.gender || "",
//             address: user.address || "",
//             timezone: user.timezone || "",
//         });
//     }, [user]);

//     const avatarSrc =
//         avatarPreview || (user?.avatar ? `${FILE_BASE}${user.avatar}` : null);
//     const initials = (user?.name || "U")
//         .split(" ")
//         .filter(Boolean)
//         .slice(0, 2)
//         .map((p) => p[0])
//         .join("")
//         .toUpperCase();

//     const emailEditable = user?.role === "admin";

//     const flash = (setter, type, text) => {
//         setter({ type, text });
//         if (type === "success") setTimeout(() => setter({ type: "", text: "" }), 4000);
//     };

//     // ---------- Handlers ----------
//     const savePersonal = async (e) => {
//         e.preventDefault();
//         setSavingPersonal(true);
//         setPersonalMsg({ type: "", text: "" });
//         try {
//             const { data } = await api.put("/auth/me", {
//                 name: `${form.firstName} ${form.lastName}`.trim(),
//                 email: form.email,
//                 countryCode: form.countryCode,
//                 phone: form.phone,
//                 gender: form.gender,
//                 address: form.address,
//                 timezone: form.timezone,
//             });
//             setUser?.(data.user);
//             flash(setPersonalMsg, "success", data.message || "Profile update ho gayi");
//         } catch (err) {
//             flash(setPersonalMsg, "error", err.response?.data?.message || "Update fail ho gaya");
//         } finally {
//             setSavingPersonal(false);
//         }
//     };

//     const pickAvatar = (e) => {
//         const file = e.target.files?.[0];
//         if (!file) return;
//         if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
//             return flash(setAvatarMsg, "error", "Sirf JPG, PNG ya WebP image select karo");
//         }
//         if (file.size > 2 * 1024 * 1024) {
//             return flash(setAvatarMsg, "error", "Image 2MB se chhoti honi chahiye");
//         }
//         setAvatarMsg({ type: "", text: "" });
//         setAvatarFile(file);
//         setAvatarPreview(URL.createObjectURL(file));
//     };

//     const saveAvatar = async () => {
//         if (!avatarFile) return flash(setAvatarMsg, "error", "Pehle image select karo");
//         setSavingAvatar(true);
//         try {
//             const fd = new FormData();
//             fd.append("avatar", avatarFile);
//             const { data } = await api.put("/auth/me/avatar", fd);
//             setUser?.(data.user);
//             setAvatarFile(null);
//             setAvatarPreview(null);
//             flash(setAvatarMsg, "success", data.message || "Avatar update ho gaya");
//         } catch (err) {
//             flash(setAvatarMsg, "error", err.response?.data?.message || "Upload fail ho gaya");
//         } finally {
//             setSavingAvatar(false);
//         }
//     };

//     const savePassword = async (e) => {
//         e.preventDefault();
//         setPwMsg({ type: "", text: "" });

//         if (pw.next.length < 8)
//             return flash(setPwMsg, "error", "New password kam se kam 8 character ka ho");
//         if (pw.next !== pw.confirm)
//             return flash(setPwMsg, "error", "New aur Confirm password match nahi karte");

//         setSavingPw(true);
//         try {
//             const { data } = await api.put("/auth/change-password", {
//                 currentPassword: pw.current,
//                 newPassword: pw.next,
//                 confirmPassword: pw.confirm,
//             });
//             setPw({ current: "", next: "", confirm: "" });
//             flash(setPwMsg, "success", data.message || "Password change ho gaya");
//         } catch (err) {
//             flash(setPwMsg, "error", err.response?.data?.message || "Password change fail ho gaya");
//         } finally {
//             setSavingPw(false);
//         }
//     };

//     const tabs = [
//         { id: "personal", label: "Personal Info", icon: User },
//         { id: "avatar", label: "Avatar Change", icon: ImageIcon },
//         { id: "password", label: "Password Change", icon: Lock },
//     ];

//     return (
//         <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 py-4 space-y-4">
//             <h1 className="text-xl sm:text-2xl font-semibold text-slate-700">Profile</h1>

//             {/* Tabs (mobile par horizontal scroll) */}
//             <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-2 sm:p-3">
//                 <div className="flex gap-1 overflow-x-auto no-scrollbar">
//                     {tabs.map(({ id, label, icon: Icon }) => {
//                         const active = tab === id;
//                         return (
//                             <button
//                                 key={id}
//                                 type="button"
//                                 onClick={() => setTab(id)}
//                                 className={`flex items-center gap-2 whitespace-nowrap px-3 sm:px-4 py-2 rounded-xl text-sm transition-all ${active
//                                     ? "bg-indigo-50 text-indigo-700 font-medium"
//                                     : "text-slate-500 hover:bg-slate-50"
//                                     }`}
//                             >
//                                 <Icon size={16} />
//                                 {label}
//                             </button>
//                         );
//                     })}
//                 </div>
//             </div>

//             {/* ========== PERSONAL INFO ========== */}
//             {tab === "personal" && (
//                 <form
//                     onSubmit={savePersonal}
//                     className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6 space-y-5"
//                 >
//                     <Alert msg={personalMsg} />

//                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
//                         <Field label="First Name" required>
//                             <input
//                                 required
//                                 value={form.firstName}
//                                 onChange={(e) => setForm({ ...form, firstName: e.target.value })}
//                                 className={inputCls}
//                             />
//                         </Field>

//                         <Field label="Last Name">
//                             <input
//                                 value={form.lastName}
//                                 onChange={(e) => setForm({ ...form, lastName: e.target.value })}
//                                 className={inputCls}
//                             />
//                         </Field>

//                         <Field label="Email Address" required>
//                             <input
//                                 type="email"
//                                 required
//                                 value={form.email}
//                                 disabled={!emailEditable}
//                                 onChange={(e) => setForm({ ...form, email: e.target.value })}
//                                 className={inputCls}
//                             />
//                             {!emailEditable && (
//                                 <p className="text-xs text-slate-400">Email sirf admin badal sakta hai.</p>
//                             )}
//                         </Field>

//                         <Field label="Phone Number">
//                             <div className="flex">
//                                 <select
//                                     value={form.countryCode}
//                                     onChange={(e) => setForm({ ...form, countryCode: e.target.value })}
//                                     className="px-2 sm:px-3 bg-slate-100/70 border border-r-0 border-slate-200 rounded-l-xl text-sm text-slate-700 outline-none focus:border-indigo-600"
//                                 >
//                                     {COUNTRY_CODES.map((c) => (
//                                         <option key={c} value={c}>
//                                             {c}
//                                         </option>
//                                     ))}
//                                 </select>
//                                 <input
//                                     type="tel"
//                                     inputMode="numeric"
//                                     value={form.phone}
//                                     onChange={(e) =>
//                                         setForm({ ...form, phone: e.target.value.replace(/[^\d]/g, "") })
//                                     }
//                                     maxLength={15}
//                                     placeholder="Phone number"
//                                     className={`${inputCls} rounded-l-none`}
//                                 />
//                             </div>
//                         </Field>

//                         <Field label="Gender">
//                             <div className="flex flex-wrap gap-3">
//                                 {["male", "female"].map((g) => (
//                                     <label
//                                         key={g}
//                                         className={`flex items-center gap-2 px-4 py-2 rounded-xl border cursor-pointer text-sm capitalize transition-all ${form.gender === g
//                                             ? "border-indigo-600 bg-indigo-50 text-indigo-700"
//                                             : "border-slate-200 bg-slate-100/70 text-slate-600"
//                                             }`}
//                                     >
//                                         <input
//                                             type="radio"
//                                             name="gender"
//                                             value={g}
//                                             checked={form.gender === g}
//                                             onChange={() => setForm({ ...form, gender: g })}
//                                             className="accent-indigo-600"
//                                         />
//                                         {g}
//                                     </label>
//                                 ))}
//                             </div>
//                         </Field>

//                         <Field label="Address">
//                             <textarea
//                                 rows={3}
//                                 value={form.address}
//                                 onChange={(e) => setForm({ ...form, address: e.target.value })}
//                                 placeholder="Address"
//                                 className={`${inputCls} resize-none`}
//                             />
//                         </Field>

//                         <Field label="Time Zone">
//                             <select
//                                 value={form.timezone}
//                                 onChange={(e) => setForm({ ...form, timezone: e.target.value })}
//                                 className={inputCls}
//                             >
//                                 <option value="">Choose a time zone</option>
//                                 {timeZones.map((tz) => (
//                                     <option key={tz} value={tz}>
//                                         {tz}
//                                     </option>
//                                 ))}
//                             </select>
//                         </Field>
//                     </div>

//                     <button type="submit" disabled={savingPersonal} className={primaryBtn}>
//                         {savingPersonal ? (
//                             <Loader2 size={16} className="animate-spin" />
//                         ) : (
//                             <Download size={16} />
//                         )}
//                         Update
//                     </button>
//                 </form>
//             )}

//             {/* ========== AVATAR ========== */}
//             {tab === "avatar" && (
//                 <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6 space-y-5">
//                     <Alert msg={avatarMsg} />
//                     <p className="text-sm text-slate-600">Change Picture</p>

//                     <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
//                         <button
//                             type="button"
//                             onClick={() => fileRef.current?.click()}
//                             className="w-24 h-24 rounded-xl overflow-hidden bg-gradient-to-tr from-indigo-600 to-violet-600 text-white text-3xl font-bold flex items-center justify-center ring-2 ring-slate-100 hover:opacity-90 transition shrink-0"
//                             title="Click karke image chuno"
//                         >
//                             {avatarSrc ? (
//                                 <img src={avatarSrc} alt="Avatar" className="w-full h-full object-cover" />
//                             ) : (
//                                 initials
//                             )}
//                         </button>

//                         <input
//                             ref={fileRef}
//                             type="file"
//                             accept="image/png,image/jpeg,image/webp"
//                             onChange={pickAvatar}
//                             className="hidden"
//                         />

//                         <div className="text-sm text-slate-500 text-center sm:text-left space-y-1">
//                             <p>Recommended size: 100 X 100 PX</p>
//                             <p>File size: 2MB (JPG, PNG, WebP)</p>
//                             <button
//                                 type="button"
//                                 onClick={() => fileRef.current?.click()}
//                                 className="text-indigo-600 font-medium hover:underline"
//                             >
//                                 Image choose karo
//                             </button>
//                         </div>
//                     </div>

//                     <button
//                         type="button"
//                         onClick={saveAvatar}
//                         disabled={savingAvatar || !avatarFile}
//                         className={primaryBtn}
//                     >
//                         {savingAvatar ? (
//                             <Loader2 size={16} className="animate-spin" />
//                         ) : (
//                             <Download size={16} />
//                         )}
//                         Update
//                     </button>
//                 </div>
//             )}

//             {/* ========== PASSWORD ========== */}
//             {tab === "password" && (
//                 <form
//                     onSubmit={savePassword}
//                     className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6 space-y-5"
//                 >
//                     <Alert msg={pwMsg} />

//                     <Field label="Current Password" required>
//                         <PasswordInput
//                             value={pw.current}
//                             onChange={(e) => setPw({ ...pw, current: e.target.value })}
//                             placeholder="Current Password"
//                             autoComplete="current-password"
//                         />
//                     </Field>

//                     <Field label="New Password" required>
//                         <PasswordInput
//                             value={pw.next}
//                             onChange={(e) => setPw({ ...pw, next: e.target.value })}
//                             placeholder="New Password"
//                             autoComplete="new-password"
//                         />
//                         <p className="text-xs text-slate-400">Kam se kam 8 character.</p>
//                     </Field>

//                     <Field label="Confirm Password" required>
//                         <PasswordInput
//                             value={pw.confirm}
//                             onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
//                             placeholder="Password Confirmation"
//                             autoComplete="new-password"
//                         />
//                     </Field>

//                     <button type="submit" disabled={savingPw} className={primaryBtn}>
//                         {savingPw ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
//                         Update
//                     </button>
//                 </form>
//             )}
//         </div>
//     );
// }













// "use client";

// import { useState, useRef, useEffect } from "react";
// import { useAuth } from "@/context/AuthContext";
// import api from "@/lib/api";
// import {
//     User,
//     Mail,
//     ShieldCheck,
//     Hash,
//     Loader2,
//     Camera,
//     CheckCircle2,
//     Sparkles,
//     AlertCircle
// } from "lucide-react";

// const roleBadge = (role) => {
//     const map = {
//         admin: {
//             label: "Super Admin",
//             badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200/70 ring-indigo-500/10",
//             accentDot: "bg-indigo-500"
//         },
//         hr: {
//             label: "HR Administrator",
//             badgeClass: "bg-violet-50 text-violet-700 border-violet-200/70 ring-violet-500/10",
//             accentDot: "bg-violet-500"
//         },
//         manager: {
//             label: "Team Manager",
//             badgeClass: "bg-sky-50 text-sky-700 border-sky-200/70 ring-sky-500/10",
//             accentDot: "bg-sky-500"
//         },
//         employee: {
//             label: "Staff Member",
//             badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200/70 ring-emerald-500/10",
//             accentDot: "bg-emerald-500"
//         }
//     };

//     return map[role] || {
//         label: "Authorized User",
//         badgeClass: "bg-slate-100 text-slate-700 border-slate-200 ring-slate-500/10",
//         accentDot: "bg-slate-500"
//     };
// };

// const getInitials = (name) => {
//     if (!name) return "U";
//     const parts = name.trim().split(" ").filter(Boolean);
//     return parts.length > 1
//         ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
//         : parts[0].slice(0, 2).toUpperCase();
// };

// export default function ProfilePage() {
//     const { user } = useAuth();

//     const [form, setForm] = useState({
//         name: "",
//         email: ""
//     });

//     const [avatarPreview, setAvatarPreview] = useState(null);
//     const [avatarFile, setAvatarFile] = useState(null);
//     const [saving, setSaving] = useState(false);
//     const [statusMessage, setStatusMessage] = useState({ type: "", text: "" });

//     const fileInputRef = useRef(null);
//     const badge = roleBadge(user?.role);
//     const initials = getInitials(form.name || user?.name);

//     // Sync user credentials to form state
//     useEffect(() => {
//         if (user) {
//             setForm({
//                 name: user.name || "",
//                 email: user.email || ""
//             });

//             const localKey = `profile_avatar_${user._id}`;
//             const savedAvatar = localStorage.getItem(localKey);

//             if (savedAvatar) {
//                 setAvatarPreview(savedAvatar);
//             } else if (user.avatar) {
//                 setAvatarPreview(user.avatar);
//             }
//         }
//     }, [user]);

//     const handleImageChange = (e) => {
//         const file = e.target.files?.[0];
//         if (!file) return;

//         if (!file.type.startsWith("image/")) {
//             setStatusMessage({ type: "error", text: "Please select an image file (PNG, JPG, WebP)." });
//             return;
//         }

//         if (file.size > 5 * 1024 * 1024) {
//             setStatusMessage({ type: "error", text: "Image size must not exceed 5 MB." });
//             return;
//         }

//         setAvatarFile(file);

//         const reader = new FileReader();
//         reader.onloadend = () => {
//             const result = reader.result;
//             setAvatarPreview(result);
//             if (user?._id) {
//                 localStorage.setItem(`profile_avatar_${user._id}`, result);
//             }
//         };
//         reader.readAsDataURL(file);
//     };

//     const handleSave = async (e) => {
//         e.preventDefault();
//         setSaving(true);
//         setStatusMessage({ type: "", text: "" });

//         try {
//             const formData = new FormData();
//             formData.append("name", form.name);
//             formData.append("email", form.email);

//             if (avatarFile) {
//                 formData.append("avatar", avatarFile);
//             }

//             if (api && api.put) {
//                 await api.put("/auth/me", formData);
//             }

//             setStatusMessage({
//                 type: "success",
//                 text: "Your profile information has been saved successfully."
//             });

//             setTimeout(() => {
//                 setStatusMessage({ type: "", text: "" });
//             }, 4000);
//         } catch (err) {
//             setStatusMessage({
//                 type: "error",
//                 text: err.response?.data?.message || "Failed to update profile details. Please try again."
//             });
//         } finally {
//             setSaving(false);
//         }
//     };

//     return (
//         <div className="max-w-4xl mx-auto px-4 sm:px-2 lg:px-2 py-4 space-y-4">
//             {/* Top Title Banner */}
//             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-5">
//                 <div>
//                     <div className="flex items-center gap-2">
//                         <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
//                             My Profile
//                         </h1>
//                         <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
//                             <Sparkles size={12} /> Account Hub
//                         </span>
//                     </div>
//                     <p className="text-sm font-medium text-slate-500 mt-1">
//                         Review your credential parameters, manage photo assets, and modify personal identity records.
//                     </p>
//                 </div>
//             </div>

//             {/* Main Profile Summary Card */}
//             <div className="relative overflow-hidden bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8 transition-all hover:shadow-md">
//                 <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
//                     {/* Avatar Section */}
//                     <div className="relative group shrink-0">
//                         <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-600 text-white font-black text-3xl flex items-center justify-center shadow-lg shadow-indigo-500/10 border-2 border-white ring-2 ring-slate-100 transition-transform group-hover:scale-[1.02]">
//                             {avatarPreview ? (
//                                 <img
//                                     src={avatarPreview}
//                                     alt={form.name || "User Profile"}
//                                     className="w-full h-full object-cover"
//                                 />
//                             ) : (
//                                 <span className="tracking-wide select-none">{initials}</span>
//                             )}
//                         </div>

//                         <input
//                             type="file"
//                             ref={fileInputRef}
//                             onChange={handleImageChange}
//                             accept="image/*"
//                             className="hidden"
//                         />

//                         <button
//                             type="button"
//                             onClick={() => fileInputRef.current?.click()}
//                             className="absolute -bottom-1.5 -right-1.5 p-2 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white shadow-md transition-all duration-200 hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600"
//                             title="Update profile avatar"
//                         >
//                             <Camera size={16} />
//                         </button>
//                     </div>

//                     {/* User Meta Data */}
//                     <div className="text-center sm:text-left flex-1 min-w-0">
//                         <div className="flex flex-col sm:flex-row sm:items-center gap-2">
//                             <h2 className="text-xl sm:text-2xl font-bold text-slate-900 truncate">
//                                 {form.name || "Personnel User"}
//                             </h2>
//                             <span
//                                 className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold border ring-1 self-center sm:self-auto ${badge.badgeClass}`}
//                             >
//                                 <span className={`w-1.5 h-1.5 rounded-full ${badge.accentDot}`} />
//                                 {badge.label}
//                             </span>
//                         </div>

//                         <p className="text-sm font-semibold text-slate-500 mt-1 truncate">
//                             {form.email || "No email assigned"}
//                         </p>

//                         <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs font-medium text-slate-500">
//                             <span className="flex items-center gap-1.5">
//                                 <ShieldCheck size={14} className="text-emerald-500" />
//                                 Email Verified
//                             </span>
//                             <span className="flex items-center gap-1.5">
//                                 <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
//                                 Active Session
//                             </span>
//                         </div>
//                     </div>
//                 </div>
//             </div>

//             {/* Editable Form Card */}
//             <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8 space-y-6">
//                 <div className="border-b border-slate-100 pb-4">
//                     <h3 className="text-lg font-bold text-slate-900">
//                         Account Information
//                     </h3>
//                     <p className="text-xs font-medium text-slate-500 mt-0.5">
//                         Modify your primary identification fields. Immutable technical parameters cannot be directly modified.
//                     </p>
//                 </div>

//                 {/* Feedback Alert Toast */}
//                 {statusMessage.text && (
//                     <div
//                         className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-semibold transition-all ${statusMessage.type === "success"
//                             ? "bg-emerald-50 border-emerald-200 text-emerald-800"
//                             : "bg-rose-50 border-rose-200 text-rose-800"
//                             }`}
//                     >
//                         {statusMessage.type === "success" ? (
//                             <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
//                         ) : (
//                             <AlertCircle size={18} className="text-rose-600 shrink-0" />
//                         )}
//                         <span>{statusMessage.text}</span>
//                     </div>
//                 )}

//                 <form onSubmit={handleSave} className="space-y-6">
//                     {/* Editable Fields */}
//                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
//                         <div className="space-y-1.5">
//                             <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
//                                 <User size={14} className="text-indigo-600" />
//                                 Full Legal Name
//                             </label>
//                             <input
//                                 type="text"
//                                 required
//                                 value={form.name}
//                                 onChange={(e) => setForm({ ...form, name: e.target.value })}
//                                 placeholder="e.g. Alexander Vance"
//                                 className="w-full px-4 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 outline-none transition-all"
//                             />
//                         </div>

//                         <div className="space-y-1.5">
//                             <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
//                                 <Mail size={14} className="text-indigo-600" />
//                                 Corporate Email Address
//                             </label>
//                             <input
//                                 type="email"
//                                 required
//                                 value={form.email}
//                                 onChange={(e) => setForm({ ...form, email: e.target.value })}
//                                 placeholder="name@company.com"
//                                 className="w-full px-4 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 outline-none transition-all"
//                             />
//                         </div>
//                     </div>

//                     {/* Read-Only System Parameters */}
//                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
//                         <div className="space-y-1.5">
//                             <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
//                                 <ShieldCheck size={14} className="text-slate-400" />
//                                 Authorized Tier
//                             </label>
//                             <input
//                                 value={badge.label}
//                                 disabled
//                                 className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold bg-slate-100/80 text-slate-600 cursor-not-allowed select-none"
//                             />
//                         </div>

//                         <div className="space-y-1.5">
//                             <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
//                                 <Hash size={14} className="text-slate-400" />
//                                 System UUID
//                             </label>
//                             <input
//                                 value={user?._id || "Unavailable"}
//                                 disabled
//                                 className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-mono font-bold bg-slate-100/80 text-slate-600 cursor-not-allowed select-none truncate"
//                             />
//                         </div>
//                     </div>

//                     {/* Submit Action Bar */}
//                     <div className="flex items-center justify-end pt-5 border-t border-slate-100">
//                         <button
//                             type="submit"
//                             disabled={saving}
//                             className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold px-7 py-3 rounded-xl text-sm shadow-md shadow-indigo-600/20 hover:shadow-indigo-600/30 disabled:opacity-50 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-indigo-600/20"
//                         >
//                             {saving ? (
//                                 <>
//                                     <Loader2 size={16} className="animate-spin" />
//                                     <span>Saving Updates...</span>
//                                 </>
//                             ) : (
//                                 <span>Save Profile Changes</span>
//                             )}
//                         </button>
//                     </div>
//                 </form>
//             </div>
//         </div>
//     );
// }
