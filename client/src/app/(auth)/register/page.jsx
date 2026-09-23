"use client";
import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Loader2, Eye, EyeOff, LayoutGrid, Mail, Lock, User, Briefcase } from "lucide-react";
import { toast } from "react-toastify";

export default function RegisterPage() {
    const { register } = useAuth();
    const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "", role: "" });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [fieldErrors, setFieldErrors] = useState({});
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setError("");
        setFieldErrors((prev) => ({ ...prev, [e.target.name]: "" }));
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    // Password strength ka basic check — sirf UI feedback ke liye
    const passwordChecks = {
        length: form.password.length >= 6,
        hasNumber: /\d/.test(form.password),
        match: form.password.length > 0 && form.password === form.confirmPassword,
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setFieldErrors({});

        // Client-side validation — backend call se pehle hi rok do agar kuch galat hai
        if (form.password !== form.confirmPassword) {
            setFieldErrors({ confirmPassword: "Password match nahi kar raha" });
            return;
        }

        setLoading(true);
        try {
            const { confirmPassword, ...payload } = form;
            await register(payload);
            toast.success("Register SuccessFully!");
        } catch (err) {
            const backendErrors = err.response?.data?.errors;
            if (backendErrors?.length) {
                const errorMap = {};
                backendErrors.forEach((e) => {
                    errorMap[e.field] = e.message;
                });
                setFieldErrors(errorMap);
            } else {
                toast.error(err.response?.data?.message || "Registration failed —  try again");
            }
        } finally {
            setLoading(false);
        }
    };

    const inputClass = (hasError) =>
        `w-full pl-10 pr-3.5 py-2.5 border rounded-xl text-sm outline-none transition-shadow focus:ring-2 ${hasError
            ? "border-red-300 focus:ring-red-500"
            : "border-slate-200 focus:ring-indigo-500 focus:border-indigo-500"
        }`;

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-100 to-slate-100 px-4 py-10">
            <div className="w-full max-w-md">

                {/* Card */}
                <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100 p-6 sm:p-8">
                    {/* Brand */}
                    <div className="flex items-center gap-2.5 justify-center mb-2">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-200">
                            <LayoutGrid size={20} />
                        </div>
                        <span className="text-xl font-bold text-slate-900 tracking-tight">HRMS Portal</span>
                    </div>

                    <h2 className="text-xl font-bold text-slate-900 mb-0.5">Create your account</h2>
                    <p className="text-sm text-slate-500 mb-6">Complete employee onboarding in only 1 minute.</p>

                    {error && (
                        <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-3.5 py-2.5 rounded-xl mb-4">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                        {/* Full Name */}
                        <div>
                            <label className="text-sm font-medium text-slate-700">Full Name</label>
                            <div className="relative mt-1.5">
                                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    name="name"
                                    value={form.name}
                                    onChange={handleChange}
                                    className={inputClass(fieldErrors.name)}
                                    placeholder="Arvind Kumar"
                                />
                            </div>
                            {fieldErrors.name && <p className="text-xs text-red-500 mt-1">{fieldErrors.name}</p>}
                        </div>

                        {/* Email */}
                        <div>
                            <label className="text-sm font-medium text-slate-700">Email</label>
                            <div className="relative mt-1.5">
                                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="email"
                                    name="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    className={inputClass(fieldErrors.email)}
                                    placeholder="you@company.com"
                                />
                            </div>
                            {fieldErrors.email && <p className="text-xs text-red-500 mt-1">{fieldErrors.email}</p>}
                        </div>

                        {/* Password */}
                        <div>
                            <label className="text-sm font-medium text-slate-700">Password</label>
                            <div className="relative mt-1.5">
                                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    value={form.password}
                                    onChange={handleChange}
                                    className={`${inputClass(fieldErrors.password)} pr-10`}
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
                            {fieldErrors.password ? (
                                <p className="text-xs text-red-500 mt-1">{fieldErrors.password}</p>
                            ) : (
                                form.password && (
                                    <div className="flex gap-3 mt-1.5">
                                        <span className={`text-xs ${passwordChecks.length ? "text-emerald-600" : "text-slate-400"}`}>
                                            {passwordChecks.length ? "✓" : "•"} 6+ characters
                                        </span>
                                        <span className={`text-xs ${passwordChecks.hasNumber ? "text-emerald-600" : "text-slate-400"}`}>
                                            {passwordChecks.hasNumber ? "✓" : "•"} 1 number
                                        </span>
                                    </div>
                                )
                            )}
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label className="text-sm font-medium text-slate-700">Confirm Password</label>
                            <div className="relative mt-1.5">
                                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="confirmPassword"
                                    value={form.confirmPassword}
                                    onChange={handleChange}
                                    className={inputClass(fieldErrors.confirmPassword)}
                                    placeholder="••••••••"
                                />
                            </div>
                            {fieldErrors.confirmPassword ? (
                                <p className="text-xs text-red-500 mt-1">{fieldErrors.confirmPassword}</p>
                            ) : (
                                form.confirmPassword && (
                                    <p className={`text-xs mt-1 ${passwordChecks.match ? "text-emerald-600" : "text-red-500"}`}>
                                        {passwordChecks.match ? "✓ Password match ho gaya" : "✗ Password match nahi ho raha"}
                                    </p>
                                )
                            )}
                        </div>

                        {/* Role */}
                        {/* <div>
                            <label className="text-sm font-medium text-slate-700">Role</label>
                            <div className="relative mt-1.5">
                                <Briefcase size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                <select
                                    name="role"
                                    value={form.role}
                                    onChange={handleChange}
                                    className="w-full pl-10 pr-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow appearance-none bg-white"
                                >
                                    <option value="All">Select the option</option>
                                    <option value="employee">Employee</option>
                                    <option value="manager">Manager</option>
                                    <option value="hr">HR</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            {fieldErrors.role && <p className="text-xs text-red-500 mt-1">{fieldErrors.role}</p>}
                        </div> */}

                        {/* Role */}
                        <div>
                            <label className="text-sm font-medium text-slate-700">Role</label>
                            <div className="relative mt-1.5">
                                <Briefcase size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                <select
                                    name="role"
                                    required
                                    value={form.role}
                                    onChange={handleChange}
                                    className="w-full pl-10 pr-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow appearance-none bg-white"
                                >
                                    <option value="" disabled>Select your role</option>
                                    <option value="employee">Employee</option>
                                    <option value="manager">Manager</option>
                                    <option value="hr">HR</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            {fieldErrors.role && <p className="text-xs text-red-500 mt-1">{fieldErrors.role}</p>}
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-60 transition-colors shadow-sm shadow-indigo-200"
                        >
                            {loading && <Loader2 size={16} className="animate-spin" />}
                            {loading ? "Creating account..." : "Create Account"}
                        </button>

                        <p className="text-sm text-slate-500 text-center mt-6">
                            Already have an account?{" "}
                            <Link href="/login" className="text-indigo-600 font-semibold hover:text-indigo-700">
                                Login here
                            </Link>
                        </p>
                    </form>
                </div>


            </div>
        </div>
    );
}