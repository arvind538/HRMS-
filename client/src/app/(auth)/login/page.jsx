"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Mail, Lock, Eye, EyeOff, AlertCircle } from "lucide-react";
import { toast } from "react-toastify";
import { useAuth } from "@/context/AuthContext";
import AuthShell, { AuthField, AuthButton } from "@/components/auth/AuthShell";

const REMEMBER_KEY = "hrms_remember_email";
const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

const friendlyError = (err) => {
    if (err?.response?.status === 401) return "Email or Password is incorrect. Please check and try again.";
    if (err?.response?.status === 403) return err?.response?.data?.message || "Your account is closed. Contact the admin.";
    if (err?.response?.status === 429) return "Too many attempts have been made. Try again after a while.";
    if (err?.response?.status >= 500) return "There is some problem with the server.Try again after a while";
    if (err?.code === "ERR_NETWORK") return "Unable to connect to the server. Please check your internet or the server.";
    if (err?.code === "ECONNABORTED") return "The server did not respond in time. Try again.";
    return err?.response?.data?.message || err?.message || "Login failed. Try again.";
};

export default function LoginPage() {
    const { login } = useAuth();
    const [form, setForm] = useState({ email: "", password: "" });
    const [remember, setRemember] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState({});
    const [formError, setFormError] = useState("");
    const [loading, setLoading] = useState(false);

    /* Saved email fill karo agar "Remember me" pehle use hua tha */
    useEffect(() => {
        try {
            const saved = localStorage.getItem(REMEMBER_KEY);
            if (saved) {
                setForm((prev) => ({ ...prev, email: saved }));
                setRemember(true);
            }
        } catch { }
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setErrors((prev) => ({ ...prev, [name]: "" }));
        setFormError("");
        setForm((prev) => ({
            ...prev,
            [name]: name === "email" ? value.replace(/\s/g, "") : value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (loading) return;

        const email = form.email.trim().toLowerCase();
        const password = form.password;

        const next = {};
        if (!email) next.email = "Email address is required";
        else if (!EMAIL_REGEX.test(email)) next.email = "Please enter a valid email address";
        if (!password) next.password = "Password is required";

        setErrors(next);
        setFormError("");
        if (Object.keys(next).length) return;

        setLoading(true);
        try {
            await login(email, password);

            try {
                if (remember) localStorage.setItem(REMEMBER_KEY, email);
                else localStorage.removeItem(REMEMBER_KEY);
            } catch { }

            toast.success("Login successful!");
        } catch (err) {
            /* Error aane par button wapas enable hota hai, password khali hota hai aur focus wahin jata hai */
            const message = friendlyError(err);
            setFormError(message);
            setForm((prev) => ({ ...prev, password: "" }));
            setTimeout(() => document.getElementById("password")?.focus(), 0);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthShell
            title="Welcome back"
            subtitle="Please sign in to continue"
            footer="Don't have an account? Please contact your HR or admin."
        >
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
                {formError && (
                    <div
                        role="alert"
                        className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm font-medium text-rose-700"
                    >
                        <AlertCircle size={17} className="mt-0.5 shrink-0 text-rose-500" />
                        <span>{formError}</span>
                    </div>
                )}

                <AuthField
                    id="email"
                    name="email"
                    type="email"
                    label="Email"
                    icon={Mail}
                    placeholder="Email"
                    autoComplete="email"
                    inputMode="email"
                    value={form.email}
                    onChange={handleChange}
                    error={errors.email}
                    disabled={loading}
                />

                <AuthField
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    label="Password"
                    icon={Lock}
                    placeholder="Password"
                    autoComplete="current-password"
                    value={form.password}
                    onChange={handleChange}
                    error={errors.password}
                    disabled={loading}
                    right={
                        <button
                            type="button"
                            onClick={() => setShowPassword((s) => !s)}
                            className="p-1.5 text-slate-400 transition hover:text-slate-600"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                        </button>
                    }
                />

                <div className="flex items-center justify-between gap-3">
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                        <input
                            type="checkbox"
                            checked={remember}
                            onChange={(e) => setRemember(e.target.checked)}
                            disabled={loading}
                            className="h-4 w-4 rounded border-slate-300 accent-indigo-600"
                        />
                        Remember me
                    </label>
                    <Link href="/forgot-password" className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
                        Forgot Password
                    </Link>
                </div>

                <AuthButton type="submit" loading={loading} loadingText="Signing in...">
                    Sign In
                </AuthButton>
            </form>
        </AuthShell>
    );
}


