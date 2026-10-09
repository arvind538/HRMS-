"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Mail, MailCheck } from "lucide-react";
import { toast } from "react-toastify";
import api from "@/lib/api";
import AuthShell, { AuthField, AuthButton } from "@/components/auth/AuthShell";

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;
const COOLDOWN_SECONDS = 60;

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [sentTo, setSentTo] = useState("");
    const [seconds, setSeconds] = useState(0);

    /* Resend countdown */
    useEffect(() => {
        if (seconds <= 0) return;
        const timer = setTimeout(() => setSeconds((s) => s - 1), 1000);
        return () => clearTimeout(timer);
    }, [seconds]);

    const sendLink = async (target) => {
        setLoading(true);
        try {
            await api.post("/auth/forgot-password", { email: target });
            setSentTo(target);
            setSeconds(COOLDOWN_SECONDS);
        } catch (err) {
            const msg =
                err?.response?.data?.message ||
                (err?.response ? "Unable to send the reset link. Please try again." : "Unable to reach the server. Please try again.");
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (loading) return;
        const value = email.trim().toLowerCase();

        if (!value) return setError("Email address is required");
        if (!EMAIL_REGEX.test(value)) return setError("Please enter a valid email address");

        setError("");
        sendLink(value);
    };

    /* Success view */
    if (sentTo) {
        return (
            <AuthShell title="Check your email">
                <div className="space-y-5 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                        <MailCheck size={30} />
                    </div>
                    <p className="text-sm leading-relaxed text-slate-500">
                        If <span className="break-all font-semibold text-slate-700">{sentTo}</span> is registered, we have
                        sent a password reset link to it. The link is valid for 15 minutes.
                    </p>
                    <p className="text-xs text-slate-400">Did not receive it? Please check your spam folder.</p>

                    <AuthButton
                        type="button"
                        withArrow={false}
                        loading={loading}
                        loadingText="Sending..."
                        disabled={seconds > 0}
                        onClick={() => sendLink(sentTo)}
                    >
                        {seconds > 0 ? `Resend link in ${seconds}s` : "Resend link"}
                    </AuthButton>

                    <div className="flex flex-col items-center gap-2 text-sm">
                        <button
                            type="button"
                            onClick={() => {
                                setSentTo("");
                                setSeconds(0);
                            }}
                            className="font-medium text-indigo-600 hover:text-indigo-800"
                        >
                            Use a different email
                        </button>
                        <Link href="/login" className="text-slate-500 hover:text-slate-700">
                            Back to login
                        </Link>
                    </div>
                </div>
            </AuthShell>
        );
    }

    /* Email form */
    return (
        <AuthShell title="Forgot Password" subtitle="Enter your email and we will send you a reset link">
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <AuthField
                    id="email"
                    name="email"
                    type="email"
                    label="Email"
                    icon={Mail}
                    placeholder="Email"
                    autoComplete="email"
                    inputMode="email"
                    value={email}
                    onChange={(e) => {
                        setError("");
                        setEmail(e.target.value.replace(/\s/g, ""));
                    }}
                    error={error}
                />

                <div className="text-right">
                    <Link href="/login" className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
                        Back to login
                    </Link>
                </div>

                <AuthButton type="submit" loading={loading} loadingText="Sending..." withArrow={false}>
                    Send reset link
                </AuthButton>
            </form>
        </AuthShell>
    );
}