"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
    Mail,
    Phone,
    Building2,
    Calendar,
    IndianRupee,
    Loader2,
    RefreshCw,
    Camera,
    CheckCircle2,
} from "lucide-react";
import api from "@/lib/api";

function EmployeeProfileContent() {
    const searchParams = useSearchParams();
    const urlId = searchParams.get("id");

    const [employees, setEmployees] = useState([]);
    const [selectedId, setSelectedId] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const fileInputRef = useRef(null);

    const fetchEmployees = async () => {
        setLoading(true);
        try {
            const res = await api.get("/employees");
            const list = Array.isArray(res?.data) ? res.data : [];
            setEmployees(list);

            if (list.length > 0) {
                if (urlId && list.some((e) => (e._id || e.id) === urlId)) {
                    setSelectedId(urlId);
                } else if (!selectedId) {
                    setSelectedId(list[0]._id || list[0].id);
                }
            }
        } catch (err) {
            console.error("Failed to fetch employees:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEmployees();
    }, [urlId]);

    const employee = employees.find((e) => (e._id || e.id) === selectedId);

    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !employee) return;

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64Image = reader.result;

            setEmployees((prev) =>
                prev.map((emp) =>
                    (emp._id || emp.id) === selectedId
                        ? { ...emp, avatar: base64Image }
                        : emp
                )
            );

            try {
                setSaving(true);
                await api.put(`/employees/${selectedId}`, {
                    ...employee,
                    avatar: base64Image,
                });
                setSuccessMessage("Profile photo updated successfully.");
                setTimeout(() => setSuccessMessage(""), 3000);
            } catch (err) {
                console.error("Failed to sync avatar with backend:", err);
            } finally {
                setSaving(false);
            }
        };
        reader.readAsDataURL(file);
    };

    if (loading) {
        return (
            <div className="w-full min-h-[500px] flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 size={36} className="animate-spin text-indigo-600" />
                <p className="text-xs font-bold tracking-wider uppercase text-slate-600">
                    Loading Employee Profile...
                </p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 antialiased font-sans text-slate-900">
            {/* Top Toolbar Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-7 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                        Employee Profile
                    </h1>
                    <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
                        Comprehensive personnel identification, contact details, and organization records.
                    </p>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                    <select
                        value={selectedId}
                        onChange={(e) => setSelectedId(e.target.value)}
                        className="flex-1 sm:flex-initial px-3.5 sm:px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl sm:rounded-2xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-600/10 transition-all cursor-pointer shadow-2xs"
                    >
                        {employees.map((emp) => (
                            <option key={emp._id || emp.id} value={emp._id || emp.id}>
                                {emp.name || `${emp.firstName || ""} ${emp.lastName || ""}`.trim()}
                            </option>
                        ))}
                    </select>

                    <button
                        type="button"
                        onClick={fetchEmployees}
                        className="p-2.5 border border-slate-200 rounded-xl sm:rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-indigo-600 transition-all shadow-2xs active:scale-95 cursor-pointer shrink-0"
                        title="Refresh Directory"
                    >
                        <RefreshCw size={15} />
                    </button>
                </div>
            </div>

            {successMessage && (
                <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm px-4 py-3 rounded-2xl shadow-2xs">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    <span className="font-semibold">{successMessage}</span>
                </div>
            )}

            {employee ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                    {/* Left Column: Avatar & Summary */}
                    <div className="bg-white p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs flex flex-col items-center text-center space-y-4">
                        <div className="relative group">
                            {employee.avatar ? (
                                <img
                                    src={employee.avatar}
                                    alt={employee.name || "Employee"}
                                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl sm:rounded-3xl object-cover shadow-sm border-2 border-indigo-100"
                                />
                            ) : (
                                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl sm:rounded-3xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center font-black text-xl sm:text-2xl shadow-sm border border-indigo-200">
                                    {employee.name
                                        ? employee.name.slice(0, 2).toUpperCase()
                                        : "U"}
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute -bottom-1 -right-1 sm:-bottom-2 sm:-right-2 p-2 sm:p-2.5 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl sm:rounded-2xl shadow-md border-2 border-white transition-all cursor-pointer active:scale-95 group-hover:scale-105"
                                title="Upload profile photo"
                            >
                                <Camera size={14} />
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleImageUpload}
                            />
                        </div>

                        <div>
                            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                                {employee.name || "Unnamed Staff"}
                            </h2>
                            <p className="text-xs font-semibold text-slate-400 mt-0.5">
                                {employee.designation || employee.role || "Staff Member"}
                            </p>
                        </div>

                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 capitalize">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                            {employee.status || "active"}
                        </span>
                    </div>

                    {/* Right Column: Detailed Official Credentials */}
                    <div className="lg:col-span-2 bg-white p-5 sm:p-8 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs space-y-5 sm:space-y-6">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                            <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
                                Official Credentials
                            </h3>
                            {saving && (
                                <span className="text-[11px] font-bold text-indigo-600 flex items-center gap-1.5 animate-pulse">
                                    <Loader2 size={12} className="animate-spin shrink-0" />
                                    <span>Saving updates...</span>
                                </span>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                            <div className="p-3.5 sm:p-4 bg-slate-50/70 rounded-2xl border border-slate-200/60 flex items-center gap-3.5">
                                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                    <Mail size={18} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        Work Email
                                    </p>
                                    <p className="text-xs font-bold text-slate-800 truncate mt-0.5">
                                        {employee.email || "Not specified"}
                                    </p>
                                </div>
                            </div>

                            <div className="p-3.5 sm:p-4 bg-slate-50/70 rounded-2xl border border-slate-200/60 flex items-center gap-3.5">
                                <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
                                    <Phone size={18} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        Phone Number
                                    </p>
                                    <p className="text-xs font-bold text-slate-800 truncate mt-0.5 font-mono">
                                        {employee.phone || "Not specified"}
                                    </p>
                                </div>
                            </div>

                            <div className="p-3.5 sm:p-4 bg-slate-50/70 rounded-2xl border border-slate-200/60 flex items-center gap-3.5">
                                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                    <Building2 size={18} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        Department
                                    </p>
                                    <p className="text-xs font-bold text-slate-800 truncate mt-0.5">
                                        {employee.department?.name ||
                                            employee.department ||
                                            employee.branch ||
                                            "General Division"}
                                    </p>
                                </div>
                            </div>

                            <div className="p-3.5 sm:p-4 bg-slate-50/70 rounded-2xl border border-slate-200/60 flex items-center gap-3.5">
                                <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
                                    <Calendar size={18} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        Date of Joining
                                    </p>
                                    <p className="text-xs font-bold text-slate-800 truncate mt-0.5">
                                        {employee.dateOfJoining || employee.joiningDate
                                            ? new Date(
                                                employee.dateOfJoining || employee.joiningDate
                                            ).toLocaleDateString("en-US", {
                                                year: "numeric",
                                                month: "short",
                                                day: "numeric",
                                            })
                                            : "Not recorded"}
                                    </p>
                                </div>
                            </div>

                            <div className="p-3.5 sm:p-4 bg-slate-50/70 rounded-2xl border border-slate-200/60 flex items-center gap-3.5 sm:col-span-2">
                                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                    <IndianRupee size={18} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        Monthly Compensation
                                    </p>
                                    <p className="text-xs font-bold text-slate-800 truncate mt-0.5 font-mono">
                                        {employee.salary
                                            ? `₹${Number(employee.salary).toLocaleString("en-IN")}`
                                            : "Not specified"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-white p-12 sm:p-16 text-center rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
                    <p className="text-sm sm:text-base font-bold text-slate-900">
                        No employee records available
                    </p>
                    <p className="text-xs text-slate-400">
                        Register employees in the system to view their profiles here.
                    </p>
                </div>
            )}
        </div>
    );
}

export default function EmployeeProfilePage() {
    return (
        <Suspense
            fallback={
                <div className="w-full min-h-[500px] flex flex-col items-center justify-center gap-3 text-slate-400">
                    <Loader2 size={36} className="animate-spin text-indigo-600" />
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
                        Loading Profile...
                    </p>
                </div>
            }
        >
            <EmployeeProfileContent />
        </Suspense>
    );
}