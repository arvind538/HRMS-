"use client";
import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Loader2, Eye, EyeOff, LayoutGrid, Mail, Lock } from "lucide-react";
import { toast } from "react-toastify";

export default function LoginPage() {
    const { login } = useAuth();
    const [form, setForm] = useState({ email: "", password: "" });
    const [showPassword, setShowPassword] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({});
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFieldErrors((prev) => ({ ...prev, [e.target.name]: "" }));
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFieldErrors({});
        setLoading(true);

        try {
            await login(form.email, form.password);
            toast.success("Login successful!");
        } catch (err) {
            const backendErrors = err.response?.data?.errors;
            if (backendErrors?.length) {
                const errorMap = {};
                backendErrors.forEach((e) => {
                    errorMap[e.field] = e.message;
                });
                setFieldErrors(errorMap);
                toast.error("Please fix the errors below");
            } else {
                toast.error(err.response?.data?.message || "Invalid email ya password");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-100 to-slate-100 px-4 py-10">
            <div className="w-full max-w-md">
                {/* Card */}
                <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100 p-6 sm:p-8">
                    {/* Brand */}
                    <div className="flex items-center gap-2.5 justify-center mb-8">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-200">
                            <LayoutGrid size={20} />
                        </div>
                        <span className="text-xl font-bold text-slate-900 tracking-tight">HRMS Portal</span>
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mb-1">Welcome back</h2>
                    <p className="text-sm text-slate-500 mb-6">Log in to access your dashboard.</p>

                    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                        {/* Email */}
                        <div>
                            <label className="text-sm font-medium text-slate-700">Email</label>
                            <div className="relative mt-1.5">
                                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="email"
                                    value={form.email}
                                    onChange={(e) => handleChange({ target: { name: "email", value: e.target.value } })}
                                    className={`w-full pl-10 pr-3.5 py-2.5 border rounded-xl text-sm outline-none transition-shadow focus:ring-2 ${fieldErrors.email
                                        ? "border-red-300 focus:ring-red-500"
                                        : "border-slate-200 focus:ring-indigo-500 focus:border-indigo-500"
                                        }`}
                                    placeholder="you@company.com"
                                />
                            </div>
                            {fieldErrors.email && (
                                <p className="text-xs text-red-500 mt-1">{fieldErrors.email}</p>
                            )}
                        </div>

                        {/* Password */}
                        <div>
                            <label className="text-sm font-medium text-slate-700">Password</label>
                            <div className="relative mt-1.5">
                                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={form.password}
                                    onChange={(e) => handleChange({ target: { name: "password", value: e.target.value } })}
                                    className={`w-full pl-10 pr-10 py-2.5 border rounded-xl text-sm outline-none transition-shadow focus:ring-2 ${fieldErrors.password
                                        ? "border-red-300 focus:ring-red-500"
                                        : "border-slate-200 focus:ring-indigo-500 focus:border-indigo-500"
                                        }`}
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            {fieldErrors.password && (
                                <p className="text-xs text-red-500 mt-1">{fieldErrors.password}</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-60 transition-colors shadow-sm shadow-indigo-200"
                        >
                            {loading && <Loader2 size={16} className="animate-spin" />}
                            {loading ? "Logging in..." : "Login"}
                        </button>

                        <p className="text-sm text-slate-500 text-center mt-6">
                            Don't have an account?{" "}
                            <Link href="/register" className="text-indigo-600 font-semibold hover:text-indigo-700">
                                Register here
                            </Link>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
}