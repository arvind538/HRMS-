"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    User,
    Mail,
    Phone,
    Briefcase,
    Building2,
    Calendar,
    IndianRupee,
    AlertCircle,
    ArrowLeft,
    UserPlus,
    Loader2,
    Save,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";

function EmployeeFormContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const editId = searchParams.get("id"); // URL se employee ID lena (e.g. /employees/add?id=12345)

    const [form, setForm] = useState({
        name: "",
        email: "",
        phone: "",
        designation: "",
        branch: "",
        dateOfJoining: "",
        salary: "",
    });

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);

    // Agar editId mojood hai, toh purana data fetch karke form mein pre-fill karein
    useEffect(() => {
        if (editId) {
            setFetching(true);
            api.get(`/employees/${editId}`)
                .then((res) => {
                    const emp = res?.data;
                    if (emp) {
                        setForm({
                            name: emp.name || "",
                            email: emp.email || "",
                            phone: emp.phone || "",
                            designation: emp.designation || "",
                            branch: emp.branch || emp.department || "",
                            dateOfJoining: emp.dateOfJoining ? emp.dateOfJoining.split("T")[0] : "",
                            salary: emp.salary || "",
                        });
                    }
                })
                .catch((err) => {
                    console.error("Failed to fetch employee details:", err);
                    setError("Employee ki details load nahi ho payi.");
                })
                .finally(() => setFetching(false));
        }
    }, [editId]);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            if (editId) {
                // Agar ID hai toh Update (PUT request) karein
                await api.put(`/employees/${editId}`, form);
                toast.success("Employee Updated Successfully!");
            } else {
                // Agar ID nahi hai toh Naya Register (POST request) karein
                await api.post("/employees", form);
                toast.success("Submitted Data Successfully!");
            }
            router.push("/employees");
        } catch (err) {
            console.error("Backend error:", err.response?.data);
            setError(
                err.response?.data?.message ||
                err.response?.data?.error ||
                "Failed to save employee record. Please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    if (fetching) {
        return (
            <div className="w-full py-28 flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 size={32} className="animate-spin text-indigo-600" />
                <p className="text-xs font-bold uppercase tracking-wider">Loading employee profile...</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 antialiased">
            {/* Header & Back Action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center gap-3.5">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 shadow-xs transition-all active:scale-95 shrink-0 cursor-pointer"
                        title="Go back"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
                            {editId ? "Update Employee Details" : "Register New Employee"}
                        </h1>
                        <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-0.5">
                            {editId
                                ? "Modify existing credentials and organizational parameters."
                                : "Fill out the credentials and organizational allocation to onboard team personnel."}
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Form Container */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs transition-all duration-200">
                {error && (
                    <div className="flex items-center gap-2.5 bg-rose-50 border border-rose-200/80 text-rose-700 text-xs sm:text-sm px-4 py-3 rounded-2xl mb-6 shadow-xs">
                        <AlertCircle size={16} className="shrink-0 text-rose-500" />
                        <span className="font-semibold">{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        {/* Full Name */}
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                <User size={13} className="text-indigo-600" /> Full Name <span className="text-rose-500">*</span>
                            </label>
                            <input
                                name="name"
                                required
                                placeholder="e.g. Rahul Sharma"
                                value={form.name}
                                onChange={handleChange}
                                className="w-full px-4 py-3 bg-slate-50/70 hover:bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 outline-none transition-all shadow-xs"
                            />
                        </div>

                        {/* Work Email */}
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                <Mail size={13} className="text-indigo-600" /> Work Email <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="email"
                                name="email"
                                required
                                placeholder="rahul.sharma@company.com"
                                value={form.email}
                                onChange={handleChange}
                                className="w-full px-4 py-3 bg-slate-50/70 hover:bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 outline-none transition-all shadow-xs"
                            />
                        </div>

                        {/* Phone Number */}
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                <Phone size={13} className="text-indigo-600" /> Phone Number
                            </label>
                            <input
                                type="tel"
                                name="phone"
                                placeholder="+91 98765 43210"
                                value={form.phone}
                                onChange={handleChange}
                                className="w-full px-4 py-3 bg-slate-50/70 hover:bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 outline-none transition-all shadow-xs font-mono"
                            />
                        </div>

                        {/* Designation */}
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                <Briefcase size={13} className="text-indigo-600" /> Designation
                            </label>
                            <input
                                name="designation"
                                placeholder="e.g. Senior Software Engineer"
                                value={form.designation}
                                onChange={handleChange}
                                className="w-full px-4 py-3 bg-slate-50/70 hover:bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 outline-none transition-all shadow-xs"
                            />
                        </div>

                        {/* Branch / Office */}
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                <Building2 size={13} className="text-indigo-600" /> Branch / Department
                            </label>
                            <input
                                name="branch"
                                placeholder="e.g. Engineering / Jaipur HQ"
                                value={form.branch}
                                onChange={handleChange}
                                className="w-full px-4 py-3 bg-slate-50/70 hover:bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 outline-none transition-all shadow-xs"
                            />
                        </div>

                        {/* Date of Joining */}
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                <Calendar size={13} className="text-indigo-600" /> Date of Joining
                            </label>
                            <input
                                type="date"
                                name="dateOfJoining"
                                value={form.dateOfJoining}
                                onChange={handleChange}
                                className="w-full px-4 py-3 bg-slate-50/70 hover:bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 outline-none transition-all shadow-xs"
                            />
                        </div>

                        {/* Monthly Salary */}
                        <div className="space-y-1.5 sm:col-span-2">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                <IndianRupee size={13} className="text-indigo-600" /> Monthly Compensation (₹)
                            </label>
                            <input
                                type="number"
                                name="salary"
                                placeholder="e.g. 75000"
                                value={form.salary}
                                onChange={handleChange}
                                className="w-full px-4 py-3 bg-slate-50/70 hover:bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 outline-none transition-all shadow-xs font-mono"
                            />
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="w-full sm:w-auto px-5 py-3 rounded-2xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs sm:text-sm font-bold transition-all active:scale-95 cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs sm:text-sm font-bold shadow-sm shadow-indigo-600/20 disabled:opacity-60 transition-all active:scale-95 cursor-pointer"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    <span>Saving Profile...</span>
                                </>
                            ) : editId ? (
                                <>
                                    <Save size={16} />
                                    <span>Save Changes</span>
                                </>
                            ) : (
                                <>
                                    <UserPlus size={16} />
                                    <span>Register Employee</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function AddEmployeePage() {
    return (
        <Suspense fallback={
            <div className="w-full py-28 flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 size={32} className="animate-spin text-indigo-600" />
                <p className="text-xs font-bold uppercase tracking-wider">Loading form...</p>
            </div>
        }>
            <EmployeeFormContent />
        </Suspense>
    );
}