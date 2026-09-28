"use client";

import { useEffect, useState, useRef, Suspense } from "react";
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
    Hash,
    BadgeCheck,
    MapPin,
    Clock,
    ShieldAlert,
    Camera,
    Upload,
    Landmark,
    CreditCard,
    GraduationCap,
    FileText,
    KeyRound,
    Droplet,
    Heart,
    X,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";

const GENDER_OPTIONS = [
    { value: "male", label: "Male" },
    { value: "female", label: "Female" },
    { value: "other", label: "Other" },
];

const EMPLOYMENT_TYPES = [
    "Full-time",
    "Part-time",
    "Contract",
    "Probationary",
    "Internship",
    "Remote",
];

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const MARITAL_STATUS_OPTIONS = ["Single", "Married", "Divorced", "Widowed"];

const EMPLOYEE_STATUS_OPTIONS = ["Active", "Probation", "Notice Period", "On Leave"];

const ROLE_OPTIONS = ["Employee", "Manager", "HR", "Admin"];

const PAYMENT_MODES = ["Bank Transfer", "Cheque", "Cash", "UPI"];

const ID_PROOF_TYPES = [
    "National ID / Unique ID Card",
    "Passport",
    "Voter ID",
    "Driving License",
    "Other Official ID",
];

// Reusable Section Header
function SectionHeader({ icon: Icon, index, title }) {
    return (
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <Icon size={16} className="text-indigo-600" />
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900">
                {index}. {title}
            </h2>
        </div>
    );
}

// Reusable Field Container
function Field({ icon: Icon, label, required, children }) {
    return (
        <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                {Icon && <Icon size={13} className="text-indigo-600 shrink-0" />}
                {label}
                {required && <span className="text-rose-500">*</span>}
            </label>
            {children}
        </div>
    );
}

const inputClass =
    "w-full px-3.5 sm:px-4 py-2.5 sm:py-3 bg-slate-50/70 hover:bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 outline-none transition-all shadow-2xs";

function EmployeeFormContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const editId = searchParams.get("id");
    const fileInputRef = useRef(null);
    const resumeInputRef = useRef(null);
    const idProofInputRef = useRef(null);

    const [form, setForm] = useState({
        // Personal
        employeeId: "",
        name: "",
        email: "",
        phone: "",
        gender: "male",
        dateOfBirth: "",
        bloodGroup: "",
        maritalStatus: "",
        avatar: "",

        // Job / Org
        designation: "",
        department: "",
        branch: "",
        employmentType: "Full-time",
        reportingManager: "",
        dateOfJoining: "",
        employeeStatus: "Active",

        // Salary & Bank
        salary: "",
        bankName: "",
        accountNumber: "",
        ifscCode: "",
        panNumber: "",
        uanNumber: "",
        paymentMode: "Bank Transfer",

        // Emergency Contact
        emergencyContactName: "",
        emergencyContactRelation: "",
        emergencyContactPhone: "",

        // Address
        address: "",
        city: "",
        state: "",
        pincode: "",

        // Education & Experience
        highestQualification: "",
        instituteName: "",
        yearOfPassing: "",
        previousCompany: "",
        previousDesignation: "",
        previousExperienceYears: "",

        // Identity Document & Verification
        idProofType: "National ID / Unique ID Card",
        idProofNumber: "",
        resumeFileName: "",
        resumeFileData: "",
        idProofFileName: "",
        idProofFileData: "",

        // Account & Access
        loginEmail: "",
        role: "Employee",
    });

    const [departmentsList, setDepartmentsList] = useState([]);
    const [designationsList, setDesignationsList] = useState([]);
    const [branchesList, setBranchesList] = useState([]);
    const [managersList, setManagersList] = useState([]);

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);

    // 1. Fetch lookup options
    useEffect(() => {
        async function loadSelectOptions() {
            try {
                const [deptRes, desigRes, branchRes, mgrRes] = await Promise.allSettled([
                    api.get("/organization/departments?status=active"),
                    api.get("/organization/designations?status=active"),
                    api.get("/organization/branches?status=active"),
                    api.get("/employees?status=active"),
                ]);

                if (deptRes.status === "fulfilled") {
                    const raw = deptRes.value?.data;
                    const list = Array.isArray(raw) ? raw : raw?.data || raw?.departments || [];
                    setDepartmentsList(list.filter((d) => d.status === undefined || d.status === "active" || d.isActive === true));
                }

                if (desigRes.status === "fulfilled") {
                    const raw = desigRes.value?.data;
                    const list = Array.isArray(raw) ? raw : raw?.data || raw?.designations || [];
                    setDesignationsList(list.filter((d) => d.status === undefined || d.status === "active" || d.isActive === true));
                }

                if (branchRes.status === "fulfilled") {
                    const raw = branchRes.value?.data;
                    const list = Array.isArray(raw) ? raw : raw?.data || raw?.branches || [];
                    setBranchesList(list.filter((b) => b.status === undefined || b.status === "active" || b.isActive === true));
                }

                if (mgrRes.status === "fulfilled") {
                    const raw = mgrRes.value?.data;
                    const list = Array.isArray(raw) ? raw : raw?.data || raw?.employees || [];
                    const filtered = list.filter((emp) => (!editId || emp._id !== editId) && (emp.status === undefined || emp.status === "active"));
                    setManagersList(filtered);
                }
            } catch (err) {
                console.error("Failed to load organization dropdown parameters:", err);
            }
        }

        loadSelectOptions();
    }, [editId]);

    // 2. Load existing data in Edit Mode
    useEffect(() => {
        if (editId) {
            setFetching(true);
            api
                .get(`/employees/${editId}`)
                .then((res) => {
                    const emp = res?.data?.employee || res?.data?.data || res?.data;
                    if (emp) {
                        const deptVal = emp.department?._id || (typeof emp.department === "string" ? emp.department : "");

                        let mgrVal = "";
                        if (emp.reportingManager && typeof emp.reportingManager === "object") {
                            mgrVal = emp.reportingManager.name || `${emp.reportingManager.firstName || ""} ${emp.reportingManager.lastName || ""}`.trim();
                        } else if (emp.reportingManager) {
                            mgrVal = String(emp.reportingManager);
                        }

                        const desigVal = typeof emp.designation === "object" && emp.designation !== null
                            ? emp.designation.title || emp.designation.name || emp.designation._id || ""
                            : emp.designation || "";

                        const branchVal = typeof emp.branch === "object" && emp.branch !== null
                            ? emp.branch.name || emp.branch.location || ""
                            : emp.branch || "";

                        setForm((prev) => ({
                            ...prev,
                            employeeId: emp.employeeId || "",
                            name: emp.name || `${emp.firstName || ""} ${emp.lastName || ""}`.trim(),
                            email: emp.email || "",
                            phone: emp.phone || "",
                            gender: String(emp.gender || "male").toLowerCase(),
                            dateOfBirth: emp.dateOfBirth || emp.dob ? (emp.dateOfBirth || emp.dob).split("T")[0] : "",
                            bloodGroup: emp.bloodGroup || "",
                            maritalStatus: emp.maritalStatus || "",
                            avatar: emp.avatar || emp.photo || "",

                            designation: desigVal,
                            department: deptVal,
                            branch: branchVal,
                            employmentType: emp.employmentType || "Full-time",
                            reportingManager: mgrVal,
                            dateOfJoining: emp.dateOfJoining || emp.joiningDate ? (emp.dateOfJoining || emp.joiningDate).split("T")[0] : "",
                            employeeStatus: emp.employeeStatus || "Active",

                            salary: emp.salary ?? "",
                            bankName: emp.bankDetails?.bankName || emp.bankName || "",
                            accountNumber: emp.bankDetails?.accountNumber || emp.accountNumber || "",
                            ifscCode: emp.bankDetails?.ifscCode || emp.ifscCode || "",
                            panNumber: emp.panNumber || "",
                            uanNumber: emp.uanNumber || "",
                            paymentMode: emp.bankDetails?.paymentMode || "Bank Transfer",

                            emergencyContactName: emp.emergencyContactName || emp.emergencyContact?.name || "",
                            emergencyContactRelation: emp.emergencyContactRelation || emp.emergencyContact?.relation || "",
                            emergencyContactPhone: emp.emergencyContactPhone || emp.emergencyContact?.phone || "",

                            address: emp.address || emp.residentialAddress?.street || "",
                            city: emp.city || emp.residentialAddress?.city || "",
                            state: emp.state || emp.residentialAddress?.state || "",
                            pincode: emp.pincode || emp.residentialAddress?.pincode || "",

                            highestQualification: emp.education?.highestQualification || "",
                            instituteName: emp.education?.instituteName || "",
                            yearOfPassing: emp.education?.yearOfPassing || "",
                            previousCompany: emp.experience?.previousCompany || "",
                            previousDesignation: emp.experience?.previousDesignation || "",
                            previousExperienceYears: emp.experience?.years || "",

                            idProofType: emp.idProofType || "National ID / Unique ID Card",
                            idProofNumber: emp.idProofNumber || "",
                            resumeFileName: emp.documents?.resumeFileName || "",
                            resumeFileData: emp.documents?.resumeFileData || emp.documents?.resumeUrl || "",
                            idProofFileName: emp.documents?.idProofFileName || "",
                            idProofFileData: emp.documents?.idProofFileData || emp.documents?.idProofUrl || "",

                            loginEmail: emp.loginEmail || emp.email || "",
                            role: emp.role || "Employee",
                        }));
                    }
                })
                .catch((err) => {
                    console.error("Failed to load employee details:", err);
                    setError("Failed to load employee record. Please refresh.");
                })
                .finally(() => setFetching(false));
        }
    }, [editId]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleAvatarUpload = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                toast.error("Avatar size should be under 2MB.");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setForm((prev) => ({ ...prev, avatar: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit

    const handleDocUpload = (e, fileKey, nameKey) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > MAX_FILE_SIZE) {
                toast.error("File size 5MB se kam hona chahiye. Kripya compress karein.");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setForm((prev) => ({
                    ...prev,
                    [fileKey]: reader.result,
                    [nameKey]: file.name,
                }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (!form.name.trim()) {
            setError("Employee full name is mandatory.");
            return;
        }
        if (!form.email.trim()) {
            setError("Corporate email address is mandatory.");
            return;
        }
        if (!form.department) {
            setError("Department selection is mandatory.");
            return;
        }
        if (!form.designation) {
            setError("Job designation is mandatory.");
            return;
        }
        if (!form.idProofNumber.trim()) {
            setError("Document Unique ID Number is required for verification.");
            return;
        }

        setLoading(true);

        try {
            const typedManager = form.reportingManager ? form.reportingManager.trim() : "";
            const matchedMgr = managersList.find((m) => {
                const fullName = m.name || `${m.firstName || ""} ${m.lastName || ""}`.trim();
                return fullName.toLowerCase() === typedManager.toLowerCase();
            });

            const resolvedManager = matchedMgr ? String(matchedMgr._id) : (typedManager || null);

            const payload = {
                ...form,
                employeeId: form.employeeId.trim(),
                name: form.name.trim(),
                email: form.email.trim().toLowerCase(),
                gender: form.gender.toLowerCase(),
                salary: form.salary !== "" ? Number(form.salary) : 0,
                reportingManager: resolvedManager,
                department: form.department && form.department !== "" ? form.department : null,
                branch: form.branch.trim() || "Main Campus",
                loginEmail: (form.loginEmail || form.email).trim().toLowerCase(),
                panNumber: form.panNumber.trim().toUpperCase() || undefined,
                idProofType: form.idProofType.trim(),
                idProofNumber: form.idProofNumber.trim().toUpperCase(),

                emergencyContactName: form.emergencyContactName.trim(),
                emergencyContactRelation: form.emergencyContactRelation.trim(),
                emergencyContactPhone: form.emergencyContactPhone.trim(),
                emergencyContact: {
                    name: form.emergencyContactName.trim(),
                    relation: form.emergencyContactRelation.trim(),
                    phone: form.emergencyContactPhone.trim(),
                },

                address: form.address.trim(),
                city: form.city.trim(),
                state: form.state.trim(),
                pincode: form.pincode.trim(),
                residentialAddress: {
                    street: form.address.trim(),
                    city: form.city.trim(),
                    state: form.state.trim(),
                    pincode: form.pincode.trim(),
                },

                bankDetails: {
                    bankName: form.bankName.trim(),
                    accountNumber: form.accountNumber.trim(),
                    ifscCode: form.ifscCode.trim().toUpperCase(),
                    paymentMode: form.paymentMode,
                },

                education: {
                    highestQualification: form.highestQualification.trim(),
                    instituteName: form.instituteName.trim(),
                    yearOfPassing: form.yearOfPassing ? Number(form.yearOfPassing) : null,
                },

                experience: {
                    previousCompany: form.previousCompany.trim(),
                    previousDesignation: form.previousDesignation.trim(),
                    years: form.previousExperienceYears ? Number(form.previousExperienceYears) : 0,
                },

                documents: {
                    resumeFileName: form.resumeFileName,
                    resumeFileData: form.resumeFileData,
                    idProofFileName: form.idProofFileName,
                    idProofFileData: form.idProofFileData,
                },
            };

            if (editId) {
                try {
                    await api.put(`/employees/${editId}`, payload);
                } catch (putErr) {
                    if (putErr.response?.status === 404 || putErr.response?.data?.message?.includes("not found")) {
                        await api.put(`/employees/update/${editId}`, payload);
                    } else {
                        throw putErr;
                    }
                }
                toast.success("Employee record saved successfully!");
            } else {
                await api.post("/employees", payload);
                toast.success("Employee registered successfully!");
            }

            router.refresh();
            router.push("/employees");

            setTimeout(() => {
                if (typeof window !== "undefined" && window.location.pathname.includes("/add")) {
                    window.location.href = "/employees";
                }
            }, 400);
        } catch (err) {
            console.error("Backend error:", err.response?.data);
            const errMsg =
                err.response?.data?.message ||
                err.response?.data?.error ||
                "Failed to save employee profile. Duplicate credentials or invalid fields detected.";
            setError(errMsg);
            toast.error(errMsg);
            setLoading(false);
        }
    };

    if (fetching) {
        return (
            <div className="w-full min-h-[500px] flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 size={36} className="animate-spin text-indigo-600" />
                <p className="text-xs font-bold tracking-wider text-slate-600 uppercase">
                    Loading Employee Profile...
                </p>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 antialiased font-sans text-slate-900">
            {/* Top Navigation Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-7 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center gap-3.5">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="p-2.5 rounded-xl sm:rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 shadow-2xs transition-all active:scale-95 shrink-0 cursor-pointer"
                        title="Go Back"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                                {editId ? "Update Employee Profile" : "Register New Employee"}
                            </h1>
                            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                                <BadgeCheck size={12} /> HRMS Master Record
                            </span>
                        </div>
                        <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5">
                            Complete the corporate credential parameters and personal records.
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Form Card */}
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-5 sm:p-8 shadow-xs transition-all">
                {error && (
                    <div className="flex items-center gap-2.5 bg-rose-50 border border-rose-200/80 text-rose-700 text-xs sm:text-sm px-4 py-3 rounded-2xl mb-6 shadow-2xs">
                        <AlertCircle size={16} className="shrink-0 text-rose-500" />
                        <span className="font-semibold">{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-8 sm:space-y-10">
                    {/* SECTION 1: PERSONAL IDENTITY */}
                    <div className="space-y-4">
                        <SectionHeader icon={User} index={1} title="Personal Identity & Credentials" />

                        <div className="flex flex-col items-center gap-2 pb-1">
                            <div className="relative w-24 h-24 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 p-1 flex items-center justify-center overflow-hidden group shadow-inner">
                                {form.avatar ? (
                                    <img src={form.avatar} alt="Preview" className="w-full h-full object-cover rounded-xl" />
                                ) : (
                                    <Camera className="w-8 h-8 text-slate-400" />
                                )}
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1 text-[10px] font-bold transition-opacity cursor-pointer rounded-xl"
                                >
                                    <Upload size={14} />
                                    <span>Upload Photo</span>
                                </button>
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleAvatarUpload}
                                className="hidden"
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 underline cursor-pointer"
                            >
                                Upload Profile Photo
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                            <Field icon={Hash} label="Employee ID">
                                <input
                                    type="text"
                                    name="employeeId"
                                    placeholder="e.g. EMP0001 (auto if blank)"
                                    value={form.employeeId}
                                    onChange={handleChange}
                                    className={`${inputClass} font-mono uppercase`}
                                />
                            </Field>

                            <Field icon={User} label="Full Name" required>
                                <input
                                    type="text"
                                    name="name"
                                    required
                                    placeholder="e.g. Rahul Sharma"
                                    value={form.name}
                                    onChange={handleChange}
                                    className={inputClass}
                                />
                            </Field>

                            <Field icon={Mail} label="Corporate Email" required>
                                <input
                                    type="email"
                                    name="email"
                                    required
                                    placeholder="rahul.sharma@company.com"
                                    value={form.email}
                                    onChange={handleChange}
                                    className={inputClass}
                                />
                            </Field>

                            <Field icon={Phone} label="Primary Phone">
                                <input
                                    type="tel"
                                    name="phone"
                                    placeholder="+91 98765 43210"
                                    value={form.phone}
                                    onChange={handleChange}
                                    className={`${inputClass} font-mono`}
                                />
                            </Field>

                            <Field icon={User} label="Gender">
                                <select
                                    name="gender"
                                    value={form.gender}
                                    onChange={handleChange}
                                    className={`${inputClass} cursor-pointer`}
                                >
                                    {GENDER_OPTIONS.map((g) => (
                                        <option key={g.value} value={g.value}>
                                            {g.label}
                                        </option>
                                    ))}
                                </select>
                            </Field>

                            <Field icon={Calendar} label="Date of Birth">
                                <input
                                    type="date"
                                    name="dateOfBirth"
                                    value={form.dateOfBirth}
                                    onChange={handleChange}
                                    className={`${inputClass} cursor-pointer`}
                                />
                            </Field>

                            <Field icon={Droplet} label="Blood Group">
                                <select
                                    name="bloodGroup"
                                    value={form.bloodGroup}
                                    onChange={handleChange}
                                    className={`${inputClass} cursor-pointer`}
                                >
                                    <option value="">-- Select --</option>
                                    {BLOOD_GROUPS.map((bg) => (
                                        <option key={bg} value={bg}>
                                            {bg}
                                        </option>
                                    ))}
                                </select>
                            </Field>

                            <Field icon={Heart} label="Marital Status">
                                <select
                                    name="maritalStatus"
                                    value={form.maritalStatus}
                                    onChange={handleChange}
                                    className={`${inputClass} cursor-pointer`}
                                >
                                    <option value="">-- Select --</option>
                                    {MARITAL_STATUS_OPTIONS.map((s) => (
                                        <option key={s} value={s}>
                                            {s}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                        </div>
                    </div>

                    {/* SECTION 2: JOB & ORGANIZATION ASSIGNMENT */}
                    <div className="space-y-4">
                        <SectionHeader icon={Building2} index={2} title="Job Role & Organization Assignment" />

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                            <Field icon={Building2} label="Department" required>
                                <select
                                    name="department"
                                    required
                                    value={form.department}
                                    onChange={handleChange}
                                    className={`${inputClass} cursor-pointer`}
                                >
                                    <option value="">-- Select Active Department --</option>
                                    {departmentsList.map((dept, index) => {
                                        const deptId = dept._id || dept.id || index;
                                        const label = dept.name || dept.title || dept;
                                        return (
                                            <option key={deptId} value={deptId}>
                                                {label}
                                            </option>
                                        );
                                    })}
                                </select>
                            </Field>

                            <Field icon={Briefcase} label="Job Designation" required>
                                <select
                                    name="designation"
                                    required
                                    value={form.designation}
                                    onChange={handleChange}
                                    className={`${inputClass} cursor-pointer`}
                                >
                                    <option value="">-- Select Designation --</option>
                                    {designationsList.map((desig, index) => {
                                        const label = typeof desig === "string" ? desig : desig.title || desig.name || "";
                                        const val = desig._id || label;
                                        return (
                                            <option key={desig._id || index} value={val}>
                                                {label}
                                            </option>
                                        );
                                    })}
                                </select>
                            </Field>

                            <Field icon={MapPin} label="Branch / Workplace Hub">
                                <input
                                    type="text"
                                    name="branch"
                                    list="branches-datalist"
                                    value={form.branch}
                                    onChange={handleChange}
                                    placeholder="Type or pick workplace hub..."
                                    className={inputClass}
                                />
                                <datalist id="branches-datalist">
                                    {branchesList.map((b, i) => {
                                        const name = typeof b === "string" ? b : b.name || b.location || "";
                                        return name ? <option key={b._id || i} value={name} /> : null;
                                    })}
                                </datalist>
                            </Field>

                            <Field icon={Clock} label="Employment Type">
                                <select
                                    name="employmentType"
                                    value={form.employmentType}
                                    onChange={handleChange}
                                    className={`${inputClass} cursor-pointer`}
                                >
                                    {EMPLOYMENT_TYPES.map((t) => (
                                        <option key={t} value={t}>
                                            {t}
                                        </option>
                                    ))}
                                </select>
                            </Field>

                            <Field icon={Calendar} label="Date of Joining">
                                <input
                                    type="date"
                                    name="dateOfJoining"
                                    value={form.dateOfJoining}
                                    onChange={handleChange}
                                    className={`${inputClass} cursor-pointer`}
                                />
                            </Field>

                            <Field icon={User} label="Reporting Manager">
                                <input
                                    type="text"
                                    name="reportingManager"
                                    list="managers-datalist"
                                    value={form.reportingManager}
                                    onChange={handleChange}
                                    placeholder="Type or pick manager name..."
                                    className={inputClass}
                                />
                                <datalist id="managers-datalist">
                                    {managersList.map((m) => {
                                        const name = m.name || `${m.firstName || ""} ${m.lastName || ""}`.trim();
                                        return name ? <option key={m._id} value={name} /> : null;
                                    })}
                                </datalist>
                            </Field>

                            <Field icon={BadgeCheck} label="Employee Status">
                                <select
                                    name="employeeStatus"
                                    value={form.employeeStatus}
                                    onChange={handleChange}
                                    className={`${inputClass} cursor-pointer`}
                                >
                                    {EMPLOYEE_STATUS_OPTIONS.map((s) => (
                                        <option key={s} value={s}>
                                            {s}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                        </div>
                    </div>

                    {/* SECTION 3: SALARY & BANK DETAILS */}
                    <div className="space-y-4">
                        <SectionHeader icon={IndianRupee} index={3} title="Salary & Bank Details" />

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                            <Field icon={IndianRupee} label="Monthly Base CTC (₹)">
                                <input
                                    type="number"
                                    name="salary"
                                    placeholder="e.g. 65000"
                                    value={form.salary}
                                    onChange={handleChange}
                                    className={`${inputClass} font-mono`}
                                />
                            </Field>

                            <Field icon={CreditCard} label="Payment Mode">
                                <select
                                    name="paymentMode"
                                    value={form.paymentMode}
                                    onChange={handleChange}
                                    className={`${inputClass} cursor-pointer`}
                                >
                                    {PAYMENT_MODES.map((m) => (
                                        <option key={m} value={m}>
                                            {m}
                                        </option>
                                    ))}
                                </select>
                            </Field>

                            <Field icon={Landmark} label="Bank Name">
                                <input
                                    type="text"
                                    name="bankName"
                                    placeholder="e.g. HDFC Bank"
                                    value={form.bankName}
                                    onChange={handleChange}
                                    className={inputClass}
                                />
                            </Field>

                            <Field icon={Hash} label="Account Number">
                                <input
                                    type="text"
                                    name="accountNumber"
                                    placeholder="e.g. 5021XXXXXX1234"
                                    value={form.accountNumber}
                                    onChange={handleChange}
                                    className={`${inputClass} font-mono`}
                                />
                            </Field>

                            <Field icon={Hash} label="IFSC Code">
                                <input
                                    type="text"
                                    name="ifscCode"
                                    placeholder="e.g. HDFC0001234"
                                    value={form.ifscCode}
                                    onChange={handleChange}
                                    className={`${inputClass} font-mono uppercase`}
                                />
                            </Field>

                            <Field icon={Hash} label="PAN Number (Unique)">
                                <input
                                    type="text"
                                    name="panNumber"
                                    placeholder="e.g. ABCDE1234F"
                                    value={form.panNumber}
                                    onChange={handleChange}
                                    className={`${inputClass} font-mono uppercase`}
                                />
                            </Field>

                            <Field icon={Hash} label="UAN Number (PF)">
                                <input
                                    type="text"
                                    name="uanNumber"
                                    placeholder="e.g. 101234567890"
                                    value={form.uanNumber}
                                    onChange={handleChange}
                                    className={`${inputClass} font-mono`}
                                />
                            </Field>
                        </div>
                    </div>

                    {/* SECTION 4: EMERGENCY CONTACT & RESIDENTIAL ADDRESS */}
                    <div className="space-y-4">
                        <SectionHeader icon={ShieldAlert} index={4} title="Emergency Contact & Residential Address" />

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
                            <Field label="Emergency Contact Name">
                                <input
                                    type="text"
                                    name="emergencyContactName"
                                    placeholder="e.g. Sunita Sharma"
                                    value={form.emergencyContactName}
                                    onChange={handleChange}
                                    className={inputClass}
                                />
                            </Field>

                            <Field label="Relationship">
                                <input
                                    type="text"
                                    name="emergencyContactRelation"
                                    placeholder="e.g. Spouse / Father / Sister"
                                    value={form.emergencyContactRelation}
                                    onChange={handleChange}
                                    className={inputClass}
                                />
                            </Field>

                            <Field label="Emergency Phone Number">
                                <input
                                    type="tel"
                                    name="emergencyContactPhone"
                                    placeholder="+91 98111 22334"
                                    value={form.emergencyContactPhone}
                                    onChange={handleChange}
                                    className={`${inputClass} font-mono`}
                                />
                            </Field>

                            <div className="sm:col-span-3">
                                <Field icon={MapPin} label="Street Address">
                                    <input
                                        type="text"
                                        name="address"
                                        placeholder="Apartment/House No, Floor, Landmark, Area street..."
                                        value={form.address}
                                        onChange={handleChange}
                                        className={inputClass}
                                    />
                                </Field>
                            </div>

                            <Field label="City">
                                <input
                                    type="text"
                                    name="city"
                                    placeholder="e.g. Noida / Bengaluru"
                                    value={form.city}
                                    onChange={handleChange}
                                    className={inputClass}
                                />
                            </Field>

                            <Field label="State / Province">
                                <input
                                    type="text"
                                    name="state"
                                    placeholder="e.g. Uttar Pradesh / Karnataka"
                                    value={form.state}
                                    onChange={handleChange}
                                    className={inputClass}
                                />
                            </Field>

                            <Field label="Postal PIN Code">
                                <input
                                    type="text"
                                    name="pincode"
                                    placeholder="e.g. 201301"
                                    value={form.pincode}
                                    onChange={handleChange}
                                    className={`${inputClass} font-mono`}
                                />
                            </Field>
                        </div>
                    </div>

                    {/* SECTION 5: EDUCATION & EXPERIENCE */}
                    <div className="space-y-4">
                        <SectionHeader icon={GraduationCap} index={5} title="Education & Prior Experience" />

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                            <Field icon={GraduationCap} label="Highest Qualification">
                                <input
                                    type="text"
                                    name="highestQualification"
                                    placeholder="e.g. B.Tech CSE"
                                    value={form.highestQualification}
                                    onChange={handleChange}
                                    className={inputClass}
                                />
                            </Field>

                            <Field label="Institute / University">
                                <input
                                    type="text"
                                    name="instituteName"
                                    placeholder="e.g. Vivekananda Global University"
                                    value={form.instituteName}
                                    onChange={handleChange}
                                    className={inputClass}
                                />
                            </Field>

                            <Field icon={Calendar} label="Year of Passing">
                                <input
                                    type="number"
                                    name="yearOfPassing"
                                    placeholder="e.g. 2023"
                                    value={form.yearOfPassing}
                                    onChange={handleChange}
                                    className={`${inputClass} font-mono`}
                                />
                            </Field>

                            <Field icon={Briefcase} label="Previous Company">
                                <input
                                    type="text"
                                    name="previousCompany"
                                    placeholder="e.g. Codtech IT Solutions"
                                    value={form.previousCompany}
                                    onChange={handleChange}
                                    className={inputClass}
                                />
                            </Field>

                            <Field label="Previous Designation">
                                <input
                                    type="text"
                                    name="previousDesignation"
                                    placeholder="e.g. Frontend Developer Intern"
                                    value={form.previousDesignation}
                                    onChange={handleChange}
                                    className={inputClass}
                                />
                            </Field>

                            <Field label="Total Prior Experience (Years)">
                                <input
                                    type="number"
                                    step="0.1"
                                    name="previousExperienceYears"
                                    placeholder="e.g. 1.5"
                                    value={form.previousExperienceYears}
                                    onChange={handleChange}
                                    className={`${inputClass} font-mono`}
                                />
                            </Field>
                        </div>
                    </div>

                    {/* SECTION 6: DOCUMENTS & IDENTITY PROOF (UNIQUE ID NUMBER ENFORCED) */}
                    <div className="space-y-4">
                        <SectionHeader icon={FileText} index={6} title="Identity Verification & Document Upload" />

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                            <Field icon={BadgeCheck} label="ID Document Type" required>
                                <select
                                    name="idProofType"
                                    value={form.idProofType}
                                    onChange={handleChange}
                                    className={`${inputClass} cursor-pointer`}
                                >
                                    {ID_PROOF_TYPES.map((type) => (
                                        <option key={type} value={type}>
                                            {type}
                                        </option>
                                    ))}
                                </select>
                            </Field>

                            <Field icon={Hash} label="Document Unique ID Number" required>
                                <input
                                    type="text"
                                    name="idProofNumber"
                                    required
                                    placeholder="Enter Document ID Number"
                                    value={form.idProofNumber}
                                    onChange={handleChange}
                                    className={`${inputClass} font-mono uppercase`}
                                />
                            </Field>

                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                    <Upload size={13} className="text-indigo-600 shrink-0" /> Upload ID Proof File
                                </label>
                                <div
                                    onClick={() => idProofInputRef.current?.click()}
                                    className="w-full px-4 py-2.5 sm:py-3 bg-slate-50/70 hover:bg-slate-50 border border-dashed border-slate-300 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-semibold text-slate-500 flex items-center justify-between gap-2 cursor-pointer transition-all"
                                >
                                    <span className="truncate flex items-center gap-2">
                                        <Upload size={14} className="text-indigo-600 shrink-0" />
                                        {form.idProofFileName || "Upload ID file (PDF/Image)"}
                                    </span>
                                    {form.idProofFileName && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setForm((prev) => ({ ...prev, idProofFileName: "", idProofFileData: "" }));
                                            }}
                                            className="p-1 rounded-full hover:bg-slate-200 text-slate-500 cursor-pointer shrink-0"
                                        >
                                            <X size={13} />
                                        </button>
                                    )}
                                </div>
                                <input
                                    ref={idProofInputRef}
                                    type="file"
                                    accept=".pdf,image/*"
                                    onChange={(e) => handleDocUpload(e, "idProofFileData", "idProofFileName")}
                                    className="hidden"
                                />
                            </div>

                            {/* Resume Upload */}
                            <div className="sm:col-span-2 lg:col-span-3 space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                    <FileText size={13} className="text-indigo-600 shrink-0" /> Resume / Curriculum Vitae (CV)
                                </label>
                                <div
                                    onClick={() => resumeInputRef.current?.click()}
                                    className="w-full px-4 py-3 bg-slate-50/70 hover:bg-slate-50 border border-dashed border-slate-300 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-semibold text-slate-500 flex items-center justify-between gap-2 cursor-pointer transition-all"
                                >
                                    <span className="truncate flex items-center gap-2">
                                        <Upload size={14} className="text-indigo-600 shrink-0" />
                                        {form.resumeFileName || "Click to attach candidate resume (PDF/DOC up to 2MB)"}
                                    </span>
                                    {form.resumeFileName && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setForm((prev) => ({ ...prev, resumeFileName: "", resumeFileData: "" }));
                                            }}
                                            className="p-1 rounded-full hover:bg-slate-200 text-slate-500 cursor-pointer shrink-0"
                                        >
                                            <X size={13} />
                                        </button>
                                    )}
                                </div>
                                <input
                                    ref={resumeInputRef}
                                    type="file"
                                    accept=".pdf,.doc,.docx"
                                    onChange={(e) => handleDocUpload(e, "resumeFileData", "resumeFileName")}
                                    className="hidden"
                                />
                            </div>
                        </div>
                    </div>

                    {/* SECTION 7: ACCOUNT & ACCESS */}
                    <div className="space-y-4">
                        <SectionHeader icon={KeyRound} index={7} title="Account & Access" />

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                            <Field icon={Mail} label="Login Email">
                                <input
                                    type="email"
                                    name="loginEmail"
                                    placeholder="Defaults to corporate email if blank"
                                    value={form.loginEmail}
                                    onChange={handleChange}
                                    className={inputClass}
                                />
                            </Field>

                            <Field icon={KeyRound} label="System Role">
                                <select
                                    name="role"
                                    value={form.role}
                                    onChange={handleChange}
                                    className={`${inputClass} cursor-pointer`}
                                >
                                    {ROLE_OPTIONS.map((r) => (
                                        <option key={r} value={r}>
                                            {r}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium">
                            An invite link with initial login credentials will be generated upon registration.
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 sm:gap-3 pt-5 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="w-full sm:w-auto px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs sm:text-sm font-bold transition-all active:scale-95 cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs sm:text-sm font-bold shadow-sm shadow-indigo-600/20 disabled:opacity-60 transition-all active:scale-95 cursor-pointer"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={16} className="animate-spin shrink-0" />
                                    <span>Submitting & Redirecting...</span>
                                </>
                            ) : editId ? (
                                <>
                                    <Save size={16} className="shrink-0" />
                                    <span>Update Profile</span>
                                </>
                            ) : (
                                <>
                                    <UserPlus size={16} className="shrink-0" />
                                    <span>Complete Registration</span>
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
        <Suspense
            fallback={
                <div className="w-full min-h-[500px] flex flex-col items-center justify-center gap-3 text-slate-400">
                    <Loader2 size={36} className="animate-spin text-indigo-600" />
                    <p className="text-xs font-bold tracking-wider text-slate-600 uppercase">
                        Loading Form...
                    </p>
                </div>
            }
        >
            <EmployeeFormContent />
        </Suspense>
    );
}