"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    Mail,
    Phone,
    Briefcase,
    Calendar,
    ArrowLeft,
    Building2,
    IdCard,
    Loader2,
    UserX,
    ShieldCheck,
    Clock
} from "lucide-react";
import api from "@/lib/api";

const getInitials = (name) => {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    return parts.length > 1
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : parts[0].slice(0, 2).toUpperCase();
};

export default function EmployeeProfilePage() {
    const { id } = useParams();
    const router = useRouter();
    const [employee, setEmployee] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEmployee = async () => {
            try {
                const { data } = await api.get(`/employees/${id}`);
                setEmployee(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchEmployee();
    }, [id]);

    // Loading State
    if (loading) {
        return (
            <div className="w-full max-w-4xl mx-auto py-16 flex flex-col items-center justify-center text-slate-400 gap-3">
                <Loader2 size={24} className="animate-spin text-indigo-600" />
                <p className="text-xs font-medium">Loading employee details...</p>
            </div>
        );
    }

    // Not Found State
    if (!employee) {
        return (
            <div className="w-full max-w-md mx-auto py-16 text-center">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-3">
                    <UserX size={20} />
                </div>
                <h3 className="text-base font-bold text-slate-800">Employee Not Found</h3>
                <p className="text-xs text-slate-400 mt-1 mb-5">The requested profile does not exist or has been removed.</p>
                <button
                    onClick={() => router.push("/employees")}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-all"
                >
                    <ArrowLeft size={14} /> Back to Directory
                </button>
            </div>
        );
    }

    const isActive = employee.status === "active";

    return (
        <div className="w-full max-w-4xl mx-auto space-y-4">
            {/* Header Navigation */}
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                    <button
                        type="button"
                        onClick={() => router.push("/employees")}
                        className="p-2 rounded-xl bg-white text-slate-500 hover:text-slate-800 shadow-sm hover:shadow transition-all active:scale-95"
                        title="Back to list"
                    >
                        <ArrowLeft size={16} />
                    </button>
                    <div>
                        <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                            Employee Details
                        </h1>
                        <p className="text-xs text-slate-500">View complete professional profile and records.</p>
                    </div>
                </div>

                <span
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full capitalize ${isActive
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                        : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}
                >
                    <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
                    {employee.status || "active"}
                </span>
            </div>

            {/* Profile Overview Hero Card */}
            <div className="bg-white rounded-2xl shadow-sm p-5 sm:p-6">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white font-bold text-2xl sm:text-3xl flex items-center justify-center shrink-0 shadow-md shadow-indigo-100">
                        {getInitials(employee.name)}
                    </div>
                    <div className="space-y-1">
                        <h2 className="text-lg sm:text-xl font-bold text-slate-900">{employee.name}</h2>
                        <p className="text-xs sm:text-sm text-indigo-600 font-medium">
                            {employee.designation || "No Designation Assigned"}
                        </p>
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-1 text-xs text-slate-500">
                            <span className="inline-flex items-center gap-1 font-mono bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                                <IdCard size={13} className="text-slate-400" />
                                {employee.employeeId || "—"}
                            </span>
                            {employee.branch && (
                                <span className="inline-flex items-center gap-1">
                                    <Building2 size={13} className="text-slate-400" />
                                    {employee.branch}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Detailed Info Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Contact Information */}
                <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-50">
                        Contact Information
                    </h3>

                    <div className="space-y-3.5">
                        <div className="flex items-start gap-3">
                            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
                                <Mail size={15} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[11px] text-slate-400">Email Address</p>
                                <p className="text-xs sm:text-sm font-medium text-slate-800 break-all">{employee.email || "—"}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
                                <Phone size={15} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[11px] text-slate-400">Phone Number</p>
                                <p className="text-xs sm:text-sm font-medium text-slate-800">{employee.phone || "—"}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Employment Details */}
                <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-50">
                        Organization Details
                    </h3>

                    <div className="space-y-3.5">
                        <div className="flex items-start gap-3">
                            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
                                <Briefcase size={15} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[11px] text-slate-400">Department</p>
                                <p className="text-xs sm:text-sm font-medium text-slate-800">
                                    {employee.department?.name || employee.branch || "—"}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
                                <Calendar size={15} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[11px] text-slate-400">Date of Joining</p>
                                <p className="text-xs sm:text-sm font-medium text-slate-800">
                                    {employee.dateOfJoining
                                        ? new Date(employee.dateOfJoining).toLocaleDateString("en-US", {
                                            year: "numeric",
                                            month: "short",
                                            day: "numeric"
                                        })
                                        : "—"}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}