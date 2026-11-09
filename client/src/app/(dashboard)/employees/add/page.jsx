"use client";

import { useEffect, useMemo, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    User,
    Briefcase,
    AlertCircle,
    Loader2,
    Save,
    Upload,
    Landmark,
    FileText,
    X,
    CheckCircle2,
    ChevronRight,
    Camera,
    Trash2,
    CalendarDays,
    IndianRupee,
    Mail,
    Phone,
    CreditCard,
    MapPin,
    Search,
    LocateFixed,
    RefreshCw,
    KeyRound,
    Eye,
    EyeOff,
    Copy,
    Check,
    ShieldCheck,
    Share2,
    Info,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import { useAuth } from "@/context/AuthContext";

/* -------------------------------------------------------------------------- */
/* CONSTANTS                                                                  */
/* -------------------------------------------------------------------------- */

const COMPANY_NAME = "HRMS Portal"; // shown in the login details message. Change it to your company name.
const ID_PREFIX = "FPS"; // employee ids look like FPS0001, FPS0002 ... (the server assigns them)

const PHONE_DIGITS = 10; // phone number length (country code + mobile number, for example 919876543210)
const PHONE_REGEX = new RegExp(`^[1-9]\\d{${PHONE_DIGITS - 1}}$`);
const INDIA_BBOX = "68.1,6.7,97.5,35.7"; // minLon,minLat,maxLon,maxLat: location search stays inside India

const GENDER_OPTIONS = [
    { value: "male", label: "Male", sub: "Identify as male" },
    { value: "female", label: "Female", sub: "Identify as female" },
    { value: "other", label: "Other", sub: "Prefer not to say" },
];

const EMPLOYMENT_TYPES = [
    "Full-time",
    "Part-time",
    "Contract",
    "Probationary",
    "Internship",
    "Remote",
    "Hybrid",
    "Freelance",
];

const EMPLOYEE_STATUS_OPTIONS = [
    "Active",
    "Inactive",
];

/* Access role of the login account. "Admin" is shown only when an existing admin is being edited. */
const ROLE_OPTIONS = ["Employee", "Manager", "HR"];
const ALL_ROLES = [...ROLE_OPTIONS, "Admin"];

const DESIGNATION_PRESETS = [
    "Software Engineer",
    "Senior Software Engineer",
    "Frontend Developer",
    "Backend Developer",
    "Full Stack Developer",
    "UI/UX Designer",
    "Product Designer",
    "Project Manager",
    "Product Manager",
    "Team Lead",
    "HR Executive",
    "HR Manager",
    "Accountant",
    "Finance Executive",
    "Sales Executive",
    "Business Development Executive",
    "Marketing Executive",
    "Operations Executive",
    "Customer Support Executive",
    "IT Support Executive",
    "Office Administrator",
    "Intern",
];

const DEPARTMENT_PRESETS = [
    "Human Resources",
    "Engineering",
    "Information Technology",
    "Finance",
    "Accounts",
    "Sales",
    "Marketing",
    "Operations",
    "Administration",
    "Customer Support",
    "Product",
    "Design",
    "Legal",
    "Procurement",
    "Quality Assurance",
];

/* Step 5 (Login Access) is removed for everyone except the admin, inside the component */
const ALL_STEPS = [
    { step: 1, title: "Personal Info", icon: User },
    { step: 2, title: "Job Details", icon: Briefcase },
    { step: 3, title: "Documents", icon: FileText },
    { step: 4, title: "Banking Info", icon: Landmark },
    { step: 5, title: "Login Access", icon: KeyRound },
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB (original file, before compression)

/* Fields validated at each step */
const STEP_FIELDS = {
    1: ["employeeId", "firstName", "lastName", "email", "phone", "gender", "address", "city", "state", "pincode"],
    2: [
        "designation",
        "designationOther",
        "department",
        "departmentOther",
        "employmentType",
        "employeeStatus",
        "reportingManager",
        "dateOfJoining",
        "salary",
    ],
    3: ["aadhaarNumber", "nationalIdFrontFileData", "nationalIdBackFileData", "panNumber", "panCardFileData"],
    4: ["accountName", "bankName", "branchName", "accountNumber", "ifscCode"],
    5: ["loginEmail", "password", "role"],
};

/* -------------------------------------------------------------------------- */
/* ZOD SCHEMAS (one schema per step)                                          */
/* -------------------------------------------------------------------------- */

const NAME_REGEX = /^[A-Za-z][A-Za-z .'-]*$/;
const AADHAAR_REGEX = /^[2-9]\d{11}$/;
const PAN_REGEX = /^[A-Z]{5}\d{4}[A-Z]$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,32}$/;
const PASSWORD_MESSAGE = "Password must be 8-32 characters with an uppercase letter, a lowercase letter and a number";
const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

const isObjectId = (v) => OBJECT_ID_REGEX.test(String(v || ""));

const nameField = (label, max = 30) =>
    z
        .string()
        .trim()
        .min(2, `${label} must be at least 2 characters`)
        .max(max, `${label} must not exceed ${max} characters`)
        .regex(NAME_REGEX, `${label} can contain only letters`);

const oneOf = (list, message) => z.string().refine((v) => list.includes(v), message);

const step1Schema = z.object({
    /* the server assigns the ID, so an empty value is fine */
    employeeId: z
        .string()
        .trim()
        .regex(/^([A-Za-z0-9-]{3,20})?$/, "Employee ID must be 3 to 20 characters (letters, numbers and hyphens only)"),
    firstName: nameField("First name"),
    lastName: nameField("Last name"),
    email: z
        .string()
        .trim()
        .min(1, "Email address is required")
        .max(100, "Email address must not exceed 100 characters")
        .email("Please enter a valid email address"),
    phone: z
        .string()
        .trim()
        .min(1, "Phone number is required")
        .regex(PHONE_REGEX, `Enter a valid ${PHONE_DIGITS}-digit number with the country code (for example, 919876543210)`),
    gender: oneOf(
        GENDER_OPTIONS.map((g) => g.value),
        "Please select a gender"
    ),
    address: z
        .string()
        .trim()
        .min(5, "Address must be at least 5 characters")
        .max(200, "Address must not exceed 200 characters"),
    city: nameField("City", 40),
    state: nameField("State", 40),
    pincode: z
        .string()
        .trim()
        .regex(/^[1-9]\d{5}$/, "Pincode must be exactly 6 digits"),
});

const step2Schema = z
    .object({
        designation: z.string().min(1, "Please select a designation"),
        designationOther: z.string().optional(),
        department: z.string().min(1, "Please select a department"),
        departmentOther: z.string().optional(),
        employmentType: oneOf(EMPLOYMENT_TYPES, "Please select an employment type"),
        employeeStatus: oneOf(EMPLOYEE_STATUS_OPTIONS, "Please select an employee status"),
        /* Empty = no manager. Otherwise it must be a real employee id. */
        reportingManager: z
            .string()
            .optional()
            .refine((v) => !v || isObjectId(v), "Please select the reporting manager from the list"),
        dateOfJoining: z
            .string()
            .min(1, "Joining date is required")
            .refine((v) => {
                const d = new Date(v);
                if (Number.isNaN(d.getTime())) return false;
                const limit = new Date();
                limit.setFullYear(limit.getFullYear() + 1);
                return d.getFullYear() >= 1990 && d <= limit;
            }, "Enter a valid joining date"),
        salary: z
            .string()
            .min(1, "Monthly salary is required")
            .regex(/^\d{1,9}$/, "Salary must contain digits only")
            .refine((v) => Number(v) > 0, "Salary must be greater than 0"),
    })
    .superRefine((data, ctx) => {
        const checkOther = (selectKey, otherKey, label) => {
            if (data[selectKey] !== "Other") return;
            const value = (data[otherKey] || "").trim();
            if (value.length < 2) {
                ctx.addIssue({ code: "custom", path: [otherKey], message: `Please enter the ${label}` });
            } else if (value.length > 50) {
                ctx.addIssue({ code: "custom", path: [otherKey], message: `${label} must not exceed 50 characters` });
            } else if (!/^[A-Za-z0-9 &/.'-]+$/.test(value)) {
                ctx.addIssue({ code: "custom", path: [otherKey], message: `${label} contains invalid characters` });
            }
        };
        checkOther("designation", "designationOther", "designation");
        checkOther("department", "departmentOther", "department");
    });

const step3Schema = z.object({
    aadhaarNumber: z
        .string()
        .trim()
        .min(1, "Aadhaar number is required")
        .regex(AADHAAR_REGEX, "Aadhaar number must be 12 digits and cannot start with 0 or 1"),
    nationalIdFrontFileData: z.string().min(1, "Front side of the Aadhaar card is required"),
    nationalIdBackFileData: z.string().min(1, "Back side of the Aadhaar card is required"),
    panNumber: z
        .string()
        .trim()
        .toUpperCase()
        .min(1, "PAN number is required")
        .regex(PAN_REGEX, "Enter a valid PAN number (for example, ABCDE1234F)"),
    panCardFileData: z.string().min(1, "PAN card image is required"),
});

const step4Schema = z.object({
    accountName: nameField("Account holder name", 60),
    bankName: z
        .string()
        .trim()
        .min(2, "Bank name must be at least 2 characters")
        .max(60, "Bank name must not exceed 60 characters")
        .regex(/^[A-Za-z][A-Za-z .&'-]*$/, "Bank name can contain only letters"),
    branchName: z
        .string()
        .trim()
        .min(2, "Branch name must be at least 2 characters")
        .max(60, "Branch name must not exceed 60 characters")
        .regex(/^[A-Za-z0-9][A-Za-z0-9 .,&'-]*$/, "Branch name contains invalid characters"),
    accountNumber: z
        .string()
        .trim()
        .regex(/^\d{9,18}$/, "Account number must be 9 to 18 digits"),
    ifscCode: z
        .string()
        .trim()
        .toUpperCase()
        .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Enter a valid IFSC code (for example, SBIN0001234)"),
});

/* hasLogin = this employee already has a login account (then a blank password means "keep the current one") */
const step5Schema = z
    .object({
        loginEmail: z
            .string()
            .trim()
            .min(1, "Login email is required")
            .max(100, "Login email must not exceed 100 characters")
            .email("Please enter a valid login email address"),
        password: z.string(),
        role: oneOf(ALL_ROLES, "Please select an access role"),
        hasLogin: z.boolean().optional(),
    })
    .superRefine((data, ctx) => {
        if (!data.hasLogin && !data.password) {
            ctx.addIssue({ code: "custom", path: ["password"], message: "Password is required for the employee login" });
        } else if (data.password && !PASSWORD_REGEX.test(data.password)) {
            ctx.addIssue({ code: "custom", path: ["password"], message: PASSWORD_MESSAGE });
        }
    });

const STEP_SCHEMAS = { 1: step1Schema, 2: step2Schema, 3: step3Schema, 4: step4Schema, 5: step5Schema };

/* -------------------------------------------------------------------------- */
/* STYLES & HELPERS                                                           */
/* -------------------------------------------------------------------------- */

const inputClass =
    "w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-base sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";

const errorInputClass =
    "w-full px-4 py-3 bg-white border border-red-400 rounded-xl text-base sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-red-500 focus:ring-4 focus:ring-red-500/10";

/* Input sanitizers: block unwanted characters while typing */
const clean = {
    digits: (max) => (v) => v.replace(/\D/g, "").slice(0, max),
    name: (max) => (v) =>
        v
            .replace(/[^A-Za-z .'-]/g, "")
            .replace(/^\s+/, "")
            .replace(/\s{2,}/g, " ")
            .slice(0, max),
    alnumUpper: (max) => (v) => v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, max),
    email: (v) => v.replace(/\s/g, "").slice(0, 100),
    loginEmail: (v) => v.replace(/\s/g, "").toLowerCase().slice(0, 100),
    password: (v) => v.replace(/\s/g, "").slice(0, 32),
    text: (max) => (v) => v.replace(/^\s+/, "").replace(/\s{2,}/g, " ").slice(0, max),
    branch: (max) => (v) =>
        v
            .replace(/[^A-Za-z0-9 .,&'-]/g, "")
            .replace(/^\s+/, "")
            .replace(/\s{2,}/g, " ")
            .slice(0, max),
    bank: (max) => (v) =>
        v
            .replace(/[^A-Za-z .&'-]/g, "")
            .replace(/^\s+/, "")
            .replace(/\s{2,}/g, " ")
            .slice(0, max),
};

/* An old 10-digit mobile number becomes 91 + number. Anything longer is cut to the last PHONE_DIGITS digits. */
const normalizePhone = (v) => {
    const d = String(v || "").replace(/\D/g, "");
    return d.length === 10 ? `91${d}` : d.slice(-PHONE_DIGITS);
};

const getEmployeeName = (employee) => {
    if (!employee) return "";
    return employee.name || employee.fullName || `${employee.firstName || ""} ${employee.lastName || ""}`.trim();
};

const getLookupId = (item) => {
    if (!item) return "";
    if (typeof item === "object") return item._id || item.id || "";
    return item;
};

const getLookupLabel = (item) => {
    if (!item) return "";
    if (typeof item === "object") {
        return item.title || item.name || item.label || item.designation || item.department || "";
    }
    return item;
};

/* Next employee id from the highest existing FPS number: FPS0001, FPS0002 ... (old ids like EMP-001 are ignored) */
const generateEmployeeId = (list) => {
    const pattern = new RegExp(`^${ID_PREFIX}(\\d+)$`, "i");
    let max = 0;
    list.forEach((emp) => {
        const match = pattern.exec(String(emp?.employeeId || ""));
        if (match) max = Math.max(max, Number(match[1]));
    });
    return `${ID_PREFIX}${String(max + 1).padStart(4, "0")}`;
};

/* The server knows every employee, so it gives the safest next id. If it is not available, the list is used. */
const getNextEmployeeId = async (list) => {
    try {
        const res = await api.get("/employees/next-id");
        const id = res?.data?.employeeId;
        if (id) return String(id).toUpperCase();
    } catch {
        /* use the local list below */
    }
    return generateEmployeeId(list);
};

/* Random password: 12 characters, always has an uppercase letter, a lowercase letter and a number */
const generatePassword = () => {
    const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const lower = "abcdefghijkmnopqrstuvwxyz";
    const digits = "23456789";
    const all = upper + lower + digits;

    const rand = (n) => {
        const arr = new Uint32Array(1);
        crypto.getRandomValues(arr);
        return arr[0] % n;
    };
    const pick = (s) => s[rand(s.length)];

    const chars = [pick(upper), pick(lower), pick(digits)];
    for (let i = 0; i < 9; i++) chars.push(pick(all));
    for (let i = chars.length - 1; i > 0; i--) {
        const j = rand(i + 1);
        [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    return chars.join("");
};

/* The login page URL. Works on localhost and on the live site automatically. */
const getLoginUrl = () => (typeof window !== "undefined" ? `${window.location.origin}/login` : "/login");

/* The message the admin sends to the employee: login URL, login email, password and the forgot password note */
const buildLoginMessage = ({ name, loginUrl, loginEmail, password, isEdit }) =>
    [
        `Welcome to ${COMPANY_NAME}`,
        "",
        `Dear ${name},`,
        "",
        isEdit
            ? "Your HRMS password has been updated by the admin. Your login details are given below."
            : "Your HRMS account has been created. Your login details are given below.",
        "",
        `Login URL: ${loginUrl}`,
        `Login Email: ${loginEmail}`,
        `Password: ${password}`,
        "",
        'If you forget your password, use "Forgot Password" on the login page.',
        "",
        "Regards,",
        `HR & Admin Team, ${COMPANY_NAME}`,
    ].join("\n");

/* Shrinks big photos before upload (a phone photo can be 5-8 MB). Text on ID cards stays readable. */
const compressImage = (file, maxSize = 1600, quality = 0.82) =>
    new Promise((resolve) => {
        const reader = new FileReader();
        reader.onerror = () => resolve(null);
        reader.onload = () => {
            const original = reader.result;
            const img = new Image();
            img.onerror = () => resolve(original);
            img.onload = () => {
                try {
                    const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
                    const width = Math.max(1, Math.round(img.width * scale));
                    const height = Math.max(1, Math.round(img.height * scale));
                    const canvas = document.createElement("canvas");
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext("2d");
                    ctx.fillStyle = "#ffffff";
                    ctx.fillRect(0, 0, width, height);
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL("image/jpeg", quality));
                } catch {
                    resolve(original);
                }
            };
            img.src = original;
        };
        reader.readAsDataURL(file);
    });

/* ---------------------------- location helpers ---------------------------- */
/* Photon (OpenStreetMap data) gives the suggestions. India Post gives the city and state of a pincode. */

const fetchJson = async (url, { signal, timeout = 8000 } = {}) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    const onAbort = () => ctrl.abort();
    signal?.addEventListener("abort", onAbort);
    try {
        const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } finally {
        clearTimeout(timer);
        signal?.removeEventListener("abort", onAbort);
    }
};

const photonToLocation = (feature) => {
    const p = feature?.properties || {};
    const [lon, lat] = feature?.geometry?.coordinates || [];
    const place = p.name && ![p.city, p.state, p.county].includes(p.name) ? p.name : "";
    const street = [p.housenumber, p.street].filter(Boolean).join(" ");
    const area = p.locality || p.district || "";
    const city = p.city || p.county || p.district || "";
    const pin = String(p.postcode || "").replace(/\D/g, "").slice(0, 6);
    return {
        id: `${p.osm_type || ""}${p.osm_id || `${lat},${lon}`}`,
        line: [...new Set([place, street, area].filter(Boolean))].join(", "),
        city,
        state: p.state || "",
        pincode: /^[1-9]\d{5}$/.test(pin) ? pin : "",
        label: [...new Set([place, street, area, city, p.state, pin].filter(Boolean))].join(", "),
    };
};

const photonSearch = async (query, signal) => {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=6&lang=en&bbox=${INDIA_BBOX}`;
    const data = await fetchJson(url, { signal });
    return (data?.features || [])
        .filter((f) => !f.properties?.countrycode || f.properties.countrycode === "IN")
        .map(photonToLocation)
        .filter((r) => r.label);
};

const photonReverse = async (lat, lon) => {
    const data = await fetchJson(`https://photon.komoot.io/reverse?lon=${lon}&lat=${lat}&lang=en`);
    const feature = data?.features?.[0];
    return feature ? photonToLocation(feature) : null;
};

const lookupPincode = async (pin) => {
    const data = await fetchJson(`https://api.postalpincode.in/pincode/${pin}`);
    const entry = Array.isArray(data) ? data[0] : null;
    const office = entry?.Status === "Success" ? entry.PostOffice?.[0] : null;
    return office ? { city: office.District || office.Block || "", state: office.State || "" } : null;
};

/* The data of ONE step, exactly as it is saved in the database */
const buildStepPayload = (step, data) => {
    const t = (v) => String(v ?? "").trim();
    switch (step) {
        case 1: {
            const photo = data.profilePhotoData || data.avatar || "";
            const id = t(data.employeeId).toUpperCase();
            return {
                ...(id ? { employeeId: id } : {}),
                firstName: t(data.firstName),
                lastName: t(data.lastName),
                name: `${t(data.firstName)} ${t(data.lastName)}`.trim(),
                email: t(data.email).toLowerCase(),
                phone: normalizePhone(data.phone),
                gender: data.gender,
                timeZone: data.timeZone,
                address: t(data.address),
                city: t(data.city),
                state: t(data.state),
                pincode: t(data.pincode),
                avatar: photo,
                documents: { passportPhotoFileName: data.passportPhotoFileName || "", passportPhotoData: data.passportPhotoData || photo },
            };
        }
        case 2:
            return {
                designation: data.designation === "Other" ? t(data.designationOther) : data.designation,
                department: data.department === "Other" ? t(data.departmentOther) : data.department,
                employmentType: data.employmentType,
                employeeStatus: data.employeeStatus,
                reportingManager: data.reportingManager || null, // the manager's employee id, or null for no manager
                dateOfJoining: data.dateOfJoining,
                salary: Number(data.salary) || 0,
            };
        case 3: {
            const aadhaar = t(data.aadhaarNumber);
            return {
                nationalIdType: "Aadhaar Card",
                nationalId: aadhaar,
                idProofNumber: aadhaar,
                aadhaarNumber: aadhaar,
                panNumber: t(data.panNumber).toUpperCase(),
                documents: {
                    nationalIdFrontFileName: data.nationalIdFrontFileName,
                    nationalIdFrontFileData: data.nationalIdFrontFileData,
                    nationalIdBackFileName: data.nationalIdBackFileName,
                    nationalIdBackFileData: data.nationalIdBackFileData,
                    panCardFileName: data.panCardFileName,
                    panCardFileData: data.panCardFileData,
                },
            };
        }
        case 4:
            return {
                bankDetails: {
                    accountName: t(data.accountName),
                    bankName: t(data.bankName),
                    branchName: t(data.branchName),
                    accountNumber: t(data.accountNumber),
                    ifscCode: t(data.ifscCode).toUpperCase(),
                },
            };
        case 5:
            return {
                loginEmail: t(data.loginEmail).toLowerCase(),
                role: data.role,
                ...(data.password ? { password: data.password } : {}), // blank = keep the current password
            };
        default:
            return {};
    }
};

/* -------------------------------------------------------------------------- */
/* SUB-COMPONENTS                                                             */
/* -------------------------------------------------------------------------- */

function FieldError({ children }) {
    if (!children) return null;
    return (
        <div className="flex items-start gap-1.5 mt-1.5 text-[11px] font-semibold text-red-600">
            <AlertCircle size={13} className="shrink-0 mt-px" />
            <span>{children}</span>
        </div>
    );
}

function SectionTitle({ title, description }) {
    return (
        <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">{title}</h2>
            <p className="text-xs text-slate-500 mt-1">{description}</p>
        </div>
    );
}

function UploadCard({
    title,
    subtitle,
    fileName,
    preview,
    onClick,
    onRemove,
    error,
    acceptText = "JPG, PNG, WEBP · up to 10MB",
}) {
    return (
        <div>
            <div
                onClick={onClick}
                className={`group relative min-h-[160px] sm:min-h-[190px] border-2 border-dashed rounded-2xl cursor-pointer transition-all overflow-hidden ${error
                    ? "border-red-300 bg-red-50/30"
                    : fileName
                        ? "border-emerald-300 bg-emerald-50/40"
                        : "border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50/30"
                    }`}
            >
                {preview ? (
                    <div className="absolute inset-0">
                        <img src={preview} alt={title} className="w-full h-full object-contain p-4" />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900/70 to-transparent px-4 pt-10 pb-3">
                            <p className="text-xs font-semibold text-white truncate">{fileName}</p>
                        </div>
                    </div>
                ) : (
                    <div className="h-full min-h-[160px] sm:min-h-[190px] flex flex-col items-center justify-center p-6 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                            <Upload size={21} />
                        </div>
                        <p className="text-xs font-bold text-slate-700">{title}</p>
                        <p className="text-[11px] text-slate-400 mt-1">{subtitle}</p>
                        <p className="text-[10px] text-slate-400 mt-3">{acceptText}</p>
                    </div>
                )}

                {fileName && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onRemove?.();
                        }}
                        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/95 border border-slate-200 text-red-500 flex items-center justify-center shadow-sm hover:bg-red-50"
                    >
                        <Trash2 size={14} />
                    </button>
                )}
            </div>
            <FieldError>{error}</FieldError>
        </div>
    );
}

function SummaryCard({ icon: Icon, title, status, active, children }) {
    return (
        <div
            className={`rounded-2xl border p-4 transition-all ${active ? "border-indigo-500 bg-indigo-50/40 shadow-sm" : "border-slate-200 bg-white"
                }`}
        >
            <div className="flex items-center justify-between mb-3 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 shrink-0 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <Icon size={15} />
                    </div>
                    <span className="text-xs font-bold text-slate-900 truncate">{title}</span>
                </div>
                <span
                    className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded-full ${status === "Done" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                        }`}
                >
                    {status}
                </span>
            </div>
            <div className="space-y-2">{children}</div>
        </div>
    );
}

function SummaryRow({ label, value }) {
    return (
        <div className="flex items-center justify-between gap-3 text-xs">
            <span className="text-slate-400 shrink-0">{label}</span>
            <span className="font-semibold text-slate-700 text-right truncate max-w-[60%]">{value || "—"}</span>
        </div>
    );
}

/* Shown once after the admin saves login access: login URL, email and password, ready to send to the employee */
function CredentialsModal({ data, onDone }) {
    const [copied, setCopied] = useState("");
    const [reveal, setReveal] = useState(false);

    const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
    const loginUrl = getLoginUrl();
    const message = buildLoginMessage({ ...data, loginUrl });

    useEffect(() => {
        const previous = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = previous;
        };
    }, []);

    const copy = async (text, key) => {
        try {
            await navigator.clipboard.writeText(text);
        } catch {
            const area = document.createElement("textarea");
            area.value = text;
            area.style.position = "fixed";
            area.style.opacity = "0";
            document.body.appendChild(area);
            area.select();
            try {
                document.execCommand("copy");
            } catch { }
            document.body.removeChild(area);
        }
        setCopied(key);
        setTimeout(() => setCopied(""), 1800);
    };

    const share = async () => {
        try {
            await navigator.share({ title: `${COMPANY_NAME} Login Details`, text: message });
        } catch {
            /* the user closed the share sheet */
        }
    };

    const rows = [
        { key: "url", label: "Login URL", value: loginUrl, copy: true },
        { key: "email", label: "Login Email", value: data.loginEmail, copy: true },
        { key: "password", label: "Password", value: data.password, secret: true, copy: true },
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-6">
            <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92dvh] flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto overscroll-contain p-5 sm:p-7 space-y-5">
                    <div className="text-center space-y-2">
                        <div className="mx-auto w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <CheckCircle2 size={28} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">
                            {data.isEdit ? "Employee updated" : "Employee registered"}
                        </h3>
                        <p className="text-xs text-slate-500">
                            Share these login details with <span className="font-semibold text-slate-700">{data.name}</span>.
                        </p>
                    </div>

                    {/* Login details */}
                    <div className="rounded-2xl border border-slate-200 divide-y divide-slate-100">
                        {rows.map((row) => (
                            <div key={row.key} className="flex items-center justify-between gap-3 p-3.5">
                                <div className="min-w-0">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{row.label}</p>
                                    <p className="text-sm font-semibold text-slate-900 font-mono break-all mt-0.5">
                                        {row.secret && !reveal ? "••••••••••••" : row.value}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    {row.secret && (
                                        <button
                                            type="button"
                                            onClick={() => setReveal((r) => !r)}
                                            className="w-9 h-9 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 flex items-center justify-center"
                                            aria-label={reveal ? "Hide password" : "Show password"}
                                        >
                                            {reveal ? <EyeOff size={15} /> : <Eye size={15} />}
                                        </button>
                                    )}
                                    {row.copy && (
                                        <button
                                            type="button"
                                            onClick={() => copy(row.value, row.key)}
                                            className="w-9 h-9 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 flex items-center justify-center"
                                            aria-label={`Copy ${row.label}`}
                                        >
                                            {copied === row.key ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-amber-800">
                        <AlertCircle size={15} className="shrink-0 mt-0.5" />
                        <p className="text-[11px] font-medium leading-relaxed">
                            This password is shown only once and cannot be viewed again later. Copy it now. If it is lost,
                            the employee can use "Forgot Password", or you can set a new one from the Edit Employee form.
                        </p>
                    </div>
                </div>

                {/* Actions (always visible, also on small screens) */}
                <div className="shrink-0 border-t border-slate-100 bg-white p-4 sm:px-7 sm:py-5 pb-[max(1rem,env(safe-area-inset-bottom))]">
                    <div className="flex flex-col-reverse sm:flex-row gap-2.5">
                        <button
                            type="button"
                            onClick={onDone}
                            className="sm:flex-1 px-5 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold"
                        >
                            Done
                        </button>
                        {canShare && (
                            <button
                                type="button"
                                onClick={share}
                                className="sm:flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold"
                            >
                                <Share2 size={15} /> Share
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => copy(message, "all")}
                            className="sm:flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-lg shadow-indigo-600/20"
                        >
                            {copied === "all" ? <Check size={15} /> : <Copy size={15} />}
                            {copied === "all" ? "Copied" : "Copy all details"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* MAIN FORM COMPONENT                                                        */
/* -------------------------------------------------------------------------- */

function EmployeeFormContent({ routeId, onDraftCreated }) {
    const router = useRouter();

    /* the employee this page was opened for (?id=...). It never changes while this form is mounted. */
    const initialEditId = useRef(routeId || "").current;
    const isNew = !initialEditId;

    /* Login access (Step 5) belongs to the admin only. HR and managers never see it. */
    const { user: authUser } = useAuth();
    const isAdmin = String(authUser?.role || "").toLowerCase() === "admin";
    const STEPS = useMemo(() => (isAdmin ? ALL_STEPS : ALL_STEPS.filter((s) => s.step !== 5)), [isAdmin]);
    const LAST_STEP = STEPS.length;
    const lastStepRef = useRef(LAST_STEP);
    lastStepRef.current = LAST_STEP;

    const frontIdRef = useRef(null);
    const backIdRef = useRef(null);
    const panRef = useRef(null);
    const passportPhotoRef = useRef(null);
    const stepRef = useRef(1); // lets the resolver know which step is active

    /* location helpers */
    const placeBoxRef = useRef(null);
    const skipSearchRef = useRef(false); // do not search again after the user picked a suggestion
    const autoAddressRef = useRef(""); // the last address line filled by the map (the admin's own text is never overwritten)
    const lastPinRef = useRef(""); // the last pincode that was already looked up

    const [currentStep, setCurrentStep] = useState(1);
    const [employeeDbId, setEmployeeDbId] = useState(initialEditId); // the saved employee (exists after Step 1 is saved)
    const [isDraft, setIsDraft] = useState(false); // saved, but not all steps are finished
    const [savedUpTo, setSavedUpTo] = useState(0); // the highest step that is saved in the database
    const [hasLogin, setHasLogin] = useState(false);
    const [departmentsList, setDepartmentsList] = useState([]);
    const [designationsList, setDesignationsList] = useState([]);
    const [employeesList, setEmployeesList] = useState([]);
    const [managerOptions, setManagerOptions] = useState([]); // employees with the Manager role (/employees/manager-options)
    const [savedManager, setSavedManager] = useState(null); // the manager already saved on this employee (edit mode)
    const [legacyManager, setLegacyManager] = useState(""); // old records saved the manager as plain text
    const [lookupsLoaded, setLookupsLoaded] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(Boolean(initialEditId));
    const [showPassword, setShowPassword] = useState(false);
    const [credentials, setCredentials] = useState(null);
    const [duplicateErrors, setDuplicateErrors] = useState({ name: "", email: "", phone: "", loginEmail: "" });

    /* location search state */
    const [placeQuery, setPlaceQuery] = useState("");
    const [placeResults, setPlaceResults] = useState([]);
    const [placeOpen, setPlaceOpen] = useState(false);
    const [placeBusy, setPlaceBusy] = useState(false);
    const [placeMsg, setPlaceMsg] = useState("");
    const [locBusy, setLocBusy] = useState(false);
    const [pinStatus, setPinStatus] = useState(""); // "", loading, ok, filled, missing, notfound, error

    const {
        register,
        watch,
        setValue,
        getValues,
        trigger,
        formState: { errors },
    } = useForm({
        mode: "onTouched",
        resolver: (values, context, options) =>
            zodResolver(STEP_SCHEMAS[stepRef.current])(values, context, options),
        defaultValues: {
            employeeId: "",
            firstName: "",
            lastName: "",
            email: "",
            phone: "",
            gender: "male",
            timeZone: "Asia/Kolkata (GMT+5:30)",
            avatar: "",
            profilePhotoFileName: "",
            profilePhotoData: "",
            designation: "",
            designationOther: "",
            department: "",
            departmentOther: "",
            employmentType: "Full-time",
            reportingManager: "",
            dateOfJoining: "",
            employeeStatus: "Active",
            salary: "",
            nationalIdType: "Aadhaar Card",
            nationalIdOther: "",
            aadhaarNumber: "",
            nationalIdFrontFileName: "",
            nationalIdFrontFileData: "",
            nationalIdBackFileName: "",
            nationalIdBackFileData: "",
            panNumber: "",
            panCardFileName: "",
            panCardFileData: "",
            passportPhotoFileName: "",
            passportPhotoData: "",
            accountName: "",
            bankName: "",
            branchName: "",
            accountNumber: "",
            ifscCode: "",
            address: "",
            city: "",
            state: "",
            pincode: "",
            role: "Employee",
            loginEmail: "",
            password: "",
            hasLogin: false,
        },
    });

    const watchedForm = watch();

    /* Register wrapper: cleans the value before React Hook Form stores it */
    const reg = (name, sanitize) => {
        const field = register(name);
        if (!sanitize) return field;
        return {
            ...field,
            onChange: (e) => {
                e.target.value = sanitize(e.target.value);
                return field.onChange(e);
            },
        };
    };

    /* Step helpers */
    const changeStep = (step) => {
        stepRef.current = step;
        setCurrentStep(step);
        if (step === 4 && !getValues("accountName")) {
            const fullName = `${getValues("firstName") || ""} ${getValues("lastName") || ""}`.trim();
            if (fullName) setValue("accountName", fullName);
        }
        if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const validateStep = async (step) => {
        stepRef.current = step;
        return trigger(STEP_FIELDS[step]);
    };

    /* the duplicate problem of a step, if any (the login email problem exists only for the admin) */
    const duplicateAt = (step) => {
        if (step === 1) return duplicateErrors.name || duplicateErrors.email || duplicateErrors.phone || "";
        if (step === 5 && isAdmin) return duplicateErrors.loginEmail || "";
        return "";
    };

    /* ----------------------------- load the page data ----------------------------- */

    /* lookups, employees, managers, and the next employee id */
    useEffect(() => {
        async function loadLookups() {
            let list = [];
            try {
                const results = await Promise.allSettled([
                    api.get("/organization/departments?status=active"),
                    api.get("/organization/designations?status=active"),
                    api.get("/employees"),
                    api.get("/employees/manager-options"),
                ]);

                const [deptRes, desigRes, employeesRes, managersRes] = results;

                if (deptRes.status === "fulfilled") {
                    const raw = deptRes.value?.data;
                    setDepartmentsList(Array.isArray(raw) ? raw : raw?.data || raw?.departments || []);
                }
                if (desigRes.status === "fulfilled") {
                    const raw = desigRes.value?.data;
                    setDesignationsList(Array.isArray(raw) ? raw : raw?.data || raw?.designations || []);
                }
                if (employeesRes.status === "fulfilled") {
                    const raw = employeesRes.value?.data;
                    list = Array.isArray(raw) ? raw : raw?.data || raw?.employees || [];
                    setEmployeesList(list);
                }
                if (managersRes.status === "fulfilled") {
                    const raw = managersRes.value?.data;
                    setManagerOptions(Array.isArray(raw) ? raw : raw?.managers || raw?.data || []);
                }
                /* if /employees/manager-options is not available, the employees with role "manager" are used instead */
            } catch (err) {
                console.error("Failed to load options", err);
            } finally {
                setLookupsLoaded(true);
            }

            if (!initialEditId) {
                setValue("employeeId", await getNextEmployeeId(list));
            }
        }
        loadLookups();
    }, [initialEditId, setValue]);

    /* the employee to edit, or the draft to continue */
    useEffect(() => {
        if (!initialEditId) return;

        async function loadEmployee() {
            try {
                setFetching(true);
                const res = await api.get(`/employees/${initialEditId}`);
                const emp = res?.data?.employee || res?.data?.data || res?.data;
                if (!emp) return;

                const fullName = emp.name || `${emp.firstName || ""} ${emp.lastName || ""}`.trim();
                const parts = fullName.split(" ");
                const firstName = emp.firstName || parts[0] || "";
                const lastName = emp.lastName || parts.slice(1).join(" ") || "";
                const profilePhoto = emp.avatar || emp.profilePhoto || emp.profilePhotoData || emp.photo || "";
                const docs = emp.documents || {};

                setValue("employeeId", emp.employeeId || "");
                setValue("firstName", firstName);
                setValue("lastName", lastName);
                setValue("name", fullName);
                setValue("email", emp.email || "");
                setValue("loginEmail", String(emp.loginEmail || "").toLowerCase());
                setValue("role", emp.role || "Employee");
                setValue("phone", normalizePhone(emp.phone));
                setValue("gender", String(emp.gender || "male").toLowerCase());
                setValue("avatar", profilePhoto);
                setValue("profilePhotoData", profilePhoto);
                setValue("profilePhotoFileName", emp.profilePhotoFileName || "");
                setValue("designation", typeof emp.designation === "object" ? emp.designation?._id : emp.designation || "");
                setValue("department", typeof emp.department === "object" ? emp.department?._id : emp.department || "");
                setValue("employmentType", emp.employmentType || "Full-time");
                setValue("employeeStatus", emp.employeeStatus || "Active");

                /* Reporting manager: a real employee id (or populated object). An old record can hold a plain name. */
                const savedRef = emp.reportingManager;
                const savedId = String(getLookupId(savedRef) || "");
                if (isObjectId(savedId)) {
                    setValue("reportingManager", savedId);
                    const savedName =
                        (savedRef && typeof savedRef === "object" && getEmployeeName(savedRef)) || emp.reportingManagerName || "";
                    if (savedName) setSavedManager({ value: savedId, name: savedName });
                } else if (savedId) {
                    setLegacyManager(savedId);
                }

                setValue("dateOfJoining", emp.dateOfJoining ? String(emp.dateOfJoining).split("T")[0] : "");
                setValue("salary", emp.salary !== undefined && emp.salary !== null ? String(emp.salary) : "");

                /* Documents: older records stored one "national ID". Aadhaar and PAN are now separate. */
                const idType = String(emp.nationalIdType || docs.nationalIdType || "");
                const idNumber = String(emp.nationalId || emp.idProofNumber || "").toUpperCase();
                const idIsPan = /pan/i.test(idType);

                if (!idIsPan) {
                    setValue("aadhaarNumber", String(emp.aadhaarNumber || idNumber).replace(/\D/g, "").slice(0, 12));
                    setValue("nationalIdFrontFileName", docs.nationalIdFrontFileName || "");
                    setValue("nationalIdFrontFileData", docs.nationalIdFrontFileData || "");
                    setValue("nationalIdBackFileName", docs.nationalIdBackFileName || "");
                    setValue("nationalIdBackFileData", docs.nationalIdBackFileData || "");
                }

                if (emp.panNumber || docs.panCardFileData) {
                    setValue("panNumber", String(emp.panNumber || "").toUpperCase());
                    setValue("panCardFileName", docs.panCardFileName || "");
                    setValue("panCardFileData", docs.panCardFileData || "");
                } else if (idIsPan) {
                    setValue("panNumber", idNumber);
                    setValue("panCardFileName", docs.nationalIdFrontFileName || "");
                    setValue("panCardFileData", docs.nationalIdFrontFileData || "");
                }

                setValue("passportPhotoFileName", docs.passportPhotoFileName || "");
                setValue("passportPhotoData", docs.passportPhotoData || profilePhoto || "");
                setValue("accountName", emp.bankDetails?.accountName || fullName);
                setValue("bankName", emp.bankDetails?.bankName || "");
                setValue("branchName", emp.bankDetails?.branchName || "");
                setValue("accountNumber", emp.bankDetails?.accountNumber || "");
                setValue("ifscCode", emp.bankDetails?.ifscCode || "");
                setValue("address", emp.address || "");
                setValue("city", emp.city || "");
                setValue("state", emp.state || "");
                setValue("pincode", emp.pincode || "");
                lastPinRef.current = String(emp.pincode || ""); // saved data: no pincode lookup needed

                /* does the login exist, and which steps are already saved */
                setHasLogin(Boolean(emp.hasLogin));
                setValue("hasLogin", Boolean(emp.hasLogin));
                const draft = emp.onboarding?.status === "draft";
                const doneStep = draft ? Number(emp.onboarding?.step) || 0 : 5;
                setIsDraft(draft);
                setSavedUpTo(doneStep);

                /* a draft opens at the first step that is not saved yet */
                if (draft) {
                    const next = Math.min(doneStep + 1, lastStepRef.current);
                    stepRef.current = next;
                    setCurrentStep(next);
                }
            } catch (err) {
                console.error(err);
                setError("Failed to fetch employee record.");
            } finally {
                setFetching(false);
            }
        }
        loadEmployee();
    }, [initialEditId, setValue]);

    /* ------------------------------ lookups and options ------------------------------ */

    const designationOptions = useMemo(() => {
        const apiOpts = designationsList
            .map((item) => ({ value: getLookupId(item), label: getLookupLabel(item) }))
            .filter((i) => i.value && i.label);
        const presetOpts = DESIGNATION_PRESETS.map((item) => ({ value: item, label: item }));
        const map = new Map();
        [...apiOpts, ...presetOpts].forEach((i) => {
            if (!map.has(i.value)) map.set(i.value, i);
        });
        return [...map.values()];
    }, [designationsList]);

    const departmentOptions = useMemo(() => {
        const apiOpts = departmentsList
            .map((item) => ({ value: getLookupId(item), label: getLookupLabel(item) }))
            .filter((i) => i.value && i.label);
        const presetOpts = DEPARTMENT_PRESETS.map((item) => ({ value: item, label: item }));
        const map = new Map();
        [...apiOpts, ...presetOpts].forEach((i) => {
            if (!map.has(i.value)) map.set(i.value, i);
        });
        return [...map.values()];
    }, [departmentsList]);

    /* Reporting manager choices: only employees with the Manager role, active, never the employee being edited */
    const managerChoices = useMemo(() => {
        const source = managerOptions.length
            ? managerOptions
            : employeesList.filter((e) => String(e.role || "").toLowerCase() === "manager");

        const list = source
            .filter((m) => !/^(inactive|exited|exit)$/i.test(String(m.employeeStatus || "")))
            .map((m) => ({ value: String(m._id || m.id || ""), name: getEmployeeName(m) }))
            .filter((m) => isObjectId(m.value) && m.name && m.value !== String(employeeDbId || ""));

        /* the manager already saved on this employee stays selectable, so editing never drops him silently */
        if (savedManager && savedManager.value !== String(employeeDbId || "") && !list.some((m) => m.value === savedManager.value)) {
            list.push(savedManager);
        }
        return list.sort((a, b) => a.name.localeCompare(b.name));
    }, [managerOptions, employeesList, savedManager, employeeDbId]);

    const selectedManager = useMemo(
        () => managerChoices.find((m) => m.value === watchedForm.reportingManager) || null,
        [managerChoices, watchedForm.reportingManager]
    );

    /* An old record saved the manager as a name (for example "Sanjay Sir"). Match it to a real manager. */
    useEffect(() => {
        if (!legacyManager || !lookupsLoaded || getValues("reportingManager")) return;
        const wanted = legacyManager.trim().toLowerCase();
        const wantedNoSir = wanted.replace(/\s+sir$/, "");
        const hit = managerChoices.find((m) => {
            const n = m.name.trim().toLowerCase();
            return n === wanted || n === wantedNoSir;
        });
        if (hit) {
            setValue("reportingManager", hit.value);
            setLegacyManager("");
        }
    }, [legacyManager, lookupsLoaded, managerChoices, getValues, setValue]);

    /* Edit mode: if a saved custom designation/department is not in the list, show it under "Other" */
    useEffect(() => {
        if (!initialEditId || fetching || !lookupsLoaded) return;
        const d = getValues("designation");
        if (d && d !== "Other" && !designationOptions.some((o) => o.value === d)) {
            setValue("designation", "Other");
            setValue("designationOther", d);
        }
        const dep = getValues("department");
        if (dep && dep !== "Other" && !departmentOptions.some((o) => o.value === dep)) {
            setValue("department", "Other");
            setValue("departmentOther", dep);
        }
    }, [initialEditId, fetching, lookupsLoaded, designationOptions, departmentOptions, getValues, setValue]);

    const selectedDesignation = useMemo(() => {
        const opt = designationOptions.find((i) => i.value === watchedForm.designation);
        return opt?.label || watchedForm.designationOther || watchedForm.designation || "—";
    }, [designationOptions, watchedForm.designation, watchedForm.designationOther]);

    const selectedDepartment = useMemo(() => {
        const opt = departmentOptions.find((i) => i.value === watchedForm.department);
        return opt?.label || watchedForm.departmentOther || watchedForm.department || "—";
    }, [departmentOptions, watchedForm.department, watchedForm.departmentOther]);

    /* Duplicate check (name, personal email, phone, and the login email for the admin). The server checks the ID. */
    useEffect(() => {
        if (!employeesList.length) return;
        const candidateName = `${watchedForm.firstName || ""} ${watchedForm.lastName || ""}`.trim().toLowerCase();
        const candidateEmail = (watchedForm.email || "").trim().toLowerCase();
        const candidatePhone = normalizePhone(watchedForm.phone);
        const candidateLogin = isAdmin ? (watchedForm.loginEmail || "").trim().toLowerCase() : "";

        const next = { name: "", email: "", phone: "", loginEmail: "" };
        employeesList.forEach((emp) => {
            const empId = emp._id || emp.id || emp.employeeId;
            if (employeeDbId && String(empId) === String(employeeDbId)) return;

            const empName = getEmployeeName(emp).toLowerCase();
            const empEmail = (emp.email || "").toLowerCase();
            const empLogin = (emp.loginEmail || emp.email || "").toLowerCase();
            const empPhone = normalizePhone(emp.phone);

            if (candidateName && empName && candidateName === empName) next.name = "An employee with this name already exists.";
            if (candidateEmail && empEmail && candidateEmail === empEmail) next.email = "This email address is already registered.";
            if (candidatePhone.length === PHONE_DIGITS && empPhone && candidatePhone === empPhone) next.phone = "This phone number is already registered.";
            if (candidateLogin && (candidateLogin === empLogin || candidateLogin === empEmail)) {
                next.loginEmail = "This login email is already assigned to another employee.";
            }
        });
        setDuplicateErrors(next);
    }, [
        employeesList,
        isAdmin,
        employeeDbId,
        watchedForm.firstName,
        watchedForm.lastName,
        watchedForm.email,
        watchedForm.phone,
        watchedForm.loginEmail,
    ]);

    /* ------------------------------ address and location ------------------------------ */

    /* fills the address, city, state and pincode from a place */
    const applyLocation = (loc) => {
        const opts = { shouldValidate: true, shouldDirty: true };
        const current = String(getValues("address") || "").trim();

        // the admin's own address text is kept. Only an empty or a map-filled address is replaced.
        if (loc.line && (!current || current === autoAddressRef.current)) {
            const line = clean.text(200)(loc.line);
            autoAddressRef.current = line;
            setValue("address", line, opts);
        }
        if (loc.city) setValue("city", clean.name(40)(loc.city), opts);
        if (loc.state) setValue("state", clean.name(40)(loc.state), opts);

        if (/^[1-9]\d{5}$/.test(loc.pincode || "")) {
            lastPinRef.current = loc.pincode; // already known, no second lookup
            setValue("pincode", loc.pincode, opts);
            setPinStatus("filled");
        } else {
            setPinStatus("missing");
        }
    };

    const pickPlace = (loc) => {
        skipSearchRef.current = true;
        setPlaceQuery(loc.label);
        setPlaceResults([]);
        setPlaceOpen(false);
        setPlaceMsg("");
        applyLocation(loc);
    };

    /* suggestions while typing (waits 450 ms, needs 3 letters, cancels the older request) */
    useEffect(() => {
        if (skipSearchRef.current) {
            skipSearchRef.current = false;
            return undefined;
        }
        const q = placeQuery.trim();
        if (q.length < 3) {
            setPlaceResults([]);
            setPlaceBusy(false);
            return undefined;
        }

        const ctrl = new AbortController();
        const timer = setTimeout(async () => {
            setPlaceBusy(true);
            setPlaceMsg("");
            try {
                const list = await photonSearch(q, ctrl.signal);
                if (ctrl.signal.aborted) return;
                setPlaceResults(list);
                if (!list.length) setPlaceMsg("No place found. Try a nearby landmark, or type the address yourself.");
            } catch {
                if (ctrl.signal.aborted) return;
                setPlaceResults([]);
                setPlaceMsg("Location suggestions are not available right now. Please type the address yourself.");
            } finally {
                if (!ctrl.signal.aborted) setPlaceBusy(false);
            }
        }, 450);

        return () => {
            clearTimeout(timer);
            ctrl.abort();
        };
    }, [placeQuery]);

    /* close the suggestion list when the admin clicks outside of it */
    useEffect(() => {
        const onDown = (e) => {
            if (placeBoxRef.current && !placeBoxRef.current.contains(e.target)) setPlaceOpen(false);
        };
        document.addEventListener("mousedown", onDown);
        return () => document.removeEventListener("mousedown", onDown);
    }, []);

    /* the current location of the device */
    const handleUseLocation = () => {
        if (typeof navigator === "undefined" || !navigator.geolocation) {
            setPlaceMsg("This browser cannot detect the location. Please search or type the address.");
            return;
        }
        setLocBusy(true);
        setPlaceMsg("");
        navigator.geolocation.getCurrentPosition(
            async ({ coords }) => {
                try {
                    const loc = await photonReverse(coords.latitude, coords.longitude);
                    if (loc) {
                        skipSearchRef.current = true;
                        setPlaceQuery(loc.label);
                        applyLocation(loc);
                        toast.success("Location filled. Please check the address.");
                    } else {
                        setPlaceMsg("Could not find an address for this location. Please type it yourself.");
                    }
                } catch {
                    setPlaceMsg("Could not read the address of this location. Please type it yourself.");
                } finally {
                    setLocBusy(false);
                }
            },
            (err) => {
                setLocBusy(false);
                setPlaceMsg(
                    err.code === 1
                        ? "Location permission was denied. Allow it in the browser, or search / type the address."
                        : err.code === 3
                            ? "The location request timed out. Please try again."
                            : "Your location is not available right now."
                );
            },
            { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
        );
    };

    /* pincode -> city and state (India Post) */
    const pinValue = watchedForm.pincode;
    useEffect(() => {
        const pin = String(pinValue || "");
        if (!/^[1-9]\d{5}$/.test(pin)) {
            if (pin.length < 6) setPinStatus((s) => (s === "loading" || s === "ok" || s === "notfound" || s === "error" ? "" : s));
            return undefined;
        }
        if (lastPinRef.current === pin) return undefined;

        let cancelled = false;
        setPinStatus("loading");
        lookupPincode(pin)
            .then((found) => {
                if (cancelled) return;
                lastPinRef.current = pin;
                if (found) {
                    const opts = { shouldValidate: true, shouldDirty: true };
                    if (found.city) setValue("city", clean.name(40)(found.city), opts);
                    if (found.state) setValue("state", clean.name(40)(found.state), opts);
                    setPinStatus("ok");
                } else {
                    setPinStatus("notfound");
                }
            })
            .catch(() => {
                if (!cancelled) setPinStatus("error");
            });

        return () => {
            cancelled = true;
        };
    }, [pinValue, setValue]);

    const pinHint =
        {
            loading: "Finding the city and state...",
            ok: "City and state were filled from the pincode.",
            filled: "Location filled. Please check the address, city and state.",
            missing: "The map has no pincode for this place. Enter the pincode and the city and state fill automatically.",
            notfound: "Pincode not found. Please enter the city and state yourself.",
            error: "Could not check the pincode right now. Please enter the city and state yourself.",
        }[pinStatus] || "";
    const pinWarn = ["missing", "notfound", "error"].includes(pinStatus);

    /* ------------------------------ files ------------------------------ */

    const readFile = async (file, callback, maxSize = 1600) => {
        if (!file) return;
        if (file.size > MAX_FILE_SIZE) {
            toast.error("File size must be less than 10MB.");
            return;
        }
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
            toast.error("Only JPG, PNG or WEBP images are allowed.");
            return;
        }
        const data = await compressImage(file, maxSize);
        if (!data) {
            toast.error("Unable to read this image. Please try another file.");
            return;
        }
        callback(data, file.name);
    };

    const handleProfilePhoto = (e) => {
        const file = e.target.files?.[0];
        readFile(
            file,
            (data, name) => {
                setValue("avatar", data);
                setValue("profilePhotoData", data, { shouldDirty: true });
                setValue("profilePhotoFileName", name);
                setValue("passportPhotoData", data);
                setValue("passportPhotoFileName", name);
            },
            900
        );
        e.target.value = "";
    };

    const removeProfilePhoto = () => {
        setValue("avatar", "");
        setValue("profilePhotoData", "");
        setValue("profilePhotoFileName", "");
        setValue("passportPhotoData", "");
        setValue("passportPhotoFileName", "");
    };

    const handleDocumentUpload = (e, dataKey, nameKey) => {
        const file = e.target.files?.[0];
        readFile(file, (data, name) => {
            setValue(dataKey, data, { shouldValidate: true, shouldDirty: true });
            setValue(nameKey, name);
        });
        e.target.value = "";
    };

    const removeFile = (dataKey, nameKey) => {
        setValue(dataKey, "", { shouldValidate: true });
        setValue(nameKey, "");
    };

    /* ------------------------------ save step by step ------------------------------ */

    /*
      Saves ONE step in the database.
      Step 1 creates the employee as a draft (POST). Every other step updates the same employee (PUT).
      Returns true when the step is saved.
    */
    const persistStep = async (step) => {
        const body = buildStepPayload(step, getValues());
        setLoading(true);
        setError("");
        try {
            if (!employeeDbId) {
                if (step !== 1) throw new Error("Please save Step 1 first.");

                const res = await api.post("/employees", { ...body, draft: true, onboardingStep: 1 });
                const created = res?.data?.employee || res?.data?.data;
                if (!created?._id) throw new Error("The server did not return the employee id.");

                const newId = String(created._id);
                onDraftCreated?.(newId); // tell the page shell: this id is ours, do not reset the form
                setEmployeeDbId(newId);
                setIsDraft(true);
                if (created.employeeId) setValue("employeeId", created.employeeId);

                // a refresh now reopens this draft instead of starting a new one
                if (typeof window !== "undefined") window.history.replaceState(null, "", `${window.location.pathname}?id=${newId}`);
            } else {
                await api.put(`/employees/${employeeDbId}`, { ...body, onboardingStep: step });
            }

            setSavedUpTo((prev) => Math.max(prev, step));
            return true;
        } catch (err) {
            const msg = err?.response?.data?.message || err?.response?.data?.error || err?.message || "Failed to save this step.";
            setError(msg);
            toast.error(msg);

            // the server says the ID is taken: give a fresh one and ask the admin to press Continue again
            if (err?.response?.status === 409 && /employee id/i.test(msg) && !employeeDbId) {
                const id = await getNextEmployeeId(employeesList);
                setValue("employeeId", id);
                setError(`${msg} A new ID was assigned. Please press Continue again.`);
            }
            return false;
        } finally {
            setLoading(false);
        }
    };

    /* the last step is saved: show the login details (admin) or go back to the list */
    const finishFlow = () => {
        const data = getValues();
        const registering = isNew || isDraft;
        const fullName = `${data.firstName} ${data.lastName}`.trim();
        const newPassword = isAdmin ? data.password : "";

        setIsDraft(false);
        toast.success(registering ? "Employee registered successfully!" : "Employee updated successfully!");
        if (!isAdmin && registering) toast.info("An admin must add the login access before this employee can log in.");

        if (newPassword) {
            setCredentials({
                name: fullName,
                loginEmail: String(data.loginEmail || "").trim().toLowerCase(),
                password: newPassword,
                isEdit: !registering,
            });
        } else {
            router.push("/employees");
        }
    };

    /* Continue = check this step, save it in the database, then open the next step */
    const handleNext = async () => {
        if (loading) return;
        setError("");

        const ok = await validateStep(currentStep);
        if (!ok) {
            setError("Please fill in all required fields correctly before continuing.");
            if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
            return;
        }

        const dup = duplicateAt(currentStep);
        if (dup) {
            setError(dup);
            return;
        }

        const saved = await persistStep(currentStep);
        if (!saved) return;

        if (currentStep < LAST_STEP) {
            toast.success(`Step ${currentStep} saved.`);
            changeStep(currentStep + 1);
            return;
        }
        finishFlow();
    };

    /* a click on a later step tab saves every step in between, one by one */
    const goToStep = async (target) => {
        if (loading) return;
        setError("");
        if (target <= currentStep) {
            changeStep(target);
            return;
        }
        for (let s = currentStep; s < target; s++) {
            const ok = await validateStep(s);
            if (!ok) {
                changeStep(s);
                setError("Please complete all required fields correctly before moving to the next step.");
                return;
            }
            const dup = duplicateAt(s);
            if (dup) {
                changeStep(s);
                setError(dup);
                return;
            }
            const saved = await persistStep(s);
            if (!saved) {
                changeStep(s);
                return;
            }
        }
        changeStep(target);
    };

    /* Step completion flags (based on the real Zod schemas) */
    const stepDone = (n) => STEP_SCHEMAS[n].safeParse(watchedForm).success;
    const isStep1Done = stepDone(1) && !duplicateErrors.name && !duplicateErrors.email && !duplicateErrors.phone;
    const isStep2Done = stepDone(2);
    const isStep3Done = stepDone(3);
    const isStep4Done = stepDone(4);
    const isStep5Done = stepDone(5) && !duplicateErrors.loginEmail;
    const doneCount = [isStep1Done, isStep2Done, isStep3Done, isStep4Done, isAdmin && isStep5Done].filter(Boolean).length;

    const roleChoices = watchedForm.role === "Admin" ? ALL_ROLES : ROLE_OPTIONS;
    const registering = isNew || isDraft;

    if (fetching) {
        return (
            <div className="min-h-[500px] flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 size={32} className="animate-spin text-indigo-600" />
                    <p className="text-xs text-slate-500 font-medium">Loading employee profile...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50/70 px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl shadow-sm overflow-hidden">
                    {/* Header */}
                    <div className="px-4 sm:px-8 py-4 sm:py-5 border-b border-slate-100 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 sm:w-11 sm:h-11 shrink-0 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20">
                                <User size={20} />
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-base sm:text-xl font-bold text-slate-900 truncate">
                                    {isNew ? "Add Employee" : isDraft ? "Complete Employee Profile" : "Edit Employee"}
                                </h1>
                                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 truncate">
                                    Create a complete professional employee profile
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="w-9 h-9 shrink-0 rounded-full border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-500 transition"
                        >
                            <X size={17} />
                        </button>
                    </div>

                    {/* Step navigation */}
                    <div className="px-4 sm:px-8 py-3 sm:py-4 border-b border-slate-100 bg-slate-50/60">
                        <div className={`grid grid-cols-2 gap-2 sm:gap-3 ${isAdmin ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}>
                            {STEPS.map((item) => {
                                const active = currentStep === item.step;
                                const passed = currentStep > item.step;
                                const saved = item.step <= savedUpTo;
                                const Icon = item.icon;
                                const spanFull = item.step === LAST_STEP && STEPS.length % 2 === 1;
                                return (
                                    <button
                                        type="button"
                                        key={item.step}
                                        onClick={() => goToStep(item.step)}
                                        className={`text-left rounded-2xl border p-2.5 sm:p-3 transition-all ${spanFull ? "col-span-2 lg:col-span-1" : ""
                                            } ${active
                                                ? "border-indigo-300 bg-indigo-50 shadow-sm"
                                                : passed || saved
                                                    ? "border-emerald-200 bg-emerald-50/40"
                                                    : "border-slate-200 bg-white hover:border-indigo-200"
                                            }`}
                                    >
                                        <div className="flex items-center gap-2 sm:gap-3">
                                            <div
                                                className={`w-8 h-8 shrink-0 rounded-xl flex items-center justify-center ${active
                                                    ? "bg-indigo-600 text-white"
                                                    : passed || saved
                                                        ? "bg-emerald-600 text-white"
                                                        : "bg-slate-100 text-slate-500"
                                                    }`}
                                            >
                                                {passed || saved ? <CheckCircle2 size={15} /> : <Icon size={15} />}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[9px] uppercase tracking-widest font-bold text-slate-400">Step {item.step}</p>
                                                <p className="text-xs font-bold text-slate-800 truncate">{item.title}</p>
                                                {saved && <p className="text-[10px] font-semibold text-emerald-600">Saved</p>}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Draft info */}
                    {employeeDbId && isDraft && (
                        <div className="mx-4 sm:mx-8 mt-4 sm:mt-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">
                            <CheckCircle2 size={17} className="shrink-0 mt-0.5" />
                            <div>
                                <p className="text-xs font-bold">Draft saved</p>
                                <p className="text-[11px] mt-0.5">
                                    Each step is saved when you press Continue. You can leave now and finish the rest later from All Employees.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Global error banner */}
                    {error && (
                        <div className="mx-4 sm:mx-8 mt-4 sm:mt-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
                            <AlertCircle size={17} className="shrink-0 mt-0.5" />
                            <div>
                                <p className="text-xs font-bold">Please check the form</p>
                                <p className="text-[11px] mt-0.5">{error}</p>
                            </div>
                        </div>
                    )}

                    {/* Main grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 p-4 sm:p-6 lg:p-8">
                        {/* Summary sidebar (below the form on mobile, left on desktop) */}
                        <aside className="order-2 lg:order-1 lg:col-span-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4 content-start lg:sticky lg:top-6 lg:self-start">
                            <div className="md:col-span-2 lg:col-span-1 flex items-center justify-between px-1">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Profile Summary</h3>
                                <span className="text-[10px] font-semibold text-slate-400">
                                    {doneCount}/{LAST_STEP} complete
                                </span>
                            </div>

                            <div className="md:col-span-2 lg:col-span-1 rounded-2xl border border-slate-200 bg-white p-4">
                                <div className="flex items-center gap-3">
                                    <div className="relative shrink-0">
                                        {watchedForm.profilePhotoData || watchedForm.avatar ? (
                                            <img
                                                src={watchedForm.profilePhotoData || watchedForm.avatar}
                                                alt="Profile"
                                                className="w-16 h-16 rounded-2xl object-cover border border-slate-200 shadow-sm"
                                            />
                                        ) : (
                                            <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                                <User size={25} />
                                            </div>
                                        )}
                                        {isStep1Done && (
                                            <div className="absolute -right-1 -bottom-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center">
                                                <CheckCircle2 size={12} className="text-white" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-bold text-sm text-slate-900 truncate">
                                            {watchedForm.firstName || watchedForm.lastName
                                                ? `${watchedForm.firstName} ${watchedForm.lastName}`
                                                : "New Employee"}
                                        </p>
                                        <p className="text-[11px] text-slate-400 truncate">{watchedForm.email || "Employee profile"}</p>
                                        <span className="inline-block mt-1 text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded border border-indigo-200">
                                            {watchedForm.employeeId || "ID is assigned on save"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <SummaryCard icon={User} title="Personal Info" active={currentStep === 1} status={isStep1Done ? "Done" : "In progress"}>
                                <SummaryRow label="Name" value={`${watchedForm.firstName} ${watchedForm.lastName}`.trim()} />
                                <SummaryRow label="Email" value={watchedForm.email} />
                                <SummaryRow label="Phone" value={watchedForm.phone ? `+${watchedForm.phone}` : ""} />
                                <SummaryRow label="Gender" value={watchedForm.gender} />
                            </SummaryCard>

                            <SummaryCard icon={Briefcase} title="Job Details" active={currentStep === 2} status={isStep2Done ? "Done" : "Pending"}>
                                <SummaryRow label="Designation" value={selectedDesignation} />
                                <SummaryRow label="Department" value={selectedDepartment} />
                                <SummaryRow label="Employment" value={watchedForm.employmentType} />
                                <SummaryRow label="Status" value={watchedForm.employeeStatus} />
                                <SummaryRow label="Manager" value={selectedManager?.name} />
                            </SummaryCard>

                            <SummaryCard icon={FileText} title="Documents" active={currentStep === 3} status={isStep3Done ? "Done" : "Pending"}>
                                <SummaryRow
                                    label="Aadhaar"
                                    value={watchedForm.aadhaarNumber ? `•••• •••• ${watchedForm.aadhaarNumber.slice(-4)}` : ""}
                                />
                                <SummaryRow
                                    label="Aadhaar Scans"
                                    value={
                                        watchedForm.nationalIdFrontFileName && watchedForm.nationalIdBackFileName
                                            ? "Front + Back"
                                            : watchedForm.nationalIdFrontFileName || watchedForm.nationalIdBackFileName
                                                ? "1 of 2"
                                                : ""
                                    }
                                />
                                <SummaryRow label="PAN" value={watchedForm.panNumber ? `••••••${watchedForm.panNumber.slice(-4)}` : ""} />
                                <SummaryRow label="PAN Scan" value={watchedForm.panCardFileName ? "Uploaded" : ""} />
                            </SummaryCard>

                            <SummaryCard icon={Landmark} title="Banking Info" active={currentStep === 4} status={isStep4Done ? "Done" : "Pending"}>
                                <SummaryRow label="Account Name" value={watchedForm.accountName} />
                                <SummaryRow label="Bank" value={watchedForm.bankName} />
                                <SummaryRow label="Account" value={watchedForm.accountNumber ? `•••• ${watchedForm.accountNumber.slice(-4)}` : ""} />
                            </SummaryCard>

                            {isAdmin && (
                                <SummaryCard icon={KeyRound} title="Login Access" active={currentStep === 5} status={isStep5Done ? "Done" : "Pending"}>
                                    <SummaryRow label="Login Email" value={watchedForm.loginEmail} />
                                    <SummaryRow label="Role" value={watchedForm.role} />
                                    <SummaryRow
                                        label="Password"
                                        value={watchedForm.password ? "Set" : hasLogin ? "Unchanged" : ""}
                                    />
                                </SummaryCard>
                            )}
                        </aside>

                        {/* Form panel */}
                        <main className="order-1 lg:order-2 lg:col-span-8 min-w-0">
                            <div className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-slate-50/50 p-4 sm:p-7">
                                {/* STEP 1 */}
                                {currentStep === 1 && (
                                    <div className="space-y-5 sm:space-y-6">
                                        <SectionTitle title="Personal Information" description="Basic identity and profile information of the employee." />

                                        {/* Profile photo (optional) */}
                                        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
                                                <div className="relative shrink-0">
                                                    {watchedForm.profilePhotoData || watchedForm.avatar ? (
                                                        <img
                                                            src={watchedForm.profilePhotoData || watchedForm.avatar}
                                                            alt="Employee"
                                                            className="w-24 h-24 rounded-2xl object-cover border border-slate-200 shadow-sm"
                                                        />
                                                    ) : (
                                                        <div className="w-24 h-24 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                                                            <Camera size={28} />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-slate-900">
                                                        Passport Size Profile Photo <span className="text-xs font-semibold text-slate-400">(optional)</span>
                                                    </p>
                                                    <p className="text-xs text-slate-500 mt-1">Upload a clear, professional photo (JPG, PNG or WEBP).</p>
                                                    <div className="flex flex-wrap items-center gap-2 mt-3 sm:mt-4">
                                                        <button
                                                            type="button"
                                                            onClick={() => passportPhotoRef.current?.click()}
                                                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition"
                                                        >
                                                            <Camera size={15} />
                                                            {watchedForm.profilePhotoData ? "Change Photo" : "Upload Photo"}
                                                        </button>
                                                        {watchedForm.profilePhotoData && (
                                                            <button
                                                                type="button"
                                                                onClick={removeProfilePhoto}
                                                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 text-red-600 bg-white hover:bg-red-50 text-xs font-bold"
                                                            >
                                                                <Trash2 size={14} /> Remove
                                                            </button>
                                                        )}
                                                    </div>
                                                    {watchedForm.profilePhotoFileName && (
                                                        <p className="text-[11px] text-emerald-600 font-semibold mt-2 truncate">{watchedForm.profilePhotoFileName}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <input
                                                ref={passportPhotoRef}
                                                type="file"
                                                accept="image/jpeg,image/png,image/webp"
                                                onChange={handleProfilePhoto}
                                                className="hidden"
                                            />
                                        </div>

                                        {/* Names */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="field-label">
                                                    First Name <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    {...reg("firstName", clean.name(30))}
                                                    placeholder="Enter first name"
                                                    maxLength={30}
                                                    autoComplete="given-name"
                                                    className={errors.firstName || duplicateErrors.name ? errorInputClass : inputClass}
                                                />
                                                <FieldError>{errors.firstName?.message}</FieldError>
                                            </div>

                                            <div>
                                                <label className="field-label">
                                                    Last Name <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    {...reg("lastName", clean.name(30))}
                                                    placeholder="Enter last name"
                                                    maxLength={30}
                                                    autoComplete="family-name"
                                                    className={errors.lastName || duplicateErrors.name ? errorInputClass : inputClass}
                                                />
                                                <FieldError>{errors.lastName?.message}</FieldError>
                                            </div>
                                            {duplicateErrors.name && (
                                                <div className="sm:col-span-2 -mt-2">
                                                    <FieldError>{duplicateErrors.name}</FieldError>
                                                </div>
                                            )}
                                        </div>

                                        {/* Personal email */}
                                        <div>
                                            <label className="field-label">
                                                Personal Email Address <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                                <input
                                                    type="email"
                                                    inputMode="email"
                                                    autoComplete="email"
                                                    {...reg("email", clean.email)}
                                                    placeholder="employee@gmail.com"
                                                    maxLength={100}
                                                    className={`${errors.email || duplicateErrors.email ? errorInputClass : inputClass} pl-11`}
                                                />
                                            </div>
                                            <p className="text-[11px] text-slate-400 mt-1.5">
                                                Use an email the employee can open. Password reset links are sent here.
                                                {isAdmin ? " The company login email is set in Step 5." : ""}
                                            </p>
                                            <FieldError>{errors.email?.message}</FieldError>
                                            <FieldError>{duplicateErrors.email}</FieldError>
                                        </div>

                                        {/* Phone */}
                                        <div>
                                            <label className="field-label">
                                                Phone Number <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <Phone size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                                <input
                                                    type="tel"
                                                    inputMode="numeric"
                                                    autoComplete="tel-national"
                                                    {...reg("phone", clean.digits(PHONE_DIGITS))}
                                                    placeholder="919876543210"
                                                    maxLength={PHONE_DIGITS}
                                                    className={`${errors.phone || duplicateErrors.phone ? errorInputClass : inputClass} pl-10 font-mono`}
                                                />
                                            </div>
                                            <p className="text-[11px] text-slate-400 mt-1.5">
                                                Enter {PHONE_DIGITS} digits with the country code, for example 919876543210.
                                            </p>
                                            <FieldError>{errors.phone?.message}</FieldError>
                                            <FieldError>{duplicateErrors.phone}</FieldError>
                                        </div>

                                        {/* Gender */}
                                        <div>
                                            <label className="field-label">
                                                Gender <span className="text-red-500">*</span>
                                            </label>
                                            <div className="grid grid-cols-3 gap-2 sm:gap-3">
                                                {GENDER_OPTIONS.map((gender) => (
                                                    <label
                                                        key={gender.value}
                                                        className={`p-3 sm:p-4 rounded-2xl border cursor-pointer transition-all ${watchedForm.gender === gender.value ? "border-indigo-500 bg-indigo-50" : "border-slate-200 bg-white"
                                                            }`}
                                                    >
                                                        <div className="flex items-center justify-between gap-1">
                                                            <span className="text-xs font-bold text-slate-800">{gender.label}</span>
                                                            <input
                                                                type="radio"
                                                                value={gender.value}
                                                                checked={watchedForm.gender === gender.value}
                                                                {...register("gender")}
                                                                className="accent-indigo-600"
                                                            />
                                                        </div>
                                                        <p className="hidden sm:block text-[10px] text-slate-400 mt-1">{gender.sub}</p>
                                                    </label>
                                                ))}
                                            </div>
                                            <FieldError>{errors.gender?.message}</FieldError>
                                        </div>

                                        {/* Address */}
                                        <div>
                                            <div className="flex items-center gap-2 mb-3">
                                                <MapPin size={15} className="text-indigo-600" />
                                                <span className="text-xs font-bold text-slate-700">
                                                    Address <span className="text-red-500">*</span>
                                                </span>
                                            </div>

                                            {/* Search the location: suggestions fill the address, city, state and pincode */}
                                            <div ref={placeBoxRef} className="relative mb-3 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-3.5">
                                                <div className="flex flex-col sm:flex-row gap-2">
                                                    <div className="relative flex-1 min-w-0">
                                                        <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                                        <input
                                                            value={placeQuery}
                                                            onChange={(e) => {
                                                                setPlaceQuery(e.target.value);
                                                                setPlaceOpen(true);
                                                            }}
                                                            onFocus={() => setPlaceOpen(true)}
                                                            placeholder="Search area, society or landmark (for example Malviya Nagar Jaipur)"
                                                            autoComplete="off"
                                                            className={`${inputClass} pl-10 pr-10`}
                                                        />
                                                        {placeBusy && (
                                                            <Loader2 size={15} className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-indigo-500" />
                                                        )}
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={handleUseLocation}
                                                        disabled={locBusy}
                                                        className="inline-flex items-center justify-center gap-2 px-4 py-3 sm:py-2.5 rounded-xl border border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition shrink-0 disabled:opacity-60"
                                                    >
                                                        {locBusy ? <Loader2 size={14} className="animate-spin" /> : <LocateFixed size={14} />}
                                                        Use my location
                                                    </button>
                                                </div>

                                                {placeOpen && placeResults.length > 0 && (
                                                    <ul className="absolute z-30 left-3.5 right-3.5 top-full -mt-1 max-h-64 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10 divide-y divide-slate-100">
                                                        {placeResults.map((r) => (
                                                            <li key={r.id}>
                                                                <button
                                                                    type="button"
                                                                    onMouseDown={(e) => e.preventDefault()}
                                                                    onClick={() => pickPlace(r)}
                                                                    className="w-full flex items-start gap-2.5 px-3.5 py-3 text-left hover:bg-indigo-50 transition"
                                                                >
                                                                    <MapPin size={15} className="text-indigo-500 shrink-0 mt-0.5" />
                                                                    <span className="min-w-0">
                                                                        <span className="block text-xs font-semibold text-slate-800 break-words">{r.label}</span>
                                                                        <span className="block text-[10px] text-slate-400 mt-0.5">
                                                                            {[r.city, r.state, r.pincode].filter(Boolean).join(" • ")}
                                                                        </span>
                                                                    </span>
                                                                </button>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}

                                                {placeMsg && <p className="text-[11px] font-medium text-amber-700 mt-2.5">{placeMsg}</p>}
                                                <p className="text-[10px] text-slate-400 mt-2.5">
                                                    Pick a suggestion and the address, city, state and pincode are filled for you. You can always edit them.
                                                </p>
                                            </div>

                                            <textarea
                                                {...reg("address", clean.text(200))}
                                                rows={3}
                                                maxLength={200}
                                                placeholder="House no., street, area"
                                                className={`${errors.address ? errorInputClass : inputClass} resize-none`}
                                            />
                                            <FieldError>{errors.address?.message}</FieldError>

                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                                                <div>
                                                    <input
                                                        {...reg("pincode", clean.digits(6))}
                                                        inputMode="numeric"
                                                        placeholder="Pincode"
                                                        maxLength={6}
                                                        autoComplete="postal-code"
                                                        className={errors.pincode ? errorInputClass : inputClass}
                                                    />
                                                    <FieldError>{errors.pincode?.message}</FieldError>
                                                </div>
                                                <div>
                                                    <input
                                                        {...reg("city", clean.name(40))}
                                                        placeholder="City"
                                                        maxLength={40}
                                                        autoComplete="address-level2"
                                                        className={errors.city ? errorInputClass : inputClass}
                                                    />
                                                    <FieldError>{errors.city?.message}</FieldError>
                                                </div>
                                                <div>
                                                    <input
                                                        {...reg("state", clean.name(40))}
                                                        placeholder="State"
                                                        maxLength={40}
                                                        autoComplete="address-level1"
                                                        className={errors.state ? errorInputClass : inputClass}
                                                    />
                                                    <FieldError>{errors.state?.message}</FieldError>
                                                </div>
                                            </div>
                                            {pinHint && (
                                                <p className={`text-[11px] font-medium mt-2 ${pinWarn ? "text-amber-700" : pinStatus === "loading" ? "text-slate-400" : "text-emerald-600"}`}>
                                                    {pinHint}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* STEP 2 */}
                                {currentStep === 2 && (
                                    <div className="space-y-5 sm:space-y-6">
                                        <SectionTitle title="Job Details" description="Role, department, employment status and compensation details." />

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="field-label">
                                                    Designation <span className="text-red-500">*</span>
                                                </label>
                                                <select
                                                    {...register("designation")}
                                                    className={`${errors.designation ? errorInputClass : inputClass} cursor-pointer`}
                                                >
                                                    <option value="">Select Designation</option>
                                                    {designationOptions.map((item) => (
                                                        <option key={item.value} value={item.value}>
                                                            {item.label}
                                                        </option>
                                                    ))}
                                                    <option value="Other">+ Add Other Designation</option>
                                                </select>
                                                <FieldError>{errors.designation?.message}</FieldError>
                                                {watchedForm.designation === "Other" && (
                                                    <>
                                                        <input
                                                            {...reg("designationOther", clean.text(50))}
                                                            placeholder="Enter designation"
                                                            maxLength={50}
                                                            className={`${errors.designationOther ? errorInputClass : inputClass} mt-2`}
                                                        />
                                                        <FieldError>{errors.designationOther?.message}</FieldError>
                                                    </>
                                                )}
                                            </div>

                                            <div>
                                                <label className="field-label">Employee Status</label>
                                                <select
                                                    {...register("employeeStatus")}
                                                    className={`${errors.employeeStatus ? errorInputClass : inputClass} cursor-pointer`}
                                                >
                                                    {EMPLOYEE_STATUS_OPTIONS.map((status) => (
                                                        <option key={status} value={status}>
                                                            {status}
                                                        </option>
                                                    ))}
                                                </select>
                                                <FieldError>{errors.employeeStatus?.message}</FieldError>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="field-label">
                                                    Department <span className="text-red-500">*</span>
                                                </label>
                                                <select
                                                    {...register("department")}
                                                    className={`${errors.department ? errorInputClass : inputClass} cursor-pointer`}
                                                >
                                                    <option value="">Select Department</option>
                                                    {departmentOptions.map((item) => (
                                                        <option key={item.value} value={item.value}>
                                                            {item.label}
                                                        </option>
                                                    ))}
                                                    <option value="Other">+ Add Other Department</option>
                                                </select>
                                                <FieldError>{errors.department?.message}</FieldError>
                                                {watchedForm.department === "Other" && (
                                                    <>
                                                        <input
                                                            {...reg("departmentOther", clean.text(50))}
                                                            placeholder="Enter department"
                                                            maxLength={50}
                                                            className={`${errors.departmentOther ? errorInputClass : inputClass} mt-2`}
                                                        />
                                                        <FieldError>{errors.departmentOther?.message}</FieldError>
                                                    </>
                                                )}
                                            </div>

                                            <div>
                                                <label className="field-label">Employment Type</label>
                                                <select
                                                    {...register("employmentType")}
                                                    className={`${errors.employmentType ? errorInputClass : inputClass} cursor-pointer`}
                                                >
                                                    {EMPLOYMENT_TYPES.map((type) => (
                                                        <option key={type} value={type}>
                                                            {type}
                                                        </option>
                                                    ))}
                                                </select>
                                                <FieldError>{errors.employmentType?.message}</FieldError>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {/* Reporting manager: only employees with the Manager role, shown by name. The employee id is saved. */}
                                            <div>
                                                <label className="field-label">Reporting Manager</label>
                                                <select
                                                    {...register("reportingManager")}
                                                    className={`${errors.reportingManager ? errorInputClass : inputClass} cursor-pointer`}
                                                >
                                                    <option value="">No manager</option>
                                                    {managerChoices.map((m) => (
                                                        <option key={m.value} value={m.value}>
                                                            {m.name}
                                                        </option>
                                                    ))}
                                                </select>
                                                <FieldError>{errors.reportingManager?.message}</FieldError>

                                                {legacyManager && !watchedForm.reportingManager && (
                                                    <p className="text-[11px] font-medium text-amber-700 mt-1.5">
                                                        This employee was saved earlier with the manager name "{legacyManager}". Please select the
                                                        manager from the list.
                                                    </p>
                                                )}
                                                {lookupsLoaded && managerChoices.length === 0 && (
                                                    <p className="text-[11px] text-slate-400 mt-1.5">
                                                        No manager found. The admin must first add an employee with the Manager role (Login Access),
                                                        then he will appear here.
                                                    </p>
                                                )}
                                            </div>

                                            <div>
                                                <label className="field-label">
                                                    Joining Date <span className="text-red-500">*</span>
                                                </label>
                                                <div className="relative">
                                                    <CalendarDays size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                                    <input
                                                        type="date"
                                                        {...register("dateOfJoining")}
                                                        className={`${errors.dateOfJoining ? errorInputClass : inputClass} pl-10`}
                                                    />
                                                </div>
                                                <FieldError>{errors.dateOfJoining?.message}</FieldError>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="field-label">
                                                Monthly Salary <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <IndianRupee size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    {...reg("salary", clean.digits(9))}
                                                    placeholder="50000"
                                                    maxLength={9}
                                                    className={`${errors.salary ? errorInputClass : inputClass} pl-10`}
                                                />
                                            </div>
                                            <FieldError>{errors.salary?.message}</FieldError>
                                        </div>
                                    </div>
                                )}

                                {/* STEP 3 */}
                                {currentStep === 3 && (
                                    <div className="space-y-5 sm:space-y-6">
                                        <SectionTitle title="Documents" description="Aadhaar card and PAN card details with scanned copies." />

                                        {/* Aadhaar */}
                                        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                                            <div className="flex items-center justify-between gap-3 mb-5">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-10 h-10 shrink-0 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                                        <CreditCard size={18} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-bold text-slate-900">Aadhaar Card</p>
                                                        <p className="text-[11px] text-slate-400">Number and both sides of the card.</p>
                                                    </div>
                                                </div>
                                                <span className="shrink-0 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full">Required</span>
                                            </div>

                                            <div className="mb-4">
                                                <label className="field-label">
                                                    Aadhaar Number <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    {...reg("aadhaarNumber", clean.digits(12))}
                                                    inputMode="numeric"
                                                    maxLength={12}
                                                    placeholder="234567890123"
                                                    className={`${errors.aadhaarNumber ? errorInputClass : inputClass} font-mono`}
                                                />
                                                <FieldError>{errors.aadhaarNumber?.message}</FieldError>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <UploadCard
                                                    title="Aadhaar - Front Side"
                                                    subtitle="Tap to upload the front image"
                                                    fileName={watchedForm.nationalIdFrontFileName}
                                                    error={errors.nationalIdFrontFileData?.message}
                                                    preview={watchedForm.nationalIdFrontFileData?.startsWith("data:image") ? watchedForm.nationalIdFrontFileData : ""}
                                                    onClick={() => frontIdRef.current?.click()}
                                                    onRemove={() => removeFile("nationalIdFrontFileData", "nationalIdFrontFileName")}
                                                />
                                                <UploadCard
                                                    title="Aadhaar - Back Side"
                                                    subtitle="Tap to upload the back image"
                                                    fileName={watchedForm.nationalIdBackFileName}
                                                    error={errors.nationalIdBackFileData?.message}
                                                    preview={watchedForm.nationalIdBackFileData?.startsWith("data:image") ? watchedForm.nationalIdBackFileData : ""}
                                                    onClick={() => backIdRef.current?.click()}
                                                    onRemove={() => removeFile("nationalIdBackFileData", "nationalIdBackFileName")}
                                                />
                                            </div>
                                            <input
                                                ref={frontIdRef}
                                                type="file"
                                                accept="image/jpeg,image/png,image/webp"
                                                onChange={(e) => handleDocumentUpload(e, "nationalIdFrontFileData", "nationalIdFrontFileName")}
                                                className="hidden"
                                            />
                                            <input
                                                ref={backIdRef}
                                                type="file"
                                                accept="image/jpeg,image/png,image/webp"
                                                onChange={(e) => handleDocumentUpload(e, "nationalIdBackFileData", "nationalIdBackFileName")}
                                                className="hidden"
                                            />
                                        </div>

                                        {/* PAN */}
                                        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                                            <div className="flex items-center justify-between gap-3 mb-5">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-10 h-10 shrink-0 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                                        <FileText size={18} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-bold text-slate-900">PAN Card</p>
                                                        <p className="text-[11px] text-slate-400">Number and a clear image of the card.</p>
                                                    </div>
                                                </div>
                                                <span className="shrink-0 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full">Required</span>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="field-label">
                                                        PAN Number <span className="text-red-500">*</span>
                                                    </label>
                                                    <input
                                                        {...reg("panNumber", clean.alnumUpper(10))}
                                                        maxLength={10}
                                                        autoCapitalize="characters"
                                                        placeholder="ABCDE1234F"
                                                        className={`${errors.panNumber ? errorInputClass : inputClass} font-mono uppercase`}
                                                    />
                                                    <FieldError>{errors.panNumber?.message}</FieldError>
                                                </div>

                                                <UploadCard
                                                    title="PAN Card Image"
                                                    subtitle="Tap to upload the PAN card"
                                                    fileName={watchedForm.panCardFileName}
                                                    error={errors.panCardFileData?.message}
                                                    preview={watchedForm.panCardFileData?.startsWith("data:image") ? watchedForm.panCardFileData : ""}
                                                    onClick={() => panRef.current?.click()}
                                                    onRemove={() => removeFile("panCardFileData", "panCardFileName")}
                                                />
                                            </div>
                                            <input
                                                ref={panRef}
                                                type="file"
                                                accept="image/jpeg,image/png,image/webp"
                                                onChange={(e) => handleDocumentUpload(e, "panCardFileData", "panCardFileName")}
                                                className="hidden"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* STEP 4 */}
                                {currentStep === 4 && (
                                    <div className="space-y-5 sm:space-y-6">
                                        <SectionTitle title="Banking Information" description="Bank account details for salary payments." />

                                        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                                            <div className="flex items-center gap-3 mb-5">
                                                <div className="w-10 h-10 shrink-0 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                                    <Landmark size={18} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold text-slate-900">Salary Account</p>
                                                    <p className="text-[11px] text-slate-400">Enter the employee's salary account details.</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="field-label">
                                                        Account Holder Name <span className="text-red-500">*</span>
                                                    </label>
                                                    <input
                                                        {...reg("accountName", clean.name(60))}
                                                        placeholder="Account holder name"
                                                        maxLength={60}
                                                        className={errors.accountName ? errorInputClass : inputClass}
                                                    />
                                                    <FieldError>{errors.accountName?.message}</FieldError>
                                                </div>
                                                <div>
                                                    <label className="field-label">
                                                        Bank Name <span className="text-red-500">*</span>
                                                    </label>
                                                    <input
                                                        {...reg("bankName", clean.bank(60))}
                                                        placeholder="Bank name"
                                                        maxLength={60}
                                                        className={errors.bankName ? errorInputClass : inputClass}
                                                    />
                                                    <FieldError>{errors.bankName?.message}</FieldError>
                                                </div>
                                                <div>
                                                    <label className="field-label">
                                                        Branch Name <span className="text-red-500">*</span>
                                                    </label>
                                                    <input
                                                        {...reg("branchName", clean.branch(60))}
                                                        placeholder="Branch name"
                                                        maxLength={60}
                                                        className={errors.branchName ? errorInputClass : inputClass}
                                                    />
                                                    <FieldError>{errors.branchName?.message}</FieldError>
                                                </div>
                                                <div>
                                                    <label className="field-label">
                                                        Account Number <span className="text-red-500">*</span>
                                                    </label>
                                                    <input
                                                        {...reg("accountNumber", clean.digits(18))}
                                                        inputMode="numeric"
                                                        placeholder="Account number"
                                                        maxLength={18}
                                                        className={`${errors.accountNumber ? errorInputClass : inputClass} font-mono`}
                                                    />
                                                    <FieldError>{errors.accountNumber?.message}</FieldError>
                                                </div>
                                                <div>
                                                    <label className="field-label">
                                                        IFSC Code <span className="text-red-500">*</span>
                                                    </label>
                                                    <input
                                                        {...reg("ifscCode", clean.alnumUpper(11))}
                                                        placeholder="SBIN0001234"
                                                        maxLength={11}
                                                        autoCapitalize="characters"
                                                        className={`${errors.ifscCode ? errorInputClass : inputClass} font-mono uppercase`}
                                                    />
                                                    <FieldError>{errors.ifscCode?.message}</FieldError>
                                                </div>
                                            </div>
                                        </div>

                                        {/* HR and managers do not set the login. They are told what happens next. */}
                                        {!isAdmin && registering && (
                                            <div className="flex items-start gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 px-4 py-3.5 text-indigo-800">
                                                <Info size={17} className="shrink-0 mt-0.5" />
                                                <p className="text-[11px] sm:text-xs font-medium leading-relaxed">
                                                    This saves the employee profile. An admin will add the login access (company email and
                                                    password) afterwards, and then the employee can log in.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* STEP 5 (admin only) */}
                                {isAdmin && currentStep === 5 && (
                                    <div className="space-y-5 sm:space-y-6">
                                        <SectionTitle
                                            title="Login Access"
                                            description="The company email and password the employee will use to log in to the HRMS."
                                        />

                                        <div className="flex items-start gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 px-4 py-3.5 text-indigo-800">
                                            <ShieldCheck size={17} className="shrink-0 mt-0.5" />
                                            <p className="text-[11px] sm:text-xs font-medium leading-relaxed">
                                                Only employees added here can log in. After saving, you will get the login URL, email and
                                                password to send to the employee. The employee can reset the password later with "Forgot Password".
                                            </p>
                                        </div>

                                        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-5">
                                            {/* Login email */}
                                            <div>
                                                <label className="field-label">
                                                    Company Login Email <span className="text-red-500">*</span>
                                                </label>
                                                <div className="flex gap-2">
                                                    <div className="relative flex-1 min-w-0">
                                                        <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                                        <input
                                                            type="email"
                                                            inputMode="email"
                                                            autoComplete="off"
                                                            autoCapitalize="none"
                                                            {...reg("loginEmail", clean.loginEmail)}
                                                            placeholder="name@yourcompany.com"
                                                            maxLength={100}
                                                            className={`${errors.loginEmail || duplicateErrors.loginEmail ? errorInputClass : inputClass} pl-11`}
                                                        />
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setValue("loginEmail", String(getValues("email") || "").toLowerCase(), {
                                                                shouldValidate: true,
                                                                shouldDirty: true,
                                                            })
                                                        }
                                                        className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition shrink-0"
                                                        title="Use the personal email as login email"
                                                    >
                                                        <Mail size={14} />
                                                        <span className="hidden sm:inline">Use personal email</span>
                                                    </button>
                                                </div>
                                                <FieldError>{errors.loginEmail?.message}</FieldError>
                                                <FieldError>{duplicateErrors.loginEmail}</FieldError>
                                            </div>

                                            {/* Password */}
                                            <div>
                                                <label className="field-label">
                                                    Login Password {!hasLogin && <span className="text-red-500">*</span>}
                                                </label>
                                                <div className="flex gap-2">
                                                    <div className="relative flex-1 min-w-0">
                                                        <KeyRound size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                                        <input
                                                            type={showPassword ? "text" : "password"}
                                                            autoComplete="new-password"
                                                            {...reg("password", clean.password)}
                                                            placeholder={hasLogin ? "Leave blank to keep the current password" : "Create a password"}
                                                            maxLength={32}
                                                            className={`${errors.password ? errorInputClass : inputClass} pl-10 pr-11 font-mono`}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowPassword((s) => !s)}
                                                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                                                            aria-label={showPassword ? "Hide password" : "Show password"}
                                                        >
                                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                                        </button>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setValue("password", generatePassword(), { shouldValidate: true, shouldDirty: true });
                                                            setShowPassword(true);
                                                        }}
                                                        className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition shrink-0"
                                                        title="Generate a strong password"
                                                    >
                                                        <RefreshCw size={14} />
                                                        <span className="hidden sm:inline">Generate</span>
                                                    </button>
                                                </div>
                                                <p className="text-[11px] text-slate-400 mt-1.5">
                                                    8 to 32 characters with an uppercase letter, a lowercase letter and a number.
                                                </p>
                                                <FieldError>{errors.password?.message}</FieldError>
                                            </div>

                                            {/* Role */}
                                            <div>
                                                <label className="field-label">
                                                    Access Role <span className="text-red-500">*</span>
                                                </label>
                                                <select
                                                    {...register("role")}
                                                    disabled={watchedForm.role === "Admin"}
                                                    className={`${errors.role ? errorInputClass : inputClass} cursor-pointer disabled:bg-slate-50 disabled:cursor-not-allowed`}
                                                >
                                                    {roleChoices.map((r) => (
                                                        <option key={r} value={r}>
                                                            {r}
                                                        </option>
                                                    ))}
                                                </select>
                                                <p className="text-[11px] text-slate-400 mt-1.5">
                                                    Employee sees only their own data. Manager sees their team. HR manages employees.
                                                </p>
                                                <FieldError>{errors.role?.message}</FieldError>
                                            </div>
                                        </div>

                                        {watchedForm.employeeStatus === "Inactive" && (
                                            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-amber-800">
                                                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                                                <p className="text-[11px] font-medium leading-relaxed">
                                                    The employee status is "Inactive", so this login will stay blocked until the status is changed.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Footer navigation */}
                                <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-5 sm:pt-6 mt-6 sm:mt-8 border-t border-slate-200">
                                    <button
                                        type="button"
                                        onClick={() => router.back()}
                                        className="w-full sm:w-auto px-5 py-3 sm:py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-xs font-bold"
                                    >
                                        Cancel
                                    </button>

                                    <div className="flex items-center gap-2 w-full sm:w-auto">
                                        {currentStep > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setError("");
                                                    changeStep(currentStep - 1);
                                                }}
                                                className="flex-1 sm:flex-none px-5 py-3 sm:py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold"
                                            >
                                                Back
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={handleNext}
                                            disabled={loading}
                                            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 sm:min-w-[150px] px-6 py-3 sm:py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 disabled:opacity-60"
                                        >
                                            {loading ? (
                                                <>
                                                    <Loader2 size={15} className="animate-spin" /> Saving...
                                                </>
                                            ) : currentStep === LAST_STEP ? (
                                                <>
                                                    <Save size={15} /> {registering ? "Save Employee" : "Update Employee"}
                                                </>
                                            ) : (
                                                <>
                                                    Save & Continue <ChevronRight size={15} />
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </main>
                    </div>
                </div>
            </div>

            {credentials && (
                <CredentialsModal data={credentials} onDone={() => router.push("/employees")} />
            )}

            <style jsx>{`
                .field-label {
                    display: block;
                    margin-bottom: 7px;
                    font-size: 11px;
                    line-height: 1;
                    font-weight: 700;
                    color: #64748b;
                    letter-spacing: 0.04em;
                    text-transform: uppercase;
                }
            `}</style>
        </div>
    );
}

/*
  The shell reads ?id= from the URL.
  - Another employee (or a blank "Add Employee") is opened  -> the form is rebuilt from zero.
  - The form itself puts ?id= in the URL after Step 1 is saved -> the form is NOT rebuilt.
*/
function EmployeeFormShell() {
    const searchParams = useSearchParams();
    const routeId = searchParams.get("id") || "";

    const ownDraftRef = useRef("");
    const seenRef = useRef(routeId);
    const [instance, setInstance] = useState(0);

    useEffect(() => {
        if (seenRef.current === routeId) return;
        seenRef.current = routeId;
        if (routeId && routeId === ownDraftRef.current) return; // our own URL update
        ownDraftRef.current = "";
        setInstance((n) => n + 1);
    }, [routeId]);

    return (
        <EmployeeFormContent
            key={instance}
            routeId={routeId}
            onDraftCreated={(id) => {
                ownDraftRef.current = id;
            }}
        />
    );
}

export default function AddEmployeePage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-[500px] flex items-center justify-center">
                    <Loader2 size={32} className="animate-spin text-indigo-600" />
                </div>
            }
        >
            <EmployeeFormShell />
        </Suspense>
    );
}











// "use client";

// import { useEffect, useMemo, useRef, useState, Suspense } from "react";
// import { useRouter, useSearchParams } from "next/navigation";
// import { useForm } from "react-hook-form";
// import { zodResolver } from "@hookform/resolvers/zod";
// import * as z from "zod";
// import {
//     User,
//     Briefcase,
//     AlertCircle,
//     Loader2,
//     Save,
//     Upload,
//     Landmark,
//     FileText,
//     X,
//     CheckCircle2,
//     ChevronRight,
//     Camera,
//     Trash2,
//     CalendarDays,
//     IndianRupee,
//     Mail,
//     Phone,
//     CreditCard,
//     MapPin,
//     Hash,
//     RefreshCw,
//     KeyRound,
//     Eye,
//     EyeOff,
//     Copy,
//     Check,
//     ShieldCheck,
//     Share2,
//     Info,
// } from "lucide-react";
// import api from "@/lib/api";
// import { toast } from "react-toastify";
// import { useAuth } from "@/context/AuthContext";

// /* -------------------------------------------------------------------------- */
// /* CONSTANTS                                                                  */
// /* -------------------------------------------------------------------------- */

// const COMPANY_NAME = "HRMS Portal"; // shown in the login details message. Change it to your company name.
// const ID_PREFIX = "FPS"; // employee ids look like FPS0001, FPS0002 ...

// const GENDER_OPTIONS = [
//     { value: "male", label: "Male", sub: "Identify as male" },
//     { value: "female", label: "Female", sub: "Identify as female" },
//     { value: "other", label: "Other", sub: "Prefer not to say" },
// ];

// const EMPLOYMENT_TYPES = [
//     "Full-time",
//     "Part-time",
//     "Contract",
//     "Probationary",
//     "Internship",
//     "Remote",
//     "Hybrid",
//     "Freelance",
// ];

// const EMPLOYEE_STATUS_OPTIONS = [
//     "Active",
//     "Probation",
//     "Notice Period",
//     "On Leave",
//     "Permanent",
//     "Freelancer",
//     "Inactive",
// ];

// /* Access role of the login account. "Admin" is shown only when an existing admin is being edited. */
// const ROLE_OPTIONS = ["Employee", "Manager", "HR"];
// const ALL_ROLES = [...ROLE_OPTIONS, "Admin"];

// const DESIGNATION_PRESETS = [
//     "Software Engineer",
//     "Senior Software Engineer",
//     "Frontend Developer",
//     "Backend Developer",
//     "Full Stack Developer",
//     "UI/UX Designer",
//     "Product Designer",
//     "Project Manager",
//     "Product Manager",
//     "Team Lead",
//     "HR Executive",
//     "HR Manager",
//     "Accountant",
//     "Finance Executive",
//     "Sales Executive",
//     "Business Development Executive",
//     "Marketing Executive",
//     "Operations Executive",
//     "Customer Support Executive",
//     "IT Support Executive",
//     "Office Administrator",
//     "Intern",
// ];

// const DEPARTMENT_PRESETS = [
//     "Human Resources",
//     "Engineering",
//     "Information Technology",
//     "Finance",
//     "Accounts",
//     "Sales",
//     "Marketing",
//     "Operations",
//     "Administration",
//     "Customer Support",
//     "Product",
//     "Design",
//     "Legal",
//     "Procurement",
//     "Quality Assurance",
// ];

// /* Step 5 (Login Access) is removed for everyone except the admin, inside the component */
// const ALL_STEPS = [
//     { step: 1, title: "Personal Info", icon: User },
//     { step: 2, title: "Job Details", icon: Briefcase },
//     { step: 3, title: "Documents", icon: FileText },
//     { step: 4, title: "Banking Info", icon: Landmark },
//     { step: 5, title: "Login Access", icon: KeyRound },
// ];

// const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB (original file, before compression)

// /* Fields validated at each step */
// const STEP_FIELDS = {
//     1: [
//         "employeeId",
//         "profilePhotoData",
//         "firstName",
//         "lastName",
//         "email",
//         "phone",
//         "gender",
//         "address",
//         "city",
//         "state",
//         "pincode",
//     ],
//     2: [
//         "designation",
//         "designationOther",
//         "department",
//         "departmentOther",
//         "employmentType",
//         "employeeStatus",
//         "reportingManager",
//         "dateOfJoining",
//         "salary",
//     ],
//     3: ["aadhaarNumber", "nationalIdFrontFileData", "nationalIdBackFileData", "panNumber", "panCardFileData"],
//     4: ["accountName", "bankName", "branchName", "accountNumber", "ifscCode"],
//     5: ["loginEmail", "password", "role"],
// };

// /* -------------------------------------------------------------------------- */
// /* ZOD SCHEMAS (one schema per step)                                          */
// /* -------------------------------------------------------------------------- */

// const NAME_REGEX = /^[A-Za-z][A-Za-z .'-]*$/;
// const AADHAAR_REGEX = /^[2-9]\d{11}$/;
// const PAN_REGEX = /^[A-Z]{5}\d{4}[A-Z]$/;
// const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,32}$/;
// const PASSWORD_MESSAGE = "Password must be 8-32 characters with an uppercase letter, a lowercase letter and a number";
// const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

// const isObjectId = (v) => OBJECT_ID_REGEX.test(String(v || ""));

// const nameField = (label, max = 30) =>
//     z
//         .string()
//         .trim()
//         .min(2, `${label} must be at least 2 characters`)
//         .max(max, `${label} must not exceed ${max} characters`)
//         .regex(NAME_REGEX, `${label} can contain only letters`);

// const oneOf = (list, message) => z.string().refine((v) => list.includes(v), message);

// const step1Schema = z.object({
//     employeeId: z
//         .string()
//         .trim()
//         // .min(1, "Employee ID is required")
//         .regex(
//             /^[A-Za-z0-9-]{3,20}$/,
//             "Employee ID must be 3 to 20 characters (letters, numbers and hyphens only)"
//         ),
//     // profilePhotoData: z.string().min(1, "Profile photo is required"),
//     firstName: nameField("First name"),
//     lastName: nameField("Last name"),
//     email: z
//         .string()
//         .trim()
//         .min(1, "Email address is required")
//         .max(100, "Email address must not exceed 100 characters")
//         .email("Please enter a valid email address"),
//     phone: z
//         .string()
//         .trim()
//         .min(1, "Phone number is required")
//         .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number starting with 6, 7, 8 or 9"),
//     gender: oneOf(
//         GENDER_OPTIONS.map((g) => g.value),
//         "Please select a gender"
//     ),
//     address: z
//         .string()
//         .trim()
//         .min(5, "Address must be at least 5 characters")
//         .max(200, "Address must not exceed 200 characters"),
//     city: nameField("City", 40),
//     state: nameField("State", 40),
//     pincode: z
//         .string()
//         .trim()
//         .regex(/^[1-9]\d{5}$/, "Pincode must be exactly 6 digits"),
// });

// const step2Schema = z
//     .object({
//         designation: z.string().min(1, "Please select a designation"),
//         designationOther: z.string().optional(),
//         department: z.string().min(1, "Please select a department"),
//         departmentOther: z.string().optional(),
//         employmentType: oneOf(EMPLOYMENT_TYPES, "Please select an employment type"),
//         employeeStatus: oneOf(EMPLOYEE_STATUS_OPTIONS, "Please select an employee status"),
//         /* Empty = no manager. Otherwise it must be a real employee id. */
//         reportingManager: z
//             .string()
//             .optional()
//             .refine((v) => !v || isObjectId(v), "Please select the reporting manager from the list"),
//         dateOfJoining: z
//             .string()
//             .min(1, "Joining date is required")
//             .refine((v) => {
//                 const d = new Date(v);
//                 if (Number.isNaN(d.getTime())) return false;
//                 const limit = new Date();
//                 limit.setFullYear(limit.getFullYear() + 1);
//                 return d.getFullYear() >= 1990 && d <= limit;
//             }, "Enter a valid joining date"),
//         salary: z
//             .string()
//             .min(1, "Monthly salary is required")
//             .regex(/^\d{1,9}$/, "Salary must contain digits only")
//             .refine((v) => Number(v) > 0, "Salary must be greater than 0"),
//     })
//     .superRefine((data, ctx) => {
//         const checkOther = (selectKey, otherKey, label) => {
//             if (data[selectKey] !== "Other") return;
//             const value = (data[otherKey] || "").trim();
//             if (value.length < 2) {
//                 ctx.addIssue({ code: "custom", path: [otherKey], message: `Please enter the ${label}` });
//             } else if (value.length > 50) {
//                 ctx.addIssue({ code: "custom", path: [otherKey], message: `${label} must not exceed 50 characters` });
//             } else if (!/^[A-Za-z0-9 &/.'-]+$/.test(value)) {
//                 ctx.addIssue({ code: "custom", path: [otherKey], message: `${label} contains invalid characters` });
//             }
//         };
//         checkOther("designation", "designationOther", "designation");
//         checkOther("department", "departmentOther", "department");
//     });

// const step3Schema = z.object({
//     aadhaarNumber: z
//         .string()
//         .trim()
//         .min(1, "Aadhaar number is required")
//         .regex(AADHAAR_REGEX, "Aadhaar number must be 12 digits and cannot start with 0 or 1"),
//     nationalIdFrontFileData: z.string().min(1, "Front side of the Aadhaar card is required"),
//     nationalIdBackFileData: z.string().min(1, "Back side of the Aadhaar card is required"),
//     panNumber: z
//         .string()
//         .trim()
//         .toUpperCase()
//         .min(1, "PAN number is required")
//         .regex(PAN_REGEX, "Enter a valid PAN number (for example, ABCDE1234F)"),
//     panCardFileData: z.string().min(1, "PAN card image is required"),
// });

// const step4Schema = z.object({
//     accountName: nameField("Account holder name", 60),
//     bankName: z
//         .string()
//         .trim()
//         .min(2, "Bank name must be at least 2 characters")
//         .max(60, "Bank name must not exceed 60 characters")
//         .regex(/^[A-Za-z][A-Za-z .&'-]*$/, "Bank name can contain only letters"),
//     branchName: z
//         .string()
//         .trim()
//         .min(2, "Branch name must be at least 2 characters")
//         .max(60, "Branch name must not exceed 60 characters")
//         .regex(/^[A-Za-z0-9][A-Za-z0-9 .,&'-]*$/, "Branch name contains invalid characters"),
//     accountNumber: z
//         .string()
//         .trim()
//         .regex(/^\d{9,18}$/, "Account number must be 9 to 18 digits"),
//     ifscCode: z
//         .string()
//         .trim()
//         .toUpperCase()
//         .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Enter a valid IFSC code (for example, SBIN0001234)"),
// });

// const step5Schema = z
//     .object({
//         loginEmail: z
//             .string()
//             .trim()
//             .min(1, "Login email is required")
//             .max(100, "Login email must not exceed 100 characters")
//             .email("Please enter a valid login email address"),
//         password: z.string(),
//         role: oneOf(ALL_ROLES, "Please select an access role"),
//         isEdit: z.boolean().optional(),
//     })
//     .superRefine((data, ctx) => {
//         if (!data.isEdit && !data.password) {
//             ctx.addIssue({ code: "custom", path: ["password"], message: "Password is required for the employee login" });
//         } else if (data.password && !PASSWORD_REGEX.test(data.password)) {
//             ctx.addIssue({ code: "custom", path: ["password"], message: PASSWORD_MESSAGE });
//         }
//     });

// const STEP_SCHEMAS = { 1: step1Schema, 2: step2Schema, 3: step3Schema, 4: step4Schema, 5: step5Schema };

// /* -------------------------------------------------------------------------- */
// /* STYLES & HELPERS                                                           */
// /* -------------------------------------------------------------------------- */

// const inputClass =
//     "w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-base sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";

// const errorInputClass =
//     "w-full px-4 py-3 bg-white border border-red-400 rounded-xl text-base sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-red-500 focus:ring-4 focus:ring-red-500/10";

// /* Input sanitizers: block unwanted characters while typing */
// const clean = {
//     digits: (max) => (v) => v.replace(/\D/g, "").slice(0, max),
//     name: (max) => (v) =>
//         v
//             .replace(/[^A-Za-z .'-]/g, "")
//             .replace(/^\s+/, "")
//             .replace(/\s{2,}/g, " ")
//             .slice(0, max),
//     alnumUpper: (max) => (v) => v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, max),
//     employeeId: (v) => v.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 20),
//     email: (v) => v.replace(/\s/g, "").slice(0, 100),
//     loginEmail: (v) => v.replace(/\s/g, "").toLowerCase().slice(0, 100),
//     password: (v) => v.replace(/\s/g, "").slice(0, 32),
//     text: (max) => (v) => v.replace(/^\s+/, "").replace(/\s{2,}/g, " ").slice(0, max),
//     branch: (max) => (v) =>
//         v
//             .replace(/[^A-Za-z0-9 .,&'-]/g, "")
//             .replace(/^\s+/, "")
//             .replace(/\s{2,}/g, " ")
//             .slice(0, max),
//     bank: (max) => (v) =>
//         v
//             .replace(/[^A-Za-z .&'-]/g, "")
//             .replace(/^\s+/, "")
//             .replace(/\s{2,}/g, " ")
//             .slice(0, max),
// };

// const getEmployeeName = (employee) => {
//     if (!employee) return "";
//     return employee.name || employee.fullName || `${employee.firstName || ""} ${employee.lastName || ""}`.trim();
// };

// const getLookupId = (item) => {
//     if (!item) return "";
//     if (typeof item === "object") return item._id || item.id || "";
//     return item;
// };

// const getLookupLabel = (item) => {
//     if (!item) return "";
//     if (typeof item === "object") {
//         return item.title || item.name || item.label || item.designation || item.department || "";
//     }
//     return item;
// };

// /* Next employee id from the highest existing FPS number: FPS0001, FPS0002 ... (old ids like EMP-001 are ignored) */
// const generateEmployeeId = (list) => {
//     const pattern = new RegExp(`^${ID_PREFIX}(\\d+)$`, "i");
//     let max = 0;
//     list.forEach((emp) => {
//         const match = pattern.exec(String(emp?.employeeId || ""));
//         if (match) max = Math.max(max, Number(match[1]));
//     });
//     return `${ID_PREFIX}${String(max + 1).padStart(4, "0")}`;
// };

// /* The server knows every employee, so it gives the safest next id. If it is not available, the list is used. */
// const getNextEmployeeId = async (list) => {
//     try {
//         const res = await api.get("/employees/next-id");
//         const id = res?.data?.employeeId;
//         if (id) return String(id).toUpperCase();
//     } catch {
//         /* use the local list below */
//     }
//     return generateEmployeeId(list);
// };

// /* Random password: 12 characters, always has an uppercase letter, a lowercase letter and a number */
// const generatePassword = () => {
//     const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
//     const lower = "abcdefghijkmnopqrstuvwxyz";
//     const digits = "23456789";
//     const all = upper + lower + digits;

//     const rand = (n) => {
//         const arr = new Uint32Array(1);
//         crypto.getRandomValues(arr);
//         return arr[0] % n;
//     };
//     const pick = (s) => s[rand(s.length)];

//     const chars = [pick(upper), pick(lower), pick(digits)];
//     for (let i = 0; i < 9; i++) chars.push(pick(all));
//     for (let i = chars.length - 1; i > 0; i--) {
//         const j = rand(i + 1);
//         [chars[i], chars[j]] = [chars[j], chars[i]];
//     }
//     return chars.join("");
// };

// /* The login page URL. Works on localhost and on the live site automatically. */
// const getLoginUrl = () => (typeof window !== "undefined" ? `${window.location.origin}/login` : "/login");

// /* The message the admin sends to the employee: login URL, login email, password and the forgot password note */
// const buildLoginMessage = ({ name, loginUrl, loginEmail, password, isEdit }) =>
//     [
//         `Welcome to ${COMPANY_NAME}`,
//         "",
//         `Dear ${name},`,
//         "",
//         isEdit
//             ? "Your HRMS password has been updated by the admin. Your login details are given below."
//             : "Your HRMS account has been created. Your login details are given below.",
//         "",
//         `Login URL: ${loginUrl}`,
//         `Login Email: ${loginEmail}`,
//         `Password: ${password}`,
//         "",
//         'If you forget your password, use "Forgot Password" on the login page.',
//         "",
//         "Regards,",
//         `HR & Admin Team, ${COMPANY_NAME}`,
//     ].join("\n");

// /* Shrinks big photos before upload (a phone photo can be 5-8 MB). Text on ID cards stays readable. */
// const compressImage = (file, maxSize = 1600, quality = 0.82) =>
//     new Promise((resolve) => {
//         const reader = new FileReader();
//         reader.onerror = () => resolve(null);
//         reader.onload = () => {
//             const original = reader.result;
//             const img = new Image();
//             img.onerror = () => resolve(original);
//             img.onload = () => {
//                 try {
//                     const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
//                     const width = Math.max(1, Math.round(img.width * scale));
//                     const height = Math.max(1, Math.round(img.height * scale));
//                     const canvas = document.createElement("canvas");
//                     canvas.width = width;
//                     canvas.height = height;
//                     const ctx = canvas.getContext("2d");
//                     ctx.fillStyle = "#ffffff";
//                     ctx.fillRect(0, 0, width, height);
//                     ctx.drawImage(img, 0, 0, width, height);
//                     resolve(canvas.toDataURL("image/jpeg", quality));
//                 } catch {
//                     resolve(original);
//                 }
//             };
//             img.src = original;
//         };
//         reader.readAsDataURL(file);
//     });

// /* -------------------------------------------------------------------------- */
// /* SUB-COMPONENTS                                                             */
// /* -------------------------------------------------------------------------- */

// function FieldError({ children }) {
//     if (!children) return null;
//     return (
//         <div className="flex items-start gap-1.5 mt-1.5 text-[11px] font-semibold text-red-600">
//             <AlertCircle size={13} className="shrink-0 mt-px" />
//             <span>{children}</span>
//         </div>
//     );
// }

// function SectionTitle({ title, description }) {
//     return (
//         <div>
//             <h2 className="text-lg sm:text-xl font-bold text-slate-900">{title}</h2>
//             <p className="text-xs text-slate-500 mt-1">{description}</p>
//         </div>
//     );
// }

// function UploadCard({
//     title,
//     subtitle,
//     fileName,
//     preview,
//     onClick,
//     onRemove,
//     error,
//     acceptText = "JPG, PNG, WEBP · up to 10MB",
// }) {
//     return (
//         <div>
//             <div
//                 onClick={onClick}
//                 className={`group relative min-h-[160px] sm:min-h-[190px] border-2 border-dashed rounded-2xl cursor-pointer transition-all overflow-hidden ${error
//                     ? "border-red-300 bg-red-50/30"
//                     : fileName
//                         ? "border-emerald-300 bg-emerald-50/40"
//                         : "border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50/30"
//                     }`}
//             >
//                 {preview ? (
//                     <div className="absolute inset-0">
//                         <img src={preview} alt={title} className="w-full h-full object-contain p-4" />
//                         <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900/70 to-transparent px-4 pt-10 pb-3">
//                             <p className="text-xs font-semibold text-white truncate">{fileName}</p>
//                         </div>
//                     </div>
//                 ) : (
//                     <div className="h-full min-h-[160px] sm:min-h-[190px] flex flex-col items-center justify-center p-6 text-center">
//                         <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
//                             <Upload size={21} />
//                         </div>
//                         <p className="text-xs font-bold text-slate-700">{title}</p>
//                         <p className="text-[11px] text-slate-400 mt-1">{subtitle}</p>
//                         <p className="text-[10px] text-slate-400 mt-3">{acceptText}</p>
//                     </div>
//                 )}

//                 {fileName && (
//                     <button
//                         type="button"
//                         onClick={(e) => {
//                             e.stopPropagation();
//                             onRemove?.();
//                         }}
//                         className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/95 border border-slate-200 text-red-500 flex items-center justify-center shadow-sm hover:bg-red-50"
//                     >
//                         <Trash2 size={14} />
//                     </button>
//                 )}
//             </div>
//             <FieldError>{error}</FieldError>
//         </div>
//     );
// }

// function SummaryCard({ icon: Icon, title, status, active, children }) {
//     return (
//         <div
//             className={`rounded-2xl border p-4 transition-all ${active ? "border-indigo-500 bg-indigo-50/40 shadow-sm" : "border-slate-200 bg-white"
//                 }`}
//         >
//             <div className="flex items-center justify-between mb-3 gap-2">
//                 <div className="flex items-center gap-2 min-w-0">
//                     <div className="w-8 h-8 shrink-0 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
//                         <Icon size={15} />
//                     </div>
//                     <span className="text-xs font-bold text-slate-900 truncate">{title}</span>
//                 </div>
//                 <span
//                     className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded-full ${status === "Done" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
//                         }`}
//                 >
//                     {status}
//                 </span>
//             </div>
//             <div className="space-y-2">{children}</div>
//         </div>
//     );
// }

// function SummaryRow({ label, value }) {
//     return (
//         <div className="flex items-center justify-between gap-3 text-xs">
//             <span className="text-slate-400 shrink-0">{label}</span>
//             <span className="font-semibold text-slate-700 text-right truncate max-w-[60%]">{value || "—"}</span>
//         </div>
//     );
// }

// /* Shown once after the admin saves login access: login URL, email and password, ready to send to the employee */
// function CredentialsModal({ data, onDone }) {
//     const [copied, setCopied] = useState("");
//     const [reveal, setReveal] = useState(false);

//     const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
//     const loginUrl = getLoginUrl();
//     const message = buildLoginMessage({ ...data, loginUrl });

//     useEffect(() => {
//         const previous = document.body.style.overflow;
//         document.body.style.overflow = "hidden";
//         return () => {
//             document.body.style.overflow = previous;
//         };
//     }, []);

//     const copy = async (text, key) => {
//         try {
//             await navigator.clipboard.writeText(text);
//         } catch {
//             const area = document.createElement("textarea");
//             area.value = text;
//             area.style.position = "fixed";
//             area.style.opacity = "0";
//             document.body.appendChild(area);
//             area.select();
//             try {
//                 document.execCommand("copy");
//             } catch { }
//             document.body.removeChild(area);
//         }
//         setCopied(key);
//         setTimeout(() => setCopied(""), 1800);
//     };

//     const share = async () => {
//         try {
//             await navigator.share({ title: `${COMPANY_NAME} Login Details`, text: message });
//         } catch {
//             /* the user closed the share sheet */
//         }
//     };

//     const rows = [
//         { key: "url", label: "Login URL", value: loginUrl, copy: true },
//         { key: "email", label: "Login Email", value: data.loginEmail, copy: true },
//         { key: "password", label: "Password", value: data.password, secret: true, copy: true },
//     ];

//     return (
//         <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-6">
//             <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92dvh] flex flex-col overflow-hidden">
//                 <div className="flex-1 overflow-y-auto overscroll-contain p-5 sm:p-7 space-y-5">
//                     <div className="text-center space-y-2">
//                         <div className="mx-auto w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
//                             <CheckCircle2 size={28} />
//                         </div>
//                         <h3 className="text-lg font-bold text-slate-900">
//                             {data.isEdit ? "Employee updated" : "Employee registered"}
//                         </h3>
//                         <p className="text-xs text-slate-500">
//                             Share these login details with <span className="font-semibold text-slate-700">{data.name}</span>.
//                         </p>
//                     </div>

//                     {/* Login details */}
//                     <div className="rounded-2xl border border-slate-200 divide-y divide-slate-100">
//                         {rows.map((row) => (
//                             <div key={row.key} className="flex items-center justify-between gap-3 p-3.5">
//                                 <div className="min-w-0">
//                                     <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{row.label}</p>
//                                     <p className="text-sm font-semibold text-slate-900 font-mono break-all mt-0.5">
//                                         {row.secret && !reveal ? "••••••••••••" : row.value}
//                                     </p>
//                                 </div>
//                                 <div className="flex items-center gap-1.5 shrink-0">
//                                     {row.secret && (
//                                         <button
//                                             type="button"
//                                             onClick={() => setReveal((r) => !r)}
//                                             className="w-9 h-9 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 flex items-center justify-center"
//                                             aria-label={reveal ? "Hide password" : "Show password"}
//                                         >
//                                             {reveal ? <EyeOff size={15} /> : <Eye size={15} />}
//                                         </button>
//                                     )}
//                                     {row.copy && (
//                                         <button
//                                             type="button"
//                                             onClick={() => copy(row.value, row.key)}
//                                             className="w-9 h-9 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 flex items-center justify-center"
//                                             aria-label={`Copy ${row.label}`}
//                                         >
//                                             {copied === row.key ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
//                                         </button>
//                                     )}
//                                 </div>
//                             </div>
//                         ))}
//                     </div>

//                     <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-amber-800">
//                         <AlertCircle size={15} className="shrink-0 mt-0.5" />
//                         <p className="text-[11px] font-medium leading-relaxed">
//                             This password is shown only once and cannot be viewed again later. Copy it now. If it is lost,
//                             the employee can use "Forgot Password", or you can set a new one from the Edit Employee form.
//                         </p>
//                     </div>
//                 </div>

//                 {/* Actions (always visible, also on small screens) */}
//                 <div className="shrink-0 border-t border-slate-100 bg-white p-4 sm:px-7 sm:py-5 pb-[max(1rem,env(safe-area-inset-bottom))]">
//                     <div className="flex flex-col-reverse sm:flex-row gap-2.5">
//                         <button
//                             type="button"
//                             onClick={onDone}
//                             className="sm:flex-1 px-5 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold"
//                         >
//                             Done
//                         </button>
//                         {canShare && (
//                             <button
//                                 type="button"
//                                 onClick={share}
//                                 className="sm:flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold"
//                             >
//                                 <Share2 size={15} /> Share
//                             </button>
//                         )}
//                         <button
//                             type="button"
//                             onClick={() => copy(message, "all")}
//                             className="sm:flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-lg shadow-indigo-600/20"
//                         >
//                             {copied === "all" ? <Check size={15} /> : <Copy size={15} />}
//                             {copied === "all" ? "Copied" : "Copy all details"}
//                         </button>
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// }

// /* -------------------------------------------------------------------------- */
// /* MAIN FORM COMPONENT                                                        */
// /* -------------------------------------------------------------------------- */

// function EmployeeFormContent() {
//     const router = useRouter();
//     const searchParams = useSearchParams();
//     const editId = searchParams.get("id");

//     /* Login access (Step 5) belongs to the admin only. HR and managers never see it. */
//     const { user: authUser } = useAuth();
//     const isAdmin = String(authUser?.role || "").toLowerCase() === "admin";
//     const STEPS = useMemo(() => (isAdmin ? ALL_STEPS : ALL_STEPS.filter((s) => s.step !== 5)), [isAdmin]);
//     const LAST_STEP = STEPS.length;

//     const frontIdRef = useRef(null);
//     const backIdRef = useRef(null);
//     const panRef = useRef(null);
//     const passportPhotoRef = useRef(null);
//     const stepRef = useRef(1); // lets the resolver know which step is active

//     const [currentStep, setCurrentStep] = useState(1);
//     const [departmentsList, setDepartmentsList] = useState([]);
//     const [designationsList, setDesignationsList] = useState([]);
//     const [employeesList, setEmployeesList] = useState([]);
//     const [managerOptions, setManagerOptions] = useState([]); // employees with the Manager role (/employees/manager-options)
//     const [savedManager, setSavedManager] = useState(null); // the manager already saved on this employee (edit mode)
//     const [legacyManager, setLegacyManager] = useState(""); // old records saved the manager as plain text
//     const [lookupsLoaded, setLookupsLoaded] = useState(false);
//     const [error, setError] = useState("");
//     const [loading, setLoading] = useState(false);
//     const [fetching, setFetching] = useState(false);
//     const [showPassword, setShowPassword] = useState(false);
//     const [credentials, setCredentials] = useState(null);
//     const [duplicateErrors, setDuplicateErrors] = useState({
//         employeeId: "",
//         name: "",
//         email: "",
//         phone: "",
//         loginEmail: "",
//     });

//     const {
//         register,
//         watch,
//         setValue,
//         getValues,
//         trigger,
//         formState: { errors },
//     } = useForm({
//         mode: "onTouched",
//         resolver: (values, context, options) =>
//             zodResolver(STEP_SCHEMAS[stepRef.current])(values, context, options),
//         defaultValues: {
//             employeeId: "",
//             firstName: "",
//             lastName: "",
//             email: "",
//             phone: "",
//             gender: "male",
//             timeZone: "Asia/Kolkata (GMT+5:30)",
//             avatar: "",
//             profilePhotoFileName: "",
//             profilePhotoData: "",
//             designation: "",
//             designationOther: "",
//             department: "",
//             departmentOther: "",
//             employmentType: "Full-time",
//             reportingManager: "",
//             dateOfJoining: "",
//             employeeStatus: "Active",
//             salary: "",
//             nationalIdType: "Aadhaar Card",
//             nationalIdOther: "",
//             aadhaarNumber: "",
//             nationalIdFrontFileName: "",
//             nationalIdFrontFileData: "",
//             nationalIdBackFileName: "",
//             nationalIdBackFileData: "",
//             panNumber: "",
//             panCardFileName: "",
//             panCardFileData: "",
//             passportPhotoFileName: "",
//             passportPhotoData: "",
//             accountName: "",
//             bankName: "",
//             branchName: "",
//             accountNumber: "",
//             ifscCode: "",
//             address: "",
//             city: "",
//             state: "",
//             pincode: "",
//             role: "Employee",
//             loginEmail: "",
//             password: "",
//             isEdit: Boolean(editId),
//         },
//     });

//     const watchedForm = watch();

//     /* Register wrapper: cleans the value before React Hook Form stores it */
//     const reg = (name, sanitize) => {
//         const field = register(name);
//         if (!sanitize) return field;
//         return {
//             ...field,
//             onChange: (e) => {
//                 e.target.value = sanitize(e.target.value);
//                 return field.onChange(e);
//             },
//         };
//     };

//     /* Step helpers */
//     const changeStep = (step) => {
//         stepRef.current = step;
//         setCurrentStep(step);
//         if (step === 4 && !getValues("accountName")) {
//             const fullName = `${getValues("firstName") || ""} ${getValues("lastName") || ""}`.trim();
//             if (fullName) setValue("accountName", fullName);
//         }
//         if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
//     };

//     const validateStep = async (step) => {
//         stepRef.current = step;
//         return trigger(STEP_FIELDS[step]);
//     };

//     const hasDuplicates = Object.values(duplicateErrors).some(Boolean);

//     /* Which step contains the duplicate problem (the login email problem exists only for the admin) */
//     const duplicateStep = () => {
//         if (duplicateErrors.employeeId || duplicateErrors.name || duplicateErrors.email || duplicateErrors.phone) return 1;
//         if (isAdmin && duplicateErrors.loginEmail) return 5;
//         return null;
//     };

//     /* Load lookups, employees, the managers, and the next employee id */
//     useEffect(() => {
//         async function loadLookups() {
//             let list = [];
//             try {
//                 const results = await Promise.allSettled([
//                     api.get("/organization/departments?status=active"),
//                     api.get("/organization/designations?status=active"),
//                     api.get("/employees"),
//                     api.get("/employees/manager-options"),
//                 ]);

//                 const [deptRes, desigRes, employeesRes, managersRes] = results;

//                 if (deptRes.status === "fulfilled") {
//                     const raw = deptRes.value?.data;
//                     setDepartmentsList(Array.isArray(raw) ? raw : raw?.data || raw?.departments || []);
//                 }
//                 if (desigRes.status === "fulfilled") {
//                     const raw = desigRes.value?.data;
//                     setDesignationsList(Array.isArray(raw) ? raw : raw?.data || raw?.designations || []);
//                 }
//                 if (employeesRes.status === "fulfilled") {
//                     const raw = employeesRes.value?.data;
//                     list = Array.isArray(raw) ? raw : raw?.data || raw?.employees || [];
//                     setEmployeesList(list);
//                 }
//                 if (managersRes.status === "fulfilled") {
//                     const raw = managersRes.value?.data;
//                     setManagerOptions(Array.isArray(raw) ? raw : raw?.managers || raw?.data || []);
//                 }
//                 /* if /employees/manager-options is not available, the employees with role "manager" are used instead */
//             } catch (err) {
//                 console.error("Failed to load options", err);
//             } finally {
//                 setLookupsLoaded(true);
//             }

//             if (!editId) {
//                 setValue("employeeId", await getNextEmployeeId(list));
//             }
//         }
//         loadLookups();
//     }, [editId, setValue]);

//     /* Load employee for edit */
//     useEffect(() => {
//         if (!editId) return;

//         async function loadEmployee() {
//             try {
//                 setFetching(true);
//                 const res = await api.get(`/employees/${editId}`);
//                 const emp = res?.data?.employee || res?.data?.data || res?.data;
//                 if (!emp) return;

//                 const fullName = emp.name || `${emp.firstName || ""} ${emp.lastName || ""}`.trim();
//                 const parts = fullName.split(" ");
//                 const firstName = emp.firstName || parts[0] || "";
//                 const lastName = emp.lastName || parts.slice(1).join(" ") || "";
//                 const profilePhoto = emp.avatar || emp.profilePhoto || emp.profilePhotoData || emp.photo || "";
//                 const docs = emp.documents || {};

//                 setValue("employeeId", emp.employeeId || `${ID_PREFIX}${String(editId).slice(-4).toUpperCase()}`);
//                 setValue("firstName", firstName);
//                 setValue("lastName", lastName);
//                 setValue("name", fullName);
//                 setValue("email", emp.email || "");
//                 setValue("loginEmail", String(emp.loginEmail || emp.email || "").toLowerCase());
//                 setValue("role", emp.role || "Employee");
//                 setValue("phone", String(emp.phone || "").replace(/\D/g, "").slice(-10));
//                 setValue("gender", String(emp.gender || "male").toLowerCase());
//                 setValue("avatar", profilePhoto);
//                 setValue("profilePhotoData", profilePhoto);
//                 setValue("profilePhotoFileName", emp.profilePhotoFileName || "");
//                 setValue("designation", typeof emp.designation === "object" ? emp.designation?._id : emp.designation || "");
//                 setValue("department", typeof emp.department === "object" ? emp.department?._id : emp.department || "");
//                 setValue("employmentType", emp.employmentType || "Full-time");
//                 setValue("employeeStatus", emp.employeeStatus || "Active");

//                 /* Reporting manager: a real employee id (or populated object). An old record can hold a plain name. */
//                 const savedRef = emp.reportingManager;
//                 const savedId = String(getLookupId(savedRef) || "");

//                 if (isObjectId(savedId)) {
//                     setValue("reportingManager", savedId);
//                     const savedName =
//                         (savedRef && typeof savedRef === "object" && getEmployeeName(savedRef)) || emp.reportingManagerName || "";
//                     if (savedName) setSavedManager({ value: savedId, name: savedName });
//                 } else if (savedId) {
//                     setLegacyManager(savedId);
//                 }

//                 // if (isObjectId(savedId)) {
//                 //     setValue("reportingManager", savedId);
//                 //     if (savedRef && typeof savedRef === "object" && getEmployeeName(savedRef)) {
//                 //         setSavedManager({ value: savedId, name: getEmployeeName(savedRef) });
//                 //     }
//                 // } else if (savedId) {
//                 //     setLegacyManager(savedId);
//                 // }

//                 setValue("dateOfJoining", emp.dateOfJoining ? String(emp.dateOfJoining).split("T")[0] : "");
//                 setValue("salary", emp.salary !== undefined && emp.salary !== null ? String(emp.salary) : "");

//                 /* Documents: older records stored one "national ID". Aadhaar and PAN are now separate. */
//                 const idType = String(emp.nationalIdType || docs.nationalIdType || "");
//                 const idNumber = String(emp.nationalId || emp.idProofNumber || "").toUpperCase();
//                 const idIsPan = /pan/i.test(idType);

//                 if (!idIsPan) {
//                     setValue("aadhaarNumber", String(emp.aadhaarNumber || idNumber).replace(/\D/g, "").slice(0, 12));
//                     setValue("nationalIdFrontFileName", docs.nationalIdFrontFileName || "");
//                     setValue("nationalIdFrontFileData", docs.nationalIdFrontFileData || "");
//                     setValue("nationalIdBackFileName", docs.nationalIdBackFileName || "");
//                     setValue("nationalIdBackFileData", docs.nationalIdBackFileData || "");
//                 }

//                 if (emp.panNumber || docs.panCardFileData) {
//                     setValue("panNumber", String(emp.panNumber || "").toUpperCase());
//                     setValue("panCardFileName", docs.panCardFileName || "");
//                     setValue("panCardFileData", docs.panCardFileData || "");
//                 } else if (idIsPan) {
//                     setValue("panNumber", idNumber);
//                     setValue("panCardFileName", docs.nationalIdFrontFileName || "");
//                     setValue("panCardFileData", docs.nationalIdFrontFileData || "");
//                 }

//                 setValue("passportPhotoFileName", docs.passportPhotoFileName || "");
//                 setValue("passportPhotoData", docs.passportPhotoData || profilePhoto || "");
//                 setValue("accountName", emp.bankDetails?.accountName || fullName);
//                 setValue("bankName", emp.bankDetails?.bankName || "");
//                 setValue("branchName", emp.bankDetails?.branchName || "");
//                 setValue("accountNumber", emp.bankDetails?.accountNumber || "");
//                 setValue("ifscCode", emp.bankDetails?.ifscCode || "");
//                 setValue("address", emp.address || "");
//                 setValue("city", emp.city || "");
//                 setValue("state", emp.state || "");
//                 setValue("pincode", emp.pincode || "");
//             } catch (err) {
//                 console.error(err);
//                 setError("Failed to fetch employee record.");
//             } finally {
//                 setFetching(false);
//             }
//         }
//         loadEmployee();
//     }, [editId, setValue]);

//     /* Designation & department options */
//     const designationOptions = useMemo(() => {
//         const apiOpts = designationsList
//             .map((item) => ({ value: getLookupId(item), label: getLookupLabel(item) }))
//             .filter((i) => i.value && i.label);
//         const presetOpts = DESIGNATION_PRESETS.map((item) => ({ value: item, label: item }));
//         const map = new Map();
//         [...apiOpts, ...presetOpts].forEach((i) => {
//             if (!map.has(i.value)) map.set(i.value, i);
//         });
//         return [...map.values()];
//     }, [designationsList]);

//     const departmentOptions = useMemo(() => {
//         const apiOpts = departmentsList
//             .map((item) => ({ value: getLookupId(item), label: getLookupLabel(item) }))
//             .filter((i) => i.value && i.label);
//         const presetOpts = DEPARTMENT_PRESETS.map((item) => ({ value: item, label: item }));
//         const map = new Map();
//         [...apiOpts, ...presetOpts].forEach((i) => {
//             if (!map.has(i.value)) map.set(i.value, i);
//         });
//         return [...map.values()];
//     }, [departmentsList]);

//     /* Reporting manager choices: only employees with the Manager role, active, never the employee being edited */
//     const managerChoices = useMemo(() => {
//         const source = managerOptions.length
//             ? managerOptions
//             : employeesList.filter((e) => String(e.role || "").toLowerCase() === "manager");

//         const list = source
//             .filter((m) => !/^(inactive|exited|exit)$/i.test(String(m.employeeStatus || "")))
//             .map((m) => ({ value: String(m._id || m.id || ""), name: getEmployeeName(m) }))
//             .filter((m) => isObjectId(m.value) && m.name && m.value !== String(editId || ""));

//         /* the manager already saved on this employee stays selectable, so editing never drops him silently */
//         if (savedManager && savedManager.value !== String(editId || "") && !list.some((m) => m.value === savedManager.value)) {
//             list.push(savedManager);
//         }
//         return list.sort((a, b) => a.name.localeCompare(b.name));
//     }, [managerOptions, employeesList, savedManager, editId]);

//     const selectedManager = useMemo(
//         () => managerChoices.find((m) => m.value === watchedForm.reportingManager) || null,
//         [managerChoices, watchedForm.reportingManager]
//     );

//     /* An old record saved the manager as a name (for example "Sanjay Sir"). Match it to a real manager. */
//     useEffect(() => {
//         if (!legacyManager || !lookupsLoaded || getValues("reportingManager")) return;
//         const wanted = legacyManager.trim().toLowerCase();
//         const wantedNoSir = wanted.replace(/\s+sir$/, "");
//         const hit = managerChoices.find((m) => {
//             const n = m.name.trim().toLowerCase();
//             return n === wanted || n === wantedNoSir;
//         });
//         if (hit) {
//             setValue("reportingManager", hit.value);
//             setLegacyManager("");
//         }
//     }, [legacyManager, lookupsLoaded, managerChoices, getValues, setValue]);

//     /* Edit mode: if a saved custom designation/department is not in the list, show it under "Other" */
//     useEffect(() => {
//         if (!editId || fetching || !lookupsLoaded) return;
//         const d = getValues("designation");
//         if (d && d !== "Other" && !designationOptions.some((o) => o.value === d)) {
//             setValue("designation", "Other");
//             setValue("designationOther", d);
//         }
//         const dep = getValues("department");
//         if (dep && dep !== "Other" && !departmentOptions.some((o) => o.value === dep)) {
//             setValue("department", "Other");
//             setValue("departmentOther", dep);
//         }
//     }, [editId, fetching, lookupsLoaded, designationOptions, departmentOptions, getValues, setValue]);

//     const selectedDesignation = useMemo(() => {
//         const opt = designationOptions.find((i) => i.value === watchedForm.designation);
//         return opt?.label || watchedForm.designationOther || watchedForm.designation || "—";
//     }, [designationOptions, watchedForm.designation, watchedForm.designationOther]);

//     const selectedDepartment = useMemo(() => {
//         const opt = departmentOptions.find((i) => i.value === watchedForm.department);
//         return opt?.label || watchedForm.departmentOther || watchedForm.department || "—";
//     }, [departmentOptions, watchedForm.department, watchedForm.departmentOther]);

//     /* Duplicate check (ID, name, personal email, phone, and the login email for the admin) */
//     useEffect(() => {
//         if (!employeesList.length) return;
//         const candidateId = (watchedForm.employeeId || "").trim().toLowerCase();
//         const candidateName = `${watchedForm.firstName || ""} ${watchedForm.lastName || ""}`.trim().toLowerCase();
//         const candidateEmail = (watchedForm.email || "").trim().toLowerCase();
//         const candidatePhone = (watchedForm.phone || "").replace(/\D/g, "");
//         const candidateLogin = isAdmin ? (watchedForm.loginEmail || "").trim().toLowerCase() : "";

//         const errorsObj = { employeeId: "", name: "", email: "", phone: "", loginEmail: "" };
//         employeesList.forEach((emp) => {
//             const empId = emp._id || emp.id || emp.employeeId;
//             if (editId && String(empId) === String(editId)) return;

//             const empCode = String(emp.employeeId || "").toLowerCase();
//             const empName = getEmployeeName(emp).toLowerCase();
//             const empEmail = (emp.email || "").toLowerCase();
//             const empLogin = (emp.loginEmail || emp.email || "").toLowerCase();
//             const empPhone = (emp.phone || "").replace(/\D/g, "").slice(-10);

//             if (candidateId && empCode && candidateId === empCode) errorsObj.employeeId = "This Employee ID is already in use.";
//             if (candidateName && empName && candidateName === empName) errorsObj.name = "An employee with this name already exists.";
//             if (candidateEmail && empEmail && candidateEmail === empEmail) errorsObj.email = "This email address is already registered.";
//             if (candidatePhone && empPhone && candidatePhone === empPhone) errorsObj.phone = "This phone number is already registered.";
//             if (candidateLogin && (candidateLogin === empLogin || candidateLogin === empEmail)) {
//                 errorsObj.loginEmail = "This login email is already assigned to another employee.";
//             }
//         });
//         setDuplicateErrors(errorsObj);
//     }, [
//         employeesList,
//         isAdmin,
//         watchedForm.employeeId,
//         watchedForm.firstName,
//         watchedForm.lastName,
//         watchedForm.email,
//         watchedForm.phone,
//         watchedForm.loginEmail,
//         editId,
//     ]);

//     /* File helpers: images only, compressed before they are stored in the form */
//     const readFile = async (file, callback, maxSize = 1600) => {
//         if (!file) return;
//         if (file.size > MAX_FILE_SIZE) {
//             toast.error("File size must be less than 10MB.");
//             return;
//         }
//         if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
//             toast.error("Only JPG, PNG or WEBP images are allowed.");
//             return;
//         }
//         const data = await compressImage(file, maxSize);
//         if (!data) {
//             toast.error("Unable to read this image. Please try another file.");
//             return;
//         }
//         callback(data, file.name);
//     };

//     const handleProfilePhoto = (e) => {
//         const file = e.target.files?.[0];
//         readFile(
//             file,
//             (data, name) => {
//                 setValue("avatar", data);
//                 setValue("profilePhotoData", data, { shouldValidate: true, shouldDirty: true });
//                 setValue("profilePhotoFileName", name);
//                 setValue("passportPhotoData", data);
//                 setValue("passportPhotoFileName", name);
//             },
//             900
//         );
//         e.target.value = "";
//     };

//     const removeProfilePhoto = () => {
//         setValue("avatar", "");
//         setValue("profilePhotoData", "", { shouldValidate: true });
//         setValue("profilePhotoFileName", "");
//         setValue("passportPhotoData", "");
//         setValue("passportPhotoFileName", "");
//     };

//     const handleDocumentUpload = (e, dataKey, nameKey) => {
//         const file = e.target.files?.[0];
//         readFile(file, (data, name) => {
//             setValue(dataKey, data, { shouldValidate: true, shouldDirty: true });
//             setValue(nameKey, name);
//         });
//         e.target.value = "";
//     };

//     const removeFile = (dataKey, nameKey) => {
//         setValue(dataKey, "", { shouldValidate: true });
//         setValue(nameKey, "");
//     };

//     /* Step navigation with validation */
//     const goToStep = async (target) => {
//         setError("");
//         if (target <= currentStep) {
//             changeStep(target);
//             return;
//         }
//         for (let s = currentStep; s < target; s++) {
//             const ok = await validateStep(s);
//             if (!ok) {
//                 changeStep(s);
//                 setError("Please complete all required fields correctly before moving to the next step.");
//                 return;
//             }
//         }
//         const dupAt = duplicateStep();
//         if (dupAt) {
//             changeStep(dupAt);
//             setError("Please resolve the duplicate details before continuing.");
//             return;
//         }
//         changeStep(target);
//     };

//     const handleNext = async () => {
//         setError("");

//         const ok = await validateStep(currentStep);
//         if (!ok) {
//             setError("Please fill in all required fields correctly before continuing.");
//             if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
//             return;
//         }

//         const dupAt = hasDuplicates ? duplicateStep() : null;
//         if (dupAt) {
//             setError("Please resolve the duplicate details before continuing.");
//             changeStep(dupAt);
//             return;
//         }

//         if (currentStep < LAST_STEP) {
//             changeStep(currentStep + 1);
//             return;
//         }

//         /* Final step: re-validate every step before saving */
//         for (let s = 1; s <= LAST_STEP; s++) {
//             const valid = await validateStep(s);
//             if (!valid) {
//                 changeStep(s);
//                 setError("Some required details are missing or invalid. Please review this step.");
//                 return;
//             }
//         }
//         handleSubmitForm();
//     };

//     const handleSubmitForm = async () => {
//         setLoading(true);
//         setError("");
//         try {
//             const data = getValues();
//             const finalDesignation = data.designation === "Other" ? data.designationOther.trim() : data.designation;
//             const finalDepartment = data.department === "Other" ? data.departmentOther.trim() : data.department;
//             const aadhaar = data.aadhaarNumber.trim();
//             const pan = data.panNumber.trim().toUpperCase();
//             const loginEmail = data.loginEmail.trim().toLowerCase();
//             const newPassword = isAdmin ? data.password : "";
//             const fullName = `${data.firstName} ${data.lastName}`.trim();

//             const payload = {
//                 ...data,
//                 employeeId: data.employeeId.trim().toUpperCase(),
//                 firstName: data.firstName.trim(),
//                 lastName: data.lastName.trim(),
//                 name: fullName,
//                 email: data.email.trim().toLowerCase(),
//                 loginEmail,
//                 role: data.role,
//                 phone: data.phone.trim(),
//                 designation: finalDesignation,
//                 department: finalDepartment,
//                 reportingManager: data.reportingManager || null, // the manager's employee id, or null for no manager
//                 salary: Number(data.salary) || 0,
//                 nationalIdType: "Aadhaar Card",
//                 nationalId: aadhaar,
//                 idProofNumber: aadhaar,
//                 aadhaarNumber: aadhaar,
//                 panNumber: pan,
//                 address: data.address.trim(),
//                 city: data.city.trim(),
//                 state: data.state.trim(),
//                 pincode: data.pincode.trim(),
//                 bankDetails: {
//                     accountName: data.accountName.trim(),
//                     bankName: data.bankName.trim(),
//                     branchName: data.branchName.trim(),
//                     accountNumber: data.accountNumber.trim(),
//                     ifscCode: data.ifscCode.trim().toUpperCase(),
//                 },
//                 documents: {
//                     nationalIdFrontFileName: data.nationalIdFrontFileName,
//                     nationalIdFrontFileData: data.nationalIdFrontFileData,
//                     nationalIdBackFileName: data.nationalIdBackFileName,
//                     nationalIdBackFileData: data.nationalIdBackFileData,
//                     panCardFileName: data.panCardFileName,
//                     panCardFileData: data.panCardFileData,
//                     passportPhotoFileName: data.passportPhotoFileName,
//                     passportPhotoData: data.passportPhotoData,
//                 },
//                 avatar: data.profilePhotoData || data.avatar || "",
//             };

//             delete payload.isEdit;
//             if (!isAdmin) {
//                 // Login access belongs to the admin. HR and managers never send it.
//                 delete payload.loginEmail;
//                 delete payload.password;
//                 delete payload.role;
//             } else if (!newPassword) {
//                 delete payload.password; // edit mode: blank means "keep the current password"
//             }

//             if (editId) {
//                 await api.put(`/employees/${editId}`, payload);
//                 toast.success("Employee updated successfully!");
//             } else {
//                 await api.post("/employees", payload);
//                 toast.success(isAdmin ? "Employee registered successfully!" : "Employee profile saved!");
//                 if (!isAdmin) {
//                     toast.info("An admin must add the login access before this employee can log in.");
//                 }
//             }

//             if (newPassword) {
//                 setCredentials({
//                     name: fullName,
//                     loginEmail,
//                     password: newPassword,
//                     isEdit: Boolean(editId),
//                 });
//             } else {
//                 router.push("/employees");
//             }
//         } catch (err) {
//             console.error(err);
//             const msg = err?.response?.data?.message || err?.response?.data?.error || "Failed to save employee record.";
//             setError(msg);
//             toast.error(msg);
//             /* a reporting manager problem is fixed on Step 2, so take the user there */
//             if (/reporting|report to|manager/i.test(msg)) changeStep(2);
//         } finally {
//             setLoading(false);
//         }
//     };

//     /* Step completion flags (based on the real Zod schemas) */
//     const stepDone = (n) => STEP_SCHEMAS[n].safeParse(watchedForm).success;
//     const isStep1Done =
//         stepDone(1) && !duplicateErrors.employeeId && !duplicateErrors.name && !duplicateErrors.email && !duplicateErrors.phone;
//     const isStep2Done = stepDone(2);
//     const isStep3Done = stepDone(3);
//     const isStep4Done = stepDone(4);
//     const isStep5Done = stepDone(5) && !duplicateErrors.loginEmail;
//     const doneCount = [isStep1Done, isStep2Done, isStep3Done, isStep4Done, isAdmin && isStep5Done].filter(Boolean).length;

//     const roleChoices = watchedForm.role === "Admin" ? ALL_ROLES : ROLE_OPTIONS;

//     if (fetching) {
//         return (
//             <div className="min-h-[500px] flex items-center justify-center">
//                 <div className="flex flex-col items-center gap-3">
//                     <Loader2 size={32} className="animate-spin text-indigo-600" />
//                     <p className="text-xs text-slate-500 font-medium">Loading employee profile...</p>
//                 </div>
//             </div>
//         );
//     }

//     return (
//         <div className="min-h-screen bg-slate-50/70 px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
//             <div className="max-w-7xl mx-auto">
//                 <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl shadow-sm overflow-hidden">
//                     {/* Header */}
//                     <div className="px-4 sm:px-8 py-4 sm:py-5 border-b border-slate-100 flex items-center justify-between gap-3">
//                         <div className="flex items-center gap-3 min-w-0">
//                             <div className="w-10 h-10 sm:w-11 sm:h-11 shrink-0 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20">
//                                 <User size={20} />
//                             </div>
//                             <div className="min-w-0">
//                                 <h1 className="text-base sm:text-xl font-bold text-slate-900 truncate">
//                                     {editId ? "Edit Employee" : "Add Employee"}
//                                 </h1>
//                                 <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 truncate">
//                                     Create a complete professional employee profile
//                                 </p>
//                             </div>
//                         </div>
//                         <button
//                             type="button"
//                             onClick={() => router.back()}
//                             className="w-9 h-9 shrink-0 rounded-full border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-500 transition"
//                         >
//                             <X size={17} />
//                         </button>
//                     </div>

//                     {/* Step navigation */}
//                     <div className="px-4 sm:px-8 py-3 sm:py-4 border-b border-slate-100 bg-slate-50/60">
//                         <div className={`grid grid-cols-2 gap-2 sm:gap-3 ${isAdmin ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}>
//                             {STEPS.map((item) => {
//                                 const active = currentStep === item.step;
//                                 const passed = currentStep > item.step;
//                                 const Icon = item.icon;
//                                 const spanFull = item.step === LAST_STEP && STEPS.length % 2 === 1;
//                                 return (
//                                     <button
//                                         type="button"
//                                         key={item.step}
//                                         onClick={() => goToStep(item.step)}
//                                         className={`text-left rounded-2xl border p-2.5 sm:p-3 transition-all ${spanFull ? "col-span-2 lg:col-span-1" : ""
//                                             } ${active
//                                                 ? "border-indigo-300 bg-indigo-50 shadow-sm"
//                                                 : passed
//                                                     ? "border-emerald-200 bg-emerald-50/40"
//                                                     : "border-slate-200 bg-white hover:border-indigo-200"
//                                             }`}
//                                     >
//                                         <div className="flex items-center gap-2 sm:gap-3">
//                                             <div
//                                                 className={`w-8 h-8 shrink-0 rounded-xl flex items-center justify-center ${active
//                                                     ? "bg-indigo-600 text-white"
//                                                     : passed
//                                                         ? "bg-emerald-600 text-white"
//                                                         : "bg-slate-100 text-slate-500"
//                                                     }`}
//                                             >
//                                                 {passed ? <CheckCircle2 size={15} /> : <Icon size={15} />}
//                                             </div>
//                                             <div className="min-w-0">
//                                                 <p className="text-[9px] uppercase tracking-widest font-bold text-slate-400">Step {item.step}</p>
//                                                 <p className="text-xs font-bold text-slate-800 truncate">{item.title}</p>
//                                             </div>
//                                         </div>
//                                     </button>
//                                 );
//                             })}
//                         </div>
//                     </div>

//                     {/* Global error banner */}
//                     {error && (
//                         <div className="mx-4 sm:mx-8 mt-4 sm:mt-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
//                             <AlertCircle size={17} className="shrink-0 mt-0.5" />
//                             <div>
//                                 <p className="text-xs font-bold">Please check the form</p>
//                                 <p className="text-[11px] mt-0.5">{error}</p>
//                             </div>
//                         </div>
//                     )}

//                     {/* Main grid */}
//                     <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 p-4 sm:p-6 lg:p-8">
//                         {/* Summary sidebar (below the form on mobile, left on desktop) */}
//                         <aside className="order-2 lg:order-1 lg:col-span-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4 content-start lg:sticky lg:top-6 lg:self-start">
//                             <div className="md:col-span-2 lg:col-span-1 flex items-center justify-between px-1">
//                                 <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Profile Summary</h3>
//                                 <span className="text-[10px] font-semibold text-slate-400">
//                                     {doneCount}/{LAST_STEP} complete
//                                 </span>
//                             </div>

//                             <div className="md:col-span-2 lg:col-span-1 rounded-2xl border border-slate-200 bg-white p-4">
//                                 <div className="flex items-center gap-3">
//                                     <div className="relative shrink-0">
//                                         {watchedForm.profilePhotoData || watchedForm.avatar ? (
//                                             <img
//                                                 src={watchedForm.profilePhotoData || watchedForm.avatar}
//                                                 alt="Profile"
//                                                 className="w-16 h-16 rounded-2xl object-cover border border-slate-200 shadow-sm"
//                                             />
//                                         ) : (
//                                             <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
//                                                 <User size={25} />
//                                             </div>
//                                         )}
//                                         {isStep1Done && (
//                                             <div className="absolute -right-1 -bottom-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center">
//                                                 <CheckCircle2 size={12} className="text-white" />
//                                             </div>
//                                         )}
//                                     </div>
//                                     <div className="min-w-0">
//                                         <p className="font-bold text-sm text-slate-900 truncate">
//                                             {watchedForm.firstName || watchedForm.lastName
//                                                 ? `${watchedForm.firstName} ${watchedForm.lastName}`
//                                                 : "New Employee"}
//                                         </p>
//                                         <p className="text-[11px] text-slate-400 truncate">{watchedForm.email || "Employee profile"}</p>
//                                         <span className="inline-block mt-1 text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded border border-indigo-200">
//                                             {watchedForm.employeeId || "—"}
//                                         </span>
//                                     </div>
//                                 </div>
//                             </div>

//                             <SummaryCard icon={User} title="Personal Info" active={currentStep === 1} status={isStep1Done ? "Done" : "In progress"}>
//                                 <SummaryRow label="Name" value={`${watchedForm.firstName} ${watchedForm.lastName}`.trim()} />
//                                 <SummaryRow label="Email" value={watchedForm.email} />
//                                 <SummaryRow label="Phone" value={watchedForm.phone ? `+91 ${watchedForm.phone}` : ""} />
//                                 <SummaryRow label="Gender" value={watchedForm.gender} />
//                             </SummaryCard>

//                             <SummaryCard icon={Briefcase} title="Job Details" active={currentStep === 2} status={isStep2Done ? "Done" : "Pending"}>
//                                 <SummaryRow label="Designation" value={selectedDesignation} />
//                                 <SummaryRow label="Department" value={selectedDepartment} />
//                                 <SummaryRow label="Employment" value={watchedForm.employmentType} />
//                                 <SummaryRow label="Status" value={watchedForm.employeeStatus} />
//                                 <SummaryRow label="Manager" value={selectedManager?.name} />
//                             </SummaryCard>

//                             <SummaryCard icon={FileText} title="Documents" active={currentStep === 3} status={isStep3Done ? "Done" : "Pending"}>
//                                 <SummaryRow
//                                     label="Aadhaar"
//                                     value={watchedForm.aadhaarNumber ? `•••• •••• ${watchedForm.aadhaarNumber.slice(-4)}` : ""}
//                                 />
//                                 <SummaryRow
//                                     label="Aadhaar Scans"
//                                     value={
//                                         watchedForm.nationalIdFrontFileName && watchedForm.nationalIdBackFileName
//                                             ? "Front + Back"
//                                             : watchedForm.nationalIdFrontFileName || watchedForm.nationalIdBackFileName
//                                                 ? "1 of 2"
//                                                 : ""
//                                     }
//                                 />
//                                 <SummaryRow label="PAN" value={watchedForm.panNumber ? `••••••${watchedForm.panNumber.slice(-4)}` : ""} />
//                                 <SummaryRow label="PAN Scan" value={watchedForm.panCardFileName ? "Uploaded" : ""} />
//                             </SummaryCard>

//                             <SummaryCard icon={Landmark} title="Banking Info" active={currentStep === 4} status={isStep4Done ? "Done" : "Pending"}>
//                                 <SummaryRow label="Account Name" value={watchedForm.accountName} />
//                                 <SummaryRow label="Bank" value={watchedForm.bankName} />
//                                 <SummaryRow label="Account" value={watchedForm.accountNumber ? `•••• ${watchedForm.accountNumber.slice(-4)}` : ""} />
//                             </SummaryCard>

//                             {isAdmin && (
//                                 <SummaryCard icon={KeyRound} title="Login Access" active={currentStep === 5} status={isStep5Done ? "Done" : "Pending"}>
//                                     <SummaryRow label="Login Email" value={watchedForm.loginEmail} />
//                                     <SummaryRow label="Role" value={watchedForm.role} />
//                                     <SummaryRow
//                                         label="Password"
//                                         value={watchedForm.password ? "Set" : editId ? "Unchanged" : ""}
//                                     />
//                                 </SummaryCard>
//                             )}
//                         </aside>

//                         {/* Form panel */}
//                         <main className="order-1 lg:order-2 lg:col-span-8 min-w-0">
//                             <div className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-slate-50/50 p-4 sm:p-7">
//                                 {/* STEP 1 */}
//                                 {currentStep === 1 && (
//                                     <div className="space-y-5 sm:space-y-6">
//                                         <SectionTitle title="Personal Information" description="Basic identity and profile information of the employee." />

//                                         {/* Profile photo */}
//                                         <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
//                                             <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
//                                                 <div className="relative shrink-0">
//                                                     {watchedForm.profilePhotoData || watchedForm.avatar ? (
//                                                         <img
//                                                             src={watchedForm.profilePhotoData || watchedForm.avatar}
//                                                             alt="Employee"
//                                                             className="w-24 h-24 rounded-2xl object-cover border border-slate-200 shadow-sm"
//                                                         />
//                                                     ) : (
//                                                         <div
//                                                             className={`w-24 h-24 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border ${errors.profilePhotoData ? "border-red-300" : "border-indigo-100"
//                                                                 }`}
//                                                         >
//                                                             <Camera size={28} />
//                                                         </div>
//                                                     )}
//                                                 </div>
//                                                 <div className="flex-1 min-w-0">
//                                                     <p className="text-sm font-bold text-slate-900">
//                                                         Passport Size Profile Photo <span className="text-red-500">*</span>
//                                                     </p>
//                                                     <p className="text-xs text-slate-500 mt-1">Upload a clear, professional photo (JPG, PNG or WEBP).</p>
//                                                     <div className="flex flex-wrap items-center gap-2 mt-3 sm:mt-4">
//                                                         <button
//                                                             type="button"
//                                                             onClick={() => passportPhotoRef.current?.click()}
//                                                             className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition"
//                                                         >
//                                                             <Camera size={15} />
//                                                             {watchedForm.profilePhotoData ? "Change Photo" : "Upload Photo"}
//                                                         </button>
//                                                         {watchedForm.profilePhotoData && (
//                                                             <button
//                                                                 type="button"
//                                                                 onClick={removeProfilePhoto}
//                                                                 className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 text-red-600 bg-white hover:bg-red-50 text-xs font-bold"
//                                                             >
//                                                                 <Trash2 size={14} /> Remove
//                                                             </button>
//                                                         )}
//                                                     </div>
//                                                     {watchedForm.profilePhotoFileName && (
//                                                         <p className="text-[11px] text-emerald-600 font-semibold mt-2 truncate">{watchedForm.profilePhotoFileName}</p>
//                                                     )}
//                                                     <FieldError>{errors.profilePhotoData?.message}</FieldError>
//                                                 </div>
//                                             </div>
//                                             <input
//                                                 ref={passportPhotoRef}
//                                                 type="file"
//                                                 accept="image/jpeg,image/png,image/webp"
//                                                 onChange={handleProfilePhoto}
//                                                 className="hidden"
//                                             />
//                                         </div>

//                                         {/* Employee ID (manual + auto generate) */}
//                                         {/* <div>
//                                             <label className="field-label">
//                                                 Employee ID <span className="text-red-500">*</span>
//                                             </label>
//                                             <div className="flex gap-2">
//                                                 <div className="relative flex-1">
//                                                     <Hash size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
//                                                     <input
//                                                         {...reg("employeeId", clean.employeeId)}
//                                                         placeholder="FPS0001"
//                                                         maxLength={20}
//                                                         autoCapitalize="characters"
//                                                         className={`${errors.employeeId || duplicateErrors.employeeId ? errorInputClass : inputClass} pl-10 font-mono uppercase`}
//                                                     />
//                                                 </div>
//                                                 <button
//                                                     type="button"
//                                                     onClick={async () => {
//                                                         const id = await getNextEmployeeId(employeesList);
//                                                         setValue("employeeId", id, { shouldValidate: true, shouldDirty: true });
//                                                     }}
//                                                     className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition shrink-0"
//                                                     title="Generate the next available ID"
//                                                 >
//                                                     <RefreshCw size={14} />
//                                                     <span className="hidden sm:inline">Auto Generate</span>
//                                                 </button>
//                                             </div>
//                                             <p className="text-[11px] text-slate-400 mt-1.5">
//                                                 The ID is generated automatically (FPS0001, FPS0002 ...), but you can edit it manually.
//                                             </p>
//                                             <FieldError>{errors.employeeId?.message}</FieldError>
//                                             <FieldError>{duplicateErrors.employeeId}</FieldError>
//                                         </div> */}

//                                         {/* Names */}
//                                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//                                             <div>
//                                                 <label className="field-label">
//                                                     First Name <span className="text-red-500">*</span>
//                                                 </label>
//                                                 <input
//                                                     {...reg("firstName", clean.name(30))}
//                                                     placeholder="Enter first name"
//                                                     maxLength={30}
//                                                     autoComplete="given-name"
//                                                     className={errors.firstName || duplicateErrors.name ? errorInputClass : inputClass}
//                                                 />
//                                                 <FieldError>{errors.firstName?.message}</FieldError>
//                                             </div>

//                                             <div>
//                                                 <label className="field-label">
//                                                     Last Name <span className="text-red-500">*</span>
//                                                 </label>
//                                                 <input
//                                                     {...reg("lastName", clean.name(30))}
//                                                     placeholder="Enter last name"
//                                                     maxLength={30}
//                                                     autoComplete="family-name"
//                                                     className={errors.lastName || duplicateErrors.name ? errorInputClass : inputClass}
//                                                 />
//                                                 <FieldError>{errors.lastName?.message}</FieldError>
//                                             </div>
//                                             {duplicateErrors.name && (
//                                                 <div className="sm:col-span-2 -mt-2">
//                                                     <FieldError>{duplicateErrors.name}</FieldError>
//                                                 </div>
//                                             )}
//                                         </div>

//                                         {/* Personal email */}
//                                         <div>
//                                             <label className="field-label">
//                                                 Personal Email Address <span className="text-red-500">*</span>
//                                             </label>
//                                             <div className="relative">
//                                                 <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
//                                                 <input
//                                                     type="email"
//                                                     inputMode="email"
//                                                     autoComplete="email"
//                                                     {...reg("email", clean.email)}
//                                                     placeholder="employee@gmail.com"
//                                                     maxLength={100}
//                                                     className={`${errors.email || duplicateErrors.email ? errorInputClass : inputClass} pl-11`}
//                                                 />
//                                             </div>
//                                             <p className="text-[11px] text-slate-400 mt-1.5">
//                                                 Use an email the employee can open. Password reset links are sent here.
//                                                 {isAdmin ? " The company login email is set in Step 5." : ""}
//                                             </p>
//                                             <FieldError>{errors.email?.message}</FieldError>
//                                             <FieldError>{duplicateErrors.email}</FieldError>
//                                         </div>

//                                         {/* Phone */}
//                                         <div>
//                                             <label className="field-label">
//                                                 Phone Number <span className="text-red-500">*</span>
//                                             </label>
//                                             <div className="flex">
//                                                 <div className="flex items-center px-3 bg-slate-100 border border-r-0 border-slate-200 rounded-l-xl text-xs font-bold text-slate-600 whitespace-nowrap">
//                                                     IN +91
//                                                 </div>
//                                                 <div className="relative flex-1 min-w-0">
//                                                     <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
//                                                     <input
//                                                         type="tel"
//                                                         inputMode="numeric"
//                                                         autoComplete="tel-national"
//                                                         {...reg("phone", clean.digits(10))}
//                                                         placeholder="9876543210"
//                                                         maxLength={10}
//                                                         className={`${errors.phone || duplicateErrors.phone ? errorInputClass : inputClass} pl-9 rounded-l-none`}
//                                                     />
//                                                 </div>
//                                             </div>
//                                             <FieldError>{errors.phone?.message}</FieldError>
//                                             <FieldError>{duplicateErrors.phone}</FieldError>
//                                         </div>

//                                         {/* Gender */}
//                                         <div>
//                                             <label className="field-label">
//                                                 Gender <span className="text-red-500">*</span>
//                                             </label>
//                                             <div className="grid grid-cols-3 gap-2 sm:gap-3">
//                                                 {GENDER_OPTIONS.map((gender) => (
//                                                     <label
//                                                         key={gender.value}
//                                                         className={`p-3 sm:p-4 rounded-2xl border cursor-pointer transition-all ${watchedForm.gender === gender.value ? "border-indigo-500 bg-indigo-50" : "border-slate-200 bg-white"
//                                                             }`}
//                                                     >
//                                                         <div className="flex items-center justify-between gap-1">
//                                                             <span className="text-xs font-bold text-slate-800">{gender.label}</span>
//                                                             <input
//                                                                 type="radio"
//                                                                 value={gender.value}
//                                                                 checked={watchedForm.gender === gender.value}
//                                                                 {...register("gender")}
//                                                                 className="accent-indigo-600"
//                                                             />
//                                                         </div>
//                                                         <p className="hidden sm:block text-[10px] text-slate-400 mt-1">{gender.sub}</p>
//                                                     </label>
//                                                 ))}
//                                             </div>
//                                             <FieldError>{errors.gender?.message}</FieldError>
//                                         </div>

//                                         {/* Address */}
//                                         <div>
//                                             <div className="flex items-center gap-2 mb-3">
//                                                 <MapPin size={15} className="text-indigo-600" />
//                                                 <span className="text-xs font-bold text-slate-700">
//                                                     Address <span className="text-red-500">*</span>
//                                                 </span>
//                                             </div>
//                                             <textarea
//                                                 {...reg("address", clean.text(200))}
//                                                 rows={3}
//                                                 maxLength={200}
//                                                 placeholder="House no., street, area"
//                                                 className={`${errors.address ? errorInputClass : inputClass} resize-none`}
//                                             />
//                                             <FieldError>{errors.address?.message}</FieldError>

//                                             <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
//                                                 <div>
//                                                     <input
//                                                         {...reg("city", clean.name(40))}
//                                                         placeholder="City"
//                                                         maxLength={40}
//                                                         autoComplete="address-level2"
//                                                         className={errors.city ? errorInputClass : inputClass}
//                                                     />
//                                                     <FieldError>{errors.city?.message}</FieldError>
//                                                 </div>
//                                                 <div>
//                                                     <input
//                                                         {...reg("state", clean.name(40))}
//                                                         placeholder="State"
//                                                         maxLength={40}
//                                                         autoComplete="address-level1"
//                                                         className={errors.state ? errorInputClass : inputClass}
//                                                     />
//                                                     <FieldError>{errors.state?.message}</FieldError>
//                                                 </div>
//                                                 <div>
//                                                     <input
//                                                         {...reg("pincode", clean.digits(6))}
//                                                         inputMode="numeric"
//                                                         placeholder="Pincode"
//                                                         maxLength={6}
//                                                         autoComplete="postal-code"
//                                                         className={errors.pincode ? errorInputClass : inputClass}
//                                                     />
//                                                     <FieldError>{errors.pincode?.message}</FieldError>
//                                                 </div>
//                                             </div>
//                                         </div>
//                                     </div>
//                                 )}

//                                 {/* STEP 2 */}
//                                 {currentStep === 2 && (
//                                     <div className="space-y-5 sm:space-y-6">
//                                         <SectionTitle title="Job Details" description="Role, department, employment status and compensation details." />

//                                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//                                             <div>
//                                                 <label className="field-label">
//                                                     Designation <span className="text-red-500">*</span>
//                                                 </label>
//                                                 <select
//                                                     {...register("designation")}
//                                                     className={`${errors.designation ? errorInputClass : inputClass} cursor-pointer`}
//                                                 >
//                                                     <option value="">Select Designation</option>
//                                                     {designationOptions.map((item) => (
//                                                         <option key={item.value} value={item.value}>
//                                                             {item.label}
//                                                         </option>
//                                                     ))}
//                                                     <option value="Other">+ Add Other Designation</option>
//                                                 </select>
//                                                 <FieldError>{errors.designation?.message}</FieldError>
//                                                 {watchedForm.designation === "Other" && (
//                                                     <>
//                                                         <input
//                                                             {...reg("designationOther", clean.text(50))}
//                                                             placeholder="Enter designation"
//                                                             maxLength={50}
//                                                             className={`${errors.designationOther ? errorInputClass : inputClass} mt-2`}
//                                                         />
//                                                         <FieldError>{errors.designationOther?.message}</FieldError>
//                                                     </>
//                                                 )}
//                                             </div>

//                                             <div>
//                                                 <label className="field-label">Employee Status</label>
//                                                 <select
//                                                     {...register("employeeStatus")}
//                                                     className={`${errors.employeeStatus ? errorInputClass : inputClass} cursor-pointer`}
//                                                 >
//                                                     {EMPLOYEE_STATUS_OPTIONS.map((status) => (
//                                                         <option key={status} value={status}>
//                                                             {status}
//                                                         </option>
//                                                     ))}
//                                                 </select>
//                                                 <FieldError>{errors.employeeStatus?.message}</FieldError>
//                                             </div>
//                                         </div>

//                                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//                                             <div>
//                                                 <label className="field-label">
//                                                     Department <span className="text-red-500">*</span>
//                                                 </label>
//                                                 <select
//                                                     {...register("department")}
//                                                     className={`${errors.department ? errorInputClass : inputClass} cursor-pointer`}
//                                                 >
//                                                     <option value="">Select Department</option>
//                                                     {departmentOptions.map((item) => (
//                                                         <option key={item.value} value={item.value}>
//                                                             {item.label}
//                                                         </option>
//                                                     ))}
//                                                     <option value="Other">+ Add Other Department</option>
//                                                 </select>
//                                                 <FieldError>{errors.department?.message}</FieldError>
//                                                 {watchedForm.department === "Other" && (
//                                                     <>
//                                                         <input
//                                                             {...reg("departmentOther", clean.text(50))}
//                                                             placeholder="Enter department"
//                                                             maxLength={50}
//                                                             className={`${errors.departmentOther ? errorInputClass : inputClass} mt-2`}
//                                                         />
//                                                         <FieldError>{errors.departmentOther?.message}</FieldError>
//                                                     </>
//                                                 )}
//                                             </div>

//                                             <div>
//                                                 <label className="field-label">Employment Type</label>
//                                                 <select
//                                                     {...register("employmentType")}
//                                                     className={`${errors.employmentType ? errorInputClass : inputClass} cursor-pointer`}
//                                                 >
//                                                     {EMPLOYMENT_TYPES.map((type) => (
//                                                         <option key={type} value={type}>
//                                                             {type}
//                                                         </option>
//                                                     ))}
//                                                 </select>
//                                                 <FieldError>{errors.employmentType?.message}</FieldError>
//                                             </div>
//                                         </div>

//                                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//                                             {/* Reporting manager: only employees with the Manager role, shown by name. The employee id is saved. */}
//                                             <div>
//                                                 <label className="field-label">Reporting Manager</label>
//                                                 <select
//                                                     {...register("reportingManager")}
//                                                     className={`${errors.reportingManager ? errorInputClass : inputClass} cursor-pointer`}
//                                                 >
//                                                     <option value="">No manager</option>
//                                                     {managerChoices.map((m) => (
//                                                         <option key={m.value} value={m.value}>
//                                                             {m.name}
//                                                         </option>
//                                                     ))}
//                                                 </select>
//                                                 <FieldError>{errors.reportingManager?.message}</FieldError>

//                                                 {legacyManager && !watchedForm.reportingManager && (
//                                                     <p className="text-[11px] font-medium text-amber-700 mt-1.5">
//                                                         This employee was saved earlier with the manager name "{legacyManager}". Please select the
//                                                         manager from the list.
//                                                     </p>
//                                                 )}
//                                                 {lookupsLoaded && managerChoices.length === 0 && (
//                                                     <p className="text-[11px] text-slate-400 mt-1.5">
//                                                         No manager found. The admin must first add an employee with the Manager role (Login Access),
//                                                         then he will appear here.
//                                                     </p>
//                                                 )}
//                                             </div>

//                                             <div>
//                                                 <label className="field-label">
//                                                     Joining Date <span className="text-red-500">*</span>
//                                                 </label>
//                                                 <div className="relative">
//                                                     <CalendarDays size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
//                                                     <input
//                                                         type="date"
//                                                         {...register("dateOfJoining")}
//                                                         className={`${errors.dateOfJoining ? errorInputClass : inputClass} pl-10`}
//                                                     />
//                                                 </div>
//                                                 <FieldError>{errors.dateOfJoining?.message}</FieldError>
//                                             </div>
//                                         </div>

//                                         <div>
//                                             <label className="field-label">
//                                                 Monthly Salary <span className="text-red-500">*</span>
//                                             </label>
//                                             <div className="relative">
//                                                 <IndianRupee size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
//                                                 <input
//                                                     type="text"
//                                                     inputMode="numeric"
//                                                     {...reg("salary", clean.digits(9))}
//                                                     placeholder="50000"
//                                                     maxLength={9}
//                                                     className={`${errors.salary ? errorInputClass : inputClass} pl-10`}
//                                                 />
//                                             </div>
//                                             <FieldError>{errors.salary?.message}</FieldError>
//                                         </div>
//                                     </div>
//                                 )}

//                                 {/* STEP 3 */}
//                                 {currentStep === 3 && (
//                                     <div className="space-y-5 sm:space-y-6">
//                                         <SectionTitle title="Documents" description="Aadhaar card and PAN card details with scanned copies." />

//                                         {/* Aadhaar */}
//                                         <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
//                                             <div className="flex items-center justify-between gap-3 mb-5">
//                                                 <div className="flex items-center gap-3 min-w-0">
//                                                     <div className="w-10 h-10 shrink-0 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
//                                                         <CreditCard size={18} />
//                                                     </div>
//                                                     <div className="min-w-0">
//                                                         <p className="text-sm font-bold text-slate-900">Aadhaar Card</p>
//                                                         <p className="text-[11px] text-slate-400">Number and both sides of the card.</p>
//                                                     </div>
//                                                 </div>
//                                                 <span className="shrink-0 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full">Required</span>
//                                             </div>

//                                             <div className="mb-4">
//                                                 <label className="field-label">
//                                                     Aadhaar Number <span className="text-red-500">*</span>
//                                                 </label>
//                                                 <input
//                                                     {...reg("aadhaarNumber", clean.digits(12))}
//                                                     inputMode="numeric"
//                                                     maxLength={12}
//                                                     placeholder="234567890123"
//                                                     className={`${errors.aadhaarNumber ? errorInputClass : inputClass} font-mono`}
//                                                 />
//                                                 <FieldError>{errors.aadhaarNumber?.message}</FieldError>
//                                             </div>

//                                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                                                 <UploadCard
//                                                     title="Aadhaar - Front Side"
//                                                     subtitle="Tap to upload the front image"
//                                                     fileName={watchedForm.nationalIdFrontFileName}
//                                                     error={errors.nationalIdFrontFileData?.message}
//                                                     preview={watchedForm.nationalIdFrontFileData?.startsWith("data:image") ? watchedForm.nationalIdFrontFileData : ""}
//                                                     onClick={() => frontIdRef.current?.click()}
//                                                     onRemove={() => removeFile("nationalIdFrontFileData", "nationalIdFrontFileName")}
//                                                 />
//                                                 <UploadCard
//                                                     title="Aadhaar - Back Side"
//                                                     subtitle="Tap to upload the back image"
//                                                     fileName={watchedForm.nationalIdBackFileName}
//                                                     error={errors.nationalIdBackFileData?.message}
//                                                     preview={watchedForm.nationalIdBackFileData?.startsWith("data:image") ? watchedForm.nationalIdBackFileData : ""}
//                                                     onClick={() => backIdRef.current?.click()}
//                                                     onRemove={() => removeFile("nationalIdBackFileData", "nationalIdBackFileName")}
//                                                 />
//                                             </div>
//                                             <input
//                                                 ref={frontIdRef}
//                                                 type="file"
//                                                 accept="image/jpeg,image/png,image/webp"
//                                                 onChange={(e) => handleDocumentUpload(e, "nationalIdFrontFileData", "nationalIdFrontFileName")}
//                                                 className="hidden"
//                                             />
//                                             <input
//                                                 ref={backIdRef}
//                                                 type="file"
//                                                 accept="image/jpeg,image/png,image/webp"
//                                                 onChange={(e) => handleDocumentUpload(e, "nationalIdBackFileData", "nationalIdBackFileName")}
//                                                 className="hidden"
//                                             />
//                                         </div>

//                                         {/* PAN */}
//                                         <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
//                                             <div className="flex items-center justify-between gap-3 mb-5">
//                                                 <div className="flex items-center gap-3 min-w-0">
//                                                     <div className="w-10 h-10 shrink-0 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
//                                                         <FileText size={18} />
//                                                     </div>
//                                                     <div className="min-w-0">
//                                                         <p className="text-sm font-bold text-slate-900">PAN Card</p>
//                                                         <p className="text-[11px] text-slate-400">Number and a clear image of the card.</p>
//                                                     </div>
//                                                 </div>
//                                                 <span className="shrink-0 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full">Required</span>
//                                             </div>

//                                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                                                 <div>
//                                                     <label className="field-label">
//                                                         PAN Number <span className="text-red-500">*</span>
//                                                     </label>
//                                                     <input
//                                                         {...reg("panNumber", clean.alnumUpper(10))}
//                                                         maxLength={10}
//                                                         autoCapitalize="characters"
//                                                         placeholder="ABCDE1234F"
//                                                         className={`${errors.panNumber ? errorInputClass : inputClass} font-mono uppercase`}
//                                                     />
//                                                     <FieldError>{errors.panNumber?.message}</FieldError>
//                                                 </div>

//                                                 <UploadCard
//                                                     title="PAN Card Image"
//                                                     subtitle="Tap to upload the PAN card"
//                                                     fileName={watchedForm.panCardFileName}
//                                                     error={errors.panCardFileData?.message}
//                                                     preview={watchedForm.panCardFileData?.startsWith("data:image") ? watchedForm.panCardFileData : ""}
//                                                     onClick={() => panRef.current?.click()}
//                                                     onRemove={() => removeFile("panCardFileData", "panCardFileName")}
//                                                 />
//                                             </div>
//                                             <input
//                                                 ref={panRef}
//                                                 type="file"
//                                                 accept="image/jpeg,image/png,image/webp"
//                                                 onChange={(e) => handleDocumentUpload(e, "panCardFileData", "panCardFileName")}
//                                                 className="hidden"
//                                             />
//                                         </div>
//                                     </div>
//                                 )}

//                                 {/* STEP 4 */}
//                                 {currentStep === 4 && (
//                                     <div className="space-y-5 sm:space-y-6">
//                                         <SectionTitle title="Banking Information" description="Bank account details for salary payments." />

//                                         <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
//                                             <div className="flex items-center gap-3 mb-5">
//                                                 <div className="w-10 h-10 shrink-0 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
//                                                     <Landmark size={18} />
//                                                 </div>
//                                                 <div className="min-w-0">
//                                                     <p className="text-sm font-bold text-slate-900">Salary Account</p>
//                                                     <p className="text-[11px] text-slate-400">Enter the employee's salary account details.</p>
//                                                 </div>
//                                             </div>

//                                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//                                                 <div>
//                                                     <label className="field-label">
//                                                         Account Holder Name <span className="text-red-500">*</span>
//                                                     </label>
//                                                     <input
//                                                         {...reg("accountName", clean.name(60))}
//                                                         placeholder="Account holder name"
//                                                         maxLength={60}
//                                                         className={errors.accountName ? errorInputClass : inputClass}
//                                                     />
//                                                     <FieldError>{errors.accountName?.message}</FieldError>
//                                                 </div>
//                                                 <div>
//                                                     <label className="field-label">
//                                                         Bank Name <span className="text-red-500">*</span>
//                                                     </label>
//                                                     <input
//                                                         {...reg("bankName", clean.bank(60))}
//                                                         placeholder="Bank name"
//                                                         maxLength={60}
//                                                         className={errors.bankName ? errorInputClass : inputClass}
//                                                     />
//                                                     <FieldError>{errors.bankName?.message}</FieldError>
//                                                 </div>
//                                                 <div>
//                                                     <label className="field-label">
//                                                         Branch Name <span className="text-red-500">*</span>
//                                                     </label>
//                                                     <input
//                                                         {...reg("branchName", clean.branch(60))}
//                                                         placeholder="Branch name"
//                                                         maxLength={60}
//                                                         className={errors.branchName ? errorInputClass : inputClass}
//                                                     />
//                                                     <FieldError>{errors.branchName?.message}</FieldError>
//                                                 </div>
//                                                 <div>
//                                                     <label className="field-label">
//                                                         Account Number <span className="text-red-500">*</span>
//                                                     </label>
//                                                     <input
//                                                         {...reg("accountNumber", clean.digits(18))}
//                                                         inputMode="numeric"
//                                                         placeholder="Account number"
//                                                         maxLength={18}
//                                                         className={`${errors.accountNumber ? errorInputClass : inputClass} font-mono`}
//                                                     />
//                                                     <FieldError>{errors.accountNumber?.message}</FieldError>
//                                                 </div>
//                                                 <div>
//                                                     <label className="field-label">
//                                                         IFSC Code <span className="text-red-500">*</span>
//                                                     </label>
//                                                     <input
//                                                         {...reg("ifscCode", clean.alnumUpper(11))}
//                                                         placeholder="SBIN0001234"
//                                                         maxLength={11}
//                                                         autoCapitalize="characters"
//                                                         className={`${errors.ifscCode ? errorInputClass : inputClass} font-mono uppercase`}
//                                                     />
//                                                     <FieldError>{errors.ifscCode?.message}</FieldError>
//                                                 </div>
//                                             </div>
//                                         </div>

//                                         {/* HR and managers do not set the login. They are told what happens next. */}
//                                         {!isAdmin && !editId && (
//                                             <div className="flex items-start gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 px-4 py-3.5 text-indigo-800">
//                                                 <Info size={17} className="shrink-0 mt-0.5" />
//                                                 <p className="text-[11px] sm:text-xs font-medium leading-relaxed">
//                                                     This saves the employee profile. An admin will add the login access (company email and
//                                                     password) afterwards, and then the employee can log in.
//                                                 </p>
//                                             </div>
//                                         )}
//                                     </div>
//                                 )}

//                                 {/* STEP 5 (admin only) */}
//                                 {isAdmin && currentStep === 5 && (
//                                     <div className="space-y-5 sm:space-y-6">
//                                         <SectionTitle
//                                             title="Login Access"
//                                             description="The company email and password the employee will use to log in to the HRMS."
//                                         />

//                                         <div className="flex items-start gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 px-4 py-3.5 text-indigo-800">
//                                             <ShieldCheck size={17} className="shrink-0 mt-0.5" />
//                                             <p className="text-[11px] sm:text-xs font-medium leading-relaxed">
//                                                 Only employees added here can log in. After saving, you will get the login URL, email and
//                                                 password to send to the employee. The employee can reset the password later with "Forgot Password".
//                                             </p>
//                                         </div>

//                                         <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-5">
//                                             {/* Login email */}
//                                             <div>
//                                                 <label className="field-label">
//                                                     Company Login Email <span className="text-red-500">*</span>
//                                                 </label>
//                                                 <div className="flex gap-2">
//                                                     <div className="relative flex-1 min-w-0">
//                                                         <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
//                                                         <input
//                                                             type="email"
//                                                             inputMode="email"
//                                                             autoComplete="off"
//                                                             autoCapitalize="none"
//                                                             {...reg("loginEmail", clean.loginEmail)}
//                                                             placeholder="name@yourcompany.com"
//                                                             maxLength={100}
//                                                             className={`${errors.loginEmail || duplicateErrors.loginEmail ? errorInputClass : inputClass} pl-11`}
//                                                         />
//                                                     </div>
//                                                     <button
//                                                         type="button"
//                                                         onClick={() =>
//                                                             setValue("loginEmail", String(getValues("email") || "").toLowerCase(), {
//                                                                 shouldValidate: true,
//                                                                 shouldDirty: true,
//                                                             })
//                                                         }
//                                                         className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition shrink-0"
//                                                         title="Use the personal email as login email"
//                                                     >
//                                                         <Mail size={14} />
//                                                         <span className="hidden sm:inline">Use personal email</span>
//                                                     </button>
//                                                 </div>
//                                                 <FieldError>{errors.loginEmail?.message}</FieldError>
//                                                 <FieldError>{duplicateErrors.loginEmail}</FieldError>
//                                             </div>

//                                             {/* Password */}
//                                             <div>
//                                                 <label className="field-label">
//                                                     Login Password {!editId && <span className="text-red-500">*</span>}
//                                                 </label>
//                                                 <div className="flex gap-2">
//                                                     <div className="relative flex-1 min-w-0">
//                                                         <KeyRound size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
//                                                         <input
//                                                             type={showPassword ? "text" : "password"}
//                                                             autoComplete="new-password"
//                                                             {...reg("password", clean.password)}
//                                                             placeholder={editId ? "Leave blank to keep the current password" : "Create a password"}
//                                                             maxLength={32}
//                                                             className={`${errors.password ? errorInputClass : inputClass} pl-10 pr-11 font-mono`}
//                                                         />
//                                                         <button
//                                                             type="button"
//                                                             onClick={() => setShowPassword((s) => !s)}
//                                                             className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
//                                                             aria-label={showPassword ? "Hide password" : "Show password"}
//                                                         >
//                                                             {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
//                                                         </button>
//                                                     </div>
//                                                     <button
//                                                         type="button"
//                                                         onClick={() => {
//                                                             setValue("password", generatePassword(), { shouldValidate: true, shouldDirty: true });
//                                                             setShowPassword(true);
//                                                         }}
//                                                         className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition shrink-0"
//                                                         title="Generate a strong password"
//                                                     >
//                                                         <RefreshCw size={14} />
//                                                         <span className="hidden sm:inline">Generate</span>
//                                                     </button>
//                                                 </div>
//                                                 <p className="text-[11px] text-slate-400 mt-1.5">
//                                                     8 to 32 characters with an uppercase letter, a lowercase letter and a number.
//                                                 </p>
//                                                 <FieldError>{errors.password?.message}</FieldError>
//                                             </div>

//                                             {/* Role */}
//                                             <div>
//                                                 <label className="field-label">
//                                                     Access Role <span className="text-red-500">*</span>
//                                                 </label>
//                                                 <select
//                                                     {...register("role")}
//                                                     disabled={watchedForm.role === "Admin"}
//                                                     className={`${errors.role ? errorInputClass : inputClass} cursor-pointer disabled:bg-slate-50 disabled:cursor-not-allowed`}
//                                                 >
//                                                     {roleChoices.map((r) => (
//                                                         <option key={r} value={r}>
//                                                             {r}
//                                                         </option>
//                                                     ))}
//                                                 </select>
//                                                 <p className="text-[11px] text-slate-400 mt-1.5">
//                                                     Employee sees only their own data. Manager sees their team. HR manages employees.
//                                                 </p>
//                                                 <FieldError>{errors.role?.message}</FieldError>
//                                             </div>
//                                         </div>

//                                         {watchedForm.employeeStatus === "Inactive" && (
//                                             <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-amber-800">
//                                                 <AlertCircle size={15} className="shrink-0 mt-0.5" />
//                                                 <p className="text-[11px] font-medium leading-relaxed">
//                                                     The employee status is "Inactive", so this login will stay blocked until the status is changed.
//                                                 </p>
//                                             </div>
//                                         )}
//                                     </div>
//                                 )}

//                                 {/* Footer navigation */}
//                                 <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-5 sm:pt-6 mt-6 sm:mt-8 border-t border-slate-200">
//                                     <button
//                                         type="button"
//                                         onClick={() => router.back()}
//                                         className="w-full sm:w-auto px-5 py-3 sm:py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-xs font-bold"
//                                     >
//                                         Cancel
//                                     </button>

//                                     <div className="flex items-center gap-2 w-full sm:w-auto">
//                                         {currentStep > 1 && (
//                                             <button
//                                                 type="button"
//                                                 onClick={() => {
//                                                     setError("");
//                                                     changeStep(currentStep - 1);
//                                                 }}
//                                                 className="flex-1 sm:flex-none px-5 py-3 sm:py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold"
//                                             >
//                                                 Back
//                                             </button>
//                                         )}
//                                         <button
//                                             type="button"
//                                             onClick={handleNext}
//                                             disabled={loading}
//                                             className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 sm:min-w-[130px] px-6 py-3 sm:py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 disabled:opacity-60"
//                                         >
//                                             {loading ? (
//                                                 <>
//                                                     <Loader2 size={15} className="animate-spin" /> Saving...
//                                                 </>
//                                             ) : currentStep === LAST_STEP ? (
//                                                 <>
//                                                     <Save size={15} /> {editId ? "Update Employee" : "Save Employee"}
//                                                 </>
//                                             ) : (
//                                                 <>
//                                                     Continue <ChevronRight size={15} />
//                                                 </>
//                                             )}
//                                         </button>
//                                     </div>
//                                 </div>
//                             </div>
//                         </main>
//                     </div>
//                 </div>
//             </div>

//             {credentials && (
//                 <CredentialsModal data={credentials} onDone={() => router.push("/employees")} />
//             )}

//             <style jsx>{`
//                 .field-label {
//                     display: block;
//                     margin-bottom: 7px;
//                     font-size: 11px;
//                     line-height: 1;
//                     font-weight: 700;
//                     color: #64748b;
//                     letter-spacing: 0.04em;
//                     text-transform: uppercase;
//                 }
//             `}</style>
//         </div>
//     );
// }

// export default function AddEmployeePage() {
//     return (
//         <Suspense
//             fallback={
//                 <div className="min-h-[500px] flex items-center justify-center">
//                     <Loader2 size={32} className="animate-spin text-indigo-600" />
//                 </div>
//             }
//         >
//             <EmployeeFormContent />
//         </Suspense>
//     );
// }


