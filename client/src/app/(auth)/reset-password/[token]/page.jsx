"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Lock, Eye, EyeOff, CheckCircle2, Circle, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "react-toastify";
import api from "@/lib/api";
import AuthShell, { AuthField, AuthButton } from "@/components/auth/AuthShell";

const RULES = [
    { id: "len", label: "8 to 32 characters", test: (p) => p.length >= 8 && p.length <= 32 },
    { id: "upper", label: "One uppercase letter", test: (p) => /[A-Z]/.test(p) },
    { id: "lower", label: "One lowercase letter", test: (p) => /[a-z]/.test(p) },
    { id: "num", label: "One number", test: (p) => /\d/.test(p) },
];

export default function ResetPasswordPage() {
    const router = useRouter();
    const params = useParams();
    const token = Array.isArray(params?.token) ? params.token[0] : params?.token;

    const [status, setStatus] = useState("checking"); // checking | ready | invalid | done
    const [form, setForm] = useState({ password: "", confirmPassword: "" });
    const [show, setShow] = useState({ password: false, confirmPassword: false });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    /* Check the link as soon as the page opens */
    useEffect(() => {
        if (!token) return;
        let active = true;
        api
            .get(`/auth/reset-password/${token}/verify`)
            .then(() => active && setStatus("ready"))
            .catch(() => active && setStatus("invalid"));
        return () => {
            active = false;
        };
    }, [token]);

    /* Go to login automatically after success */
    useEffect(() => {
        if (status !== "done") return;
        const timer = setTimeout(() => router.replace("/login"), 3500);
        return () => clearTimeout(timer);
    }, [status, router]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setErrors((prev) => ({ ...prev, [name]: "" }));
        setForm((prev) => ({ ...prev, [name]: value.replace(/\s/g, "").slice(0, 32) }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (loading) return;

        const next = {};
        if (!RULES.every((r) => r.test(form.password))) next.password = "Password does not meet all the requirements";
        if (!form.confirmPassword) next.confirmPassword = "Please confirm your password";
        else if (form.confirmPassword !== form.password) next.confirmPassword = "Passwords do not match";

        setErrors(next);
        if (Object.keys(next).length) return;

        setLoading(true);
        try {
            await api.post(`/auth/reset-password/${token}`, form);
            toast.success("Password updated successfully!");
            setStatus("done");
        } catch (err) {
            if (err?.response?.data?.code === "INVALID_TOKEN") {
                setStatus("invalid");
            } else {
                toast.error(
                    err?.response?.data?.message ||
                    (err?.response ? "Unable to reset the password. Please try again." : "Unable to reach the server. Please try again.")
                );
            }
        } finally {
            setLoading(false);
        }
    };

    const eye = (key) => (
        <button
            type="button"
            onClick={() => setShow((s) => ({ ...s, [key]: !s[key] }))}
            className="p-1.5 text-slate-400 transition hover:text-slate-600"
            aria-label={show[key] ? "Hide password" : "Show password"}
        >
            {show[key] ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
    );

    /* Checking */
    if (status === "checking") {
        return (
            <AuthShell title="Reset Password">
                <div className="flex flex-col items-center gap-3 py-8">
                    <Loader2 size={28} className="animate-spin text-indigo-600" />
                    <p className="text-sm text-slate-400">Checking your reset link...</p>
                </div>
            </AuthShell>
        );
    }

    /* Invalid or expired */
    if (status === "invalid") {
        return (
            <AuthShell title="Link expired">
                <div className="space-y-5 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500">
                        <ShieldAlert size={30} />
                    </div>
                    <p className="text-sm leading-relaxed text-slate-500">
                        This reset link is invalid or has expired. Please request a new one.
                    </p>
                    <Link
                        href="/forgot-password"
                        className="flex h-12 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-500 to-indigo-700 text-sm font-bold text-white shadow-lg shadow-indigo-500/30"
                    >
                        Request a new link
                    </Link>
                    <Link href="/login" className="block text-sm text-slate-500 hover:text-slate-700">
                        Back to login
                    </Link>
                </div>
            </AuthShell>
        );
    }

    /* Success */
    if (status === "done") {
        return (
            <AuthShell title="Password updated">
                <div className="space-y-5 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                        <CheckCircle2 size={32} />
                    </div>
                    <p className="text-sm leading-relaxed text-slate-500">
                        Your password has been changed. Please login with your new password.
                    </p>
                    <Link
                        href="/login"
                        className="flex h-12 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-500 to-indigo-700 text-sm font-bold text-white shadow-lg shadow-indigo-500/30"
                    >
                        Go to login
                    </Link>
                    <p className="text-xs text-slate-400">Redirecting to login...</p>
                </div>
            </AuthShell>
        );
    }

    /* Form */
    return (
        <AuthShell title="Reset Password" subtitle="Create a new password for your account">
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
                <AuthField
                    id="password"
                    name="password"
                    type={show.password ? "text" : "password"}
                    label="New Password"
                    icon={Lock}
                    placeholder="New password"
                    autoComplete="new-password"
                    maxLength={32}
                    value={form.password}
                    onChange={handleChange}
                    error={errors.password}
                    right={eye("password")}
                />

                <ul className="grid grid-cols-1 gap-1.5 rounded-2xl bg-[#F5F5FB] p-3.5 sm:grid-cols-2">
                    {RULES.map((rule) => {
                        const ok = rule.test(form.password);
                        return (
                            <li
                                key={rule.id}
                                className={`flex items-center gap-2 text-xs font-medium ${ok ? "text-emerald-600" : "text-slate-400"}`}
                            >
                                {ok ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                                {rule.label}
                            </li>
                        );
                    })}
                </ul>

                <AuthField
                    id="confirmPassword"
                    name="confirmPassword"
                    type={show.confirmPassword ? "text" : "password"}
                    label="Confirm Password"
                    icon={Lock}
                    placeholder="Confirm password"
                    autoComplete="new-password"
                    maxLength={32}
                    value={form.confirmPassword}
                    onChange={handleChange}
                    error={errors.confirmPassword}
                    right={eye("confirmPassword")}
                />

                <AuthButton type="submit" loading={loading} loadingText="Updating..." withArrow={false}>
                    Reset password
                </AuthButton>
            </form>
        </AuthShell>
    );
}