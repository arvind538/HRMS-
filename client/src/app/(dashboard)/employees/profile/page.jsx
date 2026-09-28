"use client";

import { useEffect, useState, useRef, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    Loader2,
    RefreshCw,
    Camera,
    CheckCircle2,
    ArrowLeft,
    Edit3,
    BadgeCheck,
    Shield,
    MapPin,
    ShieldAlert,
    AlertCircle,
    Building2,
    Briefcase,
    CreditCard,
    GraduationCap,
    FileText,
    Download,
    Eye,
    Landmark,
    Phone,
    Mail,
    Calendar,
    Droplet,
    Heart,
    Hash,
    KeyRound,
    UserCheck,
    Clock,
} from "lucide-react";
import api from "@/lib/api";

function EmployeeProfileContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const urlId = searchParams.get("id");

    const [employees, setEmployees] = useState([]);
    const [designationsList, setDesignationsList] = useState([]);
    const [departmentsList, setDepartmentsList] = useState([]);
    const [selectedId, setSelectedId] = useState("");
    const [detailedEmployee, setDetailedEmployee] = useState(null);
    const [activeTab, setActiveTab] = useState("overview");

    const [loading, setLoading] = useState(true);
    const [detailLoading, setDetailLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const fileInputRef = useRef(null);

    // 1. Fetch designations & departments lookup
    useEffect(() => {
        async function loadLookupData() {
            try {
                const [desigRes, deptRes] = await Promise.allSettled([
                    api.get("/organization/designations"),
                    api.get("/organization/departments"),
                ]);

                if (desigRes.status === "fulfilled") {
                    const raw = desigRes.value?.data;
                    const list = Array.isArray(raw) ? raw : raw?.data || raw?.items || [];
                    setDesignationsList(list);
                }
                if (deptRes.status === "fulfilled") {
                    const raw = deptRes.value?.data;
                    const list = Array.isArray(raw) ? raw : raw?.data || raw?.departments || [];
                    setDepartmentsList(list);
                }
            } catch (err) {
                console.error("Lookup data fetch failed:", err);
            }
        }
        loadLookupData();
    }, []);

    // 2. Fetch all employees list
    const fetchEmployees = async () => {
        setLoading(true);
        try {
            const res = await api.get("/employees");
            const list = Array.isArray(res?.data)
                ? res.data
                : res?.data?.employees || res?.data?.data || [];
            setEmployees(list);

            if (list.length > 0) {
                if (urlId && list.some((e) => String(e._id || e.id) === String(urlId))) {
                    setSelectedId(urlId);
                } else if (!selectedId) {
                    setSelectedId(list[0]._id || list[0].id);
                }
            } else {
                setSelectedId("");
                setDetailedEmployee(null);
            }
        } catch (err) {
            console.error("Failed to fetch employees:", err);
            setErrorMessage("Failed to load employee directory.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEmployees();
    }, [urlId]);

    // 3. Fetch single full employee details
    useEffect(() => {
        if (!selectedId) return;

        let isSubscribed = true;
        setDetailLoading(true);

        api.get(`/employees/${selectedId}`)
            .then((res) => {
                if (!isSubscribed) return;
                const emp = res?.data?.employee || res?.data?.data || res?.data;
                if (emp && typeof emp === "object") {
                    setDetailedEmployee(emp);
                } else {
                    const fallback = employees.find((e) => String(e._id || e.id) === String(selectedId));
                    setDetailedEmployee(fallback || null);
                }
            })
            .catch((err) => {
                console.error("Single employee fetch error:", err);
                const fallback = employees.find((e) => String(e._id || e.id) === String(selectedId));
                if (isSubscribed) setDetailedEmployee(fallback || null);
            })
            .finally(() => {
                if (isSubscribed) setDetailLoading(false);
            });

        return () => {
            isSubscribed = false;
        };
    }, [selectedId]);

    const employee = detailedEmployee || employees.find((e) => String(e._id || e.id) === String(selectedId));

    // Safe Data Resolvers
    const resolveDepartment = (emp) => {
        if (!emp) return "Not Assigned";
        const dept = emp.department;
        if (!dept) return "Not Assigned";
        if (typeof dept === "object" && dept !== null) {
            return dept.name || dept.title || "Not Assigned";
        }
        if (typeof dept === "string") {
            const matched = departmentsList.find((d) => String(d._id || d.id) === dept);
            if (matched) return matched.name || matched.title;
            return dept;
        }
        return "Not Assigned";
    };

    const resolveBranch = (emp) => {
        if (!emp) return "Main Campus";
        if (typeof emp.branch === "object" && emp.branch !== null) {
            return emp.branch.name || emp.branch.location || "Main Campus";
        }
        if (emp.branch && typeof emp.branch === "string" && emp.branch.trim() !== "") {
            return emp.branch;
        }
        if (emp.city || emp.state) {
            return [emp.city, emp.state].filter(Boolean).join(", ");
        }
        return "Main Campus";
    };

    const resolveDesignation = (emp) => {
        if (!emp) return "Staff Member";
        const desig = emp.designation;
        if (!desig) return emp.role || "Staff Member";

        if (typeof desig === "object" && desig !== null) {
            return desig.title || desig.name || "Staff Member";
        }
        if (typeof desig === "string") {
            const val = desig.trim();
            const isHexId = /^[0-9a-fA-F]{24}$/.test(val);
            if (isHexId) {
                const matched = designationsList.find((d) => String(d._id || d.id) === val);
                if (matched) return matched.title || matched.name;
            }
            return val;
        }
        return emp.role || "Staff Member";
    };

    const resolveManager = (emp) => {
        if (!emp) return "Direct to Executive";
        const mgr = emp.reportingManager || emp.manager;
        if (!mgr) return "Direct to Executive";

        if (typeof mgr === "object" && mgr !== null) {
            return mgr.name || `${mgr.firstName || ""} ${mgr.lastName || ""}`.trim() || "Assigned Manager";
        }
        const matched = employees.find((e) => String(e._id || e.id) === String(mgr));
        if (matched) {
            return matched.name || `${matched.firstName || ""} ${matched.lastName || ""}`.trim();
        }
        return String(mgr);
    };

    const formatDate = (rawDate) => {
        if (!rawDate) return "Not recorded";
        try {
            const d = new Date(rawDate);
            return isNaN(d.getTime())
                ? "Not recorded"
                : d.toLocaleDateString("en-IN", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                });
        } catch {
            return "Not recorded";
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !employee) return;

        if (!file.type.startsWith("image/")) {
            setErrorMessage("Please select a valid image (PNG, JPG, WEBP).");
            return;
        }

        if (file.size > 3 * 1024 * 1024) {
            setErrorMessage("Image size exceeds 3MB limit.");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64Image = reader.result;

            setDetailedEmployee((prev) => (prev ? { ...prev, avatar: base64Image } : prev));
            setEmployees((prev) =>
                prev.map((emp) =>
                    String(emp._id || emp.id) === String(selectedId) ? { ...emp, avatar: base64Image } : emp
                )
            );

            try {
                setSaving(true);
                await api.put(`/employees/${selectedId}`, {
                    avatar: base64Image,
                });
                setSuccessMessage("Profile photo updated & synced successfully.");
                setTimeout(() => setSuccessMessage(""), 3000);
            } catch (err) {
                console.error("Failed to sync photo:", err);
                setErrorMessage("Failed to save photo to backend.");
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
                    Loading Employee Records...
                </p>
            </div>
        );
    }

    const currentStatus = (employee?.employeeStatus || employee?.status || "active").toLowerCase();
    const isActive = currentStatus === "active";
    const isInactive = currentStatus === "inactive";
    const empIdTag = employee?.employeeId || "EMP001";

    const emergencyName =
        employee?.emergencyContactName ||
        employee?.emergencyContact?.name ||
        employee?.emergencyName ||
        "Not Recorded";

    const emergencyRelation =
        employee?.emergencyContactRelation ||
        employee?.emergencyContact?.relation ||
        employee?.emergencyRelation ||
        "Contact Person";

    const emergencyPhone =
        employee?.emergencyContactPhone ||
        employee?.emergencyContact?.phone ||
        employee?.emergencyPhone ||
        "Not Recorded";

    const street = employee?.address || employee?.residentialAddress?.street || "";
    const city = employee?.city || employee?.residentialAddress?.city || "";
    const state = employee?.state || employee?.residentialAddress?.state || "";
    const pincode = employee?.pincode || employee?.residentialAddress?.pincode || "";

    const fullAddress =
        [street, city, state, pincode].filter(Boolean).join(", ") ||
        employee?.branch ||
        "No residential address provided.";

    const resumeFile =
        employee?.documents?.resumeUrl ||
        employee?.documents?.resumeFileData ||
        employee?.resumeFileData ||
        null;

    const resumeName =
        employee?.documents?.resumeFileName ||
        employee?.resumeFileName ||
        "Candidate_Resume.pdf";

    const idProofFile =
        employee?.documents?.idProofUrl ||
        employee?.documents?.idProofFileData ||
        employee?.idProofFileData ||
        null;

    const idProofName =
        employee?.documents?.idProofFileName ||
        employee?.idProofFileName ||
        "Government_ID_Proof.pdf";

    return (
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 antialiased font-sans text-slate-900">
            {/* TOP BAR / NAVIGATION */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => router.push("/employees")}
                        className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 shadow-2xs transition-all active:scale-95 shrink-0 cursor-pointer"
                        title="Back to Directory"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight">
                                Employee Profile
                            </h1>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/70">
                                <BadgeCheck size={12} /> HRMS Master
                            </span>
                        </div>
                        <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5">
                            Real-time corporate records, contact details, and document repository.
                        </p>
                    </div>
                </div>

                {/* Profile Selector & Action Controls */}
                <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                    <select
                        value={selectedId}
                        onChange={(e) => setSelectedId(e.target.value)}
                        className="flex-1 sm:w-64 px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl sm:rounded-2xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-600/10 transition-all cursor-pointer shadow-2xs truncate"
                    >
                        {employees.map((emp) => (
                            <option key={emp._id || emp.id} value={emp._id || emp.id}>
                                {emp.name || `${emp.firstName || ""} ${emp.lastName || ""}`.trim()}
                            </option>
                        ))}
                    </select>

                    {employee && (
                        <button
                            type="button"
                            onClick={() => router.push(`/employees/add?id=${selectedId}`)}
                            className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer shrink-0"
                        >
                            <Edit3 size={14} />
                            <span className="hidden sm:inline">Edit Details</span>
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={fetchEmployees}
                        className="p-2 sm:p-2.5 border border-slate-200 rounded-xl sm:rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-indigo-600 transition-all shadow-2xs active:scale-95 cursor-pointer shrink-0"
                        title="Refresh Data"
                    >
                        <RefreshCw size={15} />
                    </button>
                </div>
            </div>

            {/* Notification Alerts */}
            {successMessage && (
                <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm px-4 py-3 rounded-2xl shadow-2xs animate-in fade-in duration-200">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    <span className="font-semibold">{successMessage}</span>
                </div>
            )}

            {errorMessage && (
                <div className="flex items-center gap-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm px-4 py-3 rounded-2xl shadow-2xs animate-in fade-in duration-200">
                    <AlertCircle size={16} className="text-rose-600 shrink-0" />
                    <span className="font-semibold">{errorMessage}</span>
                </div>
            )}

            {employee ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 relative">
                    {detailLoading && (
                        <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] z-30 flex items-center justify-center rounded-3xl">
                            <div className="flex items-center gap-2.5 bg-slate-900 text-white px-5 py-2.5 rounded-2xl text-xs font-bold shadow-xl">
                                <Loader2 size={16} className="animate-spin text-indigo-400" />
                                <span>Syncing complete profile details...</span>
                            </div>
                        </div>
                    )}

                    {/* LEFT COLUMN: Identity & Quick Summary */}
                    <div className="lg:col-span-4 bg-white p-5 sm:p-6 lg:p-7 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs flex flex-col items-center text-center space-y-4 h-fit">
                        {/* Avatar */}
                        <div className="relative group">
                            <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl overflow-hidden shadow-inner border-4 border-indigo-50/80 bg-slate-100 flex items-center justify-center transition-all group-hover:border-indigo-100">
                                {employee.avatar || employee.photo ? (
                                    <img
                                        src={employee.avatar || employee.photo}
                                        alt={employee.name || "Employee"}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center font-black text-2xl sm:text-4xl">
                                        {employee.name ? employee.name.slice(0, 2).toUpperCase() : "EM"}
                                    </div>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={saving}
                                className="absolute -bottom-2 -right-2 p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-md border-2 border-white transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                                title="Change Profile Picture"
                            >
                                {saving ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />}
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleImageUpload}
                            />
                        </div>

                        {/* Name & Role */}
                        <div className="space-y-1.5 w-full">
                            <div className="flex items-center justify-center gap-2 flex-wrap">
                                <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                                    {employee.name || "Personnel Name"}
                                </h2>
                                <span className="font-mono text-[10px] font-extrabold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md border border-indigo-200/60 uppercase">
                                    {empIdTag}
                                </span>
                            </div>
                            <p className="text-xs sm:text-sm font-bold text-indigo-600">
                                {resolveDesignation(employee)}
                            </p>
                            <p className="text-xs text-slate-400 font-medium">
                                {employee.email || "No email provided"}
                            </p>
                        </div>

                        {/* Status Badge */}
                        <div className="flex items-center gap-2 pt-1 flex-wrap justify-center">
                            <span
                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold border uppercase tracking-wider ${isActive
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : isInactive
                                        ? "bg-amber-50 text-amber-700 border-amber-200"
                                        : "bg-rose-50 text-rose-700 border-rose-200"
                                    }`}
                            >
                                <span
                                    className={`w-2 h-2 rounded-full ${isActive
                                        ? "bg-emerald-500 animate-pulse"
                                        : isInactive
                                            ? "bg-amber-500"
                                            : "bg-rose-500"
                                        }`}
                                />
                                {currentStatus}
                            </span>

                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                {employee.employmentType || "Full-time"}
                            </span>
                        </div>

                        {/* Sidebar Key Summary */}
                        <div className="w-full pt-4 border-t border-slate-100 space-y-3 text-xs text-left">
                            <div className="flex justify-between items-center py-0.5">
                                <span className="text-slate-400 font-medium flex items-center gap-1.5">
                                    <Building2 size={13} className="text-slate-400 shrink-0" /> Department
                                </span>
                                <span className="font-bold text-slate-800">{resolveDepartment(employee)}</span>
                            </div>

                            <div className="flex justify-between items-center py-0.5">
                                <span className="text-slate-400 font-medium flex items-center gap-1.5">
                                    <UserCheck size={13} className="text-slate-400 shrink-0" /> Reporting Head
                                </span>
                                <span className="font-bold text-indigo-600 truncate max-w-[150px] text-right">
                                    {resolveManager(employee)}
                                </span>
                            </div>

                            <div className="flex justify-between items-center py-0.5">
                                <span className="text-slate-400 font-medium flex items-center gap-1.5">
                                    <MapPin size={13} className="text-slate-400 shrink-0" /> Hub / Branch
                                </span>
                                <span className="font-bold text-slate-800">{resolveBranch(employee)}</span>
                            </div>

                            <div className="flex justify-between items-center py-0.5">
                                <span className="text-slate-400 font-medium flex items-center gap-1.5">
                                    <Calendar size={13} className="text-slate-400 shrink-0" /> Joining Date
                                </span>
                                <span className="font-mono font-semibold text-slate-800">
                                    {formatDate(employee.dateOfJoining || employee.joiningDate)}
                                </span>
                            </div>

                            <div className="flex justify-between items-center py-0.5">
                                <span className="text-slate-400 font-medium flex items-center gap-1.5">
                                    <CreditCard size={13} className="text-slate-400 shrink-0" /> Base CTC
                                </span>
                                <span className="font-mono font-extrabold text-emerald-700">
                                    {employee.salary !== undefined && employee.salary !== null && employee.salary !== ""
                                        ? `₹${Number(employee.salary).toLocaleString("en-IN")}`
                                        : "Not recorded"}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Tabbed Detail Cards */}
                    <div className="lg:col-span-8 space-y-4 sm:space-y-6">
                        {/* Navigation Tabs */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                            {[
                                { id: "overview", label: "Overview & Personal", icon: Shield },
                                { id: "employment", label: "Job & Financials", icon: Briefcase },
                                { id: "experience", label: "Education & Career", icon: GraduationCap },
                                { id: "documents", label: "Identity & Documents", icon: FileText },
                            ].map((tab) => {
                                const Icon = tab.icon;
                                const isCurrent = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer ${isCurrent
                                            ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
                                            : "bg-white hover:bg-slate-50 text-slate-600 border border-slate-200/80"
                                            }`}
                                    >
                                        <Icon size={15} />
                                        <span>{tab.label}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* TAB 1: OVERVIEW & PERSONAL */}
                        {activeTab === "overview" && (
                            <div className="space-y-4 sm:space-y-6">
                                {/* Personal Identity Box */}
                                <div className="bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                                        <Shield size={16} className="text-indigo-600" />
                                        1. Personal Demographics & Contact
                                    </h3>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                                        <div className="p-3.5 bg-slate-50/70 hover:bg-slate-50 transition-colors rounded-2xl border border-slate-200/60">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Corporate Email</p>
                                            <p className="text-xs sm:text-sm font-bold text-slate-800 truncate mt-0.5">{employee.email || "Not specified"}</p>
                                        </div>

                                        <div className="p-3.5 bg-slate-50/70 hover:bg-slate-50 transition-colors rounded-2xl border border-slate-200/60">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Primary Phone</p>
                                            <p className="text-xs sm:text-sm font-bold text-slate-800 font-mono mt-0.5">{employee.phone || "Not specified"}</p>
                                        </div>

                                        <div className="p-3.5 bg-slate-50/70 hover:bg-slate-50 transition-colors rounded-2xl border border-slate-200/60">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Date of Birth</p>
                                            <p className="text-xs sm:text-sm font-bold text-slate-800 font-mono mt-0.5">{formatDate(employee.dateOfBirth || employee.dob)}</p>
                                        </div>

                                        <div className="p-3.5 bg-slate-50/70 hover:bg-slate-50 transition-colors rounded-2xl border border-slate-200/60">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Gender</p>
                                            <p className="text-xs sm:text-sm font-bold text-slate-800 capitalize mt-0.5">{employee.gender || "Not specified"}</p>
                                        </div>

                                        <div className="p-3.5 bg-slate-50/70 hover:bg-slate-50 transition-colors rounded-2xl border border-slate-200/60">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Blood Group</p>
                                            <p className="text-xs sm:text-sm font-bold text-rose-600 mt-0.5">{employee.bloodGroup || "Not recorded"}</p>
                                        </div>

                                        <div className="p-3.5 bg-slate-50/70 hover:bg-slate-50 transition-colors rounded-2xl border border-slate-200/60">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Marital Status</p>
                                            <p className="text-xs sm:text-sm font-bold text-slate-800 mt-0.5">{employee.maritalStatus || "Not recorded"}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Emergency Contact & Address */}
                                <div className="bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                                        <ShieldAlert size={16} className="text-indigo-600" />
                                        2. Emergency Contact & Residential Address
                                    </h3>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                                        <div className="p-3.5 bg-slate-50/70 rounded-2xl border border-slate-200/60">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Contact Person</p>
                                            <p className="text-xs sm:text-sm font-bold text-slate-800 truncate mt-0.5">{emergencyName}</p>
                                        </div>

                                        <div className="p-3.5 bg-slate-50/70 rounded-2xl border border-slate-200/60">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Relationship</p>
                                            <p className="text-xs sm:text-sm font-bold text-slate-800 truncate mt-0.5">{emergencyRelation}</p>
                                        </div>

                                        <div className="p-3.5 bg-slate-50/70 rounded-2xl border border-slate-200/60">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Emergency Phone</p>
                                            <p className="text-xs sm:text-sm font-bold text-rose-700 font-mono mt-0.5">{emergencyPhone}</p>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200/60 flex items-start gap-3">
                                        <MapPin size={18} className="text-indigo-600 shrink-0 mt-0.5" />
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Registered Residential Address</p>
                                            <p className="text-xs sm:text-sm font-semibold text-slate-800 mt-0.5 leading-relaxed break-words">
                                                {fullAddress}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 2: EMPLOYMENT & FINANCIALS */}
                        {activeTab === "employment" && (
                            <div className="space-y-4 sm:space-y-6">
                                {/* Job Role Details */}
                                <div className="bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                                        <Briefcase size={16} className="text-indigo-600" />
                                        Job Role & Assignment
                                    </h3>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                                        <div className="p-3.5 bg-slate-50/70 rounded-2xl border border-slate-200/60">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Department</p>
                                            <p className="text-xs sm:text-sm font-bold text-slate-800 mt-0.5">{resolveDepartment(employee)}</p>
                                        </div>
                                        <div className="p-3.5 bg-slate-50/70 rounded-2xl border border-slate-200/60">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Designation</p>
                                            <p className="text-xs sm:text-sm font-bold text-indigo-700 mt-0.5">{resolveDesignation(employee)}</p>
                                        </div>
                                        <div className="p-3.5 bg-slate-50/70 rounded-2xl border border-slate-200/60">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Employment Type</p>
                                            <p className="text-xs sm:text-sm font-bold text-slate-800 mt-0.5">{employee.employmentType || "Full-time"}</p>
                                        </div>
                                        <div className="p-3.5 bg-slate-50/70 rounded-2xl border border-slate-200/60">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Reporting Head</p>
                                            <p className="text-xs sm:text-sm font-bold text-slate-800 mt-0.5">{resolveManager(employee)}</p>
                                        </div>
                                        <div className="p-3.5 bg-slate-50/70 rounded-2xl border border-slate-200/60">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Workplace Hub</p>
                                            <p className="text-xs sm:text-sm font-bold text-slate-800 mt-0.5">{resolveBranch(employee)}</p>
                                        </div>
                                        <div className="p-3.5 bg-slate-50/70 rounded-2xl border border-slate-200/60">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">System Role</p>
                                            <p className="text-xs sm:text-sm font-bold text-slate-800 mt-0.5">{employee.role || "Employee"}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Bank Details */}
                                <div className="bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                                        <Landmark size={16} className="text-indigo-600" />
                                        Bank Account & Statutory Identifiers
                                    </h3>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                                        <div className="p-3.5 bg-slate-50/70 rounded-2xl border border-slate-200/60">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Bank Name</p>
                                            <p className="text-xs sm:text-sm font-bold text-slate-800 mt-0.5">
                                                {employee.bankDetails?.bankName || employee.bankName || "Not Recorded"}
                                            </p>
                                        </div>
                                        <div className="p-3.5 bg-slate-50/70 rounded-2xl border border-slate-200/60">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Account Number</p>
                                            <p className="text-xs sm:text-sm font-bold font-mono text-slate-800 mt-0.5">
                                                {employee.bankDetails?.accountNumber || employee.accountNumber || "Not Recorded"}
                                            </p>
                                        </div>
                                        <div className="p-3.5 bg-slate-50/70 rounded-2xl border border-slate-200/60">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">IFSC Code</p>
                                            <p className="text-xs sm:text-sm font-bold font-mono text-indigo-700 uppercase mt-0.5">
                                                {employee.bankDetails?.ifscCode || employee.ifscCode || "Not Recorded"}
                                            </p>
                                        </div>
                                        <div className="p-3.5 bg-slate-50/70 rounded-2xl border border-slate-200/60">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Payment Mode</p>
                                            <p className="text-xs sm:text-sm font-bold text-slate-800 mt-0.5">
                                                {employee.bankDetails?.paymentMode || employee.paymentMode || "Bank Transfer"}
                                            </p>
                                        </div>
                                        <div className="p-3.5 bg-slate-50/70 rounded-2xl border border-slate-200/60">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">PAN Number</p>
                                            <p className="text-xs sm:text-sm font-bold font-mono text-slate-800 uppercase mt-0.5">
                                                {employee.panNumber || "Not Provided"}
                                            </p>
                                        </div>
                                        <div className="p-3.5 bg-slate-50/70 rounded-2xl border border-slate-200/60">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">UAN (PF Number)</p>
                                            <p className="text-xs sm:text-sm font-bold font-mono text-slate-800 mt-0.5">
                                                {employee.uanNumber || "Not Enrolled"}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 3: EDUCATION & PRIOR EXPERIENCE */}
                        {activeTab === "experience" && (
                            <div className="space-y-4 sm:space-y-6">
                                <div className="bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                                        <GraduationCap size={16} className="text-indigo-600" />
                                        Educational Background
                                    </h3>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                                        <div className="p-3.5 bg-slate-50/70 rounded-2xl border border-slate-200/60">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Highest Qualification</p>
                                            <p className="text-xs sm:text-sm font-bold text-slate-800 mt-0.5">
                                                {employee.education?.highestQualification || employee.highestQualification || "Not Specified"}
                                            </p>
                                        </div>
                                        <div className="p-3.5 bg-slate-50/70 rounded-2xl border border-slate-200/60">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Institute / University</p>
                                            <p className="text-xs sm:text-sm font-bold text-slate-800 truncate mt-0.5">
                                                {employee.education?.instituteName || employee.instituteName || "Not Specified"}
                                            </p>
                                        </div>
                                        <div className="p-3.5 bg-slate-50/70 rounded-2xl border border-slate-200/60">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Year of Passing</p>
                                            <p className="text-xs sm:text-sm font-bold font-mono text-slate-800 mt-0.5">
                                                {employee.education?.yearOfPassing || employee.yearOfPassing || "Not Specified"}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                                        <Briefcase size={16} className="text-indigo-600" />
                                        Prior Professional Experience
                                    </h3>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                                        <div className="p-3.5 bg-slate-50/70 rounded-2xl border border-slate-200/60">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Previous Company</p>
                                            <p className="text-xs sm:text-sm font-bold text-slate-800 mt-0.5">
                                                {employee.experience?.previousCompany || employee.previousCompany || "Fresher"}
                                            </p>
                                        </div>
                                        <div className="p-3.5 bg-slate-50/70 rounded-2xl border border-slate-200/60">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Previous Designation</p>
                                            <p className="text-xs sm:text-sm font-bold text-slate-800 mt-0.5">
                                                {employee.experience?.previousDesignation || employee.previousDesignation || "N/A"}
                                            </p>
                                        </div>
                                        <div className="p-3.5 bg-slate-50/70 rounded-2xl border border-slate-200/60">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Prior Experience</p>
                                            <p className="text-xs sm:text-sm font-bold font-mono text-indigo-700 mt-0.5">
                                                {employee.experience?.years || employee.previousExperienceYears || "0"} Years
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 4: IDENTITY & DOCUMENTS */}
                        {activeTab === "documents" && (
                            <div className="bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
                                <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                                    <FileText size={16} className="text-indigo-600" />
                                    Identity Proof & Uploaded Documents
                                </h3>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200/70 space-y-1">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Identity Document Type</p>
                                        <p className="text-xs sm:text-sm font-bold text-slate-800">
                                            {employee.idProofType || "National ID Card"}
                                        </p>
                                    </div>

                                    <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200/70 space-y-1">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Document Unique ID Number</p>
                                        <p className="text-xs sm:text-sm font-bold font-mono text-indigo-700 uppercase">
                                            {employee.idProofNumber || "Not recorded"}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                    {/* Resume Card */}
                                    <div className="p-4 bg-slate-50/60 hover:bg-slate-50 rounded-2xl border border-slate-200/80 transition-all space-y-3">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                                                <FileText size={20} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-slate-900 truncate">{resumeName}</p>
                                                <p className="text-[10px] text-slate-400 font-medium">Candidate Resume / CV</p>
                                            </div>
                                        </div>

                                        {resumeFile ? (
                                            <a
                                                href={resumeFile}
                                                download={resumeName}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center justify-center gap-1.5 w-full py-2 bg-white hover:bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-xl text-xs font-bold transition-all shadow-2xs"
                                            >
                                                <Download size={13} /> View / Download Resume
                                            </a>
                                        ) : (
                                            <div className="text-center py-2 text-xs text-slate-400 bg-white/60 rounded-xl border border-dashed border-slate-200 font-medium">
                                                No resume uploaded
                                            </div>
                                        )}
                                    </div>

                                    {/* ID Proof Card */}
                                    <div className="p-4 bg-slate-50/60 hover:bg-slate-50 rounded-2xl border border-slate-200/80 transition-all space-y-3">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                                                <BadgeCheck size={20} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-slate-900 truncate">{idProofName}</p>
                                                <p className="text-[10px] text-slate-400 font-medium">Government ID Document</p>
                                            </div>
                                        </div>

                                        {idProofFile ? (
                                            <a
                                                href={idProofFile}
                                                download={idProofName}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center justify-center gap-1.5 w-full py-2 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-all shadow-2xs"
                                            >
                                                <Download size={13} /> View / Download ID Proof
                                            </a>
                                        ) : (
                                            <div className="text-center py-2 text-xs text-slate-400 bg-white/60 rounded-xl border border-dashed border-slate-200 font-medium">
                                                No ID proof document uploaded
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="bg-white p-12 sm:p-16 text-center rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
                    <p className="text-sm sm:text-base font-bold text-slate-900">No employee records available</p>
                    <p className="text-xs text-slate-400">
                        Register personnel through the onboarding form to view their credentials.
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
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Loading Profile...</p>
                </div>
            }
        >
            <EmployeeProfileContent />
        </Suspense>
    );
}